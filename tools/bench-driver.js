// In-page driver for tools/benchmark.mjs. Runs the game in virtual time with FC buying.
window.FCB = (function () {
    var noop = function () { return 0; };

    function stopEverything() {
        Game.Loop = noop;
        var max = setTimeout(noop, 0);
        for (var i = 0; i <= max + 1000; i++) {
            clearTimeout(i);
            clearInterval(i);
        }
        // Nothing may schedule real-time work any more (FC reschedules autoCookie itself).
        window.setTimeout = noop;
        window.setInterval = noop;
        window.requestAnimationFrame = noop;
        // Sound playback depends on whether audio files finished loading (and may use
        // randomness), and effects are not needed: switch them off so runs are reproducible.
        window.PlaySound = noop;
        window.PlayMusicSound = noop;
        window.PlayCue = noop;
        Game.prefs.particles = 0;
        Game.prefs.fancy = 0;
        Game.prefs.numbers = 0;
        Game.SparkleAt = noop;
        Game.SparkleOn = noop;
        Game.Popup = noop;
    }

    function prng(seed) {
        var a = seed >>> 0;
        return function () {
            a = (a + 0x6d2b79f5) >>> 0;
            var t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }
    function hash(str) {
        var h = 2166136261;
        for (var i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
        return h >>> 0;
    }
    function seedRandom(seed) {
        var main = prng(seed);
        Math.random = main;
        // The game uses the seedrandom library: Math.seedrandom(x) switches to a stream seeded by
        // x, and Math.seedrandom() switches back to an unpredictable one. Keep both reproducible.
        Math.seedrandom = function (s) {
            Math.random = s === undefined ? main : prng(hash(String(s)));
            return String(s);
        };
    }

    // Common random numbers: golden cookies/reindeer and the grandmapocalypse draw from their own
    // streams, so every variant sees the same golden cookies at the same moments with the same
    // effects. Differences between variants then come from the buying, not from luck.
    function separateStreams(seed) {
        var wrap = function (fn, stream) {
            return function () {
                var keep = Math.random;
                Math.random = stream;
                try {
                    return fn.apply(this, arguments);
                } finally {
                    Math.random = keep;
                }
            };
        };
        var luck = prng(seed ^ 0x9e3779b9),
            elder = prng(seed ^ 0x85ebca6b);
        Game.updateShimmers = wrap(Game.updateShimmers, luck);
        Game.shimmer.prototype.init = wrap(Game.shimmer.prototype.init, luck);
        Game.shimmer.prototype.pop = wrap(Game.shimmer.prototype.pop, luck);
        Game.UpdateWrinklers = wrap(Game.UpdateWrinklers, elder);
        Game.UpdateGrandmapocalypse = wrap(Game.UpdateGrandmapocalypse, elder);
    }

    var clock = 0;
    function virtualClock() {
        clock = Date.now();
        Date.now = function () { return clock; };
    }

    function scenario(name) {
        if (name === "bornagain") {
            // A Born Again run (no heavenly upgrades or prestige) after one ascension.
            Game.resets = 1;
            Game.ascensionMode = 1;
        }
        if (name === "ascended") {
            Game.prestige = 1e4;
            Game.heavenlyChips = 0;
            Object.keys(Game.Upgrades).forEach(function (k) {
                var u = Game.Upgrades[k];
                if (u.pool === "prestige" && u.basePrice <= 1e6 && !u.bought) u.earn();
            });
        }
        if (name === "lategame") {
            // Late game: 10 million prestige, every heavenly upgrade up to 1e9 chips, minigames
            // (levels set before the run, see FCB.prepareLategame) and a fully trained dragon.
            Game.prestige = 1e7;
            Game.cookiesReset = Game.HowManyCookiesReset(Game.prestige);
            Game.resets = 50;
            Game.heavenlyChips = 0;
            Object.keys(Game.Upgrades).forEach(function (k) {
                var u = Game.Upgrades[k];
                if (u.pool === "prestige" && u.basePrice <= 1e9 && !u.bought) u.earn();
            });
            Game.lumps = 100;
        }
        // Same clean start for every run: soft reset, timers and shimmers back to zero.
        Game.Reset();
        if (name === "lategame") midRun();
        Game.killShimmers();
        Game.T = 0;
        for (var b in Game.buffs) Game.buffs[b].time = 0;
        // FC remembers values from before the run to decide when to recalculate: start from zero.
        Object.assign(FrozenCookies, {
            lastCPS: 0, lastBaseCPS: 0, lastCookieCPS: 0, lastUpgradeCount: 0,
            currentBank: { cost: 0, efficiency: 0 }, targetBank: { cost: 0, efficiency: 0 },
            last_gc_state: 1, last_gc_time: clock, hc_gain: 0, hc_gain_time: clock,
            autobuyCount: 0, frenzyTimes: {},
        });
        try { emptyCaches(); nextPurchase(true); } catch (e) {}
        Game.cookies = Math.max(Game.cookies, 100);
        Game.cookiesEarned = Math.max(Game.cookiesEarned, 100);
        Game.recalculateGains = 1;
        Game.CalculateGains();
    }

    // Mid-run state for the late game: buildings bought as FC would roughly have them (fewer of the
    // pricier ones), every upgrade they unlock, a trained dragon. Deterministic.
    function midRun() {
        Game.ObjectsById.forEach(function (o, i) {
            var n = Math.max(0, 600 - 25 * i);
            o.amount += n; o.bought += n; o.highest = Math.max(o.highest, o.amount); Game.BuildingsOwned += n;
        });
        Game.cookiesEarned = 1e33;
        Game.cookies = 0;
        Game.dragonLevel = Game.dragonLevels.length - 1;
        Game.dragonAura = Game.dragonAurasBN["Radiant Appetite"].id;
        Game.dragonAura2 = Game.dragonAurasBN["Breath of Milk"].id;
        Game.recalculateGains = 1; Game.CalculateGains();
        // Unlock and earn what the buildings, achievements and milk open up (a few passes).
        var skip = { "Elder Pact": 1, "Elder Covenant": 1, "Revoke Elder Covenant": 1, "Elder Pledge": 1, "One mind": 1,
            "Communal brainsweep": 1, "Golden switch [on]": 1, "Golden switch [off]": 1, "Sugar frenzy": 1, "Shimmering veil [on]": 1, "Shimmering veil [off]": 1 };
        for (var pass = 0; pass < 4; pass++) {
            Game.Logic();
            Object.values(Game.UpgradesById).forEach(function (u) {
                if (u.unlocked && !u.bought && u.pool !== "prestige" && u.pool !== "toggle" && u.pool !== "debug" && !skip[u.name] && u.basePrice < 1e33) u.earn();
            });
            Game.recalculateGains = 1; Game.CalculateGains();
        }
        // Fewer of each building, so that every one costs at most 2 hours of income: FC keeps buying
        // during the run, as in a real late-game run (a few passes, as income depends on them).
        for (var k = 0; k < 4; k++) {
            var target = Game.cookiesPs * 7200;
            Game.ObjectsById.forEach(function (o) {
                var price = o.getPrice();
                if (price <= target || !o.amount) return;
                var cut = Math.min(o.amount, Math.ceil(Math.log(price / target) / Math.log(1.15)));
                o.amount -= cut; o.bought -= cut; Game.BuildingsOwned -= cut;
            });
            Game.recalculateGains = 1; Game.CalculateGains();
        }
        Game.cookies = Game.cookiesPs * 3600; // an hour of income in the bank
    }

    // FC's and FC+'s timed actions (spells, Pantheon, Godzamok, Golden switch, dragon, FC+ tasks):
    // capture what FCStart schedules, then call them in virtual time. The big cookie clicking and
    // autoCookie are driven by the run loop itself.
    var timers = [];
    function captureTimers() {
        timers = [];
        var skip = [window.autoCookie, window.fcClickCookie, window.autoFrenzyClick, window.saveStats, window.recommendedSettingsAction];
        window.setInterval = function (fn, ms) {
            if (typeof fn === "function" && skip.indexOf(fn) === -1) timers.push({ fn: fn, ms: Math.max(ms || 0, 1000 / Game.fps), next: 0 });
            return 0;
        };
        try { FCStart(); } finally { window.setInterval = noop; }
    }
    function runTimers(nowMs) {
        for (var i = 0; i < timers.length; i++) {
            var t = timers[i];
            while (t.next <= nowMs) {
                t.next += t.ms;
                var t0 = performance.now();
                try { t.fn(); } catch (e) {}
                t.spent = (t.spent || 0) + performance.now() - t0;
                t.calls = (t.calls || 0) + 1;
            }
        }
    }

    function configureFC() {
        Object.assign(FrozenCookies, {
            autoBuy: 1, otherUpgrades: 1, autoGC: 1, autoReindeer: 1, autoWrinkler: 1,
            autoClick: 0, autoFrenzy: 0, blacklist: 0, autoBulk: 0, pastemode: 0,
            defaultSeasonToggle: 0, autoAscendToggle: 0, autoAscend: 0, smartBulk: 0, firstRunScoring: 0,
            fpsModifier: 13, // 5 fps: same results per game second, far fewer frames
            frequency: 100,
        });
        Game.fps = 5;
        if (Game.buyBulk !== 1) document.getElementById("storeBulk1").click();
        FrozenCookies.recalculateCaches = true;
        FrozenCookies.processing = false;
    }

    // ---- Variants ---------------------------------------------------------
    // Achievements a building count would win (tiered "have N", total buildings owned).
    var BUILDER = [[100, "Builder"], [500, "Architect"], [1000, "Engineer"], [2500, "Lord of Constructs"],
        [5000, "Grand design"], [7500, "Ecumenopolis"], [10000, "Myriad"]];
    function simulateBuildingAchievements(building) {
        var wins = 0;
        var winIt = function (a) {
            if (a && !a.won) {
                a.won = 1;
                if (Game.CountsAsAchievementOwned(a.pool)) Game.AchievementsOwned++;
                wins++;
            }
        };
        for (var t in building.tieredAchievs) {
            var a = building.tieredAchievs[t];
            if (building.amount >= Game.Tiers[a.tier].achievUnlock) winIt(a);
        }
        BUILDER.forEach(function (b) { if (Game.BuildingsOwned >= b[0]) winIt(Game.Achievements[b[1]]); });
        if (wins) {
            Game.recalculateGains = 1;
            Game.CalculateGains();
        }
    }

    var UPGRADERS = [[20, "Enhancer"], [50, "Augmenter"], [100, "Upgrader"], [200, "Lord of Progress"],
        [300, "The full picture"], [400, "When there's nothing left to add"], [500, "Kaizen"],
        [600, "Beyond quality"], [700, "Oft we mar what's well"]];
    function simulateUpgradeAchievements() {
        var wins = 0;
        UPGRADERS.forEach(function (u) {
            var a = Game.Achievements[u[1]];
            if (a && !a.won && Game.UpgradesOwned >= u[0]) {
                a.won = 1;
                if (Game.CountsAsAchievementOwned(a.pool)) Game.AchievementsOwned++;
                wins++;
            }
        });
        if (wins) {
            Game.recalculateGains = 1;
            Game.CalculateGains();
        }
    }

    function wonList() {
        return Object.values(Game.AchievementsById).map(function (a) { return a.won; });
    }
    function restoreWon(list) {
        Game.AchievementsOwned = 0;
        list.forEach(function (won, i) {
            var a = Game.AchievementsById[i];
            a.won = won;
            if (won && a.pool != "shadow") Game.AchievementsOwned += 1;
        });
    }

    var variants = {
        base: function () {},
        // Count the achievements (milk) a simulated purchase earns: building counts for buildings
        // and for the buildings inside upgrade bundles, upgrade counts for upgrades. FC's own
        // restore step already puts achievements back after each simulation.
        achiev: function () {
            var original = buildingToggle;
            buildingToggle = function (building, achievements) {
                var oldHighest = Game.cookiesPsRawHighest;
                original(building, achievements);
                if (!achievements) {
                    simulateBuildingAchievements(building);
                    Game.cookiesPsRawHighest = oldHighest;
                }
            };
            var originalUp = upgradeToggle;
            upgradeToggle = function (upgrade, achievements, reverseFunctions) {
                var oldHighest = Game.cookiesPsRawHighest;
                var r = originalUp(upgrade, achievements, reverseFunctions);
                if (!achievements) {
                    (r.prereqBuildings || []).forEach(function (b) { simulateBuildingAchievements(Game.ObjectsById[b.id]); });
                    simulateUpgradeAchievements();
                    Game.cookiesPsRawHighest = oldHighest;
                }
                return r;
            };
        },
        // achiev + "buy up to the next building-count achievement" as extra candidates.
        bundle: function () {
            variants.achiev();
            var original = buildingStats;
            buildingStats = function (recalculate) {
                var list = original(recalculate);
                if (recalculate && list) addBundles(list);
                return list;
            };
        },
        // Late game: FC+'s Recommended settings (spells, Pantheon, Godzamok, Golden switch...),
        // without ascending, the achievement hunting or anything that waits for the player.
        recommended: function () { lategameSettings(); },
        doublecast: function () { lategameSettings(); FrozenCookies.autoFTHOFCombo = 1; },
        consistency: function () { lategameSettings(); FrozenCookies.auto100ConsistencyCombo = 1; },
        // The shipped first-run scoring option (fcp_scoring.js), ticked like the real task.
        shipped: function () {
            FrozenCookies.firstRunScoring = 1;
            FCB.everyFrame = function (f) {
                if (f % (5 * Game.fps) === 0) FCP.scoringTick();
            };
        },
        // Control for cm: FC's own formula, with the same refresh every 5 seconds.
        recalc: function () {
            FCB.everyFrame = function (f) {
                if (f % (5 * Game.fps) === 0) FrozenCookies.recalculateCaches = true;
            };
        },
        // Cookie Monster's payback period: only the cookies still missing count towards the
        // time to afford. Depends on the bank, so FC's ranking is refreshed every 5 seconds.
        cm: function () {
            purchaseEfficiency = function (price, deltaCps, baseDeltaCps, currentCps) {
                if (!(deltaCps > 0)) return Number.POSITIVE_INFINITY;
                var missing = Math.max(price + (FCB.bank || 0) - Game.cookies, 0);
                return FrozenCookies.efficiencyWeight * divCps(missing, currentCps) + divCps(price, deltaCps);
            };
            FCB.everyFrame = function (f) {
                if (f % (5 * Game.fps) === 0) {
                    FCB.bank = delayAmount();
                    FrozenCookies.recalculateCaches = true;
                }
            };
        },
    };

    function lategameSettings() {
        var keep = { fpsModifier: FrozenCookies.fpsModifier, frequency: FrozenCookies.frequency };
        FrozenCookies.recommendedSettings = 1;
        recommendedSettingsAction();
        Object.assign(FrozenCookies, keep, {
            autoAscendToggle: 0, smartAscend: 0, ascensionMarathon: 0, challengeRuns: 0, achievementHunter: 0,
            achievementTricks: 0, shadowAchievements: 0, cheatAchievement: 0, autoSweet: 0,
            autoClick: 0, autoFrenzy: 0, recommendedSettings: 0,
        });
        if (Game.buyBulk !== 1) document.getElementById("storeBulk1").click();
    }

    var MAX_BUNDLE = 50;
    function addBundles(list) {
        var bank = bestBank(0).cost;
        Object.keys(Game.Objects).forEach(function (name) {
            var b = Game.Objects[name];
            var next = null;
            for (var t in b.tieredAchievs) {
                var a = b.tieredAchievs[t];
                var need = Game.Tiers[a.tier].achievUnlock;
                if (!a.won && need > b.amount && (!next || need < next)) next = need;
            }
            if (!next) return;
            var k = next - b.amount;
            if (k < 2 || k > MAX_BUNDLE) return;
            var cost = (b.getPrice() * (Math.pow(1.15, k) - 1)) / 0.15;
            var oldHighest = Game.cookiesPsRawHighest;
            var baseOrig = baseCps();
            var cpsOrig = effectiveCps(Math.min(Game.cookies, bank));
            var won = wonList();
            b.amount += k; b.bought += k; Game.BuildingsOwned += k;
            Game.recalculateGains = 1; Game.CalculateGains();
            simulateBuildingAchievements(b);
            var baseNew = baseCps();
            var cpsNew = effectiveCps(bank);
            b.amount -= k; b.bought -= k; Game.BuildingsOwned -= k;
            restoreWon(won);
            Game.recalculateGains = 1; Game.CalculateGains();
            Game.cookiesPsRawHighest = oldHighest;
            list.push({
                id: b.id, type: "building", purchase: b, cost: cost, bundle: k,
                efficiency: purchaseEfficiency(cost, cpsNew - cpsOrig, baseNew - baseOrig, cpsOrig),
                delta_cps: cpsNew - cpsOrig, base_delta_cps: baseNew - baseOrig,
            });
        });
    }

    // ---- Run --------------------------------------------------------------
    function run(o) {
        stopEverything();
        seedRandom(o.seed * 7919);
        separateStreams(o.seed * 104729);
        virtualClock();
        scenario(o.scenario);
        configureFC();
        (variants[o.variant] || variants.base)();
        if (window.FCB.extraVariants && window.FCB.extraVariants[o.variant]) window.FCB.extraVariants[o.variant]();

        var fps = Game.fps,
            frames = o.seconds * fps,
            out = [],
            next = 0;
        var clicks = o.clicks || 0; // clicks per second on the big cookie (the game caps it at 50)
        if (clicks) Object.assign(FrozenCookies, { autoClick: 1, cookieClickSpeed: clicks });
        if (o.timers) captureTimers();
        var startOwned = Game.BuildingsOwned + Game.UpgradesOwned;
        var reached = null, startEarned = o.scenario === "lategame" ? Game.cookiesEarned : 0;
        var wallStart = performance.now(), stoppedAt = null, slow = [];
        for (var f = 1; f <= frames; f++) {
            if (o.wallLimit && performance.now() - wallStart > o.wallLimit) { stoppedAt = f / fps; break; }
            var frameT0 = performance.now();
            var frameStart = clock;
            for (var c = 0; c < clicks / fps; c++) {
                clock = frameStart + c * (1000 / clicks) + 1;
                Game.ClickCookie();
            }
            clock = frameStart + 1000 / fps;
            Game.Logic();
            if (o.timers) runTimers((f * 1000) / fps);
            if (reached === null && Game.cookiesEarned >= (o.target || 1e6)) reached = (f / fps);
            if (FCB.everyFrame) FCB.everyFrame(f);
            if (o.timers && f % fps === 0) {
                // Count the seconds spent in a stacked combo (production x50 or more, or a click buff
                // on top of a production buff).
                var mult = 1, click = 1;
                for (var b in Game.buffs) { mult *= Game.buffs[b].multCpS || 1; click *= Game.buffs[b].multClick || 1; (FCB.buffsSeen = FCB.buffsSeen || {})[b] = 1; }
                if (mult >= 50 || (mult > 1 && click > 1)) FCB.combos = (FCB.combos || 0) + 1;
            }
            if (!Game.OnAscend && !Game.AscendTimer) {
                FrozenCookies.processing = false;
                var a0 = performance.now();
                autoCookie();
                FCB.autoCookieMs = (FCB.autoCookieMs || 0) + performance.now() - a0;
            }
            var took = performance.now() - frameT0;
            if (took > 2000 && slow.length < 10) slow.push([Math.round(f / fps), Math.round(took), Object.keys(Game.buffs).join("+")]);
            if (next < o.checkpoints.length && f === o.checkpoints[next] * fps) {
                out.push({ t: o.checkpoints[next], baked: Game.cookiesEarned - startEarned });
                next++;
            }
        }
        var M = Game.Objects["Wizard tower"].minigame;
        var prof = timers.map(function (t) { return [(t.fn.name || String(t.fn).slice(0, 40).replace(/\s+/g, " ")), Math.round(t.spent || 0), t.calls || 0]; })
            .sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);
        return { gc: Game.goldenClicksLocal, buffsSeen: FCB.buffsSeen ? Object.keys(FCB.buffsSeen).join("+") : "", stoppedAt: stoppedAt, slow: JSON.stringify(slow), prof: JSON.stringify(prof) + " autoCookie " + Math.round(FCB.autoCookieMs || 0) + "ms, purchases " + (Game.BuildingsOwned + Game.UpgradesOwned - startOwned), buildings: Game.ObjectsById.map(function (o) { return o.amount; }).join(","), timers: timers.length, magic: M ? Math.round(M.magic) + "/" + Math.round(M.magicM) : "", gods: Game.Objects.Temple.minigame ? Game.Objects.Temple.minigame.slot.join() : "",
            casting: FrozenCookies.autoCasting, gs: FrozenCookies.autoGS, godz: FrozenCookies.autoGodzamok,
            spells: M ? M.spellsCast : undefined, combos: FCB.combos || 0, checkpoints: out, cps: Game.cookiesPs, achievements: Game.AchievementsOwned, reached: reached,
            speed: ["Speed baking I", "Speed baking II", "Speed baking III"].map(function (n) { return Game.Achievements[n].won; }) };
    }

    var FCB = { run: run, variants: variants };
    return FCB;
})();
