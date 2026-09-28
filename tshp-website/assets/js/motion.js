/* The Street Health Project: motion and interactive polish shared by every page.
   Everything here is optional decoration. The site reads and works without it,
   and each effect switches off for visitors who ask for reduced motion. */
(function () {
  "use strict";
  var doc = document;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hasIO = "IntersectionObserver" in window;

  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }

  /* Call cb once, the first time el scrolls into view. */
  function onceVisible(el, cb, margin) {
    if (!hasIO) { cb(); return; }
    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { io.disconnect(); cb(); }
    }, { rootMargin: margin || "0px 0px -8% 0px" });
    io.observe(el);
  }

  /* Track whether el is on screen, so animation loops can pause when it isn't. */
  function watchVisible(el, onChange) {
    if (!hasIO) { onChange(true); return; }
    new IntersectionObserver(function (entries) { onChange(entries[0].isIntersecting); }, { rootMargin: "80px" }).observe(el);
  }

  /* ---- 1. Headings rise in word by word ---- */
  function splitWords(el) {
    var i = 0;
    Array.prototype.slice.call(el.childNodes).forEach(function (node) {
      if (node.nodeType === 3) {
        var frag = doc.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(doc.createTextNode(part)); return; }
          var w = doc.createElement("span");
          w.className = "w"; w.style.setProperty("--i", i++); w.textContent = part;
          frag.appendChild(w);
        });
        node.parentNode.replaceChild(frag, node);
      } else if (node.nodeType === 1 && node.tagName !== "BR") {
        // Keep inline elements (like the brush underline) whole.
        var wrap = doc.createElement("span");
        wrap.className = "w"; wrap.style.setProperty("--i", i++);
        node.parentNode.replaceChild(wrap, node);
        wrap.appendChild(node);
      }
    });
    el.classList.add("wsplit");
  }
  if (!reduce) {
    $all(".hero h1, .page-hero h1, .dark-hero h1, .section-head h2, .band-red h2, .need-body h2, .done-panel h2, .dark-section > .container > h2, .not-found h1").forEach(function (h) {
      splitWords(h);
      onceVisible(h, function () { h.classList.add("is-in"); }, "0px");
    });
  }
  // Brushes outside split headings still need a trigger to paint in.
  $all(".brush").forEach(function (b) {
    if (!b.closest(".wsplit")) onceVisible(b, function () { b.classList.add("is-in"); }, "0px");
  });

  /* ---- 2. Numbers count up when they appear ---- */
  function countUp(el) {
    var walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) { if (/\d/.test(node.textContent)) break; }
    if (!node) return;
    var m = node.textContent.match(/^(\D*)(\d[\d,]*)(.*)$/);
    if (!m) return;
    var target = parseInt(m[2].replace(/,/g, ""), 10);
    if (!(target > 1)) return;
    var commas = m[2].indexOf(",") > -1;
    function fmt(v) { v = Math.round(v); return m[1] + (commas ? v.toLocaleString("en-US") : v) + m[3]; }
    var dur = 1100 + Math.min(900, target * 4);
    onceVisible(el, function () {
      var start = 0;
      node.textContent = fmt(0);
      requestAnimationFrame(function step(ts) {
        if (!start) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        node.textContent = fmt(target * (1 - Math.pow(1 - p, 4)));
        if (p < 1) requestAnimationFrame(step);
      });
    });
  }
  if (!reduce) $all(".stat-num, .qty-tile strong, .need-num, .hero-card-num").forEach(countUp);

  /* ---- 3. Cards tilt toward the pointer ---- */
  function tilt(el) {
    var glare = doc.createElement("span");
    glare.className = "tilt-glare"; glare.setAttribute("aria-hidden", "true");
    el.appendChild(glare);
    el.classList.add("has-tilt");
    var raf = 0, px = 0, py = 0;
    function apply() {
      raf = 0;
      el.style.transform = "perspective(900px) rotateX(" + (-py * 7).toFixed(2) + "deg) rotateY(" + (px * 9).toFixed(2) + "deg) translateY(-4px)";
      el.style.setProperty("--gx", ((px + 0.5) * 100).toFixed(1) + "%");
      el.style.setProperty("--gy", ((py + 0.5) * 100).toFixed(1) + "%");
    }
    el.addEventListener("pointerenter", function () {
      el.style.transition = "transform .15s ease-out";
      el.classList.add("is-tilting");
    });
    el.addEventListener("pointermove", function (e) {
      var r = el.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width - 0.5;
      py = (e.clientY - r.top) / r.height - 0.5;
      if (!raf) raf = requestAnimationFrame(apply);
    });
    el.addEventListener("pointerleave", function () {
      el.classList.remove("is-tilting");
      el.style.transition = "transform .6s cubic-bezier(.2,.7,.2,1)";
      el.style.transform = "";
    });
  }
  if (finePointer && !reduce) $all(".prog-card, .logo-card, .card-grid > .card, .up-card, .team-grid > .card").forEach(tilt);

  /* ---- 4. Scroll-linked: progress bar + parallax ---- */
  var header = doc.querySelector(".site-header");
  var bar = null;
  if (header) {
    bar = doc.createElement("span");
    bar.className = "scroll-progress"; bar.setAttribute("aria-hidden", "true");
    header.appendChild(bar);
  }
  var parallaxEls = reduce ? [] : $all("[data-parallax]");
  var ticking = false;
  function onScroll() {
    ticking = false;
    var max = doc.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.setProperty("--sp", max > 0 ? Math.min(1, window.scrollY / max).toFixed(4) : 0);
    var vh = window.innerHeight;
    parallaxEls.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var c = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.setProperty("--py", (c * parseFloat(el.getAttribute("data-parallax")) * -100).toFixed(1) + "px");
    });
  }
  window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();

  /* ---- 5. A soft light follows the pointer on dark sections ---- */
  if (finePointer && !reduce) {
    $all(".band-ink, .dark-page").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", (e.clientX - r.left).toFixed(0) + "px");
        el.style.setProperty("--my", (e.clientY - r.top).toFixed(0) + "px");
      });
    });
  }

  /* ---- 6. Drifting crosses behind heroes (canvas) ---- */
  function crosses(host) {
    var dark = host.hasAttribute("data-crosses-dark");
    var canvas = doc.createElement("canvas");
    canvas.className = "crosses"; canvas.setAttribute("aria-hidden", "true");
    host.insertBefore(canvas, host.firstChild);
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = 0, h = 0, parts = [], onScreen = false, running = false;
    var mouse = { x: -9999, y: -9999 };
    var tone = dark ? "245,233,208" : "43,36,28";

    function make(anywhere) {
      return {
        x: Math.random() * w, y: anywhere ? Math.random() * h : h + 20,
        s: 6 + Math.random() * 12, vy: 0.12 + Math.random() * 0.3,
        sway: Math.random() * 6.28, rot: Math.random() * 3.14, vr: (Math.random() - 0.5) * 0.008,
        a: 0.07 + Math.random() * (dark ? 0.12 : 0.16), red: Math.random() < 0.62, ox: 0, oy: 0
      };
    }
    function size() {
      var r = host.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.round(Math.max(10, Math.min(34, (w * h) / 24000)));
      parts = [];
      for (var i = 0; i < n; i++) parts.push(make(true));
    }
    function draw(p) {
      var s = p.s, t = s * 0.34;
      ctx.save();
      ctx.translate(p.x + p.ox, p.y + p.oy);
      ctx.rotate(p.rot);
      ctx.fillStyle = "rgba(" + (p.red ? "223,81,62" : tone) + "," + p.a + ")";
      ctx.fillRect(-s / 2, -t / 2, s, t);
      ctx.fillRect(-t / 2, -s / 2, t, s);
      ctx.restore();
    }
    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.y -= p.vy; p.sway += 0.01; p.x += Math.sin(p.sway) * 0.18; p.rot += p.vr;
        var dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 16900) {
          var d = Math.sqrt(d2) || 1, f = ((130 - d) / 130) * 22;
          p.ox += (dx / d * f - p.ox) * 0.1; p.oy += (dy / d * f - p.oy) * 0.1;
        } else { p.ox *= 0.94; p.oy *= 0.94; }
        if (p.y < -24) parts[i] = make(false);
        draw(parts[i]);
      }
      requestAnimationFrame(frame);
    }
    function update() {
      var should = onScreen && !doc.hidden && !reduce;
      if (should && !running) { running = true; requestAnimationFrame(frame); }
      if (!should) running = false;
    }
    size();
    if (reduce) { parts.forEach(draw); return; }
    watchVisible(host, function (v) { onScreen = v; update(); });
    doc.addEventListener("visibilitychange", update);
    var resizeTimer = 0;
    window.addEventListener("resize", function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(size, 150); });
    if (finePointer) {
      host.addEventListener("pointermove", function (e) {
        var r = host.getBoundingClientRect();
        mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      });
      host.addEventListener("pointerleave", function () { mouse.x = mouse.y = -9999; });
    }
  }
  $all("[data-crosses]").forEach(crosses);
})();
