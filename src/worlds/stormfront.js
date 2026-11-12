// Stormfront, the sixth world. A cloud that builds charge until you let it go.
//
// Charge builds every second until the cloud reaches its breaking point. A
// strike is worth charge × tension, and tension grows the longer the cloud
// has been held, so one long hold is worth far more than several short ones.
//
// Each strike lands where you aim it. The ground pays thunder, and tension
// stops at the breaking point. The mast and the older worlds pay nothing,
// but each remembers the biggest strike that ever hit it and gives a bonus
// for it, and a strike aimed at one of them overcharges: tension keeps
// building past the breaking point for as long as you hold. Aiming, and
// letting an aimed strike go, are never done for you.
import { Decimal, D } from '../core/num.js';
import { costAt, affordableLevel } from '../core/scaling.js';
import { emit } from '../core/events.js';
import { gather } from '../atlas.js';
import { struckMult } from './links.js';
import * as cinder from './cinder.js';
import * as tidewater from './tidewater.js';
import * as grove from './grove.js';
import * as clockwork from './clockwork.js';
import * as hollow from './hollow.js';

// ---------------------------------------------------------------------------
// Balance
// ---------------------------------------------------------------------------

export const BAL = {
  updraft: { base: 10, ratio: 2.5, scaleStart: 20, scalePower: 1.3 },
  updraftMult: 2,
  anvil: { base: 200, ratio: 8, scaleStart: 6, scalePower: 1.6 },
  anvilSeconds: 5,
  fork: { base: 5000, ratio: 20, scaleStart: 6, scalePower: 1.5 },
  forkPower: 0.1,

  holdSeconds: 30, // the breaking point, before anvils
  tensionSeconds: 5, // tension is (1 + seconds held / this) ^ power
  tensionPower: 1,
  mastPower: 2,
  mastPowerIon: 3,
  pealMult: 2,
  frontMult: 4, // per other world shining, with the Atlas route

  fulgNeedsThunder: 2.5e12,
  fulgRoot: 1 / 2,
  fulgBedPower: 0.4,
  fulgBedPowerRich: 0.55,
  rainSeconds: 60,
  passiveFulgPerSecond: 0.02,

  shineDecades: 3,
  shineBase: 3e14,

  // The simulator sets this to play Stormfront on its own, with no other worlds.
  ignoreNeeds: false,
};

export const FEEDS = [
  { id: 'updraft', name: 'Updraft', text: 'Charge ×2 each.' },
  { id: 'anvil', name: 'Anvil', text: 'Breaking point +5 seconds each.' },
  { id: 'fork', name: 'Fork', text: 'Tension power +0.1 each.' },
];
const FEED_BY_ID = Object.fromEntries(FEEDS.map((f) => [f.id, f]));

// Where a strike can land. Everything but the ground keeps a record instead
// of paying thunder.
export const TARGETS = [
  { id: 'ground', name: 'Ground' },
  { id: 'mast', name: 'Mast' },
  { id: 'cinder', name: 'Cinder', world: true, what: 'Heat' },
  { id: 'tidewater', name: 'Tidewater', world: true, what: 'Salt' },
  { id: 'grove', name: 'Grove', world: true, what: 'Sap' },
  { id: 'clockwork', name: 'Clockwork', world: true, what: 'Ticks' },
  { id: 'hollow', name: 'Hollow', world: true, what: 'Crystal' },
];
const TARGET_BY_ID = Object.fromEntries(TARGETS.map((t) => [t.id, t]));
const WORLDS = TARGETS.filter((t) => t.world).map((t) => t.id);

// A peal is reached by a single strike of that size, wherever it lands.
export const PEALS = [
  { id: 'rumble', strike: 100, name: 'Rumble', text: 'The cloud strikes the ground by itself at the breaking point.' },
  { id: 'crack', strike: 2e6, name: 'Crack', text: 'Unlocks the mast.' },
  { id: 'sheet', strike: 5e11, name: 'Sheet lightning', text: 'Unlocks letting the front pass for fulgurite.' },
  { id: 'forked', strike: 1.5e13, name: 'Forked lightning', text: 'Unlocks forks.' },
  { id: 'crawler', strike: 1e18, name: 'Anvil crawler', text: 'Unlocks aiming at other worlds.' },
  { id: 'supercell', strike: 1e20, name: 'Supercell', text: 'Each peal reached this front multiplies charge by 2.' },
  { id: 'ball', strike: 8e31, name: 'Ball lightning', text: 'Fulgurite gain ×3.' },
  { id: 'sprite', strike: 6e37, name: 'Sprite', text: 'Tension power +0.5.' },
  { id: 'eye', strike: 1e41, name: 'The eye', text: 'Stormfront starts to shine.' },
];
const PEAL_INDEX = Object.fromEntries(PEALS.map((p, i) => [p.id, i]));

