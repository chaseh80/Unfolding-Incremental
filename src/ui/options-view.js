// Saving, loading, and a few numbers about the run. Look is in css/worlds/options.css.
import { h, setText, setShown, setClass, toast, confirmBox } from './dom.js';
import { formatInt, formatTemp, formatTime } from '../core/num.js';
import { toExportString, fromExportString } from '../core/save.js';
import { SPLITS, asText } from '../splits.js';

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
    h('div', { class: 'op-keys' },
      h('kbd', {}, 'M'), h('span', {}, 'Buys everything in the current world.'),
      h('kbd', {}, 'B'), h('span', {}, "Does the current world's first reset."),
      h('kbd', {}, 'S'), h('span', {}, 'Strikes in Stormfront.')));

  const STATS = [
    ['Time played', (s) => formatTime(s.playtime)],
    ['Hottest fire', (s) => formatTemp(s.cinder.bestTemp)],
    ['Burns', (s) => s.cinder.burns],
    ['Smelts', (s) => s.cinder.smelts],
    ['Storms', (s) => s.tidewater.storms],
    ['Seedfalls', (s) => s.grove.seedfalls],
    ['Fires', (s) => s.grove.fires],
    ['Rewinds', (s) => s.clockwork.rewinds],
    ['Collapses', (s) => s.hollow.collapses],
    ['Strikes', (s) => s.stormfront.strikes],
    ['Fronts passed', (s) => s.stormfront.fronts],
    ['Starlight gathered', (s) => formatInt(s.atlas.total)],
    ['Eclipses', (s) => s.eclipse.count],
    ['Folds', (s) => s.cinder.folds + s.tidewater.folds + s.grove.folds + s.clockwork.folds + s.hollow.folds + s.stormfront.folds],
  ].map(([label, get]) => ({ label, get, dd: h('b') }));
  const statsBox = h('div', { class: 'box' },
    h('h3', {}, 'Stats'),
    h('div', { class: 'op-tiles' }, STATS.map((x) => h('div', { class: 'op-tile' }, x.dd, h('span', {}, x.label)))));

  // Splits: when each milestone was first reached. Reached ones show, and the
  // next one, so the list unfolds with the game. After a Nova, this run is set
  // against the last one.
  const show = (t) => (t === undefined ? '' : t < 0 ? 'before splits' : formatTime(t));
  const diff = (a, b) => {
    if (a === undefined || b === undefined || a < 0 || b < 0) return '';
    const d = a - b;
    return (d <= 0 ? '−' : '+') + formatTime(Math.abs(d));
  };
  const runHead = h('th', {}, 'This Nova');
  const lastHead = h('th', {}, 'Last Nova');
  const diffHead = h('th', {}, '');
  const rows = SPLITS.map((sp) => {
    const first = h('td');
    const run = h('td');
    const last = h('td');
    const delta = h('td', { class: 'delta' });
    const tr = h('tr', {}, h('td', { class: 'what' }, sp.label), first, run, last, delta);
    return { sp, tr, first, run, last, delta };
  });
  const copySplits = h('button', {
    class: 'act',
    onclick: async () => {
      const text = asText(game.state, formatTime);
      try {
        await navigator.clipboard.writeText(text);
        toast('Splits copied.');
      } catch {
        saveArea.value = text;
        toast('Splits are in the save box.', 'Copy them from there.');
      }
    },
  }, 'Copy splits');
  const splitsBox = h('div', { class: 'box' },
    h('h3', {}, 'Splits'),
    h('table', { class: 'op-splits' },
      h('thead', {}, h('tr', {}, h('th', {}, ''), h('th', {}, 'First reached'), runHead, lastHead, diffHead)),
      h('tbody', {}, rows.map((r) => r.tr))),
    h('div', { class: 'row' }, copySplits));

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

  const el = h('section', { class: 'op', 'data-world': 'options' }, h('div', { class: 'panel' }, saveBox, awayBox, keysBox, splitsBox, statsBox, resetBox));

  function update() {
    const s = game.state;
    if (offline.checked !== s.options.offline) offline.checked = s.options.offline;
    const log = s.splits;
    const novas = s.nova.count;
    setShown(runHead, novas > 0);
    setShown(lastHead, novas > 1);
    setShown(diffHead, novas > 1);
    let ahead = 0;
    for (const r of rows) {
      const reached = r.sp.id in log.first;
      if (!reached) ahead += 1;
      setShown(r.tr, reached || ahead <= 1);
      setClass(r.tr, 'next', !reached);
      setText(r.first, reached ? show(log.first[r.sp.id]) : '');
      const perRun = !r.sp.once;
      setShown(r.run, novas > 0);
      setShown(r.last, novas > 1);
      setShown(r.delta, novas > 1);
      if (novas > 0) setText(r.run, perRun ? show(log.run[r.sp.id]) : '');
      if (novas > 1) {
        setText(r.last, perRun ? show(log.last[r.sp.id]) : '');
        const d = perRun ? diff(log.run[r.sp.id], log.last[r.sp.id]) : '';
        setText(r.delta, d);
        setClass(r.delta, 'ahead', d.startsWith('−'));
      }
    }

    for (const x of STATS) {
      const v = x.get(s);
      setText(x.dd, typeof v === 'number' ? v.toLocaleString('en-US') : v);
    }
  }

  return { el, update, key() {} };
}
