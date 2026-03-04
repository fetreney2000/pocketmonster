import * as THREE from 'three';
import { StateManager, STATES } from './StateManager.js';
import { InputManager }         from './InputManager.js';
import { TileMap }              from '../world/TileMap.js';
import { CollisionSystem }      from '../world/CollisionSystem.js';
import { Player }               from '../world/Player.js';
import { NPC }                  from '../world/NPC.js';
import { EncounterSystem }      from '../world/EncounterSystem.js';
import { TurnManager }          from '../battle/TurnManager.js';
import { BattleScene, _delay }  from '../battle/BattleScene.js';
import { AIController }         from '../battle/AIController.js';
import { CaptureSystem }        from '../battle/CaptureSystem.js';
import { DialogueBox }          from '../ui/DialogueBox.js';
import { BattleUI }             from '../ui/BattleUI.js';
import { Menu }                 from '../ui/Menu.js';
// calcHP and calcStat are used via EncounterSystem

const TILE_SIZE      = 32;
const VISIBLE_X      = 20;
const VISIBLE_Y      = 15;
const CANVAS_W       = TILE_SIZE * VISIBLE_X; // 640
const CANVAS_H       = TILE_SIZE * VISIBLE_Y; // 480
const SAVE_KEY       = 'pocketmonster_save';
const AUTOSAVE_INTERVAL = 300; // seconds

// NPC definitions
const NPC_DEFS = [
  {
    id: 'eli', name: 'Old Eli', x: 10, y: 16, direction: 'down', type: 'normal',
    dialogue: [
      'Welcome to Mossfield Town, young one!',
      'Wild creatures roam the tall grass to the north and south.',
      'Press Z or ENTER to confirm. Arrow keys to move.',
      'Press X or ESC to open the menu. Good luck!'
    ]
  },
  {
    id: 'mia', name: 'Trainer Mia', x: 5, y: 7, direction: 'right', type: 'trainer',
    sightRange: 4,
    dialogue: ['You look like a trainer! I challenge you!'],
    defeatedDialogue: ['You\'re stronger than I thought. Well fought!'],
    trainerParty: [
      { speciesId: 10, level: 6 },  // Zapplet
      { speciesId: 13, level: 5 },  // Fluffpaw
    ]
  },
  {
    id: 'tom', name: 'Shopkeeper Tom', x: 15, y: 16, direction: 'down', type: 'normal',
    dialogue: [
      'Welcome to my shop!',
      'I\'d sell you things, but I seem to have misplaced my stock...',
      'Check back later!'
    ]
  },
  {
    id: 'sara', name: 'Trainer Sara', x: 20, y: 7, direction: 'down', type: 'trainer',
    sightRange: 3,
    dialogue: ['My creatures are unstoppable!'],
    defeatedDialogue: ['Impossible! My Thornbush never loses!'],
    trainerParty: [
      { speciesId: 8, level: 9 },   // Thornbush
    ]
  },
];

export class Game {
  constructor(canvas) {
    this.canvas = canvas;

    // Three.js setup
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    this.renderer.setSize(CANVAS_W, CANVAS_H);
    this.renderer.setClearColor(0x000000);

    this.scene  = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(
      -VISIBLE_X / 2, VISIBLE_X / 2,
       VISIBLE_Y / 2, -VISIBLE_Y / 2,
       0.1, 100
    );
    this.camera.position.set(0, 0, 10);

    // Container for DOM overlays
    this.uiContainer = document.getElementById('ui-overlay');

    // Core systems
    this.input        = new InputManager();
    this.stateManager = new StateManager(this);

    // Game data (loaded async)
    this.data = {};

    // Player persistent data
    this.playerData = {
      x: 12, y: 18,
      party: [],
      storage: [],
      inventory: { 1: 5, 4: 1 }, // 5 CaptureBalls, 1 Potion
      badges: [],
      storyFlags: {},
      playTime: 0,
    };

    this._lastTimestamp = 0;
    this._autosaveTimer = 0;
    this._rafId = null;
  }

