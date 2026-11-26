// Frozen Cookies Plus — achievement hunter (interaction achievements, wrinkler poking and pops,
// the gift for No time like the present), the Elder Pledges, challenge runs (Neverclick, Speed
// baking, Hardcore) and the achievement tracker shown in the FC menu.

// ---------------------------------------------------------------------------
// One-off interaction achievements
// ---------------------------------------------------------------------------
FCP.hunterTick = function () {
    if (FCP.busy()) return;
    var has = FCP.has;

    // Tabloid addiction: click the news ticker 50 times (real click events).
    if (!has("Tabloid addiction") && Game.tickerL) {
        var guard = 0;
        while (!has("Tabloid addiction") && guard++ < 60) Game.tickerL.click();
    }

    // Stifling the press: click the ticker while the window is "too narrow".
    if (FrozenCookies.achievementTricks && !has("Stifling the press") && Game.tickerL) {
        var w = Game.windowW;
        Game.windowW = 0;
        try {
            Game.tickerL.click();
        } finally {
            Game.windowW = w;
        }
    }

    // What's in a name: confirm a bakery name (keeps the current one).
    if (!has("What's in a name")) {
        Game.bakeryNameSet(Game.bakeryName);
        Game.Win("What's in a name");
    }

    // Here you go: click that achievement's slot.
    var hereYouGo = Game.Achievements["Here you go"];
    if (hereYouGo && !hereYouGo.won && hereYouGo.clickFunction) hereYouGo.clickFunction();

    // Tiny cookie (stats menu).
    if (!has("Tiny cookie") && Game.ClickTinyCookie) Game.ClickTinyCookie();

    // Olden days: the forgotten madeleine in the stats menu just calls Game.Win.
    if (!has("Olden days")) Game.Win("Olden days");

    // Just wrong: sell one grandma (FC buys it back).
    var grandma = Game.Objects["Grandma"];
    if (!has("Just wrong") && grandma.amount > 0) {
        grandma.sell(1);
        FCP.log("Sold a grandma for 'Just wrong'.");
    }

    // Hand-picked: harvest a mature but unripe lump once (50% success).
    if (!has("Hand-picked") && Game.canLumps && Game.canLumps()) {
        var age = Date.now() - Game.lumpT;
        if (age >= Game.lumpMatureAge && age < Game.lumpRipeAge && Game.lumpCurrentType != 2) {
            Game.clickLump();
            FCP.log("Harvested an unripe sugar lump for 'Hand-picked'.");
        }
    }

    // Wrinkler poker: see FCP.pokeWrinkler (its own faster task).
    FCP.patchWrinklerPop();

    FCP.patchAscend();
};

// Wrinkler poker: poke one wrinkler 50 times without killing it. A poke takes 0.75 hp (it dies
// at 0.5 or less) and a wrinkler heals 0.04 hp a frame, so about one poke a second is safe: the
// poking runs every 700 ms, and FC's auto-wrinkler leaves that one wrinkler alone meanwhile
// (it popped fresh wrinklers within seconds, long before the 50th poke).
FCP.pokeTarget = function () {
    if (FCP.has("Wrinkler poker")) return null;
    var best = null;
    for (var i = 0; i < Game.wrinklers.length; i++) {
        var me = Game.wrinklers[i];
        if (me.phase <= 0 || me.hp <= 0) continue;
        if (!best || me.clicks > best.clicks) best = me;
    }
    return best;
};

FCP.pokeWrinkler = function () {
    var best = FCP.pokeTarget();
    if (!best || best.phase !== 2) return;
    if (best.hp - 0.75 <= 0.6) return; // would die (dies at hp <= 0.5); wait for it to heal
    // Same effect as a click on the wrinkler (see Game.UpdateWrinklers).
    best.clicks++;
    best.hurt = 1;
    best.hp -= 0.75;
    if (best.clicks >= 50) {
        Game.Win("Wrinkler poker");
        FCP.log("Poked a wrinkler 50 times: 'Wrinkler poker'.");
    }
};

