// Frozen Cookies Plus — smart ascension (option smartAscend, on in Recommended).
//
//  - When: the first ascension once the run is worth FCP.FIRST_ASCEND_LEVELS prestige levels;
//    after that, whenever ascending would at least double the prestige. Never during a
//    Frenzy or a click buff (the run is worth more a minute later), and not in Born Again
//    runs (challenge runs handle those). Wrinklers are popped first, so their cookies count.
//  - The heavenly upgrades are bought on the ascension screen, before reincarnating, for
//    every ascension FC+ makes by itself (this one, challenge run exits, the marathon).
//    Ascensions you make yourself are left to you.
//  - FC's own auto-ascend is set aside while this is on. With it off, FC's "prestige
//    doubled" mode no longer needs a heavenly chips amount above 0 to work.

FCP.FIRST_ASCEND_LEVELS = 440;

// Heavenly upgrades worth buying first, in order. Each is bought with any parents it still
// needs, once the whole lot is affordable. Everything else follows cheapest first, except
// purely cosmetic ones (still bought when another upgrade needs them).
FCP.heavenlyPriority = [
    "Legacy", "Heavenly cookies", "How to bake your dragon",
    "Tin of british tea biscuits", "Box of macarons", "Box of brand biscuits", "Tin of butter cookies",
    "Starter kit", "Heavenly luck", "Persistent memory", "Season switcher", "Lasting fortune", "Lucky digit",
    "Golden switch", "Kitten angels", "Starter kitchen", "Decisive fate",
    "Divine discount", "Divine sales", "Synergies Vol. I", "Lucky number", "Residual luck", "Divine bakeries",
    "Inspired checklist", "Halo gloves", "Unholy bait", "Elder spice", "Wrapping paper",
    "Synergies Vol. II", "Distilled essence of redoubled luck", "Wrinkly cookies", "Lucky payout",
    "Aura gloves", "Shimmering veil", "Stevia Caelestis", "Diabetica Daemonicus", "Sugar crystal cookies",
    "Kitten wages", "Cat ladies", "Fortune cookies", "Pet the dragon", "Unshackled flavor", "Keepsakes",
];
FCP.heavenlyCosmetic = [
    "Classic dairy selection", "Basic wallpaper assortment", "Distinguished wallpaper assortment",
    "Fanciful dairy selection", "Golden cookie alert sound", "Sound test",
];

FCP.heavenlyCanBuy = function (u) {
    if (u.bought) return false;
    if (u.showIf && !u.showIf()) return false;
    return u.parents.every(function (p) { return p == -1 || p.bought; });
};

// The upgrade plus every missing ancestor, parents first.
FCP.heavenlyPlan = function (u, plan) {
    plan = plan || [];
    if (u.bought || plan.indexOf(u) !== -1) return plan;
    u.parents.forEach(function (p) {
        if (p != -1) FCP.heavenlyPlan(p, plan);
    });
    plan.push(u);
    return plan;
};
FCP.planCost = function (plan) {
    return plan.reduce(function (t, u) { return t + u.getPrice(); }, 0);
};

FCP.buyHeavenly = function () {
    var bought = [];
    // Some only show up at times (Lucky digit and co. need a 7 in the prestige level).
    var hidden = function (plan) {
        return plan.some(function (u) { return u.showIf && !u.showIf(); });
    };
    var buyPlan = function (plan) {
        if (!plan.length || hidden(plan) || FCP.planCost(plan) > Game.heavenlyChips) return false;
        plan.forEach(function (u) {
            if (FCP.heavenlyCanBuy(u) && u.buy(1)) bought.push(u.dname || u.name);
        });
        return true;
    };
    // 1. The priority list, in order. The first one out of reach is saved for; later ones on the
    //    list costing at most half as much are still bought (chips grow every ascension, so they
    //    delay it a little, while blocking them could hold a useful upgrade back for several runs).
    var saving = null;
    for (var i = 0; i < FCP.heavenlyPriority.length; i++) {
        var u = Game.Upgrades[FCP.heavenlyPriority[i]];
        if (!u || u.pool !== "prestige" || u.bought) continue;
        var plan = FCP.heavenlyPlan(u);
        if (hidden(plan)) continue;
        var cost = FCP.planCost(plan);
        if (saving !== null && cost > saving * 0.5) continue;
        if (!buyPlan(plan) && saving === null) saving = cost;
    }
    // 2. The rest, cheapest first; while saving, only what barely delays it (1% of its cost).
    var rest = Game.PrestigeUpgrades.filter(function (u) {
        return !u.bought && FCP.heavenlyCosmetic.indexOf(u.name) === -1;
    }).sort(function (a, b) { return a.getPrice() - b.getPrice(); });
    rest.forEach(function (u) {
        if (u.bought) return;
        var plan = FCP.heavenlyPlan(u), cost = FCP.planCost(plan);
        if (saving !== null && cost > saving * 0.01) return;
        buyPlan(plan);
    });
    if (bought.length) {
        FCP.log("Heavenly upgrades bought: " + bought.join(", ") + ".", true);
        if (Game.BuildAscendTree) Game.BuildAscendTree();
    }
    return bought;
};

