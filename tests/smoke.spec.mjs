// The bundle loads in the real game and every Plus module does its first job.
import { test, expect } from "@playwright/test";
import { loadGame, richGame, setOptions, won, noErrors } from "./game.mjs";

test("the bundle loads with its libraries, even with Electron's module/exports globals", async ({ page }) => {
  const errors = await loadGame(page);
  const libs = await page.evaluate(() => [typeof jQuery, typeof _, typeof $.jqplot, typeof $.fn.drawArc, typeof $.fn.dialog]);
  expect(libs).toEqual(["function", "function", "function", "function", "function"]);
  await expect(page.locator("#fcButton")).toContainText("Frozen");
  noErrors(errors);
});

test("Achievement Hunter earns the one-click achievements", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page);
  await setOptions(page, { achievementHunter: 1 });
  for (const name of ["Tabloid addiction", "What's in a name", "Here you go", "Tiny cookie", "Olden days", "Just wrong"])
    await expect.poll(() => won(page, name), { message: name, timeout: 15_000 }).toBeTruthy();
  expect(await won(page, "Stifling the press")).toBeFalsy(); // only with window tricks on
  noErrors(errors);
});

test("auto-lumps unlocks the minigames, then levels one building at a time to 10", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page);
  await page.evaluate(() => { Game.prefs.askLumps = 1; });
  await setOptions(page, { autoLumps: 2 });
  await expect.poll(() => page.evaluate(() => Game.Objects.Farm.level), { timeout: 20_000 }).toBe(10);
  await expect.poll(() => won(page, "Huge tracts of land")).toBeTruthy();
  const minigames = await page.evaluate(() => ["Farm", "Bank", "Temple", "Wizard tower"].map((n) => Game.Objects[n].level >= 1));
  expect(minigames).toEqual([true, true, true, true]);
  expect(await page.evaluate(() => Game.prefs.askLumps)).toBe(1); // the player's setting is put back
  noErrors(errors);
});

test("the stock bot buys a cheap good and sells it when the price is high", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page);
  await page.evaluate(() => { Game.Objects.Bank.level = Math.max(1, Game.Objects.Bank.level); Game.LoadMinigames(); });
  await page.waitForFunction(() => Game.Objects.Bank.minigame && Game.Objects.Bank.minigame.goodsById);
  await setOptions(page, { autoStocks: 1 });
  await page.evaluate(() => { const g = Game.Objects.Bank.minigame.goodsById[0]; g.val = 2; g.mode = 0; g.last = 0; });
  await expect.poll(() => page.evaluate(() => Game.Objects.Bank.minigame.goodsById[0].stock), { timeout: 15_000 }).toBeGreaterThan(0);
  await page.evaluate(() => { const g = Game.Objects.Bank.minigame.goodsById[0]; g.val = 60; g.last = 0; });
  await expect.poll(() => page.evaluate(() => Game.Objects.Bank.minigame.goodsById[0].stock), { timeout: 15_000 }).toBe(0);
  expect(await page.evaluate(() => Game.Objects.Bank.minigame.profit)).toBeGreaterThan(0);
  noErrors(errors);
});

