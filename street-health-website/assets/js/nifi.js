/* The Street Health Project: NiFi, our water program.
   - The arrow next to the logo opens a dropdown about NiFi.
   - Any link marked data-dive (the dropdown's button, the NiFi door on the home page...) plays a
     2.5-second transition from this site into NiFi's world, then follows the link.
   The look and timing are in styles.css (search "NiFi"); this file builds the layers and starts them. */
(function () {
  "use strict";
  var DIVE_MS = 2500; // keep in step with the 2.5s animations in styles.css
  var root = document.documentElement;
  var header = document.querySelector(".site-header");
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // NiFi's app lives in nifi/ at the top of the site; the logo's home link tells us where the top is.
  var home = document.querySelector(".brand");
  var NIFI_LOGO = new URL("nifi/favicon.svg", home ? home.href : window.location.href).href;

  /* ---- The dropdown ---- */
  var btn = document.querySelector(".nifi-switch");
  var pop = document.getElementById("nifi-pop");
  var go = pop && pop.querySelector(".nifi-go");
  var native = !!pop && typeof pop.showPopover === "function";

  // Drops down from the arrow, kept on screen. --caret is where it unfolds from.
  function place() {
    var r = btn.getBoundingClientRect();
    var w = Math.min(360, window.innerWidth - 32);
    var left = Math.max(16, Math.min(r.left - 18, window.innerWidth - w - 16));
    pop.style.left = left + "px";
    pop.style.top = r.bottom + 12 + "px";
    pop.style.setProperty("--caret", r.left + r.width / 2 - left + "px");
  }
  function opened(open) {
    btn.classList.toggle("is-open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (!open) return;
    warm(go.href);
    // One menu at a time: close the phone menu if it's open.
    if (header && header.classList.contains("nav-open")) {
      header.classList.remove("nav-open");
      var toggle = header.querySelector(".nav-toggle");
      if (toggle) toggle.setAttribute("aria-expanded", "false");
    }
  }
  function closeDropdown() {
    if (!pop) return;
    if (native) { if (pop.matches(":popover-open")) pop.hidePopover(); }
    else if (pop.classList.contains("is-open")) { pop.classList.remove("is-open"); opened(false); }
  }

  if (btn && pop && go) {
    btn.setAttribute("aria-expanded", "false");
    if (native) {
      // The button's popovertarget opens and closes it; Esc and clicking outside close it too.
      pop.addEventListener("beforetoggle", function (e) { if (e.newState === "open") place(); });
      pop.addEventListener("toggle", function (e) { opened(e.newState === "open"); });
    } else {
      // Browsers without popovers: the same dropdown, opened by hand.
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var open = !pop.classList.contains("is-open");
        if (open) place();
        pop.classList.toggle("is-open", open);
        opened(open);
      });
      document.addEventListener("click", function (e) { if (!pop.contains(e.target)) closeDropdown(); });
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape" && pop.classList.contains("is-open")) { closeDropdown(); btn.focus(); }
      });
    }
    window.addEventListener("resize", function () { if (btn.classList.contains("is-open")) place(); });
  }

  /* ---- Getting the next page ready ---- */
  // Opening the dropdown fetches NiFi's page; starting a dive also loads its destination fully in the
  // background (in browsers that can), so when the 2.5 seconds are up it appears at once.
  var warmed = {};
  function warm(url) {
    if (warmed[url]) return;
    warmed[url] = true;
    var link = document.createElement("link");
    link.rel = "prefetch";
    link.href = url;
    document.head.appendChild(link);
  }
  function prerender(url) {
    if (!(window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports("speculationrules"))) return;
    var rules = document.createElement("script");
    rules.type = "speculationrules";
    rules.textContent = JSON.stringify({ prerender: [{ source: "list", urls: [url] }] });
    document.head.appendChild(rules);
  }

  /* ---- The dive ---- */
  var DROP = '<svg viewBox="0 0 64 64" aria-hidden="true"><defs><radialGradient id="nx-drop-fill" cx="38%" cy="40%" r="70%">' +
    '<stop offset="0" stop-color="#eafff2"/><stop offset=".35" stop-color="#8dffbd"/><stop offset="1" stop-color="#0c8a45"/></radialGradient></defs>' +
    '<path d="M32 5s17 18.4 17 30.6a17 17 0 0 1-34 0C15 23.4 32 5 32 5z" fill="url(#nx-drop-fill)"/>' +
    '<path d="M24.5 37.5a8 8 0 0 0 7.5 7.5" fill="none" stroke="#eafff2" stroke-width="3" stroke-linecap="round" opacity=".85"/></svg>';

  // A wave two screens wide, so sliding it half its width loops without a seam.
  function wave() {
    var d = "M0 14", x;
    for (x = 150; x <= 1200; x += 150) d += " Q" + (x - 75) + " " + (x % 300 ? 2 : 26) + " " + x + " 14";
    return '<svg class="nx-wave" viewBox="0 0 1200 28" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="' + d + ' V28 H0 Z" fill="#0a3a22"/><path d="' + d + '" fill="none" stroke="#39ff88" stroke-width="2.5"/></svg>';
  }
  function repeat(n, make) { var s = "", i; for (i = 0; i < n; i++) s += make(i); return s; }

  function build() {
    var mark = document.querySelector(".brand-mark");
    var markImg = mark && mark.querySelector("img");
    var m = mark ? mark.getBoundingClientRect() : { left: window.innerWidth / 2 - 23, top: 0, width: 46, height: 46 };
    var size = 132;
    var cx = window.innerWidth / 2;
    var cy = window.innerHeight * 0.38;

    var nx = document.createElement("div");
    nx.className = "nx";
    nx.setAttribute("role", "status");
    // Start the cross exactly on top of the logo's cross.
    nx.style.setProperty("--nx-dx", m.left + m.width / 2 - cx + "px");
    nx.style.setProperty("--nx-dy", m.top + m.height / 2 - cy + "px");
    nx.style.setProperty("--nx-s", String(m.width / size));
    // It lands where the water will be: 60% down the screen, plus 8% into the water.
    nx.style.setProperty("--nx-fall", "calc(30vh - 23px)");
    nx.innerHTML =
      '<span class="sr-only">Opening NiFi, our Iowa water program…</span>' +
      '<div class="nx-veil" aria-hidden="true"></div>' +
      '<div class="nx-water" aria-hidden="true">' + wave() +
        '<div class="nx-ripples">' + repeat(3, function () { return "<i></i>"; }) + "</div>" +
        '<div class="nx-splash">' + repeat(8, function (i) {
          var x = (i - 3.5) * 24, y = -[64, 92, 112, 124, 124, 112, 92, 64][i];
          return '<i style="--x:' + x + "px;--y:" + y + 'px"></i>';
        }) + "</div>" +
      "</div>" +
      '<div class="nx-token" aria-hidden="true"><div class="nx-spin">' +
        '<div class="nx-face nx-front">' + (markImg ? '<img src="' + (markImg.currentSrc || markImg.src) + '" alt="">' : "") + "</div>" +
        '<div class="nx-face nx-back">' + DROP + "</div>" +
      "</div></div>" +
      '<div class="nx-world" aria-hidden="true"><div class="nx-floor"><div class="nx-grid"></div></div>' +
        '<div class="nx-bubbles">' + repeat(16, function (i) {
          return '<i style="--l:' + ((i * 37) % 100) + "%;--s:" + (6 + ((i * 7) % 12)) + "px;--t:" + (1.3 + ((i * 3) % 7) / 10) +
            "s;--d:" + -((i * 13) % 17) / 10 + "s;--w:" + (((i * 11) % 9) - 4) * 6 + 'px"></i>';
        }) + "</div>" +
      "</div>" +
      '<div class="nx-title" aria-hidden="true">' +
        '<img src="' + NIFI_LOGO + '" alt="">' +
        '<div class="nx-word">' + repeat(4, function (i) { return '<span style="--i:' + i + '">' + "NiFi".charAt(i) + "</span>"; }) + "</div>" +
        '<div class="nx-sub">Iowa river nitrate, live</div>' +
      "</div>" +
      '<div class="nx-flash" aria-hidden="true"></div>' +
      '<div class="nx-black" aria-hidden="true"></div>';
    return nx;
  }

  // The page doesn't scroll while it sinks away.
  var SCROLL_KEYS = { " ": 1, ArrowUp: 1, ArrowDown: 1, PageUp: 1, PageDown: 1, Home: 1, End: 1 };
  function block(e) { e.preventDefault(); }
  function onKey(e) {
    if (e.key === "Escape") { reset(); return; } // changed your mind: stay here
    if (SCROLL_KEYS[e.key]) e.preventDefault();
  }
  function lock(on) {
    var fn = on ? "addEventListener" : "removeEventListener";
    window[fn]("wheel", block, { passive: false });
    window[fn]("touchmove", block, { passive: false });
    window[fn]("keydown", onKey);
  }

  var overlay = null, timer = 0;
  var sinking = [];
  function dive(url) {
    if (overlay) return;
    prerender(url);
    closeDropdown();
    overlay = build();
    document.body.appendChild(overlay);
    // The page tips back around the middle of the screen, wherever you've scrolled to.
    sinking = [document.querySelector("main"), document.querySelector(".site-footer")].filter(Boolean);
    sinking.forEach(function (el) {
      var top = el.getBoundingClientRect().top;
      el.style.transformOrigin = "50% " + (window.innerHeight / 2 - top) + "px";
    });
    root.classList.add("nx-on");
    lock(true);
    timer = window.setTimeout(function () { window.location.href = url; }, DIVE_MS);
  }
  function reset() {
    window.clearTimeout(timer);
    lock(false);
    root.classList.remove("nx-on");
    sinking.forEach(function (el) { el.style.transformOrigin = ""; });
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    overlay = null;
  }

  document.addEventListener("click", function (e) {
    var link = e.target.closest && e.target.closest("a[data-dive]");
    if (!link) return;
    // Ctrl/Cmd/Shift-click still opens it in a new tab or window, and with motion turned down it just opens.
    if (reduceMotion || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    dive(link.href);
  });
  // Coming back with the Back button can restore this page exactly as it was left, mid-dive; put it back to normal.
  window.addEventListener("pageshow", function (e) { if (e.persisted) reset(); });
})();
