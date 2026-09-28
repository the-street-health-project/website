/* The Street Health Project: "Within Reach", the interactive story.
   Chapter dots, scroll-to-fill dots (ch. 1), flip cards (ch. 2, flips handled
   in site.js), drag-to-pack (ch. 3), a photo stack (ch. 4). The globe in
   chapter 5 comes from globe.js. */
(function () {
  "use strict";
  var doc = document;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasIO = "IntersectionObserver" in window;
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  /* ---- Chapter dots ---- */
  var navLinks = $all(".story-nav a");
  if (navLinks.length && hasIO) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.toggle("is-active", a.getAttribute("href") === "#" + en.target.id); });
      });
    }, { rootMargin: "-48% 0px -48% 0px" });
    $all("[data-chapter]").forEach(function (ch) { io.observe(ch); });
  }

  /* ---- Chapter 1: dots fill as you scroll ---- */
  var need = doc.querySelector("[data-need]");
  if (need) {
    var dots = $all(".dots i", need);
    var countEl = need.querySelector("[data-need-count]");
    var plus = need.querySelector(".plus");
    var lastLit = -1;
    function fill() {
      var lit = dots.length;
      if (!reduce) {
        var r = need.getBoundingClientRect();
        var span = Math.max(1, need.offsetHeight - window.innerHeight * 0.9);
        lit = Math.round(clamp((-r.top + window.innerHeight * 0.15) / span, 0, 1) * dots.length);
      }
      if (lit === lastLit) return;
      lastLit = lit;
      dots.forEach(function (d, i) { d.classList.toggle("on", i < lit); });
      countEl.textContent = (lit * 100).toLocaleString("en-US");
      plus.style.visibility = lit === dots.length ? "visible" : "hidden";
    }
    var ticking = false;
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(function () { ticking = false; fill(); }); }
    }, { passive: true });
    window.addEventListener("resize", fill);
    fill();
  }

  /* ---- Chapter 2: once all three cards are flipped, land the point ---- */
  var basics = doc.querySelector("[data-basics]");
  if (basics) {
    var done = doc.querySelector("[data-basics-done]");
    basics.addEventListener("flip", function () {
      var all = $all(".flip", basics).every(function (f) { return f.getAttribute("aria-pressed") === "true"; });
      if (all) done.classList.add("is-shown");
    });
  }

  /* ---- Chapter 3: drag (or tap) each item into the box ---- */
  var box = doc.querySelector("[data-dropbox]");
  if (box) {
    var chips = $all(".dchip");
    var lid = box.querySelector(".k-lid");
    var viewport = box.querySelector(".kit3d-viewport");
    var countOut = doc.querySelector("[data-story-count]");
    var progress = box.querySelector(".pack-progress");
    var total = chips.length, packedCount = 0;
    lid.style.setProperty("--lid", "205deg"); // open, waiting to be filled

    function update() {
      countOut.textContent = packedCount;
      progress.style.setProperty("--p", (packedCount / total).toFixed(3));
      progress.setAttribute("aria-valuenow", packedCount);
      var full = packedCount === total;
      box.classList.toggle("is-full", full);
      lid.style.setProperty("--lid", full ? "90deg" : "205deg");
      if (full) celebrate();
    }
    function boxCenter() {
      var r = viewport.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height * 0.55 };
    }
    function pack(chip, from) {
      if (chip.classList.contains("is-packed")) return;
      chip.classList.add("is-packed");
      chip.setAttribute("aria-disabled", "true");
      chip.style.transform = "";
      packedCount++;
      if (!reduce && Element.prototype.animate) {
        var r = from || chip.getBoundingClientRect();
        var fly = chip.cloneNode(true);
        fly.className = "dchip fly-chip";
        fly.style.left = r.left + "px"; fly.style.top = r.top + "px";
        fly.style.width = r.width + "px";
        doc.body.appendChild(fly);
        var c = boxCenter();
        var dx = c.x - (r.left + r.width / 2), dy = c.y - (r.top + r.height / 2);
        var anim = fly.animate([
          { transform: "translate(0,0) scale(1) rotate(0deg)", opacity: 1 },
          { transform: "translate(" + dx * 0.55 + "px," + (dy * 0.55 - 70) + "px) scale(0.85) rotate(-8deg)", opacity: 1, offset: 0.55 },
          { transform: "translate(" + dx + "px," + dy + "px) scale(0.3) rotate(10deg)", opacity: 0 }
        ], { duration: 650, easing: "cubic-bezier(.3,.6,.3,1)" });
        anim.onfinish = function () { fly.remove(); };
      }
      update();
    }
    function inBox(x, y) {
      var r = viewport.getBoundingClientRect();
      return x > r.left && x < r.right && y > r.top && y < r.bottom;
    }

    chips.forEach(function (chip) {
      var sx = 0, sy = 0, moved = 0, dragging = false;
      chip.addEventListener("pointerdown", function (e) {
        if (chip.classList.contains("is-packed")) return;
        dragging = true; moved = 0; sx = e.clientX; sy = e.clientY;
        chip.classList.add("is-dragging");
        if (chip.setPointerCapture) chip.setPointerCapture(e.pointerId);
      });
      chip.addEventListener("pointermove", function (e) {
        if (!dragging) return;
        var dx = e.clientX - sx, dy = e.clientY - sy;
        moved = Math.max(moved, Math.abs(dx) + Math.abs(dy));
        chip.style.transform = "translate(" + dx + "px," + dy + "px) rotate(" + clamp(dx / 20, -8, 8) + "deg)";
        box.classList.toggle("is-over", inBox(e.clientX, e.clientY));
      });
      function release(e, cancelled) {
        if (!dragging) return;
        dragging = false;
        chip.classList.remove("is-dragging");
        box.classList.remove("is-over");
        if (!cancelled && (moved < 6 || inBox(e.clientX, e.clientY))) {
          pack(chip, chip.getBoundingClientRect());
        } else {
          chip.style.transition = "transform .35s cubic-bezier(.3,1.4,.5,1)";
          chip.style.transform = "";
          setTimeout(function () { chip.style.transition = ""; }, 380);
        }
      }
      chip.addEventListener("pointerup", function (e) { release(e, false); });
      chip.addEventListener("pointercancel", function (e) { release(e, true); });
      // Keyboard: Enter/Space packs (pointer taps are handled above).
      chip.addEventListener("click", function (e) { if (e.detail === 0) pack(chip); });
    });

    var auto = doc.querySelector("[data-pack-auto]");
    if (auto) auto.addEventListener("click", function () {
      chips.filter(function (c) { return !c.classList.contains("is-packed"); }).forEach(function (c, i) {
        setTimeout(function () { pack(c); }, reduce ? 0 : i * 110);
      });
    });
    var resetBtn = doc.querySelector("[data-pack-reset]");
    if (resetBtn) resetBtn.addEventListener("click", function () {
      chips.forEach(function (c) { c.classList.remove("is-packed"); c.removeAttribute("aria-disabled"); c.style.transform = ""; });
      packedCount = 0; celebrated = false;
      update();
    });

    var celebrated = false;
    function celebrate() {
      if (celebrated || reduce || !Element.prototype.animate) return;
      celebrated = true;
      var c = boxCenter();
      var colors = ["#DF513E", "#BF4435", "#2B241C", "#EF8A6E", "#E9C46A"];
      for (var i = 0; i < 40; i++) {
        var p = doc.createElement("span");
        p.className = "confetti";
        p.style.setProperty("--c", colors[i % colors.length]);
        p.style.left = c.x + "px"; p.style.top = (c.y - 40) + "px";
        doc.body.appendChild(p);
        var ang = Math.random() * Math.PI * 2, dist = 80 + Math.random() * 200;
        var dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist * 0.7 - 90;
        var a = p.animate([
          { transform: "translate(-50%,-50%) scale(0.4)", opacity: 1 },
          { transform: "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px)) scale(1) rotate(" + (Math.random() * 400 - 200) + "deg)", opacity: 1, offset: 0.55 },
          { transform: "translate(calc(-50% + " + dx * 1.15 + "px), calc(-50% + " + (dy + 150) + "px)) scale(0.7) rotate(" + (Math.random() * 700 - 350) + "deg)", opacity: 0 }
        ], { duration: 1300 + Math.random() * 500, easing: "cubic-bezier(.2,.7,.3,1)", delay: 350 });
        a.onfinish = (function (el) { return function () { el.remove(); }; })(p);
      }
    }
    update();
  }

  /* ---- Chapter 4: deal through a stack of photos ---- */
  var stack = doc.querySelector("[data-stack]");
  if (stack) {
    var cards = $all(".stack-card", stack);
    var order = cards.map(function (c, i) { return i; });
    var tilts = [0, 3, -4, 2];
    function layout() {
      order.forEach(function (ci, depth) {
        var card = cards[ci];
        card.style.transform = "translateY(" + depth * 12 + "px) scale(" + (1 - depth * 0.05) + ") rotate(" + (tilts[depth] || 0) + "deg)";
        card.style.zIndex = String(10 - depth);
        card.style.opacity = depth > 3 ? "0" : "1";
        card.setAttribute("aria-hidden", depth === 0 ? "false" : "true");
      });
    }
    var busy = false;
    function next() {
      if (busy) return;
      busy = true;
      var top = cards[order[0]];
      top.style.transform = "translate(110%, -20px) rotate(16deg)";
      top.style.opacity = "0";
      setTimeout(function () { order.push(order.shift()); layout(); busy = false; }, reduce ? 0 : 360);
    }
    stack.addEventListener("click", next);
    var nextBtn = doc.querySelector("[data-stack-next]");
    if (nextBtn) nextBtn.addEventListener("click", next);
    layout();
  }
})();
