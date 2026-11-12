// Hollow, the fifth world. A cave where crystal grows along a lattice you
// choose.
//
// Crystal buys facets, and facets are spent on nodes of the lattice. The
// lattice has three columns and you can only start down one of them, so every
// build gives something up. Changing your mind means dissolving the whole
// lattice and losing the crystal you are holding. Nothing ever picks nodes
// for you.
//
// The right-hand column is made of seams from the older worlds, so how far
// those worlds have been pushed this fold decides how good that column is.
import { Decimal, D } from '../core/num.js';
import { costAt, affordableLevel } from '../core/scaling.js';
import { emit } from '../core/events.js';
import { gather } from '../atlas.js';
import { struckMult } from './links.js';

// ---------------------------------------------------------------------------
// Balance
// ---------------------------------------------------------------------------

export const BAL = {
  facet: { base: 10, ratio: 6, scaleStart: 10, scalePower: 1.6 },
  facetMult: 2, // every facet you have multiplies crystal by this, spent or not

  clearMult: 5,
  slowSeconds: 15,
  prismPer: 1.5,
  strataPer: 1.5,
  flawlessPer: 1.5,
  seedbedFacets: 4,
  resonancePer: 1.15,
  coreMult: 100,
  spareFacets: 3,

  chamberMult: 2,

  geodeNeedsCrystal: 1.2e5,
  geodeRoot: 1 / 3,
  geodeBedPower: 0.4,
  geodeBedPowerRich: 0.55,
  pressureSeconds: 60,
  passiveGeodePerSecond: 0.02,

  shineDecades: 3,
  shineBase: 4e8,

  // The simulator sets this to play Hollow on its own, with no other worlds.
  ignoreNeeds: false,
};

// row 1 is the exclusive row. Bridges sit between two columns, below row 2.
export const NODES = [
  { id: 'clear', row: 1, col: 0, cost: 1, name: 'Clear quartz', text: 'Crystal ×5.' },
  { id: 'slow', row: 1, col: 1, cost: 1, name: 'Slow growth', text: 'Crystal ×(1 + seconds since last dissolve / 15).' },
  { id: 'fire', row: 1, col: 2, cost: 1, name: 'Fire seam', text: "Crystal ×(Cinder's best temperature this fold / 10,000)⁴." },

  { id: 'prism', row: 2, col: 0, cost: 2, name: 'Prism', text: 'Crystal ×1.5 per node you own.' },
  { id: 'strata', row: 2, col: 1, cost: 2, name: 'Strata', text: 'Crystal ×1.5 per chamber reached this collapse.' },
  { id: 'salt', row: 2, col: 2, cost: 2, name: 'Salt seam', text: "Crystal ×(powers of ten in Tidewater's best tide this fold / 30)³." },

  { id: 'bridgeL', bridge: [0, 1], cost: 3, name: 'West bridge', text: 'Opens the left or middle column from the other one.' },
  { id: 'bridgeR', bridge: [1, 2], cost: 3, name: 'East bridge', text: 'Opens the middle or right column from the other one.' },

  { id: 'flawless', row: 3, col: 0, cost: 4, name: 'Flawless', text: 'Crystal ×1.5 per unspent facet.' },
  { id: 'seedbed', row: 3, col: 1, cost: 4, name: 'Seed bed', text: 'Facets cost as if you owned 4 fewer.' },
  { id: 'root', row: 3, col: 2, cost: 4, name: 'Root seam', text: "Crystal ×(powers of ten in Grove's best size this fold / 40)³." },

  { id: 'lens', row: 4, col: 0, cost: 8, name: 'Lens', text: 'Crystal ×(powers of ten in crystal grown this collapse)².' },
  { id: 'resonance', row: 4, col: 1, cost: 8, name: 'Resonance', text: 'Crystal ×1.15 per facet you have.' },
  { id: 'gear', row: 4, col: 2, cost: 8, name: 'Gear seam', text: "Crystal ×(powers of ten in Clockwork's best ticks per second this fold / 50)³." },

  { id: 'core', core: true, cost: 16, name: 'The core', text: 'Crystal ×100.' },
];
const NODE_BY_ID = Object.fromEntries(NODES.map((n) => [n.id, n]));
const AT = (row, col) => NODES.find((n) => n.row === row && n.col === col);
const SEAMS = ['fire', 'salt', 'root', 'gear'];

