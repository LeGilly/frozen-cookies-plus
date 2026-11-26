# Maintaining Frozen Cookies Plus

> **Start with the hub's `MAINTAINING.md`** (repo `LeGilly.github.io`, or
> https://github.com/LeGilly/LeGilly.github.io/blob/main/MAINTAINING.md): how the owner works, versions and
> releases, and how tests run. This file only covers what's specific to Frozen Cookies Plus.
>
> Unlike the other projects this is **not a website**: it's a local mod for Cookie Clicker on Steam, so the
> legilly.com site rules (content security policy, shared bar and themes, GitHub Pages) don't apply.

Also read: [`docs/GAME_NOTES.md`](docs/GAME_NOTES.md) (game and FC mechanics verified in the code, with
the surprises found so far) and [`TODO.md`](TODO.md) (where work stands and what comes next).
[`docs/HUB_BRIEF.md`](docs/HUB_BRIEF.md) describes the project for its listing on the hub.

## How the owner works on FC+

- **Local only, not on the Steam Workshop.** The owner plays with it on Steam and reports what he sees,
  usually with a screenshot of the infobox, the store or a tooltip. Read the screenshot carefully before
  answering: most reports are "does this look right?", and the answer can be a bug nobody asked about.
- **Folder:** his local clone under `Documents\GitHub\frozen-cookies-plus` (he gives the full path in the discussion). He commits and pushes himself with
  GitHub Desktop; never commit or push for him. Write the changed files into that folder, then **read them
  back and diff** against what you meant to write (an earlier session wrote stale copies when reusing the
  same staging path; use a fresh output folder per batch).
- **Every change he will commit is a new version:** bump `version` in `frozen_cookies.js`, add a
  `CHANGELOG.md` entry (a test checks they match), update `README.md` when an option or behaviour changes,
  run the whole suite, then give him a one-line commit summary (`1.12.5: …`). He says "committed" or
  "pushed"; once a version is pushed, further changes go into the next version, not into it. If he hasn't
  committed yet, follow-up fixes can go into the same version.
- **Questions first, then changes:** he often asks "why does it do X?" or "is it worth it?" before deciding.
  Answer from the game code (`.game/main.js` and the minigame files), not from memory: several of his
  assumptions and several of ours turned out wrong (see GAME_NOTES.md). Say what you checked. For bigger
  or debatable changes, explain the options with numbers and wait for his go; for clear bugs, fix them.
  "Plan mode only" means: no code.
- **His preferences for the bot's behaviour** (consistent over many sessions):
  - Replicate the in-game rules even where the code would allow more (e.g. only level a building you own).
  - Patience beats waste for rare resources: wait for the right sugar lump target, let a nearly finished
    goal finish (hold extension), don't cut a run short of a one-time goal.
  - He wants **every achievement and every upgrade** eventually (a complete save), so one-time goals that
    only count within a run deserve a hold before ascending.
  - Performance matters when income bursts (burst buying uses x10/x100).
  - Everything FC+ does should be visible in the infobox, briefly: he asked for shorter lines rather than
    collapsible sections.
  - Options are switched on by **Apply recommended options** (a button, not a toggle); new options default
    to off and Recommended turns them on.
- **Long-running work** (benchmarks) needs an estimate before starting; he may stop it ("stop here").
- He sometimes writes a quick note for later: put it in `TODO.md` (in his folder) so the next session sees it.

## Layout

