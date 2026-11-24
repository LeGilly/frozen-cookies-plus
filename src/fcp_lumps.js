// Frozen Cookies Plus — sugar lump spending.
// Levels stay through ascensions and lumps are slow to come, so the plan is the same whatever a run
// has bought so far. As in the game, a building can only be levelled once you own one: when the
// next building in the plan isn't owned yet, the lumps wait for it rather than go elsewhere
// (FC soon owns every building).
// 1) Level 1 Farm/Bank/Temple/Wizard tower to unlock the minigames.
// 2) Finish one building at a time to its target level (level 10 gives an achievement each),
//    the costliest buildings first since they end up producing the most; cursors last, to 12
//    for the top stock market office.
// 3) Optionally keep levelling the building that gains the most CpS per lump, once every
//    building is owned (before that, the cheap early ones would look best).

FCP.minigameBuildings = ["Farm", "Bank", "Temple", "Wizard tower"];

FCP.lumpTargets = function () {
    var list = [
        ["Farm", 10], // garden plot grows with levels
        ["Bank", 10], // stock market values and warehouses
        ["Wizard tower", 10],
        ["Temple", 10],
    ];
    Game.ObjectsById.slice().reverse().forEach(function (o) {
        if (o.name !== "Cursor" && !list.some(function (t) { return t[0] === o.name; })) list.push([o.name, 10]);
    });
    list.push(["Cursor", 12]); // bank offices need cursor levels up to 12
    return list;
};

FCP.levelUp = function (building) {
    var ask = Game.prefs.askLumps;
    Game.prefs.askLumps = 0;
    try {
        building.levelUp();
    } finally {
        Game.prefs.askLumps = ask;
    }
    FCP.log("Spent sugar lumps: " + building.name + " is now level " + building.level + ".");
};

// Several level-ups per tick so a big lump stash is spent quickly.
FCP.lumpTick = function () {
    for (var i = 0; i < 25; i++) if (!FCP.lumpStep()) break;
};

// Returns true if it levelled something up.
FCP.lumpStep = function () {
    if (FCP.busy() || !FrozenCookies.autoLumps) return false;
    if (!Game.canLumps || !Game.canLumps()) return false;

    var keep = FrozenCookies.autoSugarFrenzy ? 1 : 0;
    var guard = FrozenCookies.sugarBakingGuard ? 100 : 0;

    // 1) Minigames (always worth it, even with the Sugar Baking guard).
    for (var i = 0; i < FCP.minigameBuildings.length; i++) {
        var o = Game.Objects[FCP.minigameBuildings[i]];
        if (o.level < 1) {
            FCP.status["Sugar lumps"] = o.name + " → level 1 (unlocks its minigame) · need 1, have " + Game.lumps +
                (o.amount > 0 ? "" : " · waiting until you own a " + o.single);
            if (o.amount > 0 && Game.lumps >= 1 + keep) {
                FCP.levelUp(o);
                return true;
            }
            return false;
        }
    }
    if (FrozenCookies.autoLumps < 2) {
        FCP.status["Sugar lumps"] = "minigames unlocked";
        return false;
    }

    var reserve = Math.max(keep, guard);

    // 2) One building at a time up to its target level.
    var targets = FCP.lumpTargets();
    for (var t = 0; t < targets.length; t++) {
        var b = Game.Objects[targets[t][0]];
        if (!b || b.level >= targets[t][1]) continue;
        var cost = b.level + 1;
        var goal =
            targets[t][1] === 10 && b.levelAchiev10
                ? " for “" + b.levelAchiev10.dname + "”"
                : b.name === "Cursor" && b.level >= 10
                ? " (top bank office needs level 12)"
                : "";
        FCP.status["Sugar lumps"] =
            b.name + " → level " + cost + " of " + targets[t][1] + goal + " · need " + cost + ", have " + Game.lumps +
            (reserve ? " (keeping " + reserve + ")" : "") + (b.amount > 0 ? "" : " · waiting until you own a " + b.single);
        if (b.amount > 0 && Game.lumps - cost >= reserve) {
            FCP.levelUp(b);
            return true;
        }
        return false;
    }

    if (FrozenCookies.autoLumps < 3) {
        FCP.status["Sugar lumps"] = "all level targets reached";
        return false;
    }

    // 3) Best CpS gain per lump (+1% of that building's CpS per level), once every building is
    //    owned: early in a run the cheap buildings would look best for the wrong reason.
    var missing = Game.ObjectsById.filter(function (o) { return o.amount <= 0; });
    if (missing.length) {
        FCP.status["Sugar lumps"] = "level targets reached · more levels once you own every building (" + missing[0].name + " next)";
        return false;
    }
    var best = null,
        bestScore = 0;
    Object.keys(Game.Objects).forEach(function (name) {
        var o = Game.Objects[name];
        if (o.amount <= 0) return;
        // FC's 100% consistency combo expects exactly level 10 wizard towers.
        if (name === "Wizard tower" && FrozenCookies.auto100ConsistencyCombo) return;
        var score = (o.storedTotalCps || 0) / (o.level + 1);
        if (score > bestScore) {
            bestScore = score;
            best = o;
        }
    });
    if (best) {
        FCP.status["Sugar lumps"] = "levelling " + best.name + " (next: level " + (best.level + 1) + ")";
        if (Game.lumps - (best.level + 1) >= reserve) {
            FCP.levelUp(best);
            return true;
        }
    }
    return false;
};

FCP.addTask("lumps", function () { return !!FrozenCookies.autoLumps; }, FCP.lumpTick, 5000);
