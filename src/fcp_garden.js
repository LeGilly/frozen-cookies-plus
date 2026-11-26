// Frozen Cookies Plus — garden bot.
// Unlock mode: pick the next locked seed whose parents are unlocked, plant
// the parents in a layout where every empty tile touches all of them, pull
// anything else that grows on the empty tiles, and harvest new plants once
// mature (harvesting a mature plant unlocks its seed).
// Idle mode (everything unlocked): keep the plot full of Baker's wheat and
// harvest it for Botany enthusiast / Green, aching thumb / Garden of Eden.
// Recipes follow minigameGarden.js M.getMuts.

FCP.gardenRecipes = [
    // [target, [options...]]; option = {p: [parents], layout}
    ["thumbcorn", [{ p: ["bakerWheat", "bakerWheat"], layout: "alt" }]],
    ["cronerice", [{ p: ["bakerWheat", "thumbcorn"], layout: "alt" }]],
    ["gildmillet", [{ p: ["cronerice", "thumbcorn"], layout: "alt" }]],
    ["clover", [{ p: ["bakerWheat", "gildmillet"], layout: "alt" }]],
    ["shimmerlily", [{ p: ["clover", "gildmillet"], layout: "alt" }]],
    ["elderwort", [{ p: ["shimmerlily", "cronerice"], layout: "alt" }]],
    ["bakeberry", [{ p: ["bakerWheat", "bakerWheat"], layout: "alt" }]],
    ["meddleweed", [{ p: [], layout: "weeds" }]],
    ["brownMold", [{ p: ["whiteMildew"], layout: "sparse" }, { p: ["meddleweed"], layout: "weeds" }]],
    ["crumbspore", [{ p: ["meddleweed"], layout: "weeds" }]],
    ["whiteMildew", [{ p: ["brownMold"], layout: "sparse" }]],
    ["chocoroot", [{ p: ["bakerWheat", "brownMold"], layout: "alt" }]],
    ["whiteChocoroot", [{ p: ["chocoroot", "whiteMildew"], layout: "alt" }]],
    ["tidygrass", [{ p: ["bakerWheat", "whiteChocoroot"], layout: "alt" }]],
    ["whiskerbloom", [{ p: ["shimmerlily", "whiteChocoroot"], layout: "alt" }]],
    ["chimerose", [{ p: ["shimmerlily", "whiskerbloom"], layout: "alt" }]],
    ["nursetulip", [{ p: ["whiskerbloom", "whiskerbloom"], layout: "alt" }]],
    ["greenRot", [{ p: ["whiteMildew", "clover"], layout: "alt" }]],
    ["keenmoss", [{ p: ["greenRot", "brownMold"], layout: "alt" }]],
    ["drowsyfern", [{ p: ["chocoroot", "keenmoss"], layout: "alt" }]],
    ["wardlichen", [{ p: ["cronerice", "whiteMildew"], layout: "alt" }, { p: ["cronerice", "keenmoss"], layout: "alt" }]],
    ["queenbeet", [{ p: ["chocoroot", "bakeberry"], layout: "alt" }]],
    ["duketater", [{ p: ["queenbeet", "queenbeet"], layout: "alt" }]],
    ["queenbeetLump", [{ p: ["queenbeet"], layout: "ring" }]],
    ["glovemorel", [{ p: ["crumbspore", "thumbcorn"], layout: "alt" }]],
    ["cheapcap", [{ p: ["crumbspore", "shimmerlily"], layout: "alt" }]],
    ["doughshroom", [{ p: ["crumbspore", "crumbspore"], layout: "alt" }]],
    ["foolBolete", [{ p: ["doughshroom", "greenRot"], layout: "alt" }]],
    ["wrinklegill", [{ p: ["crumbspore", "brownMold"], layout: "alt" }]],
    ["shriekbulb", [{ p: ["duketater", "duketater"], layout: "sandwich" }, { p: ["wrinklegill", "elderwort"], layout: "alt" }]],
    ["ichorpuff", [{ p: ["elderwort", "crumbspore"], layout: "alt" }]],
    ["everdaisy", [{ p: ["tidygrass", "elderwort"], layout: "sandwich" }]],
    ["goldenClover", [{ p: ["bakerWheat", "gildmillet"], layout: "alt" }]],
];

