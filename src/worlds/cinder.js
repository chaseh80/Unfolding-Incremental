// Cinder, the first world. One fire, and everything you do is about making it
// burn hotter.
//
// Heat is what you gather and spend. Temperature is how hard the fire is
// burning right now, read straight off how much heat it gives each second.
// Passing certain temperatures (ignition points) changes the rules.
import { Decimal, D } from '../core/num.js';
import { costAt, affordableLevel } from '../core/scaling.js';
import { emit } from '../core/events.js';
import { gather } from '../atlas.js';

// ---------------------------------------------------------------------------
// Balance. Every tunable number for this world lives in this block.
// ---------------------------------------------------------------------------

export const BAL = {
  startHeat: 10,
  tempBase: 20,
  tempPerDecade: 100,

  feeds: {
    kindling: { base: 10, ratio: 1.3, scaleStart: 30, scalePower: 2 },
    bellows: { base: 100, ratio: 4, scaleStart: 8, scalePower: 2 },
    flue: { base: 1e4, ratio: 100, scaleStart: 5, scalePower: 2 },
  },
  bellowsBase: 2,
  doubleBellowsBonus: 0.2,
  flueStrength: 0.05,
  flueStrengthStep: 0.02,
  kilnBellows: 4,
  crucibleBellows: 3,
  chimneyFlue: 2,

  ignitionMult: 1.5,
  ignitionMultPrism: 2,

  ashNeedsHeat: 1e5,
  ashRoot: 1 / 3,
  ashBedPower: 0.4,
  ashBedPowerDeep: 0.55,
  hotAshesPerPoint: 1.3,

  emberSeconds: 30,
  emberPower: 1,
  emberPowerCharcoal: 1.25,
  emberPowerTungsten: 0.25,

  glassNeedsAsh: 2e8,
  glassRoot: 1 / 3,
  glassHeatPower: 0.4,
  settleSeconds: 60,
  glassAshPower: 0,
  lensMult: 10,
  passiveAshPerSecond: 0.02,

  // The damper trades heat against ash. Fully open multiplies heat by
  // damperHeat and divides ash by damperAsh; fully shut does the reverse.
  damperHeat: 4,
  damperAsh: 16,

  endTemp: 5500,

  // Past endTemp the world shines. Starlight per minute doubles every shineStep degrees.
  shineStep: 500,
  passiveGlassPerSecond: 0.01,
};

export const FEED_NAMES = { kindling: 'Kindling', bellows: 'Bellows', flue: 'Flue' };
/** Order the "feed the fire" key works through: the strongest things first. */
export const FEED_ORDER = ['flue', 'bellows', 'kindling'];

export const IGNITIONS = [
  { id: 'damp', temp: 100, name: 'The damp burns off', text: "Unlocks bellows." },
  { id: 'paper', temp: 233, name: 'Paper catches', text: "Kindling gives 2× heat." },
  { id: 'logs', temp: 300, name: 'The logs take', text: "Heat ×2. Unlocks the flue." },
  { id: 'charcoal', temp: 450, name: 'Charcoal glows', text: "Unlocks burning down for ash." },
  { id: 'coal', temp: 600, name: 'Coal catches', text: "Each ignition point passed this burn multiplies heat by 1.5." },
  { id: 'red', temp: 800, name: 'Red heat', text: "Each bellows makes kindling 10% better." },
  { id: 'copper', temp: 1085, name: 'Copper melts', text: "Ash gain ×2." },
  { id: 'yellow', temp: 1300, name: 'Yellow heat', text: "Each flue strengthens your bellows by 7% instead of 5%." },
  { id: 'iron', temp: 1538, name: 'Iron melts', text: "Ash gain ×(peak temperature / 1,000)²." },
  { id: 'sand', temp: 1700, name: 'Sand melts', text: "Unlocks smelting for glass." },
  { id: 'white', temp: 2200, name: 'White heat', text: "Heat ×(peak temperature / 100)." },
  { id: 'brick', temp: 2800, name: 'Firebrick softens', text: "Glass gain ×2." },
  { id: 'tungsten', temp: 3422, name: 'Tungsten melts', text: "Ember power +0.25." },
  { id: 'sun', temp: 5500, name: 'As hot as the face of the sun', text: "Cinder starts to shine." },
];
const IGN_INDEX = Object.fromEntries(IGNITIONS.map((p, i) => [p.id, i]));

