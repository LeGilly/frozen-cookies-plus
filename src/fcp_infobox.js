// Frozen Cookies Plus — readable infobox.
// Replaces the text part of FC's infobox (bottom left of the cookie area)
// with a dark panel that says in plain words what FC is doing next, and
// adds what the Plus modules are hunting. The progress wheel is still
// drawn by upstream drawCircles.


// ---------------------------------------------------------------------------
// Achievement helpers
// ---------------------------------------------------------------------------

// Achievement a building purchase would unlock, if buying `count` more.
FCP.purchaseAchievement = function (purchase, count) {
    if (!purchase) return null;
    if (purchase.tieredAchievs) {
        for (var t in purchase.tieredAchievs) {
            var a = purchase.tieredAchievs[t];
            var need = Game.Tiers[a.tier] ? Game.Tiers[a.tier].achievUnlock : Infinity;
            if (!a.won && purchase.amount < need && purchase.amount + (count || 1) >= need) return a;
        }
        return null;
    }
    if (purchase.type === "upgrade" || purchase.pool !== undefined) {
        var thresholds = [[20, "Enhancer"], [50, "Augmenter"], [100, "Upgrader"], [200, "Lord of Progress"], [300, "The full picture"], [400, "When there's nothing left to add"], [500, "Kaizen"], [600, "Beyond quality"], [700, "Oft we mar what's well"]];
        if (Game.CountsAsUpgradeOwned && !Game.CountsAsUpgradeOwned(purchase.pool)) return null;
        for (var i = 0; i < thresholds.length; i++) {
            var ach = Game.Achievements[thresholds[i][1]];
            if (ach && !ach.won && Game.UpgradesOwned + 1 >= thresholds[i][0]) return ach;
        }
    }
    return null;
};

// Closest "number goes up" achievements: buildings owned, cookies baked
// this ascension, CpS, cookies made by a building.
FCP.closestMilestones = function (n) {
    var list = [];
    var add = function (a, have, need) {
        if (!a || a.won || !(need > 0)) return;
        var p = have / need;
        if (p < 1 && p > 0) list.push({ a: a, p: p });
    };
    Object.keys(Game.Objects).forEach(function (k) {
        var o = Game.Objects[k];
        var bestTier = null;
        for (var t in o.tieredAchievs) {
            var a = o.tieredAchievs[t];
            if (a.won) continue;
            var need = Game.Tiers[a.tier] ? Game.Tiers[a.tier].achievUnlock : 0;
            if (!bestTier || need < bestTier.need) bestTier = { a: a, need: need };
        }
        if (bestTier) add(bestTier.a, o.amount, bestTier.need);
        (o.productionAchievs || []).some(function (pa) {
            if (pa.achiev.won) return false;
            add(pa.achiev, o.totalCookies, pa.pow);
            return true;
        });
    });
    (Game.BankAchievements || []).some(function (a) {
        if (a.won) return false;
        add(a, Game.cookiesEarned, a.threshold);
        return true;
    });
    (Game.CpsAchievements || []).some(function (a) {
        if (a.won) return false;
        add(a, Game.cookiesPs, a.threshold);
        return true;
    });
    list.sort(function (x, y) { return y.p - x.p; });
    return list.slice(0, n || 2);
};

// What the Achievement Hunter is still waiting on.
FCP.hunterWaiting = function () {
    var w = [];
    if (!FrozenCookies.achievementHunter) return w;
    if (!FCP.has("Hand-picked")) w.push("Hand-picked (next lump, 50% luck)");
    if (!FCP.has("Wrinkler poker")) w.push("Wrinkler poker (needs a wrinkler)");
    if (!FCP.has("Debt evasion")) {
        var B = Game.Objects["Bank"].minigame;
        w.push("Debt evasion (" + (B && B.officeLevel >= 2 ? "next ascension" : "needs bank office 3") + ")");
    }
    if (FrozenCookies.elderPledgeAchievs && !FCP.has("Elder calm"))
        w.push(!FCP.has("Elder slumber") ? "Elder slumber (pledges " + Game.pledges + "/5)" : "Elder calm (Covenant)");
    return w;
};

