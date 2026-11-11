// Saving, loading, and a few numbers about the run so far.
import { h, setText, toast, confirmBox } from './dom.js';
import { formatInt, formatTemp, formatTime } from '../core/num.js';
import { toExportString, fromExportString } from '../core/save.js';

export function buildOptions(game) {
  const saveArea = h('textarea', { class: 'save', spellcheck: 'false', placeholder: 'Paste a save here to load it.' });

  const offline = h('input', { type: 'checkbox', onchange: () => { game.state.options.offline = offline.checked; } });

  const saveBox = h('div', { class: 'box' },
    h('h3', {}, 'Your save'),
    h('p', { class: 'desc' }, 'The game saves itself every ten seconds and whenever you close the page. It lives in this browser, so export it now and then if you care about it.'),
    h('div', { class: 'row', style: 'margin: 10px 0' },
      h('button', { class: 'act', onclick: () => (game.save() ? toast('Saved.') : toast("Couldn't save.", 'Your browser refused to store the save.')) }, 'Save now'),
      h('button', {
        class: 'act',
        onclick: async () => {
          game.save();
          saveArea.value = toExportString(game.state);
          saveArea.select();
          try {
            await navigator.clipboard.writeText(saveArea.value);
            toast('Save copied.', "It's on your clipboard and in the box below.");
          } catch {
            toast('Save exported.', 'Copy it out of the box below.');
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
            toast("That doesn't look like a save.", 'Nothing was changed.');
            return;
          }
          confirmBox({
            title: 'Load this save?',
            body: 'It will replace the game you have open right now.',
            yes: 'Load it',
            no: 'Cancel',
            onYes: () => { game.load(raw); toast('Save loaded.'); },
          });
        },
      }, 'Import')),
    saveArea);

  const awayBox = h('div', { class: 'box' },
    h('h3', {}, 'While you are away'),
    h('label', { class: 'check' }, offline, 'Keep every world running while the game is closed.'));

  const keysBox = h('div', { class: 'box' },
    h('h3', {}, 'Keys'),
    h('p', { class: 'desc' }, h('kbd', {}, 'M'), ' buys everything you can afford in the world you are looking at. ', h('kbd', {}, 'B'), ' burns the fire down in Cinder, lets a storm through in Tidewater, and lets the forest fall in Grove.'));

  const stat = () => h('dd');
  const played = stat(), hottest = stat(), burns = stat(), smelts = stat(), storms = stat(), falls = stat(), fires = stat(), stars = stat(), folds = stat();
  const statsBox = h('div', { class: 'box' },
    h('h3', {}, 'So far'),
    h('dl', { class: 'stats' },
      h('dt', {}, 'Time played'), played,
      h('dt', {}, 'Hottest the fire has been'), hottest,
      h('dt', {}, 'Times burned down'), burns,
      h('dt', {}, 'Times smelted'), smelts,
      h('dt', {}, 'Storms let through'), storms,
      h('dt', {}, 'Forests fallen'), falls,
      h('dt', {}, 'Fires let through'), fires,
      h('dt', {}, 'Starlight gathered'), stars,
      h('dt', {}, 'Pages folded'), folds));

  const resetBox = h('div', { class: 'box' },
    h('h3', {}, 'Start over'),
    h('p', { class: 'desc' }, 'Wipes everything and puts you back at a cold hearth. There is no reward for this.'),
    h('div', { class: 'row', style: 'margin-top: 10px' },
      h('button', {
        class: 'act danger',
        onclick: () => confirmBox({
          title: 'Wipe your save?',
          body: "Everything you've done will be gone for good, and this can't be undone.",
          yes: 'Wipe it',
          no: 'Keep playing',
          danger: true,
          onYes: () => game.reset(),
        }),
      }, 'Wipe save')));

  const el = h('section', { class: 'panel' }, saveBox, awayBox, keysBox, statsBox, resetBox);

  function update() {
    const s = game.state;
    if (offline.checked !== s.options.offline) offline.checked = s.options.offline;
    setText(played, formatTime(s.playtime));
    setText(hottest, formatTemp(s.cinder.bestTemp));
    setText(burns, s.cinder.burns.toLocaleString('en-US'));
    setText(smelts, s.cinder.smelts.toLocaleString('en-US'));
    setText(storms, s.tidewater.storms.toLocaleString('en-US'));
    setText(stars, formatInt(s.atlas.total));
    setText(falls, s.grove.seedfalls.toLocaleString('en-US'));
    setText(fires, s.grove.fires.toLocaleString('en-US'));
    setText(folds, (s.cinder.folds + s.tidewater.folds + s.grove.folds).toLocaleString('en-US'));
  }

  return { el, update, key() {} };
}
