// Frozen Cookies Plus — why the golden cookie bank is below full.
//
// Every cookie spent goes through Game.Spend. It is wrapped to note what was bought
// (building, upgrade, Santa, dragon) and who bought it: FC's normal purchase, one of
// FC's actions that don't check the bank, FC+, or you. Every half second the bank is
// compared with its target; when it drops below full, the infobox says why:
//  - a purchase raised the income, so the target grew (the bank itself was kept),
//  - FC kept a smaller bank to buy something sooner,
//  - something was bought without checking the bank,
//  - cookies were lost (wrath cookie, spell backfire),
//  - the target grew on its own (achievements and milk, a level-up...).

FCP.spendSource = ""; // who is spending right now ("" = you, or the game itself)
FCP.spendItem = ""; // what is being bought right now
FCP.spends = []; // {amount, item, source} since the last check

FCP.withSpend = function (key, value, fn, self, args) {
    var keep = FCP[key];
    if (!keep) FCP[key] = value; // the outermost caller names it
    try {
        return fn.apply(self, args);
    } finally {
        FCP[key] = keep;
    }
};

// Name the caller: wrap a global function so spending inside it is filed under `label`.
FCP.spendAs = function (name, label) {
    var fn = window[name];
    if (typeof fn !== "function" || fn.__fcpSource) return;
    var wrapped = function () {
        return FCP.withSpend("spendSource", label, fn, this, arguments);
    };
    wrapped.__fcpSource = true;
    window[name] = wrapped;
};

FCP.bankSources = {
    autoCookie: "fc",
    autoGSBuy: "the Golden switch",
    buyOtherUpgrades: "FC's extra upgrades",
    autoEasterAction: "a season switch",
    autoHalloweenAction: "a season switch",
    autoDragonAction: "the dragon",
    autoBankAction: "a bank office upgrade",
    autoGodzamokAction: "the Godzamok combo",
    getRewardCookieBuildingTargets: "a reward cookie",
};
// The reward cookie buildings are bought inside autoCookie; that name sticks until
// autoCookie ends.
FCP.patchBankSources = function () {
    Object.keys(FCP.bankSources).forEach(function (n) {
        if (n === "getRewardCookieBuildingTargets") return;
        FCP.spendAs(n, FCP.bankSources[n]);
    });
    if (typeof getRewardCookieBuildingTargets === "function" && !getRewardCookieBuildingTargets.__fcpSource) {
        var orig = getRewardCookieBuildingTargets;
        getRewardCookieBuildingTargets = function () {
            FCP.spendSource = FCP.bankSources.getRewardCookieBuildingTargets; // cleared when autoCookie returns
            return orig.apply(this, arguments);
        };
        getRewardCookieBuildingTargets.__fcpSource = true;
    }
};

FCP.patchSpendWatch = function () {
    if (!Game.Spend.__fcp) {
        var spend = Game.Spend;
        Game.Spend = function (howmuch) {
            if (howmuch > 0)
                FCP.spends.push({ amount: howmuch, item: FCP.spendItem || "something", source: FCP.spendSource });
            return spend.apply(this, arguments);
        };
        Game.Spend.__fcp = true;
    }
    var name = function (n) {
        return typeof decodeHtml === "function" ? decodeHtml(n) : n;
    };
    if (!Game.Upgrade.prototype.buy.__fcp) {
        var ubuy = Game.Upgrade.prototype.buy;
        Game.Upgrade.prototype.buy = function () {
            return FCP.withSpend("spendItem", name(this.dname || this.name), ubuy, this, arguments);
        };
        Game.Upgrade.prototype.buy.__fcp = true;
    }
    if (!Game.storeBuyAll.__fcp) {
        var all = Game.storeBuyAll;
        Game.storeBuyAll = function () {
            return FCP.withSpend("spendSource", "Buy all upgrades", all, this, arguments);
        };
        Game.storeBuyAll.__fcp = true;
    }
    Game.ObjectsById.forEach(function (o) {
        if (o.buy.__fcp) return;
        var obuy = o.buy;
        o.buy = function () {
            return FCP.withSpend("spendItem", name(o.dname || o.name), obuy, this, arguments);
        };
        o.buy.__fcp = true;
    });
    [["UpgradeSanta", "a Santa level"], ["UpgradeDragon", "a dragon level"]].forEach(function (p) {
        var fn = Game[p[0]];
        if (!fn || fn.__fcp) return;
        Game[p[0]] = function () {
            return FCP.withSpend("spendItem", p[1], fn, this, arguments);
        };
        Game[p[0]].__fcp = true;
    });
};

