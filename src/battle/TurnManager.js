import { calculateDamage, expGained, expForLevel } from './DamageCalculator.js';

const SLEEP_TURNS_MIN = 2;
const SLEEP_TURNS_MAX = 5;

export class TurnManager {
  constructor(typeChart, moves) {
    this.typeChart = typeChart;
    this.movesData = moves; // array from moves.json
    this._moveMap  = Object.fromEntries(moves.map(m => [m.id, m]));
  }

  /** Attach move data to a creature (for AI access) */
  attachMoveData(creature) {
    creature._moveData = this._moveMap;
  }

  /** Resolve a full turn: playerAction vs enemyAction.
   *  Returns array of log messages.
   */
  async executeTurn(player, enemy, playerAction, enemyAction, ui) {
    const logs = [];

    // Determine order
    const [first, firstAction, second, secondAction] =
      this._turnOrder(player, enemy, playerAction, enemyAction);

    await this._executeAction(first, second, firstAction, ui, logs, false);

    if (second.currentHp > 0) {
      await this._executeAction(second, first, secondAction, ui, logs, true);
    }

    // End-of-turn status damage
    await this._applyEndOfTurnStatus(player, ui, logs);
    await this._applyEndOfTurnStatus(enemy, ui, logs);

    return logs;
  }

  _turnOrder(player, enemy, playerAction, enemyAction) {
    const playerMove = playerAction.type === 'move'
      ? this._moveMap[playerAction.moveId] : null;
    const enemyMove  = enemyAction.type === 'move'
      ? this._moveMap[enemyAction.moveId]  : null;

    const playerPri = playerMove ? playerMove.priority : 0;
    const enemyPri  = enemyMove  ? enemyMove.priority  : 0;

    if (playerPri !== enemyPri) {
      return playerPri > enemyPri
        ? [player, playerAction, enemy, enemyAction]
        : [enemy,  enemyAction,  player, playerAction];
    }
    // Speed tie-break (paralysis halves speed)
    const playerSpd = player.status === 'paralyze'
      ? Math.floor(player.stats.speed / 4) : player.stats.speed;
    const enemySpd  = enemy.status  === 'paralyze'
      ? Math.floor(enemy.stats.speed  / 4) : enemy.stats.speed;

    return playerSpd >= enemySpd
      ? [player, playerAction, enemy, enemyAction]
      : [enemy,  enemyAction,  player, playerAction];
  }

