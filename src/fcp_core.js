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
    },
    achievementTricks: {
        hint: "UI tricks: fake a squished window for 'Stifling the press' and a short one for 'Cookie-dunker', and hold the mouse on a Santa's helper grandma at Christmas for 'Baby it's old outside'. Only for the moment the game checks.",
        display: ["UI tricks OFF", "UI tricks ON"],
        default: 0,
    },
    shadowAchievements: {
        hint: "Shadow achievements: God complex (renamed for an instant), In her likeness (You customizer, then your look is restored), Last Chance to See (pop the shiny wrinkler), When the cookies ascend just right (bank set to exactly 1 trillion before ascending).",
        display: ["Shadow achievements OFF", "Shadow achievements ON"],
        default: 0,
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
        hint: "Buy Elder Pledge 5 times and the Elder Covenant once (then revoke it) for their achievements. Pauses wrinklers for a while.",
        display: ["Elder Pledge achievements OFF", "Elder Pledge achievements ON"],
        default: 0,
    },
    challengeRuns: {
        hint: "Neverclick, True Neverclick, Speed baking and Hardcore only count in a Born Again run (or before the first ascension). When FC reincarnates and one is missing, it does a Born Again run: first without clicking (Neverclick), then clicking flat out for 1 million cookies within 15 minutes (Speed baking), then ascends back. Hardcore (no upgrades until 1 billion) takes a few hours.",
        display: [
            "Challenge runs OFF",
            "Challenge runs NEVERCLICK + SPEED BAKING",
            "Challenge runs NEVERCLICK + SPEED BAKING + HARDCORE",
        ],
        default: 0,
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
    },
    autoGarden: {
        hint: "Garden bot: breed and unlock every seed, then keep the plot full for the harvest achievements.",
        display: [
            "Auto-garden OFF",
            "Auto-garden UNLOCK SEEDS",
            "Auto-garden UNLOCK SEEDS + SACRIFICE ONCE (Seedless to nay)",
        ],
        default: 0,
    },
    autoStocks: {
        hint: "Trade stock market goods: buy well below resting value, sell well above. Only spends cookies FC isn't keeping in the bank.",
        display: ["Auto-stocks OFF", "Auto-stocks ON"],
        default: 0,
    },
    measuredClicks: {
        hint: "Use the measured click speed (real clicks per second, often far below the setting) for time estimates and for how FC values click upgrades.",
        display: ["Measured click speed OFF", "Measured click speed ON"],
        default: 1,
    },
    insights: {
        hint: "Cookie Monster-style insight: colour every building and upgrade by how good a buy it is, show income gain and share on building rows, details in tooltips, and where your cookies come from in this menu.",
        display: ["Store insight OFF", "Store insight ON"],
        default: 1,
    },
    firstRunScoring: {
        hint: "First-run scoring: before your first ascension, rate purchases by Cookie Monster's payback period (only the cookies still missing count). Measured +52% cookies at 30 min, +16% at 1 h on a new save; not used after an ascension, where it didn't help.",
        display: ["First-run scoring OFF", "First-run scoring ON"],
        default: 0,
    },
    smartBulk: {
        hint: "Smart bulk buy: with the store on x10/x100, buy only as many buildings as fit above the golden cookie bank and are still the best value (see fcp_bulk.js).",
        display: ["Smart bulk buy OFF", "Smart bulk buy ON"],
        default: 0,
    },
    smartAuras: {
        hint: "Smart dragon auras: always the best auras your dragon knows, worked out from your production and clicking (FC's own setting waits for two fixed auras, so a young dragon has none). Switches when a better one is learned or the second slot opens; each switch costs one of your most expensive buildings, as in the game (see fcp_dragon.js).",
        display: ["Smart dragon auras OFF", "Smart dragon auras ON"],
        default: 0,
    },
    smartAscend: {
        hint: "Smart ascension: first ascension at 440 prestige levels, then whenever ascending doubles your prestige; waits out Frenzies and click buffs and pops the wrinklers first. On the ascension screen FC+ buys the heavenly upgrades (most useful first) before reincarnating, for every ascension it makes itself. Replaces FC's own Auto Ascend while on (see fcp_ascend.js).",
        display: ["Smart ascension OFF", "Smart ascension ON"],
        default: 0,
    },
    bankRules: {
        hint: "Bank rules: FC's extra upgrades, the Halloween switch and reward cookie buildings wait for the golden cookie bank; the Golden switch and the Godzamok combo only fire when the extra clicking (at your measured click speed) beats their cost; the Easter switch during a Cookie Storm only while cheap (see fcp_bankrules.js).",
        display: ["Bank rules OFF", "Bank rules ON"],
        default: 0,
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
    FrozenCookies.preferenceValues = out;
})();

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

