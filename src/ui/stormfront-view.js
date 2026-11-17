// Everything you see while looking at Stormfront. Its look is in
// css/worlds/stormfront.css. Three sub-tabs: the storm itself, the peals,
// and fulgurite.
import { h, setText, setShown, setClass, setDisabled, confirmBox } from './dom.js';
import { format, formatInt, formatMult, formatTime } from '../core/num.js';
import { setWidth, upgradeGrid, feedRow, subTabs, resetBox, breakdown, shineNotice, real } from './parts.js';
import { struckPower, paceMult } from '../worlds/links.js';
import * as sf from '../worlds/stormfront.js';

const amount = (x) => format(x, 1);
const whole = (x) => formatInt(x);
const POWER = { 2: '²', 3: '³', 4: '⁴', 5: '⁵' };
const AT = { ground: 'the ground', mast: 'the mast', sky: 'the sky' };
const SVG = 'http://www.w3.org/2000/svg';

function svg(viewBox, cls, ...paths) {
  const el = document.createElementNS(SVG, 'svg');
  el.setAttribute('viewBox', viewBox);
  el.setAttribute('class', cls);
  el.setAttribute('aria-hidden', 'true');
  for (const d of paths) {
    const p = document.createElementNS(SVG, 'path');
    p.setAttribute('d', d);
    el.append(p);
  }
  return el;
}

const BOLT = 'M58 0 L22 46 L44 46 L14 100 L70 38 L46 38 Z';
const CLOUD = 'M40 70 Q8 70 10 46 Q12 26 34 28 Q40 6 66 10 Q88 0 104 20 Q134 14 138 40 Q160 44 152 62 Q148 72 130 70 Z';

