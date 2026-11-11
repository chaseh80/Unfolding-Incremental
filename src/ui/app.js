// Starts the game in the browser: loads the save, runs the clock, draws the
// current tab, and saves again.
import { newState, loadState, tick, catchUp } from '../game.js';
import { drain } from '../core/events.js';
import { serialize } from '../core/save.js';
import { formatTime } from '../core/num.js';
import { h, setClass, setShown, toast } from './dom.js';
import { buildCinder } from './cinder-view.js';
import { buildTidewater } from './tidewater-view.js';
import { buildGrove } from './grove-view.js';
import { buildAtlas } from './atlas-view.js';
import { buildOptions } from './options-view.js';

const SAVE_KEY = 'manifold.save';
const AWAY_THRESHOLD = 10; // seconds of absence before it counts as being away

// ?speed=20 runs the clock faster. It exists for testing and isn't linked anywhere.
const speed = Math.max(1, Number(new URLSearchParams(location.search).get('speed')) || 1);

const game = {
  state: null,
  save() {
    try {
      game.state.lastSeen = Date.now();
      localStorage.setItem(SAVE_KEY, serialize(game.state));
      return true;
    } catch {
      return false;
    }
  },
  load(raw) {
    game.state = loadState(raw);
    game.state.lastSeen = Date.now();
    drain();
    game.save();
  },
  reset() {
    game.state = newState();
    drain();
    game.save();
  },
};

function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function showEvents() {
  for (const e of drain()) {
    if (e.type === 'ignition') toast(e.name, e.text);
    if (e.type === 'end') toast('The edge of the map has started to curl.', 'The page is shining. Have a look at the Atlas.');
    if (e.type === 'strandline') toast(e.name, e.text);
    if (e.type === 'stand') toast(e.name, e.text);
    if (e.type === 'atlas') toast(e.name, 'Drawn on the Atlas.');
  }
}

function comeBack(seconds) {
  catchUp(game.state, seconds);
  drain();
  toast(`You were away for ${formatTime(seconds)}.`, 'Everything kept going without you.');
}

// --- Boot ------------------------------------------------------------------

const saved = readSave();
game.state = saved ? loadState(saved) : newState();
if (saved) {
  const away = (Date.now() - game.state.lastSeen) / 1000;
  if (away > AWAY_THRESHOLD && game.state.options.offline) comeBack(away);
}
game.state.lastSeen = Date.now();

const views = [
  { id: 'cinder', label: 'Cinder', view: buildCinder(game), open: () => true },
  { id: 'tidewater', label: 'Tidewater', view: buildTidewater(game), open: (s) => !!s.atlas.nodes.tidewater },
  { id: 'grove', label: 'Grove', view: buildGrove(game), open: (s) => !!s.atlas.nodes.grove },
  { id: 'atlas', label: 'Atlas', view: buildAtlas(game), open: (s) => s.atlas.seen },
  { id: 'options', label: 'Options', view: buildOptions(game), open: () => true },
];
for (const v of views) {
  v.btn = h('button', { onclick: () => { game.state.ui.tab = v.id; game.state.ui.visited[v.id] = true; render(); } }, v.label);
}

document.getElementById('app').append(
  h('header', { class: 'top' },
    h('h1', {}, 'Manifold'),
    h('nav', { class: 'tabs' }, views.map((v) => v.btn)),
    h('span', { class: 'version' }, 'v0.3')),
  ...views.map((v) => v.view.el));

function currentView() {
  return views.find((v) => v.id === game.state.ui.tab && v.open(game.state)) || views[0];
}

function render() {
  const s = game.state;
  const current = currentView();
  for (const v of views) {
    const open = v.open(s);
    setShown(v.btn, open);
    setClass(v.btn, 'on', v === current);
    setClass(v.btn, 'fresh', open && v !== current && (v.id === 'tidewater' || v.id === 'grove' || v.id === 'atlas') && !s.ui.visited[v.id]);
    setShown(v.view.el, v === current);
  }
  current.view.update();
}

let last = performance.now();
function frame() {
  const now = performance.now();
  const dt = ((now - last) / 1000) * speed;
  last = now;
  if (dt > AWAY_THRESHOLD * speed) {
    // The tab was asleep or the computer was. Treat it like time away.
    if (game.state.options.offline) comeBack(dt);
  } else {
    tick(game.state, dt);
  }
  game.state.lastSeen = Date.now();
  showEvents();
  render();
}

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  const tag = e.target && e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  if (document.querySelector('.modal-back')) return;
  currentView().view.key(e.key.toLowerCase());
});

setInterval(frame, 50);
setInterval(() => game.save(), 10000);
window.addEventListener('beforeunload', () => game.save());
document.addEventListener('visibilitychange', () => { if (document.hidden) game.save(); });
render();
