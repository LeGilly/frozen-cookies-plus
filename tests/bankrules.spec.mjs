// Bank rules: FC's purchases that used to skip the golden cookie bank.
import { test, expect } from "@playwright/test";
import { loadGame, richGame, setOptions, noErrors } from "./game.mjs";

const mice = ["Plastic mouse", "Iron mouse", "Titanium mouse", "Adamantium mouse", "Unobtainium mouse", "Eludium mouse",
  "Wishalloy mouse", "Fantasteel mouse", "Nevercrack mouse", "Armythril mouse", "Technobsidian mouse", "Plasmarble mouse"];

async function setup(page, opts = {}) {
  await richGame(page, { cookies: 1e15, buildings: 80, lumps: 0 });
  await setOptions(page, { autoBuy: 0, bankRules: 1, ...opts });
  await page.evaluate(() => { window.delayAmount = () => luckyBank(); Game.recalculateGains = 1; Game.CalculateGains(); Game.cookies = delayAmount(); });
}

test("Golden switch: turned on for a click buff only when the extra clicking pays for it", async ({ page }) => {
  const errors = await loadGame(page);
  await setup(page);
  const try_ = (rate) => page.evaluate((r) => {
    Game.Upgrades["Golden switch [on]"].bought = 0; Game.Upgrades["Golden switch [off]"].bought = 0; Game.Unlock("Golden switch [off]");
    FrozenCookies.autoClick = 1; FrozenCookies.cookieClickSpeed = 50; FrozenCookies.measuredClicks = 1; FCP.clicks.measured = r;
    Game.gainBuff("click frenzy", 13, 777); Game.recalculateGains = 1; Game.CalculateGains();
    Game.cookies = 1e40; const w = FCP.goldenSwitchWorth();
    autoGSBuy();
    const on = !!Game.Has("Golden switch [off]"); Game.killBuffs(); return { on, gain: w.gain, cost: w.cost };
  }, rate);
  await page.evaluate((m) => m.forEach((n) => Game.Upgrades[n].earn()), mice);
  const none = await try_(0);
  expect(none.on).toBe(false); // nobody clicking: pure loss
  const fast = await try_(50);
  expect(fast.gain).toBeGreaterThan(fast.cost);
  expect(fast.on).toBe(true);
  noErrors(errors);
});

test("Godzamok combo: skipped when the clicking bonus doesn't cover reselling mines and factories", async ({ page }) => {
  const errors = await loadGame(page);
  await setup(page);
  const run = (rate) => page.evaluate((r) => {
    if (typeof T === "undefined" || !T) window.T = {};
    Game.hasGod = (g) => (g === "ruin" ? 1 : 0);
    FrozenCookies.autoGodzamok = 1; FrozenCookies.autoClick = 1; FrozenCookies.cookieClickSpeed = 50; FrozenCookies.measuredClicks = 1; FCP.clicks.measured = r;
    Game.killBuffs(); Game.gainBuff("click frenzy", 13, 777);
    const w = FCP.godzamokWorth(); autoGodzamokAction();
    const fired = !!Game.hasBuff("Devastation"); Game.killBuffs(); return { fired, w };
  }, rate);
  expect((await run(0)).fired).toBe(false);
  // With fast clicking the bonus is weighed against the loss.
  await page.evaluate((m) => m.forEach((n) => Game.Upgrades[n].earn()), mice);
  const fast = await run(50);
  expect(fast.fired).toBe(fast.w.gain > fast.w.cost);
  noErrors(errors);
});

test("extra upgrades and the Halloween switch wait for the bank; reward cookies go through FC's chain", async ({ page }) => {
  const errors = await loadGame(page);
  await setup(page);
  const r = await page.evaluate(() => {
    const u = Game.Upgrades["Fern tea"]; u.unlocked = 1; u.bought = 0;
    u.priceFunc = () => delayAmount() * 0.5; // half the bank
    Game.cookies = delayAmount() * 1.2;   // affordable, but only by eating into the bank
    buyOtherUpgrades();
    const waited = !u.bought;
    Game.cookies = delayAmount() * 1.6;   // now it fits above the bank
    buyOtherUpgrades();
    return { waited, bought: !!u.bought, reward: isRewardCookie(Game.Upgrades["Milk chocolate butter biscuit"]) };
  });
  expect(r).toEqual({ waited: true, bought: true, reward: false });
  // Off: FC's old behaviour.
  await setOptions(page, { bankRules: 0 });
  expect(await page.evaluate(() => isRewardCookie(Game.Upgrades["Milk chocolate butter biscuit"]))).toBe(true);
  noErrors(errors);
});
