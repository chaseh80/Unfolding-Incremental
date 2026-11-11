// Clockwork, the fourth world. A gear train you arrange by hand.
//
// The train is a row of sockets. Every gear in it multiplies the ticks the
// movement makes, and most gears care where they sit or what sits next to
// them, so the same gears in a different order can be worth many times more.
// Nothing ever arranges the train for you.
//
// Clockwork leans on the older worlds: new sockets and new kinds of gear need
// something from Cinder, Tidewater or Grove before they can be made.
import { Decimal, D } from '../core/num.js';
import { costAt, affordableLevel } from '../core/scaling.js';
import { emit } from '../core/events.js';
import { gather } from '../atlas.js';

// ---------------------------------------------------------------------------
// Balance
// ---------------------------------------------------------------------------

const curve = (base) => ({ base, ratio: 2.2, scaleStart: 10, scalePower: 1.6 });

export const BAL = {
  startSockets: 3,
  maxSockets: 8,
  // strength is what the gear's rule is built from, step is how much stronger
  // each level makes it, and cost is its level curve. Brass gets a smaller
  // step because a train can hold several of them.
  gears: {
    brass: { strength: 1, step: 1.12, cost: curve(10) },
    fly: { strength: 1, step: 1.2, cost: curve(40) },
    gov: { strength: 1, step: 1.2, cost: curve(150) },
    ratchet: { strength: 5, step: 1.2, cost: curve(5e3) },
    esc: { strength: 1, step: 1.2, cost: curve(1e5) },
    worm: { strength: 7, step: 1.2, cost: curve(1e7) },
  },
  idlerBoost: 0.2,
  idlerBoostJewels: 0.3,

  chimeMult: 1.5,
  wearSeconds: 60,
  wearPower: 1,
  wearPowerRunin: 1.5,

  springNeedsTicks: 2e7,
  springRoot: 1 / 3,
  springBedPower: 0.4,
  passiveSpringPerSecond: 0.02,

  shineDecades: 3,
  shineBase: 5e4,

  // The simulator sets this to tune Clockwork on its own, with no other worlds.
  ignoreNeeds: false,
};

export const GEARS = [
  { id: 'brass', name: 'Brass gear', levels: true, rule: (s) => `×${fmt(1 + s)}.` },
  { id: 'fly', name: 'Flywheel', levels: true, rule: (s) => `×(1 + ${fmt(s)} per gear after it).` },
  { id: 'gov', name: 'Governor', levels: true, rule: (s) => `×(1 + ${fmt(s)} per gear before it).` },
  { id: 'ratchet', name: 'Ratchet', levels: true, rule: (s) => `×${fmt(1 + s)} if both neighbours are brass gears.` },
  { id: 'idler', name: 'Idler', levels: false, rule: (s, boost) => `Raises each neighbour's multiplier to the power ${1 + boost}.` },
  { id: 'esc', name: 'Escapement', levels: true, rule: (s) => `×(1 + ${fmt(s)} per different kind of gear in the train).` },
  { id: 'worm', name: 'Worm gear', levels: true, rule: (s) => `×${fmt(1 + s)}, but stops the gear to its right.` },
  { id: 'pinion', name: 'Pinion', levels: false, rule: () => 'Copies the gear to its left.' },
];
const GEAR_BY_ID = Object.fromEntries(GEARS.map((g) => [g.id, g]));
export const LEVELLED = GEARS.filter((g) => g.levels).map((g) => g.id);

function fmt(x) {
  if (x >= 1e6) return x.toExponential(2).replace('+', '');
  if (x >= 100) return Math.round(x).toLocaleString('en-US');
  return (Math.round(x * 100) / 100).toString();
}

