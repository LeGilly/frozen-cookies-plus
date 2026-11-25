// The upgrade tracker: what this run is missing for "Upgrades unlocked" 100%, and where it comes from.
import { test, expect } from "@playwright/test";
import { loadGame, richGame, noErrors } from "./game.mjs";

test("every missing upgrade gets a source, and the totals match the game's stats", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page);
  const r = await page.evaluate(() => {
    const rep = FCP.upgradeReport();
    const total = Object.values(Game.Upgrades).filter((u) => Game.CountsAsUpgradeOwned(u.pool)).length;
    const missing = Object.values(rep.groups).reduce((n, g) => n + g.length, 0);
    return { rep, total, missing, other: rep.groups.Other || [] };
  });
  expect(r.rep.total).toBe(r.total);
  expect(r.rep.owned + r.missing).toBe(r.total);
  expect(r.other).toEqual([]); // nothing unexplained
  const hints = (group) => r.rep.groups[group].map((u) => u.dname + ": " + u.hint);
  expect(hints("Elder Pledges")).toEqual(["Sacrificial rolling pins: 10 Elder Pledges in one run (0/10)"]);
  expect(hints("Christmas").some((h) => /^Weighted sleighs: Santa's gift/.test(h))).toBe(true);
  expect(hints("Dragon").some((h) => /^Dragon fang: pet the dragon/.test(h))).toBe(true);
  noErrors(errors);
});

test("the FC menu lists missing upgrades by source, and the infobox sums them up", async ({ page }) => {
  const errors = await loadGame(page);
  await page.evaluate(() => Game.ShowMenu("fc_menu"));
  await expect(page.locator("#fcpAchievements")).toContainText(/Upgrades this run: \d+ \/ \d+ \(heavenly: \d+ \/ \d+\)/);
  await page.locator("#fcpAchievements a", { hasText: "Show missing upgrades" }).click();
  await expect(page.locator("#fcpAchievements")).toContainText("Kittens (milk)");
  expect(await page.evaluate(() => FCP.upgradeSummary())).toMatch(/^\d+\/\d+ · heavenly \d+\/\d+ · missing: /);
  noErrors(errors);
});
