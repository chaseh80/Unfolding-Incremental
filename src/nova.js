// Nova, the reset above Eclipse. It opens at 30 stars charted.
//
// A Nova wipes everything below it: every world, the Atlas, corona and all it
// bought, the Observatory's sightings, stars, lenses and instruments. What is
// kept is stardust, the tree in the sky (src/sky.js) and the stardust
// upgrades. The game starts again at Cinder with whatever those give.
//
// Stardust depends only on how far the run got (stars charted, and past the
// last star, corona found), and nothing multiplies it. It is spent on tree
// nodes, each dearer than the last, and on stardust upgrades. The tree can be
// refunded at a Nova; stardust upgrades are kept for good.
import { D } from './core/num.js';
import { emit } from './core/events.js';
import * as eclipse from './eclipse.js';
import * as observatory from './observatory.js';
import { NODES, NODE } from './sky.js';
import { newRun } from './splits.js';

export const BAL = {
  opensAt: 30, // stars charted
  dustBase: 10, // stardust for a Nova at exactly opensAt stars
  dustGrowth: 1.2, // times as much for each star past that
  allStars: 48, // past this, each doubling of corona found counts as a star
  fixedMult: 10, // what Fixed stars multiplies sightings by
  fixedLock: 3600, // seconds a moved telescope stays put with Fixed stars
  wideShare: 0.1, // what Wide field gives an unwatched world, of the watched rate
  clearMult: 1.25, // sightings per level of Clear skies, the starlight upgrade
  clearCost: 1e12, // starlight for the first level of Clear skies
  clearGrowth: 10,
};

// Bought with stardust, kept for good. `grow` makes one repeatable.
export const UPGRADES = [
  { id: 'clear', name: 'Clear skies', cost: 5, text: 'Opens Clear skies in the Atlas: sightings ×1.25 a level, bought with starlight again and again.' },
  { id: 'charge', name: 'First charge', cost: 10, text: 'One more charge, from the start of every Nova.' },
  { id: 'lenses', name: 'Remembered lenses', cost: 20, text: 'Lenses are kept through a Nova.' },
  { id: 'nebula', name: 'Nebula', cost: 3, grow: 3, text: 'Telescopes ×1.2 for each level.' },
  { id: 'remnant', name: 'Remnant', cost: 5, grow: 4, text: 'Every world runs 1.05× faster for each level.' },
];
const UP = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

export function defaults() {
  return {
    dust: D(0),
    total: D(0), // all stardust ever gathered
    count: 0,
    time: 0, // seconds since the last Nova
    lastTime: 0,
    nodes: {}, // tree nodes owned: id -> how many (more than 1 only for edge nodes)
    treeSpent: D(0), // stardust in the tree, refunded by a respec
    respec: false, // refund the tree at the next Nova
    up: {}, // stardust upgrades: id -> level
    corona48: '', // corona found in total when the last star was charted this run
    // Worked out from the tree and the upgrades, read by the worlds.
    pace: 1,
    cheap: 1,
    scope: 1,
    flags: {},
  };
}

// --- Stardust -----------------------------------------------------------------

/** Stars charted this run, plus the tail past the last star. */
export function depth(state) {
  const stars = observatory.totalStars(state);
  const n = state.nova;
  if (stars < BAL.allStars || !n.corona48) return stars;
  const found = state.eclipse.totalCorona;
  const at = D(n.corona48).max(1);
  return stars + Math.max(0, found.div(at).log2().toNumber());
}

export function ready(state) {
  return observatory.totalStars(state) >= BAL.opensAt;
}

/** Stardust for a Nova after this far a run. */
export function dustFor(s) {
  if (s < BAL.opensAt) return D(0);
  return D(Math.floor(BAL.dustBase * Math.pow(BAL.dustGrowth, s - BAL.opensAt) + 1e-9));
}

export function gain(state) {
  return ready(state) ? dustFor(depth(state)) : D(0);
}

/** Stars needed for the next whole stardust. */
export function nextAt(state) {
  const now = gain(state).toNumber();
  const s = BAL.opensAt + Math.log((now + 1) / BAL.dustBase) / Math.log(BAL.dustGrowth);
  return Math.max(BAL.opensAt, s);
}

// --- The tree -----------------------------------------------------------------

export function nodesOwned(n) {
  return Object.values(n.nodes).reduce((a, b) => a + b, 0);
}

/** What the next node costs: 1, 1, 2, 2, 3, 3... by how many are owned. */
export function nodeCost(n) {
  return D(1 + Math.floor(nodesOwned(n) / 2));
}

/** A node can be taken if it touches a root or a node already owned. */
export function reachable(state, id) {
  const node = NODE[id];
  if (!node) return false;
  const owned = state.nova.nodes;
  if (owned[id] && node.kind !== 'edge') return false;
  return node.links.some((l) => l.startsWith('root:') || owned[l]);
}

