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
        value = Game.cookiesPs + (FCP.realClickRate ? FCP.realClickRate() : 0) * Game.computedMouseCps;
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

FCP.setAura = function (aura, slot) {
    Game.specialTab = "dragon";
    Game.SetDragonAura(aura, slot);
    Game.ConfirmPrompt(); // the game takes the building and sets the aura
    if (Game.promptOn) Game.ClosePrompt();
};

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
