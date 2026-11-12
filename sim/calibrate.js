// Works out what things should cost so the stand-in player reaches each one
// at a chosen time. Items are settled one at a time in the order they should
// happen, because the moment something is reached only depends on what came
// before it.
//
//   node sim/calibrate.js cinder      Ash and Glass upgrade costs
//   node sim/calibrate.js tidewater   strandlines and Driftwood upgrade costs
//   node sim/calibrate.js grove       stands, and Seed and Loam upgrade costs
//   node sim/calibrate.js clockwork   chimes and Spring upgrade costs
//   node sim/calibrate.js hollow      chambers and Geode upgrade costs, in the whole game
//   node sim/calibrate.js stormfront  peals and Fulgurite upgrade costs, in the whole game
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
import * as cw from '../src/worlds/clockwork.js';
import * as hollow from '../src/worlds/hollow.js';
import * as sf from '../src/worlds/stormfront.js';
import { simulate } from './bot.js';

const NICE = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10];
function tidy(x, down = false) {
  const e = Math.floor(Math.log10(x));
  const m = x / Math.pow(10, e);
  let best = NICE[0];
  for (const n of NICE) {
    if (down ? n <= m * 1.0001 : Math.abs(Math.log(n / m)) < Math.abs(Math.log(best / m))) best = n;
  }
  return Number((best * Math.pow(10, e)).toPrecision(2));
}

/**
 * items: [{ label, target (minutes), mark, obj, field, group }]
 * Items in the same group must keep rising in the order given.
 * `down` rounds every answer down, for worlds where progress comes in lumps
 * and rounding up could miss the lump that was meant to reach it.
 */
function tune(items, sim, after = () => {}, t0 = 0, down = false) {
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
      if (marks[it.mark] !== undefined && marks[it.mark] - t0 <= it.target * 60) lo = mid; else hi = mid;
    }
    it.obj[it.field] = tidy(Math.pow(10, lo), down);
    floors[it.group] = it.obj[it.field];
    after(it);
    const { marks } = simulate({ ...sim, hours: (it.target + 15) / 60, until: it.mark });
    console.log(`${it.label.padEnd(22)} ${String(it.obj[it.field]).padStart(12)}   reached at ${marks[it.mark] !== undefined ? formatTime(marks[it.mark] - t0) : 'never'} (target ${it.target}m)`);
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

if (which === 'clockwork') {
  // Minutes after Clockwork is first unfolded, played on its own with its
  // needs from other worlds waived.
  cw.BAL.ignoreNeeds = true;
  const chimes = { one: 1.5, two: 4, three: 8, four: 13, five: 30, six: 55, seven: 90, eight: 135, midnight: 200 };
  const spring = { socket5: 18, idler: 24, runin: 31, esc: 39, socket6: 48, worm: 60, socket7: 75, jewels: 95, pinion: 120, socket8: 150 };
  sim = { worlds: { clockwork: true }, setup: (s) => { s.atlas.nodes.clockwork = true; }, dt: 0.5 };
  const items = [];
  for (const p of cw.CHIMES) items.push({ label: 'chime ' + p.id, target: chimes[p.id], mark: 'chime:' + p.id, obj: p, field: 'rate', group: 'chime' });
  for (const u of cw.SPRING_UPGRADES) if (spring[u.id]) items.push({ label: 'spring ' + u.id, target: spring[u.id], mark: 'spring:' + u.id, obj: u, field: 'cost', group: 'spring' });
  items.push({ label: 'springNeedsTicks', target: 14, mark: 'firstRewind', obj: cw.BAL, field: 'springNeedsTicks', group: 'springneed' });
  tune(items, sim);
}

if (which === 'hollow') {
  // Minutes after Hollow is unlocked, in the whole game. Hollow's seam column
  // depends on the older worlds, so tuning it alone gives the wrong answer.
  // The game is played once up to the moment Hollow unlocks and every trial
  // carries on from a copy of that.
  const chambers = { squeeze: 2, hall: 6, well: 14, blue: 26, lake: 48, pipes: 78, vault: 112, throat: 160, heart: 210 };
  const geode = { template: 11, second: 18, press: 22, spare: 32, rich: 40, freebridge: 62, third: 92, seams: 135 };
  const base = simulate({ hours: 60, until: 'atlas:hollow' });
  console.log(`Hollow unlocks at ${formatTime(base.t)}`);
  sim = { from: base };
  const items = [];
  for (const p of hollow.CHAMBERS) items.push({ label: 'chamber ' + p.id, target: chambers[p.id], mark: 'chamber:' + p.id, obj: p, field: 'crystal', group: 'chamber' });
  for (const u of hollow.GEODE_UPGRADES) if (geode[u.id]) items.push({ label: 'geode ' + u.id, target: geode[u.id], mark: 'geode:' + u.id, obj: u, field: 'cost', group: 'geode' });
  items.push({ label: 'geodeNeedsCrystal', target: 8, mark: 'firstCollapse', obj: hollow.BAL, field: 'geodeNeedsCrystal', group: 'geodeneed' });
  tune(items, sim, () => {}, base.t);
}

if (which === 'stormfront') {
  // Minutes after Stormfront is unlocked, in the whole game, the same way as Hollow.
  // Rumble is left alone: it is the first full strike.
  const peals = { crack: 4, sheet: 9, forked: 20, crawler: 40, supercell: 70, ball: 120, sprite: 190, eye: 270 };
  const fulg = { surge: 14, clap: 25, rain: 32, tall: 50, ion: 62, rich: 80, leader: 105, reach: 135, keen: 170, keep: 215 };
  const base = simulate({ hours: 60, until: 'atlas:stormfront' });
  console.log(`Stormfront unlocks at ${formatTime(base.t)}`);
  sim = { from: base, dt: 0.5 };
  const items = [];
  for (const p of sf.PEALS) if (peals[p.id]) items.push({ label: 'peal ' + p.id, target: peals[p.id], mark: 'peal:' + p.id, obj: p, field: 'strike', group: 'peal', floor: 200 });
  for (const u of sf.FULG_UPGRADES) if (fulg[u.id]) items.push({ label: 'fulg ' + u.id, target: fulg[u.id], mark: 'fulg:' + u.id, obj: u, field: 'cost', group: 'fulg' });
  items.push({ label: 'fulgNeedsThunder', target: 11, mark: 'firstPass', obj: sf.BAL, field: 'fulgNeedsThunder', group: 'fulgneed' });
  tune(items, sim, () => {}, base.t, true);
}

if (timeline) {
  const { lines } = simulate({ ...sim, hours: 12, keepLog: true, until: which === 'tidewater' ? 'line:far' : which === 'grove' ? 'stand:far' : which === 'clockwork' ? 'chime:midnight' : which === 'hollow' ? 'chamber:heart' : which === 'stormfront' ? 'peal:eye' : 'end' });
  console.log('\n' + lines.join('\n'));
}
