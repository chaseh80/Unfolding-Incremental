// Plays on from the saved late point until every expansion is bought, and
// prints when each corona purchase happened. This is the test for how the
// expansions sit together: how long each one takes to afford after the last.
//
//   node sim/sequence.js              until the last expansion, or 40 hours
//   node sim/sequence.js --hours 12   stop sooner
//   node sim/sequence.js --all        list every purchase, not only expansions
//   node sim/sequence.js --afk        the player who looks in every half hour (needs its own checkpoint)
//   node sim/sequence.js --after 3    carry on three hours past the last expansion
//   node sim/sequence.js --no-fold    with the Bookbinder switched off (--no-atlas for the Cartographer)
//   node sim/sequence.js --fold-at 10 with the Bookbinder set to 10x
//   node sim/sequence.js eclipse.expansionCosts=10,40,100,300,1200,5000   try different prices
//
// Needs sim/out/checkpoint-late.json: run `node sim/checkpoint.js` once.
import { format, formatTime } from '../src/core/num.js';
import * as ecl from '../src/eclipse.js';
import * as cinder from '../src/worlds/cinder.js';
import * as tidewater from '../src/worlds/tidewater.js';
import * as grove from '../src/worlds/grove.js';
import * as clockwork from '../src/worlds/clockwork.js';
import * as hollow from '../src/worlds/hollow.js';
import * as stormfront from '../src/worlds/stormfront.js';
import { simulate } from './bot.js';
import { loadCheckpoint, AFK_EVERY } from './checkpoint.js';

const BALS = { cinder: cinder.BAL, tidewater: tidewater.BAL, grove: grove.BAL, clockwork: clockwork.BAL, hollow: hollow.BAL, stormfront: stormfront.BAL, eclipse: ecl.BAL };
const args = process.argv.slice(2);
const hours = args.includes('--hours') ? Number(args[args.indexOf('--hours') + 1]) : 40;
for (const pair of args.filter((a) => a.includes('='))) {
  const [path, value] = pair.split('=');
  const [m, k] = path.split('.');
  BALS[m][k] = value.includes(',') ? value.split(',').map(Number) : Number(value);
}

const afk = args.includes('--afk');
const every = afk ? AFK_EVERY : 3;
const start = loadCheckpoint(afk);
// --no-fold and --no-atlas switch the automatic folder and buyer off, to compare.
if (args.includes('--no-fold')) start.state.eclipse.auto.fold = false;
if (args.includes('--no-atlas')) start.state.eclipse.auto.atlas = false;
if (args.includes('--fold-at')) start.state.eclipse.auto.foldAt = Number(args[args.indexOf('--fold-at') + 1]);
const last = ecl.EXPANSIONS[ecl.EXPANSIONS.length - 1].world;
const res = simulate({ every, hours, from: start, until: 'corona:expansion_' + last });
const m = res.marks;
const since = (t) => formatTime(t - start.t);

const eclipses = Object.keys(m).filter((k) => k.startsWith('eclipse:')).map((k) => m[k]).sort((a, b) => a - b);
const gains = Object.keys(m).filter((k) => k.startsWith('coronaGain:')).map((k) => m[k]);
const rows = Object.keys(m).filter((k) => k.startsWith('corona:') && (args.includes('--all') || k.includes('expansion_')))
  .map((k) => [k.slice(7), m[k]]).sort((a, b) => a[1] - b[1]);
console.log(afk ? 'A player who looks in every half hour.' : 'A player acting every few seconds.');
console.log(`Starting ${formatTime(start.t)} into the game, with ${Object.keys(start.state.eclipse.exp).filter((w) => start.state.eclipse.exp[w]).join(' and ')} owned.`);
let prev = start.t;
for (const [id, t] of rows) {
  const done = eclipses.filter((x) => x <= t).length;
  console.log(`  ${id.padEnd(24)} ${since(t).padStart(9)} in   ${formatTime(t - prev).padStart(9)} after the one before   Eclipses: ${done}`);
  if (id.includes('expansion_')) prev = t;
}
const e = res.state.eclipse;
console.log(`Stopped ${since(res.t)} in after ${eclipses.length} Eclipses. Corona found ${format(e.totalCorona, 0)}, unspent ${format(e.corona, 0)}. Expansions owned: ${Object.keys(e.exp).filter((w) => e.exp[w]).join(', ')}.`);
if (args.includes('--after')) {
  // Carry on past the last expansion, to see whether it runs away.
  const more = Number(args[args.indexOf('--after') + 1]) || 2;
  const on = simulate({ every, hours: more, from: res });
  const worth = Object.keys(on.marks).filter((k) => k.startsWith('coronaGain:')).map((k) => on.marks[k].split(' (')[0]);
  console.log(`In the ${more} hours after the last expansion: ${worth.length} Eclipses, worth ${worth.join(', ')}.`);
}
// Corona found by the end of each hour, to set prices from.
const number = (text) => Number(String(text).split(' ')[0].replace(/,/g, ''));
const first = Math.min(...Object.keys(m).filter((k) => k.startsWith('eclipse:')).map((k) => Number(k.slice(8))));
const byHour = [];
let total = 0;
for (let n = first; m['eclipse:' + n] !== undefined; n++) {
  total += number(m['coronaGain:' + n]);
  byHour[Math.floor((m['eclipse:' + n] - start.t) / 3600)] = total;
}
let seen = 0;
console.log('Corona found by the end of hour: ' + Array.from(byHour, (v, i) => { seen = v || seen; return `${i + 1}h ${Math.round(seen)}`; }).join(', '));
