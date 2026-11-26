// Frozen Cookies Plus — the achievements normal play never gives:
//  UI tricks (option achievementTricks): Stifling the press, Cookie-dunker, Baby it's old outside.
//  Shadow achievements (option shadowAchievements): God complex, In her likeness,
//    Last Chance to See, When the cookies ascend just right.

//  No time like the present (Achievement Hunter): send yourself a gift, redeem it an hour later.
//  Endless cycle (option ascensionMarathon): ascend at every new prestige level, 1,000 times.
//  Cheats (option cheatAchievement): Cheated cookies taste awful and Four-leaf cookie, faked for one check.
// Speed baking and Neverclick are challenge runs (fcp_achievements.js).

// ---------------------------------------------------------------------------
// Around each game logic frame. The game checks most achievements every 5 seconds, on frames
// where Game.T % (5 * fps) == 0: tricks are applied for that frame only, then undone.
// ---------------------------------------------------------------------------
FCP.isCheckFrame = function () {
    return Game.T % (Game.fps * 5) === 0;
};

FCP.beforeLogic = function (undo) {
    if (!FCP.isCheckFrame()) return;
    // Cookie-dunker: the check compares the milk with the cookie's position in a short window.
    // Pretend the left column is 150 px tall for this one check.
    if (FrozenCookies.achievementTricks && !FCP.has("Cookie-dunker") && Game.milkProgress > 0.1 && Game.LeftBackground) {
        var keep = Game.LeftBackground;
        Game.LeftBackground = { canvas: { height: 150, width: keep.canvas.width } };
        undo.push(function () { Game.LeftBackground = keep; });
    }
    // Cheated cookies taste awful: needs more cookies in the bank than ever baked. With big
    // numbers, +1 is lost to rounding: go a hair over instead. The bank is put back afterwards.
    if (FrozenCookies.cheatAchievement && !FCP.has("Cheated cookies taste awful")) {
        var bank = Game.cookies,
            over = Game.cookiesEarned * (1 + 1e-12) + 1;
        if (over > bank) {
            Game.cookies = over;
            undo.push(function () {
                Game.cookies = Math.min(Game.cookies - (over - bank), Game.cookiesEarned);
            });
        }
    }
    // Four-leaf cookie: 4 golden cookies on screen at once. Golden cookies come one at a time
    // (Cookie Storm drops don't count), so the count is shown as 4 for one check.
    if (FrozenCookies.cheatAchievement && !FCP.has("Four-leaf cookie")) {
        var golden = Game.shimmerTypes.golden,
            add = Math.max(0, 4 - golden.n);
        golden.n += add;
        undo.push(function () { golden.n -= add; });
    }
};

FCP.patchLogic = function () {
    if (Game.Logic.__fcp) return;
    var original = Game.Logic;
    var patched = function () {
        var undo = [];
        try {
            FCP.beforeLogic(undo);
        } catch (e) {}
        try {
            return original.apply(this, arguments);
        } finally {
            for (var i = undo.length - 1; i >= 0; i--) {
                try { undo[i](); } catch (e) {}
            }
        }
    };
    patched.__fcp = true;
    Game.Logic = patched;
};

// ---------------------------------------------------------------------------
// UI tricks
// ---------------------------------------------------------------------------
// Baby it's old outside: during Christmas, the mouse held down on one of Santa's helper grandmas
// in the grandma row. Point the row's mouse at one, press, let the row draw once, put things back.
FCP.christmasGrandma = function () {
    if (Game.season !== "christmas" || FCP.has("Baby it's old outside")) return;
    var G = Game.Objects["Grandma"];
    if (!G || !G.amount || !G.pics || !G.draw) return;
    if (!G.pics.length) return;
    // A Santa's helper if one is in view, else the first grandma dressed as one for this draw.
    var elf = G.pics.filter(function (p) { return p.pic === "elfGrandma.png"; })[0] || G.pics[0];
    var keep = { on: G.mouseOn, pos: G.mousePos, down: Game.mouseDown, pic: elf.pic };
    try {
        elf.pic = "elfGrandma.png";
        G.mouseOn = true;
        G.mousePos = [elf.x + 32, elf.y + 32];
        Game.mouseDown = 1;
        G.draw();
    } finally {
        G.mouseOn = keep.on;
        G.mousePos = keep.pos;
        Game.mouseDown = keep.down;
        elf.pic = keep.pic;
    }
    if (FCP.has("Baby it's old outside")) FCP.log("Held the mouse on a Santa's helper grandma: 'Baby it's old outside'.");
};

