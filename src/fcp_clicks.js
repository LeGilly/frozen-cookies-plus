// Frozen Cookies Plus — measured click speed.
// The autoclicker is set to e.g. 250 clicks/s, but browsers throttle timers, so the real rate is
// often far lower. FC+ counts real big cookie clicks (Game.cookieClicks) over the last 30 seconds
// and uses that rate for time estimates and for FC's purchase scoring (click upgrades are valued
// at the clicking you actually get). Click frenzy clicking is scaled by the same ratio.

FCP.clicks = { samples: [], measured: null };

FCP.clickTick = function () {
    var now = Date.now();
    var s = FCP.clicks.samples;
    s.push({ t: now, clicks: Game.cookieClicks, frenzy: clickBuffBonus() > 1 });
    while (s.length && now - s[0].t > 30000) s.shift();
    // Only measure plain autoclicking: no click buffs in the window, and clicking actually allowed.
    var clean = s.every(function (x) { return !x.frenzy; });
    var autoclicking = FrozenCookies.autoClick && FrozenCookies.cookieClickSpeed && !(FCP.noClickActive && FCP.noClickActive());
    if (!autoclicking || !clean || s.length < 2) return;
    var span = (s[s.length - 1].t - s[0].t) / 1000;
    var n = s[s.length - 1].clicks - s[0].clicks;
    if (span >= 10 && n >= 0) FCP.clicks.measured = n / span;
};

// Clicks per second really happening (null until measured).
FCP.measuredClickRate = function () {
    return FCP.clicks.measured;
};

// Ratio between real and configured autoclicking, at most 1.
FCP.clickRatio = function () {
    var m = FCP.clicks.measured,
        set = FrozenCookies.cookieClickSpeed;
    if (m === null || !(set > 0)) return 1;
    return Math.max(0, Math.min(1, m / set));
};

var _fcpOriginalBaseClickingCpsForRate = baseClickingCps;
baseClickingCps = function (clickSpeed) {
    if (clickSpeed > 0 && FrozenCookies.measuredClicks) clickSpeed *= FCP.clickRatio();
    return _fcpOriginalBaseClickingCpsForRate.call(this, clickSpeed);
};

// Cookies per second actually being made: buildings, plus the autoclicker at its real speed,
// only while it is really clicking (used by the infobox time estimates).
FCP.cookieRate = function () {
    var rate = Game.cookiesPs;
    var clicking = FrozenCookies.autoClick && FrozenCookies.cookieClickSpeed && !(FCP.noClickActive && FCP.noClickActive());
    if (clicking) {
        var speed = FrozenCookies.cookieClickSpeed;
        if (FrozenCookies.measuredClicks && FCP.clicks.measured !== null) speed = FCP.clicks.measured;
        rate += Game.computedMouseCps * speed;
    }
    return rate;
};

FCP.addTask("clicks", function () { return true; }, FCP.clickTick, 1000);
