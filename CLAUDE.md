# Manifold: handover for whoever works on this next

Manifold is a text-based "unfolding" incremental game in plain HTML, CSS and JavaScript. Chase is the designer-in-chief and plays it between sessions; you are the game designer and programmer, and you are expected to fill design gaps yourself and say what you chose.

Read `README.md` first. It describes every world and layer as built, the simulator tools, the lessons learned while tuning, and the current pacing table. This file covers what the README does not: how Chase wants the work done, the rules a design must pass, the traps, and what is open.

## What comes next, in order

1. **The look, the layout and the words.** Chase has not played the game; he is waiting until it looks and reads right. Follow `UI-PLAN.md`. This comes before everything else.
2. Chase plays through and gives feedback.
3. Open balance items under "Where things stand".
4. The next reset layer, under "Plan for the next layer".

## What the game is

- Six worlds (Cinder, Tidewater, Grove, Clockwork, Hollow, Stormfront), each with its own mechanic that is not "buy the thing that makes the thing", its own resets, and one control no upgrade ever automates.
- **Atlas**: a world that shines gathers starlight; folding it banks the starlight and resets that world only. Starlight buys worlds, automation and routes between worlds.
- **Eclipse**: resets everything below for corona. Corona = floor((1 + P/8)^3), P = powers of ten of that run's starlight past 3e18. Buys general upgrades (1, 2, 5, 12 corona), five upgrades per world, six expansions (new content per world), and Aperture (repeatable).
- **Observatory**: opens with the first expansion, runs in real time, never resets. Telescopes pointed by hand gather sightings; sightings plus a record in the world chart stars (six constellations of eight). Star milestones give charges, which make corona upgrades stronger from the next Eclipse.
- **Not built**: the next big reset layer above Eclipse (skill tree, more worlds). The plan for it is at the end of this file once agreed.

## Chase's rules (a design must pass all of these)

1. World-based, one meta currency tying worlds together, lots of tabs by the end, a month or more to finish.
2. Not combat. Not generator chains (no Antimatter Dimensions style dimensions). No Cookie Clicker buildings.
3. No meaningless clicking (pressing one button a hundred times). Thoughtful clicking across menus and systems is fine, including rebuilding after a reset.
4. Never fully automated: current content always keeps some manual input that is a decision.
5. Newer content should give reasons to go back to older worlds.
6. Length comes from big reset layers in the FE000000 manner (first pass slow, repeats faster but not 100× faster), not from piling on worlds.
7. A big reset replays the game in the same world order with meta boosts. Changing the order belongs to a higher layer, if anywhere.
8. Nothing multiplies a reset currency directly. It depends only on how far the run got; upgrades raise it by letting the game go further.
9. Do not remove a way of playing to fix balance. Fix the numbers.
10. Per world: at most one plain speed upgrade; the rest must use that world's mechanics.
11. No challenge runs (old content replayed under odd rules). Chase finds them derivative.
12. No layer may die: every reset currency keeps a sink that never runs out, and no layer may end on a pure wait.
13. Charged or "super" versions of upgrades are direct power creep of that upgrade, not automation. Unequal choices are fine.
14. Themes should be physical and striking (Observatory, not a writing desk).
17. Looks matter now. Each world's page should be themed to that world (its own colours, layout and upgrade shapes) and look designed by a UX artist. Identical rounded boxes on every tab is the thing to get away from.
18. Game text must not sound like an AI assistant: no cheer, no enthusiasm, no padding.
15. Chase likes paradigm shifts: moments that shock the player and still make sense.
16. Big price jumps are normal in this genre and are not a problem by themselves.

Inspirations: Synergism, MrRedShark's games, FE000000, Antimatter Dimensions, Algebraic Progression. Take the ideas behind them, not the mechanics. What keeps a player engaged in those: several short goals in different currencies at once, limited slots with many effects, side activities that are automated away just as they turn into chores, and something affordable soon at all times.

## Text in the game

Short, plain, effect first. Names may carry flavour; descriptions never do. No cryptic fragments. Example: "Every world runs 4× faster." not "Time bends beneath the shadow."

## How Chase wants the work done

