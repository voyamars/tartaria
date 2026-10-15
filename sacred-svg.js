/*! Tartaria XP — SACRED SVG ART (Stage 2 + 3)
 *
 * Usage (anywhere in HTML, also inside templates rendered later by routes.js —
 * a MutationObserver picks new nodes up automatically):
 *
 *   <div data-sacred="rub"></div>                      Rub el Hizb / Ibn Battuta
 *   <div data-sacred="shanyrak" data-sacred-bg></div>  Shanyrak as a background layer
 *   <div data-sacred="kobyz"></div>                    Kobyz with strings + sound waves
 *
 * Optional attributes:  data-sacred-bg  (decorative background layer, aria-hidden)
 *                       data-label="…"  (accessible name; default is built in)
 *
 * JS API:  TartariaSacred.mount(el, type) · TartariaSacred.scan(root)
 * All speeds / colours / opacities are CSS variables (--sacred-*) in sacred-svg.css.
 */
(function () {
  'use strict';
  if (window.TartariaSacred) return;

  /* ------------------------------------------------------------------ *
   *  helpers
   * ------------------------------------------------------------------ */
  var rad = function (deg) { return deg * Math.PI / 180; };
  var f2  = function (n) { return +n.toFixed(2); };

  /* polar → screen coordinates (SVG y axis points down) */
  function pt(cx, cy, r, deg) {
    return [f2(cx + r * Math.cos(rad(deg))), f2(cy - r * Math.sin(rad(deg)))];
  }
  var P = function (p) { return p[0] + ',' + p[1]; };

  function circleD(cx, cy, r) {
    return 'M' + f2(cx - r) + ',' + cy +
           'a' + r + ',' + r + ' 0 1 0 ' + f2(2 * r) + ',0' +
           'a' + r + ',' + r + ' 0 1 0 ' + f2(-2 * r) + ',0Z';
  }
  function ellipseD(cx, cy, rx, ry) {
    return 'M' + f2(cx - rx) + ',' + cy +
           'a' + rx + ',' + ry + ' 0 1 0 ' + f2(2 * rx) + ',0' +
           'a' + rx + ',' + ry + ' 0 1 0 ' + f2(-2 * rx) + ',0Z';
  }
  /* regular polygon: n vertices on radius r, first vertex at angle a0 (deg) */
  function polyD(cx, cy, r, n, a0) {
    var pts = [], i;
    for (i = 0; i < n; i++) pts.push(P(pt(cx, cy, r, a0 + i * 360 / n)));
    return 'M' + pts.join('L') + 'Z';
  }

  /* collects <path class="sv-draw" pathLength="100"> in drawing order */
  function Collector() {
    var out = [], n = 0;
    return {
      add: function (d, cls) {
        out.push('<path class="sv-draw' + (cls ? ' ' + cls : '') + '" pathLength="100" style="--i:' + n + '" d="' + d + '"/>');
        n++;
      },
      raw:   function (s) { out.push(s); },
      html:  function () { return out.join(''); },
      last:  function () { return Math.max(0, n - 1); }
    };
  }
  function dot(cx, cy, r) {
    return '<circle class="sv-dot" cx="' + cx + '" cy="' + cy + '" r="' + r + '"/>';
  }

  /* ------------------------------------------------------------------ *
   *  1 · RUB EL HIZB  (eight-pointed star = two squares turned by 45°)
   *
   *  centre C=(200,200), circumradius R=156.
   *  Square A: vertices at 45°,135°,225°,315°   Square B: 0°,90°,180°,270°
   *  Inradius of each square:   a = R·cos45°                     = 110.31
   *  The edges of A and B cross at 16 points of the star outline; the 8 inner
   *  ones lie at angles 22.5°+k·45° on radius
   *       d = a / cos22.5° = R·cos45°/cos22.5°                    = 119.40
   *  The inner octagon (radius d) has apothem d·cos22.5° = a, so the circle of
   *  radius a is inscribed in it, and the octagon with vertices on that circle
   *  (angles k·45°) is inscribed in the circle; its apothem a·cos22.5° = 101.91
   *  gives the next inscribed circle. A half-scale copy of the star sits inside.
   * ------------------------------------------------------------------ */
  function buildRub() {
    var C = 200, R = 156, k;
    var a  = R * Math.cos(rad(45));                     // inradius of the squares
    var d  = a / Math.cos(rad(22.5));                   // radius of inner star vertices
    var a2 = a * Math.cos(rad(22.5));                   // apothem of inscribed octagon
    var half = 0.5;

    function starD(s) {
      var pts = [], i;
      for (i = 0; i < 8; i++) {
        pts.push(P(pt(C, C, R * s, i * 45)));           // outer tip
        pts.push(P(pt(C, C, d * s, i * 45 + 22.5)));    // inner vertex
      }
      return 'M' + pts.join('L') + 'Z';
    }

    var c = Collector(), i, spokes = '';
    c.add(circleD(C, C, 168), 'sv-thin');                       // outer double ring
    c.add(circleD(C, C, 174), 'sv-thin');
    c.add(starD(1), 'sv-bold');                                 // star outline
    c.add(polyD(C, C, R, 4, 45), 'sv-thin');                    // square A
    c.add(polyD(C, C, R, 4, 0),  'sv-thin');                    // square B
    c.add(circleD(C, C, a));                                    // circle inscribed in inner octagon
    c.add(polyD(C, C, a, 8, 0));                                // octagon inscribed in that circle
    c.add(circleD(C, C, a2), 'sv-thin');                        // circle inscribed in the octagon
    c.add(starD(half));                                         // half-scale star
    for (i = 0; i < 8; i++) {                                   // spokes: inner star tips → octagon vertices
      spokes += 'M' + P(pt(C, C, R * half, i * 45)) + 'L' + P(pt(C, C, a, i * 45));
    }
    c.add(spokes, 'sv-thin');
    c.add(circleD(C, C, a * half), 'sv-thin');                  // circle inscribed in the inner star
    c.add(circleD(C, C, 14));
    for (k = 0; k < 8; k++) { var p = pt(C, C, 186, k * 45); c.raw(dot(p[0], p[1], 2)); }
    c.raw(dot(C, C, 3));

    var glow = '<path d="' + starD(1) + '"/><path d="' + starD(half) + '" opacity=".6"/>';
    return {
      n: c.last(),
      html:
        '<div class="sv-spin">' +
          '<div class="sv-glowbox"><svg class="sv-glow" viewBox="0 0 400 400" aria-hidden="true" focusable="false">' + glow + '</svg></div>' +
          '<svg class="sv-line" viewBox="0 0 400 400" aria-hidden="true" focusable="false">' + c.html() + '</svg>' +
        '</div>',
      label: 'Eight-pointed star — Rub el Hizb, the symbol of Ibn Battuta'
    };
  }

  /* ------------------------------------------------------------------ *
   *  2 · SHANYRAK  (crown ring of a yurt dome with crossing uyks)
   *  double rim, four cross-bars (each a pair of parallel lines, gap ±7),
   *  hub ring, and two families of curved uyks (12 + 12) that sweep in
   *  opposite directions and cross each other like the woven dome.
   * ------------------------------------------------------------------ */
  function buildShanyrak() {
    var C = 200, c = Collector(), glow = '', side, k, off;

    c.add(circleD(C, C, 188), 'sv-bold');                       // thick outer rim
    c.add(circleD(C, C, 174), 'sv-thin');                       // fine inner rim

    /* two crossing arches, each woven from three parallel strands (the uyks seen from below) */
    [1, -1].forEach(function (sg) {
      [-17, 0, 17].forEach(function (o) {
        var s2 = o * 0.7071;
        function q(x, y) { return f2(C + sg * (x + s2)) + ',' + f2(C + y + s2); }
        var d = 'M' + q(-118, 118) + 'Q' + q(-50, -98) + ' ' + q(128, -84);
        c.add(d, 'sv-bold');
        glow += '<path d="' + d + '"/>';
      });
    });
    c.raw(dot(C, C, 3));

    return {
      n: c.last(),
      html:
        '<div class="sv-spin">' +
          '<div class="sv-glowbox"><svg class="sv-glow" viewBox="0 0 400 400" aria-hidden="true" focusable="false">' +
            '<path d="' + circleD(C, C, 188) + '"/>' + glow + '</svg></div>' +
          '<svg class="sv-line" viewBox="0 0 400 400" aria-hidden="true" focusable="false">' + c.html() + '</svg>' +
        '</div>',
      label: 'Shanyrak — the crown of a yurt, symbol of Tengrianism'
    };
  }

  /* ------------------------------------------------------------------ *
   *  3 · KOBYZ  (viewBox 400×560, axis x=200)
   *  Strings are drawn straight, then animated by JS (standing waves).
   * ------------------------------------------------------------------ */
  var KZ = {
    nut: 112, bridge: 404, bottom: 498,
    strings: [ { x: 194, top: 80, ph: 0 }, { x: 206, top: 98, ph: 1.9 } ]
  };

  function buildKobyz() {
    var c = Collector(), i, rings = '';
    var body =
      'M200,524 C126,524 96,474 102,424 C108,376 170,350 186,296 L189,96 ' +
      'C186,70 188,52 200,44 C212,52 214,70 211,96 L214,296 ' +
      'C230,350 292,376 298,424 C304,474 274,524 200,524Z';

    for (i = 0; i < 4; i++) rings += '<circle class="sv-wave" style="--k:' + i + '" cx="200" cy="424" r="58"/>';

    c.add(body, 'sv-bold');                                                     // resonator + neck + head
    c.add(ellipseD(200, 432, 80, 74), 'sv-thin');                               // leather membrane edge
    c.add(circleD(156, 436, 13) + circleD(244, 436, 13), 'sv-thin');            // sound holes
    c.add(circleD(156, 436, 6)  + circleD(244, 436, 6),  'sv-thin');
    c.add('M189,140H211M188,146H212M188,226H212M189,232H211', 'sv-thin');      // neck bands
    c.add('M194,80H162M206,98H238');                                            // pegs
    c.add(circleD(157, 80, 5) + circleD(243, 98, 5));                           // peg knobs
    c.add('M188,' + KZ.nut + 'H212');                                           // nut
    c.add('M180,414L186,' + KZ.bridge + 'H214L220,414');                        // bridge
    c.add('M190,' + KZ.bottom + 'H210');                                        // tailpiece
    KZ.strings.forEach(function (s, idx) {
      c.raw('<path class="sv-ghost" data-s="' + idx + '" d="M' + s.x + ',' + s.top + 'V' + KZ.bottom + '"/>');
      c.add('M' + s.x + ',' + s.top + 'V' + KZ.bottom, 'sv-string" data-s="' + idx);  // class + data attr
    });
    c.raw(dot(200, 62, 3));

    return {
      n: c.last(),
      html:
        '<svg class="sv-line" viewBox="0 0 400 560" aria-hidden="true" focusable="false">' +
          '<g class="sv-waves">' + rings + '</g>' + c.html() +
        '</svg>',
      label: 'Kobyz — the Kazakh bowed instrument, its strings vibrating'
    };
  }

  var BUILD = { rub: buildRub, shanyrak: buildShanyrak, kobyz: buildKobyz };

  /* ------------------------------------------------------------------ *
   *  reduced motion
   * ------------------------------------------------------------------ */
  var RM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function onRM(fn) {
    if (RM.addEventListener) RM.addEventListener('change', fn);
    else if (RM.addListener) RM.addListener(fn);
  }

  /* ------------------------------------------------------------------ *
   *  kobyz string vibration (single rAF loop, only for visible instances)
   * ------------------------------------------------------------------ */
  var KOB = new Set(), raf = 0, N = 64;

  function num(cs, name, def) {
    var v = parseFloat(cs.getPropertyValue(name));
    return isFinite(v) ? v : def;
  }
  function sec(cs, name, def) {
    var s = cs.getPropertyValue(name).trim(), v = parseFloat(s);
    if (!isFinite(v)) return def;
    return /ms$/.test(s) ? v / 1000 : v;
  }

  function initKobyz(el, nMax) {
    var items = [], i, j;
    KZ.strings.forEach(function (s, idx) {
      var y0 = s.top, ys = [], e1 = [], e2 = [], e3 = [], y, u;
      for (j = 0; j <= N; j++) {
        y = y0 + (KZ.bottom - y0) * j / N;
        u = (y - KZ.nut) / (KZ.bridge - KZ.nut);               // 0..1 between nut and bridge
        ys.push(f2(y));
        if (u > 0 && u < 1) {                                  // standing-wave harmonics
          e1.push(Math.sin(Math.PI * u));
          e2.push(Math.sin(2 * Math.PI * u));
          e3.push(Math.sin(3 * Math.PI * u));
        } else { e1.push(0); e2.push(0); e3.push(0); }
      }
      items.push({
        x: s.x, ph: s.ph, ys: ys, e1: e1, e2: e2, e3: e3,
        main:  el.querySelector('.sv-string[data-s="' + idx + '"]'),
        ghost: el.querySelector('.sv-ghost[data-s="' + idx + '"]'),
        rest:  'M' + s.x + ',' + s.top + 'V' + KZ.bottom
      });
    });
    var inst = { el: el, items: items, running: false, cfgAt: 0, period: .6, amp: 2.6, delay: 4, t0: 0, started: false };
    el.__sacredK = inst;
    KOB.add(inst);
  }

  function readCfg(inst, now) {
    var cs = getComputedStyle(inst.el);
    inst.period = Math.max(.12, sec(cs, '--sacred-kobyz-string-period', .6));
    inst.amp    = num(cs, '--sacred-kobyz-string-amp', 2.6);
    inst.delay  = sec(cs, '--sacred-kobyz-draw', 3.8) + (parseInt(inst.el.style.getPropertyValue('--sv-n'), 10) || 0) * sec(cs, '--sacred-stagger', .14);
    inst.cfgAt  = now;
  }

  function curve(it, a, w, ph) {
    var c1 = a * Math.sin(w + ph),
        c2 = a * .38 * Math.sin(2 * w + ph * 1.7 + .9),
        c3 = a * .15 * Math.sin(3 * w + ph * .6 + 2.1),
        out = new Array(N + 1), j, dx;
    for (j = 0; j <= N; j++) {
      dx = it.e1[j] * c1 + it.e2[j] * c2 + it.e3[j] * c3;
      out[j] = f2(it.x + dx) + ',' + it.ys[j];
    }
    return 'M' + out.join('L');
  }

  function restKobyz(inst) {
    inst.items.forEach(function (it) {
      if (it.main)  it.main.setAttribute('d', it.rest);
      if (it.ghost) it.ghost.setAttribute('d', it.rest);
    });
    inst.el.classList.remove('is-running');
    inst.started = false;
  }

  function tick(now) {
    raf = 0;
    var live = false;
    KOB.forEach(function (inst) {
      if (!inst.el.isConnected) { KOB.delete(inst); return; }
      if (!inst.running) return;
      live = true;
      if (now - inst.cfgAt > 600) readCfg(inst, now);
      var t = (now - inst.t0) / 1000 - inst.delay;
      if (t < 0) return;
      var ramp = Math.min(1, t / 1.8);
      ramp = ramp * ramp * (3 - 2 * ramp);                              // smoothstep
      var sT  = now / 1000,
          w   = 2 * Math.PI * sT / inst.period,
          mod = .72 + .28 * Math.sin(2 * Math.PI * sT / (inst.period * 7)),   // slow "bow" swell
          a   = inst.amp * ramp * mod;
      if (!inst.started) { inst.started = true; inst.el.classList.add('is-running'); }
      inst.items.forEach(function (it) {
        if (it.main)  it.main.setAttribute('d', curve(it, a, w, it.ph));
        if (it.ghost) it.ghost.setAttribute('d', curve(it, a * .85, w - .8, it.ph));
      });
    });
    if (live) raf = requestAnimationFrame(tick);
  }
  function wake() { if (!raf && KOB.size) raf = requestAnimationFrame(tick); }

  onRM(function () {
    KOB.forEach(function (inst) {
      inst.running = false;
      if (RM.matches) restKobyz(inst); else syncKobyz(inst.el);
    });
    wake();
  });

  function syncKobyz(el) {
    var inst = el.__sacredK;
    if (!inst) return;
    var run = el.classList.contains('is-inview') && el.classList.contains('is-drawn') && !RM.matches;
    if (run && !inst.running) { readCfg(inst, performance.now()); inst.t0 = el.__sacredT0 || performance.now(); }
    inst.running = run;
    if (run) wake();
  }

  /* ------------------------------------------------------------------ *
   *  IntersectionObserver: draw once on first view, pause loops off-screen
   * ------------------------------------------------------------------ */
  var io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var el = e.target;
        if (e.isIntersecting) {
          el.classList.add('is-inview');
          if (!el.classList.contains('is-drawn')) {
            el.__sacredT0 = performance.now();
            el.classList.add('is-drawn');
          }
        } else {
          el.classList.remove('is-inview');
        }
        syncKobyz(el);
      });
    }, { threshold: 0.12 });
  }

  /* ------------------------------------------------------------------ *
   *  mount / scan
   * ------------------------------------------------------------------ */
  function mount(el, type) {
    if (!el || el.__sacred) return;
    type = type || el.getAttribute('data-sacred');
    var build = BUILD[type];
    if (!build) return;
    el.__sacred = true;

    var out = build();
    el.classList.add('sv-art', 'sv-art--' + type);
    var bg = el.hasAttribute('data-sacred-bg');
    if (bg) el.classList.add('sv-art--bg');

    if (bg || el.hasAttribute('data-decorative')) {
      el.setAttribute('aria-hidden', 'true');
    } else {
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', el.getAttribute('data-label') || out.label);
    }
    el.style.setProperty('--sv-n', out.n);
    el.innerHTML = out.html;

    if (type === 'kobyz') initKobyz(el, out.n);

    if (io) {
      io.observe(el);                      // fires immediately if already visible → "on load"
    } else {                               // very old browsers: just show it
      el.__sacredT0 = performance.now();
      el.classList.add('is-inview', 'is-drawn');
      syncKobyz(el);
    }
  }

  function scan(root) {
    root = root || document;
    if (root.nodeType === 1 && root.hasAttribute && root.hasAttribute('data-sacred')) mount(root);
    var list = root.querySelectorAll ? root.querySelectorAll('[data-sacred]') : [];
    for (var i = 0; i < list.length; i++) mount(list[i]);
  }

  function boot() {
    scan(document);
    if ('MutationObserver' in window) {
      new MutationObserver(function (muts) {
        muts.forEach(function (m) {
          for (var i = 0; i < m.addedNodes.length; i++) {
            if (m.addedNodes[i].nodeType === 1) scan(m.addedNodes[i]);
          }
        });
      }).observe(document.body || document.documentElement, { childList: true, subtree: true });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
  window.addEventListener('load', function () { scan(document); });

  window.TartariaSacred = { mount: mount, scan: scan };
})();
