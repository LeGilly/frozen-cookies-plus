// First-run scoring: Cookie Monster's payback period before the first ascension, FC's own after.
import { test, expect } from "@playwright/test";
import { loadGame, richGame, setOptions, noErrors } from "./game.mjs";

// Score of a purchase costing 100 that adds 1 cookie/s, with 10 cookies/s, 500 cookies and a bank of 300.
const score = (page) => page.evaluate(() => {
  FCP.scoringBank = 300;
  Game.cookies = 500;
  return purchaseEfficiency(100, 1, 1, 10);
});

test("before the first ascension, only the cookies still missing count towards the wait", async ({ page }) => {
  const errors = await loadGame(page);
  await setOptions(page, { firstRunScoring: 1 });
  // 100 + 300 bank - 500 owned = nothing missing: the score is just the payback, 100 / 1.
  expect(await score(page)).toBe(100);
  await page.evaluate(() => { FCP.scoringBank = 450; Game.cookies = 500; });
  // 50 missing at 10/s = 5 s, plus 100 s payback.
  expect(await page.evaluate(() => purchaseEfficiency(100, 1, 1, 10))).toBe(105);
  noErrors(errors);
});

test("after an ascension, or with the option off, FC's own scoring is used", async ({ page }) => {
  const errors = await loadGame(page);
  await setOptions(page, { firstRunScoring: 1 });
  await page.evaluate(() => { Game.prestige = 10; });
  expect(await score(page)).toBe(110); // FC: 100 / 10 + 100 / 1
  await page.evaluate(() => { Game.prestige = 0; });
  await setOptions(page, { firstRunScoring: 0 });
  expect(await score(page)).toBe(110);
  noErrors(errors);
});

test("the Bingo center is valued with the research it starts, and nothing is left changed", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page, { cookies: 1e15, buildings: 100, lumps: 0 });
  await setOptions(page, { autoBuy: 0 });
  const rank = (on) => page.evaluate((o) => {
    FrozenCookies.researchScoring = o;
    Game.Unlock("Bingo center/Research facility");
    const list = recommendationList(true);
    const i = list.findIndex((e) => e.purchase && e.purchase.name === "Bingo center/Research facility");
    return { rank: i, of: list.length, eff: list[i].efficiency };
  }, on);
  const off = await rank(0);
  const before = await page.evaluate(() => [Game.cookiesPs, Game.Has("Specialized chocolate chips"), Game.Has("Arcane sugar"), Game.UpgradesOwned, Game.nextResearch]);
  const on = await rank(1);
  expect(on.eff).toBeLessThan(off.eff);
  expect(on.rank).toBeLessThan(off.rank);
  await page.evaluate(() => { Game.recalculateGains = 1; Game.CalculateGains(); });
  expect(await page.evaluate(() => [Game.cookiesPs, Game.Has("Specialized chocolate chips"), Game.Has("Arcane sugar"), Game.UpgradesOwned, Game.nextResearch])).toEqual(before);
  console.log("Bingo center rank", JSON.stringify({ off, on }));
  noErrors(errors);
});
