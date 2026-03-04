/**
 * Capture formula:
 *   catchValue = (3 * maxHP - 2 * currentHP) * catchRate * ballModifier * statusBonus / (3 * maxHP)
 *   shakes = 0-4; captured if catchValue >= 255 * random
 */
export class CaptureSystem {
  /**
   * @param {object} target   - creature instance
   * @param {object} ball     - item data (has ballModifier)
   * @param {object} species  - species data (has catchRate)
   * @returns {{ captured: boolean, shakes: number }}
   */
  attempt(target, ball, species) {
    const maxHp     = target.maxHp;
    const currentHp = Math.max(1, target.currentHp);
    const catchRate  = species.catchRate;
    const ballMod    = ball.ballModifier || 1.0;

    const statusBonus = this._statusBonus(target.status);

    // catchValue 0-255
    const catchValue = Math.floor(
      ((3 * maxHp - 2 * currentHp) * catchRate * ballMod * statusBonus) / (3 * maxHp)
    );

    const clampedCV = Math.min(255, Math.max(1, catchValue));

    // Number of shakes: each shake = random(0..65535) < 1048560 / sqrt(sqrt(255/clampedCV))
    const shakeThreshold = Math.floor(1048560 / Math.pow(255 / clampedCV, 0.25));

    let shakes = 0;
    for (let i = 0; i < 4; i++) {
      if (Math.floor(Math.random() * 65536) < shakeThreshold) {
        shakes++;
      } else {
        break;
      }
    }

    const captured = shakes === 4;
    return { captured, shakes };
  }

  _statusBonus(status) {
    switch (status) {
      case 'sleep':   return 2.0;
      case 'freeze':  return 2.0;
      case 'paralyze':
      case 'burn':
      case 'poison':  return 1.5;
      default:        return 1.0;
    }
  }
}
