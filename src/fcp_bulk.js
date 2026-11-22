// Frozen Cookies Plus — smart bulk buying.
// With the store on x10/x100, FC checks that ONE building is worth it and
// affordable above its golden cookie bank, then the game buys "up to 100, as
// many as you can afford": that can empty the bank and buy units that are
// worse value than other purchases. With this option on, FC's building
// purchases buy as many as:
//  - fit in the cookies above the bank (the first unit is always FC's choice),
//  - are each still better value than the best other purchase. FC's score is
//    price / production gained (lower is better); every extra unit costs 15%
//    more for the same gain, so unit k scores 1.15^k times the first one.
// Godzamok's sell-and-rebuy is left alone (it doesn't go through autoCookie).
// The option itself (smartBulk) is declared in fcp_core.js.

// How many of `bldg` to buy, at most `count`.
FCP.smartBulkCount = function (bldg, count) {
    if (count <= 1) return count;
    var bank = 0;
    try {
        bank = delayAmount() || 0;
    } catch (e) {}
    var spare = Game.cookies - bank;

    var list = [];
    try {
        list = recommendationList() || [];
    } catch (e) {}
    var mine = null,
        alternative = Infinity;
    for (var i = 0; i < list.length; i++) {
        var r = list[i];
        if (!r || !isFinite(r.efficiency)) continue;
        if (r.type === "building" && r.purchase === bldg) {
            if (!mine) mine = r;
        } else if (r.efficiency < alternative) {
            alternative = r.efficiency;
        }
    }

    var price = bldg.getPrice();
    var n = 1,
        spent = price;
    while (n < count) {
        var next = price * Math.pow(1.15, n);
        if (spent + next > spare) break;
        if (mine && isFinite(alternative) && mine.efficiency * Math.pow(1.15, n) > alternative) break;
        spent += next;
        n++;
    }
    return n;
};

FCP.inAutoCookie = false;

var _fcpOriginalAutoCookie = autoCookie;
autoCookie = function () {
    FCP.inAutoCookie = true;
    try {
        return _fcpOriginalAutoCookie.apply(this, arguments);
    } finally {
        FCP.inAutoCookie = false;
    }
};

var _fcpOriginalSafeBuy = safeBuy;
safeBuy = function (bldg, count) {
    if (!(FCP.inAutoCookie && FrozenCookies.smartBulk && count > 1)) return _fcpOriginalSafeBuy.call(this, bldg, count);
    var n = FCP.smartBulkCount(bldg, count);
    var bank = 0;
    try { bank = delayAmount() || 0; } catch (e) {}
    var r = _fcpOriginalSafeBuy.call(this, bldg, n);
    // Kept for the tests and for checking in the console.
    FCP.lastSmartBulk = { name: bldg.name, asked: count, bought: n, bank: bank, cookiesAfter: Game.cookies };
    return r;
};
