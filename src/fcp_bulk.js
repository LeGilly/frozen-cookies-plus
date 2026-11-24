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

// Burst buying (option burstBuy): a burst is when the cookies above the bank cover the next
// purchase many times over. FC buys one thing per round and recalculates every option after each,
// so a big windfall took hundreds of slow rounds. During a burst:
//  - buildings: more units per purchase, while each stays within FCP.BURST_TOLERANCE of the best
//    other purchase's score (about 5 more units than an exact comparison would allow);
//  - after FC's own purchase, up to FCP.BURST_EXTRA more purchases from the same ranking, before
//    the one recalculation. The ranking is a few purchases old by then: slightly less exact.
FCP.BURST_FACTOR = 10;
FCP.BURST_TOLERANCE = 2;
FCP.BURST_EXTRA = 10;
FCP.burstSkip = ["Chocolate egg", "One mind", "Communal brainsweep", "Elder Pact", "Elder Pledge", "Elder Covenant",
    "Revoke Elder Covenant", "Sugar frenzy", "Golden switch [off]", "Golden switch [on]"];

FCP.spareCookies = function () {
    var bank = 0;
    try { bank = delayAmount() || 0; } catch (e) {}
    return Game.cookies - bank;
};

FCP.burstActive = function () {
    if (!FrozenCookies.burstBuy || !FrozenCookies.autoBuy) return false;
    var next = null;
    try { next = nextPurchase(); } catch (e) {}
    return !!(next && next.cost > 0 && FCP.spareCookies() >= FCP.BURST_FACTOR * next.cost);
};

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

    var tolerance = FCP.burstActive() ? FCP.BURST_TOLERANCE : 1;
    var price = bldg.getPrice();
    var n = 1,
        spent = price;
    while (n < count) {
        var next = price * Math.pow(1.15, n);
        if (spent + next > spare) break;
        if (mine && isFinite(alternative) && mine.efficiency * Math.pow(1.15, n) > alternative * tolerance) break;
        spent += next;
        n++;
    }
    return n;
};

FCP.inAutoCookie = false;

// More purchases from the ranking FC just used, before it recalculates.
FCP.burstExtra = function () {
    if (!FCP.burstActive()) return 0;
    var list = [];
    try { list = recommendationList() || []; } catch (e) { return 0; }
    var bought = 0;
    for (var i = 0; i < list.length && bought < FCP.BURST_EXTRA; i++) {
        var r = list[i];
        if (!r || !r.purchase || !isFinite(r.efficiency)) continue;
        var spare = FCP.spareCookies();
        if (r.type === "building") {
            var b = r.purchase;
            if (b.getPrice() > spare) continue;
            var n = FCP.smartBulkCount(b, 100);
            var before = b.amount;
            _fcpOriginalSafeBuy.call(window, b, n);
            if (b.amount > before) bought++;
        } else if (r.type === "upgrade") {
            var u = r.purchase;
            if (u.bought || !u.unlocked || u.pool === "toggle" || FCP.burstSkip.indexOf(u.name) !== -1) continue;
            if (u.getPrice() > spare) continue;
            if (u.buy(1)) bought++;
        }
    }
    if (bought) {
        FrozenCookies.recalculateCaches = true;
        FCP.burstCount = (FCP.burstCount || 0) + bought;
    }
    return bought;
};

var _fcpOriginalAutoCookie = autoCookie;
autoCookie = function () {
    FCP.inAutoCookie = true;
    try {
        var r = _fcpOriginalAutoCookie.apply(this, arguments);
        try { FCP.burstExtra(); } catch (e) { console.error("[FC+] burst buying failed:", e); }
        return r;
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
