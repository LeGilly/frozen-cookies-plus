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
// FC asks for as many units as the store's bulk button shows (x1, x10, x100), and drops the button
// to x10 or x1 itself near its building limits. With smart bulk on, FC+ decides the count whatever
// the button shows (up to 100) and keeps to those limits itself (FCP.fcLimit), so the store can
// stay on x1 and show prices per unit.

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
// Cheap purchases: while burst buying is on, building units and upgrades whose cost stays under
// this share of the spare cookies are bought without comparing their value with other purchases.
// Their order hardly matters when everything is that affordable (early in a run, after a big
// windfall), and comparing only meant one or two units per round. Our own value, not a community one.
FCP.BURST_CHEAP = 0.01;
FCP.cheapLimit = function () {
    return FrozenCookies.burstBuy ? Math.max(0, FCP.spare()) * FCP.BURST_CHEAP : 0;
};
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
    var cheap = FCP.cheapLimit();
    var price = bldg.getPrice();
    var n = 1,
        spent = price;
    while (n < count) {
        var next = price * Math.pow(1.15, n);
        if (spent + next > spare) break;
        if (spent + next > cheap && mine && isFinite(alternative) && mine.efficiency * Math.pow(1.15, n) > alternative * tolerance) break;
        spent += next;
        n++;
    }
    return n;
};

// How many more of `bldg` FC's own limits allow (the ones its buildingStats uses to leave a building
// out): Mines and Factories up to their max (700 while the achievement caps are lifted), Wizard
// towers while max magic is below the max-magic setting, "You" up to the orb limit and to 399 while
// autocasting Spontaneous Edifice. Infinity when none applies.
FCP.fcLimit = function (bldg) {
    var left = Infinity, o = Game.Objects;
    if (bldg === o.Mine && FrozenCookies.mineLimit) left = FrozenCookies.mineMax - bldg.amount;
    if (bldg === o.Factory && FrozenCookies.factoryLimit) left = FrozenCookies.factoryMax - bldg.amount;
    var M = o["Wizard tower"].minigame;
    if (bldg === o["Wizard tower"] && M && FrozenCookies.towerLimit) {
        // The Grimoire's max magic formula (minigameGrimoire.js computeMagicM).
        var lvl = Math.max(bldg.level, 1), n = 0;
        var magicM = function (t) {
            t = Math.max(t, 1);
            return Math.floor(4 + Math.pow(t, 0.6) + Math.log((t + (lvl - 1) * 10) / 15 + 1) * 15);
        };
        while (n < 100 && magicM(bldg.amount + n) < FrozenCookies.manaMax) n++;
        left = n;
    }
    if (bldg === o.You) {
        if (M && FrozenCookies.autoCasting == 5) left = Math.min(left, 399 - bldg.amount);
        if (FrozenCookies.autoDragonOrbs && FrozenCookies.orbLimit) left = Math.min(left, FrozenCookies.orbMax - bldg.amount);
    }
    return left;
};

// The count FC+ buys of `bldg`: smart bulk within FC's limits (at least the one FC chose).
FCP.buyCount = function (bldg, ask) {
    return Math.max(1, Math.min(FCP.smartBulkCount(bldg, ask), FCP.fcLimit(bldg)));
};

FCP.inAutoCookie = false;

// More purchases from the ranking FC just used, before it recalculates. Cheap ones (FCP.cheapLimit)
// don't count towards FCP.BURST_EXTRA.
FCP.burstExtra = function () {
    if (!FCP.burstActive()) return 0;
    var list = FCP.attempt("recommendation list", recommendationList, null);
    if (!list) return 0;
    var bought = 0, done = 0;
    for (var i = 0; i < list.length && bought < FCP.BURST_EXTRA; i++) {
        var r = list[i];
        if (!r || !r.purchase || !isFinite(r.efficiency)) continue;
        var spare = FCP.spare(), cheap = FCP.cheapLimit(), price;
        if (r.type === "building") {
            var b = r.purchase;
            price = b.getPrice();
            if (price > spare || FCP.fcLimit(b) < 1) continue;
            var before = b.amount;
            _fcpOriginalSafeBuy.call(window, b, FCP.buyCount(b, 100));
            if (b.amount > before) {
                done++;
                if (price > cheap) bought++;
            }
        } else if (r.type === "upgrade") {
            var u = r.purchase;
            if (u.bought || !u.unlocked || u.pool === "toggle" || FCP.burstSkip.indexOf(u.name) !== -1) continue;
            price = u.getPrice();
            if (price > spare) continue;
            if (u.buy(1)) {
                done++;
                if (price > cheap) bought++;
            }
        }
    }
    if (done) {
        FrozenCookies.recalculateCaches = true;
        FCP.burstCount = (FCP.burstCount || 0) + done;
    }
    return done;
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
    if (!(FCP.inAutoCookie && FrozenCookies.smartBulk && count > 0)) return _fcpOriginalSafeBuy.call(this, bldg, count);
    // FC's purchase of its top recommendation: up to 100, whatever the store's button shows.
    var n = FCP.buyCount(bldg, 100);
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
