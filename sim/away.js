// Looks at what holds up the player who is mostly away, early in the Eclipse
// phase: the stretch right after it buys the Cartographer, when a run still
// takes a day and a half.
//
//   node sim/away.js build                       play to that point once and save it (several minutes)
//   node sim/away.js 40                          play on for 40 hours and print when it eclipsed
//   node sim/away.js 40 tend=hollow,stormfront   the same with those worlds tended every few seconds,
//                                                as if everything done by hand in them were automatic
//   node sim/away.js 40 up=passive,routes        with those corona upgrades already owned
//   node sim/away.js 40 fold=on foldAt=10        with the Bookbinder owned, on, and set to 10x
//
// If tending a world brings the Eclipses much closer together, its hand
// actions are what the away player is waiting on.
import { writeFileSync, readFileSync } from 'node:fs';
import { serialize } from '../src/core/save.js';
import { loadState } from '../src/game.js';
import { formatTime } from '../src/core/num.js';
import * as ecl from '../src/eclipse.js';
import { simulate } from './bot.js';
import { AFK_EVERY } from './checkpoint.js';

const file = new URL('./out/checkpoint-away-early.json', import.meta.url);
const WORLDS = ecl.WORLDS.map((w) => w.id);
const args = process.argv.slice(2);

if (args[0] === 'build') {
  const base = simulate({ every: AFK_EVERY, hours: 1000, until: 'corona:hands' });
  writeFileSync(file, JSON.stringify({ t: base.t, ctx: { ...base.ctx, gainSeen: null, lookRate: null }, state: JSON.parse(serialize(base.state)) }));
  console.log(`Saved at ${formatTime(base.t)}, ${base.state.eclipse.count} Eclipses in, owning ${Object.keys(base.state.eclipse.up).join(', ')}.`);
} else {
  const saved = JSON.parse(readFileSync(file, 'utf8'));
  const start = { state: loadState(saved.state, 0), t: saved.t, ctx: saved.ctx };
  const e = start.state.eclipse;
  for (const pair of args.slice(1)) {
    const [k, v] = pair.split('=');
    if (k === 'tend') start.ctx.tend = v.split(',');
    if (k === 'up') for (const id of v.split(',')) e.up[id] = true;
    if (k === 'fold') { e.up.auto_fold = true; start.ctx.keepFold = v === 'on'; e.auto.fold = v === 'on'; }
    if (k === 'foldAt') e.auto.foldAt = Number(v);
  }
  ecl.refresh(start.state);
  const before = WORLDS.map((w) => start.state[w].folds);
  const res = simulate({ every: AFK_EVERY, hours: Number(args[0]) || 40, from: start });
  const m = res.marks;
  const since = (t) => formatTime(t - start.t);
  const eclipses = Object.keys(m).filter((k) => k.startsWith('eclipse:')).map((k) => m[k]).sort((a, b) => a - b);
  console.log(args.slice(1).join(' ') || 'as saved');
  console.log(`  Eclipses at: ${eclipses.map(since).join(', ') || 'none'}`);
  console.log(`  Corona found: ${e.totalCorona.toString()} before, ${res.state.eclipse.totalCorona.toString()} after`);
  console.log(`  Folds: ${WORLDS.map((w, i) => `${w} ${res.state[w].folds - before[i]}`).join(', ')}`);
}
