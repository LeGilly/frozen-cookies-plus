// The achievements that need an event: an unripe lump, wrinklers, pledges, a loan, a Born Again run.
import { test, expect } from "@playwright/test";
import { loadGame, richGame, setOptions, won, noErrors } from "./game.mjs";

test("it harvests a mature unripe sugar lump once for Hand-picked", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page, { lumps: 10 });
  await page.evaluate(() => { Game.lumpT = Date.now() - Game.lumpMatureAge - 1000; });
  await setOptions(page, { achievementHunter: 1 });
  // Harvested means a new lump started growing (Hand-picked itself is a 50% roll in the game).
  await expect.poll(() => page.evaluate(() => Date.now() - Game.lumpT < 60_000), { timeout: 15_000 }).toBe(true);
  noErrors(errors);
});

test("it pokes a wrinkler 50 times without popping it", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page, { buildings: 100 });
  await page.evaluate(() => { Game.elderWrath = 3; for (let i = 0; i < 3; i++) Game.SpawnWrinkler(); });
  await page.waitForFunction(() => Game.wrinklers.some((w) => w.phase == 2), null, { timeout: 60_000 });
  await page.evaluate(() => Game.wrinklers.forEach((w) => { if (w.phase == 2) w.clicks = 45; }));
  await setOptions(page, { achievementHunter: 1 });
  await expect.poll(() => won(page, "Wrinkler poker"), { timeout: 30_000 }).toBeTruthy();
  expect(await page.evaluate(() => Game.wrinklers.filter((w) => w.phase == 2).length)).toBeGreaterThan(0);
  noErrors(errors);
});

test("it pops wrinklers as they come out until Moistburster, leaving the one being poked", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = await loadGame(page);
  await page.evaluate(() => { Game.Earn(1e8); Game.Objects.Grandma.buy(10); Game.Upgrades["One mind"].earn(); Game.elderWrath = 3; Game.wrinklersPopped = 197; for (let i = 0; i < 4; i++) Game.SpawnWrinkler(); });
  await page.waitForFunction(() => Game.wrinklers.filter((w) => w.phase == 2).length >= 4, null, { timeout: 60_000 });
  await setOptions(page, { achievementHunter: 1, autoWrinkler: 0 });
  await expect.poll(() => won(page, "Moistburster"), { timeout: 30_000 }).toBeTruthy();
  // Wrinkler poker isn't won yet: the wrinkler being poked is left alive.
  expect(await page.evaluate(() => Game.wrinklers.filter((w) => w.phase > 0 && w.hp > 0).length)).toBeGreaterThanOrEqual(1);
  expect(await page.evaluate(() => Game.wrinklersPopped)).toBeGreaterThanOrEqual(200);
  noErrors(errors);
});

test("FC's auto-wrinkler leaves the wrinkler being poked alone", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page, { buildings: 100 });
  await page.evaluate(() => { Game.elderWrath = 3; for (let i = 0; i < 3; i++) Game.SpawnWrinkler(); });
  await page.waitForFunction(() => Game.wrinklers.filter((w) => w.phase == 2).length >= 2, null, { timeout: 60_000 });
  // Halloween without all its cookies: FC pops every wrinkler it can, straight away.
  await page.evaluate(() => { Game.season = "halloween"; Game.seasonT = Game.fps * 3600; Game.wrinklers.forEach((w) => { w.sucked = Math.max(w.sucked, 1); }); });
  await setOptions(page, { achievementHunter: 1, autoWrinkler: 1 });
  // The others go, the poked one stays and keeps being poked, about one poke a second.
  await expect.poll(() => page.evaluate(() => Game.wrinklers.filter((w) => w.phase > 0 && w.hp > 0).map((w) => w.clicks)), { timeout: 30_000 })
    .toEqual([expect.any(Number)]);
  await expect.poll(() => page.evaluate(() => Math.max(...Game.wrinklers.map((w) => w.clicks))), { timeout: 30_000 }).toBeGreaterThanOrEqual(15);
  expect(await page.evaluate(() => Game.wrinklers.filter((w) => w.phase > 0 && w.hp > 0).length)).toBe(1);
  noErrors(errors);
});