  async init() {
    // Load all data files
    const [creatures, moves, typeChart, items] = await Promise.all([
      fetch('./src/data/creatures.json').then(r => r.json()),
      fetch('./src/data/moves.json').then(r => r.json()),
      fetch('./src/data/typeChart.json').then(r => r.json()),
      fetch('./src/data/items.json').then(r => r.json()),
    ]);
    this.data = { creatures, moves, typeChart, items };

    // Try loading save
    const loaded = this.load();

    // If no save, create starter party
    if (!loaded || this.playerData.party.length === 0) {
      const encounterSys = new EncounterSystem(this.data);
      const starter = encounterSys.createCreatureInstance(1, 5); // Embrik lvl 5
      this.playerData.party = [starter];
      this.playerData.inventory = { 1: 5, 4: 1 };
    }

    // Register states
    this.stateManager.register(STATES.BOOT,      new BootState(this));
    this.stateManager.register(STATES.OVERWORLD, new OverworldState(this));
    this.stateManager.register(STATES.BATTLE,    new BattleState(this));
    this.stateManager.register(STATES.MENU,      new MenuState(this));
    this.stateManager.register(STATES.GAME_OVER, new GameOverState(this));

    // Window resize
    window.addEventListener('resize', () => this._resize());
    this._resize();

    // Start
    this.stateManager.change(STATES.BOOT);
    this._loop(0);
  }

  _loop(timestamp) {
    const delta = Math.min((timestamp - this._lastTimestamp) / 1000, 0.05);
    this._lastTimestamp = timestamp;
    this._autosaveTimer += delta;
    if (this._autosaveTimer >= AUTOSAVE_INTERVAL) {
      this.save();
      this._autosaveTimer = 0;
    }

    this.playerData.playTime = (this.playerData.playTime || 0) + delta;

    this.input.update();
    this.stateManager.update(delta);
    this.stateManager.render();

    this._rafId = requestAnimationFrame(t => this._loop(t));
  }

  _resize() {
    const aspect = CANVAS_W / CANVAS_H;
    let w = window.innerWidth;
    let h = window.innerHeight;
    if (w / h > aspect) w = h * aspect;
    else h = w / aspect;

    this.canvas.style.width  = w + 'px';
    this.canvas.style.height = h + 'px';
    this.uiContainer.style.width  = w + 'px';
    this.uiContainer.style.height = h + 'px';

    // Centre
    const left = (window.innerWidth  - w) / 2;
    const top  = (window.innerHeight - h) / 2;
    this.canvas.style.left = left + 'px';
    this.canvas.style.top  = top  + 'px';
    this.uiContainer.style.left = left + 'px';
    this.uiContainer.style.top  = top  + 'px';
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        playerPos:  { x: this.playerData.x, y: this.playerData.y },
        party:      this.playerData.party,
        storage:    this.playerData.storage,
        inventory:  this.playerData.inventory,
        badges:     this.playerData.badges,
        storyFlags: this.playerData.storyFlags,
        playTime:   this.playerData.playTime,
      }));
    } catch (e) { console.warn('Save failed', e); }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const save = JSON.parse(raw);
      this.playerData.x          = save.playerPos?.x ?? 12;
      this.playerData.y          = save.playerPos?.y ?? 18;
      this.playerData.party      = save.party      ?? [];
      this.playerData.storage    = save.storage    ?? [];
      this.playerData.inventory  = save.inventory  ?? { 1: 5, 4: 1 };
      this.playerData.badges     = save.badges     ?? [];
      this.playerData.storyFlags = save.storyFlags ?? {};
      this.playerData.playTime   = save.playTime   ?? 0;
      return true;
    } catch (e) { return false; }
  }
}

// ─── BOOT STATE ─────────────────────────────────────────────────────────────
class BootState {
  constructor(game) {
    this.game = game;
    this._el = null;
    this._cursor = 0;
    this._hasSave = false;
    this._build();
  }

  _build() {
    this._el = document.createElement('div');
    this._el.id = 'boot-screen';
    this._el.innerHTML = `
      <div class="boot-title">PocketMonster</div>
      <div class="boot-subtitle">A Monster-Catching Adventure</div>
      <div id="boot-options"></div>
      <div class="boot-hint">Arrow Keys + Z/Enter to select</div>
    `;
    this._el.style.display = 'none';
    this.game.uiContainer.appendChild(this._el);
  }

