// Sugar lump plan: every building assumed present.
import { test, expect } from "@playwright/test";
import { loadGame, setOptions, noErrors } from "./game.mjs";

test("early in a run, lumps wait for the next building in the plan instead of going elsewhere", async ({ page }) => {
  const errors = await loadGame(page);
  // A new run: only farms owned; levels from earlier runs: Farm 1, the rest 0.
  await page.evaluate(() => {
    Game.Earn(1e9); Game.Objects.Farm.buy(5); Game.Objects.Farm.level = 1;
    Game.lumpsTotal = 1; Game.lumps = 3; // Game.canLumps needs lumps unlocked
    Game.ObjectsById.forEach((o) => { if (o.name !== "Farm") o.level = 0; });
  });
  expect(await page.evaluate(() => Game.canLumps())).toBe(true);
  await setOptions(page, { autoLumps: 2, autoSugarFrenzy: 0, sugarBakingGuard: 0 });
  await page.waitForTimeout(6000);
  // No bank yet: nothing is spent (no Farm level 2 in the meantime), and the plan says why.
  expect(await page.evaluate(() => [Game.lumps, Game.Objects.Farm.level, Game.Objects.Bank.level])).toEqual([3, 1, 0]);
  expect(await page.evaluate(() => FCP.status["Sugar lumps"])).toContain("needs a bank");
  // A bank is bought: it gets its level.
  await page.evaluate(() => Game.Objects.Bank.buy(1));
  await expect.poll(() => page.evaluate(() => Game.Objects.Bank.level), { timeout: 15_000 }).toBe(1);
  noErrors(errors);
});

test("after the minigame targets, the costliest buildings come first, cursors last", async ({ page }) => {
  const errors = await loadGame(page);
  const order = await page.evaluate(() => FCP.lumpTargets().map((t) => t[0]));
  expect(order.slice(0, 4)).toEqual(["Farm", "Bank", "Wizard tower", "Temple"]);
  expect(order[4]).toBe(await page.evaluate(() => Game.ObjectsById[Game.ObjectsById.length - 1].name));
  expect(order[order.length - 1]).toBe("Cursor");
  noErrors(errors);
});
