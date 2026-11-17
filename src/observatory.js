// The Observatory, a layer beside Eclipse. It opens with the first expansion.
//
// Every world feeds it and it changes none of them. A telescope pointed at a
// world gathers sightings of that world, in real time, faster the more
// starlight the world has gathered this Eclipse. Sightings chart stars: each
// world has a constellation of eight, and a star also needs the world itself
// to have got far enough. What the Observatory's own upgrades cost is paid in
// the worlds' reset currencies.
//
// Nothing here is ever reset, and speed upgrades don't touch it. Eclipsing
// early earns corona; a run left to go deep is watched faster and reaches the
// later stars. Where the telescopes point is always chosen by hand.
import { D, format, formatInt, formatTemp } from './core/num.js';
export { D };
import { emit } from './core/events.js';

export const BAL = {
  // Sightings per second from one telescope, for each power of ten of
  // starlight the watched world has gathered this Eclipse.
  rate: 0.0003,
  // A telescope sharpens the longer it stays on one world.
  focusTime: 3600, // seconds to full focus
  focusMax: 4,
  focusMaxLong: 8, // with Long exposure
  mountSpeed: 3, // how much faster focus builds with the Steady mount
  fastMult: 2, // what each 'faster telescopes' milestone multiplies sightings by
  apertureMult: 1.5, // each level of Aperture, bought with corona
  lensMult: 2, // each lens level, for that world's sightings
  // Sightings the first star of a constellation costs, and what each later one is multiplied by.
  starCost: 50,
  starGrowth: 5,
  stars: 8,
};

const whole = (x) => formatInt(x);

// field: what the world is measured by, its best this fold. `records` is how
// much of it each star needs: the first only needs the world shining, the
// last two need a run left going for an hour and for several.
// lens: what each lens level costs, in the world's reset currency (`pay`).
// Both are set from sim/stargaze.js.
export const WORLD_INFO = [
  {
    id: 'cinder', name: 'Cinder', sky: 'The Kiln', pay: 'ash', payName: 'ash',
    field: 'foldBest', best: 'Hottest fire', show: (x) => formatTemp(D(x).toNumber()), need: (x) => `a fire of ${formatTemp(D(x).toNumber())}`,
    records: [6000, 20000, 35000, 45000, 51000, 60000, 72000, 78000],
    lens: ['1e120', '1e185', '1e215', '1e245', '1e275'],
  },
  {
    id: 'tidewater', name: 'Tidewater', sky: 'The Heron', pay: 'driftwood', payName: 'driftwood',
    field: 'foldBestTide', best: 'Best tide', show: (x) => `${whole(x)} salt`, need: (x) => `a tide of ${whole(x)} salt`,
    records: ['1e20', '1e110', '1e140', '1e170', '1e185', '1e222', '1e255', '1e288'],
    lens: ['1e55', '1e85', '1e105', '1e125', '1e142'],
  },
  {
    id: 'grove', name: 'Grove', sky: 'The Stag', pay: 'seeds', payName: 'seeds',
    field: 'foldBestTrees', best: 'Biggest forest', show: (x) => `${whole(x)} trees`, need: (x) => `a forest of ${whole(x)} trees`,
    records: ['1e40', '1e55', '1e65', '1e84', '1e89', '1e103', '1e111', '1e117'],
    lens: ['1e60', '1e95', '1e125', '1e150', '1e170'],
  },
  {
    id: 'clockwork', name: 'Clockwork', sky: 'The Pendulum', pay: 'springs', payName: 'springs',
    field: 'foldBestRate', best: 'Fastest movement', show: (x) => `${whole(x)} ticks per second`, need: (x) => `${whole(x)} ticks per second`,
    records: ['1e45', '1e75', '1e97', '1e116', '1e141', '1e174', '1e197', '1e209'],
    lens: ['1e18', '1e36', '1e50', '1e64', '1e77'],
  },
  {
    id: 'hollow', name: 'Hollow', sky: 'The Lantern', pay: 'geodes', payName: 'geodes',
    field: 'foldBestCrystal', best: 'Most crystal held', show: (x) => whole(x), need: (x) => `${whole(x)} crystal held at once`,
    records: ['1e40', '1e85', '1e107', '1e126', '1e137', '1e168', '1e192', '1e203'],
    lens: ['1e25', '1e42', '1e52', '1e62', '1e73'],
  },
  {
    id: 'stormfront', name: 'Stormfront', sky: 'The Anvil', pay: 'fulgurite', payName: 'fulgurite',
    field: 'foldBestStrike', best: 'Biggest strike', show: (x) => whole(x), need: (x) => `a strike of ${whole(x)}`,
    records: ['1e50', '1e120', '1e155', '1e180', '1e198', '1e240', '1e290', '1e325'],
    lens: ['1e55', '1e85', '1e105', '1e125', '1e152'],
  },
];
const INFO = Object.fromEntries(WORLD_INFO.map((w) => [w.id, w]));
export const info = (world) => INFO[world];
/** How far a world has got this fold, by its own measure. */
export const statOf = (state, w) => D(state[w.id][w.field]);