  enter() {
    this._hasSave = !!localStorage.getItem(SAVE_KEY);
    this._cursor  = 0;
    this._render();
    this._el.style.display = 'flex';
    // Dim the Three.js canvas during boot
    this.game.canvas.style.opacity = '0.3';
  }

  exit() {
    this._el.style.display = 'none';
    this.game.canvas.style.opacity = '1';
  }

  _render() {
    const opts = ['NEW GAME'];
    if (this._hasSave) opts.push('CONTINUE');
    this._el.querySelector('#boot-options').innerHTML = opts.map((o, i) =>
      `<div class="boot-option${i === this._cursor ? ' selected' : ''}">${o}</div>`
    ).join('');
  }

  update() {
    const opts = this._hasSave ? 2 : 1;
    if (this.game.input.up)   { this._cursor = (this._cursor - 1 + opts) % opts; this._render(); }
    if (this.game.input.down) { this._cursor = (this._cursor + 1) % opts; this._render(); }

    if (this.game.input.confirm) {
      if (this._cursor === 0) {
        // New game — clear any existing save, reset player data
        localStorage.removeItem(SAVE_KEY);
        const enc = new EncounterSystem(this.game.data);
        const starter = enc.createCreatureInstance(1, 5);
        this.game.playerData.party     = [starter];
        this.game.playerData.inventory = { 1: 5, 4: 1 };
        this.game.playerData.x = 12;
        this.game.playerData.y = 18;
        this.game.playerData.badges     = [];
        this.game.playerData.storyFlags = {};
        this.game.playerData.playTime   = 0;
      }
      this.game.stateManager.change(STATES.OVERWORLD);
    }
  }

  render() {
    this.game.renderer.render(this.game.scene, this.game.camera);
  }
}

// ─── OVERWORLD STATE ─────────────────────────────────────────────────────────
class OverworldState {
  constructor(game) {
    this.game       = game;
    this.tileMap    = null;
    this.collision  = null;
    this.player     = null;
    this.npcs       = [];
    this.encounter  = null;
    this.dialogue   = null;
    this.menu       = null;
    this._active    = false;
    this._interacting = false;
  }

  enter(data) {
    this.game.canvas.style.display = 'block';
    this._active = true;
    this._interacting = false;

    if (!this.tileMap) {
      this.tileMap   = new TileMap(this.game.scene);
      this.collision = new CollisionSystem(this.tileMap);
      this.encounter = new EncounterSystem(this.game.data);
    }

    if (!this.dialogue) {
      this.dialogue = new DialogueBox(this.game.uiContainer);
    }
    if (!this.menu) {
      this.menu = new Menu(this.game.uiContainer, this.game);
    }

    if (!this.player) {
      this.player = new Player(
        this.game.scene, this.collision,
        this.game.playerData.x, this.game.playerData.y
      );
    } else {
      this.player.setPosition(this.game.playerData.x, this.game.playerData.y);
    }

    // Create NPCs (only once)
    if (this.npcs.length === 0) {
      for (const def of NPC_DEFS) {
        this.npcs.push(new NPC(this.game.scene, def));
      }
    }
    // Restore NPC defeat flags
    for (const npc of this.npcs) {
      npc.defeated = !!this.game.playerData.storyFlags[`npc_${npc.id}_defeated`];
    }
  }

  exit() {
    this._active = false;
    this.game.playerData.x = this.player ? this.player.tileX : this.game.playerData.x;
    this.game.playerData.y = this.player ? this.player.tileY : this.game.playerData.y;
  }

