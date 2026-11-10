// Shows where the fire's heat is coming from at intervals through a run, as
// powers of ten. Handy for seeing which effect is doing too much.
import * as cinder from '../src/worlds/cinder.js';
import { newState, tick } from '../src/game.js';
import { simulate } from './bot.js';

const minutes = process.argv.slice(2).map(Number);
const lg = (x) => (typeof x === 'number' ? Math.log10(x) : x.log10().toNumber()).toFixed(1).padStart(5);
for (const m of minutes) {
  const { state } = simulate({ every: 3, hours: m / 60 });
  const c = state.cinder;
  const d = cinder.calc(state);
  console.log(
    `${String(m).padStart(4)}m  ${Math.floor(d.temp)}°C peak ${Math.floor(c.peakTemp)}  rate ${lg(d.rate)} = kindling ${lg(d.base)} (${c.feeds.kindling}) + bellows ${lg(d.bellowsMult)} (${c.feeds.bellows} x${d.bellowsBoost.toFixed(2)}, flue ${c.feeds.flue}) + ignition ${lg(d.ignitionMult)} + ashbed ${lg(d.ashBed)} + embers ${lg(d.embers)} + glass ${lg(d.glassHeat)} + self ${lg(d.selfFeed)} | ash ${lg(c.totalAsh)} glass ${lg(c.totalGlass.add(1))} burn ${Math.floor(c.burnTime)}s`
  );
}
