export const STATES = {
  BOOT:      'BOOT',
  OVERWORLD: 'OVERWORLD',
  BATTLE:    'BATTLE',
  MENU:      'MENU',
  CUTSCENE:  'CUTSCENE',
  GAME_OVER: 'GAME_OVER',
};

export class StateManager {
  constructor(game) {
    this.game = game;
    this.currentState = null;
    this.currentStateName = null;
    this._states = {};
  }

  register(name, stateObj) {
    this._states[name] = stateObj;
  }

  change(name, data = {}) {
    if (this.currentState && this.currentState.exit) {
      this.currentState.exit();
    }
    this.currentStateName = name;
    this.currentState = this._states[name];
    if (!this.currentState) {
      console.error(`State "${name}" not registered.`);
      return;
    }
    if (this.currentState.enter) {
      this.currentState.enter(data);
    }
  }

  update(delta) {
    if (this.currentState && this.currentState.update) {
      this.currentState.update(delta);
    }
  }

  render() {
    if (this.currentState && this.currentState.render) {
      this.currentState.render();
    }
  }
}
