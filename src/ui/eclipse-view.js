// The Eclipse tab: the reset above the Atlas, and what corona buys.
import { h, setText, setShown, setClass, setDisabled, confirmBox } from './dom.js';
import { formatInt, formatTime } from '../core/num.js';
import * as ecl from '../eclipse.js';
import { unlocked, BAL as obsBAL } from '../observatory.js';

const whole = (x) => formatInt(x);

export function buildEclipse(game) {
  const S = () => game.state;
  const E = () => game.state.eclipse;

  function tryEclipse() {
    const d = ecl.calc(S());
    if (!d.ready) return;
    confirmBox({
      title: 'Eclipse?',
      body: `Resets every world, all starlight and every Atlas upgrade. You get ${whole(d.gain)} corona. Corona and what it buys are never lost.`,
      yes: 'Eclipse',
      onYes: () => ecl.eclipse(S()),
    });
  }

  const coronaAmount = h('span');
  const foundText = h('p', { class: 'desc' });

  const needWorlds = h('p', { class: 'desc' });
  const needNode = h('p', { class: 'desc' });
  const gainText = h('p', { class: 'desc' });
  const timeText = h('p', { class: 'note' });
  const btn = h('button', { class: 'act primary', onclick: tryEclipse });
  const box = h('div', { class: 'box' }, h('h3', {}, 'Eclipse'),
    h('p', { class: 'desc' }, 'Resets every world, all starlight and every Atlas upgrade. Worlds unlock again in the same order.'),
    needWorlds, needNode, gainText, timeText,
    h('div', { class: 'row', style: 'margin-top: 10px' }, btn));

  // One group of cards for each price.
  const tiers = ecl.TIERS.map((cost) => {
    const cards = ecl.UPGRADES.filter((u) => u.cost === cost).map((u) => {
      const price = h('span', { class: 'cost' });
      const el = h('button', { class: 'upgrade', onclick: () => ecl.buyUpgrade(S(), u.id) },
        h('span', { class: 'name' }, u.name), h('span', { class: 'text' }, u.text), price);
      return { u, el, price };
    });
    const el = h('div', { class: 'group' },
      h('h2', {}, cards.length === 1 ? `${cost} corona` : `${cost} corona each`),
      h('div', { class: 'grid' }, cards.map((k) => k.el)));
    return { cost, el, cards };
  });
  // Each world's own upgrades. The price depends on how many of that world's are owned.
  const worldGroups = ecl.WORLDS.map((w) => {
    const note = h('p', { class: 'desc' });
    const cards = ecl.WORLD_UPGRADES.filter((u) => u.world === w.id).map((u) => {
      const price = h('span', { class: 'cost' });
      const el = h('button', { class: 'upgrade', onclick: () => ecl.buyWorldUpgrade(S(), u.id) },
        h('span', { class: 'name' }, u.name), h('span', { class: 'text' }, u.text), price);
      return { u, el, price };
    });
    const el = h('div', { class: 'group' }, h('h2', {}, w.name), note, h('div', { class: 'grid' }, cards.map((k) => k.el)));
    return { w, el, note, cards };
  });

  // Expansions: new content for one world, at a price that rises with each one bought.
  const expCards = ecl.EXPANSIONS.map((x) => {
    const world = ecl.WORLDS.find((w) => w.id === x.world).name;
    const progress = h('span', { class: 'need' });
    const price = h('span', { class: 'cost' });
    const el = h('button', { class: 'upgrade', onclick: () => ecl.buyExpansion(S(), x.world) },
      h('span', { class: 'name' }, `${x.name} (${world})`), h('span', { class: 'text' }, x.text), progress, price);
    return { x, el, progress, price };
  });
  const expNote = h('p', { class: 'desc' });
  const expGroup = h('div', { class: 'group' }, h('h2', {}, 'Expansions'), expNote,
    h('div', { class: 'grid' }, expCards.map((k) => k.el)));

  // Charges from the Observatory: one row for each upgrade that can take one.
  const chargeRows = ecl.UPGRADES.filter((u) => u.charged).map((u) => {
    const box = h('input', { type: 'checkbox', onchange: () => { ecl.setCharge(S(), u.id, box.checked); update(); } });
    const now = h('span', { class: 'muted' });
    const el = h('label', { class: 'check' }, box, h('b', {}, u.name), `${u.charged}`, now);
    return { u, el, box, now };
  });
  const chargeNote = h('p', { class: 'desc' });
  const chargeBox = h('div', { class: 'box' }, h('h3', {}, 'Charges'), chargeNote, chargeRows.map((r) => r.el));

  // Aperture never runs out.
  const aperturePrice = h('span', { class: 'cost' });
  const apertureText = h('span', { class: 'text' });
  const apertureCard = h('button', { class: 'upgrade', onclick: () => ecl.buyAperture(S()) },
    h('span', { class: 'name' }, 'Aperture'), apertureText, aperturePrice);
  const apertureGroup = h('div', { class: 'group' }, h('h2', {}, 'Again and again'),
    h('div', { class: 'grid' }, apertureCard));

  const upgrades = h('div', {},
    h('p', { class: 'lead' }, 'Corona upgrades are never lost. Owning one from a price opens the next price.'),
    chargeBox, tiers.map((t) => t.el), apertureGroup, expGroup, worldGroups.map((g) => g.el));

  const endNotice = h('div', { class: 'notice' },
    h('h3', {}, 'Observatory'),
    h('p', {}, 'Opens with your first expansion.'));

  const el = h('section', { class: 'panel corona-accent' },
    h('div', { class: 'figure' }, coronaAmount, h('small', {}, 'corona')),
    foundText, endNotice, box, upgrades);

  function update() {
    const s = S();
    const e = E();
    const d = ecl.calc(s);
    setText(coronaAmount, whole(e.corona));
    setText(foundText, `Found ${whole(e.totalCorona)} corona.`);
    setShown(endNotice, e.count >= 1 && !unlocked(s));

    const dark = ecl.WORLDS.filter((w, i) => !d.lit[i]).map((w) => w.name);
    setText(needWorlds, dark.length === 0
      ? 'Every world is shining.'
      : `Needs every world shining this fold. Not shining: ${dark.join(', ')}.`);
    setShown(needNode, !d.hasNode);
    setText(needNode, 'Needs the Eclipse upgrade in the Atlas.');
    setShown(gainText, d.hasNode);
    setText(gainText, `Gathered ${whole(s.atlas.total)} starlight this Eclipse. The next corona is at ${whole(d.nextAt)}.`);
    let times = `This Eclipse: ${formatTime(e.time)}.`;
    if (e.count > 0) times += ` Last: ${formatTime(e.lastTime)}. Quickest: ${formatTime(e.bestTime)}.`;
    setText(timeText, times);
    setText(btn, d.ready ? `Eclipse for ${whole(d.gain)} corona` : 'Eclipse');
    setDisabled(btn, !d.ready);

    setShown(upgrades, e.count >= 1);
    if (e.count < 1) return;
    const worldsOpen = ecl.worldUpgradesOpen(e);
    for (const g of worldGroups) {
      setShown(g.el, worldsOpen);
      if (!worldsOpen) continue;
      const cost = ecl.worldCost(e, g.w.id);
      const left = g.cards.filter((k) => !e.up[k.u.id]).length;
      setText(g.note, left > 0 ? `The next upgrade here costs ${cost} corona.` : 'All bought.');
      for (const k of g.cards) {
        const owned = !!e.up[k.u.id];
        const can = !owned && e.corona.gte(cost);
        setText(k.price, owned ? 'Bought' : `${cost} corona`);
        setClass(k.el, 'owned', owned);
        setClass(k.el, 'can', can);
        setClass(k.el, 'cant', !owned && !can);
      }
    }
    const have = ecl.charges(s);
    setShown(chargeBox, have > 0);
    if (have > 0) {
      const placed = ecl.planned(e);
      setText(chargeNote, `${placed} of ${have} placed. A charge makes an upgrade you own stronger. Charges can be moved freely and take effect at the next Eclipse.${ecl.chargesPending(e) ? ' Changes are waiting for an Eclipse.' : ''}`);
      for (const r of chargeRows) {
        const owned = !!e.up[r.u.id];
        setShown(r.el, owned);
        if (!owned) continue;
        if (r.box.checked !== !!e.plan[r.u.id]) r.box.checked = !!e.plan[r.u.id];
        setDisabled(r.box, !e.plan[r.u.id] && placed >= have);
        setText(r.now, e.charge[r.u.id] ? 'Charged now.' : '');
      }
    }
    const apertureOpen = ecl.apertureOpen(s);
    setShown(apertureGroup, apertureOpen);
    if (apertureOpen) {
      const cost = ecl.apertureCost(e);
      setText(apertureText, `Telescopes ${obsBAL.apertureMult}× faster for each level. Level ${e.aperture}.`);
      setText(aperturePrice, `${whole(cost)} corona`);
      setClass(apertureCard, 'can', e.corona.gte(cost));
      setClass(apertureCard, 'cant', e.corona.lt(cost));
    }
    const expCost = ecl.expansionCost(e);
    setText(expNote, 'New content for one world. Each expansion bought makes the others cost more.');
    for (const k of expCards) {
      const owned = !!e.exp[k.x.world];
      const can = !owned && e.corona.gte(expCost);
      setText(k.price, owned ? 'Bought' : `${whole(expCost)} corona`);
      setShown(k.progress, owned);
      if (owned) setText(k.progress, `Reached ${e.depth[k.x.world]} of ${k.x.most} this Eclipse.`);
      setClass(k.el, 'owned', owned);
      setClass(k.el, 'can', can);
      setClass(k.el, 'cant', !owned && !can);
    }
    for (const t of tiers) {
      const open = ecl.tierOpen(e, t.cost);
      setShown(t.el, open);
      if (!open) continue;
      for (const k of t.cards) {
        const owned = !!e.up[k.u.id];
        const can = !owned && e.corona.gte(k.u.cost);
        setText(k.price, owned ? 'Bought' : `${k.u.cost} corona`);
        setClass(k.el, 'owned', owned);
        setClass(k.el, 'can', can);
        setClass(k.el, 'cant', !owned && !can);
      }
    }
  }

  return { el, update, key() {} };
}