  update(delta) {
    if (!this._active) return;
    if (this._interacting) return;  // freeze while dialogue/menu runs

    // Menu
    if (this.game.input.cancel && !this.dialogue.isVisible()) {
      this._openMenu();
      return;
    }

    if (this.menu && this.menu.isOpen()) {
      this.menu.handleInput(this.game.input);
      return;
    }

    // Update NPCs
    for (const npc of this.npcs) {
      npc.update(delta, this.collision);
    }

    // Trainer line-of-sight check (only when player isn't moving)
    if (!this.player.isMoving) {
      for (const npc of this.npcs) {
        if (npc.canSeePlayer(this.player.tileX, this.player.tileY)) {
          this._initiateTrainerBattle(npc);
          return;
        }
      }
    }

    // Player movement input
    if (!this.player.isMoving) {
      let dx = 0, dy = 0;
      if (this.game.input.upHeld)    dy = -1;
      else if (this.game.input.downHeld)  dy =  1;
      else if (this.game.input.leftHeld)  dx = -1;
      else if (this.game.input.rightHeld) dx =  1;

      if (dx !== 0 || dy !== 0) this.player.tryMove(dx, dy);

      // Interact
      if (this.game.input.confirm) {
        this._tryInteract();
      }
    }

    this.player.update(delta);

    // After player finishes moving — encounter check
    if (this.player.justMoved) {
      this.game.playerData.x = this.player.tileX;
      this.game.playerData.y = this.player.tileY;

      if (this.collision.isEncounterTile(this.player.tileX, this.player.tileY)) {
        const wild = this.encounter.roll(this.player.tileX, this.player.tileY);
        if (wild) {
          this._startWildBattle(wild);
          return;
        }
      }
    }

    // Camera follow
    this._updateCamera();
  }

  _updateCamera() {
    const MAP_W = 30, MAP_H = 30;
    const halfX = VISIBLE_X / 2, halfY = VISIBLE_Y / 2;
    const cx = Math.max(halfX, Math.min(MAP_W - 1 - halfX, this.player.visualX));
    const cy = Math.max(halfY, Math.min(MAP_H - 1 - halfY, this.player.visualY));
    this.game.camera.position.set(cx, -cy, 10);
  }

  _tryInteract() {
    const dx = this.player.direction === 'left' ? -1 : this.player.direction === 'right' ? 1 : 0;
    const dy = this.player.direction === 'up'   ? -1 : this.player.direction === 'down'  ? 1 : 0;
    const fx = this.player.tileX + dx;
    const fy = this.player.tileY + dy;

    for (const npc of this.npcs) {
      if (npc.tileX === fx && npc.tileY === fy) {
        npc.facePlayer(this.player.tileX, this.player.tileY);
        const lines = (npc.type === 'trainer' && npc.defeated)
          ? (npc.defeatedDialogue || ['...'])
          : npc.dialogue;

        if (npc.type === 'trainer' && !npc.defeated) {
          this._initiateTrainerBattle(npc);
        } else {
          this._showDialogue(lines);
        }
        return;
      }
    }
  }

  _showDialogue(lines) {
    this._interacting = true;
    this.dialogue.show(lines).then(() => {
      this._interacting = false;
    });
  }

  _openMenu() {
    this._interacting = true;
    this.menu.open().then(() => {
      this._interacting = false;
    });
  }

  _startWildBattle(wildCreature) {
    this._interacting = true;
    this.game.stateManager.change(STATES.BATTLE, {
      type: 'wild',
      enemy: wildCreature,
    });
  }

  _initiateTrainerBattle(npc) {
    this._interacting = true;
    const trainerParty = npc.trainerParty.map(p => {
      const enc = new EncounterSystem(this.game.data);
      return enc.createCreatureInstance(p.speciesId, p.level);
    });
    this.game.stateManager.change(STATES.BATTLE, {
      type: 'trainer',
      trainerName: npc.name,
      trainerParty,
      npcId: npc.id,
    });
  }

  render() {
    this.game.renderer.render(this.game.scene, this.game.camera);
  }
}

// ─── BATTLE STATE ────────────────────────────────────────────────────────────
class BattleState {
  constructor(game) {
    this.game        = game;
    this.battleScene = null;
    this.battleUI    = null;
    this.turnManager = null;
    this.aiCtrl      = null;
    this.capture     = null;
    this._running    = false;
    this._init();
  }

  _init() {
    this.battleScene = new BattleScene(this.game.uiContainer);
    this.battleUI    = new BattleUI(this.game.uiContainer, this.game.input, this.battleScene);
    this.turnManager = new TurnManager(this.game.data.typeChart, this.game.data.moves);
    this.aiCtrl      = new AIController(this.game.data.typeChart);
    this.capture     = new CaptureSystem();
  }