// Ascend on FC+'s behalf, so the heavenly upgrades are bought before reincarnating.
FCP.autoAscend = function (why) {
    FCP.autoAscension = why || "smart";
    Game.Ascend(1);
};

FCP.patchHeavenlyBuy = function () {
    if (Game.Reincarnate.__fcpHeavenly) return;
    var original = Game.Reincarnate;
    var patched = function (bypass) {
        if (bypass && FCP.autoAscension && FrozenCookies.smartAscend && Game.OnAscend) {
            try { FCP.buyHeavenly(); } catch (e) { console.error("[FC+] heavenly upgrades failed:", e); }
        }
        if (bypass) FCP.autoAscension = "";
        return original.apply(this, arguments);
    };
    patched.__fcpHeavenly = true;
    patched.__fcp = original.__fcp; // keep the challenge run wrapper recognised
    Game.Reincarnate = patched;
};

// --- One-time goals worth finishing before ascending ---------------------------------
// They only count within one run (research, pledges, the reindeer count and Santa's level all
// reset at every ascension), and prestige doubles quickly, so they could be cut short forever.
// When the run is ready to ascend, it waits for the ones still in reach, once each (until the
// achievement is won) and at most FCP.HOLD_HOURS per run.
FCP.HOLD_HOURS = 8;
FCP.researchSteps = function () {
    return FCP.researchChain.concat(["Elder Pact"]).filter(function (n) { return Game.Upgrades[n] && !Game.Upgrades[n].bought; }).length;
};
FCP.ascendHolds = function () {
    var holds = [], fps = Game.fps, eta = function (sec) { return sec > 0 ? ", about " + timeDisplay(Math.ceil(sec)) : ""; };
    // Research up to Elder Pact: wrinklers (One mind) and the Elder Pledge come from it. Only with
    // Persistent memory (research 10x as fast, about 30 minutes in all): without it, the 4.5 hours
    // are better spent ascending, which pays for Persistent memory (500 chips) soon enough.
    var needsElders = ["Elder nap", "Elder slumber", "Elder calm", "Wrinkler poker", "Wrinklesquisher", "Moistburster"].some(function (n) { return !FCP.has(n); });
    var bingo = Game.Upgrades["Bingo center/Research facility"];
    if (needsElders && Game.Has("Persistent memory") && !Game.Has("Elder Pact") && bingo && (bingo.unlocked || bingo.bought)) {
        var steps = FCP.researchSteps(),
            per = Game.baseResearchTime / 10;
        holds.push({ label: "research (" + steps + " steps to Elder Pact" + eta((steps * per) / fps) + ")" });
    }
    // Elder Pledges (5 in one run), then the Covenant.
    if (FrozenCookies.elderPledgeAchievs && Game.Has("Elder Pact")) {
        if (!FCP.has("Elder slumber")) {
            var dur = Game.getPledgeDuration ? Game.getPledgeDuration() : fps * 60 * 30;
            holds.push({ label: "Elder slumber (pledges " + Game.pledges + "/5" + eta(((5 - Game.pledges) * dur) / fps) + ")" });
        } else if (!FCP.has("Elder calm")) holds.push({ label: "Elder calm (covenant)" });
    }
    if (Game.season === "christmas") {
        // 200 reindeer in one run.
        if (!FCP.has("Reindeer sleigher") && Game.reindeerClicked < 200) {
            var r = Game.shimmerTypes.reindeer, avg = r && r.maxTime > r.minTime ? (r.minTime + 0.25 * (r.maxTime - r.minTime)) / fps : 0;
            holds.push({ label: "Reindeer sleigher (" + Game.reindeerClicked + "/200" + eta((200 - Game.reindeerClicked) * avg) + ")" });
        }
        // Santa's final form.
        if (!FCP.has("All hail Santa") && Game.Has("A festive hat") && Game.santaLevel < 14)
            holds.push({ label: "All hail Santa (Santa " + Game.santaLevel + "/14)" });
    }
    return holds;
};
// When this run started waiting (kept through a reload of the game).
FCP.holdSince = function () {
    var key = "fcpAscendHold", run = String(Game.startDate), saved = null;
    try { saved = JSON.parse(localStorage.getItem(key) || "null"); } catch (e) {}
    if (!saved || saved.run !== run) {
        saved = { run: run, since: Date.now() };
        try { localStorage.setItem(key, JSON.stringify(saved)); } catch (e) {}
    }
    return saved.since;
};

