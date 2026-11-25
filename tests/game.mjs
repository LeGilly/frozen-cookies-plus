// Opens the real game and loads the built Steam bundle into it, as the Steam app would.
import { expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const BUNDLE = readFileSync(new URL("../Steam/FrozenCookiesPlus/main.js", import.meta.url), "utf8");

export async function loadGame(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  // The game would call ad and analytics servers: the tests stay offline.
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await page.goto("/.game/index.html");
  await page.waitForFunction(() => window.Game && Game.ready, null, { timeout: 60_000 });
  await page.evaluate(() => Game.ClosePrompt && Game.ClosePrompt());
  // The Steam app runs in Electron, where `module` and `exports` exist: the bundle must cope.
  await page.evaluate(() => { window.module = { exports: {} }; window.exports = window.module.exports; });
  await page.addScriptTag({ content: BUNDLE });
  await page.waitForFunction(() => window.FCP && Game.mods["frozen_cookies_plus"], null, { timeout: 60_000 });
  // Skip the boot settling delay of smart ascension (ascend.spec.mjs tests it).
  await page.evaluate(() => { if (FCP.bootTime) FCP.bootTime = 0; });
  return errors;
}

// A late-ish game: lots of cookies, buildings and sugar lumps.
// Buildings are bought with plenty of cookies, then the bank is set to `cookies`.
export async function richGame(page, { cookies = 1e18, buildings = 320, lumps = 400 } = {}) {
  await page.evaluate(({ cookies, buildings, lumps }) => {
    Game.Earn(1e40);
    for (const name in Game.Objects) Game.Objects[name].buy(buildings);
    Game.cookies = cookies;
    Game.lumpsTotal = 100;
    Game.lumps = lumps;
  }, { cookies, buildings, lumps });
}

export async function setOptions(page, options) {
  await page.evaluate((o) => { Object.assign(FrozenCookies, o); FCStart(); }, options);
}

export const won = (page, name) => page.evaluate((n) => Game.Achievements[n].won, name);

export function noErrors(errors) {
  expect(errors, "no script errors").toEqual([]);
}
