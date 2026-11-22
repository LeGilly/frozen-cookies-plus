// The infobox panel: readable HTML above the wheel, in plain words, with the Plus activity.
import { test, expect } from "@playwright/test";
import { loadGame, richGame, setOptions, noErrors } from "./game.mjs";

test("the infobox explains what happens next and what is being hunted", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page, { cookies: 5e13, buildings: 60, lumps: 3 });
  await setOptions(page, { autoBuy: 1, achievementHunter: 1, autoLumps: 2, autoGarden: 1, fancyui: 3 });
  const panel = page.locator("#fcpInfoPanel");
  await expect(panel).toBeVisible({ timeout: 20_000 });
  // Everything below is refreshed every half second; slow machines get some margin.
  await expect(panel).toContainText("what happens next");
  await expect(panel).toContainText("Buying next", { timeout: 15_000 });
  await expect(panel).toContainText("Next golden cookie", { timeout: 15_000 });
  await expect(panel).toContainText("Achievement hunting (FC+)", { timeout: 15_000 });
  await expect(panel).toContainText("Sugar lumps", { timeout: 15_000 });
  await expect(panel).toContainText("Closest milestones", { timeout: 15_000 });
  await expect(panel).not.toContainText("Done!");
  // Clicks go through to the game.
  expect(await panel.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  // Turning the infobox off hides it.
  await setOptions(page, { fancyui: 0 });
  await expect(panel).toBeHidden({ timeout: 5_000 });
  noErrors(errors);
});

test("the golden cookie line stays readable once the earliest time has passed", async ({ page }) => {
  const errors = await loadGame(page);
  const text = (displays) => page.evaluate((d) => {
    const t_d = [
      { name: "GC Maximum (99%)", display: d[2] },
      { name: "GC Estimate (50%)", display: d[1], overlay: true },
      { name: "GC Minimum (1%)", display: d[0], overlay: true },
    ];
    return FCP.infoLines(t_d).filter((l) => l.label === "Next golden cookie").map((l) => l.value).join("");
  }, displays);
  expect(await text(["3m 44s", "4m 59s", "5m 54s"])).toBe("likely in 4m 59s (between 3m 44s and 5m 54s)");
  expect(await text(["", "31s", "1m 21s"])).toBe("likely in 31s (could appear any moment, at the latest in 1m 21s)");
  expect(await text(["", "", "12s"])).toBe("any moment now (at the latest in 12s)");
  noErrors(errors);
});
