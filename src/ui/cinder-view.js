// Everything you see while looking at Cinder.
import { h, setText, setShown, setClass, setDisabled, confirmBox } from './dom.js';
import { Decimal, format, formatDown, formatInt, formatMult, formatTemp, formatTime } from '../core/num.js';
import { upgradeGrid } from './parts.js';
import * as cinder from '../worlds/cinder.js';

const heat = (x) => format(x, 1);
const whole = (x) => formatInt(x);
const IGN = cinder.IGNITIONS;
const tempOf = (id) => IGN.find((p) => p.id === id).temp;

const FEED_TEXT = {
  kindling: { buy: 'Add a bundle', auto: 'Your fire-tender keeps this stocked.' },
  bellows: { buy: 'Add a bellows', auto: 'Your bellows-hand sees to these.' },
  flue: { buy: 'Build a section', auto: 'Your flue-sweep builds these as the fire allows.' },
};

export function buildCinder(game) {
  const S = () => game.state;
  const C = () => game.state.cinder;

  // --- Things you can do -------------------------------------------------

  function tryBurn() {
    const c = C();
    const d = cinder.calc(S());
    if (!d.canBurn || d.ashGain.lt(1)) return;
    if (c.burns === 0 && c.smelts === 0) {
      confirmBox({
        title: 'Burn the fire down?',
        body: `This lets the fire go out. Your heat, kindling, bellows and flue will all be gone, and you'll start a new fire with ${whole(d.ashGain)} ash to spend on things that last.`,
        yes: 'Burn it down',
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
        title: 'Smelt the hearth?',
        body: `This melts everything down. The fire, all your ash and your Ash upgrades will be gone, and you'll start again with ${whole(d.glassGain)} glass. Glass and whatever you buy with it is never lost to a smelt.`,
        yes: 'Smelt it',
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
    setText(rate, c.lit ? `+${heat(d.rate)} per second` : (c.burns > 0 ? 'The fire is out.' : 'Nothing is burning yet.'));
    setText(tempLine, c.lit ? `The fire is burning at ${formatTemp(d.temp)}.` : 'The hearth is cold.');
    const next = IGN[d.points];
    setShown(meter, c.lit && !!next);
    if (c.lit && next) {
      const from = d.points > 0 ? IGN[d.points - 1].temp : cinder.BAL.tempBase;
      const frac = Math.max(0, Math.min(1, (Math.max(d.temp, c.peakTemp) - from) / (next.temp - from)));
      const width = (frac * 100).toFixed(1) + '%';
      if (meterFill.__w !== width) { meterFill.style.width = width; meterFill.__w = width; }
      setText(meterLabel, d.points < c.bestPoints
        ? `${next.name} at ${formatTemp(next.temp)}`
        : `Something will catch at ${formatTemp(next.temp)}.`);
    }
  }

  // --- The fire ----------------------------------------------------------

  const sparkBox = h('div', { class: 'box center' },
    h('p', {}, 'A cold hearth, a heap of dry tinder, and a flint.'),
    h('p', {}, h('button', { class: 'act big primary', onclick: () => cinder.strike(S()) }, 'Strike a spark')));

  function feedRow(id) {
    const count = h('span', { class: 'count' });
    const desc = h('p', { class: 'desc' });
    const buy = h('button', { class: 'act', onclick: () => cinder.buyFeed(S(), id, false) });
    const max = h('button', { class: 'act small', title: 'Buy as many as you can afford', onclick: () => cinder.buyFeed(S(), id, true) }, 'Max');
    const auto = h('p', { class: 'auto' }, FEED_TEXT[id].auto);
    const el = h('div', { class: 'box feed' },
      h('div', { class: 'feed-main' }, h('h3', {}, cinder.FEED_NAMES[id], count), desc),
      h('div', { class: 'feed-buy' }, buy, max, auto));
    return {
      el,
      update(c, d) {
        setShown(el, c.lit && cinder.feedUnlocked(c, id));
        setText(count, c.feeds[id] > 0 ? `${c.feeds[id].toLocaleString('en-US')} so far` : '');
        if (id === 'kindling') setText(desc, `Each bundle adds ${format(d.kindlingPower, d.kindlingPower < 10 && d.kindlingPower % 1 ? 1 : 0)} heat per second.`);
        if (id === 'bellows') setText(desc, `Each one multiplies your heat by ${format(Math.pow(d.bellowsBase, d.bellowsBoost), 2)}.`);
        if (id === 'flue') setText(desc, `Each section makes every bellows ${Math.round(d.flueStrength * 100)}% stronger.`);
        const free = cinder.feedIsFree(c, id);
        setShown(buy, !free);
        setShown(max, !free);
        setShown(auto, free);
        if (!free) {
          const cost = cinder.feedCost(c, id);
          setText(buy, `${FEED_TEXT[id].buy} for ${heat(cost)} heat`);
          setDisabled(buy, c.heat.lt(cost));
          setDisabled(max, c.heat.lt(cost));
        }
      },
    };
  }
  const feeds = ['kindling', 'bellows', 'flue'].map(feedRow);

  const feedAllBtn = h('button', { class: 'act', onclick: () => cinder.feedAll(S()) }, 'Add everything you can afford');
  const feedAllRow = h('div', { class: 'row' }, feedAllBtn, h('span', { class: 'note', style: 'color: var(--muted)' }, 'or press ', h('kbd', {}, 'M')));

  const embersText = h('p', { class: 'desc' });
  const embersBox = h('div', { class: 'box' }, h('h3', {}, 'Embers'), embersText);

  function burnBox() {
    const note = h('p', { class: 'desc' });
    const more = h('p', { class: 'note' });
    const btn = h('button', { class: 'act primary', onclick: tryBurn });
    const el = h('div', { class: 'box ash-accent' }, h('h3', {}, 'Burn down'), note, more, h('div', { class: 'row', style: 'margin-top: 10px' }, btn, h('span', { style: 'color: var(--muted)' }, 'or press ', h('kbd', {}, 'B'))));
    return {
      el,
      update(c, d) {
        setShown(el, !!c.seen.ash);
        if (!c.seen.ash) return;
        const ready = d.canBurn && d.ashGain.gte(1);
        if (ready) {
          setText(note, "Let the fire burn right down and rake out what's left. The fire starts again from nothing, but your ash and everything bought with it stays.");
        } else if (d.points <= IGN.findIndex((p) => p.id === 'charcoal')) {
          setText(note, `The fire has to pass ${formatTemp(tempOf('charcoal'))} before it leaves ash worth raking out.`);
        } else {
          setText(note, "The fire hasn't given off enough heat yet to leave any ash behind.");
        }
        if (ready && d.ashGain.lt(1000)) {
          const need = d.ashGain.add(1).div(d.ashMult).pow(1 / cinder.BAL.ashRoot).mul(cinder.BAL.ashNeedsHeat);
          setText(more, `It has given off ${heat(c.burnHeat)} heat this burn. One more ash comes at ${heat(need)}.`);
        } else {
          setText(more, `It has given off ${heat(c.burnHeat)} heat this burn.`);
        }
        setText(btn, ready ? `Burn down for ${whole(d.ashGain)} ash` : 'Burn down');
        setDisabled(btn, !ready);
      },
    };
  }
  const fireBurn = burnBox();
  const ashBurn = burnBox();

  const breakdownRows = ['Kindling', 'Bellows', 'Ignition points', 'Ash bed', 'Embers', 'Glass', 'Everything else'].map((label) => {
    const value = h('td');
    return { label, value, tr: h('tr', {}, h('td', {}, label), value) };
  });
  const breakdownTotal = h('td');
  const breakdownBox = h('div', { class: 'box' },
    h('h3', {}, 'Where the heat comes from'),
    h('table', { class: 'breakdown' },
      breakdownRows.map((r) => r.tr),
      h('tr', { class: 'total' }, h('td', {}, 'Heat per second'), breakdownTotal)));

  function updateBreakdown(c, d) {
    setShown(breakdownBox, c.lit && !!c.seen.bellows);
    if (!c.lit || !c.seen.bellows) return;
    const known = new Decimal(d.base).mul(d.bellowsMult).mul(d.ignitionMult).mul(d.ashBed).mul(d.embers).mul(d.glassHeat);
    const other = d.rate.div(known);
    const values = [
      [`${format(d.base, 0)} per second`, true],
      [formatMult(d.bellowsMult), c.feeds.bellows > 0],
      [formatMult(d.ignitionMult), d.ignitionMult.gt(1)],
      [formatMult(d.ashBed), d.ashBed.gt(1)],
      [formatMult(d.embers), !!c.seen.embers],
      [formatMult(d.glassHeat), d.glassHeat.gt(1)],
      [formatMult(other), other.gt(1.001)],
    ];
    breakdownRows.forEach((r, i) => {
      setShown(r.tr, values[i][1]);
      setText(r.value, values[i][0]);
    });
    setText(breakdownTotal, heat(d.rate));
  }

  const shineText = h('p', {});
  const endNotice = h('div', { class: 'notice' },
    h('h3', {}, 'The page is shining'),
    shineText,
    h('p', {}, 'Pages are folded in the Atlas.'));

  const firePanel = h('div', { class: 'panel' },
    endNotice, sparkBox, feeds.map((f) => f.el), feedAllRow, embersBox, fireBurn.el, breakdownBox);

  function updateFire(c, d) {
    setShown(endNotice, d.shine > 0);
    if (d.shine > 0) {
      setText(shineText, `The fire is as hot as the face of the sun, and the page it's drawn on can't lie flat any more. Cinder is giving off ${format(d.shine, 2)} starlight a minute, and has gathered ${formatDown(c.pending)} since the page was last folded.`);
    }
    setShown(sparkBox, !c.lit);
    for (const f of feeds) f.update(c, d);
    const anyManual = ['kindling', 'bellows', 'flue'].some((id) => cinder.feedUnlocked(c, id) && !cinder.feedIsFree(c, id));
    setShown(feedAllRow, c.lit && !!c.seen.bellows && anyManual);
    setShown(embersBox, c.lit && !!c.seen.embers);
    if (c.seen.embers) {
      setText(embersText, `The ember bed has been building for ${formatTime(c.burnTime)} and multiplies heat by ${format(d.embers, 2)}. It keeps growing for as long as this fire burns, so a long burn is worth more than several short ones.`);
    }
    fireBurn.update(c, d);
    updateBreakdown(c, d);
  }

  // --- Ignition points ---------------------------------------------------

  const pointRows = IGN.map((p) => {
    const name = h('b');
    const text = h('p');
    const li = h('li', {}, h('div', { class: 'deg' }, formatTemp(p.temp)), h('div', { class: 'what' }, name, text));
    return { p, li, name, text };
  });
  const ignitionPanel = h('div', { class: 'panel' },
    h('p', { class: 'lead' }, 'Temperature is how hard the fire is burning. Every hundred degrees hotter means ten times as much heat each second. When a burn passes one of these points, something about the fire changes, and it stays changed until the fire goes out.'),
    h('ul', { class: 'points' }, pointRows.map((r) => r.li)));

  function updateIgnition(c, d) {
    pointRows.forEach((r, i) => {
      const known = i < c.bestPoints;
      setShown(r.li, i <= c.bestPoints);
      setClass(r.li, 'lit', i < d.points);
      setClass(r.li, 'unknown', !known);
      setText(r.name, known ? r.p.name : 'Something catches here.');
      setText(r.text, known ? r.p.text : '');
    });
  }

  // --- Ash ---------------------------------------------------------------

  const ashAmount = h('span');
  const ashBedText = h('p', { class: 'desc' });
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
    ashBedText, shedText, ashBurn.el, ashGrid.el);

  function updateAsh(c, d) {
    setText(ashAmount, whole(c.ash));
    setText(ashBedText, `You've raked out ${whole(c.totalAsh)} ash ${c.totalGlass.gt(0) ? 'since the last smelt' : (c.folds > 0 ? 'this fold' : 'in all')}. Banked around the fire as a bed, it multiplies heat by ${format(d.ashBed, 2)}, whether or not you've spent it.`);
    const shedding = cinder.sheds(S());
    setShown(shedText, shedding);
    if (shedding) setText(shedText, `The fire is shedding ${format(d.ashGain.mul(cinder.BAL.passiveAshPerSecond), 1)} ash every second as it burns.`);
    ashBurn.update(c, d);
    ashGrid.update(c);
  }

  // --- Glass -------------------------------------------------------------

  const glassAmount = h('span');
  const glassText = h('p', { class: 'desc' });
  const glassPassive = h('p', { class: 'desc' });
  const smeltNeed = h('p', { class: 'note' });
  const smeltSettle = h('p', { class: 'desc' });
  const smeltBtn = h('button', { class: 'act primary', onclick: trySmelt });
  const smeltBox = h('div', { class: 'box' },
    h('h3', {}, 'Smelt'),
    h('p', { class: 'desc' }, 'Melt the ash in the hearth down into glass. The fire, your ash and your Ash upgrades all start over. Glass and anything bought with it is kept.'),
    smeltSettle, smeltNeed,
    h('div', { class: 'row', style: 'margin-top: 10px' }, smeltBtn));
  const milestoneRows = cinder.GLASS_MILESTONES.map((m) => ({ m, li: h('li', {}, `${whole(m.need)} glass in all. ${m.text}`) }));
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
    glassText, glassPassive, smeltBox,
    h('div', { class: 'box' }, h('h3', {}, 'What the glassworks has learned'), h('ul', { class: 'milestones' }, milestoneRows.map((r) => r.li))),
    glassGrid.el);

  function updateGlass(c, d) {
    setText(glassAmount, whole(c.glass));
    setText(glassText, c.totalGlass.gt(0)
      ? `You've made ${whole(c.totalGlass)} glass ${c.folds > 0 ? 'this fold' : 'in all'}. Set around the hearth, it multiplies heat by ${format(d.glassHeat, 2)}.`
      : "You haven't made any glass yet.");
    const standing = !!S().atlas.nodes.c_glass;
    setShown(glassPassive, standing);
    if (standing) setText(glassPassive, `The standing glassworks is turning out ${format(d.glassGain.mul(cinder.BAL.passiveGlassPerSecond), 1)} glass a second on its own.`);
    const hotEnough = d.points > IGN.findIndex((p) => p.id === 'sand');
    const need = cinder.BAL.glassNeedsAsh;
    if (!hotEnough) setText(smeltNeed, `This fire has to pass ${formatTemp(tempOf('sand'))} before anything in the hearth will melt.`);
    else if (c.totalAsh.lt(need)) setText(smeltNeed, `There isn't enough ash in the hearth to be worth melting yet. You need to have raked out ${whole(need)} since the last smelt, and you're at ${whole(c.totalAsh)}.`);
    setShown(smeltNeed, !d.canSmelt);
    setText(smeltSettle, `Glass that has had time to clear is worth more. This melt has been going for ${formatTime(c.smeltTime)}, which multiplies what you'd get by ${format(d.settle, 2)}.`);
    const ready = d.canSmelt && d.glassGain.gte(1);
    setText(smeltBtn, ready ? `Smelt for ${whole(d.glassGain)} glass` : 'Smelt');
    setDisabled(smeltBtn, !ready);
    for (const r of milestoneRows) setClass(r.li, 'done', cinder.milestoneReached(c, r.m.id));
    glassGrid.update(c);
  }

  // --- Sub-tabs ----------------------------------------------------------

  const subs = [
    { id: 'fire', label: 'The fire', panel: firePanel, update: updateFire, open: () => true },
    { id: 'ignition', label: 'Ignition points', panel: ignitionPanel, update: updateIgnition, open: (c) => c.bestPoints >= 1 },
    { id: 'ash', label: 'Ash', panel: ashPanel, update: updateAsh, open: (c) => !!c.seen.ash },
    { id: 'glass', label: 'Glass', panel: glassPanel, update: updateGlass, open: (c) => !!c.seen.glass },
  ];
  for (const sub of subs) {
    sub.btn = h('button', {
      onclick: () => {
        S().ui.cinderTab = sub.id;
        C().seen['tab_' + sub.id] = true;
      },
    }, sub.label);
  }
  const subnav = h('nav', { class: 'subtabs' }, subs.map((s) => s.btn));
  const el = h('section', {}, status, subnav, subs.map((s) => s.panel));

  function update() {
    const state = S();
    const c = state.cinder;
    const d = cinder.calc(state);
    updateStatus(c, d);
    let current = subs.find((s) => s.id === state.ui.cinderTab && s.open(c)) || subs[0];
    setShown(subnav, subs.filter((s) => s.open(c)).length > 1);
    for (const sub of subs) {
      const open = sub.open(c);
      setShown(sub.btn, open);
      setClass(sub.btn, 'on', sub === current);
      setClass(sub.btn, 'fresh', open && sub !== current && sub.id !== 'fire' && !c.seen['tab_' + sub.id]);
      setShown(sub.panel, sub === current);
    }
    current.update(c, d);
  }

  function key(k) {
    if (k === 'm') cinder.feedAll(S());
    if (k === 'b') tryBurn();
  }

  return { el, update, key };
}
