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
        if (name === "ascended") {
            Game.prestige = 1e4;
            Game.heavenlyChips = 0;
            Object.keys(Game.Upgrades).forEach(function (k) {
                var u = Game.Upgrades[k];
                if (u.pool === "prestige" && u.basePrice <= 1e6 && !u.bought) u.earn();
            });
        }
        // Same clean start for every run: soft reset, timers and shimmers back to zero.
        Game.Reset();
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
        for (var f = 1; f <= frames; f++) {
            clock += 1000 / fps;
            Game.Logic();
            if (FCB.everyFrame) FCB.everyFrame(f);
            if (!Game.OnAscend && !Game.AscendTimer) {
                FrozenCookies.processing = false;
                autoCookie();
            }
            if (next < o.checkpoints.length && f === o.checkpoints[next] * fps) {
                out.push({ t: o.checkpoints[next], baked: Game.cookiesEarned });
                next++;
            }
        }
        return { checkpoints: out, cps: Game.cookiesPs, achievements: Game.AchievementsOwned };
    }

    var FCB = { run: run, variants: variants };
    return FCB;
})();
