# Game and FC notes

Mechanics checked in the game's code (`.game/main.js` and `minigame*.js`, Steam 2.053 = web 2.052) or in
upstream FC (`src/fc_*.js`) while building FC+. When a question comes up, check the code again rather than
trusting memory: several of these contradicted what the owner or we assumed. Line numbers drift; search for
the function names.

## Ascension

- `Game.Ascend` shows the ascension screen; `Game.Reset` only runs at `Game.Reincarnate`. On the ascension
  screen the game still has last run's state.
- Reset at every ascension (non-hard reset): upgrades bought (except heavenly), buildings, research,
  `pledges`, `reindeerClicked`, `santaLevel`, the dragon's level is kept but buildings go, and **season
  drops are locked again** (Keepsakes keeps 1 in 5 per drop; only upgrades with `lasting`, like the garden
  drops, stay unlocked).
- Minigames reset too (`minigame.reset()`, not hard):
  - **Stock market:** brokers, office level, profit, every good's stock and `prev` go to 0. Stock held is
    lost, not sold. Selling never adds to cookies baked, so stock can't add prestige directly.
  - **Garden:** plot emptied, soil back to dirt. Unlocked seeds and the total harvest count stay. A seed only
    unlocks when its plant is harvested mature, so a mutation still growing is lost.
  - **Pantheon:** every god out of its slot, 3 swaps. FC puts them back.
  - **Grimoire:** magic full, spells cast this run back to 0 (lifetime total kept).
- The game only counts an ascension that gains a prestige level (the marathon ascends when the next level
  is reached).
- The game's "Upgrades unlocked" stat counts upgrades bought **in the current run** in pools '', 'cookie' and
  'tech' (`Game.CountsAsUpgradeOwned`): 716 in 2.053. Toggles (Elder Pledge, Covenant, switches) and
  heavenly upgrades don't count; heavenly have their own count (129).
- At boot the save loads at once, but each minigame's script loads a moment later (`Game.LoadMinigames`,
  `setTimeout` + script tag, then `Game.scriptLoaded` sets `minigameLoaded` and loads its save).

## Heavenly upgrades

- Persistent memory is a **heavenly** upgrade (500 chips, parent Legacy): research ×10 faster
  (`Game.baseResearchTime` = 30 minutes per step without it).
- Star season upgrades (Starspawn, Starsnow, Starterror, Starlove, Startrade) cost 111,111 chips each.
  Startrade: golden cookies +5% more often during Business Day. The others: +2% during their season.
- Permanent upgrade slots: buying one calls `Game.AssignPermanentSlot`, which opens a prompt. Eligible:
  bought, unlocked, not `noPerm`, pool '' or 'cookie'.
- FC never buys heavenly upgrades (FC+ does, in `fcp_ascend.js`).

## Golden cookies and seasons

- The golden cookie timer: `minTime`/`maxTime` are set when the last one disappears (upgrades bought later
  apply to the next one). Spawn chance per frame: ((t − min) / (max − min))^5.
- With Reaper of Fields, Dragon Harvest is added to the outcome list about 19% of the time (about 6% per
  golden cookie).
- Reindeer: pay 1 minute of `cookiesPs` (×0.75 during Frenzy, ×2 with Ho ho ho-flavored frosting); one every
  3–6 minutes, halved by Reindeer baking grounds. That is about +25% income, up to about +100%, which is why
  Christmas is the resting season (1.12.2) rather than Business Day (only Startrade's +5% golden cookies).
- Elder Pact turns golden cookies into wrath cookies. Elder Pledge (pool 'toggle') calms the elders for
  30 minutes (60 with Sacrificial rolling pins) and **pops every wrinkler**; Elder Covenant too.
- **Pledge cheese:** buying the Covenant sets `pledgeT = 0` and locks the Pledge; revoking the Covenant lets
  `Game.UpdateGrandmapocalypse` unlock the Pledge on the next frame (Elder Pact owned, no pledge running).
  Pledge → Covenant → Revoke gives a pledge every few seconds.
- Sacrificial rolling pins: unlocked by 10 pledges in one run.
- Wrinklers only spawn with `elderWrath > 0`. A poke costs 0.75 hp, a wrinkler dies at 0.5 or less and heals
  0.04 hp per frame: about one poke a second is safe. Wrinkler poker needs 50 pokes on one wrinkler.
- Wrinkler spawns (`Game.UpdateWrinklers`): each empty slot, each frame, `0.00001 × elderWrath`, × the garden's
  `wrinklerSpawn` effect, × 5 with Unholy bait, × 2.5/2/1.5 with Scorn (diamond/ruby/jade). The elder wrath
  climbs by itself to One mind + Communal brainsweep + Elder Pact owned (so 3x as fast with Elder Pact) and is
  0 under a Pledge, the Covenant or with no grandma. No pledge upgrade raises it. Elder spice and Dragon Guts
  only add slots. `Game.wrinklersPopped` is reset at every ascension (`Game.Reset`, not only hard), so
  Wrinklesquisher (50) and Moistburster (200) must happen within one run.
- Seasons and golden cookies (`Game.shimmerTypes.golden.getTimeMod`): spawn time x0.95 in Business Day with
  Startrade, x0.98 in Easter/Halloween/Valentine's with Starspawn/Starterror/Starlove (heavenly, 111,111 chips
  each, under Season switcher). Christmas has none; Starsnow makes reindeer 5% sooner. FC's spawn model
  (`getProbabilityModifiers`) leaves all of these out, so `gcPs` is the same in every season. A reindeer pays
  a minute of production (x2 Ho ho ho-flavored frosting), so it shrinks as golden cookies take over the income.
  Season switch price: 1e9 + 60 s of unbuffed CpS x 1.5^(switches this run).