const NEED_KINDS = {
  cinder: { have: (s) => D(s.cinder.foldBest), text: (v) => `Needs Cinder at ${Math.round(v).toLocaleString('en-US')}°C this fold.` },
  tidewater: { have: (s) => s.tidewater.foldBestTide, text: (v) => `Needs a single tide of ${big(v)} salt in Tidewater this fold.` },
  grove: { have: (s) => s.grove.foldBestTrees, text: (v) => `Needs ${big(v)} trees in Grove this fold.` },
  clockwork: { have: (s) => s.clockwork.foldBestRate, text: (v) => `Needs ${big(v)} ticks per second in Clockwork this fold.` },
  hollow: { have: (s) => s.hollow.foldBestCrystal, text: (v) => `Needs ${big(v)} crystal held in Hollow this fold.` },
};
function big(v) {
  return v < 1e6 ? Math.round(v).toLocaleString('en-US') : v.toExponential(1).replace('+', '').replace('.0e', 'e');
}

export const FULG_UPGRADES = [
  { id: 'spotter', cost: 1, name: 'Storm spotter', text: 'Buys updrafts, anvils and forks automatically, for free.' },
  { id: 'static', cost: 1, name: 'Static', text: 'Charge ×3.' },
  { id: 'surge', cost: 6, name: 'Surge', text: 'Tension builds 2× faster.' },
  { id: 'clap', cost: 120, name: 'Thunderclap', text: 'Strikes ×3.', need: { world: 'cinder', value: 16250 } },
  { id: 'rain', cost: 800, name: 'Steady rain', text: 'Rain builds 2× faster.' },
  { id: 'tall', cost: 2e4, name: 'Tall cloud', text: 'Breaking point ×2.' },
  { id: 'ion', cost: 2e4, name: 'Ionised air', text: 'Mast power 2 → 3.' },
  { id: 'rich', cost: 1.5e5, name: 'Rich fulgurite', text: 'Fulgurite power 0.4 → 0.55.', need: { world: 'tidewater', value: 1e53 } },
  { id: 'leader', cost: 1e10, name: 'Stepped leader', text: 'Overcharge builds tension 2× faster.' },
  { id: 'reach', cost: 3e12, name: 'Long reach', text: 'Strikes on other worlds: power 4 → 5.', need: { world: 'grove', value: 2e56 } },
  { id: 'keen', cost: 2.5e13, name: 'Keen edge', text: 'Tension power +0.5.', need: { world: 'clockwork', value: 1e75 } },
  { id: 'keep', cost: 2.5e15, name: 'Scorched mast', text: 'The mast keeps its record when the front passes.', need: { world: 'hollow', value: 1e72 } },
];
const FULG_BY_ID = Object.fromEntries(FULG_UPGRADES.map((u) => [u.id, u]));
const KEPT_BY_ATLAS = ['spotter', 'static'];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export function defaults() {
  return {
    open: false,
    charge: D(0),
    held: 0, // seconds since the last strike
    thunder: D(0),
    totalThunder: D(0), // this front
    bestStrike: D(0), // this front
    foldBestStrike: D(0),
    strikes: 0,
    feeds: { updraft: 0, anvil: 0, fork: 0 },
    aim: 'ground', // where the next strike lands; goes back to the ground afterwards
    mast: D(0), // biggest strike to hit the mast, this front
    struck: { cinder: D(0), tidewater: D(0), grove: D(0), clockwork: D(0), hollow: D(0) }, // kept for good
    frontTime: 0,
    bestPeals: 0,

    fulgurite: D(0),
    totalFulgurite: D(0), // this fold
    fronts: 0,
    fulgUp: {},

    pending: D(0),
    given: D(0),
    foldTime: 0,
    folds: 0,
    shining: false,
    seen: {},
  };
}