// ---------------------------------------------------------------------------
// Panel content
// ---------------------------------------------------------------------------
// When the next golden cookie comes, from the game's own timer. The game fixes the earliest
// and latest time when the last golden cookie goes away (upgrades bought since apply to the
// next one), then each frame past the earliest one spawns with chance
// ((time - earliest) / (latest - earliest))^5. FC's estimate rebuilt the times from the
// upgrades owned now (so buying Lucky day moved it at once, and it could run out before the
// cookie came) and left out several modifiers (Heavenly luck, auras, gods...).
// "likely" is the median of what is left: as time passes without a cookie, it shrinks more
// slowly than the clock. The earliest and latest times are hard limits and tick in real time.
FCP.gcTimes = function () {
    var g = Game.shimmerTypes && Game.shimmerTypes.golden;
    if (!g || !(g.maxTime > g.minTime)) return null;
    if (g.spawned) return { state: "onscreen" };
    if (!g.spawnConditions()) return { state: "paused" };
    var fps = Game.fps, t = g.time, min = g.minTime, max = g.maxTime;
    var survive = 1, likely = null, frame = t;
    while (frame < max) {
        frame++;
        var p = frame > min ? Math.pow((frame - min) / (max - min), 5) : 0;
        survive *= 1 - Math.min(1, p);
        if (likely === null && survive <= 0.5) likely = frame;
        if (survive <= 0) break;
    }
    if (likely === null) likely = max;
    return {
        state: "waiting",
        earliest: Math.max(0, min - t) / fps,
        likely: Math.max(0, likely - t) / fps,
        latest: Math.max(0, max - t) / fps,
    };
};

FCP.noBankInfo = function () {
    try {
        var lucky = luckyBank();
        if (!(lucky > 0)) return "";
        var bankScore = cookieEfficiency(Game.cookies, lucky);
        var next = nextChainedPurchase();
        if (!next || !isFinite(next.efficiency)) return "";
        var fmt = function (sec) { return timeDisplay(Math.max(1, Math.round(sec))); };
        if (!(bankScore < Number.MAX_VALUE / 2)) return "none · golden cookies don't count right now";
        var name = next.purchase && (next.purchase.dname || next.purchase.name);
        return "none for now · a Lucky! bank (" + Beautify(lucky) + ") would pay for itself in " + fmt(bankScore) +
            ", " + name + " in " + fmt(next.efficiency) + " · FC starts saving once the bank wins";
    } catch (e) {
        return "";
    }
};

