// Smart ascension and the heavenly upgrade buyer.
import { test, expect } from "@playwright/test";
import { loadGame, richGame, setOptions, noErrors } from "./game.mjs";

test("the heavenly upgrade list names real upgrades, and buying respects parents, order and cosmetics", async ({ page }) => {
  const errors = await loadGame(page);
  const missing = await page.evaluate(() => FCP.heavenlyPriority.concat(FCP.heavenlyCosmetic).filter((n) => !Game.Upgrades[n] || Game.Upgrades[n].pool !== "prestige"));
  expect(missing).toEqual([]);
  await setOptions(page, { smartAscend: 1 });
  const r = await page.evaluate(() => {
    Game.heavenlyChips = 25000;
    const bought = FCP.buyHeavenly();
    const orphans = Game.PrestigeUpgrades.filter((u) => u.bought && u.parents.some((p) => p != -1 && !p.bought)).map((u) => u.name);
    return { bought, orphans, chips: Game.heavenlyChips, has: ["Legacy", "Heavenly cookies", "Season switcher", "Kitten angels", "Starter kitchen", "Classic dairy selection"].map((n) => !!Game.Has(n)) };
  });
  expect(r.orphans).toEqual([]);
  expect(r.chips).toBeGreaterThanOrEqual(0);
  expect(r.bought.slice(0, 3)).toEqual(["Legacy", "Heavenly cookies", "How to bake your dragon"]);
  expect(r.has).toEqual([true, true, true, true, true, false]); // the cosmetic dairy isn't bought
  noErrors(errors);
});

test("first ascension at 440 levels, upgrades bought, then only when prestige doubles", async ({ page }) => {
  test.setTimeout(180_000);
  const errors = await loadGame(page);
  await setOptions(page, { smartAscend: 1, challengeRuns: 0, autoBuy: 0, fancyui: 3 });
  await page.evaluate(() => Game.Earn(Game.HowManyCookiesReset(400)));
  await page.waitForTimeout(2500);
  expect(await page.evaluate(() => [Game.resets, !!Game.OnAscend, !!Game.AscendTimer])).toEqual([0, false, false]);
  await expect(page.locator("#fcpInfoPanel")).toContainText("Next ascension", { timeout: 10_000 });
  await page.evaluate(() => Game.Earn(Game.HowManyCookiesReset(450)));
  await page.waitForFunction(() => Game.resets === 1 && !Game.OnAscend && !Game.AscendTimer && !Game.ReincarnateTimer, null, { timeout: 120_000 });
  const after = await page.evaluate(() => ({ prestige: Game.prestige, legacy: !!Game.Has("Legacy"), cookies: !!Game.Has("Heavenly cookies"), mode: Game.ascensionMode }));
  expect(after.prestige).toBeGreaterThanOrEqual(440);
  expect(after).toMatchObject({ legacy: true, cookies: true, mode: 0 });
  // Next time: not before the prestige doubles.
  await page.evaluate(() => Game.Earn(Game.HowManyCookiesReset(Game.prestige * 1.8) - Game.cookiesReset));
  await page.waitForTimeout(2500);
  expect(await page.evaluate(() => [Game.resets, !!Game.AscendTimer || !!Game.OnAscend])).toEqual([1, false]);
  expect(await page.evaluate(() => FCP.status["Ascension"])).toContain("(prestige ×2)");
  noErrors(errors);
});

test("an ascension you make yourself is left to you", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = await loadGame(page);
  await setOptions(page, { smartAscend: 1, challengeRuns: 0 });
  await page.evaluate(() => { Game.Earn(Game.HowManyCookiesReset(100)); FCP.autoAscension = ""; });
  await page.evaluate(() => Game.Ascend(1));
  await page.waitForFunction(() => Game.OnAscend == 1 && !Game.AscendTimer, null, { timeout: 60_000 });
  await page.waitForTimeout(4000);
  expect(await page.evaluate(() => [!!Game.OnAscend, !!Game.Has("Legacy")])).toEqual([true, false]);
  noErrors(errors);
});

