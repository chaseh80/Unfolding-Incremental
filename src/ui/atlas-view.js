// The Atlas: where pages are folded and starlight is spent.
import { h, setText, setShown, setClass, setDisabled, confirmBox } from './dom.js';
import { format, formatDown, formatInt, formatTemp } from '../core/num.js';
import * as atlas from '../atlas.js';
import * as cinder from '../worlds/cinder.js';
import * as tw from '../worlds/tidewater.js';

const whole = (x) => formatInt(x);

export function buildAtlas(game) {
  const S = () => game.state;

  const WORLDS = [
    {
      id: 'cinder',
      name: 'Cinder',
      mod: cinder,
      open: () => true,
      waiting: () => `Cinder isn't shining yet this fold. It starts once the fire passes ${formatTemp(cinder.BAL.endTemp)}, and shines twice as brightly for every ${cinder.BAL.shineStep} degrees past that.`,
      rule: () => `It shines twice as brightly for every ${cinder.BAL.shineStep} degrees past ${formatTemp(cinder.BAL.endTemp)} the fire has reached this fold.`,
    },
    {
      id: 'tidewater',
      name: 'Tidewater',
      mod: tw,
      open: (s) => atlas.has(s, 'tidewater'),
      waiting: () => "Tidewater isn't shining yet this fold. It starts once a single tide passes the far strandline.",
      rule: () => 'It shines twice as brightly every time its best tide this fold grows a hundredfold.',
    },
  ];

  function tryFold(world) {
    const s = S();
    const w = s[world.id];
    if (w.pending.lt(1)) return;
    const gain = whole(w.pending);
    if (w.folds === 0) {
      confirmBox({
        title: `Fold ${world.name}?`,
        body: `Folding the page gathers the ${gain} starlight on it and starts ${world.name} over from the very beginning. Starlight, and everything you draw on the Atlas with it, is never lost. No other page is touched.`,
        yes: 'Fold the page',
        onYes: () => world.mod.fold(S()),
      });
      return;
    }
    world.mod.fold(S());
  }

  const starAmount = h('span');
  const starTotal = h('p', { class: 'desc' });

  const worldBoxes = WORLDS.map((world) => {
    const text = h('p', { class: 'desc' });
    const rule = h('p', { class: 'note' });
    const btn = h('button', { class: 'act primary', onclick: () => tryFold(world) });
    const el = h('div', { class: 'box' }, h('h3', {}, world.name), text, rule, h('div', { class: 'row', style: 'margin-top: 10px' }, btn));
    return { world, el, text, rule, btn };
  });

  const groups = atlas.GROUPS.map((g) => {
    const nodes = atlas.NODES.filter((n) => n.group === g.id).map((n) => {
      const cost = h('span', { class: 'cost' });
      const el = h('button', { class: 'upgrade', onclick: () => atlas.buy(S(), n.id) },
        h('span', { class: 'name' }, n.name), h('span', { class: 'text' }, n.text), cost);
      return { n, el, cost };
    });
    const el = h('div', { class: 'group' },
      h('h2', {}, g.name), g.text ? h('p', { class: 'desc' }, g.text) : null,
      h('div', { class: 'grid' }, nodes.map((k) => k.el)));
    return { g, el, nodes };
  });

  const groveNotice = h('div', { class: 'notice' },
    h('h3', {}, 'The third page'),
    h('p', {}, "You've unfolded it, and it's blank. Grove hasn't been drawn yet."),
    h('p', {}, 'This is as far as the game goes for now. Your save will carry over when there is more.'));

  const el = h('section', { class: 'panel star-accent' },
    h('div', { class: 'figure' }, starAmount, h('small', {}, 'starlight')),
    starTotal,
    h('p', { class: 'lead' }, 'A world that has been pushed far enough starts to shine, and the page it is drawn on slowly gathers starlight. Folding a page collects what it has gathered and starts that one world over. What you draw here with starlight stays.'),
    groveNotice,
    worldBoxes.map((b) => b.el),
    groups.map((g) => g.el));

  function update() {
    const s = S();
    const a = s.atlas;
    setText(starAmount, whole(a.starlight));
    setText(starTotal, a.total.gt(0) ? `You've gathered ${whole(a.total)} starlight in all.` : "You haven't gathered any starlight yet.");
    setShown(groveNotice, atlas.has(s, 'grove'));

    for (const b of worldBoxes) {
      const open = b.world.open(s);
      setShown(b.el, open);
      if (!open) continue;
      const w = s[b.world.id];
      const d = b.world.mod.calc(s);
      if (d.shine > 0) {
        setText(b.text, `${b.world.name} is giving off ${format(d.shine, 2)} starlight a minute, and the page has gathered ${formatDown(w.pending)} since it was last folded.`);
        setText(b.rule, b.world.rule());
      } else {
        setText(b.text, b.world.waiting());
        setText(b.rule, w.pending.gte(1) ? `The page still has ${formatDown(w.pending)} starlight on it.` : '');
      }
      const ready = w.pending.gte(1);
      setText(b.btn, ready ? `Fold ${b.world.name} for ${whole(w.pending)} starlight` : `Fold ${b.world.name}`);
      setDisabled(b.btn, !ready);
    }

    for (const g of groups) {
      let any = false;
      for (const k of g.nodes) {
        const visible = atlas.available(s, k.n);
        const has = atlas.has(s, k.n.id);
        const can = visible && !has && a.starlight.gte(k.n.cost);
        setShown(k.el, visible);
        any = any || visible;
        setClass(k.el, 'owned', has);
        setClass(k.el, 'can', can);
        setClass(k.el, 'cant', !has && !can);
        setText(k.cost, has ? 'Drawn' : `Costs ${whole(k.n.cost)} starlight`);
      }
      setShown(g.el, any);
    }
  }

  return { el, update, key() {} };
}
