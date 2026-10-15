/* TARTARIA XP — atlas.js
   Route map: dark globe → golden glint (left → right) → coastlines & borders draw on → slow pull-in →
   cities → one continuous route line, then a living idle state.
   Canvas 2D, no dependencies. Needs atlas-data.js (built from world.svg) and routes.js (TXP_VISIT). */
(() => {
  "use strict";
  const D = Math.PI / 180, TAU = Math.PI * 2;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const ease = (t) => t * t * t * (t * (6 * t - 15) + 10);
  const lerp = (a, b, t) => a + (b - a) * t;

  /* ---------- decode world data once ---------- */
  const A = window.ATLAS || { s: 40, n: [], d: [], r: [] };
  const RINGS = A.r.map(([own, chunks]) => {
    const lam = [], lat = [], ch = [];
    chunks.forEach(([type, f], k) => {
      for (let i = k ? 2 : 0; i < f.length; i += 2) { lam.push((f[i] / A.s) * D); lat.push((f[i + 1] / A.s) * D); }
      ch.push([type, k ? ch[k - 1][2] : 0, lam.length - 1]);
    });
    const n = lam.length, sp = new Float32Array(n), cp = new Float32Array(n);
    for (let i = 0; i < n; i++) { sp[i] = Math.sin(lat[i]); cp[i] = Math.cos(lat[i]); }
    return { own, n, lam: Float32Array.from(lam), lat: Float32Array.from(lat), sp, cp, ch, d0: 0, hot: false };
  });
  const MAXN = Math.max(8, ...RINGS.map((r) => r.n));
  const XS = new Float32Array(MAXN), YS = new Float32Array(MAXN), OK = new Uint8Array(MAXN);

  const inside = (p, lo, la) => {
    let c = false;
    for (let i = 0, j = p.n - 1; i < p.n; j = i++) {
      const yi = p.lat[i], yj = p.lat[j];
      if ((yi > la) !== (yj > la) && lo < ((p.lam[j] - p.lam[i]) * (la - yi)) / (yj - yi) + p.lam[i]) c = !c;
    }
    return c;
  };

  /* ---------- route geometry: one line type, every leg keeps its natural bends ---------- */
  const vec = (l, f) => [Math.cos(f) * Math.cos(l), Math.cos(f) * Math.sin(l), Math.sin(f)];
  const buildLegs = (w) => {
    const legs = []; let total = 0;
    for (let i = 1; i < w.length; i++) {
      const a = w[i - 1], b = w[i], va = vec(a.lo, a.la), vb = vec(b.lo, b.la);
      const om = Math.acos(clamp(va[0] * vb[0] + va[1] * vb[1] + va[2] * vb[2], -1, 1)) || 1e-6;
      const dx = (b.lo - a.lo) * Math.cos((a.la + b.la) / 2), dy = b.la - a.la, len = Math.hypot(dx, dy) || 1e-6;
      const pts = [], N = 120, seed = i * 7.13;
      for (let s = 0; s <= N; s++) {
        const t = s / N, k1 = Math.sin((1 - t) * om) / Math.sin(om), k2 = Math.sin(t * om) / Math.sin(om);
        const v = [k1 * va[0] + k2 * vb[0], k1 * va[1] + k2 * vb[1], k1 * va[2] + k2 * vb[2]];
        let l = Math.atan2(v[1], v[0]), f = Math.asin(clamp(v[2], -1, 1));
        const off = Math.sin(Math.PI * t) * om * (0.05 * Math.sin(t * 9 + seed) + 0.028 * Math.sin(t * 23 + seed * 2) + 0.012 * Math.sin(t * 47 + seed));
        l += (-dy / len * off) / Math.cos(f); f += (dx / len) * off;
        pts.push({ l, sp: Math.sin(f), cp: Math.cos(f), t });
      }
      legs.push({ pts, om }); total += om;
    }
    let acc = 0; legs.forEach((g) => { g.pts.forEach((p) => (p.f = (acc + g.om * p.t) / total)); acc += g.om; });
    return legs;
  };

  /* camera: Kazakhstan and Central Asia always stay in frame; a per-route factor pulls back further */
  const ZF = { 1: 0.96, 2: 0.88, 3: 0.88, 4: 1, 5: 1, 6: 1, 7: 0.84, 8: 0.9 };
  const ANCHORS = [[55.4, 46.5], [40.6, 46.5], [55.4, 87.4], [40.6, 87.4], [36.5, 56], [36.5, 80]];   // Kazakhstan + its southern neighbours (lat, lon)

  const store = {                                   // visit gate (30 min) — falls back to localStorage alone
    seen: (k) => (window.TXP_VISIT ? TXP_VISIT.seen(k) : false),
    mark: (k) => window.TXP_VISIT && TXP_VISIT.mark(k),
  };

  function mount(cv, route, opts) {
    opts = opts || {};
    const ctx = cv.getContext("2d");
    const mini = !!opts.mini;
    const mobile = matchMedia("(max-width: 760px), (pointer: coarse)").matches;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const key = "map" + route.i;
    let seen = !mini && store.seen(key);
    if (/[?&]replay/.test(location.search)) seen = false;
    let play = !seen && !reduce;
    const speed = mini ? 1.7 : 1;

    const wp = route.w.map(([n, la, lo]) => ({ n, la: la * D, lo: lo * D }));
    const legs = buildLegs(wp);
    /* Timing: the route is drawn from T0; its duration grows with the route length (legs), so the long Great Exodus
       takes ≈2.3× the standard 3 s, Imperial Horde a little longer, the rest stay close to the old pace. END (the switch to the
       "living" state) follows the drawing. */
    const LEN = legs.reduce((a, g) => a + g.om, 0) || 1e-6;
    const T0 = 10.2, DUR = 3.0 * (0.9 + 1.4 * Math.pow(Math.min(1.2, LEN / 1.384), 12)), END = T0 + DUR + 0.2;
    const invEase = (y) => { let lo = 0, hi = 1; for (let i = 0; i < 22; i++) { const m = (lo + hi) / 2; ease(m) < y ? (lo = m) : (hi = m); } return (lo + hi) / 2; };
    const cityT = (() => {                         // each city lights up just before the line reaches it
      let acc = 0; const out = [9.4];
      legs.forEach((g, k) => { acc += g.om / LEN; out.push(Math.max(9.4 + 0.3 * (k + 1), T0 + DUR * invEase(Math.min(1, acc)) - 0.9)); });
      return out;
    })();
    // countries the route touches burn brighter
    const hotOwners = new Set();
    wp.forEach((q) => {
      let hit = RINGS.find((p) => inside(p, q.lo, q.la)), best = 0.05;
      if (!hit) RINGS.forEach((p) => { for (let i = 0; i < p.n; i++) { const d = Math.hypot((p.lam[i] - q.lo) * Math.cos(q.la), p.lat[i] - q.la); if (d < best) { best = d; hit = p; } } });
      if (hit) hotOwners.add(hit.own);
    });
    RINGS.forEach((p) => (p.hot = hotOwners.has(p.own) && !A.d.includes(p.own)));

    // camera target from the waypoints + Kazakhstan anchors
    const all = wp.map((q) => [q.la, q.lo]).concat(ANCHORS.map(([a, b]) => [a * D, b * D]));
    const lc = (Math.max(...all.map((q) => q[1])) + Math.min(...all.map((q) => q[1]))) / 2;
    const pc = (Math.max(...all.map((q) => q[0])) + Math.min(...all.map((q) => q[0]))) / 2;
    const fit = (() => {                            // unit-sphere extents about the centre
      let mx = 0.05, my = 0.05; const s0 = Math.sin(pc), c0 = Math.cos(pc);
      all.forEach(([la, lo]) => { const d = lo - lc; mx = Math.max(mx, Math.abs(Math.cos(la) * Math.sin(d))); my = Math.max(my, Math.abs(c0 * Math.sin(la) - s0 * Math.cos(la) * Math.cos(d))); });
      return [mx, my];
    })();
    RINGS.forEach((p) => {                          // outlines are drawn on starting nearest the route
      let m = 0; for (let i = 0; i < p.n; i++) m += p.lam[i]; m /= p.n;
      const d = Math.hypot((m - lc) * Math.cos(pc), p.lat[p.n >> 1] - pc);
      p.d0 = 3.6 + (p.hot ? 0 : 0.6) + 4.2 * clamp(d / 1.4);
    });
    const stars = Array.from({ length: mobile ? 36 : 80 }, (_, i) => [((i * 97) % 101) / 101, ((i * 53) % 97) / 97, (i % 7) * 0.9]);

    let replayBtn = null;
    let slow = false, heavy = 0, W = 0, H = 0, dpr = 1, R0 = 1, R1 = 1, vis = false, raf = 0, last = 0, start = 0;
    let px = 0, py = 0, tx = 0, ty = 0, dragL = 0, dragP = 0, dragging = false, down = null, tapIdx = -1, tapUntil = 0;
    const hits = [];
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.6 : 2);
      W = cv.clientWidth; H = cv.clientHeight; if (!W || !H) return;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      R0 = Math.min(W, H) * 0.4;
      R1 = Math.max(R0 * 1.2, Math.min((W * (mobile ? 0.43 : 0.4)) / fit[0], (H * 0.4) / fit[1]) * (ZF[route.i] || 1));
    };

    const draw = (t, T) => {
      ctx.clearRect(0, 0, W, H);
      const u = play ? ease(clamp((t - 1.4) / 8.4)) : 1, live = sstep(END - 1.8, END, t);
      const R = R0 * Math.pow(R1 / R0, u);
      px += (tx - px) * 0.04; py += (ty - py) * 0.04;
      if (!dragging) { dragL *= 0.992; dragP *= 0.992; }
      const amp = mobile ? 0.03 : 0.024;
      const lam = lerp(lc - 0.7, lc, u) + live * (-px * amp + dragL + (mobile ? 0.02 : 0.011) * Math.sin(T * 0.15));
      const phi = lerp(0.2, pc, u) + live * (py * amp * 0.6 + dragP + (mobile ? 0.012 : 0.007) * Math.sin(T * 0.11 + 1));
      const cx = W / 2, cy = H / 2, s0 = Math.sin(phi), c0 = Math.cos(phi);
      const discA = sstep(0, 1.6, t), bordA = play ? sstep(3.4, 8.8, t) : 1, hotA = play ? sstep(7.6, 10.6, t) : 1;
      const pr = (l, sp, cp) => { const d = l - lam, cd = Math.cos(d); return [cx + R * cp * Math.sin(d), cy - R * (c0 * sp - s0 * cp * cd), s0 * sp + c0 * cp * cd]; };
      const sphereOn = R < Math.max(W, H) * 1.3, sa = discA * (1 - sstep(0.3, 0.8, u) * 0.96);

      // dust of stars
      ctx.fillStyle = "#F3E5AB";
      stars.forEach(([x, y, ph]) => { ctx.globalAlpha = (0.1 + 0.16 * Math.sin(T * 0.8 + ph) ** 2) * discA; ctx.fillRect(x * W, y * H, 1.1, 1.1); });

      // dark sphere
      if (sphereOn) {
        let g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.05, cx, cy, R);
        g.addColorStop(0, "rgba(40,31,20,.8)"); g.addColorStop(0.55, "rgba(16,13,11,.92)"); g.addColorStop(1, "rgba(5,5,6,.97)");
        ctx.globalAlpha = sa; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
        // golden glint: a very soft light travelling along an arc from the upper-left, over ~5.6 s (screen blend, no "lighter")
        if (play) {
          const gp = clamp((t - 1.2) / 5.6), env = sstep(0, 0.28, gp) * (1 - sstep(0.62, 1, gp));
          if (gp > 0 && gp < 1 && env > 0.003) {
            ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
            ctx.globalCompositeOperation = "screen";
            const ang = lerp(-2.45, -0.15, gp), gx = cx + Math.cos(ang) * R * 0.95, gy = cy + Math.sin(ang) * R * 0.95;
            const rg = ctx.createRadialGradient(gx, gy, 0, gx, gy, R * 1.45);
            [[0, 1], [.1, .8], [.22, .56], [.36, .35], [.5, .2], [.64, .1], [.78, .04], [.9, .012], [1, 0]]
              .forEach(([o, al]) => rg.addColorStop(o, `rgba(243,229,171,${(al * 0.14).toFixed(4)})`));          // peak ≈ .14
            ctx.globalAlpha = env * sa; ctx.fillStyle = rg; ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
            // rim: short arcs along the limb, fading away from the lit point (no shadowBlur)
            ctx.lineWidth = Math.max(1.2, R * 0.022); ctx.lineCap = "butt"; ctx.strokeStyle = "#F3E5AB";
            const N = 14, da = 0.05;
            for (let k = -N; k < N; k++) {
              const q = 1 - Math.abs(k + 0.5) / N;
              ctx.globalAlpha = env * sa * 0.26 * q * q;
              ctx.beginPath(); ctx.arc(cx, cy, R - ctx.lineWidth * 0.5, ang + k * da, ang + (k + 1) * da + 0.004); ctx.stroke();
            }
            ctx.restore();
          }
        }
      }
      // graticule
      if (sphereOn && (!mobile || R < Math.min(W, H))) {
        ctx.globalAlpha = 0.05 * discA * (1 - u * 0.6); ctx.strokeStyle = "#D4AF37"; ctx.lineWidth = 0.5; ctx.beginPath();
        const line = (fn) => { let on = false; for (let k = 0; k <= 100; k++) { const [l, f] = fn(k / 100); const q = pr(l, Math.sin(f), Math.cos(f)); if (q[2] > 0) { on ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); on = true; } else on = false; } };
        for (let la = -60; la <= 75; la += 15) line((s) => [(-180 + s * 360) * D, la * D]);
        for (let lo = 0; lo < 360; lo += 15) line((s) => [lo * D, (-85 + s * 170) * D]);
        ctx.stroke();
      }

      // land: soft warm fill, hairline coast, fainter borders (disputed territories: outer contour only)
      ctx.lineJoin = "round"; ctx.lineCap = "round";
      RINGS.forEach((p) => {
        const n = p.n; let nv = 0;
        for (let i = 0; i < n; i++) { const q = pr(p.lam[i], p.sp[i], p.cp[i]); XS[i] = q[0]; YS[i] = q[1]; if (q[2] > 0) { OK[i] = 1; nv++; } else OK[i] = 0; }
        if (!nv) return;
        const frac = play ? sstep(p.d0, p.d0 + 3.4, t) : 1; if (frac <= 0) return;
        const hot = p.hot ? hotA : 0, breath = 0.025 * Math.sin(T * 0.9) * live;
        const k = Math.max(2, Math.ceil(frac * n));
        // fill (hidden vertices are pushed onto the limb)
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          let x = XS[i], y = YS[i];
          if (!OK[i]) { const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1; x = cx + (dx / l) * R; y = cy + (dy / l) * R; }
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.closePath();
        ctx.globalAlpha = 1; ctx.fillStyle = `rgba(212,175,55,${(0.03 * discA + hot * (0.07 + breath)) * sstep(0.35, 1, frac)})`; ctx.fill();
        // strokes per type
        [["c", 0.62, 0.8], ["b", 0.2, 0.5]].forEach(([ty, a0, lw]) => {
          if (ty === "b" && A.d.includes(p.own)) return;
          ctx.beginPath(); let any = false;
          p.ch.forEach(([ct, s, e]) => {
            if (ct !== ty) return;
            for (let i = s, on = false; i <= e && i < k; i++) {
              if (OK[i]) { on ? ctx.lineTo(XS[i], YS[i]) : ctx.moveTo(XS[i], YS[i]); on = true; any = true; } else on = false;
            }
          });
          if (!any) return;
          ctx.strokeStyle = hot > 0.02 && ty === "c" ? "#E6C45A" : "#D4AF37"; ctx.lineWidth = lw;
          ctx.globalAlpha = Math.min(1, (a0 * (0.55 + 0.45 * bordA) + hot * (ty === "c" ? 0.3 : 0.2)) * discA);
          ctx.stroke();
        });
      });
      // limb darkening: gives the globe depth, fades out as the camera closes in
      if (sphereOn && sa > 0.02) {
        const g = ctx.createRadialGradient(cx, cy, R * 0.55, cx, cy, R);
        g.addColorStop(0, "rgba(5,5,7,0)"); g.addColorStop(1, "rgba(5,5,7,.6)");
        ctx.globalAlpha = sa; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
        const r = ctx.createRadialGradient(cx, cy, R * 0.94, cx, cy, R * 1.1);
        r.addColorStop(0, "rgba(212,175,55,0)"); r.addColorStop(0.4, "rgba(212,175,55,.2)"); r.addColorStop(1, "rgba(212,175,55,0)");
        ctx.fillStyle = r; ctx.beginPath(); ctx.arc(cx, cy, R * 1.1, 0, TAU); ctx.fill();
      }

      // route: one continuous line
      const rp = play ? ease(clamp((t - T0) / DUR)) : 1;
      const flat = [];
      legs.forEach((g) => g.pts.forEach((p, k) => { const q = pr(p.l, p.sp, p.cp); flat.push({ x: q[0], y: q[1], f: p.f, v: q[2] > 0, br: k === 0 }); }));
      // exact point on the route at fraction f (interpolated between samples → motion is continuous, never frame-by-frame)
      const at = (f) => {
        let lo = 0, hi = flat.length - 1;
        while (hi - lo > 1) { const m = (lo + hi) >> 1; flat[m].f <= f ? (lo = m) : (hi = m); }
        const a = flat[lo], b = flat[hi], k = b.f > a.f && !b.br ? clamp((f - a.f) / (b.f - a.f)) : 0;
        return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), v: a.v && (b.v || k === 0) };
      };
      const stroke = (from, to, w, a, color) => {
        ctx.beginPath(); let on = false;
        for (let i = 0; i < flat.length; i++) {
          const p = flat[i];
          if (p.f < from || !p.v) { on = false; continue; }
          if (p.f > to) { const e = at(to); if (on && e.v) ctx.lineTo(e.x, e.y); break; }
          on && !p.br ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); on = true;
        }
        ctx.lineWidth = w; ctx.strokeStyle = color; ctx.globalAlpha = a; ctx.stroke();
      };
      const lwG = mobile ? 2.4 : 5, lwL = mobile ? 0.8 : 1.6;
      if (rp > 0) { stroke(0, rp, lwG, 0.16, "#D4AF37"); stroke(0, rp, lwL, 1, "#F3E5AB"); }
      const orb = (f, a) => { const h = at(f); if (!h.v) return; const g = ctx.createRadialGradient(h.x, h.y, 0, h.x, h.y, 14); g.addColorStop(0, "rgba(255,243,196,.95)"); g.addColorStop(0.35, "rgba(243,229,171,.35)"); g.addColorStop(1, "rgba(212,175,55,0)"); ctx.globalAlpha = a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(h.x, h.y, 14, 0, TAU); ctx.fill(); ctx.fillStyle = "#FFF8DC"; ctx.beginPath(); ctx.arc(h.x, h.y, mobile ? 1.8 : 2.4, 0, TAU); ctx.fill(); };
      if (live > 0) {                                // idle caravan: a comet of light flowing along the road, continuous
        const hf = (T * 0.04) % 1, tail = 0.1, S = 26; ctx.setLineDash([]); ctx.lineCap = "round";
        for (let k = 0; k < S; k++) {
          const f0 = hf - tail * (1 - k / S), f1 = hf - tail * (1 - (k + 1) / S); if (f0 < 0) continue;
          const a = at(f0), b = at(f1); if (!a.v || !b.v) continue;
          const q = (k + 1) / S; ctx.globalAlpha = q * q * 0.9 * live; ctx.strokeStyle = "#FFF3C4"; ctx.lineWidth = 0.5 + (mobile ? 1.1 : 1.9) * q;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
        orb(hf, live);
      }
      if (play && rp > 0 && rp < 1) orb(rp, 1);

      // cities (desktop: always labelled · touch: label appears on tap)
      ctx.textBaseline = "middle"; ctx.font = `600 ${mobile ? 9 : 11}px Montserrat, sans-serif`; if ("letterSpacing" in ctx) ctx.letterSpacing = mobile ? "1.5px" : "2px";
      const placed = []; hits.length = 0; const now = performance.now();
      wp.forEach((q, i) => {
        const a = play ? sstep(cityT[i], cityT[i] + 1.1, t) : 1, o = pr(q.lo, Math.sin(q.la), Math.cos(q.la));
        if (a <= 0 || o[2] <= 0.05) return;
        hits.push([o[0], o[1], i]);
        const rr = ((T * 0.35 + i * 0.37) % 1) * (mobile ? 14 : 22) * live;
        ctx.globalAlpha = a; ctx.strokeStyle = "#D4AF37"; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(o[0], o[1], 5 * a, 0, TAU); ctx.stroke();
        ctx.fillStyle = "#F3E5AB"; ctx.beginPath(); ctx.arc(o[0], o[1], 2, 0, TAU); ctx.fill();
        if (rr > 0) { ctx.globalAlpha = (1 - rr / 22) * 0.45 * a; ctx.beginPath(); ctx.arc(o[0], o[1], 5 + rr, 0, TAU); ctx.stroke(); }
        if (mobile && !(tapIdx === i && now < tapUntil)) return;
        const txt = q.n.toUpperCase(), tw = ctx.measureText(txt).width + 4;
        const slots = [[1, -1], [1, 1], [-1, -1], [-1, 1], [1, -2.6], [-1, 2.6]];
        let rect;
        for (const [sx, sy] of slots) {
          const x = o[0] + (sx > 0 ? 10 : -10 - tw), y = o[1] + sy * 11 - 7; rect = [x, y, tw, 14];
          if (x > 4 && x + tw < W - 4 && !placed.some((p) => x < p[0] + p[2] && x + tw > p[0] && y < p[1] + p[3] && y + 14 > p[1])) break;
        }
        placed.push(rect); ctx.textAlign = "left"; ctx.globalAlpha = a * (mobile ? Math.min(1, (tapUntil - now) / 400) : 0.92);
        ctx.strokeStyle = "rgba(5,5,7,.85)"; ctx.lineWidth = 3; ctx.strokeText(txt, rect[0], rect[1] + 7);
        ctx.fillStyle = "#F3E5AB"; ctx.fillText(txt, rect[0], rect[1] + 7);
      });
      ctx.globalAlpha = 1;
    };

    const tick = (ts) => {
      raf = 0; if (!vis || document.hidden) return;
      if (slow && ts - last < 30) { raf = requestAnimationFrame(tick); return; }
      last = ts; if (!start) start = ts;
      const t = play ? ((ts - start) / 1000) * speed : END;
      if (play && t >= END) { play = false; replayBtn && replayBtn.classList.remove("is-playing"); opts.onDone && opts.onDone(); }
      const c0 = performance.now(); draw(play ? t : END, ts / 1000);
      if (!slow && performance.now() - c0 > 15 && ++heavy > 24) slow = true;
      if (reduce && !play) return;
      raf = requestAnimationFrame(tick);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

    /* public replay(): runs the whole sequence again (globe → route). A quiet "Replay" control appears on full-size maps only. */
    const replay = () => {
      if (reduce || play) return;
      play = true; start = 0; tapIdx = -1; dragL = 0; dragP = 0; heavy = 0;
      replayBtn && replayBtn.classList.add("is-playing");
      kick();
    };
    if (!mini && !reduce && cv.parentElement) {
      replayBtn = document.createElement("button");
      replayBtn.type = "button"; replayBtn.className = "atlas__replay"; replayBtn.setAttribute("aria-label", "Replay the route animation");
      replayBtn.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M13.2 8.4A5.2 5.2 0 1 1 11.6 4.3"/><path d="M12.6 1.8v3.2H9.4"/></svg><span>Replay</span>';
      replayBtn.addEventListener("click", replay);
      if (play) replayBtn.classList.add("is-playing");
      cv.parentElement.appendChild(replayBtn);
    }
    cv.__atlas = { replay };

    new ResizeObserver(() => { size(); if (vis) kick(); }).observe(cv);
    size();

    /* pointer: desktop — the map follows the cursor (up = up, left = left) · touch — a finger slides it, a tap names a city */
    cv.style.touchAction = "pan-y";
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top, r]; };
    cv.parentElement.addEventListener("pointermove", (e) => {
      if (e.pointerType === "mouse") { const [x, y, r] = pos(e); tx = (x / r.width - 0.5) * 2; ty = (y / r.height - 0.5) * 2; return; }
      if (!down) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (!dragging && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { dragging = true; try { cv.setPointerCapture(e.pointerId); } catch (_) {} }
      if (dragging) { dragL = clamp(down.l - dx / Math.max(R1, 1), -0.3, 0.3); dragP = clamp(down.p + dy * 0.2 / Math.max(R1, 1), -0.12, 0.12); }
    }, { passive: true });
    cv.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") down = { x: e.clientX, y: e.clientY, l: dragL, p: dragP, t: performance.now() }; });
    const up = (e) => {
      if (down && !dragging && performance.now() - down.t < 500 && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 10) {   // tap → name the nearest city
        const [x, y] = pos(e); let best = 30, hit = -1;
        hits.forEach(([hx, hy, i]) => { const d = Math.hypot(hx - x, hy - y); if (d < best) { best = d; hit = i; } });
        tapIdx = hit; tapUntil = performance.now() + (hit < 0 ? 0 : 3200);
      }
      dragging = false; down = null;
    };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    cv.parentElement.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") { tx = 0; ty = 0; } });

    new IntersectionObserver((es) => {
      vis = es[0].isIntersecting;
      if (vis) { if (play && !start && !mini) store.mark(key); kick(); }
    }, { threshold: 0.35 }).observe(cv);
    document.addEventListener("visibilitychange", () => !document.hidden && kick());
    return cv.__atlas;
  }

  window.Atlas = { mount, replay: (cv) => cv && cv.__atlas && cv.__atlas.replay() };
})();
