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
  return state.stormfront.fulgUp.reach ? 5 : 4;
}
