// Small helpers for building the page by hand. Elements are made once and
// then only touched when what they show has actually changed, so buttons
// don't flicker or lose their hover state while numbers tick over.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class') el.className = value;
    else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
    else if (key === 'hidden') el.hidden = !!value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child === undefined || child === null || child === false) continue;
    el.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return el;
}

export function setText(el, text) {
  if (el.__text !== text) {
    el.textContent = text;
    el.__text = text;
  }
}

export function setShown(el, shown) {
  const want = !!shown;
  if (el.__shown !== want) {
    el.hidden = !want;
    el.__shown = want;
  }
}

export function setClass(el, name, on) {
  const want = !!on;
  const key = '__class_' + name;
  if (el[key] !== want) {
    el.classList.toggle(name, want);
    el[key] = want;
  }
}

export function setDisabled(el, disabled) {
  const want = !!disabled;
  if (el.__disabled !== want) {
    el.disabled = want;
    el.__disabled = want;
  }
}

export function toast(title, body = '') {
  const root = document.getElementById('toasts');
  if (!root) return;
  while (root.children.length >= 4) root.firstChild.remove();
  const el = h('div', { class: 'toast' }, h('b', {}, title), body ? h('span', {}, body) : null);
  root.append(el);
  setTimeout(() => el.classList.add('out'), 7000);
  setTimeout(() => el.remove(), 7500);
}

export function confirmBox({ title, body, yes, no = 'Cancel', danger = false, onYes }) {
  const root = document.getElementById('modal-root');
  const close = () => back.remove();
  const yesBtn = h('button', { class: 'act ' + (danger ? 'danger' : 'primary'), onclick: () => { close(); onYes(); } }, yes);
  const back = h('div', { class: 'modal-back', onclick: (e) => { if (e.target === back) close(); } },
    h('div', { class: 'modal', role: 'dialog' },
      h('h3', {}, title),
      h('p', {}, body),
      h('div', { class: 'row' }, h('button', { class: 'act', onclick: close }, no), yesBtn)));
  root.append(back);
  yesBtn.focus();
}
