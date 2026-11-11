// Everything you see while looking at Cinder.
import { h, setText, setShown, confirmBox } from './dom.js';
import { Decimal, format, formatInt, formatMult, formatTemp, formatTime } from '../core/num.js';
import { setWidth, startBox, upgradeGrid, feedRow, subTabs, pointList, resetBox, milestoneList, breakdown, shineNotice, dial } from './parts.js';
import * as cinder from '../worlds/cinder.js';

const heat = (x) => format(x, 1);
const whole = (x) => formatInt(x);
const IGN = cinder.IGNITIONS;
const indexOf = (id) => IGN.findIndex((p) => p.id === id);
const tempOf = (id) => IGN[indexOf(id)].temp;

export function buildCinder(game) {
  const S = () => game.state;
  const C = () => game.state.cinder;

  function tryBurn() {
    const c = C();
    const d = cinder.calc(S());
    if (!d.canBurn || d.ashGain.lt(1)) return;
    if (c.burns === 0 && c.smelts === 0) {
      confirmBox({
        title: 'Burn down?',
        body: `Resets heat, kindling, bellows and flue. You get ${whole(d.ashGain)} ash.`,
        yes: 'Burn down',
        onYes: () => cinder.burnDown(S()),
      });
      return;
    }
    cinder.burnDown(S());
  }

  function trySmelt() {
    const c = C();
    const d = cinder.calc(S());
    if (!d.canSmelt || d.glassGain.lt(1)) return;
    if (c.smelts === 0) {
      confirmBox({
        title: 'Smelt?',
        body: `Resets the fire, ash and Ash upgrades. You get ${whole(d.glassGain)} glass.`,
        yes: 'Smelt',
        onYes: () => cinder.smelt(S()),
      });
      return;
    }
    cinder.smelt(S());
  }

  // --- Status strip ------------------------------------------------------

  const amount = h('span');
  const rate = h('div', { class: 'rate' });
  const tempLine = h('div', { class: 'temp' });
  const meterFill = h('div', { class: 'fill' });
  const meterLabel = h('div', { class: 'label' });
  const meter = h('div', { class: 'meter' }, h('div', { class: 'bar' }, meterFill), meterLabel);
  const status = h('div', { class: 'status' },
    h('div', { class: 'amount' }, amount, h('small', {}, 'heat')), rate, tempLine, meter);

  function updateStatus(c, d) {
    setText(amount, heat(c.heat));
    setText(rate, c.lit ? `+${heat(d.rate)} per second` : 'Not lit');
    setText(tempLine, c.lit ? formatTemp(d.temp) : '');
    const next = IGN[d.points];
    setShown(meter, c.lit && !!next);
    if (c.lit && next) {
      const from = d.points > 0 ? IGN[d.points - 1].temp : cinder.BAL.tempBase;
      setWidth(meterFill, (Math.max(d.temp, c.peakTemp) - from) / (next.temp - from));
      setText(meterLabel, d.points < c.bestPoints
        ? `Next: ${next.name} at ${formatTemp(next.temp)}`
        : `Next ignition point at ${formatTemp(next.temp)}`);
    }
  }

  // --- Fire --------------------------------------------------------------

  const spark = startBox('The hearth is cold.', 'Strike a spark', () => cinder.strike(S()));

  const feeds = {};
  for (const id of ['kindling', 'bellows', 'flue']) {
    feeds[id] = feedRow({
      name: cinder.FEED_NAMES[id],
      onBuy: () => cinder.buyFeed(S(), id, false),
      onMax: () => cinder.buyFeed(S(), id, true),
    });
  }
  const buyAll = h('div', { class: 'row' },
    h('button', { class: 'act', onclick: () => cinder.feedAll(S()) }, 'Buy all'), h('kbd', {}, 'M'));

  const damper = dial({ min: -2, max: 2, onInput: (v) => cinder.setDamper(S(), v / 2) });
  const damperBox = h('div', { class: 'box' }, h('h3', {}, 'Damper'),
    h('p', { class: 'desc' }, 'Open for more heat, shut for more ash.'), damper.el);

  const embersText = h('p', { class: 'desc' });
  const embersBox = h('div', { class: 'box' }, h('h3', {}, 'Embers'), embersText);

  const fireBurn = resetBox({ title: 'Burn down', accent: 'ash-accent', onClick: tryBurn, hotkey: 'B' });
  const ashBurn = resetBox({ title: 'Burn down', accent: 'ash-accent', onClick: tryBurn, hotkey: 'B' });

  function updateBurn(box, c, d) {
    const ready = d.canBurn && d.ashGain.gte(1);
    let text;
    if (ready) {
      const given = `Heat given off this burn: ${heat(c.burnHeat)}.`;
      const next = d.ashGain.lt(1000)
        ? ` Next ash at ${heat(d.ashGain.add(1).div(d.ashMult).pow(1 / cinder.BAL.ashRoot).mul(cinder.BAL.ashNeedsHeat))}.`
        : '';
      text = ['Resets heat, kindling, bellows and flue.', given + next];
    } else if (d.points <= indexOf('charcoal')) {
      text = [`Reach ${formatTemp(tempOf('charcoal'))} to burn down.`];
    } else {
      text = ['Not enough heat given off this burn.'];
    }
    box.set({ shown: !!c.seen.ash, text, label: ready ? `Burn down for ${whole(d.ashGain)} ash` : 'Burn down', ready });
  }

  const sources = breakdown('Heat sources', ['Kindling', 'Bellows', 'Ignition points', 'Ash', 'Embers', 'Glass', 'Other'], 'Heat per second');
  const shine = shineNotice('Cinder');

  const firePanel = h('div', { class: 'panel' },
    shine.el, spark, Object.values(feeds).map((f) => f.el), buyAll, damperBox, embersBox, fireBurn.el, sources.el);

  function updateFire(c, d) {
    shine.set(d.shine, c.pending);
    setShown(spark, !c.lit);
    const text = {
      kindling: `+${format(d.kindlingPower, d.kindlingPower < 10 && d.kindlingPower % 1 ? 1 : 0)} heat per second each.`,
      bellows: `×${format(Math.pow(d.bellowsBase, d.bellowsBoost), 2)} heat each.`,
      flue: `+${Math.round(d.flueStrength * 100)}% bellows strength each.`,
    };
    let anyManual = false;
    for (const id of Object.keys(feeds)) {
      const shown = c.lit && cinder.feedUnlocked(c, id);
      const free = cinder.feedIsFree(c, id);
      const cost = cinder.feedCost(c, id);
      if (shown && !free) anyManual = true;
      feeds[id].set({ shown, count: String(c.feeds[id]), text: text[id], free, cost: `${heat(cost)} heat`, affordable: c.heat.gte(cost) });
    }
    setShown(buyAll, c.lit && !!c.seen.bellows && anyManual);

    setShown(damperBox, c.lit && !!c.seen.ash);
    if (c.seen.ash) {
      damper.set({
        value: Math.round(c.damper * 2),
        text: `Heat ×${format(Math.pow(cinder.BAL.damperHeat, c.damper), 2)}. Ash gain ×${format(Math.pow(cinder.BAL.damperAsh, -c.damper), 2)}.`,
      });
    }

    setShown(embersBox, c.lit && !!c.seen.embers);
    if (c.seen.embers) setText(embersText, `Building for ${formatTime(c.burnTime)}. Multiplies heat by ${format(d.embers, 2)}. Resets on burn down.`);

    updateBurn(fireBurn, c, d);

    const known = new Decimal(d.base).mul(d.bellowsMult).mul(d.ignitionMult).mul(d.ashBed).mul(d.embers).mul(d.glassHeat);
    const other = c.lit ? d.rate.div(known) : new Decimal(1);
    sources.set(c.lit && !!c.seen.bellows, [
      `${format(d.base, 0)} per second`,
      c.feeds.bellows > 0 ? formatMult(d.bellowsMult) : null,
      d.ignitionMult.gt(1) ? formatMult(d.ignitionMult) : null,
      d.ashBed.gt(1) ? formatMult(d.ashBed) : null,
      c.seen.embers ? formatMult(d.embers) : null,
      d.glassHeat.gt(1) ? formatMult(d.glassHeat) : null,
      other.gt(1.001) || other.lt(0.999) ? formatMult(other) : null,
    ], heat(d.rate));
  }

  // --- Ignition points ---------------------------------------------------

  const points = pointList(IGN, (p) => formatTemp(p.temp));
  const ignitionPanel = h('div', { class: 'panel' },
    h('p', { class: 'lead' }, 'Every 100°C is 10× the heat per second. Points last until the fire goes out.'),
    points.el);

  // --- Ash ---------------------------------------------------------------

  const ashAmount = h('span');
  const ashText = h('p', { class: 'desc' });
  const shedText = h('p', { class: 'desc' });
  const ashGrid = upgradeGrid(cinder.ASH_UPGRADES, {
    owned: (id) => !!C().ashUp[id],
    have: () => C().ash,
    buy: (id) => cinder.buyAshUpgrade(S(), id),
    unit: 'ash',
    seen: () => C().seen,
    shownKey: 'ashCards',
  });
  const ashPanel = h('div', { class: 'panel ash-accent' },
    h('div', { class: 'figure' }, ashAmount, h('small', {}, 'ash')),
    ashText, shedText, ashBurn.el, ashGrid.el);

  function updateAsh(c, d) {
    setText(ashAmount, whole(c.ash));
    const since = c.totalGlass.gt(0) ? ' since last smelt' : (c.folds > 0 ? ' this fold' : '');
    setText(ashText, `Raked ${whole(c.totalAsh)} ash${since}. Multiplies heat by ${format(d.ashBed, 2)}.`);
    const shedding = cinder.sheds(S());
    setShown(shedText, shedding);
    if (shedding) setText(shedText, `Shedding ${format(d.ashGain.mul(cinder.BAL.passiveAshPerSecond), 1)} ash per second.`);
    updateBurn(ashBurn, c, d);
    ashGrid.update();
  }

  // --- Glass -------------------------------------------------------------

  const glassAmount = h('span');
  const glassText = h('p', { class: 'desc' });
  const glassPassive = h('p', { class: 'desc' });
  const smeltBox = resetBox({ title: 'Smelt', onClick: trySmelt });
  const milestones = milestoneList('Glass milestones', cinder.GLASS_MILESTONES.map((m) => `${whole(m.need)} glass: ${m.text}`));
  const glassGrid = upgradeGrid(cinder.GLASS_UPGRADES, {
    owned: (id) => !!C().glassUp[id],
    have: () => C().glass,
    buy: (id) => cinder.buyGlassUpgrade(S(), id),
    unit: 'glass',
    seen: () => C().seen,
    shownKey: 'glassCards',
  });
  const glassPanel = h('div', { class: 'panel glass-accent' },
    h('div', { class: 'figure' }, glassAmount, h('small', {}, 'glass')),
    glassText, glassPassive, smeltBox.el, milestones.el, glassGrid.el);

  function updateGlass(c, d) {
    setText(glassAmount, whole(c.glass));
    setText(glassText, c.totalGlass.gt(0)
      ? `Made ${whole(c.totalGlass)} glass${c.folds > 0 ? ' this fold' : ''}. Multiplies heat by ${format(d.glassHeat, 2)}.`
      : 'No glass yet.');
    const standing = !!S().atlas.nodes.c_glass;
    setShown(glassPassive, standing);
    if (standing) setText(glassPassive, `Making ${format(d.glassGain.mul(cinder.BAL.passiveGlassPerSecond), 1)} glass per second.`);

    const need = cinder.BAL.glassNeedsAsh;
    let missing = '';
    if (d.points <= indexOf('sand')) missing = `Reach ${formatTemp(tempOf('sand'))} this burn.`;
    else if (c.totalAsh.lt(need)) missing = `Need ${whole(need)} ash raked since last smelt. You have ${whole(c.totalAsh)}.`;
    const ready = d.canSmelt && d.glassGain.gte(1);
    smeltBox.set({
      text: ['Resets the fire, ash and Ash upgrades.', `Clearing for ${formatTime(c.smeltTime)}. Multiplies glass gain by ${format(d.settle, 2)}.`, missing],
      label: ready ? `Smelt for ${whole(d.glassGain)} glass` : 'Smelt',
      ready,
    });
    cinder.GLASS_MILESTONES.forEach((m, i) => milestones.set(i, cinder.milestoneReached(c, m.id)));
    glassGrid.update();
  }

  // --- Sub-tabs ----------------------------------------------------------

  const tabs = subTabs([
    { id: 'fire', label: 'Fire', panel: firePanel, update: updateFire, open: () => true },
    { id: 'ignition', label: 'Ignition points', panel: ignitionPanel, update: (c, d) => points.update(c.bestPoints, d.points), open: (c) => c.bestPoints >= 1 },
    { id: 'ash', label: 'Ash', panel: ashPanel, update: updateAsh, open: (c) => !!c.seen.ash },
    { id: 'glass', label: 'Glass', panel: glassPanel, update: updateGlass, open: (c) => !!c.seen.glass },
  ], {
    current: () => S().ui.cinderTab,
    choose: (id) => { S().ui.cinderTab = id; },
    visited: () => C().seen,
  });
  const el = h('section', {}, status, tabs.nav, tabs.panels);

  function update() {
    const c = C();
    const d = cinder.calc(S());
    updateStatus(c, d);
    tabs.update((tab) => tab.open(c)).update(c, d);
  }

  function key(k) {
    if (k === 'm') cinder.feedAll(S());
    if (k === 'b') tryBurn();
  }

  return { el, update, key };
}
