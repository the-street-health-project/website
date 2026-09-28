/* The Street Health Project: the Upcoming-page globe.
   A dotted Earth on <canvas> with the route from Cedar Rapids, Iowa to
   Kanchipuram, India. Drag to spin; it eases back to show the whole route.
   Land dots come from globe-dots.js. Without JS, the flat route SVG shows instead. */
(function () {
  "use strict";
  var host = document.querySelector("[data-globe]");
  var raw = window.GLOBE_DOTS;
  if (!host || !raw || !raw.length) return;
  var canvas = host.querySelector("canvas");
  var ctx = canvas && canvas.getContext("2d");
  if (!ctx) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var D = Math.PI / 180, TAU = Math.PI * 2;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function vec(lon, lat) { var c = Math.cos(lat * D); return [c * Math.cos(lon * D), c * Math.sin(lon * D), Math.sin(lat * D)]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function norm(a) { var l = Math.sqrt(dot(a, a)) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function mul(a, k) { return [a[0] * k, a[1] * k, a[2] * k]; }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  // Land dots as unit vectors.
  var N = raw.length / 2, DX = new Float32Array(N), DY = new Float32Array(N), DZ = new Float32Array(N);
  for (var i = 0; i < N; i++) {
    var v = vec(raw[2 * i + 1] / 10, raw[2 * i] / 10);
    DX[i] = v[0]; DY[i] = v[1]; DZ[i] = v[2];
  }

  // The route, as a great circle raised off the surface in the middle.
  var A = vec(-91.6656, 41.9779);   // Cedar Rapids, Iowa
  var B = vec(79.7036, 12.8342);    // Kanchipuram, India
  var omega = Math.acos(clamp(dot(A, B), -1, 1)), sinO = Math.sin(omega);
  function slerp(t) {
    var k1 = Math.sin((1 - t) * omega) / sinO, k2 = Math.sin(t * omega) / sinO;
    return [k1 * A[0] + k2 * B[0], k1 * A[1] + k2 * B[1], k1 * A[2] + k2 * B[2]];
  }
  var SEG = 96, LIFT = 0.2;
  function arcPoint(t) { return mul(slerp(t), 1 + LIFT * Math.sin(Math.PI * t)); }
  var arcPts = [];
  for (var s = 0; s <= SEG; s++) arcPts.push(arcPoint(s / SEG));

  // View orientation as a rotation matrix: rows are screen-right, screen-up, toward-viewer.
  // Home: centered on the route's midpoint, turned so Iowa sits left and India right.
  var center = norm(slerp(0.5));
  var ab = sub(B, A);
  var right = norm(sub(ab, mul(center, dot(ab, center))));
  var HOME = [right, cross(center, right), center];

  function matMul(R, m) {
    var o = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (var r = 0; r < 3; r++) for (var c = 0; c < 3; c++) o[r][c] = R[r][0] * m[0][c] + R[r][1] * m[1][c] + R[r][2] * m[2][c];
    return o;
  }
  function orthonormalize(m) {
    var r0 = norm(m[0]);
    var r1 = norm(sub(m[1], mul(r0, dot(r0, m[1]))));
    return [r0, r1, cross(r0, r1)];
  }
  function rotY(t) { var c = Math.cos(t), s = Math.sin(t); return [[c, 0, s], [0, 1, 0], [-s, 0, c]]; }
  function rotX(t) { var c = Math.cos(t), s = Math.sin(t); return [[1, 0, 0], [0, c, -s], [0, s, c]]; }
  HOME = matMul(rotX(-0.5), HOME);
  var M = [HOME[0].slice(), HOME[1].slice(), HOME[2].slice()];

  var size = 0, r = 0, cx = 0, cy = 0;
  function resize() {
    var w = Math.min(host.clientWidth || 400, 520);
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    size = w; r = w * 0.4; cx = cy = w / 2;
    canvas.style.width = w + "px"; canvas.style.height = w + "px";
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(w * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  var q = [0, 0, 0];
  function project(W, p) {
    q[0] = dot(W[0], p); q[1] = dot(W[1], p); q[2] = dot(W[2], p);
    return q;
  }
  function visible(p) { return p[2] > 0 || p[0] * p[0] + p[1] * p[1] > 1; }

  function strokeArc(W, upto) {
    ctx.beginPath();
    var pen = false, last = Math.floor(upto * SEG);
    for (var i = 0; i <= last + 1; i++) {
      var p = i <= last ? arcPts[i] : arcPoint(upto);
      if (i > last && upto >= 1) break;
      project(W, p);
      if (visible(q)) {
        var x = cx + r * q[0], y = cy - r * q[1];
        if (pen) ctx.lineTo(x, y); else { ctx.moveTo(x, y); pen = true; }
      } else pen = false;
    }
    ctx.stroke();
  }

  function marker(W, p, color, label, pulse) {
    project(W, p);
    if (q[2] <= 0.02) return;
    var x = cx + r * q[0], y = cy - r * q[1];
    ctx.strokeStyle = color; ctx.globalAlpha = (1 - pulse) * 0.9; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(x, y, 5 + pulse * 14, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 1; ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(x, y, 4.5, 0, TAU); ctx.fill();
    ctx.font = "700 " + Math.max(10, Math.round(size / 40)) + "px Figtree, 'Segoe UI', sans-serif";
    ctx.textBaseline = "bottom";
    ctx.textAlign = "center";
    ctx.fillStyle = "#F5E9D0";
    ctx.fillText(label, x, y - 12);
  }

  var journey = 0, idle = 0, dragging = false, vx = 0, vy = 0, clock = 0;
  var TRAVEL = 4200, HOLD = 2000, FADE = 800, CYCLE = TRAVEL + HOLD + FADE;

  function draw() {
    var wob = reduce ? 0 : Math.sin(clock / 4200) * 0.16;
    var W = matMul(rotY(wob), M);
    ctx.clearRect(0, 0, size, size);

    // Atmosphere + body
    var glow = ctx.createRadialGradient(cx, cy, r * 0.92, cx, cy, r * 1.22);
    glow.addColorStop(0, "rgba(223,81,62,0.22)"); glow.addColorStop(1, "rgba(223,81,62,0)");
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, r * 1.22, 0, TAU); ctx.fill();
    var body = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
    body.addColorStop(0, "#4B4034"); body.addColorStop(1, "#1E1813");
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(245,233,208,0.16)"; ctx.lineWidth = 1; ctx.stroke();

    // Land dots, brighter toward the viewer
    var ds = Math.max(1.4, r / 140);
    var w0 = W[0], w1 = W[1], w2 = W[2];
    ctx.fillStyle = "#F5E9D0";
    for (var i = 0; i < N; i++) {
      var z = w2[0] * DX[i] + w2[1] * DY[i] + w2[2] * DZ[i];
      if (z <= 0) continue;
      var x = w0[0] * DX[i] + w0[1] * DY[i] + w0[2] * DZ[i];
      var y = w1[0] * DX[i] + w1[1] * DY[i] + w1[2] * DZ[i];
      var sz = ds * (0.55 + 0.45 * z);
      ctx.globalAlpha = 0.2 + 0.78 * z;
      ctx.fillRect(cx + r * x - sz / 2, cy - r * y - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;

    // Route: faint full path, then the traveled part in red
    var t = reduce ? TRAVEL + 1 : journey % CYCLE;
    var prog = easeInOut(clamp(t / TRAVEL, 0, 1));
    var fade = t > TRAVEL + HOLD ? 1 - (t - TRAVEL - HOLD) / FADE : 1;
    ctx.lineCap = "round";
    ctx.setLineDash([3, 6]); ctx.lineWidth = 1.4; ctx.strokeStyle = "rgba(245,233,208,0.28)";
    strokeArc(W, 1);
    ctx.setLineDash([]);
    if (prog > 0) {
      ctx.globalAlpha = fade;
      ctx.shadowColor = "rgba(223,81,62,0.9)"; ctx.shadowBlur = 10;
      ctx.lineWidth = 2.6; ctx.strokeStyle = "#EF6A53";
      strokeArc(W, prog);
      ctx.shadowBlur = 0; ctx.globalAlpha = 1;
      project(W, arcPoint(prog));
      if (visible(q) && fade > 0.05) {
        var px = cx + r * q[0], py = cy - r * q[1];
        ctx.globalAlpha = fade;
        ctx.fillStyle = "rgba(239,106,83,0.35)"; ctx.beginPath(); ctx.arc(px, py, 10, 0, TAU); ctx.fill();
        ctx.fillStyle = "#FFFFFF"; ctx.beginPath(); ctx.arc(px, py, 4.2, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    var pulse = reduce ? 0.4 : (clock % 1800) / 1800;
    marker(W, A, "#F5E9D0", "CEDAR RAPIDS", pulse);
    marker(W, B, "#EF6A53", "KANCHIPURAM", (pulse + 0.5) % 1);
  }

  var running = false, onScreen = false, lastTs = 0;
  function frame(ts) {
    if (!running) return;
    var dt = lastTs ? Math.min(50, ts - lastTs) : 16;
    lastTs = ts; clock += dt; journey += dt;
    if (!dragging) {
      if (Math.abs(vx) + Math.abs(vy) > 0.0001) {
        M = orthonormalize(matMul(matMul(rotY(vx), rotX(vy)), M));
        vx *= 0.92; vy *= 0.92;
      }
      idle += dt;
      if (idle > 2200) {
        for (var k = 0; k < 3; k++) for (var j = 0; j < 3; j++) M[k][j] += (HOME[k][j] - M[k][j]) * 0.03;
        M = orthonormalize(M);
      }
    }
    draw();
    requestAnimationFrame(frame);
  }
  function update() {
    var should = onScreen && !document.hidden && !reduce;
    if (should && !running) { running = true; lastTs = 0; requestAnimationFrame(frame); }
    if (!should) running = false;
  }

  // Drag to spin
  var lx = 0, ly = 0;
  canvas.addEventListener("pointerdown", function (e) {
    dragging = true; lx = e.clientX; ly = e.clientY; vx = vy = 0;
    canvas.classList.add("is-dragging");
    if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", function (e) {
    if (!dragging) return;
    var k = 1 / Math.max(120, r);
    var ax = (e.clientX - lx) * k, ay = e.pointerType === "mouse" ? (e.clientY - ly) * k : 0;
    lx = e.clientX; ly = e.clientY;
    M = orthonormalize(matMul(matMul(rotY(ax), rotX(ay)), M));
    vx = ax; vy = ay; idle = 0;
    if (!running) draw();
  });
  function end() { dragging = false; idle = 0; canvas.classList.remove("is-dragging"); }
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);

  resize();
  host.classList.add("is-ready");
  resize();
  draw();
  var rt = 0;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { resize(); draw(); }, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) { onScreen = en[0].isIntersecting; update(); }, { rootMargin: "100px" }).observe(host);
  } else { onScreen = true; update(); }
  document.addEventListener("visibilitychange", update);
})();
