export class InputManager {
  constructor() {
    this._keys = {};
    this._justPressed = {};
    this._justReleased = {};
    this._frameJustPressed = {};

    window.addEventListener('keydown', e => this._onKeyDown(e));
    window.addEventListener('keyup',   e => this._onKeyUp(e));
  }

  _onKeyDown(e) {
    const key = e.key;
    if (!this._keys[key]) {
      this._justPressed[key] = true;
      this._frameJustPressed[key] = true;
    }
    this._keys[key] = true;

    // Prevent arrow/space scrolling
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(key)) {
      e.preventDefault();
    }
  }

  _onKeyUp(e) {
    const key = e.key;
    this._keys[key] = false;
    this._justReleased[key] = true;
  }

  /** Called once per frame to flush just-pressed flags */
  update() {
    this._justPressed = { ...this._frameJustPressed };
    this._frameJustPressed = {};
    this._justReleased = {};
  }

  isDown(key)         { return !!this._keys[key]; }
  justPressed(key)    { return !!this._justPressed[key]; }
  justReleased(key)   { return !!this._justReleased[key]; }

  // Convenience aliases
  get confirm()  { return this.justPressed('z') || this.justPressed('Z') || this.justPressed('Enter'); }
  get cancel()   { return this.justPressed('x') || this.justPressed('X') || this.justPressed('Escape'); }
  get up()       { return this.justPressed('ArrowUp'); }
  get down()     { return this.justPressed('ArrowDown'); }
  get left()     { return this.justPressed('ArrowLeft'); }
  get right()    { return this.justPressed('ArrowRight'); }
  get upHeld()   { return this.isDown('ArrowUp'); }
  get downHeld() { return this.isDown('ArrowDown'); }
  get leftHeld() { return this.isDown('ArrowLeft'); }
  get rightHeld(){ return this.isDown('ArrowRight'); }
}
