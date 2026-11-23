// Frozen Cookies Plus — bank rules: FC's purchases that don't wait for the golden cookie bank.
//
// Option bankRules (on in Recommended). Off, FC behaves as before.
//  - Waits for the bank: FC's extra upgrades (eggs, sleighs, Fern tea...), the Halloween switch,
//    and the buildings for reward cookies (FC already buys those through its normal chain,
//    one at a time and keeping the bank; its shortcut bought all of them at any price).
//  - Only when worth it, from the measured click speed:
//      Golden switch: on for a click buff only if the extra clicking beats the price of
//      switching on and off (1 hour of production each).
//      Godzamok combo: only if the Devastation clicking bonus beats what selling and
//      rebuying the mines and factories loses.
//  - Easter switch during a Cookie Storm: only while cheap (the price grows ×1.5 with every
//    season switch since the last ascension).

FCP.bankRulesOn = function () {
    return !!FrozenCookies.bankRules;
};

// Clicks per second really happening right now.
FCP.realClickRate = function () {
    if (!FrozenCookies.autoClick || !FrozenCookies.cookieClickSpeed) return 0;
    if (FCP.noClickActive && FCP.noClickActive()) return 0;
    var speed = Math.min(FrozenCookies.cookieClickSpeed, FCP.MAX_CLICKS || 50);
    if (FrozenCookies.measuredClicks && FCP.clicks && FCP.clicks.measured !== null) speed = FCP.clicks.measured;
    return speed;
};

// Seconds left on the longest click buff (Click frenzy, Dragonflight...).
FCP.clickBuffSeconds = function () {
    var t = 0;
    Object.keys(Game.buffs).forEach(function (k) {
        var b = Game.buffs[k];
        if (b.multClick > 1 && b.name !== "Devastation") t = Math.max(t, b.time / Game.fps);
    });
    return t;
};

// --- Golden switch ---------------------------------------------------------
FCP.goldenSwitchBoost = function () {
    var m = 1.5;
    if (Game.Has("Residual luck"))
        Game.goldenCookieUpgrades.forEach(function (n) {
            if (Game.Has(n)) m += 0.1;
        });
    return m;
};

// Gain and cost of switching on now and off when the click buff ends.
FCP.goldenSwitchWorth = function () {
    var boost = FCP.goldenSwitchBoost(),
        secs = FCP.clickBuffSeconds(),
        cps = Game.cookiesPs,
        click = Game.mouseCps(),
        boosted;
    Game.cookiesPs = cps * boost;
    try {
        boosted = Game.mouseCps();
    } finally {
        Game.cookiesPs = cps;
    }
    var price = Game.Upgrades["Golden switch [off]"].getPrice();
    return {
        gain: secs * (FCP.realClickRate() * (boosted - click) + cps * (boost - 1)),
        cost: price * (1 + boost), // on now, off later at the boosted production
    };
};

// --- Godzamok ---------------------------------------------------------------
FCP.godzamokWorth = function () {
    var lvl = Game.hasGod ? Game.hasGod("ruin") : 0,
        per = lvl == 1 ? 0.01 : lvl == 2 ? 0.005 : lvl == 3 ? 0.0025 : 0,
        sold = 0,
        loss = 0;
    ["Mine", "Factory"].forEach(function (n) {
        var o = Game.Objects[n];
        if (!o.amount) return;
        sold += o.amount;
        var back = o.getReverseSumPrice(o.amount),
            m = o.getSellMultiplier();
        loss += back / m - back; // buy back at full price what was sold for a fraction
    });
    return {
        gain: FCP.realClickRate() * Math.min(10, FCP.clickBuffSeconds()) * Game.mouseCps() * sold * per,
        cost: loss,
    };
};

// --- Wrappers -----------------------------------------------------------------
FCP.bankRuleWrap = function (name, guard) {
    var fn = window[name];
    if (typeof fn !== "function" || fn.__fcpRule) return;
    var wrapped = function () {
        if (FCP.bankRulesOn() && !guard()) return;
        return fn.apply(this, arguments);
    };
    wrapped.__fcpRule = true;
    window[name] = wrapped;
};

FCP.lastRuleLog = {};
FCP.ruleLog = function (key, text) {
    if (Date.now() - (FCP.lastRuleLog[key] || 0) < 60000) return;
    FCP.lastRuleLog[key] = Date.now();
    FCP.log(text);
};

// Golden switch: switching off is always allowed (golden cookies come back).
FCP.bankRuleWrap("autoGSBuy", function () {
    var on = Game.Upgrades["Golden switch [off]"];
    if (!(hasClickBuff() && !Game.hasBuff("Cursed finger") && on && on.unlocked && !on.bought)) return true;
    var w = FCP.goldenSwitchWorth();
    if (w.gain > w.cost) return true;
    FCP.ruleLog("gs", "Golden switch left off: " + Beautify(w.gain) + " more from clicking would not pay its " + Beautify(w.cost) + " price.");
    return false;
});

FCP.bankRuleWrap("autoGodzamokAction", function () {
    if (!(Game.hasGod && Game.hasGod("ruin") && hasClickBuff() && !Game.hasBuff("Devastation") && !Game.hasBuff("Cursed finger")))
        return true;
    var w = FCP.godzamokWorth();
    if (w.gain > w.cost) return true;
    FCP.ruleLog("godz", "Godzamok combo skipped: " + Beautify(w.gain) + " from clicking would not cover the " + Beautify(w.cost) + " lost reselling mines and factories.");
    return false;
});

FCP.bankRuleWrap("autoHalloweenAction", function () {
    var u = Game.UpgradesById[183]; // Ghostly biscuit
    return !u || FCP.canSpend(u.getPrice());
});

FCP.bankRuleWrap("autoEasterAction", function () {
    var u = Game.UpgradesById[209]; // Bunny biscuit
    if (!u) return true;
    var bank = 0;
    try { bank = delayAmount() || 0; } catch (e) {}
    return FCP.canSpend(u.getPrice()) || u.getPrice() <= bank * 0.1;
});

// Extra upgrades: each purchase made inside buyOtherUpgrades waits for the bank.
(function () {
    var fn = window.buyOtherUpgrades;
    if (typeof fn !== "function" || fn.__fcpRule) return;
    window.buyOtherUpgrades = function () {
        var keep = FCP.waitForBank;
        FCP.waitForBank = FCP.bankRulesOn();
        try {
            return fn.apply(this, arguments);
        } finally {
            FCP.waitForBank = keep;
        }
    };
    window.buyOtherUpgrades.__fcpRule = true;
    var ubuy = Game.Upgrade.prototype.buy;
    if (!ubuy.__fcpRule) {
        Game.Upgrade.prototype.buy = function () {
            if (FCP.waitForBank && !this.bought && !FCP.canSpend(this.getPrice())) return 0;
            return ubuy.apply(this, arguments);
        };
        Game.Upgrade.prototype.buy.__fcpRule = true;
    }
})();

// Reward cookies: FC's normal chain handles them.
(function () {
    var fn = window.isRewardCookie;
    if (typeof fn !== "function" || fn.__fcpRule) return;
    window.isRewardCookie = function () {
        if (FCP.bankRulesOn()) return false;
        return fn.apply(this, arguments);
    };
    window.isRewardCookie.__fcpRule = true;
})();
