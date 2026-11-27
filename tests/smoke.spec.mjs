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

test("auto-lumps unlocks the minigames, then their levels (Farm 9, Cursor 12, Bank 10), then buildings to 10", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page);
  await page.evaluate(() => { Game.prefs.askLumps = 1; });
  await setOptions(page, { autoLumps: 2 });
  await expect.poll(() => page.evaluate(() => [Game.Objects.Farm.level, Game.Objects.Cursor.level, Game.Objects.Bank.level]), { timeout: 30_000 })
    .toEqual([9, 12, 10]);
  // Then the CpS round, costliest building first.
  await expect.poll(() => page.evaluate(() => Game.ObjectsById[Game.ObjectsById.length - 1].level), { timeout: 20_000 }).toBe(10);
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

test("brokers are only hired once enough stock has been bought for them to pay off", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page);
  await page.evaluate(() => { Game.Objects.Bank.level = Math.max(1, Game.Objects.Bank.level); Game.LoadMinigames(); localStorage.removeItem("fcpStockVolume"); });
  await page.waitForFunction(() => Game.Objects.Bank.minigame && Game.Objects.Bank.minigame.goodsById);
  await page.evaluate(() => {
    const B = Game.Objects.Bank.minigame;
    B.tick = () => {};
    B.goodsById.forEach((g) => { g.val = B.getRestingVal(g.id); g.mode = 0; });
    Game.cookies = B.getBrokerPrice() * 1000;
    const g = B.goodsById[0]; g.val = 2; g.last = 0;
  });
  await setOptions(page, { autoStocks: 1 });
  // Stock is bought with the fee, but a few dollars of purchases don't justify a broker.
  await expect.poll(() => page.evaluate(() => Game.Objects.Bank.minigame.goodsById[0].stock), { timeout: 15_000 }).toBeGreaterThan(0);
  expect(await page.evaluate(() => Game.Objects.Bank.minigame.brokers)).toBe(0);
  expect(await page.evaluate(() => FCP.status["Stock market"])).toMatch(/fee 20\.0% · next broker at \$120,000 bought/);
  // After $120,000 of purchases, the first broker pays for itself: hired.
  await page.evaluate(() => FCP.stockVolume(120000));
  await expect.poll(() => page.evaluate(() => Game.Objects.Bank.minigame.brokers), { timeout: 15_000 }).toBeGreaterThan(0);
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
    localStorage.removeItem("fcpStockVolume");
    FCP.stockVolume(1e12); // plenty bought this run: every broker pays off
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

test("close to an ascension the stock bot stops buying and takes any profit", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page);
  await page.evaluate(() => { Game.Objects.Bank.level = Math.max(1, Game.Objects.Bank.level); Game.LoadMinigames(); localStorage.removeItem("fcpStockPaid"); localStorage.removeItem("fcpStockVolume"); });
  await page.waitForFunction(() => Game.Objects.Bank.minigame && Game.Objects.Bank.minigame.goodsById);
  await page.evaluate(() => {
    const B = Game.Objects.Bank.minigame;
    B.tick = () => {};
    B.goodsById.forEach((g) => { g.val = B.getRestingVal(g.id); g.mode = 0; });
    Game.cookies = B.getBrokerPrice() * 1000;
    B.goodsById[0].val = 2; B.goodsById[0].last = 0;
  });
  await setOptions(page, { autoStocks: 1 });
  await expect.poll(() => page.evaluate(() => Game.Objects.Bank.minigame.goodsById[0].stock), { timeout: 15_000 }).toBeGreaterThan(0);
  // Ascension soon: good 1 is cheap but not bought; good 0 is up 10% (2.4 paid with the fee),
  // far from "high", and is sold anyway.
  await page.evaluate(() => {
    FCP.ascensionSoon = () => true;
    const B = Game.Objects.Bank.minigame;
    const g1 = B.goodsById[1]; g1.val = B.getRestingVal(1) * 0.3; g1.last = 0;
    const g0 = B.goodsById[0]; g0.val = 2.65; g0.last = 0;
  });
  await expect.poll(() => page.evaluate(() => Game.Objects.Bank.minigame.goodsById[0].stock), { timeout: 15_000 }).toBe(0);
  expect(await page.evaluate(() => Game.Objects.Bank.minigame.goodsById[1].stock)).toBe(0);
  expect(await page.evaluate(() => Game.Objects.Bank.minigame.brokers)).toBe(0);
  expect(await page.evaluate(() => FCP.status["Stock market"])).toMatch(/ascending in <2h: selling, not buying/);
  // A new run starts its own broker count and price records.
  expect(await page.evaluate(() => { FCP.stockVolume(5000); Game.startDate += 1; return [FCP.stockVolume(), FCP.stockPaid(0)]; })).toEqual([0, undefined]);
  noErrors(errors);
});

test("after an ascension's reset, the Pantheon slots are filled again and the garden replanted", async ({ page }) => {
  test.setTimeout(150_000); // slow with the whole suite running alongside
  const errors = await loadGame(page);
  await richGame(page);
  await page.evaluate(() => {
    ["Temple", "Farm"].forEach((n) => { Game.Objects[n].level = Math.max(1, Game.Objects[n].level); });
    Game.LoadMinigames();
  });
  await page.waitForFunction(() => Game.Objects.Temple.minigame && Game.Objects.Temple.minigame.slot && Game.Objects.Farm.minigame && Game.Objects.Farm.minigame.plot);
  await setOptions(page, { autoWorshipToggle: 1, autoWorship0: 2, autoWorship1: 8, autoWorship2: 6, autoGarden: 1 });
  await page.evaluate(() => minigameCheckAction()); // FC picks up newly unlocked minigames once a minute
  await expect.poll(() => page.evaluate(() => Game.Objects.Temple.minigame.slot.join(",")), { timeout: 45_000 }).toBe("2,8,6");
  // What the game does to these minigames at ascension (non-hard reset).
  await page.evaluate(() => { Game.Objects.Temple.minigame.reset(); Game.Objects.Farm.minigame.reset(); Game.cookies *= 1000; });
  expect(await page.evaluate(() => Game.Objects.Temple.minigame.slot.join(","))).toBe("-1,-1,-1");
  await expect.poll(() => page.evaluate(() => Game.Objects.Temple.minigame.slot.join(",")), { timeout: 45_000 }).toBe("2,8,6");
  await expect.poll(() => page.evaluate(() => Game.Objects.Farm.minigame.plot.flat().filter((t) => t[0] > 0).length), { timeout: 45_000 }).toBeGreaterThan(0);
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
  expect(await page.evaluate(() => [FrozenCookies.defaultSeasonToggle, seasons[FrozenCookies.defaultSeason]])).toEqual([1, "christmas"]);
  // Every Plus option with a recommended value gets it; the marathon and the cheats are left alone.
  expect(await page.evaluate(() => Object.keys(FCP.preferenceValues)
    .filter((k) => FCP.preferenceValues[k].recommended !== undefined && FrozenCookies[k] !== FCP.preferenceValues[k].recommended))).toEqual([]);
  expect(await page.evaluate(() => [FrozenCookies.smartSeason, FrozenCookies.autoLumps, FrozenCookies.ascensionMarathon, FrozenCookies.cheatAchievement]))
    .toEqual([1, 2, 0, 0]);
  // FC's own recommendation turns its keyboard shortcuts on; FC+ turns them off (R resets the run).
  expect(await page.evaluate(() => FrozenCookies.FCshortcuts)).toBe(0);
  noErrors(errors);
});