export const ASH_UPGRADES = [
  { id: 'banked', cost: 1, name: 'Banked coals', text: "Burns start lit. Heat ×3." },
  { id: 'dry', cost: 1, name: 'Dry store', text: "Kindling gives 2× heat." },
  { id: 'tender', cost: 200, name: 'Fire-tender', text: "Buys kindling automatically, for free." },
  { id: 'hand', cost: 1000, name: 'Bellows-hand', text: "Buys bellows automatically, for free." },
  { id: 'deep', cost: 2000, name: 'Deep ash bed', text: "Ash bed power 0.4 → 0.55." },
  { id: 'clamp', cost: 5000, name: 'Charcoal clamp', text: "Ember power 1 → 1.25." },
  { id: 'sweep', cost: 15000, name: 'Flue-sweep', text: "Buys flues automatically, for free." },
  { id: 'hot', cost: 20000, name: 'Hot ashes', text: "Ash gain +30% per ignition point passed this burn." },
  { id: 'double', cost: 6e5, name: 'Double bellows', text: "Each bellows multiplies heat by 2.2 instead of 2." },
  { id: 'memory', cost: 2e7, name: 'A warm hearth', text: "Burns start with the first 6 ignition points passed." },
  { id: 'clinker', cost: 3e7, name: 'Clinker', text: "Each flue makes kindling 25% better." },
  { id: 'kiln', cost: 1.2e8, name: 'Firebrick lining', text: "Bellows cost scaling starts 4 purchases later." },
];
const ASH_BY_ID = Object.fromEntries(ASH_UPGRADES.map((u) => [u.id, u]));
const MEMORY_POINTS = 6;
const KEPT_BY_GLASS = ['banked', 'tender', 'hand', 'sweep'];

export const GLASS_UPGRADES = [
  { id: 'lens', cost: 50, name: 'Burning lens', text: "Multiplies heat by 10." },
  { id: 'anneal', cost: 300, name: 'Annealing oven', text: "Each flue strengthens your bellows by +2%." },
  { id: 'cullet', cost: 3000, name: 'Cullet', text: "Glass clears 2× faster." },
  { id: 'blown', cost: 8000, name: 'Blown glass', text: "Ash gain ×10." },
  { id: 'crucible', cost: 30000, name: 'Crucible', text: "Bellows cost scaling starts 3 purchases later." },
  { id: 'mirror', cost: 150000, name: 'Mirrored hearth', text: "Embers build 3× faster." },
  { id: 'prism', cost: 400000, name: 'Prism', text: "Ignition points multiply heat by 2 instead of 1.5." },
  { id: 'chimney', cost: 1.5e6, name: 'Glass chimney', text: "Flue cost scaling starts 2 purchases later." },
];
const GLASS_BY_ID = Object.fromEntries(GLASS_UPGRADES.map((u) => [u.id, u]));

