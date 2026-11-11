// Everything you see while looking at Clockwork.
import { h, setText, setShown, setClass, confirmBox } from './dom.js';
import { format, formatInt, formatMult, formatTime } from '../core/num.js';
import { startBox, upgradeGrid, feedRow, subTabs, pointList, resetBox, breakdown, shineNotice } from './parts.js';
import * as cw from '../worlds/clockwork.js';

const amount = (x) => format(x, 1);
const whole = (x) => formatInt(x);

export function buildClockwork(game) {
  const S = () => game.state;
  const K = () => game.state.clockwork;

  function tryRewind() {
    const k = K();
    const d = cw.calc(S());
    if (!d.canRewind || d.springGain.lt(1)) return;
    if (k.rewinds === 0) {
      confirmBox({
        title: 'Rewind?',
        body: `Resets ticks and gear levels. The train stays. You get ${whole(d.springGain)} springs.`,
        yes: 'Rewind',
        onYes: () => cw.rewind(S()),
      });
      return;
    }
    cw.rewind(S());
  }

  // --- Status strip ------------------------------------------------------

  const tickAmount = h('span');
  const rate = h('div', { class: 'rate' });
  const status = h('div', { class: 'status brass-accent' },
    h('div', { class: 'amount' }, tickAmount, h('small', {}, 'ticks')), rate);

  function updateStatus(k, d) {
    setText(tickAmount, amount(k.ticks));
    setText(rate, k.wound ? `+${amount(d.rate)} per second` : 'Not wound');
  }

  // --- Train -------------------------------------------------------------

  const start = startBox('The movement is stopped.', 'Wind it', () => cw.wind(S()));

  const sockets = [];
  for (let i = 0; i < cw.BAL.maxSockets; i++) {
    const select = h('select', { onchange: () => cw.setSocket(S(), i, select.value) });
    const worth = h('div', { class: 'worth' });
    const el = h('div', { class: 'socket' }, h('div', { class: 'label' }, `Socket ${i + 1}`), select, worth);
    sockets.push({ el, select, worth, options: '' });
  }
  const trainTotal = h('p', { class: 'desc' });
  const trainBox = h('div', { class: 'box' },
    h('h3', {}, 'Gear train'),
    h('p', { class: 'desc' }, 'Gears run left to right. You have one of each gear, and as many brass gears as you like.'),
    h('div', { class: 'train' }, sockets.map((s) => s.el)),
    trainTotal);

  function updateTrain(k, d) {
    const unlocked = cw.GEARS.filter((g) => cw.gearUnlocked(k, g.id));
    const signature = unlocked.map((g) => g.id).join(',');
    sockets.forEach((s, i) => {
      setShown(s.el, i < d.sockets);
      if (i >= d.sockets) return;
      if (s.options !== signature) {
        s.select.replaceChildren(h('option', { value: '' }, 'Empty'), ...unlocked.map((g) => h('option', { value: g.id }, g.name)));
        s.options = signature;
        s.select.value = d.train[i];
      }
      if (document.activeElement !== s.select && s.select.value !== d.train[i]) s.select.value = d.train[i];
      let text = '';
      if (d.train[i]) {
        if (d.run.stopped[i]) text = 'stopped';
        else if (d.train[i] === 'idler' || d.run.kind[i] === 'idler') text = 'idler';
        else text = formatMult(d.run.mult[i]) + (d.run.power[i] !== 1 ? ` ^${d.run.power[i].toFixed(1)}` : '');
      }
      setText(s.worth, text);
      setClass(s.worth, 'stopped', d.run.stopped[i]);
    });
    setText(trainTotal, `Train: ${formatMult(d.run.product)}`);
  }

  const gearRows = cw.GEARS.map((g) => ({
    g,
    row: feedRow({
      name: g.name,
      onBuy: () => cw.buyLevel(S(), g.id, false),
      onMax: () => cw.buyLevel(S(), g.id, true),
    }),
  }));
  const buyAll = h('div', { class: 'row' },
    h('button', { class: 'act', onclick: () => cw.levelAll(S()) }, 'Buy all'), h('kbd', {}, 'M'));

  const wearText = h('p', { class: 'desc' });
  const wearBox = h('div', { class: 'box' }, h('h3', {}, 'Wear-in'), wearText);

  const trainRewind = resetBox({ title: 'Rewind', accent: 'spring-accent', onClick: tryRewind, hotkey: 'B' });
  const springRewind = resetBox({ title: 'Rewind', accent: 'spring-accent', onClick: tryRewind, hotkey: 'B' });

  function updateRewind(box, k, d) {
    const ready = d.canRewind && d.springGain.gte(1);
    const four = cw.CHIMES.find((p) => p.id === 'four');
    let text;
    if (ready) text = ['Resets ticks and gear levels. The train stays.', `Ticks made this winding: ${amount(k.windTicks)}.`];
    else if (d.chimes <= cw.CHIMES.indexOf(four)) text = [`Strike ${four.name} this winding to rewind (${whole(four.rate)} ticks per second).`];
    else text = [`Ticks made this winding: ${amount(k.windTicks)} of ${whole(cw.BAL.springNeedsTicks)} needed.`];
    box.set({ shown: !!k.seen.rewind, text, label: ready ? `Rewind for ${whole(d.springGain)} springs` : 'Rewind', ready });
  }

  const sources = breakdown('Tick sources', ['Train', 'Wear-in', 'Springs', 'Chimes', 'Other'], 'Ticks per second');
  const shine = shineNotice('Clockwork');

  const trainPanel = h('div', { class: 'panel brass-accent' },
    shine.el, start, trainBox, gearRows.map((r) => r.row.el), buyAll, wearBox, trainRewind.el, sources.el);

  function updateTrainPanel(k, d) {
    shine.set(d.shine, k.pending);
    setShown(start, !k.wound);
    setShown(trainBox, k.wound);
    if (k.wound) updateTrain(k, d);

    const auto = !!k.springUp.apprentice;
    let anyManual = false;
    for (const { g, row } of gearRows) {
      const shown = k.wound && cw.gearUnlocked(k, g.id);
      if (!g.levels) {
        row.set({ shown, text: g.rule(0, d.idlerBoost), buyable: false });
        continue;
      }
      const cost = cw.levelCost(k, g.id);
      if (shown && !auto) anyManual = true;
      row.set({
        shown,
        count: `level ${k.levels[g.id]}`,
        text: g.rule(d.strength[g.id], d.idlerBoost),
        free: auto,
        cost: `${amount(cost)} ticks`,
        affordable: k.ticks.gte(cost),
      });
    }
    setShown(buyAll, k.wound && anyManual);

    setShown(wearBox, k.wound && !!k.seen.rewind);
    if (k.seen.rewind) setText(wearText, `Running for ${formatTime(k.windTime)}. Multiplies ticks by ${format(d.wear, 2)}. Resets on rewind.`);
    updateRewind(trainRewind, k, d);

    sources.set(k.wound, [
      formatMult(d.run.product),
      k.seen.rewind ? formatMult(d.wear) : null,
      d.springBed.gt(1) ? formatMult(d.springBed) : null,
      d.chimeMult > 1 ? formatMult(d.chimeMult) : null,
      d.other.gt(1.001) ? formatMult(d.other) : null,
    ], amount(d.rate));
  }

  // --- Chimes ------------------------------------------------------------

  const chimes = pointList(cw.CHIMES, (p) => `${whole(p.rate)} per second`);
  const chimesPanel = h('div', { class: 'panel' },
    h('p', { class: 'lead' }, 'Struck when the movement makes that many ticks per second. Lasts until rewind.'),
    chimes.el);

  // --- Springs -----------------------------------------------------------

  const springAmount = h('span');
  const springText = h('p', { class: 'desc' });
  const selfText = h('p', { class: 'desc' });
  const springGrid = upgradeGrid(cw.SPRING_UPGRADES, {
    owned: (id) => !!K().springUp[id],
    have: () => K().springs,
    buy: (id) => cw.buySpringUpgrade(S(), id),
    unit: 'springs',
    seen: () => K().seen,
    shownKey: 'springCards',
    note: (u) => cw.needText(u),
    blocked: (u) => !cw.needMet(S(), u),
  });
  const springPanel = h('div', { class: 'panel spring-accent' },
    h('div', { class: 'figure' }, springAmount, h('small', {}, 'springs')),
    springText, selfText, springRewind.el, springGrid.el);

  function updateSprings(k, d) {
    setText(springAmount, whole(k.springs));
    setText(springText, `Wound ${whole(k.totalSprings)} springs${k.folds > 0 ? ' this fold' : ''}. Multiplies ticks by ${format(d.springBed, 2)}.`);
    const self = !!S().atlas.nodes.k_spring;
    setShown(selfText, self);
    if (self) setText(selfText, `Gaining ${format(d.springGain.mul(cw.BAL.passiveSpringPerSecond), 1)} springs per second.`);
    updateRewind(springRewind, k, d);
    springGrid.update();
  }

  // --- Sub-tabs ----------------------------------------------------------

  const tabs = subTabs([
    { id: 'train', label: 'Train', panel: trainPanel, update: updateTrainPanel, open: () => true },
    { id: 'chimes', label: 'Chimes', panel: chimesPanel, update: (k, d) => chimes.update(k.bestChimes, d.chimes), open: (k) => k.bestChimes >= 1 },
    { id: 'springs', label: 'Springs', panel: springPanel, update: updateSprings, open: (k) => !!k.seen.rewind },
  ], {
    current: () => S().ui.clockworkTab,
    choose: (id) => { S().ui.clockworkTab = id; },
    visited: () => K().seen,
  });
  const el = h('section', {}, status, tabs.nav, tabs.panels);

  function update() {
    const k = K();
    const d = cw.calc(S());
    updateStatus(k, d);
    tabs.update((tab) => tab.open(k)).update(k, d);
  }

  function key(k) {
    if (k === 'm') cw.levelAll(S());
    if (k === 'b') tryRewind();
  }

  return { el, update, key };
}
