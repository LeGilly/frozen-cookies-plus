// Frozen Cookies Plus — loader.
// Works two ways:
//  * Steam / bundled: tools/build.mjs puts every library and script into one
//    main.js together with window.FCP_BUNDLE, so nothing is downloaded.
//  * Web: Game.LoadMod("<baseUrl>/frozen_cookies.js") fetches the files
//    from the same folder as this script.

// Tested on Steam 2.053 (= web 2.052 content) and web 2.058.
var steamGameVersion = 2.053; // written to Steam info.txt
var lastCompatibleVersion = 2.058;
if (typeof Game !== "undefined" && Game.version > lastCompatibleVersion) {
    console.log(
        "WARNING: The Cookie Clicker version is newer than this version of Frozen Cookies Plus (tested through " +
            lastCompatibleVersion +
            "). There may be bugs."
    );
}

var scriptElement =
    document.getElementById("frozenCookieScript") ||
    document.getElementById("modscript_frozen_cookies_plus") ||
    document.querySelector('script[src*="frozen_cookies.js"]');
var baseUrl =
    scriptElement && scriptElement.getAttribute("src")
        ? scriptElement.getAttribute("src").replace(/\/frozen_cookies\.js(\?.*)?$/, "")
        : "";

var FrozenCookies = {
    baseUrl: baseUrl,
    branch: "plus",
    version: "1.1.3", // keep in sync with Steam info.txt (tools/build.mjs reads it from here)
    upstreamVersion: "erb-2.052.8",
    modId: "frozen_cookies_plus",
};

// Load order matters: preferences first, then FC, then the Plus modules.
var fcVendorList = [
    "vendor/jquery-ui.min.js",
    "vendor/jquery-ui.min.css",
    "vendor/underscore-min.js",
    "vendor/jcanvas.min.js",
    "vendor/jquery.jqplot.min.js",
    "vendor/jquery.jqplot.min.css",
    "vendor/jqplot.canvasTextRenderer.js",
    "vendor/jqplot.canvasAxisLabelRenderer.js",
    "vendor/jqplot.canvasAxisTickRenderer.js",
    "vendor/jqplot.trendline.js",
    "vendor/jqplot.highlighter.js",
    "vendor/jqplot.logAxisRenderer.js",
    "vendor/jqplot.cursor.js",
];
var fcScriptList = [
    "src/fc_preferences.js",
    "src/cc_upgrade_prerequisites.js",
    "src/fc_main.js",
    "src/fc_gods.js",
    "src/fc_spells.js",
    "src/fc_bank.js",
    "src/fc_button.js",
    "src/fc_infobox.js",
    "src/fcp_core.js",
    "src/fcp_achievements.js",
    "src/fcp_lumps.js",
    "src/fcp_market.js",
    "src/fcp_garden.js",
    "src/fcp_infobox.js",
];

function fcAddCss(text) {
    var style = document.createElement("style");
    style.textContent = text;
    document.head.appendChild(style);
}

// Libraries run with module/exports/define hidden so their UMD wrappers
// attach to window even inside Electron (Steam).
function fcRunLibrary(name, code) {
    new Function("module", "exports", "define", code + "\n//# sourceURL=fcp/" + name).call(window);
}

// FC scripts must run in the global scope (they declare global functions).
function fcRunScript(name, code) {
    (0, eval)(code + "\n//# sourceURL=fcp/" + name);
}

function fcFinishLoading() {
    registerMod(FrozenCookies.modId);
}

function fcLoadBundled() {
    var files = window.FCP_BUNDLE.files;
    for (var i = 0; i < files.length; i++) {
        var name = files[i][0],
            code = files[i][1];
        if (name === "vendor/jquery.min.js" && window.jQuery) continue; // another mod already loaded it
        if (/\.css$/.test(name)) fcAddCss(code);
        else if (/^vendor\//.test(name)) fcRunLibrary(name, code);
        else fcRunScript(name, code);
    }
    fcFinishLoading();
}

function fcLoadRemote() {
    var all = fcVendorList.concat(fcScriptList);
    var next = function (i) {
        if (i >= all.length) return fcFinishLoading();
        var url = FrozenCookies.baseUrl + "/" + all[i];
        if (/\.css$/.test(url)) {
            $("<link>").attr({ rel: "stylesheet", type: "text/css", href: url }).appendTo("head");
            next(i + 1);
        } else {
            $.ajax({ url: url, dataType: "text", cache: true })
                .done(function (code) {
                    if (/^vendor\//.test(all[i])) fcRunLibrary(all[i], code);
                    else fcRunScript(all[i], code);
                    next(i + 1);
                })
                .fail(function () {
                    console.error("[FC+] could not load " + url);
                    next(i + 1);
                });
        }
    };
    next(0);
}

function fcInit() {
    if (window.FCP_BUNDLE) return fcLoadBundled();
    var jq = document.createElement("script");
    jq.src = FrozenCookies.baseUrl + "/vendor/jquery.min.js";
    jq.onload = fcLoadRemote;
    document.head.appendChild(jq);
}

FrozenCookies.loadInterval = setInterval(function () {
    if (typeof Game !== "undefined" && Game.ready) {
        clearInterval(FrozenCookies.loadInterval);
        FrozenCookies.loadInterval = 0;
        fcInit();
    }
}, 250);