test("Elder Pact is bought once researched, then the first pledge", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page, { buildings: 100 });
  await page.evaluate(() => Game.Unlock("Elder Pact"));
  await setOptions(page, { elderPledgeAchievs: 1 });
  await expect.poll(() => page.evaluate(() => !!Game.Has("Elder Pact")), { timeout: 20_000 }).toBe(true);
  await expect.poll(() => won(page, "Elder nap"), { timeout: 20_000 }).toBeTruthy();
  noErrors(errors);
});

test("10 pledges in a minute by cycling Pledge, Covenant and Revoke, then the Covenant is left off", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = await loadGame(page);
  await richGame(page, { buildings: 100 });
  await page.evaluate(() => Game.Upgrades["Elder Pact"].earn());
  await setOptions(page, { elderPledgeAchievs: 1 });
  await expect.poll(() => page.evaluate(() => Game.pledges), { timeout: 80_000 }).toBeGreaterThanOrEqual(10);
  expect(await won(page, "Elder slumber")).toBeTruthy();
  expect(await won(page, "Elder calm")).toBeTruthy();
  await expect.poll(() => page.evaluate(() => !!Game.Upgrades["Sacrificial rolling pins"].unlocked), { timeout: 10_000 }).toBe(true);
  await expect.poll(() => page.evaluate(() => !Game.Upgrades["Elder Covenant"].bought), { timeout: 20_000 }).toBe(true);
  const pledges = await page.evaluate(() => Game.pledges);
  await page.waitForTimeout(5000);
  expect(await page.evaluate(() => Game.pledges)).toBe(pledges); // stops once done
  noErrors(errors);
});

test("a loan before ascending, then a Born Again run without clicks, then back to a normal run", async ({ page }) => {
  test.setTimeout(300_000);
  const errors = await loadGame(page);
  await richGame(page, { buildings: 100, cookies: 1e20 });
  await page.evaluate(() => { Game.Objects.Bank.level = 1; Game.LoadMinigames(); });
  await page.waitForFunction(() => Game.Objects.Bank.minigame && Game.Objects.Bank.minigame.goodsById);
  await page.evaluate(() => {
    Game.Objects.Bank.minigame.officeLevel = 2;
    Game.Achievements["True Neverclick"].won = 0;
    Game.Achievements["Neverclick"].won = 0;
  });
  await setOptions(page, { achievementHunter: 1, challengeRuns: 1, autoClick: 1, cookieClickSpeed: 20 });
  await page.waitForTimeout(2500); // let the hunter patch Game.Ascend / Game.Reincarnate

  await page.evaluate(() => Game.Ascend(1)); // the way FC ascends
  await page.waitForFunction(() => Game.OnAscend == 1, null, { timeout: 90_000 });
  expect(await page.evaluate(() => !!Game.hasBuff("Loan 1"))).toBe(true);
  await page.evaluate(() => Game.Reincarnate(1));
  await page.waitForFunction(() => !Game.OnAscend && !Game.ReincarnateTimer, null, { timeout: 90_000 });
  expect(await won(page, "Debt evasion")).toBeTruthy();
  expect(await page.evaluate(() => Game.ascensionMode)).toBe(1); // Born Again

  await page.waitForTimeout(3000);
  expect(await page.evaluate(() => Game.cookieClicks)).toBe(0); // autoclick is held back
  await page.evaluate(() => Game.Earn(2e6));
  await expect.poll(() => won(page, "True Neverclick"), { timeout: 60_000 }).toBeTruthy();
  expect(await won(page, "Neverclick")).toBeTruthy();
  await page.waitForFunction(() => Game.ascensionMode == 0 && !Game.OnAscend && !Game.AscendTimer && Game.cookiesEarned < 1e6,
    null, { timeout: 120_000 });
  noErrors(errors);
});