FCP.patchWrinklerPop = function () {
    FCP.wrapOnce(window, "shouldPopWrinklers", "poke", function (original) {
        return function () {
            var list = original.apply(this, arguments);
            var keep = FrozenCookies.achievementHunter ? FCP.pokeTarget() : null;
            return keep ? list.filter(function (id) { return id !== keep.id; }) : list;
        };
    });
};

// Wrinklesquisher and Moistburster: 50 and 200 wrinklers popped, counted per run (the game resets
// Game.wrinklersPopped at every ascension). FC's auto-wrinkler only pops when that helps the next purchase
// (or at the maximum), and may be off; while one of them is missing, FC+ pops each wrinkler as soon as it has come
// out (it has sucked next to nothing by then). It leaves the wrinkler being poked for Wrinkler
// poker, and shiny ones (Shiny pop decides about those).
FCP.POP_GOALS = [{ name: "Wrinklesquisher", n: 50 }, { name: "Moistburster", n: 200 }];
// The elder achievements and the option that works on each: a goal only counts (research, holds,
// keeping the elders angry) while something is there to get it.
FCP.ELDER_GOAL_OPTIONS = {
    "Wrinkler poker": "achievementHunter", Wrinklesquisher: "achievementHunter", Moistburster: "achievementHunter",
    "Elder nap": "elderPledgeAchievs", "Elder slumber": "elderPledgeAchievs", "Elder calm": "elderPledgeAchievs",
};
FCP.elderGoalOpen = function (name) {
    return !FCP.has(name) && !!FrozenCookies[FCP.ELDER_GOAL_OPTIONS[name]];
};
FCP.popTarget = function () {
    var missing = FCP.POP_GOALS.filter(function (g) { return !FCP.has(g.name); });
    return missing.length ? missing[missing.length - 1].n : 0;
};
// Wrinklers spawned per second with every slot empty, at the elder wrath this run's research leads
// to (it rises to it by itself within a minute or so; 0 under the Covenant or with no grandma).
FCP.wrinklerSpawnRate = function () {
    if (Game.Has("Elder Covenant") || Game.Objects["Grandma"].amount == 0) return 0;
    var wrath = Game.Has("One mind") + Game.Has("Communal brainsweep") + Game.Has("Elder Pact");
    var chance = 0.00001 * wrath * Game.eff("wrinklerSpawn");
    if (Game.Has("Unholy bait")) chance *= 5;
    if (Game.hasGod) {
        var lvl = Game.hasGod("scorn");
        chance *= lvl == 1 ? 2.5 : lvl == 2 ? 2 : lvl == 3 ? 1.5 : 1;
    }
    return Game.getWrinklersMax() * chance * Game.fps;
};
FCP.popWrinklers = function () {
    var target = FCP.popTarget();
    if (!target) {
        FCP.status["Wrinkler pops"] = "";
        return;
    }
    FCP.status["Wrinkler pops"] = Game.wrinklersPopped + "/" + target + " this run";
    if (FCP.busy()) return;
    var keep = FCP.pokeTarget(), n = 0;
    Game.wrinklers.forEach(function (w) {
        if (w.phase == 2 && w.hp > 0 && w.type != 1 && w !== keep) {
            w.hp = 0;
            n++;
        }
    });
    if (n && Game.wrinklersPopped + n >= target) FCP.log("Popped wrinklers up to " + target + " this run.");
};

// Debt evasion: take a loan right before FC auto-ascends.
FCP.patchAscend = function () {
    FCP.wrapOnce(Game, "Ascend", "achievements", function (original) {
        return function (bypass) {
            FCP.attempt("Debt evasion", function () {
                var B = Game.Objects["Bank"].minigame;
                if (bypass && FrozenCookies.achievementHunter && !FCP.has("Debt evasion") && B && B.officeLevel >= 2 &&
                    !Game.hasBuff("Loan 1") && !Game.hasBuff("Loan 1 (interest)")) {
                    B.takeLoan(1);
                    FCP.log("Took a loan before ascending for 'Debt evasion'.");
                }
            });
            FCP.attempt("When the cookies ascend just right", function () {
                if (bypass && FrozenCookies.shadowAchievements && !FCP.marathonAscending &&
                    !FCP.has("When the cookies ascend just right") && Game.cookies >= 1e12 && FCP.landBank(1e12))
                    FCP.log("Bank set to exactly 1 trillion before ascending: 'When the cookies ascend just right'.");
            });
            return original.apply(this, arguments);
        };
    });
};