test("with smart ascension off, FC's 'prestige doubled' mode works without a chips amount", async ({ page }) => {
  const errors = await loadGame(page);
  await page.evaluate(() => { Game.prestige = 100; Game.cookiesReset = Game.HowManyCookiesReset(100); });
  await setOptions(page, { smartAscend: 0, autoAscendToggle: 1, autoAscend: 2, HCAscendAmount: 0, autoBuy: 1 });
  await page.evaluate(() => Game.Earn(Game.HowManyCookiesReset(250) - Game.cookiesReset));
  await expect.poll(() => page.evaluate(() => !!Game.AscendTimer || !!Game.OnAscend), { timeout: 15_000 }).toBe(true);
  noErrors(errors);
});

test("Persistent memory comes before Season switcher, and cheaper useful upgrades aren't blocked by saving", async ({ page }) => {
  const errors = await loadGame(page);
  await setOptions(page, { smartAscend: 1 });
  const r = await page.evaluate(() => {
    ["Legacy", "Heavenly cookies", "How to bake your dragon", "Tin of british tea biscuits", "Box of macarons", "Box of brand biscuits",
      "Tin of butter cookies", "Starter kit", "Heavenly luck"].forEach((n) => Game.Upgrades[n].earn());
    Game.heavenlyChips = 945; // your case: saving for Season switcher (1,211 with Heralds)
    FCP.buyHeavenly();
    return { pm: !!Game.Has("Persistent memory"), switcher: !!Game.Has("Season switcher"), chips: Game.heavenlyChips };
  });
  expect([r.pm, r.switcher]).toEqual([true, false]);
  expect(r.chips).toBeGreaterThanOrEqual(400); // only a few very cheap extras besides (under 1% of the saving each)
  noErrors(errors);
});

test("it buys the research FC scores as no gain (Communal brainsweep, Elder Pact) while a goal needs it", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page, { cookies: 1e30 });
  const r = await page.evaluate(() => {
    ["Elder nap", "Elder slumber", "Elder calm", "Wrinkler poker", "Wrinklesquisher", "Moistburster"].forEach((n) => Game.Win(n));
    ["Bingo center/Research facility", "Specialized chocolate chips", "Designer cocoa beans", "Ritual rolling pins", "Underworld ovens", "One mind", "Exotic nuts"]
      .forEach((n) => Game.Upgrades[n].earn());
    Game.Upgrades["Communal brainsweep"].unlock();
    Game.Upgrades["Persistent memory"].earn();
    FrozenCookies.elderPledgeAchievs = 0;
    FCP.researchTick();
    const noGoal = Game.Has("Communal brainsweep");
    // Every achievement won: only the 10 pledges of this run (Sacrificial rolling pins) need Elder Pact.
    FrozenCookies.elderPledgeAchievs = 1;
    const hold = FCP.ascendHolds().map((h) => h.label).filter((l) => /^research/.test(l));
    FCP.researchTick();
    const bought = Game.Has("Communal brainsweep");
    Game.researchT = 100;
    FCP.researchTick();
    const status = FCP.status["Research"];
    return { noGoal, hold, bought, status };
  });
  expect(r.noGoal).toBeFalsy();
  expect(r.hold).toEqual(["research (3 to Elder Pact, 9m · for Elder Pledges)"]);
  expect(r.bought).toBeTruthy();
  expect(r.status).toBe("researching Arcane sugar");
  noErrors(errors);
});

test("the Christmas holds stay while FC is away for another season's drops, with Season switcher only", async ({ page }) => {
  const errors = await loadGame(page);
  const r = await page.evaluate(() => {
    const xmas = () => FCP.ascendHolds().map((h) => h.label).filter((l) => /^(reindeer|Santa)/.test(l));
    Game.reindeerClicked = 52;
    Game.Upgrades["A festive hat"].earn();
    Game.santaLevel = 9;
    Game.season = "halloween";
    const noSwitcher = xmas();
    Game.Upgrades["Season switcher"].earn();
    const halloween = xmas();
    Game.season = "fools";
    const fools = xmas();
    Game.season = "christmas";
    const christmas = xmas();
    Game.season = "";
    return { noSwitcher, halloween, fools, christmas };
  });
  expect(r.noSwitcher).toEqual([]);
  expect(r.halloween).toHaveLength(2);
  expect(r.halloween[0]).toMatch(/^reindeer \(52\/200, \d.* · back after Halloween\)$/);
  expect(r.halloween[1]).toBe("Santa (9/14 · back after Halloween)");
  expect(r.fools[1]).toBe("Santa (9/14 · switching back)");
  expect(r.christmas[1]).toBe("Santa (9/14)");
  expect(r.christmas[0]).toMatch(/^reindeer \(52\/200, \d[^·]*\)$/);
  noErrors(errors);
});

