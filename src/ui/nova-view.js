// The Nova tab: the reset above Eclipse, and what stardust buys for good.
// The scene is one star, which swells as the stars charted near thirty and
// burns white once a Nova is possible. The Nova itself is the button in the
// scene. The tree that stardust also buys is on the Observatory page. Look is in
// css/worlds/nova.css.
import { h, setText, setShown, setClass, confirmBox } from './dom.js';
import { formatInt, formatTime } from '../core/num.js';
import { attr, rng, makeScene, mainBar } from './scene.js';
import * as nova from '../nova.js';
import * as obs from '../observatory.js';

const whole = (x) => formatInt(x);
const RAYS = 24;

function novaSvg() {
  const r = rng(41);
  const cx = 800;
  const cy = 190;
  let dust = '';
  for (let i = 0; i < 120; i++) {
    dust += `<circle class="dust" cx="${(r() * 1600).toFixed(0)}" cy="${(r() * 420).toFixed(0)}" r="${r() > 0.92 ? 1.8 : 1}"/>`;
  }
  let rays = '';
  for (let i = 0; i < RAYS; i++) {
    const a = (i / RAYS) * Math.PI * 2 + (r() - 0.5) * 0.12;
    const len = 1 + r() * 0.8;
    const w = 0.03 + r() * 0.025;
    const p = (ang, rad) => `${(cx + Math.cos(ang) * rad).toFixed(1)} ${(cy + Math.sin(ang) * rad).toFixed(1)}`;
    rays += `<path class="ray ${i % 2 ? 'b' : 'a'}" d="M${p(a - w, 30)} L${p(a, 30 + 150 * len)} L${p(a + w, 30)} Z"/>`;
  }
  return `<svg viewBox="0 0 1600 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <rect class="sky" width="1600" height="420"/>
  ${dust}
  <g id="nv-burst">
    <circle class="shell s2" cx="${cx}" cy="${cy}" r="150"/>
    <circle class="shell s1" cx="${cx}" cy="${cy}" r="95"/>
    <g class="rays">${rays}</g>
    <circle class="core-halo" cx="${cx}" cy="${cy}" r="46"/>
    <circle class="core" id="nv-core" cx="${cx}" cy="${cy}" r="20"/>
  </g>
</svg>`;
}

export function buildNova(game) {
  const S = () => game.state;
  const N = () => game.state.nova;

  function tryNova() {
    const s = S();
    if (!nova.ready(s)) return;
    confirmBox({
      title: 'Nova?',
      body: `Resets everything: every world, the Atlas, corona and all it bought, and the Observatory. You get ${whole(nova.gain(s))} stardust. Stardust, the sky and what stardust buys are never lost.`,
      yes: 'Nova',
      onYes: () => game.nova(),
    });
  }

  const dustAmount = h('b');
  const countText = h('b');
  const strip = h('header', { class: 'nv-strip' },
    h('div', { class: 'nv-stat' }, dustAmount, h('span', {}, 'stardust')),
    h('div', { class: 'nv-stat' }, countText, h('span', {}, 'Novas')));

  const sc = makeScene('nv-scene', novaSvg());
  const burst = sc.q('#nv-burst');
  const core = sc.q('#nv-core');
  const main = mainBar('nv', tryNova, 'N');
  sc.el.append(main.el);

  const starsText = h('p', { class: 'desc' });
  const timeText = h('p', { class: 'note' });
  const box = h('div', { class: 'box' }, starsText, timeText);

  // Stardust upgrades: tiles, kept for good.
  const ups = nova.UPGRADES.map((u) => {
    const price = h('span', { class: 'cost' });
    const level = h('span', { class: 'need' });
    const el = h('button', { class: 'upgrade', onclick: () => nova.buyUp(S(), u.id) },
      h('span', { class: 'name' }, u.name), h('span', { class: 'text' }, u.text), level, price);
    return { u, el, price, level };
  });
  const upGroup = h('div', { class: 'group' }, h('h3', {}, 'Kept for good'), h('div', { class: 'grid' }, ups.map((k) => k.el)));

  const el = h('section', { class: 'nv', 'data-world': 'nova' }, strip,
    h('div', { class: 'panel' }, sc.el, box, upGroup));

  function update() {
    const s = S();
    const n = N();
    const stars = obs.totalStars(s);
    setText(dustAmount, whole(n.dust));
    setText(countText, whole(n.count));
    const ready = nova.ready(s);
    const gain = nova.gain(s);
    main.set({ label: ready ? `Nova for ${whole(gain)} stardust` : `Nova at ${nova.BAL.opensAt} stars`, enabled: ready, hotkey: false });

    // The star swells toward thirty stars and burns white past it.
    const f = Math.min(1, stars / nova.BAL.opensAt);
    attr(burst, 'style', `--f:${f.toFixed(2)}`);
    attr(core, 'r', (12 + f * 18).toFixed(1));
    setClass(sc.el, 'ready', ready);

    const depth = nova.depth(s);
    let line = `${stars} stars charted this run.`;
    if (ready) line += ` Stardust ×${nova.BAL.dustGrowth} for each star past ${nova.BAL.opensAt}.`;
    if (depth > stars) line += ` Corona found since the last star counts as ${(depth - stars).toFixed(1)} more.`;
    setText(starsText, line);
    let times = `This Nova: ${formatTime(n.time)}.`;
    if (n.count > 0) times += ` Last: ${formatTime(n.lastTime)}.`;
    setText(timeText, times);

    setShown(upGroup, n.count > 0);
    if (n.count < 1) return;
    for (const k of ups) {
      const lv = n.up[k.u.id] || 0;
      const owned = !k.u.grow && lv > 0;
      const can = nova.canBuyUp(s, k.u.id);
      setShown(k.level, !!k.u.grow);
      if (k.u.grow) setText(k.level, `Level ${lv}`);
      setText(k.price, owned ? 'Bought' : `${whole(nova.upCost(n, k.u.id))} stardust`);
      setClass(k.el, 'owned', owned);
      setClass(k.el, 'can', can);
      setClass(k.el, 'cant', !owned && !can);
    }
  }

  return { el, update, key() {} };
}
