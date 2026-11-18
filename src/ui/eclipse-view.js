// The Eclipse tab: the reset above the Atlas, and what corona buys.
// A black disc with a corona that grows with the corona you have found. The
// Eclipse itself is the button in the scene. Look is in css/worlds/eclipse.css.
import { h, setText, setShown, setClass, setDisabled, confirmBox } from './dom.js';
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

  // One group of cards for each price.
  const tiers = ecl.TIERS.map((cost) => {
    const cards = ecl.UPGRADES.filter((u) => u.cost === cost).map((u) => {
      const price = h('span', { class: 'cost' });
      const el = h('button', { class: 'upgrade', onclick: () => ecl.buyUpgrade(S(), u.id) },
        h('span', { class: 'name' }, u.name), h('span', { class: 'text' }, u.text), price);
      return { u, el, price };
    });
    const el = h('div', { class: 'group' },
      h('h3', {}, cards.length === 1 ? `${cost} corona` : `${cost} corona each`),
      h('div', { class: 'grid' }, cards.map((k) => k.el)));
    return { cost, el, cards };
  });
  // Each world's own upgrades. The price depends on how many of that world's are owned.
  const worldGroups = ecl.WORLDS.map((w) => {
    const note = h('p', { class: 'desc' });
    const cards = ecl.WORLD_UPGRADES.filter((u) => u.world === w.id).map((u) => {
      const price = h('span', { class: 'cost' });
      const el = h('button', { class: 'upgrade', onclick: () => ecl.buyWorldUpgrade(S(), u.id) },
        h('span', { class: 'name' }, u.name), h('span', { class: 'text' }, u.text), price);
      return { u, el, price };
    });
    const el = h('div', { class: 'group', 'data-g': w.id }, h('h3', {}, w.name), note, h('div', { class: 'grid' }, cards.map((k) => k.el)));
    return { w, el, note, cards };
  });

  // Expansions: new content for one world, at a price that rises with each one bought.
  const expCards = ecl.EXPANSIONS.map((x) => {
    const world = ecl.WORLDS.find((w) => w.id === x.world).name;
    const progress = h('span', { class: 'need' });
    const price = h('span', { class: 'cost' });
    const el = h('button', { class: 'upgrade', onclick: () => ecl.buyExpansion(S(), x.world) },
      h('span', { class: 'name' }, `${x.name} (${world})`), h('span', { class: 'text' }, x.text), progress, price);
    return { x, el, progress, price };
  });
  const expNote = h('p', { class: 'desc' });
  const expGroup = h('div', { class: 'group' }, h('h3', {}, 'Expansions'), expNote,
    h('div', { class: 'grid' }, expCards.map((k) => k.el)));

  // Charges from the Observatory: one row for each upgrade that can take one.
  const chargeRows = ecl.UPGRADES.filter((u) => u.charged).map((u) => {
    const box = h('input', { type: 'checkbox', onchange: () => { ecl.setCharge(S(), u.id, box.checked); update(); } });
    const now = h('span', { class: 'muted' });
    const el = h('label', { class: 'check' }, box, h('b', {}, u.name), `${u.charged}`, now);
    return { u, el, box, now };
  });
  const chargeNote = h('p', { class: 'desc' });
  const chargeBox = h('div', { class: 'box' }, h('h3', {}, 'Charges'), chargeNote, chargeRows.map((r) => r.el));

  // Aperture never runs out.
  const aperturePrice = h('span', { class: 'cost' });
  const apertureText = h('span', { class: 'text' });
  const apertureCard = h('button', { class: 'upgrade', onclick: () => ecl.buyAperture(S()) },
    h('span', { class: 'name' }, 'Aperture'), apertureText, aperturePrice);
  const apertureGroup = h('div', { class: 'group' }, h('h3', {}, 'Again and again'),
    h('div', { class: 'grid' }, apertureCard));

  const upgrades = h('div', {},
    h('p', { class: 'lead' }, 'Corona upgrades are never lost. Owning one from a price opens the next price.'),
    chargeBox, tiers.map((t) => t.el), apertureGroup, expGroup, worldGroups.map((g) => g.el));

  const endNotice = h('div', { class: 'notice' },
    h('h3', {}, 'Observatory'),
    h('p', { class: 'desc' }, 'Opens with your first expansion.'));

  const el = h('section', { class: 'ec', 'data-world': 'eclipse' }, strip,
    h('div', { class: 'panel' }, scene, endNotice, box, upgrades));

  function update() {
    const s = S();
    const e = E();
    const d = ecl.calc(s);
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
    setShown(chargeBox, have > 0);
    if (have > 0) {
      const placed = ecl.planned(e);
      setText(chargeNote, `${placed} of ${have} placed. A charge makes an upgrade you own stronger. Charges can be moved freely and take effect at the next Eclipse.${ecl.chargesPending(e) ? ' Changes are waiting for an Eclipse.' : ''}`);
      for (const r of chargeRows) {
        const owned = !!e.up[r.u.id];
        setShown(r.el, owned);
        if (!owned) continue;
        if (r.box.checked !== !!e.plan[r.u.id]) r.box.checked = !!e.plan[r.u.id];
        setDisabled(r.box, !e.plan[r.u.id] && placed >= have);
        setText(r.now, e.charge[r.u.id] ? 'Charged now.' : '');
      }
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
    setText(expNote, 'New content for one world. Each expansion bought makes the others cost more.');
    for (const k of expCards) {
      const owned = !!e.exp[k.x.world];
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
        setText(k.price, owned ? 'Bought' : `${k.u.cost} corona`);
        setClass(k.el, 'owned', owned);
        setClass(k.el, 'can', can);
        setClass(k.el, 'cant', !owned && !can);
      }
    }
  }

  return { el, update, key() {} };
}
