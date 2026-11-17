// Records how far each world gets, minute by minute, from the saved late
// point to well past the last expansion. The Observatory changes no world, so
// its numbers can be tried against this record in seconds (sim/stargaze.js)
// without playing the worlds again.
//
//   node sim/trace.js          writes sim/out/trace.json (several minutes)
//   node sim/trace.js --afk    the player who looks in every half hour, to sim/out/trace-afk.json
//
// After the last expansion the player plays on for sixteen hours (twenty-four for
// the one who is mostly away), eclipsing about once an hour.
// Rebuild it when anything in the worlds or in Eclipse changes.
import { writeFileSync } from 'node:fs';
import { D, formatTime } from '../src/core/num.js';
import * as ecl from '../src/eclipse.js';
import { WORLD_INFO, statOf } from '../src/observatory.js';
import { simulate } from './bot.js';
import { loadCheckpoint, AFK_EVERY } from './checkpoint.js';

const afk = process.argv.includes('--afk');
const every = afk ? AFK_EVERY : 3;
// Powers of ten, to two places: every amount here is far too big to keep whole.
const lg = (x) => Math.round(D(x).add(1).log10().toNumber() * 100) / 100;

const rows = [];
let phase = 'expansions';
const sample = {
  every: 60,
  fn: (state, t) => {
    const e = state.eclipse;
    // Corona that Aperture could have had: what is in hand plus what the stand-in spent on it.
    const spare = e.corona.toNumber() + ecl.BAL.apertureCost * (Math.pow(ecl.BAL.apertureGrowth, e.aperture) - 1) / (ecl.BAL.apertureGrowth - 1);
    const row = { t: Math.round(t), phase, run: Math.round(e.time), exp: Object.keys(e.exp).length, spare: Math.round(spare), w: {} };
    for (const w of WORLD_INFO) {
      const x = state[w.id];
      row.w[w.id] = { light: lg(x.given.add(x.pending)), stat: lg(statOf(state, w)), pay: lg(x[w.pay]) };
    }
    rows.push(row);
  },
};

const start = loadCheckpoint(afk);
const last = ecl.EXPANSIONS[ecl.EXPANSIONS.length - 1].world;
let res = simulate({ every, hours: 200, from: start, until: 'corona:expansion_' + last, sample });
console.log(`Last expansion ${formatTime(res.t - start.t)} in.`);
phase = 'after';
res = simulate({ every, hours: afk ? 24 : 16, from: res, sample });
writeFileSync(new URL(afk ? './out/trace-afk.json' : './out/trace.json', import.meta.url), JSON.stringify({ start: start.t, rows }));
console.log(`Saved ${rows.length} minutes.`);
// What the stand-in's own Observatory had charted by the end, to check sim/stargaze.js against.
const o = res.state.observatory;
console.log(`Charges on: ${Object.keys(res.state.eclipse.charge).join(', ')}. Aperture level ${res.state.eclipse.aperture}.`);
console.log('Stars charted by the end: ' + WORLD_INFO.map((w) => `${w.name} ${o.stars[w.id]}`).join(', ') + '.');
