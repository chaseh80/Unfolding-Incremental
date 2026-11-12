// Tidewater, the second world. A shore of rock pools and a sea that comes
// and goes.
//
// Each tide has two halves. While the water is in, the pools fill with brine.
// While it is out, the brine dries and leaves salt. You only ever get salt
// for whichever half did less, so the whole world is about keeping the two in
// step and deciding how long a tide should take.
import { Decimal, D } from '../core/num.js';
import { costAt, affordableLevel } from '../core/scaling.js';
import { emit } from '../core/events.js';
import { gather } from '../atlas.js';
import { struckMult } from './links.js';

// ---------------------------------------------------------------------------
// Balance
// ---------------------------------------------------------------------------

export const BAL = {
  startSalt: 10,
  startPeriod: 10,
  minPeriod: 4,
  maxPeriod: 120,
  minGate: 0.1,
  maxGate: 0.9,
  basePool: 20,

  feeds: {
    channel: { base: 10, ratio: 1.5, scaleStart: 25, scalePower: 2 },
    pan: { base: 10, ratio: 1.3, scaleStart: 40, scalePower: 2 },
    pool: { base: 30, ratio: 2.5, scaleStart: 20, scalePower: 2 },
    moon: { base: 200, ratio: 4, scaleStart: 8, scalePower: 2 },
  },
  channelFill: 2,
  panDry: 1,
  poolMult: 2,
  moonMult: 1.6,
  moonMultPull: 1.75,

  kelpTides: 30,
  kelpPower: 1,
  kelpPowerBeds: 1.5,
  holdfastKeeps: 1 / 3,
  lineMult: 1.5,

  driftNeedsSalt: 8000,
  driftRoot: 0.5,
  driftBedPower: 0.5,
  passiveDriftPerSecond: 0.02,

  // Past the last strandline the world shines. Starlight per minute doubles
  // every time the best tide grows by this many powers of ten.
  shineDecades: 2,
  // Newer worlds shine brighter, so each new page matters more than the last.
  shineBase: 3,
};

export const FEED_NAMES = { channel: 'Channels', pan: 'Salt pans', pool: 'Pools', moon: 'Moon' };
export const FEED_ORDER = ['moon', 'pool', 'channel', 'pan'];
const FEED_FREE = { channel: 'cutter', pan: 'raker', pool: 'digger', moon: 'watcher' };

// A strandline is passed when a single tide leaves that much salt.
export const STRANDLINES = [
  { id: 'wrack', salt: 25, name: 'The wrack line', text: "Unlocks the moon." },
  { id: 'barnacle', salt: 80, name: 'Barnacle rocks', text: "Unlocks kelp. It grows every tide and multiplies salt." },
  { id: 'slipway', salt: 600, name: 'The old slipway', text: "Channels ×2." },
  { id: 'storm', salt: 8000, name: 'Storm beach', text: "Unlocks storms for driftwood." },
  { id: 'causeway', salt: 2e6, name: 'The causeway', text: "Each strandline passed this calm multiplies salt by 1.5." },
  { id: 'seal', salt: 5e7, name: 'Seal rocks', text: "Salt pans ×3." },
  { id: 'wood', salt: 6e8, name: 'The drowned wood', text: "Driftwood gain ×2." },
  { id: 'light', salt: 1e12, name: 'Lighthouse rock', text: "Kelp grows 2× faster." },
  { id: 'far', salt: 4e12, name: 'The far strandline', text: "Tidewater starts to shine." },
];
const LINE_INDEX = Object.fromEntries(STRANDLINES.map((p, i) => [p.id, i]));

