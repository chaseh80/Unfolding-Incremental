// Everything you see while looking at Grove.
import { h, setText, setShown, confirmBox } from './dom.js';
import { Decimal, format, formatInt, formatMult, formatTime } from '../core/num.js';
import { setWidth, startBox, upgradeGrid, subTabs, pointList, resetBox, milestoneList, breakdown, shineNotice, dial } from './parts.js';
import * as grove from '../worlds/grove.js';

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
      setText(roomLine, 'Nothing planted');
      setText(sapLine, '');
      return;
    }
    setText(roomLine, `Room: ${amount(d.room)}`);
    setText(sapLine, `+${amount(d.sap)} sap per second`);
    setWidth(fullFill, d.fullness);
    setText(fullLabel, `${Math.floor(d.fullness * 100)}% full`);
  }

  // --- Wood --------------------------------------------------------------

  const plant = startBox('Bare ground.', 'Plant a seed', () => grove.plant(S()));

  const shareText = h('p', { class: 'desc' });
  const shareHint = h('p', { class: 'note hint' });
  const split = dial({ min: 0, max: 100, onInput: (v) => grove.setShares(S(), null, v / 100) });
  const seed = dial({ min: 0, max: 100, onInput: (v) => grove.setShares(S(), v / 100, null) });
  const shareBox = h('div', { class: 'box' }, h('h3', {}, 'Sap'), shareText, shareHint, split.el, seed.el);

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
          ? `Next level at ${amount(next)} sap, in ${eta(next.sub(have).div(flow).toNumber())}.`
          : `Next level at ${amount(next)} sap. No sap going here.`);
      },
    };
  }
  const rootBox = levelBox('Roots');
  const canopyBox = levelBox('Canopy');

  const ageText = h('p', { class: 'desc' });
  const ageBox = h('div', { class: 'box' }, h('h3', {}, 'Age'), ageText);

  const woodFall = resetBox({ title: 'Seedfall', accent: 'seed-accent', onClick: tryFall, hotkey: 'B' });
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
  const shine = shineNotice('Grove');

  const woodPanel = h('div', { class: 'panel leaf-accent' },
    shine.el, plant, shareBox, rootBox.el, canopyBox.el, ageBox, woodFall.el, rich.el);

  function updateWood(g, d) {
    shine.set(d.shine, g.pending);
    setShown(plant, !g.planted);
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
        `+${Math.round((canopyStep - 1) * 100)}% growth speed per level. Doubling time with room to spare: ${eta(Math.LN2 / d.rate)}.`,
        g.canopySap, d.nextCanopy, d.sap.mul(d.canopyShare * d.canopyReach));
    }
    setShown(ageBox, g.planted && !!g.seen.age);
    if (g.seen.age) setText(ageText, `Aged ${formatTime(g.age)}. Multiplies sap by ${format(d.old, 2)}. Only ages at 90% full or more. Resets on seedfall.`);
    updateFall(woodFall, g, d);

    const known = new Decimal(d.old).mul(d.seedBed).mul(d.loamBed).mul(d.standMult);
    const other = d.richness.div(known);
    rich.set(g.planted && d.richness.gt(1.001), [
      g.seen.age ? formatMult(d.old) : null,
      d.seedBed.gt(1) ? formatMult(d.seedBed) : null,
      d.loamBed.gt(1) ? formatMult(d.loamBed) : null,
      d.standMult > 1 ? formatMult(d.standMult) : null,
      other.gt(1.001) ? formatMult(other) : null,
    ], format(d.richness, 2));
  }

  // --- Stands ------------------------------------------------------------

  const stands = pointList(STANDS, (p) => `${whole(p.trees)} trees`);
  const standsPanel = h('div', { class: 'panel' },
    h('p', { class: 'lead' }, 'Reached when the forest holds that many trees. Lasts until seedfall.'),
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
    if (raining) setText(rainText, `Gaining ${format(d.seedGain.mul(grove.BAL.passiveSeedPerSecond), 1)} seeds per second.`);
    updateFall(seedFall, g, d);
    seedGrid.update();
  }

  // --- Loam --------------------------------------------------------------

  const loamAmount = h('span');
  const loamText = h('p', { class: 'desc' });
  const fireBox = resetBox({ title: 'Fire', onClick: tryFire });
  const milestones = milestoneList('Loam milestones', grove.LOAM_MILESTONES.map((m) => `${whole(m.need)} loam: ${m.text}`));
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
    { id: 'stands', label: 'Stands', panel: standsPanel, update: (g, d) => stands.update(g.bestStands, d.stands), open: (g) => g.bestStands >= 1 },
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
    tabs.update((tab) => tab.open(g)).update(g, d);
  }

  function key(k) {
    if (k === 'b') tryFall();
  }

  return { el, update, key };
}
