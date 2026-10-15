/* TARTARIA XP — luxury.js: compass tracking · astrolabe stars/scroll · real-time sun.
   Vanilla JS, no dependencies. Load after script.js. */
(() => {
  "use strict";
  const $ = (s) => document.querySelector(s);
  const NS = "http://www.w3.org/2000/svg";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const touch = matchMedia("(hover: none), (pointer: coarse)").matches;
  const scrollPct = () => {                                   // 0 (top) … 1 (bottom)
    const max = document.documentElement.scrollHeight - innerHeight;
    return max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
  };

  /* ======================= 1. COMPASS ======================= */
  const needle = $("#compass-needle");
  if (needle && !reduced) {
    const btn = needle.closest(".luxury-button");
    // The needle is drawn pointing East at rotate(0deg); screen angles from atan2 (0° = right, clockwise) match CSS rotation.
    const REST = -90, EAST = 0, RADIUS = 320;
    let cur = REST, target = REST, spin = false, lockUntil = 0, tilt = 0, raf = 0;
    const wrap = (a) => ((((a + 180) % 360) + 360) % 360) - 180;   // shortest-path difference, -180…180
    const draw = () => (needle.style.transform = `rotate(${cur}deg)`);

    const loop = () => {                                           // eased follow: 12% of the remaining angle per frame
      const d = spin ? target - cur : wrap(target - cur);
      cur += d * 0.12;
      draw();
      if (Math.abs(d) > 0.15) { raf = requestAnimationFrame(loop); return; }
      cur = spin ? EAST : target; target = cur; spin = false; raf = 0; draw();
    };
    const go = (angle, full) => { target = angle; spin = !!full; if (!raf) raf = requestAnimationFrame(loop); };

    needle.classList.add("is-driven");                             // switches off the CSS transform transition
    draw();

    if (!touch) {
      // Desktop: near the button → look at the cursor; over the button → snap to EAST with glow.
      addEventListener("pointermove", (e) => {
        if (e.pointerType !== "mouse") return;
        const r = btn.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        btn.classList.toggle("is-east", inside);
        go(inside ? EAST : Math.hypot(dx, dy) < RADIUS ? Math.atan2(dy, dx) * 180 / Math.PI : REST);
      }, { passive: true });
    } else {
      // Touch: the driver is the button's own progress through the window (centre of the button: bottom of the screen → ~40% of its height).
      // The needle is a spring: it swings, overshoots a little, finds East and lights up. The gyroscope is only a bonus (a light tremble);
      // we never ask iOS for permission — without it the needle simply keeps a damped sway after landing.
      let vel = 0, p = 0, pt = 0, lit = false, locked = false, tiltT = 0, tiltC = 0, sraf = 0;
      const BASE = () => REST + (EAST - REST) * pt;
      const step = () => {
        sraf = 0;
        if (locked) return;
        p += (pt - p) * 0.16;                                      // smoothed progress
        tiltC += (tiltT - tiltC) * 0.1;
        const aim = REST + (EAST - REST) * p + tiltC;
        vel += (aim - cur) * 0.07; vel *= 0.84; cur += vel;       // soft spring, slight overshoot
        draw();
        const on = p > 0.96;
        if (on !== lit) { lit = on; btn.classList.toggle("is-east", on); if (on) vel += 5; }   // landing kick → damped sway
        if (Math.abs(aim - cur) > 0.04 || Math.abs(vel) > 0.04 || Math.abs(pt - p) > 0.001 || Math.abs(tiltT - tiltC) > 0.05) sraf = requestAnimationFrame(step);
      };
      const wake = () => { if (!sraf && !locked) sraf = requestAnimationFrame(step); };
      const measure = () => {
        const r = btn.getBoundingClientRect(), vh = innerHeight, cy = r.top + r.height / 2;
        const from = Math.min(vh, cy + scrollY), den = Math.max(80, from - vh * 0.4);   // button already in the hero → progress starts from where it rests
        const q = Math.min(1, Math.max(0, (from - cy) / den));
        pt = q * q * (3 - 2 * q); wake();
      };
      let mt = 0;
      const onScroll = () => { if (!mt) mt = requestAnimationFrame(() => { mt = 0; measure(); }); };
      addEventListener("scroll", onScroll, { passive: true });
      addEventListener("resize", onScroll);
      addEventListener("load", onScroll);
      addEventListener("deviceorientation", (e) => {               // bonus only: ±3° tremble, no permission request
        if (e.gamma == null) return;
        tiltT = Math.max(-30, Math.min(30, e.gamma)) * 0.1; wake();
      });
      measure();

      // tap: a 0.6 s spin that lands on East, then the real navigation
      btn.__tap = (go) => {
        locked = true; cancelAnimationFrame(sraf); sraf = 0;
        btn.classList.add("is-east");
        const from = cur, to = Math.ceil((cur + 140) / 360) * 360 + EAST, t0 = performance.now(), D = 600;
        const run = (now) => {
          const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3);
          cur = from + (to - from) * e; draw();
          if (k < 1) requestAnimationFrame(run);
          else { cur = EAST; vel = 0; p = pt = 1; lit = true; draw(); locked = false; go(); }
        };
        requestAnimationFrame(run);
      };
    }
  }

  /* ======================= 2. ASTROLABE ======================= */
  const rete = $("#astrolabe-rete");
  if (rete) {
    const btn = rete.closest(".luxury-button");
    // star points inside the rete; CSS reveals and twinkles them on hover / tap
    [[50, 31], [70, 48], [32, 60], [58, 70], [41, 42], [63, 36], [36, 74], [68, 64]].forEach(([x, y], i) => {
      const s = document.createElementNS(NS, "circle");
      s.setAttribute("cx", x); s.setAttribute("cy", y); s.setAttribute("r", 1.1); s.setAttribute("class", "astro-star");
      s.style.animationDelay = i * 0.35 + "s";
      rete.appendChild(s);
    });
    if (touch) {
      // same driver as the compass: progress of the button itself through the window; rings and stars follow it
      let p = 0, pt = 0, bonus = 0, lit = false, raf = 0, locked = false;
      const apply = () => {
        const e = p;
        btn.style.setProperty("--rete", (e * 240 + bonus) + "deg");
        btn.style.setProperty("--alidade", (-e * 160 - bonus * 0.6) + "deg");
        const on = e > 0.5 || locked;
        if (on !== lit) { lit = on; btn.classList.toggle("is-lit", on); }
      };
      const step = () => {
        raf = 0;
        p += (pt - p) * 0.14; apply();
        if (Math.abs(pt - p) > 0.001) raf = requestAnimationFrame(step);
      };
      const measure = () => {
        const r = btn.getBoundingClientRect(), vh = innerHeight, cy = r.top + r.height / 2;
        const from = Math.min(vh, cy + scrollY), den = Math.max(80, from - vh * 0.4);
        const q = Math.min(1, Math.max(0, (from - cy) / den));
        pt = q * q * (3 - 2 * q);
        if (!raf) raf = requestAnimationFrame(step);
      };
      let mt = 0;
      const onScroll = () => { if (!mt) mt = requestAnimationFrame(() => { mt = 0; measure(); }); };
      addEventListener("scroll", onScroll, { passive: true });
      addEventListener("resize", onScroll);
      addEventListener("load", onScroll);
      measure();

      btn.__tap = (go) => {                                         // tap: rings turn one extra lap in 0.6 s, stars light, then navigate
        locked = true; cancelAnimationFrame(raf); raf = 0;
        const t0 = performance.now(), D = 600, p0 = p;
        const run = (now) => {
          const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3);
          p = p0 + (1 - p0) * e; bonus = 360 * e; apply();
          if (k < 1) requestAnimationFrame(run); else go();
        };
        requestAnimationFrame(run);
      };
    }
  }


  /* ======================= TAP ROUTER (touch): play the 0.6 s button animation, then go ======================= */
  if (touch && !reduced) {
    document.addEventListener("click", (e) => {
      const b = e.target.closest && e.target.closest(".luxury-button");
      if (!b || !b.__tap) return;
      if (b.__go) { b.__go = false; return; }                       // the re-dispatched click passes through
      e.preventDefault(); e.stopImmediatePropagation();
      if (b.__busy) return;
      b.__busy = true;
      b.__tap(() => { b.__busy = false; b.__go = true; b.click(); });
    }, true);
  }

  /* ======================= 2b. INVESTMENT BUTTON: soft 3D tilt of the wallet ======================= */
  const inv = $(".invest-cta");
  if (inv && !touch && !reduced) {
    inv.addEventListener("pointermove", (e) => {
      const r = inv.getBoundingClientRect();
      inv.style.setProperty("--mx", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      inv.style.setProperty("--my", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    }, { passive: true });
    inv.addEventListener("pointerleave", () => { inv.style.setProperty("--mx", 0); inv.style.setProperty("--my", 0); });
  }

  /* ======================= 3. REAL-TIME SUN ======================= */
  // Colour from the visitor's local hour; the half-sun rises every time the page is scrolled to its very bottom
  // (and settles again when the visitor scrolls away). Works on every page that has the footer: home, expeditions, Pathfinder.
  const sun = $("#heliosWrap");
  if (sun) {
    const PH = {
      day:    ["#D4AF37", "rgba(212,175,55,.4)"],
      sunset: ["#E65100", "rgba(230,81,0,.5)"],
      night:  ["#070709", "rgba(243,229,171,.55)"],
    };
    const setPhase = () => {
      const h = new Date().getHours(), p = h >= 6 && h < 18 ? "day" : h >= 18 && h < 22 ? "sunset" : "night";
      sun.dataset.phase = p;
      sun.style.setProperty("--sun", PH[p][0]); sun.style.setProperty("--glow", PH[p][1]);
      const path = sun.querySelector("path"); if (path) path.style.fill = PH[p][0];
    };
    setPhase();
    setInterval(setPhase, 60000);

    if (reduced) sun.classList.add("is-risen");
    else {
      sun.classList.add("is-armed");
      let timer = 0, ticking = false;
      const update = () => {
        ticking = false;
        const max = document.documentElement.scrollHeight - innerHeight;
        if (max <= 40) {                                   // page shorter than the screen (or content not built yet)
          clearTimeout(timer); timer = setTimeout(() => sun.classList.add("is-risen"), 900); return;
        }
        clearTimeout(timer);
        if (scrollY >= max - (touch ? 48 : 10)) sun.classList.add("is-risen");   // phones: the bounce / toolbars rarely reach the last pixels
        else if (scrollY < max - 220) sun.classList.remove("is-risen");   // re-arm: it rises again on the next visit to the bottom
      };
      const req = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
      addEventListener("scroll", req, { passive: true });
      addEventListener("resize", req);
      addEventListener("load", req);
      if ("ResizeObserver" in window) new ResizeObserver(req).observe(document.documentElement);   // content built after load (expedition pages)
      update();
    }
  }
})();
