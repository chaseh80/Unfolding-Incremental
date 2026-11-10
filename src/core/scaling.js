// Cost curves for things you can buy over and over.
//
// A repeatable costs base * ratio^n for the nth purchase. Past `scaleStart`
// purchases the exponent itself bends upward, which is what stops any single
// purchase from carrying the whole game forever.
import { Decimal, D } from './num.js';

export function effectiveLevel(n, scaleStart, scalePower) {
  if (!scaleStart || n < scaleStart) return n;
  return scaleStart * Math.pow(n / scaleStart, scalePower);
}

/** Cost of the next purchase when you already own `owned`. */
export function costAt(curve, owned) {
  const eff = effectiveLevel(owned, curve.scaleStart, curve.scalePower);
  return D(curve.base).mul(Decimal.pow(curve.ratio, eff));
}

/**
 * The highest number you could own if `budget` only had to cover the most
 * expensive single purchase. Used by automation, which buys without spending.
 */
export function affordableLevel(curve, budget) {
  const b = D(budget);
  if (b.lt(curve.base)) return 0;
  const linear = b.div(curve.base).log10().toNumber() / Math.log10(curve.ratio);
  let n = linear;
  if (curve.scaleStart && linear >= curve.scaleStart) {
    n = curve.scaleStart * Math.pow(linear / curve.scaleStart, 1 / curve.scalePower);
  }
  n = Math.floor(n + 1e-9) + 1;
  while (n > 0 && costAt(curve, n - 1).gt(b)) n--;
  return n;
}