// ---------------------------------------------------------------------------
// No time like the present (Achievement Hunter): needs the Wrapping paper heavenly upgrade,
// 1 billion cookies and a normal run. Send a 1-cookie gift through the game's own gift screen,
// keep the code, and redeem it once the 1-hour "Gifted out" cooldown is over.
// ---------------------------------------------------------------------------
FCP.giftState = function (value) {
    return FCP.store("fcpGift", value);
};

FCP.giftTick = function () {
    if (FCP.giftStep === "close") {
        if (Game.promptOn) Game.ClosePrompt();
        FCP.giftStep = null;
        if (FCP.has("No time like the present")) FCP.log("Redeemed our own gift: 'No time like the present'.");
        return;
    }
    if (FCP.has("No time like the present")) {
        if (FCP.giftState()) FCP.giftState(null);
        return;
    }
    if (!Game.Has("Wrapping paper") || Game.ascensionMode != 0 || Game.cookies < 1e9) return;
    var el = function (id) { return document.getElementById(id); };
    var state = FCP.giftState() || {};
    var click = function (id) { if (el(id)) el(id).click(); };

    // Steps that continue a prompt we opened.
    if (Game.promptOn && FCP.giftStep === "send" && el("giftAmount")) {
        el("giftAmount").value = "1";
        el("giftAmount").dispatchEvent(new Event("change"));
        click("promptOption0"); // Wrap: shows the code
        FCP.giftStep = "copy";
        return;
    }
    if (Game.promptOn && FCP.giftStep === "copy" && el("giftCode") && el("giftCode").value) {
        FCP.giftState({ code: el("giftCode").value, at: Date.now() });
        Game.ClosePrompt();
        FCP.giftStep = null;
        FCP.log("Sent a 1-cookie gift to redeem in an hour, for 'No time like the present'.");
        return;
    }
    if (Game.promptOn && FCP.giftStep === "redeem" && el("giftCode") && !el("giftCode").readOnly) {
        el("giftCode").value = state.code;
        el("giftCode").dispatchEvent(new Event("change"));
        click("promptOption0");
        FCP.giftStep = "close";
        return;
    }
    if (Game.promptOn || Game.hasBuff("Gifted out")) return;

    // Codes expire after about 2 days: make a new one if needed, else redeem it.
    if (!state.code || Date.now() - state.at > 40 * 3600 * 1000) {
        FCP.giftStep = "send";
        Game.promptGiftSend();
    } else {
        FCP.giftStep = "redeem";
        Game.promptGiftRedeem();
    }
};

// ---------------------------------------------------------------------------
// Elder Pledge / Covenant achievements
// ---------------------------------------------------------------------------
// Elder Pledges: Elder nap (1), Elder slumber (5 in one run), Elder calm (the Covenant), and
// Sacrificial rolling pins, an upgrade unlocked by 10 pledges in one run (cleared at ascension,
// so it is redone every run). A pledge lasts 30 minutes, but buying the Covenant ends it and
// revoking the Covenant makes the Pledge available again on the next frame (Elder Pact, no
// pledge running: Game.UpdateGrandmapocalypse). So FC+ cycles Pledge, Covenant, Revoke: one
// pledge every few seconds, for 8^(pledges+2) + 66.7 trillion + 6.7 billion cookies.
// A pledge and the Covenant collect every wrinkler, so it waits while one is being poked, or
// while a shiny one is kept (Shiny pop).
FCP.PLEDGE_GOAL = 10;

FCP.pledgesWanted = function () {
    return !FCP.has("Elder slumber") || !FCP.has("Elder calm") || (Game.pledges < FCP.PLEDGE_GOAL && !Game.Has("Sacrificial rolling pins") && !(Game.Upgrades["Sacrificial rolling pins"] || {}).unlocked);
};

