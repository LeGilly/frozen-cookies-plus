// Benchmark of FC's buying: fast-forwards the real game in a headless browser and measures
// cookies baked, so changes to the buying maths can be compared on identical starts.
//
//   npm run build && node tools/get-game.mjs
//   node tools/benchmark.mjs [--variants=base,achiev] [--seeds=3] [--scenarios=fresh,ascended]
//
// How it works: the game's own loop and every timer are stopped, the clock and Math.random are
// replaced (virtual time, seeded randomness), then the driver calls Game.Logic() frame by frame
// and FC's autoCookie() (buying + golden cookies) every frame. No clicking: it measures buying.
import { chromium } from "@playwright/test";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const VARIANTS = [...new Set((args.variants || "base,achiev").split(","))];
const SEEDS = Number(args.seeds || 3);
const SEED_START = Number(args.seedstart || 1);
const SCENARIOS = (args.scenarios || "fresh,ascended").split(",");
const PORT = Number(args.port || 8011);

// Scenario: where a run starts, how long it lasts (game seconds) and when to measure.
const SCENARIO = {
  // A brand new save: 0 prestige, 100 cookies to get going.
  fresh: { seconds: Number(args.hours || 4) * 3600, checkpoints: [1800, 3600, 7200, 14400] },
  // Right after an ascension with 10,000 prestige levels and every heavenly upgrade up to 1e6 chips.
  // A Born Again run with clicking at --clicks per second; reports when 1M cookies were reached.
  bornagain: { seconds: Number(args.hours || 0.5) * 3600, checkpoints: [300, 600, 900, 1500, 1800] },
  ascended: { seconds: Number(args.hours || 2) * 3600, checkpoints: [600, 1800, 3600, 7200] },
};

// --every=N adds a checkpoint every N game seconds (to follow a whole run, e.g. for ascension timing).
if (args.every) for (const k in SCENARIO) for (let t = Number(args.every); t <= SCENARIO[k].seconds; t += Number(args.every))
  if (!SCENARIO[k].checkpoints.includes(t)) SCENARIO[k].checkpoints.push(t);
for (const k in SCENARIO) SCENARIO[k].checkpoints.sort((a, b) => a - b);
for (const k in SCENARIO) SCENARIO[k].checkpoints = SCENARIO[k].checkpoints.filter((t) => t <= SCENARIO[k].seconds);
if (args.hours) for (const k in SCENARIO) if (!SCENARIO[k].checkpoints.includes(SCENARIO[k].seconds)) SCENARIO[k].checkpoints.push(SCENARIO[k].seconds);

const server = spawn(process.execPath, ["tests/serve.mjs", String(PORT)], { cwd: ROOT, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 800));
const bundle = readFileSync(new URL("../Steam/FrozenCookiesPlus/main.js", import.meta.url), "utf8");
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});

async function runOne(scenario, variant, seed) {
  const page = await browser.newPage();
  await page.route(/^https?:\/\/(?!localhost)/, (r) => r.abort());
  await page.goto(`http://localhost:${PORT}/.game/index.html`);
  await page.waitForFunction(() => window.Game && Game.ready, null, { timeout: 60_000 });
  await page.evaluate(() => Game.ClosePrompt && Game.ClosePrompt());
  await page.addScriptTag({ content: bundle });
  await page.waitForFunction(() => window.FCP && Game.mods["frozen_cookies_plus"], null, { timeout: 60_000 });
  await page.addScriptTag({ content: readFileSync(new URL("./bench-driver.js", import.meta.url), "utf8") });
  const t0 = Date.now();
  const result = await page.evaluate((o) => FCB.run(o), { scenario, variant, seed, clicks: Number(args.clicks || 0), ...SCENARIO[scenario] });
  result.wall = ((Date.now() - t0) / 1000).toFixed(0) + "s";
  await page.close();
  return result;
}

const fmt = (n) => (n >= 1e6 ? n.toExponential(3) : n.toFixed(1));
try {
  for (const scenario of SCENARIOS) {
    console.log(`\n== ${scenario} (${SCENARIO[scenario].seconds / 3600}h, ${SEEDS} seeds) ==`);
    const table = {};
    for (const variant of VARIANTS) {
      table[variant] = [];
      for (let s = SEED_START; s < SEED_START + SEEDS; s++) {
        const r = await runOne(scenario, variant, s);
        table[variant].push(r);
        console.log(`${variant.padEnd(10)} seed ${s}: ` +
          r.checkpoints.map((c) => `${c.t / 60}m ${fmt(c.baked)}`).join(" | ") +
          `  cps ${fmt(r.cps)}  achievs ${r.achievements}` + (r.reached ? `  1M at ${(r.reached / 60).toFixed(1)} min` : "") + `  (${r.wall})`);
      }
    }
    // Geometric mean of cookies baked at each checkpoint, relative to the first variant.
    const base = VARIANTS[0];
    const gmean = (xs) => Math.exp(xs.reduce((a, x) => a + Math.log(Math.max(x, 1)), 0) / xs.length);
    for (const variant of VARIANTS) {
      const rel = SCENARIO[scenario].checkpoints.map((t, i) => {
        const v = gmean(table[variant].map((r) => r.checkpoints[i].baked));
        const b = gmean(table[base].map((r) => r.checkpoints[i].baked));
        return `${t / 60}m ${((v / b - 1) * 100).toFixed(2)}%`;
      });
      console.log(`${variant.padEnd(10)} vs ${base}: ${rel.join(" | ")}`);
    }
  }
} finally {
  await browser.close();
  server.kill();
}
