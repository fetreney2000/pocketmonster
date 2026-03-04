export class Menu {
  constructor(container, game) {
    this.game = game;
    this._el = null;
    this._phase = 'main'; // 'main' | 'party' | 'items' | 'save'
    this._cursor = 0;
    this._resolve = null;

    this._build(container);
  }

  _build(container) {
    this._el = document.createElement('div');
    this._el.id = 'menu-screen';
    this._el.style.display = 'none';
    this._el.innerHTML = `
      <div class="menu-panel">
        <div class="menu-title">MENU</div>
        <div id="menu-content"></div>
      </div>
    `;
    container.appendChild(this._el);
    this._contentEl = this._el.querySelector('#menu-content');
  }

  /** Open the menu. Resolves when closed. */
  open() {
    this._el.style.display = 'flex';
    this._phase = 'main';
    this._cursor = 0;
    this._render();
    return new Promise(resolve => { this._resolve = resolve; });
  }

  close() {
    this._el.style.display = 'none';
    if (this._resolve) {
      const r = this._resolve;
      this._resolve = null;
      r();
    }
  }

  isOpen() {
    return this._el.style.display !== 'none';
  }

  handleInput(input) {
    if (!this.isOpen()) return;

    if (this._phase === 'main') {
      const items = ['PARTY', 'ITEMS', 'SAVE', 'CLOSE'];
      if (input.up)   this._cursor = (this._cursor - 1 + items.length) % items.length;
      if (input.down) this._cursor = (this._cursor + 1) % items.length;
      this._render();

      if (input.confirm) {
        switch (items[this._cursor]) {
          case 'PARTY': this._phase = 'party'; this._cursor = 0; this._render(); break;
          case 'ITEMS': this._phase = 'items'; this._cursor = 0; this._render(); break;
          case 'SAVE':  this._showSave(); break;
          case 'CLOSE': this.close(); break;
        }
      }
      if (input.cancel) this.close();
      return;
    }

    if (this._phase === 'party') {
      const party = this.game.playerData.party;
      if (input.up)   this._cursor = Math.max(0, this._cursor - 1);
      if (input.down) this._cursor = Math.min(party.length, this._cursor + 1);
      this._render();
      if (input.cancel || (input.confirm && this._cursor === party.length)) {
        this._phase = 'main'; this._cursor = 0; this._render();
      }
      return;
    }

    if (this._phase === 'items') {
      const inv   = this.game.playerData.inventory;
      const items = Object.entries(inv).filter(([, c]) => c > 0);
      if (input.up)   this._cursor = Math.max(0, this._cursor - 1);
      if (input.down) this._cursor = Math.min(items.length, this._cursor + 1);
      this._render();
      if (input.cancel || (input.confirm && this._cursor === items.length)) {
        this._phase = 'main'; this._cursor = 0; this._render();
      }
      return;
    }

    if (this._phase === 'save') {
      if (input.confirm || input.cancel) {
        this._phase = 'main'; this._cursor = 0; this._render();
      }
    }
  }

  _render() {
    if (this._phase === 'main') {
      const items = ['PARTY', 'ITEMS', 'SAVE', 'CLOSE'];
      this._contentEl.innerHTML = items.map((item, i) =>
        `<div class="menu-item${i === this._cursor ? ' selected' : ''}">${item}</div>`
      ).join('');
    } else if (this._phase === 'party') {
      this._renderParty();
    } else if (this._phase === 'items') {
      this._renderItems();
    }
  }

  _renderParty() {
    const party = this.game.playerData.party;
    const data  = this.game.data;
    const rows  = party.map((c, i) => {
      const sp  = data.creatures.find(cr => cr.id === c.speciesId);
      const name = c.nickname || (sp ? sp.name : '???');
      const status = c.status ? `[${c.status.toUpperCase()}]` : '';
      const sel  = i === this._cursor ? ' selected' : '';
      return `<div class="menu-item party-row${sel}">
        <span class="pi-color" style="background:${sp ? sp.color : '#888'}"></span>
        <span class="pi-name">${name}</span>
        <span class="pi-level">Lv.${c.level}</span>
        <span class="pi-hp">${c.currentHp}/${c.maxHp} HP</span>
        <span class="pi-status">${status}</span>
      </div>`;
    });
    rows.push(`<div class="menu-item${this._cursor === party.length ? ' selected' : ''}">← Back</div>`);
    this._contentEl.innerHTML = `<div class="menu-subtitle">PARTY</div>` + rows.join('');
  }

  _renderItems() {
    const inv   = this.game.playerData.inventory;
    const data  = this.game.data.items;
    const items = Object.entries(inv)
      .filter(([, c]) => c > 0)
      .map(([id, count]) => {
        const d = data.find(i => i.id === parseInt(id));
        return { name: d ? d.name : `Item ${id}`, count };
      });

    const rows = items.map((item, i) => {
      const sel = i === this._cursor ? ' selected' : '';
      return `<div class="menu-item${sel}">${item.name} ×${item.count}</div>`;
    });
    rows.push(`<div class="menu-item${this._cursor === items.length ? ' selected' : ''}">← Back</div>`);
    this._contentEl.innerHTML = `<div class="menu-subtitle">ITEMS</div>` + rows.join('');
  }

  _showSave() {
    this._phase = 'save';
    this.game.save();
    this._contentEl.innerHTML = `<div class="menu-item">Game saved!</div>
      <div class="menu-subtitle" style="font-size:12px;color:#aaa">Press Z to continue</div>`;
  }
}
