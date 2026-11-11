// The Atlas. Worlds that have been pushed far enough start to shine, and the
// starlight they give off is gathered by folding their page. Starlight is the
// one currency every world shares, and it's spent here.
import { D } from './core/num.js';
import { emit } from './core/events.js';

export const GROUPS = [
  { id: 'pages', name: 'Pages', text: 'Each page of the atlas is a world of its own.' },
  { id: 'cinder', name: 'Cinder', text: '' },
  { id: 'tidewater', name: 'Tidewater', text: '' },
  { id: 'grove', name: 'Grove', text: '' },
  { id: 'routes', name: 'Routes', text: 'Lines drawn between two pages, so that one world can help another.' },
];

export const NODES = [
  { id: 'tidewater', group: 'pages', cost: 1, name: 'Tidewater', text: 'Unfold the second page. A grey shore, and a sea that comes and goes.' },
  { id: 'grove', group: 'pages', cost: 3000, needs: 'tidewater', name: 'Grove', text: 'Unfold the third page. A clearing in the rain, and one seed.' },
  { id: 'clockwork', group: 'pages', cost: 6e5, needs: 'grove', name: 'Clockwork', text: 'Unfold the fourth page.' },

  { id: 'c_hands', group: 'cinder', cost: 2, name: 'Hands that stay', text: 'Your banked coals, fire-tender, bellows-hand and flue-sweep stay on when you fold Cinder.' },
  { id: 'c_star', group: 'cinder', cost: 2, name: 'Starlit hearth', text: "Cinder's heat is multiplied by all the starlight you have ever gathered, plus one." },
  { id: 'c_shed', group: 'cinder', cost: 5, name: 'Falling ash', text: "The fire sheds ash from the moment it's lit, so you never have to burn it down." },
  { id: 'c_keeper', group: 'cinder', cost: 12, name: 'Hearth-keeper', text: 'Ash and Glass upgrades are bought for you the moment you can afford them.' },
  { id: 'c_glass', group: 'cinder', cost: 60, name: 'Standing glassworks', text: 'Every second you gain 1% of the glass a smelt would give you, without smelting.' },
  { id: 'c_bright', group: 'cinder', cost: 250, name: 'A brighter fire', text: 'Cinder gives off three times as much starlight.' },

  { id: 't_hands', group: 'tidewater', cost: 8, needs: 'tidewater', name: 'Shore hands', text: 'Your channel-cutter, pan-raker, pool-digger, moon-watcher and tide tables stay on when you fold Tidewater.' },
  { id: 't_star', group: 'tidewater', cost: 10, needs: 'tidewater', name: 'Starlit shore', text: "Tidewater's salt is multiplied by all the starlight you have ever gathered, plus one." },
  { id: 't_storm', group: 'tidewater', cost: 40, needs: 'tidewater', name: 'Rough weather', text: 'Driftwood washes up on its own. Every second you gain 2% of what a storm would leave.' },
  { id: 't_keeper', group: 'tidewater', cost: 100, needs: 'tidewater', name: 'Beachcomber', text: 'Driftwood upgrades are bought for you the moment you can afford them.' },
  { id: 't_bright', group: 'tidewater', cost: 500, needs: 'tidewater', name: 'A brighter shore', text: 'Tidewater gives off three times as much starlight.' },

  { id: 'g_hands', group: 'grove', cost: 5e4, needs: 'grove', name: 'Woodland hands', text: 'Your nursery, leaf mulch and forester stay on when you fold Grove.' },
  { id: 'g_star', group: 'grove', cost: 1e5, needs: 'grove', name: 'Starlit wood', text: "Grove's sap is multiplied by all the starlight Grove itself has ever given you, plus one." },
  { id: 'g_seed', group: 'grove', cost: 1.5e5, needs: 'grove', name: 'Seed rain', text: 'Seed falls without the forest having to. Every second you gain 2% of what letting it fall would give you.' },
  { id: 'g_keeper', group: 'grove', cost: 2.5e5, needs: 'grove', name: 'Woodward', text: 'Seed and Loam upgrades are bought for you the moment you can afford them.' },
  { id: 'g_bright', group: 'grove', cost: 3e5, needs: 'grove', name: 'A brighter wood', text: 'Grove gives off three times as much starlight.' },

  { id: 'r_drift', group: 'routes', cost: 15, needs: 'tidewater', name: 'Driftwood for the fire', text: "Driftwood burns well. Cinder's heat is multiplied by the square root of all the driftwood Tidewater has washed up this fold." },
  { id: 'r_sun', group: 'routes', cost: 20, needs: 'tidewater', name: 'Heat on the flats', text: "A hot fire dries the shore. Tidewater's drying is multiplied by the hottest Cinder has burned this fold, counted in thousands of degrees and squared." },
  { id: 'r_ash', group: 'routes', cost: 3e4, needs: 'grove', name: 'Ash on the roots', text: "Wood ash feeds the ground. Grove's sap is multiplied by the hottest Cinder has burned this fold, counted in thousands of degrees." },
  { id: 'r_mist', group: 'routes', cost: 1e5, needs: 'grove', name: 'Sea mist', text: "Mist off the shore keeps the wood damp. Grove's sap grows with every power of ten in Tidewater's best tide this fold." },
  { id: 'r_timber', group: 'routes', cost: 2e5, needs: 'grove', name: 'Timber', text: "The wood has timber to spare. Cinder's heat and Tidewater's salt both grow with every power of ten in the size Grove has reached this fold." },
];
const BY_ID = Object.fromEntries(NODES.map((n) => [n.id, n]));

export function defaults() {
  return {
    starlight: D(0),
    total: D(0), // all starlight ever gathered
    nodes: {},
    seen: false, // the Atlas tab stays once it has appeared
  };
}

export function has(state, id) {
  return !!state.atlas.nodes[id];
}

export function available(state, node) {
  return !node.needs || has(state, node.needs);
}

export function buy(state, id) {
  const node = BY_ID[id];
  const a = state.atlas;
  if (!node || a.nodes[id] || !available(state, node) || a.starlight.lt(node.cost)) return false;
  a.starlight = a.starlight.sub(node.cost);
  a.nodes[id] = true;
  emit('atlas', { id, name: node.name });
  return true;
}

/** Bank a world's gathered starlight. The world module does its own resetting. */
export function gather(state, amount) {
  const whole = D(amount).floor();
  state.atlas.starlight = state.atlas.starlight.add(whole);
  state.atlas.total = state.atlas.total.add(whole);
  state.atlas.seen = true;
  return whole;
}
