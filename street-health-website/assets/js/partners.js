/* The Street Health Project: partners page.
   A 3D photo carousel: drag or swipe, use the arrows, or click a side photo. */
(function () {
  "use strict";
  var cf = document.querySelector("[data-coverflow]");
  if (!cf) return;
  var stage = cf.querySelector(".cf-stage");
  var items = Array.prototype.slice.call(cf.querySelectorAll(".cf-item"));
  var caption = cf.querySelector(".cf-caption");
  var count = cf.querySelector(".cf-count");
  var N = items.length, cur = 0;

  // Shortest signed distance around the loop, so the carousel wraps smoothly.
  function offset(i) {
    var o = (i - cur + N) % N;
    return o > N / 2 ? o - N : o;
  }
  function layout() {
    var gap = Math.min(stage.clientWidth * 0.3, 320);
    items.forEach(function (it, i) {
      var o = offset(i), a = Math.abs(o), dir = o < 0 ? -1 : 1;
      var x = a === 0 ? 0 : dir * (gap * 0.82 + (a - 1) * gap * 0.5);
      var z = -a * 190;
      var ry = a === 0 ? 0 : -dir * 38;
      it.style.transform = "translateX(calc(-50% + " + x.toFixed(1) + "px)) translateZ(" + z + "px) rotateY(" + ry + "deg)";
      it.style.opacity = a > 2 ? "0" : a === 2 ? "0.55" : "1";
      it.style.zIndex = String(10 - a);
      it.classList.toggle("is-side", a !== 0);
      it.setAttribute("aria-hidden", a === 0 ? "false" : "true");
    });
    caption.textContent = items[cur].getAttribute("data-caption") || "";
    count.textContent = (cur + 1) + " / " + N;
  }
  function go(i) { cur = (i + N) % N; layout(); }

  cf.querySelector("[data-cf-prev]").addEventListener("click", function () { go(cur - 1); });
  cf.querySelector("[data-cf-next]").addEventListener("click", function () { go(cur + 1); });
  cf.addEventListener("keydown", function (e) {
    if (e.key === "ArrowLeft") { go(cur - 1); e.preventDefault(); }
    if (e.key === "ArrowRight") { go(cur + 1); e.preventDefault(); }
  });

  // Drag / swipe; a short tap on a side photo brings it to the front.
  var startX = 0, dragging = false, moved = 0;
  stage.addEventListener("pointerdown", function (e) {
    dragging = true; moved = 0; startX = e.clientX;
    stage.classList.add("is-dragging");
  });
  stage.addEventListener("pointermove", function (e) { if (dragging) moved = e.clientX - startX; });
  function end(e) {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove("is-dragging");
    if (moved > 50) go(cur - 1);
    else if (moved < -50) go(cur + 1);
    else if (e && e.target) {
      var hit = e.target.closest(".cf-item");
      if (hit) go(items.indexOf(hit));
    }
  }
  stage.addEventListener("pointerup", end);
  stage.addEventListener("pointercancel", function () { dragging = false; stage.classList.remove("is-dragging"); });
  window.addEventListener("resize", layout);
  layout();
})();
