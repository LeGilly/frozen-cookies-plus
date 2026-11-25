# Changelog

## 1.12.2 · 2026-11-25
- Apply recommended options now rests in Christmas instead of Business Day. Reindeer bring a minute of production each (about +25% income, up to +100% with Reindeer baking grounds and Ho ho ho-flavored frosting), while Business Day only helps with Startrade (golden cookies 5% more often). It also brings Reindeer sleigher (200 reindeer) and Santa's last level, which must happen within one run. FC still switches to the other seasons for their drops and comes back. Press the button again to pick it up

## 1.12.1 · 2026-11-25
- Elder Pledges in under a minute: buying the Elder Covenant ends the running pledge, and revoking it makes the Elder Pledge available again on the next frame (with Elder Pact). FC+ cycles Pledge, Covenant, Revoke, about one pledge every 4 seconds, for a few cookies each (the pledge, 66.7 trillion for the Covenant, 6.7 billion to revoke) instead of waiting 30 minutes per pledge. It goes to 10 pledges every run: besides Elder nap, Elder slumber and Elder calm, 10 pledges in one run unlock the Sacrificial rolling pins upgrade (needed for a complete run, cleared at ascension). It ends with the Covenant revoked, and waits while a wrinkler is being poked for Wrinkler poker or a shiny one is kept (each pledge pops every wrinkler)

## 1.12.0 · 2026-11-25
- Upgrade tracker, for a complete run (the game's "Upgrades unlocked" stat counts 716 regular, cookie and research upgrades, owned in the same run: ascending clears them, and clears the season drops too). The FC menu shows the count this run and for heavenly upgrades, and "Show missing upgrades" lists each missing one by source with what it needs: in the store, cookies baked, buildings, heavenly upgrades, research, kittens (milk), clicking, golden cookies, each season, the garden, the dragon, the news ticker, Elder Pledges. The infobox gets a one-line summary. It changes nothing in what FC buys (that is the next step)
- Stock market: the game resets the market at every ascension. Stock still held is lost (not sold), and brokers and their fee cuts start again from zero. Selling never counts as cookies baked, so stock only helps by paying for buildings during the run. With smart ascension on, FC+ stops buying stock and hiring brokers when the next ascension is under 2 hours away, and sells anything already in profit, even if the price isn't high yet
- Stock market: the stock bought towards the next broker is counted per run (it was counted across runs, but brokers don't carry over), and so are the purchase prices with fees
- Smart ascension also waits for a new seed growing in the garden (one whose seed you don't have yet) to mature, within the same 8 hours at most. The game clears the plot at ascension, and a seed only unlocks when its plant is harvested mature, so a mutation that took hours of breeding to show up was lost. The rest of the garden, the Pantheon and the Grimoire were already fine after an ascension: the garden bot replants the empty plot, FC puts the gods back into the emptied slots (3 fresh swaps), and the Grimoire starts again with full magic
- Wrinkler poker: FC's auto-wrinkler popped fresh wrinklers within seconds, while FC+ poked only once every 2 seconds (50 pokes took nearly 2 minutes), so the achievement never came. The wrinkler being poked is now left alone by FC's popping until it has its 50 pokes, and it is poked about once a second, as fast as it heals (about a minute in all)
- Elder Pact is bought once researched while Elder slumber or Elder calm are missing (with the Elder Pledge option). The pledges only unlock with it, but FC never buys it on its own (it turns every golden cookie into a wrath cookie, which FC scores as no gain), so smart ascension waited the full 8 hours on "research (1 step to Elder Pact)" and the pledge achievements never came

## 1.11.3 · 2026-11-25
- Permanent upgrade slots: buying one on the ascension screen opened the game's "Pick an upgrade to make permanent" prompt, which then sat there. FC+ now closes it and fills every owned slot with last run's upgrades worth the most there: each is scored by the production it adds (measured by removing it alone) times how late in a run it normally comes (from its price against everything baked in the run; season and Santa upgrades count as late). Late kitten upgrades come first (milk comes from achievements, so they work fully from the start), then Santa's dominion; expensive flavored cookies only add about 5% each. Reassigned at every ascension FC+ makes

## 1.11.2 · 2026-11-25
- Stock market: brokers are only hired once they pay for themselves. A broker costs 20 minutes of the highest raw production ($1,200 in market dollars) and saves about 1% of each purchase, so the first one only pays off after $120,000 of stock has been bought. 1.11.1 hired them whenever they fitted above the bank. The infobox shows the current fee and how much stock the next broker waits for

## 1.11.1 · 2026-11-25
- Stock market: FC+ hires brokers before trading, whenever one fits above the golden cookie bank (each costs 20 minutes of raw production and cuts the 20% buying fee by 5%; FC's own hiring only ran when its next purchase was a building, so it rarely did)
- Stock market: a good is only sold for at least 5% more than it cost with fees. Before, the 5% was counted on the price before fees, so a "profitable" sale could lose up to 15% to the fee

## 1.11.0 · 2026-11-25
- Heavenly upgrades: Persistent memory (research 10x as fast, 500 chips) now comes before Season switcher. While saving for an upgrade out of reach, later ones on the priority list costing at most half as much are still bought; before, everything waited (with 945 chips, Persistent memory waited for Season switcher's 1,211)
- Smart ascension waits for one-time goals still in reach before ascending, at most 8 hours per run: research up to Elder Pact once you own Persistent memory (wrinklers and the Elder Pledge come from it; without it, the 4.5 hours are better spent ascending to buy it), 5 Elder Pledges and the Covenant, 200 reindeer and Santa's final form at Christmas. These only count within one run (research, pledges, the reindeer count and Santa's level reset at every ascension), and prestige doubled before they could finish. The infobox shows what it waits for and how long at most

## 1.10.1 · 2026-11-24
- Infobox: when FC keeps no golden cookie bank (usually early in a run), the bank line says so and compares the two scores FC uses: how fast a Lucky! bank would pay for itself, against the next purchase. FC starts the bank once the bank's score is lower

## 1.10.0 · 2026-11-24
- Sugar lumps: the plan is the same whatever a run has bought so far. When the next building in the plan isn't owned yet (a building can only be levelled once you own one), the lumps wait for it instead of going to Farm level 2 and the plan switching back. Level targets now go from the costliest building down, cursors last; extra levels by production per lump wait until you own every building
- Dragon training timing (new option, on in Recommended): a level that takes 100 of a building (or 50/200 of every building) waits until buying them back costs under 10 minutes of income; levels that cost cookies wait for the golden cookie bank. FC trained as soon as it could
- Recommended is now a button ("Apply recommended options") instead of an on/off option, which restarted the game and then always showed OFF
- Infobox: a "Dragon" line shows the next training, its cost and what it waits for
- Burst buying (new option, on in Recommended): when far more cookies than the next purchase come in at once, FC+ buys up to 10 more things per round from the same ranking and buildings several at a time (each within 2x the best other purchase's score), with one recalculation. In a test windfall of a month's income, 10 seconds bought 325 things and doubled production instead of 64 things

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
