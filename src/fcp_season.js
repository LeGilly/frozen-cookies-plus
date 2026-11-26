// Smart season: which season FC rests in (FrozenCookies.defaultSeason) once it has collected the
// drops of the seasons it visits.
//
// Christmas while this run still needs it: Reindeer sleigher (200 reindeer in one run), Santa's
// levels, the reindeer drops, Baby it's old outside. Santa, the reindeer count and the drops are
// reset at every ascension, so every run starts in Christmas.
//
// Then whichever pays more:
// - Christmas: reindeer, each worth a minute of production (FC's reindeerValue: x2 with Ho ho
//   ho-flavored frosting, more during a Frenzy or an Elder frenzy).
// - A season whose Star heavenly upgrade you own: golden cookies come sooner during it
//   (Game.shimmerTypes.golden.getTimeMod): x0.95 of the time with Startrade in Business Day,
//   x0.98 with Starspawn (Easter), Starterror (Halloween) or Starlove (Valentine's day).
// Early on, production is most of the income and reindeer win. Late, golden cookies are most of it
// (83% vs 0.3% for buildings in one save) and Business Day with Startrade pays about 4x reindeer.
// A switch costs about a minute of unbuffed production (x1.5 per switch this run).

FCP.STAR_SEASONS = [
    { season: "fools", upgrade: "Startrade", mult: 0.95 },
    { season: "easter", upgrade: "Starspawn", mult: 0.98 },
    { season: "halloween", upgrade: "Starterror", mult: 0.98 },
    { season: "valentines", upgrade: "Starlove", mult: 0.98 },
];

FCP.seasonName = function (s) {
    return s === "" ? "no season" : Game.seasons[s] ? Game.seasons[s].name : s;
};

// The Christmas numbers, shared with smart ascension's holds (fcp_ascend.js).
FCP.REINDEER_GOAL = 200; // Reindeer sleigher: 200 reindeer in one run
FCP.santaMax = function () {
    return Game.santaLevels.length - 1; // 14: Santa's final form
};
FCP.reindeerWanted = function () {
    return !FCP.has("Reindeer sleigher") && Game.reindeerClicked < FCP.REINDEER_GOAL;
};
// Median seconds between two reindeer, from the game's own spawn times (Reindeer baking
// grounds, Starsnow and the rest included); 0 when unknown.
FCP.reindeerSeconds = function () {
    var r = Game.shimmerTypes.reindeer;
    if (!r) return 0;
    var min = r.getMinTime(r), max = r.getMaxTime(r);
    return max > min ? FCP.medianSpawnFrame(min, max, 0) / Game.fps : 0;
};

// What this run still needs Christmas for, as short labels ([] when nothing). Santa counts every
// run (his levels give upgrades), not only until All hail Santa: the ascension hold only waits
// for the achievement.
FCP.christmasGoals = function () {
    var goals = [];
    if (FCP.reindeerWanted()) goals.push("reindeer " + Game.reindeerClicked + "/" + FCP.REINDEER_GOAL);
    var maxSanta = FCP.santaMax();
    if (!Game.Has("A festive hat")) goals.push("Santa");
    else if (Game.santaLevel < maxSanta) goals.push("Santa " + Game.santaLevel + "/" + maxSanta);
    if (typeof haveAll === "function" && !haveAll("christmas")) goals.push("reindeer drops");
    if (FrozenCookies.shadowAchievements && !FCP.has("Baby it's old outside")) goals.push("Baby it's old outside");
    return goals;
};

// Reindeer income per second if it were Christmas (FC's reindeerValue only counts during Christmas).
FCP.reindeerIncome = function () {
    var w = Game.elderWrath, frenzy = frenzyProbability(w), clot = clotProbability(w), blood = bloodProbability(w);
    var per = baseCps() * (Game.Has("Ho ho ho-flavored frosting") ? 2 : 1) * 60;
    var value = Math.max(25, per * 7) * frenzy + Math.max(25, per * 0.5) * clot + Math.max(25, per * 666) * blood +
        Math.max(25, per) * (1 - frenzy - clot - blood);
    var time = FCP.reindeerSeconds();
    return time > 0 ? (value / time) * FrozenCookies.simulatedGCPercent : 0;
};

