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
