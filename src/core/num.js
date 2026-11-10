// Big numbers and how they are shown to the player.
import Decimal from '../../vendor/break_eternity.esm.js';

export { Decimal };

export const D = (x) => (x instanceof Decimal ? x : new Decimal(x));

/**
 * General number formatting. Below a thousand the number keeps `places`
 * decimals, up to a million it is written out in full, and after that it
 * switches to scientific notation.
 */
export function format(value, places = 2) {
  const x = D(value);
  if (x.lt(0)) return '-' + format(x.neg(), places);
  if (x.lt(1e-9)) return places > 0 ? (0).toFixed(places) : '0';
  if (x.lt(1000)) return x.toNumber().toFixed(places);
  if (x.lt(1e6)) return Math.floor(x.toNumber()).toLocaleString('en-US');
  if (x.lt('1e1000000')) {
    const l = x.log10().toNumber();
    let e = Math.floor(l);
    let m = Math.pow(10, l - e);
    if (m >= 9.995) { m = 1; e += 1; }
    return m.toFixed(2) + 'e' + e.toLocaleString('en-US');
  }
  return 'e' + format(x.log10(), 2);
}

/** Like format, but rounded down, for amounts that only count once they are whole. */
export function formatDown(value, places = 1) {
  const scale = Math.pow(10, places);
  return format(D(value).mul(scale).floor().div(scale), places);
}

/** Whole numbers: counts of things, currencies that only come in units. */
export function formatInt(value) {
  return format(D(value).floor(), 0);
}

/** A multiplier, written the way you'd say it: "×2.5". */
export function formatMult(value) {
  return '×' + format(value, 2);
}

export function formatTemp(t) {
  if (t < 1e6) return Math.floor(t).toLocaleString('en-US') + '°C';
  return format(t, 0) + '°C';
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  if (s < 60) return s + 's';
  if (s < 3600) return Math.floor(s / 60) + 'm ' + (s % 60) + 's';
  if (s < 86400) return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';
  return Math.floor(s / 86400) + 'd ' + Math.floor((s % 86400) / 3600) + 'h';
}
