/**
 * AIController — decides moves for CPU-controlled creatures.
 *
 * Wild AI   : weighted random from available moves.
 * Trainer AI: prefer super-effective moves; use Recover if HP < 30%.
 */
export class AIController {
  constructor(typeChart) {
    this.typeChart = typeChart;
  }

  chooseMove(user, target, isTrainer = false) {
    const availableMoves = user.moves.filter(m => m.currentPp > 0);
    if (availableMoves.length === 0) return null; // Struggle (handled in TurnManager)

    if (!isTrainer) {
      return this._weightedRandom(availableMoves, user, target);
    }
    return this._trainerLogic(availableMoves, user, target);
  }

  _weightedRandom(moves, user, target) {
    // Weight by power × effectiveness
    const weights = moves.map(m => {
      const moveData = user._moveData ? user._moveData[m.moveId] : null;
      if (!moveData) return 1;
      const eff = this._getEffectiveness(moveData.type, target);
      return Math.max(1, (moveData.power || 1) * eff);
    });
    const total = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    for (let i = 0; i < moves.length; i++) {
      r -= weights[i];
      if (r <= 0) return moves[i];
    }
    return moves[moves.length - 1];
  }

  _trainerLogic(moves, user, target) {
    // Heal if HP < 30%
    const healMove = moves.find(m => {
      const md = user._moveData ? user._moveData[m.moveId] : null;
      return md && md.effect === 'heal';
    });
    if (healMove && user.currentHp < user.maxHp * 0.30) {
      return healMove;
    }

    // Find most effective move
    let best = null;
    let bestScore = -1;
    for (const m of moves) {
      const md = user._moveData ? user._moveData[m.moveId] : null;
      if (!md) continue;
      const eff = this._getEffectiveness(md.type, target);
      const score = (md.power || 0) * eff;
      if (score > bestScore) { bestScore = score; best = m; }
    }
    return best || moves[Math.floor(Math.random() * moves.length)];
  }

  _getEffectiveness(moveType, target) {
    if (!target._species) return 1;
    let eff = 1.0;
    for (const dtype of target._species.types) {
      const row = this.typeChart[moveType];
      if (row && row[dtype] !== undefined) eff *= row[dtype];
    }
    return eff;
  }
}