// ---------------------------------------------------------------------------
// Shadow achievements
// ---------------------------------------------------------------------------
FCP.godComplex = function () {
    if (FCP.has("God complex")) return;
    var name = Game.bakeryName;
    Game.bakeryNameSet("Orteil");
    Game.bakeryNameSet(name); // the -1% CpS only applies while named so
};

// In her likeness: the You customizer set to the grandma look, then your own look put back.
FCP.inHerLikeness = function () {
    var Y = Game.YouCustomizer;
    if (FCP.has("In her likeness") || !Y || !Y.genes || !Y.currentGenes || !Y.offsetGene) return;
    var saved = Y.currentGenes.slice();
    try {
        var target = saved.slice();
        target[1] = 1;
        target[3] = 2;
        target[5] = 2;
        target[6] = 0;
        target[0] = 8; // offsetGene below moves it to 9 and runs the game's check
        Y.currentGenes = target;
        Y.offsetGene(Y.genes[0].id, 1);
    } finally {
        Y.currentGenes = saved;
        try {
            Y.render();
            Y.renderPortrait();
        } catch (e) {}
    }
};

// Last Chance to See: pop the shiny wrinkler (FC normally keeps it).
FCP.shinyWrinkler = function () {
    if (FCP.has("Last Chance to See")) return;
    Game.wrinklers.forEach(function (w) {
        if (w.type == 1 && w.phase == 2 && w.close == 1) {
            w.hp = 0;
            FCP.log("Popped the shiny wrinkler: 'Last Chance to See'.");
        }
    });
};

// When the cookies ascend just right: ascend with exactly 1 trillion cookies (rounded) in the bank.
// Called right before FC ascends; the bank is lost at ascension anyway, so spending it costs
// nothing. Sell every building, buy buildings down to just above 1 trillion, then buy and sell
// single buildings until the bank rounds to exactly 1 trillion. Returns true on success.
FCP.landBank = function (target) {
    var tolerance = 0.49;
    var keepMode = Game.buyMode;
    Game.buyMode = 1;
    try {
        Game.ObjectsById.forEach(function (o) { if (o.amount > 0) o.sell(o.amount, 1); });
        if (Game.cookies < target) return false;
        // Big steps: the most expensive single building that keeps the bank above the target.
        for (var i = 0; i < 200000; i++) {
            var room = Game.cookies - target,
                best = null,
                bestPrice = 0;
            Game.ObjectsById.forEach(function (o) {
                var p = o.getPrice();
                if (p <= room && p > bestPrice) {
                    best = o;
                    bestPrice = p;
                }
            });
            if (!best) break;
            best.buy(1);
        }
        // Small steps: buy the priciest building that fits, or sell the one that refunds least.
        for (var j = 0; j < 20000; j++) {
            var e = Game.cookies - target;
            if (Math.abs(e) <= tolerance) return true;
            var buy = null,
                buyPrice = 0;
            if (e > tolerance)
                Game.ObjectsById.forEach(function (o) {
                    var p = o.getPrice();
                    if (p <= e + tolerance && p > buyPrice) {
                        buy = o;
                        buyPrice = p;
                    }
                });
            if (buy) {
                buy.buy(1);
                continue;
            }
            var sell = null,
                refund = Infinity;
            Game.ObjectsById.forEach(function (o) {
                if (o.amount <= 0) return;
                var r = o.getReverseSumPrice(1);
                if (r > 0 && r < refund) {
                    sell = o;
                    refund = r;
                }
            });
            if (!sell) return false;
            sell.sell(1, 1);
        }
        return Math.abs(Game.cookies - target) <= tolerance;
    } finally {
        Game.buyMode = keepMode;
    }
};

// ---------------------------------------------------------------------------
// No time like the present (Achievement Hunter): needs the Wrapping paper heavenly upgrade,
// 1 billion cookies and a normal run. Send a 1-cookie gift through the game's own gift screen,
// keep the code, and redeem it once the 1-hour "Gifted out" cooldown is over.
// ---------------------------------------------------------------------------
FCP.giftState = function (value) {
    try {
        if (value === undefined) return JSON.parse(localStorage.getItem("fcpGift") || "null");
        if (value === null) localStorage.removeItem("fcpGift");
        else localStorage.setItem("fcpGift", JSON.stringify(value));
    } catch (e) {}
    return value;
};