// Golden cookie income per second without any season bonus (FC's spawn model leaves the Star
// upgrades out, so this is the same in every season).
FCP.goldenIncomeBase = function () {
    return gcPs(cookieValue(Math.min(Game.cookies, FCP.bankTarget())));
};

// Each season's extra income per second, best first: [{season, value, what}].
FCP.seasonValues = function () {
    var out = [{ season: "christmas", value: FCP.reindeerIncome(), what: "reindeer" }];
    var golden = FCP.goldenIncomeBase();
    FCP.STAR_SEASONS.forEach(function (s) {
        if (Game.Has(s.upgrade)) out.push({ season: s.season, value: golden * (1 / s.mult - 1), what: s.upgrade });
    });
    return out.sort(function (a, b) { return b.value - a.value; });
};

// The season to rest in, and why.
FCP.bestSeason = function () {
    var goals = FCP.christmasGoals();
    if (goals.length) return { season: "christmas", why: goals.join(", ") };
    var vals = FCP.seasonValues(), best = vals[0];
    // Keep the current choice unless the best beats it by 10%: no back and forth on noise.
    var current = seasons[FrozenCookies.defaultSeason];
    var cur = vals.filter(function (v) { return v.season === current; })[0];
    if (cur && cur !== best && best.value < cur.value * 1.1) best = cur;
    var why = vals.slice(0, 2).map(function (v) { return v.what + " +" + Beautify(v.value) + "/s"; }).join(" vs ");
    return { season: best.season, why: why };
};

FCP.seasonTick = function () {
    if (!FrozenCookies.defaultSeasonToggle || !Game.Has("Season switcher")) {
        FCP.status["Season"] = "";
        return;
    }
    var b = FCP.attempt("best season", FCP.bestSeason, null);
    if (!b) return;
    var i = seasons.indexOf(b.season);
    if (i > 0 && FrozenCookies.defaultSeason !== i) {
        FrozenCookies.defaultSeason = i;
        FCP.log("Resting season: " + FCP.seasonName(b.season) + " (" + b.why + ").");
    }
    FCP.status["Season"] = FCP.seasonName(b.season) + " · " + b.why +
        (Game.season !== b.season ? " · now " + FCP.seasonName(Game.season) : "");
};

FCP.addTask("season", function () { return !!FrozenCookies.smartSeason; }, FCP.seasonTick, 10000);

// Cookie storms: FC switches to Easter during one (autoEasterAction), since its many cookies drop
// eggs. But FC never leaves a season before it has all its drops, so with eggs still missing the
// run stayed in Easter, away from whatever it was doing (Christmas reindeer, Halloween wrinklers).
// FC+ remembers the season it left (kept through a reload) and switches back once the storm ends.
// The missing eggs are still collected later: FC visits Easter for them once the other seasons
// are done, as usual.
FCP.wrapOnce(window, "autoEasterAction", "stormReturn", function (original) {
    return function () {
        var before = Game.season;
        var r = original.apply(this, arguments);
        if (before !== "easter" && Game.season === "easter" && Game.hasBuff("Cookie storm")) {
            FCP.store("fcpStormReturn", { run: String(Game.startDate), season: before });
            FCP.log("Cookie storm: switched to Easter for its eggs, back to " + FCP.seasonName(before) + " when it ends.");
        }
        return r;
    };
});

FCP.stormReturnTick = function () {
    var d = FCP.runStore("fcpStormReturn");
    FCP.status["Cookie storm"] = "";
    if (typeof d.season !== "string") return;
    var done = function () { FCP.store("fcpStormReturn", null); };
    // Already out of Easter (FC or you switched), or nowhere to go back to: FC decides.
    if (Game.season !== "easter" || d.season === "" || !Game.seasons[d.season]) return done();
    if (Game.hasBuff("Cookie storm") || FCP.busy()) return;
    var biscuit = Game.Upgrades[Game.seasons[d.season].trigger];
    if (!biscuit || !biscuit.unlocked) return done();
    if (!FCP.canSpend(biscuit.getPrice())) {
        FCP.status["Cookie storm"] = "back to " + FCP.seasonName(d.season) + " once " + Beautify(biscuit.getPrice()) + " can be spent";
        return;
    }
    biscuit.buy(1);
    FCP.log("Cookie storm over: back to " + FCP.seasonName(d.season) + ".");
    done();
};

FCP.addTask("stormReturn", function () { return true; }, FCP.stormReturnTick, 1000);
