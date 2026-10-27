/* The Street Health Project: sponsor page.
   Slide to an amount and see the matching level, about how many kits it makes,
   and every perk that comes with it. Level details are read from the tier cards
   on the page, so sponsor.html is the one place to edit them. */
(function () {
  "use strict";
  var doc = document;
  var picker = doc.querySelector("[data-picker]");
  if (!picker) return;
  var SITE = window.SITE || {};
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cost = Number(SITE.kitCost) || 8;
  var perKit = Number(SITE.itemsPerKit) || 18;
  var MIN = 100, MAX = 10000;

  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function money(n) { return "$" + Math.round(n).toLocaleString("en-US"); }

  var tiers = $all(".tier[data-tier]").map(function (card) {
    return {
      id: card.getAttribute("data-tier"),
      min: Number(card.getAttribute("data-min")),
      name: card.querySelector(".tier-name").textContent.trim(),
      icon: card.querySelector(".tier-head .kit-icon").innerHTML,
      perks: $all(".checks li", card).map(function (li) { return li.textContent.trim(); })
    };
  }).sort(function (a, b) { return a.min - b.min; });
  if (!tiers.length) return;

  var range = picker.querySelector("input[type=range]");
  var amountOut = picker.querySelector("[data-amount]");
  var result = picker.querySelector(".picker-result");
  var nameOut = picker.querySelector("[data-tier-name]");
  var iconOut = picker.querySelector("[data-tier-icon]");
  var impactOut = picker.querySelector("[data-impact]");
  var perksOut = picker.querySelector("[data-perks]");
  var cta = picker.querySelector("[data-tier-cta]");
  var presets = $all("[data-amount-preset]", picker);
  var ladder = $all(".ladder button", picker);

  // The slider is logarithmic, so $100-$1,000 gets as much room as $1,000-$10,000.
  function toAmount(v) {
    var a = MIN * Math.pow(MAX / MIN, v / 1000);
    var step = a < 1000 ? 10 : a < 5000 ? 50 : 100;
    return Math.min(MAX, Math.round(a / step) * step);
  }
  function toSlider(a) { return Math.round(1000 * Math.log(a / MIN) / Math.log(MAX / MIN)); }
  function tierFor(a) {
    var t = tiers[0];
    tiers.forEach(function (x) { if (a >= x.min) t = x; });
    return t;
  }

  var amount = 500, shown = 500, raf = 0, currentTier = null;
  function showAmount(to) {
    cancelAnimationFrame(raf);
    var label = function (v) { return money(v) + (v >= MAX ? "+" : ""); };
    if (reduce) { shown = to; amountOut.textContent = label(to); return; }
    var from = shown, start = 0;
    raf = requestAnimationFrame(function step(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / 350);
      shown = from + (to - from) * (1 - Math.pow(1 - p, 3));
      amountOut.textContent = label(p < 1 ? shown : to);
      if (p < 1) raf = requestAnimationFrame(step);
    });
  }

  function render() {
    var t = tierFor(amount);
    showAmount(amount);
    range.setAttribute("aria-valuetext", money(amount) + ", " + t.name + " level");
    var kits = Math.floor(amount / cost);
    impactOut.innerHTML = "helps make about <b>" + kits.toLocaleString("en-US") + " kits</b> &middot; " + (kits * perKit).toLocaleString("en-US") + " items";
    presets.forEach(function (b) { b.setAttribute("aria-pressed", Number(b.getAttribute("data-amount-preset")) === amount ? "true" : "false"); });
    ladder.forEach(function (b) {
      var min = Number(b.getAttribute("data-amount-preset"));
      b.classList.toggle("is-reached", amount >= min);
      b.classList.toggle("is-current", b.getAttribute("data-tier") === t.id);
    });
    if (t !== currentTier) {
      currentTier = t;
      result.setAttribute("data-tier", t.id);
      nameOut.textContent = t.name;
      iconOut.innerHTML = t.icon;
      // Perks add up: each level includes everything below it.
      var perks = [];
      tiers.forEach(function (x) { if (x.min <= t.min) perks = perks.concat(x.perks); });
      perksOut.innerHTML = perks.map(function (p, i) {
        return '<li style="--i:' + i + '"><svg class="i i-check" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-check"/></svg><span>' +
          p.replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }) + "</span></li>";
      }).join("");
      cta.setAttribute("href", "get-involved.html?topic=sponsor&tier=" + t.id + "#contact");
    }
  }

  function setAmount(a, fromSlider) {
    amount = Math.max(MIN, Math.min(MAX, a));
    if (!fromSlider) range.value = toSlider(amount);
    render();
  }

  range.addEventListener("input", function () { setAmount(toAmount(Number(range.value)), true); });
  presets.forEach(function (b) {
    b.addEventListener("click", function () { setAmount(Number(b.getAttribute("data-amount-preset"))); });
  });
  // Links elsewhere on the page (e.g. the hero's level list) can jump the picker to a level.
  $all("[data-set-amount]").forEach(function (a) {
    a.addEventListener("click", function () { setAmount(Number(a.getAttribute("data-set-amount"))); });
  });

  setAmount(500);
})();