FCP.garden = function () {
    return Game.Objects["Farm"].minigame;
};

FCP.gardenBounds = function (G) {
    var lv = Math.max(1, Math.min(G.plotLimits.length, G.parent.level)) - 1;
    var l = G.plotLimits[lv];
    return { x0: l[0], y0: l[1], x1: l[2], y1: l[3], w: l[2] - l[0], h: l[3] - l[1] };
};

FCP.layoutFits = function (G, layout) {
    var b = FCP.gardenBounds(G);
    if (layout === "ring") return b.w >= 3 && b.h >= 3;
    if (layout === "sandwich") return b.h >= 3;
    return true;
};

FCP.pickGardenTarget = function (G) {
    for (var i = 0; i < FCP.gardenRecipes.length; i++) {
        var key = FCP.gardenRecipes[i][0];
        var plant = G.plants[key];
        if (!plant || plant.unlocked) continue;
        var options = FCP.gardenRecipes[i][1];
        for (var j = 0; j < options.length; j++) {
            var ok = options[j].p.every(function (p) {
                return p === "meddleweed" ? true : G.plants[p] && G.plants[p].unlocked;
            });
            if (ok && FCP.layoutFits(G, options[j].layout)) return { key: key, recipe: options[j] };
        }
    }
    // A seed we have no recipe for (future game update): nothing to do.
    return null;
};

// Returns grid[y][x] = parent key, "" (keep empty) or undefined (locked tile).
FCP.gardenLayout = function (G, recipe) {
    var b = FCP.gardenBounds(G);
    var grid = [];
    for (var y = 0; y < 6; y++) {
        grid[y] = [];
        for (var x = 0; x < 6; x++) {
            if (x >= b.x0 && x < b.x1 && y >= b.y0 && y < b.y1) grid[y][x] = "";
        }
    }
    var A = recipe.p[0],
        Bp = recipe.p[1] || recipe.p[0];
    var set = function (rx, ry, v) {
        var x = b.x0 + rx,
            y = b.y0 + ry;
        if (grid[y] && grid[y][x] !== undefined) grid[y][x] = v;
    };

    if (recipe.layout === "alt") {
        // Parent rows at 1 and 4 (and the last row if it would be left
        // uncovered); parents alternate A, B along the row, so every empty
        // tile touches both.
        var rows = [];
        if (b.h === 1) rows = [0];
        else {
            for (var r = 1; r < b.h; r += 3) rows.push(r);
            var last = rows[rows.length - 1];
            if (b.h - 1 - last > 1) rows.push(b.h - 1);
        }
        rows.forEach(function (ry) {
            for (var rx = 0; rx < b.w; rx++) set(rx, ry, rx % 2 === 0 ? A : Bp);
        });
    } else if (recipe.layout === "sandwich") {
        // Rows A / empty / B / B / empty / A: each empty tile has 3+ of each.
        var pattern = [A, "", Bp, Bp, "", A];
        for (var ry = 0; ry < b.h; ry++)
            for (var rx = 0; rx < b.w; rx++) set(rx, ry, pattern[ry % 6]);
    } else if (recipe.layout === "sparse") {
        // Isolated parents 3 tiles apart: every empty tile touches at most one.
        for (var sy = 1; sy < b.h; sy += 3) for (var sx = 1; sx < b.w; sx += 3) set(sx, sy, A);
    } else if (recipe.layout === "ring") {
        // 3x3 blocks with an empty centre surrounded by 8 parents.
        for (var by = 0; by + 3 <= b.h; by += 3)
            for (var bx = 0; bx + 3 <= b.w; bx += 3)
                for (var dy = 0; dy < 3; dy++)
                    for (var dx = 0; dx < 3; dx++)
                        if (!(dx === 1 && dy === 1)) set(bx + dx, by + dy, A);
    }
    // "weeds": everything empty
    return grid;
};

