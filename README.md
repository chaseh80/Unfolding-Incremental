# Manifold

An unfolding incremental game about an atlas of small worlds. Each world runs on its own rule, and the map opens up one fold at a time.

Three worlds are playable so far:

- **Cinder** is one fire. Heat grows on its own, and passing certain temperatures changes the rules. It resets for Ash and then for Glass.
- **Tidewater** is a tidal shore. Pools fill while the tide is in and dry to salt while it is out, and you only get salt for whichever half did less. It resets for Driftwood.
- **Grove** is a forest that fills whatever room the ground gives it. Nothing is bought there: the trees make sap, and you decide how much goes to roots, to canopy and to seed. It resets for Seeds and then for Loam.

A world that has been pushed far enough starts to shine. Folding its page in the **Atlas** gathers the starlight and starts that one world over; starlight buys new pages, automation, and routes that let one world help another.

Getting from a cold hearth to the end of what exists takes about fourteen hours of attentive play, or closer to twenty if you look in every few minutes.

## Playing it

The game is plain HTML, CSS and JavaScript with no build step. Browsers won't load JavaScript modules straight off the disk, so it needs to be served:

```bash
python -m http.server 8321
```

Then open http://localhost:8321.

## How the code is laid out

- `src/game.js`, `src/atlas.js` and `src/worlds/` hold the whole game with no page attached. Every tunable number for a world sits in one `BAL` block at the top of its file.
- `src/ui/` draws the page and handles saving. `parts.js` has the pieces more than one world uses.
- `src/core/` has the shared machinery: big numbers, cost curves, saves.
- `vendor/break_eternity.esm.js` is [break_eternity.js](https://github.com/Patashu/break_eternity.js) 2.2.1 (MIT), for numbers past 1e308.
- `sim/` is the balancing toolkit, described below.

## Balancing

Because the game logic doesn't touch the page, Node can play it far faster than real time. A stand-in player (`sim/bot.js`) buys what it can afford, sets the dials and sliders, resets when it's worth it, folds pages and shops in the Atlas.

```bash
node sim/run.js
```

prints a timeline of the whole game for an attentive player. Add `--every 300` for someone who only looks in every five minutes, `--quiet` for just the summary, or `--tidewater` or `--grove` to play one world on its own as if freshly unfolded.

```bash
node sim/calibrate.js grove
```

works out what each upgrade should cost, and where each milestone should sit, so the stand-in player reaches it at a chosen minute. `cinder` and `tidewater` do the same for those worlds. Set the target times in that file, run it, and copy the numbers it prints into the world file. It takes several minutes for a world with a long run.

```bash
node sim/breakdown.js 20 60 120
```

shows where Cinder's heat is coming from at those minutes, as powers of ten. It's the quickest way to see which effect is doing too much.

```bash
node sim/snapshot.js 140
```

prints a save from 140 minutes into a simulated run, which you can paste into Options to look at later parts of the game. Add a world's name, as in `node sim/snapshot.js 20 grove`, for a save with just that world unfolded.

Adding `?speed=20` to the address runs the clock twenty times faster, for testing.

### Things learned while tuning

- Repeatable growth needs cost curves that bend upward. With plain exponential costs, the moment purchases became automatic and free a whole world finished in under a minute. Bend them too hard and the world hits a wall no upgrade can move; Grove's first curve did exactly that.
- Anything you reset for needs a bonus that grows with time since the reset (embers, clearing glass, kelp, a forest's age, settling loam). Without one, the best way to play is to reset every few seconds, which is exactly the clicking this game is trying to avoid.
- Starlight is gathered continuously while a world shines and only banked by folding. That makes folding a question of when you want to spend, with nothing gained by folding over and over.
- A bonus based on all starlight ever gathered is fine for the first world and ruinous for the third, because by then the total is in the thousands. Grove's version counts only the starlight Grove itself has given.
- Newer worlds have to shine brighter than older ones, or their pages aren't worth folding. Tidewater shines three times as brightly as Cinder for the same progress, and Grove a hundred times.
- Tune effects first, then calibrate costs to time targets. Doing it the other way round means chasing your tail.
- The time-target calibrator works for currencies that flow in smoothly. It doesn't work for the Atlas, where starlight arrives in lumps, so those costs are set by hand from the timeline.

### Current pacing

For a player acting every few seconds:

| Landmark | Time |
|---|---|
| First burn in Cinder | 7 min |
| First automation | 11 min |
| First smelt | 1h 03m |
| Cinder starts to shine, first fold | 2h 10m |
| Tidewater's first storm | 2h 26m |
| Tidewater starts to shine | 4h 05m |
| Grove is unfolded | 6h 19m |
| Grove's first seedfall | 6h 29m |
| Grove's first fire | 7h 36m |
| Grove starts to shine | 8h 48m |
| The fourth page (not drawn yet) | 14h 31m |

Looking in once a minute stretches the total to about 15 hours, every five minutes to about 18h 30m, and every fifteen minutes to about 20h 45m.

From about hour nine on, all three worlds are close to running themselves and there is roughly one thing to buy in the Atlas every half hour to an hour. That stretch is what the next world is meant to fill.
