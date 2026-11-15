// Grove, the third world. A forest that fills whatever room the ground gives
// it.
//
// Nothing here is bought. The trees make sap, and you decide where the sap
// goes: into roots, which make more room; into canopy, which lets the forest
// fill that room faster; or into seed, which is what's left when the forest
// falls. Deeper roots make for a bigger, slower forest, so the canopy has to
// keep up or the room goes to waste.
import { Decimal, D } from '../core/num.js';
import { costAt, affordableLevel } from '../core/scaling.js';
import { emit } from '../core/events.js';
import { gather } from '../atlas.js';
import { outsideMult, lightMult } from './links.js';

// ---------------------------------------------------------------------------
// Balance
// ---------------------------------------------------------------------------

export const BAL = {
  startTrees: 1,
  baseRoom: 10,
  baseRate: 0.5, // how fast a near-empty forest grows, per second

  roots: { base: 20, ratio: 3, scaleStart: 24, scalePower: 1.3 },
  canopy: { base: 20, ratio: 6, scaleStart: 12, scalePower: 1.3 },
  roomPerRoot: 2,
  roomPerRootCrown: 2.15,
  ratePerCanopy: 1.5,
  ratePerCanopyBroad: 1.65,
  slowPerRoot: 1.2,
  slowPerRootGiants: 1.15,
  taprootLevels: 4,
  deeprootLevels: 3,
  pioneerLevels: 3,
  saplingLevels: 8,

  fullAt: 0.9,
  ageSeconds: 60,
  agePower: 1,
  agePowerVeteran: 1.5,
  standMult: 1.5,
  standMultSun: 2,
  humusPerCanopy: 1.1,

  seedNeedsSap: 1.5e7,
  seedRoot: 0.5,
  seedBedPower: 0.5,
  seedBedPowerDeep: 0.7,

  loamNeedsSeeds: 1e14,
  loamRoot: 1 / 3,
  loamSapPower: 0.4,
  settleSeconds: 60,
  passiveSeedPerSecond: 0.02,

  // Past the last stand the world shines. Starlight per minute doubles every
  // time the forest's best size this fold grows by this many powers of ten.
  shineDecades: 3,
  // Newer worlds shine brighter, so each new page matters more than the last.
  shineBase: 100,

  // Heartwood, from the old wood expansion. A ring is one power of ten of
  // the sap sent there.
  ringSapPower: 2, // sap ×(1 + rings) ^ this
  ringLight: 1.03, // all starlight × this per ring, once the stand for it is reached
  ringLightGreat: 1.05,
  maxHeartShare: 0.9,
};

// A stand is reached the first time the forest holds that many trees.
export const STANDS = [
  { id: 'thicket', trees: 1200, name: 'A thicket', text: "Sap sent to roots counts double." },
  { id: 'closed', trees: 2e4, name: 'The canopy closes', text: "Unlocks age. The forest ages while at least 90% full, and age multiplies sap." },
  { id: 'flower', trees: 6e5, name: 'First flowering', text: "Unlocks seed and seedfall." },
  { id: 'under', trees: 3e8, name: 'An understory', text: "Each stand reached this generation multiplies sap by 1.5." },
  { id: 'deer', trees: 1.5e12, name: 'Deer paths', text: "Sap sent to canopy counts triple." },
  { id: 'owl', trees: 4e14, name: 'Owls move in', text: "Seed set ×2." },
  { id: 'lichen', trees: 5e16, name: 'Lichen on the bark', text: "The forest ages 2× faster." },
  { id: 'dead', trees: 4e23, name: 'Deadwood', text: "Unlocks fire for loam." },
  { id: 'giant', trees: 8e29, name: 'Giants', text: "Each root level slows the forest by 15% instead of 20%." },
  { id: 'mother', trees: 1e32, name: 'Mother trees', text: "Seed set ×3." },
  { id: 'far', trees: 5e33, name: 'The wood beyond the wood', text: "Grove starts to shine." },
  // The old wood expansion, bought with corona. These only count once it is owned.
  { id: 'heart', trees: 1e62, name: 'Heartwood', text: "Unlocks heartwood." },
  { id: 'glow', trees: 1e65, name: 'Foxfire', text: "Each ring multiplies all starlight by 1.03." },
  { id: 'burl', trees: 1e68, name: 'Burls', text: "Rings multiply seed set as well as sap." },
  { id: 'elder', trees: 1e72, name: 'Elders', text: "Each ring multiplies all starlight by 1.05 instead of 1.03." },
  { id: 'pillar', trees: 1e76, name: 'Pillars of the sky', text: "Every ring counts twice." },
];
/** How many stands there are without the expansion. */
export const BASE_STANDS = STANDS.findIndex((p) => p.id === 'far') + 1;
const STAND_INDEX = Object.fromEntries(STANDS.map((p, i) => [p.id, i]));
const MEMORY_STANDS = 5;

