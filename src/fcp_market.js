// Frozen Cookies Plus — stock market trading.
// Every good drifts around a resting value (10 + 10*id + bank level - 1).
// Buy when the price is well under it and not crashing, sell when it is
// well over it, above what we paid and not still climbing fast.
// Modes: 0 stable, 1 slow rise, 2 slow fall, 3 fast rise, 4 fast fall, 5 chaotic.

FCP.stockBuyRatio = 0.7;
FCP.stockSellRatio = 1.25;

FCP.stockTick = function () {
    if (FCP.busy() || !FrozenCookies.autoStocks) return;
    var B = Game.Objects["Bank"].minigame;
    if (!B || !B.goodsById) return;

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
            var profitable = val > it.prev * 1.05;
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
