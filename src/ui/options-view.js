// Saving, loading, and a few numbers about the run.
import { h, setText, toast, confirmBox } from './dom.js';
import { formatInt, formatTemp, formatTime } from '../core/num.js';
import { toExportString, fromExportString } from '../core/save.js';

export function buildOptions(game) {
  const saveArea = h('textarea', { class: 'save', spellcheck: 'false', placeholder: 'Paste a save here, then press Import.' });
  const offline = h('input', { type: 'checkbox', onchange: () => { game.state.options.offline = offline.checked; } });

  const saveBox = h('div', { class: 'box' },
    h('h3', {}, 'Save'),
    h('p', { class: 'desc' }, 'Saves every 10 seconds, in this browser only.'),
    h('div', { class: 'row', style: 'margin: 10px 0' },
      h('button', { class: 'act', onclick: () => toast(game.save() ? 'Saved.' : 'Could not save.') }, 'Save'),
      h('button', {
        class: 'act',
        onclick: async () => {
          game.save();
          saveArea.value = toExportString(game.state);
          saveArea.select();
          try {
            await navigator.clipboard.writeText(saveArea.value);
            toast('Save copied.');
          } catch {
            toast('Save exported.', 'Copy it from the box.');
          }
        },
      }, 'Export'),
      h('button', {
        class: 'act',
        onclick: () => {
          let raw;
          try {
            raw = fromExportString(saveArea.value);
          } catch {
            toast('Not a valid save.');
            return;
          }
          confirmBox({
            title: 'Import save?',
            body: 'Replaces your current game.',
            yes: 'Import',
            onYes: () => { game.load(raw); toast('Save imported.'); },
          });
        },
      }, 'Import')),
    saveArea);

  const awayBox = h('div', { class: 'box' },
    h('h3', {}, 'Offline progress'),
    h('label', { class: 'check' }, offline, 'Keep running while the game is closed.'));

  const keysBox = h('div', { class: 'box' },
    h('h3', {}, 'Keys'),
    h('p', { class: 'desc' }, h('kbd', {}, 'M'), ' buys everything in the current world. ', h('kbd', {}, 'B'), " does the current world's first reset."));

  const STATS = [
    ['Time played', (s) => formatTime(s.playtime)],
    ['Hottest fire', (s) => formatTemp(s.cinder.bestTemp)],
    ['Burns', (s) => s.cinder.burns],
    ['Smelts', (s) => s.cinder.smelts],
    ['Storms', (s) => s.tidewater.storms],
    ['Seedfalls', (s) => s.grove.seedfalls],
    ['Fires', (s) => s.grove.fires],
    ['Rewinds', (s) => s.clockwork.rewinds],
    ['Starlight gathered', (s) => formatInt(s.atlas.total)],
    ['Folds', (s) => s.cinder.folds + s.tidewater.folds + s.grove.folds + s.clockwork.folds],
  ].map(([label, get]) => ({ label, get, dd: h('dd') }));
  const statsBox = h('div', { class: 'box' },
    h('h3', {}, 'Stats'),
    h('dl', { class: 'stats' }, STATS.map((x) => [h('dt', {}, x.label), x.dd])));

  const resetBox = h('div', { class: 'box' },
    h('h3', {}, 'Wipe save'),
    h('p', { class: 'desc' }, 'Deletes everything. No reward.'),
    h('div', { class: 'row', style: 'margin-top: 10px' },
      h('button', {
        class: 'act danger',
        onclick: () => confirmBox({
          title: 'Wipe save?',
          body: 'This cannot be undone.',
          yes: 'Wipe',
          danger: true,
          onYes: () => game.reset(),
        }),
      }, 'Wipe save')));

  const el = h('section', { class: 'panel' }, saveBox, awayBox, keysBox, statsBox, resetBox);

  function update() {
    const s = game.state;
    if (offline.checked !== s.options.offline) offline.checked = s.options.offline;
    for (const x of STATS) {
      const v = x.get(s);
      setText(x.dd, typeof v === 'number' ? v.toLocaleString('en-US') : v);
    }
  }

  return { el, update, key() {} };
}
