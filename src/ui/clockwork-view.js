// Everything you see while looking at Clockwork. Its look is in
// css/worlds/clockwork.css. Sub-tabs: the movement (the gear train and its
// gears), complications, chimes and springs.
//
// The movement is a cut-paper scene: cogs on an arbor bar, a balance wheel and
// a mainspring barrel either side, a bell for each chime hung along the top.
// The train is set by clicking: pick a cog in the scene, then pick a gear from
// the tray under it. Each gear's tile in the tray also levels it up.
import { h, setText, setShown, setClass, setDisabled, confirmBox } from './dom.js';
import { format, formatInt, formatMult, formatTime } from '../core/num.js';
import { upgradeGrid, subTabs, breakdown, shineStat, speedLabel } from './parts.js';
import { attr, showSvg, makeScene, mainBar } from './scene.js';
import * as cw from '../worlds/clockwork.js';
import { paceMult } from '../worlds/links.js';

const amount = (x) => format(x, 1);
const whole = (x) => formatInt(x);
const SVG = 'http://www.w3.org/2000/svg';

// A cog drawn in code: `teeth` square-ish teeth around a rim.
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

/** A cog for a socket. Five round holes, so you can see it turn. */
function cog() {
  const wrap = document.createElement('span');
  wrap.className = 'cw-cogwrap';
  const holes = [0, 1, 2, 3, 4].map((i) => {
    const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
    return `<circle class="hole" cx="${(Math.cos(a) * 19).toFixed(1)}" cy="${(Math.sin(a) * 19).toFixed(1)}" r="6"/>`;
  }).join('');
  wrap.innerHTML = `<svg viewBox="-52 -52 104 104" class="cw-cog" aria-hidden="true"><path class="body" d="${COG}"/><circle class="hub" r="30"/>${holes}<circle class="axle" r="7"/></svg>`;
  return wrap;
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
    metal('circle', { r: 40, 'stroke-width': 10, class: 'metal ring' });
    for (let i = 0; i < 4; i++) metal('rect', { x: -4, y: -38, width: 8, height: 76, transform: `rotate(${i * 45})` });
    dark('circle', { r: 9 });
  } else if (id === 'gov') {
    metal('rect', { x: -4, y: -46, width: 8, height: 70 });
    metal('path', { d: 'M0 -26 L-30 14 M0 -26 L30 14', 'stroke-width': 6, class: 'metal ring' });
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
    metal('path', { d: 'M0 0 L0 -26 M0 0 L16 8', 'stroke-width': 4, class: 'metal ring' });
  } else { el.append(svgEl('circle', { r: 40, class: 'gap' })); }
  return el;
}

const SHORT = { brass: 'Brass', fly: 'Flywheel', gov: 'Governor', ratchet: 'Ratchet', idler: 'Idler', esc: 'Escapement', worm: 'Worm', pinion: 'Pinion' };

// --- The scene ---------------------------------------------------------------
// 1600 x 420. Back to front: the plate, big slow cogs, the arbor bar the train
// sits on, a balance wheel and a mainspring barrel, the bell rail and the bench.

function spiral(turns, r0, r1) {
  const pts = [];
  const n = turns * 24;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * turns * Math.PI * 2;
    const r = r0 + (r1 - r0) * t;
    pts.push(`${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`);
  }
  return `M${pts.join('L')}`;
}

const MAX_BELLS = cw.CHIMES.length;

