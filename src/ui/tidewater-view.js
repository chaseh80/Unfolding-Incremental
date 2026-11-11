// Everything you see while looking at Tidewater.
import { h, setText, setShown, confirmBox } from './dom.js';
import { Decimal, format, formatInt, formatMult } from '../core/num.js';
import { setWidth, startBox, upgradeGrid, feedRow, subTabs, pointList, resetBox, breakdown, shineNotice, dial } from './parts.js';
import * as tw from '../worlds/tidewater.js';

const amount = (x) => format(x, 1);
const whole = (x) => formatInt(x);
const secs = (x) => (x < 10 ? x.toFixed(1) : Math.round(x).toString()) + 's';
const LINES = tw.STRANDLINES;

export function buildTidewater(game) {
  const S = () => game.state;
  const T = () => game.state.tidewater;

  function tryStorm() {
    const t = T();
    const d = tw.calc(S());
    if (!d.canStorm || d.driftGain.lt(1)) return;
    if (t.storms === 0) {
      confirmBox({
        title: 'Storm?',
        body: `Resets salt, channels, salt pans, pools, moon and kelp. You get ${whole(d.driftGain)} driftwood.`,
        yes: 'Storm',
        onYes: () => tw.storm(S()),
      });
      return;
    }
    tw.storm(S());
  }

  // --- Status strip ------------------------------------------------------

  const saltAmount = h('span');
  const rate = h('div', { class: 'rate' });
  const tideLine = h('div', { class: 'temp' });
  const tideFill = h('div', { class: 'fill' });
  const tideMark = h('div', { class: 'mark' });
  const poolFill = h('div', { class: 'fill' });
  const poolLabel = h('div', { class: 'label' });
  const gauges = h('div', { class: 'meter' },
    h('div', { class: 'bar tide' }, tideFill, tideMark),
    h('div', { class: 'label' }, 'Tide'),
    h('div', { class: 'bar pool', style: 'margin-top: 8px' }, poolFill),
    poolLabel);
  const status = h('div', { class: 'status tide-accent' },
    h('div', { class: 'amount' }, saltAmount, h('small', {}, 'salt')), rate, tideLine, gauges);

  function updateStatus(t, d) {
    setText(saltAmount, amount(t.salt));
    setShown(gauges, t.open);
    if (!t.open) {
      setText(rate, 'Sluice shut');
      setText(tideLine, '');
      return;
    }
    setText(rate, `About ${amount(d.income)} per second`);
    const inHigh = t.phase < d.high;
    setText(tideLine, inHigh
      ? `Tide in. Turns in ${secs(d.high - t.phase)}.`
      : `Tide out. Back in ${secs(t.period - t.phase)}.`);
    setWidth(tideFill, t.gate);
    const mark = (Math.min(1, t.phase / t.period) * 100).toFixed(1) + '%';
    if (tideMark.__l !== mark) { tideMark.style.left = mark; tideMark.__l = mark; }
    setWidth(poolFill, t.brine.div(d.pool).toNumber());
    setText(poolLabel, `Pools: ${amount(t.brine)} of ${amount(d.pool)} brine`);
  }

  // --- Shore -------------------------------------------------------------

  const sluice = startBox('The sluice is shut.', 'Open the sluice', () => tw.openSluice(S()));

  const tideText = h('p', { class: 'desc' });
  const tideHint = h('p', { class: 'note hint' });
  const gate = dial({ min: 10, max: 90, onInput: (v) => tw.setGate(S(), v / 100) });
  const period = dial({ min: tw.BAL.minPeriod, max: tw.BAL.maxPeriod, onInput: (v) => tw.setPeriod(S(), v) });
  const lastTide = h('p', { class: 'desc' });
  const tideBox = h('div', { class: 'box' },
    h('h3', {}, 'Tide settings'),
    tideText, tideHint, gate.el, period.el,
    h('p', { class: 'note' }, 'Changes apply at the next tide. Tide length does not change salt per second. A longer tide leaves more salt in one go, which is what passes strandlines.'),
    lastTide);

  function updateTide(t, d) {
    const pct = (x) => (x >= 1 ? '100%' : Math.round(x * 100) + '%');
    const fillFrac = d.fill.mul(d.high).div(d.pool).toNumber();
    const dryFrac = d.dry.mul(d.low).div(d.pool).toNumber();
    setText(tideText, `High water: ${secs(d.high)}, fills ${pct(fillFrac)} of the pools. Low water: ${secs(d.low)}, dries ${pct(dryFrac)}. A tide leaves salt for the smaller of the two.`);
    const filled = Math.min(1, fillFrac);
    let hint;
    if (dryFrac < filled * 0.93) hint = 'Drying is behind. Shorten high water or add salt pans.';
    else if (fillFrac >= 1 && dryFrac >= 1) hint = 'The pools are the limit. Dig them deeper or shorten the tide.';
    else if (filled < dryFrac * 0.93) hint = 'Filling is behind. Lengthen high water or add channels.';
    else hint = 'Filling and drying match.';
    setText(tideHint, hint);

    const auto = !!t.driftUp.tables;
    const g = Math.round(t.nextGate * 100);
    gate.set({ value: g, disabled: auto, text: `High water: ${g}% of each tide${auto ? ' (set by tide tables)' : ''}.` });
    const p = Math.round(t.nextPeriod);
    period.set({ value: p, text: `Tide length: ${p} seconds.` });
    setText(lastTide, t.tides > 0 ? `Last tide: ${amount(t.lastTide)} salt. Best this calm: ${amount(t.bestTide)}.` : '');
  }

  const rows = {};
  for (const id of ['channel', 'pan', 'pool', 'moon']) {
    rows[id] = feedRow({
      name: tw.FEED_NAMES[id],
      onBuy: () => tw.buyFeed(S(), id, false),
      onMax: () => tw.buyFeed(S(), id, true),
    });
  }
  const buyAll = h('div', { class: 'row' },
    h('button', { class: 'act', onclick: () => tw.feedAll(S()) }, 'Buy all'), h('kbd', {}, 'M'));

  const kelpText = h('p', { class: 'desc' });
  const kelpBox = h('div', { class: 'box' }, h('h3', {}, 'Kelp'), kelpText);

  const shoreStorm = resetBox({ title: 'Storm', accent: 'drift-accent', onClick: tryStorm, hotkey: 'B' });
  const driftStorm = resetBox({ title: 'Storm', accent: 'drift-accent', onClick: tryStorm, hotkey: 'B' });

  function updateStorm(box, t, d) {
    const ready = d.canStorm && d.driftGain.gte(1);
    const line = LINES.find((p) => p.id === 'storm');
    let text;
    if (ready) text = ['Resets salt, channels, salt pans, pools, moon and kelp.', `Salt made this calm: ${amount(t.calmSalt)}.`];
    else if (d.lines <= LINES.indexOf(line)) text = [`Pass ${line.name} this calm to storm (${whole(line.salt)} salt in one tide).`];
    else text = ['Not enough salt made this calm.'];
    box.set({ shown: !!t.seen.storm, text, label: ready ? `Storm for ${whole(d.driftGain)} driftwood` : 'Storm', ready });
  }

  const worth = breakdown('Salt per brine', ['Kelp', 'Driftwood', 'Strandlines', 'Other'], 'Salt per brine');
  const shine = shineNotice('Tidewater');

  const shorePanel = h('div', { class: 'panel tide-accent' },
    shine.el, sluice, tideBox, Object.values(rows).map((r) => r.el), buyAll, kelpBox, shoreStorm.el, worth.el);

  function updateShore(t, d) {
    shine.set(d.shine, t.pending);
    setShown(sluice, !t.open);
    setShown(tideBox, t.open);
    if (t.open) updateTide(t, d);

    const text = {
      channel: `+${amount(d.fill.div(1 + t.feeds.channel * tw.BAL.channelFill).mul(tw.BAL.channelFill))} brine per second each while the tide is in. Total ${amount(d.fill)}.`,
      pan: `Dries ${amount(d.dry.div(1 + t.feeds.pan * tw.BAL.panDry).mul(tw.BAL.panDry))} brine per second each while the tide is out. Total ${amount(d.dry)}.`,
      pool: `×2 capacity each. Holds ${amount(d.pool)} brine.`,
      moon: `×${d.moonStep} filling and drying each.`,
    };
    let anyManual = false;
    for (const id of Object.keys(rows)) {
      const shown = t.open && tw.feedUnlocked(t, id);
      const free = tw.feedIsFree(t, id);
      const cost = tw.feedCost(t, id);
      if (shown && !free) anyManual = true;
      rows[id].set({ shown, count: String(t.feeds[id]), text: text[id], free, cost: `${amount(cost)} salt`, affordable: t.salt.gte(cost) });
    }
    setShown(buyAll, t.open && anyManual);

    setShown(kelpBox, t.open && !!t.seen.kelp);
    if (t.seen.kelp) setText(kelpText, `${t.kelp.toLocaleString('en-US')} tides of growth. Multiplies salt by ${format(d.kelp, 2)}. Storms remove it.`);
    updateStorm(shoreStorm, t, d);

    const known = new Decimal(d.kelp).mul(d.driftBed).mul(d.lineMult);
    const other = d.strength.div(known);
    worth.set(t.open && d.strength.gt(1.001), [
      t.seen.kelp ? formatMult(d.kelp) : null,
      d.driftBed.gt(1) ? formatMult(d.driftBed) : null,
      d.lineMult > 1 ? formatMult(d.lineMult) : null,
      other.gt(1.001) ? formatMult(other) : null,
    ], format(d.strength, 2));
  }

  // --- Strandlines -------------------------------------------------------

  const lines = pointList(LINES, (p) => `${whole(p.salt)} salt`);
  const linesPanel = h('div', { class: 'panel' },
    h('p', { class: 'lead' }, 'Passed when a single tide leaves that much salt. Lasts until the next storm.'),
    lines.el);

  // --- Driftwood ---------------------------------------------------------

  const driftAmount = h('span');
  const driftText = h('p', { class: 'desc' });
  const washText = h('p', { class: 'desc' });
  const driftGrid = upgradeGrid(tw.DRIFT_UPGRADES, {
    owned: (id) => !!T().driftUp[id],
    have: () => T().driftwood,
    buy: (id) => tw.buyDriftUpgrade(S(), id),
    unit: 'driftwood',
    seen: () => T().seen,
    shownKey: 'driftCards',
  });
  const driftPanel = h('div', { class: 'panel drift-accent' },
    h('div', { class: 'figure' }, driftAmount, h('small', {}, 'driftwood')),
    driftText, washText, driftStorm.el, driftGrid.el);

  function updateDrift(t, d) {
    setText(driftAmount, whole(t.driftwood));
    setText(driftText, `Washed up ${whole(t.totalDriftwood)} driftwood${t.folds > 0 ? ' this fold' : ''}. Multiplies salt by ${format(d.driftBed, 2)}.`);
    const washing = !!S().atlas.nodes.t_storm;
    setShown(washText, washing);
    if (washing) setText(washText, `Washing up ${format(d.driftGain.mul(tw.BAL.passiveDriftPerSecond), 1)} driftwood per second.`);
    updateStorm(driftStorm, t, d);
    driftGrid.update();
  }

  // --- Sub-tabs ----------------------------------------------------------

  const tabs = subTabs([
    { id: 'shore', label: 'Shore', panel: shorePanel, update: updateShore, open: () => true },
    { id: 'lines', label: 'Strandlines', panel: linesPanel, update: (t, d) => lines.update(t.bestLines, d.lines), open: (t) => t.bestLines >= 1 },
    { id: 'drift', label: 'Driftwood', panel: driftPanel, update: updateDrift, open: (t) => !!t.seen.storm },
  ], {
    current: () => S().ui.tidewaterTab,
    choose: (id) => { S().ui.tidewaterTab = id; },
    visited: () => T().seen,
  });
  const el = h('section', {}, status, tabs.nav, tabs.panels);

  function update() {
    const t = T();
    const d = tw.calc(S());
    updateStatus(t, d);
    tabs.update((tab) => tab.open(t)).update(t, d);
  }

  function key(k) {
    if (k === 'm') tw.feedAll(S());
    if (k === 'b') tryStorm();
  }

  return { el, update, key };
}