| Path | What it is |
|---|---|
| `frozen_cookies.js` | Loader: version (`version`), game versions (`steamGameVersion`, `lastCompatibleVersion`), file load order |
| `src/fc_*.js`, `src/cc_upgrade_prerequisites.js` | Upstream Frozen Cookies (erbkaiser's fork, erb-2.052.8), **unmodified** |
| `src/fcp_core.js` | Plus: new options in the FC menu (with their `recommended` values), scheduler (wraps `FCStart`), shared helpers (see Rules for the code), achievement tracker in the menu |
| `src/fcp_achievements.js` | Achievement Hunter (wrinkler poking every 700 ms, protected from FC's popping; popping wrinklers as they come out until 200 this run, `FCP.popWrinklers`; the gift for No time like the present), Elder Pledge (buys Elder Pact, then 10 pledges a run by cycling Pledge → Covenant → Revoke, then the Covenant left on unless `FCP.wrinklersWanted()`), challenge runs (Born Again: Neverclick, Speed baking, Hardcore; wraps `Game.Ascend`, `Game.Reincarnate`, `fcClickCookie`), tracker categories; with the Elder Pledge option, FC's autobuy is kept off the Pledge, Covenant and Revoke (wraps `isUnavailable`) |
| `src/fcp_bankrules.js` | Bank rules: wraps `autoGSBuy`, `autoGodzamokAction`, `autoEasterAction`, `autoHalloweenAction`, `buyOtherUpgrades` (with `Game.Upgrade.prototype.buy`) and `isRewardCookie`. Loaded before fcp_bankwatch.js so the bank watcher sees the wrapped versions |
| `src/fcp_dragon.js` | Smart dragon auras: tries each pair of known auras with `Game.CalculateGains()` (with `Game.Win` stubbed so nothing is won from a pair not worn), switches by setting `Game.dragonAura`/`dragonAura2` and sacrificing one top building, as the game's confirm button does, without opening the prompt. Wraps `Game.UpgradeDragon` to close the dragon menu it opens when it was closed before, and FC's `autoDragonAura0Action`/`autoDragonAura1Action` |
| `src/fcp_ascend.js` | Smart ascension: when to ascend (440 levels the first time, then when prestige doubles), one-time goal holds (`FCP.ascendHolds`: research to One mind or Elder Pact by missing achievement or this run's pledges, `FCP.researchTarget`, `FCP.RESEARCH_GOALS`; `FCP.researchTick` buys the steps FC scores as no gain, 200 wrinkler pops, pledges, a new garden seed, 200 reindeer, Santa; at most 8 h, +2 h for a goal nearly done, `FCP.holdLeft`), the boot guard (`FCP.gameSettled`: minigames loaded and 15 s after start), `FCP.autoAscend(why)` (every ascension FC+ makes goes through it), the heavenly upgrade buyer (`FCP.heavenlyPriority`, wraps `Game.Reincarnate`), permanent upgrade slots (scored by effect × lateness), and the autoCookie wrapper that sets FC's own auto-ascend aside; no time limit: `FCP.liveHolds` drops a goal whose number (count, plant age) hasn't moved for `FCP.HOLD_STALL_HOURS`, kept per run in the `fcpHoldProgress` store |
| `src/fcp_bankwatch.js` | Why the golden cookie bank is below full. Wraps `Game.Spend`, `Game.Upgrade.prototype.buy`, each building's `buy`, `Game.storeBuyAll`, `Game.UpgradeSanta`, `Game.UpgradeDragon`, `autoCookie` and FC's actions that skip the bank (`autoGSBuy`, `buyOtherUpgrades`, season, dragon, bank office, Godzamok, reward cookies) to note what was bought and by whom. `FCP.addTask` files a task's spending under "FC+ (name)"; keeps a one-minute log of every spend (`FCP.spendLog`, `FCP.spentLately()`) for the infobox's "Spent last minute" line. FC+ names what it buys with `FCP.withSpend("spendItem", ...)` when the game's function doesn't say (stocks, brokers, seeds) |
| `src/fcp_shadow.js` | UI tricks, shadow achievements, the ascension marathon and the cheats. Check-frame tricks wrap `Game.Logic`: applied only on frames where `Game.T % (5*fps) == 0` and undone after the frame |
| `src/fcp_lumps.js` | Sugar lumps: minigames first (needs the building owned), then level targets (Farm, Bank, Wizard tower, Temple, then costliest down, Cursor 12 last), then best CpS per lump once every building is owned |
| `src/fcp_market.js` | Stock trading: buys low, sells only above what was paid with fees (`FCP.stockPaid`), hires brokers when this run's volume pays for them (`FCP.brokerWorth`), stops buying and takes any profit within 2 hours of a smart ascension (`FCP.ascensionSoon`), since the market is wiped at ascension |
| `src/fcp_garden.js` | Garden breeder (recipes mirror the game's `M.getMuts`), harvest farming, the sacrifice. Rebuilds the plot from scratch every tick, so an emptied plot (ascension) needs nothing special; fertilizer while a new seed's plant grows (`FCP.newSeedGrowing`) |
| `src/fcp_bulk.js` | Smart bulk buy: caps FC's building purchases (wraps `autoCookie` and `safeBuy`). Burst buying: more units and up to 10 extra purchases per autoCookie round when the spare cookies cover the next purchase 10 times |
| `src/fcp_upgrades.js` | Upgrade tracker: upgrades the run is missing for the game's "Upgrades unlocked" stat, grouped by where they come from (`FCP.upgradeSource`), shown in the FC menu and summed up in the infobox. Read-only |
| `src/fcp_scoring.js` | First-run scoring: Cookie Monster's payback period before the first ascension (wraps `purchaseEfficiency`). Research chain scoring wraps `upgradeStats`: chain upgrades are scored with the next research (toggled with `upgradeToggle` and put back) |
| `src/fcp_clicks.js` | Measured click speed (wraps `baseClickingCps`); the shared click helpers: `FCP.autoclicking()`, `FCP.realClickRate()` (clicks/s really happening), `FCP.cookieRate()` (for estimates) |
| `src/fcp_insight.js` | Store insight: ratings from FC's `recommendationList`, store badges, tooltips (wraps building `tooltip` and `Game.crateTooltip`), income breakdown |
| `src/fcp_season.js` | Smart season: sets `FrozenCookies.defaultSeason` (FC visits seasons for their drops, then rests in it). Christmas while `FCP.christmasGoals()`, else the best of `FCP.seasonValues()` (reindeer vs golden cookies × Star upgrade), 10% margin to switch back; after a Cookie storm's switch to Easter (wraps `autoEasterAction`), switches back to the season it left (`fcpStormReturn` store) |
| `src/fcp_infobox.js` | The infobox panel: HTML overlay above FC's wheel (wraps upstream `drawCircles`) |
| `vendor/` | jQuery 3.6.0, jQuery UI 1.12.1, underscore 1.8.3, jCanvas 20.1.1, jqPlot 1.0.9 + plugins (licenses alongside) |
| `tools/build.mjs` | Builds `Steam/FrozenCookiesPlus/` (info.txt + one `main.js` with everything inlined) and `dist/*.zip` |
| `tools/benchmark.mjs`, `tools/bench-driver.js` | Benchmark of FC's buying in fast-forward (see Benchmark) |
| `tools/get-game.mjs` | Downloads the game the tests run against into `.game/` |
| `tests/`, `package.json`, `playwright.config.mjs`, `.github/workflows/tests.yml` | The tests |
| `.github/workflows/release.yml` | Publishes the GitHub Release with the zip |
| `docs/UPSTREAM_README.md` | erbkaiser's README: what every upstream FC option does |
| `docs/GAME_NOTES.md` | Game and FC mechanics verified in the code |
| `docs/HUB_BRIEF.md` | What to say about FC+ on the hub (legilly.com) |
| `TODO.md` | Where work stands and the next steps |

`Steam/`, `dist/` and `.game/` are build output and ignored by git.

## Rules for the code

- **Don't edit the upstream files.** Change their behaviour from `fcp_*` files by wrapping globals
  (`FCStart`, `fcClickCookie`, `recommendedSettingsAction`, `drawCircles`, `autoCookie`, `safeBuy`, `purchaseEfficiency`, `baseClickingCps`, building `tooltip`, `Game.crateTooltip`, `Game.Ascend`, `Game.Reincarnate`).
  Wrappers must exist before `registerMod` runs, which the load order in `frozen_cookies.js` guarantees.
  Updating upstream then stays a plain file copy. A wrapper installed again from a task (it checks
  whether it is already there) goes through `FCP.wrapOnce(obj, name, tag, make)`: it carries over the
  markers of other FC+ wrappers on the same function, so two modules can wrap it in either order.
- New options go in `FCP.preferenceValues` (fcp_core.js): they show up in the menu, save and load by
  themselves. Use multiple-choice values, not free numbers. Give each a `recommended:` value next to its
  `default:`: **Apply recommended options** sets every option that has one (no separate list to keep up).
- Periodic work: `FCP.addTask(name, enabledTest, fn, intervalMs)`. Restarted whenever FC restarts; an
  exception is logged once instead of killing the interval.
- Spend cookies only through `FCP.canSpend(cost)` / `FCP.spare()`, so nothing eats FC's golden cookie bank.
  Read the bank itself with `FCP.bankTarget()`, never `delayAmount()` directly.
- A call into FC or the game that may fail (caches not built at boot, a minigame not loaded) goes through
  `FCP.attempt(name, fn, fallback)`, not an empty `catch`: the first failure of each name is reported in
  the console, and the tests count those reports as errors.
- Values kept across reloads: `FCP.store(key, value)` (JSON in localStorage), or `FCP.runStore(key, fresh)`
  for one that only lasts the current run.
- Shared helpers to use instead of rewriting them: `FCP.shortTime` (every time shown), `FCP.escape`,
  `FCP.realClickRate` / `FCP.autoclicking` / `FCP.cookieRate` (fcp_clicks.js), `FCP.medianSpawnFrame`
  (golden cookie and reindeer timing), the Christmas numbers (`FCP.REINDEER_GOAL`, `FCP.santaMax`,
  `FCP.reindeerWanted`, `FCP.reindeerSeconds` in fcp_season.js), `FCP.appendGroups` (menu lists).
- What a module is doing goes in `FCP.status["Name"]`; the infobox and the menu tracker show it.
- The mod never downloads code: everything is inlined by the build. Keep it that way.
- Per-run data in `localStorage` is keyed by `Game.startDate` (a new run starts fresh): `fcpAscendHold`,
  `fcpStockPaid`, `fcpStockVolume`. Others: `fcpChallengeRun`, `fcpGift`.
- **Two bots, one game:** FC and FC+ act on the same things. Before adding behaviour, check what FC already
  does with it (it pops wrinklers, buys pledges, switches seasons, casts spells, buys dragon levels…) and
  wrap FC's function so they don't fight (examples: `shouldPopWrinklers` leaves the poked wrinkler,
  FC's aura actions are blocked under smart auras, FC's auto-ascend is set aside under smart ascension).
- **FC's ratings miss things it doesn't model.** It scores Elder Pact as "no gain" (so never buys it),
  pledges whenever golden cookies beat wrath cookies (no wrinkler income in its model), and ignores
  achievements and completion. FC+ steps in where a goal needs it; leave income decisions to FC unless a
  benchmark says otherwise.
- **The game resets a lot at ascension** (see GAME_NOTES.md): any per-run goal needs a hold or must finish
  before ascending, and any state FC+ keeps must be per run.
- **At boot, minigames load after the save.** Anything that reads a minigame must cope with it missing
  (`minigameLoaded`), and nothing irreversible should happen in the first seconds.
- Infobox lines: short, with `FCP.shortTime(sec)` for durations (two biggest units: "5h 33m").
  Details belong in the README, the option hint or the FC menu tracker.
- A UI the game opens by itself (dragon menu, permanent slot prompt) must be closed again or never opened:
  the owner noticed every time.

## Releasing

- Version: `version` in `frozen_cookies.js` (shown in the FC menu as `v plus.X.Y.Z` and written to info.txt).
  A test checks it matches the newest `CHANGELOG.md` entry.
- Push to `main` → "Tests" runs → if it passes, "Release" builds the mod and creates release `vX.Y.Z` with
  `FrozenCookiesPlus-X.Y.Z.zip` attached, its notes taken from the changelog. A push without a new version
  creates nothing. Releases can also be started by hand (Actions → Release → Run workflow).
- The owner installs by unzipping the release into
  `...\steamapps\common\Cookie Clicker\resources\app\mods\local\` (replacing the old folder).
- `steamGameVersion` (written to info.txt) follows the Steam build of the game; `lastCompatibleVersion` is
  the newest version tested (a console warning appears above it).

## Testing

How tests run (GitHub, locally, keeping them current) is in the hub's `MAINTAINING.md`, "Tests". Here
`npm test` first builds the mod and downloads the game (`tools/get-game.mjs`: the official web version
mirrored at github.com/ozh/cookieclicker, commit `b843fa7` = web 2.052, the same content as Steam 2.053),
then loads the built bundle into it with Electron-like `module`/`exports` globals, as on Steam.

- `smoke.spec.mjs`: libraries, one-click achievements, sugar lumps, stocks (fees, brokers, near-ascension selling, per-run records), the Pantheon and garden after an ascension's reset, the Recommended button (Christmas resting season), the menu tracker and saving.
- `scoring.spec.mjs`: first-run scoring and research chain scoring.
- `hunter.spec.mjs`: unripe lump, wrinkler poking (and FC leaving the poked one alone), Elder Pact then 10 pledges via the Covenant cycle, the Covenant kept on after the pops (FC doesn't revoke it), the loan before ascending, the Neverclick and Speed baking Born Again runs, and leaving a player's own Born Again run alone.
- `lumps.spec.mjs`: the lump plan early in a run (buildings not bought yet) and the target order.
- `dragon.spec.mjs`: dragon training timing, the best known aura, the second slot at the top level, no switching back and forth, off leaves auras alone.
- `ascend.spec.mjs`: the heavenly upgrade list and buyer, the first and doubling ascensions, manual ascensions left alone, FC's doubling mode without a chips amount, goal holds (8 h, +2 h for a goal nearly done, research only with Persistent memory, a new garden seed), the boot guard, permanent upgrade slots.
- `upgrades.spec.mjs`: every missing upgrade gets a source and the totals match the game's stats; the menu list and the infobox line.
- `bankrules.spec.mjs`: the Golden switch and Godzamok worth checks, extra upgrades waiting for the bank, reward cookies.
- `bankwatch.spec.mjs`: each reason the bank is below full.
- `shadow.spec.mjs`: every UI trick, shadow achievement, the gift, the marathon and the cheats, and that each puts the game back as it was.
- `garden.spec.mjs`: forces thousands of garden ticks; all seeds must unlock, then the sacrifice.
- `bulk.spec.mjs`: smart bulk counts (full 100 early, never below the bank, stops at worse value) and FC's autobuy at x100.
- `clicks.spec.mjs`: the click rate measurement and where it is used.
- `insight.spec.mjs`: store colours and badges, tooltips, the income breakdown, and switching it off.
- `infobox.spec.mjs`: the panel's wording, that clicks pass through it, and that it hides when turned off.
- `version.spec.mjs`: version, changelog and info.txt agree.

The tests can't run the Steam app itself; after a release, check once in the game.

Run locally: `rm -rf Steam dist; CI=1 CHROME_PATH=/usr/bin/google-chrome npm test -- --workers=2` (about 4 minutes,
91 tests at 1.12.13). One file: `npx playwright test tests/ascend.spec.mjs`. `tests/game.mjs` has the helpers
(`loadGame`, `richGame`, `setOptions`, `won`, `noErrors`); `loadGame` skips the boot settling delay, and counts
FC+ console warnings and errors (`[FC+] ...`) with the page errors, so `noErrors` fails on them too. Tests that
wait on FC's intervals can be slow when the whole suite runs at once: give them generous poll timeouts.
For a one-off check of the game's data, a throwaway `tests/zz_*.spec.mjs` that logs with `console.log` works well
(delete it afterwards).

## Benchmark (changing how FC chooses purchases)

Any change to how purchases are chosen is measured before it ships: `npm run bench` (or
`node tools/benchmark.mjs --variants=base,cm --seeds=3 --scenarios=fresh,ascended --hours=1`).

- It fast-forwards the real game in a headless browser: the game loop and timers are stopped, the
  clock and randomness are replaced, then `Game.Logic()` and FC's `autoCookie()` run frame by frame at
  5 fps, with no clicking. It reports cookies baked at checkpoints and the gain of each variant vs the first.
- Runs are reproducible: same seed, same result. Golden cookies, reindeer and the grandmapocalypse draw
  from their own random streams, so every variant meets the same golden cookies.
- Variants live in `tools/bench-driver.js` (`variants`). Scenarios: `fresh` (new save, 4 h) and
  `ascended` (10,000 prestige levels and the heavenly upgrades up to 1e6 chips, 1–2 h).
- Speed: about 100 s per 4 game-hours on a fresh save; the first minutes after an ascension are slow
  (FC recalculates after every one of hundreds of purchases, ~190 ms each).
- The `ascended` scenario is chaotic: changing one purchase can send a run on a different path (±50%),
  so use 8+ seeds there and look at medians. The `fresh` scenario is stable with 3 seeds.

Results so far (2026-11-22):

| Variant | fresh 30 min / 1 h / 2 h / 4 h | ascended 30 min (8 seeds) | Shipped |
|---|---|---|---|
| `cm`: Cookie Monster's payback period | +52% / +16% / +5% / +1.2% | −9% (noise) | Before the first ascension only (`fcp_scoring.js`) |
| `recalc`: FC's formula, recalculated every 5 s | 0% everywhere | 0% | No (no effect) |
| `achiev`: count achievements a purchase earns | 0 / 0 / −0.7% / −1.4% | noise | No |
| `bundle`: achiev + "buy to the next building achievement" | 0 / 0 / −0.5% / −0.5% | not run | No |

First ascension timing (1.7.0): `node tools/benchmark.mjs --variants=shipped --seeds=1 --scenarios=fresh --hours=24 --every=3600 --clicks=40`
(about 20 minutes). Prestige levels on a new save: 27 at 12 h, 192 at 20 h, 422 at 24 h; levels per hour were
still rising (9.6/h at 20 h, 17.6/h at 24 h), so ascending earlier earns fewer levels per hour of play.
Hence `FCP.FIRST_ASCEND_LEVELS = 440`.

Late-game scenario (work in progress, 1.10.0): `--scenarios=lategame --variants=recommended,doublecast,consistency --clicks=40`
starts mid-run with 10 million prestige, the minigames (Wizard towers at level 10), a trained dragon, and runs FC's timed
actions (spells, Pantheon, Godzamok, Golden switch, FC+ tasks) in virtual time. One game hour takes about 25 s. Not usable
for results yet: golden cookies come far too rarely (their timers are set in frames before the benchmark lowers the frame
rate), and some runs hung for over 10 minutes for a reason not found yet. `--walllimit=N` stops a run after N real seconds.

Open benchmark questions (also in TODO.md): Christmas vs Business Day as the resting season (1.12.2 chose
Christmas from the numbers in GAME_NOTES.md, not measured); wrinklers (FC pledging as now vs never pledging,
with FC's popping or popping only at ascension); combos (Sugar frenzy timing, aura swaps for Force the Hand of
Fate). The benchmark must be repaired first.

## Updating

- **Upstream FC:** copy the new `fc_*.js` and `cc_upgrade_prerequisites.js` from erbkaiser/FrozenCookies
  into `src/`; add any new upstream file to `fcScriptList` (before the `fcp_*` files); check the wrapped
  functions still exist; run the tests.
- **New game version:** diff the game's `M.getMuts` (minigameGarden.js) against `FCP.gardenRecipes` (a
  seed without a recipe is skipped), look for new special achievements for `FCP.classifyAchievement` and
  the hunter, check `M.getRestingVal`, `M.buyGood`, `M.sellGood`; point `GAME_COMMIT` in `tools/get-game.mjs`
  at the new version and run the tests.
