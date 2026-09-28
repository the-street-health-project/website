/* The Street Health Project: site behaviour. No frameworks, no build step. */
(function () {
  "use strict";
  var SITE = window.SITE || {};
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function money(n) { return "$" + Number(n).toLocaleString("en-US"); }

  /* ---- Fill in numbers and links from site-data.js ---- */
  $all("[data-site]").forEach(function (el) {
    var key = el.getAttribute("data-site");
    if (SITE[key] === undefined) return;
    el.textContent = el.getAttribute("data-format") === "money" ? money(SITE[key]) : SITE[key];
  });
  // "$200 helps make 25 kits": data-kits-for="200" works out the kit count from kitCost
  $all("[data-kits-for]").forEach(function (el) {
    var cost = Number(SITE.kitCost);
    if (cost > 0) el.textContent = Math.floor(Number(el.getAttribute("data-kits-for")) / cost);
  });
  $all("[data-link]").forEach(function (el) {
    var url = SITE.links && SITE.links[el.getAttribute("data-link")];
    if (url) el.setAttribute("href", url);
  });

  /* ---- Header: shadow on scroll + mobile menu ---- */
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  function onScroll() { if (header) header.classList.toggle("is-scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function closeMenu() {
    if (!header) return;
    header.classList.remove("nav-open");
    if (toggle) toggle.setAttribute("aria-expanded", "false");
  }
  if (toggle && header) {
    toggle.addEventListener("click", function () {
      var open = header.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
    document.addEventListener("click", function (e) { if (!header.contains(e.target)) closeMenu(); });
    window.addEventListener("resize", function () { if (window.innerWidth > 1120) closeMenu(); });
  }

  /* ---- Reveal on scroll ---- */
  var reveals = $all(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-in"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  }

  /* ---- Kit calculator ---- */
  $all("[data-calc]").forEach(function (calc) {
    var range = calc.querySelector("input[type=range]");
    var kitsOut = calc.querySelector("[data-calc-kits]");
    var totalOut = calc.querySelector("[data-calc-total]");
    var subOut = calc.querySelector("[data-calc-sub]");
    var presets = $all("[data-kits]", calc);
    var viz = calc.querySelector("[data-calc-viz]");
    var cost = Number(SITE.kitCost) || 8;
    var items = Number(SITE.itemsPerKit) || 18;
    var shown = Number(range.value) * cost, tweenRaf = 0;
    // Ease the dollar total toward its new value instead of jumping.
    function tweenTotal(to) {
      cancelAnimationFrame(tweenRaf);
      if (reduceMotion) { shown = to; totalOut.textContent = money(to); return; }
      var from = shown, start = 0;
      tweenRaf = requestAnimationFrame(function step(ts) {
        if (!start) start = ts;
        var p = Math.min(1, (ts - start) / 380);
        shown = from + (to - from) * (1 - Math.pow(1 - p, 3));
        totalOut.textContent = money(Math.round(shown));
        if (p < 1) tweenRaf = requestAnimationFrame(step);
      });
    }
    // One little cross per kit.
    function drawViz(n) {
      if (!viz) return;
      while (viz.children.length > n) viz.removeChild(viz.lastChild);
      var had = viz.children.length;
      for (var k = had; k < n; k++) {
        var dotEl = document.createElement("i");
        dotEl.style.animationDelay = Math.min(300, (k - had) * 8) + "ms";
        viz.appendChild(dotEl);
      }
    }
    function render() {
      var n = Number(range.value);
      kitsOut.textContent = n;
      tweenTotal(n * cost);
      drawViz(n);
      subOut.textContent = n === 1
        ? "helps make 1 kit: " + items + " items for one person"
        : "helps make " + n + " kits: " + (n * items).toLocaleString("en-US") + " items in total";
      range.setAttribute("aria-valuetext", n + (n === 1 ? " kit, " : " kits, ") + money(n * cost));
      presets.forEach(function (b) { b.setAttribute("aria-pressed", Number(b.getAttribute("data-kits")) === n ? "true" : "false"); });
    }
    range.addEventListener("input", render);
    presets.forEach(function (b) {
      b.addEventListener("click", function () { range.value = b.getAttribute("data-kits"); render(); });
    });
    render();
  });

  /* ---- Contact form (Web3Forms) ---- */
  var form = document.getElementById("contact-form");
  if (form) {
    var status = document.getElementById("form-status");
    var submit = form.querySelector("button[type=submit]");
    var key = SITE.web3formsKey;
    var keyInput = form.querySelector("[name=access_key]");
    if (keyInput && key) keyInput.value = key;

    // Links like get-involved.html?topic=sponsor&tier=guardian#contact arrive pre-filled.
    var params = new URLSearchParams(window.location.search);
    var topics = { sponsor: "Sponsoring or funding", supplies: "Donating supplies", volunteer: "Volunteering" };
    var topic = topics[params.get("topic")];
    if (topic) {
      var radio = form.querySelector('input[name="topic"][value="' + topic + '"]');
      if (radio) radio.checked = true;
    }
    var tierId = params.get("tier");
    var tier = (SITE.tiers || []).filter(function (t) { return t.id === tierId; })[0];
    if (tier) {
      var tierLabel = tier.name + " (" + money(tier.min) + "+)";
      var tierInput = form.querySelector("[name=tier]");
      if (tierInput) tierInput.value = tierLabel;
      var msg = form.querySelector("[name=message]");
      if (msg && !msg.value) msg.value = "Hi! We’re interested in sponsoring The Street Health Project at the " + tierLabel + " level.";
    }
    var instagram = (SITE.links && SITE.links.instagram) || "https://www.instagram.com/street.health.project/";

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      status.className = "form-status";
      if (!form.checkValidity()) { form.reportValidity(); return; }
      if (!key || key.indexOf("YOUR_") === 0) {
        status.className = "form-status err";
        status.innerHTML = 'Our form isn’t switched on yet. Please send us a DM on <a href="' + instagram + '" target="_blank" rel="noopener">Instagram @street.health.project</a> and we’ll get back to you.';
        return;
      }
      submit.disabled = true;
      var label = submit.textContent;
      submit.textContent = "Sending…";
      fetch("https://api.web3forms.com/submit", { method: "POST", body: new FormData(form), headers: { Accept: "application/json" } })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data && data.success) {
            status.className = "form-status ok";
            status.textContent = "Thank you! Your message is on its way, and we’ll reply soon.";
            form.reset();
          } else { throw new Error("send failed"); }
        })
        .catch(function () {
          status.className = "form-status err";
          status.innerHTML = 'Something went wrong sending that. Please try again, or DM us on <a href="' + instagram + '" target="_blank" rel="noopener">Instagram</a>.';
        })
        .then(function () { submit.disabled = false; submit.textContent = label; });
    });
  }

  /* ---- Photo lightbox ---- */
  var zoomables = $all("a.zoomable");
  if (zoomables.length && typeof HTMLDialogElement === "function") {
    var dlg = document.createElement("dialog");
    dlg.className = "lightbox";
    dlg.setAttribute("aria-label", "Photo viewer");
    dlg.innerHTML = '<button class="lightbox-close" type="button" aria-label="Close photo"><svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button><img alt=""><p></p>';
    document.body.appendChild(dlg);
    var big = dlg.querySelector("img");
    var cap = dlg.querySelector("p");
    dlg.querySelector(".lightbox-close").addEventListener("click", function () { dlg.close(); });
    dlg.addEventListener("click", function (e) { if (e.target === dlg) dlg.close(); });
    zoomables.forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var img = a.querySelector("img");
        big.src = a.getAttribute("href");
        big.alt = img ? img.alt : "";
        cap.textContent = a.getAttribute("data-caption") || (img ? img.alt : "");
        dlg.showModal();
      });
    });
  }

  /* ---- Flip cards: tap/click (or Enter/Space) to flip ---- */
  $all("[data-flip]").forEach(function (card) {
    card.addEventListener("click", function () {
      card.setAttribute("aria-pressed", card.getAttribute("aria-pressed") === "true" ? "false" : "true");
      card.dispatchEvent(new CustomEvent("flip", { bubbles: true }));
    });
  });

  /* ---- Footer year ---- */
  $all("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
})();
