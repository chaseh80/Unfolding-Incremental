// Prints a timeline of one simulated playthrough.
//
//   node sim/run.js                 an attentive player, acting every 3 seconds
//   node sim/run.js --every 300     someone who checks in every five minutes
//   node sim/run.js --hours 6       stop after six hours of game time
//   node sim/run.js --quiet         only the summary
//   node sim/run.js --eclipses 3    carry on until the third Eclipse (use a large --hours)
//   node sim/run.js --until corona:expansion_tidewater   carry on until that is bought
//   node sim/run.js --list          also list every Eclipse
//   node sim/run.js --tidewater     Tidewater on its own, as if freshly unfolded
//   node sim/run.js --grove         Grove on its own, as if freshly unfolded
//   node sim/run.js --clockwork     Clockwork on its own, with its needs from other worlds waived
//   node sim/run.js --hollow        Hollow on its own, the same way
//   node sim/run.js --stormfront    Stormfront on its own, the same way
import { formatTime } from '../src/core/num.js';
import { simulate } from './bot.js';
import * as cw from '../src/worlds/clockwork.js';
import * as hollow from '../src/worlds/hollow.js';
import * as sf from '../src/worlds/stormfront.js';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] !== undefined ? Number(args[i + 1]) : fallback;
};
const every = arg('every', 3);
const hours = arg('hours', 12);
const eclipses = arg('eclipses', 1);
const untilMark = args.includes('--until') ? args[args.indexOf('--until') + 1] : null;
const alone = args.includes('--tidewater') ? 'tidewater' : args.includes('--grove') ? 'grove' : args.includes('--clockwork') ? 'clockwork' : args.includes('--hollow') ? 'hollow' : args.includes('--stormfront') ? 'stormfront' : null;
const last = { tidewater: 'line:far', grove: 'stand:far', clockwork: 'chime:midnight', hollow: 'chamber:heart', stormfront: 'peal:eye' };
if (alone === 'clockwork') cw.BAL.ignoreNeeds = true;
if (alone === 'hollow') hollow.BAL.ignoreNeeds = true;
if (alone === 'stormfront') sf.BAL.ignoreNeeds = true;

const { marks, lines, state } = simulate({
  every,
  hours,
  keepLog: !args.includes('--quiet'),
  until: alone ? last[alone] : untilMark || 'eclipse:' + eclipses,
  setup: alone ? (s) => { s.atlas.nodes[alone] = true; } : null,
  worlds: alone ? { [alone]: true } : { cinder: true, tidewater: true, grove: true, clockwork: true, hollow: true, stormfront: true },
});
if (lines.length) console.log(lines.join('\n'));
const show = (k) => (marks[k] !== undefined ? formatTime(marks[k]) : 'never');
console.log(`\nActing every ${every}s:`);
if (!alone) {
  console.log(`  Cinder: first burn ${show('firstBurn')}, automation ${show('ash:tender')}, first smelt ${show('firstSmelt')}, shining ${show('end')}`);
  console.log(`  Atlas: first fold ${show('fold:cinder')}, Tidewater ${show('atlas:tidewater')}, Grove ${show('atlas:grove')}, Clockwork ${show('atlas:clockwork')}, Hollow ${show('atlas:hollow')}, Stormfront ${show('atlas:stormfront')}, Eclipse unlocked ${show('atlas:eclipse')}, folds ${state.cinder.folds} + ${state.tidewater.folds} + ${state.grove.folds} + ${state.clockwork.folds} + ${state.hollow.folds} + ${state.stormfront.folds}`);
}
if (!alone || alone === 'tidewater') console.log(`  Tidewater: moon ${show('line:wrack')}, first storm ${show('firstStorm')}, tide tables ${show('drift:tables')}, shining ${show('line:far')}`);
if (!alone || alone === 'grove') console.log(`  Grove: first seedfall ${show('firstSeedfall')}, forester ${show('seed:forester')}, first fire ${show('firstFire')}, shining ${show('stand:far')}`);
if (!alone || alone === 'clockwork') console.log(`  Clockwork: first rewind ${show('firstRewind')}, apprentice ${show('spring:apprentice')}, eighth socket ${show('spring:socket8')}, shining ${show('chime:midnight')}`);
if (!alone || alone === 'hollow') console.log(`  Hollow: first collapse ${show('firstCollapse')}, miner ${show('geode:miner')}, thick seams ${show('geode:seams')}, shining ${show('chamber:heart')}`);
if (!alone || alone === 'stormfront') console.log(`  Stormfront: first pass ${show('firstPass')}, storm spotter ${show('fulg:spotter')}, scorched mast ${show('fulg:keep')}, shining ${show('peal:eye')}`);
if (!alone) {
  // What matters is how long it takes to reach each purchase, however many
  // Eclipses that took.
  const times = [];
  for (let n = 1; marks['eclipse:' + n] !== undefined; n++) times.push(marks['eclipse:' + n]);
  const steps = [
    ['First Eclipse', 'eclipse:1'],
    ['Totality', 'corona:totality'],
    ['All five 2-corona upgrades', 'corona:cheap'],
    ['Star forge (Cinder)', 'corona:expansion_cinder'],
    ['The reef (Tidewater)', 'corona:expansion_tidewater'],
    ['The old wood (Grove)', 'corona:expansion_grove'],
    ['The long case (Clockwork)', 'corona:expansion_clockwork'],
    ['The abyss (Hollow)', 'corona:expansion_hollow'],
    ['The high sky (Stormfront)', 'corona:expansion_stormfront'],
  ];
  let before = 0;
  for (const [label, key] of steps) {
    if (marks[key] === undefined) continue;
    const done = times.filter((t) => t <= marks[key]).length;
    console.log(`  ${label.padEnd(28)} at ${formatTime(marks[key]).padStart(8)}   ${formatTime(marks[key] - before).padStart(8)} after the step before   Eclipses so far: ${done}`);
    before = marks[key];
  }
  if (args.includes('--list')) {
    let prev = 0;
    for (let n = 1; marks['eclipse:' + n] !== undefined; n++) {
      console.log(`  Eclipse ${n}: at ${formatTime(marks['eclipse:' + n])}, took ${formatTime(marks['eclipse:' + n] - prev)}, +${marks['coronaGain:' + n]} corona`);
      prev = marks['eclipse:' + n];
    }
  }
  console.log(`  Corona found ${state.eclipse.totalCorona.toString()} in ${state.eclipse.count} Eclipses, upgrades ${Object.keys(state.eclipse.up).join(', ') || 'none'}, expansions ${Object.keys(state.eclipse.exp).join(', ') || 'none'}`);
}
