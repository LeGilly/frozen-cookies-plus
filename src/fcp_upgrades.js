// Frozen Cookies Plus — upgrade tracker.
// The game's "Upgrades unlocked" stat counts every regular, cookie and research upgrade (pools
// '', 'cookie' and 'tech'), and only those bought in the current run: ascending clears them, and
// clears the season drops too (Keepsakes keeps 1 in 5). A complete run owns them all at once.
// This lists what the run is missing and where each one comes from, in the FC menu, with a
// one-line summary in the infobox. It changes nothing in what FC buys.

FCP.kittenMilk = {
    "Kitten helpers": 0.5, "Kitten workers": 1, "Kitten engineers": 2, "Kitten overseers": 3, "Kitten managers": 4,
    "Kitten accountants": 5, "Kitten specialists": 6, "Kitten experts": 7, "Kitten consultants": 8,
    "Kitten assistants to the regional manager": 9, "Kitten marketeers": 10, "Kitten analysts": 11,
    "Kitten executives": 12, "Kitten admins": 13, "Kitten strategists": 14,
};

FCP.gardenDropPlant = {
    "Elderwort biscuits": "Elderwort", "Bakeberry cookies": "Bakeberry", "Duketater cookies": "Duketater",
    "Green yeast digestives": "Green rot", "Fern tea": "Drowsyfern", "Ichor syrup": "Ichorpuff", "Wheat slims": "Baker's wheat",
};

FCP.mouseClicks = {
    "Plastic mouse": 1e3, "Iron mouse": 1e5, "Titanium mouse": 1e7, "Adamantium mouse": 1e9, "Unobtainium mouse": 1e11,
    "Eludium mouse": 1e13, "Wishalloy mouse": 1e15, "Fantasteel mouse": 1e17, "Nevercrack mouse": 1e19,
    "Armythril mouse": 1e21, "Technobsidian mouse": 1e23, "Plasmarble mouse": 1e25, "Miraculite mouse": 1e27,
    "Aetherice mouse": 1e29, "Omniplast mouse": 1e31,
};

// Butter biscuits: own N of every building (the game's main loop, next to the Centennial achievements).
FCP.butterBiscuits = ["Milk chocolate butter biscuit", "Dark chocolate butter biscuit", "White chocolate butter biscuit",
    "Ruby chocolate butter biscuit", "Lavender chocolate butter biscuit", "Synthetic chocolate green honey butter biscuit",
    "Royal raspberry chocolate butter biscuit", "Ultra-concentrated high-energy chocolate butter biscuit",
    "Pure pitch-black chocolate butter biscuit", "Cosmic chocolate butter biscuit", "Butter biscuit (with butter)",
    "Everybutter biscuit", "Personal biscuit"];

FCP.countsAsUpgrade = function (u) {
    return Game.CountsAsUpgradeOwned(u.pool);
};

