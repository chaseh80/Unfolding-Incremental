// Things one world does to another that both sides need to work out the same
// way. Kept apart from the world files so they don't have to import each other.

/** What the biggest strike Stormfront has landed on a world multiplies that world by. */
export function struckMult(state, world) {
  const sf = state.stormfront;
  const hit = sf.struck[world];
  if (!hit || hit.lte(0)) return 1;
  return Math.pow(1 + hit.add(1).log10().toNumber(), struckPower(state));
}

export function struckPower(state) {
  return (state.stormfront.fulgUp.reach ? 5 : 4) + (state.eclipse.struck || 0);
}

/** Everything from outside a world that multiplies its main resource. */
export function outsideMult(state, world) {
  let m = world === 'stormfront' ? 1 : struckMult(state, world);
  // Clockwork's moon phase complication pulls on the first two worlds.
  if (world === 'cinder' || world === 'tidewater') m *= state.clockwork.moonMult || 1;
  // A charged Old roads.
  return m * (state.eclipse.boost || 1);
}

// Eclipse works these out whenever a corona upgrade is bought and keeps them
// in its state, so the worlds don't need to know what the upgrades are.

/** What Eclipse multiplies all starlight by. */
export function lightMult(state) {
  return (state.eclipse.light || 1) * (state.grove.ringLight || 1) * (state.clockwork.orreryLight || 1) * (state.hollow.abyssLight || 1) * (state.stormfront.skyLight || 1);
}

/** How many times faster Eclipse and Nova make a world run. */
export function paceMult(state, world) {
  return (state.eclipse.pace[world] || 1) * ((state.nova && state.nova.pace) || 1);
}

/** What a charged Steady hands multiplies every passive reset gain by. */
export function passiveBoost(state) {
  return state.eclipse.passive || 1;
}