// A chamber is reached the first time you hold that much crystal.
export const CHAMBERS = [
  { id: 'squeeze', crystal: 2500, name: 'The squeeze', text: 'Unlocks the second row.' },
  { id: 'hall', crystal: 6e4, name: 'Glitter hall', text: 'Unlocks collapsing for geodes.' },
  { id: 'well', crystal: 2e6, name: 'The well', text: 'Unlocks the third row.' },
  { id: 'blue', crystal: 1e12, name: 'Blue chamber', text: 'Each chamber reached this collapse multiplies crystal by 2.' },
  { id: 'lake', crystal: 5e19, name: 'Mirror lake', text: 'Unlocks bridges.' },
  { id: 'pipes', crystal: 1.2e22, name: 'Organ pipes', text: 'Unlocks the fourth row.' },
  { id: 'vault', crystal: 1.5e27, name: 'The vault', text: 'Geode gain ×3.' },
  { id: 'throat', crystal: 1.5e31, name: 'The throat', text: 'Unlocks the core.' },
  { id: 'heart', crystal: 1.2e33, name: 'The heart', text: 'Hollow starts to shine.' },
];
const CHAMBER_INDEX = Object.fromEntries(CHAMBERS.map((p, i) => [p.id, i]));

const NEED_KINDS = {
  cinder: { have: (s) => D(s.cinder.foldBest), text: (v) => `Needs Cinder at ${Math.round(v).toLocaleString('en-US')}°C this fold.` },
  tidewater: { have: (s) => s.tidewater.foldBestTide, text: (v) => `Needs a single tide of ${big(v)} salt in Tidewater this fold.` },
  grove: { have: (s) => s.grove.foldBestTrees, text: (v) => `Needs ${big(v)} trees in Grove this fold.` },
  clockwork: { have: (s) => s.clockwork.foldBestRate, text: (v) => `Needs ${big(v)} ticks per second in Clockwork this fold.` },
};
function big(v) {
  return v < 1e6 ? Math.round(v).toLocaleString('en-US') : v.toExponential(1).replace('+', '').replace('.0e', 'e');
}

export const GEODE_UPGRADES = [
  { id: 'miner', cost: 1, name: 'Miner', text: 'Buys facets automatically, for free.' },
  { id: 'polish', cost: 1, name: 'Polish', text: 'Crystal ×3.' },
  { id: 'template', cost: 15, name: 'Template', text: 'The lattice regrows the same way after a collapse.' },
  { id: 'second', cost: 30, name: 'Second seed', text: 'Pick 2 nodes in the first row.', need: { world: 'cinder', value: 13500 } },
  { id: 'press', cost: 100, name: 'Overburden', text: 'Pressure builds 2× faster.' },
  { id: 'spare', cost: 5000, name: 'Spare facets', text: '+3 facets.', need: { world: 'tidewater', value: 1e38 } },
  { id: 'rich', cost: 1e5, name: 'Rich geodes', text: 'Geode power 0.4 → 0.55.' },
  { id: 'freebridge', cost: 5e6, name: 'Natural arches', text: 'Bridges cost nothing.', need: { world: 'grove', value: 1e50 } },
  { id: 'third', cost: 1.5e8, name: 'Third seed', text: 'Pick 3 nodes in the first row.', need: { world: 'clockwork', value: 1e60 } },
  { id: 'seams', cost: 1e10, name: 'Thick seams', text: 'Seam nodes are squared.', need: { world: 'cinder', value: 14500 } },
];
const GEODE_BY_ID = Object.fromEntries(GEODE_UPGRADES.map((u) => [u.id, u]));
const KEPT_BY_ATLAS = ['miner', 'polish', 'template'];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export function defaults() {
  return {
    open: false,
    crystal: D(0),
    grown: D(0), // all crystal grown since the last collapse
    bestCrystal: D(0), // most held at once this collapse
    foldBestCrystal: D(0),
    facets: 0, // bought this collapse
    nodes: {},
    order: [], // the order nodes were bought in, for the template
    template: [],
    dissolveTime: 0,
    collapseTime: 0,
    bestChambers: 0,

    geodes: D(0),
    totalGeodes: D(0), // this fold
    collapses: 0,
    geodeUp: {},

    pending: D(0),
    given: D(0),
    foldTime: 0,
    folds: 0,
    shining: false,
    seen: {},
  };
}

