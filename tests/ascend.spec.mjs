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