  enter(data) {
    this._battleData  = data;
    this._running     = true;
    this._isTrainer   = data.type === 'trainer';
    this._trainerParty = data.trainerParty || [];
    this._trainerIndex = 0;

    this.game.canvas.style.display = 'none';
    this.battleScene.show();
    this.battleUI.show();

    // Get first party creature
    this._playerCreature = this._getFirstAlive();
    if (!this._playerCreature) {
      // No live creatures — game over
      this.game.stateManager.change(STATES.GAME_OVER);
      return;
    }

    // Attach species data
    this._attachSpecies(this._playerCreature);

    // Enemy creature
    if (this._isTrainer) {
      this._enemyCreature = this._trainerParty[0];
      this._attachSpecies(this._enemyCreature);
    } else {
      this._enemyCreature = data.enemy;
      this._attachSpecies(this._enemyCreature);
    }

    // Attach move data
    this.turnManager.attachMoveData(this._playerCreature);
    this.turnManager.attachMoveData(this._enemyCreature);

    this.battleScene.setCreatures(this._playerCreature, this._enemyCreature);
    this.battleUI.setContext(
      this._playerCreature, this._enemyCreature,
      this.game.playerData.inventory, this.game.data.items
    );

    // Start async battle loop
    this._runBattle();
  }

  exit() {
    this._running = false;
    this.battleScene.hide();
    this.battleUI.hide();
    this.battleUI.clearMenus();
    this.battleScene.resetFaint();
    this.game.canvas.style.display = 'block';

    // Re-enable overworld interaction
    const ow = this.game.stateManager._states[STATES.OVERWORLD];
    if (ow) ow._interacting = false;
  }

  _getFirstAlive() {
    return this.game.playerData.party.find(c => c.currentHp > 0) || null;
  }

  _attachSpecies(creature) {
    creature._species = this.game.data.creatures.find(c => c.id === creature.speciesId);
    creature.displayName = creature.nickname || (creature._species ? creature._species.name : '???');
  }

