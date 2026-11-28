// Frozen Cookies Plus — core
// Adds new preferences to the Frozen Cookies menu, a scheduler for the
// Plus modules and a few shared helpers. Loaded after the upstream FC
// scripts and before the mod is registered.

var FCP = window.FCP || {};
window.FCP = FCP;

FCP.bots = FCP.bots || {};
FCP.ui = FCP.ui || { showMissing: false };

// ---------------------------------------------------------------------------
// Preferences (inserted into the FC menu just before "Display options")
// ---------------------------------------------------------------------------
FCP.preferenceValues = {
    fcpOptions: {
        hint: "Frozen Cookies Plus — achievements & extra automation:",
    },
    achievementHunter: {
        hint: "Earn interaction achievements automatically (news ticker, bakery name, tiny cookie, madeleine, selling a grandma, wrinkler poking, unripe lump, loan before ascending...).",
        display: ["Achievement Hunter OFF", "Achievement Hunter ON"],
        default: 0,
        recommended: 1,
    },
    achievementTricks: {
        hint: "UI tricks: fake a squished window for 'Stifling the press' and a short one for 'Cookie-dunker', and hold the mouse on a Santa's helper grandma at Christmas for 'Baby it's old outside'. Only for the moment the game checks.",
        display: ["UI tricks OFF", "UI tricks ON"],
        default: 0,
        recommended: 1,
    },
    shadowAchievements: {
        hint: "Shadow achievements: God complex (renamed for an instant), In her likeness (You customizer, then your look is restored), Last Chance to See (pop the shiny wrinkler), When the cookies ascend just right (bank set to exactly 1 trillion before ascending).",
        display: ["Shadow achievements OFF", "Shadow achievements ON"],
        default: 0,
        recommended: 1,
    },
    ascensionMarathon: {
        hint: "Endless cycle: ascend 1,000 times. The game only counts an ascension that gains a prestige level, so FC ascends as soon as the run is worth one more level. Each run is very short, so the run's own progress is lost every time: best late in the game, when a level takes seconds.",
        display: ["Ascension marathon OFF", "Ascension marathon ON"],
        default: 0,
    },
    cheatAchievement: {
        hint: "Cheats for one achievement check, put back right after: Cheated cookies taste awful (a bank a hair over everything ever baked) and Four-leaf cookie (4 golden cookies counted on screen). Golden cookies only come one at a time, and Cookie Storm drops don't count. Off unless you turn it on.",
        display: ["Cheat achievements OFF", "Cheat achievements ON"],
        default: 0,
    },
    elderPledgeAchievs: {
        hint: "Buys Elder Pact once researched, then pledges 10 times in each run (Elder nap, Elder slumber, Elder calm, and the Sacrificial rolling pins upgrade) by cycling Elder Pledge, Elder Covenant and Revoke: buying the Covenant ends the pledge and revoking it brings the Pledge back, so it takes under a minute instead of 5 hours. Each pledge pops the wrinklers, so it waits while one is being poked.",
        display: ["Elder Pledge achievements OFF", "Elder Pledge achievements ON"],
        default: 0,
        recommended: 1,
    },
    challengeRuns: {
        hint: "Neverclick, True Neverclick, Speed baking and Hardcore only count in a Born Again run (or before the first ascension). When FC reincarnates and one is missing, it does a Born Again run: first without clicking (Neverclick), then clicking flat out for 1 million cookies within 15 minutes (Speed baking), then ascends back. Hardcore (no upgrades until 1 billion) takes a few hours.",
        display: [
            "Challenge runs OFF",
            "Challenge runs NEVERCLICK + SPEED BAKING",
            "Challenge runs NEVERCLICK + SPEED BAKING + HARDCORE",
        ],
        default: 0,
        recommended: 1,
    },
    autoLumps: {
        hint: "Spend sugar lumps on building levels (minigames first, then every building to level 10 for its achievement).",
        display: [
            "Auto-lumps OFF",
            "Auto-lumps MINIGAMES ONLY",
            "Auto-lumps LEVEL 10 (achievements)",
            "Auto-lumps LEVEL 10 THEN KEEP LEVELLING",
        ],
        default: 0,
        recommended: 2,
    },
    autoGarden: {
        hint: "Garden bot: breed and unlock every seed, then keep the plot full for the harvest achievements.",
        display: [
            "Auto-garden OFF",
            "Auto-garden UNLOCK SEEDS",
            "Auto-garden UNLOCK SEEDS + SACRIFICE ONCE (Seedless to nay)",
        ],
        default: 0,
        recommended: 1,
    },
    autoStocks: {
        hint: "Trade stock market goods: buy well below resting value, sell well above. Only spends cookies FC isn't keeping in the bank.",
        display: ["Auto-stocks OFF", "Auto-stocks ON"],
        default: 0,
        recommended: 1,
    },
    measuredClicks: {
        hint: "Use the measured click speed (real clicks per second, often far below the setting) for time estimates and for how FC values click upgrades.",
        display: ["Measured click speed OFF", "Measured click speed ON"],
        default: 1,
        recommended: 1,
    },
    insights: {
        hint: "Cookie Monster-style insight: colour every building and upgrade by how good a buy it is, show income gain and share on building rows, details in tooltips, and where your cookies come from in this menu.",
        display: ["Store insight OFF", "Store insight ON"],
        default: 1,
        recommended: 1,
    },
    firstRunScoring: {
        hint: "First-run scoring: before your first ascension, rate purchases by Cookie Monster's payback period (only the cookies still missing count). Measured +52% cookies at 30 min, +16% at 1 h on a new save; not used after an ascension, where it didn't help.",
        display: ["First-run scoring OFF", "First-run scoring ON"],
        default: 0,
        recommended: 1,
    },
    smartBulk: {
        hint: "Smart bulk buy: FC+ decides how many of a building FC buys (up to 100, whatever the store's x1/x10/x100 button shows): as many as fit above the golden cookie bank, are still the best value and stay within FC's building limits (see fcp_bulk.js).",
        display: ["Smart bulk buy OFF", "Smart bulk buy ON"],
        default: 0,
        recommended: 1,
    },
    researchScoring: {
        hint: "Research chain scoring: the Bingo center and each research upgrade are valued with the upgrades they lead to (+15% production in all, and grandma boosts), not only their own small effect, so research starts early (see fcp_scoring.js).",
        display: ["Research chain scoring OFF", "Research chain scoring ON"],
        default: 0,
        recommended: 1,
    },
    dragonTiming: {
        hint: "Dragon training timing: a level that takes 100 of a building (or 50/200 of every building) waits until buying them back costs under 10 minutes of income; levels that cost cookies wait for the golden cookie bank. FC trained as soon as it could, whatever the buildings cost (see fcp_dragon.js).",
        display: ["Dragon training timing OFF", "Dragon training timing ON"],
        default: 0,
        recommended: 1,
    },
    burstBuy: {
        hint: "Burst buying: when far more cookies than the next purchase come in at once (a big golden cookie, a combo), buy several things per round and buildings by the dozen, with one recalculation, instead of one at a time. Anything costing under 1% of the spare cookies is bought straight away (early in a run: 100 of each building at once). Slightly less exact, much faster (see fcp_bulk.js).",
        display: ["Burst buying OFF", "Burst buying ON"],
        default: 0,
        recommended: 1,
    },
    smartAuras: {
        hint: "Smart dragon auras: always the best auras your dragon knows, worked out from your production and clicking (FC's own setting waits for two fixed auras, so a young dragon has none). Switches when a better one is learned or the second slot opens; each switch costs one of your most expensive buildings, as in the game (see fcp_dragon.js).",
        display: ["Smart dragon auras OFF", "Smart dragon auras ON"],
        default: 0,
        recommended: 1,
    },
    smartAscend: {
        hint: "Smart ascension: first ascension at 440 prestige levels, then whenever ascending doubles your prestige; waits out Frenzies and click buffs and pops the wrinklers first. On the ascension screen FC+ buys the heavenly upgrades (most useful first) before reincarnating, for every ascension it makes itself. Replaces FC's own Auto Ascend while on (see fcp_ascend.js).",
        display: ["Smart ascension OFF", "Smart ascension ON"],
        default: 0,
        recommended: 1,
    },
    smartCaps: {
        hint: "Building caps for achievements: FC's Mine and Factory limits (500, for Godzamok) and Wizard tower cap (37 max magic) block the building count achievements and the butter biscuits up to 700. Once buying up to 700 is cheap, FC+ raises them to 700 while FC decides; your settings stay as they are (see fcp_bulk.js).",
        display: ["Achievement building caps OFF", "Achievement building caps ON"],
        default: 0,
        recommended: 1,
    },
    smartSeason: {
        hint: "Smart season: the season FC rests in once it has the drops is chosen by what pays. Christmas while this run still needs it (200 reindeer, Santa's levels, the reindeer drops), then the season with the most extra income: reindeer in Christmas, or more golden cookies with a Star heavenly upgrade (Startrade: +5% in Business Day; Starspawn, Starterror, Starlove: +2%). Needs Autobuy Seasons (see fcp_season.js).",
        display: ["Smart season OFF", "Smart season ON"],
        default: 0,
        recommended: 1,
    },
    bankRules: {
        hint: "Bank rules: FC's extra upgrades, the Halloween switch and reward cookie buildings wait for the golden cookie bank; the Golden switch and the Godzamok combo only fire when the extra clicking (at your measured click speed) beats their cost; the Easter switch during a Cookie Storm only while cheap (see fcp_bankrules.js).",
        display: ["Bank rules OFF", "Bank rules ON"],
        default: 0,
        recommended: 1,
    },
};

