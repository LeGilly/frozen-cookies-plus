// Frozen Cookies Plus — stock market trading.
// Every good drifts around a resting value (10 + 10*id + bank level - 1).
// Buy when the price is well under it and not crashing, sell when it is
// well over it, above what we paid (fees included) and not still climbing fast.
// The game resets the market at every ascension: stock held, brokers and office level are lost,
// not sold. Selling never counts as cookies baked (no prestige), so stock only helps by paying
// for buildings during the run. When an ascension is less than FCP.STOCK_MIN_HOURS away (prices
// take hours to come back up), nothing more is bought and anything in profit is sold.
//
// Brokers: each costs 20 minutes of the highest raw production ($1,200 in market dollars) and
// cuts the fee by 5% of itself, about 1% of what is bought. One only pays for itself once that
// much stock has been bought ($120,000 for the first), so the next broker is hired once FC+'s
// stock purchases so far would have paid for it.
// Modes: 0 stable, 1 slow rise, 2 slow fall, 3 fast rise, 4 fast fall, 5 chaotic.

FCP.stockBuyRatio = 0.7;
FCP.stockSellRatio = 1.25;
FCP.stockMargin = 1.05; // a sale must beat what was paid, fees included, by 5%

// What each good cost per unit, fees included, when FC+ last bought it (the game only keeps
// the price before fees). Kept per run in localStorage: the market is reset at ascension.
FCP.stockPaid = function (id, value) {
    var data = FCP.runStore("fcpStockPaid");
    if (value === undefined) return data[id];
    data[id] = value;
    FCP.store("fcpStockPaid", data);
};

FCP.STOCK_MIN_HOURS = 2;

// Market dollars of stock FC+ has bought this run (brokers are lost at ascension too).
FCP.stockVolume = function (add) {
    var d = FCP.runStore("fcpStockVolume", { v: 0 });
    if (add) {
        d.v += add;
        FCP.store("fcpStockVolume", d);
    }
    return d.v;
};

// Is an ascension coming before bought stock could recover?
FCP.ascensionSoon = function () {
    if (!FrozenCookies.smartAscend || !FCP.ascendTarget || Game.ascensionMode == 1) return false;
    var horizon = FCP.STOCK_MIN_HOURS * 3600;
    if (FCP.runLevels() >= FCP.ascendTarget()) {
        // Ready: only one-time goals still advancing can hold it, for as long as they take.
        return FCP.holdLeft(FCP.ascendHolds()) < horizon;
    }
    var rate = FCP.cookieRate();
    return rate > 0 && FCP.ascendCookiesLeft() / rate < horizon;
};

// Would the next broker have paid for itself over the purchases made so far?
FCP.brokerWorth = function (B) {
    var saves = 0.01 * 20 * Math.pow(0.95, B.brokers) * 0.05; // share of each purchase it saves
    return FCP.stockVolume() * saves >= 1200;
};

FCP.hireBrokers = function (B) {
    var hired = 0;
    while (B.brokers < B.getMaxBrokers() && FCP.brokerWorth(B) && FCP.canSpend(B.getBrokerPrice()) && Game.cookies >= B.getBrokerPrice() && hired < 50) {
        FCP.withSpend("spendItem", "a stock broker", Game.Spend, Game, [B.getBrokerPrice()]);
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

    var soon = FCP.ascensionSoon();
    if (!soon) FCP.hireBrokers(B);
    var overhead = 1 + 0.01 * (20 * Math.pow(0.95, B.brokers));
    var budget = soon ? 0 : FCP.spare() * 0.5;
    var held = 0;

    for (var i = 0; i < B.goodsById.length; i++) {
        var it = B.goodsById[i];
        if (!it.active) continue;
        var rest = B.getRestingVal(it.id);
        var val = it.val;

        // Sell
        if (it.stock > 0 && it.last != 1) {
            // it.prev is the price before fees at the last purchase; without our record of the
            // fees, assume the highest (no brokers). Near an ascension, any profit is taken.
            var paid = FCP.stockPaid(it.id) || it.prev * 1.2;
            var profitable = val > paid * FCP.stockMargin;
            var high = val >= rest * FCP.stockSellRatio;
            var veryHigh = val >= rest * 2;
            if (profitable && ((high && it.mode != 3) || veryHigh || soon)) {
                if (B.sellGood(it.id, it.stock)) {
                    continue;
                }
            }
        }

        // Buy
        if (it.last != 2 && val <= rest * FCP.stockBuyRatio && it.mode != 4) {
            var room = B.getGoodMaxStock(it) - it.stock;
            var unit = Game.cookiesPsRawHighest * val * overhead;
            var n = unit > 0 ? Math.min(room, Math.floor(budget / unit)) : 0;
            if (n > 0 && FCP.withSpend("spendItem", it.name + " stock", B.buyGood, B, [it.id, n])) {
                FCP.stockVolume(val * n);
                // Average cost per unit, fees included, over what is held now.
                var before = it.stock - n, old = FCP.stockPaid(it.id) || val * overhead;
                FCP.stockPaid(it.id, (old * before + val * overhead * n) / it.stock);
                budget -= n * unit;
            }
        }
        if (it.stock > 0) held++;
    }
    // Short: the details are in the README and the option's hint.
    FCP.status["Stock market"] =
        held + " held · profit $" + Beautify(Math.round(B.profit)) +
        " · fee " + (20 * Math.pow(0.95, B.brokers)).toFixed(1) + "%" +
        (soon ? " · ascending in <" + FCP.STOCK_MIN_HOURS + "h: selling, not buying" : "") +
        (B.brokers < B.getMaxBrokers() && !soon ? (FCP.brokerWorth(B) ? " · hiring a broker" : " · next broker at $" + Beautify(Math.ceil(1200 / (0.01 * 20 * Math.pow(0.95, B.brokers) * 0.05))) + " bought ($" + Beautify(Math.round(FCP.stockVolume())) + ")") : "");
};

FCP.addTask("stocks", function () { return !!FrozenCookies.autoStocks; }, FCP.stockTick, 5000);
