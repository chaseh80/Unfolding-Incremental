# Manifold

An unfolding incremental game about an atlas of small worlds. Each world runs on its own rule.

Six worlds are playable:

- **Cinder**: one fire. Heat grows on its own, and passing certain temperatures changes the rules. Resets for Ash, then Glass. The damper trades heat against ash and is never automated.
- **Tidewater**: a tidal shore. Pools fill while the tide is in and dry to salt while it is out; you get salt for whichever half did less. Resets for Driftwood. Tide length is never automated.
- **Grove**: a forest that fills its room. Nothing is bought; sliders split sap between roots, canopy and seed. Resets for Seeds, then Loam. The seed share is never automated.
- **Clockwork**: a gear train you arrange by hand. Each gear's worth depends on where it sits and what is next to it. Resets for Springs. New sockets and gears need progress in the older worlds. The arrangement is never automated.
- **Hollow**: a crystal lattice. Crystal buys facets, facets buy nodes, and you can only start down one of three columns, so every build gives something up. Changing it means dissolving the lot. One column is made of seams that get stronger the further the older worlds have been pushed. Resets for Geodes. The lattice is never automated.
- **Stormfront**: a cloud that builds charge. A strike is worth charge × tension, and tension grows the longer the cloud is held. Strikes at the ground pay thunder and soon happen by themselves. Strikes aimed at the mast or at an older world pay nothing, but leave a lasting bonus there, and they overcharge: tension keeps building for as long as you hold. Resets for Fulgurite. Aiming, and letting an aimed strike go, are never automated.

A world that has been pushed far enough starts to shine. Folding it in the **Atlas** gathers its starlight and resets that one world. Starlight buys new worlds, automation, and routes between worlds.

Above the Atlas is **Eclipse**. Once every world is shining at the same time, the whole atlas can be eclipsed: every world, all starlight and every Atlas upgrade reset, and you get corona. The game is then played again in the same order, one world unlocking after another, with whatever corona has bought.

Corona adds up over Eclipses. An Eclipse gives (1 + P ÷ 8)³ corona, rounded down, where P is how many powers of ten of starlight the run gathered past 3e18. So eclipsing as soon as possible gives 1, about 120 times as much starlight gives 2, 9 powers of ten give 10, and 19 give 40. Because it counts powers of ten, a run left twice as long is worth roughly twice as much, not many times more, and eclipsing early and often or waiting for more are both reasonable ways to play. Nothing multiplies corona.

Corona buys three kinds of thing, none of them ever lost:

- **Upgrades for every world**, at 1, 2, 5 and 12 corona. Owning one at a price opens the next price. They make worlds run faster, multiply starlight, cut Atlas costs and keep Atlas upgrades through an Eclipse. Two of them work the Atlas for you: the **Cartographer** (2 corona) buys Atlas upgrades, cheapest first, and the **Bookbinder** (5) folds a world once it has gathered as much starlight as it has given this Eclipse, and never for less than that world's Starlit upgrade costs. Both have switches on the Atlas page; the Bookbinder can be set to 3×, 10× or 100× and switched off for single worlds. Everything inside a world is still done by hand.
- **Upgrades for one world.** Each world's cost 5, 10, 20, 40 and 80 corona, by how many of that world's are owned. One per world is speed; the rest change how that world plays. Every world has all five.
- **Expansions**: new content for one world. The price depends on how many you own, whichever world it is for: 5, 30, 2,400, 3,600, 5,000 and 7,500 corona. The jump after the second is because the worlds' own upgrades, bought in between, raise corona income about twentyfold. An expansion pays for the next one by letting its world go further and raising starlight. Every world has one:
  - **Star forge** (Cinder): six more ignition points past the sun, from 7,500°C to 27,500°C. Two of them make Cinder's starlight double every 350°C and then every 200°C, instead of every 500°C.
  - **The reef** (Tidewater): five more strandlines, from 1e70 to 1e102 salt, and a reef of up to six plots planted by hand with coral for salt, starlight or driftwood. Coral grows with every tide. Two of the strandlines make Tidewater's starlight double faster.
  - **The old wood** (Grove): five more stands, from 1e62 to 1e76 trees, and heartwood. A slider sends a share of all sap to heartwood, which is kept through seedfall and fire. Each power of ten of heartwood is a ring; rings multiply sap, and from the second stand each ring multiplies all starlight by 1.03, later 1.05.
  - **The long case** (Clockwork): five more chimes, from 1e76 to 1e102 ticks per second, and up to three slots for complications, one of each kind at most: tourbillon (ticks), orrery (all starlight), chronograph (springs) and moon phase (Cinder's heat and Tidewater's salt). Each grows with the minutes it has been fitted and starts again if swapped.
  - **The abyss** (Hollow): five more chambers, from 1e90 to 1e114 crystal, and a fifth row of the lattice. Its three nodes multiply all starlight: by 1.3 per node owned, by (1 + minutes since last dissolve)², or by Stormfront's biggest strike.
  - **The high sky** (Stormfront): five more peals, from a strike of 1e76 to 1e106, and the sky as something to aim at. The biggest strike to hit the sky multiplies all starlight by (1 + its powers of ten)², rising to the power 4.

