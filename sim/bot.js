// A stand-in player. It plays the real game logic far faster than real time
// and records when it reached each landmark, so pacing can be tuned from
// numbers instead of guesses.
import { newState, tick } from '../src/game.js';
import { drain } from '../src/core/events.js';
import { D, format, formatTime } from '../src/core/num.js';
import * as atlas from '../src/atlas.js';
import * as cinder from '../src/worlds/cinder.js';
import * as tw from '../src/worlds/tidewater.js';
import * as grove from '../src/worlds/grove.js';
import * as cw from '../src/worlds/clockwork.js';

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

function actGrove(state, every) {
  if (!state.atlas.nodes.grove) return;
  const g = state.grove;
  if (!g.planted) grove.plant(state);
  for (let u = cheapest(grove.SEED_UPGRADES, g.seedUp); u && grove.buySeedUpgrade(state, u.id); u = cheapest(grove.SEED_UPGRADES, g.seedUp));
  for (let u = cheapest(grove.LOAM_UPGRADES, g.loamUp); u && grove.buyLoamUpgrade(state, u.id); u = cheapest(grove.LOAM_UPGRADES, g.loamUp));

  if (shouldFold(state, 'grove', every)) { grove.fold(state); return; }

  const d = grove.calc(state);
  const patience = Math.max(30, every);

  // Roots against canopy: keep the forest close to full, the way anyone
  // watching the fullness bar would.
  const split = grove.autoSplit(d.fullness);

  // Seed: grow while growing is quick, then let the forest go to seed once
  // the next level of roots is a long way off compared with how long this
  // generation has already run.
  let seedShare = 0;
  if (g.seen.seed) {
    const growing = d.sap.mul((1 - split) * d.rootReach);
    const wait = growing.gt(0) ? d.nextRoot.sub(g.rootSap).div(growing).toNumber() : Infinity;
    if (wait > Math.max(15, Math.min(90, 0.3 * g.genTime))) seedShare = 0.8;
    if (grove.seedsFallAlone(state)) seedShare = 0.5;
  }
  grove.setShares(state, seedShare, split);

  if (d.canFire && d.loamGain.gte(1) && g.fireTime >= patience) {
    const next = cheapest(grove.LOAM_UPGRADES, g.loamUp);
    const buysNext = next && g.loam.add(d.loamGain).gte(next.cost);
    const bigJump = d.loamGain.gte(g.totalLoam.mul(2).max(1));
    const stalled = g.fireTime > 900 && d.loamGain.gte(g.totalLoam.mul(0.5));
    if (buysNext || bigJump || stalled) {
      grove.wildfire(state);
      return;
    }
  }

  if (d.canSeedfall && d.seedGain.gte(1) && !grove.seedsFallAlone(state) && g.genTime >= patience) {
    const next = cheapest(grove.SEED_UPGRADES, g.seedUp);
    const buysNext = next && g.seeds.add(d.seedGain).gte(next.cost);
    const bigJump = d.seedGain.gte(g.totalSeeds.mul(2).max(1));
    const stalled = g.genTime > 300 && d.seedGain.gte(g.totalSeeds.mul(0.5));
    if (buysNext || bigJump || stalled) grove.seedfall(state);
  }
}

// Try every single change and every swap, keep whatever makes the train
// worth more, and repeat until nothing helps. A person does much the same by
// dragging gears about and watching the number.
function arrangeTrain(state) {
  const k = state.clockwork;
  const n = cw.socketCount(k);
  const kinds = cw.GEARS.map((g) => g.id).filter((id) => cw.gearUnlocked(k, id));
  const pad = (t) => t.concat(new Array(k.train.length - n).fill(''));
  const worth = (t) => cw.calc(state, pad(t)).run.product;
  let train = k.train.slice(0, n).map((t) => (t && cw.gearUnlocked(k, t) ? t : 'brass'));
  let best = worth(train);
  for (let pass = 0; pass < 12; pass++) {
    let improved = false;
    const consider = (t) => {
      const w = worth(t);
      if (w.gt(best.mul(1.0001))) { best = w; train = t; improved = true; }
    };
    for (let i = 0; i < n; i++) {
      for (const id of kinds) {
        if (train[i] === id) continue;
        const t = train.slice();
        if (id !== 'brass') for (let j = 0; j < n; j++) if (t[j] === id) t[j] = 'brass';
        t[i] = id;
        consider(t);
      }
    }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (train[i] === train[j]) continue;
        const t = train.slice();
        [t[i], t[j]] = [t[j], t[i]];
        consider(t);
      }
    }
    if (!improved) break;
  }
  cw.setTrain(state, pad(train));
}

