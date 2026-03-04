const CHAR_DELAY = 25; // ms per character

export class DialogueBox {
  constructor(container) {
    this._el = document.createElement('div');
    this._el.id = 'dialogue-box';
    this._el.innerHTML = `
      <div class="dialogue-text" id="dialogue-text"></div>
      <div class="dialogue-arrow" id="dialogue-arrow">▼</div>
    `;
    this._el.style.display = 'none';
    container.appendChild(this._el);

    this._textEl  = this._el.querySelector('#dialogue-text');
    this._arrowEl = this._el.querySelector('#dialogue-arrow');
    this._resolve = null;
    this._skipped = false;
    this._fullText = '';

    // Click or Z/Enter skips/advances
    this._el.addEventListener('click', () => this._onAdvance());
    window.addEventListener('keydown', e => {
      if (e.key === 'z' || e.key === 'Z' || e.key === 'Enter') {
        if (this._el.style.display !== 'none') this._onAdvance();
      }
    });
  }

  _onAdvance() {
    this._skipped = true;
  }

  /** Show an array of dialogue strings one at a time, resolve when done */
  async show(lines) {
    this._el.style.display = 'block';
    for (const line of lines) {
      await this._showLine(line);
      await this._waitForAdvance();
    }
    this._el.style.display = 'none';
  }

  /** Show a single line with typewriter effect */
  async _showLine(text) {
    this._textEl.textContent = '';
    this._arrowEl.style.display = 'none';
    this._fullText = text;
    this._skipped = false;

    for (let i = 0; i <= text.length; i++) {
      if (this._skipped) {
        this._textEl.textContent = text;
        break;
      }
      this._textEl.textContent = text.slice(0, i);
      if (i < text.length) await _sleep(CHAR_DELAY);
    }
    this._arrowEl.style.display = 'block';
    this._skipped = false;
  }

  _waitForAdvance() {
    return new Promise(resolve => {
      const check = () => {
        if (this._skipped) {
          this._skipped = false;
          resolve();
        } else {
          requestAnimationFrame(check);
        }
      };
      requestAnimationFrame(check);
    });
  }

  isVisible() {
    return this._el.style.display !== 'none';
  }

  hide() {
    this._el.style.display = 'none';
  }
}

function _sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}
