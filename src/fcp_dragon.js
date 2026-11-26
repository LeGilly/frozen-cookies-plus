// Frozen Cookies Plus — smart dragon auras (option smartAuras, on in Recommended).
//
// FC's own aura setting picks two fixed auras (Recommended: Elder Battalion and Radiant
// Appetite) and does nothing until the dragon knows them, so a young dragon has no aura at all.
// This picks the best auras the dragon knows right now instead, by working out the production
// (plus clicking, at the measured click speed) with each candidate, and switches when the best
// one changes: new auras learned, the second slot opened at the top level.
//
// Candidates are the auras that change production all the time: Breath of Milk, Dragon Cursor,
// Elder Battalion, Dragon God, Radiant Appetite and Reality Bending. The others act on golden
// cookies, prices, lumps or minigames; Dragon's Fortune counts golden cookies left on screen,
// and FC clicks them at once.
// Switching costs one of your most expensive buildings (the game's rule), so it only switches
// for at least 1% more.

FCP.auraCandidates = ["Breath of Milk", "Dragon Cursor", "Elder Battalion", "Dragon God", "Radiant Appetite", "Reality Bending"];

FCP.knownAuras = function () {
    return FCP.auraCandidates
        .map(function (n) { return Game.dragonAurasBN[n]; })
        .filter(function (a) { return a && Game.dragonLevel >= a.id + 4; })
        .map(function (a) { return a.id; });
};

FCP.secondAuraSlot = function () {
    return Game.dragonLevel >= Game.dragonLevels.length - 1;
};

// Production with these auras, plus clicking. Nothing is won or changed while trying them.
FCP.auraValue = function (a0, a1) {
    var keep = [Game.dragonAura, Game.dragonAura2], win = Game.Win, value = 0;
    Game.Win = function () {};
    try {
        Game.dragonAura = a0;
        Game.dragonAura2 = a1;
        Game.CalculateGains();
        value = Game.cookiesPs + FCP.realClickRate() * Game.computedMouseCps;
    } finally {
        Game.dragonAura = keep[0];
        Game.dragonAura2 = keep[1];
        Game.Win = win;
        Game.CalculateGains();
    }
    return value;
};

FCP.bestAuras = function () {
    var known = FCP.knownAuras(), best = { a0: Game.dragonAura, a1: Game.dragonAura2, value: -1 };
    if (!known.length) return null;
    var seconds = FCP.secondAuraSlot() ? [0].concat(known) : [Game.dragonAura2];
    known.forEach(function (a0) {
        seconds.forEach(function (a1) {
            if (a1 && a1 === a0) return;
            var v = FCP.auraValue(a0, a1);
            if (v > best.value) best = { a0: a0, a1: a1, value: v };
        });
    });
    best.current = FCP.auraValue(Game.dragonAura, Game.dragonAura2);
    return best;
};

// Set an aura the way the game's confirm button does (the aura, then one of the most expensive
// buildings), without opening the aura prompt or the dragon menu.
FCP.setAura = function (aura, slot) {
    var current = slot ? Game.dragonAura2 : Game.dragonAura;
    if (current === aura) return;
    var highest = 0;
    for (var i in Game.Objects) if (Game.Objects[i].amount > 0) highest = Game.Objects[i];
    if (slot) Game.dragonAura2 = aura;
    else Game.dragonAura = aura;
    if (highest) highest.sacrifice(1);
    Game.recalculateGains = 1;
};

FCP.specialMenuOpen = function () {
    var el = l("specialPopup");
    return !!(el && / onScreen/.test(el.className));
};

// Training the dragon opens its menu (the game does that for its own button). When FC trains
// it with the menu closed, close it again so it doesn't sit over the info panel.
if (!Game.UpgradeDragon.__fcpMenu) {
    (function () {
        var upgrade = Game.UpgradeDragon;
        Game.UpgradeDragon = function () {
            var wasOpen = FCP.specialMenuOpen();
            var r = upgrade.apply(this, arguments);
            if (!wasOpen && FCP.specialMenuOpen()) {
                Game.specialTab = Game.specialTab || "dragon"; // the game only closes a menu with a tab set
                Game.ToggleSpecialMenu(0);
            }
            return r;
        };
        Game.UpgradeDragon.__fcpMenu = true;
    })();
}