export const DRIFT_UPGRADES = [
  { id: 'cutter', cost: 1, name: 'Channel-cutter', text: "Buys channels automatically, for free." },
  { id: 'raker', cost: 1, name: 'Pan-raker', text: "Buys salt pans automatically, for free." },
  { id: 'groynes', cost: 1, name: 'Groynes', text: "Salt ×3." },
  { id: 'digger', cost: 1, name: 'Pool-digger', text: "Buys pools automatically, for free." },
  { id: 'tables', cost: 6, name: 'Tide tables', text: "Sets the sluice automatically every tide." },
  { id: 'watcher', cost: 20, name: 'Moon-watcher', text: "Buys the moon automatically, for free." },
  { id: 'beds', cost: 20, name: 'Kelp beds', text: "Kelp power 1 → 1.5." },
  { id: 'cuts', cost: 150, name: 'Deep cuts', text: "Channels ×3." },
  { id: 'seawall', cost: 150, name: 'Sea wall', text: "Pools hold 8× as much." },
  { id: 'holdfast', cost: 800, name: 'Holdfasts', text: "Storms only remove two thirds of your kelp." },
  { id: 'flats', cost: 1500, name: 'Wide flats', text: "Salt pans ×3." },
  { id: 'pull', cost: 25000, name: 'A heavier moon', text: "Each moon level multiplies tides by 1.75 instead of 1.6." },
];
const DRIFT_BY_ID = Object.fromEntries(DRIFT_UPGRADES.map((u) => [u.id, u]));
const KEPT_BY_ATLAS = ['cutter', 'raker', 'digger', 'watcher', 'tables'];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export function defaults() {
  return {
    open: false, // whether the sluice has been opened yet
    salt: D(0),
    calmSalt: D(0), // salt made since the last storm
    brine: D(0),
    feeds: { channel: 0, pan: 0, pool: 0, moon: 0 },

    // The two dials. Changes wait for the turn of the tide.
    gate: 0.5,
    period: BAL.startPeriod,
    nextGate: 0.5,
    nextPeriod: BAL.startPeriod,

    phase: 0, // seconds into the current tide
    tideSalt: D(0), // salt left so far by the current tide
    lastTide: D(0),
    tides: 0,
    kelp: 0,
    bestTide: D(0), // best single tide this calm
    foldBestTide: D(0), // best single tide this fold
    bestLines: 0, // most strandlines ever passed
    calmTime: 0,

    driftwood: D(0),
    totalDriftwood: D(0), // washed up this fold
    storms: 0,
    driftUp: {},

    pending: D(0),
    foldTime: 0,
    folds: 0,
    shining: false,
    seen: {},
  };
}

// ---------------------------------------------------------------------------
// Derived numbers
// ---------------------------------------------------------------------------

function linesFrom(best) {
  let n = 0;
  while (n < STRANDLINES.length && best.gte(STRANDLINES[n].salt)) n++;
  return n;
}

export function feedCurve(id) {
  return BAL.feeds[id];
}

export function feedCost(t, id) {
  return costAt(BAL.feeds[id], t.feeds[id]);
}

export function feedIsFree(t, id) {
  return !!t.driftUp[FEED_FREE[id]];
}

export function feedUnlocked(t, id) {
  return id !== 'moon' || !!t.seen.moon;
}

/**
 * The share of a tide the water should be held in for, so the pools take in
 * exactly as much as low water can dry. If that would overfill them, the
 * water is only held until they're full.
 */
export function bestGate(fill, dry, pool, period) {
  let gate = dry.div(fill.add(dry)).toNumber();
  const fillTime = pool.div(fill).toNumber();
  if (fillTime < gate * period) gate = fillTime / period;
  return Math.max(BAL.minGate, Math.min(BAL.maxGate, gate));
}