// ---------------------------------------------------------------------------
// The lattice
// ---------------------------------------------------------------------------

function chambersFrom(best) {
  let n = 0;
  while (n < CHAMBERS.length && best.gte(CHAMBERS[n].crystal)) n++;
  return n;
}

export function nodeCost(h, id) {
  const n = NODE_BY_ID[id];
  return n.bridge && h.geodeUp.freebridge ? 0 : n.cost;
}

export function totalFacets(h) {
  return h.facets + (h.geodeUp.spare ? BAL.spareFacets : 0);
}

export function spentFacets(h, nodes = h.nodes) {
  let spent = 0;
  for (const id of Object.keys(nodes)) if (nodes[id]) spent += nodeCost(h, id);
  return spent;
}

export function firstRowPicks(h) {
  return h.geodeUp.third ? 3 : h.geodeUp.second ? 2 : 1;
}

function rowOpen(h, n) {
  if (n.core) return !!h.seen.core;
  if (n.bridge) return !!h.seen.bridges;
  if (n.row === 1) return true;
  return !!h.seen['row' + n.row];
}

/** A column is open below the first row if you started it, or reached it over a bridge. */
function columnOpen(col, nodes) {
  if (nodes[AT(1, col).id]) return true;
  for (const b of NODES) {
    if (!b.bridge || !nodes[b.id] || !b.bridge.includes(col)) continue;
    const other = b.bridge[0] === col ? b.bridge[1] : b.bridge[0];
    if (nodes[AT(2, other).id]) return true;
  }
  return false;
}

/** Whether a node could be bought, and if not, why. */
export function nodeState(state, id, nodes = state.hollow.nodes) {
  const h = state.hollow;
  const n = NODE_BY_ID[id];
  if (nodes[id]) return { owned: true };
  if (!rowOpen(h, n)) return { locked: true, why: 'Not unlocked yet.' };
  let why = '';
  if (n.core) {
    if (![0, 1, 2].some((c) => nodes[AT(4, c).id])) why = 'Needs a fourth-row node.';
  } else if (n.bridge) {
    if (!n.bridge.some((c) => nodes[AT(2, c).id])) why = 'Needs a second-row node next to it.';
  } else if (n.row === 1) {
    const picked = [0, 1, 2].filter((c) => nodes[AT(1, c).id]).length;
    if (picked >= firstRowPicks(h)) why = `Only ${firstRowPicks(h)} from this row.`;
  } else if (n.row === 2) {
    if (!columnOpen(n.col, nodes)) why = `Needs ${AT(1, n.col).name} or a bridge.`;
  } else if (!nodes[AT(n.row - 1, n.col).id]) {
    why = `Needs ${AT(n.row - 1, n.col).name}.`;
  }
  if (why) return { blocked: true, why };
  const left = totalFacets(h) - spentFacets(h, nodes);
  if (nodeCost(h, id) > left) return { poor: true, why: '' };
  return { ok: true };
}

export function facetCost(h, nodes = h.nodes) {
  const owned = Math.max(0, h.facets - (nodes.seedbed ? BAL.seedbedFacets : 0));
  return costAt(BAL.facet, owned);
}

export function needText(up) {
  return up.need ? NEED_KINDS[up.need.world].text(up.need.value) : '';
}

export function needMet(state, up) {
  if (!up.need || BAL.ignoreNeeds) return true;
  return NEED_KINDS[up.need.world].have(state).gte(up.need.value);
}

/** What each seam node is worth right now, before any squaring. */
export function seamValues(state) {
  const tens = (x) => x.add(1).log10().toNumber();
  return {
    fire: Math.max(1, Math.pow(state.cinder.foldBest / 10000, 4)),
    salt: Math.max(1, Math.pow(tens(state.tidewater.foldBestTide) / 30, 3)),
    root: Math.max(1, Math.pow(tens(state.grove.foldBestTrees) / 40, 3)),
    gear: Math.max(1, Math.pow(tens(state.clockwork.foldBestRate) / 50, 3)),
  };
}