// Cookies FC is willing to part with right now (what it is not keeping
// as a golden cookie bank).
FCP.spare = function () {
    var keep = 0;
    try {
        keep = delayAmount() || 0;
    } catch (e) {
        keep = 0;
    }
    if (!isFinite(keep)) keep = 0;
    return Math.max(0, Game.cookies - keep);
};

// True if spending `cost` is fine: either it comes out of spare cookies or
// it is negligible compared to the bank.
FCP.canSpend = function (cost) {
    return cost <= FCP.spare() || cost <= Game.cookies * 0.02;
};

FCP.busy = function () {
    return Game.OnAscend || Game.AscendTimer || !Game.ready;
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
        FrozenCookies.achievementHunter = 1;
        FrozenCookies.achievementTricks = 1;
        FrozenCookies.shadowAchievements = 1;
        FrozenCookies.elderPledgeAchievs = 1;
        FrozenCookies.challengeRuns = 1;
        FrozenCookies.autoLumps = 2;
        FrozenCookies.autoGarden = 1;
        FrozenCookies.autoStocks = 1;
        FrozenCookies.smartBulk = 1;
        FrozenCookies.bankRules = 1;
        FrozenCookies.smartAscend = 1;
        FrozenCookies.smartAuras = 1;
        FrozenCookies.firstRunScoring = 1;
        FrozenCookies.measuredClicks = 1;
        FrozenCookies.insights = 1;
        // Building levels are worth more than the Sugar Baking bonus once
        // you are chasing level 10 achievements.
        FrozenCookies.sugarBakingGuard = 0;
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
    var fn = Game.UpdateMenu;
    if (!fn || fn.__fcp) return;
    var wrapped = function () {
        var r = fn.apply(this, arguments);
        if (Game.onMenu === "fc_menu") {
            try {
                FCP.appendMenu();
            } catch (e) {
                console.error("[FC+] menu", e);
            }
        }
        return r;
    };
    wrapped.__fcp = true;
    Game.UpdateMenu = wrapped;
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
        Object.keys(report.groups)
            .sort()
            .forEach(function (group) {
                var items = report.groups[group];
                var box = $("<div>").addClass("listing");
                box.append($("<b>").text(group + " (" + items.length + ")"));
                var ul = $("<ul>").css({ margin: "2px 0 6px 18px", "list-style": "disc" });
                items.forEach(function (a) {
                    ul.append(
                        $("<li>")
                            .css({ "font-size": "11px" })
                            .html("<b>" + a.dname + "</b> — " + a.text + (a.hint ? ' <i style="opacity:0.7">(' + a.hint + ")</i>" : ""))
                    );
                });
                box.append(ul);
                section.append(box);
            });
    }
    var first = menu.children(".subsection").first();
    if (first.length) first.after(section);
    else menu.append(section);
    if (FrozenCookies.insights && FCP.breakdownHtml) {
        var income = $("<div>").addClass("subsection").attr("id", "fcpIncome");
        income.append($("<div>").addClass("title").text("Where your cookies come from (FC+)"));
        income.append($("<div>").addClass("listing").html(FCP.breakdownHtml()));
        section.after(income);
    }
};

FCP.status = {}; // module name -> short status text shown in the menu
