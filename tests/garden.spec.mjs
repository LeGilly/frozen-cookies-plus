// Fast-forwards the garden thousands of ticks: the bot must breed every seed, then sacrifice once.
import { test, expect } from "@playwright/test";
import { loadGame, richGame, setOptions, noErrors } from "./game.mjs";

test("the garden bot unlocks all seeds and sacrifices the garden for Seedless to nay", async ({ page }) => {
  test.setTimeout(600_000);
  const errors = await loadGame(page);
  await richGame(page, { cookies: 1e30, buildings: 400, lumps: 2000 });
  await setOptions(page, { autoLumps: 2 });
  await expect.poll(() => page.evaluate(() => Game.Objects.Farm.level), { timeout: 40_000 }).toBeGreaterThanOrEqual(9);
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

test("a new seed's plant grows on fertilizer, and the ascension waits for it however long it takes", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page, { cookies: 1e30, buildings: 400, lumps: 2000 });
  await setOptions(page, { autoLumps: 2 });
  await expect.poll(() => page.evaluate(() => Game.Objects.Farm.level), { timeout: 40_000 }).toBeGreaterThanOrEqual(9);
  await setOptions(page, { autoGarden: 1 });
  await page.waitForFunction(() => Game.Objects.Farm.minigame && Game.Objects.Farm.minigame.plot);
  const r = await page.evaluate(() => {
    const G = Game.Objects.Farm.minigame;
    const soilKey = () => G.soilsById[G.soil].key;
    G.nextSoil = 0;
    FCP.gardenTick();
    const breeding = soilKey();
    // A Duketater appears (17.6 hours on woodchips): the seed isn't ours yet.
    const p = G.plants.duketater;
    p.unlocked = 0;
    G.plot[0][0] = [p.id + 1, 5];
    G.nextSoil = 0;
    FCP.gardenTick();
    const growing = soilKey();
    const hold = FCP.ascendHolds().map((h) => h.label).filter((l) => /seed/.test(l))[0];
    return { breeding, growing, hold, status: FCP.status["Garden"] };
  });
  expect(r.breeding).toBe("woodchips");
  expect(r.growing).toBe("fertilizer");
  expect(r.hold).toMatch(/^new Duketater seed \(\d+h/);
  expect(r.status).toMatch(/^growing a new Duketater \(fertilizer\)/);
  noErrors(errors);
});
