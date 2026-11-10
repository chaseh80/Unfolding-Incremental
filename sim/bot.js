// A stand-in player. It plays the real game logic far faster than real time
// and records when it reached each landmark, so pacing can be tuned from
// numbers instead of guesses.
import { newState, tick } from '../src/game.js';
import { drain } from '../src/core/events.js';
import { D, format, formatTime } from '../src/core/num.js';
import * as atlas from '../src/atlas.js';
import * as cinder from '../src/worlds/cinder.js';
import * as tw from '../src/worlds/tidewater.js';

function cheapest(list, owned, ok = () => true) {
  let best = null;
  for (const u of list) if (!owned[u.id] && ok(u) && (!best || u.cost < best.cost)) best = u;
  return best;
}

function nextNode(state) {
  return cheapest(atlas.NODES, state.atlas.nodes, (n) => atlas.available(state, n));
}

// Fold a page when the starlight it has gathered would pay for the next thing
// in the Atlas, or when it would at least double everything gathered so far.
function shouldFold(state, world, every) {
  const w = state[world];
  if (w.pending.lt(1) || w.foldTime < Math.max(300, every)) return false;
  const a = state.atlas;
  // Nobody sensible folds for a single starlight the first time. Wait for
  // enough to open Tidewater and make the second run of Cinder quicker.
  if (a.total.eq(0)) return w.pending.gte(5);
  const next = nextNode(state);
  if (next && a.starlight.add(w.pending.floor()).gte(next.cost)) return true;
  return w.pending.gte(a.total.max(1));
}

function actAtlas(state) {
  for (let n = nextNode(state); n && atlas.buy(state, n.id); n = nextNode(state));
}

function actCinder(state, every) {
  const c = state.cinder;
  if (!c.lit) cinder.strike(state);
  cinder.feedAll(state);
  for (let u = cheapest(cinder.ASH_UPGRADES, c.ashUp); u && cinder.buyAshUpgrade(state, u.id); u = cheapest(cinder.ASH_UPGRADES, c.ashUp));
  for (let u = cheapest(cinder.GLASS_UPGRADES, c.glassUp); u && cinder.buyGlassUpgrade(state, u.id); u = cheapest(cinder.GLASS_UPGRADES, c.glassUp));

  if (shouldFold(state, 'cinder', every)) { cinder.fold(state); return; }

  const d = cinder.calc(state);
  const patience = Math.max(30, every);

  if (d.canSmelt && d.glassGain.gte(1) && c.smeltTime >= patience && !state.atlas.nodes.c_glass) {
    const next = cheapest(cinder.GLASS_UPGRADES, c.glassUp);
    const buysNext = next && c.glass.add(d.glassGain).gte(next.cost);
    const bigJump = d.glassGain.gte(c.totalGlass.mul(2).max(1));
    const stalled = c.smeltTime > 900 && d.glassGain.gte(c.totalGlass.mul(0.5));
    if (buysNext || bigJump || stalled) {
      cinder.smelt(state);
      return;
    }
  }

  if (d.canBurn && d.ashGain.gte(1) && !cinder.sheds(state) && c.burnTime >= patience) {
    const next = cheapest(cinder.ASH_UPGRADES, c.ashUp);
    const buysNext = next && c.ash.add(d.ashGain).gte(next.cost);
    const bigJump = d.ashGain.gte(c.totalAsh.mul(2).max(1));
    const stalled = c.burnTime > 300 && d.ashGain.gte(c.totalAsh.mul(0.5));
    if (buysNext || bigJump || stalled) cinder.burnDown(state);
  }
}

