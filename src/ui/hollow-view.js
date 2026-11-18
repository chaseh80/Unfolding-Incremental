// Everything you see while looking at Hollow.
import { h, setText, setShown, setClass, setDisabled, confirmBox } from './dom.js';
import { format, formatInt, formatMult, formatTime } from '../core/num.js';
import { upgradeGrid, subTabs, pointList, resetBox, breakdown, shineStat, real, speedLabel } from './parts.js';
import { f0, attr, showSvg, dec, rng, makeScene, mainBar } from './scene.js';
import * as hollow from '../worlds/hollow.js';
import { paceMult } from '../worlds/links.js';

const amount = (x) => format(x, 1);
const whole = (x) => formatInt(x);

export function buildHollow(game) {
  const S = () => game.state;
  const pace = () => paceMult(game.state, 'hollow');
  const H = () => game.state.hollow;

  function tryCollapse() {
    const c = H();
    const d = hollow.calc(S());
    if (!d.canCollapse || d.geodeGain.lt(1)) return;
    if (c.collapses === 0) {
      confirmBox({
        title: 'Collapse?',
        body: `Resets crystal, facets and the lattice. You get ${whole(d.geodeGain)} geodes.`,
        yes: 'Collapse',
        onYes: () => hollow.collapse(S()),
      });
      return;
    }
    hollow.collapse(S());
  }

  function tryDissolve() {
    if (H().order.length === 0) return;
    confirmBox({
      title: 'Dissolve the lattice?',
      body: 'Refunds every facet spent on nodes. The crystal you are holding resets to 0.',
      yes: 'Dissolve',
      onYes: () => hollow.dissolve(S()),
    });
  }

  // --- Strip -------------------------------------------------------------

  const crystalAmount = h('b');
  const rate = h('b');
  const facetStat = h('b');
  const speedText = h('div', { class: 'ho-speed' });
  const strip = h('header', { class: 'ho-strip' },
    h('div', { class: 'ho-stat' }, crystalAmount, h('span', {}, 'crystal')),
    h('div', { class: 'ho-stat' }, rate, h('span', {}, 'crystal per second')),
    h('div', { class: 'ho-stat' }, facetStat, h('span', {}, 'facets')),
    speedText);

  function updateStrip(c, d) {
    setText(crystalAmount, amount(c.crystal));
    setText(rate, c.open ? amount(real(d.rate, pace())) : '0');
    setText(facetStat, c.open ? `${d.unspent} / ${d.facets}` : '-');
    setShown(speedText, pace() > 1);
    setText(speedText, speedLabel(pace()));
  }

  // --- The cave ----------------------------------------------------------
  // Faceted rock, a ceiling of stalactites, crystal clusters that grow as the
  // crystal does, geodes on the floor, and a shaft down the right with a notch
  // for each chamber. Drawn once; after that only sizes and counts move.

  const CH = hollow.CHAMBERS;
  const COL_X = 1470, COL_TOP = 40, COL_BOT = 346;
  const short = (n) => {
    if (n < 1e4) return n.toLocaleString('en-US');
    const e = Math.floor(Math.log10(n));
    return `${+(n / 10 ** e).toFixed(1)}e${e}`;
  };
  const CL = [200, 330, 470, 600, 700, 900, 1010, 1130, 1260, 1380];

  function caveSvg() {
    const r = rng(23);
    let s = '<svg viewBox="0 0 1600 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
    s += '<rect width="1600" height="420" fill="#0b0813"/>';
    // The back wall: big flat facets of rock.
    const wall = ['#100b1c', '#130e22', '#0e0919', '#151027'];
    for (let i = 0; i < 16; i++) {
      const x = i * 100 - 40, y = 40 + r() * 80;
      s += `<polygon points="${x} ${f0(y)} ${x + 140} ${f0(y - 30 + r() * 60)} ${x + 120} ${f0(y + 200 + r() * 80)} ${x - 20} ${f0(y + 180)}" fill="${wall[i % 4]}"/>`;
    }
    s += '<g id="ho-glow" fill="#8a5fd0"><circle cx="760" cy="340" r="340" opacity=".05"/><circle cx="760" cy="340" r="240" opacity=".06"/><circle cx="760" cy="340" r="150" opacity=".08"/></g>';
    // Ceiling.
    let pts = '0 0';
    for (let x = 0; x <= 1600; x += 60) pts += ` ${x} ${f0(30 + r() * 20)} ${x + 20} ${f0(70 + r() * 70)} ${x + 40} ${f0(26 + r() * 20)}`;
    s += `<g class="dark rim"><polygon points="${pts} 1600 0"/></g>`;
    // The floor.
    s += '<polygon points="0 420 0 372 220 360 520 376 860 358 1160 374 1600 362 1600 420" fill="#07050d"/>';
    // Crystal clusters: three to five shards each, drawn at their nominal size.
    s += '<g class="clusters">';
    CL.forEach((x, i) => {
      const k = 0.8 + r() * 0.5;
      s += `<g class="cluster" data-i="${i}" transform="translate(${x} 372)"><g class="cs" transform="scale(${k.toFixed(2)})">`;
      const shards = [[-34, 50 + r() * 40, 12, -12], [-8, 90 + r() * 50, 16, r() * 10 - 5], [22, 60 + r() * 50, 13, 10], [48, 36 + r() * 30, 10, 18]];
      shards.forEach(([dx, hgt, w, lean]) => {
        const tip = `${f0(dx + lean)} ${f0(-hgt)}`;
        s += `<polygon points="${dx - w} 0 ${dx - w + 2} ${f0(-hgt * 0.8)} ${tip} ${dx} 0" fill="#8a5fd0"/><polygon points="${dx} 0 ${tip} ${dx + w + 1} ${f0(-hgt * 0.8)} ${dx + w} 0" fill="#c7a6f0"/><polygon points="${dx + w} 0 ${dx + w + 1} ${f0(-hgt * 0.8)} ${dx + w + 7} ${f0(-hgt * 0.55)} ${dx + w + 6} 0" fill="#5a3a9a"/>`;
      });
      s += '</g></g>';
    });
    s += '</g>';
    // Geodes on the floor.
    for (let i = 0; i < 4; i++) s += `<g class="geode" data-i="${i}"><ellipse cx="${[120, 250, 1250, 1380][i]}" cy="404" rx="30" ry="15" fill="#2a2038"/><ellipse cx="${[120, 250, 1250, 1380][i]}" cy="402" rx="19" ry="8" fill="#e39ab5"/><ellipse cx="${[120, 250, 1250, 1380][i]}" cy="401" rx="9" ry="4" fill="#f6d0de"/></g>`;
    // Glints in the air.
    s += '<g class="glints">';
    for (let i = 0; i < 10; i++) s += `<rect class="gl" x="${f0(100 + r() * 1300)}" y="${f0(90 + r() * 260)}" width="4" height="4" fill="#e5d6ff" style="animation-delay:${-i * 0.9}s;animation-duration:${6 + (i % 4)}s"/>`;
    s += '</g>';
    // The shaft: a notch for each chamber.
    s += `<rect x="${COL_X - 4}" y="${COL_TOP - 8}" width="32" height="${COL_BOT - COL_TOP + 16}" fill="#050309"/><rect x="${COL_X}" y="${COL_TOP}" width="24" height="${COL_BOT - COL_TOP}" fill="#1a1229"/>`;
    s += `<rect id="ho-fill" x="${COL_X}" y="${COL_BOT}" width="24" height="0" fill="#b28cf0"/><rect x="${COL_X - 4}" y="${COL_TOP - 8}" width="3" height="${COL_BOT - COL_TOP + 16}" fill="#6a4aa0"/>`;
    CH.forEach((p) => { s += '<g class="tick"><rect x="' + (COL_X + 24) + '" y="-1" width="10" height="2"/><text class="r" x="' + (COL_X + 42) + '" y="5"></text></g>'; });
    s += '</svg>';
    return s;
  }

  const sc = makeScene('ho-scene', caveSvg());
  const scene = sc.el;
  const clusters = sc.qa('.cluster').map((g) => ({ g, cs: g.querySelector('.cs') }));
  const geodeRocks = sc.qa('.geode');
  const glow = sc.q('#ho-glow');
  const colFill = sc.q('#ho-fill');
  const ticks = sc.qa('.tick').map((g) => ({ g, text: g.querySelector('text') }));

  function updateScene(c, d) {
    const n = hollow.chamberCap(S());
    let pos = 0;
    if (c.open && c.crystal.gt(1)) {
      if (d.chambers >= n) pos = 1;
      else {
        const from = d.chambers > 0 ? Math.log10(CH[d.chambers - 1].crystal) : 0;
        const next = Math.log10(CH[d.chambers].crystal);
        pos = (d.chambers + Math.min(1, Math.max(0, (dec(c.crystal) - from) / (next - from)))) / n;
      }
    }
    attr(glow, 'opacity', (0.25 + 0.75 * pos).toFixed(2));
    const shown = c.open ? Math.min(CL.length, 1 + Math.floor(d.facets / 2)) : 0;
    const scale = (0.4 + 0.75 * pos).toFixed(2);
    clusters.forEach((k, i) => {
      showSvg(k.g, i < shown);
      if (i < shown) attr(k.cs, 'transform', `scale(${scale})`);
    });
    const gn = c.totalGeodes.gt(0) ? Math.min(4, 1 + Math.floor(dec(c.totalGeodes) / 3)) : 0;
    geodeRocks.forEach((x, i) => showSvg(x, i < gn));
    const span = COL_BOT - COL_TOP;
    attr(colFill, 'y', f0(COL_BOT - pos * span)); attr(colFill, 'height', f0(pos * span));
    ticks.forEach((t, i) => {
      const on = i < n && i <= c.bestChambers;
      showSvg(t.g, on);
      if (!on) return;
      attr(t.g, 'transform', `translate(${COL_X - COL_X} ${f0(COL_BOT - ((i + 1) / n) * span)})`);
      setClass(t.g, 'lit', i < d.chambers);
      setText(t.text, short(CH[i].crystal));
    });
  }

  // The main control: break through, then the facet you can buy. Once facets
  // are bought for you it becomes the collapse.
  const main = mainBar('ho', () => {
    const c = H();
    if (!c.open) hollow.breakThrough(S());
    else if (!c.geodeUp.miner) hollow.buyFacet(S(), false);
    else tryCollapse();
  }, 'M');
  scene.append(main.el);

  function updateMain(c, d) {
    if (!c.open) { main.set({ label: 'Break through', hotkey: false }); return; }
    if (!c.geodeUp.miner) {
      const cost = hollow.facetCost(c);
      main.set({ label: `Buy a facet for ${amount(cost)} crystal`, enabled: c.crystal.gte(cost), hotkey: true });
      return;
    }
    const ready = d.canCollapse && d.geodeGain.gte(1);
    main.set({ shown: !!c.seen.collapse, label: ready ? `Collapse for ${whole(d.geodeGain)} geodes` : 'Collapse', enabled: ready, hotkey: false });
  }

  // --- Cave --------------------------------------------------------------

  const facetText = h('p', { class: 'desc' });
  const facetMax = h('button', { class: 'act', onclick: () => hollow.buyFacet(S(), true) }, 'Buy as many as you can');
  const facetAuto = h('span', { class: 'auto' }, 'Automatic');
  const facetBox = h('div', { class: 'box' }, h('h3', {}, 'Facets'), facetText,
    h('div', { class: 'row', style: 'margin-top: 8px' }, facetMax, facetAuto));

  const cards = {};
  const makeCard = (n) => {
    const state = h('span', { class: 'cost' });
    const value = h('span', { class: 'need' });
    const el = h('button', { class: 'upgrade node', onclick: () => hollow.buyNode(S(), n.id) },
      h('span', { class: 'name' }, n.name), h('span', { class: 'text' }, n.text), value, state);
    cards[n.id] = { n, el, state, value };
    return el;
  };
  const rowOf = (r, link = false) => h('div', { class: 'lattice-row' + (link ? ' link' : '') }, hollow.NODES.filter((n) => n.row === r).map(makeCard));
  const row1 = rowOf(1, true);
  const row2 = rowOf(2, true);
  const bridges = h('div', { class: 'lattice-row bridges link' }, hollow.NODES.filter((n) => n.bridge).map(makeCard));
  const row3 = rowOf(3, true);
  const row4 = rowOf(4, true);
  const row5 = rowOf(5);
  const core = h('div', { class: 'lattice-row core' }, hollow.NODES.filter((n) => n.core).map(makeCard));
  const pickNote = h('p', { class: 'desc' });
  const dissolveBtn = h('button', { class: 'act', onclick: tryDissolve }, 'Dissolve');
  const latticeBox = h('div', { class: 'box' }, h('h3', {}, 'Lattice'), pickNote,
    row1, row2, bridges, row3, row4, row5, core,
    h('div', { class: 'row' }, dissolveBtn),
    h('p', { class: 'note' }, 'Dissolve refunds all facets. Crystal resets to 0.'));

  function updateLattice(c, d) {
    const picks = hollow.firstRowPicks(c, S());
    setText(pickNote, `Pick ${picks} from the first row. Each node needs the one above it.`);
    setShown(row2, !!c.seen.row2);
    setShown(bridges, !!c.seen.bridges);
    setShown(row3, !!c.seen.row3);
    setShown(row4, !!c.seen.row4);
    setShown(row5, !!c.seen.row5);
    setShown(core, !!c.seen.core);
    for (const id of Object.keys(cards)) {
      const k = cards[id];
      const st = hollow.nodeState(S(), id);
      setClass(k.el, 'owned', !!st.owned);
      setClass(k.el, 'can', !!st.ok);
      setClass(k.el, 'cant', !st.owned && !st.ok);
      const cost = hollow.nodeCost(c, id);
      const price = cost === 0 ? 'Free' : `${cost} facet${cost === 1 ? '' : 's'}`;
      setText(k.state, st.owned ? 'Grown' : (st.blocked ? st.why : price));
      const worth = d.worth[id] !== undefined ? d.worth[id] : d.light[id];
      setShown(k.value, !!st.owned && worth !== undefined);
      if (st.owned && worth !== undefined) setText(k.value, formatMult(worth));
    }
    setDisabled(dissolveBtn, c.order.length === 0);
  }

  const caveCollapse = resetBox({ title: 'Collapse', accent: 'geode-accent', onClick: tryCollapse, hotkey: 'B' });
  const geodeCollapse = resetBox({ title: 'Collapse', accent: 'geode-accent', onClick: tryCollapse, hotkey: 'B' });

  function updateCollapse(box, c, d) {
    const ready = d.canCollapse && d.geodeGain.gte(1);
    const hall = hollow.CHAMBERS.find((p) => p.id === 'hall');
    let text;
    if (d.chambers <= hollow.CHAMBERS.indexOf(hall)) text = [`Reach ${hall.name} this collapse to collapse (${whole(hall.crystal)} crystal).`];
    else if (ready) text = ['Resets crystal, facets and the lattice.', `Crystal grown this collapse: ${amount(c.grown)}.`];
    else text = [`Crystal grown this collapse: ${amount(c.grown)} of ${whole(hollow.BAL.geodeNeedsCrystal)} needed.`];
    if (c.seen.collapse) text[2] = `Pressure building for ${formatTime(c.collapseTime)}. Multiplies geode gain by ${format(d.pressure, 2)}.`;
    box.set({ shown: !!c.seen.collapse, text, label: ready ? `Collapse for ${whole(d.geodeGain)} geodes` : 'Collapse', ready });
  }

  const sources = breakdown('Crystal sources', ['Lattice', 'Facets', 'Geodes', 'Chambers', 'Other'], 'Crystal per second');
  const shine = shineStat('ho', game);
  strip.insertBefore(shine.el, speedText);

  const cavePanel = h('div', { class: 'panel crystal-accent' }, scene,
    facetBox, latticeBox, caveCollapse.el, sources.el);

  function updateCave(c, d) {
    updateScene(c, d);
    updateMain(c, d);
    setShown(facetBox, c.open);
    setShown(latticeBox, c.open && d.facets > 0);
    if (c.open) {
      setText(facetText, `${d.unspent} unspent of ${d.facets}. Each facet doubles crystal.`);
      const auto = !!c.geodeUp.miner;
      setShown(facetMax, !auto);
      setShown(facetAuto, auto);
      if (!auto) setDisabled(facetMax, c.crystal.lt(hollow.facetCost(c)));
      if (d.facets > 0) updateLattice(c, d);
    }
    updateCollapse(caveCollapse, c, d);
    sources.set(c.open, [
      d.lattice.gt(1.001) || d.lattice.lt(0.999) ? formatMult(d.lattice) : null,
      d.facets > 0 ? formatMult(d.facetMult) : null,
      d.geodeBed.gt(1) ? formatMult(d.geodeBed) : null,
      d.chamberMult > 1 ? formatMult(d.chamberMult) : null,
      d.other.gt(1.001) ? formatMult(d.other) : null,
    ], amount(real(d.rate, pace())));
  }

  // --- Chambers ----------------------------------------------------------

  const chambers = pointList(hollow.CHAMBERS, (p) => `${whole(p.crystal)} crystal`);
  const chambersPanel = h('div', { class: 'panel' },
    h('p', { class: 'desc' }, 'Reached when you hold that much crystal. Lasts until collapse.'),
    chambers.el);

  // --- Geodes ------------------------------------------------------------

  const geodeAmount = h('span');
  const geodeText = h('p', { class: 'desc' });
  const fallText = h('p', { class: 'desc' });
  const geodeGrid = upgradeGrid(hollow.GEODE_UPGRADES, {
    owned: (id) => !!H().geodeUp[id],
    have: () => H().geodes,
    buy: (id) => hollow.buyGeodeUpgrade(S(), id),
    unit: 'geodes',
    seen: () => H().seen,
    shownKey: 'geodeCards',
    note: (u) => hollow.needText(u),
    blocked: (u) => !hollow.needMet(S(), u),
  });
  const geodePanel = h('div', { class: 'panel geode-accent' },
    h('div', { class: 'figure' }, geodeAmount, h('small', {}, 'geodes')),
    geodeText, fallText, geodeCollapse.el, geodeGrid.el);

  function updateGeodes(c, d) {
    setText(geodeAmount, whole(c.geodes));
    setText(geodeText, `Found ${whole(c.totalGeodes)} geodes${c.folds > 0 ? ' this fold' : ''}. Multiplies crystal by ${format(d.geodeBed, 2)}.`);
    const falling = !!S().atlas.nodes.h_geode;
    setShown(fallText, falling);
    if (falling) setText(fallText, `Gaining ${format(d.geodeGain.mul(hollow.BAL.passiveGeodePerSecond * pace()), 1)} geodes per second.`);
    updateCollapse(geodeCollapse, c, d);
    geodeGrid.update();
  }

  // --- Sub-tabs ----------------------------------------------------------

  const tabs = subTabs([
    { id: 'cave', label: 'Cave', panel: cavePanel, update: updateCave, open: () => true },
    { id: 'chambers', label: 'Chambers', panel: chambersPanel, update: (c, d) => chambers.update(c.bestChambers, d.chambers, hollow.chamberCap(S())), open: (c) => c.bestChambers >= 1 },
    { id: 'geodes', label: 'Geodes', panel: geodePanel, update: updateGeodes, open: (c) => !!c.seen.collapse },
  ], {
    current: () => S().ui.hollowTab,
    choose: (id) => { S().ui.hollowTab = id; },
    visited: () => H().seen,
  });
  const el = h('section', { class: 'ho', 'data-world': 'hollow' }, strip, tabs.nav, tabs.panels);

  function update() {
    const c = H();
    const d = hollow.calc(S());
    updateStrip(c, d);
    shine.set(d.shine, c.pending, pace());
    tabs.update((tab) => tab.open(c)).update(c, d);
  }

  function key(k) {
    if (k === 'm') hollow.buyFacet(S(), true);
    if (k === 'b') tryCollapse();
  }

  return { el, update, key };
}
