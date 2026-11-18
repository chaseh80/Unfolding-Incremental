// The Atlas: where worlds are folded and starlight is spent.
// A star chart with a node for each world. A world that shines lights up, and
// its fold button sits under it. Look is in css/worlds/atlas.css.
import { h, setText, setShown, setClass, setDisabled, confirmBox } from './dom.js';
import { format, formatDown, formatInt, formatTemp } from '../core/num.js';
import * as atlas from '../atlas.js';
import * as ecl from '../eclipse.js';
import { paceMult } from '../worlds/links.js';
import { real, subTabs } from './parts.js';
import { showSvg, rng, makeScene, WORLD_COLOUR as COLOUR } from './scene.js';
import * as cinder from '../worlds/cinder.js';
import * as tw from '../worlds/tidewater.js';
import * as grove from '../worlds/grove.js';
import * as cw from '../worlds/clockwork.js';
import * as hollow from '../worlds/hollow.js';
import * as sf from '../worlds/stormfront.js';

const whole = (x) => formatInt(x);

const NODE_X = (i) => 1600 * (i + 0.5) / 6;
const NODE_Y = (i) => 190 - 80 * Math.sin(Math.PI * (i + 0.5) / 6);

function chartSvg(ids) {
  const r = rng(11);
  let dust = '';
  for (let i = 0; i < 70; i++) {
    const x = (r() * 1600).toFixed(0);
    const y = (r() * 330).toFixed(0);
    const big = r() > 0.85;
    dust += `<circle class="dust ${big ? 'big' : ''}" cx="${x}" cy="${y}" r="${big ? 2.4 : 1.4}"/>`;
  }
  const star = 'M0 -48 L7 -7 L48 0 L7 7 L0 48 L-7 7 L-48 0 L-7 -7 Z';
  const segs = ids.slice(1).map((_, i) =>
    `<line class="seg" id="atl-seg${i}" x1="${NODE_X(i).toFixed(0)}" y1="${NODE_Y(i).toFixed(0)}" x2="${NODE_X(i + 1).toFixed(0)}" y2="${NODE_Y(i + 1).toFixed(0)}"/>`).join('');
  const nodes = ids.map((id, i) =>
    `<g transform="translate(${NODE_X(i).toFixed(0)} ${NODE_Y(i).toFixed(0)})" style="--c:${COLOUR[id]}">
      <circle class="unseen" id="atl-unseen-${id}" r="14"/>
      <g class="node" id="atl-node-${id}"><circle class="halo" r="40"/><path class="spike" d="${star}"/><circle class="ring" r="20"/><circle class="core" r="9"/></g>
    </g>`).join('');
  return `<svg viewBox="0 0 1600 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <rect class="sky" width="1600" height="420"/>
  <circle class="band a" cx="800" cy="640" r="760"/>
  <circle class="band b" cx="800" cy="640" r="700"/>
  <circle class="band c" cx="800" cy="640" r="540"/>
  <circle class="band d" cx="800" cy="640" r="520"/>
  <circle class="spin ticks" cx="800" cy="640" r="730"/>
  ${dust}
  ${segs}
  ${nodes}
  <rect class="ground" y="404" width="1600" height="16"/>
</svg>`;
}

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

  // --- Strip -------------------------------------------------------------

  const starAmount = h('b');
  const starTotal = h('b');
  const strip = h('header', { class: 'atl-strip' },
    h('div', { class: 'atl-stat' }, starAmount, h('span', {}, 'starlight')),
    h('div', { class: 'atl-stat' }, starTotal, h('span', {}, 'gathered in total')));

  // --- The chart: a node for each world, its fold button under it --------------

  const sc = makeScene('atl-scene', chartSvg(WORLDS.map((w) => w.id)));
  const scene = sc.el;
  const segs = WORLDS.slice(1).map((_, i) => sc.q('#atl-seg' + i));

  const cols = WORLDS.map((world) => {
    const rate = h('span', { class: 'rate' });
    const got = h('span', { class: 'got' });
    const btn = h('button', { class: 'act primary', onclick: () => tryFold(world) });
    const el = h('div', { class: 'atl-col', style: `--c: ${COLOUR[world.id]}` }, h('b', {}, world.name), rate, got, btn);
    return { world, el, rate, got, btn, node: sc.q('#atl-node-' + world.id), unseen: sc.q('#atl-unseen-' + world.id) };
  });
  scene.append(h('div', { class: 'atl-cols' }, cols.map((c) => c.el)));

  // --- Automation, once the Cartographer or the Bookbinder is owned -----------

  const autoBuy = h('input', { type: 'checkbox', onchange: () => ecl.setAuto(S(), 'atlas', autoBuy.checked) });
  const autoBuyRow = h('label', { class: 'check' }, autoBuy, 'Buy Atlas upgrades automatically, cheapest first.');
  const autoFold = h('input', { type: 'checkbox', onchange: () => ecl.setAuto(S(), 'fold', autoFold.checked) });
  const foldAt = h('select', { onchange: () => ecl.setAuto(S(), 'foldAt', Number(foldAt.value)) },
    ecl.BAL.autoFoldChoices.map((n) => h('option', { value: String(n) }, n === 1 ? 'as much starlight as' : `${n}× the starlight`)));
  const autoFoldRow = h('label', { class: 'check' }, autoFold, 'Fold a world automatically once it has gathered ', foldAt, ' it has given this Eclipse.');
  const worldAutos = WORLDS.map((world) => {
    const input = h('input', { type: 'checkbox', onchange: () => ecl.setAuto(S(), world.id, input.checked) });
    const text = h('span');
    const el = h('label', { class: 'check', style: `--c: ${COLOUR[world.id]}` }, input, text);
    return { world, el, input, text };
  });
  const autoBox = h('div', { class: 'box' }, h('h3', {}, 'Automation'), autoBuyRow, autoFoldRow,
    h('div', { class: 'atl-autos' }, worldAutos.map((a) => a.el)),
    h('p', { class: 'note' }, 'Never folds a world for less than its Starlit upgrade costs. Each world can be left out.'));

  // --- How each world shines -------------------------------------------------

  const ruleRows = WORLDS.map((world) => {
    const tr = h('tr', { style: `--c: ${COLOUR[world.id]}` }, h('td', {}, world.name), h('td', {}, world.rule));
    return { world, tr };
  });
  const rulesBox = h('div', { class: 'box' }, h('h3', {}, 'Shining'),
    h('p', { class: 'desc' }, 'A world that shines gathers starlight. Folding a world collects it and resets that world only.'),
    h('table', { class: 'breakdown atl-rules' }, ruleRows.map((r) => r.tr)));

  // --- Upgrades --------------------------------------------------------------

  const groups = atlas.GROUPS.map((g) => {
    const nodes = atlas.NODES.filter((n) => n.group === g.id).map((n) => {
      const cost = h('span', { class: 'cost' });
      const el = h('button', { class: 'upgrade', onclick: () => atlas.buy(S(), n.id) },
        h('span', { class: 'name' }, n.name), h('span', { class: 'text' }, n.text), cost);
      return { n, el, cost };
    });
    const el = h('div', { class: 'group', 'data-g': g.id },
      h('h3', {}, g.name), g.text ? h('p', { class: 'desc' }, g.text) : null,
      h('div', { class: 'grid' }, nodes.map((k) => k.el)));
    return { g, el, nodes };
  });

  // --- Tabs: the Atlas itself, then one tab for each world's upgrades -----------
  // Which tab is open only matters to this page, so it is kept here.

  let current = 'main';
  // Nothing is flagged as new here: the page forgets what you have seen on reload.
  const visited = Object.fromEntries(['main', ...WORLDS.map((w) => w.id)].map((id) => ['tab_' + id, true]));
  const general = groups.filter((g) => !COLOUR[g.g.id]);
  const mainPanel = h('div', { class: 'panel' }, scene, autoBox, rulesBox, general.map((g) => g.el));
  const worldTabs = WORLDS.map((world) => {
    const group = groups.find((g) => g.g.id === world.id);
    return { id: world.id, label: world.name, world, group, panel: h('div', { class: 'panel' }, h('p', { class: 'desc' }, world.rule), group.el) };
  });
  const tabs = subTabs([
    { id: 'main', label: 'Atlas', panel: mainPanel },
    ...worldTabs,
  ], {
    current: () => current,
    choose: (id) => { current = id; },
    visited: () => visited,
  });
  for (const t of worldTabs) t.btn.dataset.g = t.id;

  const el = h('section', { class: 'atl', 'data-world': 'atlas' }, strip, tabs.nav, tabs.panels);

  function update() {
    const s = S();
    const a = s.atlas;
    setText(starAmount, whole(a.starlight));
    setText(starTotal, whole(a.total));

    const e = s.eclipse;
    const binder = !!e.up.auto_fold;
    setShown(autoBox, binder || !!e.up.auto_atlas);
    setShown(autoBuyRow, !!e.up.auto_atlas);
    setShown(autoFoldRow, binder);
    if (autoBuy.checked !== e.auto.atlas) autoBuy.checked = e.auto.atlas;
    if (autoFold.checked !== e.auto.fold) autoFold.checked = e.auto.fold;
    if (document.activeElement !== foldAt && Number(foldAt.value) !== e.auto.foldAt) foldAt.value = String(e.auto.foldAt);

    let openCount = 0;
    cols.forEach((c, i) => {
      const open = c.world.open(s);
      if (open) openCount = i + 1;
      showSvg(c.node, open);
      showSvg(c.unseen, !open);
      setShown(c.el, open);
      setShown(ruleRows[i].tr, open);
      const auto = worldAutos[i];
      if (!open) { setShown(auto.el, false); return; }
      const w = s[c.world.id];
      const d = c.world.mod.calc(s);
      const shining = d.shine > 0;
      setClass(c.node, 'shining', shining);
      setText(c.rate, shining ? `${format(real(d.shine, paceMult(s, c.world.id)), 2)} a minute` : 'Not shining');
      setText(c.got, `${formatDown(w.pending)} gathered`);
      const ready = w.pending.gte(1);
      setText(c.btn, ready ? `Fold for ${whole(w.pending)}` : 'Fold');
      setDisabled(c.btn, !ready);
      const showAuto = binder && e.auto.fold;
      setShown(auto.el, showAuto);
      if (showAuto) {
        if (auto.input.checked !== e.auto.worlds[c.world.id]) auto.input.checked = e.auto.worlds[c.world.id];
        setText(auto.text, `${c.world.name}: fold at ${whole(ecl.autoFoldNeed(s, c.world.id))} gathered.`);
      }
    });
    segs.forEach((seg, i) => setClass(seg, 'open', i + 1 < openCount));

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
      g.any = any;
    }

    tabs.update((t) => t.id === 'main' || (t.world.open(s) && t.group.any));
  }

  return { el, update, key() {} };
}
