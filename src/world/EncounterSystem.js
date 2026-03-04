import { calcHP, calcStat } from '../battle/DamageCalculator.js';

// Encounter tables per named area
const AREAS = [
  {
    name: 'northGrass',
    bounds: { x1: 1, y1: 1, x2: 28, y2: 14 },
    encounterRate: 0.13,
    encounters: [
      { speciesId: 7,  minLevel: 3, maxLevel: 7,  weight: 25 }, // Sproutik
      { speciesId: 10, minLevel: 3, maxLevel: 7,  weight: 25 }, // Zapplet
      { speciesId: 13, minLevel: 3, maxLevel: 6,  weight: 20 }, // Fluffpaw
      { speciesId: 1,  minLevel: 4, maxLevel: 8,  weight: 15 }, // Embrik
      { speciesId: 4,  minLevel: 4, maxLevel: 8,  weight: 15 }, // Aquapup
    ],
  },
  {
    name: 'southGrass',
    bounds: { x1: 1, y1: 21, x2: 19, y2: 27 },
    encounterRate: 0.12,
    encounters: [
      { speciesId: 13, minLevel: 5, maxLevel: 12, weight: 25 }, // Fluffpaw
      { speciesId: 14, minLevel: 8, maxLevel: 14, weight: 20 }, // Tufftail
      { speciesId: 7,  minLevel: 6, maxLevel: 12, weight: 20 }, // Sproutik
      { speciesId: 10, minLevel: 6, maxLevel: 12, weight: 20 }, // Zapplet
      { speciesId: 4,  minLevel: 6, maxLevel: 12, weight: 15 }, // Aquapup
    ],
  },
  {
    name: 'eastGrass',
    bounds: { x1: 21, y1: 21, x2: 28, y2: 27 },
    encounterRate: 0.12,
    encounters: [
      { speciesId: 8,  minLevel: 8, maxLevel: 16, weight: 25 }, // Thornbush
      { speciesId: 11, minLevel: 8, maxLevel: 16, weight: 25 }, // Voltcub
      { speciesId: 14, minLevel: 8, maxLevel: 14, weight: 20 }, // Tufftail
      { speciesId: 5,  minLevel: 8, maxLevel: 16, weight: 15 }, // Brineback
      { speciesId: 2,  minLevel: 8, maxLevel: 16, weight: 15 }, // Flamazard
    ],
  },
];

export class EncounterSystem {
  constructor(gameData) {
    this.creatures = gameData.creatures;
    this.moves     = gameData.moves;
  }

  _getArea(x, y) {
    for (const area of AREAS) {
      const { x1, y1, x2, y2 } = area.bounds;
      if (x >= x1 && x <= x2 && y >= y1 && y <= y2) return area;
    }
    return null;
  }

  /** Roll for a wild encounter. Returns creature instance or null. */
  roll(x, y) {
    const area = this._getArea(x, y);
    if (!area) return null;
    if (Math.random() > area.encounterRate) return null;

    return this._generateWild(area);
  }

  _generateWild(area) {
    // Weighted random species pick
    const totalWeight = area.encounters.reduce((s, e) => s + e.weight, 0);
    let r = Math.random() * totalWeight;
    let entry = area.encounters[area.encounters.length - 1];
    for (const e of area.encounters) {
      r -= e.weight;
      if (r <= 0) { entry = e; break; }
    }

    const level = entry.minLevel + Math.floor(Math.random() * (entry.maxLevel - entry.minLevel + 1));
    return this.createCreatureInstance(entry.speciesId, level);
  }

  createCreatureInstance(speciesId, level) {
    const species = this.creatures.find(c => c.id === speciesId);
    if (!species) return null;

    const maxHp = calcHP(species.baseStats.hp, level);

    const movesLearned = species.learnset
      .filter(l => l.level <= level)
      .slice(-4)
      .map(l => {
        const moveData = this.moves.find(m => m.id === l.moveId);
        return { moveId: l.moveId, currentPp: moveData.pp, maxPp: moveData.pp };
      });

    // Ensure at least one move
    if (movesLearned.length === 0 && species.learnset.length > 0) {
      const firstMove = this.moves.find(m => m.id === species.learnset[0].moveId);
      if (firstMove) {
        movesLearned.push({ moveId: firstMove.id, currentPp: firstMove.pp, maxPp: firstMove.pp });
      }
    }

    return {
      uid: `${speciesId}_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      speciesId,
      nickname: null,
      level,
      exp: 0,
      currentHp: maxHp,
      maxHp,
      stats: {
        attack:  calcStat(species.baseStats.attack,  level),
        defense: calcStat(species.baseStats.defense, level),
        speed:   calcStat(species.baseStats.speed,   level),
        special: calcStat(species.baseStats.special, level),
      },
      moves: movesLearned,
      status: null,
    };
  }
}
