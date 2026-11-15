// Eclipse, the reset above the Atlas. When every world is shining at once the
// whole atlas can be eclipsed: every world, all starlight and every Atlas
// upgrade go, and corona is left behind.
//
// After an Eclipse the game is played again in the same order, one world
// unlocking after another. What changes is what corona has bought.
//
// Corona is scarce. Eclipsing as soon as it is possible gives 1, and a run
// has to gather far more starlight for 2, 3 or 5. Every Eclipse adds to it. The upgrades come in tiers
// that cost 1, 2, 5 and 12, and each world has its own set as well, so what to
// buy first is a real choice. The number of Eclipses done counts for nothing,
// and nothing multiplies corona: it only ever comes from starlight.
import { D } from './core/num.js';
import { emit, silently } from './core/events.js';
import * as atlas from './atlas.js';
import * as cinder from './worlds/cinder.js';
import * as tidewater from './worlds/tidewater.js';
import * as grove from './worlds/grove.js';
import * as clockwork from './worlds/clockwork.js';
import * as hollow from './worlds/hollow.js';
import * as stormfront from './worlds/stormfront.js';

export const BAL = {
  needStarlight: 3e18, // the cost of the Eclipse node; corona is counted from here
  // Corona = (1 + powers of ten of starlight past needStarlight / coronaDecades) ^ coronaPower.
  // It grows with the number of powers of ten, not with starlight itself:
  // starlight grows by powers of ten for as long as a run goes on, so a root
  // of it made a run left for two hours worth five times one left for one.
  coronaDecades: 8,
  coronaPower: 3,
  // What the first, second, third... expansion bought costs, whichever world
  // it is for. Set from sim/sequence.js so each takes about two hours.
  expansionCosts: [5, 30, 2400, 3600, 5000, 7500],
  // The Bookbinder never folds a world for less than this, so the first
  // fold of an Eclipse isn't for a single starlight.
  autoFoldLeast: 5,
  // What the Bookbinder can be set to: fold a world once it has gathered
  // this many times the starlight it has handed over so far this Eclipse.
  autoFoldChoices: [1, 3, 10, 100],
  autoEvery: 1, // seconds between the automatic buyers looking
};

export const WORLDS = [
  { id: 'cinder', name: 'Cinder', mod: cinder },
  { id: 'tidewater', name: 'Tidewater', mod: tidewater },
  { id: 'grove', name: 'Grove', mod: grove },
  { id: 'clockwork', name: 'Clockwork', mod: clockwork },
  { id: 'hollow', name: 'Hollow', mod: hollow },
  { id: 'stormfront', name: 'Stormfront', mod: stormfront },
];
const ALL = WORLDS.map((w) => w.id);
const HANDS = ['c_hands', 't_hands', 'g_hands', 'k_hands', 'h_hands', 's_hands', 'c_keeper', 't_keeper', 'g_keeper'];
const PASSIVE = ['c_shed', 'c_glass', 't_storm', 'g_seed', 'k_spring', 'h_geode', 's_fulg'];
const ROUTES = atlas.NODES.filter((n) => n.group === 'routes').map((n) => n.id);
// Each world's Starlit upgrade, the one that multiplies it by starlight.
const STAR_NODE = Object.fromEntries(['c_star', 't_star', 'g_star', 'k_star', 'h_star', 's_star'].map((id) => { const n = atlas.NODES.find((x) => x.id === id); return [n.group, n]; }));

