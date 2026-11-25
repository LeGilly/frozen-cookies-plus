// Smart ascension and the heavenly upgrade buyer.
import { test, expect } from "@playwright/test";
import { loadGame, setOptions, noErrors } from "./game.mjs";

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
  expect(await page.evaluate(() => FCP.status["Ascension"])).toContain("when prestige doubles");
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

test("a run ready to ascend waits for one-time goals still in reach, at most 8 hours", async ({ page }) => {
  test.setTimeout(150_000);
  const errors = await loadGame(page);
  await page.evaluate(() => { Game.prestige = 100; Game.cookiesReset = Game.HowManyCookiesReset(100); localStorage.removeItem("fcpAscendHold"); });
  await setOptions(page, { smartAscend: 1, challengeRuns: 0, autoBuy: 0, autoReindeer: 0 });
  await page.evaluate(() => { Game.season = "christmas"; Game.seasonT = Game.fps * 3600 * 24; Game.reindeerClicked = 10;
    Game.Earn(Game.HowManyCookiesReset(250) - Game.cookiesReset); });
  await expect.poll(() => page.evaluate(() => FCP.status["Ascension"]), { timeout: 10_000 }).toMatch(/^ready, waiting for Reindeer sleigher \(10\/200, about .+\) · at most 7h 59m/);
  expect(await page.evaluate(() => Game.resets)).toBe(0);
  // 8 hours later: it goes.
  await page.evaluate(() => localStorage.setItem("fcpAscendHold", JSON.stringify({ run: String(Game.startDate), since: Date.now() - 8.1 * 3600e3 })));
  await page.waitForFunction(() => Game.resets === 1, null, { timeout: 120_000 });
  noErrors(errors);
});

test("research is only waited for once Persistent memory makes it quick", async ({ page }) => {
  const errors = await loadGame(page);
  const holds = await page.evaluate(() => {
    Game.Unlock("Bingo center/Research facility");
    const without = FCP.ascendHolds().map((h) => h.label);
    Game.Upgrades["Persistent memory"].earn();
    const withPM = FCP.ascendHolds().map((h) => h.label);
    return { without, withPM };
  });
  expect(holds.without.some((l) => /^research/.test(l))).toBe(false);
  expect(holds.withPM.some((l) => /^research \(10 steps to Elder Pact, about 30m\)$/.test(l))).toBe(true);
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