FCP.infoLines = function (t_d) {
    var lines = [];
    var head = function (text) { lines.push({ head: true, label: text }); };
    var line = function (color, label, value) { lines.push({ color: color, label: label, value: value }); };
    var byPrefix = function (p) {
        return t_d.filter(function (o) { return o.name && o.name.indexOf(p) === 0; })[0];
    };

    head("Frozen Cookies — what happens next");

    // Times are computed here rather than taken from FC's infobox: FC assumes
    // the autoclicker is running, which is wrong during a Neverclick run.
    var bankTotal = 0;
    try { bankTotal = delayAmount() || 0; } catch (e) {}
    var rate = FCP.cookieRate();
    var eta = function (need) {
        if (need <= 0) return "affordable now";
        if (!(rate > 0)) return "waiting for a golden cookie";
        var sec = need / rate;
        return "in " + (sec < 1 ? "under 1s" : timeDisplay(sec));
    };

    var np = null;
    try { np = nextPurchase(); } catch (e) {}
    if (np && np.purchase) {
        var cost = np.cost || 0;
        var unlock = FCP.purchaseAchievement(np.purchase, 1);
        var name = byPrefix("Next: ") ? byPrefix("Next: ").name.slice(6) : decodeHtml(np.purchase.name);
        line(
            "#e0e0e0",
            "Buying next",
            name + " for " + Beautify(cost) + " · " + eta(cost + bankTotal - Game.cookies) +
                (unlock ? " → unlocks “" + unlock.dname + "”" : "")
        );
    }

    var chain = byPrefix("Chain to: ");
    if (chain) {
        var need = 0;
        try {
            var cp = nextChainedPurchase().purchase;
            var chainTotal = upgradePrereqCost(cp, true) - cp.getPrice();
            var chainFinished = chainTotal - (upgradePrereqCost(cp) - cp.getPrice());
            need = chainTotal + bankTotal - Game.cookies - chainFinished;
        } catch (e) {}
        line("#9e9e9e", "Then working toward", chain.name.slice(10) + " (buying its requirements first) · " + eta(need));
    }

    if (bankTotal > 0) {
        var pct = Math.min(1, Game.cookies / bankTotal);
        line(
            "#fcd400",
            "Golden cookie bank",
            Math.floor(pct * 100) + "% of " + Beautify(bankTotal) +
                (pct < 1 ? " · full " + eta(bankTotal - Game.cookies) : " · full") + " (so Lucky! pays the most)"
        );
        var why = pct < 1 && FCP.bankWatch && FCP.bankWatch.why;
        if (why) line("#9e9e9e", "Why not full", why);
    } else {
        // No bank kept: say why, and how far it is from starting. FC keeps a bank once filling it
        // scores better (cookies still needed / extra golden cookie income) than the next purchase
        // (time to afford + time to pay for itself).
        var nb = FCP.noBankInfo();
        if (nb) line("#fcd400", "Golden cookie bank", nb);
    }

    if (FrozenCookies.smartAscend && FCP.status["Ascension"]) line("#b39ddb", "Next ascension", FCP.status["Ascension"]);

    if ((FrozenCookies.autoDragon || FrozenCookies.dragonTiming) && FCP.dragonNext) {
        var dn = null;
        try { dn = FCP.dragonNext(); } catch (e) {}
        if (dn) line("#ffb74d", "Dragon", dn.name + " · costs " + dn.cost + (dn.why ? " · " + dn.why : " · now"));
    }

    if (FrozenCookies.autoClick && FrozenCookies.cookieClickSpeed) {
        var clickText;
        if (FCP.noClickActive && FCP.noClickActive()) clickText = "paused for the Neverclick challenge";
        else if (FCP.clicks && FCP.clicks.measured !== null)
            clickText = Math.round(FCP.clicks.measured) + "/s measured (set to " + FrozenCookies.cookieClickSpeed + "/s)" +
                (FrozenCookies.measuredClicks ? "" : " · estimates use the setting");
        else clickText = "measuring… (set to " + FrozenCookies.cookieClickSpeed + "/s)";
        if (FrozenCookies.cookieClickSpeed > 50) clickText += " · the game allows 50/s at most";
        line("#80cbc4", "Clicking", clickText);
    }

    var gc = FCP.gcTimes();
    if (gc) {
        var gcText;
        if (gc.state === "onscreen") gcText = "one is on screen";
        else if (gc.state === "paused") gcText = "none while the Golden switch is on";
        else {
            var fmt = function (sec) { return timeDisplay(Math.max(1, Math.ceil(sec))); };
            if (gc.earliest > 0) gcText = "likely in " + fmt(gc.likely) + " (between " + fmt(gc.earliest) + " and " + fmt(gc.latest) + ")";
            else if (gc.latest > 0) gcText = "likely in " + fmt(gc.likely) + " (could appear any moment, at the latest in " + fmt(gc.latest) + ")";
            else gcText = "any moment now";
        }
        line("#ffde5f", "Next golden cookie", gcText);
    }

    var buffs = t_d.filter(function (o) { return o.name && / Time$/.test(o.name); });
    buffs.forEach(function (o) {
        line(o.c1, "Buff active", o.name.replace(/ Time$/, "") + " · " + o.display + " left");
    });

    // FC+ activity
    var plus = [];
    if (FrozenCookies.challengeRuns && FCP.status["Challenge runs"] && FCP.status["Challenge runs"] !== "all done")
        plus.push(["#ff8a65", "Challenge run", FCP.status["Challenge runs"]]);
    if (FrozenCookies.autoLumps && FCP.status["Sugar lumps"]) plus.push(["#c39bff", "Sugar lumps", FCP.status["Sugar lumps"]]);
    if (FrozenCookies.autoGarden && FCP.status["Garden"]) plus.push(["#7ed957", "Garden", FCP.status["Garden"]]);
    if (FCP.status["Endless cycle"]) plus.push(["#90a4ae", "Endless cycle", FCP.status["Endless cycle"]]);
    if (FrozenCookies.autoStocks && FCP.status["Stock market"]) plus.push(["#4fc3f7", "Stock market", FCP.status["Stock market"]]);
    var waiting = FCP.hunterWaiting();
    if (waiting.length) plus.push(["#f48fb1", "Waiting for", waiting.join(" · ")]);
    if (FCP.upgradeSummary) plus.push(["#ffd54f", "Upgrades", FCP.upgradeSummary()]);
    var close = FCP.closestMilestones(2);
    if (close.length)
        plus.push([
            "#ffffff",
            "Closest milestones",
            close.map(function (m) { return "“" + m.a.dname + "” " + Math.floor(m.p * 100) + "%"; }).join(" · "),
        ]);
    if (plus.length) {
        head("Achievement hunting (FC+)");
        plus.forEach(function (p) { line(p[0], p[1], p[2]); });
    }
    return lines;
};

