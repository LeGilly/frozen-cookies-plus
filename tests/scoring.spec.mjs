// First-run scoring: Cookie Monster's payback period before the first ascension, FC's own after.
import { test, expect } from "@playwright/test";
import { loadGame, setOptions, noErrors } from "./game.mjs";

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