  async _runBattle() {
    const intro = this._isTrainer
      ? `${this._battleData.trainerName} wants to battle!`
      : `A wild ${this._enemyCreature.displayName} appeared!`;
    await this.battleUI.showMessage(intro);
    await this.battleUI.showMessage(`Go, ${this._playerCreature.displayName}!`);

    while (this._running) {
      // ── PLAYER CHOOSE ──────────────────────────────────────────────
      const action = await this._playerChooseAction();
      if (!this._running) break;

      // ── EXECUTE TURN ───────────────────────────────────────────────
      if (action.type === 'run') {
        if (this._isTrainer) {
          await this.battleUI.showMessage("You can't run from a trainer battle!");
          continue;
        }
        const escaped = Math.random() < 0.5; // simplified escape
        if (escaped) {
          await this.battleUI.showMessage('Got away safely!');
          this._endBattle(false);
          return;
        } else {
          await this.battleUI.showMessage("Can't escape!");
        }
      } else if (action.type === 'item') {
        await this._useItem(action.itemId);
        // Enemy still gets a turn
        const enemyMove = this.aiCtrl.chooseMove(
          this._enemyCreature, this._playerCreature, this._isTrainer
        );
        if (enemyMove) {
          const eAction = { type: 'move', moveId: enemyMove.moveId };
          await this.turnManager.executeTurn(
            this._playerCreature, this._enemyCreature,
            { type: 'skip' }, eAction,
            this.battleUI
          );
        }
      } else {
        // move or capture
        if (action.type === 'capture') {
          const result = await this._attemptCapture(action.itemId);
          if (result) return; // Caught!
          // Enemy turn after failed capture
          const em = this.aiCtrl.chooseMove(this._enemyCreature, this._playerCreature, false);
          if (em) {
            await this.turnManager.executeTurn(
              this._playerCreature, this._enemyCreature,
              { type: 'skip' }, { type: 'move', moveId: em.moveId },
              this.battleUI
            );
          }
        } else {
          // normal move
          const enemyMove = this.aiCtrl.chooseMove(
            this._enemyCreature, this._playerCreature, this._isTrainer
          );
          const eAction = enemyMove
            ? { type: 'move', moveId: enemyMove.moveId }
            : { type: 'skip' };

          await this.turnManager.executeTurn(
            this._playerCreature, this._enemyCreature,
            action, eAction, this.battleUI
          );
        }
      }

      if (!this._running) break;

      // Update UI
      this.battleScene.updatePlayerStats(this._playerCreature);
      this.battleScene.updateEnemyStats(this._enemyCreature);

      // ── CHECK FAINT ────────────────────────────────────────────────
      if (this._enemyCreature.currentHp <= 0) {
        await this.battleScene.animateFaint(false);
        await this.battleUI.showMessage(`${this._enemyCreature.displayName} fainted!`);

        // Exp gain
        await this.turnManager.grantExp(
          this._playerCreature, this._enemyCreature.level,
          this._isTrainer, this.game.data, this.battleUI
        );
        this.battleScene.updatePlayerStats(this._playerCreature);

        if (this._isTrainer && this._trainerIndex + 1 < this._trainerParty.length) {
          this._trainerIndex++;
          this._enemyCreature = this._trainerParty[this._trainerIndex];
          this._attachSpecies(this._enemyCreature);
          this.turnManager.attachMoveData(this._enemyCreature);
          this.battleScene.resetFaint();
          this.battleScene.setCreatures(this._playerCreature, this._enemyCreature);
          this.battleUI.setContext(
            this._playerCreature, this._enemyCreature,
            this.game.playerData.inventory, this.game.data.items
          );
          await this.battleUI.showMessage(
            `${this._battleData.trainerName} sent out ${this._enemyCreature.displayName}!`
          );
          continue;
        }

        // Win
        if (this._isTrainer) {
          await this.battleUI.showMessage(`You defeated ${this._battleData.trainerName}!`);
          this.game.playerData.storyFlags[`npc_${this._battleData.npcId}_defeated`] = true;
        } else {
          await this.battleUI.showMessage(`Wild ${this._enemyCreature.displayName} fainted!`);
        }
        this._endBattle(true);
        return;
      }

      if (this._playerCreature.currentHp <= 0) {
        await this.battleScene.animateFaint(true);
        await this.battleUI.showMessage(`${this._playerCreature.displayName} fainted!`);

        // Switch to next alive creature
        const next = this.game.playerData.party.find(
          c => c !== this._playerCreature && c.currentHp > 0
        );
        if (!next) {
          await this.battleUI.showMessage('All your creatures fainted!');
          this.game.stateManager.change(STATES.GAME_OVER);
          return;
        }
        this._playerCreature = next;
        this._attachSpecies(this._playerCreature);
        this.turnManager.attachMoveData(this._playerCreature);
        this.battleScene.resetFaint();
        this.battleScene.setCreatures(this._playerCreature, this._enemyCreature);
        this.battleUI.setContext(
          this._playerCreature, this._enemyCreature,
          this.game.playerData.inventory, this.game.data.items
        );
        await this.battleUI.showMessage(`Go, ${this._playerCreature.displayName}!`);
      }
    }
  }

  async _playerChooseAction() {
    while (true) {
      const choice = await this.battleUI.showMainMenu();
      if (!this._running) return { type: 'run' };

      switch (choice.type) {
        case 'fight': {
          const moveId = await this.battleUI.showMoveMenu();
          if (moveId !== null) return { type: 'move', moveId };
          break; // back to main menu
        }
        case 'bag': {
          const bagChoice = await this.battleUI.showBagMenu();
          if (bagChoice !== null) {
            const itemData = this.game.data.items.find(i => i.id === bagChoice.itemId);
            if (itemData && itemData.type === 'ball' && !this._isTrainer) {
              return { type: 'capture', itemId: bagChoice.itemId };
            }
            return { type: 'item', itemId: bagChoice.itemId };
          }
          break;
        }
        case 'party': {
          await this.battleUI.showMessage('Party switching not implemented yet!');
          break;
        }
        case 'run':
          return { type: 'run' };
      }
    }
  }