test("a run ready to ascend waits for one-time goals still in reach, at most 8 hours", async ({ page }) => {
  test.setTimeout(150_000);
  const errors = await loadGame(page);
  await page.evaluate(() => { Game.prestige = 100; Game.cookiesReset = Game.HowManyCookiesReset(100); localStorage.removeItem("fcpAscendHold"); });
  await setOptions(page, { smartAscend: 1, challengeRuns: 0, autoBuy: 0, autoReindeer: 0 });
  await page.evaluate(() => { Game.season = "christmas"; Game.seasonT = Game.fps * 3600 * 24; Game.reindeerClicked = 10;
    Game.Earn(Game.HowManyCookiesReset(250) - Game.cookiesReset); });
  await expect.poll(() => page.evaluate(() => FCP.status["Ascension"]), { timeout: 10_000 }).toMatch(/^ready · waiting: reindeer \(10\/200, .+\) · max 7h 59m/);
  expect(await page.evaluate(() => Game.resets)).toBe(0);
  // 8 hours later: it goes.
  await page.evaluate(() => localStorage.setItem("fcpAscendHold", JSON.stringify({ run: String(Game.startDate), since: Date.now() - 8.1 * 3600e3 })));
  await page.waitForFunction(() => Game.resets === 1, null, { timeout: 120_000 });
  noErrors(errors);
});

test("at boot, nothing is decided before the minigames are loaded (a seed in the garden holds it)", async ({ page }) => {
  const errors = await loadGame(page);
  await page.evaluate(() => { Game.prestige = 100; Game.cookiesReset = Game.HowManyCookiesReset(100); localStorage.removeItem("fcpAscendHold"); });
  await page.evaluate(() => { Game.Objects.Farm.level = Math.max(1, Game.Objects.Farm.level); Game.LoadMinigames(); });
  await page.waitForFunction(() => Game.Objects.Farm.minigameLoaded);
  // As right after a relaunch: the garden script not loaded yet, the run ready to ascend.
  await page.evaluate(() => { Game.Objects.Farm.minigameLoaded = false; Game.Earn(Game.HowManyCookiesReset(250) - Game.cookiesReset); });
  await setOptions(page, { smartAscend: 1, challengeRuns: 0, autoBuy: 0, autoGarden: 1 });
  await expect.poll(() => page.evaluate(() => FCP.status["Ascension"]), { timeout: 10_000 }).toBe("ready · checking goals (game still loading)");
  // Loaded, with a new seed growing: the seed holds it.
  await page.evaluate(() => {
    const G = Game.Objects.Farm.minigame, p = G.plants.thumbcorn;
    p.unlocked = 0; G.plot[0][0] = [p.id + 1, 0];
    Game.Objects.Farm.minigameLoaded = true;
  });
  await expect.poll(() => page.evaluate(() => FCP.status["Ascension"]), { timeout: 10_000 }).toMatch(/^ready · waiting: new Thumbcorn seed/);
  expect(await page.evaluate(() => Game.resets)).toBe(0);
  // And right after FC+ starts, it waits its settling time whatever the minigames.
  expect(await page.evaluate(() => { FCP.bootTime = Date.now(); return FCP.gameSettled(); })).toBe(false);
  noErrors(errors);
});

