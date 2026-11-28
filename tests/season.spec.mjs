// Smart season: Christmas while the run needs it, then the season that pays most.
import { test, expect } from "@playwright/test";
import { loadGame, richGame, setOptions, noErrors } from "./game.mjs";

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

test("it sets FC's default season only with the option and Autobuy Seasons on, with a 10% margin and an hour between changes", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page, { cookies: 1e30 });
  const r = await page.evaluate((done) => {
    eval("(" + done + ")")();
    localStorage.removeItem("fcpSeasonChange");
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
    // Less than an hour since the last change: it waits, and says so.
    const held = FrozenCookies.defaultSeason, heldStatus = FCP.status["Season"];
    const saved = JSON.parse(localStorage.getItem("fcpSeasonChange"));
    saved.t -= 3600e3;
    localStorage.setItem("fcpSeasonChange", JSON.stringify(saved));
    FCP.seasonTick();
    return { offToggle, on, status, margin, held, heldStatus, back: FrozenCookies.defaultSeason };
  }, christmasDone.toString());
  expect(r.offToggle).toBe(2);
  expect(r.on).toBe(1);
  expect(r.status).toMatch(/^Business day · Startrade \+1 million\/s vs reindeer \+100,000\/s/);
  expect(r.margin).toBe(1);
  expect(r.held).toBe(1);
  expect(r.heldStatus).toMatch(/^Business day · .* · Christmas pays more: switching in (1h|59m)/);
  expect(r.back).toBe(2);
  noErrors(errors);
});

test("the choice is judged at the run's settled state: elders calmed (Elder Pledge option) and a full golden cookie bank", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page, { cookies: 1e60, buildings: 600 });
  await setOptions(page, { autoBuy: 0, smartSeason: 0 }); // nothing buys or updates the average meanwhile
  const r = await page.evaluate(() => {
    FrozenCookies.elderPledgeAchievs = 1;
    const full = Game.cookies;
    FCP.seasonBank = { value: null, t: 0 };
    Game.elderWrath = 0;
    FCP.updateSeasonBank();
    const calm = [FCP.reindeerIncome(), FCP.goldenIncomeBase()];
    // Elders angry (waiting for wrinkler pops) and the cookies drained by a purchase, 10 seconds
    // later: the same reindeer number, and the golden one barely moves.
    Game.elderWrath = 3; Game.cookies = full * 0.2;
    FCP.seasonBank.t -= 10e3;
    FCP.updateSeasonBank();
    const angry = [FCP.reindeerIncome(), FCP.goldenIncomeBase()];
    // Without the option nothing calms them: the current wrath counts.
    FrozenCookies.elderPledgeAchievs = 0;
    const noOption = FCP.reindeerIncome();
    return { calm, angry, noOption };
  });
  expect(r.angry[0]).toBe(r.calm[0]);
  expect(Math.abs(r.angry[1] / r.calm[1] - 1)).toBeLessThan(0.01);
  expect(r.noOption).toBeGreaterThan(r.calm[0] * 2);
  noErrors(errors);
});

test("after a Cookie storm's switch to Easter, it goes back to the season it left once the storm ends", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page, { cookies: 1e30 });
  const r = await page.evaluate(() => {
    localStorage.removeItem("fcpStormReturn");
    FrozenCookies.autoEaster = 1;
    Game.Upgrades["Season switcher"].earn();
    for (const s in Game.seasons) Game.Unlock(Game.seasons[s].trigger);
    Game.Upgrades["Festive biscuit"].buy(1);
    const start = Game.season;
    Game.gainBuff("cookie storm", 7);
    autoEasterAction();
    const duringStorm = Game.season;
    FCP.stormReturnTick();
    const stillStorm = Game.season;
    Game.killBuff("Cookie storm");
    return { start, duringStorm, stillStorm };
  });
  // The buff is gone on the next game frame.
  await page.waitForFunction(() => !Game.hasBuff("Cookie storm"));
  Object.assign(r, await page.evaluate(() => {
    FCP.stormReturnTick();
    return { after: Game.season, stored: localStorage.getItem("fcpStormReturn") };
  }));
  expect(r.start).toBe("christmas");
  expect(r.duringStorm).toBe("easter");
  expect(r.stillStorm).toBe("easter");
  expect(r.after).toBe("christmas");
  expect(r.stored).toBe(null);
  noErrors(errors);
});

test("Smart season decides nothing while the game window can't be seen", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page, { cookies: 1e30 });
  const r = await page.evaluate(() => {
    localStorage.removeItem("fcpSeasonChange");
    Game.Upgrades["Season switcher"].earn();
    Game.Upgrades["Startrade"].earn();
    FCP.christmasGoals = () => [];
    FCP.goldenIncomeBase = () => 1e6 / (1 / 0.95 - 1);
    FCP.reindeerIncome = () => 1e5;
    FrozenCookies.defaultSeasonToggle = 1;
    FrozenCookies.defaultSeason = 2;
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    FCP.seasonTick();
    const hidden = FrozenCookies.defaultSeason;
    delete document.hidden;
    FCP.seasonTick();
    return { hidden, visible: FrozenCookies.defaultSeason };
  });
  expect(r).toEqual({ hidden: 2, visible: 1 });
  noErrors(errors);
});