// An expansion adds new content to one world. That content lets the world
// go much further and shine much brighter, and the extra starlight is what
// earns the corona for the next expansion. Nothing multiplies corona itself.
// `depth` is how far into the new content a state has got, for showing.
export const EXPANSIONS = [
  {
    world: 'cinder',
    name: 'Star forge',
    text: 'Six more ignition points in Cinder, past the sun. Two of them make Cinder shine far brighter.',
    most: cinder.IGNITIONS.length - cinder.BASE_POINTS,
    depth: (state) => cinder.forgeDepth(state.cinder.foldBest),
  },
  {
    world: 'tidewater',
    name: 'The reef',
    text: 'Five more strandlines in Tidewater, and a reef of up to six plots to plant with coral. Two of the strandlines make Tidewater shine far brighter.',
    most: tidewater.STRANDLINES.length - tidewater.BASE_LINES,
    depth: (state) => tidewater.reefDepth(state.tidewater.foldBestTide),
  },
  {
    world: 'grove',
    name: 'The old wood',
    text: 'Five more stands in Grove, and heartwood: a share of sap that is kept through seedfall and fire. Its rings come to multiply all starlight.',
    most: grove.STANDS.length - grove.BASE_STANDS,
    depth: (state) => grove.oldWoodDepth(state.grove.foldBestTrees),
  },
  {
    world: 'clockwork',
    name: 'The long case',
    text: 'Five more chimes in Clockwork, and up to three slots for complications: parts fitted by hand that grow stronger the longer they stay fitted. One of them multiplies all starlight.',
    most: clockwork.CHIMES.length - clockwork.BASE_CHIMES,
    depth: (state) => clockwork.longCaseDepth(state.clockwork.foldBestRate),
  },
  {
    world: 'hollow',
    name: 'The abyss',
    text: 'Five more chambers in Hollow, and a fifth row of the lattice. Its three nodes each multiply all starlight in a different way.',
    most: hollow.CHAMBERS.length - hollow.BASE_CHAMBERS,
    depth: (state) => hollow.abyssDepth(state.hollow.foldBestCrystal),
  },
  {
    world: 'stormfront',
    name: 'The high sky',
    text: 'Five more peals in Stormfront, and the sky to aim at. The biggest strike to hit the sky multiplies all starlight.',
    most: stormfront.PEALS.length - stormfront.BASE_PEALS,
    depth: (state) => stormfront.highSkyDepth(state.stormfront.foldBestStrike),
  },
];

export const TIERS = [1, 2, 5, 12];

// pace: worlds that run faster, and by how much. keeps: Atlas upgrades that
// survive an Eclipse. Anything else is looked up by id where it applies.
export const UPGRADES = [
  { id: 'totality', cost: 1, name: 'Totality', text: 'Every world runs 4× faster.', pace: [ALL, 4] },

  { id: 'dawn', cost: 2, name: 'Dawn side', text: 'Cinder, Tidewater and Grove run 4× faster.', pace: [['cinder', 'tidewater', 'grove'], 4] },
  { id: 'dusk', cost: 2, name: 'Dusk side', text: 'Clockwork, Hollow and Stormfront run 4× faster.', pace: [['clockwork', 'hollow', 'stormfront'], 4] },
  { id: 'bright', cost: 2, name: 'Bright sky', text: 'Starlight ×10.' },
  { id: 'cheap', cost: 2, name: 'Thin pages', text: 'Atlas upgrades cost 10× less.' },
  { id: 'hands', cost: 2, name: 'Keepsakes', text: 'Keep every Hands upgrade and every upgrade that buys for you.', keeps: HANDS },
  { id: 'auto_atlas', cost: 2, name: 'Cartographer', text: 'Buys Atlas upgrades automatically, cheapest first.' },

  { id: 'routes', cost: 5, name: 'Old roads', text: 'Keep every route.', keeps: ROUTES },
  { id: 'passive', cost: 5, name: 'Steady hands', text: 'Keep the upgrades that gain a reset currency every second.', keeps: PASSIVE },
  { id: 'scar', cost: 5, name: 'Scorch marks', text: "Keep Stormfront's strikes on older worlds." },
  // Dearer than the Cartographer because it only pays once worlds rebuild
  // quickly: early on, a folded world takes an hour to shine again.
  { id: 'auto_fold', cost: 5, name: 'Bookbinder', text: 'Folds a world automatically once it has gathered as much starlight as it has given this Eclipse.' },

  { id: 'umbra', cost: 12, name: 'Umbra', text: 'Every world runs 2× faster.', pace: [ALL, 2] },
  { id: 'blaze', cost: 12, name: 'Diamond ring', text: 'Starlight ×100.' },
];
const UP_BY_ID = Object.fromEntries(UPGRADES.map((u) => [u.id, u]));

