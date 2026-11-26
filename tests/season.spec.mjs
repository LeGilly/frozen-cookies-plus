// Smart season: Christmas while the run needs it, then the season that pays most.
import { test, expect } from "@playwright/test";
import { loadGame, richGame, noErrors } from "./game.mjs";

// Everything Christmas gives in a run, done.
const christmasDone = () => {
  Game.Win("Reindeer sleigher");
  Game.Win("Baby it's old outside");
  Game.Upgrades["A festive hat"].earn();
  Game.santaLevel = Game.santaLevels.length - 1;
  holidayCookies.christmas.forEach((id) => Game.UpgradesById[id].unlock());
};

test("it stays in Christmas while the run needs it, and says for what", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page);
  const r = await page.evaluate(() => {
    Game.Upgrades["Season switcher"].earn();
    Game.Upgrades["Startrade"].earn();
    Game.reindeerClicked = 52;
    return FCP.bestSeason();
  });
  expect(r.season).toBe("christmas");
  expect(r.why).toMatch(/^reindeer 52\/200, Santa/);
  noErrors(errors);
});

test("once Christmas is done, Startrade's golden cookies beat reindeer when golden cookies are most of the income", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page, { cookies: 1e30 });
  const r = await page.evaluate((done) => {
    eval("(" + done + ")")();
    Game.Upgrades["Season switcher"].earn();
    const golden = FCP.goldenIncomeBase(), reindeer = FCP.reindeerIncome();
    const without = FCP.bestSeason().season;
    Game.Upgrades["Startrade"].earn();
    const vals = FCP.seasonValues();
    // FC's golden cookie model has no season bonus: the base is the same in Business Day.
    Game.season = "fools";
    const baseInFools = FCP.goldenIncomeBase();
    Game.season = "";
    return { golden, reindeer, without, vals, best: FCP.bestSeason(), baseInFools };
  }, christmasDone.toString());
  expect(r.golden).toBeGreaterThan(0);
  expect(r.without).toBe("christmas");
  const trade = r.vals.find((v) => v.season === "fools");
  expect(trade.value / r.golden).toBeCloseTo(1 / 0.95 - 1, 6);
  expect(r.baseInFools / r.golden).toBeCloseTo(1, 6);
  // Which one wins depends on the save; the choice must follow the numbers.
  expect(r.best.season).toBe(trade.value > r.reindeer ? "fools" : "christmas");
  expect(r.best.why).toMatch(/\+.*\/s vs .*\+.*\/s/);
  noErrors(errors);
});

test("it sets FC's default season only with the option and Autobuy Seasons on, with a 10% margin to switch back", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page, { cookies: 1e30 });
  const r = await page.evaluate((done) => {
    eval("(" + done + ")")();
    Game.Upgrades["Season switcher"].earn();
    Game.Upgrades["Startrade"].earn();
    // Golden cookies worth far more than reindeer, then about the same.
    FCP.goldenIncomeBase = () => 1e6 / (1 / 0.95 - 1);
    FCP.reindeerIncome = () => 1e5;
    FrozenCookies.defaultSeason = 2;
    FrozenCookies.defaultSeasonToggle = 0;
    FCP.seasonTick();
    const offToggle = FrozenCookies.defaultSeason;
    FrozenCookies.defaultSeasonToggle = 1;
    FCP.seasonTick();
    const on = FrozenCookies.defaultSeason, status = FCP.status["Season"];
    FCP.reindeerIncome = () => 1.05e6; // 5% better: not enough to switch back
    FCP.seasonTick();
    const margin = FrozenCookies.defaultSeason;
    FCP.reindeerIncome = () => 1.2e6;
    FCP.seasonTick();
    return { offToggle, on, status, margin, back: FrozenCookies.defaultSeason };
  }, christmasDone.toString());
  expect(r.offToggle).toBe(2);
  expect(r.on).toBe(1);
  expect(r.status).toMatch(/^Business day · Startrade \+1 million\/s vs reindeer \+100,000\/s/);
  expect(r.margin).toBe(1);
  expect(r.back).toBe(2);
  noErrors(errors);
});