function actClockwork(state, every, ctx) {
  if (!state.atlas.nodes.clockwork) return;
  const k = state.clockwork;
  if (!k.wound) cw.wind(state);
  cw.levelAll(state);
  for (;;) {
    const u = cheapest(cw.SPRING_UPGRADES, k.springUp, (x) => cw.needMet(state, x) && k.springs.gte(x.cost));
    if (!u || !cw.buySpringUpgrade(state, u.id)) break;
  }

  if (shouldFold(state, 'clockwork', every)) { cw.fold(state); return; }

  // Rearranging is the one thing here that is always done by hand, so the
  // stand-in player only does it now and then, not every few seconds.
  const shape = cw.socketCount(k) + ':' + cw.GEARS.filter((g) => cw.gearUnlocked(k, g.id)).length;
  if (ctx.shape !== shape || ctx.time - (ctx.arranged || 0) >= Math.max(60, every)) {
    arrangeTrain(state);
    ctx.shape = shape;
    ctx.arranged = ctx.time;
  }

  const d = cw.calc(state);
  const patience = Math.max(30, every);
  if (d.canRewind && d.springGain.gte(1) && !state.atlas.nodes.k_spring && k.windTime >= patience) {
    const next = cheapest(cw.SPRING_UPGRADES, k.springUp, (x) => cw.needMet(state, x));
    const buysNext = next && k.springs.add(d.springGain).gte(next.cost);
    const bigJump = d.springGain.gte(k.totalSprings.mul(2).max(1));
    const stalled = k.windTime > 300 && d.springGain.gte(k.totalSprings.mul(0.5));
    if (buysNext || bigJump || stalled) cw.rewind(state);
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
export function simulate({ every = 3, hours = 24, until = null, keepLog = false, setup = null, worlds = { cinder: true, tidewater: true, grove: true, clockwork: true }, dt = 0.25 } = {}) {
  drain();
  const state = newState(0);
  if (setup) setup(state);
  dt = Math.min(dt, every);
  const marks = {};
  const lines = [];
  const ctx = { time: 0 };
  let t = 0;

  const log = (text) => {
    if (!keepLog) return;
    const c = state.cinder;
    const w = state.tidewater;
    lines.push(
      `${formatTime(t).padStart(9)}  ${text.padEnd(50)} fire ${String(Math.floor(c.foldBest)).padStart(5)}°C  tide ${format(w.foldBestTide, 0).padStart(9)}  trees ${format(state.grove.foldBestTrees, 0).padStart(9)}  ticks ${format(state.clockwork.foldBestRate, 0).padStart(9)}  star ${format(state.atlas.total, 0)}`
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
      if (worlds.grove) actGrove(state, every);
      ctx.time = t;
      if (worlds.clockwork) actClockwork(state, every, ctx);
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
      if (e.type === 'stand') { log(`stand: ${e.name}`); mark('stand:' + e.id); }
      if (e.type === 'seedfall' && state.grove.seedfalls === 1) { log(`first seedfall (+${format(e.gain, 0)} seeds)`); mark('firstSeedfall'); }
      if (e.type === 'seedUpgrade' && marks['seed:' + e.id] === undefined) { log(`seed upgrade: ${e.id}`); mark('seed:' + e.id); }
      if (e.type === 'wildfire' && state.grove.fires === 1) { log(`first fire (+${format(e.gain, 0)} loam)`); mark('firstFire'); }
      if (e.type === 'loamUpgrade' && marks['loam:' + e.id] === undefined) { log(`loam upgrade: ${e.id}`); mark('loam:' + e.id); }
      if (e.type === 'chime') { log(`chime: ${e.name}`); mark('chime:' + e.id); }
      if (e.type === 'rewind' && state.clockwork.rewinds === 1) { log(`first rewind (+${format(e.gain, 0)} springs)`); mark('firstRewind'); }
      if (e.type === 'springUpgrade' && marks['spring:' + e.id] === undefined) { log(`spring upgrade: ${e.id}`); mark('spring:' + e.id); }
      if (e.type === 'fold') { log(`FOLD ${e.world} (+${format(e.gain, 0)} starlight after ${formatTime(e.time)})`); mark(`fold:${e.world}`); }
      if (e.type === 'atlas') { log(`ATLAS: ${e.name}`); mark('atlas:' + e.id); }
    }
  }
  return { marks, lines, state, t };
}