// A chime is struck the first time the movement makes that many ticks a second.
export const CHIMES = [
  { id: 'one', rate: 25, name: 'One o\'clock', text: 'Unlocks the flywheel.' },
  { id: 'two', rate: 80, name: 'Two o\'clock', text: 'Unlocks the governor.' },
  { id: 'three', rate: 300, name: 'Three o\'clock', text: '+1 socket.' },
  { id: 'four', rate: 2e4, name: 'Four o\'clock', text: 'Unlocks rewinding for springs.' },
  { id: 'five', rate: 1.5e9, name: 'Five o\'clock', text: 'Unlocks the ratchet.' },
  { id: 'six', rate: 5e16, name: 'Six o\'clock', text: 'Each chime struck this winding multiplies ticks by 1.5.' },
  { id: 'seven', rate: 6e23, name: 'Seven o\'clock', text: 'Wear-in builds 2× faster.' },
  { id: 'eight', rate: 8e28, name: 'Eight o\'clock', text: 'Spring gain ×2.' },
  { id: 'midnight', rate: 1e36, name: 'Midnight', text: 'Clockwork starts to shine.' },
];
const CHIME_INDEX = Object.fromEntries(CHIMES.map((p, i) => [p.id, i]));

// What an upgrade needs from an older world, measured over that world's
// current fold. Nothing is spent; the world just has to have got that far.
const NEED_KINDS = {
  cinder: {
    have: (s) => D(s.cinder.foldBest),
    text: (v) => `Needs Cinder at ${Math.round(v).toLocaleString('en-US')}°C this fold.`,
  },
  tidewater: {
    have: (s) => s.tidewater.foldBestTide,
    text: (v) => `Needs a single tide of ${big(v)} salt in Tidewater this fold.`,
  },
  grove: {
    have: (s) => s.grove.foldBestTrees,
    text: (v) => `Needs ${big(v)} trees in Grove this fold.`,
  },
};
function big(v) {
  return v < 1e6 ? Math.round(v).toLocaleString('en-US') : v.toExponential(1).replace('+', '').replace('.0e', 'e');
}

export const SPRING_UPGRADES = [
  { id: 'apprentice', cost: 1, name: 'Apprentice', text: 'Buys gear levels automatically, for free.' },
  { id: 'oil', cost: 1, name: 'Oil', text: 'Ticks ×3.' },
  { id: 'socket5', cost: 2, name: 'Fifth socket', text: '+1 socket.', need: { world: 'cinder', value: 11500 } },
  { id: 'idler', cost: 20, name: 'Idler', text: 'Unlocks the idler.', need: { world: 'tidewater', value: 1e30 } },
  { id: 'runin', cost: 60, name: 'Running in', text: 'Wear-in power 1 → 1.5.' },
  { id: 'esc', cost: 250, name: 'Escapement', text: 'Unlocks the escapement.', need: { world: 'grove', value: 1e44 } },
  { id: 'socket6', cost: 400, name: 'Sixth socket', text: '+1 socket.', need: { world: 'tidewater', value: 1e31 } },
  { id: 'worm', cost: 5e4, name: 'Worm gear', text: 'Unlocks the worm gear.', need: { world: 'cinder', value: 12000 } },
  { id: 'socket7', cost: 2e5, name: 'Seventh socket', text: '+1 socket.', need: { world: 'grove', value: 1e46 } },
  { id: 'jewels', cost: 6e6, name: 'Jewel bearings', text: 'Idlers raise neighbours to the power 1.3 instead of 1.2.' },
  { id: 'pinion', cost: 4e7, name: 'Pinion', text: 'Unlocks the pinion.', need: { world: 'cinder', value: 12500 } },
  { id: 'socket8', cost: 8e8, name: 'Eighth socket', text: '+1 socket.', need: { world: 'tidewater', value: 1e32 } },
];
const SPRING_BY_ID = Object.fromEntries(SPRING_UPGRADES.map((u) => [u.id, u]));
const KEPT_BY_ATLAS = ['apprentice', 'oil'];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export function defaults() {
  return {
    wound: false,
    ticks: D(0),
    windTicks: D(0), // ticks made since the last rewind
    train: ['brass', 'brass', 'brass', '', '', '', '', ''],
    levels: { brass: 0, fly: 0, gov: 0, ratchet: 0, esc: 0, worm: 0 },
    windTime: 0,
    bestRate: D(0), // best ticks per second this winding
    foldBestRate: D(0),
    bestChimes: 0,

    springs: D(0),
    totalSprings: D(0), // this fold
    rewinds: 0,
    springUp: {},

    pending: D(0),
    given: D(0),
    foldTime: 0,
    folds: 0,
    shining: false,
    seen: {},
  };
}

