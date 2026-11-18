// Small helpers the world scenes share. Each scene is one inline SVG drawn
// once; after that only attributes, classes and visibility change, and only
// when the value has actually changed.
import { h, setText, setShown, setDisabled } from './dom.js';

export const REDUCED = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const f0 = (n) => n.toFixed(0);

/** Each world's colour, the one on its tab. */
export const WORLD_COLOUR = { cinder: '#ff8a2a', tidewater: '#5fa8cf', grove: '#8fcf7a', clockwork: '#d9b45a', hollow: '#b28cf0', stormfront: '#a9d8ff' };

/** setAttribute, but only when the value changed. */
export function attr(el, name, v) {
  const k = '__a_' + name;
  if (el[k] !== v) { el.setAttribute(name, v); el[k] = v; }
}

/** Show or hide an SVG element (the `hidden` property doesn't work on SVG). */
export function showSvg(el, on) {
  if (el.__on !== !!on) { el.toggleAttribute('hidden', !on); el.__on = !!on; }
}

/** Powers of ten in a Decimal, never below 0. */
export const dec = (x) => (x.gt(0) ? Math.max(0, x.log10().toNumber()) : 0);

/** A small seeded random, so a scene looks the same every time it is drawn. */
export function rng(seed) {
  return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
}

/** Builds the SVG once from a string, inside a div with the given class. */
export function makeScene(cls, svg) {
  const el = h('div', { class: cls });
  el.innerHTML = svg;
  return { el, q: (s) => el.querySelector(s), qa: (s) => [...el.querySelectorAll(s)] };
}

/**
 * The world's main control, sitting in the scene. Monospace and a fixed width
 * so it never moves when its text changes. `hotkey` hangs off its right.
 */
export function mainBar(prefix, onClick, hotkey = 'B') {
  const btn = h('button', { class: 'act primary', onclick: onClick });
  const key = h('kbd', {}, hotkey);
  const el = h('div', { class: prefix + '-bar' }, h('div', { class: 'row' }, btn, key));
  return {
    el,
    set({ shown = true, label, enabled = true, hotkey: showKey = true }) {
      setShown(el, shown);
      if (!shown) return;
      setText(btn, label);
      setDisabled(btn, !enabled);
      setShown(key, showKey);
    },
  };
}
