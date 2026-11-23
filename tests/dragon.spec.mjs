// Smart dragon auras.
import { test, expect } from "@playwright/test";
import { loadGame, richGame, setOptions, noErrors } from "./game.mjs";

async function dragon(page, level) {
  await richGame(page, { cookies: 1e15, buildings: 120, lumps: 0 });
  await page.evaluate((lvl) => { Game.Upgrades["A crumbly egg"].earn(); Game.dragonLevel = lvl === "max" ? Game.dragonLevels.length - 1 : lvl; Game.dragonAura = 0; Game.dragonAura2 = 0; }, level);
}
const auras = (page) => page.evaluate(() => [Game.dragonAuras[Game.dragonAura].name, Game.dragonAuras[Game.dragonAura2].name]);

test("a young dragon gets the best aura it knows, paid with one top building", async ({ page }) => {
  const errors = await loadGame(page);
  await dragon(page, 19); // knows up to Radiant Appetite
  const top = await page.evaluate(() => { const b = Game.ObjectsById.filter((o) => o.amount > 0).pop(); return [b.name, b.amount]; });
  await setOptions(page, { smartAuras: 1, autoBuy: 0 });
  await expect.poll(() => auras(page), { timeout: 15_000 }).toEqual(["Radiant Appetite", "No aura"]);
  expect(await page.evaluate((n) => Game.Objects[n].amount, top[0])).toBe(top[1] - 1);
  noErrors(errors);
});

test("at the top level the second slot is used too, and FC's fixed auras are set aside", async ({ page }) => {
  const errors = await loadGame(page);
  await dragon(page, "max");
  await setOptions(page, { smartAuras: 1, autoBuy: 0, autoDragonToggle: 1, autoDragonAura0: 3, autoDragonAura1: 15 });
  await expect.poll(() => page.evaluate(() => Game.dragonAura && Game.dragonAura2 ? 1 : 0), { timeout: 15_000 }).toBe(1);
  const [a, b] = await auras(page);
  expect([a, b]).toContain("Radiant Appetite");
  expect(a).not.toBe(b);
  // A pair worth no more than 1% less than the best is kept: no switching back and forth.
  const kept = await auras(page);
  await page.waitForTimeout(6000);
  expect(await auras(page)).toEqual(kept);
  noErrors(errors);
});

test("off: nothing is changed", async ({ page }) => {
  const errors = await loadGame(page);
  await dragon(page, 19);
  await setOptions(page, { smartAuras: 0, autoBuy: 0, autoDragonToggle: 0 });
  await page.waitForTimeout(6000);
  expect(await auras(page)).toEqual(["No aura", "No aura"]);
  noErrors(errors);
});
