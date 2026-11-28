// Smart bulk buy: how many buildings FC buys when the store is on x10/x100.
import { test, expect } from "@playwright/test";
import { loadGame, richGame, setOptions, noErrors } from "./game.mjs";

// Counts with a made-up bank and recommendation list (FC's own functions are swapped out).
const count = (page, { spare, mineEff = 1, altEff = Infinity, ask = 100 }) =>
  page.evaluate(({ spare, mineEff, altEff, ask }) => {
    const b = Game.Objects["Farm"];
    const keep = { delayAmount: window.delayAmount, recommendationList: window.recommendationList };
    window.delayAmount = () => 1000;
    window.recommendationList = () => [
      { type: "building", purchase: b, efficiency: mineEff },
      { type: "upgrade", purchase: {}, efficiency: altEff },
    ];
    Game.cookies = 1000 + spare * b.getPrice();
    try { return FCP.smartBulkCount(b, ask); } finally { Object.assign(window, keep); }
  }, { spare, mineEff, altEff, ask });

test("early in a run (lots of spare cookies, nothing better to buy) it still buys the full 100", async ({ page }) => {
  const errors = await loadGame(page);
  expect(await count(page, { spare: 1e9 })).toBe(100);
  noErrors(errors);
});

test("it never spends the golden cookie bank: only what fits above it", async ({ page }) => {
  const errors = await loadGame(page);
  expect(await count(page, { spare: 1.5 })).toBe(1);   // the 2nd costs 1.15x: doesn't fit
  expect(await count(page, { spare: 2.2 })).toBe(2);   // 1 + 1.15 = 2.15 fits, 3rd doesn't
  noErrors(errors);
});

test("it stops when the next unit is worse value than the best other purchase", async ({ page }) => {
  const errors = await loadGame(page);
  // Units score 1, 1.15, 1.32, 1.52, 1.75... against an alternative scoring 1.6: four are better.
  expect(await count(page, { spare: 1e9, mineEff: 1, altEff: 1.6 })).toBe(4);
  noErrors(errors);
});

test("FC's own autobuy at x100 keeps its bank with smart bulk on", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page, { cookies: 0, buildings: 50, lumps: 0 });
  await page.evaluate(() => document.getElementById("storeBulk100").click());
  // Upgrades are kept out of the way (FC's HARDCORE blacklist) so the next purchases are buildings.
  await setOptions(page, { autoBuy: 1, smartBulk: 1, blacklist: 2 });
  // FC's bank target settles over a few seconds: keep topping up to 1.5x the bank until it buys.
  await expect.poll(() => page.evaluate(() => {
    if (!FCP.lastSmartBulk) Game.cookies = Math.max(Game.cookies, delayAmount() * 1.5);
    return FCP.lastSmartBulk && FCP.lastSmartBulk.bought;
  }), { timeout: 30_000, intervals: [1000] }).toBeGreaterThan(0);
  const last = await page.evaluate(() => FCP.lastSmartBulk);
  expect(last.asked).toBe(100);
  expect(last.cookiesAfter).toBeGreaterThanOrEqual(last.bank * 0.999); // the bank survived the purchase
  noErrors(errors);
});

test("burst buying: a windfall is spent several purchases at a time, above the bank", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page, { cookies: 0, buildings: 200, lumps: 0 });
  await setOptions(page, { autoBuy: 1, burstBuy: 1, smartBulk: 1 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => { FCP.burstCount = 0; Game.cookies += Game.cookiesPs * 86400 * 30; }); // a month of income at once
  await expect.poll(() => page.evaluate(() => FCP.burstCount), { timeout: 20_000 }).toBeGreaterThan(5);
  expect(await page.evaluate(() => Game.cookies >= delayAmount() * 0.999)).toBe(true);
  noErrors(errors);
});

test("FC's Mine, Factory and Wizard tower caps are lifted to 700 while FC decides, once that's cheap; settings stay", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page, { cookies: 1e60 });
  const r = await page.evaluate(() => {
    Object.assign(FrozenCookies, { mineLimit: 1, mineMax: 500, factoryLimit: 1, factoryMax: 500, towerLimit: 1, manaMax: 37 });
    Game.Objects.Mine.amount = 500; Game.Objects.Factory.amount = 500; Game.Objects["Wizard tower"].amount = 650;
    // The buildings FC considers buying (a capped one is left out).
    const blocked = () => { buildingStats(true); return FrozenCookies.caches.buildings.map((b) => b.id); };
    FrozenCookies.smartCaps = 0;
    const off = blocked();
    FrozenCookies.smartCaps = 1;
    const on = blocked();
    const settings = [FrozenCookies.mineMax, FrozenCookies.factoryMax, FrozenCookies.towerLimit];
    FCP.capsTick();
    // Not affordable: the caps stay.
    Game.cookies = 1;
    const poor = FCP.capLift();
    return { off, on, settings, status: FCP.status["Building caps"], poor };
  });
  // FC leaves the capped buildings out of its list: Mine 3, Factory 4 (and the towers once the Grimoire is there).
  expect(r.off).not.toContain(3);
  expect(r.off).not.toContain(4);
  expect(r.on).toContain(3);
  expect(r.on).toContain(4);
  expect(r.settings).toEqual([500, 500, 1]);
  expect(r.status).toMatch(/^mines 500, factories 500, wizard towers 650 → 700/);
  expect(r.poor).toEqual({ Mine: false, Factory: false, "Wizard tower": false });
  noErrors(errors);
});

