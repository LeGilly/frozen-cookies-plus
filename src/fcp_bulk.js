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

FCP.burstActive = function () {
    if (!FrozenCookies.burstBuy || !FrozenCookies.autoBuy) return false;
    var next = FCP.attempt("next purchase", nextPurchase, null);
    return !!(next && next.cost > 0 && FCP.spare() >= FCP.BURST_FACTOR * next.cost);
};

// How many of `bldg` to buy, at most `count`.
FCP.smartBulkCount = function (bldg, count) {
    if (count <= 1) return count;
    var spare = Game.cookies - FCP.bankTarget();

    var list = FCP.attempt("recommendation list", recommendationList, null) || [];
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
    var list = FCP.attempt("recommendation list", recommendationList, null);
    if (!list) return 0;
    var bought = 0;
    for (var i = 0; i < list.length && bought < FCP.BURST_EXTRA; i++) {
        var r = list[i];
        if (!r || !r.purchase || !isFinite(r.efficiency)) continue;
        var spare = FCP.spare();
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
        FCP.attempt("burst buying", FCP.burstExtra);
        return r;
    } finally {
        FCP.inAutoCookie = false;
    }
};

var _fcpOriginalSafeBuy = safeBuy;
safeBuy = function (bldg, count) {
    if (!(FCP.inAutoCookie && FrozenCookies.smartBulk && count > 1)) return _fcpOriginalSafeBuy.call(this, bldg, count);
    var n = FCP.smartBulkCount(bldg, count);
    var bank = FCP.bankTarget();
    var r = _fcpOriginalSafeBuy.call(this, bldg, n);
    // Kept for the tests and for checking in the console.
    FCP.lastSmartBulk = { name: bldg.name, asked: count, bought: n, bank: bank, cookiesAfter: Game.cookies };
    return r;
};

// Building caps for achievements. FC's recommended settings stop buying Mines and Factories at 500
// (for its Godzamok combo, which sells them all and buys them back) and Wizard towers once max
// magic reaches 37. Every building has count achievements every 50 up to 700, and having 550 to
// 700 of every building wins the "...centennial" achievements and unlocks a butter biscuit (a CpS
// upgrade) each run, so the caps blocked both for good. Late in the game they cost nothing to
// lift: FC+ raises the Mine and Factory caps to 700 (Godzamok then sells and buys back 700) and
// lifts the Wizard tower one until 700, as soon as buying up to 700 fits in the cookies it can
// spare. Your own settings are left as they are: the caps are only swapped while FC decides.
FCP.CAP_GOAL = 700;
FCP.capLift = function () {
    var lift = { Mine: false, Factory: false, "Wizard tower": false };
    if (!FrozenCookies.smartCaps) return lift;
    var reach = function (o) {
        return o.amount >= FCP.CAP_GOAL || FCP.canSpend(o.getSumPrice(FCP.CAP_GOAL - o.amount));
    };
    if (FrozenCookies.mineLimit && FrozenCookies.mineMax < FCP.CAP_GOAL) lift.Mine = reach(Game.Objects.Mine);
    if (FrozenCookies.factoryLimit && FrozenCookies.factoryMax < FCP.CAP_GOAL) lift.Factory = reach(Game.Objects.Factory);
    var towers = Game.Objects["Wizard tower"];
    if (FrozenCookies.towerLimit && towers.amount < FCP.CAP_GOAL) lift["Wizard tower"] = reach(towers);
    return lift;
};

// Run an FC function with the lifted caps in place, then put your settings back.
FCP.withLiftedCaps = function (fn, self, args) {
    var lift = FCP.capLift(), saved = {
        mineMax: FrozenCookies.mineMax, factoryMax: FrozenCookies.factoryMax, towerLimit: FrozenCookies.towerLimit,
    };
    if (lift.Mine) FrozenCookies.mineMax = FCP.CAP_GOAL;
    if (lift.Factory) FrozenCookies.factoryMax = FCP.CAP_GOAL;
    if (lift["Wizard tower"]) FrozenCookies.towerLimit = 0;
    try {
        return fn.apply(self, args);
    } finally {
        FrozenCookies.mineMax = saved.mineMax;
        FrozenCookies.factoryMax = saved.factoryMax;
        FrozenCookies.towerLimit = saved.towerLimit;
    }
};
["buildingStats", "autoGodzamokAction", "autoCookie"].forEach(function (name) {
    FCP.wrapOnce(window, name, "caps", function (original) {
        return function () {
            return FCP.withLiftedCaps(original, this, arguments);
        };
    });
});

// FC's restoreBuildingLimits (after buying a reward cookie) compares the Wizard tower count with
// the max-magic setting (37) and would sell all but 37 towers: never let it sell towers.
FCP.wrapOnce(window, "restoreBuildingLimits", "towers", function (original) {
    return function () {
        var saved = FrozenCookies.towerLimit;
        FrozenCookies.towerLimit = 0;
        try {
            return original.apply(this, arguments);
        } finally {
            FrozenCookies.towerLimit = saved;
        }
    };
});

FCP.capsTick = function () {
    var lift = FCP.capLift(), names = Object.keys(lift).filter(function (n) { return lift[n]; });
    FCP.status["Building caps"] = names.length
        ? names.map(function (n) { return Game.Objects[n].plural + " " + Game.Objects[n].amount; }).join(", ") +
          " → " + FCP.CAP_GOAL + " (count achievements, butter biscuits)"
        : "";
};
FCP.addTask("caps", function () { return !!FrozenCookies.smartCaps; }, FCP.capsTick, 5000);
