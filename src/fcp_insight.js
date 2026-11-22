// Frozen Cookies Plus — Cookie Monster-style insight.
// Uses FC's own ratings (the same numbers it buys by), so what you see matches what FC does.
//  - Store: every building row and upgrade gets a colour for how good a buy it is compared with
//    the best option now; building rows also show the income gain of one more and their share.
//  - Tooltips (buildings and store upgrades): income gain, payback time, time until affordable,
//    rating, and for buildings their share of production.
//  - FC menu: "Where your cookies come from", income by source and by building.

FCP.insightColors = [
    // [max ratio to the best option, colour, label]
    [1.0001, "#4caf50", "best buy"],
    [2, "#cddc39", "good"],
    [5, "#ff9800", "fair"],
    [20, "#f44336", "poor"],
    [Infinity, "#ab47bc", "very poor"],
];
FCP.insightNone = ["#9e9e9e", "no income gain"];

// One snapshot per refresh: FC's ratings keyed by "building:id" / "upgrade:id".
FCP.insight = { byKey: {}, best: Infinity, count: 0, income: 0 };

FCP.refreshInsight = function () {
    var list = [];
    try {
        list = recommendationList() || [];
    } catch (e) {
        return;
    }
    // Rank and colour among what can be bought right now (buildings, store upgrades); FC's list also
    // holds locked upgrades bundled with their requirements.
    var buyable = function (r) {
        return r.type === "building" ? !r.purchase.locked : r.type === "upgrade" ? r.purchase.unlocked && !r.purchase.bought : false;
    };
    var finite = list.filter(function (r) { return r && !r.bundle && buyable(r) && isFinite(r.efficiency) && r.efficiency > 0; });
    var best = finite.reduce(function (m, r) { return Math.min(m, r.efficiency); }, Infinity);
    var sorted = finite.slice().sort(function (a, b) { return a.efficiency - b.efficiency; });
    var income = 0;
    try {
        income = effectiveCps();
    } catch (e) {
        income = Game.cookiesPs;
    }
    var byKey = {};
    list.forEach(function (r) {
        if (!r || !r.purchase || r.bundle) return;
        var key = r.type + ":" + r.id;
        var rank = sorted.indexOf(r);
        byKey[key] = {
            efficiency: r.efficiency,
            ratio: isFinite(r.efficiency) && best > 0 ? r.efficiency / best : Infinity,
            rank: rank >= 0 ? rank + 1 : null,
            deltaCps: r.delta_cps,
            gain: income > 0 ? r.delta_cps / income : 0,
            cost: r.cost,
        };
    });
    FCP.insight = { byKey: byKey, best: best, count: sorted.length, income: income };
};

FCP.ratingOf = function (info) {
    if (!info || !isFinite(info.ratio) || !(info.deltaCps > 0)) return { color: FCP.insightNone[0], label: FCP.insightNone[1] };
    for (var i = 0; i < FCP.insightColors.length; i++)
        if (info.ratio <= FCP.insightColors[i][0]) return { color: FCP.insightColors[i][1], label: FCP.insightColors[i][2] };
};

FCP.num = function (x) {
    return Math.abs(x) >= 100 ? Beautify(Math.round(x)) : String(Math.round(x * 10) / 10);
};

FCP.pct = function (x) {
    if (!isFinite(x)) return "—";
    var p = x * 100;
    if (p > 0 && p < 0.01) return "<0.01%";
    return (p >= 10 ? p.toFixed(0) : p >= 1 ? p.toFixed(1) : p.toFixed(2)) + "%";
};

FCP.buildingShare = function (o) {
    var total = 0;
    Game.ObjectsById.forEach(function (b) { total += b.storedTotalCps || 0; });
    return total > 0 ? (o.storedTotalCps || 0) / total : 0;
};

FCP.waitFor = function (cost) {
    var need = cost - Game.cookies;
    if (need <= 0) return "affordable now";
    var rate = FCP.cookieRate ? FCP.cookieRate() : Game.cookiesPs;
    if (!(rate > 0)) return "no income yet";
    var sec = need / rate;
    return "in " + (sec < 1 ? "under 1s" : timeDisplay(sec));
};