The first Eclipse takes about 35 hours of attentive play, or about 40 if you look in every five minutes. From there, buying the cheapest thing available each time, Totality, the six 2-corona upgrades and the Star forge take about 19 more hours, and the other five expansions come between 1h 19m and 4h apart: about two days and eighteen hours in all. Someone who looks in every half hour takes three days to the first Eclipse and about nine and a half to the last expansion. Past the last expansion corona still buys Aperture (below), and what is left to finish is the Observatory.

Beside Eclipse is the **Observatory**, which opens with the first expansion. Every world feeds it, nothing in it is ever reset, and what it gives back goes to Eclipse as charges.

- A **telescope** pointed at a world gathers sightings of that world in real time (speed upgrades don't touch it). The rate is 0.0003 a second for each power of ten of starlight that world has gathered this Eclipse, so a run left to go deep is watched faster than one eclipsed early. A telescope's focus climbs from ×1 to ×4 over an hour on the same world and starts again when it is moved. Where telescopes point is always chosen by hand.
- Each world has a **constellation** of eight stars. A star costs sightings of its world (50, then 5× more each time) and needs the world itself to have got far enough by its own measure: hottest fire, best tide, biggest forest, fastest movement, most crystal held, biggest strike. The first star only needs the world shining. The sixth needs every expansion, the seventh a run left going for about an hour, the eighth one left for several.
- **Milestones** come by stars charted in all, at 1, 2, 3, 4, 6, 8, 10, 14, 18, 24, 30 and 38. Seven of them give a **charge**; three make telescopes 2× faster; one lets a moved telescope keep half its focus; one unlocks Aperture.
- A charge sits on one of the thirteen general corona upgrades you own and makes it a stronger version of itself: Totality 6× (from 4×), Dawn side and Dusk side 8×, Umbra 3×, Bright sky ×1,000, Diamond ring ×100,000, Thin pages 1,000× less, Keepsakes also keeps every Starlit upgrade, the Cartographer buys without spending, Old roads adds ×1,000 to every world's main resource, Steady hands gains 5× as much, Scorch marks counts strikes to a power 2 higher, the Bookbinder's folds gather 10×. Charges are placed on the Eclipse page, can be moved freely, and only take effect at the next Eclipse. There are seven charges for thirteen upgrades, and they are not equally good.
- **Aperture** is a corona upgrade that never runs out: telescopes 1.5× faster a level, 5,000 corona and doubling.
- Its upgrades are paid for out of what the worlds hold. Each world has five **lenses** (sightings of that world ×2 each), bought with its reset currency: ash, driftwood, seeds, springs, geodes, fulgurite. Four **instruments** each cost two worlds' currencies at once: a second and a third telescope, the Steady mount (focus 3× faster) and Long exposure (full focus ×8).

With charges the expansions come sooner (the last about 2d 16h in for an attentive player), and with every expansion owned the stand-in plays hour-long runs: each one reaches the deepest stars' requirements and pays about 7,800 corona towards Aperture. Charting all 48 stars takes about 17 hours past the last expansion, about 3d 9h in all. The player who looks in every half hour buys the last expansion about 9d 0h in and has 33 stars a day later. Its runs last up to an hour and a half and stop short of what the sixth to eighth stars need (Clockwork reaches 1e163 ticks a second against 1e174 for its sixth), so it has to leave a run going for many hours to finish; how long that takes in all has not been measured.

Above Eclipse is **Nova** (a first prototype; its numbers are guesses, not tuned). It opens at 30 stars charted. A Nova resets everything below it, every world, the Atlas, corona and everything it bought, and the Observatory's sightings, stars, lenses and instruments, and the game starts again at Cinder. It pays **stardust**: 10 × 1.2 for each star past 30, rounded down (10 at 30 stars, 42 at 38, 266 at 48). Once all 48 are charted, each doubling of the corona found in total after the 48th star counts as one more star. Nothing multiplies stardust.

- Stardust buys **stars in the sky** above the Observatory's constellations, a tree drawn bottom to top (`src/sky.js`). The six constellations are its roots; a star can be taken if it touches a root or a star already taken, and each costs more than the last (1, 1, 2, 2, 3, 3…). The first sky has 18 stars: four ×1.03 speed, two Atlas ×2 cheaper, four telescopes ×1.1, First light (every Nova starts with Totality), Old maps (every Nova starts with the Cartographer), Star memory (the first star of each constellation needs no sightings), Wide field (unwatched worlds gather a tenth of the sightings), the keystone Fixed stars (sightings ×10, a moved telescope stays put for an hour), Banked fire (burning down keeps half the embers' building time), Lightning rod (ground strikes count for the mast), and Further out (×1.05 speed, again and again). The tree can be refunded at the next Nova.
- Stardust also buys upgrades **kept for good**: Clear skies (opens a starlight upgrade in the Atlas, sightings ×1.25 a level, lost at an Eclipse), First charge, Remembered lenses, and two that never run out, Nebula (telescopes ×1.2) and Remnant (×1.05 speed).

