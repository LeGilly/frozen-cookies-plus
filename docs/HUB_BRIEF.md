# Frozen Cookies Plus: brief for the hub (legilly.com)

Facts to describe this project on the hub, collected in the FC+ discussion. Check `CHANGELOG.md` for the
current version before quoting it.

## What it is

- A mod for **Cookie Clicker on Steam** (2.053) that plays the game for you: an extended version of the
  Frozen Cookies automation mod (erbkaiser's fork, kept unmodified inside), with "Plus" features on top.
- **Not a website and not on the Steam Workshop**: a local mod, installed by unzipping a release into
  `…\steamapps\common\Cookie Clicker\resources\app\mods\local\`. So, unlike the other hub projects, there is
  nothing to open in the browser: the hub can only link to the repository, the README and the releases.

## Links

- Repository: https://github.com/LeGilly/frozen-cookies-plus
- Releases (zip per version, notes from the changelog): https://github.com/LeGilly/frozen-cookies-plus/releases
- Install and options: `README.md`; history: `CHANGELOG.md`.

## Features worth listing (as of 1.12.5)

- An **infobox** on the left panel: what FC buys next and when, the golden cookie bank, the next ascension
  and what it waits for, the next golden cookie, the dragon, sugar lumps, garden, stock market.
- **Store insight**: colour-coded badges with each building's share of income and the gain of the next one.
- **Smart ascension**: first ascension at 440 prestige levels, then whenever prestige doubles; buys the
  heavenly upgrades itself and fills the permanent upgrade slots; waits (up to 8–10 hours) for one-time goals
  that only count within a run.
- **Achievement and completion hunting**: shadow achievements, challenge runs (Born Again), the Elder Pledges,
  wrinkler poking, an upgrade tracker for a 100% run (716 upgrades, where each missing one comes from).
- **Minigame bots**: garden breeding until every seed is unlocked, stock trading with brokers, sugar lump
  planning, smart dragon auras and training.
- **Smarter spending**: rules for when FC may dip into the golden cookie bank, burst buying (x10/x100) when
  income spikes, first-run and research scoring.
- One button, **Apply recommended options**, turns everything on.
- Tested automatically (Playwright, against the real game) on every push; a release is published when the
  version changes.

## Tone notes

- The owner plays it himself; it's a hobby project built over many sessions with Claude.
- It automates a single-player idle game; "cheats" in the options refer to the game's own cheat achievement.
