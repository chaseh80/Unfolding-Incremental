// Pieces of the page that more than one world uses.
import { h, setText, setShown, setClass, setDisabled } from './dom.js';
import { format, formatDown, formatInt } from '../core/num.js';

export function setWidth(el, frac) {
  const w = (Math.max(0, Math.min(1, frac || 0)) * 100).toFixed(1) + '%';
  if (el.__w !== w) { el.style.width = w; el.__w = w; }
}

/** The box a world shows before it has been started. */
export function startBox(text, label, onClick) {
  return h('div', { class: 'box center' },
    h('p', {}, text),
    h('p', {}, h('button', { class: 'act big primary', onclick: onClick }, label)));
}

/**
 * A grid of one-off upgrades. They come into view a few at a time and never
 * go back out, even when a reset takes the upgrades themselves away.
 *
 * owned(id), have(), buy(id): how to ask about and buy an upgrade
 * unit: what the cost is counted in
 * seen(): an object to remember how many cards have been shown
 * note(u): an optional extra line, such as something the upgrade needs
 * blocked(u): true when the upgrade can't be bought whatever you can afford
 */
export function upgradeGrid(list, { owned, have, buy, unit, seen, shownKey, visible = () => true, ahead = 3, note = null, blocked = () => false }) {
  const cards = list.map((u) => {
    const cost = h('span', { class: 'cost' });
    const need = h('span', { class: 'need' });
    const el = h('button', { class: 'upgrade', onclick: () => buy(u.id) },
      h('span', { class: 'name' }, u.name), h('span', { class: 'text' }, u.text), need, cost);
    return { u, el, cost, need };
  });
  return {
    el: h('div', { class: 'grid' }, cards.map((k) => k.el)),
    update() {
      const store = seen();
      const ownedCount = list.filter((u) => owned(u.id)).length;
      const shown = Math.max(store[shownKey] || 0, Math.min(list.length, ownedCount + ahead));
      store[shownKey] = shown;
      cards.forEach((k, i) => {
        const has = owned(k.u.id);
        const stuck = !has && blocked(k.u);
        const can = !has && !stuck && have().gte(k.u.cost);
        setShown(k.el, i < shown && visible(k.u));
        setClass(k.el, 'owned', has);
        setClass(k.el, 'can', can);
        setClass(k.el, 'cant', !has && !can);
        const extra = !has && note ? note(k.u) : '';
        setShown(k.need, !!extra);
        setText(k.need, extra);
        setClass(k.need, 'unmet', stuck);
        setText(k.cost, has ? 'Bought' : `${formatInt(k.u.cost)} ${unit}`);
      });
    },
  };
}

/** One row for something you buy over and over. */
export function feedRow({ name, onBuy, onMax }) {
  const count = h('span', { class: 'count' });
  const desc = h('p', { class: 'desc' });
  const buy = h('button', { class: 'act', onclick: onBuy });
  const max = h('button', { class: 'act small', onclick: onMax }, 'Max');
  const auto = h('p', { class: 'auto' }, 'Automatic');
  const el = h('div', { class: 'box feed' },
    h('div', { class: 'feed-main' }, h('h3', {}, name, count), desc),
    h('div', { class: 'feed-buy' }, buy, max, auto));
  return {
    el,
    /** shown, count (text), text, free, cost (text), affordable; buyable false for rows with nothing to buy */
    set(v) {
      setShown(el, v.shown);
      if (!v.shown) return;
      setText(count, v.count || '');
      setText(desc, v.text);
      const buyable = v.buyable !== false;
      setShown(buy, buyable && !v.free);
      setShown(max, buyable && !v.free);
      setShown(auto, buyable && v.free);
      if (buyable && !v.free) {
        setText(buy, `Buy for ${v.cost}`);
        setDisabled(buy, !v.affordable);
        setDisabled(max, !v.affordable);
      }
    },
  };
}

/** A row of sub-tabs with panels under it. Tabs appear as they open up. */
export function subTabs(tabs, { current, choose, visited }) {
  for (const tab of tabs) {
    tab.btn = h('button', { onclick: () => { choose(tab.id); visited()['tab_' + tab.id] = true; } }, tab.label);
  }
  const nav = h('nav', { class: 'subtabs' }, tabs.map((t) => t.btn));
  return {
    nav,
    panels: tabs.map((t) => t.panel),
    /** Shows the right panel and returns the tab that is open. */
    update(isOpen) {
      const active = tabs.find((t) => t.id === current() && isOpen(t)) || tabs[0];
      setShown(nav, tabs.filter(isOpen).length > 1);
      for (const tab of tabs) {
        const open = isOpen(tab);
        setShown(tab.btn, open);
        setClass(tab.btn, 'on', tab === active);
        setClass(tab.btn, 'fresh', open && tab !== active && tab !== tabs[0] && !visited()['tab_' + tab.id]);
        setShown(tab.panel, tab === active);
      }
      return active;
    },
  };
}