The first Nova and the run after it have not been measured.

A world an Eclipse upgrade makes run faster shows its rates as they pass in real time, with the speed beside them. Clocks on its page (time since a reset, a held strike, tide length) are the world's own and run that much faster.

## Playing it

Plain HTML, CSS and JavaScript, no build step. Browsers won't load JavaScript modules off the disk, so serve it:

```bash
python -m http.server 8321
```

Then open http://localhost:8321.

## Code layout

- `src/game.js`, `src/atlas.js`, `src/eclipse.js`, `src/observatory.js`, `src/worlds/`: the whole game with no page attached. Each world's tunable numbers sit in one `BAL` block at the top of its file.
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

The game logic doesn't touch the page, so Node can play it far faster than real time. A stand-in player (`sim/bot.js`) buys what it can afford, sets dials and sliders, arranges gears, resets when it's worth it, folds worlds and shops in the Atlas. It leaves Cinder's damper alone, never uses Hollow's bridges, and aims Stormfront's strikes by simple rules, so a player who does those well will be somewhat ahead of these numbers.

```bash
node sim/run.js
```

prints a timeline of the whole game. Options: `--every 300` (look in every five minutes), `--quiet` (summary only), `--hours 30`, `--eclipses 3` (carry on to the third Eclipse; give it a large `--hours`), and `--tidewater`, `--grove`, `--clockwork`, `--hollow` or `--stormfront` to play one world on its own.

```bash
node sim/calibrate.js stormfront
```

works out upgrade costs and milestone thresholds so the stand-in player reaches each at a chosen minute. Also takes `cinder`, `tidewater`, `grove`, `clockwork` and `hollow`. Set the targets in that file, run it, copy the numbers into the world file. It takes a few minutes.

The first four worlds are tuned on their own. Hollow and Stormfront are tuned inside the whole game: the calibrator plays up to the moment the world unlocks, then starts every trial from a copy of that state (`simulate({ from })`). Stormfront's answers are rough, because its progress comes one strike at a time; two of its peals were set by hand from the timeline.

```bash
node sim/breakdown.js 20 60 120
```

shows where Cinder's heat comes from at those minutes, as powers of ten.

```bash
node sim/snapshot.js 140 > sim/out/save.txt
```

writes a save from 140 minutes into a simulated run. Add a world's name (`node sim/snapshot.js 60 clockwork`) for that world alone. Paste it into Options, or open the game at `?devsave=sim/out/save.txt` to load it without touching your real save.

```bash
node sim/checkpoint.js
node sim/expansion.js hollow
```

