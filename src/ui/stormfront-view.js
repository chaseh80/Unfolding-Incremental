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
  // The strike button lives in the sky of the Aim scene once that exists, so it
  // sits next to the choice of target. Before then it is under the charge.
  const strikeGroup = h('div', { class: 'row' }, strikeBtn, h('kbd', {}, 'S'), rodNote);
  const strikeSlot = h('div', {}, strikeGroup);
  const strikeBar = h('div', { class: 'sf-strikebar' });
  const cloudLive = h('div', {}, chargeAmount, h('div', { class: 'sf-sub' }, 'charge'), holdMeter, tensionText, strikeSlot);
  const cloudBox = h('div', { class: 'sf-panel sf-cloudbox' }, startBtn, cloudLive);

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

  // --- Aim: the scene ------------------------------------------------------
  // Flat, stacked layers: sky bands, ridges, three cloud decks, and dark
  // silhouettes standing on the ground, each with its bonus written beneath
  // it. Everything is drawn once, then only numbers and positions move.

  const VX = -225, VW = 1600, VH = 384, G = 300;
  const ORDER = ['mast', 'cinder', 'tidewater', 'ground', 'grove', 'clockwork', 'hollow', 'sky'];
  // Where each silhouette is drawn. The page moves them to where they belong
  // with a transform, so only the open ones are spread across the scene.
  const NOM = { mast: 82, cinder: 246, tidewater: 411, ground: 575, grove: 739, clockwork: 904, hollow: 1068, sky: 1232 };
  const TOP = { mast: 98, cinder: 196, tidewater: 268, ground: 284, grove: 176, clockwork: 148, hollow: 150, sky: 92 };
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const f0 = (n) => n.toFixed(0);
  const P = (pts) => pts.map((q) => q.map(f0).join(' ')).join('L');
  function rng(seed) {
    return () => {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const R = rng(31);

  function cogPath(cx, cy, r, teeth, hole) {
    const pts = [];
    const r0 = r * 0.72;
    for (let i = 0; i < teeth; i++) {
      for (const [f, rr] of [[0, r0], [0.24, r0], [0.3, r], [0.66, r], [0.72, r0]]) {
        const a = ((i + f) / teeth) * Math.PI * 2;
        pts.push(`${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`);
      }
    }
    let d = `M${pts.join('L')}Z`;
    if (hole) d += ` M${cx} ${cy - hole} A${hole} ${hole} 0 1 0 ${cx + 0.1} ${cy - hole} Z`;
    return d;
  }
  function starPath(cx, cy, big, small) {
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? big : small;
      pts.push(`${(cx + Math.cos(a) * r).toFixed(1)} ${(cy + Math.sin(a) * r).toFixed(1)}`);
    }
    return pts.join(' ');
  }

  function ridge(seed, lo, hi, fill, cls) {
    const r = rng(seed);
    const pts = [[VX - 10, G]];
    let x = VX - 10;
    while (x < VX + VW + 10) { x += 40 + r() * 90; pts.push([x, G - (lo + r() * (hi - lo))]); }
    pts.push([VX + VW + 10, G]);
    return `<path class="${cls}" d="M${P(pts)}Z" fill="${fill}"/>`;
  }
  // A cloud deck: a flat top and a faceted underside, drifting on its own.
  function deck(seed, base, spread, bell, g, c, fill, rim) {
    const r = rng(seed), bot = [];
    let x = -320;
    while (x < 1470) {
      const b = Math.max(0, 1 - Math.pow((x - 575) / 560, 2));
      bot.push([x, base + r() * spread + bell * b]);
      x += 46 + r() * 64;
    }
    return `<g class="${g}"><path class="${c}" d="M-320 -8L${P(bot)}L1470 -8Z" fill="${fill}"/><path d="M${P(bot)}" fill="none" stroke="${rim}" stroke-width="3"/></g>`;
  }

  function backdrop() {
    let s = `<defs><pattern id="sf-rain" width="14" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(12)"><path d="M3 4V16M10 24V36" stroke="#cfdcff" stroke-opacity=".22" stroke-width="1.5"/>${reduced ? '' : '<animateTransform attributeName="patternTransform" type="translate" values="0 0;0 40" dur="1.2s" repeatCount="indefinite" additive="sum"/>'}</pattern></defs>`;
    [['#1a2140', 0, 60], ['#222b50', 60, 120], ['#2b365e', 120, 180], ['#364570', 180, 230], ['#42527f', 230, 270], ['#51629a', 270, G]]
      .forEach(([c, a, b]) => { s += `<rect x="${VX}" y="${a}" width="${VW}" height="${b - a + 1}" fill="${c}"/>`; });
    for (let i = 0; i < 46; i++) s += `<rect x="${f0(VX + R() * VW)}" y="${f0(8 + R() * 120)}" width="2" height="2" fill="#cfdcff" opacity="${(0.25 + R() * 0.4).toFixed(2)}"/>`;
    s += '<circle cx="-110" cy="124" r="50" fill="#42527f"/><circle cx="-110" cy="124" r="37" fill="#dfe8fa"/>';
    s += ridge(4, 36, 88, '#3b4a7a', 'rg1') + ridge(9, 14, 46, '#2d3a66', 'rg2');
    s += deck(2, 44, 36, 0, 'd1', 'cb', '#3a4a78', '#6f84bf');
    s += deck(8, 30, 34, 10, 'd2', 'cm', '#2c3962', '#52669f');
    s += deck(5, 14, 16, 74, 'd3', 'cf', '#1c2548', '#3d4f8a');
    s += `<rect x="${VX}" y="60" width="${VW}" height="${G - 60}" fill="url(#sf-rain)"/>`;
    s += `<rect x="${VX}" y="${G}" width="${VW}" height="${VH - G}" fill="#1b2244"/><rect x="${VX}" y="${G}" width="${VW}" height="4" fill="#7f95d6"/>`;
    return s;
  }

  // The silhouettes. Dark shapes with a rim of light on one side; the aimed one
  // turns pale. Each is [markup, [x0, y0, x1, y1]] for its click area.
  const pine = (x, top, ht, wd) => `<polygon class="sil" points="${x},${top} ${x + wd * 0.34},${top + ht * 0.4} ${x + wd * 0.18},${top + ht * 0.4} ${x + wd * 0.46},${top + ht * 0.72} ${x + wd * 0.1},${top + ht * 0.72} ${x + wd * 0.1},${top + ht} ${x - wd * 0.1},${top + ht} ${x - wd * 0.1},${top + ht * 0.72} ${x - wd * 0.46},${top + ht * 0.72} ${x - wd * 0.18},${top + ht * 0.4} ${x - wd * 0.34},${top + ht * 0.4}"/>`;
  function mastPath() {
    const cx = NOM.mast;
    let m = `M${cx - 20} ${G}L${cx - 2} 120M${cx + 20} ${G}L${cx + 2} 120M${cx} 120V98M${cx - 8} 106H${cx + 8}`;
    const ys = [300, 262, 224, 186, 148];
    ys.forEach((y, i) => {
      const t = (300 - y) / 180, xl = cx - 20 + 18 * t, xr = cx + 20 - 18 * t;
      m += `M${xl} ${y}H${xr}`;
      if (i < ys.length - 1) {
        const t2 = (300 - ys[i + 1]) / 180, xl2 = cx - 20 + 18 * t2, xr2 = cx + 20 - 18 * t2;
        m += `M${xl} ${y}L${xr2} ${ys[i + 1]}M${xr} ${y}L${xl2} ${ys[i + 1]}`;
      }
    });
    return m;
  }
  function waveLine() {
    let w = '';
    for (let x = 346, up = 1; x < 480; x += 10, up *= -1) w += `${x === 346 ? 'M' : 'L'}${x} ${up > 0 ? 278 : 284}`;
    return w;
  }
  const SIL = {
    mast: [`<path class="sil o" d="${mastPath()}"/>`, [52, 60, 112, 306]],
    cinder: ['<polygon class="sil" points="226,300 226,248 238,248 238,196 254,196 254,248 266,248 266,300"/><rect class="sil win" x="240" y="276" width="12" height="24"/>', [214, 190, 278, 306]],
    tidewater: [`<rect class="water" x="358" y="284" width="106" height="12"/><g class="wave"><path d="${waveLine()}" fill="none" stroke="#9db6ee" stroke-width="3"/></g><rect class="sil" x="352" y="292" width="118" height="10"/><rect class="sil" x="452" y="258" width="6" height="34"/>`, [352, 258, 470, 306]],
    ground: ['<rect class="sil" x="530" y="290" width="90" height="12"/><path class="sil o" d="M545 292L548 280L551 292M575 292L578 272L581 292M600 292L603 282L606 292"/>', [522, 268, 628, 306]],
    grove: [pine(739, 176, 124, 66) + pine(784, 222, 78, 44) + pine(698, 236, 64, 36), [690, 166, 796, 306]],
    clockwork: [`<polygon class="sil" points="884,300 884,206 924,206 924,300"/><rect class="sil win" x="899" y="238" width="10" height="24"/><path class="sil cogspin" fill-rule="evenodd" d="${cogPath(904, 178, 30, 10, 8)}"/>`, [864, 144, 944, 306]],
    hollow: ['<polygon class="sil" points="1048,300 1058,200 1074,150 1090,210 1092,300"/><polygon class="sil facet" points="1074,150 1090,210 1092,300 1074,300"/><polygon class="sil" points="1092,300 1100,236 1112,264 1114,300"/><polygon class="sil" points="1024,300 1032,252 1046,276 1050,300"/><polygon class="sil facet" points="1032,252 1046,276 1050,300 1038,300"/>', [1020, 144, 1116, 306]],
    sky: [`<polygon class="sil" points="${starPath(1232, 128, 38, 9)}"/><polygon class="sil" points="${starPath(1286, 178, 15, 4)}"/><polygon class="sil" points="${starPath(1180, 188, 11, 3)}"/>`, [1160, 86, 1306, 206]],
  };

  const NSV = SVG;
  const mk = (tag, a) => { const e = document.createElementNS(NSV, tag); for (const k in a) e.setAttribute(k, a[k]); return e; };

  // Build the scene once.
  let svgMarkup = `<svg id="sf-sv" viewBox="${VX} 0 ${VW} ${VH}" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Targets for the next strike">`;
  svgMarkup += backdrop();
  for (const id of ORDER) {
    const [inner, [x0, y0, x1, y1]] = SIL[id];
    svgMarkup += `<g class="pos" data-aim="${id}" data-sil="${id}"><g class="st">${inner}<path class="mkr" d="M${NOM[id] - 9} ${y0 - 26}h18l-9 14z"/><rect class="hit" x="${x0}" y="${y0}" width="${x1 - x0}" height="${y1 - y0}"/></g></g>`;
  }
  for (const id of ORDER) {
    svgMarkup += `<g class="lab" data-aim="${id}" data-lab="${id}"><text class="n" y="326"></text><text class="r" y="345"></text><text class="w" y="364"></text></g>`;
  }
  svgMarkup += `<g id="sf-fx"></g><rect class="flash" id="sf-flash" x="${VX}" y="0" width="${VW}" height="${VH}"/></svg>`;

  const scene = h('div', { class: 'sf-scene' });
  scene.innerHTML = svgMarkup;
  const sv = scene.querySelector('#sf-sv');
  const fxLayer = scene.querySelector('#sf-fx');
  const flashRect = scene.querySelector('#sf-flash');
  const part = {};
  for (const id of ORDER) {
    const sil = scene.querySelector(`[data-sil="${id}"]`);
    const lab = scene.querySelector(`[data-lab="${id}"]`);
    part[id] = { sil, lab, st: sil.querySelector('.st'), n: lab.querySelector('.n'), r: lab.querySelector('.r'), w: lab.querySelector('.w') };
  }
  scene.addEventListener('click', (e) => {
    const t = e.target.closest && e.target.closest('[data-aim]');
    if (t) sf.setAim(S(), t.getAttribute('data-aim'));
  });

  // Cached attribute and visibility changes, so nothing is touched twice.
  const attr = (el, k, v) => { const key = '__a_' + k; if (el[key] !== v) { el.setAttribute(k, v); el[key] = v; } };
  const showSvg = (el, on) => { const want = !!on; if (el.__sv !== want) { el.toggleAttribute('hidden', !want); el.__sv = want; } };

  // Which targets are open decides where they stand.
  const spot = {};
  let spotKey = '';
  function layout(open) {
    const key = open.join();
    if (key === spotKey) return;
    spotKey = key;
    const n = open.length;
    const gap = n >= 8 ? 150 : n >= 6 ? 164 : 190;
    open.forEach((id, i) => { spot[id] = 575 + (i - (n - 1) / 2) * gap; });
    for (const id of ORDER) {
      const on = open.includes(id);
      showSvg(part[id].sil, on); showSvg(part[id].lab, on);
      if (!on) continue;
      attr(part[id].sil, 'transform', `translate(${spot[id] - NOM[id]} 0)`);
      for (const k of ['n', 'r', 'w']) attr(part[id][k], 'x', f0(spot[id]));
    }
  }

  function bonusFor(c, id, record) {
    if (id === 'mast') return sf.mastMult(c, record);
    if (id === 'sky') return sf.skyMult(S(), record);
    return record.lte(0) ? 1 : Math.pow(1 + record.add(1).log10().toNumber(), struckPower(S()));
  }

  // Strikes are events. Each one draws a fresh jagged bolt, cut out flat, that
  // fades over about a second. Aimed
  // strikes flash the sky dimly and swap the clouds' colour for a moment.
  // Automatic ground strikes faster than one every two seconds are not drawn,
  // so nothing ever flickers.
  function jag(x1, y1, x2, y2, rough, depth) {
    let pts = [[x1, y1], [x2, y2]];
    for (let k = 0; k < depth; k++) {
      const nx = [pts[0]];
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
        const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1, o = (Math.random() - 0.5) * rough;
        nx.push([(ax + bx) / 2 - (dy / len) * o, (ay + by) / 2 + (dx / len) * o], [bx, by]);
      }
      pts = nx;
      rough /= 1.9;
    }
    return pts;
  }
  function taper(pts, w0, w1) {
    const L = [], Rr = [];
    pts.forEach((q, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1, w = (w0 + (w1 - w0) * i / (pts.length - 1)) / 2;
      L.push([q[0] - dy / len * w, q[1] + dx / len * w]);
      Rr.push([q[0] + dy / len * w, q[1] - dx / len * w]);
    });
    return 'M' + P(L.concat(Rr.reverse())) + 'Z';
  }
  function boltOrigin(x2) {
    const bell = Math.max(0, 1 - Math.pow((x2 - 575) / 560, 2));
    return [x2 + (Math.random() - 0.5) * 120, 58 + 40 * bell];
  }
  function strikeAt(id, aimed) {
    const x2 = spot[id];
    if (x2 === undefined) return;
    const [x1, y1] = boltOrigin(x2);
    const grp = mk('g', { class: 'bolt' });
    const main = jag(x1, y1, x2, TOP[id], 56, 4);
    grp.append(mk('path', { class: 'bg', d: taper(main, 26, 8) }), mk('path', { class: 'bc', d: taper(main, 11, 3) }));
    if (aimed) {
      for (let b = 0; b < 2; b++) {
        const [bx, by] = main[2 + Math.floor(Math.random() * (main.length - 6))];
        const br = jag(bx, by, bx + (Math.random() < 0.5 ? -1 : 1) * 40, by + 70, 18, 3);
        grp.append(mk('path', { class: 'bc', d: taper(br, 7, 1) }));
      }
    }
    fxLayer.append(grp);
    if (aimed && !reduced) {
      sv.classList.add('lit');
      setTimeout(() => sv.classList.remove('lit'), 420);
      flashRect.classList.remove('go'); void flashRect.getBoundingClientRect(); flashRect.classList.add('go');
    }
    setTimeout(() => grp.remove(), 1500);
    if (!reduced) { const st = part[id].st; st.classList.remove('shake'); void st.getBoundingClientRect(); st.classList.add('shake'); }
  }

  let lastStrikes = null;
  let lastAim = 'ground';
  const aimDetail = h('p', { class: 'sf-aimdetail' });
  const aimBox = h('div', { class: 'sf-panel sf-aim' },
    h('p', { class: 'desc' }, 'Pick where the next strike lands. A target is boosted by the biggest strike it has taken. Aimed strikes pay no thunder.'),
    scene, aimDetail);
  scene.append(strikeBar);

  function updateAim(c, d) {
    const aim = d.aimed ? c.aim : 'ground';
    const worldPower = POWER[struckPower(S())];
    const mastPower = POWER[c.fulgUp.ion ? sf.BAL.mastPowerIon : sf.BAL.mastPower];
    const open = ORDER.filter((id) => sf.targetOpen(S(), id));
    layout(open);

    for (const id of open) {
      const k = part[id];
      const on = aim === id;
      const name = sf.TARGETS.find((x) => x.id === id).name;
      setClass(k.st, 'aimed', on);
      setClass(k.lab, 'aimed', on);
      setText(k.n, on ? `[ ${name} ]` : name);
      if (id === 'ground') {
        setText(k.r, 'Thunder');
        setText(k.w, '');
        continue;
      }
      const record = sf.recordAt(c, id);
      const has = record.gt(0);
      setText(k.r, has ? formatMult(bonusFor(c, id, record)) : 'Not struck');
      setText(k.w, d.strike.gt(record) ? `now ${formatMult(bonusFor(c, id, d.strike))}` : '');
    }

    // What the aimed target does, in one line under the scene.
    let detail = 'Ground: strikes pay thunder.';
    if (aim !== 'ground') {
      const t = sf.TARGETS.find((x) => x.id === aim);
      const what = aim === 'sky' ? 'All starlight' : aim === 'mast' ? 'Charge' : t.what;
      const power = aim === 'sky' ? POWER[sf.skyPower(S())] : aim === 'mast' ? mastPower : worldPower;
      const record = sf.recordAt(c, aim);
      detail = `${t.name}: ${what} ×(1 + powers of ten in its biggest strike)${power}. Biggest strike ${record.gt(0) ? amount(record) : 'none yet'}.`;
    }
    setText(aimDetail, detail);
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

  const stormPanel = h('div', {}, shine.el, aimBox,
    h('div', { class: 'sf-layout' },
      h('div', { class: 'sf-col' }, cloudBox),
      h('div', { class: 'sf-col' }, feedBox, pass.el, sources.el)));
  const tabs = subTabs([
    { id: 'storm', label: 'Storm', panel: stormPanel, open: () => true },
    { id: 'peals', label: 'Peals', panel: pealBox, open: (c) => c.bestPeals >= 1 },
    { id: 'fulgurite', label: 'Fulgurite', panel: fulgBox, open: (c) => !!c.seen.pass },
  ], {
    current: () => S().ui.stormfrontTab,
    choose: (id) => { S().ui.stormfrontTab = id; },
    visited: () => F().seen,
  });
  const el = h('section', { class: 'sf', 'data-world': 'stormfront' }, strip, tabs.nav, tabs.panels);

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

    const active = tabs.update((tab) => tab.open(c));
    // Draw a strike that happened since the last frame, where it landed.
    if (lastStrikes !== null && c.strikes > lastStrikes && active.id === 'storm' && c.seen.mast && !document.hidden) {
      const aimed = lastAim !== 'ground';
      if (aimed || p / sf.calc(S()).holdMax < 0.5) strikeAt(lastAim, aimed);
    }
    lastStrikes = c.strikes;
    lastAim = d.aimed ? c.aim : 'ground';
    shine.set(d.shine, c.pending, p);
    setShown(startBtn, !c.open);
    setShown(cloudLive, c.open);
    setClass(cloudBox, 'clear', !c.open);
    if (c.open) updateCloud(c, d);
    const sceneOn = c.open && !!c.seen.mast;
    const home = sceneOn ? strikeBar : strikeSlot;
    if (strikeGroup.parentNode !== home) home.append(strikeGroup);
    setShown(aimBox, sceneOn);
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