test("a goal nearly done when the 8 hours run out gets up to 2 more hours", async ({ page }) => {
  const errors = await loadGame(page);
  const left = await page.evaluate(() => {
    localStorage.setItem("fcpAscendHold", JSON.stringify({ run: String(Game.startDate), since: Date.now() - 7.5 * 3600e3 }));
    const h = (sec) => Math.round(FCP.holdLeft([{ label: "x", sec }]) / 60);
    return { none: h(0), soon: h(10 * 60), close: h(90 * 60), far: h(3 * 3600), mixed: Math.round(FCP.holdLeft([{ sec: 90 * 60 }, { sec: 3 * 3600 }]) / 60) };
  });
  // Minutes left, 7h30 into the wait.
  expect(left).toEqual({ none: 30, soon: 30, close: 90, far: 30, mixed: 90 });
  noErrors(errors);
});

test("research is only waited for once Persistent memory makes it quick, and for goals an option works on", async ({ page }) => {
  const errors = await loadGame(page);
  const holds = await page.evaluate(() => {
    Game.Unlock("Bingo center/Research facility");
    FrozenCookies.achievementHunter = 1;
    FrozenCookies.elderPledgeAchievs = 1;
    const without = FCP.ascendHolds().map((h) => h.label);
    Game.Upgrades["Persistent memory"].earn();
    const withPM = FCP.ascendHolds().map((h) => h.label);
    // Neither the Achievement Hunter nor the Elder Pledge option: nothing would use the research.
    FrozenCookies.achievementHunter = 0;
    FrozenCookies.elderPledgeAchievs = 0;
    const noOptions = FCP.ascendHolds().map((h) => h.label);
    const target = FCP.researchTarget();
    FrozenCookies.achievementHunter = 1;
    const hunterOnly = FCP.researchTarget();
    return { without, withPM, noOptions, target, hunterOnly };
  });
  expect(holds.without.some((l) => /^research/.test(l))).toBe(false);
  expect(holds.noOptions.some((l) => /^research/.test(l))).toBe(false);
  expect(holds.target).toBe(null);
  expect(holds.hunterOnly).toEqual({ target: "Elder Pact", missing: ["Wrinklesquisher", "Moistburster"] });
  expect(holds.withPM.some((l) => /^research \(10 to Elder Pact, 30m · for Elder nap \+4\)$/.test(l))).toBe(true);
  noErrors(errors);
});

test("research holds only as far as the missing achievements need: One mind for Wrinkler poker, Elder Pact for pledges and pops", async ({ page }) => {
  const errors = await loadGame(page);
  const r = await page.evaluate(() => {
    Game.Unlock("Bingo center/Research facility");
    Game.Upgrades["Persistent memory"].earn();
    FrozenCookies.achievementHunter = 1;
    FrozenCookies.elderPledgeAchievs = 0; // this run's pledges would want Elder Pact too
    const research = () => FCP.ascendHolds().map((h) => h.label).filter((l) => /^research/.test(l));
    ["Elder nap", "Elder slumber", "Elder calm", "Wrinklesquisher", "Moistburster"].forEach((n) => Game.Win(n));
    const pokerOnly = research();
    ["Bingo center/Research facility", "Specialized chocolate chips", "Designer cocoa beans", "Ritual rolling pins", "Underworld ovens", "One mind"]
      .forEach((n) => Game.Upgrades[n].earn());
    const afterOneMind = research();
    Game.Achievements["Moistburster"].won = 0;
    const pops = research();
    return { pokerOnly, afterOneMind, pops };
  });
  expect(r.pokerOnly).toEqual(["research (6 to One mind, 18m · for Wrinkler poker)"]);
  expect(r.afterOneMind).toEqual([]);
  expect(r.pops).toEqual(["research (4 to Elder Pact, 12m · for Moistburster)"]);
  noErrors(errors);
});