export function buildStormfront(game) {
  const S = () => game.state;
  const pace = () => paceMult(game.state, 'stormfront');
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

  // --- The sky behind everything ------------------------------------------

  const sky = h('div', { class: 'sf-sky' },
    svg('0 0 160 80', 'sf-bank a', CLOUD), svg('0 0 160 80', 'sf-bank b', CLOUD), svg('0 0 160 80', 'sf-bank c', CLOUD),
    svg('0 0 80 100', 'sf-bolt one', BOLT), svg('0 0 80 100', 'sf-bolt two', BOLT),
    h('div', { class: 'sf-flash' }));
  // A filter that makes straight edges wobble, so outlines look drawn by hand.
  const ink = h('div', { class: 'sf-defs' });
  ink.innerHTML = '<svg width="0" height="0"><filter id="sf-rough" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="7" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5"/></filter><filter id="sf-rough2" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="2" seed="23" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="4"/></filter></svg>';

  // --- Top strip -----------------------------------------------------------

  const thunderAmount = h('b');
  const rateText = h('b');
  const fulgAmount = h('b');
  const fulgStat = h('div', { class: 'sf-stat gold' }, fulgAmount, h('span', {}, 'fulgurite'));
  const speedText = h('div', { class: 'sf-speed' });
  const strip = h('header', { class: 'sf-strip' },
    h('div', { class: 'sf-stat' }, thunderAmount, h('span', {}, 'thunder')),
    h('div', { class: 'sf-stat' }, rateText, h('span', {}, 'charge per second')),
    fulgStat, speedText);

  // --- Cloud ---------------------------------------------------------------

  const startBtn = h('button', { class: 'act primary sf-big', onclick: () => sf.seedCloud(S()) }, 'Seed the cloud');
  const chargeAmount = h('div', { class: 'sf-charge' });
  const holdFill = h('div', { class: 'fill' });
  const holdLabel = h('div', { class: 'label' });
  const holdMeter = h('div', { class: 'meter wide storm' }, h('div', { class: 'bar' }, holdFill), holdLabel);
  const tensionText = h('div', { class: 'sf-tension' });
  const strikeBtn = h('button', { class: 'act primary sf-big', onclick: () => sf.strike(S()) });
  const rodNote = h('span', { class: 'sf-tag' }, 'Automatic');
  const cloudArt = h('div', { class: 'sf-cloudart' }, svg('0 0 160 80', 'sf-cloud', CLOUD), svg('0 0 80 100', 'sf-spark', BOLT));
  const cloudLive = h('div', {}, chargeAmount, h('div', { class: 'sf-sub' }, 'charge'), holdMeter, tensionText,
    h('div', { class: 'row' }, strikeBtn, h('kbd', {}, 'S'), rodNote));
  const cloudBox = h('div', { class: 'sf-panel sf-cloudbox' }, cloudArt, startBtn, cloudLive);

  function updateCloud(c, d) {
    setText(chargeAmount, amount(c.charge));
    const aimNow = d.aimed ? c.aim : 'ground';
    // A bar that would fill more than once a second is shown as always
    // filling, so it streams and never flickers.
    const perSecond = pace() / d.holdMax;
    const fast = perSecond > 1 && !!c.seen.rod && aimNow === 'ground';
    setClass(holdMeter, 'fast', fast);
    const held = fast ? 1 : Math.min(1, c.held / d.holdMax);
    setWidth(holdFill, held);
    const glow = held.toFixed(2);
    if (cloudBox.__glow !== glow) { cloudBox.style.setProperty('--held', glow); cloudBox.__glow = glow; }
    setClass(cloudBox, 'over', d.overcharge > 0);
    if (fast) setText(holdLabel, `${format(perSecond, 1)} strikes per second`);
    else if (d.overcharge > 0) setText(holdLabel, `Overcharging ${formatTime(d.overcharge)}`);
    else if (c.held >= d.holdMax - 1e-9) setText(holdLabel, 'Breaking point');
    else setText(holdLabel, `${formatTime(c.held)} / ${formatTime(d.holdMax)}`);
    setText(tensionText, `Tension ${formatMult(d.tension)}`);
    const aim = d.aimed ? c.aim : 'ground';
    setText(strikeBtn, aim === 'ground'
      ? `Strike for ${amount(d.strike)} thunder`
      : `Strike ${AT[aim] || sf.TARGETS.find((t) => t.id === aim).name} with ${amount(d.strike)}`);
    setDisabled(strikeBtn, c.charge.lte(0));
    setShown(rodNote, !!c.seen.rod && aim === 'ground');
  }

  // --- Aim -----------------------------------------------------------------

  const targets = sf.TARGETS.map((t) => {
    const text = h('span', { class: 'text' });
    const record = h('span', { class: 'need' });
    const el = h('button', { class: 'sf-target', onclick: () => sf.setAim(S(), t.id) },
      h('span', { class: 'name' }, t.name), text, record);
    return { t, el, text, record };
  });
  const aimBox = h('div', { class: 'sf-panel' }, h('h3', {}, 'Aim'),
    h('p', { class: 'desc' }, 'Pick where the next strike lands. A target is boosted by the biggest strike it has taken. Aimed strikes pay no thunder.'),
    h('div', { class: 'sf-targets' }, targets.map((k) => k.el)));

  function bonusFor(c, id, record) {
    if (id === 'mast') return sf.mastMult(c, record);
    if (id === 'sky') return sf.skyMult(S(), record);
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
      if (id === 'ground') {
        setText(k.text, 'Thunder');
        setShown(k.record, false);
        continue;
      }
      const what = id === 'sky' ? 'All starlight' : id === 'mast' ? 'Charge' : k.t.what;
      const power = id === 'sky' ? POWER[sf.skyPower(S())] : id === 'mast' ? mastPower : worldPower;
      setText(k.text, `${what} ×(1 + powers of ten)${power}`);
      const record = sf.recordAt(c, id);
      let line = record.gt(0) ? `${amount(record)} → ${formatMult(bonusFor(c, id, record))}` : 'Not struck';
      if (d.strike.gt(record)) line += `   now ${formatMult(bonusFor(c, id, d.strike))}`;
      setShown(k.record, true);
      setText(k.record, line);
    }
  }

  // --- Feeds, the front, sources --------------------------------------------

  const FEED_TEXT = {
    updraft: () => 'Charge ×2',
    anvil: () => `Breaking point +${sf.BAL.anvilSeconds}s`,
    fork: () => `Tension power +${sf.BAL.forkPower}`,
  };
  const feeds = {};
  for (const f of sf.FEEDS) {
    feeds[f.id] = feedRow({ name: f.name, onBuy: () => sf.buyFeed(S(), f.id, false), onMax: () => sf.buyFeed(S(), f.id, true) });
  }
  const feedBox = h('div', { class: 'sf-panel sf-feeds' }, h('h3', {}, 'Storm'), sf.FEEDS.map((f) => feeds[f.id].el));

  const pass = resetBox({ title: 'Let the front pass', accent: 'sf-panel sf-pass', onClick: tryPass, hotkey: 'B' });
  function updatePass(c, d) {
    const ready = d.canPass && d.fulgGain.gte(1);
    const sheet = sf.PEALS.find((p) => p.id === 'sheet');
    let text;
    if (d.peals <= sf.PEALS.indexOf(sheet)) text = [`Needs ${sheet.name}.`];
    else if (ready) text = [`Thunder this front: ${amount(c.totalThunder)}.`];
    else text = [`Thunder this front: ${amount(c.totalThunder)} of ${whole(sf.BAL.fulgNeedsThunder)}.`];
    if (c.seen.pass) text[2] = `Fulgurite ×${format(d.rain, 2)} from ${formatTime(c.frontTime)} of rain.`;
    pass.set({ shown: !!c.seen.pass, text, label: ready ? `Let it pass for ${whole(d.fulgGain)} fulgurite` : 'Let it pass', ready });
  }

  const sources = breakdown('Charge', ['Updrafts', 'Mast', 'Fulgurite', 'Peals', 'Other'], 'Per second');
  const shine = shineNotice('Stormfront');

  // --- Peals: a wall of tiles -------------------------------------------------

  const pealTiles = sf.PEALS.map((p) => {
    const name = h('b');
    const text = h('span', { class: 'text' });
    const el = h('div', { class: 'sf-peal' }, h('span', { class: 'at' }, whole(p.strike)), name, text);
    return { p, el, name, text };
  });
  const bestText = h('span', { class: 'sf-sub' });
  const pealBox = h('div', { class: 'sf-panel' }, h('h3', {}, 'Peals', bestText), h('div', { class: 'sf-peals' }, pealTiles.map((k) => k.el)));

  function updatePeals(c, d) {
    setText(bestText, `Biggest strike ${amount(c.bestStrike)}`);
    const cap = sf.pealCap(S());
    pealTiles.forEach((k, i) => {
      setShown(k.el, i <= c.bestPeals && i < cap);
      setClass(k.el, 'lit', i < d.peals);
      setClass(k.el, 'unknown', i >= c.bestPeals);
      setText(k.name, i < c.bestPeals ? k.p.name : '???');
      setText(k.text, i < c.bestPeals ? k.p.text : '');
    });
  }

  // --- Fulgurite ---------------------------------------------------------------

  const fulgText = h('span', { class: 'sf-sub' });
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
  const fulgBox = h('div', { class: 'sf-panel gold' }, h('h3', {}, 'Fulgurite', fulgText), fulgGrid.el);

  const stormPanel = h('div', { class: 'sf-layout' },
    h('div', { class: 'sf-col' }, shine.el, cloudBox, pass.el),
    h('div', { class: 'sf-col' }, aimBox, feedBox, sources.el));
  const tabs = subTabs([
    { id: 'storm', label: 'Storm', panel: stormPanel, open: () => true },
    { id: 'peals', label: 'Peals', panel: pealBox, open: (c) => c.bestPeals >= 1 },
    { id: 'fulgurite', label: 'Fulgurite', panel: fulgBox, open: (c) => !!c.seen.pass },
  ], {
    current: () => S().ui.stormfrontTab,
    choose: (id) => { S().ui.stormfrontTab = id; },
    visited: () => F().seen,
  });
  const el = h('section', { class: 'sf', 'data-world': 'stormfront' }, sky, ink, strip, tabs.nav, tabs.panels);

  function update() {
    const c = F();
    const d = sf.calc(S());
    const p = pace();
    setText(thunderAmount, amount(c.thunder));
    setText(rateText, c.open ? amount(real(d.rate, p)) : '0');
    setShown(fulgStat, !!c.seen.pass);
    setText(fulgAmount, whole(c.fulgurite));
    setShown(speedText, p > 1);
    setText(speedText, `Gamespeed: ${formatInt(p)}×`);

    tabs.update((tab) => tab.open(c));
    shine.set(d.shine, c.pending, p);
    setShown(startBtn, !c.open);
    setShown(cloudLive, c.open);
    setClass(cloudBox, 'clear', !c.open);
    if (c.open) updateCloud(c, d);
    setShown(aimBox, c.open && !!c.seen.mast);
    if (c.open && c.seen.mast) updateAim(c, d);

    const free = !!c.fulgUp.spotter;
    setShown(feedBox, c.open);
    for (const f of sf.FEEDS) {
      const cost = sf.feedCost(c, f.id);
      feeds[f.id].set({ shown: c.open && sf.feedUnlocked(c, f.id), count: String(c.feeds[f.id]), text: FEED_TEXT[f.id](), free, cost: `${amount(cost)} thunder`, affordable: c.thunder.gte(cost) });
    }
    updatePass(c, d);
    sources.set(c.open, [
      c.feeds.updraft > 0 ? formatMult(d.updrafts) : null,
      d.mast > 1 ? formatMult(d.mast) : null,
      d.bed.gt(1) ? formatMult(d.bed) : null,
      d.pealMult > 1 ? formatMult(d.pealMult) : null,
      d.other.gt(1.001) ? formatMult(d.other) : null,
    ], amount(real(d.rate, p)));

    if (c.bestPeals >= 1) updatePeals(c, d);
    if (c.seen.pass) {
      const falling = S().atlas.nodes.s_fulg ? `, +${format(d.fulgGain.mul(sf.BAL.passiveFulgPerSecond * p), 1)} per second` : '';
      setText(fulgText, `Charge ×${format(d.bed, 2)}${falling}`);
      fulgGrid.update();
    }
  }

  function key(k) {
    if (k === 'm') sf.buyAllFeeds(S());
    if (k === 'b') tryPass();
    if (k === 's') sf.strike(S());
  }

  return { el, update, key };
}
