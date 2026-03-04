import { _delay } from '../battle/BattleScene.js';

const MESSAGE_DURATION = 1400; // ms auto-advance for non-choice messages

export class BattleUI {
  constructor(container, inputManager, battleScene) {
    this.input = inputManager;
    this.scene = battleScene;
    this._el = null;
    this._msgEl = null;
    this._menuEl = null;
    this._movesEl = null;
    this._bagEl = null;

    this._phase = 'idle'; // 'message' | 'main-menu' | 'move-menu' | 'bag-menu' | 'idle'
    this._menuCursor = 0;
    this._moveCursor = 0;
    this._bagCursor  = 0;
    this._resolve = null;
    this._waitingForConfirm = false;

    this._playerCreature = null;
    this._enemyCreature  = null;
    this._inventory = null;
    this._itemsData = null;

    this._build(container);
  }

  _build(container) {
    this._el = document.createElement('div');
    this._el.id = 'battle-ui';
    this._el.style.display = 'none';
    this._el.innerHTML = `
      <div id="battle-message-box">
        <span id="battle-message"></span>
      </div>
      <div id="battle-main-menu" style="display:none">
        <div class="battle-menu-grid">
          <div class="bmenu-item" data-idx="0">⚔ FIGHT</div>
          <div class="bmenu-item" data-idx="1">🎒 BAG</div>
          <div class="bmenu-item" data-idx="2">🐾 PARTY</div>
          <div class="bmenu-item" data-idx="3">🏃 RUN</div>
        </div>
      </div>
      <div id="battle-move-menu" style="display:none">
        <div id="move-list"></div>
        <div id="move-info"></div>
      </div>
      <div id="battle-bag-menu" style="display:none">
        <div id="bag-list"></div>
      </div>
    `;
    container.appendChild(this._el);

    this._msgEl   = this._el.querySelector('#battle-message');
    this._menuEl  = this._el.querySelector('#battle-main-menu');
    this._movesEl = this._el.querySelector('#battle-move-menu');
    this._bagEl   = this._el.querySelector('#battle-bag-menu');
  }

  show() { this._el.style.display = 'flex'; }
  hide() { this._el.style.display = 'none';  }

  setContext(playerCreature, enemyCreature, inventory, itemsData) {
    this._playerCreature = playerCreature;
    this._enemyCreature  = enemyCreature;
    this._inventory      = inventory;
    this._itemsData      = itemsData;
  }

  /** Show a text message. Resolves after MESSAGE_DURATION ms. */
  showMessage(text) {
    this._msgEl.textContent = text;
    this._phase = 'message';
    return _delay(MESSAGE_DURATION);
  }

  /** Wait for player to confirm after a message (not auto) */
  showMessageWait(text) {
    this._msgEl.textContent = text;
    this._phase = 'message-wait';
    this._waitingForConfirm = true;
    return new Promise(resolve => {
      this._resolve = resolve;
    });
  }

  animateAttack(attacker, defender, damage) {
    const isPlayer = attacker === this._playerCreature;
    this.scene.animateAttack(attacker, defender, isPlayer);
    this.scene.updatePlayerStats(this._playerCreature);
    this.scene.updateEnemyStats(this._enemyCreature);
    return _delay(600);
  }

  animateHeal(creature) {
    this.scene.updatePlayerStats(this._playerCreature);
    return _delay(400);
  }

  animateStatusDamage(creature) {
    this.scene.updatePlayerStats(this._playerCreature);
    this.scene.updateEnemyStats(this._enemyCreature);
    return _delay(400);
  }

  /** Show main battle menu and wait for choice.
   *  Resolves with { type: 'fight'|'bag'|'party'|'run' } */
  showMainMenu() {
    this._menuEl.style.display = 'block';
    this._movesEl.style.display = 'none';
    this._bagEl.style.display  = 'none';
    this._menuCursor = 0;
    this._renderMainMenu();
    this._phase = 'main-menu';
    return new Promise(resolve => { this._resolve = resolve; });
  }

  _renderMainMenu() {
    const items = this._menuEl.querySelectorAll('.bmenu-item');
    items.forEach((el, i) => {
      el.classList.toggle('selected', i === this._menuCursor);
    });
  }

  /** Show move selection menu and wait for move choice.
   *  Resolves with moveId or null (back). */
  showMoveMenu() {
    this._menuEl.style.display  = 'none';
    this._movesEl.style.display = 'block';
    this._moveCursor = 0;
    this._renderMoveMenu();
    this._phase = 'move-menu';
    return new Promise(resolve => { this._resolve = resolve; });
  }

  _renderMoveMenu() {
    const moves = this._playerCreature ? this._playerCreature.moves : [];
    const moveData = this._playerCreature ? this._playerCreature._moveData : {};
    const listEl = this._movesEl.querySelector('#move-list');
    const infoEl = this._movesEl.querySelector('#move-info');

    listEl.innerHTML = moves.map((m, i) => {
      const md = moveData ? moveData[m.moveId] : null;
      const name = md ? md.name : `Move ${m.moveId}`;
      const pp   = `${m.currentPp}/${m.maxPp}`;
      const type = md ? md.type : '';
      const sel  = i === this._moveCursor ? ' selected' : '';
      return `<div class="move-item${sel}" data-idx="${i}">
        <span class="move-name">${name}</span>
        <span class="move-type type-${type.toLowerCase()}">${type}</span>
        <span class="move-pp">PP ${pp}</span>
      </div>`;
    }).join('') + `<div class="move-item${this._moveCursor === moves.length ? ' selected' : ''}" data-idx="${moves.length}">← Back</div>`;

    // Info for selected move
    const sel = this._moveCursor < moves.length ? moves[this._moveCursor] : null;
    if (sel && moveData) {
      const md = moveData[sel.moveId];
      infoEl.textContent = md
        ? `${md.type} | ${md.category} | Power: ${md.power || '--'} | Acc: ${md.accuracy}`
        : '';
    } else {
      infoEl.textContent = '';
    }
  }