test("200 wrinklers popped in one run hold the ascension (with the Achievement Hunter), with a time from the spawn rate", async ({ page }) => {
  const errors = await loadGame(page);
  const r = await page.evaluate(() => {
    const pops = () => FCP.ascendHolds().map((h) => h.label).filter((l) => /^pops/.test(l));
    Game.Earn(1e6); Game.Objects.Grandma.buy(1);
    ["One mind", "Communal brainsweep", "Elder Pact"].forEach((n) => Game.Upgrades[n].earn());
    Game.wrinklersPopped = 20;
    FrozenCookies.achievementHunter = 0;
    const off = pops();
    FrozenCookies.achievementHunter = 1;
    const on = pops(); // 10 slots × 0.00003 × 30 fps = 0.009 a second: 180 left in 5h 33m
    Game.Win("Wrinklesquisher"); Game.Win("Moistburster");
    const done = pops();
    return { off, on, done };
  });
  expect(r.off).toEqual([]);
  expect(r.on).toEqual(["pops (20/200, 5h 33m)"]);
  expect(r.done).toEqual([]);
  noErrors(errors);
});

test("a new seed growing in the garden holds the ascension until it matures", async ({ page }) => {
  const errors = await loadGame(page);
  await page.evaluate(() => { Game.Objects.Farm.level = Math.max(1, Game.Objects.Farm.level); Game.LoadMinigames(); });
  await page.waitForFunction(() => Game.Objects.Farm.minigame && Game.Objects.Farm.minigame.plot);
  const r = await page.evaluate(() => {
    FrozenCookies.autoGarden = 1;
    const G = Game.Objects.Farm.minigame, p = G.plants.thumbcorn;
    p.unlocked = 0;
    G.plot[0][0] = [p.id + 1, 0];
    const growing = FCP.ascendHolds().map((h) => h.label);
    G.plot[0][0] = [p.id + 1, p.mature];
    const ripe = FCP.ascendHolds().map((h) => h.label);
    return { growing, ripe };
  });
  expect(r.growing.some((l) => /^new Thumbcorn seed \(.+\)$/.test(l))).toBe(true);
  expect(r.ripe.some((l) => /garden/.test(l))).toBe(false); // mature: the garden bot harvests it now
  noErrors(errors);
});

test("a permanent upgrade slot bought on the ascension screen is filled, and its prompt closed", async ({ page }) => {
  const errors = await loadGame(page);
  await setOptions(page, { smartAscend: 1 });
  const r = await page.evaluate(() => {
    // Last run: lots of achievements (milk), late kittens and expensive flavored cookies.
    Game.Earn(1e40);
    Game.ObjectsById.forEach((o) => { o.amount = 100; o.bought = 100; }); // something to produce
    Object.values(Game.AchievementsById).slice(0, 300).forEach((a) => { a.won = 1; });
    Game.AchievementsOwned = 300;
    ["Kitten helpers", "Kitten workers", "Kitten engineers", "Kitten overseers", "Kitten managers", "Kitten accountants",
      "Plastic mouse", "Reinforced index finger"].forEach((n) => Game.Upgrades[n].earn());
    const cookies = Object.values(Game.UpgradesById).filter((u) => u.pool === "cookie" && u.getPrice() > 1e30 && u.getPrice() < 1e40).slice(0, 5);
    cookies.forEach((u) => u.earn());
    ["Legacy", "Heavenly cookies", "How to bake your dragon", "Tin of british tea biscuits", "Box of macarons", "Box of brand biscuits",
      "Tin of butter cookies", "Starter kit", "Heavenly luck", "Persistent memory", "Heralds", "Season switcher", "Lasting fortune", "Lucky digit",
      "Golden switch"].forEach((n) => Game.Upgrades[n].earn());
    Game.heavenlyChips = 1e6; // plenty: Permanent upgrade slot I (100) among others
    FCP.buyHeavenly();
    const top = FCP.permanentScores()[0];
    return { slot: !!Game.Has("Permanent upgrade slot I"), perm: Game.UpgradesById[Game.permanentUpgrades[0]].name, top: top.u.name, prompt: !!Game.promptOn };
  });
  expect(r.slot).toBe(true);
  expect(r.prompt).toBe(false);
  // A late kitten, not an expensive flavored cookie or an early kitten.
  expect(r.perm).toBe(r.top);
  expect(r.perm).toMatch(/^Kitten (accountants|managers)$/);
  noErrors(errors);
});