The first plays the game once to a late point (a fresh run just after the reef is bought) and saves it to `sim/out/checkpoint-late.json`. The second starts from that point with every corona upgrade owned and pushes one run for two hours, with and without one world's expansion, printing what the run would be worth at half an hour, one hour and two. It takes under a minute, against several for replaying the whole game. Add `--only` to skip the run without the expansion, or `hollow.coreMult=1000` to try a different number. Rebuild the checkpoint only when something before it changes.

```bash
node sim/sequence.js --after 2
```

plays on from the saved point until every expansion is bought, buying the way the stand-in player does, and prints how long each took after the one before. This is the test for how the expansions sit together. `eclipse.expansionCosts=5,30,2400,3600,5000,7500` tries other prices. `node sim/checkpoint.js` also prints the times up to the reef.

There are two stand-in players. The usual one acts every few seconds. Add `--afk` to `checkpoint.js` and `sequence.js` for one who looks in every half hour: it has its own saved point (`sim/out/checkpoint-late-afk.json`), and on each look it eclipses once the run's corona per hour has started to fall. It buys the Cartographer and Keepsakes before any speed, and leaves the Bookbinder switched off until it owns Umbra. Its whole-game run takes about ten minutes to simulate. `sequence.js` also takes `--no-fold`, `--no-atlas` and `--fold-at 10` to compare the automatic folder and buyer.

```bash
node sim/away.js build
node sim/away.js 40 tend=hollow,stormfront
```

looks at what the away player is waiting on early in the Eclipse phase. The first line saves the point where it has just bought Keepsakes. The second plays on for 40 hours with those worlds tended every few seconds, as if everything done by hand in them were automatic, and prints when it eclipsed. `up=passive,routes` grants corona upgrades first.

```bash
node sim/trace.js
node sim/stargaze.js rate=0.0005
```

are for the Observatory. It changes no world, so there is no need to play the worlds again to tune it. The first line records, minute by minute, how far each world gets and how much corona is spare, from the saved late point to sixteen hours past the last expansion, and prints how many stars the stand-in had really charted by the end (`sim/out/trace.json`; several minutes, `--afk` for the other player). The second replays the Observatory against that record in a few seconds and prints when each star was charted and each lens and instrument bought; any number in the Observatory's `BAL` can be tried on the command line. The record starts a few hours after the Observatory really opens. Charges change how far the worlds get and the record has them where the recorded player put them, so the replay is a guide and the recording's own star count is the check. A recording now takes about half an hour, because charged worlds run several times faster and the simulator's cost follows world speed. `sim/stargazer.js` is how both stand-in players use the Observatory: they buy a lens or an instrument only with ten times its price in hand, and move a telescope only for a star that would come twice as quickly.

`?speed=20` runs the clock twenty times faster.

### Things learned while tuning

