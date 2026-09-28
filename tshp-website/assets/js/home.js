/* The Street Health Project: homepage interactions.
   1) The 3D first-aid kit in the hero: drag to spin, click to open, items orbit.
   2) "Pack a kit": tap all 18 items to pack one. */
(function () {
  "use strict";
  var doc = document;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOutBack(t) { var c = 1.5; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  // The kit's 18 items come from the page itself, so there's one list to maintain.
  var itemEls = Array.prototype.slice.call(doc.querySelectorAll("#kit [data-kit-item]"));
  var byCat = { w: [], h: [], c: [] };
  itemEls.forEach(function (el) {
    var cat = el.closest("[data-cat]");
    var key = cat ? cat.getAttribute("data-cat") : "w";
    (byCat[key] || byCat.w).push(el.textContent.trim());
  });

  /* ================= 1. 3D kit ================= */
  (function kit3d() {
    var root = doc.querySelector("[data-kit3d]");
    if (!root) return;
    var viewport = root.querySelector(".kit3d-viewport");
    var scene = root.querySelector(".kit3d-scene");
    var box = root.querySelector(".kit3d-box");
    var lid = root.querySelector(".k-lid");
    var itemsWrap = root.querySelector(".kit3d-items");
    var toggle = root.querySelector("[data-kit3d-toggle]");
    var toggleLabel = toggle.querySelector("span");

    // Interleave categories so the orbit alternates colors.
    var order = [];
    var longest = Math.max(byCat.w.length, byCat.h.length, byCat.c.length);
    for (var i = 0; i < longest; i++) {
      ["w", "h", "c"].forEach(function (k) { if (byCat[k][i]) order.push({ name: byCat[k][i], cat: k }); });
    }
    var chips = order.map(function (it) {
      var el = doc.createElement("span");
      el.className = "k-chip k-chip--" + it.cat;
      el.textContent = it.name;
      itemsWrap.appendChild(el);
      return el;
    });
    var N = chips.length;

    var yaw = -28, pitch = -20, velX = 0, velY = 0;
    var hoverX = 0, hoverY = 0, tiltX = 0, tiltY = 0;
    var open = false, openT = 0, orbit = 0, t0 = 0, last = 0;
    var dragging = false, moved = 0, lastPX = 0, lastPY = 0;
    var scale = 1, radius = 250, boxH = 150;
    var onScreen = true, running = false;

    function measure() {
      var vw = viewport.clientWidth;
      var mobile = window.innerWidth <= 900;
      scale = mobile ? clamp(vw / 520, 0.72, 1) : 1;
      // Keep the ring (plus half a label) inside the viewport on phones.
      radius = mobile ? clamp((vw / 2 - 62) / scale, 110, 230) : clamp(vw * 0.42, 190, 250);
      boxH = parseFloat(getComputedStyle(root).getPropertyValue("--h")) || 150;
      root.style.setProperty("--ks", scale.toFixed(3));
    }

    function render(ts) {
      var dt = last ? Math.min(50, ts - last) : 16;
      last = ts;
      if (!t0) t0 = ts;

      if (!dragging) {
        if (!reduce) yaw += dt * 0.011;
        yaw += velX; velX *= 0.93;
        pitch = clamp(pitch + velY, -55, 6); velY *= 0.88;
      }
      tiltX += (hoverX - tiltX) * 0.06;
      tiltY += (hoverY - tiltY) * 0.06;
      var Y = yaw + tiltX, P = pitch + tiltY;
      var bob = reduce ? 0 : Math.sin((ts - t0) / 900) * 6;
      var s = scale.toFixed(3);
      scene.style.transform = "scale3d(" + s + "," + s + "," + s + ") rotateX(" + P.toFixed(2) + "deg) rotateY(" + Y.toFixed(2) + "deg)";
      box.style.transform = "translateY(" + bob.toFixed(1) + "px)";

      // Lid leads, items follow.
      var target = open ? 1 : 0;
      openT = reduce ? target : clamp(openT + (target - openT > 0 ? 1 : -1) * dt / 1100, 0, 1);
      var lidT = easeInOut(clamp(openT * 1.8, 0, 1));
      lid.style.setProperty("--lid", (90 + 118 * lidT).toFixed(1) + "deg");

      if (open && !reduce) orbit += dt * 0.00022;
      var counter = "rotateY(" + (-Y).toFixed(2) + "deg) rotateX(" + (-P).toFixed(2) + "deg)";
      for (var i = 0; i < N; i++) {
        var p = clamp((openT - 0.28 - (i / N) * 0.4) / 0.32, 0, 1);
        var chip = chips[i];
        if (p <= 0) { if (chip.style.opacity !== "0") chip.style.opacity = "0"; continue; }
        var e = easeOutBack(p);
        var a = orbit + (i / N) * Math.PI * 2;
        var ring = i % 2 ? 1 : 0.84;
        var tx = Math.cos(a) * radius * ring;
        var tz = Math.sin(a) * radius * ring;
        var ty = -boxH / 2 - 48 - (i % 3) * 44 + Math.sin(a * 2 + orbit * 3) * 10;
        var x = tx * e, z = tz * e, y = bob + (-boxH / 4) + (ty + boxH / 4) * e;
        chip.style.opacity = Math.min(1, p * 2.5).toFixed(2);
        chip.style.transform = "translate3d(" + x.toFixed(1) + "px," + y.toFixed(1) + "px," + z.toFixed(1) + "px) " + counter +
          " scale(" + (0.35 + 0.65 * Math.min(1, e)).toFixed(3) + ") translate(-50%,-50%)";
      }

      if (running) requestAnimationFrame(render);
    }

    function update() {
      var should = onScreen && !doc.hidden;
      if (should && !running) { running = true; last = 0; requestAnimationFrame(render); }
      if (!should) running = false;
    }

    function setOpen(v) {
      open = v;
      root.classList.toggle("is-open", open);
      toggle.setAttribute("aria-pressed", open ? "true" : "false");
      toggleLabel.textContent = open ? "Pack it back up" : "Open the kit";
      if (reduce && !running) requestAnimationFrame(render);
    }

    toggle.addEventListener("click", function () { setOpen(!open); });

    // Drag to spin (horizontal on touch, so vertical swipes still scroll the page).
    viewport.addEventListener("pointerdown", function (e) {
      dragging = true; moved = 0; lastPX = e.clientX; lastPY = e.clientY; velX = velY = 0;
      viewport.classList.add("is-dragging");
      if (viewport.setPointerCapture) viewport.setPointerCapture(e.pointerId);
    });
    viewport.addEventListener("pointermove", function (e) {
      if (dragging) {
        var dx = e.clientX - lastPX, dy = e.clientY - lastPY;
        lastPX = e.clientX; lastPY = e.clientY;
        moved += Math.abs(dx) + Math.abs(dy);
        yaw += dx * 0.45; velX = dx * 0.45;
        if (e.pointerType === "mouse") { pitch = clamp(pitch - dy * 0.3, -55, 6); velY = -dy * 0.3; }
        if (reduce) requestAnimationFrame(render);
      } else if (finePointer && !reduce) {
        var r = viewport.getBoundingClientRect();
        hoverX = ((e.clientX - r.left) / r.width - 0.5) * 16;
        hoverY = -((e.clientY - r.top) / r.height - 0.5) * 10;
      }
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      viewport.classList.remove("is-dragging");
      if (moved < 6) setOpen(!open); // a click, not a drag
    }
    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", function () { dragging = false; viewport.classList.remove("is-dragging"); });
    viewport.addEventListener("pointerleave", function () { hoverX = hoverY = 0; });

    measure();
    window.addEventListener("resize", measure);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { onScreen = en[0].isIntersecting; update(); }, { rootMargin: "60px" }).observe(root);
    }
    doc.addEventListener("visibilitychange", update);
    update();
    // Open once on arrival so visitors see what's inside.
    if (!reduce) setTimeout(function () { if (!open && !dragging) setOpen(true); }, 1400);
  })();

  /* ================= 2. Pack a kit ================= */
  (function pack() {
    var section = doc.querySelector("[data-pack]");
    if (!section) return;
    var items = Array.prototype.slice.call(section.querySelectorAll(".pack-item"));
    var countEl = section.querySelector("[data-pack-count]");
    var progress = section.querySelector(".pack-progress");
    var packAll = section.querySelector("[data-pack-all]");
    var reset = section.querySelector("[data-pack-reset]");
    var total = items.length;
    var celebrated = false;

    function packed() { return items.filter(function (b) { return b.getAttribute("aria-pressed") === "true"; }).length; }
    function refresh() {
      var n = packed();
      countEl.textContent = n;
      progress.style.setProperty("--p", (n / total).toFixed(3));
      progress.setAttribute("aria-valuenow", n);
      var done = n === total;
      section.classList.toggle("is-packed", done);
      packAll.textContent = done ? "Unpack" : "Pack everything";
      if (done && !celebrated) { celebrated = true; burst(progress); }
      if (!done) celebrated = false;
    }
    items.forEach(function (b) {
      b.addEventListener("click", function () {
        b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") === "true" ? "false" : "true");
        refresh();
      });
    });
    packAll.addEventListener("click", function () {
      var fill = packed() !== total;
      items.forEach(function (b, i) {
        if (reduce || !fill) b.setAttribute("aria-pressed", fill ? "true" : "false");
        else setTimeout(function () { b.setAttribute("aria-pressed", "true"); refresh(); }, i * 45);
      });
      refresh();
    });
    if (reset) reset.addEventListener("click", function () {
      items.forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
      refresh();
    });

    // A burst of little crosses when the kit is complete.
    function burst(from) {
      if (reduce || !Element.prototype.animate) return;
      var r = from.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      var colors = ["#DF513E", "#BF4435", "#2B241C", "#EF8A6E", "#E9C46A"];
      for (var i = 0; i < 44; i++) {
        var c = doc.createElement("span");
        c.className = "confetti";
        c.style.setProperty("--c", colors[i % colors.length]);
        c.style.left = cx + "px"; c.style.top = cy + "px";
        doc.body.appendChild(c);
        var ang = Math.random() * Math.PI * 2, dist = 90 + Math.random() * 220;
        var dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist * 0.7 - 80;
        var anim = c.animate([
          { transform: "translate(-50%,-50%) scale(0.4) rotate(0deg)", opacity: 1 },
          { transform: "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px)) scale(1) rotate(" + (Math.random() * 540 - 270) + "deg)", opacity: 1, offset: 0.55 },
          { transform: "translate(calc(-50% + " + dx * 1.15 + "px), calc(-50% + " + (dy + 160) + "px)) scale(0.8) rotate(" + (Math.random() * 720 - 360) + "deg)", opacity: 0 }
        ], { duration: 1300 + Math.random() * 600, easing: "cubic-bezier(.2,.7,.3,1)" });
        anim.onfinish = (function (el) { return function () { el.remove(); }; })(c);
      }
    }
    refresh();
  })();
})();