test("the stock bot hires brokers, and never sells for less than it paid with fees", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page);
  await page.evaluate(() => { Game.Objects.Bank.level = Math.max(1, Game.Objects.Bank.level); Game.LoadMinigames(); localStorage.removeItem("fcpStockPaid"); });
  await page.waitForFunction(() => Game.Objects.Bank.minigame && Game.Objects.Bank.minigame.goodsById);
  const max = await page.evaluate(() => {
    const B = Game.Objects.Bank.minigame;
    B.tick = () => {}; // prices only move when the test moves them
    B.goodsById.forEach((g) => { g.val = B.getRestingVal(g.id); g.mode = 0; }); // nothing cheap to buy yet
    Game.cookies = B.getBrokerPrice() * 1000;
    return B.getMaxBrokers();
  });
  await setOptions(page, { autoStocks: 1 });
  await expect.poll(() => page.evaluate(() => Game.Objects.Bank.minigame.brokers), { timeout: 15_000 }).toBe(max);
  // Bought at 2 (2.08 with the fee left after the brokers). At 2.15 the old rule (5% over the
  // price before fees) sold; with the fee counted it isn't 5% up yet: held.
  await page.evaluate(() => { const g = Game.Objects.Bank.minigame.goodsById[0]; g.val = 2; g.mode = 0; g.last = 0; });
  await expect.poll(() => page.evaluate(() => Game.Objects.Bank.minigame.goodsById[0].stock), { timeout: 15_000 }).toBeGreaterThan(0);
  const held = await page.evaluate(() => Game.Objects.Bank.minigame.goodsById[0].stock);
  await page.evaluate(() => { const B = Game.Objects.Bank.minigame; const g = B.goodsById[0]; g.val = 2.15; g.last = 0; B.getRestingVal = () => 1; });
  await page.waitForTimeout(6000);
  expect(await page.evaluate(() => Game.Objects.Bank.minigame.goodsById[0].stock)).toBe(held);
  // At 2.25 it is: sold, at a real profit (the only trade, so the total profit is this one).
  await page.evaluate(() => { const g = Game.Objects.Bank.minigame.goodsById[0]; g.val = 2.25; g.last = 0; });
  await expect.poll(() => page.evaluate(() => Game.Objects.Bank.minigame.goodsById[0].stock), { timeout: 15_000 }).toBe(0);
  expect(await page.evaluate(() => Game.Objects.Bank.minigame.goodsById.filter((g) => g.stock > 0).length)).toBe(0);
  expect(await page.evaluate(() => Game.Objects.Bank.minigame.profit)).toBeGreaterThan(0);
  noErrors(errors);
});

test("the FC menu shows the achievement tracker and the Plus options, and they are saved", async ({ page }) => {
  const errors = await loadGame(page);
  await setOptions(page, { autoGarden: 1 });
  await page.evaluate(() => Game.ShowMenu("fc_menu"));
  await expect(page.locator("#fcpAchievements")).toContainText("Achievement tracker");
  await expect(page.locator("#menu")).toContainText("Achievement Hunter OFF");
  await page.locator("#fcpAchievements a", { hasText: "Show missing achievements" }).click();
  await expect(page.locator("#fcpAchievements")).toContainText("FC+ Auto-garden");
  expect(await page.evaluate(() => JSON.parse(Game.mods["frozen_cookies_plus"].save()).autoGarden)).toBe(1);
  // "Recommended" is the first option, before the long list.
  expect(await page.evaluate(() => Object.keys(FrozenCookies.preferenceValues)[0])).toBe("recommendedSettings");
  const menu = await page.locator("#menu").innerText();
  expect(menu).not.toContain("Recommended OFF"); // a button now, not an on/off option
  expect(menu.indexOf("Apply recommended options")).toBeGreaterThan(-1);
  expect(menu.indexOf("Apply recommended options")).toBeLessThan(menu.indexOf("Autoclick OFF"));
  noErrors(errors);
});

test("the Recommended button applies FC and FC+ recommended options, then the game reloads", async ({ page }) => {
  const errors = await loadGame(page);
  await setOptions(page, { burstBuy: 0, smartAscend: 0 });
  await page.evaluate(() => {
    // Catch the reload request instead of letting the page reload under the test.
    Object.defineProperty(Game, "toReload", { configurable: true, get: () => false, set: (v) => { window._reload = v; } });
    Game.ShowMenu("fc_menu");
  });
  await page.locator("#fcpRecommendedButton").click();
  expect(await page.evaluate(() => [FrozenCookies.burstBuy, FrozenCookies.smartAscend, FrozenCookies.autoBuy, FrozenCookies.recommendedSettings, window._reload]))
    .toEqual([1, 1, 1, 0, true]);
  noErrors(errors);
});
