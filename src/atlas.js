// The Atlas. Worlds that have been pushed far enough start to shine, and the
// starlight they give off is gathered by folding their page. Starlight is the
// one currency every world shares, and it's spent here.
import { D } from './core/num.js';
import { emit } from './core/events.js';

export const GROUPS = [
  { id: 'pages', name: 'Worlds', text: '' },
  { id: 'cinder', name: 'Cinder', text: '' },
  { id: 'tidewater', name: 'Tidewater', text: '' },
  { id: 'grove', name: 'Grove', text: '' },
  { id: 'clockwork', name: 'Clockwork', text: '' },
  { id: 'hollow', name: 'Hollow', text: '' },
  { id: 'stormfront', name: 'Stormfront', text: '' },
  { id: 'routes', name: 'Routes', text: 'Links between worlds.' },
];

export const NODES = [
  { id: 'tidewater', group: 'pages', cost: 1, name: 'Tidewater', text: "Unlocks the second world." },
  { id: 'grove', group: 'pages', cost: 3000, needs: 'tidewater', name: 'Grove', text: "Unlocks the third world." },
  { id: 'clockwork', group: 'pages', cost: 6e5, needs: 'grove', name: 'Clockwork', text: "Unlocks the fourth world." },
  { id: 'hollow', group: 'pages', cost: 1.5e9, needs: 'clockwork', name: 'Hollow', text: "Unlocks the fifth world." },
  { id: 'stormfront', group: 'pages', cost: 1.2e13, needs: 'hollow', name: 'Stormfront', text: "Unlocks the sixth world." },
  { id: 'archive', group: 'pages', cost: 3e18, needs: 'stormfront', name: 'Archive', text: "Unlocks the seventh world." },

  { id: 'c_hands', group: 'cinder', cost: 2, name: 'Hands that stay', text: "Keep banked coals, fire-tender, bellows-hand and flue-sweep when you fold Cinder." },
  { id: 'c_star', group: 'cinder', cost: 2, name: 'Starlit hearth', text: "Heat ×(total starlight + 1)." },
  { id: 'c_shed', group: 'cinder', cost: 5, name: 'Falling ash', text: "Gain 2% of your burn-down ash every second, from the start." },
  { id: 'c_keeper', group: 'cinder', cost: 12, name: 'Hearth-keeper', text: "Buys Ash and Glass upgrades automatically." },
  { id: 'c_glass', group: 'cinder', cost: 60, name: 'Standing glassworks', text: "Gain 1% of your smelt glass every second." },
  { id: 'c_bright', group: 'cinder', cost: 250, name: 'A brighter fire', text: "Cinder gives 3× starlight." },

  { id: 't_hands', group: 'tidewater', cost: 8, needs: 'tidewater', name: 'Shore hands', text: "Keep channel-cutter, pan-raker, pool-digger, moon-watcher and tide tables when you fold Tidewater." },
  { id: 't_star', group: 'tidewater', cost: 10, needs: 'tidewater', name: 'Starlit shore', text: "Salt ×(total starlight + 1)." },
  { id: 't_storm', group: 'tidewater', cost: 40, needs: 'tidewater', name: 'Rough weather', text: "Gain 2% of your storm driftwood every second." },
  { id: 't_keeper', group: 'tidewater', cost: 100, needs: 'tidewater', name: 'Beachcomber', text: "Buys Driftwood upgrades automatically." },
  { id: 't_bright', group: 'tidewater', cost: 500, needs: 'tidewater', name: 'A brighter shore', text: "Tidewater gives 3× starlight." },

  { id: 'g_hands', group: 'grove', cost: 5e4, needs: 'grove', name: 'Woodland hands', text: "Keep nursery, leaf mulch and forester when you fold Grove." },
  { id: 'g_star', group: 'grove', cost: 1e5, needs: 'grove', name: 'Starlit wood', text: "Sap ×(starlight gathered from Grove + 1)." },
  { id: 'g_seed', group: 'grove', cost: 1.5e5, needs: 'grove', name: 'Seed rain', text: "Gain 2% of your seedfall seeds every second." },
  { id: 'g_keeper', group: 'grove', cost: 2.5e5, needs: 'grove', name: 'Woodward', text: "Buys Seed and Loam upgrades automatically." },
  { id: 'g_bright', group: 'grove', cost: 3e5, needs: 'grove', name: 'A brighter wood', text: "Grove gives 3× starlight." },

  { id: 'k_hands', group: 'clockwork', cost: 5e6, needs: 'clockwork', name: 'Bench hands', text: "Keep apprentice and oil when you fold Clockwork." },
  { id: 'k_star', group: 'clockwork', cost: 1e7, needs: 'clockwork', name: 'Starlit works', text: "Ticks ×(starlight gathered from Clockwork + 1)." },
  { id: 'k_spring', group: 'clockwork', cost: 6e7, needs: 'clockwork', name: 'Self-winding', text: "Gain 2% of your rewind springs every second." },
  { id: 'k_bright', group: 'clockwork', cost: 1.5e8, needs: 'clockwork', name: 'A brighter works', text: "Clockwork gives 3× starlight." },

  { id: 'h_hands', group: 'hollow', cost: 5e9, needs: 'hollow', name: 'Cave hands', text: "Keep miner, polish and template when you fold Hollow." },
  { id: 'h_star', group: 'hollow', cost: 1e10, needs: 'hollow', name: 'Starlit cave', text: "Crystal ×(starlight gathered from Hollow + 1)." },
  { id: 'h_geode', group: 'hollow', cost: 4e11, needs: 'hollow', name: 'Rockfall', text: "Gain 2% of your collapse geodes every second." },
  { id: 'h_bright', group: 'hollow', cost: 1.2e12, needs: 'hollow', name: 'A brighter cave', text: "Hollow gives 3× starlight." },

  { id: 's_hands', group: 'stormfront', cost: 1e14, needs: 'stormfront', name: 'Storm hands', text: "Keep storm spotter and static when you fold Stormfront." },
  { id: 's_star', group: 'stormfront', cost: 3e15, needs: 'stormfront', name: 'Starlit storm', text: "Charge ×(starlight gathered from Stormfront + 1)." },
  { id: 's_fulg', group: 'stormfront', cost: 1e17, needs: 'stormfront', name: 'Sand rain', text: "Gain 2% of your pass fulgurite every second." },
  { id: 's_bright', group: 'stormfront', cost: 3e17, needs: 'stormfront', name: 'A brighter storm', text: "Stormfront gives 3× starlight." },

  { id: 'r_drift', group: 'routes', cost: 15, needs: 'tidewater', name: 'Driftwood for the fire', text: "Cinder's heat ×√(Tidewater's driftwood this fold)." },
  { id: 'r_sun', group: 'routes', cost: 20, needs: 'tidewater', name: 'Heat on the flats', text: "Tidewater's drying ×(Cinder's best temperature this fold / 1,000)²." },
  { id: 'r_ash', group: 'routes', cost: 3e4, needs: 'grove', name: 'Ash on the roots', text: "Grove's sap ×(Cinder's best temperature this fold / 1,000)." },
  { id: 'r_mist', group: 'routes', cost: 1e5, needs: 'grove', name: 'Sea mist', text: "Grove's sap ×(1 + powers of ten in Tidewater's best tide this fold)." },
  { id: 'r_timber', group: 'routes', cost: 2e5, needs: 'grove', name: 'Timber', text: "Cinder's heat and Tidewater's salt ×(1 + powers of ten in Grove's best size this fold)²." },
  { id: 'r_parts', group: 'routes', cost: 2e6, needs: 'clockwork', name: 'Parts', text: "Clockwork's ticks ×(Cinder's best temperature this fold / 1,000)." },
  { id: 'r_works', group: 'routes', cost: 3e7, needs: 'clockwork', name: 'Regulators', text: "Cinder's heat, Tidewater's salt and Grove's sap ×(1 + powers of ten in Clockwork's best ticks per second this fold)." },
  { id: 'r_crystal', group: 'routes', cost: 1.5e11, needs: 'hollow', name: 'Crystal sets', text: "Heat, salt, sap and ticks ×(1 + powers of ten in Hollow's best crystal this fold)." },
  { id: 'r_front', group: 'routes', cost: 1.5e16, needs: 'stormfront', name: 'Weather system', text: "Stormfront's charge ×4 for each other world shining this fold." },
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
