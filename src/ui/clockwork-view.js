// Everything you see while looking at Clockwork. Its look is in
// css/worlds/clockwork.css. Sub-tabs: the movement (the gear train and its
// gears), complications, chimes and springs.
//
// The train is set by clicking: pick a socket, then pick a gear from the
// tray under it. Each gear's tile in the tray also levels it up.
import { h, setText, setShown, setClass, setDisabled, confirmBox } from './dom.js';
import { format, formatInt, formatMult, formatTime } from '../core/num.js';
import { upgradeGrid, subTabs, resetBox, breakdown, shineNotice, real } from './parts.js';
import * as cw from '../worlds/clockwork.js';
import { paceMult } from '../worlds/links.js';

const amount = (x) => format(x, 1);
const whole = (x) => formatInt(x);
const SVG = 'http://www.w3.org/2000/svg';

// A cog drawn in code: `teeth` square-ish teeth around a rim, with a hub.
function cogPath(teeth, outer, inner) {
  const step = (Math.PI * 2) / teeth;
  const pts = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    // Root, rise, flat top, fall: the tooth takes the middle 46% of its step.
    for (const [f, r] of [[0, inner], [0.24, inner], [0.3, outer], [0.66, outer], [0.72, inner]]) {
      const t = a + f * step;
      pts.push(`${(Math.cos(t) * r).toFixed(2)} ${(Math.sin(t) * r).toFixed(2)}`);
    }
  }
  return `M${pts.join('L')}Z`;
}
const COG = cogPath(12, 50, 41);

function cog() {
  const el = document.createElementNS(SVG, 'svg');
  el.setAttribute('viewBox', '-52 -52 104 104');
  el.setAttribute('class', 'cw-cog');
  el.setAttribute('aria-hidden', 'true');
  const body = document.createElementNS(SVG, 'path');
  body.setAttribute('d', COG);
  body.setAttribute('class', 'body');
  const hub = document.createElementNS(SVG, 'circle');
  hub.setAttribute('r', '30');
  hub.setAttribute('class', 'hub');
  const axle = document.createElementNS(SVG, 'circle');
  axle.setAttribute('r', '4');
  axle.setAttribute('cy', '-21');
  axle.setAttribute('class', 'axle');
  el.append(body, hub, axle);
  return el;
}

// A small drawing of each kind of part, for the tray.
function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
}
function ratchetPath(teeth, outer, inner) {
  const step = (Math.PI * 2) / teeth;
  const pt = (a, r) => `${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`;
  const pts = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    pts.push(pt(a, inner), pt(a + step * 0.85, outer), pt(a + step * 0.85, inner));
  }
  return `M${pts.join('L')}Z`;
}
function partIcon(id) {
  const el = svgEl('svg', { viewBox: '-52 -52 104 104', class: 'cw-icon', 'aria-hidden': 'true' });
  const metal = (tag, attrs) => el.append(svgEl(tag, { class: 'metal', ...attrs }));
  const dark = (tag, attrs) => el.append(svgEl(tag, { class: 'dark', ...attrs }));
  if (id === 'brass') { metal('path', { d: cogPath(12, 46, 37) }); dark('circle', { r: 14 }); }
  else if (id === 'fly') {
    metal('circle', { r: 40, fill: 'none', 'stroke-width': 10, class: 'metal ring' });
    for (let i = 0; i < 4; i++) metal('rect', { x: -4, y: -38, width: 8, height: 76, transform: `rotate(${i * 45})` });
    dark('circle', { r: 9 });
  } else if (id === 'gov') {
    metal('rect', { x: -4, y: -46, width: 8, height: 70 });
    metal('path', { d: 'M0 -26 L-30 14 M0 -26 L30 14', fill: 'none', 'stroke-width': 6, class: 'metal ring' });
    metal('circle', { cx: -30, cy: 18, r: 12 }); metal('circle', { cx: 30, cy: 18, r: 12 });
    metal('rect', { x: -20, y: 30, width: 40, height: 8 });
  } else if (id === 'ratchet') { metal('path', { d: ratchetPath(14, 46, 33) }); dark('circle', { r: 12 }); }
  else if (id === 'idler') { metal('path', { d: cogPath(8, 32, 25) }); dark('circle', { r: 9 }); }
  else if (id === 'esc') { metal('path', { d: ratchetPath(20, 46, 30) }); dark('circle', { r: 22 }); metal('circle', { r: 7 }); }
  else if (id === 'worm') {
    metal('rect', { x: -40, y: -16, width: 80, height: 32, rx: 8 });
    for (let x = -32; x <= 28; x += 12) dark('path', { d: `M${x} -16 L${x + 8} 16`, 'stroke-width': 3, class: 'dark line' });
    metal('rect', { x: -48, y: -5, width: 96, height: 10 });
  } else if (id === 'pinion') { metal('path', { d: cogPath(6, 30, 19) }); dark('circle', { r: 6 }); }
  else if (id === 'dial') {
    metal('circle', { r: 44 }); dark('circle', { r: 37 });
    for (let i = 0; i < 12; i++) metal('rect', { x: -1.5, y: -35, width: 3, height: 7, transform: `rotate(${i * 30})` });
    metal('path', { d: 'M0 0 L0 -26 M0 0 L16 8', fill: 'none', 'stroke-width': 4, class: 'metal ring' });
  } else { el.append(svgEl('circle', { r: 40, class: 'gap' })); }
  return el;
}