// [group, detail] for an upgrade not owned this run.
FCP.upgradeSource = function (u) {
    var n = u.name, pct = function (have, need) { return Math.min(99, Math.floor((100 * have) / need)) + "%"; };
    var seasonName = function (s) { return Game.seasons[s] ? Game.seasons[s].name : s; };
    var inSeason = function (s) { return Game.season === s ? " (season on now)" : ""; };

    if (u.unlocked) {
        if (n === "Chocolate egg") return ["In the store", "sell it at ascension for 5% of the bank (FC skips it)"];
        if (n === "Elder Pact") return ["In the store", "turns golden cookies into wrath cookies (FC skips it)"];
        var price = u.getPrice();
        return ["In the store", Game.cookies >= price ? "affordable, not bought yet" : "costs " + Beautify(price)];
    }
    // Season drops: cleared at every ascension, so they are found again in the same run.
    if (Game.santaDrops.indexOf(n) >= 0) return ["Christmas", "Santa's gift (level Santa up)" + inSeason("christmas")];
    if (Game.reindeerDrops.indexOf(n) >= 0) return ["Christmas", "dropped by reindeer" + inSeason("christmas")];
    if (Game.halloweenDrops.indexOf(n) >= 0) return ["Halloween", "dropped by popped wrinklers" + inSeason("halloween")];
    if (Game.easterEggs.indexOf(n) >= 0) return ["Easter", "egg from golden cookies and wrinklers" + inSeason("easter")];
    if (Game.heartDrops.indexOf(n) >= 0) return ["Valentine's day", "each heart unlocks the next" + inSeason("valentines")];
    if (u.unlockAt && u.unlockAt.season) return [seasonName(u.unlockAt.season), "during the season" + inSeason(u.unlockAt.season)];
    if (n === "A festive hat") return ["Christmas", "during Christmas" + inSeason("christmas")];

    if (FCP.gardenDropPlant[n]) return ["Garden", "random drop when harvesting a mature " + FCP.gardenDropPlant[n] + " (unlocked forever once found)"];
    if (/^Dragon (scale|claw|fang|teddy bear)$/.test(n)) return ["Dragon", "pet the dragon at level 8+ (1 in 20 per pet, drop depends on the minute)"];
    if (n === "Dragon cookie") return ["Dragon", "the dragon's last training step (50 of every building)"];
    if (u.pool === "tech") return ["Research", n === "Elder Pact" ? "last step of the research chain" : "Bingo center research chain"];
    if (n === "Sacrificial rolling pins") return ["Elder Pledges", "10 Elder Pledges in one run (" + Game.pledges + "/10)"];
    if (FCP.kittenMilk[n] !== undefined) return ["Kittens (milk)", "milk " + Math.floor(FCP.kittenMilk[n] * 100) + "% (have " + Math.floor(Game.milkProgress * 100) + "%: more achievements)"];
    if (FCP.mouseClicks[n]) return ["Clicking", Beautify(FCP.mouseClicks[n]) + " cookies from clicks this run (" + pct(Game.handmadeCookies, FCP.mouseClicks[n]) + ")"];
    if (/^(Lucky day|Serendipity|Get lucky)$/.test(n)) {
        var need = { "Lucky day": 7, Serendipity: 27, "Get lucky": 77 }[n];
        return ["Golden cookies", need + " golden cookies clicked in all (" + Game.goldenClicks + ")"];
    }
    if (u.tier === "fortune") return ["News ticker", "click its fortune in the news ticker (FC Auto-fortune)"];
    var bb = FCP.butterBiscuits.indexOf(n);
    if (bb >= 0) {
        var least = Math.min.apply(null, Game.ObjectsById.map(function (o) { return o.amount; }));
        return ["Buildings", (100 + 50 * bb) + " of every building (fewest: " + least + ")"];
    }
    if (n === "Heavenly chip secret") return ["Heavenly", "needs the Legacy heavenly upgrade"];

    // Synergies: both buildings at 15 (Vol. I) or 75 (Vol. II), and the heavenly book.
    if (u.tier === "synergy1" || u.tier === "synergy2") {
        var t = Game.Tiers[u.tier], b = u.buildingTie1, b2 = u.buildingTie2;
        if (!Game.Has(t.req)) return ["Heavenly", "needs " + t.req];
        if (b && b2) return ["Buildings", t.unlock + " " + b.plural + " and " + t.unlock + " " + b2.plural + " (have " + b.amount + " and " + b2.amount + ")"];
    }
    // Tiered building upgrades.
    if (u.buildingTie && Game.Tiers[u.tier] && Game.Tiers[u.tier].unlock > 0) {
        var bt = u.buildingTie, needN = Game.Tiers[u.tier].unlock;
        return ["Buildings", needN + " " + bt.plural + " (have " + bt.amount + ")"];
    }
    // Grandma types: 1 grandma and 15 of the building.
    if (Game.GrandmaSynergies.indexOf(n) >= 0 && u.buildingTie)
        return ["Buildings", "15 " + u.buildingTie.plural + " and a grandma (have " + u.buildingTie.amount + ")"];
    // FC's prerequisite table (buildings by id, then upgrades).
    var pre = typeof upgradeJson !== "undefined" && upgradeJson[u.id];
    if (pre) {
        var short = [];
        (pre.buildings || []).forEach(function (need, id) {
            var o = Game.ObjectsById[id];
            if (o && need > o.amount) short.push(need + " " + o.plural + " (have " + o.amount + ")");
        });
        (pre.upgrades || []).forEach(function (id) {
            var p = Game.UpgradesById[id];
            if (p && !p.bought) short.push(p.dname || p.name);
        });
        if (short.length) return ["Buildings / other upgrades", short.join(", ")];
    }
    // Cookies: unlock at a twentieth of their price baked this run (some also need a heavenly upgrade).
    if (u.unlockAt && u.unlockAt.cookies !== undefined) {
        var req = u.unlockAt.require;
        if (req && !Game.Has(req) && !(Game.Achievements[req] && Game.Achievements[req].won))
            return ["Heavenly", "needs " + req];
        return ["Cookies baked", Beautify(u.unlockAt.cookies) + " baked this run (" + pct(Game.cookiesEarned, u.unlockAt.cookies) + ")"];
    }
    var text = (u.ddesc || u.desc || "").replace(/<q>.*?<\/q>/g, "").replace(/<[^>]+>/g, "");
    return ["Other", text.slice(0, 120)];
};

FCP.upgradeReport = function () {
    var r = { owned: 0, total: 0, heavenlyOwned: 0, heavenlyTotal: 0, groups: {} };
    Object.keys(Game.UpgradesById).forEach(function (id) {
        var u = Game.UpgradesById[id];
        if (u.pool === "prestige") {
            r.heavenlyTotal++;
            if (u.bought) r.heavenlyOwned++;
            return;
        }
        if (!FCP.countsAsUpgrade(u)) return;
        r.total++;
        if (u.bought) {
            r.owned++;
            return;
        }
        var c = FCP.upgradeSource(u);
        (r.groups[c[0]] = r.groups[c[0]] || []).push({ dname: u.dname || u.name, hint: c[1] });
    });
    return r;
};

// One line for the infobox: the counts and the biggest groups still missing.
FCP.upgradeSummary = function () {
    var r = FCP.upgradeReport();
    var groups = Object.keys(r.groups).sort(function (a, b) { return r.groups[b].length - r.groups[a].length; });
    return (
        r.owned + "/" + r.total + " · heavenly " + r.heavenlyOwned + "/" + r.heavenlyTotal +
        (groups.length ? " · missing: " + groups.slice(0, 3).map(function (g) { return g.toLowerCase() + " " + r.groups[g].length; }).join(", ") : "")
    );
};