function actTidewater(state, every) {
  if (!state.atlas.nodes.tidewater) return;
  const t = state.tidewater;
  if (!t.open) tw.openSluice(state);
  for (let u = cheapest(tw.DRIFT_UPGRADES, t.driftUp); u && tw.buyDriftUpgrade(state, u.id); u = cheapest(tw.DRIFT_UPGRADES, t.driftUp));

  if (shouldFold(state, 'tidewater', every)) { tw.fold(state); return; }

  // What one long tide would need to carry to pass the next strandline.
  let d = tw.calc(state);
  const next = tw.STRANDLINES[d.lines];
  const pushBrine = next ? D(next.salt).div(d.strength).mul(1.15) : null;
  const pushTime = () => pushBrine.mul(d.fill.add(d.dry)).div(d.fill.mul(d.dry)).toNumber();
  const pushing = () => !!next && pushTime() <= tw.BAL.maxPeriod;

  // Spend salt: the moon when it can be afforded, pools when they are what is
  // holding a tide back, and otherwise whichever of filling and drying lags.
  const can = (id) => tw.feedUnlocked(t, id) && !tw.feedIsFree(t, id) && t.salt.gte(tw.feedCost(t, id));
  for (let i = 0; i < 400; i++) {
    d = tw.calc(state);
    const steady = d.fill.mul(d.dry).div(d.fill.add(d.dry)).mul(t.period);
    const poolShort = d.pool.lt(steady.mul(1.2)) || (pushing() && d.pool.lt(pushBrine));
    let pick = null;
    if (poolShort && can('pool')) pick = 'pool';
    else if (can('moon')) pick = 'moon';
    else {
      const lag = d.fill.lt(d.dry) ? 'channel' : 'pan';
      const other = lag === 'channel' ? 'pan' : 'channel';
      if (can(lag)) pick = lag;
      else if (tw.feedIsFree(t, lag) && can(other)) pick = other;
    }
    if (!pick) break;
    tw.buyFeed(state, pick, false);
  }

  // Set the dials: one long tide if it would pass a strandline, short ones otherwise.
  d = tw.calc(state);
  let period = tw.BAL.minPeriod;
  if (pushing() && d.pool.gte(pushBrine)) period = Math.max(tw.BAL.minPeriod, pushTime());
  tw.setPeriod(state, period);
  if (!t.driftUp.tables) tw.setGate(state, tw.bestGate(d.fill, d.dry, d.pool, t.nextPeriod));

  const patience = Math.max(30, every);
  if (d.canStorm && d.driftGain.gte(1) && !state.atlas.nodes.t_storm && t.calmTime >= patience) {
    const up = cheapest(tw.DRIFT_UPGRADES, t.driftUp);
    const buysNext = up && t.driftwood.add(d.driftGain).gte(up.cost);
    const bigJump = d.driftGain.gte(t.totalDriftwood.mul(2).max(1));
    const stalled = t.calmTime > 300 && d.driftGain.gte(t.totalDriftwood.mul(0.5));
    if (buysNext || bigJump || stalled) tw.storm(state);
  }
}

/**
 * every:   how often the player looks at the game and acts, in seconds
 * hours:   give up after this long
 * until:   optional mark name; stop as soon as it happens
 * setup:   optional function to arrange the starting state
 * worlds:  which worlds the player bothers with
 * dt:      length of one step of game time
 */
export function simulate({ every = 3, hours = 24, until = null, keepLog = false, setup = null, worlds = { cinder: true, tidewater: true }, dt = 0.25 } = {}) {
  drain();
  const state = newState(0);
  if (setup) setup(state);
  dt = Math.min(dt, every);
  const marks = {};
  const lines = [];
  let t = 0;

  const log = (text) => {
    if (!keepLog) return;
    const c = state.cinder;
    const w = state.tidewater;
    lines.push(
      `${formatTime(t).padStart(9)}  ${text.padEnd(50)} fire ${String(Math.floor(c.peakTemp)).padStart(5)}°C  tide ${format(w.bestTide, 0).padStart(9)}  drift ${format(w.totalDriftwood, 0).padStart(8)}  star ${format(state.atlas.total, 0)}`
    );
  };
  const mark = (name) => { if (marks[name] === undefined) marks[name] = t; };

  let nextAct = 0;
  const limit = hours * 3600;
  while (t < limit && !(until && marks[until] !== undefined)) {
    if (t >= nextAct) {
      actAtlas(state);
      if (worlds.cinder) actCinder(state, every);
      if (worlds.tidewater) actTidewater(state, every);
      nextAct = t + every;
    }
    tick(state, dt);
    t += dt;
    if (keepLog && Math.floor(t / 1800) > Math.floor((t - dt) / 1800)) log('  ...');
    for (const e of drain()) {
      const c = state.cinder;
      const w = state.tidewater;
      if (e.type === 'ignition') { log(`ignition: ${e.name}`); mark(e.id); }
      if (e.type === 'burn' && c.burns === 1) { log('first burn'); mark('firstBurn'); }
      if (e.type === 'ashUpgrade' && marks['ash:' + e.id] === undefined) { if (c.folds === 0) log(`ash upgrade: ${e.id}`); mark('ash:' + e.id); }
      if (e.type === 'smelt' && c.smelts === 1) { log('first smelt'); mark('firstSmelt'); }
      if (e.type === 'glassUpgrade' && marks['glass:' + e.id] === undefined) { if (c.folds === 0) log(`glass upgrade: ${e.id}`); mark('glass:' + e.id); }
      if (e.type === 'end') { log('Cinder starts to shine'); mark('end'); }
      if (e.type === 'strandline') { log(`strandline: ${e.name}`); mark('line:' + e.id); }
      if (e.type === 'storm' && w.storms === 1) { log(`first storm (+${format(e.gain, 0)} driftwood)`); mark('firstStorm'); }
      if (e.type === 'driftUpgrade' && marks['drift:' + e.id] === undefined) { log(`driftwood upgrade: ${e.id}`); mark('drift:' + e.id); }
      if (e.type === 'fold') { log(`FOLD ${e.world} (+${format(e.gain, 0)} starlight after ${formatTime(e.time)})`); mark(`fold:${e.world}`); }
      if (e.type === 'atlas') { log(`ATLAS: ${e.name}`); mark('atlas:' + e.id); }
    }
  }
  return { marks, lines, state, t };
}