// Upgrades that belong to one world. Within a world they can be bought in
// any order, and the price depends only on how many of that world's are
// already owned, so every world costs the same to fill. One per world is
// speed; the rest change how that world plays.
export const WORLD_COSTS = [5, 10, 20, 40, 80];
export const WORLD_UPGRADES = [
  { id: 'p_cinder', world: 'cinder', name: 'Long burn', text: 'Cinder runs 3× faster.', pace: [['cinder'], 3] },
  { id: 'c_hot', world: 'cinder', name: 'Hot start', text: 'Every burn starts with the first 10 ignition points passed.' },
  { id: 'c_embers', world: 'cinder', name: 'Banked embers', text: 'Embers are kept through burning down and smelting.' },
  { id: 'c_bed', world: 'cinder', name: 'Deep ash bed', text: "Ash's power on heat +0.15." },
  { id: 'c_clear', world: 'cinder', name: 'Clear glass', text: 'Glass settles 5× faster.' },

  { id: 'p_tidewater', world: 'tidewater', name: 'Spring tides', text: 'Tidewater runs 3× faster.', pace: [['tidewater'], 3] },
  { id: 't_pool', world: 'tidewater', name: 'Open shore', text: 'Pools never limit a tide.' },
  { id: 't_moon', world: 'tidewater', name: 'Twin moons', text: 'Each moon level multiplies tides by 2.' },
  { id: 't_lines', world: 'tidewater', name: 'Tide marks', text: 'Each strandline multiplies salt by 2 instead of 1.5.' },
  { id: 't_kelp', world: 'tidewater', name: 'Deep roots', text: 'Kelp is kept through storms.' },

  { id: 'p_grove', world: 'grove', name: 'Old growth', text: 'Grove runs 3× faster.', pace: [['grove'], 3] },
  { id: 'g_stands', world: 'grove', name: 'Standing wood', text: 'Stands are kept through seedfall and fire.' },
  { id: 'g_age', world: 'grove', name: 'Long memory', text: 'Age is kept through seedfall.' },
  { id: 'g_seed', world: 'grove', name: 'Windfall', text: 'Sap sent to seed feeds the roots as well.' },
  { id: 'g_full', world: 'grove', name: 'Early wisdom', text: 'The forest ages from 50% full instead of 90%.' },

  { id: 'p_clockwork', world: 'clockwork', name: 'Mainspring', text: 'Clockwork runs 3× faster.', pace: [['clockwork'], 3] },
  { id: 'k_levels', world: 'clockwork', name: 'Set screws', text: 'Gear levels are kept through a rewind.' },
  { id: 'k_chime', world: 'clockwork', name: 'Echoes', text: 'Chimes are kept through a rewind.' },
  { id: 'k_wear', world: 'clockwork', name: 'Old oil', text: 'Wear-in is kept through a rewind.' },
  { id: 'k_idler', world: 'clockwork', name: 'Fine teeth', text: 'Idlers raise their neighbours by 0.1 more.' },

  { id: 'p_hollow', world: 'hollow', name: 'Fault line', text: 'Hollow runs 3× faster.', pace: [['hollow'], 3] },
  { id: 'h_pick', world: 'hollow', name: 'Twin seed', text: 'Pick one more node in the first row.' },
  { id: 'h_keep', world: 'hollow', name: 'Slow dissolve', text: 'Dissolving keeps the crystal you are holding.' },
  { id: 'h_facets', world: 'hollow', name: 'Cut stones', text: '+5 facets.' },
  { id: 'h_bridge', world: 'hollow', name: 'Old arches', text: 'Bridges are unlocked from the start.' },

  { id: 'p_stormfront', world: 'stormfront', name: 'Jet stream', text: 'Stormfront runs 3× faster.', pace: [['stormfront'], 3] },
  { id: 'paid', world: 'stormfront', name: 'Ground return', text: 'Strikes aimed at the mast, the sky or a world also pay thunder.' },
  { id: 's_over', world: 'stormfront', name: 'Tall anvil', text: 'Overcharge builds tension 3× faster.' },
  { id: 's_peal', world: 'stormfront', name: 'Rolling thunder', text: 'Peals are kept when the front passes.' },
  { id: 's_mast', world: 'stormfront', name: 'Iron mast', text: 'The mast keeps its record when the front passes.' },
];
const WORLD_UP_BY_ID = Object.fromEntries(WORLD_UPGRADES.map((u) => [u.id, u]));

/** What the next upgrade for a world costs. */
export function worldCost(e, world) {
  const owned = WORLD_UPGRADES.filter((u) => u.world === world && e.up[u.id]).length;
  return WORLD_COSTS[Math.min(owned, WORLD_COSTS.length - 1)];
}

