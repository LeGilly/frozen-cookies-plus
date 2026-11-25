// Frozen Cookies Plus — stock market trading.
// Every good drifts around a resting value (10 + 10*id + bank level - 1).
// Buy when the price is well under it and not crashing, sell when it is
// well over it, above what we paid (fees included) and not still climbing fast.
// Brokers are hired first: each one costs 20 minutes of raw production (a tiny
// share of real income) and cuts the 20% buying fee by 5%.
// Modes: 0 stable, 1 slow rise, 2 slow fall, 3 fast rise, 4 fast fall, 5 chaotic.

FCP.stockBuyRatio = 0.7;
FCP.stockSellRatio = 1.25;
FCP.stockMargin = 1.05; // a sale must beat what was paid, fees included, by 5%

// What each good cost per unit, fees included, when FC+ last bought it (the game only keeps
// the price before fees). Kept with the save's run in localStorage.
FCP.stockPaid = function (id, value) {
    var key = "fcpStockPaid", data = {};
    try { data = JSON.parse(localStorage.getItem(key) || "{}") || {}; } catch (e) {}
    if (value === undefined) return data[id];
    data[id] = value;
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) {}
};

FCP.hireBrokers = function (B) {
    var hired = 0;
    while (B.brokers < B.getMaxBrokers() && FCP.canSpend(B.getBrokerPrice()) && Game.cookies >= B.getBrokerPrice() && hired < 50) {
        Game.Spend(B.getBrokerPrice());
        B.brokers += 1;
        hired++;
    }
    if (hired) FCP.log("Hired " + hired + " stock broker" + (hired > 1 ? "s" : "") + " (buying fee now " + (20 * Math.pow(0.95, B.brokers)).toFixed(1) + "%).");
    return hired;
};

FCP.stockTick = function () {
    if (FCP.busy() || !FrozenCookies.autoStocks) return;
    var B = Game.Objects["Bank"].minigame;
    if (!B || !B.goodsById) return;

    FCP.hireBrokers(B);
    var overhead = 1 + 0.01 * (20 * Math.pow(0.95, B.brokers));
    var budget = FCP.spare() * 0.5;
    var held = 0,
        trades = 0;

    for (var i = 0; i < B.goodsById.length; i++) {
        var it = B.goodsById[i];
        if (!it.active) continue;
        var rest = B.getRestingVal(it.id);
        var val = it.val;

        // Sell
        if (it.stock > 0 && it.last != 1) {
            // it.prev is the price before fees at the last purchase; without our record of the
            // fees, assume the highest (no brokers).
            var paid = FCP.stockPaid(it.id) || it.prev * 1.2;
            var profitable = val > paid * FCP.stockMargin;
            var high = val >= rest * FCP.stockSellRatio;
            var veryHigh = val >= rest * 2;
            if ((high && profitable && it.mode != 3) || (veryHigh && profitable)) {
                if (B.sellGood(it.id, it.stock)) {
                    trades++;
                    continue;
                }
            }
        }

        // Buy
        if (it.last != 2 && val <= rest * FCP.stockBuyRatio && it.mode != 4) {
            var room = B.getGoodMaxStock(it) - it.stock;
            var unit = Game.cookiesPsRawHighest * val * overhead;
            var n = unit > 0 ? Math.min(room, Math.floor(budget / unit)) : 0;
            if (n > 0 && B.buyGood(it.id, n)) {
                // Average cost per unit, fees included, over what is held now.
                var before = it.stock - n, old = FCP.stockPaid(it.id) || val * overhead;
                FCP.stockPaid(it.id, (old * before + val * overhead * n) / it.stock);
                budget -= n * unit;
                trades++;
            }
        }
        if (it.stock > 0) held++;
    }
    FCP.status["Stock market"] =
        held + " good" + (held == 1 ? "" : "s") + " held · total profit $" + Beautify(B.profit);
};

FCP.addTask("stocks", function () { return !!FrozenCookies.autoStocks; }, FCP.stockTick, 5000);