// Wrapped once here, before FC starts its timers, so the timers call the wrappers.
FCP.patchBankSources();
if (typeof autoCookie === "function" && !autoCookie.__fcpBank) {
    var _fcpBankAutoCookie = autoCookie;
    autoCookie = function () {
        FCP.spendSource = "fc";
        try {
            return _fcpBankAutoCookie.apply(this, arguments);
        } finally {
            FCP.spendSource = "";
        }
    };
    autoCookie.__fcpBank = true;
}

FCP.bankWatch = { full: false, target: 0, cookies: 0, why: "" };

FCP.describeSpend = function (spends, keptOldTarget) {
    // The biggest spender of this half second, with everything bought with it.
    var bySource = {};
    spends.forEach(function (s) {
        var k = s.source;
        var e = bySource[k] || (bySource[k] = { amount: 0, items: {} });
        e.amount += s.amount;
        e.items[s.item] = (e.items[s.item] || 0) + s.amount;
    });
    var source = Object.keys(bySource).sort(function (a, b) { return bySource[b].amount - bySource[a].amount; })[0];
    var e = bySource[source];
    var items = Object.keys(e.items).sort(function (a, b) { return e.items[b] - e.items[a]; });
    var what = items[0] + (items.length > 1 ? " and " + (items.length - 1) + " more" : "");
    if (keptOldTarget) return "buying " + what + " raised your income, so the bank to aim for grew";
    if (source === "fc") return "FC kept a smaller bank to buy " + what + " sooner (worth more than a full bank)";
    if (source.indexOf("FC+") === 0) return source + " bought " + what;
    if (source) return Beautify(e.amount) + " spent on " + what + " by " + source + ", which doesn't wait for the bank";
    return "you spent " + Beautify(e.amount) + " on " + what;
};

FCP.bankTick = function () {
    // The income (and so the target) only updates on the game's next recalculation, after
    // the purchase: look at the last 2 seconds of spending, not only the last half second.
    var w = FCP.bankWatch,
        now = Date.now();
    var current = FCP.spends;
    FCP.spends = [];
    current.forEach(function (s) { s.t = now; });
    w.recent = (w.recent || []).filter(function (s) { return now - s.t < 2000; }).concat(current);
    var spends = current.length ? current : w.recent;
    if (FCP.busy() || Game.ascensionMode == 1) {
        w.full = false;
        w.why = "";
        return;
    }
    var target = FCP.bankTarget();
    var cookies = Game.cookies;
    if (!(target > 0) || cookies >= target * 0.9999) {
        w.full = target > 0;
        w.why = "";
        w.fullTarget = target;
    } else if (w.target > 0) {
        var spent = spends.reduce(function (t, s) { return t + s.amount; }, 0);
        var why = "";
        if (spent > 0) {
            // Still at least the old target: the purchase kept the bank, the target moved.
            var kept = w.full && cookies >= w.fullTarget * 0.999;
            var serious = spends.some(function (s) { return s.source !== "fc" && s.source.indexOf("FC+") !== 0; });
            if (w.full || serious || !w.why) why = FCP.describeSpend(spends, kept);
        } else if (w.cookies - cookies > target * 0.01) {
            why = "lost " + Beautify(w.cookies - cookies) + " cookies (a wrath cookie or a spell backfire)";
        } else if (w.full) {
            why = "the bank to aim for grew with your income";
        }
        if (why) w.why = why;
        w.full = false;
        w.recent = [];
    }
    w.target = target;
    w.cookies = cookies;
};

FCP.addTask("bankwatch", function () { return true; }, function () {
    FCP.patchSpendWatch();
    FCP.bankTick();
}, 500);