// What this run still needs wrinklers for (they only spawn while the elders are angry, so not under
// the Covenant): Wrinkler poker and the pop counts (with the Achievement Hunter), and the Halloween and
// Easter drops while FC collects them. "" when nothing.
FCP.wrinklersWanted = function () {
    if (FCP.elderGoalOpen("Wrinkler poker")) return "Wrinkler poker";
    if (FrozenCookies.achievementHunter && FCP.popTarget() > 0) return "pops " + Game.wrinklersPopped + "/" + FCP.popTarget();
    if (/^(halloween|easter)$/.test(Game.season) && typeof haveAll === "function" && !haveAll(Game.season))
        return Game.seasons[Game.season].name + " drops";
    return "";
};

FCP.elderTick = function () {
    if (FCP.busy() || Game.ascensionMode == 1) return;
    var buy = function (name, why) {
        var u = Game.Upgrades[name];
        if (u && u.unlocked && !u.bought && FCP.canSpend(u.getPrice())) {
            u.buy(1);
            FCP.log("Bought " + name + (why ? " " + why : "") + ".");
            return true;
        }
        return false;
    };
    var covenant = Game.Upgrades["Elder Covenant"];
    if (!FCP.pledgesWanted()) {
        // Pledges done. With Elder Pact the elders stay angry (wrath 3): nearly every golden cookie
        // turns into a wrath cookie, and golden cookies are most of the late income. The Covenant
        // calms them for good at -5% CpS, but no wrinkler spawns under it: it waits until the run
        // needs no more wrinklers, and is revoked if it needs them again (a Halloween visit).
        FCP.status["Elder Pledges"] = "";
        if (!covenant) return;
        var wanted = FCP.wrinklersWanted();
        if (wanted) {
            if (covenant.bought) buy("Revoke Elder Covenant", "(wrinklers wanted: " + wanted + ")");
        } else if (Game.Has("Elder Pact") && !covenant.bought) buy("Elder Covenant", "(pledges and pops done: keeps golden cookies golden)");
        return;
    }
    // The pledges only unlock with Elder Pact, the last research. FC never buys it on its own (it
    // turns every golden cookie into a wrath cookie, so it scores as no gain).
    if (!Game.Has("Elder Pact")) {
        buy("Elder Pact", "(the Elder Pledge needs it)");
        return;
    }
    var shinyKept = FrozenCookies.shinyPop == 1 && Game.wrinklers.some(function (w) { return w.type == 1 && w.phase > 0; });
    if ((FrozenCookies.achievementHunter && FCP.pokeTarget()) || shinyKept) {
        FCP.status["Elder Pledges"] = "pledges " + Game.pledges + "/" + FCP.PLEDGE_GOAL + " · waiting: a pledge pops every wrinkler";
        return;
    }
    // One cycle per tick: Revoke (if left on), Pledge, Covenant. The Pledge comes back next frame.
    if (covenant && covenant.bought) {
        buy("Revoke Elder Covenant", "(to pledge again)");
        return;
    }
    if (Game.pledgeT <= 0 || Game.Upgrades["Elder Pledge"].unlocked) buy("Elder Pledge", "(" + (Game.pledges + 1) + "/" + FCP.PLEDGE_GOAL + ")");
    if (Game.Upgrades["Elder Pledge"].bought && covenant && covenant.unlocked && !covenant.bought) buy("Elder Covenant", "(ends the pledge, so the next one comes sooner)");
    FCP.status["Elder Pledges"] = "pledges " + Game.pledges + "/" + FCP.PLEDGE_GOAL + " (Sacrificial rolling pins) · cycling Pledge, Covenant, Revoke";
};

// ---------------------------------------------------------------------------
// Challenge runs. Neverclick, True Neverclick and Hardcore only count in a
// Born Again run (or before the first ascension). When FC reincarnates and
// one of them is missing, reincarnate in Born Again mode instead, play that
// run without clicking the big cookie (and without upgrades for Hardcore),
// then ascend straight back to a normal run.
// ---------------------------------------------------------------------------
FCP.speedNames = ["Speed baking I", "Speed baking II", "Speed baking III"];

