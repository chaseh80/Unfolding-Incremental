// Everything you see while looking at Tidewater.
import { h, setText, setShown, setClass, setDisabled, confirmBox } from './dom.js';
import { Decimal, format, formatDown, formatInt, formatMult } from '../core/num.js';
import { upgradeGrid, feedRow, subTabs } from './parts.js';
import * as tw from '../worlds/tidewater.js';

const amount = (x) => format(x, 1);
const whole = (x) => formatInt(x);
const secs = (x) => (x < 10 ? x.toFixed(1) : Math.round(x).toString()) + 's';
const LINES = tw.STRANDLINES;

const FEEDS = {
  channel: { buy: 'Cut a channel', auto: 'Your channel-cutter keeps these dug.' },
  pan: { buy: 'Lay a salt pan', auto: 'Your pan-raker lays these out.' },
  pool: { buy: 'Dig the pools deeper', auto: 'Your pool-digger sees to this.' },
  moon: { buy: 'Coax the moon closer', auto: 'Your moon-watcher sees to this.' },
};

export function buildTidewater(game) {
  const S = () => game.state;
  const T = () => game.state.tidewater;

  function tryStorm() {
    const t = T();
    const d = tw.calc(S());
    if (!d.canStorm || d.driftGain.lt(1)) return;
    if (t.storms === 0) {
      confirmBox({
        title: 'Let a storm through?',
        body: `It will scour the shore clean. Your salt, channels, pans, pools, kelp and the moon's pull will all be gone, and it will leave ${whole(d.driftGain)} driftwood behind to build things that last.`,
        yes: 'Let it through',
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
    h('div', { class: 'label' }, 'The tide, from one high water to the next'),
    h('div', { class: 'bar pool', style: 'margin-top: 8px' }, poolFill),
    poolLabel);
  const status = h('div', { class: 'status tide-accent' },
    h('div', { class: 'amount' }, saltAmount, h('small', {}, 'salt')), rate, tideLine, gauges);

  const setWidth = (el, frac) => {
    const w = (Math.max(0, Math.min(1, frac)) * 100).toFixed(1) + '%';
    if (el.__w !== w) { el.style.width = w; el.__w = w; }
  };

  function updateStatus(t, d) {
    setText(saltAmount, amount(t.salt));
    setShown(gauges, t.open);
    if (!t.open) {
      setText(rate, 'The sluice is shut.');
      setText(tideLine, 'Nothing is coming in.');
      return;
    }
    setText(rate, `About ${amount(d.income)} a second, the way the tides are set`);
    const inHigh = t.phase < d.high;
    const left = inHigh ? d.high - t.phase : t.period - t.phase;
    setText(tideLine, inHigh
      ? `The tide is in and the pools are filling. It turns in ${secs(left)}.`
      : `The tide is out and the pools are drying. It comes back in ${secs(left)}.`);
    setWidth(tideFill, t.gate);
    const mark = (Math.min(1, t.phase / t.period) * 100).toFixed(1) + '%';
    if (tideMark.__l !== mark) { tideMark.style.left = mark; tideMark.__l = mark; }
    setWidth(poolFill, t.brine.div(d.pool).toNumber());
    setText(poolLabel, `The pools hold ${amount(t.brine)} of ${amount(d.pool)} brine`);
  }

  // --- The shore ---------------------------------------------------------

  const sluiceBox = h('div', { class: 'box center' },
    h('p', {}, 'A sluice gate, rusted shut, with the sea leaning on the other side of it.'),
    h('p', {}, h('button', { class: 'act big primary', onclick: () => tw.openSluice(S()) }, 'Open the sluice')));

  // The two dials.
  const tideText = h('p', { class: 'desc' });
  const tideHint = h('p', { class: 'note hint' });
  const gateLabel = h('label', {});
  const gate = h('input', { type: 'range', min: '10', max: '90', step: '1', oninput: () => tw.setGate(S(), Number(gate.value) / 100) });
  const periodLabel = h('label', {});
  const period = h('input', { type: 'range', min: String(tw.BAL.minPeriod), max: String(tw.BAL.maxPeriod), step: '1', oninput: () => tw.setPeriod(S(), Number(period.value)) });
  const lastTide = h('p', { class: 'desc' });
  const tideBox = h('div', { class: 'box' },
    h('h3', {}, 'Setting the tide'),
    tideText, tideHint,
    h('div', { class: 'dial' }, gateLabel, gate),
    h('div', { class: 'dial' }, periodLabel, period),
    h('p', { class: 'note' }, 'Changes wait for the turn of the tide. Short tides and long ones bring in salt at the same pace. A long tide leaves more in one go, which is what passes a strandline, as long as the pools can hold it.'),
    lastTide);

  function updateTide(t, d) {
    const pct = (x) => Math.round(Math.min(9.99, x) * 100) + '%';
    const fillFrac = d.fill.mul(d.high).div(d.pool).toNumber();
    const dryFrac = d.dry.mul(d.low).div(d.pool).toNumber();
    setText(tideText, `High water lasts ${secs(d.high)}, long enough to fill the pools ${fillFrac >= 1 ? 'to the brim' : pct(fillFrac) + ' of the way'}. Low water lasts ${secs(d.low)}, long enough to dry ${dryFrac >= 1 ? 'all of that and more' : pct(dryFrac) + ' of what they can hold'}. Each tide only leaves salt for the smaller of the two.`);
    const filled = Math.min(1, fillFrac);
    let hint;
    if (dryFrac < filled * 0.93) hint = 'The tide is coming back before the pools have dried. Let the water out sooner, or lay more salt pans.';
    else if (fillFrac >= 1 && dryFrac >= 1) hint = "The pools are brim full and bone dry by turns, so they're what is holding this shore back. Dig them deeper, or make the tides shorter.";
    else if (filled < dryFrac * 0.93) hint = 'The pools are dry well before the tide comes back. Hold the water in for longer, or cut more channels.';
    else hint = 'Filling and drying are in step.';
    setText(tideHint, hint);

    const auto = !!t.driftUp.tables;
    setDisabled(gate, auto);
    const g = Math.round(t.nextGate * 100);
    if (document.activeElement !== gate && Number(gate.value) !== g) gate.value = String(g);
    setText(gateLabel, auto
      ? `Your tide tables hold the water in for ${g}% of each tide.`
      : `The sluice holds the water in for ${g}% of each tide.`);
    const p = Math.round(t.nextPeriod);
    if (document.activeElement !== period && Number(period.value) !== p) period.value = String(p);
    setText(periodLabel, `A tide takes ${p} seconds from one high water to the next.`);
    setText(lastTide, t.tides > 0
      ? `The last tide left ${amount(t.lastTide)} salt. The most a single tide has left this calm is ${amount(t.bestTide)}.`
      : 'No tide has gone out yet.');
  }

  const rows = {};
  for (const id of ['channel', 'pan', 'pool', 'moon']) {
    rows[id] = feedRow({
      name: tw.FEED_NAMES[id],
      buyLabel: FEEDS[id].buy,
      autoText: FEEDS[id].auto,
      onBuy: () => tw.buyFeed(S(), id, false),
      onMax: () => tw.buyFeed(S(), id, true),
    });
  }

  function updateFeeds(t, d) {
    const text = {
      channel: `Each channel brings ${amount(d.fill.div(1 + t.feeds.channel * tw.BAL.channelFill).mul(tw.BAL.channelFill))} more brine a second into the pools while the tide is in. Together they bring ${amount(d.fill)}.`,
      pan: `Each pan dries ${amount(d.dry.div(1 + t.feeds.pan * tw.BAL.panDry).mul(tw.BAL.panDry))} more brine a second while the tide is out. Together they dry ${amount(d.dry)}.`,
      pool: `Each dig doubles what the pools can hold. They hold ${amount(d.pool)} brine now.`,
      moon: `Each step closer multiplies both filling and drying by ${d.moonStep}.`,
    };
    for (const id of Object.keys(rows)) {
      const cost = tw.feedCost(t, id);
      rows[id].set({
        shown: t.open && tw.feedUnlocked(t, id),
        owned: t.feeds[id],
        text: text[id],
        free: tw.feedIsFree(t, id),
        costText: `${amount(cost)} salt`,
        affordable: t.salt.gte(cost),
      });
    }
  }

  const feedAllRow = h('div', { class: 'row' },
    h('button', { class: 'act', onclick: () => tw.feedAll(S()) }, 'Buy everything you can afford'),
    h('span', { style: 'color: var(--muted)' }, 'or press ', h('kbd', {}, 'M')));

  const kelpText = h('p', { class: 'desc' });
  const kelpBox = h('div', { class: 'box' }, h('h3', {}, 'Kelp'), kelpText);

  function stormBox() {
    const note = h('p', { class: 'desc' });
    const btn = h('button', { class: 'act primary', onclick: tryStorm });
    const el = h('div', { class: 'box drift-accent' }, h('h3', {}, 'Storm'), note,
      h('div', { class: 'row', style: 'margin-top: 10px' }, btn, h('span', { style: 'color: var(--muted)' }, 'or press ', h('kbd', {}, 'B'))));
    return {
      el,
      update(t, d) {
        setShown(el, !!t.seen.storm);
        if (!t.seen.storm) return;
        const ready = d.canStorm && d.driftGain.gte(1);
        const stormLine = LINES.find((p) => p.id === 'storm');
        if (ready) setText(note, `Let a storm through and it will scour the shore back to bare rock, leaving driftwood behind. The shore has made ${amount(t.calmSalt)} salt this calm, and the more it has made, the more washes up.`);
        else if (d.lines <= LINES.indexOf(stormLine)) setText(note, `A storm won't leave anything worth having until a tide has passed ${stormLine.name} this calm, which takes ${whole(stormLine.salt)} salt from a single tide.`);
        else setText(note, "The shore hasn't made enough salt this calm for a storm to leave any driftwood.");
        setText(btn, ready ? `Let a storm through for ${whole(d.driftGain)} driftwood` : 'Let a storm through');
        setDisabled(btn, !ready);
      },
    };
  }
  const shoreStorm = stormBox();
  const driftStorm = stormBox();

  const worthRows = ['Kelp', 'Driftwood', 'Strandlines', 'Everything else'].map((label) => {
    const value = h('td');
    return { value, tr: h('tr', {}, h('td', {}, label), value) };
  });
  const worthTotal = h('td');
  const worthBox = h('div', { class: 'box' },
    h('h3', {}, 'How rich the brine is'),
    h('p', { class: 'desc' }, 'Every measure of brine that dries leaves this much salt.'),
    h('table', { class: 'breakdown' }, worthRows.map((r) => r.tr),
      h('tr', { class: 'total' }, h('td', {}, 'Salt from each measure of brine'), worthTotal)));

  function updateWorth(t, d) {
    const show = t.open && d.strength.gt(1.001);
    setShown(worthBox, show);
    if (!show) return;
    const known = new Decimal(d.kelp).mul(d.driftBed).mul(d.lineMult);
    const other = d.strength.div(known);
    const values = [
      [formatMult(d.kelp), !!t.seen.kelp],
      [formatMult(d.driftBed), d.driftBed.gt(1)],
      [formatMult(d.lineMult), d.lineMult > 1],
      [formatMult(other), other.gt(1.001)],
    ];
    worthRows.forEach((r, i) => { setShown(r.tr, values[i][1]); setText(r.value, values[i][0]); });
    setText(worthTotal, format(d.strength, 2));
  }

  const shineText = h('p', {});
  const shineBox = h('div', { class: 'notice' }, h('h3', {}, 'The page is shining'), shineText,
    h('p', {}, 'Pages are folded in the Atlas.'));

  const shorePanel = h('div', { class: 'panel' },
    shineBox, sluiceBox, tideBox, Object.values(rows).map((r) => r.el), feedAllRow, kelpBox, shoreStorm.el, worthBox);

  function updateShore(t, d) {
    setShown(sluiceBox, !t.open);
    setShown(tideBox, t.open);
    if (t.open) updateTide(t, d);
    updateFeeds(t, d);
    const anyManual = Object.keys(rows).some((id) => tw.feedUnlocked(t, id) && !tw.feedIsFree(t, id));
    setShown(feedAllRow, t.open && anyManual);
    setShown(kelpBox, t.open && !!t.seen.kelp);
    if (t.seen.kelp) {
      setText(kelpText, `Kelp has been thickening for ${t.kelp.toLocaleString('en-US')} tides and makes the brine ${format(d.kelp, 2)} times as rich. It grows a little with every tide, however long or short the tide is, and a storm tears it out.`);
    }
    shoreStorm.update(t, d);
    updateWorth(t, d);
    setShown(shineBox, d.shine > 0);
    if (d.shine > 0) setText(shineText, `A tide has passed the far strandline, and Tidewater is giving off ${format(d.shine, 2)} starlight a minute. It has gathered ${formatDown(t.pending)} since the page was last folded.`);
  }

  // --- Strandlines -------------------------------------------------------

  const lineRows = LINES.map((p) => {
    const deg = h('div', { class: 'deg' });
    const name = h('b');
    const text = h('p');
    const li = h('li', {}, deg, h('div', { class: 'what' }, name, text));
    return { p, li, deg, name, text };
  });
  const linesPanel = h('div', { class: 'panel' },
    h('p', { class: 'lead' }, 'A strandline is the mark a tide leaves at the top of its reach. Each of these is passed the first time a single tide leaves that much salt, and what it changes lasts until the next storm.'),
    h('ul', { class: 'points wide' }, lineRows.map((r) => r.li)));

  function updateLines(t, d) {
    lineRows.forEach((r, i) => {
      const known = i < t.bestLines;
      setShown(r.li, i <= t.bestLines);
      setClass(r.li, 'lit', i < d.lines);
      setClass(r.li, 'unknown', !known);
      setText(r.deg, `${whole(r.p.salt)} salt`);
      setText(r.name, known ? r.p.name : 'The sea has not reached this far yet.');
      setText(r.text, known ? r.p.text : '');
    });
  }

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
    setText(driftText, `${whole(t.totalDriftwood)} driftwood has washed up ${t.folds > 0 ? 'since the page was last folded' : 'in all'}. Built into the shore, it makes the brine ${format(d.driftBed, 2)} times as rich, whether or not you've spent it.`);
    const washing = !!S().atlas.nodes.t_storm;
    setShown(washText, washing);
    if (washing) setText(washText, `Rough weather is washing up ${format(d.driftGain.mul(tw.BAL.passiveDriftPerSecond), 1)} driftwood every second.`);
    driftStorm.update(t, d);
    driftGrid.update();
  }

  // --- Sub-tabs ----------------------------------------------------------

  const tabs = subTabs([
    { id: 'shore', label: 'The shore', panel: shorePanel, update: updateShore, open: () => true },
    { id: 'lines', label: 'Strandlines', panel: linesPanel, update: updateLines, open: (t) => t.bestLines >= 1 },
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
    const active = tabs.update((tab) => tab.open(t));
    active.update(t, d);
  }

  function key(k) {
    if (k === 'm') tw.feedAll(S());
    if (k === 'b') tryStorm();
  }

  return { el, update, key };
}