// --- When to ascend -----------------------------------------------------------
FCP.runLevels = function () {
    var total = Game.cookiesReset + Game.cookiesEarned;
    try { total += wrinklerValue() + chocolateValue(); } catch (e) {}
    return Math.floor(Game.HowMuchPrestige(total)) - Game.prestige;
};
FCP.ascendTarget = function () {
    return Game.prestige > 0 ? Math.max(1, Game.prestige) : FCP.FIRST_ASCEND_LEVELS;
};
FCP.ascendCookiesLeft = function () {
    return Math.max(0, Game.HowManyCookiesReset(Game.prestige + FCP.ascendTarget()) - Game.cookiesReset - Game.cookiesEarned);
};

FCP.ascendTick = function () {
    FCP.patchHeavenlyBuy();
    if (!FrozenCookies.smartAscend) {
        FCP.status["Ascension"] = "";
        return;
    }
    // Our own ascension screen: give the animation a moment, then reincarnate (upgrades first).
    if (Game.OnAscend) {
        if (FCP.autoAscension === "smart" && !Game.AscendTimer && !Game.ReincarnateTimer) {
            FCP.onAscendSince = FCP.onAscendSince || Date.now();
            if (Date.now() - FCP.onAscendSince > 1500) {
                FCP.onAscendSince = 0;
                Game.Reincarnate(1);
            }
        }
        return;
    }
    FCP.onAscendSince = 0;
    if (FCP.busy() || Game.ascensionMode == 1 || FrozenCookies.ascensionMarathon || FCP.challengeExit) {
        FCP.status["Ascension"] = "";
        return;
    }
    var target = FCP.ascendTarget(),
        have = FCP.runLevels(),
        first = Game.prestige <= 0;
    if (have < target) {
        var left = FCP.ascendCookiesLeft(), rate = FCP.cookieRate ? FCP.cookieRate() : Game.cookiesPs;
        FCP.status["Ascension"] =
            (first ? "first one at " + Beautify(target) + " prestige levels" : "when prestige doubles (+" + Beautify(target) + " levels)") +
            " · " + Beautify(Math.max(0, have)) + " so far" +
            // A time only when close: income keeps growing, so a far-off estimate at today's
            // income (years, early in a run) means nothing.
            (rate > 0 && left / rate < 6 * 3600 ? " · about " + timeDisplay(left / rate) : "");
        return;
    }
    // Worth it, but first the one-time goals this run can still finish (at most 8 hours).
    var holds = FCP.ascendHolds();
    if (holds.length) {
        var since = FCP.holdSince();
        var left = FCP.HOLD_HOURS * 3600 - (Date.now() - since) / 1000;
        if (left > 0) {
            FCP.status["Ascension"] = "ready, waiting for " + holds.map(function (h) { return h.label; }).join(" · ") +
                " · at most " + timeDisplay(Math.ceil(left)) + " more";
            return;
        }
    }
    // Wait out a combo, pop the wrinklers, then go.
    if (cpsBonus() > 1 || hasClickBuff()) {
        FCP.status["Ascension"] = "ready, waiting for the current buffs to end";
        return;
    }
    var wrinklers = Game.wrinklers.filter(function (w) {
        return w.phase > 0 && w.hp > 0 && !(w.type == 1 && FrozenCookies.shinyPop);
    });
    if (wrinklers.length) {
        wrinklers.forEach(function (w) { w.hp = 0; });
        FCP.status["Ascension"] = "ready, popping wrinklers first";
        return;
    }
    FCP.status["Ascension"] = "ascending now";
    FCP.log("Ascending for " + Beautify(have) + " prestige levels.", true);
    FCP.autoAscend("smart");
};

// FC's own auto-ascend: set aside while smart ascension is on. When it is off, two gates that
// stopped it with default settings are lifted: the doubling mode needed a chips amount above 0,
// and "block during a x1 Frenzy" (the default) blocked it even with no buff at all.
if (typeof autoCookie === "function" && !autoCookie.__fcpAscend) {
    var _fcpAscendAutoCookie = autoCookie;
    autoCookie = function () {
        var toggle = FrozenCookies.autoAscendToggle,
            amount = FrozenCookies.HCAscendAmount,
            minMult = FrozenCookies.minCpSMult;
        if (FrozenCookies.smartAscend) FrozenCookies.autoAscendToggle = 0;
        else {
            if (FrozenCookies.autoAscend == 2 && !(amount > 0)) FrozenCookies.HCAscendAmount = 1;
            if (!(minMult > 1)) FrozenCookies.minCpSMult = 1.0001;
        }
        try {
            return _fcpAscendAutoCookie.apply(this, arguments);
        } finally {
            FrozenCookies.autoAscendToggle = toggle;
            FrozenCookies.HCAscendAmount = amount;
            FrozenCookies.minCpSMult = minMult;
        }
    };
    autoCookie.__fcpAscend = true;
}

FCP.addTask("ascend", function () { return true; }, FCP.ascendTick, 1000);