// ---------------------------------------------------------------------------
// The train
// ---------------------------------------------------------------------------

/**
 * Works out what a train is worth. `train` is the gear in each socket, left
 * to right; `strength` gives each kind of gear's current strength.
 * Returns each socket's own multiplier, the power it is raised to, whether it
 * was stopped, and the product of the lot.
 */
export function evaluate(train, strength, idlerBoost) {
  const n = train.length;
  // A pinion becomes whatever is to its left.
  const kind = [];
  for (let i = 0; i < n; i++) {
    let t = train[i] || '';
    if (t === 'pinion') t = i > 0 ? kind[i - 1] : '';
    kind.push(t);
  }
  // A worm gear stops the gear to its right, unless it is stopped itself.
  const stopped = new Array(n).fill(false);
  for (let i = 0; i < n - 1; i++) {
    if (kind[i] === 'worm' && !stopped[i] && kind[i + 1]) stopped[i + 1] = true;
  }
  const live = (i) => i >= 0 && i < n && !!kind[i] && !stopped[i];
  const kinds = new Set();
  let total = 0;
  for (let i = 0; i < n; i++) if (live(i)) { kinds.add(kind[i]); total++; }

  const mult = [];
  let before = 0;
  for (let i = 0; i < n; i++) {
    let m = 1;
    if (live(i)) {
      const s = strength[kind[i]] || 0;
      const after = total - before - 1;
      if (kind[i] === 'brass') m = 1 + s;
      else if (kind[i] === 'fly') m = 1 + s * after;
      else if (kind[i] === 'gov') m = 1 + s * before;
      else if (kind[i] === 'ratchet') m = live(i - 1) && kind[i - 1] === 'brass' && live(i + 1) && kind[i + 1] === 'brass' ? 1 + s : 1;
      else if (kind[i] === 'esc') m = 1 + s * kinds.size;
      else if (kind[i] === 'worm') m = 1 + s;
      before++;
    }
    mult.push(m);
  }
  const power = [];
  let product = D(1);
  for (let i = 0; i < n; i++) {
    let p = 1;
    if (live(i - 1) && kind[i - 1] === 'idler') p += idlerBoost;
    if (live(i + 1) && kind[i + 1] === 'idler') p += idlerBoost;
    power.push(p);
    if (mult[i] !== 1) product = product.mul(Decimal.pow(mult[i], p));
  }
  return { kind, stopped, mult, power, product };
}

function chimesFrom(best) {
  let n = 0;
  while (n < CHIMES.length && best.gte(CHIMES[n].rate)) n++;
  return n;
}

export function socketCount(k) {
  let n = BAL.startSockets;
  if (k.seen.socket4) n++;
  for (const id of ['socket5', 'socket6', 'socket7', 'socket8']) if (k.springUp[id]) n++;
  return Math.min(BAL.maxSockets, n);
}

export function gearUnlocked(k, id) {
  if (id === 'brass') return true;
  if (id === 'fly' || id === 'gov' || id === 'ratchet') return !!k.seen[id];
  return !!k.springUp[id];
}

export function levelCost(k, id) {
  return costAt(BAL.gears[id].cost, k.levels[id]);
}

export function needText(up) {
  return up.need ? NEED_KINDS[up.need.world].text(up.need.value) : '';
}

export function needMet(state, up) {
  if (!up.need || BAL.ignoreNeeds) return true;
  return NEED_KINDS[up.need.world].have(state).gte(up.need.value);
}

function strengths(k) {
  const s = {};
  for (const id of LEVELLED) s[id] = BAL.gears[id].strength * Math.pow(BAL.gears[id].step, k.levels[id]);
  return s;
}

/** The train as it actually runs: only the open sockets, only gears you have. */
function liveTrain(k, train = k.train) {
  const n = socketCount(k);
  const out = [];
  for (let i = 0; i < n; i++) out.push(train[i] && gearUnlocked(k, train[i]) ? train[i] : '');
  return out;
}

