# Plan: the look, the layout and the words

Chase has not played the game yet. He is waiting until it looks and reads the way he wants, so that his first playthrough is a real one. This pass comes **before** the next reset layer (Nova) and before any more balance work.

His brief, in his words:

- "A lot of the text is still way too AI / cheery Claude voice."
- "I had expected each world to have a themed extremely pretty page related to its theme. Right now... every page looks the same, upgrade boxes, boxes in general are just rounded, everything is claudeified."
- "I envision different color schemes, upgrade layouts, etc. depending on the world tab. Clockwork should have cogs/gears, probably be brownish themed. Stormfront lightning."
- "Everything needs to look like it was designed and created by a UX artist. Right now it looks like it was one-shot by AI with no design requests."

This replaces the early note that graphics were not a focus. They are now.

## What Chase said after reading the pages (2026-11-15)

He went through a save at the Eclipse phase. His conclusion: "theres just a LOT of ui work that probably needs to happen before i can determine if the text is actually the main problem here. like a lot a lot." So the order below changes: **layout and words are done together, page by page, starting with the pilot world.** Do not run a separate wording pass first.

### Voice guide

The game "doesn't need a narrator, which is what Claude likes to do." Let the game speak for itself.

1. **No subtext under a control.** The damper had "Open for more heat, shut for more ash." Delete lines like this. The readout ("Heat ×1.00. Ash gain ×1.00.") already says it, and moving the slider shows it.
2. **No instructions.** The lattice had "Pick 2 from the first row. Each node needs the one above it." Delete. Show it in the interface: a node that can't be taken looks unavailable (greyed out) until it can.
3. **A blocked thing says "Unavailable"**, not the rule that blocks it. The lattice's "Only 2 from this row." becomes "Unavailable".
4. **State the effect and its cause in one line.** Embers read "Building for 23m 31s. Multiplies heat by 1,694. Resets on burn down." Preferred: "Multiplying heat by 1,694 due to 23m 31s spent building."
5. **Don't say when something resets** in running text. The reset's own box says what it resets.
6. **Speed is shown once, small, at the top of a world's tab**: "Gamespeed: 96×". Remove "(runs 96× faster)" from every status line and the Speed row from breakdown boxes.
7. Lead paragraphs that explain a system go. If a page can't be understood without one, the layout is wrong.

### Layout notes from the same read

- A fact like Embers "doesn't need its own rounded box". One line of status does not get a panel. Boxes are part of why the text reads as AI.
- **Charges must not be a checklist of checkboxes.** Assign a charge on the upgrade itself: click or hover the upgrade card, and show the charge on it. "The text is fine" there; the control is what is wrong.
- Availability, limits and requirements are shown by how a thing looks (greyed, locked, lit), not by a sentence beside it.

### Stormfront is the pilot now (first draft built 2026-11-15)

Chase asked for Stormfront first, not Clockwork. A first draft exists and is waiting for his reaction: `src/ui/stormfront-view.js` (one wide three-column page, no sub-tabs) and `css/worlds/stormfront.css` (fixed storm sky with drifting cloud banks, two bolts on a 30-second cycle, cut-corner plates, peals as a wall of tiles, glow only on what is lit, aimed or charged). It is desktop-first: Chase plays on a PC and wants the width used, not one long scrolling column. Use it as the pattern for the other worlds: a `data-world` section, its own stylesheet under `css/worlds/`, and `:has()` rules to widen `#app` and change the page background while that world is showing. Still generic on that page: the shared "is shining" notice text and the confirm dialog.

His reaction to that first draft: "its a start. i like that it's themed but everything looks like too clean still... i want it to look like an artist with no coding experience made it, right now it looks so clean and rigid." And: "we can in fact have things in sub tabs. with everything on one page it's much too busy." So: **hand-made, not ruled**, and **sub-tabs are fine**; use the width within a tab, but do not put a whole world on one page. The second draft (same files, the block at the end of the stylesheet) brings back Storm / Peals / Fulgurite sub-tabs and roughens everything: outlines pushed through an SVG wobble filter (`#sf-rough`, on a separate layer so text stays sharp), handwritten headings ('Ink Free', a Windows font), serif numbers, tiles slightly rotated like pinned scraps, grain over the sky. Awaiting his reaction to that.

His reaction to the second draft: "we're moving in the wrong direction... it looks doodly now but thats not what i meant. when i said it looks too clean i think i meant more that it looks too professional maybe. the only thing i like so far is the color scheme. the background is like extra bad, the flashing cloud hurts to look at, but the ui being in boxes with more boxes in the boxes looks also bad. it doesnt need squiggly lines, it just needs more jank i think. stop putting boxes in everything." He also said he does not know how to express what he wants. **Do not** wobble lines, tilt things, draw background art in CSS, or animate the centrepiece. The third draft (the "Third pass" block at the end of the stylesheet, which replaced the second) is the FE000000 reading of "jank": the colour scheme kept, a flat dark page, monospace text sitting straight on it with no panels at all, centred, and outlines only on things you click or reach (plain square tiles, lit from the middle with a radial gradient when they count). Awaiting his reaction. The earlier wish for background art and lightning is withdrawn unless he asks again; the old sky and cloud elements are still in the view file, hidden by CSS.

