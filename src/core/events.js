// A small queue the game logic drops notable moments into. The page reads it
// to show messages, and the simulator reads it to build a timeline.
const queue = [];
let quiet = 0;

export function emit(type, data = {}) {
  if (quiet > 0) return;
  queue.push({ type, ...data });
  if (queue.length > 500) queue.shift();
}

/** Run something without any of the moments it would report. */
export function silently(fn) {
  quiet += 1;
  try {
    return fn();
  } finally {
    quiet -= 1;
  }
}

export function drain() {
  return queue.splice(0);
}
