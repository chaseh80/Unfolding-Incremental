# Manifold

An unfolding incremental game about an atlas of small worlds. Each world runs on its own rule.

Four worlds are playable:

- **Cinder**: one fire. Heat grows on its own, and passing certain temperatures changes the rules. Resets for Ash, then Glass. The damper trades heat against ash and is never automated.
- **Tidewater**: a tidal shore. Pools fill while the tide is in and dry to salt while it is out; you get salt for whichever half did less. Resets for Driftwood. Tide length is never automated.
- **Grove**: a forest that fills its room. Nothing is bought; sliders split sap between roots, canopy and seed. Resets for Seeds, then Loam. The seed share is never automated.
- **Clockwork**: a gear train you arrange by hand. Each gear's worth depends on where it sits and what is next to it. Resets for Springs. New sockets and gears need progress in the older worlds. The arrangement is never automated.

A world that has been pushed far enough starts to shine. Folding it in the **Atlas** gathers its starlight and resets that one world. Starlight buys new worlds, automation, and routes between worlds.

Reaching the end of what exists takes about 22 hours of attentive play, or about 30 if you look in every few minutes.

## Playing it

Plain HTML, CSS and JavaScript, no build step. Browsers won't load JavaScript modules off the disk, so serve it:

```bash
python -m http.server 8321
```

Then open http://localhost:8321.

## Code layout

- `src/game.js`, `src/atlas.js`, `src/worlds/`: the whole game with no page attached. Each world's tunable numbers sit in one `BAL` block at the top of its file.
- `src/ui/`: the page and saving. `parts.js` has the pieces every world uses.
- `src/core/`: big numbers, cost curves, saves.
- `vendor/break_eternity.esm.js`: [break_eternity.js](https://github.com/Patashu/break_eternity.js) 2.2.1 (MIT), for numbers past 1e308.
- `sim/`: the balancing tools below.

## Writing text for the game

Short, plain, effect first. Names can have flavour; descriptions don't.

- Upgrades and milestones: the effect only. "Multiplies heat by 10." "Unlocks bellows."
- Stat lines: "Raked 7.18e27 ash since last smelt. Multiplies heat by 2.09e15."
- Labels and headings are literal: "Kindling 132", "Glass milestones".
- Confirm dialogs: what resets and what you get.

## Balancing

The game logic doesn't touch the page, so Node can play it far faster than real time. A stand-in player (`sim/bot.js`) buys what it can afford, sets dials and sliders, arranges gears, resets when it's worth it, folds worlds and shops in the Atlas. It leaves Cinder's damper alone, so a player who uses it well will be somewhat ahead of these numbers.

```bash
node sim/run.js
```

prints a timeline of the whole game. Options: `--every 300` (look in every five minutes), `--quiet` (summary only), `--hours 30`, and `--tidewater`, `--grove` or `--clockwork` to play one world on its own.

```bash
node sim/calibrate.js clockwork
```

works out upgrade costs and milestone thresholds so the stand-in player reaches each at a chosen minute. Also takes `cinder`, `tidewater` and `grove`. Set the targets in that file, run it, copy the numbers into the world file. It takes a few minutes.

```bash
node sim/breakdown.js 20 60 120
```

shows where Cinder's heat comes from at those minutes, as powers of ten.

```bash
node sim/snapshot.js 140 > sim/out/save.txt
```

writes a save from 140 minutes into a simulated run. Add a world's name (`node sim/snapshot.js 60 clockwork`) for that world alone. Paste it into Options, or open the game at `?devsave=sim/out/save.txt` to load it without touching your real save.

`?speed=20` runs the clock twenty times faster.

### Things learned while tuning

- Repeatable growth needs cost curves that bend upward. Plain exponential costs finish a world in a minute once purchases are automatic. Bend too hard and the world hits a wall no upgrade moves.
- When several upgrade ladders multiply each other, their growth exponents add. Clockwork's six gear ladders ran away until each one was made cheap but weak.
- Anything that raises a multiplier to a power is far stronger than it looks. Clockwork's idler started at "to the power 1.5" and had to come down to 1.2.
- Every reset needs a bonus that grows with time since the reset (embers, clearing glass, kelp, age, settling loam, wear-in). Otherwise the best play is to reset every few seconds.
- Starlight is gathered continuously while a world shines and only banked by folding, so there is nothing to gain from folding over and over.
- A bonus based on all starlight ever gathered is fine for the first world and ruinous for later ones. Later worlds count only their own starlight.
- Newer worlds have to shine brighter, or they aren't worth folding (Tidewater ×3, Grove ×100, Clockwork ×50,000 against Cinder).
- Tune effects first, then calibrate costs to time targets.
- The calibrator suits currencies that flow in smoothly. Atlas costs are set by hand from the timeline.

### Current pacing

For a player acting every few seconds:

| Landmark | Time |
|---|---|
| First burn in Cinder | 7 min |
| First automation | 11 min |
| First smelt | 1h 03m |
| Cinder shines, first fold | 2h 10m |
| Tidewater shines | 4h 05m |
| Grove unlocked | 6h 19m |
| Grove shines | 8h 48m |
| Clockwork unlocked | 14h 31m |
| Clockwork's first rewind | 14h 45m |
| Clockwork shines | 17h 25m |
| Hollow (not built) | 22h 26m |

Total to the end: about 23h looking in once a minute, 29h every five minutes, 32h every fifteen.