/** World upgrades come into view once Totality is owned. */
export function worldUpgradesOpen(e) {
  return !!e.up.totality;
}

export function buyWorldUpgrade(state, id) {
  const e = state.eclipse;
  const up = WORLD_UP_BY_ID[id];
  if (!up || e.up[id] || !worldUpgradesOpen(e)) return false;
  const cost = worldCost(e, up.world);
  if (e.corona.lt(cost)) return false;
  e.corona = e.corona.sub(cost);
  e.up[id] = true;
  refresh(state);
  emit('coronaUpgrade', { id });
  return true;
}

export function defaults() {
  return {
    corona: D(0),
    totalCorona: D(0),
    count: 0,
    up: {},
    exp: {}, // expansions owned, by world
    depth: { cinder: 0, tidewater: 0, grove: 0, clockwork: 0, hollow: 0, stormfront: 0 }, // furthest into each this Eclipse
    // Worked out from `up` whenever something is bought, so the worlds can
    // read them without knowing about the upgrades.
    pace: { cinder: 1, tidewater: 1, grove: 1, clockwork: 1, hollow: 1, stormfront: 1 },
    light: 1,
    discount: 1,
    time: 0, // seconds since the last Eclipse
    lastTime: 0, // how long the last one took
    bestTime: 0, // the quickest so far
    seen: {},
    // Switches and settings for the automatic buyers. They only do anything
    // once the upgrade is owned.
    auto: { atlas: true, fold: true, foldAt: 1, worlds: { cinder: true, tidewater: true, grove: true, clockwork: true, hollow: true, stormfront: true } },
    autoWait: 0,
  };
}

/** Work out the multipliers that the upgrades owned add up to. */
export function refresh(state) {
  const e = state.eclipse;
  for (const id of ALL) e.pace[id] = 1;
  for (const u of UPGRADES.concat(WORLD_UPGRADES)) {
    if (!e.up[u.id] || !u.pace) continue;
    for (const id of u.pace[0]) e.pace[id] *= u.pace[1];
  }
  e.light = (e.up.bright ? 10 : 1) * (e.up.blaze ? 100 : 1);
  e.discount = e.up.cheap ? 10 : 1;
}

export function expansionCost(e) {
  const owned = Object.keys(e.exp).filter((id) => e.exp[id]).length;
  return BAL.expansionCosts[Math.min(owned, BAL.expansionCosts.length - 1)];
}

export function buyExpansion(state, world) {
  const e = state.eclipse;
  const cost = expansionCost(e);
  if (!EXPANSIONS.some((x) => x.world === world) || e.exp[world] || e.corona.lt(cost)) return false;
  e.corona = e.corona.sub(cost);
  e.exp[world] = true;
  emit('coronaUpgrade', { id: 'expansion_' + world });
  return true;
}

export function unlocked(state) {
  return atlas.has(state, 'eclipse') || state.eclipse.count > 0;
}

/** A tier comes into view once something in the tier before it is owned. */
export function tierOpen(e, cost) {
  const i = TIERS.indexOf(cost);
  if (i <= 0) return true;
  return UPGRADES.some((u) => u.cost === TIERS[i - 1] && e.up[u.id]);
}

/** Which worlds are shining this fold, in order. */
export function shining(state) {
  return WORLDS.map((w) => w.mod.calc(state).shine > 0);
}

/** How much corona a run that gathered this much starlight gives. */
export function coronaFor(starlight) {
  const past = Math.max(0, D(starlight).div(BAL.needStarlight).max(1).log10().toNumber());
  return Math.max(1, Math.floor(Math.pow(1 + past / BAL.coronaDecades, BAL.coronaPower) + 1e-9));
}

/** How much starlight a run needs for that much corona. */
export function starlightFor(corona) {
  const past = BAL.coronaDecades * (Math.pow(corona, 1 / BAL.coronaPower) - 1);
  return D(BAL.needStarlight).mul(D(10).pow(past));
}

export function calc(state) {
  const e = state.eclipse;
  const lit = shining(state);
  const litCount = lit.filter(Boolean).length;
  const hasNode = atlas.has(state, 'eclipse');
  const ready = hasNode && litCount === WORLDS.length;
  // Corona depends on this run's starlight and nothing else, and every
  // Eclipse adds to it. Whether to eclipse early and often or to wait for
  // more is the player's choice.
  const gain = ready ? D(coronaFor(state.atlas.total)) : D(0);
  // How much starlight the next whole corona takes.
  const nextAt = starlightFor(coronaFor(state.atlas.total) + 1);
  return { lit, litCount, hasNode, ready, gain, nextAt };
}