- Garden (minigameGarden.js): a plant's seed unlocks only when it is harvested mature (or, on pebbles, 35% of
  the time when it dies of old age), and the plot is cleared at every ascension (`M.reset`). Growth per tick:
  `ageTick + ageTickR × random`, ticks every 3 min on fertilizer, 5 on dirt and woodchips, 15 on clay. Time to
  mature (fertilizer / woodchips): Juicy queenbeet 53h / 88h, Drowsyfern 15h / 25h, Everdaisy 12.5h / 21h,
  Duketater 10.6h / 17.6h, Elderwort 8.2h / 13.6h, Tidygrass 4h / 6.7h, Cronerice 3.7h / 6.1h, Queenbeet 3.3h /
  5.6h, every other plant under 2.1h / 3.5h.
- FC's season visits: it never leaves a season before `haveAll(season)` (all its drops this run), then goes to
  any season with drops missing, else the resting one. Its Cookie storm switch to Easter (`autoEasterAction`)
  ignores that order, so FC+ switches back after the storm (fcp_season.js).

## Dragon

- Aura `i` is available from `dragonLevel >= i + 4`; the second slot opens at the top level. Switching an aura
  sacrifices 1 of the highest building.
- Levels 5+ sacrifice 100 of `ObjectsById[lvl − 5]`; the last two take 50, then 200, of every building.
  Cookie levels cost 1e6 × 2^lvl. `Game.UpgradeDragon` opens the special menu.
- Dragon scale, claw, fang and teddy bear: petting the dragon at level 8+, 1 in 20 per pet, which one depends
  on the current minute.

## Minigames

- Stock market: $1 = 1 second of `Game.cookiesPsRawHighest`. Buying fee: 1 + 0.2 × 0.95^brokers. A broker
  costs `cookiesPsRawHighest × 1200` (20 minutes); max brokers = ceil(highest grandmas / 10 + grandma
  level). `it.prev` = the price before fees at the last purchase.
- Sugar lumps: the code lets you level a building you don't own; the game's UI doesn't, and FC+ follows the UI.
- Garden: plant growth per tick = `ageTick + random × ageTickR`; tick length `G.stepT`.

## FC behaviour (upstream)

- Golden cookie bank: `bestBank` keeps the biggest bank whose `cookieEfficiency` is no worse than the next
  purchase's. A full bank has efficiency 0, so normal purchases never dip into it; the exceptions (Golden
  switch, Godzamok, seasons, extra upgrades, reward cookies) are what `fcp_bankrules.js` handles.
- Auto-ascend gates: `HCAscendAmount > 0`, and `minCpSMult` defaults to 1 (which blocks it).
- Seasons: `haveAll(season)` and `holidayCookies`; it leaves the default season to collect another season's
  drops and comes back. It won't pledge during Halloween until all its drops are owned. Easter during a
  Cookie Storm, Halloween when wrinklers are present.
- Auto-wrinkler (mode 1) pops wrinklers when that helps the next purchase, so fresh ones go within seconds.
- `recommendationBlacklist` skips the Chocolate egg, the Golden switch and similar; Elder Pact is scored
  as "no gain".
- FC notices a minigame unlocked for the first time on a 1-minute timer (`minigameCheckAction`).

## UI quirks met

- jCanvas binds `mouseout.jCanvas` on FC's canvas and redraws (clears) it: the cause of the golden-cookie
  shimmer flicker. Unbound in `fcp_infobox.js`.
- `Game.Popup` only clamps its y to 32 px (+32 in the app); FC+ clamps text particles so they don't go off
  the top.
- The special tabs (Santa, dragon) sit where the infobox was: the panel is offset to 88 px when they exist.