test("on a save that never ascended, the current run goes for Neverclick and says so", async ({ page }) => {
  const errors = await loadGame(page);
  // Brand new save: nothing baked, never ascended.
  expect(await page.evaluate(() => [Game.resets, Game.cookiesEarned])).toEqual([0, 0]);
  await setOptions(page, { challengeRuns: 1, autoClick: 1, cookieClickSpeed: 20 });
  await expect.poll(() => page.evaluate(() => FCP.status["Challenge runs"] || ""), { timeout: 10_000 })
    .toContain("no ascension yet");
  await page.waitForTimeout(2000);
  expect(await page.evaluate(() => Game.cookieClicks)).toBe(0);
  // Past 1 million baked the game awards both achievements and clicking comes back.
  await page.evaluate(() => Game.Earn(2e6));
  await expect.poll(() => won(page, "True Neverclick"), { timeout: 30_000 }).toBeTruthy();
  await expect.poll(() => page.evaluate(() => Game.cookieClicks), { timeout: 10_000 }).toBeGreaterThan(0);
  expect(await page.evaluate(() => Game.ascensionMode)).toBe(0); // no Born Again needed
  noErrors(errors);
});

test("with clicks held back for Neverclick, FC values purchases without the autoclicker", async ({ page }) => {
  const errors = await loadGame(page);
  // Fresh save, one cursor, a few cookies: the situation where FC used to chase click upgrades.
  await page.evaluate(() => { Game.cookies = 15; Game.Objects.Cursor.buy(1); Game.cookies = 20; });
  await page.waitForFunction(() => Game.Upgrades["Reinforced index finger"].unlocked, null, { timeout: 15_000 });
  const pick = (options) => page.evaluate((o) => {
    Object.assign(FrozenCookies, o);
    return nextPurchase(true).purchase.name;
  }, options);
  // Clicking at 250/s: doubling click power is the best buy.
  expect(await pick({ challengeRuns: 0, autoClick: 1, cookieClickSpeed: 250 })).toBe("Reinforced index finger");
  // Clicks held back: another cursor is far better value.
  expect(await pick({ challengeRuns: 1, autoClick: 1, cookieClickSpeed: 250 })).toBe("Cursor");
  noErrors(errors);
});

test("after Neverclick, a Born Again run goes for Speed baking: clicking flat out, then back to normal", async ({ page }) => {
  test.setTimeout(300_000);
  const errors = await loadGame(page);
  await richGame(page, { buildings: 20, cookies: 1e12 });
  await page.evaluate(() => { Game.Win("True Neverclick"); Game.Win("Neverclick"); });
  await setOptions(page, { challengeRuns: 1 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => Game.Ascend(1));
  await page.waitForFunction(() => Game.OnAscend == 1, null, { timeout: 90_000 });
  await page.evaluate(() => Game.Reincarnate(1));
  await page.waitForFunction(() => !Game.OnAscend && !Game.ReincarnateTimer, null, { timeout: 90_000 });
  expect(await page.evaluate(() => [Game.ascensionMode, FCP.runPlan()])).toEqual([1, "speed"]);
  // FC+ clicks the cookie itself during a speed run.
  await expect.poll(() => page.evaluate(() => Game.cookieClicks), { timeout: 10_000 }).toBeGreaterThan(20);
  await page.evaluate(() => Game.Earn(2e6));
  await expect.poll(() => won(page, "Speed baking III"), { timeout: 30_000 }).toBeTruthy();
  await page.waitForFunction(() => Game.ascensionMode == 0 && !Game.OnAscend && !Game.AscendTimer && Game.cookiesEarned < 1e6,
    null, { timeout: 120_000 });
  noErrors(errors);
});

test("a Born Again run you start yourself is never ended by FC+", async ({ page }) => {
  const errors = await loadGame(page);
  await page.evaluate(() => { localStorage.removeItem("fcpChallengeRun"); Game.resets = 1; Game.ascensionMode = 1; Game.Win("True Neverclick"); Game.Win("Neverclick");
    FCP.speedNames.forEach((n) => Game.Win(n)); Game.Earn(5e6); });
  await setOptions(page, { challengeRuns: 1 });
  await page.waitForTimeout(5000);
  expect(await page.evaluate(() => [Game.ascensionMode, !!Game.OnAscend])).toEqual([1, false]);
  noErrors(errors);
});
