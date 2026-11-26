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

test("after the unlocks, the levels that help the minigames come first, then the costliest buildings to 10", async ({ page }) => {
  const errors = await loadGame(page);
  const r = await page.evaluate(() => {
    const targets = FCP.lumpTargets().map((t) => t[0] + " " + t[1]);
    // Cursor at level 3: the next level opens the second bank office.
    Game.ObjectsById.forEach((o) => { o.level = 10; });
    Game.Objects.Farm.level = 9; Game.Objects.Cursor.level = 3;
    Game.lumpsTotal = 1; Game.lumps = 0;
    FrozenCookies.autoLumps = 2;
    FCP.lumpStep();
    return { targets, status: FCP.status["Sugar lumps"], last: Game.ObjectsById[Game.ObjectsById.length - 1].name };
  });
  expect(r.targets.slice(0, 4)).toEqual(["Farm 9", "Cursor 12", "Bank 10", r.last + " 10"]);
  // Wizard tower, Temple and Farm (to 10) wait for the CpS round, costliest first, the Farm near the end.
  expect(r.targets).toContain("Wizard tower 10");
  expect(r.targets).toContain("Temple 10");
  expect(r.targets.indexOf("Farm 10")).toBeGreaterThan(r.targets.indexOf("Temple 10"));
  expect(r.targets.filter((t) => /^(Cursor|Bank) /.test(t))).toEqual(["Cursor 12", "Bank 10"]);
  expect(r.status).toMatch(/^Cursor → lvl 4\/12 \(bank office 3\)/);
  noErrors(errors);
});