FCP.challengeGoals = function () {
    var goals = [];
    if (!FCP.has("True Neverclick") || !FCP.has("Neverclick")) goals.push("neverclick");
    if (!FCP.speedNames.every(FCP.has)) goals.push("speed");
    if (FrozenCookies.challengeRuns == 2 && !FCP.has("Hardcore")) goals.push("hardcore");
    return goals;
};
FCP.goalLabel = function (g) {
    return { neverclick: "Neverclick", speed: "Speed baking", hardcore: "Hardcore" }[g] || g;
};

// These achievements only count in a Born Again run, or before the first ascension.
FCP.inChallengeRun = function () {
    return !!FrozenCookies.challengeRuns && (Game.ascensionMode == 1 || Game.resets == 0);
};

FCP.runMinutes = function () {
    return (Date.now() - Game.startDate) / 60000;
};

// What this run is going for: Neverclick first (no clicks), then Speed baking (clicking flat out,
// 1 million cookies within 15 minutes), each in its own Born Again run.
FCP.runPlan = function () {
    if (!FCP.inChallengeRun()) return null;
    var neverclickPossible = (!FCP.has("True Neverclick") && Game.cookieClicks == 0) || (!FCP.has("Neverclick") && Game.cookieClicks <= 15);
    if (neverclickPossible && Game.cookiesEarned < 10000000) return "neverclick";
    if (!FCP.speedNames.every(FCP.has) && FCP.runMinutes() <= 35.5 && !FCP.speedDone()) return "speed";
    return null;
};

// Speed baking: the game checks every 5 seconds, so keep going a few seconds past 1 million.
FCP.speedDone = function () {
    if (Game.cookiesEarned < 1000000) {
        FCP.reached1M = 0;
        return false;
    }
    if (!FCP.reached1M) FCP.reached1M = Date.now();
    return Date.now() - FCP.reached1M > 6000;
};

FCP.noClickActive = function () {
    return FCP.runPlan() === "neverclick";
};

FCP.speedActive = function () {
    return FCP.runPlan() === "speed";
};

FCP.hardcoreActive = function () {
    return (
        FCP.inChallengeRun() &&
        FrozenCookies.challengeRuns == 2 &&
        FCP.runPlan() !== "speed" &&
        !FCP.has("Hardcore") &&
        Game.UpgradesOwned == 0 &&
        Game.cookiesEarned < 2000000000
    );
};

// Clicks the big cookie as fast as the game allows (50/s) during a Speed baking run.
FCP.speedClick = function () {
    if (!FCP.busy() && FCP.speedActive()) Game.ClickCookie();
};

// Remember (across reloads) that FC+ started the current Born Again run, so it only ever ends
// its own challenge runs, never one you started yourself.
FCP.challengeFlag = function (value) {
    if (value === undefined) return FCP.store("fcpChallengeRun") === 1;
    FCP.store("fcpChallengeRun", value ? 1 : null);
    return !!value;
};

var _fcpOriginalClickCookie = fcClickCookie;
fcClickCookie = function () {
    if (FCP.noClickActive()) return;
    return _fcpOriginalClickCookie.apply(this, arguments);
};

// FC's purchase scoring counts the autoclicker's production (clicks/s x
// cookies per click). While clicks are held back that production is zero,
// otherwise click upgrades look far better than they are.
var _fcpOriginalBaseClickingCps = baseClickingCps;
baseClickingCps = function () {
    if (FCP.noClickActive()) return 0;
    return _fcpOriginalBaseClickingCps.apply(this, arguments);
};

// Recalculate FC's recommendations whenever clicking stops or resumes.
FCP.watchNoClick = function () {
    var now = FCP.noClickActive();
    if (now !== FCP.lastNoClick) {
        FCP.lastNoClick = now;
        FrozenCookies.recalculateCaches = true;
    }
};

FCP.patchReincarnate = function () {
    FCP.wrapOnce(Game, "Reincarnate", "challenge", function (original) {
        return function (bypass) {
            var goals = FCP.challengeGoals();
            if (bypass && FrozenCookies.challengeRuns && !FCP.challengeExit && !FCP.marathonReincarnating && goals.length) {
                Game.nextAscensionMode = 1;
                FCP.challengeFlag(true);
                FCP.log("Reincarnating in Born Again mode for: " + goals.map(FCP.goalLabel).join(", ") + ".", true);
            } else if (bypass && Game.nextAscensionMode != 1) {
                FCP.challengeFlag(false);
            }
            FCP.challengeExit = false;
            FCP.reached1M = 0;
            return original.apply(this, arguments);
        };
    });
};

