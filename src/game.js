// The whole game, with no page attached. Everything here runs the same way in
// the browser and in the simulator.
import { mergeSave, SAVE_VERSION } from './core/save.js';
import * as atlas from './atlas.js';
import * as eclipse from './eclipse.js';
import * as observatory from './observatory.js';
import * as cinder from './worlds/cinder.js';
import * as tidewater from './worlds/tidewater.js';
import * as grove from './worlds/grove.js';
import * as clockwork from './worlds/clockwork.js';
import * as hollow from './worlds/hollow.js';
import * as stormfront from './worlds/stormfront.js';
import { paceMult } from './worlds/links.js';

export function newState(now = Date.now()) {
  return {
    version: SAVE_VERSION,
    started: now,
    lastSeen: now,
    playtime: 0,
    options: {
      offline: true,
    },
    ui: {
      tab: 'cinder',
      cinderTab: 'fire',
      tidewaterTab: 'shore',
      groveTab: 'wood',
      clockworkTab: 'train',
      hollowTab: 'cave',
      stormfrontTab: 'storm',
      eclipseTab: 'eclipse',
      visited: {},
    },
    atlas: atlas.defaults(),
    eclipse: eclipse.defaults(),
    observatory: observatory.defaults(),
    cinder: cinder.defaults(),
    tidewater: tidewater.defaults(),
    grove: grove.defaults(),
    clockwork: clockwork.defaults(),
    hollow: hollow.defaults(),
    stormfront: stormfront.defaults(),
  };
}

export function loadState(raw, now = Date.now()) {
  const state = mergeSave(newState(now), raw);
  state.version = SAVE_VERSION;
  // Saves from before the Atlas existed may already have finished Cinder.
  if (state.cinder.done) state.atlas.seen = true;
  return state;
}

export function tick(state, dt) {
  if (!(dt > 0)) return;
  state.playtime += dt;
  // Eclipse boosts make single worlds run faster.
  cinder.tick(state, dt * paceMult(state, 'cinder'));
  tidewater.tick(state, dt * paceMult(state, 'tidewater'));
  grove.tick(state, dt * paceMult(state, 'grove'));
  clockwork.tick(state, dt * paceMult(state, 'clockwork'));
  hollow.tick(state, dt * paceMult(state, 'hollow'));
  stormfront.tick(state, dt * paceMult(state, 'stormfront'));
  eclipse.tick(state, dt);
  // The Observatory runs in real time whatever speed the worlds run at.
  observatory.tick(state, dt);
  if (state.cinder.done) state.atlas.seen = true;
}

/**
 * Catch up on time spent away. The time is cut into at most `maxSteps` slices
 * so a long absence costs about the same to work out as a short one.
 */
export function catchUp(state, seconds, maxSteps = 1000) {
  if (!(seconds > 0)) return;
  const steps = Math.max(1, Math.min(maxSteps, Math.ceil(seconds / 0.05)));
  const dt = seconds / steps;
  for (let i = 0; i < steps; i++) tick(state, dt);
}
