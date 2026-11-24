// Frozen Cookies Plus — first-run scoring.
// FC scores a purchase as  price / CpS  +  price / CpS gained  (time to afford + time to pay back).
// Cookie Monster's "payback period" only counts the cookies still missing for the first part:
//     max(price + bank - cookies, 0) / CpS  +  price / CpS gained
// tools/benchmark.mjs measured it (fresh save, 3 seeds, no clicking): +52% cookies baked after
// 30 min, +16% after 1 h, +5% after 2 h, +1.2% after 4 h, never worse. After an ascension it showed
// no gain (8 seeds, -9% within noise), so it is only used before the first ascension.
// The score depends on the bank, so FC's ranking is refreshed every 5 seconds while it is active.

FCP.firstRunScoringActive = function () {
    return !!FrozenCookies.firstRunScoring && Game.prestige < 1 && Game.resets === 0;
};

FCP.scoringBank = 0;

var _fcpOriginalPurchaseEfficiency = purchaseEfficiency;
purchaseEfficiency = function (price, deltaCps, baseDeltaCps, currentCps) {
    if (!FCP.firstRunScoringActive()) return _fcpOriginalPurchaseEfficiency.apply(this, arguments);
    if (!(deltaCps > 0)) return Number.POSITIVE_INFINITY;
    var missing = Math.max(price + FCP.scoringBank - Game.cookies, 0);
    return FrozenCookies.efficiencyWeight * divCps(missing, currentCps) + divCps(price, deltaCps);
};

FCP.scoringTick = function () {
    if (!FCP.firstRunScoringActive() || FCP.busy()) return;
    try {
        FCP.scoringBank = delayAmount() || 0;
    } catch (e) {}
    FrozenCookies.recalculateCaches = true;
};

FCP.addTask("scoring", function () { return !!FrozenCookies.firstRunScoring; }, FCP.scoringTick, 5000);

// ---------------------------------------------------------------------------
// Research chain (option researchScoring, on in Recommended).
// FC values the Bingo center only for making grandmas 4x as efficient, often a tiny gain late in
// a run, so it ranked as a poor buy even at a few seconds of income. Its real value is the
// research it starts: Specialized chocolate chips (+1%), Designer cocoa beans (+2%), Ritual
// rolling pins (grandmas x2), Underworld ovens (+3%), One mind, Exotic nuts (+4%), Communal
// brainsweep and Arcane sugar (+5%), each researched in turn (30 minutes each, 3 with Persistent
// memory). Each chain upgrade is scored together with the next one it unlocks: both prices against
// both gains, plus the research wait.
// It keeps FC's own score when that is better. Elder Pact (wrath) is left out.
// ---------------------------------------------------------------------------
FCP.researchChain = ["Bingo center/Research facility", "Specialized chocolate chips", "Designer cocoa beans",
    "Ritual rolling pins", "Underworld ovens", "One mind", "Exotic nuts", "Communal brainsweep", "Arcane sugar"];

FCP.chainScore = function (entry) {
    var i = FCP.researchChain.indexOf(entry.purchase.name);
    if (i < 0) return null;
    // This upgrade and the next research it unlocks (that one, when its turn comes, is scored
    // with the one after, and so on). Counting the whole chain at once made the cheap Bingo
    // center carry the price of everything after it.
    var rest = FCP.researchChain.slice(i, i + 2).map(function (n) { return Game.Upgrades[n]; })
        .filter(function (u) { return u && !u.bought; });
    if (rest.length < 2) return null;
    var cost = entry.cost - entry.purchase.getPrice(); // FC's cost includes buildings it needs first
    rest.forEach(function (u) { cost += u.getPrice(); });
    var bank = bestBank(0).cost,
        cpsOrig = effectiveCps(Math.min(Game.cookies, bank)),
        baseOrig = baseCps(),
        won = Object.values(Game.AchievementsById).map(function (a) { return a.won; }),
        wrath = Game.elderWrath,
        undo = [],
        cpsNew, baseNew;
    try {
        rest.forEach(function (u) { undo.push([u, upgradeToggle(u)]); });
        cpsNew = effectiveCps(bank);
        baseNew = baseCps();
    } finally {
        for (var k = undo.length - 1; k >= 0; k--) upgradeToggle(undo[k][0], won, undo[k][1]);
        Game.elderWrath = wrath;
    }
    var perStep = Game.Has("Persistent memory") ? Game.baseResearchTime / 10 : Game.baseResearchTime;
    var wait = perStep / Game.fps; // the next upgrade only comes once researched
    return purchaseEfficiency(cost, cpsNew - cpsOrig, baseNew - baseOrig, cpsOrig) + wait;
};

var _fcpOriginalUpgradeStats = upgradeStats;
upgradeStats = function (recalculate) {
    var list = _fcpOriginalUpgradeStats.apply(this, arguments);
    if (recalculate && FrozenCookies.researchScoring && list && list.length) {
        list.forEach(function (e) {
            if (!e || e.type !== "upgrade" || !e.purchase) return;
            try {
                var chain = FCP.chainScore(e);
                if (chain !== null && chain < e.efficiency) {
                    e.fcpOwnEfficiency = e.efficiency;
                    e.efficiency = chain;
                    e.fcpResearchChain = true;
                }
            } catch (err) {
                console.error("[FC+] research chain scoring failed:", err);
            }
        });
    }
    return list;
};
