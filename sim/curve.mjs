// How corona builds inside one run pushed from the saved late point, every five minutes.
import * as ecl from '../src/eclipse.js';
import { simulate } from './bot.js';
import { loadCheckpoint } from './checkpoint.js';
const start = loadCheckpoint();
const all = process.argv.includes('--all');
if (all) { for (const u of ecl.UPGRADES.concat(ecl.WORLD_UPGRADES)) start.state.eclipse.up[u.id] = true; ecl.refresh(start.state); }
let cur = { state: start.state, t: start.t, ctx: { ...start.ctx, hold: true } };
const out = [];
for (let min = 5; min <= 90; min += 5) {
  const res = simulate({ hours: 5 / 60, from: cur });
  cur = { state: res.state, t: res.t, ctx: res.ctx };
  const ready = ecl.calc(res.state).ready;
  const c = ecl.coronaFor(res.state.atlas.total);
  out.push(`${min}m ${ready ? c : '(' + c + ')'} [${Math.round(c / (min / 60))}/h]`);
}
console.log((all ? 'every upgrade owned: ' : 'as saved: ') + out.join(', '));