/** Everything about the cave right now. `nodes` lets a build be tried out without buying it. */
export function calc(state, nodes = state.hollow.nodes) {
  const h = state.hollow;
  const U = h.geodeUp;
  const N = state.atlas.nodes;
  const chambers = chambersFrom(h.bestCrystal);
  const passed = (id) => chambers > CHAMBER_INDEX[id];

  const owned = Object.keys(nodes).filter((id) => nodes[id]).length;
  const facets = totalFacets(h);
  const unspent = facets - spentFacets(h, nodes);
  const seams = seamValues(state);

  // Each node's own multiplier, for the page to show.
  const worth = {};
  if (nodes.clear) worth.clear = BAL.clearMult;
  if (nodes.slow) worth.slow = 1 + h.dissolveTime / BAL.slowSeconds;
  if (nodes.prism) worth.prism = Math.pow(BAL.prismPer, owned);
  if (nodes.strata) worth.strata = Math.pow(BAL.strataPer, chambers);
  if (nodes.flawless) worth.flawless = Math.pow(BAL.flawlessPer, Math.max(0, unspent));
  if (nodes.lens) worth.lens = Math.max(1, Math.pow(h.grown.add(1).log10().toNumber(), 2));
  if (nodes.resonance) worth.resonance = Math.pow(BAL.resonancePer, facets);
  if (nodes.core) worth.core = BAL.coreMult;
  for (const id of SEAMS) if (nodes[id]) worth[id] = Math.pow(seams[id], U.seams ? 2 : 1);

  let lattice = D(1);
  for (const id of Object.keys(worth)) lattice = lattice.mul(worth[id]);

  const geodeBed = h.totalGeodes.add(1).pow(U.rich ? BAL.geodeBedPowerRich : BAL.geodeBedPower);
  const chamberMult = passed('blue') ? Math.pow(BAL.chamberMult, chambers) : 1;
  let other = D(1);
  if (U.polish) other = other.mul(3);
  if (N.h_star) other = other.mul(h.given.add(1));
  other = other.mul(struckMult(state, 'hollow'));
  const facetMult = Decimal.pow(BAL.facetMult, facets);
  const rate = h.open ? lattice.mul(facetMult).mul(geodeBed).mul(chamberMult).mul(other) : D(0);

  const pressure = 1 + h.collapseTime / (BAL.pressureSeconds / (U.press ? 2 : 1));
  let geodeMult = D(pressure);
  if (passed('vault')) geodeMult = geodeMult.mul(3);
  const canCollapse = passed('hall') && h.grown.gte(BAL.geodeNeedsCrystal);
  const geodeGain = canCollapse ? h.grown.div(BAL.geodeNeedsCrystal).pow(BAL.geodeRoot).mul(geodeMult).floor() : D(0);

  const far = CHAMBERS[CHAMBERS.length - 1].crystal;
  let shine = 0;
  if (h.foldBestCrystal.gte(far)) {
    shine = BAL.shineBase * Math.pow(2, h.foldBestCrystal.div(far).log10().toNumber() / BAL.shineDecades) * (N.h_bright ? 3 : 1);
  }

  return { chambers, owned, facets, unspent, seams, worth, lattice, facetMult, geodeBed, chamberMult, other, rate, pressure, canCollapse, geodeGain, shine };
}

// ---------------------------------------------------------------------------
// Things the player can do
// ---------------------------------------------------------------------------

export function breakThrough(state) {
  const h = state.hollow;
  if (h.open) return false;
  h.open = true;
  return true;
}

export function buyFacet(state, max = false) {
  const h = state.hollow;
  if (!h.open) return 0;
  if (h.geodeUp.miner) {
    const target = affordableLevel(BAL.facet, h.crystal) + (h.nodes.seedbed ? BAL.seedbedFacets : 0);
    const bought = Math.max(0, target - h.facets);
    h.facets += bought;
    return bought;
  }
  let bought = 0;
  const limit = max ? 500 : 1;
  while (bought < limit) {
    const cost = facetCost(h);
    if (h.crystal.lt(cost)) break;
    h.crystal = h.crystal.sub(cost);
    h.facets += 1;
    bought++;
  }
  return bought;
}

export function buyNode(state, id) {
  const h = state.hollow;
  if (!h.open || !NODE_BY_ID[id] || !nodeState(state, id).ok) return false;
  h.nodes[id] = true;
  h.order.push(id);
  return true;
}

/** Clear the lattice. The facets come back; the crystal you are holding does not. */
export function dissolve(state) {
  const h = state.hollow;
  if (!h.open || h.order.length === 0) return false;
  h.nodes = {};
  h.order = [];
  h.template = [];
  h.crystal = D(0);
  h.dissolveTime = 0;
  return true;
}