(function insertPreferences() {
    var src = FrozenCookies.preferenceValues;
    var out = {};
    var inserted = false;
    Object.keys(src).forEach(function (key) {
        if (key === "displayOptions" && !inserted) {
            Object.keys(FCP.preferenceValues).forEach(function (k) {
                out[k] = FCP.preferenceValues[k];
            });
            inserted = true;
        }
        out[key] = src[key];
    });
    if (!inserted) {
        Object.keys(FCP.preferenceValues).forEach(function (k) {
            out[k] = FCP.preferenceValues[k];
        });
    }
    // "Recommended" (one press sets everything) goes first instead of last.
    if (out.recommendedSettings) {
        var first = { recommendedSettings: out.recommendedSettings };
        Object.keys(out).forEach(function (k) {
            if (k !== "recommendedSettings") first[k] = out[k];
        });
        out = first;
    }
    // A button, not an on/off option: it applies everything once and restarts the game, so as a
    // toggle it always came back showing OFF. The button is added by FCP.addRecommendedButton.
    if (out.recommendedSettings) out.recommendedSettings = { hint: "Recommended options" };
    FrozenCookies.preferenceValues = out;
})();

FCP.applyRecommended = function () {
    FrozenCookies.recommendedSettings = 1;
    recommendedSettingsAction(); // applies everything, then the game saves and reloads
};

