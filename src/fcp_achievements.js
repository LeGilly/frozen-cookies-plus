// Frozen Cookies Plus — achievement hunter, Neverclick runs and the
// achievement tracker shown in the FC menu.

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

    // Wrinkler poker: poke a wrinkler 50 times without killing it.
    if (!has("Wrinkler poker")) FCP.pokeWrinkler();

    FCP.patchAscend();
};

FCP.pokeWrinkler = function () {
    var best = null;
    for (var i = 0; i < Game.wrinklers.length; i++) {
        var me = Game.wrinklers[i];
        if (me.phase !== 2) continue;
        if (me.hp - 0.75 <= 0.6) continue; // would die (dies at hp <= 0.5)
        if (!best || me.clicks > best.clicks) best = me;
    }
    if (!best) return;
    // Same effect as a click on the wrinkler (see Game.UpdateWrinklers).
    best.clicks++;
    best.hurt = 1;
    best.hp -= 0.75;
    if (best.clicks >= 50) Game.Win("Wrinkler poker");
};

// Debt evasion: take a loan right before FC auto-ascends.
FCP.patchAscend = function () {
    if (Game.Ascend.__fcp) return;
    var original = Game.Ascend;
    var patched = function (bypass) {
        try {
            var B = Game.Objects["Bank"].minigame;
            if (
                bypass &&
                FrozenCookies.achievementHunter &&
                !FCP.has("Debt evasion") &&
                B &&
                B.officeLevel >= 2 &&
                !Game.hasBuff("Loan 1") &&
                !Game.hasBuff("Loan 1 (interest)")
            ) {
                B.takeLoan(1);
                FCP.log("Took a loan before ascending for 'Debt evasion'.");
            }
        } catch (e) {}
        return original.apply(this, arguments);
    };
    patched.__fcp = true;
    Game.Ascend = patched;
};

// ---------------------------------------------------------------------------
// Elder Pledge / Covenant achievements
// ---------------------------------------------------------------------------
FCP.elderTick = function () {
    if (FCP.busy()) return;
    var buy = function (name) {
        var u = Game.Upgrades[name];
        if (u && u.unlocked && !u.bought && FCP.canSpend(u.getPrice())) {
            u.buy(1);
            FCP.log("Bought " + name + " for its achievement.");
            return true;
        }
        return false;
    };
    if (!FCP.has("Elder slumber")) {
        // Only one pledge can run at a time; the upgrade relocks while active.
        if (Game.pledgeT <= 0) buy("Elder Pledge");
        return;
    }
    if (!FCP.has("Elder calm")) {
        buy("Elder Covenant");
        return;
    }
    // Achievement done: undo the covenant's -5% CpS.
    if (Game.Upgrades["Elder Covenant"] && Game.Upgrades["Elder Covenant"].bought)
        buy("Revoke Elder Covenant");
};

// ---------------------------------------------------------------------------
// Challenge runs. Neverclick, True Neverclick and Hardcore only count in a
// Born Again run (or before the first ascension). When FC reincarnates and
// one of them is missing, reincarnate in Born Again mode instead, play that
// run without clicking the big cookie (and without upgrades for Hardcore),
// then ascend straight back to a normal run.
// ---------------------------------------------------------------------------
FCP.challengeGoals = function () {
    var goals = [];
    if (!FCP.has("True Neverclick") || !FCP.has("Neverclick")) goals.push("neverclick");
    if (FrozenCookies.challengeRuns == 2 && !FCP.has("Hardcore")) goals.push("hardcore");
    return goals;
};

FCP.inChallengeRun = function () {
    return !!FrozenCookies.challengeRuns && (Game.ascensionMode == 1 || Game.resets == 0);
};

FCP.noClickActive = function () {
    if (!FCP.inChallengeRun()) return false;
    // The game only checks these every few seconds: keep blocking a little
    // past 1 million (up to 10 million).
    if (Game.cookiesEarned >= 10000000) return false;
    if (!FCP.has("True Neverclick") && Game.cookieClicks == 0) return true;
    if (!FCP.has("Neverclick") && Game.cookieClicks <= 15) return true;
    return false;
};

FCP.hardcoreActive = function () {
    return (
        FCP.inChallengeRun() &&
        FrozenCookies.challengeRuns == 2 &&
        !FCP.has("Hardcore") &&
        Game.UpgradesOwned == 0 &&
        Game.cookiesEarned < 2000000000
    );
};

var _fcpOriginalClickCookie = fcClickCookie;
fcClickCookie = function () {
    if (FCP.noClickActive()) return;
    return _fcpOriginalClickCookie.apply(this, arguments);
};

