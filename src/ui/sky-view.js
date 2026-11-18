// The sky above the Observatory's constellations: Nova's tree. It appears at
// thirty stars, faint and out of reach, and can be bought into from the first
// Nova on. Drawn bottom to top; the six constellations below are its roots.
// Nodes come from src/sky.js. Look is in css/worlds/observatory.css.
import { h, setText, setShown, setClass } from './dom.js';
import { formatInt } from '../core/num.js';
import { rng, makeScene } from './scene.js';
import * as nova from '../nova.js';
import { NODES, NODE, ROOTS, ROOT_X, ROOT_Y, SKY_W, SKY_H, nodeText } from '../sky.js';

const whole = (x) => formatInt(x);
const SPIKE = (r) => `M0 ${-r} L${r * 0.18} ${-r * 0.18} L${r} 0 L${r * 0.18} ${r * 0.18} L0 ${r} L${-r * 0.18} ${r * 0.18} L${-r} 0 L${-r * 0.18} ${-r * 0.18} Z`;

function where(id) {
  if (id.startsWith('root:')) {
    const i = ROOTS.indexOf(id.slice(5));
    return [ROOT_X(i), SKY_H];
  }
  return [NODE[id].x, NODE[id].y];
}

function treeSvg() {
  const r = rng(77);
  // The far sky: hundreds of faint stars, thicker toward the bottom.
  let field = '';
  for (let i = 0; i < 420; i++) {
    const y = Math.pow(r(), 0.8) * SKY_H;
    field += `<circle class="far" cx="${(r() * SKY_W).toFixed(0)}" cy="${y.toFixed(0)}" r="${r() > 0.94 ? 1.6 : 0.9}"/>`;
  }
  // Faint threads from each constellation up into the sky.
  const threads = ROOTS.map((_, i) => `<line class="thread" x1="${ROOT_X(i).toFixed(0)}" y1="${SKY_H}" x2="${ROOT_X(i).toFixed(0)}" y2="${ROOT_Y - 60}"/>`).join('');
  const links = [];
  for (const n of NODES) {
    for (const l of n.links) {
      const [x, y] = where(l);
      links.push(`<line class="link" data-a="${n.id}" data-b="${l}" x1="${x.toFixed(0)}" y1="${y.toFixed(0)}" x2="${n.x}" y2="${n.y}"/>`);
    }
  }
  const nodes = NODES.map((n) => {
    const size = { travel: 5, notable: 9, keystone: 12, edge: 8 }[n.kind];
    const ring = n.kind === 'keystone' ? `<circle class="ring" r="${size + 8}"/>` : n.kind === 'edge' ? `<circle class="ring edge" r="${size + 6}"/>` : '';
    const spike = n.kind === 'travel' ? '' : `<path class="spike" d="${SPIKE(size * 1.9)}"/>`;
    return `<g class="node ${n.kind}" data-id="${n.id}" transform="translate(${n.x} ${n.y})"><circle class="hit" r="${size + 12}"/><circle class="halo" r="${size + 6}"/>${ring}${spike}<circle class="dot" r="${size}"/></g>`;
  }).join('');
  return `<svg viewBox="0 0 ${SKY_W} ${SKY_H}" preserveAspectRatio="xMidYMid meet">
  <rect class="sky" width="${SKY_W}" height="${SKY_H}"/>
  ${field}
  ${threads}
  <g class="top"><circle class="top-halo" cx="800" cy="58" r="34"/><path class="top-spike" transform="translate(800 58)" d="${SPIKE(30)}"/><circle class="top-dot" cx="800" cy="58" r="7"/></g>
  ${links.join('')}
  ${nodes}
</svg>`;
}

export function buildSky(game) {
  const S = () => game.state;
  const N = () => game.state.nova;

  const sc = makeScene('ob-tree', treeSvg());
  const nodeEls = Object.fromEntries(sc.qa('.node').map((g) => [g.dataset.id, g]));
  const linkEls = sc.qa('.link');

  // One line under the sky says what the node under the pointer does.
  const infoName = h('b');
  const infoText = h('span', { class: 'text' });
  const infoCost = h('span', { class: 'cost' });
  const info = h('div', { class: 'ob-treeinfo' }, infoName, infoText, infoCost);
  let hover = null;
  for (const [id, g] of Object.entries(nodeEls)) {
    g.addEventListener('mouseenter', () => { hover = id; update(); });
    g.addEventListener('mouseleave', () => { if (hover === id) hover = null; update(); });
    g.addEventListener('click', () => { nova.take(S(), id); update(); });
  }

  const respec = h('button', { class: 'act ob-respec', onclick: () => { nova.setRespec(S(), !N().respec); update(); } });

  const el = h('div', { class: 'ob-sky' }, sc.el, info, h('div', { class: 'row' }, respec));

  function update() {
    const s = S();
    const n = N();
    const open = n.count > 0 || nova.ready(s);
    setShown(el, open);
    if (!open) return;
    const live = n.count > 0;
    setClass(sc.el, 'live', live);
    const cost = nova.nodeCost(n);
    for (const [id, g] of Object.entries(nodeEls)) {
      const owned = (n.nodes[id] || 0) > 0;
      setClass(g, 'owned', owned);
      setClass(g, 'open', live && nova.reachable(s, id));
      setClass(g, 'can', live && nova.canTake(s, id));
    }
    for (const l of linkEls) {
      const a = (n.nodes[l.dataset.a] || 0) > 0;
      const b = l.dataset.b.startsWith('root:') || (n.nodes[l.dataset.b] || 0) > 0;
      setClass(l, 'lit', a && b);
    }

    setShown(respec, live);
    setShown(info, live);
    if (!live) return;
    setText(respec, n.respec ? 'The tree is refunded at the next Nova' : 'Refund the tree at the next Nova');
    setClass(respec, 'primary', n.respec);
    if (hover) {
      const node = NODE[hover];
      const k = n.nodes[hover] || 0;
      setText(infoName, node.name || { travel: 'A star', edge: 'Further out' }[node.kind] || '');
      setText(infoText, nodeText(node) + (node.kind === 'edge' && k ? ` Taken ${k}×.` : ''));
      const owned = k > 0 && node.kind !== 'edge';
      setText(infoCost, owned ? 'Taken' : nova.reachable(s, hover) ? `${whole(cost)} stardust` : 'Out of reach');
    } else {
      setText(infoName, `${whole(n.dust)} stardust`);
      setText(infoText, `The next star costs ${whole(cost)}.`);
      setText(infoCost, '');
    }
  }

  return { el, update };
}
