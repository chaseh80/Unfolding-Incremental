// The Atlas: where worlds are folded and starlight is spent.
import { h, setText, setShown, setClass, setDisabled, confirmBox } from './dom.js';
import { format, formatDown, formatInt, formatTemp } from '../core/num.js';
import * as atlas from '../atlas.js';
import * as ecl from '../eclipse.js';
import { paceMult } from '../worlds/links.js';
import { real } from './parts.js';
import * as cinder from '../worlds/cinder.js';
import * as tw from '../worlds/tidewater.js';
import * as grove from '../worlds/grove.js';
import * as cw from '../worlds/clockwork.js';
import * as hollow from '../worlds/hollow.js';
import * as sf from '../worlds/stormfront.js';

const whole = (x) => formatInt(x);

export function buildAtlas(game) {
  const S = () => game.state;

  const WORLDS = [
    { id: 'cinder', name: 'Cinder', mod: cinder, open: () => true,
      rule: `Shines at ${formatTemp(cinder.BAL.endTemp)}. Doubles every ${cinder.BAL.shineStep}°C past that.` },
    { id: 'tidewater', name: 'Tidewater', mod: tw, open: (s) => atlas.has(s, 'tidewater'),
      rule: 'Shines at the last strandline. Doubles every 100× best tide.' },
    { id: 'grove', name: 'Grove', mod: grove, open: (s) => atlas.has(s, 'grove'),
      rule: 'Shines at the last stand. Doubles every 1,000× forest size.' },
    { id: 'clockwork', name: 'Clockwork', mod: cw, open: (s) => atlas.has(s, 'clockwork'),
      rule: 'Shines at Midnight. Doubles every 1,000× ticks per second.' },
    { id: 'hollow', name: 'Hollow', mod: hollow, open: (s) => atlas.has(s, 'hollow'),
      rule: 'Shines at the last chamber. Doubles every 1,000× best crystal.' },
    { id: 'stormfront', name: 'Stormfront', mod: sf, open: (s) => atlas.has(s, 'stormfront'),
      rule: 'Shines at the last peal. Doubles every 1,000× biggest strike.' },
  ];

  function tryFold(world) {
    const w = S()[world.id];
    if (w.pending.lt(1)) return;
    if (w.folds === 0) {
      confirmBox({
        title: `Fold ${world.name}?`,
        body: `Resets ${world.name} completely. You get ${whole(w.pending)} starlight. Starlight and Atlas upgrades are never lost.`,
        yes: 'Fold',
        onYes: () => world.mod.fold(S()),
      });
      return;
    }
    world.mod.fold(S());
  }

  const starAmount = h('span');
  const starTotal = h('p', { class: 'desc' });

  const worldBoxes = WORLDS.map((world) => {
    const text = h('p', { class: 'desc' });
    const btn = h('button', { class: 'act primary', onclick: () => tryFold(world) });
    // Shown once the Bookbinder is owned: whether it folds this world, and when.
    const auto = h('input', { type: 'checkbox', onchange: () => ecl.setAuto(S(), world.id, auto.checked) });
    const autoText = h('span');
    const autoRow = h('label', { class: 'check' }, auto, autoText);
    const el = h('div', { class: 'box' }, h('h3', {}, world.name), text, h('p', { class: 'note' }, world.rule),
      h('div', { class: 'row', style: 'margin-top: 10px' }, btn), autoRow);
    return { world, el, text, btn, auto, autoText, autoRow };
  });

  const groups = atlas.GROUPS.map((g) => {
    const nodes = atlas.NODES.filter((n) => n.group === g.id).map((n) => {
      const cost = h('span', { class: 'cost' });
      const el = h('button', { class: 'upgrade', onclick: () => atlas.buy(S(), n.id) },
        h('span', { class: 'name' }, n.name), h('span', { class: 'text' }, n.text), cost);
      return { n, el, cost };
    });
    const el = h('div', { class: 'group' },
      h('h2', {}, g.name), g.text ? h('p', { class: 'desc' }, g.text) : null,
      h('div', { class: 'grid' }, nodes.map((k) => k.el)));
    return { g, el, nodes };
  });

  // Switches for what the Cartographer and the Bookbinder do, once owned.
  const autoBuy = h('input', { type: 'checkbox', onchange: () => ecl.setAuto(S(), 'atlas', autoBuy.checked) });
  const autoBuyRow = h('label', { class: 'check' }, autoBuy, 'Buy Atlas upgrades automatically, cheapest first.');
  const autoFold = h('input', { type: 'checkbox', onchange: () => ecl.setAuto(S(), 'fold', autoFold.checked) });
  const foldAt = h('select', { onchange: () => ecl.setAuto(S(), 'foldAt', Number(foldAt.value)) },
    ecl.BAL.autoFoldChoices.map((n) => h('option', { value: String(n) }, n === 1 ? 'as much starlight as' : `${n}× the starlight`)));
  const autoFoldRow = h('label', { class: 'check' }, autoFold, 'Fold a world automatically once it has gathered ', foldAt, ' it has given this Eclipse.');
  const autoBox = h('div', { class: 'box' }, h('h3', {}, 'Automation'), autoBuyRow, autoFoldRow,
    h('p', { class: 'note' }, "Never folds a world for less than its Starlit upgrade costs. Each world can be left out below."));

  const el = h('section', { class: 'panel star-accent' },
    h('div', { class: 'figure' }, starAmount, h('small', {}, 'starlight')),
    starTotal,
    autoBox,
    h('p', { class: 'lead' }, 'A world that shines gathers starlight. Folding a world collects it and resets that world only.'),
    worldBoxes.map((b) => b.el),
    groups.map((g) => g.el));

  function update() {
    const s = S();
    const a = s.atlas;
    setText(starAmount, whole(a.starlight));
    setText(starTotal, `Gathered ${whole(a.total)} starlight in total.`);

    const e = s.eclipse;
    const binder = !!e.up.auto_fold;
    setShown(autoBox, binder || !!e.up.auto_atlas);
    setShown(autoBuyRow, !!e.up.auto_atlas);
    setShown(autoFoldRow, binder);
    if (autoBuy.checked !== e.auto.atlas) autoBuy.checked = e.auto.atlas;
    if (autoFold.checked !== e.auto.fold) autoFold.checked = e.auto.fold;
    if (document.activeElement !== foldAt && Number(foldAt.value) !== e.auto.foldAt) foldAt.value = String(e.auto.foldAt);

    for (const b of worldBoxes) {
      const open = b.world.open(s);
      setShown(b.el, open);
      if (!open) continue;
      const w = s[b.world.id];
      const d = b.world.mod.calc(s);
      if (d.shine > 0) setText(b.text, `${format(real(d.shine, paceMult(s, b.world.id)), 2)} starlight per minute. ${formatDown(w.pending)} gathered since the last fold.`);
      else setText(b.text, w.pending.gte(1) ? `Not shining this fold. ${formatDown(w.pending)} gathered.` : 'Not shining this fold.');
      const ready = w.pending.gte(1);
      setText(b.btn, ready ? `Fold ${b.world.name} for ${whole(w.pending)} starlight` : `Fold ${b.world.name}`);
      setDisabled(b.btn, !ready);
      setShown(b.autoRow, binder && e.auto.fold);
      if (binder && e.auto.fold) {
        if (b.auto.checked !== e.auto.worlds[b.world.id]) b.auto.checked = e.auto.worlds[b.world.id];
        setText(b.autoText, `Fold automatically at ${whole(ecl.autoFoldNeed(s, b.world.id))} gathered.`);
      }
    }

    for (const g of groups) {
      let any = false;
      for (const k of g.nodes) {
        const visible = atlas.available(s, k.n);
        const has = atlas.has(s, k.n.id);
        const can = visible && !has && a.starlight.gte(atlas.costOf(s, k.n));
        setShown(k.el, visible);
        any = any || visible;
        setClass(k.el, 'owned', has);
        setClass(k.el, 'can', can);
        setClass(k.el, 'cant', !has && !can);
        setText(k.cost, has ? 'Bought' : `${whole(atlas.costOf(s, k.n))} starlight`);
      }
      setShown(g.el, any);
    }
  }

  return { el, update, key() {} };
}