export function canTake(state, id) {
  const n = state.nova;
  return n.count > 0 && reachable(state, id) && n.dust.gte(nodeCost(n));
}

export function take(state, id) {
  if (!canTake(state, id)) return false;
  const n = state.nova;
  const cost = nodeCost(n);
  n.dust = n.dust.sub(cost);
  n.treeSpent = n.treeSpent.add(cost);
  n.nodes[id] = (n.nodes[id] || 0) + 1;
  refresh(state);
  emit('node', { id });
  return true;
}

export function setRespec(state, on) {
  state.nova.respec = !!on;
}

// --- Stardust upgrades --------------------------------------------------------

export function upCost(n, id) {
  const u = UP[id];
  const level = n.up[id] || 0;
  return D(u.cost).mul(D(u.grow || 1).pow(level));
}

export function canBuyUp(state, id) {
  const n = state.nova;
  const u = UP[id];
  if (!u || n.count < 1) return false;
  if (!u.grow && n.up[id]) return false;
  return n.dust.gte(upCost(n, id));
}

export function buyUp(state, id) {
  if (!canBuyUp(state, id)) return false;
  const n = state.nova;
  n.dust = n.dust.sub(upCost(n, id));
  n.up[id] = (n.up[id] || 0) + 1;
  refresh(state);
  emit('stardustUpgrade', { id });
  return true;
}

// --- Clear skies, the starlight upgrade it opens in the Atlas -------------------

export function clearOpen(state) {
  return !!state.nova.up.clear;
}

export function clearCost(state) {
  return D(BAL.clearCost).mul(D(BAL.clearGrowth).pow(state.atlas.clear || 0));
}

export function buyClear(state) {
  const a = state.atlas;
  const cost = clearCost(state);
  if (!clearOpen(state) || a.starlight.lt(cost)) return false;
  a.starlight = a.starlight.sub(cost);
  a.clear = (a.clear || 0) + 1;
  return true;
}

// --- Effects ------------------------------------------------------------------

/** Add up the tree and the upgrades into numbers the worlds read. */
export function refresh(state) {
  const n = state.nova;
  let pace = 1;
  let cheap = 1;
  let scope = 1;
  const flags = {};
  for (const node of NODES) {
    const k = n.nodes[node.id] || 0;
    if (!k) continue;
    const e = node.effect;
    if (e.pace) pace *= Math.pow(e.pace, k);
    if (e.cheap) cheap *= Math.pow(e.cheap, k);
    if (e.scope) scope *= Math.pow(e.scope, k);
    if (e.flag) flags[e.flag] = true;
  }
  pace *= Math.pow(1.05, n.up.remnant || 0);
  scope *= Math.pow(1.2, n.up.nebula || 0);
  if (flags.fixedStars) scope *= BAL.fixedMult;
  n.pace = pace;
  n.cheap = cheap;
  n.scope = scope;
  n.flags = flags;
}

/** What Nova gives at the start of every run: gifts from the tree. */
function startGifts(state) {
  const n = state.nova;
  const e = state.eclipse;
  if (n.flags.firstLight) e.up.totality = true;
  if (n.flags.oldMaps) e.up.auto_atlas = true;
  eclipse.refresh(state);
}

/**
 * The Nova itself. `fresh` is a brand new game state (from game.js), whose
 * parts replace everything Nova does not keep.
 */
export function nova(state, fresh) {
  if (!ready(state)) return false;
  const n = state.nova;
  const got = gain(state);
  n.dust = n.dust.add(got);
  n.total = n.total.add(got);
  n.count += 1;
  n.lastTime = n.time;
  emit('nova', { count: n.count, gain: got, time: n.time, stars: observatory.totalStars(state) });
  n.time = 0;
  n.corona48 = '';
  newRun(state);
  if (n.respec) {
    n.dust = n.dust.add(n.treeSpent);
    n.treeSpent = D(0);
    n.nodes = {};
    n.respec = false;
  }
  const lenses = n.up.lenses ? { ...state.observatory.lens } : null;
  const keep = new Set(['version', 'started', 'lastSeen', 'playtime', 'options', 'ui', 'nova', 'splits']);
  for (const key of Object.keys(fresh)) if (!keep.has(key)) state[key] = fresh[key];
  if (lenses) state.observatory.lens = lenses;
  state.ui.tab = 'cinder';
  refresh(state);
  startGifts(state);
  return true;
}

export function tick(state, dt) {
  const n = state.nova;
  // Before the first Nova, the time is the whole game so far.
  if (n.count > 0) n.time += dt;
  else n.time = state.playtime;
  if (!n.corona48 && observatory.totalStars(state) >= BAL.allStars) n.corona48 = state.eclipse.totalCorona.toString();
}
