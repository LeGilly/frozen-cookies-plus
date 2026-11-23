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

test("during a Neverclick start, times use the real cookie rate instead of the paused autoclicker", async ({ page }) => {
  const errors = await loadGame(page);
  // A fresh save with one cursor (0.1 cookies/s) and 5 cookies, autoclick on at 250 clicks/s but paused:
  // the next cursor (18 cookies) is about 2 minutes away, not "now".
  await page.evaluate(() => { Game.cookies = 15; Game.Objects.Cursor.buy(1); Game.cookies = 5; Game.cookiesEarned = 20; });
  await setOptions(page, { challengeRuns: 1, autoClick: 1, cookieClickSpeed: 250, fancyui: 1 });
  const panel = page.locator("#fcpInfoPanel");
  await expect(panel).toContainText("Buying next", { timeout: 15_000 });
  await expect(panel).toContainText("no big cookie clicks", { timeout: 15_000 });
  const next = await page.evaluate(() => FCP.infoLines([]).find((l) => l.label === "Buying next").value);
  expect(next).toMatch(/ for [\d,.]+ · in (\d+m|\d+h)/); // minutes away, not "now"
  expect(next).not.toContain("now");
  noErrors(errors);
});

test("moving onto the big cookie doesn't wipe the left canvas for a frame", async ({ page }) => {
  const errors = await loadGame(page);
  await setOptions(page, { fancyui: 1 });
  await page.waitForTimeout(1500); // FC has drawn its "Frenzy" text layer
  const r = await page.evaluate(() => {
    const ctx = Game.LeftBackground, x = Game.cookieOriginX, y = Game.cookieOriginY;
    const before = ctx.getImageData(x, y, 1, 1).data[3];
    ctx.canvas.dispatchEvent(new MouseEvent("mouseout", { bubbles: true })); // the mouse goes onto the cookie
    return [before, ctx.getImageData(x, y, 1, 1).data[3]];
  });
  expect(r[0]).toBeGreaterThan(0);
  expect(r[1]).toBe(r[0]); // the cookie is still drawn
  noErrors(errors);
});

test("a golden cookie popup near the top of the screen stays whole", async ({ page }) => {
  const errors = await loadGame(page);
  await page.evaluate(() => Game.Popup("Lucky!<br><small>+71.921 trillion cookies!</small>", 600, 0));
  await page.waitForTimeout(1500); // the popup has finished rising
  const top = await page.evaluate(() => {
    const p = Game.textParticles.filter((x) => x.life >= 0 && /Lucky/.test(x.text)).pop();
    return [p.l.getBoundingClientRect().top, l("game").getBoundingClientRect().top + Game.bounds.top];
  });
  console.log("popup top", JSON.stringify(top));
  expect(top[0]).toBeGreaterThanOrEqual(top[1]); // not above the top of the game
  noErrors(errors);
});

test("the panel leaves room for Santa and the dragon at the bottom left", async ({ page }) => {
  const errors = await loadGame(page);
  await setOptions(page, { fancyui: 1 });
  await expect.poll(() => page.evaluate(() => l("fcpInfoPanel") ? parseInt(l("fcpInfoPanel").style.left) : -1), { timeout: 5000 }).toBe(10);
  await page.evaluate(() => Game.Upgrades["A crumbly egg"].earn()); // the dragon egg appears at the bottom left
  await expect.poll(() => page.evaluate(() => l("fcpInfoPanel") ? parseInt(l("fcpInfoPanel").style.left) : -1), { timeout: 5000 }).toBeGreaterThanOrEqual(80);
  noErrors(errors);
});