// Ring and sandwich recipes need many parents mature at the same time.
// If a group has lost a parent, uproot the whole group so the replanted
// parents all grow up together.
FCP.syncGardenGroups = function (G, grid, layout) {
    if (layout !== "ring" && layout !== "sandwich") return;
    var b = FCP.gardenBounds(G);
    var groups = [];
    if (layout === "ring") {
        for (var by = 0; by + 3 <= b.h; by += 3)
            for (var bx = 0; bx + 3 <= b.w; bx += 3) {
                var g = [];
                for (var dy = 0; dy < 3; dy++)
                    for (var dx = 0; dx < 3; dx++) g.push([b.x0 + bx + dx, b.y0 + by + dy]);
                groups.push(g);
            }
    } else {
        var all = [];
        for (var y = b.y0; y < b.y1; y++) for (var x = b.x0; x < b.x1; x++) all.push([x, y]);
        groups.push(all);
    }
    groups.forEach(function (g) {
        var parents = g.filter(function (c) { return grid[c[1]][c[0]]; });
        var complete = parents.every(function (c) {
            var t = G.plot[c[1]][c[0]];
            return t[0] > 0 && G.plantsById[t[0] - 1].key === grid[c[1]][c[0]];
        });
        if (complete) return;
        var cost = 0;
        parents.forEach(function (c) { cost += G.getCost(G.plants[grid[c[1]][c[0]]]); });
        if (!FCP.canSpend(cost) || Game.cookies < cost) return; // replant all at once or not at all
        parents.forEach(function (c) {
            var t = G.plot[c[1]][c[0]];
            if (t[0] > 0 && G.plantsById[t[0] - 1].unlocked) G.harvest(c[0], c[1]);
        });
    });
};

FCP.setSoil = function (G, key) {
    var soil = G.soils[key];
    if (!soil || G.soil === soil.id || G.freeze) return;
    if (G.nextSoil > Date.now() || G.parent.amount < soil.req) return;
    var el = document.getElementById("gardenSoil-" + soil.id);
    if (el) el.click();
};

FCP.plant = function (G, key, x, y) {
    var p = G.plants[key];
    if (!p || !p.unlocked || !p.plantable) return false;
    var cost = G.getCost(p);
    if (!FCP.canSpend(cost) || Game.cookies < cost) return false;
    return FCP.withSpend("spendItem", p.name + " seed", G.useTool, G, [p.id, x, y]);
};

// Is a plant whose seed we don't have yet growing on the plot (not mature yet)?
FCP.newSeedGrowing = function (G) {
    for (var y = 0; y < 6; y++) for (var x = 0; x < 6; x++) {
        var tile = G.plot[y][x], plant = tile[0] > 0 ? G.plantsById[tile[0] - 1] : null;
        if (plant && !plant.unlocked && tile[1] < plant.mature) return plant;
    }
    return null;
};

