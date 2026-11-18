// Splits: the time each milestone was first reached, like a speedrun.
//
// Two records are kept. `first` is the first time ever, in time played since
// the save began, and is never reset. `run` is the same list for the current
// Nova, timed from the Nova; at a Nova it moves to `last`, so this run can be
// compared with the one before.
//
// Milestones are checked about once a second from game.tick, so they are also
// caught while the game catches up on time away and in the simulator.
// A save made before splits existed marks what it has already reached as
// "before splits were kept" (-1) instead of pretending it just happened.
import { WORLDS, EXPANSIONS } from './eclipse.js';
import { totalStars } from './observatory.js';

const RESETS = {
  tidewater: ['storms', 'First storm'],
  grove: ['seedfalls', 'First seedfall'],
  clockwork: ['rewinds', 'First rewind'],
  hollow: ['collapses', 'First collapse'],
  stormfront: ['fronts', 'First front passes'],
};

const shines = (s, id) => WORLDS.find((w) => w.id === id).mod.calc(s).shine > 0;

function build() {
  const list = [
    { id: 'burn', group: 'Cinder', label: 'First burn down', test: (s) => s.cinder.burns > 0 },
    { id: 'smelt', group: 'Cinder', label: 'First smelt', test: (s) => s.cinder.smelts > 0 },
    { id: 'shine_cinder', group: 'Cinder', label: 'Cinder shines', test: (s) => shines(s, 'cinder') },
    { id: 'fold', group: 'Cinder', label: 'First fold', test: (s) => s.atlas.total.gt(0) },
  ];
  for (const w of WORLDS.slice(1)) {
    const [field, label] = RESETS[w.id];
    list.push(
      { id: 'open_' + w.id, group: w.name, label: `${w.name} opened`, test: (s) => !!s.atlas.nodes[w.id] },
      { id: 'reset_' + w.id, group: w.name, label, test: (s) => s[w.id][field] > 0 },
      { id: 'shine_' + w.id, group: w.name, label: `${w.name} shines`, test: (s) => shines(s, w.id) },
    );
  }
  list.push(
    { id: 'eclipse_node', group: 'Eclipse', label: 'Eclipse bought in the Atlas', test: (s) => !!s.atlas.nodes.eclipse },
    { id: 'eclipse', group: 'Eclipse', label: 'First Eclipse', test: (s) => s.eclipse.count > 0 },
    { id: 'totality', group: 'Eclipse', label: 'Totality', test: (s) => !!s.eclipse.up.totality && s.eclipse.count > 0 },
    { id: 'cartographer', group: 'Eclipse', label: 'Cartographer', test: (s) => !!s.eclipse.up.auto_atlas && s.eclipse.count > 0 },
    { id: 'bookbinder', group: 'Eclipse', label: 'Bookbinder', test: (s) => !!s.eclipse.up.auto_fold },
  );
  for (const x of EXPANSIONS) {
    list.push({ id: 'exp_' + x.world, group: 'Eclipse', label: x.name, test: (s) => !!s.eclipse.exp[x.world] });
  }
  list.push({ id: 'observatory', group: 'Observatory', label: 'Observatory opened', test: (s) => Object.values(s.eclipse.exp).some(Boolean) });
  for (const n of [1, 10, 20, 30, 38, 48]) {
    list.push({ id: 'stars_' + n, group: 'Observatory', label: n === 1 ? 'First star' : `${n} stars`, test: (s) => totalStars(s) >= n });
  }
  list.push({ id: 'nova', group: 'Nova', label: 'First Nova', test: (s) => s.nova.count > 0, once: true });
  return list;
}

export const SPLITS = build();

export function defaults() {
  return {
    first: {}, // id -> seconds played when first reached (-1: before splits were kept)
    run: {}, // id -> seconds into this Nova
    last: {}, // the previous Nova's `run`
    began: false, // whether a first check has been made on this save
    wait: 0,
    notes: [], // the player's own notes: { t: seconds played, after: last milestone reached, text }
  };
}

/** The milestone reached most recently, to place a note. */
function lastReached(state) {
  const log = state.splits;
  let best = null;
  let bestT = -Infinity;
  for (const sp of SPLITS) {
    const t = log.first[sp.id];
    if (t === undefined) continue;
    if (t >= bestT) { best = sp; bestT = t; }
  }
  return best ? best.label : 'the start';
}

export function addNote(state, text) {
  const clean = String(text || '').trim().slice(0, 500);
  if (!clean) return false;
  state.splits.notes.push({ t: state.playtime, nova: state.nova.count, after: lastReached(state), text: clean });
  return true;
}

export function removeNote(state, i) {
  state.splits.notes.splice(i, 1);
}

/** Seconds into the current Nova (the whole game before the first). */
function runTime(state) {
  return state.nova.count > 0 ? state.nova.time : state.playtime;
}

function check(state) {
  const log = state.splits;
  const fresh = !log.began;
  log.began = true;
  for (const sp of SPLITS) {
    const inFirst = sp.id in log.first;
    const inRun = sp.id in log.run;
    if (inFirst && (inRun || sp.once)) continue;
    if (!sp.test(state)) continue;
    if (!inFirst) log.first[sp.id] = fresh ? -1 : state.playtime;
    if (!inRun && !sp.once) log.run[sp.id] = fresh ? -1 : runTime(state);
  }
}

/** Called by Nova: this run's splits become the last run's. */
export function newRun(state) {
  const log = state.splits;
  log.last = log.run;
  log.run = {};
}

export function tick(state, dt) {
  const log = state.splits;
  log.wait += dt;
  if (log.began && log.wait < 1) return;
  log.wait = 0;
  check(state);
}

/** The splits as plain text, to paste somewhere. */
export function asText(state, fmt) {
  const log = state.splits;
  const show = (t) => (t === undefined ? '-' : t < 0 ? 'before splits' : fmt(t));
  const lines = [`Manifold splits. Played ${fmt(state.playtime)}. Novas: ${state.nova.count}.`, ''];
  lines.push(['Milestone', 'First ever', state.nova.count > 0 ? 'This Nova' : '', state.nova.count > 1 ? 'Last Nova' : ''].filter(Boolean).join(' | '));
  for (const sp of SPLITS) {
    if (!(sp.id in log.first)) continue;
    const row = [sp.label, show(log.first[sp.id])];
    if (state.nova.count > 0 && !sp.once) row.push(show(log.run[sp.id]));
    if (state.nova.count > 1 && !sp.once) row.push(show(log.last[sp.id]));
    lines.push(row.join(' | '));
  }
  if (log.notes.length) {
    lines.push('', 'Notes');
    for (const n of log.notes) lines.push(`${fmt(n.t)} (after ${n.after}${n.nova ? `, Nova ${n.nova}` : ''}): ${n.text}`);
  }
  return lines.join('\n');
}
