// Everything you see while looking at Tidewater.
import { h, setText, setShown, setClass, confirmBox } from './dom.js';
import { Decimal, format, formatInt, formatMult } from '../core/num.js';
import { upgradeGrid, feedRow, subTabs, pointList, resetBox, breakdown, shineStat, dial, real } from './parts.js';
import { REDUCED, f0, attr, showSvg, dec, rng, makeScene, mainBar } from './scene.js';
import * as tw from '../worlds/tidewater.js';
import { paceMult } from '../worlds/links.js';

const amount = (x) => format(x, 1);
const whole = (x) => formatInt(x);
const secs = (x) => (x < 10 ? x.toFixed(1) : Math.round(x).toString()) + 's';
const LINES = tw.STRANDLINES;

export function buildTidewater(game) {
  const S = () => game.state;
  const pace = () => paceMult(game.state, 'tidewater');
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

  // --- Strip -------------------------------------------------------------

  const saltAmount = h('b');
  const rate = h('b');
  const tideLine = h('b');
  const speedText = h('div', { class: 'tw-speed' });
  const strip = h('header', { class: 'tw-strip' },
    h('div', { class: 'tw-stat' }, saltAmount, h('span', {}, 'salt')),
    h('div', { class: 'tw-stat' }, rate, h('span', {}, 'salt per second')),
    h('div', { class: 'tw-stat' }, tideLine, h('span', {}, 'tide')),
    speedText);

  function updateStrip(t, d) {
    setText(saltAmount, amount(t.salt));
    setText(rate, t.open ? amount(real(d.income, pace())) : '0');
    if (!t.open) setText(tideLine, '-');
    else if (pace() / t.period > 0.6) setText(tideLine, `${format(pace() / t.period, 1)} a second`);
    else setText(tideLine, t.phase < d.high ? `In ${secs(d.high - t.phase)}` : `Out ${secs(t.period - t.phase)}`);
    setShown(speedText, pace() > 1);
    setText(speedText, `Gamespeed: ${whole(pace())}×`);
  }

  // --- The shore ---------------------------------------------------------
  // A cross-section: sea on the left, a beach climbing to a flat shelf of rock
  // pools on the right, a peg on the slope for each strandline. The water
  // rises and falls with the tide; pools fill with brine; salt banks up at the
  // far end. Drawn once; after that only heights, counts and classes move.

  const MAXL = LINES.length;
  const short = (n) => {
    if (n < 1e4) return n.toLocaleString('en-US');
    const e = Math.floor(Math.log10(n));
    return `${+(n / 10 ** e).toFixed(1)}e${e}`;
  };
  const slopeY = (x) => 372 - ((x - 380) * 110) / 720;
  const wave = (y, k) => `<g class="wv w${k}"><path d="M-120 ${y} ${'q15 -8 30 0 t30 0 '.repeat(30)}V420H-120Z"/></g>`;

  function shoreSvg() {
    const r = rng(11);
    let s = '<svg viewBox="0 0 1600 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
    // Sky: flat bands, a few stars, the moon.
    s += '<rect width="1600" height="420" fill="#08111a"/><rect y="70" width="1600" height="80" fill="#0b1824"/><rect y="150" width="1600" height="80" fill="#0e2030"/><rect y="230" width="1600" height="190" fill="#12293b"/>';
    for (let i = 0; i < 26; i++) s += `<rect x="${f0(r() * 1600)}" y="${f0(r() * 190)}" width="${r() > 0.7 ? 3 : 2}" height="${r() > 0.7 ? 3 : 2}" fill="#dfeaf0" opacity="${(0.3 + r() * 0.5).toFixed(2)}"/>`;
    s += '<g id="tw-halos" fill="#e6eef2"><circle cx="420" cy="96" r="112" opacity=".04"/><circle cx="420" cy="96" r="92" opacity=".05"/><circle cx="420" cy="96" r="72" opacity=".06"/><circle cx="420" cy="96" r="52" opacity=".08"/></g>';
    s += '<circle cx="420" cy="96" r="34" fill="#e9eef0"/><circle cx="408" cy="86" r="7" fill="#cdd8dc"/><circle cx="432" cy="106" r="5" fill="#cdd8dc"/><circle cx="426" cy="80" r="3" fill="#cdd8dc"/>';
    // The sea, three bands of it, rising and falling as one.
    s += '<g id="tw-sea">' + wave(270, 1).replace('<path', '<path fill="#3a86ad"') + '<rect y="282" width="1600" height="120" fill="#3a86ad"/>'
      + wave(306, 2).replace('<path', '<path fill="#2b6a8c"') + '<rect y="318" width="1600" height="100" fill="#2b6a8c"/>'
      + wave(342, 3).replace('<path', '<path fill="#1f4e6a"') + '<rect y="354" width="1600" height="100" fill="#1f4e6a"/></g>';
    // Kelp, standing on the sea floor.
    const kx = [70, 130, 200, 255, 310, 165];
    s += '<g class="kelp">';
    kx.forEach((x, i) => { s += `<g class="kb" data-i="${i}"><polygon points="${x} 400 ${x - 5} 356 ${x + 3} 330 ${x - 2} 300 ${x + 9} 330 ${x + 5} 356 ${x + 10} 400" fill="${i % 2 ? '#2f7a4c' : '#3c8a58'}" style="animation-delay:${-i * 0.7}s"/></g>`; });
    s += '</g>';
    // The land, with a rim of moonlight along its top.
    s += '<g class="land"><polygon points="0 420 0 392 260 388 380 372 1000 272 1060 252 1600 246 1600 420" fill="#0a1017"/></g>';
    s += '<rect y="398" width="1600" height="22" fill="#070b10"/>';
    // The sluice, shut until you open it.
    s += '<g id="tw-gate" class="land"><rect x="1100" y="226" width="12" height="40" fill="#1a1410"/><rect x="1092" y="220" width="28" height="8" fill="#1a1410"/></g>';
    // Pegs: one per strandline.
    LINES.forEach((p, i) => { s += `<g class="peg" data-i="${i}"><rect x="-1.5" y="-18" width="3" height="18" fill="#6b8296"/><polygon points="1.5 -18 14 -13 1.5 -8" fill="#6b8296"/><text class="r" y="${i % 2 ? -44 : -26}" style="text-anchor:middle"></text></g>`; });
    // Pools on the shelf.
    for (let i = 0; i < 5; i++) {
      const x = 1136 + i * 66;
      s += `<g class="pool" data-i="${i}"><polygon points="${x} 246 ${x + 54} 246 ${x + 48} 274 ${x + 6} 274" fill="#04080c"/><rect class="brine" x="${x + 7}" y="274" width="${40}" height="0" fill="#4a9ac2"/><rect x="${x}" y="244" width="54" height="3" fill="#2a3f50"/></g>`;
    }
    // Driftwood and a bank of salt.
    for (let i = 0; i < 4; i++) s += `<g class="log" data-i="${i}"><rect x="${1040 + (i % 2) * 8}" y="${244 - i * 9}" width="${58 - (i % 2) * 6}" height="8" fill="#8a6a48"/><rect x="${1040 + (i % 2) * 8}" y="${244 - i * 9}" width="5" height="8" fill="#5a4430"/></g>`;
    s += '<polygon id="tw-salt" class="saltbank" points="0 0"/>';
    s += '</svg>';
    return s;
  }

  const sc = makeScene('tw-scene', shoreSvg());
  const scene = sc.el;
  const sea = sc.q('#tw-sea');
  const gateEl = sc.q('#tw-gate');
  const halos = sc.qa('#tw-halos circle');
  const kelpBlades = sc.qa('.kb');
  const pegs = sc.qa('.peg').map((g) => ({ g, text: g.querySelector('text') }));
  const pools = sc.qa('.pool').map((g) => ({ g, brine: g.querySelector('.brine') }));
  const logs = sc.qa('.log');
  const saltBank = sc.q('#tw-salt');

  function updateScene(t, d) {
    // Water: in at high water, out at low water. A tide that cycles faster than
    // the eye can follow stays at half water and just keeps moving.
    const fast = t.open && pace() / t.period > 0.6;
    const level = !t.open ? 0 : fast ? 0.5 : (t.phase < d.high ? 1 : 0);
    sea.style.transform = `translateY(${f0((1 - level) * 70)}px)`;
    showSvg(gateEl, !t.open);
    halos.forEach((c, i) => showSvg(c, t.feeds.moon > 3 - i));
    const kelpOn = t.kelp > 0 ? Math.min(6, 1 + Math.floor(Math.log10(t.kelp + 1) * 2)) : 0;
    kelpBlades.forEach((k, i) => showSvg(k, i < kelpOn));

    const n = tw.lineCap(S());
    pegs.forEach((p, i) => {
      const on = i < n && i <= t.bestLines;
      showSvg(p.g, on);
      if (!on) return;
      const x = 440 + (i * 520) / Math.max(1, n - 1);
      attr(p.g, 'transform', `translate(${f0(x)} ${f0(slopeY(x))})`);
      setClass(p.g, 'lit', i < d.lines);
      setText(p.text, short(LINES[i].salt));
    });

    const shown = t.open ? Math.min(5, 1 + t.feeds.pool) : 0;
    const frac = !t.open ? 0 : fast ? 0.5 : Math.min(1, t.brine.div(d.pool).toNumber());
    pools.forEach((p, i) => {
      showSvg(p.g, i < shown);
      if (i >= shown) return;
      attr(p.brine, 'height', f0(frac * 24));
      attr(p.brine, 'y', f0(274 - frac * 24));
    });
    const drift = t.totalDriftwood.gt(0) ? Math.min(4, 1 + Math.floor(dec(t.totalDriftwood) / 2)) : 0;
    logs.forEach((l, i) => showSvg(l, i < drift));
    const sh = t.salt.gt(0) ? 8 + 30 * Math.min(1, dec(t.salt) / 14) : 0;
    showSvg(saltBank, sh > 0);
    if (sh > 0) attr(saltBank, 'points', `1480 248 1500 ${f0(246 - sh * 0.5)} 1530 ${f0(246 - sh * 0.8)} 1550 ${f0(246 - sh)} 1574 ${f0(246 - sh * 0.7)} 1590 ${f0(246 - sh * 0.3)} 1600 248`);
  }

  // The world's main control sits in the scene.
  const main = mainBar('tw', () => { if (!T().open) tw.openSluice(S()); else tryStorm(); });
  scene.append(main.el);

  function updateMain(t, d) {
    if (!t.open) { main.set({ label: 'Open the sluice', hotkey: false }); return; }
    const ready = d.canStorm && d.driftGain.gte(1);
    main.set({ shown: !!t.seen.storm, label: ready ? `Storm for ${whole(d.driftGain)} driftwood` : 'Storm', enabled: ready });
  }

  // --- Shore -------------------------------------------------------------

  const tideText = h('p', { class: 'desc' });
  const tideHint = h('p', { class: 'note hint' });
  const gate = dial({ min: 10, max: 90, onInput: (v) => tw.setGate(S(), v / 100) });
  const period = dial({ min: tw.BAL.minPeriod, max: tw.BAL.maxPeriod, onInput: (v) => tw.setPeriod(S(), v) });
  const lastTide = h('p', { class: 'desc' });
  const tideBox = h('div', { class: 'box' },
    h('h3', {}, 'Tide settings'),
    tideText, tideHint, gate.el, period.el,
    h('p', { class: 'note' }, 'Changes apply at the next tide. A longer tide leaves more salt at once.'),
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

  // The reef, from the expansion. Planting is always done by hand.
  const plots = [];
  for (let i = 0; i < tw.REEF_PLOTS; i++) {
    const select = h('select', { onchange: () => tw.plantCoral(S(), i, select.value) },
      h('option', { value: '' }, 'Empty'), tw.CORALS.map((c) => h('option', { value: c.id }, c.name)));
    const worth = h('div', { class: 'worth' });
    plots.push({ select, worth, el: h('div', { class: 'tw-tile' }, h('div', { class: 'at' }, `Plot ${i + 1}`), select, worth) });
  }
  const reefBox = h('div', { class: 'box' }, h('h3', {}, 'Reef'),
    h('p', { class: 'desc' }, 'Coral grows by 1 every tide. Replanting a plot starts it again.'),
    tw.CORALS.map((c) => h('p', { class: 'desc' }, `${c.name}: ${c.text}`)),
    h('div', { class: 'tw-tiles' }, plots.map((p) => p.el)));

  function updateReef(t) {
    const open = tw.reefPlots(S());
    setShown(reefBox, open > 0);
    plots.forEach((p, i) => {
      setShown(p.el, i < open);
      if (i >= open) return;
      if (document.activeElement !== p.select && p.select.value !== t.reef[i]) p.select.value = t.reef[i];
      setText(p.worth, t.reef[i] ? `Grown ${t.reefAge[i]} tides. ${formatMult(tw.coralWorth(t.reefAge[i]))}` : '');
    });
  }

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
  const shine = shineStat('tw', game);
  strip.insertBefore(shine.el, speedText);

  const feedBox = h('div', { class: 'box tw-feeds' }, h('h3', {}, 'Shore'), Object.values(rows).map((r) => r.el), buyAll);
  const shorePanel = h('div', { class: 'panel tide-accent' }, scene,
    h('div', { class: 'tw-layout' },
      h('div', { class: 'tw-col' }, tideBox, kelpBox, reefBox),
      h('div', { class: 'tw-col' }, feedBox, worth.el)));

  function updateShore(t, d) {
    updateReef(t);
    updateScene(t, d);
    updateMain(t, d);
    setShown(feedBox, t.open);
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
    h('p', { class: 'desc' }, 'Passed when a single tide leaves that much salt. Lasts until the next storm.'),
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
    if (washing) setText(washText, `Washing up ${format(d.driftGain.mul(tw.BAL.passiveDriftPerSecond * pace()), 1)} driftwood per second.`);
    updateStorm(driftStorm, t, d);
    driftGrid.update();
  }

  // --- Sub-tabs ----------------------------------------------------------

  const tabs = subTabs([
    { id: 'shore', label: 'Shore', panel: shorePanel, update: updateShore, open: () => true },
    { id: 'lines', label: 'Strandlines', panel: linesPanel, update: (t, d) => lines.update(t.bestLines, d.lines, tw.lineCap(S())), open: (t) => t.bestLines >= 1 },
    { id: 'drift', label: 'Driftwood', panel: driftPanel, update: updateDrift, open: (t) => !!t.seen.storm },
  ], {
    current: () => S().ui.tidewaterTab,
    choose: (id) => { S().ui.tidewaterTab = id; },
    visited: () => T().seen,
  });
  const el = h('section', { class: 'tw', 'data-world': 'tidewater' }, strip, tabs.nav, tabs.panels);

  function update() {
    const t = T();
    const d = tw.calc(S());
    updateStrip(t, d);
    shine.set(d.shine, t.pending, pace());
    tabs.update((tab) => tab.open(t)).update(t, d);
  }

  function key(k) {
    if (k === 'm') tw.feedAll(S());
    if (k === 'b') tryStorm();
  }

  return { el, update, key };
}