const SHORT = { brass: 'Brass', fly: 'Flywheel', gov: 'Governor', ratchet: 'Ratchet', idler: 'Idler', esc: 'Escapement', worm: 'Worm', pinion: 'Pinion' };

export function buildClockwork(game) {
  const S = () => game.state;
  const K = () => game.state.clockwork;
  const pace = () => paceMult(game.state, 'clockwork');
  // Which socket and which complication slot the next click fills. Only the
  // page needs to know, so it is not saved.
  let socket = 0;
  let slot = 0;

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

  // --- Top strip -------------------------------------------------------------

  const tickAmount = h('b');
  const rateText = h('b');
  const springAmount = h('b');
  const springStat = h('div', { class: 'cw-stat steel' }, springAmount, h('span', {}, 'springs'));
  const speedText = h('div', { class: 'cw-speed' });
  const strip = h('header', { class: 'cw-strip' },
    h('div', { class: 'cw-stat' }, tickAmount, h('span', {}, 'ticks')),
    h('div', { class: 'cw-stat' }, rateText, h('span', {}, 'ticks per second')),
    springStat, speedText);

  // --- Movement: the train ---------------------------------------------------

  const startBtn = h('button', { class: 'act primary cw-big', onclick: () => cw.wind(S()) }, 'Wind the movement');

  const sockets = [];
  for (let i = 0; i < cw.BAL.maxSockets; i++) {
    const name = h('b');
    const worth = h('span', { class: 'worth' });
    const el = h('button', { class: 'cw-socket cogged', onclick: () => { socket = i; update(); } },
      cog(), h('span', { class: 'at' }, String(i + 1)), name, worth);
    sockets.push({ el, name, worth });
  }
  const trainTotal = h('div', { class: 'cw-total' });
  const trainBox = h('div', { class: 'cw-section' }, h('h3', {}, 'Gear train'),
    h('p', { class: 'desc' }, 'Gears drive left to right. Pick a socket, then a gear for it.'),
    h('div', { class: 'cw-plate' }, h('div', { class: 'cw-train machine' }, sockets.map((s) => s.el))), trainTotal);

  // The tray: one tile per gear, to fit it and to level it.
  const tray = cw.GEARS.map((g) => {
    const level = h('span', { class: 'level' });
    const rule = h('span', { class: 'text' });
    const where = h('span', { class: 'where' });
    const buy = h('button', { class: 'act small', onclick: (e) => { e.stopPropagation(); cw.buyLevel(S(), g.id, e.shiftKey); } });
    const auto = h('span', { class: 'cw-tag' }, 'Automatic');
    const el = h('div', { class: 'cw-gear', onclick: () => cw.setSocket(S(), socket, g.id) }, partIcon(g.id),
      h('div', { class: 'info' }, h('b', {}, g.name), level, rule, where, g.levels ? h('div', { class: 'buyrow' }, buy, auto) : null));
    return { g, el, level, rule, where, buy, auto };
  });
  const emptyTile = h('div', { class: 'cw-gear empty', onclick: () => cw.setSocket(S(), socket, '') }, partIcon('empty'),
    h('div', { class: 'info' }, h('b', {}, 'Take out'), h('span', { class: 'text' }, 'Leaves the socket empty.')));
  const buyAll = h('button', { class: 'act', onclick: () => cw.levelAll(S()) }, 'Level all');
  const trayBox = h('div', { class: 'cw-section' }, h('h3', {}, 'Gears'),
    h('div', { class: 'cw-felt' }, h('div', { class: 'cw-tray' }, tray.map((t) => t.el), emptyTile)),
    h('div', { class: 'row' }, buyAll, h('kbd', {}, 'M')));

  function updateTrain(k, d) {
    if (socket >= d.sockets) socket = 0;
    sockets.forEach((s, i) => {
      setShown(s.el, i < d.sockets);
      if (i >= d.sockets) return;
      const id = d.train[i];
      setText(s.name, id ? SHORT[id] : 'Empty');
      let text = '';
      if (id) {
        if (d.run.stopped[i]) text = 'stopped';
        else if (id === 'idler' || d.run.kind[i] === 'idler') text = 'idler';
        else text = formatMult(d.run.mult[i]) + (d.run.power[i] !== 1 ? ` ^${d.run.power[i].toFixed(1)}` : '');
      }
      setText(s.worth, text);
      setClass(s.el, 'sel', i === socket);
      setClass(s.el, 'stopped', !!d.run.stopped[i]);
      setClass(s.el, 'empty', !id);
    });
    setText(trainTotal, `Train ${formatMult(d.run.product)}`);
    setClass(trainBox, 'running', k.wound);

    const auto = !!k.springUp.apprentice;
    let anyManual = false;
    for (const t of tray) {
      const g = t.g;
      const open = cw.gearUnlocked(k, g.id);
      setShown(t.el, open);
      if (!open) continue;
      setText(t.rule, g.rule(d.strength[g.id], d.idlerBoost));
      const count = d.train.slice(0, d.sockets).filter((x) => x === g.id).length;
      setText(t.where, g.id === 'brass' ? (count ? `${count} in the train` : '') : (count ? `In socket ${d.train.indexOf(g.id) + 1}` : ''));
      setClass(t.el, 'placed', count > 0);
      setClass(t.el, 'here', d.train[socket] === g.id);
      if (!g.levels) { setShown(t.level, false); continue; }
      setShown(t.level, true);
      setText(t.level, `Level ${k.levels[g.id]}`);
      setShown(t.buy, !auto);
      setShown(t.auto, auto);
      if (!auto) {
        anyManual = true;
        const cost = cw.levelCost(k, g.id);
        setText(t.buy, `+1 for ${amount(cost)}`);
        setDisabled(t.buy, k.ticks.lt(cost));
      }
    }
    setClass(emptyTile, 'here', !d.train[socket]);
    setShown(buyAll.parentNode, anyManual);
  }

  const rewindBox = resetBox({ title: 'Rewind', accent: 'cw-section cw-rewind', onClick: tryRewind, hotkey: 'B' });
  function updateRewind(k, d) {
    const ready = d.canRewind && d.springGain.gte(1);
    const four = cw.CHIMES.find((p) => p.id === 'four');
    let text;
    if (d.chimes <= cw.CHIMES.indexOf(four)) text = [`Needs ${four.name}.`];
    else if (ready) text = [`Ticks this winding: ${amount(k.windTicks)}.`];
    else text = [`Ticks this winding: ${amount(k.windTicks)} of ${whole(cw.BAL.springNeedsTicks)}.`];
    if (k.seen.rewind) text[2] = `Ticks ×${format(d.wear, 2)} from ${formatTime(k.windTime)} of wear-in.`;
    rewindBox.set({ shown: !!k.seen.rewind, text, label: ready ? `Rewind for ${whole(d.springGain)} springs` : 'Rewind', ready });
  }

  const sources = breakdown('Ticks per second', ['Train', 'Wear-in', 'Springs', 'Chimes', 'Other'], 'Total');
  const shine = shineNotice('Clockwork');

  const movementPanel = h('div', { class: 'cw-layout' },
    h('div', { class: 'cw-col wide' }, shine.el, startBtn, trainBox, trayBox),
    h('div', { class: 'cw-col' }, rewindBox.el, sources.el));

  // --- Complications ---------------------------------------------------------

  const slots = [];
  for (let i = 0; i < cw.COMPLICATION_SLOTS; i++) {
    const name = h('b');
    const worth = h('span', { class: 'worth' });
    const el = h('button', { class: 'cw-socket slot', onclick: () => { slot = i; update(); } },
      h('span', { class: 'at' }, `Slot ${i + 1}`), name, worth);
    slots.push({ el, name, worth });
  }
  const parts = cw.COMPLICATIONS.map((c) => {
    const where = h('span', { class: 'where' });
    const el = h('div', { class: 'cw-gear', onclick: () => cw.fitComplication(S(), slot, c.id) }, partIcon('dial'),
      h('div', { class: 'info' }, h('b', {}, c.name), h('span', { class: 'text' }, c.text), where));
    return { c, el, where };
  });
  const partsPanel = h('div', { class: 'cw-section' }, h('h3', {}, 'Complications'),
    h('p', { class: 'desc' }, 'Pick a slot, then a part for it. A part grows stronger the longer it stays fitted, rewinds included. Moving it starts it over.'),
    h('div', { class: 'cw-train slots' }, slots.map((s) => s.el)),
    h('div', { class: 'cw-felt' }, h('div', { class: 'cw-tray' }, parts.map((p) => p.el))));

  function updateParts(k) {
    const open = cw.complicationSlots(S());
    if (slot >= open) slot = 0;
    slots.forEach((s, i) => {
      setShown(s.el, i < open);
      if (i >= open) return;
      const id = k.fitted[i];
      setText(s.name, id ? cw.COMPLICATIONS.find((c) => c.id === id).name : 'Empty');
      setText(s.worth, id ? `${formatMult(cw.complicationWorth(S(), id))} after ${formatTime(k.fittedTime[i])}` : '');
      setClass(s.el, 'sel', i === slot);
      setClass(s.el, 'empty', !id);
    });
    for (const p of parts) {
      const at = k.fitted.indexOf(p.c.id);
      setText(p.where, at >= 0 && at < open ? `In slot ${at + 1}` : '');
      setClass(p.el, 'placed', at >= 0 && at < open);
      setClass(p.el, 'here', k.fitted[slot] === p.c.id);
    }
  }

  // --- Chimes: a wall of tiles --------------------------------------------------

  const chimeTiles = cw.CHIMES.map((p) => {
    const name = h('b');
    const text = h('span', { class: 'text' });
    const el = h('div', { class: 'cw-chime' }, h('span', { class: 'at' }, `${whole(p.rate)} / s`), name, text);
    return { p, el, name, text };
  });
  const chimesPanel = h('div', { class: 'cw-section' }, h('h3', {}, 'Chimes'),
    h('div', { class: 'cw-chimes' }, chimeTiles.map((t) => t.el)));

  function updateChimes(k, d) {
    const cap = cw.chimeCap(S());
    chimeTiles.forEach((t, i) => {
      setShown(t.el, i <= k.bestChimes && i < cap);
      setClass(t.el, 'lit', i < d.chimes);
      setClass(t.el, 'unknown', i >= k.bestChimes);
      setText(t.name, i < k.bestChimes ? t.p.name : '???');
      setText(t.text, i < k.bestChimes ? t.p.text : '');
    });
  }

  // --- Springs -------------------------------------------------------------------

  const springText = h('span', { class: 'cw-sub' });
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
  const springPanel = h('div', { class: 'cw-section steel' }, h('h3', {}, 'Springs', springText), springGrid.el);

  function updateSprings(k, d) {
    const self = S().atlas.nodes.k_spring ? `, +${format(d.springGain.mul(cw.BAL.passiveSpringPerSecond * pace()), 1)} per second` : '';
    setText(springText, `Ticks ×${format(d.springBed, 2)}${self}`);
    springGrid.update();
  }

  // --- Sub-tabs --------------------------------------------------------------------

  const tabs = subTabs([
    { id: 'train', label: 'Movement', panel: movementPanel, open: () => true },
    { id: 'parts', label: 'Complications', panel: partsPanel, open: () => cw.complicationSlots(S()) > 0 },
    { id: 'chimes', label: 'Chimes', panel: chimesPanel, open: (k) => k.bestChimes >= 1 },
    { id: 'springs', label: 'Springs', panel: springPanel, open: (k) => !!k.seen.rewind },
  ], {
    current: () => S().ui.clockworkTab,
    choose: (id) => { S().ui.clockworkTab = id; },
    visited: () => K().seen,
  });
  const el = h('section', { class: 'cw', 'data-world': 'clockwork' }, strip, tabs.nav, tabs.panels);

  function update() {
    const k = K();
    const d = cw.calc(S());
    const p = pace();
    setText(tickAmount, amount(k.ticks));
    // Chimes are measured against the movement's own rate, so that is the
    // rate shown; the speed beside it says how much faster ticks arrive.
    setText(rateText, k.wound ? amount(d.rate) : '0');
    setShown(springStat, !!k.seen.rewind);
    setText(springAmount, whole(k.springs));
    setShown(speedText, p > 1);
    setText(speedText, `Gamespeed: ${formatInt(p)}×`);

    const active = tabs.update((tab) => tab.open(k));
    if (active.id === 'train') {
      shine.set(d.shine, k.pending, p);
      setShown(startBtn, !k.wound);
      setShown(trainBox, k.wound);
      setShown(trayBox, k.wound);
      if (k.wound) updateTrain(k, d);
      updateRewind(k, d);
      sources.set(k.wound, [
        formatMult(d.run.product),
        k.seen.rewind ? formatMult(d.wear) : null,
        d.springBed.gt(1) ? formatMult(d.springBed) : null,
        d.chimeMult > 1 ? formatMult(d.chimeMult) : null,
        d.other.gt(1.001) ? formatMult(d.other) : null,
      ], amount(d.rate));
    }
    if (active.id === 'parts') updateParts(k);
    if (active.id === 'chimes') updateChimes(k, d);
    if (active.id === 'springs') updateSprings(k, d);
  }

  function key(k) {
    if (k === 'm') cw.levelAll(S());
    if (k === 'b') tryRewind();
  }

  return { el, update, key };
}
