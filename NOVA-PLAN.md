# Plan: Nova, the layer above Eclipse

Draft of 2026-11-17, written while Chase plays the current build. **Prototype built the same day (v0.15)**: the reset, stardust with its tail, the 18-star tree as drawn below, the five stardust upgrades and Clear skies, the sky on the Observatory page, the Nova tab and the white-out. Every number is untuned and nothing has been measured; the next step is recording a full run to the first Nova for each stand-in. The parts agreed on 2026-11-15 are in `CLAUDE.md` under "Plan for the next layer"; this file fills in the rest. Every number is a starting guess, to be set by the simulator. The questions for Chase are at the end.

## The reset

- **Opens at 30 stars charted.** The Nova tab appears and the Observatory sky changes (see "The moment" below).
- **Wiped**: every world, the Atlas, starlight, corona and everything it bought (upgrades, world upgrades, expansions, Aperture, charges), sightings, stars, lenses and instruments.
- **Kept**: stardust, the tree, options, statistics.
- After a Nova the game starts again at Cinder with nothing, the same order as the first time, and whatever the tree grants.

## Stardust

What Nova pays. It depends only on how far the run got, and nothing multiplies it.

**Stardust = 10 × 1.2^(stars − 30)**, rounded down.

| Stars at the Nova | 30 | 34 | 38 | 42 | 48 |
|---|---|---|---|---|---|
| Stardust | 10 | 20 | 42 | 89 | 266 |

Leaving at 30 is allowed. Staying to the end pays about 27 times as much. That is the same shape as corona, where leaving early and going deep are both reasonable.

**Past 48 stars** there are no more stars until a new world adds a constellation, so stardust would stop growing. Proposal: once all 48 are charted, every doubling of the corona found in total after the 48th star counts as one more star. The tail is slow but never ends.

## The tree

### How it is paid for

- Stardust is spent on nodes. Each node costs more than the one before it, counted by how many you own (first guess: 1, 1, 2, 2, 3, 3, 4… stardust).
- **A respec is free at each Nova.** Everything spent comes back and the tree can be bought again in another shape, the same way charges move at an Eclipse.
- A node can only be bought if it touches a node you own, or touches the bottom row.

### What it looks like

The tree is the sky above the Observatory's six constellations. It is drawn bottom to top, as Chase asked. The six constellations are the bottom row. Each is the starting point for the part of the sky above its world, so the region above The Kiln is mostly Cinder's nodes, and so on. The middle of the sky, above all six, holds what is about every world: speed, the Atlas, the telescopes.

Kinds of node, as agreed:

| Kind | Looks like | Effect | Budget in points |
|---|---|---|---|
| Travel | a small faint star | a small number: speed ×1.03, telescopes ×1.1 | 1 |
| Notable | a named bright star | changes one rule in one world or system | about 5 |
| Keystone | a large star with a ring | a trade that changes how a whole run plays | about 10 |
| Edge | the last star of a path | repeatable, a small gain each time, price rising | infinite sink |

"Points" here is the budget used to price nodes against each other, not a currency the player sees.

### As data

One file, `src/sky.js`. Each node is a plain record:

```js
{ id: 'k1', x: 410, y: 820, kind: 'travel', links: ['k0', 'k2'],
  name: '', effect: { stat: 'pace.all', mult: 1.03 } }
```

`effect` is data, never code. A notable that changes a rule names a flag (`{ flag: 'cinder.bankedEmbers' }`) that the world reads through `links.js`. The page, the simulator and any balance script all read the same list.

## The moment (the paradigm shift)

- **At 30 stars:** the Observatory page grows upward. Above the six constellations a much larger sky fades in: hundreds of faint stars, unlit and unnamed, joined by faint lines down to the constellations you charted. At the top is one star brighter than the rest. The Nova tab appears. No text explains it.
- **On the first Nova:** the page goes white, every tab but Cinder and the sky disappears, and the game is at its very first screen again. The sky is still there, with the six constellations dark and the stars above them now able to be bought.
- From then on the tree and the Observatory are one tall page. The constellations at the bottom are charted again every run, and the tree grows above them.

## The first, tiny tree (build this first)

Twenty nodes, as `CLAUDE.md` says: one cluster, one keystone, enough to measure the first and second Nova before drawing more.

Middle of the sky (all worlds):

1. Travel ×4: every world runs 1.03× faster each (×1.13 together).
2. Notable **First light**: every Nova starts with Totality bought.
3. Travel ×2: Atlas upgrades cost 2× less each.
4. Notable **Old maps**: the Cartographer is free and owned from the start of every Nova.

Above the Observatory (the telescope cluster):

