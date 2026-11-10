// A small queue the game logic drops notable moments into. The page reads it
// to show messages, and the simulator reads it to build a timeline.
const queue = [];

export function emit(type, data = {}) {
  queue.push({ type, ...data });
  if (queue.length > 500) queue.shift();
}

export function drain() {
  return queue.splice(0);
}
