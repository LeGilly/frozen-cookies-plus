# FC+ — where we left off (2026-11-25, evening)

## Status
- 1.12.5 committed (no ascension at boot before the minigames load), with the maintainer docs.
  Nothing pending in the folder.
- MAINTAINING.md extended (owner workflow, patterns, pitfalls), docs/GAME_NOTES.md (verified
  mechanics) and docs/HUB_BRIEF.md (for the hub listing, handled in another discussion) added.
- Next suggested: completion mode (below), or repairing the benchmark to answer the open questions.

## To watch in the next runs (reported, not verified in game yet)
- Wrinkler poker should come during the research window of the next run (before Elder Pact).
- 1.12.5: after a relaunch, the infobox shows "checking goals (game still loading)" for ~15 s, and a
  growing seed still holds the ascension.

## Upgrade completion (1.12.0 has the tracker; next steps)
- Completion mode, once achievements are done: buy what FC skips (Chocolate egg just before
  ascending), pet the dragon at level 8+ for its 4 drops (1 in 20 per pet, drop depends on the
  minute), then one long run cycling every season until all its drops are owned (season drops are
  cleared at ascension; Keepsakes keeps 1 in 5). Elder Pact and the 10 pledges are done (1.12.1).
- Heavenly: buy the cosmetic heavenly upgrades too, late, for 100% of those.

## Done today (details in CHANGELOG.md)
1.11.4–1.12.5: market wiped at ascension handled, garden seed hold, wrinkler poking protected,
Elder Pact + 10 pledges via the Covenant cycle, upgrade tracker, Christmas resting season,
+2 h hold extension for nearly-done goals, shorter infobox lines, boot guard for ascension.

## Benchmark (tools/benchmark.mjs, scenario `lategame`, saved as work in progress)
Fix first, before trusting any result:
1. Golden cookies (and reindeer) come far too rarely: 2 per game hour instead of ~20. Likely
   their timers are set in frames at 30 fps before the benchmark switches to 5 fps; also check
   that FC's Golden switch isn't left on in the late-game settings.
2. Some runs hung for over 10 minutes. Not found yet. To find: pause the page with the Chrome
   debugger (CDP Debugger.pause) during a hang and read the call stack. `--walllimit=N` doesn't
   help when a single frame hangs.

Then run:
- Combos: variants `recommended`, `doublecast`, `consistency`, about 6 seeds × 8 game hours,
  `--clicks=40`. A game hour takes ~25 s when it works, so about an hour in total.
- Seasons: Christmas vs Business Day as the resting season, to put a measured number on it.
- Wrinklers: after Elder Pact, FC pledges whenever it rates it worth it (golden cookies instead of
  wrath cookies), so most of each run has no wrinklers. Compare that with never pledging and
  farming wrinklers (10 wrinklers multiply output several times, but FC's auto-wrinkler pops them
  often). Variants: FC pledging (now), no pledging + FC popping, no pledging + popping only at
  ascension.

## Combo plan (after the benchmark)
1. Sugar frenzy (×3 for an hour, one lump, once per ascension): use it in the last hour before
   the expected ascension (smart ascension knows when), or during a big combo inside that window.
2. Aura swaps only for a predicted Force the Hand of Fate combo. Swap cost is 2 top buildings,
   bounded by 2 × (P + 0.15 × E) (P = price of the next one, E = the combo's payout); swap only
   when the extra payout beats that.
3. Combo-aware magic: hold magic for a known-good spell until a natural Frenzy + Building special,
   lump refill when it saves a big combo.
4. Maybe: Elder frenzy combos with Godzamok, garden plants for golden cookies.
