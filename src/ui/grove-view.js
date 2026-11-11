// Everything you see while looking at Grove.
import { h, setText, setShown, setClass, setDisabled, confirmBox } from './dom.js';
import { Decimal, format, formatDown, formatInt, formatMult, formatTime } from '../core/num.js';
import { upgradeGrid, subTabs } from './parts.js';
import * as grove from '../worlds/grove.js';

const amount = (x) => format(x, 1);
const whole = (x) => formatInt(x);
const STANDS = grove.STANDS;

function about(seconds) {
  if (!Number.isFinite(seconds) || seconds > 3e7) return 'a very long time';
  if (seconds < 1) return 'under a second';
  return 'about ' + formatTime(seconds);
}

export function buildGrove(game) {
  const S = () => game.state;
  const G = () => game.state.grove;

  function tryFall() {
    const g = G();
    const d = grove.calc(S());
    if (!d.canSeedfall || d.seedGain.lt(1)) return;
    if (g.seedfalls === 0 && g.fires === 0) {
      confirmBox({
        title: 'Let the forest fall?',
        body: `Every tree comes down, and the roots and canopy go with them. What's left is ${whole(d.seedGain)} seeds, which you can spend on things the next forest keeps.`,
        yes: 'Let it fall',
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
        title: 'Let a fire through?',
        body: `It takes everything: the forest, your seeds and your Seed upgrades. What it leaves is ${whole(d.loamGain)} loam. Loam and whatever you buy with it is never lost to a fire.`,
        yes: 'Let it burn',
        onYes: () => grove.wildfire(S()),
      });
      return;
    }
    grove.wildfire(S());
  }

  const setWidth = (el, frac) => {
    const w = (Math.max(0, Math.min(1, frac)) * 100).toFixed(1) + '%';
    if (el.__w !== w) { el.style.width = w; el.__w = w; }
  };

  // --- Status strip ------------------------------------------------------

  const treeAmount = h('span');
  const roomLine = h('div', { class: 'rate' });
  const sapLine = h('div', { class: 'temp' });
  const fullFill = h('div', { class: 'fill' });
  const fullLabel = h('div', { class: 'label' });
  const fullMeter = h('div', { class: 'meter' },
    h('div', { class: 'bar full' }, fullFill, h('div', { class: 'mark', style: `left: ${grove.BAL.fullAt * 100}%` })),
    fullLabel);
  const status = h('div', { class: 'status leaf-accent' },
    h('div', { class: 'amount' }, treeAmount, h('small', {}, 'trees')), roomLine, sapLine, fullMeter);

  function updateStatus(g, d) {
    setText(treeAmount, g.planted ? amount(g.trees) : '0');
    setShown(fullMeter, g.planted);
    if (!g.planted) {
      setText(roomLine, 'Nothing is growing here yet.');
      setText(sapLine, 'The ground is bare.');
      return;
    }
    setText(roomLine, `The ground has room for ${amount(d.room)}.`);
    setText(sapLine, `The forest is making ${amount(d.sap)} sap a second.`);
    setWidth(fullFill, d.fullness);
    setText(fullLabel, `${Math.floor(d.fullness * 100)}% full`);
  }

  // --- The wood ----------------------------------------------------------

  const plantBox = h('div', { class: 'box center' },
    h('p', {}, 'A clearing in the rain, and one seed in your hand.'),
    h('p', {}, h('button', { class: 'act big primary', onclick: () => grove.plant(S()) }, 'Plant it')));

  const shareText = h('p', { class: 'desc' });
  const shareHint = h('p', { class: 'note hint' });
  const splitLabel = h('label', {});
  const split = h('input', { type: 'range', min: '0', max: '100', step: '1', oninput: () => grove.setShares(S(), null, Number(split.value) / 100) });
  const seedLabel = h('label', {});
  const seed = h('input', { type: 'range', min: '0', max: '100', step: '1', oninput: () => grove.setShares(S(), Number(seed.value) / 100, null) });
  const seedDial = h('div', { class: 'dial' }, seedLabel, seed);
  const shareBox = h('div', { class: 'box' },
    h('h3', {}, 'Where the sap goes'),
    shareText, shareHint,
    h('div', { class: 'dial' }, splitLabel, split),
    seedDial);

  function updateShares(g, d) {
    const toSeed = Math.round(g.seedShare * 100);
    const toCanopy = Math.round(d.canopyShare * 100);
    const toRoots = 100 - toSeed - toCanopy;
    setText(shareText, g.seen.seed
      ? `Of every hundred measures of sap, ${toRoots} go to the roots, ${toCanopy} to the canopy and ${toSeed} to seed.`
      : `Of every hundred measures of sap, ${toRoots} go to the roots and ${toCanopy} to the canopy.`);
    let hint;
    if (d.fullness >= grove.BAL.fullAt) hint = 'The forest is full. It can only get bigger with more room, and room comes from the roots.';
    else if (d.fullness < 0.4) hint = 'The forest is rattling around in its room. More canopy would help it fill out.';
    else hint = 'The forest is still filling out.';
    setText(shareHint, hint);

    const auto = !!g.seedUp.forester;
    setDisabled(split, auto);
    const s = Math.round(g.canopySplit * 100);
    if (document.activeElement !== split && Number(split.value) !== s) split.value = String(s);
    setText(splitLabel, auto
      ? `Your forester is sending ${s}% of the growing sap to the canopy and the rest to the roots.`
      : `Of the sap that goes to growing, ${s}% goes to the canopy and the rest to the roots.`);
    setShown(seedDial, !!g.seen.seed);
    if (document.activeElement !== seed && Number(seed.value) !== toSeed) seed.value = String(toSeed);
    setText(seedLabel, `${toSeed}% of all the sap goes to seed.`);
  }

  function levelBox(title) {
    const count = h('span', { class: 'count' });
    const text = h('p', { class: 'desc' });
    const fill = h('div', { class: 'fill' });
    const eta = h('div', { class: 'label' });
    const el = h('div', { class: 'box' }, h('h3', {}, title, count), text,
      h('div', { class: 'meter wide' }, h('div', { class: 'bar' }, fill), eta));
    return { el, count, text, fill, eta };
  }
  const rootBox = levelBox('Roots');
  const canopyBox = levelBox('Canopy');

  function updateLevels(g, d) {
    const roomStep = g.seedUp.crown ? grove.BAL.roomPerRootCrown : grove.BAL.roomPerRoot;
    const canopyStep = g.seedUp.broadleaf ? grove.BAL.ratePerCanopyBroad : grove.BAL.ratePerCanopy;
    const slowStep = d.stands > STANDS.findIndex((p) => p.id === 'giant') ? grove.BAL.slowPerRootGiants : grove.BAL.slowPerRoot;

    setText(rootBox.count, `level ${d.rootLevel.toLocaleString('en-US')}`);
    setText(rootBox.text, `Each level of roots multiplies the room by ${roomStep}, and makes the whole forest ${Math.round((slowStep - 1) * 100)}% slower to grow.`);
    setWidth(rootBox.fill, g.rootSap.div(d.nextRoot).toNumber());
    const rootFlow = d.sap.mul(d.rootsShare * d.rootReach);
    setText(rootBox.eta, rootFlow.gt(0)
      ? `The next level takes ${amount(d.nextRoot)} sap in all. At this rate that is ${about(d.nextRoot.sub(g.rootSap).div(rootFlow).toNumber())} away.`
      : 'No sap is going to the roots.');

    setText(canopyBox.count, `level ${d.canopyLevel.toLocaleString('en-US')}`);
    setText(canopyBox.text, `Each level of canopy makes the forest grow ${Math.round((canopyStep - 1) * 100)}% faster. With room to spare, it would double in ${about(Math.LN2 / d.rate)} right now.`);
    setWidth(canopyBox.fill, g.canopySap.div(d.nextCanopy).toNumber());
    const canopyFlow = d.sap.mul(d.canopyShare * d.canopyReach);
    setText(canopyBox.eta, canopyFlow.gt(0)
      ? `The next level takes ${amount(d.nextCanopy)} sap in all. At this rate that is ${about(d.nextCanopy.sub(g.canopySap).div(canopyFlow).toNumber())} away.`
      : 'No sap is going to the canopy.');
  }

  const ageText = h('p', { class: 'desc' });
  const ageBox = h('div', { class: 'box' }, h('h3', {}, 'Age'), ageText);

  function fallBox() {
    const note = h('p', { class: 'desc' });
    const btn = h('button', { class: 'act primary', onclick: tryFall });
    const el = h('div', { class: 'box seed-accent' }, h('h3', {}, 'Seedfall'), note,
      h('div', { class: 'row', style: 'margin-top: 10px' }, btn, h('span', { style: 'color: var(--muted)' }, 'or press ', h('kbd', {}, 'B'))));
    return {
      el,
      update(g, d) {
        setShown(el, !!g.seen.seed);
        if (!g.seen.seed) return;
        const flowering = d.stands > STANDS.findIndex((p) => p.id === 'flower');
        const ready = d.canSeedfall && d.seedGain.gte(1);
        if (!flowering) setText(note, `This forest is too young to flower. It needs to reach ${whole(STANDS.find((p) => p.id === 'flower').trees)} trees first.`);
        else if (ready) setText(note, `The forest has set ${amount(g.seedSet)} sap's worth of seed. Let it fall and the seed is yours, and a new forest starts from a single tree.`);
        else setText(note, `The forest has set ${amount(g.seedSet)} sap's worth of seed. It takes ${whole(grove.BAL.seedNeedsSap)} before any of it is worth gathering, so send some sap to seed.`);
        setText(btn, ready ? `Let the forest fall for ${whole(d.seedGain)} seeds` : 'Let the forest fall');
        setDisabled(btn, !ready);
      },
    };
  }
  const woodFall = fallBox();
  const seedFall = fallBox();

  const richRows = ['Age', 'Seed in the ground', 'Loam', 'Stands', 'Everything else'].map((label) => {
    const value = h('td');
    return { value, tr: h('tr', {}, h('td', {}, label), value) };
  });
  const richTotal = h('td');
  const richBox = h('div', { class: 'box' },
    h('h3', {}, 'How rich the sap is'),
    h('table', { class: 'breakdown' }, richRows.map((r) => r.tr),
      h('tr', { class: 'total' }, h('td', {}, 'Sap from each tree, each second'), richTotal)));

  function updateRich(g, d) {
    const show = g.planted && d.richness.gt(1.001);
    setShown(richBox, show);
    if (!show) return;
    const known = new Decimal(d.old).mul(d.seedBed).mul(d.loamBed).mul(d.standMult);
    const other = d.richness.div(known);
    const values = [
      [formatMult(d.old), !!g.seen.age],
      [formatMult(d.seedBed), d.seedBed.gt(1)],
      [formatMult(d.loamBed), d.loamBed.gt(1)],
      [formatMult(d.standMult), d.standMult > 1],
      [formatMult(other), other.gt(1.001)],
    ];
    richRows.forEach((r, i) => { setShown(r.tr, values[i][1]); setText(r.value, values[i][0]); });
    setText(richTotal, format(d.richness, 2));
  }

  const shineText = h('p', {});
  const shineBox = h('div', { class: 'notice' }, h('h3', {}, 'The page is shining'), shineText,
    h('p', {}, 'Pages are folded in the Atlas.'));

  const woodPanel = h('div', { class: 'panel leaf-accent' },
    shineBox, plantBox, shareBox, rootBox.el, canopyBox.el, ageBox, woodFall.el, richBox);

  function updateWood(g, d) {
    setShown(plantBox, !g.planted);
    for (const el of [shareBox, rootBox.el, canopyBox.el]) setShown(el, g.planted);
    if (g.planted) {
      updateShares(g, d);
      updateLevels(g, d);
    }
    setShown(ageBox, g.planted && !!g.seen.age);
    if (g.seen.age) {
      setText(ageText, `This forest has spent ${formatTime(g.age)} growing old, which makes its sap ${format(d.old, 2)} times as rich. It only ages while it is at least nine tenths full, and the next forest starts young.`);
    }
    woodFall.update(g, d);
    updateRich(g, d);
    setShown(shineBox, d.shine > 0);
    if (d.shine > 0) setText(shineText, `There are trees here that nobody planted, and Grove is giving off ${format(d.shine, 2)} starlight a minute. It has gathered ${formatDown(g.pending)} since the page was last folded.`);
  }

  // --- Stands ------------------------------------------------------------

  const standRows = STANDS.map((p) => {
    const deg = h('div', { class: 'deg' });
    const name = h('b');
    const text = h('p');
    const li = h('li', {}, deg, h('div', { class: 'what' }, name, text));
    return { p, li, deg, name, text };
  });
  const standsPanel = h('div', { class: 'panel' },
    h('p', { class: 'lead' }, 'A stand is what a forest becomes when there is enough of it. Each of these is reached the first time the forest holds that many trees, and what it changes lasts until the forest falls.'),
    h('ul', { class: 'points wide' }, standRows.map((r) => r.li)));

  function updateStands(g, d) {
    standRows.forEach((r, i) => {
      const known = i < g.bestStands;
      setShown(r.li, i <= g.bestStands);
      setClass(r.li, 'lit', i < d.stands);
      setClass(r.li, 'unknown', !known);
      setText(r.deg, `${whole(r.p.trees)} trees`);
      setText(r.name, known ? r.p.name : 'The forest has not grown this big yet.');
      setText(r.text, known ? r.p.text : '');
    });
  }

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
    setText(seedText, `You've gathered ${whole(g.totalSeeds)} seeds ${g.totalLoam.gt(0) ? 'since the last fire' : (g.folds > 0 ? 'this fold' : 'in all')}. Lying in the ground, they make the sap ${format(d.seedBed, 2)} times as rich, whether or not you've spent them.`);
    const raining = grove.seedsFallAlone(S());
    setShown(rainText, raining);
    if (raining) setText(rainText, `Seed is falling on its own, ${format(d.seedGain.mul(grove.BAL.passiveSeedPerSecond), 1)} every second.`);
    seedFall.update(g, d);
    seedGrid.update();
  }

  // --- Loam --------------------------------------------------------------

  const loamAmount = h('span');
  const loamText = h('p', { class: 'desc' });
  const fireSettle = h('p', { class: 'desc' });
  const fireNeed = h('p', { class: 'note' });
  const fireBtn = h('button', { class: 'act primary', onclick: tryFire });
  const fireBox = h('div', { class: 'box' },
    h('h3', {}, 'Fire'),
    h('p', { class: 'desc' }, 'Let a fire through the wood. The forest, your seeds and your Seed upgrades all go. Loam and anything bought with it is kept.'),
    fireSettle, fireNeed,
    h('div', { class: 'row', style: 'margin-top: 10px' }, fireBtn));
  const milestoneRows = grove.LOAM_MILESTONES.map((m) => ({ m, li: h('li', {}, `${whole(m.need)} loam in all. ${m.text}`) }));
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
    loamText, fireBox,
    h('div', { class: 'box' }, h('h3', {}, 'What the ground remembers'), h('ul', { class: 'milestones' }, milestoneRows.map((r) => r.li))),
    loamGrid.el);

  function updateLoam(g, d) {
    setText(loamAmount, whole(g.loam));
    setText(loamText, g.totalLoam.gt(0)
      ? `Fires have left ${whole(g.totalLoam)} loam ${g.folds > 0 ? 'this fold' : 'in all'}. It makes the sap ${format(d.loamBed, 2)} times as rich.`
      : 'No fire has been through here yet.');
    const dry = d.stands > STANDS.findIndex((p) => p.id === 'dead');
    const need = grove.BAL.loamNeedsSeeds;
    if (!dry) setText(fireNeed, `This forest has to reach ${STANDS.find((p) => p.id === 'dead').name.toLowerCase()} before a fire will take.`);
    else if (g.totalSeeds.lt(need)) setText(fireNeed, `A fire needs something to turn into soil. You need to have gathered ${whole(need)} seeds since the last one, and you're at ${whole(g.totalSeeds)}.`);
    setShown(fireNeed, !d.canFire);
    setText(fireSettle, `Loam is deeper the longer the ground is left alone. It has been ${formatTime(g.fireTime)} since the last fire, which multiplies what this one would leave by ${format(d.settle, 2)}.`);
    const ready = d.canFire && d.loamGain.gte(1);
    setText(fireBtn, ready ? `Let a fire through for ${whole(d.loamGain)} loam` : 'Let a fire through');
    setDisabled(fireBtn, !ready);
    for (const r of milestoneRows) setClass(r.li, 'done', grove.milestoneReached(g, r.m.id));
    loamGrid.update();
  }

  // --- Sub-tabs ----------------------------------------------------------

  const tabs = subTabs([
    { id: 'wood', label: 'The wood', panel: woodPanel, update: updateWood, open: () => true },
    { id: 'stands', label: 'Stands', panel: standsPanel, update: updateStands, open: (g) => g.bestStands >= 1 },
    { id: 'seeds', label: 'Seeds', panel: seedPanel, update: updateSeeds, open: (g) => !!g.seen.seed },
    { id: 'loam', label: 'Loam', panel: loamPanel, update: updateLoam, open: (g) => !!g.seen.fire },
  ], {
    current: () => S().ui.groveTab,
    choose: (id) => { S().ui.groveTab = id; },
    visited: () => G().seen,
  });
  const el = h('section', {}, status, tabs.nav, tabs.panels);

  function update() {
    const g = G();
    const d = grove.calc(S());
    updateStatus(g, d);
    const active = tabs.update((tab) => tab.open(g));
    active.update(g, d);
  }

  function key(k) {
    if (k === 'b') tryFall();
  }

  return { el, update, key };
}
