// Tries the Observatory's numbers against a recorded run (sim/trace.js),
// without playing the worlds again. It takes a few seconds.
//
//   node sim/stargaze.js                 the player acting every few seconds
//   node sim/stargaze.js --afk           the player who looks in every half hour
//   node sim/stargaze.js rate=0.004 starGrowth=3    try different numbers (anything in the Observatory's BAL)
//
// The record starts just after the reef is bought, a few hours after the
// Observatory really opens. If the sky isn't finished when it ends, its last
// twelve hours are played over again. Charges change how far the worlds get, and the
// record has them where the recorded player put them, so this is only a
// guide: sim/trace.js prints what really happened. Buying a lens or an instrument costs the
// world nothing here, so the stand-in only buys with ten times the price in hand.
import { readFileSync } from 'node:fs';
import { D, formatTime } from '../src/core/num.js';
import { drain } from '../src/core/events.js';
import * as obs from '../src/observatory.js';
import { actObservatory } from './stargazer.js';

const args = process.argv.slice(2);
const afk = args.includes('--afk');
for (const pair of args.filter((a) => a.includes('='))) {
  const [k, v] = pair.split('=');
  obs.BAL[k] = Number(v);
}
const { rows } = JSON.parse(readFileSync(new URL(afk ? './out/trace-afk.json' : './out/trace.json', import.meta.url), 'utf8'));
// The same numbers as BAL.apertureCost and apertureGrowth in src/eclipse.js.
const APERTURE_COST = 5000;
const APERTURE_GROWTH = 2;
const pow = (x) => D(10).pow(x).sub(1).max(0);

const state = { eclipse: { exp: { cinder: true }, count: 0, aperture: 0 }, observatory: obs.defaults() };
let spent = 0; // corona this replay has put into Aperture
let ran = 0;
function show(row) {
  if (row.run < ran) state.eclipse.count += 1;
  ran = row.run;
  for (const w of obs.WORLD_INFO) {
    const x = row.w[w.id];
    state[w.id] = { given: pow(x.light), pending: D(0), [w.pay]: pow(x.pay), [w.field]: pow(x.stat) };
  }
}

const start = rows[0].t;
// Corona per minute over the record's last twelve hours, to carry on with past its end.
const spareRate = (rows[rows.length - 1].spare - rows[rows.length - 721].spare) / 720;
const lastExp = rows.find((r) => r.exp >= 6).t;
const looks = afk ? 30 : 1; // minutes between looks
const log = [];
const starTimes = Object.fromEntries(obs.WORLD_INFO.map((w) => [w.id, []]));
let done = null;
const limit = 60 * 24 * 40;
for (let i = 0; i < limit && done === null; i++) {
  const row = i < rows.length ? rows[i] : { ...rows[rows.length - 720 + ((i - rows.length) % 720)], spare: rows[rows.length - 1].spare + (i - rows.length) * spareRate };
  const t = start + i * 60;
  show(row);
  if (i % looks === 0) {
    actObservatory(state);
    // Aperture, bought with whatever corona the recorded player had to spare.
    while (obs.reached(state, 'aperture')) {
      const cost = APERTURE_COST * Math.pow(APERTURE_GROWTH, state.eclipse.aperture);
      if ((row.spare || 0) - spent < cost) break;
      spent += cost;
      state.eclipse.aperture += 1;
      log.push([t, `Aperture ${state.eclipse.aperture}`]);
    }
  }
  obs.tick(state, 60);
  for (const e of drain()) {
    if (e.type === 'star') starTimes[e.world].push(t);
    if (e.type === 'lens') log.push([t, `${obs.info(e.world).name} lens ${e.level}`]);
    if (e.type === 'instrument') log.push([t, obs.INSTRUMENTS.find((u) => u.id === e.id).name]);
  }
  if (obs.totalStars(state) >= obs.MOST_STARS) done = t;
}

const since = (t) => formatTime(t - start).padStart(7);
console.log(afk ? 'A player who looks in every half hour.' : 'A player acting every minute.');
console.log(`The last expansion is bought ${formatTime(lastExp - start)} in; the record ends ${formatTime(rows[rows.length - 1].t - start)} in.`);
for (const w of obs.WORLD_INFO) {
  console.log(`  ${w.name.padEnd(11)} stars at ${starTimes[w.id].map(since).join(' ')}`);
}
console.log('  Bought: ' + log.map(([t, text]) => `${text} at ${since(t).trim()}`).join(', '));
const total = obs.totalStars(state);
const byDay = [];
for (const list of Object.values(starTimes)) for (const t of list) { const d = Math.floor((t - start) / 86400); byDay[d] = (byDay[d] || 0) + 1; }
console.log('  Stars charted each day: ' + Array.from(byDay, (n) => n || 0).join(', '));
console.log(done === null
  ? `Not finished after 40 days: ${total} of ${obs.MOST_STARS} stars.`
  : `Every star charted ${formatTime(done - start)} in, ${formatTime(done - lastExp)} after the last expansion.`);
