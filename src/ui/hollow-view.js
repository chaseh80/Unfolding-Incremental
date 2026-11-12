// Everything you see while looking at Hollow.
import { h, setText, setShown, setClass, setDisabled, confirmBox } from './dom.js';
import { format, formatInt, formatMult, formatTime } from '../core/num.js';
import { startBox, upgradeGrid, subTabs, pointList, resetBox, breakdown, shineNotice } from './parts.js';
import * as hollow from '../worlds/hollow.js';

const amount = (x) => format(x, 1);
const whole = (x) => formatInt(x);

export function buildHollow(game) {
  const S = () => game.state;
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

  // --- Status strip ------------------------------------------------------

  const crystalAmount = h('span');
  const rate = h('div', { class: 'rate' });
  const status = h('div', { class: 'status crystal-accent' },
    h('div', { class: 'amount' }, crystalAmount, h('small', {}, 'crystal')), rate);

  function updateStatus(c, d) {
    setText(crystalAmount, amount(c.crystal));
    setText(rate, c.open ? `+${amount(d.rate)} per second` : 'Sealed');
  }

  // --- Cave --------------------------------------------------------------

  const start = startBox('Solid rock.', 'Break through', () => hollow.breakThrough(S()));

  const facetText = h('p', { class: 'desc' });
  const facetBuy = h('button', { class: 'act', onclick: () => hollow.buyFacet(S(), false) });
  const facetMax = h('button', { class: 'act small', onclick: () => hollow.buyFacet(S(), true) }, 'Max');
  const facetAuto = h('span', { class: 'auto' }, 'Automatic');
  const facetBox = h('div', { class: 'box' }, h('h3', {}, 'Facets'), facetText,
    h('div', { class: 'row', style: 'margin-top: 8px' }, facetBuy, facetMax, facetAuto));

  const cards = {};
  const makeCard = (n) => {
    const state = h('span', { class: 'cost' });
    const value = h('span', { class: 'need' });
    const el = h('button', { class: 'upgrade node', onclick: () => hollow.buyNode(S(), n.id) },
      h('span', { class: 'name' }, n.name), h('span', { class: 'text' }, n.text), value, state);
    cards[n.id] = { n, el, state, value };
    return el;
  };
  const rowOf = (r) => h('div', { class: 'lattice-row' }, hollow.NODES.filter((n) => n.row === r).map(makeCard));
  const row1 = rowOf(1);
  const row2 = rowOf(2);
  const bridges = h('div', { class: 'lattice-row bridges' }, hollow.NODES.filter((n) => n.bridge).map(makeCard));
  const row3 = rowOf(3);
  const row4 = rowOf(4);
  const core = h('div', { class: 'lattice-row core' }, hollow.NODES.filter((n) => n.core).map(makeCard));
  const pickNote = h('p', { class: 'desc' });
  const dissolveBtn = h('button', { class: 'act', onclick: tryDissolve }, 'Dissolve');
  const latticeBox = h('div', { class: 'box' }, h('h3', {}, 'Lattice'), pickNote,
    row1, row2, bridges, row3, row4, core,
    h('div', { class: 'row', style: 'margin-top: 12px' }, dissolveBtn,
      h('span', { class: 'note', style: 'color: var(--muted)' }, 'Refunds all facets. Crystal resets to 0.')));

  function updateLattice(c, d) {
    const picks = hollow.firstRowPicks(c);
    setText(pickNote, `Pick ${picks} from the first row. Each node needs the one above it.`);
    setShown(row2, !!c.seen.row2);
    setShown(bridges, !!c.seen.bridges);
    setShown(row3, !!c.seen.row3);
    setShown(row4, !!c.seen.row4);
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
      const worth = d.worth[id];
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
  const shine = shineNotice('Hollow');

  const cavePanel = h('div', { class: 'panel crystal-accent' },
    shine.el, start, facetBox, latticeBox, caveCollapse.el, sources.el);

  function updateCave(c, d) {
    shine.set(d.shine, c.pending);
    setShown(start, !c.open);
    setShown(facetBox, c.open);
    setShown(latticeBox, c.open && d.facets > 0);
    if (c.open) {
      setText(facetText, `${d.unspent} unspent of ${d.facets}. Each facet doubles crystal.`);
      const auto = !!c.geodeUp.miner;
      setShown(facetBuy, !auto);
      setShown(facetMax, !auto);
      setShown(facetAuto, auto);
      if (!auto) {
        const cost = hollow.facetCost(c);
        setText(facetBuy, `Buy for ${amount(cost)} crystal`);
        setDisabled(facetBuy, c.crystal.lt(cost));
        setDisabled(facetMax, c.crystal.lt(cost));
      }
      if (d.facets > 0) updateLattice(c, d);
    }
    updateCollapse(caveCollapse, c, d);
    sources.set(c.open, [
      d.lattice.gt(1.001) || d.lattice.lt(0.999) ? formatMult(d.lattice) : null,
      d.facets > 0 ? formatMult(d.facetMult) : null,
      d.geodeBed.gt(1) ? formatMult(d.geodeBed) : null,
      d.chamberMult > 1 ? formatMult(d.chamberMult) : null,
      d.other.gt(1.001) ? formatMult(d.other) : null,
    ], amount(d.rate));
  }

  // --- Chambers ----------------------------------------------------------

  const chambers = pointList(hollow.CHAMBERS, (p) => `${whole(p.crystal)} crystal`);
  const chambersPanel = h('div', { class: 'panel' },
    h('p', { class: 'lead' }, 'Reached when you hold that much crystal. Lasts until collapse.'),
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
    if (falling) setText(fallText, `Gaining ${format(d.geodeGain.mul(hollow.BAL.passiveGeodePerSecond), 1)} geodes per second.`);
    updateCollapse(geodeCollapse, c, d);
    geodeGrid.update();
  }

  // --- Sub-tabs ----------------------------------------------------------

  const tabs = subTabs([
    { id: 'cave', label: 'Cave', panel: cavePanel, update: updateCave, open: () => true },
    { id: 'chambers', label: 'Chambers', panel: chambersPanel, update: (c, d) => chambers.update(c.bestChambers, d.chambers), open: (c) => c.bestChambers >= 1 },
    { id: 'geodes', label: 'Geodes', panel: geodePanel, update: updateGeodes, open: (c) => !!c.seen.collapse },
  ], {
    current: () => S().ui.hollowTab,
    choose: (id) => { S().ui.hollowTab = id; },
    visited: () => H().seen,
  });
  const el = h('section', {}, status, tabs.nav, tabs.panels);

  function update() {
    const c = H();
    const d = hollow.calc(S());
    updateStatus(c, d);
    tabs.update((tab) => tab.open(c)).update(c, d);
  }

  function key(k) {
    if (k === 'm') hollow.buyFacet(S(), true);
    if (k === 'b') tryCollapse();
  }

  return { el, update, key };
}