export function calc(state) {
  const t = state.tidewater;
  const U = t.driftUp;
  const N = state.atlas.nodes;
  const lines = linesFrom(t.bestTide);
  const passed = (id) => lines > LINE_INDEX[id];

  const moonStep = U.pull ? BAL.moonMultPull : BAL.moonMult;
  const moon = Decimal.pow(moonStep, t.feeds.moon);

  let fill = D(1 + t.feeds.channel * BAL.channelFill).mul(moon);
  if (passed('slipway')) fill = fill.mul(2);
  if (U.cuts) fill = fill.mul(3);

  let dry = D(1 + t.feeds.pan * BAL.panDry).mul(moon);
  if (passed('seal')) dry = dry.mul(3);
  if (U.flats) dry = dry.mul(3);
  const sun = N.r_sun ? Math.max(1, Math.pow(state.cinder.foldBest / 1000, 2)) : 1;
  dry = dry.mul(sun);

  let pool = D(BAL.basePool).mul(Decimal.pow(BAL.poolMult, t.feeds.pool));
  if (U.seawall) pool = pool.mul(8);

  // How much salt each measure of brine leaves behind.
  const kelpPower = U.beds ? BAL.kelpPowerBeds : BAL.kelpPower;
  const kelpTides = BAL.kelpTides / (passed('light') ? 2 : 1);
  const kelp = t.seen.kelp ? Math.pow(1 + t.kelp / kelpTides, kelpPower) : 1;
  const driftBed = t.totalDriftwood.add(1).pow(BAL.driftBedPower);
  const lineMult = passed('causeway') ? Math.pow(BAL.lineMult, lines) : 1;
  let strength = D(kelp).mul(driftBed).mul(lineMult);
  if (U.groynes) strength = strength.mul(3);
  if (N.t_star) strength = strength.mul(state.atlas.total.add(1));
  if (N.r_timber) strength = strength.mul(Math.pow(1 + state.grove.foldBestTrees.add(1).log10().toNumber(), 2));
  if (N.r_works) strength = strength.mul(1 + state.clockwork.foldBestRate.add(1).log10().toNumber());
  if (N.r_crystal) strength = strength.mul(1 + state.hollow.foldBestCrystal.add(1).log10().toNumber());
  strength = strength.mul(struckMult(state, 'tidewater'));

  const high = t.gate * t.period;
  const low = t.period - high;
  const filled = Decimal.min(pool, fill.mul(high));
  const dried = Decimal.min(filled, dry.mul(low));
  const perTide = dried.mul(strength);
  const income = perTide.div(t.period);

  let driftMult = D(1);
  if (passed('wood')) driftMult = driftMult.mul(2);
  const canStorm = passed('storm') && t.calmSalt.gte(BAL.driftNeedsSalt);
  const driftGain = canStorm ? t.calmSalt.div(BAL.driftNeedsSalt).pow(BAL.driftRoot).mul(driftMult).floor() : D(0);

  const far = STRANDLINES[STRANDLINES.length - 1].salt;
  let shine = 0;
  if (t.foldBestTide.gte(far)) {
    shine = BAL.shineBase * Math.pow(2, t.foldBestTide.div(far).log10().toNumber() / BAL.shineDecades) * (N.t_bright ? 3 : 1);
  }

  return {
    lines, moonStep, moon, fill, dry, pool, sun, kelp, kelpPower, driftBed, lineMult, strength,
    high, low, filled, dried, perTide, income, driftMult, canStorm, driftGain, shine,
  };
}

// ---------------------------------------------------------------------------
// Things the player can do
// ---------------------------------------------------------------------------

export function openSluice(state) {
  const t = state.tidewater;
  if (t.open) return false;
  t.open = true;
  t.salt = t.salt.max(BAL.startSalt);
  return true;
}

export function buyFeed(state, id, max = false) {
  const t = state.tidewater;
  if (!t.open || !feedUnlocked(t, id)) return 0;
  const curve = BAL.feeds[id];
  if (feedIsFree(t, id)) {
    const target = affordableLevel(curve, t.salt);
    const bought = Math.max(0, target - t.feeds[id]);
    t.feeds[id] += bought;
    return bought;
  }
  let bought = 0;
  const limit = max ? 5000 : 1;
  while (bought < limit) {
    const cost = costAt(curve, t.feeds[id]);
    if (t.salt.lt(cost)) break;
    t.salt = t.salt.sub(cost);
    t.feeds[id] += 1;
    bought++;
  }
  return bought;
}

export function feedAll(state) {
  let bought = 0;
  for (let pass = 0; pass < 2; pass++) {
    for (const id of FEED_ORDER) bought += buyFeed(state, id, true);
  }
  return bought;
}

export function setGate(state, gate) {
  const t = state.tidewater;
  t.nextGate = Math.max(BAL.minGate, Math.min(BAL.maxGate, gate));
}

export function setPeriod(state, period) {
  const t = state.tidewater;
  t.nextPeriod = Math.max(BAL.minPeriod, Math.min(BAL.maxPeriod, period));
}

function resetCalm(t) {
  t.salt = D(BAL.startSalt);
  t.calmSalt = D(0);
  t.brine = D(0);
  t.feeds = { channel: 0, pan: 0, pool: 0, moon: 0 };
  t.phase = 0;
  t.tideSalt = D(0);
  t.lastTide = D(0);
  t.tides = 0;
  t.kelp = t.driftUp.holdfast ? Math.floor(t.kelp * BAL.holdfastKeeps) : 0;
  t.bestTide = D(0);
  t.calmTime = 0;
}

export function storm(state) {
  const t = state.tidewater;
  const d = calc(state);
  if (!d.canStorm || d.driftGain.lt(1)) return false;
  t.driftwood = t.driftwood.add(d.driftGain);
  t.totalDriftwood = t.totalDriftwood.add(d.driftGain);
  t.storms += 1;
  emit('storm', { gain: d.driftGain, time: t.calmTime });
  resetCalm(t);
  return true;
}