FCP.patchReincarnate = function () {
    if (Game.Reincarnate.__fcp) return;
    var original = Game.Reincarnate;
    var patched = function (bypass) {
        if (bypass && FrozenCookies.challengeRuns && !FCP.challengeExit && FCP.challengeGoals().length) {
            Game.nextAscensionMode = 1;
            FCP.log("Reincarnating in Born Again mode for: " + FCP.challengeGoals().join(", ") + ".", true);
        }
        FCP.challengeExit = false;
        return original.apply(this, arguments);
    };
    patched.__fcp = true;
    Game.Reincarnate = patched;
};

FCP.challengeTick = function () {
    FCP.patchReincarnate();
    if (!FrozenCookies.challengeRuns) return;

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

    // What is being held back right now (this run).
    var rules = [];
    if (FCP.noClickActive()) rules.push("no big cookie clicks until 1 million baked (golden cookies still clicked)");
    if (FCP.hardcoreActive()) rules.push("no upgrades until 1 billion baked");
    var goals = FCP.challengeGoals().join(" + ").replace("neverclick", "Neverclick").replace("hardcore", "Hardcore");

    if (Game.ascensionMode != 1) {
        if (rules.length) {
            // Before the first ascension these achievements count without Born Again.
            FCP.status["Challenge runs"] = "this run (no ascension yet) goes for " + goals + ": " + rules.join(", ");
        } else {
            FCP.status["Challenge runs"] = goals ? "next reincarnation will be Born Again, for " + goals : "all done";
        }
        return;
    }

    var waiting = FCP.noClickActive() || FCP.hardcoreActive();
    FCP.status["Challenge runs"] = waiting
        ? "Born Again run for " + goals + ": " + rules.join(", ")
        : "Born Again run done, ascending back to a normal run";
    if (!waiting && Game.cookiesEarned >= 1000000) {
        FCP.challengeExit = true;
        FCP.log("Challenge run finished, ascending back to a normal run.", true);
        Game.Ascend(1);
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
    if (FCP.manualHints[n] && !/^(Stifling the press)$/.test(n))
        return [/lucky|year|Speed|exactly/.test(FCP.manualHints[n]) || a.pool === "shadow" ? "Manual / luck / shadow" : "Manual", FCP.manualHints[n]];
    if (n === "Stifling the press")
        return FrozenCookies.achievementTricks ? ["FC+ Achievement Hunter", ""] : ["Manual", FCP.manualHints[n]];
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
    if (/^(Initial public offering|Rookie numbers|No nobility in poverty|Full warehouses|Buy buy buy|Make my day|Liquid assets|Gaseous assets)$/.test(n))
        return ["FC+ Auto-stocks", ""];
    if (n === "Pyramid scheme") return ["FC Auto-Banking + FC+ Auto-lumps", "needs level 12 cursors"];
    if (/^(Bibbidi-bobbidi-boo|I'm the wiz|A wizard is you)$/.test(n)) return ["FC Auto-cast", ""];
    if (n === "Here be dragon") return ["FC Auto-dragon", ""];
    if (/^(Itchscratcher|Wrinklesquisher|Moistburster|Last Chance to See)$/.test(n)) return ["FC Auto-wrinkler", n === "Last Chance to See" ? "turn on Shiny pop" : ""];
    if (/^(Oh deer|Sleigh of hand|Reindeer sleigher)$/.test(n)) return ["FC Auto-reindeer", ""];
    if (/^(Golden cookie|Lucky cookie|A stroke of luck|Fortune|Leprechaun|Black cat's paw|Seven horseshoes|Early bird|Fading luck|Wrath cookie)$/.test(n))
        return ["FC Auto-golden cookies", ""];
    if (/^(Spooky cookies|Let it snow|Lovely cookies|The hunt is on|Egging on|Mass Easteria|Hide & seek champion|Coming to town|All hail Santa)$/.test(n))
        return ["FC seasons (needs season switcher)", ""];
    if (/^(Rebirth|Resurrection|Reincarnation|Endless cycle|Sacrifice|Oblivion|From scratch|Nihilism|Dematerialize|Nil zero zilch|Transcendence|Obliterate|Negative void|To crumbs, you say\?|You get nothing|Humble rebeginnings|The end of the world|Oh, you're back|Lazarus|Smurf account|If at first you don't succeed|No more room in hell|All the stars in heaven|Wholesome)$/.test(n))
        return ["FC Auto-ascend", ""];
    if (/^(Dude, sweet|Sugar rush|Year's worth of cavities|Sugar sugar|All-natural cane sugar|Sweetmeats|Maillard reaction)$/.test(n))
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
FCP.addTask("challenge", function () { return !!FrozenCookies.challengeRuns; }, FCP.challengeTick, 2000);
FCP.addTask("elder", function () { return !!FrozenCookies.elderPledgeAchievs; }, FCP.elderTick, 5000);
