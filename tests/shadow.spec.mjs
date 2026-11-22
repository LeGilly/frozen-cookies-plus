// Achievements normal play never gives: UI tricks, shadow achievements, gift, marathon, cheat.
import { test, expect } from "@playwright/test";
import { loadGame, richGame, setOptions, won, noErrors } from "./game.mjs";

const wonSoon = (page, name, timeout = 20_000) => expect.poll(() => won(page, name), { message: name, timeout }).toBeTruthy();

test("God complex and In her likeness, with the name and the You look put back", async ({ page }) => {
  const errors = await loadGame(page);
  const before = await page.evaluate(() => ({ name: Game.bakeryName, genes: Game.YouCustomizer.currentGenes.slice() }));
  await setOptions(page, { shadowAchievements: 1 });
  await wonSoon(page, "God complex");
  await wonSoon(page, "In her likeness");
  const after = await page.evaluate(() => ({ name: Game.bakeryName, genes: Game.YouCustomizer.currentGenes.slice() }));
  expect(after).toEqual(before);
  noErrors(errors);
});

test("Cookie-dunker is earned with UI tricks, and the real canvas is untouched", async ({ page }) => {
  const errors = await loadGame(page);
  await page.evaluate(() => {
    ["Wake and bake", "Making some dough", "So baked right now", "Fledgling bakery", "Affluent bakery"].forEach((n) => Game.Win(n));
    Game.recalculateGains = 1; Game.CalculateGains();
  });
  const height = await page.evaluate(() => Game.LeftBackground.canvas.height);
  expect(await won(page, "Cookie-dunker")).toBeFalsy(); // the test window is too tall for it
  await setOptions(page, { achievementTricks: 1 });
  await wonSoon(page, "Cookie-dunker");
  expect(await page.evaluate(() => Game.LeftBackground.canvas.height)).toBe(height);
  noErrors(errors);
});

test("Cheat achievements only with their own option, and the bank and golden cookies are put back", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page, { cookies: 1000, buildings: 0, lumps: 0 }); // 1e40 baked: +1 would be lost to rounding
  await setOptions(page, { shadowAchievements: 1, achievementTricks: 1, achievementHunter: 1 });
  await page.waitForTimeout(6000);
  expect(await won(page, "Cheated cookies taste awful")).toBeFalsy();
  expect(await won(page, "Four-leaf cookie")).toBeFalsy();
  await setOptions(page, { cheatAchievement: 1 });
  await wonSoon(page, "Cheated cookies taste awful");
  await wonSoon(page, "Four-leaf cookie");
  expect(await page.evaluate(() => [Game.cookies <= Game.cookiesEarned, Game.shimmerTypes.golden.n == Game.shimmers.filter((s) => s.type == "golden" && !s.noCount).length]))
    .toEqual([true, true]);
  noErrors(errors);
});

test("Last Chance to See: the shiny wrinkler is popped", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page, { buildings: 100 });
  await page.evaluate(() => { Game.elderWrath = 3; const w = Game.SpawnWrinkler(); if (w) w.type = 1; });
  await page.waitForFunction(() => Game.wrinklers.some((w) => w.type == 1 && w.phase == 2 && w.close == 1), null, { timeout: 60_000 });
  await setOptions(page, { shadowAchievements: 1 });
  await wonSoon(page, "Last Chance to See");
  noErrors(errors);
});

test("When the cookies ascend just right: the bank is set to exactly 1 trillion before ascending", async ({ page }) => {
  test.setTimeout(240_000);
  const errors = await loadGame(page);
  await richGame(page, { cookies: 3.7e15 + 123.456, buildings: 150, lumps: 0 });
  await setOptions(page, { shadowAchievements: 1 });
  await page.waitForTimeout(2500); // the ascension hook is installed
  await page.evaluate(() => Game.Ascend(1)); // the way FC ascends
  await page.waitForFunction(() => Game.OnAscend == 1, null, { timeout: 90_000 });
  expect(await page.evaluate(() => Math.round(Game.cookies))).toBe(1e12);
  await page.evaluate(() => Game.Reincarnate(1));
  await wonSoon(page, "When the cookies ascend just right", 90_000);
  noErrors(errors);
});

test("Baby it's old outside: at Christmas the mouse is held on a Santa's helper grandma", async ({ page }) => {
  const errors = await loadGame(page);
  await page.evaluate(() => { Game.season = "christmas"; Game.seasonT = Game.fps * 3600; Game.Earn(1e9); Game.Objects.Grandma.buy(30); });
  await page.waitForFunction(() => (Game.Objects.Grandma.pics || []).length > 0, null, { timeout: 30_000 });
  const pics = await page.evaluate(() => Game.Objects.Grandma.pics.map((p) => p.pic).join());
  await setOptions(page, { achievementTricks: 1 });
  await wonSoon(page, "Baby it's old outside");
  expect(await page.evaluate(() => Game.Objects.Grandma.pics.map((p) => p.pic).join())).toBe(pics);
  noErrors(errors);
});

test("No time like the present: a gift is sent, then redeemed after the cooldown", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page, { cookies: 5e9, buildings: 10, lumps: 0 });
  await page.evaluate(() => { Game.Upgrades["Wrapping paper"].earn(); try { localStorage.removeItem("fcpGift"); } catch (e) {} });
  await setOptions(page, { achievementHunter: 1 });
  await expect.poll(() => page.evaluate(() => !!(FCP.giftState() || {}).code), { timeout: 30_000 }).toBe(true);
  expect(await page.evaluate(() => Game.hasBuff("Gifted out") ? 1 : 0)).toBe(1);
  // An hour later (the game's gift cooldown), the code is redeemed.
  await page.evaluate(() => { Game.buffs["Gifted out"].time = 0; });
  await wonSoon(page, "No time like the present", 30_000);
  await expect.poll(() => page.evaluate(() => Game.promptOn), { timeout: 10_000 }).toBeFalsy();
  noErrors(errors);
});

test("Ascension marathon: ascends each time the run is worth one more prestige level", async ({ page }) => {
  test.setTimeout(150_000);
  const errors = await loadGame(page);
  const start = await page.evaluate(() => Game.resets);
  await setOptions(page, { ascensionMarathon: 1 });
  await page.waitForTimeout(3000);
  expect(await page.evaluate(() => [Game.resets, !!Game.AscendTimer || !!Game.OnAscend])).toEqual([start, false]); // nothing to gain yet
  // A very fast run: one prestige level's worth of cookies every second.
  await page.evaluate(() => { window.fastRun = setInterval(() => { if (!Game.OnAscend && !Game.AscendTimer) Game.Earn(FCP.nextLevelCookies() + 1); }, 1000); });
  await expect.poll(() => page.evaluate(() => Game.resets), { timeout: 120_000 }).toBeGreaterThanOrEqual(start + 3);
  await page.evaluate(() => clearInterval(window.fastRun));
  await setOptions(page, { ascensionMarathon: 0 });
  noErrors(errors);
});

test("the click speed can't count for more than the game's 50 clicks per second", async ({ page }) => {
  const errors = await loadGame(page);
  await setOptions(page, { measuredClicks: 0 });
  const r = await page.evaluate(() => [baseClickingCps(250), baseClickingCps(50)]);
  expect(r[0]).toBe(r[1]);
  noErrors(errors);
});
