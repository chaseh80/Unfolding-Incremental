// Pieces of the page that more than one world uses.
import { h, setText, setShown, setClass, setDisabled } from './dom.js';
import { formatInt } from '../core/num.js';

/**
 * A grid of one-off upgrades. They come into view a few at a time and never
 * go back out, even when a reset takes the upgrades themselves away.
 *
 * owned(id), have(), buy(id): how to ask about and buy an upgrade
 * unit: what the cost is counted in, for the label
 * seen(): an object to remember how many cards have been shown
 */
export function upgradeGrid(list, { owned, have, buy, unit, seen, shownKey, visible = () => true, ahead = 3 }) {
  const cards = list.map((u) => {
    const cost = h('span', { class: 'cost' });
    const el = h('button', { class: 'upgrade', onclick: () => buy(u.id) },
      h('span', { class: 'name' }, u.name), h('span', { class: 'text' }, u.text), cost);
    return { u, el, cost };
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
        const can = !has && have().gte(k.u.cost);
        setShown(k.el, i < shown && visible(k.u));
        setClass(k.el, 'owned', has);
        setClass(k.el, 'can', can);
        setClass(k.el, 'cant', !has && !can);
        setText(k.cost, has ? 'Yours' : `Costs ${formatInt(k.u.cost)} ${unit}`);
      });
    },
  };
}

/** One row for something you buy over and over. */
export function feedRow({ name, buyLabel, autoText, onBuy, onMax }) {
  const count = h('span', { class: 'count' });
  const desc = h('p', { class: 'desc' });
  const buy = h('button', { class: 'act', onclick: onBuy });
  const max = h('button', { class: 'act small', title: 'Buy as many as you can afford', onclick: onMax }, 'Max');
  const auto = h('p', { class: 'auto' }, autoText);
  const el = h('div', { class: 'box feed' },
    h('div', { class: 'feed-main' }, h('h3', {}, name, count), desc),
    h('div', { class: 'feed-buy' }, buy, max, auto));
  return {
    el,
    /** shown, owned, text, free, costText, affordable */
    set(v) {
      setShown(el, v.shown);
      if (!v.shown) return;
      setText(count, v.owned > 0 ? `${v.owned.toLocaleString('en-US')} so far` : '');
      setText(desc, v.text);
      setShown(buy, !v.free);
      setShown(max, !v.free);
      setShown(auto, v.free);
      if (!v.free) {
        setText(buy, `${buyLabel} for ${v.costText}`);
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
