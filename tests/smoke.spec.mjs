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

test("the FC menu shows the achievement tracker and the Plus options, and they are saved", async ({ page }) => {
  const errors = await loadGame(page);
  await setOptions(page, { autoGarden: 1 });
  await page.evaluate(() => Game.ShowMenu("fc_menu"));
  await expect(page.locator("#fcpAchievements")).toContainText("Achievement tracker");
  await expect(page.locator("#menu")).toContainText("Achievement Hunter OFF");
  await page.locator("#fcpAchievements a", { hasText: "Show missing achievements" }).click();
  await expect(page.locator("#fcpAchievements")).toContainText("FC+ Auto-garden");
  expect(await page.evaluate(() => JSON.parse(Game.mods["frozen_cookies_plus"].save()).autoGarden)).toBe(1);
  noErrors(errors);
});
