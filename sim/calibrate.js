// Works out what things should cost so the stand-in player reaches each one
// at a chosen time. Items are settled one at a time in the order they should
// happen, because the moment something is reached only depends on what came
// before it.
//
//   node sim/calibrate.js cinder      Ash and Glass upgrade costs
//   node sim/calibrate.js tidewater   strandlines and Driftwood upgrade costs
//   node sim/calibrate.js grove       stands, and Seed and Loam upgrade costs
//
// Add --timeline to print the playthrough the result produces. Nothing is
// written to the game files; copy the numbers across by hand.
//
// Atlas costs are not tuned here. Starlight arrives in lumps, one fold at a
// time, so those are set by hand from the timeline that sim/run.js prints.
import { formatTime } from '../src/core/num.js';
import * as cinder from '../src/worlds/cinder.js';
import * as tw from '../src/worlds/tidewater.js';
import * as grove from '../src/worlds/grove.js';
import { simulate } from './bot.js';

const NICE = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
function tidy(x) {
  const e = Math.floor(Math.log10(x));
  const m = x / Math.pow(10, e);
  let best = NICE[0];
  for (const n of NICE) if (Math.abs(Math.log(n / m)) < Math.abs(Math.log(best / m))) best = n;
  return Number((best * Math.pow(10, e)).toPrecision(2));
}

/**
 * items: [{ label, target (minutes), mark, obj, field, group }]
 * Items in the same group must keep rising in the order given.
 */
function tune(items, sim, after = () => {}) {
  items.sort((a, b) => a.target - b.target);
  for (const it of items) it.obj[it.field] = Infinity;
  const floors = {};
  for (const it of items) {
    let lo = Math.log10(floors[it.group] || it.floor || 1);
    let hi = lo + 14;
    for (let i = 0; i < 16; i++) {
      const mid = (lo + hi) / 2;
      it.obj[it.field] = Math.pow(10, mid);
      const { marks } = simulate({ ...sim, hours: (it.target + 0.5) / 60, until: it.mark });
      if (marks[it.mark] !== undefined && marks[it.mark] <= it.target * 60) lo = mid; else hi = mid;
    }
    it.obj[it.field] = tidy(Math.pow(10, lo));
    floors[it.group] = it.obj[it.field];
    after(it);
    const { marks } = simulate({ ...sim, hours: (it.target + 15) / 60, until: it.mark });
    console.log(`${it.label.padEnd(22)} ${String(it.obj[it.field]).padStart(12)}   reached at ${marks[it.mark] !== undefined ? formatTime(marks[it.mark]) : 'never'} (target ${it.target}m)`);
  }
}

const which = process.argv[2] || 'tidewater';
const timeline = process.argv.includes('--timeline');
let sim;

if (which === 'cinder') {
  const ash = { tender: 11, hand: 14, deep: 18, clamp: 23, sweep: 28, hot: 34, double: 40, memory: 47, clinker: 54, kiln: 62 };
  const glass = { anneal: 73, cullet: 80, blown: 88, crucible: 98, mirror: 108, prism: 118, chimney: 130 };
  sim = { worlds: { cinder: true } };
  const items = [];
  for (const u of cinder.ASH_UPGRADES) if (ash[u.id]) items.push({ label: 'ash ' + u.id, target: ash[u.id], mark: 'ash:' + u.id, obj: u, field: 'cost', group: 'ash' });
  for (const u of cinder.GLASS_UPGRADES) if (glass[u.id]) items.push({ label: 'glass ' + u.id, target: glass[u.id], mark: 'glass:' + u.id, obj: u, field: 'cost', group: 'glass', floor: 50 });
  tune(items, sim);
}

if (which === 'tidewater') {
  // Minutes after Tidewater is first unfolded, played on its own.
  const lines = { wrack: 1.5, barnacle: 4, slipway: 8, storm: 13, causeway: 28, seal: 45, wood: 62, light: 82, far: 105 };
  const drift = { groynes: 15, digger: 18, tables: 22, watcher: 27, beds: 33, cuts: 40, seawall: 48, holdfast: 57, flats: 67, pull: 78 };
  sim = { worlds: { tidewater: true }, setup: (s) => { s.atlas.nodes.tidewater = true; } };
  const items = [];
  for (const p of tw.STRANDLINES) items.push({ label: 'line ' + p.id, target: lines[p.id], mark: 'line:' + p.id, obj: p, field: 'salt', group: 'line' });
  for (const u of tw.DRIFT_UPGRADES) if (drift[u.id]) items.push({ label: 'drift ' + u.id, target: drift[u.id], mark: 'drift:' + u.id, obj: u, field: 'cost', group: 'drift' });
  tune(items, sim, (it) => {
    // A storm is worth having as soon as the shore reaches Storm beach.
    if (it.label === 'line storm') {
      tw.BAL.driftNeedsSalt = it.obj.salt;
      console.log(`  driftNeedsSalt set to ${tw.BAL.driftNeedsSalt}`);
    }
  });
}

if (which === 'grove') {
  // Minutes after Grove is first unfolded, played on its own.
  const stands = { thicket: 1.5, closed: 4, flower: 8, under: 24, deer: 42, owl: 62, lichen: 84, dead: 108, giant: 150, mother: 190, far: 235 };
  const seed = { deep: 12, mast: 16, forester: 21, veteran: 27, saplings: 34, taproot: 42, broadleaf: 51, memory: 61, humus: 72, crown: 84 };
  const loam = { fireweed: 130, clearing: 142, serotiny: 155, deeproot: 169, pioneer: 184, sun: 200, charcoal: 217 };
  sim = { worlds: { grove: true }, setup: (s) => { s.atlas.nodes.grove = true; }, dt: 0.5 };
  const items = [];
  for (const p of grove.STANDS) items.push({ label: 'stand ' + p.id, target: stands[p.id], mark: 'stand:' + p.id, obj: p, field: 'trees', group: 'stand' });
  for (const u of grove.SEED_UPGRADES) if (seed[u.id]) items.push({ label: 'seed ' + u.id, target: seed[u.id], mark: 'seed:' + u.id, obj: u, field: 'cost', group: 'seed' });
  for (const u of grove.LOAM_UPGRADES) if (loam[u.id]) items.push({ label: 'loam ' + u.id, target: loam[u.id], mark: 'loam:' + u.id, obj: u, field: 'cost', group: 'loam', floor: 50 });
  items.push({ label: 'seedNeedsSap', target: 9.5, mark: 'firstSeedfall', obj: grove.BAL, field: 'seedNeedsSap', group: 'seedneed' });
  items.push({ label: 'loamNeedsSeeds', target: 118, mark: 'firstFire', obj: grove.BAL, field: 'loamNeedsSeeds', group: 'loamneed' });
  tune(items, sim);
}

if (timeline) {
  const { lines } = simulate({ ...sim, hours: 12, keepLog: true, until: which === 'tidewater' ? 'line:far' : which === 'grove' ? 'stand:far' : 'end' });
  console.log('\n' + lines.join('\n'));
}