FCP.addRecommendedButton = function () {
    if ($("#fcpRecommendedButton").length) return;
    var heading = $("#menu .fc-section-heading").filter(function () {
        return /^\s*Recommended options\s*$/.test($(this).text());
    }).first();
    if (!heading.length) return;
    heading.after(
        $("<div>").addClass("listing").append(
            $("<label>").addClass("fc-hint-label").text("Sets every FC and FC+ option to its recommended value, then restarts the game."),
            $("<button>")
                .addClass("option fc-multichoice-btn")
                .attr("id", "fcpRecommendedButton")
                .text("Apply recommended options")
                .click(function () { FCP.applyRecommended(); })
        )
    );
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
FCP.log = function (text, popup) {
    try {
        logEvent("FC+", text, popup);
    } catch (e) {
        console.log("[FC+] " + text);
    }
};

// Run a function, never let an exception kill an interval.
FCP.safe = function (name, fn) {
    return function () {
        try {
            fn.apply(this, arguments);
        } catch (e) {
            if (!FCP.safe.reported[name]) {
                FCP.safe.reported[name] = true;
                console.error("[FC+] " + name + " failed:", e);
            }
        }
    };
};
FCP.safe.reported = {};

// Call an FC or game function that may fail (FC's caches not built yet at boot, a minigame not
// loaded): returns `fallback` instead, and reports the first failure of each `name` in the
// console, so a real bug still shows up.
FCP.attempt = function (name, fn, fallback) {
    try {
        return fn();
    } catch (e) {
        if (!FCP.attempt.reported[name]) {
            FCP.attempt.reported[name] = true;
            console.warn("[FC+] " + name + " failed:", e);
        }
        return fallback;
    }
};
FCP.attempt.reported = {};

// The golden cookie bank FC is keeping right now (0 when none, or not known yet).
FCP.bankTarget = function () {
    var keep = FCP.attempt("bank target", function () { return delayAmount(); }, 0);
    return isFinite(keep) && keep > 0 ? keep : 0;
};

// Cookies FC is willing to part with right now (what it is not keeping
// as a golden cookie bank).
FCP.spare = function () {
    return Math.max(0, Game.cookies - FCP.bankTarget());
};

// A value kept in the browser across reloads, as JSON: FCP.store(key) reads it (null when
// missing), FCP.store(key, value) writes it, FCP.store(key, null) removes it. The browser may
// refuse storage: reads then give null and writes are skipped.
FCP.store = function (key, value) {
    try {
        if (value === undefined) return JSON.parse(localStorage.getItem(key) || "null");
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
        if (value === undefined) return null;
    }
    return value;
};

// A stored object that only lasts for the current run (reset at ascension): `fresh` gives its
// starting fields. Save it back with FCP.store(key, data).
FCP.runStore = function (key, fresh) {
    var run = String(Game.startDate), data = FCP.store(key);
    if (!data || typeof data !== "object" || data.run !== run) {
        data = fresh || {};
        data.run = run;
    }
    return data;
};

// Wrap a game or FC function once: obj[name] = make(original). Markers of earlier FC+ wrappers
// (__fcp...) are carried over, so wrappers from different modules recognise each other.
FCP.wrapOnce = function (obj, name, tag, make) {
    var original = obj[name];
    if (!original || original["__fcp_" + tag]) return false;
    var wrapped = make(original);
    Object.keys(original).forEach(function (k) {
        if (k.indexOf("__fcp") === 0) wrapped[k] = original[k];
    });
    wrapped["__fcp_" + tag] = true;
    obj[name] = wrapped;
    return true;
};

// True if spending `cost` is fine: either it comes out of spare cookies or
// it is negligible compared to the bank.
FCP.canSpend = function (cost) {
    return cost <= FCP.spare() || cost <= Game.cookies * 0.02;
};

FCP.busy = function () {
    return Game.OnAscend || Game.AscendTimer || !Game.ready;
};

// Text to show as HTML.
FCP.escape = function (t) {
    return String(t).replace(/[&<>"]/g, function (ch) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch];
    });
};

FCP.has = function (name) {
    return !!(Game.Achievements[name] && Game.Achievements[name].won);
};

// ---------------------------------------------------------------------------
// Scheduler: (re)start the Plus bots every time FC restarts its own
// ---------------------------------------------------------------------------
FCP.tasks = []; // {name, pref, test(), fn, every}
FCP.addTask = function (name, test, fn, every) {
    // Cookies spent by a task are filed under "FC+ (name)" (see fcp_bankwatch.js).
    var run = function () {
        var keep = FCP.spendSource;
        if (!keep) FCP.spendSource = "FC+ (" + name + ")";
        try {
            return fn.apply(this, arguments);
        } finally {
            FCP.spendSource = keep;
        }
    };
    FCP.tasks.push({ name: name, test: test, fn: FCP.safe(name, run), every: every });
};

FCP.restart = function () {
    Object.keys(FCP.bots).forEach(function (k) {
        clearInterval(FCP.bots[k]);
        delete FCP.bots[k];
    });
    FCP.tasks.forEach(function (t) {
        if (!t.test()) return;
        FCP.bots[t.name] = setInterval(t.fn, t.every);
        // Run once right away so statuses show without waiting a full interval.
        setTimeout(t.fn, 0);
    });
};

var _fcpOriginalFCStart = FCStart;
FCStart = function () {
    var r = _fcpOriginalFCStart.apply(this, arguments);
    FCP.restart();
    FCP.patchMenu();
    return r;
};

// ---------------------------------------------------------------------------
// Recommended settings also switch the Plus features on
// ---------------------------------------------------------------------------
var _fcpOriginalRecommended = recommendedSettingsAction;
recommendedSettingsAction = function () {
    var applying = FrozenCookies.recommendedSettings == 1;
    var r = _fcpOriginalRecommended.apply(this, arguments);
    if (applying) {
        // Every Plus option with a `recommended` value in FCP.preferenceValues (the others, like
        // the Ascension marathon and the cheats, are left as they are).
        Object.keys(FCP.preferenceValues).forEach(function (k) {
            var value = FCP.preferenceValues[k].recommended;
            if (value !== undefined) FrozenCookies[k] = value;
        });
        // Start in Christmas: 200 reindeer and Santa's last level must happen within one run.
        // Smart season then picks the season that pays once those are done (fcp_season.js):
        // reindeer early, when production is most of the income; Business Day with Startrade
        // late, when golden cookies are. FC still visits the other seasons for their drops.
        FrozenCookies.defaultSeason = 2;
        // Building levels are worth more than the Sugar Baking bonus once
        // you are chasing level 10 achievements.
        FrozenCookies.sugarBakingGuard = 0;
        // FC's keyboard shortcuts act on a single key anywhere on the game screen, and R resets
        // the run at once, without asking: one stray key costs a whole run. Off.
        FrozenCookies.FCshortcuts = 0;
        // FC's Auto Bulkbuy clicks the store's x100 button after every ascension. With smart bulk,
        // FC+ decides how many to buy whatever the button shows (fcp_bulk.js), so the button only
        // changes the prices the store displays: leave it where you put it (x1: prices per unit).
        FrozenCookies.autoBulk = 0;
        // recommendedSettingsAction sets recommendedSettings to 0 before the
        // menu can save, so save explicitly.
        Game.toSave = true;
    }
    return r;
};

// ---------------------------------------------------------------------------
// Menu: add the achievement tracker under the FC info section
// ---------------------------------------------------------------------------
FCP.patchMenu = function () {
    FCP.wrapOnce(Game, "UpdateMenu", "menu", function (original) {
        return function () {
            var r = original.apply(this, arguments);
            if (Game.onMenu === "fc_menu")
                FCP.attempt("menu", function () {
                    FCP.addRecommendedButton();
                    FCP.appendMenu();
                });
            return r;
        };
    });
};

// Golden cookies and reindeer spawn the game's way: no chance before the earliest frame `min`,
// then each frame a chance of ((frame - min) / (max - min))^5, sure at `max`. The frame by
// which one has come with even odds, counting from frame `from` with none so far.
FCP.medianSpawnFrame = function (min, max, from) {
    var survive = 1, frame = from || 0;
    while (frame < max) {
        frame++;
        var p = frame > min ? Math.pow((frame - min) / (max - min), 5) : 0;
        survive *= 1 - Math.min(1, p);
        if (survive <= 0.5) return frame;
    }
    return max;
};

// A duration as its two largest units ("2h 58m", "40m 15s"): every time FC+ shows uses this.
FCP.shortTime = function (sec) {
    if (!isFinite(sec)) return "never";
    sec = Math.max(0, Math.ceil(sec));
    var units = [["y", 31536000], ["d", 86400], ["h", 3600], ["m", 60], ["s", 1]], parts = [];
    for (var i = 0; i < units.length && parts.length < 2; i++) {
        var n = Math.floor(sec / units[i][1]);
        if (n > 0 || parts.length) { parts.push(n + units[i][0]); sec -= n * units[i][1]; }
    }
    return parts.length ? parts.filter(function (p, i) { return i === 0 || p[0] !== "0"; }).join(" ") : "0s";
};

// Upgrades owned this run, and where each missing one comes from (fcp_upgrades.js).
FCP.appendUpgradeTracker = function (section) {
    var report = FCP.upgradeReport();
    section.append(
        $("<div>").addClass("listing").html(
            "<b>Upgrades this run:</b> " + report.owned + " / " + report.total +
            " (heavenly: " + report.heavenlyOwned + " / " + report.heavenlyTotal + ")"
        )
    );
    section.append(
        $("<div>").addClass("listing").append(
            $("<a>").addClass("option")
                .text(FCP.ui.showMissingUpgrades ? "Hide missing upgrades" : "Show missing upgrades")
                .click(function () {
                    FCP.ui.showMissingUpgrades = !FCP.ui.showMissingUpgrades;
                    Game.UpdateMenu();
                })
        )
    );
    if (!FCP.ui.showMissingUpgrades) return;
    var order = Object.keys(report.groups).sort(function (a, b) { return report.groups[b].length - report.groups[a].length; });
    FCP.appendGroups(section, report.groups, order, function (u) {
        return "<b>" + FCP.escape(u.dname) + "</b>" + (u.hint ? " — " + FCP.escape(u.hint) : "");
    });
};

// A "missing" list in the FC menu: one block per group, its size, then one line per item.
FCP.appendGroups = function (section, groups, order, itemHtml) {
    order.forEach(function (group) {
        var items = groups[group];
        var box = $("<div>").addClass("listing");
        box.append($("<b>").text(group + " (" + items.length + ")"));
        var ul = $("<ul>").css({ margin: "2px 0 6px 18px", "list-style": "disc" });
        items.forEach(function (item) {
            ul.append($("<li>").css({ "font-size": "11px" }).html(itemHtml(item)));
        });
        box.append(ul);
        section.append(box);
    });
};

FCP.appendMenu = function () {
    var menu = $("#menu");
    if (!menu.length || $("#fcpAchievements").length) return;
    var section = $("<div>").addClass("subsection").attr("id", "fcpAchievements");
    section.append($("<div>").addClass("title").text("Achievement tracker (FC+)"));
    var report = FCP.achievementReport();
    section.append(
        $("<div>")
            .addClass("listing")
            .html(
                "<b>Achievements:</b> " +
                    report.won +
                    " / " +
                    report.total +
                    " (shadow: " +
                    report.shadowWon +
                    " / " +
                    report.shadowTotal +
                    ")"
            )
    );
    Object.keys(FCP.status).forEach(function (k) {
        if (FCP.status[k])
            section.append(
                $("<div>")
                    .addClass("listing")
                    .html("<b>" + k + ":</b> " + FCP.status[k])
            );
    });
    section.append(
        $("<div>")
            .addClass("listing")
            .append(
                $("<a>")
                    .addClass("option")
                    .text(FCP.ui.showMissing ? "Hide missing achievements" : "Show missing achievements")
                    .click(function () {
                        FCP.ui.showMissing = !FCP.ui.showMissing;
                        Game.UpdateMenu();
                    })
            )
    );
    if (FCP.ui.showMissing) {
        // Names and descriptions come from the game, which writes them as HTML (entities
        // included): shown as they are, the description with its tags already stripped.
        FCP.appendGroups(section, report.groups, Object.keys(report.groups).sort(), function (a) {
            return "<b>" + a.dname + "</b> — " + a.text + (a.hint ? ' <i style="opacity:0.7">(' + FCP.escape(a.hint) + ")</i>" : "");
        });
    }
    FCP.appendUpgradeTracker(section);
    var first = menu.children(".subsection").first();
    if (first.length) first.after(section);
    else menu.append(section);
    if (FrozenCookies.insights) {
        var income = $("<div>").addClass("subsection").attr("id", "fcpIncome");
        income.append($("<div>").addClass("title").text("Where your cookies come from (FC+)"));
        income.append($("<div>").addClass("listing").html(FCP.breakdownHtml()));
        section.after(income);
    }
};

FCP.status = {}; // module name -> short status text shown in the menu