- Repeatable growth needs cost curves that bend upward. Plain exponential costs finish a world in a minute once purchases are automatic. Bend too hard and the world hits a wall no upgrade moves.
- When several upgrade ladders multiply each other, their growth exponents add. Clockwork's six gear ladders ran away until each one was made cheap but weak.
- Anything that raises a multiplier to a power is far stronger than it looks. Clockwork's idler started at "to the power 1.5" and had to come down to 1.2.
- Every reset needs a bonus that grows with time since the reset (embers, clearing glass, kelp, age, settling loam, wear-in). Otherwise the best play is to reset every few seconds.
- Starlight is gathered continuously while a world shines and only banked by folding, so there is nothing to gain from folding over and over.
- A bonus based on all starlight ever gathered is fine for the first world and ruinous for later ones. Later worlds count only their own starlight.
- Newer worlds have to shine brighter, or they aren't worth folding (Tidewater ×3, Grove ×100, Clockwork ×50,000, Hollow ×400,000,000, Stormfront ×3e14 against Cinder).
- A world that other worlds feed can't be calibrated on its own. Hollow tuned alone had 40-minute gaps and bunched milestones in the real game, because its seam column was worth nothing in the test. Tune such a world from a checkpoint of the whole game.
- The first fold of a world should pay for that world's star node. If it falls short, the second run is as slow as the first with nothing new in it.
- Any "per unspent point" bonus has to be weaker than what the points would buy, or the best build is to buy nothing.
- A cycle the game waits on has to stay short. Stormfront's breaking point first grew to seven minutes, and a front needed ten of those to rebuild after every reset. At 30 seconds to two and a half minutes it flows.
- If the basic action needs a click every half minute, automate it almost at once. Stormfront strikes the ground by itself after the first full strike.
- The stand-in player has to be reasonable at a world's hand-worked control, or the numbers get tuned for a bad player. Its first tries at aiming Stormfront's strikes stalled the world for an hour at a time.
- A bonus one world gives another should survive the giving world's fold. Stormfront's strike records on older worlds were first wiped by folding it, which froze all five.
- To price a reset of the whole game, measure it: play to the reset once, then replay from that checkpoint with each reward switched on. A second Eclipse with no rewards took 32.5 hours against 35 for the first. Starlight ×3 made it 24. Having every world open from the start made it 12, which was dropped because a repeat should follow the same path as the first run.
- A boost to how fast a world runs is the easiest reward to keep even between worlds and to predict: a run takes the sum of each world's time divided by its speed. Multipliers on a world's resource barely move the time, because its milestones are spaced over hundreds of powers of ten.
- The currency of a big reset should depend on one thing, how far the run got. Corona is a root of starlight and nothing multiplies it. Anything meant to raise it has to do so by raising starlight, which keeps every upgrade honest about what it is worth.
- A reset currency that is a root of something growing by powers of ten grows exponentially with waiting. With corona as the twelfth root of starlight, a run pushed one hour after the Star forge was worth 28 and two hours 127, so any price was either out of reach or trivial. Counting the powers of ten instead (corona = (1 + powers ÷ 8)³) makes two hours worth about twice one, and short resets and long waits come out close: 12 corona every 15 minutes against 79 in two hours.
- Do not remove a way of playing to fix a balance problem. Corona was briefly a record of the best run, so that repeated short resets gave nothing; it was reverted, and the formula above fixed the actual problem.
- Measure a repeated reset by the time to each purchase, not by the number of resets. A stand-in player that waited for more whenever more was coming sat in its first run for four days and bought everything at once; cap its patience at a few minutes.
- Starlight that grows with a world's size, next to a star node that multiplies that world by starlight, feeds itself. Tidewater's reef at "doubles every half power of ten" ran away to 1e25 corona; at one power of ten it holds, but still overshoots.
- To see what one expansion is worth, compare like with like: start from the same checkpoint with every upgrade owned and push the same length of time with and without it. The first test of Grove's expansion looked twenty times too strong only because the stand-in player had bought everything else in between.
- A multiplier on all starlight is far stronger than it reads, because the first two worlds' star upgrades multiply them by all starlight. Grove's rings at ×1.2 each gave 1,698 corona in half an hour; ×1.03 is in line with the other expansions.
- Do not replay settled parts of the game to test something late. Save a checkpoint and test only the new thing from it; balance the whole once everything is built.
- Spread an expansion's milestones against what the world reaches with the expansion owned, not without it. Each one's first thresholds were cleared in the first half hour until they were moved.
- Find out what actually drives income before pricing against it. A pushed run with every corona upgrade owned is worth 180 corona after five minutes; with only some, 17 after twenty. The worlds' own upgrades, costing 5 to 80, mattered far more than the expansions, and a ×4 price step per expansion had assumed the opposite.
- A stand-in player that buys in a fixed order can hide that. Buying the cheapest thing first is closer to what people do and showed the real shape: upgrades in two hours, then expansions.
- Speed upgrades do almost nothing for a player who is away. After an Eclipse, a run needs dozens of actions by hand, and someone looking in every half hour gets one batch per look however fast the worlds run. Late in the Eclipse phase those actions were mostly folds and Atlas purchases: automating both took the away player's Eclipses from about ten hours to an hour and a half.
- Early in the Eclipse phase they are not. With only Totality owned, the away player's run takes a day and a half with or without the Atlas automated, and keeping the passive-gain upgrades doesn't change it. Tending any one world every few seconds saves a few hours; tending all six brings Eclipses to every hour and a half. The wait is spread over the hand actions inside every world, most of it in the last three.
- An automatic folder that compares a world's gathered starlight with all starlight only ever folds the brightest world. Four worlds are multiplied by the starlight they themselves have handed over, so the rest starved: a pushed hour was worth 750 corona against 3,909 by hand. Comparing each world with what it has given was worth 2,300 after fifteen minutes against 1,177 by hand, and a little less than by hand after an hour, which leaves a reason to switch it off for a long push.
- An automatic folder also needs a floor. Folding a world the moment it has 5 starlight throws away an hour of rebuilding early on, and an Eclipse needs all six shining at once. The floor is the price of the world's own Starlit upgrade.
- A layer that changes nothing else can be tuned from a recording. The Observatory reads the worlds and never writes to them, so one recorded run per player is enough to try any numbers in seconds.
- When every purchase multiplies a rate, costs have to grow faster than all of them together. The Observatory's lenses, focus and star bonuses multiply to about a thousand; with stars costing 2.5× more each, slowing the base rate twentyfold moved the finish by ten minutes, because every star was waiting on its world, not on sightings. At 5× each the sightings set the pace.
- A stand-in player must not react to a reset the way a formula does. Judged by the light of the moment, every world looked worthless right after an Eclipse, and the stand-in moved its telescopes each time and lost their focus. It now goes by the brighter of now and last Eclipse.
- A layer whose currency runs out of uses dies, and a layer that ends on a wait is a wall. The Observatory first finished two days after the last corona purchase, with one run left going and nothing to decide. Giving its stars charges to hand back to Eclipse, and corona an upgrade that never runs out, turned that into hour-long runs with something bought after each.
- Speed boosts multiply. Charges of ×2 and ×3 on four speed upgrades came to over a thousand times normal speed; they are ×1.5 and ×2 now.
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
| Hollow unlocked | 22h 26m |
| Hollow's first collapse | 22h 35m |
| Hollow shines | 25h 52m |
| Hollow's first fold | 26h 08m |
| Stormfront unlocked | 27h 49m |
| Stormfront's first front passes | 27h 58m |
| Older worlds struck | 28h 26m to 28h 41m |
| Stormfront shines | 32h 23m |
| Stormfront's first fold | 32h 25m |
| Eclipse unlocked, first Eclipse (1 corona) | about 35h |
| Totality, all six 2-corona upgrades and the Star forge (5 corona) | 18h 54m later |
| Bookbinder bought (5) | 1h 15m later |
| The reef bought (30) | 2h 49m later |
| The old wood bought (2,400) | 2h 57m later |
| The long case bought (3,600) | 1h 43m later |
| The abyss bought (5,000) | 1h 19m later |
| The high sky bought (7,500) | 2h 10m later, about 2d 18h in all |
| Two hours past the last expansion | six Eclipses, worth 1,959 to 2,829 corona each |
| With charges, the high sky | about 2d 16h in |
| All 48 stars charted in the Observatory | about 17h later, about 3d 9h in all |
| **Looking in every half hour:** first Eclipse | 3d 0h |
| Totality, all six 2-corona upgrades and the Star forge | 3d 10h later |
| Bookbinder | 17h 30m later |
| The reef | 10h 30m later |
| The old wood | 14h later |
| The long case | 13h 30m later |
| The abyss | 9h 30m later |
| The high sky | 7h 30m later, about 9d 11h in all |
| The high sky, with charges | about 9d 0h in |
| Stars charted a day later | 33 of 48; the rest need a run left going for many hours (not measured) |
| One run pushed with every upgrade owned, forge and reef only | about 275 / 397 / 505 at 30 min / 1h / 2h |
| The same with the old wood (Grove) | 399 / 596 / 1,036 at 30 min / 1h / 2h |
| With the long case (Clockwork) instead | 326 / 772 / 1,023 |
| With the abyss (Hollow) instead | 277 / 905 / 1,139 |
| With the high sky (Stormfront) instead | 275 / 397 / 969 |

Looking in every five minutes, the first Eclipse comes at about 40h. Past the first Eclipse the table counts time to each purchase, not Eclipses, because how many it takes depends on how long a player waits. The stand-in player buys the cheapest thing available each time, expansions included (ties go by `CORONA_ORDER` in `sim/bot.js`), and eclipses once the next corona is more than a few minutes away. The times shift by an hour or so with small changes, because corona arrives in lumps.