His reaction to the third draft: "i like this better... it looks better." This is the direction: flat page, text straight on it, simple tiles, the world's colours. Two rules he added, for every world:

- **Nothing may flicker.** Any bar or number that would cycle more than once a second is shown as permanently running (a streaming bar, a rate such as "3.2 strikes per second"), never as a bar refilling many times a second.
- **Text that explains is allowed when a control is not obvious**, written as "what you would want to read if you were a player and not what you would explain as a teacher". He did not know what Aim did, so it now has one plain line under its heading. The earlier rule against narration still stands for things the page already shows.

### Clockwork, second world done the same way (2026-11-16, first Opus session)

`src/ui/clockwork-view.js` and `css/worlds/clockwork.css`, following the approved Stormfront third draft: flat walnut page, paper text in a serif (Cambria, tabular figures), brass for what is working, blued steel for selection and springs, no panels. Sub-tabs: Movement, Complications, Chimes, Springs. The gear train is round socket tiles in a line with › between them; **click a socket, then click a gear in the tray below** (dropdowns are gone). Each gear's tray tile also holds its level and its "+1" button, so there is one place per gear. Complications use the same pick-a-slot-then-a-part pattern. Chimes are a tile wall like the peals. Only the active sub-tab is updated each frame. Not yet seen in the browser: the Complications tab (the test save has no long case).

Chase's reaction: "almost". Springs read as Stormfront's blue, so the second colour is now **copper** (selection and springs); no world should reuse another world's accent. He asked for cogs instead of circles: the train is now drawn as **meshing cogs on a machine plate** (dark plate, a screw in each corner), the cogs generated in code by `cogPath()` in the view file, no image assets. Neighbouring cogs turn slowly in opposite directions (18 s a turn) while the movement is wound; empty sockets are a dashed outline, stopped gears are rust and still, the selected socket has a copper outline and glow. A "graphical box" like this plate is fine where it is the machine itself; the rule against boxes is about wrapping text and sections.

Chase on the cog plate: "i really like that a lot... its in theme, it looks good. a+ for sure." **This is the standard to aim for in every world: the world's main control drawn as the physical thing it is.** He then asked for the Gears list to be themed too: it is now a watchmaker's **parts tray** (`.cw-felt`): a wooden rim around oxblood felt with sunken compartments, each holding a small drawing of that gear kind made in code by `partIcon()` (cog, spoked flywheel, flyball governor, sawtooth ratchet, small idler, escape wheel, worm screw, pinion; a dial for complications; a dashed ring for "Take out"). Parts in the train are bright brass and glow; parts left in the tray are dull.

