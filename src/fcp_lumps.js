// Frozen Cookies Plus — sugar lump spending.
// Levels stay through ascensions and lumps are slow to come, so the plan is the same whatever a run
// has bought so far. As in the game, a building can only be levelled once you own one: when the
// next building in the plan isn't owned yet, the lumps wait for it rather than go elsewhere
// (FC soon owns every building).
// 1) Level 1 Farm/Bank/Temple/Wizard tower to unlock the minigames.
// 2) The levels that help the minigames (what each does, from the game code):
//    - Farm to 9: the garden plot grows with each level, 2x2 at 1 to the full 6x6 at 9, and a
//      bigger plot breeds new seeds faster.
//    - Cursor to 12: the stock market's bank offices need Cursor levels 2, 4, 8, 10 and 12 (more
//      warehouse space and loan slots; the top one +50% warehouse space and Pyramid scheme). FC's
//      Auto-Banking upgrades the offices once the levels are there.
//    - Bank to 10: every stock's resting value +1 per level.
//    Wizard tower and Temple levels barely help theirs: max magic grows with the log of towers +
//    10 x level (about +2 magic from level 1 to 10 with ~600 towers), and the Pantheon never reads
//    the Temple's level. They wait for the CpS round.
// 3) The CpS round: one building at a time to level 10 (an achievement each, and +10 warehouse
//    space for its stock), the costliest buildings first since they end up producing the most.
// 4) Optionally keep levelling the building that gains the most CpS per lump, once every
//    building is owned (before that, the cheap early ones would look best).

FCP.minigameBuildings = ["Farm", "Bank", "Temple", "Wizard tower"];

// [building, level, why] in order: the minigame levels, then every other building to 10.
FCP.CURSOR_OFFICE_LEVELS = [2, 4, 8, 10, 12];
FCP.lumpTargets = function () {
    var list = [
        ["Farm", 9, "full garden plot"],
        ["Cursor", 12, "bank offices"],
        ["Bank", 10, "stock values"],
    ];
    Game.ObjectsById.slice().reverse().forEach(function (o) {
        if (o.name !== "Cursor" && o.name !== "Bank") list.push([o.name, 10]);
    });
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
            FCP.status["Sugar lumps"] = o.name + " → lvl 1 (minigame) · lumps " + Game.lumps + "/1" +
                (o.amount > 0 ? "" : " · needs a " + o.single);
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
        var office = FCP.CURSOR_OFFICE_LEVELS.indexOf(cost);
        var goal =
            b.name === "Cursor" && office !== -1
                ? " (bank office " + (office + 2) + ")"
                : targets[t][2]
                ? " (" + targets[t][2] + ")"
                : targets[t][1] === 10 && b.levelAchiev10
                ? " (“" + b.levelAchiev10.dname + "”)"
                : "";
        FCP.status["Sugar lumps"] =
            b.name + " → lvl " + cost + "/" + targets[t][1] + goal + " · lumps " + Game.lumps + "/" + cost +
            (reserve ? " (+" + reserve + " kept)" : "") + (b.amount > 0 ? "" : " · needs a " + b.single);
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
        FCP.status["Sugar lumps"] = "targets done · more once every building is owned (" + missing[0].name + ")";
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
        FCP.status["Sugar lumps"] = best.name + " → lvl " + (best.level + 1) + " · lumps " + Game.lumps + "/" + (best.level + 1);
        if (Game.lumps - (best.level + 1) >= reserve) {
            FCP.levelUp(best);
            return true;
        }
    }
    return false;
};

FCP.addTask("lumps", function () { return !!FrozenCookies.autoLumps; }, FCP.lumpTick, 5000);