  async _executeAction(attacker, defender, action, ui, logs, isEnemy) {
    if (attacker.currentHp <= 0) return;
    if (action.type === 'skip') return; // item/capture turn — attacker skips

    if (action.type === 'move') {
      // Sleep check
      if (attacker.status === 'sleep') {
        attacker._sleepTurns = (attacker._sleepTurns || 0) - 1;
        if (attacker._sleepTurns <= 0) {
          attacker.status = null;
          const msg = `${attacker.displayName} woke up!`;
          logs.push(msg);
          await ui.showMessage(msg);
        } else {
          const msg = `${attacker.displayName} is fast asleep!`;
          logs.push(msg);
          await ui.showMessage(msg);
          return;
        }
      }

      // Paralysis full-stop (25% chance)
      if (attacker.status === 'paralyze' && Math.random() < 0.25) {
        const msg = `${attacker.displayName} is paralyzed! It can't move!`;
        logs.push(msg);
        await ui.showMessage(msg);
        return;
      }

      const move = this._moveMap[action.moveId];
      if (!move) return;

      // PP cost
      const moveSlot = attacker.moves.find(m => m.moveId === action.moveId);
      if (moveSlot && moveSlot.currentPp > 0) moveSlot.currentPp--;

      logs.push(`${attacker.displayName} used ${move.name}!`);
      await ui.showMessage(`${attacker.displayName} used ${move.name}!`);

      // Accuracy check
      if (move.accuracy < 100 && Math.random() * 100 > move.accuracy) {
        const msg = `${attacker.displayName}'s attack missed!`;
        logs.push(msg);
        await ui.showMessage(msg);
        return;
      }

      // Heal move
      if (move.effect === 'heal' && move.power === 0) {
        const healed = Math.floor(attacker.maxHp / 2);
        attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + healed);
        const msg = `${attacker.displayName} restored ${healed} HP!`;
        logs.push(msg);
        await ui.showMessage(msg);
        await ui.animateHeal(attacker);
        return;
      }

      // Damage
      const { damage, crit, effectiveness } = calculateDamage(
        attacker, move, defender, this.typeChart
      );

      if (crit) {
        logs.push('A critical hit!');
        await ui.showMessage('A critical hit!');
      }
      if (effectiveness > 1) {
        await ui.showMessage("It's super effective!");
      } else if (effectiveness < 1 && effectiveness > 0) {
        await ui.showMessage("It's not very effective...");
      } else if (effectiveness === 0) {
        await ui.showMessage("It had no effect...");
        return;
      }

      defender.currentHp = Math.max(0, defender.currentHp - damage);
      await ui.animateAttack(attacker, defender, damage);

      // Secondary effect
      if (move.effect && move.effectChance > 0 && Math.random() < move.effectChance) {
        if (!defender.status && move.effect !== 'heal') {
          defender.status = move.effect;
          if (move.effect === 'sleep') {
            defender._sleepTurns = SLEEP_TURNS_MIN +
              Math.floor(Math.random() * (SLEEP_TURNS_MAX - SLEEP_TURNS_MIN + 1));
          }
          const effectMsg = {
            burn:     `${defender.displayName} was burned!`,
            poison:   `${defender.displayName} was poisoned!`,
            paralyze: `${defender.displayName} was paralyzed!`,
            sleep:    `${defender.displayName} fell asleep!`,
          }[move.effect] || '';
          if (effectMsg) {
            logs.push(effectMsg);
            await ui.showMessage(effectMsg);
          }
        }
      }

    } else if (action.type === 'item') {
      // Item use handled before this — skip
    }
  }

  async _applyEndOfTurnStatus(creature, ui, logs) {
    if (creature.currentHp <= 0) return;
    if (creature.status === 'burn' || creature.status === 'poison') {
      const dmg = Math.max(1, Math.floor(creature.maxHp / 8));
      creature.currentHp = Math.max(0, creature.currentHp - dmg);
      const msg = creature.status === 'burn'
        ? `${creature.displayName} is hurt by its burn!`
        : `${creature.displayName} is hurt by poison!`;
      logs.push(msg);
      await ui.showMessage(msg);
      await ui.animateStatusDamage(creature);
    }
  }

  /** Grant experience and handle level-up */
  async grantExp(creature, enemyLevel, isTrainer, gameData, ui) {
    const exp = expGained(enemyLevel, isTrainer);
    creature.exp += exp;
    await ui.showMessage(`${creature.displayName} gained ${exp} exp!`);

    const species = gameData.creatures.find(c => c.id === creature.speciesId);
    const growthRate = species ? species.growthRate : 'medium';

    while (creature.exp >= expForLevel(creature.level + 1, growthRate)) {
      creature.level++;
      // Recalculate stats
      if (species) {
        for (const stat of ['attack','defense','speed','special']) {
          const base = species.baseStats[stat];
          creature.stats[stat] = Math.floor((base * 2 + 100) * creature.level / 100 + 5);
        }
        const newMaxHp = Math.floor((species.baseStats.hp * 2 + 100) * creature.level / 100 + 10);
        const hpGain   = newMaxHp - creature.maxHp;
        creature.maxHp   = newMaxHp;
        creature.currentHp = Math.min(creature.maxHp, creature.currentHp + hpGain);
      }

      await ui.showMessage(`${creature.displayName} grew to level ${creature.level}!`);

      // Learn new moves
      const newMoves = species ? species.learnset.filter(l => l.level === creature.level) : [];
      for (const lm of newMoves) {
        const moveData = gameData.moves.find(m => m.id === lm.moveId);
        if (!moveData) continue;
        if (creature.moves.length < 4) {
          creature.moves.push({ moveId: lm.moveId, currentPp: moveData.pp, maxPp: moveData.pp });
          await ui.showMessage(`${creature.displayName} learned ${moveData.name}!`);
        } else {
          await ui.showMessage(`${creature.displayName} wants to learn ${moveData.name}!`);
          await ui.showMessage(`But it already knows 4 moves. ${moveData.name} was not learned.`);
        }
      }
    }
  }
}
