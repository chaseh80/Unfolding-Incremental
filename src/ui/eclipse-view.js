// The Eclipse tab: the reset above the Atlas, and what corona buys.
// A black disc with a corona that grows with the corona you have found. The
// Eclipse itself is the button in the scene. Look is in css/worlds/eclipse.css.
import { h, setText, setShown, setClass, confirmBox } from './dom.js';
import { subTabs } from './parts.js';
import { formatInt, formatTime } from '../core/num.js';
import { attr, showSvg, dec, rng, makeScene, mainBar } from './scene.js';
import * as ecl from '../eclipse.js';
import { unlocked, BAL as obsBAL } from '../observatory.js';

const whole = (x) => formatInt(x);

const RINGS = [88, 99, 111, 125, 140, 155, 170];
const RAYS = 36;

function eclipseSvg() {
  const r = rng(5);
  const cx = 800;
  const cy = 176;
  const pt = (a, rad) => `${(cx + Math.cos(a) * rad).toFixed(1)} ${(cy + Math.sin(a) * rad).toFixed(1)}`;
  let dust = '';
  for (let i = 0; i < 60; i++) {
    dust += `<circle class="dust" cx="${(r() * 1600).toFixed(0)}" cy="${(r() * 400).toFixed(0)}" r="${r() > 0.9 ? 2.2 : 1.3}"/>`;
  }
  // Streamers, spread round the disc by the golden angle so any count looks even.
  let rays = '';
  for (let i = 0; i < RAYS; i++) {
    const a = ((i * 137.508) % 360) * Math.PI / 180;
    const len = 120 + r() * 170;
    const w = 0.035 + r() * 0.03;
    rays += `<path class="ray ${i % 2 ? 'b' : 'a'}" id="ec-ray${i}" d="M${pt(a - w, 80)} L${pt(a, 80 + len)} L${pt(a + w, 80)} Z"/>`;
  }
  const rings = RINGS.map((rad, i) => `<circle class="ring r${i}" id="ec-ring${i}" cx="${cx}" cy="${cy}" r="${rad}"/>`).reverse().join('');
  const edge = -35 * Math.PI / 180;
  return `<svg viewBox="0 0 1600 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <rect class="sky" width="1600" height="420"/>
  ${dust}
  ${rays}
  ${rings}
  <circle class="disc" cx="${cx}" cy="${cy}" r="80"/>
  <path class="lip" d="M${pt(-80 * Math.PI / 180, 80)} A80 80 0 0 1 ${pt(10 * Math.PI / 180, 80)}"/>
  <circle class="glint-halo" cx="${(cx + Math.cos(edge) * 80).toFixed(1)}" cy="${(cy + Math.sin(edge) * 80).toFixed(1)}" r="15"/>
  <circle class="glint" cx="${(cx + Math.cos(edge) * 80).toFixed(1)}" cy="${(cy + Math.sin(edge) * 80).toFixed(1)}" r="6"/>
  <rect class="ground" y="404" width="1600" height="16"/>
</svg>`;
}

