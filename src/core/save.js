// Turning the game state into text and back again.
//
// Loading never trusts the saved shape. It walks a fresh default state and
// copies over whatever the save has for each field, so adding a field later
// can't break an old save.
import { Decimal } from './num.js';

export const SAVE_VERSION = 1;

export function mergeSave(defaults, loaded) {
  if (defaults instanceof Decimal) {
    if (loaded === undefined || loaded === null) return defaults;
    try {
      const d = new Decimal(loaded);
      if (Number.isNaN(d.mag) || Number.isNaN(d.sign)) return defaults;
      return d;
    } catch {
      return defaults;
    }
  }
  if (Array.isArray(defaults)) {
    return Array.isArray(loaded) ? loaded.slice() : defaults.slice();
  }
  if (defaults && typeof defaults === 'object') {
    const keys = Object.keys(defaults);
    const src = loaded && typeof loaded === 'object' ? loaded : {};
    // An empty object in the defaults is an open-ended set, like owned upgrades.
    if (keys.length === 0) return { ...src };
    const out = {};
    for (const k of keys) out[k] = mergeSave(defaults[k], src[k]);
    return out;
  }
  if (loaded === undefined || loaded === null || typeof loaded !== typeof defaults) return defaults;
  if (typeof loaded === 'number' && !Number.isFinite(loaded)) return defaults;
  return loaded;
}

export function serialize(state) {
  return JSON.stringify(state);
}

export function toExportString(state) {
  return btoa(serialize(state));
}

export function fromExportString(text) {
  return JSON.parse(atob(text.trim()));
}