export const GLASS_MILESTONES = [
  { id: 'keepers', need: 1, text: "Keep banked coals, fire-tender, bellows-hand and flue-sweep when you smelt." },
  { id: 'shed', need: 150, text: "Gain 2% of your burn-down ash every second." },
  { id: 'keepall', need: 1000, text: "Keep all Ash upgrades when you smelt." },
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export function defaults() {
  return {
    lit: false,
    heat: D(0),
    burnHeat: D(0), // all heat given off since the last burn down
    feeds: { kindling: 0, bellows: 0, flue: 0 },
    peakTemp: BAL.tempBase, // hottest this burn
    bestTemp: BAL.tempBase, // hottest ever
    bestPoints: 0, // most ignition points ever passed
    burnTime: 0,
    ash: D(0),
    totalAsh: D(0), // earned since the last smelt
    burns: 0,
    ashUp: {},
    glass: D(0),
    totalGlass: D(0),
    smelts: 0,
    smeltTime: 0,
    glassUp: {},
    damper: 0, // -1 is shut, 0 is half open, 1 is wide open
    seen: {}, // things that stay visible once you've found them
    done: false,
    pending: D(0), // starlight given off since the last fold
    foldBest: BAL.tempBase, // hottest this fold
    foldTime: 0,
    folds: 0,
  };
}

// ---------------------------------------------------------------------------
// Derived numbers
// ---------------------------------------------------------------------------

function pointsFromTemp(temp) {
  let n = 0;
  while (n < IGNITIONS.length && temp >= IGNITIONS[n].temp) n++;
  return n;
}

export function milestoneReached(c, id) {
  const m = GLASS_MILESTONES.find((x) => x.id === id);
  return c.totalGlass.gte(m.need);
}

/** Whether the fire is dropping ash on its own, without being burned down. */
export function sheds(state) {
  return milestoneReached(state.cinder, 'shed') || !!state.atlas.nodes.c_shed;
}

export function feedCurve(c, id) {
  const curve = BAL.feeds[id];
  let start = curve.scaleStart;
  if (id === 'bellows') {
    if (c.ashUp.kiln) start += BAL.kilnBellows;
    if (c.glassUp.crucible) start += BAL.crucibleBellows;
  }
  if (id === 'flue' && c.glassUp.chimney) start += BAL.chimneyFlue;
  return start === curve.scaleStart ? curve : { ...curve, scaleStart: start };
}

export function feedCost(c, id) {
  return costAt(feedCurve(c, id), c.feeds[id]);
}

export function feedIsFree(c, id) {
  return !!c.ashUp[{ kindling: 'tender', bellows: 'hand', flue: 'sweep' }[id]];
}

export function feedUnlocked(c, id) {
  return id === 'kindling' || !!c.seen[id];
}

/** Everything the rest of the game wants to know about the fire right now. */
export function calc(state) {
  const c = state.cinder;
  const A = c.ashUp;
  const G = c.glassUp;
  const N = state.atlas.nodes;

  let points = pointsFromTemp(c.peakTemp);
  if (A.memory) points = Math.max(points, MEMORY_POINTS);
  const passed = (id) => points > IGN_INDEX[id];

  let kindlingPower = 1;
  if (passed('paper')) kindlingPower *= 2;
  if (A.dry) kindlingPower *= 2;
  if (passed('red')) kindlingPower *= 1 + 0.1 * c.feeds.bellows;
  if (A.clinker) kindlingPower *= 1 + 0.25 * c.feeds.flue;
  const base = 1 + c.feeds.kindling * kindlingPower;

  const bellowsBase = BAL.bellowsBase + (A.double ? BAL.doubleBellowsBonus : 0);
  let flueStrength = BAL.flueStrength;
  if (passed('yellow')) flueStrength += BAL.flueStrengthStep;
  if (G.anneal) flueStrength += BAL.flueStrengthStep;
  const bellowsBoost = 1 + flueStrength * c.feeds.flue;
  const bellowsMult = Decimal.pow(bellowsBase, c.feeds.bellows * bellowsBoost);

  const ignitionBase = G.prism ? BAL.ignitionMultPrism : BAL.ignitionMult;
  const ignitionMult = passed('coal') ? Decimal.pow(ignitionBase, points) : D(1);

  const ashBedPower = A.deep ? BAL.ashBedPowerDeep : BAL.ashBedPower;
  const ashBed = c.totalAsh.add(1).pow(ashBedPower);

  // Embers only hold once there is ash to bed them in.
  let emberPower = A.clamp ? BAL.emberPowerCharcoal : BAL.emberPower;
  if (passed('tungsten')) emberPower += BAL.emberPowerTungsten;
  const emberSeconds = BAL.emberSeconds / (G.mirror ? 3 : 1);
  const embers = c.seen.embers ? Math.pow(1 + c.burnTime / emberSeconds, emberPower) : 1;

  const glassHeat = c.totalGlass.add(1).pow(BAL.glassHeatPower);
  const selfFeed = passed('white') ? c.peakTemp / 100 : 1;

  let rate = D(0);
  if (c.lit) {
    rate = D(base).mul(bellowsMult).mul(ignitionMult).mul(ashBed).mul(glassHeat).mul(embers).mul(selfFeed);
    if (c.damper) rate = rate.mul(Math.pow(BAL.damperHeat, c.damper));
    if (A.banked) rate = rate.mul(3);
    if (N.c_star) rate = rate.mul(state.atlas.total.add(1));
    if (N.r_drift) rate = rate.mul(state.tidewater.totalDriftwood.add(1).sqrt());
    if (N.r_timber) rate = rate.mul(Math.pow(1 + state.grove.foldBestTrees.add(1).log10().toNumber(), 2));
    if (N.r_works) rate = rate.mul(1 + state.clockwork.foldBestRate.add(1).log10().toNumber());
    if (passed('logs')) rate = rate.mul(2);
    if (G.lens) rate = rate.mul(BAL.lensMult);
  }

  const temp = BAL.tempBase + BAL.tempPerDecade * rate.add(1).log10().toNumber();

  // Ash
  let ashMult = c.totalGlass.add(1).pow(BAL.glassAshPower);
  if (passed('copper')) ashMult = ashMult.mul(2);
  if (A.hot) ashMult = ashMult.mul(Math.pow(BAL.hotAshesPerPoint, points));
  if (passed('iron')) ashMult = ashMult.mul(Math.pow(c.peakTemp / 1000, 2));
  if (G.blown) ashMult = ashMult.mul(10);
  if (c.damper) ashMult = ashMult.mul(Math.pow(BAL.damperAsh, -c.damper));
  const canBurn = passed('charcoal') && c.burnHeat.gte(BAL.ashNeedsHeat);
  const ashGain = canBurn ? c.burnHeat.div(BAL.ashNeedsHeat).pow(BAL.ashRoot).mul(ashMult).floor() : D(0);

  // Glass
  let glassMult = D(1);
  if (passed('brick')) glassMult = glassMult.mul(2);
  const canSmelt = passed('sand') && c.totalAsh.gte(BAL.glassNeedsAsh);
  // Glass that has had time to clear is worth more, which makes one long
  // smelt better than several hurried ones.
  const settle = 1 + c.smeltTime / (BAL.settleSeconds / (G.cullet ? 2 : 1));
  const glassGain = canSmelt ? c.totalAsh.div(BAL.glassNeedsAsh).pow(BAL.glassRoot).mul(glassMult).mul(settle).floor() : D(0);

  // Starlight
  let shine = 0;
  if (c.foldBest >= BAL.endTemp) {
    shine = Math.pow(2, (c.foldBest - BAL.endTemp) / BAL.shineStep) * (N.c_bright ? 3 : 1);
  }

  return {
    shine,
    points, kindlingPower, base, bellowsBase, flueStrength, bellowsBoost, bellowsMult,
    ignitionBase, ignitionMult, ashBedPower, ashBed, emberPower, embers, glassHeat, selfFeed,
    rate, temp, ashMult, canBurn, ashGain, glassMult, settle, canSmelt, glassGain,
  };
}

// ---------------------------------------------------------------------------
// Things the player can do
// ---------------------------------------------------------------------------

export function setDamper(state, value) {
  const c = state.cinder;
  if (!c.seen.ash) return;
  c.damper = Math.max(-1, Math.min(1, value));
}

export function strike(state) {
  const c = state.cinder;
  if (c.lit) return false;
  c.lit = true;
  c.heat = c.heat.max(BAL.startHeat);
  return true;
}

/** Buy one, or as many as the heat on hand allows. Returns how many were bought. */
export function buyFeed(state, id, max = false) {
  const c = state.cinder;
  if (!c.lit || !feedUnlocked(c, id)) return 0;
  const curve = feedCurve(c, id);
  if (feedIsFree(c, id)) {
    const target = affordableLevel(curve, c.heat);
    const bought = Math.max(0, target - c.feeds[id]);
    c.feeds[id] += bought;
    return bought;
  }
  let bought = 0;
  const limit = max ? 5000 : 1;
  while (bought < limit) {
    const cost = costAt(curve, c.feeds[id]);
    if (c.heat.lt(cost)) break;
    c.heat = c.heat.sub(cost);
    c.feeds[id] += 1;
    bought++;
  }
  return bought;
}

export function feedAll(state) {
  let bought = 0;
  // Twice through, because buying a cheap thing never blocks a dear one but
  // the reverse can leave change that's still worth spending.
  for (let pass = 0; pass < 2; pass++) {
    for (const id of FEED_ORDER) bought += buyFeed(state, id, true);
  }
  return bought;
}

function resetBurn(c) {
  c.heat = D(BAL.startHeat);
  c.burnHeat = D(0);
  c.feeds = { kindling: 0, bellows: 0, flue: 0 };
  c.peakTemp = BAL.tempBase;
  c.burnTime = 0;
  c.lit = !!c.ashUp.banked;
  if (!c.lit) c.heat = D(0);
}

export function burnDown(state) {
  const c = state.cinder;
  const d = calc(state);
  if (!d.canBurn || d.ashGain.lt(1)) return false;
  c.ash = c.ash.add(d.ashGain);
  c.totalAsh = c.totalAsh.add(d.ashGain);
  c.burns += 1;
  c.seen.embers = true;
  emit('burn', { gain: d.ashGain, time: c.burnTime });
  resetBurn(c);
  return true;
}

export function buyAshUpgrade(state, id) {
  const c = state.cinder;
  const up = ASH_BY_ID[id];
  if (!up || c.ashUp[id] || c.ash.lt(up.cost)) return false;
  c.ash = c.ash.sub(up.cost);
  c.ashUp[id] = true;
  if (id === 'banked') c.lit = true;
  emit('ashUpgrade', { id });
  return true;
}

export function smelt(state) {
  const c = state.cinder;
  const d = calc(state);
  if (!d.canSmelt || d.glassGain.lt(1)) return false;
  c.glass = c.glass.add(d.glassGain);
  c.totalGlass = c.totalGlass.add(d.glassGain);
  c.smelts += 1;
  emit('smelt', { gain: d.glassGain, time: c.smeltTime });
  c.smeltTime = 0;
  c.ash = D(0);
  c.totalAsh = D(0);
  if (!milestoneReached(c, 'keepall')) {
    const kept = {};
    if (milestoneReached(c, 'keepers')) {
      for (const id of KEPT_BY_GLASS) if (c.ashUp[id]) kept[id] = true;
    }
    c.ashUp = kept;
  }
  resetBurn(c);
  return true;
}

export function buyGlassUpgrade(state, id) {
  const c = state.cinder;
  const up = GLASS_BY_ID[id];
  if (!up || c.glassUp[id] || c.glass.lt(up.cost)) return false;
  c.glass = c.glass.sub(up.cost);
  c.glassUp[id] = true;
  emit('glassUpgrade', { id });
  return true;
}

/** Fold the page: bank the starlight Cinder has given off and start the world over. */
export function fold(state) {
  const c = state.cinder;
  if (c.pending.lt(1)) return false;
  const gained = gather(state, c.pending);
  emit('fold', { world: 'cinder', gain: gained, time: c.foldTime });
  const fresh = defaults();
  fresh.seen = c.seen;
  fresh.damper = c.damper;
  fresh.bestTemp = c.bestTemp;
  fresh.bestPoints = c.bestPoints;
  fresh.done = c.done;
  fresh.folds = c.folds + 1;
  fresh.burns = c.burns;
  fresh.smelts = c.smelts;
  if (state.atlas.nodes.c_hands) {
    for (const id of KEPT_BY_GLASS) fresh.ashUp[id] = true;
    fresh.lit = true;
    fresh.heat = D(BAL.startHeat);
  }
  state.cinder = fresh;
  return true;
}

// ---------------------------------------------------------------------------
// Time passing
// ---------------------------------------------------------------------------

export function tick(state, dt) {
  const c = state.cinder;
  if (!c.lit) {
    if (c.ashUp.banked) c.lit = true;
    else return;
  }
  c.burnTime += dt;
  c.smeltTime += dt;

  for (const id of FEED_ORDER) {
    if (feedIsFree(c, id) && feedUnlocked(c, id)) buyFeed(state, id, true);
  }

  const d = calc(state);
  const gained = d.rate.mul(dt);
  c.heat = c.heat.add(gained);
  c.burnHeat = c.burnHeat.add(gained);

  if (d.temp > c.peakTemp) c.peakTemp = d.temp;
  if (d.temp > c.bestTemp) c.bestTemp = d.temp;

  const points = Math.max(pointsFromTemp(c.peakTemp), c.ashUp.memory ? MEMORY_POINTS : 0);
  while (c.bestPoints < points) {
    const p = IGNITIONS[c.bestPoints];
    c.bestPoints += 1;
    emit('ignition', { id: p.id, name: p.name, text: p.text });
  }
  if (c.bestPoints > IGN_INDEX.damp) c.seen.bellows = true;
  if (c.bestPoints > IGN_INDEX.logs) c.seen.flue = true;
  if (c.bestPoints > IGN_INDEX.charcoal) c.seen.ash = true;
  if (c.bestPoints > IGN_INDEX.sand) c.seen.glass = true;

  if (c.peakTemp > c.foldBest) c.foldBest = c.peakTemp;
  c.foldTime += dt;
  if (d.shine > 0) c.pending = c.pending.add(d.shine * dt / 60);

  const N = state.atlas.nodes;
  if (N.c_keeper) {
    for (const u of ASH_UPGRADES) if (!c.ashUp[u.id] && c.ash.gte(u.cost)) buyAshUpgrade(state, u.id);
    for (const u of GLASS_UPGRADES) if (!c.glassUp[u.id] && c.glass.gte(u.cost)) buyGlassUpgrade(state, u.id);
  }
  if (N.c_glass && d.glassGain.gt(0)) {
    const made = d.glassGain.mul(BAL.passiveGlassPerSecond * dt);
    c.glass = c.glass.add(made);
    c.totalGlass = c.totalGlass.add(made);
  }

  if (sheds(state) && d.ashGain.gt(0)) {
    const shed = d.ashGain.mul(BAL.passiveAshPerSecond * dt);
    c.ash = c.ash.add(shed);
    c.totalAsh = c.totalAsh.add(shed);
  }

  if (!c.done && c.bestTemp >= BAL.endTemp) {
    c.done = true;
    emit('end', {});
  }
}