FCP.giftTick = function () {
    if (FCP.giftStep === "close") {
        if (Game.promptOn) Game.ClosePrompt();
        FCP.giftStep = null;
        if (FCP.has("No time like the present")) FCP.log("Redeemed our own gift: 'No time like the present'.");
        return;
    }
    if (FCP.has("No time like the present")) {
        if (FCP.giftState()) FCP.giftState(null);
        return;
    }
    if (!Game.Has("Wrapping paper") || Game.ascensionMode != 0 || Game.cookies < 1e9) return;
    var el = function (id) { return document.getElementById(id); };
    var state = FCP.giftState() || {};
    var click = function (id) { if (el(id)) el(id).click(); };

    // Steps that continue a prompt we opened.
    if (Game.promptOn && FCP.giftStep === "send" && el("giftAmount")) {
        el("giftAmount").value = "1";
        el("giftAmount").dispatchEvent(new Event("change"));
        click("promptOption0"); // Wrap: shows the code
        FCP.giftStep = "copy";
        return;
    }
    if (Game.promptOn && FCP.giftStep === "copy" && el("giftCode") && el("giftCode").value) {
        FCP.giftState({ code: el("giftCode").value, at: Date.now() });
        Game.ClosePrompt();
        FCP.giftStep = null;
        FCP.log("Sent a 1-cookie gift to redeem in an hour, for 'No time like the present'.");
        return;
    }
    if (Game.promptOn && FCP.giftStep === "redeem" && el("giftCode") && !el("giftCode").readOnly) {
        el("giftCode").value = state.code;
        el("giftCode").dispatchEvent(new Event("change"));
        click("promptOption0");
        FCP.giftStep = "close";
        return;
    }
    if (Game.promptOn || Game.hasBuff("Gifted out")) return;

    // Codes expire after about 2 days: make a new one if needed, else redeem it.
    if (!state.code || Date.now() - state.at > 40 * 3600 * 1000) {
        FCP.giftStep = "send";
        Game.promptGiftSend();
    } else {
        FCP.giftStep = "redeem";
        Game.promptGiftRedeem();
    }
};

// ---------------------------------------------------------------------------
// Endless cycle: 1,000 ascensions. The game only counts an ascension that gains at least one
// prestige level, so ascend as soon as the run is worth one more level, and keep going.
// Each ascension then costs the time to bake one level plus about 6 seconds of animations.
// ---------------------------------------------------------------------------
FCP.nextLevelCookies = function () {
    return Math.max(0, Game.HowManyCookiesReset(Game.prestige + 1) - Game.cookiesReset - Game.cookiesEarned);
};

FCP.marathonTick = function () {
    if (!FrozenCookies.ascensionMarathon || FCP.has("Endless cycle")) {
        FCP.status["Endless cycle"] = "";
        return;
    }
    var left = FCP.nextLevelCookies();
    FCP.status["Endless cycle"] =
        Game.resets + " / 1000 ascensions" + (left > 0 && !Game.OnAscend ? ", next one after " + Beautify(left) + " more cookies" : "");
    if (Game.OnAscend) {
        if (FCP.marathonAscending && !Game.AscendTimer && !Game.ReincarnateTimer) {
            FCP.marathonReincarnating = true;
            try {
                Game.Reincarnate(1);
            } finally {
                FCP.marathonReincarnating = false;
                FCP.marathonAscending = false;
            }
        }
        return;
    }
    if (Game.AscendTimer || Game.ReincarnateTimer || Game.ascensionMode == 1 || left > 0) return;
    if (FCP.busy()) return;
    FCP.marathonAscending = true;
    FCP.autoAscend("marathon");
};

// ---------------------------------------------------------------------------
FCP.shadowTick = function () {
    FCP.patchLogic();
    FCP.patchAscend();
    if (FCP.busy()) return;
    if (FrozenCookies.achievementTricks) FCP.christmasGrandma();
    if (FrozenCookies.shadowAchievements) {
        FCP.godComplex();
        FCP.inHerLikeness();
        FCP.shinyWrinkler();
    }
};

FCP.addTask("shadow", function () { return true; }, FCP.shadowTick, 2000);
FCP.addTask("gift", function () { return !!FrozenCookies.achievementHunter; }, FCP.giftTick, 2000);
FCP.addTask("marathon", function () { return !!FrozenCookies.ascensionMarathon; }, FCP.marathonTick, 500);