export function collapse(state) {
  const h = state.hollow;
  const d = calc(state);
  if (!d.canCollapse || d.geodeGain.lt(1)) return false;
  h.geodes = h.geodes.add(d.geodeGain);
  h.totalGeodes = h.totalGeodes.add(d.geodeGain);
  h.collapses += 1;
  emit('collapse', { gain: d.geodeGain, time: h.collapseTime });
  h.template = h.geodeUp.template ? h.order.slice() : [];
  h.crystal = D(0);
  h.grown = D(0);
  h.bestCrystal = D(0);
  h.facets = 0;
  h.nodes = {};
  h.order = [];
  h.dissolveTime = 0;
  h.collapseTime = 0;
  return true;
}

export function buyGeodeUpgrade(state, id) {
  const h = state.hollow;
  const up = GEODE_BY_ID[id];
  if (!up || h.geodeUp[id] || h.geodes.lt(up.cost) || !needMet(state, up)) return false;
  h.geodes = h.geodes.sub(up.cost);
  h.geodeUp[id] = true;
  emit('geodeUpgrade', { id });
  return true;
}

export function fold(state) {
  const h = state.hollow;
  if (h.pending.lt(1)) return false;
  const gained = gather(state, h.pending);
  emit('fold', { world: 'hollow', gain: gained, time: h.foldTime });
  const fresh = defaults();
  fresh.seen = h.seen;
  fresh.bestChambers = h.bestChambers;
  fresh.shining = h.shining;
  fresh.folds = h.folds + 1;
  fresh.given = h.given.add(gained);
  fresh.collapses = h.collapses;
  if (state.atlas.nodes.h_hands) {
    for (const id of KEPT_BY_ATLAS) fresh.geodeUp[id] = true;
    fresh.template = h.order.slice();
    fresh.open = true;
  }
  state.hollow = fresh;
  return true;
}

// ---------------------------------------------------------------------------
// Time passing
// ---------------------------------------------------------------------------

export function tick(state, dt) {
  const h = state.hollow;
  const N = state.atlas.nodes;
  if (!N.hollow || !h.open) return;
  h.dissolveTime += dt;
  h.collapseTime += dt;
  h.foldTime += dt;

  if (h.geodeUp.miner) buyFacet(state, true);
  // Regrow a remembered lattice in the order it was first built.
  while (h.template.length > 0) {
    const next = h.template[0];
    const st = nodeState(state, next);
    if (st.owned) { h.template.shift(); continue; }
    if (!st.ok) break;
    buyNode(state, next);
    h.template.shift();
  }

  const d = calc(state);
  const made = d.rate.mul(dt);
  h.crystal = h.crystal.add(made);
  h.grown = h.grown.add(made);
  if (h.crystal.gt(h.bestCrystal)) h.bestCrystal = h.crystal;
  if (h.crystal.gt(h.foldBestCrystal)) h.foldBestCrystal = h.crystal;

  const chambers = chambersFrom(h.bestCrystal);
  while (h.bestChambers < chambers) {
    const p = CHAMBERS[h.bestChambers];
    h.bestChambers += 1;
    emit('chamber', { id: p.id, name: p.name, text: p.text });
  }
  if (h.bestChambers > CHAMBER_INDEX.squeeze) h.seen.row2 = true;
  if (h.bestChambers > CHAMBER_INDEX.hall) h.seen.collapse = true;
  if (h.bestChambers > CHAMBER_INDEX.well) h.seen.row3 = true;
  if (h.bestChambers > CHAMBER_INDEX.lake) h.seen.bridges = true;
  if (h.bestChambers > CHAMBER_INDEX.pipes) h.seen.row4 = true;
  if (h.bestChambers > CHAMBER_INDEX.throat) h.seen.core = true;
  if (!h.shining && h.bestChambers > CHAMBER_INDEX.heart) {
    h.shining = true;
    state.atlas.seen = true;
  }

  if (N.h_geode && d.geodeGain.gt(0)) {
    const found = d.geodeGain.mul(BAL.passiveGeodePerSecond * dt);
    h.geodes = h.geodes.add(found);
    h.totalGeodes = h.totalGeodes.add(found);
  }
  if (d.shine > 0) h.pending = h.pending.add(d.shine * dt / 60);
}
