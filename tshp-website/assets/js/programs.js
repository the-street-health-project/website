/* The Street Health Project: "What we do" page.
   1) How-it-works stepper: a box travels Collect -> Pack -> Deliver -> Partner.
   2) Kit explorer: tabs for the three kit categories; each item card flips
      (the flip itself is handled in site.js). */
(function () {
  "use strict";
  var doc = document;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  // Accessible tabs with arrow-key support; returns a select(i) function.
  function tabs(root, onSelect) {
    var tabEls = $all('[role="tab"]', root);
    var panels = $all('[role="tabpanel"]', root);
    var cur = 0;
    function select(i, focus) {
      cur = (i + tabEls.length) % tabEls.length;
      tabEls.forEach(function (t, k) {
        t.setAttribute("aria-selected", k === cur ? "true" : "false");
        t.tabIndex = k === cur ? 0 : -1;
      });
      panels.forEach(function (p, k) { p.classList.toggle("is-active", k === cur); p.hidden = k !== cur; });
      if (focus) tabEls[cur].focus();
      if (onSelect) onSelect(cur, tabEls.length);
    }
    tabEls.forEach(function (t, k) {
      t.addEventListener("click", function () { select(k); root.dispatchEvent(new Event("usertab")); });
      t.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (e.key === "Home") { select(0, true); e.preventDefault(); }
        else if (e.key === "End") { select(tabEls.length - 1, true); e.preventDefault(); }
        else if (d) { select(cur + d, true); e.preventDefault(); root.dispatchEvent(new Event("usertab")); }
      });
    });
    select(0);
    return { select: select, current: function () { return cur; }, count: tabEls.length };
  }

  /* ---- 1. How it works ---- */
  var proc = doc.querySelector("[data-process]");
  if (proc) {
    var track = proc.querySelector(".process-track");
    var nodes = $all(".process-node", proc);
    var steps = tabs(proc, function (i, n) {
      track.style.setProperty("--pf", (i / (n - 1)) * 100 + "%");
      nodes.forEach(function (node, k) { node.classList.toggle("is-done", k <= i); });
    });
    // Auto-advance while on screen, until the visitor takes over.
    var auto = !reduce, onScreen = false, hovering = false;
    proc.addEventListener("usertab", function () { auto = false; });
    proc.addEventListener("pointerenter", function () { hovering = true; });
    proc.addEventListener("pointerleave", function () { hovering = false; });
    proc.addEventListener("focusin", function () { hovering = true; });
    proc.addEventListener("focusout", function () { hovering = false; });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { onScreen = en[0].isIntersecting; }, { threshold: 0.4 }).observe(proc);
    }
    setInterval(function () {
      if (auto && onScreen && !hovering && !doc.hidden) steps.select(steps.current() + 1);
    }, 4200);
  }

  /* ---- 2. Kit explorer ---- */
  var explorer = doc.querySelector("[data-explorer]");
  if (explorer) {
    tabs(explorer, function () {
      // Flip cards back over when switching categories.
      $all(".flip[aria-pressed='true']", explorer).forEach(function (f) { f.setAttribute("aria-pressed", "false"); });
    });
  }
})();