FCP.dragonTick = function () {
    if (!FrozenCookies.smartAuras || !Game.Has("A crumbly egg") || Game.OnAscend || Game.AscendTimer) return;
    if (Game.promptOn || FCP.busy()) return;
    var best = FCP.bestAuras();
    if (!best || best.value < best.current * 1.01) return;
    var names = function (a) { return Game.dragonAuras[a].dname || Game.dragonAuras[a].name; };
    // An aura can't be in both slots: when the best pair swaps them, change the slot that frees
    // the other first.
    if (best.a0 !== Game.dragonAura) {
        if (best.a0 === Game.dragonAura2) FCP.setAura(best.a1 || 0, 1);
        FCP.setAura(best.a0, 0);
    }
    if (FCP.secondAuraSlot() && best.a1 !== Game.dragonAura2 && best.a1 !== Game.dragonAura) FCP.setAura(best.a1, 1);
    FCP.log(
        "Dragon aura" + (Game.dragonAura2 ? "s" : "") + ": " + names(Game.dragonAura) + (Game.dragonAura2 ? " + " + names(Game.dragonAura2) : "") +
            " (+" + Beautify((best.value / best.current - 1) * 100, 1) + "% production).",
        true
    );
};

// FC's fixed auras are set aside while this is on.
["autoDragonAura0Action", "autoDragonAura1Action"].forEach(function (name) {
    var fn = window[name];
    if (typeof fn !== "function" || fn.__fcpAura) return;
    window[name] = function () {
        if (FrozenCookies.smartAuras) return;
        return fn.apply(this, arguments);
    };
    window[name].__fcpAura = true;
});

FCP.addTask("dragon", function () { return true; }, FCP.dragonTick, 5000);

// ---------------------------------------------------------------------------
// Dragon training (option dragonTiming, on in Recommended).
// FC trains the dragon as soon as it can: most levels take 100 of one building (the last two,
// 50 and then 200 of every building), which FC then buys back. Late in a run that can be hours
// of income. With this on, a level that takes buildings waits until buying them back costs at
// most FCP.DRAGON_REBUY_MINUTES of income; levels that cost cookies wait for the golden cookie
// bank. The infobox shows the next level and what it waits for.
// ---------------------------------------------------------------------------
FCP.DRAGON_REBUY_MINUTES = 10;

// The cookies to buy back `n` units of a building just sacrificed (the n before the next one).
FCP.rebuyCost = function (o, n) {
    if (o.amount < n) return Infinity;
    return (o.getPrice() * (1 - Math.pow(1.15, -n))) / 0.15;
};

FCP.dragonNext = function () {
    if (!Game.Has("A crumbly egg") || Game.dragonLevel >= Game.dragonLevels.length - 1) return null;
    var lvl = Game.dragonLevel,
        it = Game.dragonLevels[lvl],
        name = String(it.action || "").replace(/<br>.*$/i, "").replace(/<[^>]+>/g, ""),
        income = Math.max(1, FCP.cookieRate()) * 60 * FCP.DRAGON_REBUY_MINUTES;
    var cost = String(it.costStr ? it.costStr() : "").replace(/<[^>]+>/g, "");
    var r = { name: name, cost: cost, ready: !!it.cost(), worth: true, why: "" };
    if (lvl >= 5 && lvl < Game.dragonLevels.length - 3) {
        var o = Game.ObjectsById[lvl - 5];
        if (o.amount < 100) r.why = "have " + o.amount + "/100";
        else {
            var rebuy = FCP.rebuyCost(o, 100);
            r.worth = rebuy <= income;
            if (!r.worth) r.why = "rebuying costs " + FCP.shortTime(rebuy / (income / (60 * FCP.DRAGON_REBUY_MINUTES))) + " of income (waits for <" + FCP.DRAGON_REBUY_MINUTES + "m)";
        }
    } else if (lvl >= Game.dragonLevels.length - 3) {
        var per = lvl === Game.dragonLevels.length - 3 ? 50 : 200, total = 0, short = null;
        Game.ObjectsById.forEach(function (b) {
            if (b.amount < per && !short) short = b;
            total += FCP.rebuyCost(b, per);
        });
        if (short) r.why = "needs " + per + " of each (" + short.name + ": " + short.amount + ")";
        else {
            r.worth = total <= income;
            if (!r.worth) r.why = "rebuying costs " + FCP.shortTime(total / (income / (60 * FCP.DRAGON_REBUY_MINUTES))) + " of income (waits for <" + FCP.DRAGON_REBUY_MINUTES + "m)";
        }
    } else {
        var price = Math.pow(2, lvl) * 1e6;
        r.worth = FCP.canSpend(price);
        if (!r.ready) r.why = "when you have " + Beautify(price) + " cookies";
        else if (!r.worth) r.why = "waiting for cookies above the golden cookie bank";
    }
    return r;
};

(function () {
    var fn = window.autoDragonAction;
    if (typeof fn !== "function" || fn.__fcpTiming) return;
    window.autoDragonAction = function () {
        if (FrozenCookies.dragonTiming) {
            var next = FCP.dragonNext();
            if (next && !next.worth) return;
        }
        return fn.apply(this, arguments);
    };
    window.autoDragonAction.__fcpTiming = true;
})();