export const SEED_UPGRADES = [
  { id: 'nursery', cost: 1, name: 'Nursery', text: "Sap ×3." },
  { id: 'mulch', cost: 1, name: 'Leaf mulch', text: "Sap sent to roots counts triple." },
  { id: 'deep', cost: 1, name: 'Seed bank', text: "Seed power 0.5 → 0.7." },
  { id: 'mast', cost: 2, name: 'Mast years', text: "Seed set ×3." },
  { id: 'forester', cost: 50, name: 'Forester', text: "Splits sap between roots and canopy automatically." },
  { id: 'veteran', cost: 2500, name: 'Veteran trees', text: "Age power 1 → 1.5." },
  { id: 'saplings', cost: 3e5, name: 'Saplings', text: "Generations start with 8 root and canopy levels." },
  { id: 'taproot', cost: 6e6, name: 'Taproots', text: "Root cost scaling starts 4 levels later." },
  { id: 'broadleaf', cost: 1.5e8, name: 'Broad leaves', text: "Each canopy level speeds growth by 65% instead of 50%." },
  { id: 'memory', cost: 1.5e9, name: 'Seed memory', text: "Generations start with the first 5 stands reached." },
  { id: 'humus', cost: 8e9, name: 'Humus', text: "Each canopy level multiplies sap by 1.1." },
  { id: 'crown', cost: 8e11, name: 'Crown shyness', text: "Each root level multiplies room by 2.15 instead of 2." },
];
const SEED_BY_ID = Object.fromEntries(SEED_UPGRADES.map((u) => [u.id, u]));
const KEPT_BY_LOAM = ['nursery', 'mulch', 'forester'];

export const LOAM_UPGRADES = [
  { id: 'ashbed', cost: 50, name: 'Ash bed', text: "Sap ×10." },
  { id: 'fireweed', cost: 5e4, name: 'Fireweed', text: "Seed set ×10." },
  { id: 'clearing', cost: 1.2e5, name: 'Clearings', text: "Loam builds 2× faster." },
  { id: 'serotiny', cost: 4e5, name: 'Fire cones', text: "The forest ages 3× faster." },
  { id: 'deeproot', cost: 1.2e6, name: 'Deep soil', text: "Root cost scaling starts 3 levels later." },
  { id: 'pioneer', cost: 3e6, name: 'Pioneers', text: "Canopy cost scaling starts 3 levels later." },
  { id: 'sun', cost: 5e6, name: 'Sunlit floor', text: "Stands multiply sap by 2 instead of 1.5." },
  { id: 'charcoal', cost: 1.5e7, name: 'Charcoal in the ground', text: "Sap sent to canopy counts 5×." },
];
const LOAM_BY_ID = Object.fromEntries(LOAM_UPGRADES.map((u) => [u.id, u]));

