# Maintaining Frozen Cookies Plus

> **Start with the hub's `MAINTAINING.md`** (repo `LeGilly.github.io`, or
> https://github.com/LeGilly/LeGilly.github.io/blob/main/MAINTAINING.md): how the owner works, versions and
> releases, and how tests run. This file only covers what's specific to Frozen Cookies Plus.
>
> Unlike the other projects this is **not a website**: it's a local mod for Cookie Clicker on Steam, so the
> legilly.com site rules (content security policy, shared bar and themes, GitHub Pages) don't apply.

## Layout

| Path | What it is |
|---|---|
| `frozen_cookies.js` | Loader: version (`version`), game versions (`steamGameVersion`, `lastCompatibleVersion`), file load order |
| `src/fc_*.js`, `src/cc_upgrade_prerequisites.js` | Upstream Frozen Cookies (erbkaiser's fork, erb-2.052.8), **unmodified** |
| `src/fcp_core.js` | Plus: new options in the FC menu, scheduler (wraps `FCStart`), helpers, achievement tracker in the menu |
| `src/fcp_achievements.js` | Achievement Hunter, Elder Pledge, challenge runs (Born Again: Neverclick, Speed baking, Hardcore; wraps `Game.Ascend`, `Game.Reincarnate`, `fcClickCookie`), tracker categories |
| `src/fcp_bankrules.js` | Bank rules: wraps `autoGSBuy`, `autoGodzamokAction`, `autoEasterAction`, `autoHalloweenAction`, `buyOtherUpgrades` (with `Game.Upgrade.prototype.buy`) and `isRewardCookie`. Loaded before fcp_bankwatch.js so the bank watcher sees the wrapped versions |
| `src/fcp_dragon.js` | Smart dragon auras: tries each pair of known auras with `Game.CalculateGains()` (with `Game.Win` stubbed so nothing is won from a pair not worn), switches by setting `Game.dragonAura`/`dragonAura2` and sacrificing one top building, as the game's confirm button does, without opening the prompt. Wraps `Game.UpgradeDragon` to close the dragon menu it opens when it was closed before, and FC's `autoDragonAura0Action`/`autoDragonAura1Action` |
| `src/fcp_ascend.js` | Smart ascension: when to ascend, `FCP.autoAscend(why)` (every ascension FC+ makes goes through it), the heavenly upgrade buyer (`FCP.heavenlyPriority`, wraps `Game.Reincarnate`), and the autoCookie wrapper that sets FC's own auto-ascend aside |
| `src/fcp_bankwatch.js` | Why the golden cookie bank is below full. Wraps `Game.Spend`, `Game.Upgrade.prototype.buy`, each building's `buy`, `Game.storeBuyAll`, `Game.UpgradeSanta`, `Game.UpgradeDragon`, `autoCookie` and FC's actions that skip the bank (`autoGSBuy`, `buyOtherUpgrades`, season, dragon, bank office, Godzamok, reward cookies) to note what was bought and by whom. `FCP.addTask` files a task's spending under "FC+ (name)" |
| `src/fcp_shadow.js` | UI tricks, shadow achievements, the gift, the ascension marathon and the cheats. Check-frame tricks wrap `Game.Logic`: applied only on frames where `Game.T % (5*fps) == 0` and undone after the frame |
| `src/fcp_lumps.js`, `src/fcp_market.js`, `src/fcp_garden.js` | Sugar lumps, stock trading, garden breeder (recipes mirror the game's `M.getMuts`) |
| `src/fcp_bulk.js` | Smart bulk buy: caps FC's building purchases (wraps `autoCookie` and `safeBuy`). Burst buying: more units and up to 10 extra purchases per autoCookie round when the spare cookies cover the next purchase 10 times |
| `src/fcp_scoring.js` | First-run scoring: Cookie Monster's payback period before the first ascension (wraps `purchaseEfficiency`). Research chain scoring wraps `upgradeStats`: chain upgrades are scored with the next research (toggled with `upgradeToggle` and put back) |
| `src/fcp_clicks.js` | Measured click speed (wraps `baseClickingCps`; `FCP.cookieRate` for estimates) |
| `src/fcp_insight.js` | Store insight: ratings from FC's `recommendationList`, store badges, tooltips (wraps building `tooltip` and `Game.crateTooltip`), income breakdown |
| `src/fcp_infobox.js` | The infobox panel: HTML overlay above FC's wheel (wraps upstream `drawCircles`) |
| `vendor/` | jQuery 3.6.0, jQuery UI 1.12.1, underscore 1.8.3, jCanvas 20.1.1, jqPlot 1.0.9 + plugins (licenses alongside) |
| `tools/build.mjs` | Builds `Steam/FrozenCookiesPlus/` (info.txt + one `main.js` with everything inlined) and `dist/*.zip` |
| `tools/benchmark.mjs`, `tools/bench-driver.js` | Benchmark of FC's buying in fast-forward (see Benchmark) |
| `tools/get-game.mjs` | Downloads the game the tests run against into `.game/` |
| `tests/`, `package.json`, `playwright.config.mjs`, `.github/workflows/tests.yml` | The tests |
| `.github/workflows/release.yml` | Publishes the GitHub Release with the zip |
| `docs/UPSTREAM_README.md` | erbkaiser's README: what every upstream FC option does |

`Steam/`, `dist/` and `.game/` are build output and ignored by git.

## Rules for the code

- **Don't edit the upstream files.** Change their behaviour from `fcp_*` files by wrapping globals
  (`FCStart`, `fcClickCookie`, `recommendedSettingsAction`, `drawCircles`, `autoCookie`, `safeBuy`, `purchaseEfficiency`, `baseClickingCps`, building `tooltip`, `Game.crateTooltip`, `Game.Ascend`, `Game.Reincarnate`).
  Wrappers must exist before `registerMod` runs, which the load order in `frozen_cookies.js` guarantees.
  Updating upstream then stays a plain file copy.
- New options go in `FCP.preferenceValues` (fcp_core.js): they show up in the menu, save and load by
  themselves. Use multiple-choice values, not free numbers. Recommended settings switch them on in
  `recommendedSettingsAction` (fcp_core.js).
- Periodic work: `FCP.addTask(name, enabledTest, fn, intervalMs)`. Restarted whenever FC restarts; an
  exception is logged once instead of killing the interval.
- Spend cookies only through `FCP.canSpend(cost)` / `FCP.spare()`, so nothing eats FC's golden cookie bank.
- What a module is doing goes in `FCP.status["Name"]`; the infobox and the menu tracker show it.
- The mod never downloads code: everything is inlined by the build. Keep it that way.

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

- `smoke.spec.mjs`: libraries, one-click achievements, sugar lumps, stocks, the menu tracker and saving.
- `hunter.spec.mjs`: unripe lump, wrinkler poking, Covenant, the loan before ascending, the Neverclick and Speed baking Born Again runs, and leaving a player's own Born Again run alone.
- `lumps.spec.mjs`: the lump plan early in a run (buildings not bought yet) and the target order.
- `dragon.spec.mjs`: dragon training timing, the best known aura, the second slot at the top level, no switching back and forth, off leaves auras alone.
- `ascend.spec.mjs`: the heavenly upgrade list and buyer, the first and doubling ascensions, manual ascensions left alone, FC's doubling mode without a chips amount.
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

## Updating

- **Upstream FC:** copy the new `fc_*.js` and `cc_upgrade_prerequisites.js` from erbkaiser/FrozenCookies
  into `src/`; add any new upstream file to `fcScriptList` (before the `fcp_*` files); check the wrapped
  functions still exist; run the tests.
- **New game version:** diff the game's `M.getMuts` (minigameGarden.js) against `FCP.gardenRecipes` (a
  seed without a recipe is skipped), look for new special achievements for `FCP.classifyAchievement` and
  the hunter, check `M.getRestingVal`, `M.buyGood`, `M.sellGood`; point `GAME_COMMIT` in `tools/get-game.mjs`
  at the new version and run the tests.
