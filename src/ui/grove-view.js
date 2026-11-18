// Everything you see while looking at Grove.
import { h, setText, setShown, setClass, confirmBox } from './dom.js';
import { Decimal, format, formatInt, formatMult, formatTime } from '../core/num.js';
import { setWidth, upgradeGrid, subTabs, pointList, resetBox, breakdown, shineStat, dial, real } from './parts.js';
import { f0, attr, showSvg, dec, rng, makeScene, mainBar } from './scene.js';
import * as grove from '../worlds/grove.js';
import { paceMult } from '../worlds/links.js';

const amount = (x) => format(x, 1);
const whole = (x) => formatInt(x);
const STANDS = grove.STANDS;
const indexOf = (id) => STANDS.findIndex((p) => p.id === id);

function eta(seconds) {
  if (!Number.isFinite(seconds) || seconds > 3e7) return 'a very long time';
  if (seconds < 1) return 'under 1s';
  return formatTime(seconds);
}

export function buildGrove(game) {
  const S = () => game.state;
  const pace = () => paceMult(game.state, 'grove');
  const G = () => game.state.grove;

  function tryFall() {
    const g = G();
    const d = grove.calc(S());
    if (!d.canSeedfall || d.seedGain.lt(1)) return;
    if (g.seedfalls === 0 && g.fires === 0) {
      confirmBox({
        title: 'Seedfall?',
        body: `Resets trees, roots, canopy and age. You get ${whole(d.seedGain)} seeds.`,
        yes: 'Seedfall',
        onYes: () => grove.seedfall(S()),
      });
      return;
    }
    grove.seedfall(S());
  }

  function tryFire() {
    const g = G();
    const d = grove.calc(S());
    if (!d.canFire || d.loamGain.lt(1)) return;
    if (g.fires === 0) {
      confirmBox({
        title: 'Fire?',
        body: `Resets the forest, seeds and Seed upgrades. You get ${whole(d.loamGain)} loam.`,
        yes: 'Burn',
        onYes: () => grove.wildfire(S()),
      });
      return;
    }
    grove.wildfire(S());
  }

  // --- Strip -------------------------------------------------------------

  const treeAmount = h('b');
  const roomAmount = h('b');
  const sapAmount = h('b');
  const fullAmount = h('b');
  const speedText = h('div', { class: 'gr-speed' });
  const strip = h('header', { class: 'gr-strip' },
    h('div', { class: 'gr-stat' }, treeAmount, h('span', {}, 'trees')),
    h('div', { class: 'gr-stat' }, roomAmount, h('span', {}, 'room')),
    h('div', { class: 'gr-stat' }, sapAmount, h('span', {}, 'sap per second')),
    h('div', { class: 'gr-stat' }, fullAmount, h('span', {}, 'full')),
    speedText);

  function updateStrip(g, d) {
    setText(treeAmount, g.planted ? amount(g.trees) : '0');
    setText(roomAmount, g.planted ? amount(d.room) : '-');
    setText(sapAmount, g.planted ? amount(real(d.sap, pace())) : '0');
    setText(fullAmount, g.planted ? `${Math.floor(d.fullness * 100)}%` : '-');
    setShown(speedText, pace() > 1);
    setText(speedText, `Gamespeed: ${whole(pace())}×`);
  }

  // --- The forest --------------------------------------------------------
  // Flat layers: a low sun, two ridges, three rows of trees, and a floor of
  // leaf litter. More trees stand as the forest fills its room. Seeds lie on
  // the floor, loam banks up at the right, a stump keeps the rings of its age.

  const SLOTS = 24;
  function treeSvg() {
    const r = rng(5);
    let s = '<svg viewBox="0 0 1600 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
    s += '<rect width="1600" height="420" fill="#0a120c"/><rect y="90" width="1600" height="90" fill="#0f1b10"/><rect y="180" width="1600" height="80" fill="#17291a"/><rect y="250" width="1600" height="170" fill="#233a22"/>';
    s += '<g fill="#e9d98f"><circle cx="1180" cy="262" r="150" opacity=".04"/><circle cx="1180" cy="262" r="110" opacity=".06"/><circle cx="1180" cy="262" r="84" opacity=".09"/><circle cx="1180" cy="262" r="58" opacity="1"/></g>';
    s += '<polygon points="0 300 160 262 340 282 520 244 720 276 900 250 1100 286 1300 252 1480 280 1600 262 1600 420 0 420" fill="#162a1a"/>';
    s += '<polygon points="0 330 200 300 380 322 600 288 820 318 1040 296 1260 326 1440 300 1600 322 1600 420 0 420" fill="#101f13"/>';
    // Three rows of trees: far, middle, near. Each is a pine or a round-headed tree.
    const rows = [{ y: 304, k: 0.6, c: '#0d1a10' }, { y: 340, k: 0.85, c: '#08130a' }, { y: 380, k: 1.15, c: '#050a05' }];
    const slots = [];
    rows.forEach((row, ri) => {
      for (let i = 0; i < SLOTS / 3; i++) slots.push({ x: 90 + (i + r() * 0.8) * (1420 / (SLOTS / 3)), row, type: r() > 0.45 ? 'pine' : 'round', j: 0.85 + r() * 0.35 });
    });
    // Fill order is mixed, so the forest thickens everywhere.
    const order = slots.map((_, i) => i).sort(() => r() - 0.5);
    s += '<g class="trees">';
    order.forEach((idx, rank) => {
      const t = slots[idx];
      const sz = t.row.k * t.j;
      const body = t.type === 'pine'
        ? '<rect x="-4" y="-22" width="8" height="22"/><polygon points="-34 -20 0 -88 34 -20"/><polygon points="-28 -58 0 -118 28 -58"/><polygon points="-20 -92 0 -144 20 -92"/>'
        : '<rect x="-5" y="-40" width="10" height="40"/><polygon points="-44 -62 -30 -100 -6 -122 22 -120 42 -98 46 -64 24 -38 -22 -38"/>';
      s += `<g class="tree" data-i="${rank}" transform="translate(${f0(t.x)} ${t.row.y})"><g transform="scale(${sz.toFixed(2)})" fill="${t.row.c}" class="rim">${body}</g></g>`;
    });
    s += '</g>';
    // The sapling, for a forest that has barely begun.
    s += '<g id="gr-sapling" class="rim" fill="#050a05" transform="translate(800 384)"><rect x="-2" y="-18" width="4" height="18"/><polygon points="-14 -14 0 -40 14 -14"/></g>';
    // The floor: dark soil with leaf litter.
    s += '<rect y="384" width="1600" height="36" fill="#060a06"/>';
    const lit = ['#14240f', '#1c2a12', '#232812', '#101c0d'];
    for (let i = 0; i < 90; i++) {
      const x = r() * 1600, y = 392 + r() * 26, w = 7 + r() * 13;
      s += `<polygon points="${f0(x)} ${f0(y)} ${f0(x + w / 2)} ${f0(y - 3)} ${f0(x + w)} ${f0(y)} ${f0(x + w / 2)} ${f0(y + 3)}" fill="${lit[i % 4]}"/>`;
    }
    // Seeds on the floor.
    for (let i = 0; i < 6; i++) s += `<g class="seedlet" data-i="${i}"><polygon points="${f0(1090 + i * 22)} 404 ${f0(1096 + i * 22)} 396 ${f0(1102 + i * 22)} 404 ${f0(1096 + i * 22)} 410" fill="#d8c66a"/></g>`;
    // The stump, with a ring for each doubling of its age.
    s += '<g id="gr-stump" class="rim"><polygon points="240 420 246 392 380 392 388 420" fill="#050a05"/><ellipse cx="313" cy="392" rx="68" ry="12" fill="#6b4a2c"/><g fill="none" stroke="#3b2a18" stroke-width="2">';
    for (let i = 0; i < 4; i++) s += `<ellipse class="ring" data-i="${i}" cx="313" cy="392" rx="${f0(58 - i * 14)}" ry="${f0(9 - i * 2)}"/>`;
    s += '</g></g>';
    s += '<polygon id="gr-loam" class="loam" points="0 0"/>';
    // Fireflies.
    s += '<g class="flies">';
    for (let i = 0; i < 9; i++) s += `<g class="fly" style="animation-delay:${-i * 1.6}s;animation-duration:${12 + (i % 3) * 3}s;--dx:${f0((r() - 0.5) * 70)}px"><rect x="${f0(160 + r() * 1300)}" y="${f0(260 + r() * 110)}" width="4" height="4" fill="#e9e07a"/></g>`;
    s += '</g></svg>';
    return s;
  }

  const sc = makeScene('gr-scene', treeSvg());
  const scene = sc.el;
  const trees = sc.qa('.tree');
  const sapling = sc.q('#gr-sapling');
  const seedlets = sc.qa('.seedlet');
  const stump = sc.q('#gr-stump');
  const rings = sc.qa('.ring');
  const loamHeap = sc.q('#gr-loam');
  const flies = sc.q('.flies');

  function updateScene(g, d) {
    const n = g.planted ? Math.round(d.fullness * SLOTS) : 0;
    trees.forEach((t, i) => showSvg(t, i < n));
    showSvg(sapling, g.planted && n === 0);
    showSvg(flies, g.planted);
    const sd = g.totalSeeds.gt(0) ? Math.min(6, 1 + Math.floor(dec(g.totalSeeds) / 3)) : 0;
    seedlets.forEach((x, i) => showSvg(x, i < sd));
    showSvg(stump, !!g.seen.age);
    const rn = g.age > 0 ? Math.min(4, 1 + Math.floor(Math.log2(1 + g.age / 120))) : 0;
    rings.forEach((x, i) => showSvg(x, i < rn));
    const lh = g.loam.gt(0) ? 8 + 34 * Math.min(1, dec(g.loam) / 10) : 0;
    showSvg(loamHeap, lh > 0);
    if (lh > 0) attr(loamHeap, 'points', `1440 410 1470 ${f0(396 - lh * 0.5)} 1510 ${f0(396 - lh * 0.8)} 1540 ${f0(396 - lh)} 1570 ${f0(396 - lh * 0.6)} 1600 ${f0(396 - lh * 0.3)} 1600 410`);
  }

  // The world's main control: plant, then seedfall.
  const main = mainBar('gr', () => { if (!G().planted) grove.plant(S()); else tryFall(); });
  scene.append(main.el);

  function updateMain(g, d) {
    if (!g.planted) { main.set({ label: 'Plant a seed', hotkey: false }); return; }
    const ready = d.canSeedfall && d.seedGain.gte(1);
    main.set({ shown: !!g.seen.seed, label: ready ? `Seedfall for ${whole(d.seedGain)} seeds` : 'Seedfall', enabled: ready });
  }

  // --- Wood --------------------------------------------------------------

  const shareText = h('p', { class: 'desc' });
  const shareHint = h('p', { class: 'note hint' });
  const split = dial({ min: 0, max: 100, onInput: (v) => grove.setShares(S(), null, v / 100) });
  const seed = dial({ min: 0, max: 100, onInput: (v) => grove.setShares(S(), v / 100, null) });
  // Heartwood, from the old wood expansion. Its share is always set by hand.
  const heart = dial({ min: 0, max: 90, onInput: (v) => grove.setHeartShare(S(), v / 100) });
  const heartText = h('p', { class: 'desc' });
  const shareBox = h('div', { class: 'box' }, h('h3', {}, 'Sap'), shareText, shareHint, split.el, seed.el, heart.el, heartText);

  function levelBox(title) {
    const count = h('span', { class: 'count' });
    const text = h('p', { class: 'desc' });
    const fill = h('div', { class: 'fill' });
    const label = h('div', { class: 'label' });
    const el = h('div', { class: 'box' }, h('h3', {}, title, count), text,
      h('div', { class: 'meter wide' }, h('div', { class: 'bar' }, fill), label));
    return {
      el,
      set(level, desc, have, next, flow) {
        setText(count, `level ${level}`);
        setText(text, desc);
        setWidth(fill, have.div(next).toNumber());
        setText(label, flow.gt(0)
          ? `Next level at ${amount(next)} sap, in ${eta(next.sub(have).div(flow).toNumber() / pace())}.`
          : `Next level at ${amount(next)} sap. No sap going here.`);
      },
    };
  }
  const rootBox = levelBox('Roots');
  const canopyBox = levelBox('Canopy');

  const ageText = h('p', { class: 'desc' });
  const ageBox = h('div', { class: 'box' }, h('h3', {}, 'Age'), ageText);

  const seedFall = resetBox({ title: 'Seedfall', accent: 'seed-accent', onClick: tryFall, hotkey: 'B' });

  function updateFall(box, g, d) {
    const ready = d.canSeedfall && d.seedGain.gte(1);
    let text;
    if (d.stands <= indexOf('flower')) text = [`Reach ${whole(STANDS[indexOf('flower')].trees)} trees to flower.`];
    else if (ready) text = ['Resets trees, roots, canopy and age.', `Seed set: ${amount(g.seedSet)} sap.`];
    else text = [`Seed set: ${amount(g.seedSet)} of ${whole(grove.BAL.seedNeedsSap)} sap needed.`];
    box.set({ shown: !!g.seen.seed, text, label: ready ? `Seedfall for ${whole(d.seedGain)} seeds` : 'Seedfall', ready });
  }

  const rich = breakdown('Sap per tree', ['Age', 'Seeds', 'Loam', 'Stands', 'Other'], 'Sap per tree per second');
  const shine = shineStat('gr', game);
  strip.insertBefore(shine.el, speedText);

  const woodPanel = h('div', { class: 'panel leaf-accent' }, scene,
    h('div', { class: 'gr-layout' },
      h('div', { class: 'gr-col' }, shareBox, ageBox),
      h('div', { class: 'gr-col' }, rootBox.el, canopyBox.el, rich.el)));

  function updateWood(g, d) {
    heart.set({ shown: d.hasHeart, value: Math.round(g.heartShare * 100), text: `Heartwood gets ${Math.round(g.heartShare * 100)}% of all sap, before the rest is split.` });
    setShown(heartText, d.hasHeart);
    if (d.hasHeart) {
      const light = grove.ringLight(S());
      setText(heartText, `Heartwood ${amount(g.heartSap)}: ${format(d.rings, 1)} rings, one for each power of ten. Kept through seedfall and fire. Sap ${formatMult(d.heartMult)}.${light > 1 ? ` All starlight ${formatMult(light)}.` : ''}`);
    }
    updateScene(g, d);
    updateMain(g, d);
    for (const el of [shareBox, rootBox.el, canopyBox.el]) setShown(el, g.planted);
    if (g.planted) {
      const toSeed = Math.round(g.seedShare * 100);
      const toCanopy = Math.round(d.canopyShare * 100);
      const toRoots = 100 - toSeed - toCanopy;
      setText(shareText, g.seen.seed
        ? `Roots ${toRoots}%, canopy ${toCanopy}%, seed ${toSeed}%.`
        : `Roots ${toRoots}%, canopy ${toCanopy}%.`);
      setText(shareHint, d.fullness >= grove.BAL.fullAt ? 'Full. More room needs roots.'
        : d.fullness < 0.4 ? 'Mostly empty. Canopy fills it faster.' : 'Filling.');
      const auto = !!g.seedUp.forester;
      const s = Math.round(g.canopySplit * 100);
      split.set({ value: s, disabled: auto, text: `Canopy share of growth: ${s}%${auto ? ' (set by forester)' : ''}.` });
      seed.set({ shown: !!g.seen.seed, value: toSeed, text: `Seed share: ${toSeed}%.` });

      const roomStep = g.seedUp.crown ? grove.BAL.roomPerRootCrown : grove.BAL.roomPerRoot;
      const canopyStep = g.seedUp.broadleaf ? grove.BAL.ratePerCanopyBroad : grove.BAL.ratePerCanopy;
      const slowStep = d.stands > indexOf('giant') ? grove.BAL.slowPerRootGiants : grove.BAL.slowPerRoot;
      rootBox.set(d.rootLevel,
        `×${roomStep} room per level. Each level slows growth by ${Math.round((slowStep - 1) * 100)}%.`,
        g.rootSap, d.nextRoot, d.sap.mul(d.rootsShare * d.rootReach));
      canopyBox.set(d.canopyLevel,
        `+${Math.round((canopyStep - 1) * 100)}% growth speed per level. Doubling time with room to spare: ${eta(Math.LN2 / d.rate / pace())}.`,
        g.canopySap, d.nextCanopy, d.sap.mul(d.canopyShare * d.canopyReach));
    }
    setShown(ageBox, g.planted && !!g.seen.age);
    if (g.seen.age) setText(ageText, `Aged ${formatTime(g.age)}. Multiplies sap by ${format(d.old, 2)}. Only ages at 90% full or more. Resets on seedfall.`);

    const known = new Decimal(d.old).mul(d.seedBed).mul(d.loamBed).mul(d.standMult);
    const other = d.richness.div(known);
    rich.set(g.planted && d.richness.gt(1.001), [
      g.seen.age ? formatMult(d.old) : null,
      d.seedBed.gt(1) ? formatMult(d.seedBed) : null,
      d.loamBed.gt(1) ? formatMult(d.loamBed) : null,
      d.standMult > 1 ? formatMult(d.standMult) : null,
      other.gt(1.001) ? formatMult(other) : null,
    ], format(real(d.richness, pace()), 2));
  }

  // --- Stands ------------------------------------------------------------

  const stands = pointList(STANDS, (p) => `${whole(p.trees)} trees`);
  const standsPanel = h('div', { class: 'panel' },
    h('p', { class: 'desc' }, 'Reached when the forest holds that many trees. Lasts until seedfall.'),
    stands.el);

  // --- Seeds -------------------------------------------------------------

  const seedAmount = h('span');
  const seedText = h('p', { class: 'desc' });
  const rainText = h('p', { class: 'desc' });
  const seedGrid = upgradeGrid(grove.SEED_UPGRADES, {
    owned: (id) => !!G().seedUp[id],
    have: () => G().seeds,
    buy: (id) => grove.buySeedUpgrade(S(), id),
    unit: 'seeds',
    seen: () => G().seen,
    shownKey: 'seedCards',
  });
  const seedPanel = h('div', { class: 'panel seed-accent' },
    h('div', { class: 'figure' }, seedAmount, h('small', {}, 'seeds')),
    seedText, rainText, seedFall.el, seedGrid.el);

  function updateSeeds(g, d) {
    setText(seedAmount, whole(g.seeds));
    const since = g.totalLoam.gt(0) ? ' since last fire' : (g.folds > 0 ? ' this fold' : '');
    setText(seedText, `Gathered ${whole(g.totalSeeds)} seeds${since}. Multiplies sap by ${format(d.seedBed, 2)}.`);
    const raining = grove.seedsFallAlone(S());
    setShown(rainText, raining);
    if (raining) setText(rainText, `Gaining ${format(d.seedGain.mul(grove.BAL.passiveSeedPerSecond * pace()), 1)} seeds per second.`);
    updateFall(seedFall, g, d);
    seedGrid.update();
  }

  // --- Loam --------------------------------------------------------------

  const loamAmount = h('span');
  const loamText = h('p', { class: 'desc' });
  const fireBox = resetBox({ title: 'Fire', onClick: tryFire });
  const mTiles = grove.LOAM_MILESTONES.map((m) => h('div', { class: 'gr-tile' },
    h('span', { class: 'at' }, `${whole(m.need)} loam`), h('span', { class: 'text' }, m.text)));
  const milestones = {
    el: h('div', { class: 'box' }, h('h3', {}, 'Loam milestones'), h('div', { class: 'gr-tiles' }, mTiles)),
    set: (i, done) => setClass(mTiles[i], 'lit', done),
  };
  const loamGrid = upgradeGrid(grove.LOAM_UPGRADES, {
    owned: (id) => !!G().loamUp[id],
    have: () => G().loam,
    buy: (id) => grove.buyLoamUpgrade(S(), id),
    unit: 'loam',
    seen: () => G().seen,
    shownKey: 'loamCards',
  });
  const loamPanel = h('div', { class: 'panel loam-accent' },
    h('div', { class: 'figure' }, loamAmount, h('small', {}, 'loam')),
    loamText, fireBox.el, milestones.el, loamGrid.el);

  function updateLoam(g, d) {
    setText(loamAmount, whole(g.loam));
    setText(loamText, g.totalLoam.gt(0)
      ? `Made ${whole(g.totalLoam)} loam${g.folds > 0 ? ' this fold' : ''}. Multiplies sap by ${format(d.loamBed, 2)}.`
      : 'No loam yet.');
    const need = grove.BAL.loamNeedsSeeds;
    let missing = '';
    if (d.stands <= indexOf('dead')) missing = `Reach ${STANDS[indexOf('dead')].name} this generation.`;
    else if (g.totalSeeds.lt(need)) missing = `Need ${whole(need)} seeds gathered since last fire. You have ${whole(g.totalSeeds)}.`;
    const ready = d.canFire && d.loamGain.gte(1);
    fireBox.set({
      text: ['Resets the forest, seeds and Seed upgrades.', `Settling for ${formatTime(g.fireTime)}. Multiplies loam gain by ${format(d.settle, 2)}.`, missing],
      label: ready ? `Burn for ${whole(d.loamGain)} loam` : 'Burn',
      ready,
    });
    grove.LOAM_MILESTONES.forEach((m, i) => milestones.set(i, grove.milestoneReached(g, m.id)));
    loamGrid.update();
  }

  // --- Sub-tabs ----------------------------------------------------------

  const tabs = subTabs([
    { id: 'wood', label: 'Wood', panel: woodPanel, update: updateWood, open: () => true },
    { id: 'stands', label: 'Stands', panel: standsPanel, update: (g, d) => stands.update(g.bestStands, d.stands, grove.standCap(S())), open: (g) => g.bestStands >= 1 },
    { id: 'seeds', label: 'Seeds', panel: seedPanel, update: updateSeeds, open: (g) => !!g.seen.seed },
    { id: 'loam', label: 'Loam', panel: loamPanel, update: updateLoam, open: (g) => !!g.seen.fire },
  ], {
    current: () => S().ui.groveTab,
    choose: (id) => { S().ui.groveTab = id; },
    visited: () => G().seen,
  });
  const el = h('section', { class: 'gr', 'data-world': 'grove' }, strip, tabs.nav, tabs.panels);

  function update() {
    const g = G();
    const d = grove.calc(S());
    updateStrip(g, d);
    shine.set(d.shine, g.pending, pace());
    tabs.update((tab) => tab.open(g)).update(g, d);
  }

  function key(k) {
    if (k === 'b') tryFall();
  }

  return { el, update, key };
}