- He commits and pushes himself. Never commit. Much of the tree is uncommitted at any time.
- Build one slice at a time, then check it in the browser yourself and say what you saw. Do not ask him to test.
- Report measured numbers for **both** stand-in players (attentive, and AFK looking in every half hour). Say plainly when something was not measured.
- Measure a repeated reset by time to each purchase, never by number of resets.
- Do not replay settled early game to test late content. Use the checkpoints and the tools in `sim/`.
- When a decision is his (anything touching the rules above, or the feel of a layer), stop and ask with a recommendation. Otherwise decide, build, and tell him.
- He is short on usage. Prefer one good pass over many small ones, and do not start long simulations without a reason.
- Update `README.md` (description, lessons, pacing table) with every slice.

## Code conventions

- No build step. ES modules served by `python -m http.server 8321`. Big numbers are break_eternity `Decimal` via `D()` in `src/core/num.js`.
- All game logic is free of the DOM: `src/game.js`, `src/atlas.js`, `src/eclipse.js`, `src/observatory.js`, `src/worlds/*.js`. The simulator runs the same code.
- A world module exports `BAL` (every tunable number), `defaults()`, `calc(state)`, its actions, `fold(state)` and `tick(state, dt)`. Worlds are ticked with `dt × paceMult`; the Observatory with real `dt`.
- Things one layer does to another go through `src/worlds/links.js` as numbers stored on state (`eclipse.pace`, `light`, `discount`, `boost`, `passive`, `struck`, `gather`; `grove.ringLight` and the like). Worlds never import each other or Eclipse.
- `eclipse.refresh(state)` recomputes those numbers; call it after anything that changes upgrades or charges.
- Saves: `mergeSave(defaults, loaded)` walks the defaults, so adding a field to `defaults()` is safe for old saves. An empty object in defaults is an open-ended set. Arrays are copied whole.
- Pages are built once in `src/ui/*-view.js` with `h()` and updated with `setText`, `setShown`, `setClass`, `setDisabled`. Each view returns `{ el, update, key }` and is listed in `src/ui/app.js`.
- Events: logic calls `emit(type, data)`; the page and the simulator `drain()` them.
- Bump the version label in `src/ui/app.js` with each slice (now v0.13).

## Testing in the browser

- The preview config is in the **outer** folder's `.claude/launch.json` (name `manifold`, port 8321, serving this folder).
- `?devsave=sim/out/save10.txt` loads a test save without touching the real one; `?speed=30` runs faster. Make a test save from a simulator state with `toExportString(state)`.
- The browser caches modules hard. After editing, `fetch(file, { cache: 'reload' })` for each changed file, then navigate again.
- Click things with JavaScript (`element.click()`), not coordinates.

## Simulating

- `sim/bot.js` is the stand-in player: `simulate({ every, hours, until, from, sample })`. `every: 3` is attentive, `every: 1800` is AFK.
- `sim/checkpoint.js [--afk]` builds the late checkpoint (start of a run just after the reef). `sim/sequence.js` plays on to the last expansion. `sim/expansion.js` tests one expansion. `sim/away.js` looks at the AFK player's early Eclipse phase.
- `sim/trace.js [--afk]` records how far worlds get; `sim/stargaze.js` replays the Observatory against that record in seconds. The replay is a guide; the recording's own star count is the truth.
- Simulator cost follows world speed. With charges a recording takes half an hour or more. Run long ones in the background, two at most.
- Write patch scripts that assert each replaced string occurs exactly once.
- The stand-in must play sensibly or numbers get tuned for a bad player. Most balance surprises so far were the stand-in's habits, not the game.

## Balance traps met so far

- A multiplier on all starlight is far stronger than it reads: Cinder and Tidewater multiply themselves by total starlight. It has run away three times.
- Speed boosts multiply each other. Keep each small.
- When every purchase multiplies a rate, costs must grow faster than all of them together, or the layer is gated by something else and the rate stops mattering.
- A reset currency that is a root of something exponential grows exponentially with waiting. Count powers of ten instead.
- Anything fed by other worlds has to be tuned inside the whole game from a checkpoint, not alone.

## Where things stand