  async _useItem(itemId) {
    const itemData = this.game.data.items.find(i => i.id === itemId);
    if (!itemData) return;
    const inv = this.game.playerData.inventory;
    if (!inv[itemId] || inv[itemId] <= 0) return;

    inv[itemId]--;
    const target = this._playerCreature;

    if (itemData.type === 'heal') {
      const healed = Math.min(itemData.healAmount, target.maxHp - target.currentHp);
      target.currentHp += healed;
      await this.battleUI.showMessage(`Used ${itemData.name}! ${target.displayName} recovered ${healed} HP.`);
      this.battleScene.updatePlayerStats(target);
    } else if (itemData.type === 'status') {
      if (target.status === itemData.curesStatus) {
        target.status = null;
        await this.battleUI.showMessage(`Used ${itemData.name}! ${target.displayName} was cured!`);
        this.battleScene.updatePlayerStats(target);
      } else {
        await this.battleUI.showMessage(`It had no effect on ${target.displayName}!`);
        inv[itemId]++; // refund
      }
    } else if (itemData.type === 'fullrestore') {
      target.currentHp = target.maxHp;
      target.status = null;
      await this.battleUI.showMessage(`Used ${itemData.name}! ${target.displayName} fully restored!`);
      this.battleScene.updatePlayerStats(target);
    }
  }

  async _attemptCapture(itemId) {
    const itemData = this.game.data.items.find(i => i.id === itemId);
    if (!itemData) return false;
    const inv = this.game.playerData.inventory;
    if (!inv[itemId] || inv[itemId] <= 0) {
      await this.battleUI.showMessage("No more balls of that type!");
      return false;
    }
    inv[itemId]--;

    const species = this._enemyCreature._species;
    await this.battleUI.showMessage(`Threw a ${itemData.name}!`);

    const { captured, shakes } = this.capture.attempt(
      this._enemyCreature, itemData, species
    );

    await this.battleScene.animateCapture(shakes);

    if (captured) {
      await this.battleUI.showMessage(`Gotcha! ${this._enemyCreature.displayName} was caught!`);
      const party = this.game.playerData.party;
      if (party.length < 6) {
        party.push(this._enemyCreature);
        await this.battleUI.showMessage(`${this._enemyCreature.displayName} was added to your party!`);
      } else {
        this.game.playerData.storage.push(this._enemyCreature);
        await this.battleUI.showMessage(`Party full! ${this._enemyCreature.displayName} sent to storage.`);
      }
      this._endBattle(true);
      return true;
    } else {
      const msgs = [
        `${this._enemyCreature.displayName} broke free!`,
        'So close!', 'Oh no! The creature broke free!', 'It escaped!',
      ];
      await this.battleUI.showMessage(msgs[Math.min(shakes, msgs.length - 1)]);
      return false;
    }
  }

  _endBattle(won) {
    if (!this._running) return;
    this._running = false;
    // Short delay then return to overworld
    setTimeout(() => {
      this.game.stateManager.change(STATES.OVERWORLD);
    }, 300);
  }

  update() {
    // Handle battle UI input (menu navigation)
    if (this._running) {
      this.battleUI.handleInput();
    }
  }

  render() {
    // Battle is DOM-based; Three.js canvas is hidden
  }
}

// ─── MENU STATE ─────────────────────────────────────────────────────────────
class MenuState {
  constructor(game) { this.game = game; }
  enter()  {}
  exit()   {}
  update() {}
  render() { this.game.renderer.render(this.game.scene, this.game.camera); }
}

// ─── GAME OVER STATE ─────────────────────────────────────────────────────────
class GameOverState {
  constructor(game) {
    this.game = game;
    this._el  = null;
    this._build();
  }

  _build() {
    this._el = document.createElement('div');
    this._el.id = 'gameover-screen';
    this._el.innerHTML = `
      <div class="gameover-title">GAME OVER</div>
      <div class="gameover-sub">All your creatures fainted...</div>
      <div class="gameover-hint">Press Z or ENTER to continue</div>
    `;
    this._el.style.display = 'none';
    this.game.uiContainer.appendChild(this._el);
  }

  enter() {
    this._el.style.display = 'flex';
    this.game.canvas.style.display = 'none';
    // Heal all party creatures to 1 HP
    for (const c of this.game.playerData.party) {
      if (c.currentHp <= 0) c.currentHp = 1;
    }
  }

  exit() {
    this._el.style.display = 'none';
    this.game.canvas.style.display = 'block';
  }

  update() {
    if (this.game.input.confirm) {
      this.game.stateManager.change(STATES.OVERWORLD);
    }
  }

  render() {}
}