// ---------------------------------------------------------------------------
// Working things out
// ---------------------------------------------------------------------------

function pealsFrom(best) {
  let n = 0;
  while (n < PEALS.length && best.gte(PEALS[n].strike)) n++;
  return n;
}

const last = (list) => list[list.length - 1];

/** How many of the older worlds are shining this fold. */
export function shiningWorlds(state) {
  let n = 0;
  if (state.cinder.foldBest >= cinder.BAL.endTemp) n++;
  if (state.tidewater.foldBestTide.gte(last(tidewater.STRANDLINES).salt)) n++;
  if (state.grove.foldBestTrees.gte(last(grove.STANDS).trees)) n++;
  if (state.clockwork.foldBestRate.gte(last(clockwork.CHIMES).rate)) n++;
  if (state.hollow.foldBestCrystal.gte(last(hollow.CHAMBERS).crystal)) n++;
  return n;
}

export function feedUnlocked(s, id) {
  return id === 'fork' ? !!s.seen.fork : true;
}

export function feedCost(s, id) {
  return costAt(BAL[id], s.feeds[id]);
}

export function targetOpen(state, id) {
  const s = state.stormfront;
  if (id === 'ground') return true;
  if (id === 'mast') return !!s.seen.mast;
  if (!TARGET_BY_ID[id] || !s.seen.worlds) return false;
  return id === 'cinder' || !!state.atlas.nodes[id];
}

/** The biggest strike a target has taken. The ground keeps no record. */
export function recordAt(s, id) {
  if (id === 'mast') return s.mast;
  return s.struck[id] || D(0);
}

export function mastMult(s, record = s.mast) {
  return record.lte(0) ? 1 : Math.pow(1 + record.add(1).log10().toNumber(), s.fulgUp.ion ? BAL.mastPowerIon : BAL.mastPower);
}

export function needText(up) {
  return up.need ? NEED_KINDS[up.need.world].text(up.need.value) : '';
}

export function needMet(state, up) {
  if (!up.need || BAL.ignoreNeeds) return true;
  return NEED_KINDS[up.need.world].have(state).gte(up.need.value);
}

/** Everything about the storm right now. */
export function calc(state) {
  const s = state.stormfront;
  const U = s.fulgUp;
  const N = state.atlas.nodes;
  const peals = pealsFrom(s.bestStrike);
  const passed = (id) => peals > PEAL_INDEX[id];

  const holdMax = (BAL.holdSeconds + BAL.anvilSeconds * s.feeds.anvil) * (U.tall ? 2 : 1);
  const tensionSeconds = BAL.tensionSeconds / (U.surge ? 2 : 1);
  const power = BAL.tensionPower + BAL.forkPower * s.feeds.fork + (passed('sprite') ? 0.5 : 0) + (U.keen ? 0.5 : 0);
  // Only a strike aimed away from the ground builds tension past the breaking point.
  const aimed = s.aim !== 'ground' && targetOpen(state, s.aim);
  const overRate = U.leader ? 2 : 1;
  const tensionAt = (held, over) => {
    const counted = over && held > holdMax ? holdMax + (held - holdMax) * overRate : Math.min(held, holdMax);
    return Math.pow(1 + counted / tensionSeconds, power);
  };
  const tension = tensionAt(s.held, aimed);
  const overcharge = aimed ? Math.max(0, s.held - holdMax) : 0;

  const updrafts = Decimal.pow(BAL.updraftMult, s.feeds.updraft);
  const mast = mastMult(s);
  const bed = s.totalFulgurite.add(1).pow(U.rich ? BAL.fulgBedPowerRich : BAL.fulgBedPower);
  const pealMult = passed('supercell') ? Math.pow(BAL.pealMult, peals) : 1;
  const shiningOthers = shiningWorlds(state);
  let other = D(1);
  if (U.static) other = other.mul(3);
  if (N.s_star) other = other.mul(s.given.add(1));
  if (N.r_front) other = other.mul(Math.pow(BAL.frontMult, shiningOthers));
  const rate = s.open ? updrafts.mul(mast).mul(bed).mul(pealMult).mul(other) : D(0);

  const strikeMult = U.clap ? 3 : 1;
  const strike = s.charge.mul(tension).mul(strikeMult);
  // What a strike would be worth if the cloud were held from empty for that
  // many seconds at the present rate.
  const sizeAfter = (held, over) => rate.mul(Math.min(held, holdMax)).mul(tensionAt(held, over)).mul(strikeMult);
  const fullStrike = sizeAfter(holdMax, false);

  const rain = 1 + s.frontTime / (BAL.rainSeconds / (U.rain ? 2 : 1));
  let fulgMult = D(rain);
  if (passed('ball')) fulgMult = fulgMult.mul(3);
  const canPass = passed('sheet') && s.totalThunder.gte(BAL.fulgNeedsThunder);
  const fulgGain = canPass ? s.totalThunder.div(BAL.fulgNeedsThunder).pow(BAL.fulgRoot).mul(fulgMult).floor() : D(0);

  const far = last(PEALS).strike;
  let shine = 0;
  if (s.foldBestStrike.gte(far)) {
    shine = BAL.shineBase * Math.pow(2, s.foldBestStrike.div(far).log10().toNumber() / BAL.shineDecades) * (N.s_bright ? 3 : 1);
  }

  return { peals, holdMax, tensionSeconds, power, tension, updrafts, mast, bed, pealMult, shiningOthers, other, rate, strikeMult, strike, fullStrike, sizeAfter, aimed, overcharge, rain, canPass, fulgGain, shine };
}