- Attentive player: first Eclipse about 35 h, last expansion about 2d 16h, all 48 stars about 3d 9h.
- AFK player: first Eclipse 3d, last expansion about 9d, 33 of 48 stars a day later. **Not measured to the end.** Its runs (up to 90 minutes) stop short of the sixth to eighth stars' records, which were set from the attentive player. Either record a longer run to see whether an overnight run finishes it, or lower those records.
- The AFK player's early Eclipse phase (3d 10h between the first Eclipse and the Star forge) is slow because of hand actions inside worlds. Chase has not decided whether to automate any of them.
- The tail after the last expansion is about 17 h for the attentive player. Chase has not said whether that is the right length.
- Charge presets were proposed and not built.
- Total length is far short of a month. The next reset layer is where the length is meant to come from.

## Plan for the next layer

Agreed with Chase on 2026-11-15. Names are placeholders. Nothing of it is built.

### The reset (working name: Nova)

- Modelled on FE000000's big resets: it wipes everything below and you start over, with only what Nova gives to get back faster. Chase: "wiping everything and starting over but keeping Nova open with it giving the boost to get back faster is exactly how it should work."
- Wiped: every world, the Atlas, corona and all it bought, expansions, Aperture, sightings, stars, charges.
- Kept: the tree, its points, and whatever the tree grants.
- Opens at 30 stars charted, not 48. Stars past 30 are worth more on the way out, so leaving early or staying is a choice (my proposal; Chase did not object).
- Its currency depends only on how far the run got (stars charted and depth). Nothing multiplies it. It adds up over Novas.
- Target: first Nova 4 to 6 days attentive; the second pass about 3× faster, not 100×. New worlds add their own days. This layer is where the month of length comes from.

### The paradigm shift

The sky becomes the map. The Observatory's six constellations turn out to be the bottom of a much larger sky, and that sky is the skill tree. The stars the player spent days charting are where it starts.

### The tree

- Path of Exile style, drawn **bottom to top**: it starts at the bottom of the screen and grows upward. (Chase's call.)
- **Travel nodes**: minor boosts along the paths, such as game speed ×1.01 or ×1.02. They are meant to add up.
- **Wheels and clusters**: groups of nodes around one mechanic (one world's reset, telescopes, folding, a currency).
- **Notables**: each changes one rule in one world.
- **Keystones**: a few big trades that change how a whole run plays. Changing the order worlds unlock in is allowed here.
- **New worlds** are regions of the sky the player paths toward, so which world opens next is a build decision. How many is not decided; the old roster had Mirror and Loom.
- Respec is free at a Nova, the same way charges move at an Eclipse.
- No layer dies: the tree's outer edge needs a repeatable node for Nova's currency, corona keeps Aperture, and starlight still needs a repeatable sink (it has none).

### How to build it without drowning in balance

Chase expects this to be "an absolute balancing nightmare". Keep it tractable:

1. **Make the tree data.** One file of nodes: id, position, links, kind, and an effect that is a plain record (`{ stat: 'pace.cinder', mult: 1.02 }`), not code. Effects are summed into numbers on state and read through `links.js`, the way corona upgrades already are. Then the simulator, the page and any balance script all read the same list.
2. **Give each kind of node a budget.** Decide what one point is worth (say, one travel node = ×1.02 speed) and price notables and keystones in points against that. Tune the budget, not four hundred nodes one at a time.
3. **Build the reset first with a tiny tree** (twenty nodes, one cluster, one keystone) and measure the first and second Nova for both players before drawing more.
4. **Test builds, not nodes.** Give the stand-in a handful of fixed builds (all speed, one world deep, spread thin, a keystone build) and compare time to the next Nova. A build more than about twice as fast as the others is the thing to fix.
5. **Record a full run to the first Nova once per player** and save it as a checkpoint, as was done for Eclipse. Everything after is tested from there.
6. Add the new worlds one at a time after the reset and the small tree are right, each as its own slice.

Watch for the known traps: small speed nodes multiply (fifty at ×1.02 is ×2.7, and that is on top of corona speed), and any node that multiplies all starlight feeds Cinder and Tidewater twice.
