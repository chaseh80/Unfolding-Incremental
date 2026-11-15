// Plays the game once up to a late point and saves it, so that later tests
// can start from there instead of replaying everything before it.
//
//   node sim/checkpoint.js          writes sim/out/checkpoint-late.json
//   node sim/checkpoint.js --afk    the same for a player who looks in every half hour,
//                                   to sim/out/checkpoint-late-afk.json
//
// The saved point is the start of a fresh run just after the reef is bought:
// well past the first Eclipse, with the Star forge and the reef owned. Rebuild
// it only when something earlier in the game changes.
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { serialize } from '../src/core/save.js';
import { loadState } from '../src/game.js';
import { formatTime } from '../src/core/num.js';
import { simulate } from './bot.js';

/** The two stand-in players: one acting every few seconds, one looking in every half hour. */
export const AFK_EVERY = 1800;
const fileFor = (afk) => new URL(afk ? './out/checkpoint-late-afk.json' : './out/checkpoint-late.json', import.meta.url);
export const CHECKPOINT = fileFor(false);

/** Load the saved point as something `simulate({ from })` accepts. */
export function loadCheckpoint(afk = false) {
  const saved = JSON.parse(readFileSync(fileFor(afk), 'utf8'));
  return { state: loadState(saved.state, 0), t: saved.t, ctx: saved.ctx };
}

// Only build it when this file is run directly, not when it is imported.
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  const afk = process.argv.includes('--afk');
  const every = afk ? AFK_EVERY : 3;
  const base = simulate({ every, hours: 1000, until: 'corona:expansion_tidewater' });
  const fresh = simulate({ every, hours: 48, until: 'eclipse:' + (base.state.eclipse.count + 1), from: base });
  mkdirSync(new URL('./out/', import.meta.url), { recursive: true });
  writeFileSync(fileFor(afk), JSON.stringify({ t: fresh.t, ctx: { ...fresh.ctx, gainSeen: null, lookRate: null }, state: JSON.parse(serialize(fresh.state)) }));
  console.log(afk ? 'A player who looks in every half hour:' : 'A player acting every few seconds:');
  // Whichever 2-corona upgrade was bought last, and the two that automate the Atlas.
  const twos = ['dawn', 'dusk', 'bright', 'cheap', 'hands', 'auto_atlas'].map((id) => base.marks['corona:' + id]);
  base.marks.lastTwo = twos.every((t) => t !== undefined) ? Math.max(...twos) : undefined;
  const steps = [['First Eclipse', 'eclipse:1'], ['Totality', 'corona:totality'], ['Cartographer', 'corona:auto_atlas'], ['Bookbinder', 'corona:auto_fold'], ['Last 2-corona upgrade', 'lastTwo'], ['Star forge', 'corona:expansion_cinder'], ['The reef', 'corona:expansion_tidewater']].sort((a, b) => (base.marks[a[1]] ?? 0) - (base.marks[b[1]] ?? 0));
  let before = 0;
  for (const [label, key] of steps) {
    if (base.marks[key] === undefined) continue;
    console.log(`  ${label.padEnd(24)} at ${formatTime(base.marks[key]).padStart(8)}   ${formatTime(base.marks[key] - before).padStart(8)} after the step before`);
    before = base.marks[key];
  }
  console.log(`Saved the start of a fresh run at ${formatTime(fresh.t)}, ${fresh.state.eclipse.count} Eclipses in, with ${fresh.state.eclipse.totalCorona.toString()} corona found.`);
}
