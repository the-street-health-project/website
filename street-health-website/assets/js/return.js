/* The Street Health Project: the trip back from NiFi (5 seconds).
   Going into NiFi is a dive into water (nifi.js). Coming back is a heartbeat instead:
     1. a green heart-monitor line draws across the dark screen; the screen glows red on each beat,
     2. the line turns red and snaps into a point in the middle,
     3. a red shockwave bursts out, and the screen turns over tile by tile behind it: cream on the back,
        and red where the tiles make The Street Health Project's cross,
     4. Care Kit items orbit the cross while a heart draws itself on it, then get pulled into the cross,
     5. the heart beats twice, and the cross flies to the logo's spot in the top-left corner as the
        cream page arrives.
   It plays when you click the logo on NiFi's page here, and when you leave the NiFi app through its
   "A program of The Street Health Project" link: the app loads this same file and calls SHPReturn.play().
   That's why its styles live in this file too. */
(function () {
  "use strict";
  if (window.SHPReturn) return;

  var MS = 5000;
  var CREAM = "#F5E9D0", RED = "#DF513E", BLACK = "#020604";
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // A few things from every Care Kit, orbiting the cross near the end.
  var KIT = ["Bandages", "Gauze", "Toothbrush", "Socks", "Hand sanitizer", "Lip balm", "Medical tape", "Water"];

  // Percentages are moments in the 5 s: 10% = 0.5 s, 50% = 2.5 s, 90% = 4.5 s.
  var CSS =
    ".rt{position:fixed;inset:0;z-index:2147483000;overflow:hidden;contain:strict;cursor:progress}" +
    ".rt>*{position:absolute;pointer-events:none}" +
    ".rt-dark{inset:0;animation:rt-dark " + MS + "ms linear both}" +
    "@keyframes rt-dark{0%{background:rgba(2,6,4,0)}6%,100%{background:rgba(2,6,4,.9)}}" +
    /* the heart monitor: draws across (0.2-1.7 s), turns red, then snaps into the middle */
    ".rt-ecg{left:0;top:50%;width:100%;height:24vh;margin-top:-12vh;overflow:visible;filter:drop-shadow(0 0 6px rgba(57,255,136,.9));" +
      "transform-origin:50% 50%;animation:rt-snap " + MS + "ms linear both}" +
    "@keyframes rt-snap{0%,38%{transform:scaleX(1);opacity:1;animation-timing-function:cubic-bezier(.7,0,.9,.4)}44%{transform:scaleX(0);opacity:1}45%,100%{transform:scaleX(0);opacity:0}}" +
    ".rt-ecg path{fill:none;stroke:#39ff88;stroke-width:3;stroke-linejoin:round;stroke-linecap:round;vector-effect:non-scaling-stroke;" +
      "stroke-dasharray:1;stroke-dashoffset:1;animation:rt-ecg " + MS + "ms linear both}" +
    "@keyframes rt-ecg{0%,4%{stroke-dashoffset:1}34%{stroke-dashoffset:0;stroke:#39ff88}38%,100%{stroke-dashoffset:0;stroke:" + RED + "}}" +
    /* a soft red glow across the screen on each beat, as the line draws through it */
    ".rt-pulse{inset:0;opacity:0;background:radial-gradient(70% 60% at 50% 50%,rgba(223,81,62,.7),rgba(223,81,62,.15) 55%,transparent 80%);animation:rt-pulse " + MS + "ms linear both}" +
    "@keyframes rt-pulse{0%,13%{opacity:0}15%{opacity:1}20%,22%{opacity:0}24%{opacity:1}29%,100%{opacity:0}}" +
    /* the shockwave that sets the tiles turning */
    ".rt-ring{left:var(--cx);top:var(--cy);width:40vmax;height:40vmax;margin:-20vmax 0 0 -20vmax;border-radius:50%;" +
      "border:6px solid " + RED + ";box-shadow:0 0 40px rgba(223,81,62,.8),inset 0 0 30px rgba(223,81,62,.6);opacity:0;animation:rt-ring " + MS + "ms linear both}" +
    "@keyframes rt-ring{0%,43%{transform:scale(0);opacity:0}44%{transform:scale(.02);opacity:1;animation-timing-function:cubic-bezier(.1,.6,.3,1)}62%,100%{transform:scale(3.2);opacity:0}}" +
    /* the tiles: each turns over on a diagonal, with its own perspective, in a wave from the middle */
    ".rt-field,.rt-cross{inset:0}" +
    ".rt-t{position:absolute;transform-style:preserve-3d;animation:rt-flip 700ms cubic-bezier(.3,1.25,.45,1) both;animation-delay:var(--d)}" +
    "@keyframes rt-flip{from{transform:perspective(700px) rotate3d(1,1,0,0deg)}to{transform:perspective(700px) rotate3d(1,1,0,180deg)}}" +
    ".rt-f{position:absolute;inset:-.5px;-webkit-backface-visibility:hidden;backface-visibility:hidden}" +
    ".rt-front{background:" + BLACK + ";box-shadow:inset 0 0 0 1px rgba(57,255,136,.3)}" +
    ".rt-back{transform:rotate3d(1,1,0,180deg);background:var(--c)}" +
    /* once every tile is cream, a solid cream sheet hides the seams between them */
    ".rt-cream{inset:0;background:" + CREAM + ";opacity:0;animation:rt-cream " + MS + "ms linear both}" +
    "@keyframes rt-cream{0%,76%{opacity:0}80%,100%{opacity:1}}" +
    /* the cross (with the heart on it) flies to the logo */
    ".rt-cross{transform-origin:var(--cx) var(--cy);animation:rt-fly " + MS + "ms linear both}" +
    "@keyframes rt-fly{0%,90%{transform:translate(0,0) scale(1);animation-timing-function:cubic-bezier(.6,0,.2,1)}" +
      "99%,100%{transform:translate(var(--fx),var(--fy)) scale(var(--fs))}}" +
    ".rt-heart{position:absolute;left:var(--cx);top:var(--cy);overflow:visible;animation:rt-beat " + MS + "ms linear both}" +
    ".rt-heart path{fill:none;stroke:#FFF6E6;stroke-linejoin:round;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;animation:rt-draw " + MS + "ms linear both}" +
    "@keyframes rt-draw{0%,66%{stroke-dashoffset:1;animation-timing-function:cubic-bezier(.4,0,.2,1)}78%,100%{stroke-dashoffset:0}}" +
    "@keyframes rt-beat{0%,85%{transform:translate(-50%,-50%) scale(1)}87%{transform:translate(-50%,-50%) scale(1.2)}" +
      "89%{transform:translate(-50%,-50%) scale(1)}91%{transform:translate(-50%,-50%) scale(1.14)}93%,100%{transform:translate(-50%,-50%) scale(1)}}" +
    /* Care Kit items orbit the cross (3.1-4.2 s), then get pulled into it. Each label turns back
       against the orbit so it stays upright. */
    ".rt-orbit{left:var(--cx);top:var(--cy);width:0;height:0;opacity:0;animation:rt-orbit " + MS + "ms linear both}" +
    "@keyframes rt-orbit{0%,62%{transform:rotate(-50deg) scale(1.12);opacity:0}67%{opacity:1}84%{transform:rotate(130deg) scale(1);opacity:1;animation-timing-function:cubic-bezier(.6,0,.9,.4)}" +
      "89%,100%{transform:rotate(180deg) scale(0);opacity:0}}" +
    ".rt-item{position:absolute;left:0;top:0;transform:rotate(var(--a)) translate(var(--r)) rotate(calc(-1 * var(--a)))}" +
    /* the span is a zero-size point on the orbit, so turning it keeps the label centered there */
    ".rt-item span{position:absolute;left:0;top:0;width:0;height:0;animation:rt-upright " + MS + "ms linear both}" +
    "@keyframes rt-upright{0%,62%{rotate:50deg}84%{rotate:-130deg;animation-timing-function:cubic-bezier(.6,0,.9,.4)}89%,100%{rotate:-180deg}}" +
    ".rt-item b{position:absolute;left:0;top:0;transform:translate(-50%,-50%);white-space:nowrap;padding:.45em .9em;border-radius:999px;background:#fff;color:#2B241C;" +
      "font:700 clamp(12px,1.6vmin,16px)/1 system-ui,sans-serif;box-shadow:0 0 0 2px " + RED + ",0 10px 24px -8px rgba(43,36,28,.45)}";

  // Two heartbeats across the screen (the path is 1 long, so it can draw itself with a dash).
  var ECG = '<svg class="rt-ecg" viewBox="0 0 1000 200" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="' +
    "M0 100 H290 L306 90 L318 100 H342 L356 28 L372 172 L386 66 L398 100 H560 L576 90 L588 100 H612 L626 28 L642 172 L656 66 L668 100 H1000" +
    '"/></svg>';

  function addStyles() {
    if (document.getElementById("rt-styles")) return;
    var s = document.createElement("style");
    s.id = "rt-styles";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // Where the logo is on the page we're going to. On this site, the logo itself; inside NiFi, where
  // the logo sits on The Street Health Project's pages (left edge of a 1200px column, in a 76px header).
  function logoSpot() {
    var mark = document.querySelector(".brand-mark");
    if (mark) {
      var r = mark.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, size: r.width };
    }
    var W = window.innerWidth;
    var gutter = Math.min(32, Math.max(16, W * 0.04));
    var size = W <= 420 ? 42 : 46;
    return { x: Math.max(0, (W - 1200) / 2) + gutter + size / 2, y: 38, size: size };
  }

  function build() {
    var W = window.innerWidth, H = window.innerHeight;
    // Tiles about a ninth of the short side; a grid laid out so one tile sits exactly in the middle.
    var T = Math.max(36, Math.floor(Math.min(W, H) / 11));
    var ic = Math.ceil((W / 2 - T / 2) / T), jc = Math.ceil((H / 2 - T / 2) / T);
    var ox = W / 2 - T / 2 - ic * T, oy = H / 2 - T / 2 - jc * T;
    var cols = Math.ceil((W - ox) / T), rows = Math.ceil((H - oy) / T);
    var far = Math.hypot(Math.max(ic, cols - 1 - ic), Math.max(jc, rows - 1 - jc)) || 1;
    var field = "", cross = "";
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var di = Math.abs(i - ic), dj = Math.abs(j - jc);
        // The cross: arms 3 tiles wide and 9 tiles long, centered.
        var inCross = (di <= 1 && dj <= 4) || (dj <= 1 && di <= 4);
        // The wave starts with the shockwave (2.2 s) and reaches the corners by about 3.1 s.
        var delay = Math.round(2200 + 900 * (Math.hypot(i - ic, j - jc) / far));
        var tile = '<div class="rt-t" style="left:' + (ox + i * T) + "px;top:" + (oy + j * T) + "px;width:" + T + "px;height:" + T +
          "px;--d:" + delay + "ms;--c:" + (inCross ? RED : CREAM) + '"><div class="rt-f rt-front"></div><div class="rt-f rt-back"></div></div>';
        if (inCross) cross += tile; else field += tile;
      }
    }
    var spot = logoSpot();
    var crossSize = 9 * T;
    var rt = document.createElement("div");
    rt.className = "rt";
    rt.setAttribute("role", "status");
    rt.style.setProperty("--cx", W / 2 + "px");
    rt.style.setProperty("--cy", H / 2 + "px");
    rt.style.setProperty("--fx", spot.x - W / 2 + "px");
    rt.style.setProperty("--fy", spot.y - H / 2 + "px");
    rt.style.setProperty("--fs", String((spot.size * 0.78) / crossSize));
    var heart = Math.round(T * 2.3);
    // The kit items sit evenly around a circle just outside the cross's arms, kept far enough from the
    // screen's edges that a whole label (about 130px wide) always fits.
    var radius = Math.min(4.9 * T, W / 2 - 75, H / 2 - 30);
    var items = KIT.map(function (name, k) {
      return '<div class="rt-item" style="--a:' + (k * 360) / KIT.length + "deg;--r:" + radius + 'px"><span><b>' + name + "</b></span></div>";
    }).join("");
    rt.innerHTML =
      '<span style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Going back to The Street Health Project…</span>' +
      '<div class="rt-dark" aria-hidden="true"></div>' +
      '<div class="rt-field" aria-hidden="true">' + field + "</div>" +
      '<div class="rt-cream" aria-hidden="true"></div>' +
      '<div class="rt-cross" aria-hidden="true">' + cross +
        '<svg class="rt-heart" width="' + heart + '" height="' + heart + '" viewBox="0 0 64 64" aria-hidden="true">' +
          '<path pathLength="1" stroke-width="3.4" d="M32 52c-11-7.4-19-15-19-24.2A10.6 10.6 0 0 1 32 21.3a10.6 10.6 0 0 1 19 6.5C51 37 43 44.6 32 52z"/></svg>' +
      "</div>" +
      // The beat glow sits above the dark tiles; it's gone long before they turn cream.
      '<div class="rt-pulse" aria-hidden="true"></div>' +
      '<div class="rt-ring" aria-hidden="true"></div>' +
      '<div class="rt-orbit" aria-hidden="true">' + items + "</div>" + ECG;
    return rt;
  }

  // Nothing scrolls while it plays; Esc cancels and stays put.
  var overlay = null, timer = 0;
  var SCROLL_KEYS = { " ": 1, ArrowUp: 1, ArrowDown: 1, PageUp: 1, PageDown: 1, Home: 1, End: 1 };
  function block(e) { e.preventDefault(); }
  function onKey(e) {
    if (e.key === "Escape") { reset(); return; }
    if (SCROLL_KEYS[e.key]) e.preventDefault();
  }
  function lock(on) {
    var fn = on ? "addEventListener" : "removeEventListener";
    window[fn]("wheel", block, { passive: false });
    window[fn]("touchmove", block, { passive: false });
    window[fn]("keydown", onKey);
  }
  function reset() {
    window.clearTimeout(timer);
    lock(false);
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
  }

  // Load the page we're going to while the transition plays, so it appears straight away.
  function prerender(url) {
    if (!(window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules"))) return;
    var rules = document.createElement("script");
    rules.type = "speculationrules";
    rules.textContent = JSON.stringify({ prerender: [{ source: "list", urls: [url] }] });
    document.head.appendChild(rules);
  }

  function play(url) {
    if (reduceMotion) { window.location.href = url; return; }
    if (overlay) return;
    addStyles();
    prerender(url);
    overlay = build();
    document.body.appendChild(overlay);
    lock(true);
    timer = window.setTimeout(function () { window.location.href = url; }, MS);
  }

  window.SHPReturn = { play: play };
  // Coming back with the Back button can restore a page mid-transition; put it back to normal.
  window.addEventListener("pageshow", function (e) { if (e.persisted) reset(); });

  // On NiFi's page on this site, the logo is the way back.
  if (document.body && document.body.classList.contains("nifi-page")) {
    var brand = document.querySelector(".brand");
    if (brand) brand.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      play(brand.href);
    });
  }
})();
