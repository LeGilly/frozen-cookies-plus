// The version in frozen_cookies.js (shown in the FC menu and written to info.txt) matches the changelog.
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL("../" + p, import.meta.url), "utf8");

test("the mod version matches the newest changelog entry and the built info.txt", () => {
  const version = read("frozen_cookies.js").match(/version: "([^"]+)"/)[1];
  const changelog = read("CHANGELOG.md").match(/^## (\d+\.\d+\.\d+)/m)[1];
  const info = JSON.parse(read("Steam/FrozenCookiesPlus/info.txt"));
  expect(version).toBe(changelog);
  expect(info.ModVersion).toBe(version);
});
