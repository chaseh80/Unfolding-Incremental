// Prints a save from partway through a simulated playthrough, ready to paste
// into Options > Import. Useful for looking at later parts of the game
// without playing up to them.
//
//   node sim/snapshot.js 75       a save from 75 minutes in
import { toExportString } from '../src/core/save.js';
import { simulate } from './bot.js';

const minutes = Number(process.argv[2]) || 60;
const { state } = simulate({ every: 3, hours: minutes / 60 });
state.lastSeen = Date.now();
console.log(toExportString(state));