/**
 * A list of milestones that are passed in order: ignition points, strandlines,
 * stands, chimes. Ones you have seen before show their name and effect; the
 * next one shows only its threshold.
 */
export function pointList(list, label) {
  const rows = list.map((p) => {
    const name = h('b');
    const text = h('p');
    const li = h('li', {}, h('div', { class: 'deg' }, label(p)), h('div', { class: 'what' }, name, text));
    return { p, li, name, text };
  });
  return {
    el: h('ul', { class: 'points wide' }, rows.map((r) => r.li)),
    /** known: how many you have ever passed. lit: how many count right now. */
    update(known, lit) {
      rows.forEach((r, i) => {
        setShown(r.li, i <= known);
        setClass(r.li, 'lit', i < lit);
        setClass(r.li, 'unknown', i >= known);
        setText(r.name, i < known ? r.p.name : '???');
        setText(r.text, i < known ? r.p.text : '');
      });
    },
  };
}

/** The box for a reset: a few lines saying what it does, and the button. */
export function resetBox({ title, accent = '', onClick, hotkey = '' }) {
  const lines = [h('p', { class: 'desc' }), h('p', { class: 'desc' }), h('p', { class: 'note' })];
  const btn = h('button', { class: 'act primary', onclick: onClick });
  const el = h('div', { class: 'box ' + accent }, h('h3', {}, title), lines,
    h('div', { class: 'row', style: 'margin-top: 10px' }, btn, hotkey ? h('kbd', {}, hotkey) : null));
  return {
    el,
    set({ shown = true, text = [], label, ready }) {
      setShown(el, shown);
      if (!shown) return;
      lines.forEach((line, i) => { setShown(line, !!text[i]); if (text[i]) setText(line, text[i]); });
      setText(btn, label);
      setDisabled(btn, !ready);
    },
  };
}

export function milestoneList(title, texts) {
  const rows = texts.map((t) => h('li', {}, t));
  return {
    el: h('div', { class: 'box' }, h('h3', {}, title), h('ul', { class: 'milestones' }, rows)),
    set(i, done) { setClass(rows[i], 'done', done); },
  };
}

/** A small table of what multiplies what. */
export function breakdown(title, labels, totalLabel) {
  const rows = labels.map((label) => {
    const value = h('td');
    return { value, tr: h('tr', {}, h('td', {}, label), value) };
  });
  const total = h('td');
  const el = h('div', { class: 'box' }, h('h3', {}, title),
    h('table', { class: 'breakdown' }, rows.map((r) => r.tr), h('tr', { class: 'total' }, h('td', {}, totalLabel), total)));
  return {
    el,
    /** values: one string per label, or null to hide that row */
    set(shown, values, totalText) {
      setShown(el, shown);
      if (!shown) return;
      rows.forEach((r, i) => { setShown(r.tr, values[i] !== null); if (values[i] !== null) setText(r.value, values[i]); });
      setText(total, totalText);
    },
  };
}

export function shineNotice(name) {
  const text = h('p', {});
  const el = h('div', { class: 'notice' }, h('h3', {}, `${name} is shining`), text);
  return {
    el,
    set(shine, pending) {
      setShown(el, shine > 0);
      if (shine > 0) setText(text, `${format(shine, 2)} starlight per minute. ${formatDown(pending)} gathered since the last fold. Fold in the Atlas.`);
    },
  };
}

/** A labelled slider. */
export function dial({ min, max, step = 1, onInput }) {
  const label = h('label', {});
  const input = h('input', { type: 'range', min: String(min), max: String(max), step: String(step), oninput: () => onInput(Number(input.value)) });
  return {
    el: h('div', { class: 'dial' }, label, input),
    set({ shown = true, value, text, disabled = false }) {
      setShown(label.parentNode, shown);
      if (!shown) return;
      setDisabled(input, disabled);
      if (document.activeElement !== input && Number(input.value) !== value) input.value = String(value);
      setText(label, text);
    },
  };
}
