// The Observatory tab: telescopes, the six constellations, and what the
// worlds pay for. The sky is the scene: each constellation has its stars lit as
// they are charted, with the button to chart the next one under it, and the
// telescopes on the horizon turn to the world they watch. Look is in
// css/worlds/observatory.css.
import { h, setText, setShown, setClass, setDisabled } from './dom.js';
import { format, formatDown, formatInt, formatTime } from '../core/num.js';
import { attr, showSvg, rng, makeScene, WORLD_COLOUR } from './scene.js';
import * as obs from '../observatory.js';

const whole = (x) => formatInt(x);
const ORDINAL = ['First', 'Second', 'Third'];

const NODE_X = (i) => 1600 * (i + 0.5) / 6;
const SCOPE_X = [740, 800, 860];
const SCOPE_Y = 374;

function skySvg() {
  const r = rng(23);
  let dust = '';
  for (let i = 0; i < 90; i++) {
    dust += `<circle class="dust" cx="${(r() * 1600).toFixed(0)}" cy="${(r() * 300).toFixed(0)}" r="${r() > 0.9 ? 2 : 1.2}"/>`;
  }
  const star = 'M0 -15 L2.5 -2.5 L15 0 L2.5 2.5 L0 15 L-2.5 2.5 L-15 0 L-2.5 -2.5 Z';
  const sky = obs.WORLD_INFO.map((w, wi) => {
    const cx = NODE_X(wi);
    const pts = Array.from({ length: obs.BAL.stars }, (_, k) => [cx - 88 + k * 25 + (r() - 0.5) * 14, 132 + (r() - 0.5) * 100]);
    const line = (a, b, id) => `<line class="link" id="${id}" x1="${pts[a][0].toFixed(0)}" y1="${pts[a][1].toFixed(0)}" x2="${pts[b][0].toFixed(0)}" y2="${pts[b][1].toFixed(0)}"/>`;
    const links = pts.slice(1).map((_, k) => line(k, k + 1, `ob-l-${w.id}-${k}`)).join('') + line(2, 5, `ob-l-${w.id}-x`);
    const stars = pts.map((p, k) => `<g class="star" id="ob-s-${w.id}-${k}" transform="translate(${p[0].toFixed(0)} ${p[1].toFixed(0)})"><circle class="nextring" r="11"/><circle class="halo" r="13"/><path class="spike" d="${star}"/><circle class="dot" r="4"/></g>`).join('');
    return `<g style="--c:${WORLD_COLOUR[w.id]}">${links}${stars}</g>`;
  }).join('');
  const scopes = SCOPE_X.map((x, i) =>
    `<g transform="translate(${x} ${SCOPE_Y})" id="ob-scope${i}"><path class="legs" d="M0 -4 L-28 26 M0 -4 L28 26 M0 -4 L0 26"/><g class="tube" id="ob-tube${i}"><rect x="-7" y="-80" width="14" height="80"/><rect x="-10" y="-88" width="20" height="10"/></g></g>`).join('');
  return `<svg viewBox="0 0 1600 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <rect class="sky" width="1600" height="420"/>
  <rect class="sky b" y="205" width="1600" height="215"/>
  <rect class="sky c" y="320" width="1600" height="100"/>
  ${dust}
  ${sky}
  <path class="hill far" d="M0 420 L0 346 Q200 308 420 336 T820 328 T1200 340 T1600 322 L1600 420 Z"/>
  <path class="hill near" d="M0 420 L0 384 Q300 358 600 378 T1100 374 T1600 378 L1600 420 Z"/>
  <g class="scopes">${scopes}</g>
</svg>`;
}

/** Turn an SVG group to an angle, only when it changes. */
function turn(el, deg) {
  const v = `rotate(${deg.toFixed(1)}deg)`;
  if (el.__turn !== v) { el.style.transform = v; el.__turn = v; }
}

