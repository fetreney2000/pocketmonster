/**
 * BattleScene — manages the DOM-based battle visual.
 * The canvas is hidden; a full-screen DOM panel is shown instead.
 */
export class BattleScene {
  constructor(container) {
    this.container = container;
    this._el = null;
    this._playerEl  = null;
    this._enemyEl   = null;
    this._playerHpBar  = null;
    this._enemyHpBar   = null;
    this._playerHpText = null;
    this._enemyHpText  = null;
    this._playerExpBar = null;
    this._playerStatus = null;
    this._enemyStatus  = null;
    this._playerName   = null;
    this._enemyName    = null;
    this._playerLevel  = null;
    this._enemyLevel   = null;
    this._build();
  }

  _build() {
    this._el = document.createElement('div');
    this._el.id = 'battle-scene';
    this._el.innerHTML = `
      <div class="battle-bg">
        <!-- Enemy side -->
        <div class="battle-enemy-info" id="enemy-info">
          <div class="creature-name-row">
            <span class="creature-name" id="enemy-name">???</span>
            <span class="creature-level" id="enemy-level">Lv.1</span>
            <span class="status-badge" id="enemy-status"></span>
          </div>
          <div class="hp-bar-wrap">
            <span class="hp-label">HP</span>
            <div class="hp-bar-bg"><div class="hp-bar" id="enemy-hp-bar"></div></div>
          </div>
        </div>
        <div class="battle-enemy-sprite" id="enemy-sprite"></div>

        <!-- Player side -->
        <div class="battle-player-sprite" id="player-sprite"></div>
        <div class="battle-player-info" id="player-info">
          <div class="creature-name-row">
            <span class="creature-name" id="player-name">???</span>
            <span class="creature-level" id="player-level">Lv.1</span>
            <span class="status-badge" id="player-status"></span>
          </div>
          <div class="hp-bar-wrap">
            <span class="hp-label">HP</span>
            <div class="hp-bar-bg"><div class="hp-bar" id="player-hp-bar"></div></div>
            <span class="hp-text" id="player-hp-text">-- / --</span>
          </div>
          <div class="exp-bar-bg"><div class="exp-bar" id="player-exp-bar"></div></div>
        </div>
      </div>
    `;
    this._el.style.display = 'none';
    this.container.appendChild(this._el);

    this._playerEl    = this._el.querySelector('#player-sprite');
    this._enemyEl     = this._el.querySelector('#enemy-sprite');
    this._playerHpBar = this._el.querySelector('#player-hp-bar');
    this._enemyHpBar  = this._el.querySelector('#enemy-hp-bar');
    this._playerHpText= this._el.querySelector('#player-hp-text');
    this._playerExpBar= this._el.querySelector('#player-exp-bar');
    this._playerStatus= this._el.querySelector('#player-status');
    this._enemyStatus = this._el.querySelector('#enemy-status');
    this._playerName  = this._el.querySelector('#player-name');
    this._enemyName   = this._el.querySelector('#enemy-name');
    this._playerLevel = this._el.querySelector('#player-level');
    this._enemyLevel  = this._el.querySelector('#enemy-level');
  }

  show() { this._el.style.display = 'block'; }
  hide() { this._el.style.display = 'none'; }

  setCreatures(playerCreature, enemyCreature) {
    const pSp = playerCreature._species;
    const eSp = enemyCreature._species;

    this._playerEl.style.background = pSp ? pSp.color : '#E74C3C';
    this._enemyEl.style.background  = eSp ? eSp.color : '#3498DB';

    this._playerName.textContent = playerCreature.displayName;
    this._enemyName.textContent  = enemyCreature.displayName;

    this.updatePlayerStats(playerCreature);
    this.updateEnemyStats(enemyCreature);
  }

  updatePlayerStats(creature) {
    this._playerLevel.textContent = `Lv.${creature.level}`;
    this._playerHpText.textContent = `${creature.currentHp} / ${creature.maxHp}`;
    this._setHpBar(this._playerHpBar, creature.currentHp, creature.maxHp);
    this._setExpBar(creature);
    this._setStatus(this._playerStatus, creature.status);
  }

  updateEnemyStats(creature) {
    this._enemyLevel.textContent = `Lv.${creature.level}`;
    this._setHpBar(this._enemyHpBar, creature.currentHp, creature.maxHp);
    this._setStatus(this._enemyStatus, creature.status);
  }

  _setHpBar(el, current, max) {
    const pct = Math.max(0, Math.min(100, (current / max) * 100));
    el.style.width = pct + '%';
    el.style.background = pct > 50 ? '#2ECC71' : pct > 25 ? '#F39C12' : '#E74C3C';
  }

  _setExpBar(creature) {
    // Simplified exp display
    const lvlExp  = Math.pow(creature.level, 3);
    const nextExp = Math.pow(creature.level + 1, 3);
    const pct = ((creature.exp - lvlExp) / (nextExp - lvlExp)) * 100;
    this._playerExpBar.style.width = Math.max(0, Math.min(100, pct || 0)) + '%';
  }

  _setStatus(el, status) {
    const labels = { burn:'BRN', poison:'PSN', paralyze:'PAR', sleep:'SLP', null:'', undefined:'' };
    const colors = { burn:'#E67E22', poison:'#9B59B6', paralyze:'#F1C40F', sleep:'#1ABC9C' };
    el.textContent = labels[status] || '';
    el.style.background = colors[status] || 'transparent';
  }

  async animateAttack(attacker, defender, isPlayer) {
    const el = isPlayer ? this._enemyEl : this._playerEl;
    el.classList.add('shake');
    await _delay(400);
    el.classList.remove('shake');
    // Flash attacker
    const attackerEl = isPlayer ? this._playerEl : this._enemyEl;
    attackerEl.classList.add('flash');
    await _delay(150);
    attackerEl.classList.remove('flash');
  }

  async animateFaint(isPlayer) {
    const el = isPlayer ? this._playerEl : this._enemyEl;
    el.classList.add('faint');
    await _delay(500);
  }

  async animateCapture(shakes) {
    // Ball shake animation
    for (let i = 0; i < shakes; i++) {
      this._enemyEl.classList.add('shake');
      await _delay(300);
      this._enemyEl.classList.remove('shake');
      await _delay(200);
    }
  }

  resetFaint() {
    this._playerEl.classList.remove('faint');
    this._enemyEl.classList.remove('faint');
  }
}

export function _delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
