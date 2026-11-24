# Changelog

## 1.9.0 · 2026-11-24
- Research chain scoring (new option, on in Recommended): the Bingo center and each research upgrade are scored together with the next research they unlock (both prices against both gains, plus the 30-minute research wait, 3 with Persistent memory), instead of only their own effect. FC rated the Bingo center on making grandmas 4x as efficient, a tiny gain late in a run, so it sat near the bottom even at a few seconds of income. In a test save it moved from 150th to 42nd of 367 purchases. FC's own score is kept when it is better; Elder Pact is left out

## 1.8.2 · 2026-11-23
- Smart dragon auras switch auras directly (same cost as the game's button: one of your most expensive buildings) instead of going through the aura prompt, which left the dragon menu open over the info panel
- When FC trains the dragon with its menu closed, the menu is closed again afterwards (the game opens it on every training); training from an open menu leaves it open

## 1.8.1 · 2026-11-23
- Infobox: the next golden cookie time is worked out from the game's own timer instead of FC's estimate. FC rebuilt the timer from the upgrades owned now, so buying Lucky day or Serendipity moved it at once (they only apply to the next golden cookie) and the line could run out and vanish before the cookie came; it also left out Heavenly luck, auras, gods and other modifiers
- The earliest and latest times are now the game's hard limits (FC showed 1% and 99% chances), so they count down with the clock; the line also says when a golden cookie is on screen or the Golden switch is on

## 1.8.0 · 2026-11-23
- Smart dragon auras (new option, on in Recommended): the dragon always wears the best auras it knows, worked out from your production and clicking at your measured speed, instead of FC's two fixed auras (which left a young dragon with none until it learned them). It switches when a better aura is learned or the second slot opens, only for at least 1% more, since each switch costs one of your most expensive buildings. Candidates: Breath of Milk, Dragon Cursor, Elder Battalion, Dragon God, Radiant Appetite, Reality Bending

## 1.7.3 · 2026-11-23
- The infobox panel moves right when Santa or the dragon is shown at the bottom left, so they are no longer hidden behind it

## 1.7.2 · 2026-11-23
- Golden cookie popups ("Lucky! +x cookies") near the top of the screen are moved down so they stay whole; the game kept them only 32 pixels from the top, less than a two-line popup plus its rise

## 1.7.1 · 2026-11-23
- Fixed a one-frame flicker when the mouse moves onto the big cookie: the cookie, milk and buff glow vanished for a frame (FC's "Frenzy" text is a jCanvas layer, and jCanvas cleared the whole canvas when the mouse left it)
- Infobox: the next ascension only shows a time once it is under 6 hours away (estimates at today's income said years early in a run, though income keeps growing)

## 1.7.0 · 2026-11-23
- Smart ascension (new option, on in Recommended): FC+ ascends by itself, the first time at 440 prestige levels (about a day of play in simulation, with prestige per hour still rising at that point), then whenever ascending doubles your prestige. It waits out Frenzies and click buffs and pops the wrinklers first
- On the ascension screen, FC+ buys the heavenly upgrades before reincarnating: a priority list first (Legacy, Heavenly cookies, the cookie boxes, Season switcher, Kitten angels...), with any upgrades they need, then the rest cheapest first; purely cosmetic ones are skipped. This covers every ascension FC+ makes itself (challenge run exits and the marathon too); yours are left to you
- The infobox shows when the next ascension is due
- With smart ascension off, FC's own "prestige doubled" auto-ascend now works with default settings (it needed a heavenly chips amount above 0, and the default "block during a x1 Frenzy" blocked it at all times)
- Benchmark: `--every=N` adds a checkpoint every N game seconds

## 1.6.0 · 2026-11-23
- Infobox: when the golden cookie bank is below full, a "Why not full" line says why: a purchase raised the income so the bank to aim for grew, FC kept a smaller bank to buy something sooner, something was bought by an FC action that doesn't wait for the bank (named), you bought something, or cookies were lost to a wrath cookie or a spell backfire
- Bank rules (new option, on in Recommended) for FC's purchases that didn't wait for the bank:
  - FC's extra upgrades (eggs, sleighs, Fern tea...) and the Halloween switch now wait for the bank
  - Reward cookies are left to FC's normal chain, which buys their buildings one at a time and keeps the bank (FC's shortcut bought all of them at any price, down to zero cookies)
  - The Golden switch is turned on for a click buff only when the extra clicking, at your measured click speed, beats the price of switching on and off
  - The Godzamok combo only fires when its clicking bonus beats what reselling the mines and factories loses
  - The Easter switch during a Cookie Storm only while it costs under a tenth of the bank (its price grows ×1.5 with every season switch)

## 1.5.1 · 2026-11-22
- Store badges: the income gain and share of production numbers are coloured, green for the biggest down to grey for the smallest

## 1.5.0 · 2026-11-22
- UI tricks (on in Recommended) now also earn Cookie-dunker and, at Christmas, Baby it's old outside
- Shadow achievements (new option, on in Recommended): God complex, In her likeness, Last Chance to See, and When the cookies ascend just right (the bank is set to exactly 1 trillion before FC ascends)
- Challenge runs add Speed baking I–III: after Neverclick, a Born Again run clicks flat out for 1 million cookies within 15 minutes (reached in about 10 minutes in simulation)
- Achievement Hunter: No time like the present (sends itself a gift, redeems it after the game's 1-hour cooldown; needs Wrapping paper)
- Ascension marathon (new option, off): Endless cycle, ascending each time a run is worth one more prestige level (the game doesn't count ascensions without one)
- Cheat achievements (new option, off): Cheated cookies taste awful and Four-leaf cookie, faked for one achievement check and put back
- Clicking is counted at the game's real maximum of 50 clicks per second, whatever the autoclicker is set to
- Challenge runs only ever end Born Again runs FC+ started itself
- The achievement tracker files every one of these under the option that earns it, and only luck/time ones stay manual

## 1.4.0 · 2026-11-22
- Measured click speed (on by default): the real clicks per second are measured and used for time estimates and for how FC values click upgrades; the infobox shows "measured (set to …)"
- Store insight, Cookie Monster style (on by default): every building and store upgrade is coloured by how good a buy it is compared with the best one now (green → yellow → orange → red → purple)
- Building rows show the income gain of one more and the building's share of production
- Building and upgrade tooltips show rating, income gain, payback time, price and when it is affordable, plus share and output per building
- New "Where your cookies come from" section in the Frozen Cookies menu: income by source and by building

## 1.3.0 · 2026-11-22
- First-run scoring (new option, on in Recommended): before the first ascension, purchases are rated by Cookie Monster's payback period; measured +52% cookies after 30 min and +16% after 1 h on a new save

## 1.2.0 · 2026-11-22
- Smart bulk buy (new option, on in Recommended): with the store on x10/x100, FC buys only as many buildings as fit above its golden cookie bank and are still the best value, instead of as many as it can afford
- During a Neverclick run FC no longer counts the paused autoclicker when choosing purchases (it was buying click upgrades instead of buildings)
- "Recommended" is now the first option in the Frozen Cookies menu

## 1.1.3 · 2026-11-22
- Infobox: once the earliest golden cookie time has passed, the line says it could appear any moment instead of "between and …"
- Infobox: "Buying next" shows the price and a real wait time; times no longer count the autoclicker while it is paused for Neverclick (it said "now" when the purchase was minutes away)

## 1.1.2 · 2026-11-22
- Challenge runs: on a save that never ascended, the infobox now says the current run is going for Neverclick without clicking, instead of talking about the next reincarnation

## 1.1.1 · 2026-11-22
- The Plus lines of the infobox (sugar lumps, garden, stocks) show up immediately instead of after a few seconds

## 1.1.0 · 2026-11-22
- Readable infobox: a dark panel above the progress wheel says in plain words what is bought next, what it works toward, the golden cookie bank and the next golden cookie
- The infobox also lists what is being hunted: sugar lump target, garden breeding, stocks, achievements waiting on an event and the closest milestones

## 1.0.0 · 2026-11-22
- First release: Frozen Cookies (erbkaiser's fork, erb-2.052.8) for Cookie Clicker on Steam 2.053, bundled as one local mod that downloads nothing
- Achievement Hunter: news ticker, bakery name, tiny cookie, madeleine, selling a grandma, unripe lump, wrinkler poking, loan before ascending, Elder Pledge and Covenant
- Challenge runs: Born Again runs without clicking (Neverclick, True Neverclick) and without upgrades (Hardcore), then back to a normal run
- Auto-lumps: minigames first, then every building to level 10; Auto-garden: breeds every seed; Auto-stocks: buys low, sells high
- Achievement tracker in the FC menu: every missing achievement and which option handles it