His wants for every world (the first three were stated before he saw any draft; check them with him): background art or at least glyphs, an occasional ambient effect, glows used sparingly, no rounded boxes everywhere, layouts built around what the player does, and milestone lists as tiles (he showed FE000000's complexity achievements as the reference), not a markdown-style list.

## Ground rules

- **Game logic is not touched.** Everything in this pass is in `src/ui/`, `css/` and the text strings in the logic files. The simulator must give the same numbers before and after.
- **No frameworks, no build step.** Hand-written CSS and inline SVG. Web fonts are allowed if they are loaded locally from the repo.
- **Show, then roll out.** One world is done to a finished standard and shown to Chase as screenshots before any other world is started. He approves the direction, not a description of it.
- **Nothing generic survives by default.** If two worlds use the same card, the same box and the same layout, that is a defect, not a saving.
- Numbers must stay readable. Decoration never sits behind text that changes every frame.

## Step 0: calibration (needs Chase, ten minutes)

Before rewriting anything, ask Chase for:

1. ~~Five lines of current game text that sound wrong to him.~~ Done; see the voice guide above.
2. Two or three games or sites whose look he wants to be in the neighbourhood of (screenshots are best).
3. Whether the page is desktop only, or must work on a phone.

Do not guess at these. The wording pass in particular fails without real examples of what "cheery" means to him.

## Step 1: the words (now done page by page, with the layout)

Superseded as a separate first step: see "What Chase said" above. Apply the voice guide to each page as that page is redesigned, starting with the pilot world. The method below still holds for each page.

- Write a one-page voice guide in this file from Chase's examples. Starting position until he corrects it: the game speaks like a label on a machine. Flat, short, no enthusiasm, no second person where it can be avoided, no exclamation marks, no explaining why something is nice. State what a thing does and stop.
- List every string the player can see: upgrade names and texts, milestone texts, notices, lead paragraphs, button labels, confirm dialogs, toasts, tab names. They live in the `BAL`-adjacent lists in `src/worlds/*.js`, `src/atlas.js`, `src/eclipse.js`, `src/observatory.js`, and in `src/ui/*-view.js`.
- Rewrite them one file at a time and give Chase a before/after table per file to mark up. Names may keep flavour; descriptions may not.
- Cut text as well as rewriting it. Lead paragraphs that explain a whole system should mostly go; a system should be learnable from its labels.
- Fix terms so one thing has one name everywhere (fold, shine, gather, run, Eclipse).

## Step 2: the shell

The frame every tab sits in. It should feel like one game, while each world inside it feels like its own place.

- **Navigation.** Split worlds from layers: worlds as one row or rail, the layers (Atlas, Eclipse, Observatory, later the sky) as another, Options apart. Show at a glance which worlds are shining and which have something to do.
- **A persistent strip** for the currencies that matter everywhere (starlight, corona), so they are not only visible on their own tab.
- **Typography.** Pick one display face for names and headings and one text face with tabular figures for numbers. Numbers that tick must not make their line jump.
- **Tokens.** Global CSS variables for spacing, type sizes and the neutral colours. Each world then overrides its own set (see step 3).
- **States.** One consistent language for can-buy, cannot-buy, owned, new, automatic and locked that every world restyles but none reinvents.
- **Feedback.** Purchases, resets and milestones should each have a small, quick visual response. No long animations; nothing that plays every frame.

## Step 3: one world, finished (the pilot)

Do **Clockwork** first. Chase named it, its theme is the clearest, and its page already has the most unusual control (the gear train).

Architecture, so the other five follow the same way:

- Each world's `section` gets `data-world="clockwork"`. A file `css/worlds/clockwork.css` sets that world's variables (background, surface, ink, accent, line, glow) and its own component styles under that selector. `css/style.css` keeps only the shell and the tokens.
- Each world gets its own **card shape, upgrade layout and status display**, written in its own view file. `src/ui/parts.js` keeps only what is truly structural (sub-tabs, the breakdown table logic), and those take class names so a world can restyle them completely.
- Decoration is inline SVG, built once, sized by CSS. A small `src/ui/art/` folder holds one module per world.
- The world's main control is the centrepiece of its page, drawn as the thing it is, not as a form.

What "finished" means for Clockwork:

- Palette: brass, walnut, aged paper, blued steel for the accent. Brownish, as Chase said.
- The gear train is drawn as meshing gears in their sockets, turning at a rate tied to ticks per second (capped, and stopped when the tab is hidden).
- Upgrades are not rounded boxes. For example: engraved plates on a movement, or parts laid out in a watchmaker's tray.
- Chimes are a dial that fills, not a list.
- Complications are slots on a watch face.

Show Chase screenshots of the whole page in three states (just unlocked, mid, late). Change direction as many times as he asks before going on.

## Step 4: the other five worlds

One at a time, each shown before the next starts. Starting briefs, to be changed freely:

| World | Palette | Motifs | Centrepiece | Upgrade layout idea |
|---|---|---|---|---|
| Cinder | charcoal, ember orange, white heat | embers, ash, a furnace mouth | the fire, with temperature as a rising column and ignition points marked on it | bricks in a kiln wall |
| Tidewater | slate blue, salt white, kelp green | tide lines, pools, a moon | a shore cross-section that fills and dries with the tide | driftwood planks |
| Grove | moss, bark, pale leaf | rings, roots, canopy | the forest filling its room; sliders as a branching split | growth rings or leaves on a branch |
| Clockwork | brass, walnut, blued steel | gears, plates, dials | the gear train | engraved plates |
| Hollow | deep violet, quartz, cave black | facets, crystal lattice | the lattice as a real node diagram with lit paths | cut gems in a tray |
| Stormfront | storm grey, electric white-blue, dull gold | lightning forks, anvil cloud, a mast | the cloud charging to its breaking point, with strikes drawn to their target | forked branches off a bolt |

## Step 5: the layers

- **Atlas**: a real atlas. Worlds as plates on a page or a star chart; routes drawn as lines between them; folding shown on the plate.
- **Eclipse**: dark, with the corona as the only light. Upgrades arranged around the ring by price; charges shown on the upgrades themselves, not in a checklist.
- **Observatory**: the constellations drawn as constellations, with stars lighting as they are charted and telescopes shown pointing. This page later becomes the bottom of the Nova skill tree, so draw it with that in mind: constellations at the bottom of a tall sky.
- **Options**: plain, and in the shell's style.

## Step 6: Chase plays

When all of the above is approved, Chase plays from a fresh save and gives feedback. Only then go back to balance and on to Nova. Expect this to change things; that is the point of it.

## How to work on this

- Screenshots are the deliverable for every step. Take them yourself at desktop width, and at phone width if step 0 says phones matter.
- Check each page with real late-game numbers (`?devsave=sim/out/save10.txt`), not only a fresh save: long numbers break layouts.
- After each world, run one short simulator check (`node sim/sequence.js --hours 1`) to prove the logic is untouched.
- Keep every animation off when the tab is not showing, and keep the 50 ms frame loop cheap: update text only when it changes (the `setText` helpers already do this).
- Do not start a second world to "save time" while one is waiting for approval.