// ---------------------------------------------------------------------------
// Drawing: an HTML overlay (crisp text, drawn above the cookie and cursors,
// ignores the mouse) placed above FC's progress wheel.
// ---------------------------------------------------------------------------
FCP.escape = function (t) {
    return String(t).replace(/[&<>"]/g, function (ch) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch];
    });
};

FCP.panelCss =
    "#fcpInfoPanel{position:absolute;left:10px;z-index:6;pointer-events:none;box-sizing:border-box;" +
    "background:rgba(8,8,12,0.84);border:1px solid rgba(255,255,255,0.18);border-radius:6px;" +
    "padding:6px 8px;font:12px/1.35 Arial,sans-serif;color:#fff;text-shadow:0 1px 1px #000;}" +
    "#fcpInfoPanel .h{color:#ffd54f;font-weight:bold;margin:2px 0 3px;}" +
    "#fcpInfoPanel .h+.r{margin-top:0}" +
    "#fcpInfoPanel .gap{height:5px}" +
    "#fcpInfoPanel .r{display:flex;gap:6px;margin:1px 0;align-items:baseline}" +
    "#fcpInfoPanel .m{flex:0 0 8px;height:8px;border:1px solid rgba(255,255,255,0.55);position:relative;top:1px}" +
    "#fcpInfoPanel .l{flex:0 0 auto;color:#c8c8c8;font-weight:bold;white-space:nowrap}" +
    "#fcpInfoPanel .v{flex:1 1 auto;color:#fff}";

FCP.infoPanelEl = function () {
    var el = document.getElementById("fcpInfoPanel");
    if (el) return el;
    if (!document.getElementById("fcpInfoPanelCss")) {
        var st = document.createElement("style");
        st.id = "fcpInfoPanelCss";
        st.textContent = FCP.panelCss;
        document.head.appendChild(st);
    }
    var host = document.getElementById("sectionLeft");
    if (!host) return null;
    el = document.createElement("div");
    el.id = "fcpInfoPanel";
    host.appendChild(el);
    return el;
};

