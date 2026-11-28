// Measured click speed: real clicks per second replace the configured speed in estimates and scoring.
import { test, expect } from "@playwright/test";
import { loadGame, setOptions, noErrors } from "./game.mjs";

test("the real click rate is measured and used instead of the configured 250/s", async ({ page }) => {
  const errors = await loadGame(page);
  await setOptions(page, { autoClick: 1, cookieClickSpeed: 250, measuredClicks: 1, challengeRuns: 0 });
  const r = await page.evaluate(() => {
    // 20 seconds of autoclicking at 25 clicks/s, fed to the measurement with a fake clock.
    const realNow = Date.now, start = realNow();
    FCP.clicks.samples = []; FCP.clicks.measured = null;
    for (let s = 0; s <= 20; s++) {
      Date.now = () => start + s * 1000;
      Game.cookieClicks = 1000 + 25 * s;
      FCP.clickTick();
    }
    Date.now = realNow;
    const configured = FrozenCookies.measuredClicks;
    FrozenCookies.measuredClicks = 0;
    const unscaled = baseClickingCps(250);
    FrozenCookies.measuredClicks = configured;
    return { measured: FCP.clicks.measured, ratio: FCP.clickRatio(), scaled: baseClickingCps(250), unscaled,
      rate: FCP.cookieRate() - Game.cookiesPs, perClick: Game.computedMouseCps };
  });
  expect(r.measured).toBeCloseTo(25, 5);
  expect(r.ratio).toBeCloseTo(0.5, 5);                  // 25 of the 50 clicks/s the game allows
  expect(r.scaled).toBeCloseTo(r.unscaled * 0.5, 5);   // FC values clicking at 25/s, not 250/s
  expect(r.rate).toBeCloseTo(r.perClick * 25, 5);        // time estimates use 25/s too
  await setOptions(page, { fancyui: 1 });
  await expect(page.locator("#fcpInfoPanel")).toContainText("25/s (set 250/s, game max 50/s)", { timeout: 15_000 });
  noErrors(errors);
});

test("while the game window can't be seen, the measured click rate keeps its last value", async ({ page }) => {
  const errors = await loadGame(page);
  const r = await page.evaluate(() => {
    FrozenCookies.autoClick = 1; FrozenCookies.cookieClickSpeed = 50; FrozenCookies.measuredClicks = 1;
    FCP.clicks.measured = 42;
    FCP.clicks.samples = [{ t: Date.now() - 20000, clicks: Game.cookieClicks, frenzy: false }];
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    FCP.clickTick(); // no clicks in 20 s, but hidden: not measured as 0
    const hidden = FCP.clicks.measured;
    delete document.hidden;
    return { hidden, samples: FCP.clicks.samples.length };
  });
  expect(r.hidden).toBe(42);
  expect(r.samples).toBe(0);
  noErrors(errors);
});
