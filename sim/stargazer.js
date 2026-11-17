// How the stand-in players use the Observatory. Shared by the full
// simulator (sim/bot.js) and the quick replay (sim/stargaze.js).
import * as obs from '../src/observatory.js';

// A lens or an instrument is only bought once the world holds this many
// times its price, so paying for it hardly sets the world back.
const SPARE = 10;

/** Seconds for a telescope to gather `need` sightings at `base` per second before focus, having already been held for `held`. */
function timeFor(need, base, state, held) {
  if (need <= 0) return 0;
  if (!(base > 0)) return Infinity;
  const full = obs.focusMax(state);
  const ramp = obs.focusTime(state);
  // Step through the ramp a minute at a time; it is short, and this is only an estimate.
  let got = 0;
  let t = 0;
  while (held + t < ramp && t < 86400) {
    got += base * (1 + (full - 1) * ((held + t) / ramp)) * 60;
    t += 60;
    if (got >= need) return t;
  }
  return t + (need - got) / (base * full);
}

// Right after an Eclipse every world is dark, and nobody re-points a
// telescope over that. The stand-in judges a world by the brighter of how it
// looks now and how bright it got last Eclipse.
const memory = new WeakMap();
function usualLight(state) {
  let m = memory.get(state);
  if (!m) { m = { count: state.eclipse.count, peak: {}, last: {} }; memory.set(state, m); }
  if (m.count !== state.eclipse.count) { m.count = state.eclipse.count; m.last = m.peak; m.peak = {}; }
  const usual = {};
  for (const w of obs.WORLD_INFO) {
    const now = obs.light(state, w.id);
    m.peak[w.id] = Math.max(m.peak[w.id] || 0, now);
    usual[w.id] = Math.max(now, m.last[w.id] || 0);
  }
  return usual;
}

export function actObservatory(state) {
  if (!obs.unlocked(state)) return;
  const o = state.observatory;
  const usual = usualLight(state);
  for (const w of obs.WORLD_INFO) while (obs.chart(state, w.id));
  for (const w of obs.WORLD_INFO) {
    for (let cost = obs.lensCost(state, w.id); cost && state[w.id][w.pay].gte(cost.mul(SPARE)) && obs.buyLens(state, w.id); cost = obs.lensCost(state, w.id));
  }
  for (const u of obs.INSTRUMENTS) {
    if (o.up[u.id]) continue;
    if (Object.keys(u.cost).every((id) => state[id][obs.info(id).pay].gte(obs.D(u.cost[id]).mul(SPARE)))) obs.buyInstrument(state, u.id);
  }

  // Pointing. For every world, work out how long its next star would take a
  // telescope: no time at all counts for nothing if the world itself hasn't
  // got far enough for that star yet.
  const wait = (id, held) => {
    const star = obs.nextStar(state, id);
    if (!star) return Infinity;
    const base = obs.BAL.rate * usual[id] * obs.lensMult(state, id) * obs.skyMult(state);
    const blocked = o.best[id].lt(star.record);
    // A star the world isn't ready for still banks sightings, but comes after the others.
    return timeFor(star.sight - o.sight[id], base, state, held) + (blocked ? 1e7 : 0);
  };
  const scopes = obs.scopeCount(state);
  for (let i = 0; i < scopes; i++) {
    const here = o.at[i];
    const stay = here ? wait(here, o.held[i]) : Infinity;
    let best = null;
    for (const w of obs.WORLD_INFO) {
      if (obs.scopeOn(state, w.id) >= 0) continue;
      const t = wait(w.id, 0);
      if (!best || t < best.t) best = { id: w.id, t };
    }
    // Moving loses the focus, so only move for something twice as quick.
    if (best && best.t < Infinity && best.t < stay / 2) obs.point(state, i, best.id);
  }
}
