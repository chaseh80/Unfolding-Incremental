// Everything you see while looking at Cinder.
import { h, setText, setShown, setClass, setDisabled, confirmBox } from './dom.js';
import { Decimal, format, formatInt, formatMult, formatTemp, formatTime } from '../core/num.js';
import { upgradeGrid, feedRow, subTabs, pointList, resetBox, breakdown, shineNotice, dial, real } from './parts.js';
import * as cinder from '../worlds/cinder.js';
import { paceMult } from '../worlds/links.js';

const heat = (x) => format(x, 1);
const whole = (x) => formatInt(x);
const IGN = cinder.IGNITIONS;
const indexOf = (id) => IGN.findIndex((p) => p.id === id);
const tempOf = (id) => IGN[indexOf(id)].temp;

export function buildCinder(game) {
  const S = () => game.state;
  const C = () => game.state.cinder;
  const pace = () => paceMult(game.state, 'cinder');

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

  // --- Strip -------------------------------------------------------------

  const amount = h('b');
  const rate = h('b');
  const tempLine = h('b');
  const speedText = h('div', { class: 'cd-speed' });
  const strip = h('header', { class: 'cd-strip' },
    h('div', { class: 'cd-stat' }, amount, h('span', {}, 'heat')),
    h('div', { class: 'cd-stat' }, rate, h('span', {}, 'heat per second')),
    h('div', { class: 'cd-stat' }, tempLine, h('span', {}, 'temperature')),
    speedText);

  function updateStrip(c, d) {
    setText(amount, heat(c.heat));
    setText(rate, c.lit ? heat(real(d.rate, pace())) : '0');
    setText(tempLine, c.lit ? formatTemp(d.temp) : '-');
    setShown(speedText, pace() > 1);
    setText(speedText, `Gamespeed: ${whole(pace())}×`);
  }

  // --- The forge ---------------------------------------------------------
  // Flat cut-paper layers: a brick wall, a dark furnace with a lit mouth, a
  // column that fills as it heats with an ignition point marked at each
  // notch, ash banked on the floor and glass on a shelf. Drawn once; after
  // that only sizes, heights and classes move.

  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const MAXP = IGN.length;
  const COL_X = 1120, COL_TOP = 40, COL_BOT = 346;
  const f0 = (n) => n.toFixed(0);

  const flame = (pts) => `<polygon points="${pts}"/>`;
  function forgeSvg() {
    let s = '<svg viewBox="0 0 1600 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
    s += '<defs><pattern id="cd-brick" width="80" height="48" patternUnits="userSpaceOnUse"><rect width="80" height="48" fill="#140e0b"/><path d="M0 0H80M0 24H80M0 48H80M40 0V24M0 24V48M80 24V48" stroke="#0b0706" stroke-width="3"/></pattern>';
    s += '<clipPath id="cd-mouth"><path d="M730 340V262Q730 214 800 214Q870 214 870 262V340Z"/></clipPath></defs>';
    // Back wall and floor.
    s += '<rect width="1600" height="420" fill="#0b0807"/><rect width="1600" height="334" fill="url(#cd-brick)"/>';
    s += '<rect y="0" width="1600" height="54" fill="#0b0807" opacity=".55"/>';
    // Stepped halos: hard-edged rings of light on the wall.
    s += '<g class="halo" id="cd-halo"><circle cx="800" cy="296" r="330" fill="#ff7a1a" opacity=".05"/><circle cx="800" cy="296" r="240" fill="#ff7a1a" opacity=".07"/><circle cx="800" cy="296" r="160" fill="#ff9a2e" opacity=".09"/></g>';
    s += '<rect y="334" width="1600" height="86" fill="#070504"/>';
    // Cobblestones: rows of rounded stones, bigger toward the front, staggered.
    const tones = ['#1c130e', '#241812', '#170f0b', '#201610'];
    const cob = [[344, 22, 8], [361, 28, 11], [383, 36, 14], [410, 46, 18]];
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    cob.forEach(([y, rx, ry], r) => {
      for (let x = (r % 2) * rx - rx; x < 1640; x += rx * 2 + 4) {
        const jx = (rnd() - 0.5) * 6, jy = (rnd() - 0.5) * 4, k = Math.floor(rnd() * 4), sx = rx * (0.9 + rnd() * 0.15);
        s += `<ellipse cx="${f0(x + jx)}" cy="${f0(y + jy)}" rx="${f0(sx)}" ry="${f0(ry)}" fill="${tones[k]}"/><ellipse cx="${f0(x + jx - sx * 0.2)}" cy="${f0(y + jy - ry * 0.3)}" rx="${f0(sx * 0.6)}" ry="${f0(ry * 0.45)}" fill="#33241a"/>`;
      }
    });
    s += '<rect y="334" width="1600" height="3" fill="#2a1912"/>';
    // Glass shelf, left.
    s += '<g class="lit-side"><rect x="400" y="236" width="150" height="6" fill="#050404"/><rect x="400" y="236" width="150" height="2" fill="#3a2418"/>';
    for (let i = 0; i < 5; i++) {
      const x = 410 + i * 28;
      s += `<g class="bottle" data-i="${i}"><polygon points="${x} 236 ${x + 2} 214 ${x + 5} 214 ${x + 5} 204 ${x + 11} 204 ${x + 11} 214 ${x + 14} 214 ${x + 16} 236" fill="#7fd6d0" opacity=".85"/><polygon points="${x + 2} 236 ${x + 4} 216 ${x + 7} 216 ${x + 7} 236" fill="#d6fff8" opacity=".6"/></g>`;
    }
    s += '</g>';
    // Anvil.
    s += '<g class="dark rim"><polygon points="420 334 432 306 450 306 450 296 430 296 392 288 392 276 520 276 520 290 484 296 484 306 500 306 512 334"/></g>';
    // Ash bank, right of the furnace foot.
    s += '<polygon id="cd-ash" class="ash" points="0 0"/>';
    // Furnace body and stack.
    s += '<g class="dark rim hot"><polygon points="630 340 630 176 690 150 910 150 970 176 970 340"/><polygon points="740 150 758 62 842 62 860 150"/><rect x="750" y="54" width="100" height="12"/></g>';
    s += '<polygon points="630 176 690 150 910 150 970 176 970 182 630 182" fill="#1b110c"/>';
    // Mouth, dark when cold.
    s += '<path class="mouth" d="M730 340V262Q730 214 800 214Q870 214 870 262V340Z"/>';
    s += '<g clip-path="url(#cd-mouth)"><g class="coals"><rect x="736" y="326" width="128" height="14" fill="#3b150a"/><rect x="742" y="322" width="20" height="8" fill="#7a2a0e"/><rect x="772" y="320" width="26" height="10" fill="#9a360f"/><rect x="808" y="322" width="22" height="8" fill="#7a2a0e"/><rect x="838" y="320" width="18" height="10" fill="#9a360f"/></g>';
    s += '<g id="cd-flames" class="flames" transform="translate(800 340) scale(1 .4) translate(-800 -340)">';
    s += `<g class="f1" fill="#e8501a">${flame('736 340 744 280 766 296 776 236 800 280 822 226 834 286 856 262 864 340')}</g>`;
    s += `<g class="f2" fill="#ff9a2e">${flame('752 340 758 296 778 308 790 258 806 298 824 252 836 304 850 340')}</g>`;
    s += `<g class="f3" fill="#ffe08a">${flame('774 340 780 306 794 316 802 276 814 312 826 300 832 340')}</g>`;
    s += `<g class="f4" fill="#fff6dc">${flame('790 340 794 320 802 300 810 322 814 340')}</g>`;
    s += '</g></g>';
    // Smoke from the stack, and embers out of the mouth.
    s += '<g class="smoke">';
    for (let i = 0; i < 3; i++) s += `<g class="pf" style="animation-delay:${-i * 3}s"><polygon points="${770 + i * 6} 56 ${790 + i * 6} 40 ${820 + i * 6} 46 ${830 + i * 6} 62 ${800 + i * 6} 70" fill="#2b2420"/></g>`;
    s += '</g><g class="embers">';
    const dx = [-34, 12, -8, 30, -22, 18, 4, -14];
    for (let i = 0; i < 8; i++) s += `<g class="em" style="--dx:${dx[i]}px;animation-delay:${-i * 0.9}s;animation-duration:${6 + (i % 3)}s"><rect x="${772 + i * 8}" y="${230 - (i % 2) * 10}" width="${i % 3 ? 4 : 6}" height="${i % 3 ? 4 : 6}" fill="${i % 2 ? '#ffb347' : '#ff7a1a'}"/></g>`;
    s += '</g>';
    // The column.
    s += `<rect x="${COL_X - 4}" y="${COL_TOP - 8}" width="32" height="${COL_BOT - COL_TOP + 16}" fill="#050404"/>`;
    s += `<rect x="${COL_X}" y="${COL_TOP}" width="24" height="${COL_BOT - COL_TOP}" fill="#1a110d"/>`;
    s += `<rect id="cd-fill" x="${COL_X}" y="${COL_BOT}" width="24" height="0" fill="#ff8a2a"/>`;
    s += `<rect id="cd-cap" x="${COL_X}" y="${COL_BOT}" width="24" height="4" fill="#fff0cf"/>`;
    s += `<rect x="${COL_X - 4}" y="${COL_TOP - 8}" width="3" height="${COL_BOT - COL_TOP + 16}" fill="#8a4a22"/>`;
    s += `<g id="cd-marker"><polygon points="${COL_X - 10} -7 ${COL_X - 10} 7 ${COL_X - 2} 0" fill="#fff0cf"/><text id="cd-now" class="w" x="${COL_X - 16}" y="5" style="text-anchor:end"></text></g>`;
    for (let i = 0; i < MAXP; i++) s += `<g class="tick" data-i="${i}"><rect x="${COL_X + 24}" y="-1" width="10" height="2"/><text class="r" x="${COL_X + 42}" y="5"></text></g>`;
    s += '</svg>';
    return s;
  }

  const scene = h('div', { class: 'cd-scene' });
  scene.innerHTML = forgeSvg();
  const q = (sel) => scene.querySelector(sel);
  const qa = (sel) => [...scene.querySelectorAll(sel)];
  const flames = q('#cd-flames');
  const halo = q('#cd-halo');
  const colFill = q('#cd-fill');
  const colCap = q('#cd-cap');
  const marker = q('#cd-marker');
  const nowText = q('#cd-now');
  const ashHeap = q('#cd-ash');
  const bottles = qa('.bottle');
  const ticks = qa('.tick').map((g) => ({ g, text: g.querySelector('text') }));
  const attr = (el, name, v) => {
    const k = '__a_' + name;
    if (el[k] !== v) { el.setAttribute(name, v); el[k] = v; }
  };
  const showSvg = (el, on) => {
    if (el.__on !== !!on) { el.toggleAttribute('hidden', !on); el.__on = !!on; }
  };
  const dec = (x) => (x.gt(0) ? Math.max(0, x.log10().toNumber()) : 0);

  // Where the heat sits on the column: whole notches passed, plus how far to the next.
  function colPos(c, d, n) {
    if (!c.lit) return 0;
    if (d.points >= n) return 1;
    const from = d.points > 0 ? IGN[d.points - 1].temp : cinder.BAL.tempBase;
    const next = IGN[d.points].temp;
    return (d.points + Math.min(1, Math.max(0, (d.temp - from) / (next - from)))) / n;
  }

  function updateScene(c, d) {
    const n = cinder.pointCap(S());
    const pos = colPos(c, d, n);
    setClass(scene, 'lit', c.lit);
    // The flame's colour follows the temperature: orange, red, yellow, white, blue, violet.
    const t = d.temp;
    attr(scene, 'data-stage', t >= 18000 ? 5 : t >= 7500 ? 4 : t >= 2200 ? 3 : t >= 1300 ? 2 : t >= 800 ? 1 : 0);
    attr(flames, 'transform', `translate(800 340) scale(${(0.82 + 0.26 * pos).toFixed(2)} ${(0.34 + 0.66 * pos).toFixed(2)}) translate(-800 -340)`);
    attr(halo, 'opacity', (0.3 + 0.7 * pos).toFixed(2));
    const span = COL_BOT - COL_TOP;
    const top = COL_BOT - pos * span;
    attr(colFill, 'y', f0(top)); attr(colFill, 'height', f0(pos * span));
    attr(colCap, 'y', f0(Math.min(COL_BOT - 4, top))); showSvg(colCap, c.lit);
    attr(marker, 'transform', `translate(0 ${f0(top)})`); showSvg(marker, c.lit);
    setText(nowText, c.lit ? formatTemp(d.temp) : '');
    ticks.forEach((t, i) => {
      const on = i < n && i <= c.bestPoints;
      showSvg(t.g, on);
      if (!on) return;
      attr(t.g, 'transform', `translate(0 ${f0(COL_BOT - ((i + 1) / n) * span)})`);
      setClass(t.g, 'lit', i < d.points);
      setText(t.text, formatTemp(IGN[i].temp));
    });
    // Ash banked on the floor, growing by tens.
    const ah = c.ash.gt(0) ? 8 + 52 * Math.min(1, dec(c.ash) / 10) : 0;
    showSvg(ashHeap, ah > 0);
    if (ah > 0) attr(ashHeap, 'points', `990 340 ${f0(1000)} ${f0(334 - ah * 0.5)} ${f0(1030)} ${f0(334 - ah * 0.8)} ${f0(1052)} ${f0(334 - ah)} ${f0(1080)} ${f0(334 - ah * 0.7)} ${f0(1104)} ${f0(334 - ah * 0.3)} 1110 340`);
    const shown = c.totalGlass.gt(0) ? Math.min(5, 1 + Math.floor(dec(c.totalGlass) / 2)) : 0;
    bottles.forEach((b, i) => showSvg(b, i < shown));
  }

  // The world's main control sits in the scene, under the furnace.
  const mainBtn = h('button', { class: 'act primary', onclick: () => { if (!C().lit) cinder.strike(S()); else tryBurn(); } });
  const mainKey = h('kbd', {}, 'B');
  const mainBar = h('div', { class: 'cd-bar' }, h('div', { class: 'row' }, mainBtn, mainKey));
  scene.append(mainBar);

  function updateMain(c, d) {
    if (!c.lit) {
      setText(mainBtn, 'Strike a spark');
      setDisabled(mainBtn, false);
      setShown(mainBar, true);
      setShown(mainKey, false);
      return;
    }
    const ready = d.canBurn && d.ashGain.gte(1);
    setShown(mainBar, !!c.seen.ash);
    setShown(mainKey, true);
    setText(mainBtn, ready ? `Burn down for ${whole(d.ashGain)} ash` : 'Burn down');
    setDisabled(mainBtn, !ready);
  }

  // --- Fire --------------------------------------------------------------

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
  const damperBox = h('div', { class: 'box' }, h('h3', {}, 'Damper'), damper.el);

  const embersText = h('p', { class: 'desc' });
  const embersBox = h('div', { class: 'box' }, h('h3', {}, 'Embers'), embersText);

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

  const feedBox = h('div', { class: 'box cd-feeds' }, h('h3', {}, 'Hearth'), Object.values(feeds).map((f) => f.el), buyAll);
  const firePanel = h('div', { class: 'panel' }, scene, shine.el,
    h('div', { class: 'cd-layout' },
      h('div', { class: 'cd-col' }, feedBox, damperBox),
      h('div', { class: 'cd-col' }, embersBox, sources.el)));

  function updateFire(c, d) {
    shine.set(d.shine, c.pending, pace());
    updateScene(c, d);
    updateMain(c, d);
    setShown(feedBox, c.lit);
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
    if (c.seen.embers) setText(embersText, `Building for ${formatTime(c.burnTime)}. Heat ×${format(d.embers, 2)}. Resets on burn down.`);

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
    ], heat(real(d.rate, pace())));
  }

  // --- Ignition points ---------------------------------------------------

  const points = pointList(IGN, (p) => formatTemp(p.temp));
  const ignitionPanel = h('div', { class: 'panel' },
    h('p', { class: 'desc' }, 'Every 100°C is 10× the heat per second. Points last until the fire goes out.'),
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
    if (shedding) setText(shedText, `Shedding ${format(d.ashGain.mul(cinder.BAL.passiveAshPerSecond * pace()), 1)} ash per second.`);
    updateBurn(ashBurn, c, d);
    ashGrid.update();
  }

  // --- Glass -------------------------------------------------------------

  const glassAmount = h('span');
  const glassText = h('p', { class: 'desc' });
  const glassPassive = h('p', { class: 'desc' });
  const smeltBox = resetBox({ title: 'Smelt', onClick: trySmelt });
  const mTiles = cinder.GLASS_MILESTONES.map((m) => h('div', { class: 'cd-tile' },
    h('span', { class: 'at' }, `${whole(m.need)} glass`), h('span', { class: 'text' }, m.text)));
  const milestones = {
    el: h('div', { class: 'box' }, h('h3', {}, 'Glass milestones'), h('div', { class: 'cd-tiles' }, mTiles)),
    set: (i, done) => setClass(mTiles[i], 'lit', done),
  };
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
    if (standing) setText(glassPassive, `Making ${format(d.glassGain.mul(cinder.BAL.passiveGlassPerSecond * pace()), 1)} glass per second.`);

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
    { id: 'ignition', label: 'Ignition points', panel: ignitionPanel, update: (c, d) => points.update(c.bestPoints, d.points, cinder.pointCap(S())), open: (c) => c.bestPoints >= 1 },
    { id: 'ash', label: 'Ash', panel: ashPanel, update: updateAsh, open: (c) => !!c.seen.ash },
    { id: 'glass', label: 'Glass', panel: glassPanel, update: updateGlass, open: (c) => !!c.seen.glass },
  ], {
    current: () => S().ui.cinderTab,
    choose: (id) => { S().ui.cinderTab = id; },
    visited: () => C().seen,
  });
  const el = h('section', { class: 'cd', 'data-world': 'cinder' }, strip, tabs.nav, tabs.panels);

  function update() {
    const c = C();
    const d = cinder.calc(S());
    updateStrip(c, d);
    tabs.update((tab) => tab.open(c)).update(c, d);
  }

  function key(k) {
    if (k === 'm') cinder.feedAll(S());
    if (k === 'b') tryBurn();
  }

  return { el, update, key };
}