// Upgrades for the Observatory as a whole. Each is paid for by two worlds.
export const INSTRUMENTS = [
  { id: 'second', name: 'Second telescope', text: 'One more telescope.', cost: { tidewater: '1e55', clockwork: '1e18' } },
  { id: 'mount', name: 'Steady mount', text: 'Telescopes focus 3× faster.', cost: { cinder: '1e185', grove: '1e105' } },
  { id: 'long', name: 'Long exposure', text: 'Full focus is ×8 instead of ×4.', cost: { clockwork: '1e55', hollow: '1e53' } },
  { id: 'third', name: 'Third telescope', text: 'One more telescope.', cost: { hollow: '1e60', stormfront: '1e112' } },
];
const INSTRUMENT = Object.fromEntries(INSTRUMENTS.map((u) => [u.id, u]));

const perWorld = (make) => Object.fromEntries(WORLD_INFO.map((w) => [w.id, make()]));

export function defaults() {
  return {
    // Where each telescope points ('' for nowhere) and how long it has been there.
    at: ['', '', ''],
    held: [0, 0, 0],
    sight: perWorld(() => 0), // sightings in hand
    best: perWorld(() => D(0)), // the most each world has shown since the Observatory opened
    stars: perWorld(() => 0),
    lens: perWorld(() => 0),
    up: {},
    seen: {},
  };
}

/** The Observatory opens with the first expansion. */
export function unlocked(state) {
  const exp = state.eclipse.exp;
  return Object.keys(exp).some((id) => exp[id]);
}

export function scopeCount(state) {
  const up = state.observatory.up;
  return 1 + (up.second ? 1 : 0) + (up.third ? 1 : 0);
}

/** Powers of ten of starlight a world has gathered this Eclipse, folded or not. */
export function light(state, world) {
  const w = state[world];
  return w.given.add(w.pending).add(1).log10().toNumber();
}

export function focusMax(state) {
  return state.observatory.up.long ? BAL.focusMaxLong : BAL.focusMax;
}

export function focusTime(state) {
  return BAL.focusTime / (state.observatory.up.mount ? BAL.mountSpeed : 1);
}

/** What a telescope's focus multiplies its sightings by. */
export function focus(state, scope) {
  const share = Math.min(1, state.observatory.held[scope] / focusTime(state));
  return 1 + (focusMax(state) - 1) * share;
}

export function totalStars(state) {
  const stars = state.observatory.stars;
  return WORLD_INFO.reduce((sum, w) => sum + stars[w.id], 0);
}
export const MOST_STARS = WORLD_INFO.length * BAL.stars;

// What the sky gives back, by how many stars are charted in all. A charge
// makes one corona upgrade stronger (src/eclipse.js); the rest help the
// Observatory itself.
export const MILESTONES = [
  { stars: 1, kind: 'charge', text: 'A charge, to make one corona upgrade stronger.' },
  { stars: 2, kind: 'aperture', text: 'Unlocks Aperture, a corona upgrade that can be bought again and again.' },
  { stars: 3, kind: 'steady', text: 'A telescope keeps half its focus when moved.' },
  { stars: 4, kind: 'charge', text: 'A second charge.' },
  { stars: 6, kind: 'charge', text: 'A third charge.' },
  { stars: 8, kind: 'fast', text: 'Telescopes are 2× faster.' },
  { stars: 10, kind: 'charge', text: 'A fourth charge.' },
  { stars: 14, kind: 'charge', text: 'A fifth charge.' },
  { stars: 18, kind: 'fast', text: 'Telescopes are 2× faster again.' },
  { stars: 24, kind: 'charge', text: 'A sixth charge.' },
  { stars: 30, kind: 'charge', text: 'A seventh charge.' },
  { stars: 38, kind: 'fast', text: 'Telescopes are 2× faster again.' },
];

/** How many milestones of one kind have been reached. */
export function reached(state, kind) {
  const total = totalStars(state);
  return MILESTONES.filter((m) => m.kind === kind && total >= m.stars).length;
}