  /** Show bag menu. Resolves with { itemId } or null. */
  showBagMenu() {
    this._menuEl.style.display  = 'none';
    this._movesEl.style.display = 'none';
    this._bagEl.style.display   = 'block';
    this._bagCursor = 0;
    this._renderBagMenu();
    this._phase = 'bag-menu';
    return new Promise(resolve => { this._resolve = resolve; });
  }

  _renderBagMenu() {
    const inv  = this._inventory || {};
    const data = this._itemsData || [];
    const items = Object.entries(inv)
      .filter(([, count]) => count > 0)
      .map(([id, count]) => {
        const d = data.find(i => i.id === parseInt(id));
        return { id: parseInt(id), name: d ? d.name : `Item ${id}`, count };
      });

    const listEl = this._bagEl.querySelector('#bag-list');
    const rows = items.map((item, i) => {
      const sel = i === this._bagCursor ? ' selected' : '';
      return `<div class="bag-item${sel}" data-idx="${i}">${item.name} ×${item.count}</div>`;
    });
    rows.push(`<div class="bag-item${this._bagCursor === items.length ? ' selected' : ''}" data-idx="${items.length}">← Back</div>`);
    listEl.innerHTML = rows.join('');
    this._bagItems = items;
  }

  /** Called from BattleState.update() every frame to process input */
  handleInput() {
    if (!this._resolve) return;

    if (this._phase === 'message-wait') {
      if (this.input.confirm) {
        this._waitingForConfirm = false;
        const r = this._resolve;
        this._resolve = null;
        this._phase = 'idle';
        r();
      }
      return;
    }

    if (this._phase === 'main-menu') {
      const len = 4;
      if (this.input.up)    this._menuCursor = (this._menuCursor - 1 + len) % len;
      if (this.input.down)  this._menuCursor = (this._menuCursor + 1) % len;
      if (this.input.left)  this._menuCursor = (this._menuCursor - 2 + len) % len;
      if (this.input.right) this._menuCursor = (this._menuCursor + 2) % len;
      this._renderMainMenu();

      if (this.input.confirm) {
        const choices = ['fight', 'bag', 'party', 'run'];
        const r = this._resolve; this._resolve = null; this._phase = 'idle';
        this._menuEl.style.display = 'none';
        r({ type: choices[this._menuCursor] });
      }
      return;
    }

    if (this._phase === 'move-menu') {
      const len = (this._playerCreature ? this._playerCreature.moves.length : 0) + 1;
      if (this.input.up)   this._moveCursor = (this._moveCursor - 1 + len) % len;
      if (this.input.down) this._moveCursor = (this._moveCursor + 1) % len;
      this._renderMoveMenu();

      if (this.input.confirm) {
        const moves = this._playerCreature ? this._playerCreature.moves : [];
        if (this._moveCursor >= moves.length) {
          // Back
          const r = this._resolve; this._resolve = null; this._phase = 'idle';
          this._movesEl.style.display = 'none';
          r(null);
          return;
        }
        const mv = moves[this._moveCursor];
        if (mv.currentPp <= 0) return; // no PP
        const r = this._resolve; this._resolve = null; this._phase = 'idle';
        this._movesEl.style.display = 'none';
        r(mv.moveId);
      }
      if (this.input.cancel) {
        const r = this._resolve; this._resolve = null; this._phase = 'idle';
        this._movesEl.style.display = 'none';
        r(null);
      }
      return;
    }

    if (this._phase === 'bag-menu') {
      const len = (this._bagItems ? this._bagItems.length : 0) + 1;
      if (this.input.up)   this._bagCursor = (this._bagCursor - 1 + len) % len;
      if (this.input.down) this._bagCursor = (this._bagCursor + 1) % len;
      this._renderBagMenu();

      if (this.input.confirm) {
        if (!this._bagItems || this._bagCursor >= this._bagItems.length) {
          const r = this._resolve; this._resolve = null; this._phase = 'idle';
          this._bagEl.style.display = 'none';
          r(null);
          return;
        }
        const item = this._bagItems[this._bagCursor];
        const r = this._resolve; this._resolve = null; this._phase = 'idle';
        this._bagEl.style.display = 'none';
        r({ itemId: item.id });
      }
      if (this.input.cancel) {
        const r = this._resolve; this._resolve = null; this._phase = 'idle';
        this._bagEl.style.display = 'none';
        r(null);
      }
    }
  }

  clearMenus() {
    this._menuEl.style.display  = 'none';
    this._movesEl.style.display = 'none';
    this._bagEl.style.display   = 'none';
    this._resolve = null;
    this._phase   = 'idle';
  }
}
