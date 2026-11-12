// Everything you see while looking at Stormfront.
import { h, setText, setShown, setClass, setDisabled, confirmBox } from './dom.js';
import { format, formatInt, formatMult, formatTime } from '../core/num.js';
import { setWidth, startBox, upgradeGrid, feedRow, subTabs, pointList, resetBox, breakdown, shineNotice } from './parts.js';
import { struckPower } from '../worlds/links.js';
import * as sf from '../worlds/stormfront.js';

const amount = (x) => format(x, 1);
const whole = (x) => formatInt(x);
const POWER = { 2: '²', 3: '³', 4: '⁴', 5: '⁵' };
const AT = { ground: 'the ground', mast: 'the mast' };

export function buildStormfront(game) {
  const S = () => game.state;
  const F = () => game.state.stormfront;

  function tryPass() {
    const c = F();
    const d = sf.calc(S());
    if (!d.canPass || d.fulgGain.lt(1)) return;
    if (c.fronts === 0) {
      confirmBox({
        title: 'Let the front pass?',
        body: `Resets charge, thunder, updrafts, anvils, forks and the mast. You get ${whole(d.fulgGain)} fulgurite.`,
        yes: 'Let it pass',
        onYes: () => sf.pass(S()),
      });
      return;
    }
    sf.pass(S());
  }

  // --- Status strip ------------------------------------------------------

  const thunderAmount = h('span');
  const rate = h('div', { class: 'rate' });
  const status = h('div', { class: 'status storm-accent' },
    h('div', { class: 'amount' }, thunderAmount, h('small', {}, 'thunder')), rate);

  function updateStatus(c, d) {
    setText(thunderAmount, amount(c.thunder));
    setText(rate, c.open ? `Charge +${amount(d.rate)} per second` : 'Clear sky');
  }

  // --- Storm -------------------------------------------------------------

  const start = startBox('Clear sky.', 'Seed the cloud', () => sf.seedCloud(S()));

  const chargeText = h('p', { class: 'desc' });
  const holdFill = h('div', { class: 'fill' });
  const holdLabel = h('div', { class: 'label' });
  const holdMeter = h('div', { class: 'meter wide storm' }, h('div', { class: 'bar' }, holdFill), holdLabel);
  const tensionText = h('p', { class: 'desc' });
  const strikeBtn = h('button', { class: 'act primary', onclick: () => sf.strike(S()) });
  const rodNote = h('span', { class: 'auto' }, 'Strikes the ground by itself at the breaking point.');
  const cloudBox = h('div', { class: 'box' }, h('h3', {}, 'Cloud'), chargeText, holdMeter, tensionText,
    h('div', { class: 'row', style: 'margin-top: 10px' }, strikeBtn, h('kbd', {}, 'S'), rodNote));

  function updateCloud(c, d) {
    setText(chargeText, `Charge ${amount(c.charge)}. A strike is worth charge × tension.`);
    setWidth(holdFill, c.held / d.holdMax);
    setClass(holdMeter, 'over', d.overcharge > 0);
    if (d.overcharge > 0) setText(holdLabel, `Overcharging for ${formatTime(d.overcharge)}. Charge has stopped; tension keeps building.`);
    else if (c.held >= d.holdMax - 1e-9) setText(holdLabel, `At the breaking point (${formatTime(d.holdMax)}).`);
    else setText(holdLabel, `Held ${formatTime(c.held)} of ${formatTime(d.holdMax)}.`);
    setText(tensionText, `Tension ${formatMult(d.tension)}. Tension is (1 + seconds held / ${Math.round(d.tensionSeconds * 10) / 10}) to the power ${Math.round(d.power * 10) / 10}.`);
    const aim = d.aimed ? c.aim : 'ground';
    setText(strikeBtn, aim === 'ground'
      ? `Strike for ${amount(d.strike)} thunder`
      : `Strike ${AT[aim] || sf.TARGETS.find((t) => t.id === aim).name} with ${amount(d.strike)}`);
    setDisabled(strikeBtn, c.charge.lte(0));
    setShown(rodNote, !!c.seen.rod && aim === 'ground');
  }

  // Where the next strike lands.
  const aimNote = h('p', { class: 'desc' }, 'The next strike lands here, then the aim goes back to the ground. Aimed strikes pay no thunder and keep building tension past the breaking point.');
  const targets = sf.TARGETS.map((t) => {
    const text = h('span', { class: 'text' });
    const record = h('span', { class: 'need' });
    const state = h('span', { class: 'cost' });
    const el = h('button', { class: 'upgrade target', onclick: () => sf.setAim(S(), t.id) },
      h('span', { class: 'name' }, t.name), text, record, state);
    return { t, el, text, record, state };
  });
  const aimBox = h('div', { class: 'box' }, h('h3', {}, 'Aim'), aimNote,
    h('div', { class: 'grid' }, targets.map((k) => k.el)));

  function bonusFor(c, id, record) {
    if (id === 'mast') return sf.mastMult(c, record);
    return record.lte(0) ? 1 : Math.pow(1 + record.add(1).log10().toNumber(), struckPower(S()));
  }

  function updateAim(c, d) {
    const aim = d.aimed ? c.aim : 'ground';
    const worldPower = POWER[struckPower(S())];
    const mastPower = POWER[c.fulgUp.ion ? sf.BAL.mastPowerIon : sf.BAL.mastPower];
    for (const k of targets) {
      const id = k.t.id;
      const open = sf.targetOpen(S(), id);
      setShown(k.el, open);
      if (!open) continue;
      setClass(k.el, 'aimed', aim === id);
      setClass(k.el, 'can', aim !== id);
      setText(k.state, aim === id ? 'Aimed here' : 'Aim here');
      if (id === 'ground') {
        setText(k.text, 'Pays thunder. Tension stops at the breaking point.');
        setShown(k.record, false);
        continue;
      }
      setText(k.text, id === 'mast'
        ? `Charge ×(1 + powers of ten in the biggest strike here)${mastPower}.`
        : `${k.t.what} ×(1 + powers of ten in the biggest strike here)${worldPower}.`);
      const record = sf.recordAt(c, id);
      const what = id === 'mast' ? 'Charge' : k.t.what;
      let line = record.gt(0)
        ? `Biggest strike ${amount(record)}. ${what} ${formatMult(bonusFor(c, id, record))}.`
        : 'Not struck yet.';
      if (d.strike.gt(record)) line += ` A strike now: ${formatMult(bonusFor(c, id, d.strike))}.`;
      setShown(k.record, true);
      setText(k.record, line);
    }
  }

  const FEED_TEXT = {
    updraft: () => 'Charge ×2 each.',
    anvil: () => `Breaking point +${sf.BAL.anvilSeconds} seconds each.`,
    fork: () => `Tension power +${sf.BAL.forkPower} each.`,
  };
  const feeds = {};
  for (const f of sf.FEEDS) {
    feeds[f.id] = feedRow({
      name: f.name,
      onBuy: () => sf.buyFeed(S(), f.id, false),
      onMax: () => sf.buyFeed(S(), f.id, true),
    });
  }

  const stormPass = resetBox({ title: 'Let the front pass', accent: 'fulg-accent', onClick: tryPass, hotkey: 'B' });
  const fulgPass = resetBox({ title: 'Let the front pass', accent: 'fulg-accent', onClick: tryPass, hotkey: 'B' });

  function updatePass(box, c, d) {
    const ready = d.canPass && d.fulgGain.gte(1);
    const sheet = sf.PEALS.find((p) => p.id === 'sheet');
    let text;
    if (d.peals <= sf.PEALS.indexOf(sheet)) text = [`Reach ${sheet.name} this front to let it pass (a strike of ${whole(sheet.strike)}).`];
    else if (ready) text = [`Resets charge, thunder, updrafts, anvils and forks${c.fulgUp.keep ? '' : ', and the mast'}.`, `Thunder this front: ${amount(c.totalThunder)}.`];
    else text = [`Thunder this front: ${amount(c.totalThunder)} of ${whole(sf.BAL.fulgNeedsThunder)} needed.`];
    if (c.seen.pass) text[2] = `Raining for ${formatTime(c.frontTime)}. Multiplies fulgurite gain by ${format(d.rain, 2)}.`;
    box.set({ shown: !!c.seen.pass, text, label: ready ? `Let it pass for ${whole(d.fulgGain)} fulgurite` : 'Let it pass', ready });
  }

  const sources = breakdown('Charge sources', ['Updrafts', 'Mast', 'Fulgurite', 'Peals', 'Other'], 'Charge per second');
  const shine = shineNotice('Stormfront');

  const stormPanel = h('div', { class: 'panel storm-accent' },
    shine.el, start, cloudBox, aimBox, sf.FEEDS.map((f) => feeds[f.id].el), stormPass.el, sources.el);

  function updateStorm(c, d) {
    shine.set(d.shine, c.pending);
    setShown(start, !c.open);
    setShown(cloudBox, c.open);
    setShown(aimBox, c.open && !!c.seen.mast);
    if (c.open) {
      updateCloud(c, d);
      if (c.seen.mast) updateAim(c, d);
    }
    const free = !!c.fulgUp.spotter;
    for (const f of sf.FEEDS) {
      const cost = sf.feedCost(c, f.id);
      feeds[f.id].set({
        shown: c.open && sf.feedUnlocked(c, f.id),
        count: String(c.feeds[f.id]),
        text: FEED_TEXT[f.id](),
        free,
        cost: `${amount(cost)} thunder`,
        affordable: c.thunder.gte(cost),
      });
    }
    updatePass(stormPass, c, d);
    sources.set(c.open, [
      c.feeds.updraft > 0 ? formatMult(d.updrafts) : null,
      d.mast > 1 ? formatMult(d.mast) : null,
      d.bed.gt(1) ? formatMult(d.bed) : null,
      d.pealMult > 1 ? formatMult(d.pealMult) : null,
      d.other.gt(1.001) ? formatMult(d.other) : null,
    ], amount(d.rate));
  }

  // --- Peals -------------------------------------------------------------

  const peals = pointList(sf.PEALS, (p) => `Strike of ${whole(p.strike)}`);
  const bestText = h('p', { class: 'desc' });
  const pealsPanel = h('div', { class: 'panel' },
    h('p', { class: 'lead' }, 'Reached by a single strike that big, wherever it lands. Lasts until the front passes.'),
    bestText, peals.el);

  function updatePeals(c, d) {
    setText(bestText, `Biggest strike this front: ${amount(c.bestStrike)}.`);
    peals.update(c.bestPeals, d.peals);
  }

  // --- Fulgurite ---------------------------------------------------------

  const fulgAmount = h('span');
  const fulgText = h('p', { class: 'desc' });
  const fallText = h('p', { class: 'desc' });
  const fulgGrid = upgradeGrid(sf.FULG_UPGRADES, {
    owned: (id) => !!F().fulgUp[id],
    have: () => F().fulgurite,
    buy: (id) => sf.buyFulgUpgrade(S(), id),
    unit: 'fulgurite',
    seen: () => F().seen,
    shownKey: 'fulgCards',
    note: (u) => sf.needText(u),
    blocked: (u) => !sf.needMet(S(), u),
  });
  const fulgPanel = h('div', { class: 'panel fulg-accent' },
    h('div', { class: 'figure' }, fulgAmount, h('small', {}, 'fulgurite')),
    fulgText, fallText, fulgPass.el, fulgGrid.el);

  function updateFulg(c, d) {
    setText(fulgAmount, whole(c.fulgurite));
    setText(fulgText, `Found ${whole(c.totalFulgurite)} fulgurite${c.folds > 0 ? ' this fold' : ''}. Multiplies charge by ${format(d.bed, 2)}.`);
    const falling = !!S().atlas.nodes.s_fulg;
    setShown(fallText, falling);
    if (falling) setText(fallText, `Gaining ${format(d.fulgGain.mul(sf.BAL.passiveFulgPerSecond), 1)} fulgurite per second.`);
    updatePass(fulgPass, c, d);
    fulgGrid.update();
  }

  // --- Sub-tabs ----------------------------------------------------------

  const tabs = subTabs([
    { id: 'storm', label: 'Storm', panel: stormPanel, update: updateStorm, open: () => true },
    { id: 'peals', label: 'Peals', panel: pealsPanel, update: updatePeals, open: (c) => c.bestPeals >= 1 },
    { id: 'fulgurite', label: 'Fulgurite', panel: fulgPanel, update: updateFulg, open: (c) => !!c.seen.pass },
  ], {
    current: () => S().ui.stormfrontTab,
    choose: (id) => { S().ui.stormfrontTab = id; },
    visited: () => F().seen,
  });
  const el = h('section', {}, status, tabs.nav, tabs.panels);

  function update() {
    const c = F();
    const d = sf.calc(S());
    updateStatus(c, d);
    tabs.update((tab) => tab.open(c)).update(c, d);
  }

  function key(k) {
    if (k === 'm') sf.buyAllFeeds(S());
    if (k === 'b') tryPass();
    if (k === 's') sf.strike(S());
  }

  return { el, update, key };
}
