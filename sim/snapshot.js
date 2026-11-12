// Prints a save from partway through a simulated playthrough, ready to paste
// into Options > Import. Useful for looking at later parts of the game
// without playing up to them.
//
//   node sim/snapshot.js 75              a save from 75 minutes into the game
//   node sim/snapshot.js 20 grove        Grove on its own, 20 minutes after it was unfolded
//   node sim/snapshot.js 20 tidewater    the same for Tidewater
import { toExportString } from '../src/core/save.js';
import { simulate } from './bot.js';
import * as cw from '../src/worlds/clockwork.js';
import * as hollow from '../src/worlds/hollow.js';
import * as sf from '../src/worlds/stormfront.js';

const minutes = Number(process.argv[2]) || 60;
const alone = process.argv[3];
if (alone === 'clockwork') cw.BAL.ignoreNeeds = true;
if (alone === 'hollow') hollow.BAL.ignoreNeeds = true;
if (alone === 'stormfront') sf.BAL.ignoreNeeds = true;
const { state } = simulate({
  every: 3,
  hours: minutes / 60,
  setup: alone ? (s) => { s.atlas.nodes[alone] = true; s.atlas.seen = true; s.ui.tab = alone; } : null,
  worlds: alone ? { [alone]: true } : undefined,
});
state.lastSeen = Date.now();
console.log(toExportString(state));
