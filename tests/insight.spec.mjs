// Cookie Monster-style insight: store colours and badges, tooltips, and the income breakdown.
import { test, expect } from "@playwright/test";
import { loadGame, setOptions, noErrors } from "./game.mjs";

async function midGame(page) {
  await page.evaluate(() => {
    Game.Earn(1e13);
    [80, 60, 40, 30, 20, 12, 8, 5, 2].forEach((n, i) => Game.ObjectsById[i].buy(n));
    Game.cookies = 3e9;
    Game.RebuildUpgrades();
    Game.RefreshStore();
  });
}

test("building rows show a rating colour, income gain and share of production", async ({ page }) => {
  const errors = await loadGame(page);
  await midGame(page);
  await setOptions(page, { autoBuy: 0, insights: 1 });
  const mine = page.locator("#product3 .fcpProdInfo");
  await expect(mine).toContainText(/\+[\d.<]+% income · [\d.]+% of production/, { timeout: 10_000 });
  // The numbers are coloured: the best income gain among the buildings is green.
  const colours = await page.evaluate(() => [...document.querySelectorAll(".fcpProdInfo b")].map((b) => b.style.color));
  expect(colours.length).toBeGreaterThan(2);
  expect(colours).toContain("rgb(105, 240, 174)");
  expect(await page.locator("#product3 .fcpProdBar").evaluate((e) => getComputedStyle(e).backgroundColor)).not.toBe("");
  // Every store upgrade gets a rating dot; exactly one thing in the store is the best buy (green).
  await expect(page.locator("#upgrade0 .fcpUpgDot")).toHaveCount(1);
  const greens = await page.evaluate(() =>
    [...document.querySelectorAll(".fcpUpgDot, .fcpProdBar")].filter((e) => getComputedStyle(e).backgroundColor === "rgb(76, 175, 80)").length);
  expect(greens).toBeGreaterThanOrEqual(1);
  // Turned off, the badges go away.
  await setOptions(page, { insights: 0 });
  await expect(page.locator(".fcpProdInfo")).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator(".fcpUpgDot")).toHaveCount(0);
  noErrors(errors);
});

test("tooltips explain rating, income gain, payback and price", async ({ page }) => {
  const errors = await loadGame(page);
  await midGame(page);
  await setOptions(page, { autoBuy: 0, insights: 1 });
  await expect(page.locator("#product3 .fcpProdInfo")).not.toBeEmpty({ timeout: 10_000 });
  const building = await page.evaluate(() => Game.ObjectsById[3].tooltip());
  for (const text of ["Frozen Cookies Plus", "Rating", "Income gain", "Pays for itself in", "Share of production", "Each produces"])
    expect(building).toContain(text);
  const upgrade = await page.evaluate(() => Game.crateTooltip(Game.UpgradesInStore[0], "store"));
  for (const text of ["Frozen Cookies Plus", "Rating", "Price"]) expect(upgrade).toContain(text);
  expect(upgrade).toMatch(/#\d+ of \d+/);
  noErrors(errors);
});

test("the FC menu shows where cookies come from, by source and by building", async ({ page }) => {
  const errors = await loadGame(page);
  await midGame(page);
  await setOptions(page, { autoBuy: 0, insights: 1 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => Game.ShowMenu("fc_menu"));
  const income = page.locator("#fcpIncome");
  await expect(income).toContainText("Where your cookies come from");
  await expect(income).toContainText("By source");
  await expect(income).toContainText("Buildings");
  await expect(income).toContainText("By building");
  await expect(income).toContainText("Shipment ×2");
  noErrors(errors);
});
