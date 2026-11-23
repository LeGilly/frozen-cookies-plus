# Frozen Cookies Plus

An automation mod for **Cookie Clicker on Steam (2.053)**, which also works on the web version (2.052–2.058). It is based on Frozen Cookies by Icehawk78 and erbkaiser's maintained fork, plays the game with Frozen Cookies' efficiency maths and adds the pieces needed to chase achievements.

## Install (Steam, local mod)

Download `FrozenCookiesPlus-<version>.zip` from this repository's **Releases** page.

1. Unzip it (or copy the `Steam/FrozenCookiesPlus` folder) into the game's local mods folder. On a default Steam install that is:
   `C:\Program Files (x86)\Steam\steamapps\common\Cookie Clicker\resources\app\mods\local\`
   (In Steam: right-click Cookie Clicker → Manage → Browse local files, then `resources\app\mods\local`.)
2. Disable or remove any other Frozen Cookies mod, since two automation mods conflict.
3. Start the game. Under **Options → Manage mods**, check that *Frozen Cookies Plus* is enabled, then restart if the game asks.
4. Open the **Frozen Cookies** button (top right, where *Info* used to be) and press **Recommended ON**. It sets every option, including the Plus ones, and reloads the game.

Everything is bundled in one `main.js` (libraries included), so the mod works offline and never downloads code.

## What it does

**Frozen Cookies (upstream, erb-2.052.8)**: auto-buy by efficiency, golden cookie / reindeer / fortune / wrinkler clicking, golden-cookie banking, spell casting and combos, Pantheon swaps, dragon training and auras, seasons, bank office and brokers, loans, auto-ascend, stats and graphs.

**Plus additions** (new section in the FC menu, just above *Display options*):

| Option | What it does |
|---|---|
| Achievement Hunter | Earns the interaction achievements: *Tabloid addiction*, *What's in a name*, *Here you go*, *Tiny cookie*, *Olden days*, *Just wrong* (sells one grandma), *Hand-picked* (harvests one unripe lump, 50% success, retried each lump), *Wrinkler poker*, *Debt evasion* (takes a loan right before FC auto-ascends), *No time like the present* (sends itself a gift and redeems it after the game's 1-hour cooldown; needs the *Wrapping paper* heavenly upgrade). |
| UI tricks | For the moment the game checks: a squished window for *Stifling the press*, a short window for *Cookie-dunker*, and at Christmas the mouse held on a Santa's helper grandma for *Baby it's old outside*. |
| Shadow achievements | *God complex* (named Orteil for an instant), *In her likeness* (You customizer set to the grandma look, then yours put back), *Last Chance to See* (pops the shiny wrinkler), *When the cookies ascend just right* (before FC ascends, sells and buys buildings until the bank is exactly 1 trillion). |
| Ascension marathon | *Endless cycle*: the game only counts ascensions that gain a prestige level, so FC ascends as soon as a run is worth one more level, 1,000 times. Best late in the game. Off by default. |
| Cheat achievements | *Cheated cookies taste awful* and *Four-leaf cookie*, faked for one achievement check and put back right after. Off by default. |
| Elder Pledge achievements | Buys Elder Pledge 5 times and the Covenant once, then revokes it (*Elder nap / slumber / calm*). |
| Challenge runs | *Neverclick*, *True Neverclick*, *Speed baking I–III* and *Hardcore* only count in a **Born Again** run. When FC reincarnates and one of them is missing, it reincarnates in Born Again mode: first a run without clicks to 1M (Neverclick), then a run clicking flat out to 1M within 15 minutes (Speed baking, about 10 minutes), with upgrades held until 1B for Hardcore if chosen. Then it ascends back to a normal run by itself. A Born Again run you start yourself is left alone. |
| Auto-lumps | Levels Farm, Bank, Temple and Wizard tower to 1 to unlock the minigames, then finishes one building at a time to level 10 (20 achievements). Cursors go to 12 for the top bank office. The *KEEP LEVELLING* setting keeps levelling the building with the best CpS per lump afterwards. Respects FC's *Sugar Baking Guard* except for the minigame unlocks. |
| Auto-garden | Breeds every seed: it picks the next locked seed, plants its parents in a layout where every empty tile touches all of them, weeds the rest, and harvests new plants when mature. It also manages soil (wood chips / fertilizer) and the weed and spore chains. Once the seed log is complete it keeps the plot full for *Botany enthusiast*, *Green, aching thumb* and *Garden of Eden*. The *SACRIFICE ONCE* setting also sacrifices the garden once for *Seedless to nay* (+10 lumps). |
| Auto-stocks | Buys goods below 70% of their resting value (unless crashing) and sells above 125% at a profit. It only spends cookies FC isn't holding in its golden-cookie bank. |
| Smart bulk buy | With the store on x10/x100, buys only as many of a building as fit above the golden cookie bank and are still better value than any other purchase. Early in a run that is still 100 at a time; later it stops emptying the bank. |
| First-run scoring | Before your first ascension, rates purchases by Cookie Monster's payback period (only the cookies you are still missing count towards the wait), which gets a new save going faster. After an ascension FC's usual rating is kept. |
| Bank rules | FC's purchases that used to skip the golden cookie bank: extra upgrades, the Halloween switch and reward cookie buildings now wait for it; the Golden switch and the Godzamok combo only fire when the extra clicking (at your measured speed) beats their cost; the Easter switch during a Cookie Storm only while cheap. |
| Measured click speed | Measures the real clicks per second (often far below the setting; the game itself ignores clicks faster than 50 per second) and uses it for time estimates and for how FC values click upgrades. |
| Store insight | Cookie Monster-style: every building and store upgrade is coloured by how good a buy it is (green = best buy now, then yellow, orange, red, purple); building rows show the income gain of one more and their share of production, coloured green (biggest) to grey (smallest); tooltips add rating, income gain, payback time and when it is affordable; the FC menu shows where your cookies come from. |

The infobox (bottom left, *Infobox* option under Display) is redrawn as a readable panel above FC's progress wheel. It spells out what FC buys next, what it is working toward, the golden cookie bank (and, when it is below full, why), when the next golden cookie is due and the active buffs. Below that it shows what each Plus module is hunting: sugar lump target, garden breeding, stocks, the achievements still waiting on an event, and the two closest milestone achievements.

The FC menu also gets an **Achievement tracker**: your totals, what each Plus module is doing, and a list of every missing achievement grouped by the option that handles it, with hints for the few that need you (e.g. *Cookie-dunker*: make the window short).

## Good to know

- Steam achievements unlock while the mod runs (`AllowSteamAchievs` is on, as in Frozen Cookies).
- The garden takes a while: completing the seed log is about 4,600 garden ticks, roughly two weeks of play with wood chips (300+ farms).
- Settings are stored in your save under the mod ID `frozen_cookies_plus`, separately from the old Frozen Cookies.

## License

GPL-3.0-or-later, like Frozen Cookies. Bundled libraries keep their own licenses (see `vendor/LICENSE-*`).