export const LOAM_MILESTONES = [
  { id: 'keepers', need: 1, text: "Keep nursery, leaf mulch and forester through a fire." },
  { id: 'rain', need: 1e4, text: "Gain 2% of your seedfall seeds every second." },
  { id: 'keepall', need: 2e5, text: "Keep all Seed upgrades through a fire." },
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export function defaults() {
  return {
    planted: false,
    trees: D(0),
    rootSap: D(0), // all the sap sent to the roots this generation
    canopySap: D(0),
    seedSet: D(0),

    // The two sliders: what share of the sap goes to seed, and how the rest
    // is split between canopy and roots.
    seedShare: 0,
    canopySplit: 0.3,
    heartShare: 0, // the share of sap sent to heartwood, taken before the rest is split
    heartSap: D(0), // kept through seedfall and fire, lost on a fold

    age: 0, // seconds of growing old this generation
    genTime: 0,
    bestTrees: D(0), // biggest this generation
    foldBestTrees: D(0),
    bestStands: 0, // most stands ever reached

    seeds: D(0),
    totalSeeds: D(0), // gathered since the last fire
    seedfalls: 0,
    seedUp: {},

    loam: D(0),
    totalLoam: D(0), // this fold
    fires: 0,
    fireTime: 0,
    loamUp: {},

    pending: D(0),
    given: D(0), // all the starlight this page has ever handed over
    ringLight: 1, // what heartwood multiplies all starlight by, worked out every tick
    foldTime: 0,
    folds: 0,
    shining: false,
    seen: {},
  };
}

// ---------------------------------------------------------------------------
// Derived numbers
// ---------------------------------------------------------------------------

/** How many stands count: the five past the wood beyond the wood need the expansion. */
export function standCap(state) {
  return state.eclipse.exp.grove ? STANDS.length : BASE_STANDS;
}

function standsFrom(best, cap = BASE_STANDS) {
  let n = 0;
  while (n < cap && best.gte(STANDS[n].trees)) n++;
  return n;
}

/** How many of the old wood's stands a forest size has reached. */
export function oldWoodDepth(best) {
  return standsFrom(best, STANDS.length) - standsFrom(best, BASE_STANDS);
}

/** Heartwood opens with its stand and stays open. */
export function heartOpen(state) {
  return !!state.eclipse.exp.grove && state.grove.bestStands > STAND_INDEX.heart;
}

/** What heartwood's rings multiply all starlight by. The other worlds read this. */
export function ringLight(state) {
  const g = state.grove;
  if (!heartOpen(state)) return 1;
  const reached = standsFrom(g.foldBestTrees, standCap(state));
  if (reached <= STAND_INDEX.glow) return 1;
  const rings = g.heartSap.add(1).log10().toNumber() * (reached > STAND_INDEX.pillar ? 2 : 1);
  return Math.min(1e150, Math.pow(reached > STAND_INDEX.elder ? BAL.ringLightGreat : BAL.ringLight, rings));
}

export function setHeartShare(state, share) {
  if (!heartOpen(state)) return false;
  state.grove.heartShare = Math.max(0, Math.min(BAL.maxHeartShare, share));
  return true;
}

export function milestoneReached(g, id) {
  const m = LOAM_MILESTONES.find((x) => x.id === id);
  return g.totalLoam.gte(m.need);
}

export function seedsFallAlone(state) {
  return milestoneReached(state.grove, 'rain') || !!state.atlas.nodes.g_seed;
}

function rootCurve(g) {
  let start = BAL.roots.scaleStart;
  if (g.seedUp.taproot) start += BAL.taprootLevels;
  if (g.loamUp.deeproot) start += BAL.deeprootLevels;
  return { ...BAL.roots, scaleStart: start };
}

function canopyCurve(g) {
  let start = BAL.canopy.scaleStart;
  if (g.loamUp.pioneer) start += BAL.pioneerLevels;
  return { ...BAL.canopy, scaleStart: start };
}

/**
 * How much of the growing sap should go to canopy. A forest that is close to
 * full needs little; one that is rattling around in its room needs a lot.
 */
export function autoSplit(fullness) {
  if (fullness >= BAL.fullAt) return 0.15;
  return Math.min(0.75, 0.15 + 0.6 * (BAL.fullAt - fullness) / BAL.fullAt);
}

/** Powers of ten the forest has reached this fold, for the routes to other worlds. */
export function decades(state) {
  return state.grove.foldBestTrees.add(1).log10().toNumber();
}

export function calc(state) {
  const g = state.grove;
  const U = g.seedUp;
  const L = g.loamUp;
  const N = state.atlas.nodes;

  const E = state.eclipse.up;
  let stands = standsFrom(g.bestTrees, standCap(state));
  if (U.memory) stands = Math.max(stands, MEMORY_STANDS);
  if (E.g_stands) stands = Math.max(stands, standsFrom(g.foldBestTrees, standCap(state)));
  const passed = (id) => stands > STAND_INDEX[id];

  const rCurve = rootCurve(g);
  const cCurve = canopyCurve(g);
  const rootLevel = affordableLevel(rCurve, g.rootSap);
  const canopyLevel = affordableLevel(cCurve, g.canopySap);
  const nextRoot = costAt(rCurve, rootLevel);
  const nextCanopy = costAt(cCurve, canopyLevel);

  const roomStep = U.crown ? BAL.roomPerRootCrown : BAL.roomPerRoot;
  const room = D(BAL.baseRoom).mul(Decimal.pow(roomStep, rootLevel));
  const canopyStep = U.broadleaf ? BAL.ratePerCanopyBroad : BAL.ratePerCanopy;
  const slowStep = passed('giant') ? BAL.slowPerRootGiants : BAL.slowPerRoot;
  // Kept as a plain number: it shrinks as the forest gets big but never far
  // enough to need more than that.
  const rate = Math.max(1e-12, BAL.baseRate * Math.pow(canopyStep, canopyLevel) / Math.pow(slowStep, rootLevel));
  const fullness = g.trees.div(room).toNumber();

  // How much of the sap sent somewhere actually arrives.
  let rootReach = 1;
  if (passed('thicket')) rootReach *= 2;
  if (U.mulch) rootReach *= 3;
  let canopyReach = 1;
  if (passed('deer')) canopyReach *= 3;
  if (L.charcoal) canopyReach *= 5;
  let seedReach = D(1);
  if (passed('owl')) seedReach = seedReach.mul(2);
  if (passed('mother')) seedReach = seedReach.mul(3);
  if (U.mast) seedReach = seedReach.mul(3);
  if (L.fireweed) seedReach = seedReach.mul(10);

  // Heartwood: one ring for each power of ten of sap sent there.
  const hasHeart = heartOpen(state);
  const rings = hasHeart ? g.heartSap.add(1).log10().toNumber() * (passed('pillar') ? 2 : 1) : 0;
  const heartMult = Math.pow(1 + rings, BAL.ringSapPower);
  if (passed('burl')) seedReach = seedReach.mul(heartMult);

  // How rich the sap is.
  const agePower = U.veteran ? BAL.agePowerVeteran : BAL.agePower;
  const old = g.seen.age ? Math.pow(1 + g.age / BAL.ageSeconds, agePower) : 1;
  const seedBed = g.totalSeeds.add(1).pow(U.deep ? BAL.seedBedPowerDeep : BAL.seedBedPower);
  const loamBed = g.totalLoam.add(1).pow(BAL.loamSapPower);
  const standStep = L.sun ? BAL.standMultSun : BAL.standMult;
  const standMult = passed('under') ? Math.pow(standStep, stands) : 1;
  const humus = U.humus ? Math.pow(BAL.humusPerCanopy, canopyLevel) : 1;
  let richness = D(old).mul(seedBed).mul(loamBed).mul(standMult).mul(humus).mul(heartMult);
  if (U.nursery) richness = richness.mul(3);
  if (L.ashbed) richness = richness.mul(10);
  if (N.g_star) richness = richness.mul(g.given.add(1));
  if (N.r_ash) richness = richness.mul(Math.max(1, state.cinder.foldBest / 1000));
  if (N.r_mist) richness = richness.mul(1 + state.tidewater.foldBestTide.add(1).log10().toNumber());
  if (N.r_works) richness = richness.mul(1 + state.clockwork.foldBestRate.add(1).log10().toNumber());
  if (N.r_crystal) richness = richness.mul(1 + state.hollow.foldBestCrystal.add(1).log10().toNumber());
  richness = richness.mul(outsideMult(state, 'grove'));
  const sap = g.trees.mul(richness);

  // Heartwood takes its share first. The rest is split as before.
  const heartShare = hasHeart ? g.heartShare : 0;
  const free = 1 - heartShare;
  const seedShare = free * g.seedShare;
  // An Eclipse upgrade lets sap sent to seed feed the roots as well.
  const rootsShare = free * (1 - g.seedShare) * (1 - g.canopySplit) + (E.g_seed ? seedShare : 0);
  const canopyShare = free * (1 - g.seedShare) * g.canopySplit;

  const canSeedfall = passed('flower') && g.seedSet.gte(BAL.seedNeedsSap);
  const seedGain = canSeedfall ? g.seedSet.div(BAL.seedNeedsSap).pow(BAL.seedRoot).floor() : D(0);

  const settle = 1 + g.fireTime / (BAL.settleSeconds / (L.clearing ? 2 : 1));
  const canFire = passed('dead') && g.totalSeeds.gte(BAL.loamNeedsSeeds);
  const loamGain = canFire ? g.totalSeeds.div(BAL.loamNeedsSeeds).pow(BAL.loamRoot).mul(settle).floor() : D(0);

  const far = STANDS[STAND_INDEX.far].trees;
  let shine = 0;
  if (g.foldBestTrees.gte(far)) {
    shine = BAL.shineBase * Math.pow(2, g.foldBestTrees.div(far).log10().toNumber() / BAL.shineDecades) * (N.g_bright ? 3 : 1) * lightMult(state);
  }

  return {
    stands, rootLevel, canopyLevel, nextRoot, nextCanopy, room, rate, fullness,
    rootReach, canopyReach, seedReach, old, agePower, seedBed, loamBed, standMult, humus, richness, sap,
    rootsShare, canopyShare, seedShare, heartShare, hasHeart, rings, heartMult, canSeedfall, seedGain, settle, canFire, loamGain, shine,
  };
}

// ---------------------------------------------------------------------------
// Things the player can do
// ---------------------------------------------------------------------------

function startGeneration(g, keepAge = false) {
  g.trees = D(BAL.startTrees);
  g.rootSap = D(0);
  g.canopySap = D(0);
  g.seedSet = D(0);
  if (!keepAge) g.age = 0;
  g.genTime = 0;
  g.bestTrees = D(0);
  if (g.seedUp.saplings) {
    g.rootSap = costAt(rootCurve(g), BAL.saplingLevels - 1);
    g.canopySap = costAt(canopyCurve(g), BAL.saplingLevels - 1);
  }
}

export function plant(state) {
  const g = state.grove;
  if (g.planted) return false;
  g.planted = true;
  startGeneration(g);
  return true;
}

export function setShares(state, seedShare, canopySplit) {
  const g = state.grove;
  const clamp = (x) => Math.max(0, Math.min(1, x));
  if (seedShare !== undefined && seedShare !== null) g.seedShare = g.seen.seed ? clamp(seedShare) : 0;
  if (canopySplit !== undefined && canopySplit !== null && !g.seedUp.forester) g.canopySplit = clamp(canopySplit);
}

export function seedfall(state) {
  const g = state.grove;
  const d = calc(state);
  if (!d.canSeedfall || d.seedGain.lt(1)) return false;
  g.seeds = g.seeds.add(d.seedGain);
  g.totalSeeds = g.totalSeeds.add(d.seedGain);
  g.seedfalls += 1;
  emit('seedfall', { gain: d.seedGain, time: g.genTime });
  startGeneration(g, !!state.eclipse.up.g_age);
  return true;
}

export function buySeedUpgrade(state, id) {
  const g = state.grove;
  const up = SEED_BY_ID[id];
  if (!up || g.seedUp[id] || g.seeds.lt(up.cost)) return false;
  g.seeds = g.seeds.sub(up.cost);
  g.seedUp[id] = true;
  emit('seedUpgrade', { id });
  return true;
}

export function wildfire(state) {
  const g = state.grove;
  const d = calc(state);
  if (!d.canFire || d.loamGain.lt(1)) return false;
  g.loam = g.loam.add(d.loamGain);
  g.totalLoam = g.totalLoam.add(d.loamGain);
  g.fires += 1;
  emit('wildfire', { gain: d.loamGain, time: g.fireTime });
  g.fireTime = 0;
  g.seeds = D(0);
  g.totalSeeds = D(0);
  if (!milestoneReached(g, 'keepall')) {
    const kept = {};
    if (milestoneReached(g, 'keepers')) {
      for (const id of KEPT_BY_LOAM) if (g.seedUp[id]) kept[id] = true;
    }
    g.seedUp = kept;
  }
  startGeneration(g);
  return true;
}

export function buyLoamUpgrade(state, id) {
  const g = state.grove;
  const up = LOAM_BY_ID[id];
  if (!up || g.loamUp[id] || g.loam.lt(up.cost)) return false;
  g.loam = g.loam.sub(up.cost);
  g.loamUp[id] = true;
  emit('loamUpgrade', { id });
  return true;
}

export function fold(state) {
  const g = state.grove;
  if (g.pending.lt(1)) return false;
  const gained = gather(state, g.pending);
  emit('fold', { world: 'grove', gain: gained, time: g.foldTime });
  const fresh = defaults();
  fresh.seen = g.seen;
  fresh.bestStands = g.bestStands;
  fresh.shining = g.shining;
  fresh.folds = g.folds + 1;
  fresh.given = g.given.add(gained);
  fresh.seedfalls = g.seedfalls;
  fresh.fires = g.fires;
  fresh.heartShare = g.heartShare;
  fresh.seedShare = g.seedShare;
  fresh.canopySplit = g.canopySplit;
  if (state.atlas.nodes.g_hands) {
    for (const id of KEPT_BY_LOAM) fresh.seedUp[id] = true;
    fresh.planted = true;
    startGeneration(fresh);
  }
  state.grove = fresh;
  return true;
}

// ---------------------------------------------------------------------------
// Time passing
// ---------------------------------------------------------------------------

export function tick(state, dt) {
  const g = state.grove;
  const N = state.atlas.nodes;
  if (!N.grove || !g.planted) return;
  g.genTime += dt;
  g.fireTime += dt;
  g.foldTime += dt;

  let d = calc(state);
  let remaining = dt;
  let guard = 0;
  while (remaining > 1e-9 && guard++ < 100000) {
    // Levels of root and canopy arrive mid-step on a long step, so cut long
    // steps short enough that the forest never runs far on stale numbers.
    const step = Math.min(remaining, 2);
    if (g.seedUp.forester) g.canopySplit = autoSplit(d.fullness);

    // The forest fills its room along the usual S-shaped curve. This is the
    // exact answer for a step of any length, not an approximation.
    const grow = Math.expm1(Math.min(d.rate * step, 700));
    const denom = d.room.add(g.trees.mul(grow));
    const treeSeconds = d.room.div(d.rate).mul(denom.div(d.room).ln());
    g.trees = Decimal.min(d.room, d.room.mul(g.trees).mul(grow + 1).div(denom));

    const sap = treeSeconds.mul(d.richness);
    g.rootSap = g.rootSap.add(sap.mul(d.rootsShare * d.rootReach));
    g.canopySap = g.canopySap.add(sap.mul(d.canopyShare * d.canopyReach));
    if (d.seedShare > 0) g.seedSet = g.seedSet.add(sap.mul(d.seedShare).mul(d.seedReach));
    if (d.heartShare > 0) g.heartSap = g.heartSap.add(sap.mul(d.heartShare));

    if (g.trees.gt(g.bestTrees)) g.bestTrees = g.trees;
    if (g.trees.gt(g.foldBestTrees)) g.foldBestTrees = g.trees;

    const stands = Math.max(standsFrom(g.bestTrees, standCap(state)), g.seedUp.memory ? MEMORY_STANDS : 0);
    while (g.bestStands < stands) {
      const p = STANDS[g.bestStands];
      g.bestStands += 1;
      emit('stand', { id: p.id, name: p.name, text: p.text });
    }
    if (g.bestStands > STAND_INDEX.closed) g.seen.age = true;
    if (g.bestStands > STAND_INDEX.flower) g.seen.seed = true;
    if (g.bestStands > STAND_INDEX.dead) g.seen.fire = true;
    if (!g.shining && g.bestStands > STAND_INDEX.far) {
      g.shining = true;
      state.atlas.seen = true;
    }

    if (g.seen.age && g.trees.div(d.room).toNumber() >= (state.eclipse.up.g_full ? 0.5 : BAL.fullAt)) {
      let speed = 1;
      if (d.stands > STAND_INDEX.lichen) speed *= 2;
      if (g.loamUp.serotiny) speed *= 3;
      g.age += step * speed;
    }

    remaining -= step;
    d = calc(state);
  }

  if (N.g_keeper) {
    for (const u of SEED_UPGRADES) if (!g.seedUp[u.id] && g.seeds.gte(u.cost)) buySeedUpgrade(state, u.id);
    for (const u of LOAM_UPGRADES) if (!g.loamUp[u.id] && g.loam.gte(u.cost)) buyLoamUpgrade(state, u.id);
  }
  if (seedsFallAlone(state) && d.seedGain.gt(0)) {
    const fell = d.seedGain.mul(BAL.passiveSeedPerSecond * dt);
    g.seeds = g.seeds.add(fell);
    g.totalSeeds = g.totalSeeds.add(fell);
  }
  g.ringLight = ringLight(state);
  if (d.shine > 0) g.pending = g.pending.add(d.shine * dt / 60);
}
