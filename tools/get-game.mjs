// Downloads the Cookie Clicker web version the tests run against into .game/ (ignored by git).
// Source: github.com/ozh/cookieclicker, a mirror of the official web version.
// Commit b843fa7 = web 2.052, the same content as Steam 2.053. Change GAME_COMMIT to test another version.
import { existsSync, mkdirSync, writeFileSync, rmSync, renameSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const GAME_COMMIT = "b843fa7";
const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DEST = join(ROOT, ".game");
const MARK = join(DEST, ".commit-" + GAME_COMMIT);

if (existsSync(MARK)) process.exit(0);
console.log("Downloading Cookie Clicker (" + GAME_COMMIT + ") for the tests...");
const res = await fetch("https://codeload.github.com/ozh/cookieclicker/tar.gz/" + GAME_COMMIT);
if (!res.ok) throw new Error("download failed: HTTP " + res.status);
rmSync(DEST, { recursive: true, force: true });
const tmp = join(ROOT, ".game-tmp");
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
const archive = join(tmp, "game.tar.gz");
writeFileSync(archive, Buffer.from(await res.arrayBuffer()));
// tar ships with Windows 10+, macOS and Linux.
execFileSync("tar", ["-xzf", "game.tar.gz"], { cwd: tmp });
const folder = readdirSync(tmp).find((n) => n.startsWith("cookieclicker-"));
renameSync(join(tmp, folder), DEST);
rmSync(tmp, { recursive: true, force: true });
writeFileSync(MARK, "");
console.log("Game ready in .game/");