// The tooltip section (HTML), shared by buildings and upgrades.
FCP.insightTooltip = function (key, building) {
    if (!FrozenCookies.insights) return "";
    var info = FCP.insight.byKey[key];
    var rating = FCP.ratingOf(info);
    var rows = [];
    var row = function (label, value) {
        rows.push('<tr><td style="opacity:0.75;padding:1px 12px 1px 0;white-space:nowrap;">' + label +
            '</td><td style="text-align:right;font-weight:bold;padding:1px 0;">' + value + "</td></tr>");
    };
    if (info) {
        var rankText = info.rank ? "#" + info.rank + " of " + FCP.insight.count : "";
        var vsBest = info.rank && info.rank > 1 && isFinite(info.ratio)
            ? (info.ratio < 1000 ? ", " + info.ratio.toFixed(1) + "× the best" : ", far behind the best") : "";
        row("Rating", '<span style="color:' + rating.color + ';">' + rating.label + "</span>" + (rankText ? " (" + rankText + vsBest + ")" : ""));
        if (info.deltaCps > 0) {
            row("Income gain", "+" + FCP.num(info.deltaCps) + "/s (+" + FCP.pct(info.gain) + ")");
            row("Pays for itself in", timeDisplay(info.cost / info.deltaCps));
        }
        row("Price", Beautify(info.cost) + " · " + FCP.waitFor(info.cost));
    }
    if (building && building.amount > 0) {
        row("Share of production", FCP.pct(FCP.buildingShare(building)));
        row("Each produces", FCP.num(building.storedCps * Game.globalCpsMult) + "/s");
    }
    if (!rows.length) return "";
    return '<div class="line"></div><div style="font-size:11px;line-height:14px;padding:2px 4px 4px;position:relative;clear:both;text-align:left;">' +
        '<div style="color:#ffd54f;font-weight:bold;margin-bottom:2px;">Frozen Cookies Plus</div>' +
        '<table style="width:100%;border-collapse:collapse;font-size:11px;">' + rows.join("") + "</table></div>";
};

// ---------------------------------------------------------------------------
// Tooltips
// ---------------------------------------------------------------------------
FCP.patchTooltips = function () {
    Game.ObjectsById.forEach(function (o) {
        if (!o.tooltip || o.tooltip.__fcp) return;
        var original = o.tooltip;
        var patched = function () {
            var html = original.apply(this, arguments);
            try {
                if (typeof html === "string" && html) html = html.replace(/<\/div>\s*$/, FCP.insightTooltip("building:" + o.id, o) + "</div>");
            } catch (e) {}
            return html;
        };
        patched.__fcp = true;
        o.tooltip = patched;
    });
    if (!Game.crateTooltip.__fcp) {
        var crate = Game.crateTooltip;
        var patchedCrate = function (me, context) {
            var html = crate.apply(this, arguments);
            try {
                if (context === "store" && me && me.type === "upgrade" && !me.bought && typeof html === "string")
                    html = html.replace(/<\/div>\s*$/, FCP.insightTooltip("upgrade:" + me.id) + "</div>");
            } catch (e) {}
            return html;
        };
        patchedCrate.__fcp = true;
        Game.crateTooltip = patchedCrate;
    }
};

// ---------------------------------------------------------------------------
// Store badges
// ---------------------------------------------------------------------------
FCP.insightCss =
    ".fcpProdInfo{position:absolute;left:66px;bottom:3px;font:bold 10px/12px Arial,sans-serif;color:#fff;" +
    "background:rgba(0,0,0,0.72);border-radius:6px;padding:0 5px;pointer-events:none;z-index:5;white-space:nowrap;}" +
    ".fcpProdInfo:empty{display:none;}" +
    ".fcpProdInfo b{font-weight:bold;}" +
    ".fcpProdBar{position:absolute;left:0;top:0;bottom:0;width:5px;pointer-events:none;z-index:5;}" +
    ".fcpUpgDot{position:absolute;left:2px;top:2px;width:10px;height:10px;border-radius:50%;" +
    "border:1px solid rgba(0,0,0,0.8);box-shadow:0 0 2px #000;pointer-events:none;z-index:5;}";

// Badge number colours, brightest = biggest. Income gain is compared with the best gain among
// the buildings (what one more of each would add); share of production uses fixed steps.
FCP.badgeScale = ["#69f0ae", "#c6ff00", "#ffeb3b", "#ffab40", "#b0bec5"];
FCP.gainColor = function (gain, best) {
    var r = best > 0 ? gain / best : 0;
    return FCP.badgeScale[r >= 0.9 ? 0 : r >= 0.5 ? 1 : r >= 0.2 ? 2 : r >= 0.05 ? 3 : 4];
};
FCP.shareColor = function (share) {
    return FCP.badgeScale[share >= 0.25 ? 0 : share >= 0.1 ? 1 : share >= 0.03 ? 2 : share >= 0.01 ? 3 : 4];
};