/** The Atlas upgrades that survive an Eclipse. World pages never do. */
function keptNodes(e) {
  const kept = {};
  for (const u of UPGRADES) if (e.up[u.id] && u.keeps) for (const id of u.keeps) kept[id] = true;
  return kept;
}

export function buyUpgrade(state, id) {
  const e = state.eclipse;
  const up = UP_BY_ID[id];
  if (!up || e.up[id] || e.corona.lt(up.cost) || !tierOpen(e, up.cost)) return false;
  e.corona = e.corona.sub(up.cost);
  e.up[id] = true;
  refresh(state);
  emit('coronaUpgrade', { id });
  return true;
}

export function eclipse(state) {
  const e = state.eclipse;
  const d = calc(state);
  if (!d.ready) return false;
  e.corona = e.corona.add(d.gain);
  e.totalCorona = e.totalCorona.add(d.gain);
  e.count += 1;
  e.lastTime = e.time;
  if (e.bestTime === 0 || e.time < e.bestTime) e.bestTime = e.time;
  emit('eclipse', { count: e.count, gain: d.gain, time: e.time, starlight: state.atlas.total, fire: state.cinder.foldBest, tide: state.tidewater.foldBestTide });
  e.time = 0;

  // Put back what is kept, then let every world rebuild itself the way it
  // does on a fold, so kept Hands upgrades apply.
  const a = state.atlas;
  a.nodes = keptNodes(e);
  silently(() => {
    for (const w of WORLDS) {
      state[w.id].pending = D(1);
      w.mod.fold(state);
      const fresh = state[w.id];
      fresh.folds -= 1;
      if (fresh.given) fresh.given = D(0);
    }
  });
  if (!e.up.scar) state.stormfront.struck = stormfront.defaults().struck;
  for (const id of ALL) e.depth[id] = 0;
  a.starlight = D(0);
  a.total = D(0);
  a.seen = true;
  return true;
}

/** The cheapest Atlas upgrade that could be bought next, if any. */
function cheapestNode(state) {
  let best = null;
  for (const n of atlas.NODES) {
    if (state.atlas.nodes[n.id] || !atlas.available(state, n)) continue;
    if (!best || n.cost < best.cost) best = n;
  }
  return best;
}

export function setAuto(state, key, value) {
  const a = state.eclipse.auto;
  if (key === 'foldAt') { if (BAL.autoFoldChoices.includes(value)) a.foldAt = value; }
  else if (key in a.worlds) a.worlds[key] = !!value;
  else if (key === 'atlas' || key === 'fold') a[key] = !!value;
}

/** What the Bookbinder waits for a world to gather before folding it. */
export function autoFoldNeed(state, world) {
  // A first fold that can't pay for the world's own Starlit upgrade leaves
  // the second run as slow as the first, so that price is the least.
  const star = atlas.costOf(state, STAR_NODE[world]);
  return state[world].given.mul(state.eclipse.auto.foldAt).max(BAL.autoFoldLeast).max(star);
}

// The Cartographer and the Bookbinder. Folding and buying by hand still
// work, and each can be switched off.
function automate(state) {
  const e = state.eclipse;
  if (e.up.auto_fold && e.auto.fold) {
    for (const w of WORLDS) {
      if (e.auto.worlds[w.id] && state[w.id].pending.gte(autoFoldNeed(state, w.id))) w.mod.fold(state);
    }
  }
  if (e.up.auto_atlas && e.auto.atlas) {
    for (let n = cheapestNode(state); n && atlas.buy(state, n.id); n = cheapestNode(state));
  }
}

export function tick(state, dt) {
  const e = state.eclipse;
  e.autoWait += dt;
  if (e.autoWait >= BAL.autoEvery) { e.autoWait = 0; automate(state); }
  for (const x of EXPANSIONS) {
    if (e.exp[x.world]) e.depth[x.world] = Math.max(e.depth[x.world], x.depth(state));
  }
  if (unlocked(state)) state.eclipse.time += dt;
  else state.eclipse.time = state.playtime;
}
