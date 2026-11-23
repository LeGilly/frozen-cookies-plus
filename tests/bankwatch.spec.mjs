// The infobox says why the golden cookie bank is below full.
import { test, expect } from "@playwright/test";
import { loadGame, richGame, setOptions, noErrors } from "./game.mjs";

// A save with a real bank target, FC not buying, and the bank exactly full.
async function fullBank(page, extra = 1) {
  await richGame(page, { cookies: 1e15, buildings: 80, lumps: 0 });
  await setOptions(page, { autoBuy: 0, autoGS: 0, fancyui: 3 });
  // FC keeps no bank when the next purchase is worth more; here it always keeps a Lucky! bank.
  await page.evaluate(() => { window.delayAmount = () => luckyBank(); });
  await page.evaluate((x) => { Game.recalculateGains = 1; Game.CalculateGains(); Game.cookies = delayAmount() * x; }, extra);
  expect(await page.evaluate(() => delayAmount())).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => FCP.bankWatch.full), { timeout: 5000 }).toBe(true);
  await page.waitForTimeout(2100); // the setup's own purchases are forgotten
}
const why = (page) => page.evaluate(() => FCP.bankWatch.why);

test("FC's own purchase that keeps the bank: the target grew with the income", async ({ page }) => {
  const errors = await loadGame(page);
  await fullBank(page);
  await page.evaluate(() => {
    const keep = delayAmount(), o = Game.ObjectsById.filter((b) => !b.locked).pop(); // the top building: a big step up in income
    Game.cookies += o.getSumPrice(20);
    FCP.withSpend("spendSource", "fc", () => o.buy(20)); // FC buys and keeps the bank it had
    Game.cookies = Math.max(Game.cookies, keep * 1.000001);
  });
  await expect.poll(() => why(page), { timeout: 5000 }).toMatch(/^buying .* raised your income, so the bank to aim for grew$/);
  await expect(page.locator("#fcpInfoPanel")).toContainText("Why not full", { timeout: 5000 });
  noErrors(errors);
});

test("a purchase that doesn't wait for the bank is named, with what it bought", async ({ page }) => {
  const errors = await loadGame(page);
  await fullBank(page);
  await page.evaluate(() => FCP.withSpend("spendSource", "the Godzamok combo", () => Game.Objects.Factory.buy(150)));
  await expect.poll(() => why(page), { timeout: 5000 }).toMatch(/spent on Factory by the Godzamok combo, which doesn't wait for the bank/);
  // The FC actions that skip the bank are all wrapped.
  expect(await page.evaluate(() => ["autoGSBuy", "buyOtherUpgrades", "autoEasterAction", "autoHalloweenAction", "autoGodzamokAction", "autoBankAction"]
    .filter((n) => !window[n].__fcpSource))).toEqual([]);
  noErrors(errors);
});

test("your own purchase, and cookies lost without buying anything", async ({ page }) => {
  const errors = await loadGame(page);
  await fullBank(page);
  await page.evaluate(() => Game.Objects.Factory.buy(150));
  await expect.poll(() => why(page), { timeout: 5000 }).toMatch(/^you spent .* on Factory/);
  await page.evaluate(() => { Game.cookies = delayAmount() * 1.01; });
  await expect.poll(() => page.evaluate(() => FCP.bankWatch.full), { timeout: 5000 }).toBe(true);
  expect(await why(page)).toBe("");
  await page.evaluate(() => { Game.cookies *= 0.5; });
  await expect.poll(() => why(page), { timeout: 5000 }).toMatch(/^lost .* cookies \(a wrath cookie or a spell backfire\)/);
  noErrors(errors);
});