export function buildEclipse(game) {
  const S = () => game.state;
  const E = () => game.state.eclipse;

  function tryEclipse() {
    const d = ecl.calc(S());
    if (!d.ready) return;
    confirmBox({
      title: 'Eclipse?',
      body: `Resets every world, all starlight and every Atlas upgrade. You get ${whole(d.gain)} corona. Corona and what it buys are never lost.`,
      yes: 'Eclipse',
      onYes: () => ecl.eclipse(S()),
    });
  }

  // --- Strip and scene ---------------------------------------------------

  const coronaAmount = h('b');
  const foundText = h('b');
  const strip = h('header', { class: 'ec-strip' },
    h('div', { class: 'ec-stat' }, coronaAmount, h('span', {}, 'corona')),
    h('div', { class: 'ec-stat' }, foundText, h('span', {}, 'found in total')));

  const sc = makeScene('ec-scene', eclipseSvg());
  const scene = sc.el;
  const rings = RINGS.map((_, i) => sc.q('#ec-ring' + i));
  const rays = Array.from({ length: RAYS }, (_, i) => sc.q('#ec-ray' + i));
  const main = mainBar('ec', tryEclipse, 'B');
  scene.append(main.el);

  function updateScene(total) {
    // How far the corona has grown: 0 at none, 1 at ten thousand.
    const f = Math.min(1, dec(total.add(1)) / 4);
    const nRings = 2 + Math.round(f * (RINGS.length - 2));
    const nRays = 6 + Math.round(f * (RAYS - 6));
    rings.forEach((el, i) => showSvg(el, i < nRings));
    rays.forEach((el, i) => showSvg(el, i < nRays));
  }

  const needWorlds = h('p', { class: 'desc' });
  const needNode = h('p', { class: 'desc' });
  const gainText = h('p', { class: 'desc' });
  const timeText = h('p', { class: 'note' });
  const box = h('div', { class: 'box' }, h('h3', {}, 'Eclipse'),
    h('p', { class: 'desc' }, 'Resets every world, all starlight and every Atlas upgrade. Worlds unlock again in the same order.'),
    needWorlds, needNode, gainText, timeText);

  // A charged text with the changed part (in [brackets]) picked out to glow.
  const chargedText = (str) => str.split(/\[(.+?)\]/).map((part, i) => (i % 2 ? h('b', { class: 'up' }, part) : part));

  // A bought upgrade with a charged version takes a charge when clicked.
  // Hovering it shows what the charge would do.
  function clickUpgrade(u) {
    const e = E();
    if (!e.up[u.id]) { ecl.buyUpgrade(S(), u.id); return; }
    if (!u.charged || ecl.charges(S()) < 1) return;
    ecl.setCharge(S(), u.id, !e.plan[u.id]);
    update();
  }

  // One group of cards for each price.
  const tiers = ecl.TIERS.map((cost) => {
    const cards = ecl.UPGRADES.filter((u) => u.cost === cost).map((u) => {
      const price = h('span', { class: 'cost' });
      const hint = h('span', { class: 'hint' });
      const el = h('button', { class: 'upgrade', onclick: () => clickUpgrade(u) },
        h('span', { class: 'name' }, u.name), h('span', { class: 'text' }, u.text),
        u.charged ? h('span', { class: 'ctext' }, chargedText(u.charged)) : null, price, hint);
      return { u, el, price, hint };
    });
    const el = h('div', { class: 'group' },
      h('h3', {}, cards.length === 1 ? `${cost} corona` : `${cost} corona each`),
      h('div', { class: 'grid' }, cards.map((k) => k.el)));
    return { cost, el, cards };
  });
  // Expansions: new content for one world, at a price that rises with each one
  // bought. Each sits in its world's sub-tab.
  const expCards = ecl.EXPANSIONS.map((x) => {
    const progress = h('span', { class: 'need' });
    const price = h('span', { class: 'cost' });
    const note = h('p', { class: 'desc' });
    const el = h('button', { class: 'upgrade', onclick: () => ecl.buyExpansion(S(), x.world) },
      h('span', { class: 'name' }, x.name), h('span', { class: 'text' }, x.text), progress, price);
    const group = h('div', { class: 'group' }, h('h3', {}, 'Expansion'), note, h('div', { class: 'grid' }, el));
    return { x, el, progress, price, note, group };
  });

  // Each world's own upgrades, in that world's sub-tab with its expansion.
  // The price depends on how many of that world's are owned.
  const worldGroups = ecl.WORLDS.map((w) => {
    const note = h('p', { class: 'desc' });
    const cards = ecl.WORLD_UPGRADES.filter((u) => u.world === w.id).map((u) => {
      const price = h('span', { class: 'cost' });
      const el = h('button', { class: 'upgrade', onclick: () => ecl.buyWorldUpgrade(S(), u.id) },
        h('span', { class: 'name' }, u.name), h('span', { class: 'text' }, u.text), price);
      return { u, el, price };
    });
    const el = h('div', { class: 'group' }, h('h3', {}, 'Upgrades'), note, h('div', { class: 'grid' }, cards.map((k) => k.el)));
    const exp = expCards.find((k) => k.x.world === w.id);
    const panel = h('div', { class: 'panel ec-world', 'data-g': w.id },
      h('h2', { class: 'ec-world-name' }, w.name), exp ? exp.group : null, el);
    return { w, el, note, cards, panel };
  });

  // Charges from the Observatory. They are placed on the cards themselves.
  const chargeCount = h('b');
  const chargeNote = h('p', { class: 'desc' });
  const chargeBox = h('div', { class: 'ec-charges' },
    h('div', { class: 'ec-stat' }, chargeCount, h('span', {}, 'charges placed')), chargeNote);

  // Aperture never runs out.
  const aperturePrice = h('span', { class: 'cost' });
  const apertureText = h('span', { class: 'text' });
  const apertureCard = h('button', { class: 'upgrade', onclick: () => ecl.buyAperture(S()) },
    h('span', { class: 'name' }, 'Aperture'), apertureText, aperturePrice);
  const apertureGroup = h('div', { class: 'group' }, h('h3', {}, 'Again and again'),
    h('div', { class: 'grid' }, apertureCard));

  const upgrades = h('div', {},
    chargeBox, tiers.map((t) => t.el), apertureGroup);

  const endNotice = h('div', { class: 'notice' },
    h('h3', {}, 'Observatory'),
    h('p', { class: 'desc' }, 'Opens with your first expansion.'));

  const mainPanel = h('div', { class: 'panel' }, scene, endNotice, box, upgrades);
  // Sub-tabs: the Eclipse itself and the general upgrades, then one per world.
  const tabList = [
    { id: 'eclipse', label: 'Eclipse', panel: mainPanel, open: () => true },
    ...worldGroups.map((g) => ({ id: g.w.id, label: g.w.name, panel: g.panel, open: (e) => e.count >= 1 })),
  ];
  const tabs = subTabs(tabList, {
    current: () => S().ui.eclipseTab,
    choose: (id) => { S().ui.eclipseTab = id; update(); },
    visited: () => S().ui.visited,
  });
  for (const t of tabList.slice(1)) t.btn.dataset.g = t.id;

  const el = h('section', { class: 'ec', 'data-world': 'eclipse' }, strip, tabs.nav, tabs.panels);

  function update() {
    const s = S();
    const e = E();
    const d = ecl.calc(s);
    tabs.update((t) => t.open(e));
    setText(coronaAmount, whole(e.corona));
    setText(foundText, whole(e.totalCorona));
    updateScene(e.totalCorona);
    setShown(endNotice, e.count >= 1 && !unlocked(s));

    const dark = ecl.WORLDS.filter((w, i) => !d.lit[i]).map((w) => w.name);
    setText(needWorlds, dark.length === 0
      ? 'Every world is shining.'
      : `Needs every world shining this fold. Not shining: ${dark.join(', ')}.`);
    setShown(needNode, !d.hasNode);
    setText(needNode, 'Needs the Eclipse upgrade in the Atlas.');
    setShown(gainText, d.hasNode);
    setText(gainText, `Gathered ${whole(s.atlas.total)} starlight this Eclipse. The next corona is at ${whole(d.nextAt)}.`);
    let times = `This Eclipse: ${formatTime(e.time)}.`;
    if (e.count > 0) times += ` Last: ${formatTime(e.lastTime)}. Quickest: ${formatTime(e.bestTime)}.`;
    setText(timeText, times);
    main.set({ label: d.ready ? `Eclipse for ${whole(d.gain)} corona` : 'Eclipse', enabled: d.ready, hotkey: false });

    setShown(upgrades, e.count >= 1);
    if (e.count < 1) return;
    const worldsOpen = ecl.worldUpgradesOpen(e);
    for (const g of worldGroups) {
      setShown(g.el, worldsOpen);
      if (!worldsOpen) continue;
      const cost = ecl.worldCost(e, g.w.id);
      const left = g.cards.filter((k) => !e.up[k.u.id]).length;
      setText(g.note, left > 0 ? `The next upgrade here costs ${cost} corona.` : 'All bought.');
      for (const k of g.cards) {
        const owned = !!e.up[k.u.id];
        const can = !owned && e.corona.gte(cost);
        setText(k.price, owned ? 'Bought' : `${cost} corona`);
        setClass(k.el, 'owned', owned);
        setClass(k.el, 'can', can);
        setClass(k.el, 'cant', !owned && !can);
      }
    }
    const have = ecl.charges(s);
    const placed = ecl.planned(e);
    setShown(chargeBox, have > 0);
    if (have > 0) {
      setText(chargeCount, `${placed} / ${have}`);
      setText(chargeNote, ecl.chargesPending(e)
        ? 'Click a bought upgrade to charge it. Your changes take effect at the next Eclipse.'
        : 'Click a bought upgrade to charge it. Hover one to see its charged version.');
    }
    const apertureOpen = ecl.apertureOpen(s);
    setShown(apertureGroup, apertureOpen);
    if (apertureOpen) {
      const cost = ecl.apertureCost(e);
      setText(apertureText, `Telescopes ${obsBAL.apertureMult}× faster for each level. Level ${e.aperture}.`);
      setText(aperturePrice, `${whole(cost)} corona`);
      setClass(apertureCard, 'can', e.corona.gte(cost));
      setClass(apertureCard, 'cant', e.corona.lt(cost));
    }
    const expCost = ecl.expansionCost(e);
    for (const k of expCards) {
      const owned = !!e.exp[k.x.world];
      setText(k.note, owned ? 'New content for this world.' : 'New content for this world. Each expansion bought makes the others cost more.');
      const can = !owned && e.corona.gte(expCost);
      setText(k.price, owned ? 'Bought' : `${whole(expCost)} corona`);
      setShown(k.progress, owned);
      if (owned) setText(k.progress, `Reached ${e.depth[k.x.world]} of ${k.x.most} this Eclipse.`);
      setClass(k.el, 'owned', owned);
      setClass(k.el, 'can', can);
      setClass(k.el, 'cant', !owned && !can);
    }
    for (const t of tiers) {
      const open = ecl.tierOpen(e, t.cost);
      setShown(t.el, open);
      if (!open) continue;
      for (const k of t.cards) {
        const owned = !!e.up[k.u.id];
        const can = !owned && e.corona.gte(k.u.cost);
        const chg = owned && !!k.u.charged && have > 0;
        const plan = chg && !!e.plan[k.u.id];
        const now = !!e.charge[k.u.id];
        let price = owned ? 'Bought' : `${k.u.cost} corona`;
        if (plan) price = now ? 'Charged' : 'Charged next Eclipse';
        else if (now) price = 'Charge ends next Eclipse';
        setText(k.price, price);
        if (chg) setText(k.hint, plan ? 'Click to take the charge off' : placed < have ? 'Click to charge' : 'No charges left');
        setClass(k.el, 'owned', owned);
        setClass(k.el, 'can', can);
        setClass(k.el, 'cant', !owned && !can);
        setClass(k.el, 'chg', chg);
        setClass(k.el, 'full', chg && !plan && placed >= have);
        setClass(k.el, 'charged', plan);
        setClass(k.el, 'pending', chg && plan !== now);
      }
    }
  }

  return { el, update, key() {} };
}