FCP.renderInfoPanel = function (t_d, bottomPx, widthPx) {
    var el = FCP.infoPanelEl();
    if (!el) return;
    FCP.lastPanelDraw = Date.now();
    el.style.display = "block";
    // Santa and the dragon sit in a column at the bottom left (up to 80px wide when one is
    // open): start the panel to their right so they stay visible.
    var left = Game.specialTabs && Game.specialTabs.length ? 88 : 10;
    el.style.left = left + "px";
    el.style.bottom = bottomPx + "px";
    el.style.width = Math.max(220, widthPx - (left - 10)) + "px";
    // Rebuilding the HTML every frame is wasteful; twice a second is plenty.
    if (FCP.lastPanelHtmlAt && Date.now() - FCP.lastPanelHtmlAt < 500) return;
    FCP.lastPanelHtmlAt = Date.now();
    var html = "";
    FCP.infoLines(t_d).forEach(function (l, i) {
        if (l.head) html += (i ? '<div class="gap"></div>' : "") + '<div class="h">' + FCP.escape(l.label) + "</div>";
        else
            html +=
                '<div class="r"><span class="m" style="background:' + l.color + '"></span><span class="l">' +
                FCP.escape(l.label) + '</span><span class="v">' + FCP.escape(l.value) + "</span></div>";
    });
    if (html !== FCP.lastPanelHtml) {
        el.innerHTML = html;
        FCP.lastPanelHtml = html;
    }
};

FCP.hideInfoPanel = function () {
    var el = document.getElementById("fcpInfoPanel");
    if (el) el.style.display = "none";
};

// Hide the panel when FC stops drawing it (infobox off, ascension screen...).
setInterval(function () {
    if (!FCP.lastPanelDraw || Date.now() - FCP.lastPanelDraw > 700 || Game.OnAscend || !(FrozenCookies.fancyui % 2))
        FCP.hideInfoPanel();
}, 500);

var _fcpOriginalDrawCircles = drawCircles;
drawCircles = function (t_d, x, y) {
    // FC draws its "Frenzy: x" text as a jCanvas layer. jCanvas then wipes the whole canvas
    // and redraws only its layers whenever the mouse leaves the canvas, which happens when
    // the mouse moves onto the big cookie: one blank frame (no cookie, milk or buff glow).
    // The game redraws everything each frame anyway, so that handler is not needed.
    $("#backgroundLeftCanvas").off("mouseout.jCanvas");
    var mode = FrozenCookies.fancyui;
    if (!mode) return FCP.hideInfoPanel();
    var c = $("#backgroundLeftCanvas");
    if (!c.length) return;
    var canvasH = c.height(),
        canvasW = c.width();
    var bottom = 40; // above FC's "Frenzy" readout
    if (mode > 1) {
        // Upstream draws only the wheel; the panel goes above it.
        FrozenCookies.fancyui = 2;
        try {
            _fcpOriginalDrawCircles(t_d, x, y);
        } finally {
            FrozenCookies.fancyui = mode;
        }
        bottom = Math.max(bottom, canvasH - y + 6);
    }
    if (mode % 2 === 1) FCP.renderInfoPanel(t_d, bottom, Math.max(220, Math.min(480, canvasW - 20)));
    else FCP.hideInfoPanel();
};

// Popups (golden cookie results and the like) are placed at the golden cookie, held at least
// 32 pixels below the top by the game. A two-line popup is taller than that, and it then rises
// 32 more pixels, so one near the top was cut off by the window edge. Move it down enough to
// stay whole.
if (Game.textParticlesAdd && !Game.textParticlesAdd.__fcp) {
    (function () {
        var add = Game.textParticlesAdd;
        Game.textParticlesAdd = function (text) {
            var r = add.apply(this, arguments);
            try {
                var me = Game.textParticles.filter(function (p) { return p.life === 0 && p.text === text; }).pop();
                if (me && me.l) {
                    var minY = Game.bounds.top + (typeof App !== "undefined" && App ? 32 : 0) + me.l.offsetHeight + 32 + 12;
                    if (me.y < minY) {
                        me.y = minY;
                        me.l.style.bottom = Math.floor(-me.y) + "px";
                    }
                }
            } catch (e) {}
            return r;
        };
        Game.textParticlesAdd.__fcp = true;
    })();
}
