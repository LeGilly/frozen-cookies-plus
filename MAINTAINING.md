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
| `src/fcp_achievements.js` | Achievement Hunter, Elder Pledge, challenge runs (Born Again), tracker categories |
| `src/fcp_lumps.js`, `src/fcp_market.js`, `src/fcp_garden.js` | Sugar lumps, stock trading, garden breeder (recipes mirror the game's `M.getMuts`) |
| `src/fcp_bulk.js` | Smart bulk buy: caps FC's building purchases (wraps `autoCookie` and `safeBuy`) |
| `src/fcp_infobox.js` | The infobox panel: HTML overlay above FC's wheel (wraps upstream `drawCircles`) |
| `vendor/` | jQuery 3.6.0, jQuery UI 1.12.1, underscore 1.8.3, jCanvas 20.1.1, jqPlot 1.0.9 + plugins (licenses alongside) |
| `tools/build.mjs` | Builds `Steam/FrozenCookiesPlus/` (info.txt + one `main.js` with everything inlined) and `dist/*.zip` |
| `tools/get-game.mjs` | Downloads the game the tests run against into `.game/` |
| `tests/`, `package.json`, `playwright.config.mjs`, `.github/workflows/tests.yml` | The tests |
| `.github/workflows/release.yml` | Publishes the GitHub Release with the zip |
| `docs/UPSTREAM_README.md` | erbkaiser's README: what every upstream FC option does |

`Steam/`, `dist/` and `.game/` are build output and ignored by git.

## Rules for the code

- **Don't edit the upstream files.** Change their behaviour from `fcp_*` files by wrapping globals
  (`FCStart`, `fcClickCookie`, `recommendedSettingsAction`, `drawCircles`, `autoCookie`, `safeBuy`, `Game.Ascend`, `Game.Reincarnate`).
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
- `hunter.spec.mjs`: unripe lump, wrinkler poking, Covenant, the loan before ascending and a full Born Again run.
- `garden.spec.mjs`: forces thousands of garden ticks; all seeds must unlock, then the sacrifice.
- `bulk.spec.mjs`: smart bulk counts (full 100 early, never below the bank, stops at worse value) and FC's autobuy at x100.
- `infobox.spec.mjs`: the panel's wording, that clicks pass through it, and that it hides when turned off.
- `version.spec.mjs`: version, changelog and info.txt agree.

The tests can't run the Steam app itself; after a release, check once in the game.

## Updating

- **Upstream FC:** copy the new `fc_*.js` and `cc_upgrade_prerequisites.js` from erbkaiser/FrozenCookies
  into `src/`; add any new upstream file to `fcScriptList` (before the `fcp_*` files); check the wrapped
  functions still exist; run the tests.
- **New game version:** diff the game's `M.getMuts` (minigameGarden.js) against `FCP.gardenRecipes` (a
  seed without a recipe is skipped), look for new special achievements for `FCP.classifyAchievement` and
  the hunter, check `M.getRestingVal`, `M.buyGood`, `M.sellGood`; point `GAME_COMMIT` in `tools/get-game.mjs`
  at the new version and run the tests.