export function buildObservatory(game) {
  const S = () => game.state;
  const O = () => game.state.observatory;

  // --- Strip and sky -------------------------------------------------------

  const starCount = h('b');
  const strip = h('header', { class: 'ob-strip' },
    h('div', { class: 'ob-stat' }, starCount, h('span', {}, `of ${obs.MOST_STARS} stars charted`)));
  const doneNotice = h('div', { class: 'notice' },
    h('h3', {}, 'The sky is charted'),
    h('p', { class: 'desc' }, 'Every constellation is finished. What that opens is not built yet.'));

  const sc = makeScene('ob-scene', skySvg());
  const scene = sc.el;
  const constellations = obs.WORLD_INFO.map((w) => ({
    w,
    stars: Array.from({ length: obs.BAL.stars }, (_, k) => sc.q(`#ob-s-${w.id}-${k}`)),
    links: [...Array.from({ length: obs.BAL.stars - 1 }, (_, k) => sc.q(`#ob-l-${w.id}-${k}`)), sc.q(`#ob-l-${w.id}-x`)],
  }));
  const tubes = SCOPE_X.map((_, i) => ({ g: sc.q('#ob-scope' + i), tube: sc.q('#ob-tube' + i) }));

  // One row for each telescope: where it points and how sharp it is.
  const scopes = ORDINAL.map((name, i) => {
    const pick = h('select', { onchange: () => obs.point(S(), i, pick.value) },
      h('option', { value: '' }, 'nowhere'),
      obs.WORLD_INFO.map((w) => h('option', { value: w.id }, w.name)));
    const text = h('span', { class: 'muted' });
    const el = h('label', { class: 'check' }, `${name} telescope points at `, pick, text);
    return { el, pick, text };
  });
  const scopeNote = h('p', { class: 'note' });
  const scopeBox = h('div', { class: 'box' }, h('h3', {}, 'Telescopes'), scopes.map((k) => k.el), scopeNote);

  const worlds = obs.WORLD_INFO.map((w) => {
    const count = h('span', { class: 'count' });
    const sight = h('p', { class: 'desc' });
    const seen = h('p', { class: 'note' });
    const next = h('p', { class: 'desc' });
    const lens = h('button', { class: 'act', onclick: () => obs.buyLens(S(), w.id) });
    const lensNote = h('p', { class: 'note' });
    const el = h('div', { class: 'ob-world box', style: `--c: ${WORLD_COLOUR[w.id]}` }, h('h3', {}, `${w.sky} (${w.name})`, count), sight, seen, next,
      h('div', { class: 'row' }, lens), lensNote);
    // Under the constellation, in the scene.
    const name = h('b', {}, w.sky);
    const small = h('span', { class: 'small' });
    const chart = h('button', { class: 'act primary', onclick: () => obs.chart(S(), w.id) }, 'Chart the next star');
    const col = h('div', { class: 'ob-col', style: `--c: ${WORLD_COLOUR[w.id]}` }, name, small, chart);
    return { w, el, count, sight, seen, next, chart, lens, lensNote, col, small };
  });
  scene.append(h('div', { class: 'ob-cols' }, worlds.map((k) => k.col)));
  const worldGrid = h('div', { class: 'ob-worlds' }, worlds.map((k) => k.el));

  const milestones = obs.MILESTONES.map((m) => {
    const el = h('div', { class: 'ob-tile' }, h('span', { class: 'at' }, `${m.stars} ${m.stars === 1 ? 'star' : 'stars'}`), h('span', { class: 'text' }, m.text));
    return { m, el };
  });
  const milestoneBox = h('div', { class: 'box' }, h('h3', {}, 'Milestones'),
    h('p', { class: 'desc' }, 'By stars charted in all, whichever constellations they are in.'),
    h('div', { class: 'ob-tiles' }, milestones.map((k) => k.el)));

  const instruments = obs.INSTRUMENTS.map((u) => {
    const price = h('span', { class: 'cost' });
    const el = h('button', { class: 'upgrade', onclick: () => obs.buyInstrument(S(), u.id) },
      h('span', { class: 'name' }, u.name), h('span', { class: 'text' }, u.text), price);
    return { u, el, price };
  });
  const instrumentGroup = h('div', { class: 'group' }, h('h3', {}, 'Instruments'),
    h('p', { class: 'desc' }, 'Paid for by two worlds at once, out of what they hold right now.'),
    h('div', { class: 'grid' }, instruments.map((k) => k.el)));

  const el = h('section', { class: 'ob', 'data-world': 'observatory' }, strip,
    h('div', { class: 'panel' }, scene,
      h('p', { class: 'lead' }, 'A telescope pointed at a world gathers sightings of it, faster the more starlight that world has gathered this Eclipse. Sightings chart stars. Nothing here is ever reset, and nothing here changes a world.'),
      doneNotice, scopeBox, milestoneBox, worldGrid, instrumentGroup));

  function update() {
    const s = S();
    const o = O();
    const total = obs.totalStars(s);
    setText(starCount, whole(total));
    setShown(doneNotice, total >= obs.MOST_STARS);

    const count = obs.scopeCount(s);
    const full = obs.focusMax(s);
    scopes.forEach((k, i) => {
      setShown(k.el, i < count);
      if (i >= count) return;
      if (document.activeElement !== k.pick && k.pick.value !== o.at[i]) k.pick.value = o.at[i];
      if (!o.at[i]) { setText(k.text, ''); return; }
      const f = obs.focus(s, i);
      const left = obs.focusTime(s) - o.held[i];
      setText(k.text, left > 0 ? `Focus ×${format(f, 2)}, ×${full} in ${formatTime(left)}.` : `Focus ×${full}.`);
    });
    const sky = obs.skyMult(s);
    setText(scopeNote, `${obs.reached(s, 'steady') ? 'A moved telescope keeps half its focus.' : 'Moving a telescope starts its focus again.'}${sky > 1 ? ` Milestones and Aperture make every telescope ×${format(sky, 1)} faster.` : ''}`);
    // Show what has been reached and the next two, so the list unfolds.
    let ahead = 0;
    for (const k of milestones) {
      const done = total >= k.m.stars;
      if (!done) ahead += 1;
      setShown(k.el, done || ahead <= 2);
      setClass(k.el, 'lit', done);
    }

    for (const k of worlds) {
      const id = k.w.id;
      const stars = o.stars[id];
      setText(k.count, ` ${stars} of ${obs.BAL.stars}`);
      setText(k.small, `${k.w.name}: ${stars} of ${obs.BAL.stars}`);
      const r = obs.rate(s, id);
      const watched = obs.scopeOn(s, id) >= 0;
      setText(k.sight, `${formatDown(o.sight[id])} sightings. ${watched ? `+${format(r * 60, 2)} per minute.` : 'No telescope on it.'}`);
      const gathered = s[id].given.add(s[id].pending);
      setText(k.seen, `Gathered ${whole(gathered)} starlight this Eclipse. ${k.w.best} seen: ${k.w.show(o.best[id])}.`);

      const star = obs.nextStar(s, id);
      setShown(k.next, true);
      setShown(k.chart, !!star);
      if (star) {
        setText(k.next, `The next star needs ${whole(star.sight)} sightings and ${k.w.need(star.record)}.`);
        setDisabled(k.chart, !obs.canChart(s, id));
      } else {
        setText(k.next, 'Finished.');
      }

      const cost = obs.lensCost(s, id);
      setShown(k.lens, !!cost);
      if (cost) {
        setText(k.lens, `Grind a lens for ${format(cost, 0)} ${k.w.payName}`);
        setDisabled(k.lens, s[id][k.w.pay].lt(cost));
      }
      const level = o.lens[id];
      setText(k.lensNote, cost
        ? `Sightings of ${k.w.name} ×${obs.BAL.lensMult}. Lens ${level} of ${k.w.lens.length}. You have ${format(s[id][k.w.pay], 0)} ${k.w.payName}.`
        : `Lens ${level} of ${k.w.lens.length}.`);
    }

    constellations.forEach(({ w, stars, links }) => {
      const n = o.stars[w.id];
      stars.forEach((g, k) => { setClass(g, 'lit', k < n); setClass(g, 'next', k === n); });
      links.forEach((l, k) => setClass(l, 'lit', k < links.length - 1 ? k + 1 < n : n > 5));
    });
    tubes.forEach((t, i) => {
      showSvg(t.g, i < count);
      if (i >= count) return;
      const wi = o.at[i] ? obs.WORLD_INFO.findIndex((w) => w.id === o.at[i]) : -1;
      turn(t.tube, wi < 0 ? 0 : Math.max(-75, Math.min(75, Math.atan2(NODE_X(wi) - SCOPE_X[i], 300) * 180 / Math.PI)));
    });

    for (const k of instruments) {
      const owned = !!o.up[k.u.id];
      const can = obs.canBuyInstrument(s, k.u.id);
      setText(k.price, owned ? 'Bought' : obs.costText(k.u));
      setClass(k.el, 'owned', owned);
      setClass(k.el, 'can', can);
      setClass(k.el, 'cant', !owned && !can);
    }
  }

  return { el, update, key() {} };
}