// ---------------------------------------------------------------------------
// Things the player can do
// ---------------------------------------------------------------------------

export function seedCloud(state) {
  const s = state.stormfront;
  if (s.open) return false;
  s.open = true;
  return true;
}

export function buyFeed(state, id, max = false) {
  const s = state.stormfront;
  if (!s.open || !FEED_BY_ID[id] || !feedUnlocked(s, id)) return 0;
  if (s.fulgUp.spotter) {
    const target = affordableLevel(BAL[id], s.thunder);
    const bought = Math.max(0, target - s.feeds[id]);
    s.feeds[id] += bought;
    return bought;
  }
  let bought = 0;
  const limit = max ? 500 : 1;
  while (bought < limit) {
    const cost = feedCost(s, id);
    if (s.thunder.lt(cost)) break;
    s.thunder = s.thunder.sub(cost);
    s.feeds[id] += 1;
    bought++;
  }
  return bought;
}

/** Buy as much of everything as possible, cheapest first. */
export function buyAllFeeds(state) {
  const s = state.stormfront;
  if (s.fulgUp.spotter) {
    for (const f of FEEDS) buyFeed(state, f.id, true);
    return;
  }
  for (let i = 0; i < 500; i++) {
    let pick = null;
    for (const f of FEEDS) {
      if (!feedUnlocked(s, f.id)) continue;
      const cost = feedCost(s, f.id);
      if (s.thunder.gte(cost) && (!pick || cost.lt(pick.cost))) pick = { id: f.id, cost };
    }
    if (!pick) break;
    buyFeed(state, pick.id, false);
  }
}

export function setAim(state, id) {
  if (!targetOpen(state, id)) return false;
  state.stormfront.aim = id;
  return true;
}

/** Record any peals the biggest strike has reached, and what they unlock. */
function notePeals(state) {
  const s = state.stormfront;
  const peals = pealsFrom(s.bestStrike);
  while (s.bestPeals < peals) {
    const p = PEALS[s.bestPeals];
    s.bestPeals += 1;
    emit('peal', { id: p.id, name: p.name, text: p.text });
  }
  if (s.bestPeals > PEAL_INDEX.rumble) s.seen.rod = true;
  if (s.bestPeals > PEAL_INDEX.crack) s.seen.mast = true;
  if (s.bestPeals > PEAL_INDEX.sheet) s.seen.pass = true;
  if (s.bestPeals > PEAL_INDEX.forked) s.seen.fork = true;
  if (s.bestPeals > PEAL_INDEX.crawler) s.seen.worlds = true;
  if (!s.shining && s.bestPeals > PEAL_INDEX.eye) {
    s.shining = true;
    state.atlas.seen = true;
  }
}

