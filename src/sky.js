// The sky above the Observatory: the tree Nova's stardust is spent on.
//
// Every node is plain data. `effect` is a record, never code: Nova adds the
// effects up into numbers on state (src/nova.js, refresh) and the worlds read
// those numbers. The page, the simulator and any balance script all read this
// one list.
//
// x and y are in the sky picture's own units (1600 wide, 700 tall), drawn
// bottom to top. `links` may name a root: the six constellations along the
// bottom are where the tree starts, and a node that touches one can always be
// bought.
//
// kind: travel (small, adds up), notable (changes one rule), keystone (a trade
// that changes how a run plays), edge (repeatable, never runs out).
//
// effect keys: pace (every world runs this many times faster), cheap (Atlas
// upgrades cost this many times less), scope (telescopes this many times
// faster), flag (a named rule, read where it applies).

export const ROOTS = ['cinder', 'tidewater', 'grove', 'clockwork', 'hollow', 'stormfront'];
export const ROOT_X = (i) => 1600 * (i + 0.5) / 6;
export const ROOT_Y = 670;
export const SKY_W = 1600;
export const SKY_H = 700;

export const NODES = [
  // The middle: every world.
  { id: 's1', x: 800, y: 600, kind: 'travel', links: ['root:grove', 'root:clockwork'], effect: { pace: 1.03 } },
  { id: 's2', x: 800, y: 530, kind: 'travel', links: ['s1'], effect: { pace: 1.03 } },
  { id: 's3', x: 800, y: 460, kind: 'travel', links: ['s2'], effect: { pace: 1.03 } },
  { id: 's4', x: 800, y: 390, kind: 'travel', links: ['s3'], effect: { pace: 1.03 } },
  { id: 'first', x: 800, y: 310, kind: 'notable', name: 'First light', links: ['s4'], effect: { flag: 'firstLight' },
    text: 'Every Nova starts with Totality bought.' },
  { id: 'further', x: 800, y: 215, kind: 'edge', name: 'Further out', links: ['first'], effect: { pace: 1.05 },
    text: 'Every world runs 1.05× faster. Can be taken again and again.' },

  // Left of the middle: the Atlas.
  { id: 'a1', x: 690, y: 480, kind: 'travel', links: ['s2'], effect: { cheap: 2 } },
  { id: 'a2', x: 610, y: 410, kind: 'travel', links: ['a1'], effect: { cheap: 2 } },
  { id: 'maps', x: 540, y: 330, kind: 'notable', name: 'Old maps', links: ['a2'], effect: { flag: 'oldMaps' },
    text: 'Every Nova starts with the Cartographer bought.' },

  // Right of the middle: the telescopes.
  { id: 't1', x: 910, y: 480, kind: 'travel', links: ['s2'], effect: { scope: 1.1 } },
  { id: 't2', x: 990, y: 410, kind: 'travel', links: ['t1'], effect: { scope: 1.1 } },
  { id: 't3', x: 1060, y: 340, kind: 'travel', links: ['t2'], effect: { scope: 1.1 } },
  { id: 't4', x: 1140, y: 270, kind: 'travel', links: ['t3'], effect: { scope: 1.1 } },
  { id: 'memory', x: 1240, y: 210, kind: 'notable', name: 'Star memory', links: ['t4'], effect: { flag: 'starMemory' },
    text: 'The first star of each constellation needs no sightings, only the world shining.' },
  { id: 'wide', x: 990, y: 255, kind: 'notable', name: 'Wide field', links: ['t3'], effect: { flag: 'wideField' },
    text: 'A world with no telescope on it still gathers sightings, a tenth as fast as with one.' },
  { id: 'fixed', x: 1110, y: 140, kind: 'keystone', name: 'Fixed stars', links: ['wide', 'memory'], effect: { flag: 'fixedStars' },
    text: 'Telescopes gather 10× as many sightings. A telescope that has been moved cannot be moved again for an hour.' },

  // Above single constellations: one rule for one world.
  { id: 'banked', x: ROOT_X(0), y: 570, kind: 'notable', name: 'Banked fire', links: ['root:cinder'], effect: { flag: 'bankedFire' },
    text: "Burning down keeps half of the embers' building time." },
  { id: 'rod', x: ROOT_X(5), y: 570, kind: 'notable', name: 'Lightning rod', links: ['root:stormfront'], effect: { flag: 'lightningRod' },
    text: 'Strikes at the ground also count for the mast.' },
];

export const NODE = Object.fromEntries(NODES.map((n) => [n.id, n]));

/** What a travel node does, written out, since travel nodes have no text of their own. */
export function nodeText(n) {
  if (n.text) return n.text;
  const e = n.effect;
  if (e.pace) return `Every world runs ${e.pace}× faster.`;
  if (e.cheap) return `Atlas upgrades cost ${e.cheap}× less.`;
  if (e.scope) return `Telescopes ${e.scope}× faster.`;
  return '';
}