FCP.challengeTick = function () {
    FCP.patchReincarnate();
    FCP.watchNoClick();

    // Finishing the exit ascension we started.
    if (FCP.challengeExit && Game.OnAscend && !Game.AscendTimer) {
        Game.nextAscensionMode = 0;
        Game.Reincarnate(1);
        return;
    }
    if (FCP.busy()) return;

    // Hardcore: keep FC's HARDCORE blacklist on while it can still succeed.
    if (FCP.hardcoreActive()) {
        if (FrozenCookies.blacklist != 2) {
            FCP.savedBlacklist = FrozenCookies.blacklist;
            FrozenCookies.blacklist = 2;
            FrozenCookies.recalculateCaches = true;
        }
    } else if (FCP.savedBlacklist !== undefined) {
        FrozenCookies.blacklist = FCP.savedBlacklist;
        FCP.savedBlacklist = undefined;
        FrozenCookies.recalculateCaches = true;
    }

    var plan = FCP.runPlan();
    var rules = [];
    if (plan === "neverclick") rules.push("no big cookie clicks until 1 million baked (golden cookies still clicked)");
    if (plan === "speed") rules.push("clicking flat out for 1 million within 15 min (" + FCP.runMinutes().toFixed(1) + " min so far)");
    if (FCP.hardcoreActive()) rules.push("no upgrades until 1 billion baked");
    var goals = FCP.challengeGoals().map(FCP.goalLabel).join(" + ");

    if (Game.ascensionMode != 1) {
        if (rules.length) {
            // Before the first ascension these achievements count without Born Again.
            FCP.status["Challenge runs"] = "this run (no ascension yet) goes for " + FCP.goalLabel(plan || "hardcore") + ": " + rules.join(", ");
        } else {
            FCP.status["Challenge runs"] = goals ? "next reincarnation will be Born Again, for " + goals : "all done";
        }
        return;
    }

    if (!FCP.challengeFlag()) {
        FCP.status["Challenge runs"] = rules.length ? "your Born Again run: " + rules.join(", ") : "";
        return;
    }
    var waiting = rules.length > 0;
    FCP.status["Challenge runs"] = waiting
        ? "Born Again run: " + rules.join(", ")
        : "Born Again run done, ascending back to a normal run";
    if (!waiting && (Game.cookiesEarned >= 1000000 || FCP.runMinutes() > 36)) {
        FCP.challengeExit = true;
        FCP.challengeFlag(false);
        FCP.log("Challenge run finished, ascending back to a normal run.", true);
        FCP.autoAscend("challenge");
    }
};

// ---------------------------------------------------------------------------
// Achievement tracker
// ---------------------------------------------------------------------------
FCP.levelAchievs = {};
Object.keys(Game.Objects).forEach(function (k) {
    var o = Game.Objects[k];
    if (o.levelAchiev10) FCP.levelAchievs[o.levelAchiev10.name] = o;
});

FCP.manualHints = {
    "Cookie-dunker": "make the game window short enough that the milk covers the big cookie",
    "Baby it's old outside": "during Christmas, hold the mouse on one of Santa's helper grandmas in the grandma row",
    "No time like the present": "make a gift code (Gifting heavenly upgrade) and redeem it yourself",
    "Stifling the press": "squish the window very narrow and click the news ticker, or turn on FC+ window tricks",
    "Eldeer": "pop a reindeer during an Elder Frenzy (FC auto-reindeer gets it eventually)",
    "Thick-skinned": "own Reinforced membrane and have the Shimmering veil absorb a click",
    "Four-leaf cookie": "have four golden cookies on screen at once",
    "Just plain lucky": "1 in a million chance every second; just keep the game running",
    "So much to do so much to see": "keep a save running for a year",
    "When the cookies ascend just right": "ascend with exactly 1 trillion cookies in the bank",
    "Last Chance to See": "pop the shiny wrinkler (rare), or turn on FC+ shadow achievements",
    "Speed baking I": "bake 1 million cookies within 35 minutes of a new run",
    "Speed baking II": "bake 1 million cookies within 25 minutes of a new run",
    "Speed baking III": "bake 1 million cookies within 15 minutes of a new run",
    "In her likeness": "use the You customizer to make your clones look like grandmas",
    "God complex": "name your bakery Orteil (-1% CpS while named so)",
    "Cheated cookies taste awful": "only by cheating cookies in",
};

