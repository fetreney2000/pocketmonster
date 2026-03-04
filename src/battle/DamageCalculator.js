/** Calculate HP stat for a given base stat and level */
export function calcHP(base, level) {
  return Math.floor((base * 2 + 100) * level / 100 + 10);
}

/** Calculate non-HP stat for a given base stat and level */
export function calcStat(base, level) {
  return Math.floor((base * 2 + 100) * level / 100 + 5);
}

/**
 * Main damage formula:
 * Damage = (((2*Level/5+2) * Power * Attack/Defense) / 50 + 2) * Modifier
 *
 * Modifier = STAB * typeEffectiveness * critMultiplier * randomFactor
 */
export function calculateDamage(attacker, move, defender, typeChart) {
  // Heal/status moves deal no damage
  if (!move.power || move.power === 0) return { damage: 0, crit: false, effectiveness: 1 };

  const level  = attacker.level;
  const power  = move.power;

  // Physical uses attack/defense; special uses special/special
  const atkStat = move.category === 'physical' ? attacker.stats.attack  : attacker.stats.special;
  const defStat = move.category === 'physical' ? defender.stats.defense : defender.stats.special;

  // Apply burn halving for physical attacks
  const atkVal = (attacker.status === 'burn' && move.category === 'physical')
    ? Math.floor(atkStat / 2)
    : atkStat;

  // Apply paralysis speed reduction (handled in TurnManager, not damage)

  const base = Math.floor(((2 * level / 5 + 2) * power * atkVal / defStat) / 50 + 2);

  // STAB (Same-type attack bonus)
  const attackerSpecies = attacker._species;
  const stab = (attackerSpecies && attackerSpecies.types.includes(move.type)) ? 1.5 : 1.0;

  // Type effectiveness
  const attackerType = move.type;
  const defenderTypes = defender._species ? defender._species.types : ['Normal'];
  let typeEff = 1.0;
  for (const dType of defenderTypes) {
    const row = typeChart[attackerType];
    if (row && row[dType] !== undefined) {
      typeEff *= row[dType];
    }
  }

  // Critical hit (1/16 chance → 2×)
  const crit = Math.random() < (1 / 16);
  const critMult = crit ? 2.0 : 1.0;

  // Random factor 0.85–1.00
  const rand = 0.85 + Math.random() * 0.15;

  const modifier = stab * typeEff * critMult * rand;
  const damage = Math.max(1, Math.floor(base * modifier));

  return { damage, crit, effectiveness: typeEff };
}

/** Experience gained when defeating an enemy */
export function expGained(enemyLevel, isTrainer = false) {
  const base = enemyLevel * enemyLevel;
  return isTrainer ? Math.floor(base * 1.5) : base;
}

/** Experience needed to reach a given level */
export function expForLevel(level, growthRate = 'medium') {
  switch (growthRate) {
    case 'fast':   return Math.floor(Math.pow(level, 3) * 0.8);
    case 'slow':   return Math.floor(Math.pow(level, 3) * 1.2);
    default:       return Math.floor(Math.pow(level, 3));
  }
}