FCP.refreshStore = function () {
    if (!document.getElementById("fcpInsightCss")) {
        var st = document.createElement("style");
        st.id = "fcpInsightCss";
        st.textContent = FCP.insightCss;
        document.head.appendChild(st);
    }
    var on = !!FrozenCookies.insights;
    var bestGain = 0;
    Game.ObjectsById.forEach(function (o) {
        var d = FCP.insight.byKey["building:" + o.id];
        if (!o.locked && d && d.deltaCps > 0 && d.gain > bestGain) bestGain = d.gain;
    });
    var span = function (color, value, label) {
        return '<b style="color:' + color + '">' + value + "</b> " + label;
    };
    Game.ObjectsById.forEach(function (o) {
        var row = document.getElementById("product" + o.id);
        if (!row) return;
        var info = row.querySelector(".fcpProdInfo"),
            bar = row.querySelector(".fcpProdBar");
        if (!on || o.locked) {
            if (info) info.remove();
            if (bar) bar.remove();
            return;
        }
        if (!info) {
            info = document.createElement("div");
            info.className = "fcpProdInfo";
            row.appendChild(info);
            bar = document.createElement("div");
            bar.className = "fcpProdBar";
            row.appendChild(bar);
        }
        var data = FCP.insight.byKey["building:" + o.id];
        var rating = FCP.ratingOf(data);
        bar.style.background = rating.color;
        var parts = [];
        if (data && data.deltaCps > 0) parts.push(span(FCP.gainColor(data.gain, bestGain), "+" + FCP.pct(data.gain), "income"));
        if (o.amount > 0) {
            var share = FCP.buildingShare(o);
            parts.push(span(FCP.shareColor(share), FCP.pct(share), "of production"));
        }
        var html = parts.join(" · ");
        if (info.innerHTML !== html) info.innerHTML = html;
    });
    // Store upgrades: element "upgrade<i>" is Game.UpgradesInStore[i].
    (Game.UpgradesInStore || []).forEach(function (u, i) {
        var el = document.getElementById("upgrade" + i);
        if (!el) return;
        var dot = el.querySelector(".fcpUpgDot");
        if (!on) {
            if (dot) dot.remove();
            return;
        }
        if (!dot) {
            dot = document.createElement("div");
            dot.className = "fcpUpgDot";
            el.appendChild(dot);
        }
        dot.style.background = FCP.ratingOf(FCP.insight.byKey["upgrade:" + u.id]).color;
    });
};

FCP.insightTick = function () {
    if (FCP.busy()) return;
    FCP.patchTooltips();
    if (FrozenCookies.insights) FCP.refreshInsight();
    FCP.refreshStore();
};

// ---------------------------------------------------------------------------
// "Where your cookies come from" (FC menu)
// ---------------------------------------------------------------------------
FCP.incomeBreakdown = function () {
    var out = [];
    var buildings = Game.cookiesPs;
    var clicking = 0,
        golden = 0,
        reindeer = 0,
        wrinklers = 0;
    try {
        var bank = Math.min(Game.cookies, delayAmount());
        golden = gcPs(cookieValue(bank));
        reindeer = reindeerCps(Game.elderWrath);
        var w = wrinklerMod(liveWrinklers().length);
        wrinklers = Math.max(0, baseCps() * (w - 1));
        buildings = baseCps();
    } catch (e) {}
    if (FCP.cookieRate) clicking = Math.max(0, FCP.cookieRate() - Game.cookiesPs);
    out.push(["Buildings", buildings], ["Golden cookies (average)", golden], ["Clicking", clicking],
        ["Wrinklers (when popped)", wrinklers], ["Reindeer (average)", reindeer]);
    return out.filter(function (x) { return x[1] > 0; });
};

FCP.breakdownHtml = function () {
    var bar = function (label, value, total, color) {
        var p = total > 0 ? value / total : 0;
        return '<div style="display:flex;align-items:center;gap:8px;margin:3px 0;font-size:12px;line-height:14px;">' +
            '<span style="flex:0 0 170px;">' + label + "</span>" +
            '<span style="flex:1 1 auto;height:10px;background:rgba(255,255,255,0.08);position:relative;">' +
            '<span style="position:absolute;left:0;top:0;bottom:0;width:' + (p * 100).toFixed(2) + "%;background:" + color + ';"></span></span>' +
            '<span style="flex:0 0 140px;text-align:right;">' + FCP.num(value) + "/s · " + FCP.pct(p) + "</span></div>";
    };
    var sources = FCP.incomeBreakdown();
    var total = sources.reduce(function (s, x) { return s + x[1]; }, 0);
    var html = "<b>By source</b> (total " + FCP.num(total) + "/s)";
    sources.forEach(function (x) { html += bar(x[0], x[1], total, "#ffd54f"); });
    var blds = Game.ObjectsById.filter(function (o) { return o.amount > 0; })
        .map(function (o) { return [o.name + " ×" + o.amount, (o.storedTotalCps || 0) * Game.globalCpsMult, o]; })
        .sort(function (a, b) { return b[1] - a[1]; });
    var bTotal = blds.reduce(function (s, x) { return s + x[1]; }, 0);
    html += '<div style="margin-top:6px;"><b>By building</b> (colour = how good one more is right now)</div>';
    blds.forEach(function (x) {
        html += bar(x[0], x[1], bTotal, FCP.ratingOf(FCP.insight.byKey["building:" + x[2].id]).color);
    });
    return html;
};

FCP.addTask("insight", function () { return true; }, FCP.insightTick, 1000);