export function calc(state, trainOverride = null) {
  const k = state.clockwork;
  const U = k.springUp;
  const N = state.atlas.nodes;
  const chimes = chimesFrom(k.bestRate);
  const passed = (id) => chimes > CHIME_INDEX[id];

  const strength = strengths(k);
  const idlerBoost = U.jewels ? BAL.idlerBoostJewels : BAL.idlerBoost;
  const sockets = socketCount(k);
  const train = liveTrain(k, trainOverride || k.train);
  const run = evaluate(train, strength, idlerBoost);

  const wearPower = U.runin ? BAL.wearPowerRunin : BAL.wearPower;
  const wear = k.seen.rewind ? Math.pow(1 + k.windTime / (BAL.wearSeconds / (passed('seven') ? 2 : 1)), wearPower) : 1;
  const springBed = k.totalSprings.add(1).pow(BAL.springBedPower);
  const chimeMult = passed('six') ? Math.pow(BAL.chimeMult, chimes) : 1;
  let other = D(1);
  if (U.oil) other = other.mul(3);
  if (N.k_star) other = other.mul(k.given.add(1));
  if (N.r_parts) other = other.mul(Math.max(1, state.cinder.foldBest / 1000));
  const rate = k.wound ? run.product.mul(wear).mul(springBed).mul(chimeMult).mul(other) : D(0);

  let springMult = D(1);
  if (passed('eight')) springMult = springMult.mul(2);
  const canRewind = passed('four') && k.windTicks.gte(BAL.springNeedsTicks);
  const springGain = canRewind ? k.windTicks.div(BAL.springNeedsTicks).pow(BAL.springRoot).mul(springMult).floor() : D(0);

  const far = CHIMES[CHIMES.length - 1].rate;
  let shine = 0;
  if (k.foldBestRate.gte(far)) {
    shine = BAL.shineBase * Math.pow(2, k.foldBestRate.div(far).log10().toNumber() / BAL.shineDecades) * (N.k_bright ? 3 : 1);
  }

  return { chimes, strength, idlerBoost, sockets, train, run, wear, wearPower, springBed, chimeMult, other, rate, canRewind, springGain, shine };
}

// ---------------------------------------------------------------------------
// Things the player can do
// ---------------------------------------------------------------------------

export function wind(state) {
  const k = state.clockwork;
  if (k.wound) return false;
  k.wound = true;
  return true;
}

/** Put a gear in a socket. There is only one of each special gear, so placing one moves it. */
export function setSocket(state, index, id) {
  const k = state.clockwork;
  if (index < 0 || index >= socketCount(k)) return false;
  if (id && (!GEAR_BY_ID[id] || !gearUnlocked(k, id))) return false;
  if (id && id !== 'brass') {
    for (let i = 0; i < k.train.length; i++) if (i !== index && k.train[i] === id) k.train[i] = 'brass';
  }
  k.train[index] = id || '';
  return true;
}

export function setTrain(state, train) {
  for (let i = 0; i < train.length; i++) state.clockwork.train[i] = '';
  for (let i = 0; i < train.length; i++) setSocket(state, i, train[i]);
}

export function buyLevel(state, id, max = false) {
  const k = state.clockwork;
  if (!k.wound || !BAL.gears[id] || !gearUnlocked(k, id)) return 0;
  const c = BAL.gears[id].cost;
  if (k.springUp.apprentice) {
    const target = affordableLevel(c, k.ticks);
    const bought = Math.max(0, target - k.levels[id]);
    k.levels[id] += bought;
    return bought;
  }
  let bought = 0;
  const limit = max ? 5000 : 1;
  while (bought < limit) {
    const cost = costAt(c, k.levels[id]);
    if (k.ticks.lt(cost)) break;
    k.ticks = k.ticks.sub(cost);
    k.levels[id] += 1;
    bought++;
  }
  return bought;
}