5. Travel ×4: telescopes 1.1× faster each.
6. Notable **Star memory**: after a Nova, the first star of each constellation needs no sightings, only the world shining.
7. Notable **Wide field**: every world without a telescope on it still gathers sightings at a tenth of the rate.
8. Keystone **Fixed stars**: telescopes gather 10× as many sightings, but a telescope that has been moved cannot be moved again for an hour.

Above The Kiln and The Anvil (two world notables to test the pattern):

9. Notable **Banked fire** (Cinder): burning down halves the embers instead of resetting them.
10. Notable **Lightning rod** (Stormfront): aimed strikes also pay half the thunder a ground strike would.

The edge:

11. **Further out**: every world runs 1.05× faster. Repeatable; each one costs more than the last.

That is 18 nodes counting each travel node; two more travel nodes can join paths once the sky is drawn.

### Why these

Most of the first run is not world speed. It is the 35-hour climb to the first Eclipse and then about 17 hours of real-time charting. The second run should be about 3× faster in all, not 100×. Speed nodes alone would only shrink the first part. So the tree aims at three things:

- **The climb**: speed nodes, plus First light and Old maps, so the dull rebuild after a full wipe is shorter.
- **The Observatory**: telescope nodes, Star memory and Wide field. The sky runs in real time and would otherwise be the floor on every run.
- **Rules**: one keystone and two notables, to test whether rule changes feel worth a node.

Watch for the known traps:

- Four travel nodes at ×1.03 are mild, but they multiply corona speed.
- Nothing in this tree multiplies all starlight.

## Targets and how to measure

- **First Nova:** attentive player about 3 days. The stand-in reaches 30 stars somewhere between the last expansion (2d 16h) and 48 stars (3d 9h); the exact time is not measured. AFK player: not measured, but at least 10 days.
- **Second Nova:** about 3× faster than the first for the same player, so about a day attentive.
- **Measure** by recording one full run per player to the first Nova and saving each as a checkpoint, as was done for Eclipse. Then test the second run from there with a few fixed builds: all speed, all telescopes, spread thin, and the keystone. If one build is more than about twice as fast as the others, fix that build.
- Then add new worlds as regions of the sky, one slice each.

## Chase's answers (2026-11-17)

- The tail past 48 stars (each doubling of corona found counts as a star): agreed.
- The tree is the Observatory page grown upward, "for now".
- Starting gifts like First light and Old maps are wanted.
- **Stardust upgrades** as well as the tree, FE000000 style: the reset currency is spent on more than one thing, and some of those upgrades are infinite. This also answers the starlight question: a stardust upgrade can open a repeatable starlight upgrade in the Atlas, the way the Observatory opened Aperture for corona.
- **Nova opens at 30 stars.** Stars 31 to 38 are mostly waiting (real-time sightings and long runs for records, with the same decisions as before 30), so a higher bar would add a day of the same loop. Staying past 30 is the player's choice, paid for by stardust's ×1.2 a star.
- **Stardust is spent** on tree nodes (each costing more than the last, all refunded at a Nova) and on stardust upgrades (permanent). Points from stardust milestones were the alternative and are dropped. Stardust put into permanent upgrades is stardust not in the tree.

## Stardust upgrades (draft)

Permanent, never refunded. The tree is for choices that change from run to run; these are for what every run wants, and for the sinks that never run out.

| Upgrade | Effect | Price |
|---|---|---|
| Clear skies | Opens a repeatable starlight upgrade in the Atlas: sightings ×1.25 a level, price ×10 a level. It resets at an Eclipse with the rest of the Atlas, and it touches no world, so it cannot feed the starlight loops. | one-off |
| Remembered lenses | Lenses are kept through a Nova. | one-off |
| First charge | Every Nova starts with one charge. | one-off |
| Nebula | Telescopes ×1.2. | repeatable, price ×3 a level |
| Remnant | Every world runs 1.05× faster. | repeatable, price ×4 a level |

Prices are set once the first Nova's stardust is measured. Remnant is speed, which multiplies with everything else, so it gets the steepest price.

## Open questions for Chase (as first asked)

1. **Is 3 days for the first Nova all right?** Opening at 30 stars puts it near 3 days for an attentive player, short of the 4 to 6 days first planned. Raising the bar to 38 stars would add most of a day.
2. **Should the tree be the Observatory page grown upward, or a tab of its own?** I recommend the same page: that is what makes the sky the map.
3. **Is stardust spent on nodes at a rising price all right?** The alternative is points earned at stardust milestones, as Path of Exile levels work.
4. **Are starting gifts like First light and Old maps all right?** These are nodes that give you an upgrade from the start of a Nova. They are FE000000-style, and they cut the most tedious part of a full wipe.
5. **Starlight still has no sink that never runs out** (rule 12). Should it get one in this slice, for example a repeatable Atlas upgrade, or wait?