/** What multiplies every telescope: milestones, and Aperture bought with corona. */
export function skyMult(state) {
  return Math.pow(BAL.fastMult, reached(state, 'fast')) * Math.pow(BAL.apertureMult, state.eclipse.aperture || 0);
}

export function lensMult(state, world) {
  return Math.pow(BAL.lensMult, state.observatory.lens[world]);
}

/** Which telescope is on a world, or -1. */
export function scopeOn(state, world) {
  const o = state.observatory;
  for (let i = 0; i < scopeCount(state); i++) if (o.at[i] === world) return i;
  return -1;
}

/** Sightings per second of a world. Nothing unless a telescope is on it. */
export function rate(state, world) {
  const i = scopeOn(state, world);
  if (i < 0) return 0;
  return BAL.rate * light(state, world) * focus(state, i) * lensMult(state, world) * skyMult(state);
}

/** Point a telescope at a world. Moving it starts its focus again. */
export function point(state, scope, world) {
  const o = state.observatory;
  if (!unlocked(state) || !(scope >= 0 && scope < scopeCount(state))) return false;
  if (world !== '' && !INFO[world]) return false;
  if (o.at[scope] === world) return false;
  // Two telescopes can't watch the same world: the other one swaps over,
  // and both start their focus again.
  const other = world === '' ? -1 : scopeOn(state, world);
  if (other >= 0) { o.at[other] = o.at[scope]; o.held[other] = reached(state, 'steady') ? o.held[other] / 2 : 0; }
  o.at[scope] = world;
  o.held[scope] = reached(state, 'steady') ? o.held[scope] / 2 : 0;
  return true;
}

/** What the next star of a world needs, or null when its constellation is done. */
export function nextStar(state, world) {
  const n = state.observatory.stars[world];
  if (n >= BAL.stars) return null;
  return { n, sight: BAL.starCost * Math.pow(BAL.starGrowth, n), record: D(INFO[world].records[n]) };
}

export function canChart(state, world) {
  const o = state.observatory;
  const star = nextStar(state, world);
  return !!star && unlocked(state) && o.sight[world] >= star.sight && o.best[world].gte(star.record);
}

export function chart(state, world) {
  if (!canChart(state, world)) return false;
  const o = state.observatory;
  o.sight[world] -= nextStar(state, world).sight;
  o.stars[world] += 1;
  emit('star', { world, n: o.stars[world], sky: INFO[world].sky });
  return true;
}

/** What the next lens level for a world costs, or null at the last level. */
export function lensCost(state, world) {
  const level = state.observatory.lens[world];
  return level < INFO[world].lens.length ? D(INFO[world].lens[level]) : null;
}

export function buyLens(state, world) {
  const cost = lensCost(state, world);
  const w = state[world];
  const pay = INFO[world].pay;
  if (!cost || !unlocked(state) || w[pay].lt(cost)) return false;
  w[pay] = w[pay].sub(cost);
  state.observatory.lens[world] += 1;
  emit('lens', { world, level: state.observatory.lens[world] });
  return true;
}

export function canBuyInstrument(state, id) {
  const u = INSTRUMENT[id];
  if (!u || state.observatory.up[id] || !unlocked(state)) return false;
  return Object.keys(u.cost).every((world) => state[world][INFO[world].pay].gte(u.cost[world]));
}

export function buyInstrument(state, id) {
  if (!canBuyInstrument(state, id)) return false;
  const u = INSTRUMENT[id];
  for (const world of Object.keys(u.cost)) {
    const pay = INFO[world].pay;
    state[world][pay] = state[world][pay].sub(u.cost[world]);
  }
  state.observatory.up[id] = true;
  emit('instrument', { id });
  return true;
}

/** A price in two worlds' currencies, written out. */
export function costText(u) {
  return Object.keys(u.cost).map((world) => `${format(u.cost[world], 0)} ${INFO[world].payName}`).join(' and ');
}

export function tick(state, dt) {
  if (!unlocked(state)) return;
  const o = state.observatory;
  for (const w of WORLD_INFO) {
    const now = statOf(state, w);
    if (now.gt(o.best[w.id])) o.best[w.id] = now;
  }
  // Work the rates out before any focus moves on, so a long step isn't
  // counted at the focus it only reaches at its end.
  const scopes = scopeCount(state);
  for (let i = 0; i < scopes; i++) {
    const world = o.at[i];
    if (!world) continue;
    o.sight[world] += rate(state, world) * dt;
    o.held[i] += dt;
  }
}