FCP.classifyAchievement = function (a) {
    var n = a.name;
    if (a.pool === "dungeon") return ["Unobtainable (dungeons)", ""];
    var tricks = /^(Stifling the press|Cookie-dunker|Baby it's old outside)$/;
    var shadows = /^(God complex|In her likeness|Last Chance to See|When the cookies ascend just right)$/;
    if (tricks.test(n)) return FrozenCookies.achievementTricks ? ["FC+ UI tricks", n === "Baby it's old outside" ? "during Christmas" : ""] : ["Manual", FCP.manualHints[n]];
    if (shadows.test(n)) return FrozenCookies.shadowAchievements ? ["FC+ Shadow achievements", n === "When the cookies ascend just right" ? "at the next auto-ascension with 1 trillion+ in the bank" : ""] : ["Manual", FCP.manualHints[n]];
    if (n === "No time like the present") return FrozenCookies.achievementHunter ? ["FC+ Achievement Hunter", "needs the Wrapping paper heavenly upgrade"] : ["Manual", FCP.manualHints[n]];
    if (n === "Cheated cookies taste awful" || n === "Four-leaf cookie") return FrozenCookies.cheatAchievement ? ["FC+ Cheat (opt-in)", ""] : ["Manual", "turn on the Cheat achievements option"];
    if (n === "Endless cycle") return FrozenCookies.ascensionMarathon ? ["FC+ Ascension marathon", Game.resets + " / 1000"] : ["Manual", "turn on Ascension marathon (one ascension per prestige level, best late in the game)"];
    if (/^Speed baking/.test(n)) return FrozenCookies.challengeRuns ? ["FC+ Challenge runs", "Born Again run, clicking flat out"] : ["Manual", FCP.manualHints[n]];
    if (/^(Seven horseshoes|Gaseous assets)$/.test(n)) return ["Time (FC keeps doing it)", n === "Seven horseshoes" ? Game.goldenClicks + " / 27,777 golden cookies" : "stock market profit, Auto-stocks"];
    if (n === "All-natural cane sugar") return ["Luck / time", "harvest a golden sugar lump (rare lump type)"];
    if (FCP.manualHints[n])
        return [/lucky|year|Speed|exactly/.test(FCP.manualHints[n]) || a.pool === "shadow" ? "Manual / luck / shadow" : "Manual", FCP.manualHints[n]];
    if (/^(Tabloid addiction|What's in a name|Here you go|Tiny cookie|Olden days|Just wrong|Hand-picked|Wrinkler poker|Debt evasion)$/.test(n))
        return ["FC+ Achievement Hunter", ""];
    if (n === "Hardcore") return [FrozenCookies.challengeRuns == 2 ? "FC+ Challenge runs" : "Manual", "Born Again run, no upgrades until 1 billion baked (Challenge runs + HARDCORE)"];
    if (/^Elder (nap|slumber|calm)$/.test(n)) return ["FC+ Elder Pledge option", ""];
    if (/Neverclick/.test(n)) return ["FC+ Challenge runs", "Born Again run"];
    if (FCP.levelAchievs[n]) {
        var o = FCP.levelAchievs[n];
        return ["FC+ Auto-lumps", o.name + " is level " + o.level];
    }
    if (/^(Botany enthusiast|Green, aching thumb|In the garden of Eden \(baby\)|Keeper of the conservatory|Seedless to nay)$/.test(n))
        return ["FC+ Auto-garden", ""];
    if (/^(Initial public offering|Rookie numbers|No nobility in poverty|Full warehouses|Buy buy buy|Make my day|Liquid assets)$/.test(n))
        return ["FC+ Auto-stocks", ""];
    if (n === "Pyramid scheme") return ["FC Auto-Banking + FC+ Auto-lumps", "needs level 12 cursors"];
    if (/^(Bibbidi-bobbidi-boo|I'm the wiz|A wizard is you)$/.test(n)) return ["FC Auto-cast", ""];
    if (n === "Here be dragon") return ["FC Auto-dragon", ""];
    if (/^(Wrinklesquisher|Moistburster)$/.test(n))
        return FrozenCookies.achievementHunter ? ["FC+ Achievement Hunter", "pops " + Game.wrinklersPopped + " / " + (n === "Moistburster" ? 200 : 50) + " this run"] : ["FC Auto-wrinkler", "in one run"];
    if (n === "Itchscratcher") return ["FC Auto-wrinkler", ""];
    if (/^(Oh deer|Sleigh of hand|Reindeer sleigher)$/.test(n)) return ["FC Auto-reindeer", ""];
    if (/^(Golden cookie|Lucky cookie|A stroke of luck|Fortune|Leprechaun|Black cat's paw|Early bird|Fading luck|Wrath cookie)$/.test(n))
        return ["FC Auto-golden cookies", ""];
    if (/^(Spooky cookies|Let it snow|Lovely cookies|The hunt is on|Egging on|Mass Easteria|Hide & seek champion|Coming to town|All hail Santa)$/.test(n))
        return ["FC seasons (needs season switcher)", ""];
    if (/^(Rebirth|Resurrection|Reincarnation|Sacrifice|Oblivion|From scratch|Nihilism|Dematerialize|Nil zero zilch|Transcendence|Obliterate|Negative void|To crumbs, you say\?|You get nothing|Humble rebeginnings|The end of the world|Oh, you're back|Lazarus|Smurf account|If at first you don't succeed|No more room in hell|All the stars in heaven|Wholesome)$/.test(n))
        return ["FC Auto-ascend", ""];
    if (/^(Dude, sweet|Sugar rush|Year's worth of cavities|Sugar sugar|Sweetmeats|Maillard reaction)$/.test(n))
        return ["Sugar lumps over time (FC Auto-harvest)", ""];
    if (n === "O Fortuna") return ["FC Auto-fortune", ""];
    if (n === "Uncanny clicker") return ["FC Autoclick", ""];
    return ["Progression (FC Auto-buy)", ""];
};

FCP.achievementReport = function () {
    var r = { won: 0, total: 0, shadowWon: 0, shadowTotal: 0, groups: {} };
    Object.keys(Game.AchievementsById).forEach(function (id) {
        var a = Game.AchievementsById[id];
        if (a.pool === "shadow") {
            r.shadowTotal++;
            if (a.won) r.shadowWon++;
        } else if (a.pool !== "dungeon") {
            r.total++;
            if (a.won) r.won++;
        }
        if (a.won || a.pool === "dungeon") return;
        var c = FCP.classifyAchievement(a);
        var text = (a.ddesc || a.desc || "").replace(/<q>.*?<\/q>/g, "").replace(/<[^>]+>/g, "");
        (r.groups[c[0]] = r.groups[c[0]] || []).push({ dname: a.dname || a.name, text: text, hint: c[1] });
    });
    return r;
};

FCP.addTask("hunter", function () { return !!FrozenCookies.achievementHunter; }, FCP.hunterTick, 2000);
FCP.addTask("gift", function () { return !!FrozenCookies.achievementHunter; }, FCP.giftTick, 2000);
FCP.addTask("poke", function () { return !!FrozenCookies.achievementHunter && !FCP.has("Wrinkler poker"); }, FCP.pokeWrinkler, 700);
FCP.addTask("pops", function () { return !!FrozenCookies.achievementHunter && FCP.popTarget() > 0; }, FCP.popWrinklers, 2000);
FCP.addTask("challenge", function () { return !!FrozenCookies.challengeRuns; }, FCP.challengeTick, 2000);
FCP.addTask("speedclick", function () { return !!FrozenCookies.challengeRuns; }, FCP.speedClick, 20);
FCP.addTask("elder", function () { return !!FrozenCookies.elderPledgeAchievs; }, FCP.elderTick, 2000);