/** Let the cloud go. The strike lands on the aim, and the aim goes back to the ground. */
export function strike(state) {
  const s = state.stormfront;
  if (!s.open || s.charge.lte(0)) return false;
  const size = calc(state).strike;
  const aim = targetOpen(state, s.aim) ? s.aim : 'ground';
  if (aim === 'ground') {
    s.thunder = s.thunder.add(size);
    s.totalThunder = s.totalThunder.add(size);
  } else if (aim === 'mast') {
    if (size.gt(s.mast)) s.mast = size;
  } else if (size.gt(s.struck[aim])) {
    s.struck[aim] = size;
  }
  if (size.gt(s.bestStrike)) s.bestStrike = size;
  if (size.gt(s.foldBestStrike)) s.foldBestStrike = size;
  s.strikes += 1;
  emit('strike', { size, aim });
  notePeals(state);
  s.charge = D(0);
  s.held = 0;
  s.aim = 'ground';
  return true;
}

/** Let the front pass for fulgurite. */
export function pass(state) {
  const s = state.stormfront;
  const d = calc(state);
  if (!d.canPass || d.fulgGain.lt(1)) return false;
  s.fulgurite = s.fulgurite.add(d.fulgGain);
  s.totalFulgurite = s.totalFulgurite.add(d.fulgGain);
  s.fronts += 1;
  emit('pass', { gain: d.fulgGain, time: s.frontTime });
  s.charge = D(0);
  s.held = 0;
  s.thunder = D(0);
  s.totalThunder = D(0);
  s.bestStrike = D(0);
  s.feeds = { updraft: 0, anvil: 0, fork: 0 };
  s.aim = 'ground';
  if (!s.fulgUp.keep) s.mast = D(0);
  s.frontTime = 0;
  return true;
}

export function buyFulgUpgrade(state, id) {
  const s = state.stormfront;
  const up = FULG_BY_ID[id];
  if (!up || s.fulgUp[id] || s.fulgurite.lt(up.cost) || !needMet(state, up)) return false;
  s.fulgurite = s.fulgurite.sub(up.cost);
  s.fulgUp[id] = true;
  emit('fulgUpgrade', { id });
  return true;
}

export function fold(state) {
  const s = state.stormfront;
  if (s.pending.lt(1)) return false;
  const gained = gather(state, s.pending);
  emit('fold', { world: 'stormfront', gain: gained, time: s.foldTime });
  const fresh = defaults();
  fresh.seen = s.seen;
  fresh.bestPeals = s.bestPeals;
  fresh.shining = s.shining;
  fresh.folds = s.folds + 1;
  fresh.given = s.given.add(gained);
  fresh.fronts = s.fronts;
  fresh.strikes = s.strikes;
  fresh.struck = s.struck; // what the older worlds have taken is never lost
  if (state.atlas.nodes.s_hands) {
    for (const id of KEPT_BY_ATLAS) fresh.fulgUp[id] = true;
    fresh.open = true;
  }
  state.stormfront = fresh;
  return true;
}

// ---------------------------------------------------------------------------
// Time passing
// ---------------------------------------------------------------------------

export function tick(state, dt) {
  const N = state.atlas.nodes;
  if (!N.stormfront || !state.stormfront.open) return;
  let s = state.stormfront;
  s.frontTime += dt;
  s.foldTime += dt;

  // Build charge up to the breaking point. After the first peal a cloud
  // aimed at the ground strikes there and starts again, which can happen
  // more than once in a long step of time. A cloud aimed anywhere else
  // goes on being held.
  let left = dt;
  let d = null;
  for (let i = 0; i < 20 && left > 0; i++) {
    if (s.fulgUp.spotter) buyAllFeeds(state);
    d = calc(state);
    const step = Math.min(left, Math.max(0, d.holdMax - s.held));
    s.charge = s.charge.add(d.rate.mul(step));
    s.held += step;
    left -= step;
    if (s.held < d.holdMax - 1e-9) break;
    if (d.aimed) { s.held += left; break; }
    if (!s.seen.rod || !strike(state)) break;
  }
  d = calc(state);

  notePeals(state);

  if (N.s_fulg && d.fulgGain.gt(0)) {
    const found = d.fulgGain.mul(BAL.passiveFulgPerSecond * dt);
    s.fulgurite = s.fulgurite.add(found);
    s.totalFulgurite = s.totalFulgurite.add(found);
  }
  if (d.shine > 0) s.pending = s.pending.add(d.shine * dt / 60);
}