function movementSvg() {
  const big = (x, y, teeth, outer, inner, t, rev, cls) =>
    `<g transform="translate(${x} ${y})"><g class="spin ${rev ? 'rev' : ''}" style="--t:${t}s"><path class="${cls}" d="${cogPath(teeth, outer, inner)}"/><circle class="${cls} deep" r="${inner * 0.62}"/><circle class="plate" r="${inner * 0.22}"/></g></g>`;
  const bells = Array.from({ length: MAX_BELLS }, (_, i) =>
    `<g class="bell" id="cw-bell${i}"><rect class="hang" x="-1.5" y="0" width="3" height="16"/><path class="shell" d="M-16 50 L-12 30 Q-12 16 0 16 Q12 16 12 30 L16 50 Z"/><circle class="clap" cy="54" r="4"/></g>`).join('');
  const screws = [40, 330, 1270, 1560].map((x) =>
    `<g transform="translate(${x} 184)"><circle class="screw" r="9"/><rect class="slot" x="-7" y="-1.5" width="14" height="3" transform="rotate(35)"/></g>`).join('');
  return `<svg viewBox="0 0 1600 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <rect class="plate" width="1600" height="420"/>
  <g class="bg">
    ${big(60, 340, 20, 168, 150, 140, false, 'bgcog')}
    ${big(1560, 330, 22, 186, 167, 160, true, 'bgcog')}
    ${big(380, 30, 14, 104, 92, 90, true, 'bgcog far')}
    ${big(1250, 20, 14, 98, 86, 100, false, 'bgcog far')}
    ${big(780, 410, 16, 96, 84, 110, false, 'bgcog far')}
  </g>
  <rect class="arbor" y="160" width="1600" height="48"/>
  <rect class="arbor-edge" y="160" width="1600" height="4"/>
  ${screws}
  <g transform="translate(180 184)"><path class="spring-line" d="${spiral(4, 10, 54)}"/>
    <g class="front"><g class="rock"><circle class="wheel-ring" r="70"/><rect class="wheel-bar" x="-70" y="-5" width="140" height="10"/><rect class="wheel-bar" x="-5" y="-70" width="10" height="140"/><circle class="wheel-hub" r="13"/><circle class="plate" r="4"/></g></g></g>
  <g transform="translate(1420 184)"><g class="front"><g class="spin" style="--t:120s"><circle class="barrel" r="72"/><path class="spring-coil" d="${spiral(3.5, 14, 56)}"/><rect class="wheel-bar" x="-11" y="-11" width="22" height="22"/></g></g></g>
  <rect class="rail" width="1600" height="56"/>
  <rect class="edge" y="56" width="1600" height="4"/>
  <text class="r" x="40" y="35">CHIMES</text>
  ${bells}
  <rect class="rail" y="364" width="1600" height="56"/>
  <rect class="edge" y="360" width="1600" height="4"/>
</svg>`;
}

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

  // --- Movement: the scene ---------------------------------------------------

  const sc = makeScene('cw-scene', movementSvg());
  const scene = sc.el;
  const bells = Array.from({ length: MAX_BELLS }, (_, i) => sc.q('#cw-bell' + i));

  const sockets = [];
  for (let i = 0; i < cw.BAL.maxSockets; i++) {
    const name = h('b');
    const worth = h('span', { class: 'worth' });
    const el = h('button', { class: 'cw-socket', onclick: () => { socket = i; update(); } },
      cog(), h('span', { class: 'at' }, String(i + 1)), name, worth);
    sockets.push({ el, name, worth });
  }
  const train = h('div', { class: 'cw-train' }, sockets.map((s) => s.el));
  scene.append(train);

  // The world's main control: wind it, then rewind it.
  const main = mainBar('cw', () => { if (!K().wound) cw.wind(S()); else tryRewind(); }, 'B');
  scene.append(main.el);

  function updateMain(k, d) {
    if (!k.wound) { main.set({ label: 'Wind the movement', hotkey: false }); return; }
    const ready = d.canRewind && d.springGain.gte(1);
    main.set({ shown: !!k.seen.rewind, label: ready ? `Rewind for ${whole(d.springGain)} springs` : 'Rewind', enabled: ready, hotkey: true });
  }

  function updateScene(k, d) {
    setClass(scene, 'running', k.wound);
    const cap = cw.chimeCap(S());
    const n = Math.min(cap, MAX_BELLS);
    bells.forEach((b, i) => {
      showSvg(b, i < n);
      if (i >= n) return;
      attr(b, 'transform', `translate(${(800 + (i - (n - 1) / 2) * 100).toFixed(0)} 56)`);
      setClass(b, 'lit', k.wound && i < d.chimes);
    });
  }

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
  const trayBox = h('div', { class: 'box' }, h('h3', {}, 'Gears'),
    h('p', { class: 'desc' }, 'Pick a cog above, then a gear for it.'),
    h('div', { class: 'cw-tray' }, tray.map((t) => t.el), emptyTile),
    h('div', { class: 'row' }, buyAll, h('kbd', {}, 'M')));

  function updateTrain(k, d) {
    if (socket >= d.sockets) socket = 0;
    sockets.forEach((s, i) => {
      setShown(s.el, k.wound && i < d.sockets);
      if (!k.wound || i >= d.sockets) return;
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

  // What a rewind will do, as plain lines under the scene.
  const rewindLines = [h('p', { class: 'desc' }), h('p', { class: 'desc' })];
  const rewindBox = h('div', { class: 'box' }, h('h3', {}, 'Rewind'), rewindLines);
  function updateRewind(k, d) {
    setShown(rewindBox, !!k.seen.rewind);
    if (!k.seen.rewind) return;
    const ready = d.canRewind && d.springGain.gte(1);
    const four = cw.CHIMES.find((p) => p.id === 'four');
    let first;
    if (d.chimes <= cw.CHIMES.indexOf(four)) first = `Needs ${four.name}.`;
    else if (ready) first = `Ticks this winding: ${amount(k.windTicks)}.`;
    else first = `Ticks this winding: ${amount(k.windTicks)} of ${whole(cw.BAL.springNeedsTicks)}.`;
    setText(rewindLines[0], first);
    setText(rewindLines[1], `Ticks ×${format(d.wear, 2)} from ${formatTime(k.windTime)} of wear-in.`);
  }

  const sources = breakdown('Ticks per second', ['Train', 'Wear-in', 'Springs', 'Chimes', 'Other'], 'Total');
  const shine = shineStat('cw', game);
  strip.insertBefore(shine.el, speedText);

  const movementPanel = h('div', { class: 'panel' }, scene,
    h('div', { class: 'cw-layout' },
      h('div', { class: 'cw-col' }, trayBox),
      h('div', { class: 'cw-col' }, rewindBox, sources.el)));

  // --- Complications ---------------------------------------------------------

  const slots = [];
  for (let i = 0; i < cw.COMPLICATION_SLOTS; i++) {
    const name = h('b');
    const worth = h('span', { class: 'worth' });
    const el = h('button', { class: 'cw-slot', onclick: () => { slot = i; update(); } },
      h('span', { class: 'at' }, `Slot ${i + 1}`), name, worth);
    slots.push({ el, name, worth });
  }
  const parts = cw.COMPLICATIONS.map((c) => {
    const where = h('span', { class: 'where' });
    const el = h('div', { class: 'cw-gear', onclick: () => cw.fitComplication(S(), slot, c.id) }, partIcon('dial'),
      h('div', { class: 'info' }, h('b', {}, c.name), h('span', { class: 'text' }, c.text), where));
    return { c, el, where };
  });
  const partsPanel = h('div', { class: 'panel' },
    h('div', { class: 'box' }, h('h3', {}, 'Complications'),
      h('p', { class: 'desc' }, 'Pick a slot, then a part for it. A part grows stronger the longer it stays fitted, rewinds included. Moving it starts it over.'),
      h('div', { class: 'cw-slots' }, slots.map((s) => s.el)),
      h('div', { class: 'cw-tray' }, parts.map((p) => p.el))));

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
    const el = h('div', { class: 'cw-tile' }, h('span', { class: 'at' }, `${whole(p.rate)} / s`), name, text);
    return { p, el, name, text };
  });
  const chimesPanel = h('div', { class: 'panel' },
    h('div', { class: 'box' }, h('h3', {}, 'Chimes'),
      h('div', { class: 'cw-tiles' }, chimeTiles.map((t) => t.el))));

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
  const springPanel = h('div', { class: 'panel cw-copper' },
    h('div', { class: 'box' }, h('h3', {}, 'Springs'), springText), springGrid.el);

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
    setText(speedText, speedLabel(p));

    shine.set(d.shine, k.pending, p);
    const active = tabs.update((tab) => tab.open(k));
    if (active.id === 'train') {
      updateScene(k, d);
      updateMain(k, d);
      updateTrain(k, d);
      setShown(trayBox, k.wound);
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
