// Smart bulk buy: how many buildings FC buys when the store is on x10/x100.
import { test, expect } from "@playwright/test";
import { loadGame, richGame, setOptions, noErrors } from "./game.mjs";

// Counts with a made-up bank and recommendation list (FC's own functions are swapped out).
const count = (page, { spare, mineEff = 1, altEff = Infinity, ask = 100 }) =>
  page.evaluate(({ spare, mineEff, altEff, ask }) => {
    const b = Game.Objects["Farm"];
    const keep = { delayAmount: window.delayAmount, recommendationList: window.recommendationList };
    window.delayAmount = () => 1000;
    window.recommendationList = () => [
      { type: "building", purchase: b, efficiency: mineEff },
      { type: "upgrade", purchase: {}, efficiency: altEff },
    ];
    Game.cookies = 1000 + spare * b.getPrice();
    try { return FCP.smartBulkCount(b, ask); } finally { Object.assign(window, keep); }
  }, { spare, mineEff, altEff, ask });

test("early in a run (lots of spare cookies, nothing better to buy) it still buys the full 100", async ({ page }) => {
  const errors = await loadGame(page);
  expect(await count(page, { spare: 1e9 })).toBe(100);
  noErrors(errors);
});

test("it never spends the golden cookie bank: only what fits above it", async ({ page }) => {
  const errors = await loadGame(page);
  expect(await count(page, { spare: 1.5 })).toBe(1);   // the 2nd costs 1.15x: doesn't fit
  expect(await count(page, { spare: 2.2 })).toBe(2);   // 1 + 1.15 = 2.15 fits, 3rd doesn't
  noErrors(errors);
});

test("it stops when the next unit is worse value than the best other purchase", async ({ page }) => {
  const errors = await loadGame(page);
  // Units score 1, 1.15, 1.32, 1.52, 1.75... against an alternative scoring 1.6: four are better.
  expect(await count(page, { spare: 1e9, mineEff: 1, altEff: 1.6 })).toBe(4);
  noErrors(errors);
});

test("FC's own autobuy at x100 keeps its bank with smart bulk on", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page, { cookies: 0, buildings: 50, lumps: 0 });
  await page.evaluate(() => document.getElementById("storeBulk100").click());
  // Upgrades are kept out of the way (FC's HARDCORE blacklist) so the next purchases are buildings.
  await setOptions(page, { autoBuy: 1, smartBulk: 1, blacklist: 2 });
  // FC's bank target settles over a few seconds: keep topping up to 1.5x the bank until it buys.
  await expect.poll(() => page.evaluate(() => {
    if (!FCP.lastSmartBulk) Game.cookies = Math.max(Game.cookies, delayAmount() * 1.5);
    return FCP.lastSmartBulk && FCP.lastSmartBulk.bought;
  }), { timeout: 30_000, intervals: [1000] }).toBeGreaterThan(0);
  const last = await page.evaluate(() => FCP.lastSmartBulk);
  expect(last.asked).toBe(100);
  expect(last.cookiesAfter).toBeGreaterThanOrEqual(last.bank * 0.999); // the bank survived the purchase
  noErrors(errors);
});

test("burst buying: a windfall is spent several purchases at a time, above the bank", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page, { cookies: 0, buildings: 200, lumps: 0 });
  await setOptions(page, { autoBuy: 1, burstBuy: 1, smartBulk: 1 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => { FCP.burstCount = 0; Game.cookies += Game.cookiesPs * 86400 * 30; }); // a month of income at once
  await expect.poll(() => page.evaluate(() => FCP.burstCount), { timeout: 20_000 }).toBeGreaterThan(5);
  expect(await page.evaluate(() => Game.cookies >= delayAmount() * 0.999)).toBe(true);
  noErrors(errors);
});
