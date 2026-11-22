// Fast-forwards the garden thousands of ticks: the bot must breed every seed, then sacrifice once.
import { test, expect } from "@playwright/test";
import { loadGame, richGame, setOptions, noErrors } from "./game.mjs";

test("the garden bot unlocks all seeds and sacrifices the garden for Seedless to nay", async ({ page }) => {
  test.setTimeout(600_000);
  const errors = await loadGame(page);
  await richGame(page, { cookies: 1e30, buildings: 400, lumps: 2000 });
  await setOptions(page, { autoLumps: 2 });
  await expect.poll(() => page.evaluate(() => Game.Objects.Farm.level), { timeout: 20_000 }).toBeGreaterThanOrEqual(9);
  await setOptions(page, { autoGarden: 2 });
  await page.waitForFunction(() => Game.Objects.Farm.minigame && Game.Objects.Farm.minigame.plot);
  const result = await page.evaluate(() => {
    const G = Game.Objects.Farm.minigame;
    let most = 0;
    for (let step = 0; step < 20000 && !FCP.has("Seedless to nay"); step++) {
      Game.cookies = 1e30;
      G.nextStep = 0;
      G.logic();
      FCP.gardenTick();
      most = Math.max(most, G.plantsUnlockedN);
    }
    return { most, total: G.plantsN, keeper: FCP.has("Keeper of the conservatory"), seedless: FCP.has("Seedless to nay") };
  });
  expect(result.most).toBe(result.total);
  expect(result.keeper).toBe(true);
  expect(result.seedless).toBe(true);
  noErrors(errors);
});
