// The infobox panel: readable HTML above the wheel, in plain words, with the Plus activity.
import { test, expect } from "@playwright/test";
import { loadGame, richGame, setOptions, noErrors } from "./game.mjs";

test("the infobox explains what happens next and what is being hunted", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page, { cookies: 5e13, buildings: 60, lumps: 3 });
  await setOptions(page, { autoBuy: 1, achievementHunter: 1, autoLumps: 2, autoGarden: 1, fancyui: 3 });
  const panel = page.locator("#fcpInfoPanel");
  await expect(panel).toBeVisible({ timeout: 20_000 });
  await expect(panel).toContainText("what happens next");
  await expect(panel).toContainText("Buying next");
  await expect(panel).toContainText("Next golden cookie");
  await expect(panel).toContainText("Achievement hunting (FC+)");
  await expect(panel).toContainText("Sugar lumps");
  await expect(panel).toContainText("Closest milestones");
  await expect(panel).not.toContainText("Done!");
  // Clicks go through to the game.
  expect(await panel.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  // Turning the infobox off hides it.
  await setOptions(page, { fancyui: 0 });
  await expect(panel).toBeHidden({ timeout: 5_000 });
  noErrors(errors);
});
