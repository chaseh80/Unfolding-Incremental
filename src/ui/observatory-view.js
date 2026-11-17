// The Observatory tab: telescopes, the six constellations, and what the
// worlds pay for.
import { h, setText, setShown, setClass, setDisabled } from './dom.js';
import { format, formatDown, formatInt, formatTime } from '../core/num.js';
import * as obs from '../observatory.js';

const whole = (x) => formatInt(x);
const ORDINAL = ['First', 'Second', 'Third'];

export function buildObservatory(game) {
  const S = () => game.state;
  const O = () => game.state.observatory;

  const starCount = h('span');
  const doneNotice = h('div', { class: 'notice' },
    h('h3', {}, 'The sky is charted'),
    h('p', {}, 'Every constellation is finished. What that opens is not built yet.'));

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
    const marks = h('p', { class: 'stars' });
    const sight = h('p', { class: 'desc' });
    const seen = h('p', { class: 'note' });
    const next = h('p', { class: 'desc' });
    const chart = h('button', { class: 'act primary', onclick: () => obs.chart(S(), w.id) }, 'Chart the next star');
    const lens = h('button', { class: 'act', onclick: () => obs.buyLens(S(), w.id) });
    const lensNote = h('span', { class: 'muted' });
    const el = h('div', { class: 'box' }, h('h3', {}, `${w.sky} (${w.name})`, count), marks, sight, seen, next,
      h('div', { class: 'row', style: 'margin-top: 10px' }, chart, lens, lensNote));
    return { w, el, count, marks, sight, seen, next, chart, lens, lensNote };
  });

  const milestones = obs.MILESTONES.map((m) => {
    const li = h('li', {}, `${m.stars} ${m.stars === 1 ? 'star' : 'stars'}: ${m.text}`);
    return { m, li };
  });
  const milestoneBox = h('div', { class: 'box' }, h('h3', {}, 'Milestones'),
    h('p', { class: 'desc' }, 'By stars charted in all, whichever constellations they are in.'),
    h('ul', { class: 'milestones' }, milestones.map((k) => k.li)));

  const instruments = obs.INSTRUMENTS.map((u) => {
    const price = h('span', { class: 'cost' });
    const el = h('button', { class: 'upgrade', onclick: () => obs.buyInstrument(S(), u.id) },
      h('span', { class: 'name' }, u.name), h('span', { class: 'text' }, u.text), price);
    return { u, el, price };
  });
  const instrumentGroup = h('div', { class: 'group' }, h('h2', {}, 'Instruments'),
    h('p', { class: 'desc' }, 'Paid for by two worlds at once, out of what they hold right now.'),
    h('div', { class: 'grid' }, instruments.map((k) => k.el)));

  const el = h('section', { class: 'panel sky-accent' },
    h('div', { class: 'figure' }, starCount, h('small', {}, `of ${obs.MOST_STARS} stars charted`)),
    h('p', { class: 'lead' }, 'A telescope pointed at a world gathers sightings of it, faster the more starlight that world has gathered this Eclipse. Sightings chart stars. Nothing here is ever reset, and nothing here changes a world.'),
    doneNotice, scopeBox, milestoneBox, worlds.map((k) => k.el), instrumentGroup);

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
      setShown(k.li, done || ahead <= 2);
      setClass(k.li, 'done', done);
    }

    for (const k of worlds) {
      const id = k.w.id;
      const stars = o.stars[id];
      setText(k.count, ` ${stars} of ${obs.BAL.stars}`);
      setText(k.marks, '★'.repeat(stars) + '☆'.repeat(obs.BAL.stars - stars));
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