test("FC's reward-cookie limit restore never sells Wizard towers down to the 37 max-magic setting", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page);
  const r = await page.evaluate(() => {
    Object.assign(FrozenCookies, { towerLimit: 1, manaMax: 37, mineLimit: 1, mineMax: 50 });
    const towers = Game.Objects["Wizard tower"].amount;
    restoreBuildingLimits();
    return { before: towers, after: Game.Objects["Wizard tower"].amount, mines: Game.Objects.Mine.amount, tl: FrozenCookies.towerLimit };
  });
  expect(r.before).toBeGreaterThan(37);
  expect(r.after).toBe(r.before);
  expect(r.mines).toBeLessThanOrEqual(50); // the other limits still apply
  expect(r.tl).toBe(1);
  noErrors(errors);
});

test("burst buying: units that cost under 1% of the spare cookies are bought without comparing value", async ({ page }) => {
  const errors = await loadGame(page);
  // 1% of a billion units' worth covers all 100 (about 7.8 million), even against a better alternative.
  await setOptions(page, { burstBuy: 1 });
  expect(await count(page, { spare: 1e9, mineEff: 1, altEff: 1.6 })).toBe(100);
  // Without burst buying, the value comparison still decides.
  await setOptions(page, { burstBuy: 0 });
  expect(await count(page, { spare: 1e9, mineEff: 1, altEff: 1.6 })).toBe(4);
  noErrors(errors);
});

test("with the store on x1, FC's autobuy still buys 100 at a time early in a run", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page, { cookies: 0, buildings: 0, lumps: 0 });
  await page.evaluate(() => document.getElementById("storeBulk1").click());
  await setOptions(page, { autoBuy: 1, smartBulk: 1, burstBuy: 1, blacklist: 2 });
  await page.evaluate(() => {
    // The most units any one of FC's purchases got (the store asks for 1 each time).
    FCP.mostBulk = 0;
    const inner = window.safeBuy;
    window.safeBuy = function (b, n) {
      const r = inner.apply(this, arguments);
      if (FCP.lastSmartBulk && FCP.lastSmartBulk.asked === 1) FCP.mostBulk = Math.max(FCP.mostBulk, FCP.lastSmartBulk.bought);
      return r;
    };
    Game.cookies = 1e15;
  });
  await expect.poll(() => page.evaluate(() => FCP.mostBulk), { timeout: 20_000 }).toBe(100);
  expect(await page.evaluate(() => Game.buyBulk)).toBe(1); // the store's button is left alone
  noErrors(errors);
});

test("FC's building limits still hold when FC+ decides the count", async ({ page }) => {
  const errors = await loadGame(page);
  await richGame(page, { cookies: 1e60 });
  await page.evaluate(() => Game.Objects["Wizard tower"].levelUp(true)); // a free level: the Grimoire loads
  await page.waitForFunction(() => Game.Objects["Wizard tower"].minigameLoaded, null, { timeout: 30_000 });
  const r = await page.evaluate(() => {
    Object.assign(FrozenCookies, { smartBulk: 1, burstBuy: 1, mineLimit: 1, mineMax: 500, factoryLimit: 1, factoryMax: 500,
      towerLimit: 1, manaMax: 85, autoDragonOrbs: 1, orbLimit: 1, orbMax: 330, autoCasting: 0 });
    const o = Game.Objects;
    o.Mine.amount = 497; o.Factory.amount = 500; o.You.amount = 320;
    const towers = o["Wizard tower"], M = towers.minigame;
    // FC's autoCookie purchase with the store on x1 (count 1), as FC+ sees it.
    FCP.inAutoCookie = true;
    try { safeBuy(o.Mine, 1); safeBuy(o.You, 1); safeBuy(towers, 1); } finally { FCP.inAutoCookie = false; }
    M.computeMagicM();
    return { mines: o.Mine.amount, factories: FCP.fcLimit(o.Factory), you: o.You.amount,
      magicM: M.magicM, towerLeft: FCP.fcLimit(towers), farms: FCP.fcLimit(o.Farm) };
  });
  expect(r.mines).toBe(500);
  expect(r.factories).toBe(0);
  expect(r.you).toBe(330);
  expect(r.magicM).toBeGreaterThanOrEqual(85);  // towers stopped where max magic reaches the setting...
  expect(r.towerLeft).toBe(0);                  // ...and no more are allowed
  expect(r.farms).toBe(Infinity);
  noErrors(errors);
});