/** Buys levels cheapest first, which is close to what a careful player does. */
export function levelAll(state) {
  const k = state.clockwork;
  let bought = 0;
  for (let i = 0; i < 2000; i++) {
    let best = null;
    for (const id of LEVELLED) {
      if (!gearUnlocked(k, id)) continue;
      const cost = levelCost(k, id);
      if (k.ticks.gte(cost) && (!best || cost.lt(best.cost))) best = { id, cost };
    }
    if (!best || !buyLevel(state, best.id, false)) break;
    bought++;
  }
  return bought;
}

function resetWinding(k) {
  k.ticks = D(0);
  k.windTicks = D(0);
  k.levels = { brass: 0, fly: 0, gov: 0, ratchet: 0, esc: 0, worm: 0 };
  k.windTime = 0;
  k.bestRate = D(0);
}

export function rewind(state) {
  const k = state.clockwork;
  const d = calc(state);
  if (!d.canRewind || d.springGain.lt(1)) return false;
  k.springs = k.springs.add(d.springGain);
  k.totalSprings = k.totalSprings.add(d.springGain);
  k.rewinds += 1;
  emit('rewind', { gain: d.springGain, time: k.windTime });
  resetWinding(k);
  return true;
}

export function buySpringUpgrade(state, id) {
  const k = state.clockwork;
  const up = SPRING_BY_ID[id];
  if (!up || k.springUp[id] || k.springs.lt(up.cost) || !needMet(state, up)) return false;
  k.springs = k.springs.sub(up.cost);
  k.springUp[id] = true;
  emit('springUpgrade', { id });
  return true;
}

export function fold(state) {
  const k = state.clockwork;
  if (k.pending.lt(1)) return false;
  const gained = gather(state, k.pending);
  emit('fold', { world: 'clockwork', gain: gained, time: k.foldTime });
  const fresh = defaults();
  fresh.seen = k.seen;
  fresh.train = k.train;
  fresh.bestChimes = k.bestChimes;
  fresh.shining = k.shining;
  fresh.folds = k.folds + 1;
  fresh.given = k.given.add(gained);
  fresh.rewinds = k.rewinds;
  if (state.atlas.nodes.k_hands) {
    for (const id of KEPT_BY_ATLAS) fresh.springUp[id] = true;
    fresh.wound = true;
  }
  state.clockwork = fresh;
  return true;
}

// ---------------------------------------------------------------------------
// Time passing
// ---------------------------------------------------------------------------

export function tick(state, dt) {
  const k = state.clockwork;
  const N = state.atlas.nodes;
  if (!N.clockwork || !k.wound) return;
  k.windTime += dt;
  k.foldTime += dt;

  if (k.springUp.apprentice) {
    for (const id of LEVELLED) if (gearUnlocked(k, id)) buyLevel(state, id, true);
  }

  const d = calc(state);
  const made = d.rate.mul(dt);
  k.ticks = k.ticks.add(made);
  k.windTicks = k.windTicks.add(made);
  if (d.rate.gt(k.bestRate)) k.bestRate = d.rate;
  if (d.rate.gt(k.foldBestRate)) k.foldBestRate = d.rate;

  const chimes = chimesFrom(k.bestRate);
  while (k.bestChimes < chimes) {
    const p = CHIMES[k.bestChimes];
    k.bestChimes += 1;
    emit('chime', { id: p.id, name: p.name, text: p.text });
  }
  if (k.bestChimes > CHIME_INDEX.one) k.seen.fly = true;
  if (k.bestChimes > CHIME_INDEX.two) k.seen.gov = true;
  if (k.bestChimes > CHIME_INDEX.three) k.seen.socket4 = true;
  if (k.bestChimes > CHIME_INDEX.four) k.seen.rewind = true;
  if (k.bestChimes > CHIME_INDEX.five) k.seen.ratchet = true;
  if (!k.shining && k.bestChimes > CHIME_INDEX.midnight) {
    k.shining = true;
    state.atlas.seen = true;
  }

  if (N.k_spring && d.springGain.gt(0)) {
    const wound = d.springGain.mul(BAL.passiveSpringPerSecond * dt);
    k.springs = k.springs.add(wound);
    k.totalSprings = k.totalSprings.add(wound);
  }
  if (d.shine > 0) k.pending = k.pending.add(d.shine * dt / 60);
}