FCP.gardenTick = function () {
    if (FCP.busy() || !FrozenCookies.autoGarden) return;
    var G = FCP.garden();
    if (!G || !G.plot || G.freeze) return;

    var target = FCP.pickGardenTarget(G);
    var b = FCP.gardenBounds(G);
    var farms = G.parent.amount;

    if (!target) return FCP.gardenIdle(G, b);

    var weeds = target.recipe.layout === "weeds";
    // A new seed's plant growing: fertilizer (3-minute growth ticks instead of woodchips' 5) gets
    // it to maturity about 40% sooner. The seed only unlocks when it is harvested mature, and the
    // plot is cleared at ascension, so its growth is what holds the run (smart ascension).
    var newSeed = FCP.newSeedGrowing(G);
    if (weeds || newSeed) FCP.setSoil(G, farms >= 50 ? "fertilizer" : "dirt");
    else FCP.setSoil(G, farms >= 300 ? "woodchips" : farms >= 50 ? "fertilizer" : "dirt");

    var grid = FCP.gardenLayout(G, target.recipe);
    FCP.syncGardenGroups(G, grid, target.recipe.layout);
    for (var y = 0; y < 6; y++) {
        for (var x = 0; x < 6; x++) {
            var want = grid[y][x];
            if (want === undefined) continue;
            var tile = G.plot[y][x];
            var plant = tile[0] > 0 ? G.plantsById[tile[0] - 1] : null;
            var mature = plant && tile[1] >= plant.mature;

            // A plant whose seed we don't have: let it mature, then harvest.
            if (plant && !plant.unlocked) {
                if (mature) {
                    G.harvest(x, y);
                    FCP.log("Garden: unlocked the " + plant.name + " seed.");
                }
                continue;
            }

            if (weeds) {
                // Let meddleweed grow old (spores drop more often from old
                // weeds) and pull everything else.
                if (plant && plant.key === "meddleweed") {
                    if (tile[1] >= 84) G.harvest(x, y);
                } else if (plant) G.harvest(x, y);
                continue;
            }

            if (want) {
                if (plant && plant.key !== want) G.harvest(x, y);
                if (!plant || plant.key !== want) FCP.plant(G, want, x, y);
            } else if (plant) {
                G.harvest(x, y);
            }
        }
    }
    var parents = target.recipe.p.length
        ? " (" +
          (target.recipe.p.length === 2 && target.recipe.p[0] === target.recipe.p[1]
              ? "2× " + G.plants[target.recipe.p[0]].name
              : target.recipe.p.map(function (k) { return G.plants[k].name; }).join(" + ")) + ")"
        : " (weeds)";
    FCP.status["Garden"] = (newSeed ? "growing a new " + newSeed.name + " (fertilizer) · " : "") +
        "breeding " + G.plants[target.key].name + parents + " · seeds " + G.plantsUnlockedN + "/" + G.plantsN;
};

FCP.gardenIdle = function (G, b) {
    if (FrozenCookies.autoGarden == 2 && !FCP.has("Seedless to nay") && G.plantsUnlockedN >= G.plantsN) {
        G.convert();
        FCP.log("Garden: sacrificed the garden for 'Seedless to nay' (+10 sugar lumps).", true);
        return;
    }
    var counting = !FCP.has("Green, aching thumb");
    FCP.setSoil(G, counting ? (G.parent.amount >= 50 ? "fertilizer" : "dirt") : G.parent.amount >= 100 ? "clay" : "dirt");
    for (var y = b.y0; y < b.y1; y++) {
        for (var x = b.x0; x < b.x1; x++) {
            var tile = G.plot[y][x];
            var plant = tile[0] > 0 ? G.plantsById[tile[0] - 1] : null;
            if (!plant) {
                FCP.plant(G, "bakerWheat", x, y);
                continue;
            }
            if (plant.weed || plant.key === "brownMold" || plant.key === "whiteMildew" || plant.key === "crumbspore") {
                G.harvest(x, y);
                continue;
            }
            // Harvest mature plants while we still need harvest counts.
            if (counting && tile[1] >= plant.mature) G.harvest(x, y);
        }
    }
    var seeds =
        G.plantsUnlockedN >= G.plantsN
            ? "all seeds"
            : "seeds " + G.plantsUnlockedN + "/" + G.plantsN + " (rest need Farm levels)";
    FCP.status["Garden"] = seeds + (counting ? " · harvests " + G.harvestsTotal + "/1000" : "");
};

FCP.addTask("garden", function () { return !!FrozenCookies.autoGarden; }, FCP.gardenTick, 3000);
