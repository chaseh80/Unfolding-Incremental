// Prints a timeline of one simulated playthrough.
//
//   node sim/run.js                 an attentive player, acting every 3 seconds
//   node sim/run.js --every 300     someone who checks in every five minutes
//   node sim/run.js --hours 6       stop after six hours of game time
//   node sim/run.js --quiet         only the summary
//   node sim/run.js --tidewater     Tidewater on its own, as if freshly unfolded
//   node sim/run.js --grove         Grove on its own, as if freshly unfolded
//   node sim/run.js --clockwork     Clockwork on its own, with its needs from other worlds waived
import { formatTime } from '../src/core/num.js';
import { simulate } from './bot.js';
import * as cw from '../src/worlds/clockwork.js';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] !== undefined ? Number(args[i + 1]) : fallback;
};
const every = arg('every', 3);
const hours = arg('hours', 12);
const alone = args.includes('--tidewater') ? 'tidewater' : args.includes('--grove') ? 'grove' : args.includes('--clockwork') ? 'clockwork' : null;
const last = { tidewater: 'line:far', grove: 'stand:far', clockwork: 'chime:midnight' };
if (alone === 'clockwork') cw.BAL.ignoreNeeds = true;

const { marks, lines, state } = simulate({
  every,
  hours,
  keepLog: !args.includes('--quiet'),
  until: alone ? last[alone] : 'atlas:hollow',
  setup: alone ? (s) => { s.atlas.nodes[alone] = true; } : null,
  worlds: alone ? { [alone]: true } : { cinder: true, tidewater: true, grove: true, clockwork: true },
});
if (lines.length) console.log(lines.join('\n'));
const show = (k) => (marks[k] !== undefined ? formatTime(marks[k]) : 'never');
console.log(`\nActing every ${every}s:`);
if (!alone) {
  console.log(`  Cinder: first burn ${show('firstBurn')}, automation ${show('ash:tender')}, first smelt ${show('firstSmelt')}, shining ${show('end')}`);
  console.log(`  Atlas: first fold ${show('fold:cinder')}, Tidewater ${show('atlas:tidewater')}, Grove ${show('atlas:grove')}, Clockwork ${show('atlas:clockwork')}, Hollow ${show('atlas:hollow')}, folds ${state.cinder.folds} + ${state.tidewater.folds} + ${state.grove.folds} + ${state.clockwork.folds}`);
}
if (!alone || alone === 'tidewater') console.log(`  Tidewater: moon ${show('line:wrack')}, first storm ${show('firstStorm')}, tide tables ${show('drift:tables')}, shining ${show('line:far')}`);
if (!alone || alone === 'grove') console.log(`  Grove: first seedfall ${show('firstSeedfall')}, forester ${show('seed:forester')}, first fire ${show('firstFire')}, shining ${show('stand:far')}`);
if (!alone || alone === 'clockwork') console.log(`  Clockwork: first rewind ${show('firstRewind')}, apprentice ${show('spring:apprentice')}, eighth socket ${show('spring:socket8')}, shining ${show('chime:midnight')}`);