export function buyDriftUpgrade(state, id) {
  const t = state.tidewater;
  const up = DRIFT_BY_ID[id];
  if (!up || t.driftUp[id] || t.driftwood.lt(up.cost)) return false;
  t.driftwood = t.driftwood.sub(up.cost);
  t.driftUp[id] = true;
  emit('driftUpgrade', { id });
  return true;
}

export function fold(state) {
  const t = state.tidewater;
  if (t.pending.lt(1)) return false;
  const gained = gather(state, t.pending);
  emit('fold', { world: 'tidewater', gain: gained, time: t.foldTime });
  const fresh = defaults();
  fresh.seen = t.seen;
  fresh.bestLines = t.bestLines;
  fresh.shining = t.shining;
  fresh.folds = t.folds + 1;
  fresh.storms = t.storms;
  fresh.gate = fresh.nextGate = t.nextGate;
  fresh.period = fresh.nextPeriod = t.nextPeriod;
  if (state.atlas.nodes.t_hands) {
    for (const id of KEPT_BY_ATLAS) fresh.driftUp[id] = true;
    fresh.open = true;
    fresh.salt = D(BAL.startSalt);
  }
  state.tidewater = fresh;
  return true;
}

// ---------------------------------------------------------------------------
// Time passing
// ---------------------------------------------------------------------------

function endTide(state, d) {
  const t = state.tidewater;
  t.tides += 1;
  if (t.seen.kelp) t.kelp += 1;
  t.lastTide = t.tideSalt;
  if (t.tideSalt.gt(t.bestTide)) t.bestTide = t.tideSalt;
  if (t.tideSalt.gt(t.foldBestTide)) t.foldBestTide = t.tideSalt;
  t.tideSalt = D(0);
  t.phase = 0;

  const lines = linesFrom(t.bestTide);
  while (t.bestLines < lines) {
    const p = STRANDLINES[t.bestLines];
    t.bestLines += 1;
    emit('strandline', { id: p.id, name: p.name, text: p.text });
  }
  if (t.bestLines > LINE_INDEX.wrack) t.seen.moon = true;
  if (t.bestLines > LINE_INDEX.barnacle) t.seen.kelp = true;
  if (t.bestLines > LINE_INDEX.storm) t.seen.storm = true;
  if (!t.shining && t.bestLines > LINE_INDEX.far) {
    t.shining = true;
    state.atlas.seen = true;
  }

  // The dials only move at the turn of the tide.
  t.period = t.nextPeriod;
  if (t.driftUp.tables) t.nextGate = bestGate(d.fill, d.dry, d.pool, t.period);
  t.gate = t.nextGate;
}

export function tick(state, dt) {
  const t = state.tidewater;
  if (!state.atlas.nodes.tidewater) return;
  if (!t.open) {
    if (state.atlas.nodes.t_hands && t.folds > 0) t.open = true;
    else return;
  }
  t.calmTime += dt;
  t.foldTime += dt;

  for (const id of FEED_ORDER) {
    if (feedIsFree(t, id) && feedUnlocked(t, id)) buyFeed(state, id, true);
  }

  let d = calc(state);
  let remaining = dt;
  let guard = 0;
  while (remaining > 1e-9 && guard++ < 100000) {
    const high = t.gate * t.period;
    const inHigh = t.phase < high - 1e-9;
    const boundary = inHigh ? high : t.period;
    const step = Math.min(remaining, boundary - t.phase);
    if (inHigh) {
      t.brine = Decimal.min(d.pool, t.brine.add(d.fill.mul(step)));
    } else {
      const dried = Decimal.min(t.brine, d.dry.mul(step));
      t.brine = t.brine.sub(dried);
      const salt = dried.mul(d.strength);
      t.salt = t.salt.add(salt);
      t.calmSalt = t.calmSalt.add(salt);
      t.tideSalt = t.tideSalt.add(salt);
    }
    t.phase += step;
    remaining -= step;
    if (t.phase >= t.period - 1e-9) {
      endTide(state, d);
      d = calc(state);
    }
  }

  const N = state.atlas.nodes;
  if (N.t_keeper) {
    for (const u of DRIFT_UPGRADES) if (!t.driftUp[u.id] && t.driftwood.gte(u.cost)) buyDriftUpgrade(state, u.id);
  }
  if (N.t_storm && d.driftGain.gt(0)) {
    const washed = d.driftGain.mul(BAL.passiveDriftPerSecond * dt);
    t.driftwood = t.driftwood.add(washed);
    t.totalDriftwood = t.totalDriftwood.add(washed);
  }
  if (d.shine > 0) t.pending = t.pending.add(d.shine * dt / 60);
}
