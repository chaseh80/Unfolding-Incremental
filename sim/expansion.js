// Tests one world's expansion on its own, from the saved late point.
//
//   node sim/expansion.js grove               with and without Grove's expansion
//   node sim/expansion.js grove --only        skip the run without it
//   node sim/expansion.js grove grove.ringLight=1.05   try a different number
//
// Every corona upgrade is owned in both runs, along with the Star forge and
// the reef, so the only difference is the expansion being tested. One run is
// pushed for two hours without eclipsing, and what it would be worth is
// printed at half an hour, one hour and two.
//
// Needs sim/out/checkpoint-late.json: run `node sim/checkpoint.js` once.
import { format } from '../src/core/num.js';
import * as ecl from '../src/eclipse.js';
import * as cinder from '../src/worlds/cinder.js';
import * as tidewater from '../src/worlds/tidewater.js';
import * as grove from '../src/worlds/grove.js';
import * as clockwork from '../src/worlds/clockwork.js';
import * as hollow from '../src/worlds/hollow.js';
import * as stormfront from '../src/worlds/stormfront.js';
import { simulate } from './bot.js';
import { loadCheckpoint } from './checkpoint.js';

const BALS = { cinder: cinder.BAL, tidewater: tidewater.BAL, grove: grove.BAL, clockwork: clockwork.BAL, hollow: hollow.BAL, stormfront: stormfront.BAL, eclipse: ecl.BAL };
const args = process.argv.slice(2);
const world = args[0];
if (!ecl.EXPANSIONS.some((x) => x.world === world)) {
  console.log(`No expansion for "${world}". There are: ${ecl.EXPANSIONS.map((x) => x.world).join(', ')}.`);
  process.exit(1);
}
const only = args.includes('--only');
const tweaks = args.slice(1).filter((a) => a.includes('='));

const start = loadCheckpoint();
const e = start.state.eclipse;
for (const u of ecl.UPGRADES.concat(ecl.WORLD_UPGRADES)) e.up[u.id] = true;
ecl.refresh(start.state);
for (const x of ecl.EXPANSIONS) if (x.world !== 'cinder' && x.world !== 'tidewater') e.exp[x.world] = false;

function push(label, on) {
  e.exp[world] = on;
  let cur = { state: start.state, t: start.t, ctx: { ...start.ctx, hold: true } };
  console.log(`[${label}]`);
  for (const h of [0.5, 1, 2]) {
    const res = simulate({ hours: h - (cur.t - start.t) / 3600, from: cur });
    cur = { state: res.state, t: res.t, ctx: res.ctx };
    const s = res.state;
    const depth = ecl.EXPANSIONS.find((x) => x.world === world);
    console.log(`  ${String(h).padEnd(3)}h: corona ${String(ecl.coronaFor(s.atlas.total)).padStart(6)}  starlight ${format(s.atlas.total, 0).padStart(9)}  ${world} depth ${on ? depth.depth(s) : '-'} of ${depth.most}  fire ${Math.floor(s.cinder.foldBest)}  tide ${format(s.tidewater.foldBestTide, 0)}  trees ${format(s.grove.foldBestTrees, 0)}  ticks ${format(s.clockwork.foldBestRate, 0)}  crystal ${format(s.hollow.foldBestCrystal, 0)}  strike ${format(s.stormfront.foldBestStrike, 0)}`);
  }
}

for (const pair of tweaks) {
  const [path, value] = pair.split('=');
  const [m, k] = path.split('.');
  BALS[m][k] = Number(value);
}
if (!only) push(`without the ${world} expansion`, false);
push(`with the ${world} expansion${tweaks.length ? ' and ' + tweaks.join(', ') : ''}`, true);
