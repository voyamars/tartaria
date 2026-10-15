const TXP_ART_DATA = {"1":{"layers":[{"name":"bg","file":"/assets/layers/t1-bg.webp","x":24,"y":634,"w":1052,"h":641,"d":-0.4},{"name":"grass","file":"/assets/layers/t1-grass.webp","x":151,"y":1108,"w":655,"h":162,"d":-0.4,"pv":[561,1252]},{"name":"fg","file":"/assets/layers/t1-fg.webp","x":391,"y":96,"w":302,"h":1172,"d":1},{"name":"hair","file":"/assets/layers/t1-hair.webp","x":391,"y":392,"w":341,"h":450,"d":1,"pv":[561,402]}],"arc":{"cx":560.4933471679688,"cy":563.5757446289062,"r":449.0468444824219,"a0":148.56912231445312,"a1":30.931848526000977,"op":0.76,"col":"#D4AF37"}},"2":{"layers":[{"name":"bg","file":"/assets/layers/t2-bg.webp","x":30,"y":1188,"w":1061,"h":118,"d":-0.4},{"name":"fg","file":"/assets/layers/t2-fg.webp","x":379,"y":53,"w":422,"h":1104,"d":1}],"glint":{"name":"glint","file":"/assets/layers/t2-glint.webp","x":380,"y":54,"w":420,"h":1103,"d":1}},"3":{"layers":[{"name":"bg","file":"/assets/layers/t3-bg.webp","x":34,"y":1080,"w":1059,"h":86,"d":-0.4},{"name":"sil","file":"/assets/layers/t3-sil.webp","x":374,"y":76,"w":464,"h":1114,"d":1},{"name":"fg","file":"/assets/layers/t3-fg.webp","x":374,"y":76,"w":464,"h":1114,"d":1}]},"4":{"layers":[{"name":"far","file":"/assets/layers/t4-far.webp","x":9,"y":278,"w":1107,"h":384,"d":0},{"name":"near","file":"/assets/layers/t4-near.webp","x":13,"y":609,"w":1100,"h":431,"d":0}]},"5":{"layers":[{"name":"bg","file":"/assets/layers/t5-bg.webp","x":3,"y":1001,"w":1115,"h":104,"d":-0.4},{"name":"rope","file":"/assets/layers/t5-rope.webp","x":827,"y":0,"w":114,"h":948,"d":1},{"name":"paiza","file":"/assets/layers/t5-paiza.webp","x":261,"y":0,"w":305,"h":989,"d":1,"pv":[395,0]},{"name":"seal","file":"/assets/layers/t5-seal.webp","x":543,"y":0,"w":301,"h":909,"d":1,"pv":[695,0]}]},"7":{"layers":[{"name":"bg","file":"/assets/layers/t7-bg.webp","x":35,"y":1059,"w":1051,"h":81,"d":-0.4},{"name":"fg","file":"/assets/layers/t7-fg.webp","x":119,"y":80,"w":884,"h":965,"d":1}]},"8":{"layers":[{"name":"sun","file":"/assets/layers/t8-sun.webp","x":62,"y":218,"w":997,"h":562,"d":-0.2},{"name":"rays","file":"/assets/layers/t8-rays.webp","x":152,"y":238,"w":818,"h":590,"d":-0.2,"pv":[561,490]},{"name":"mtn","file":"/assets/layers/t8-mtn.webp","x":37,"y":832,"w":1052,"h":119,"d":0.15},{"name":"body","file":"/assets/layers/t8-body.webp","x":407,"y":580,"w":416,"h":214,"d":0},{"name":"wl","file":"/assets/layers/t8-wl.webp","x":46,"y":218,"w":512,"h":451,"d":0,"pv":[552,600]},{"name":"wr","file":"/assets/layers/t8-wr.webp","x":572,"y":218,"w":503,"h":438,"d":0,"pv":[572,600]}]}};
/* TARTARIA XP — art.js: tour artwork (home preview card + tour page hero).
   Layers are cut from the master engravings (see /assets/src); everything animates with transform / opacity / masks only.
   Depends on: routes.js (ROUTES, window.ROUTE_N on tour pages). Loads after script.js / tour.js. */
(() => {
  "use strict";
  const DATA = TXP_ART_DATA;
  /* asset version = the ?v= of this very script tag (stamped by tools/stamp-assets.py), so images and code are always in step */
  const V = (document.currentScript && new URL(document.currentScript.src).searchParams.get("v")) || "1";
  const FW = 1122, FH = 1402, NS = "http://www.w3.org/2000/svg";
  const force = /[?&]motion=on\b/.test(location.search) || (() => { try { return localStorage.getItem("txp_motion") === "on"; } catch (e) { return false; } })();
  if (force) document.documentElement.classList.add("txp-motion");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches && !force;   // ?motion=on (or localStorage txp_motion=on) forces full motion
  const touch = matchMedia("(hover: none), (pointer: coarse)").matches;
  /* WebP: every current browser decodes it (Safari 14+/iOS 14+ included). Do NOT probe with canvas.toDataURL("image/webp"):
     Safari cannot ENCODE webp and answers with PNG, which used to switch all live layers off on every iPhone / iPad / Mac Safari.
     Optimistic default, corrected by a real decode of a 1-px WebP (only a very old browser flips it). */
  let hasWebp = true;
  (() => { const t = new Image(); t.onerror = () => { hasWebp = false; }; t.src = "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA"; })();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const pc = (v, t) => (v / t * 100).toFixed(3) + "%";
  const el = (tag, cls, css) => { const e = document.createElement(tag); if (cls) e.className = cls; if (css) e.style.cssText = css; return e; };
  const sv = (tag, a, parent) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (parent) parent.appendChild(e); return e; };
  const url = (f) => `url(${f}?v=${V})`;
  const rnd = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  let uid = 0;

  /* orbit geometry per tour (image coordinates). Dots = the stops of ROUTES[i].w, in route order along the upper arc. */
  const ORB = {
    1: { cx: 561, cy: 563, rx: 449, ry: 449, k: [0.88, 1.11] }, 2: { cx: 561, cy: 600, rx: 500, ry: 530, k: [0.88, 1.1] },
    3: { cx: 561, cy: 520, rx: 520, ry: 470, k: [0.9, 1.1] }, 4: { cx: 561, cy: 340, rx: 520, ry: 250, k: [0.84, 1.13] },
    5: { cx: 561, cy: 520, rx: 540, ry: 480, k: [0.88, 1.1] }, 6: { cx: 561, cy: 476, rx: 432, ry: 432, k: [1.0, 1.2] },
    7: { cx: 561, cy: 560, rx: 500, ry: 500, k: [0.9, 1.1] }, 8: { cx: 561, cy: 520, rx: 530, ry: 420, k: [0.88, 1.1] },
  };
  const ANIM = { hair: "a-hair", grass: "a-grass", paiza: "a-swing1", seal: "a-swing2", wl: "a-wingL", wr: "a-wingR", rays: "a-rays" };

  /* ---------- overlay helpers ---------- */
  const full = (d) => el("div", "lay full", `--d:${d}`);
  const ovl = (parent) => sv("svg", { class: "ovl", viewBox: `0 0 ${FW} ${FH}`, preserveAspectRatio: "none", focusable: "false" }, parent);
  const layerBox = (L, extra) => el("div", "lay", `left:${pc(L.x, FW)};top:${pc(L.y, FH)};width:${pc(L.w, FW)};height:${pc(L.h, FH)};--d:${L.d}` + (extra || ""));
  const inner = (L, cls, css) => { const i = el("div", "lay__i " + (cls || ""), `background-image:${url(L.file)};` + (css || "")); if (L.pv) i.style.transformOrigin = `${pc(L.pv[0] - L.x, L.w)} ${pc(L.pv[1] - L.y, L.h)}`; return i; };
  const clipIn = (L, pts) => `polygon(${pts.map(([x, y]) => pc(x - L.x, L.w) + " " + pc(y - L.y, L.h)).join(",")})`;

  function orbits(n, waypts, parent) {
    const o = ORB[n] || ORB[1], lay = full(0.5), s = ovl(lay), g = sv("g", { class: "orb" }, s);
    o.k.forEach((k) => sv("ellipse", { cx: o.cx, cy: o.cy, rx: o.rx * k, ry: o.ry * k, class: "orb__ring" }, g));
    const cnt = waypts.length, a0 = 205, a1 = 335;
    waypts.forEach((_, i) => {
      const a = (cnt === 1 ? 270 : a0 + (a1 - a0) * i / (cnt - 1)) * Math.PI / 180;
      sv("circle", { cx: (o.cx + o.rx * Math.cos(a)).toFixed(1), cy: (o.cy + o.ry * Math.sin(a)).toFixed(1), r: 3, class: "orb__dot", style: `animation-delay:${(i * 0.62).toFixed(2)}s` }, g);
    });
    g.style.transformOrigin = `${(o.cx / FW * 100).toFixed(1)}% ${(o.cy / FH * 100).toFixed(1)}%`;
    parent.appendChild(lay);
  }

  /* ---------- Tour 6: one clean eight-pointed Rub el Hizb (drawn by sacred-svg.js) ---------- */
  function rubStar(parent) {
    const d = el("div", "art__rub");
    const s = el("div", "");
    s.setAttribute("data-sacred", "rub"); s.setAttribute("data-decorative", "");
    d.appendChild(s); parent.appendChild(d);
    if (window.TartariaSacred) window.TartariaSacred.mount(s);   // otherwise sacred-svg.js picks it up through its MutationObserver
  }

  /* ---------- (legacy) Tour 6 dense lattice — no longer used ---------- */
  function lattice(parent) {
    const id = "lg" + (++uid), lay = full(0.5), s = ovl(lay);
    const df = sv("defs", {}, s), gr = sv("linearGradient", { id, x1: 0, x2: 1, y1: 0, y2: 0 }, df);
    [[0, 0], [0.2, 0.7], [0.8, 0.7], [1, 0]].forEach(([o, op]) => sv("stop", { offset: o, "stop-color": "#F3E5AB", "stop-opacity": op }, gr));
    sv("path", { d: "M 70 1010 L 1052 1010", class: "lat lat--faint draw", pathLength: 1, stroke: `url(#${id})`, style: "--dl:.2s;--t:3.6s" }, s);
    sv("path", { d: "M 150 1040 L 972 1040", class: "lat lat--faint draw", pathLength: 1, stroke: `url(#${id})`, style: "--dl:.5s;--t:3.6s" }, s);
    const g = sv("g", { transform: "translate(561 476)" }, s);
    const P = (r, a) => [r * Math.cos(a), r * Math.sin(a)];
    const f = (v) => v.toFixed(2);
    const circ = (r) => `M ${-r} 0 a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`;
    const star = (R, k, rot) => { const pts = [...Array(8)].map((_, i) => P(R, rot + i * Math.PI / 4 - Math.PI / 2)); let i = 0, d = `M ${f(pts[0][0])} ${f(pts[0][1])}`; for (let j = 0; j < 8; j++) { i = (i + k) % 8; d += ` L ${f(pts[i][0])} ${f(pts[i][1])}`; } return d + " Z"; };
    const squares = (R, rot) => [0, 1].map((o) => { const p = [0, 2, 4, 6].map((i) => P(R, rot + (i + o) * Math.PI / 4 - Math.PI / 2)); return "M " + p.map((q) => f(q[0]) + " " + f(q[1])).join(" L ") + " Z"; }).join(" ");
    const spokes = [...Array(16)].map((_, i) => { const a = i * Math.PI / 8, p = P(300, a), q = P(371, a); return `M ${f(p[0])} ${f(p[1])} L ${f(q[0])} ${f(q[1])}`; }).join(" ");
    const oct = "M " + [...Array(8)].map((_, i) => P(232, Math.PI / 8 + i * Math.PI / 4)).map((p) => f(p[0]) + " " + f(p[1])).join(" L ") + " Z";
    const small = [...Array(8)].map((_, i) => { const p = P(150, i * Math.PI / 4); return `M ${f(p[0] - 6)} ${f(p[1])} a 6 6 0 1 0 12 0 a 6 6 0 1 0 -12 0`; }).join(" ");
    const add = (parent, d, cls, dl, t) => sv("path", { d, class: "lat draw " + cls, pathLength: 1, style: `--dl:${dl}s;--t:${t || 2.6}s` }, parent);
    add(g, circ(380), "", 0.1, 3); add(g, circ(371), "lat--faint", 0.4, 3); add(g, circ(300), "lat--faint", 0.7, 3);
    add(g, spokes, "lat--faint", 1.0, 2.6);
    add(g, star(371, 3, 0), "lat--star", 1.2, 3.4); add(g, star(371, 3, Math.PI / 8), "lat--star", 1.7, 3.4);
    add(g, oct, "lat--faint", 2.2, 2.6);
    const rete = sv("g", { class: "rete" }, g);
    add(rete, circ(206), "", 2.4, 2.8); add(rete, star(206, 3, 0), "lat--star", 2.8, 3); add(rete, squares(206, Math.PI / 8), "lat--faint", 3.1, 3);
    add(rete, circ(110), "", 3.4, 2.4); add(rete, small, "lat--faint", 3.6, 2.2); add(rete, star(84, 3, Math.PI / 8), "lat--star", 3.8, 2.6);
    parent.appendChild(lay);
  }

  /* ---------- Tour 1: the sulde's horsehair moves like a wind ripple ----------
     The layer is rendered as N feathered vertical strips that share one pivot but sway with a phase offset, so the wave
     travels across the hair. Overlaps cross-fade (alpha sums to 1), so there are no seams. transform only. */
  function hairWind(L, box) {
    const N = 6, r = 0.05;
    for (let k = 0; k < N; k++) {
      const a = k / N, b = (k + 1) / N, f = (v) => (Math.min(1, Math.max(0, v)) * 100).toFixed(2) + "%";
      const stops = [k ? `transparent ${f(a - r)}, #000 ${f(a + r)}` : "#000 0%", k < N - 1 ? `#000 ${f(b - r)}, transparent ${f(b + r)}` : "#000 100%"].join(",");
      const m = `linear-gradient(90deg,${stops})`;
      const i = inner(L, "a-hairwave", `-webkit-mask-image:${m};mask-image:${m};animation-delay:${(-k * 0.62).toFixed(2)}s;--ha:${(2.2 + (k % 3) * 0.5).toFixed(1)}deg`);
      box.appendChild(i);
    }
  }

  /* ---------- per-tour animated overlays (live mode) ---------- */
  function overlays(n, D, live, ctx) {
    const byName = (nm) => D.layers.find((l) => l.name === nm);
    if (n === 1 && D.arc) {
      const a = D.arc, lay = full(-0.4), s = ovl(lay), r = a.r;
      const p = (deg) => [a.cx + r * Math.cos(deg * Math.PI / 180), a.cy + r * Math.sin(deg * Math.PI / 180)];
      const [x0, y0] = p(a.a0), [x1, y1] = p(a.a1);
      sv("path", { d: `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r.toFixed(1)} ${r.toFixed(1)} 0 1 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`, class: "arc draw", pathLength: 1, stroke: a.col, "stroke-opacity": a.op, style: "--t:4.8s;--dl:.9s" }, s);
      /* a spark runs along the arc, and the trident head glints: same vocabulary as the other tours */
      const path = s.lastChild;
      if (!reduced) {
        const dot = sv("circle", { r: 5.5, class: "arc__spark", opacity: 0 }, s);
        sv("animateMotion", { dur: "16s", repeatCount: "indefinite", begin: "1.2s", path: path.getAttribute("d"), calcMode: "spline", keyTimes: "0;1", keySplines: ".45 0 .55 1" }, dot);
        sv("animate", { attributeName: "opacity", dur: "16s", repeatCount: "indefinite", begin: "1.2s", values: "0;.95;.95;0", keyTimes: "0;.08;.9;1" }, dot);
      }
      live.appendChild(lay);
      const fg = byName("fg");
      if (fg) {
        const t = layerBox(fg), c = el("div", "tw tw--head", `background-image:${url(fg.file)};clip-path:inset(1.6% 0 ${pc(fg.h - 250, fg.h)} 0);animation-delay:.6s;animation-duration:5.2s`);
        t.appendChild(c); live.appendChild(t);
      }
    }
    if (n === 2) {
      const gl = D.glint, fg = byName("fg"), bg = byName("bg");
      if (gl) {
        const m = el("div", "lay glint", `left:${pc(gl.x, FW)};top:${pc(gl.y, FH)};width:${pc(gl.w, FW)};height:${pc(gl.h, FH)};--d:1;-webkit-mask-image:${url(gl.file)};mask-image:${url(gl.file)}`);
        m.appendChild(el("i")); live.appendChild(m);
      }
      if (bg) {
        const boxes = [[225, 1253, 36, 32], [262, 1250, 30, 31], [315, 1255, 32, 28], [352, 1248, 33, 38], [455, 1253, 43, 38], [512, 1266, 22, 22], [572, 1272, 36, 18], [637, 1268, 32, 22], [697, 1245, 36, 45], [815, 1248, 29, 38], [855, 1253, 26, 28]];
        boxes.forEach(([x, y, w, h], i) => {
          const t = layerBox(bg), c = el("div", "tw", `background-image:${url(bg.file)};clip-path:inset(${pc(y - bg.y, bg.h)} ${pc(bg.x + bg.w - x - w, bg.w)} ${pc(bg.y + bg.h - y - h, bg.h)} ${pc(x - bg.x, bg.w)} round 30%);animation-delay:${(rnd() * 5).toFixed(2)}s;animation-duration:${(3.4 + rnd() * 2.6).toFixed(2)}s`);
          t.appendChild(c); live.appendChild(t);
        });
      }
    }
    if (n === 3) {
      // strings: static engraved line stays; a soft vibrating envelope is drawn over it
      const lay = full(1), s = ovl(lay);
      [[537.5, 536, 7.5, 0.16], [561, 560.5, 6.5, 0.2]].forEach(([xt, xb, amp, dur], i) => {
        const ym = 681, xm = (xt + xb) / 2, mk = (a) => `M ${xt} 255 Q ${(xm + a).toFixed(1)} ${ym} ${xb} 1108`;
        const g = sv("g", { class: "str", style: `animation-delay:${i * 1.7}s` }, s);
        [1, -1].forEach((sg) => {
          const p = sv("path", { d: mk(0), class: "str__p" }, g);
          if (!reduced) sv("animate", { attributeName: "d", dur: dur + "s", repeatCount: "indefinite", calcMode: "spline", keyTimes: "0;.5;1", keySplines: ".45 0 .55 1;.45 0 .55 1", values: `${mk(sg * amp)};${mk(-sg * amp)};${mk(sg * amp)}` }, p);
        });
      });
      live.appendChild(lay);
      const sb = el("div", "lay full", "--d:0.2");
      [0, 2.5, 5].forEach((dl) => sb.appendChild(el("i", "ring", `left:${pc(550, FW)};top:${pc(840, FH)};animation-delay:${dl}s`)));
      live.appendChild(sb);
      const t = full(0.3), ts = ovl(t), cg = sv("g", { transform: "translate(561 430)" }, ts);
      [[330, "1 11", 140, ""], [420, "2 16", 190, "rev"], [510, "1 9", 260, ""]].forEach(([r, da, dur, rev]) => {
        const g = sv("g", { class: "spin " + rev, style: `animation-duration:${dur}s` }, cg);
        sv("circle", { r, class: "orb__ring tg", "stroke-dasharray": da }, g);
        [0, 120, 240].forEach((a) => sv("circle", { cx: (r * Math.cos(a * Math.PI / 180)).toFixed(1), cy: (r * Math.sin(a * Math.PI / 180)).toFixed(1), r: 3.2, class: "orb__dot still" }, g));
      });
      live.appendChild(t);
    }
    if (n === 4) {
      /* no red route line on The Great Exodus: the picture stands on its own */
      const far = byName("far");
      if (far) [[[590, 415], [740, 400], [792, 446], [700, 470], [600, 456]], [[800, 352], [880, 322], [940, 380], [860, 402]], [[300, 372], [392, 366], [422, 430], [330, 422]], [[1000, 352], [1090, 330], [1122, 380], [1030, 402]]].forEach((poly, i) => {
        const t = layerBox(far), c = el("div", "tw", `background-image:${url(far.file)};clip-path:${clipIn(far, poly)};animation-delay:${(i * 1.3).toFixed(1)}s;animation-duration:${(5 + i * 0.8).toFixed(1)}s`);
        t.appendChild(c); live.appendChild(t);
      });
    }
    if (n === 7) {
      const lay = full(1), s = ovl(lay);
      [477, 645].forEach((x) => { sv("circle", { cx: x, cy: 583, r: 10, class: "eye__ring" }, s); sv("circle", { cx: x, cy: 583, r: 8, class: "eye" }, s); });
      live.appendChild(lay);
      const d = full(-0.2); d.classList.add("dusts");
      for (let i = 0; i < 14; i++) d.appendChild(el("i", "dust", `left:${(6 + rnd() * 86).toFixed(1)}%;top:${(73 + rnd() * 11).toFixed(1)}%;--dx:${(40 + rnd() * 90).toFixed(0)}px;--dy:${(-10 - rnd() * 24).toFixed(0)}px;animation-duration:${(15 + rnd() * 12).toFixed(1)}s;animation-delay:-${(rnd() * 20).toFixed(1)}s`));
      live.appendChild(d);
    }
  }

  /* ---------- one artwork instance ---------- */
  function make(n, ctx) {
    const D = DATA[n], r = (window.ROUTES || [])[n - 1], wpts = r && r.w ? r.w : [];
    const root = el("div", "art art--" + ctx);
    root.dataset.n = n;
    const state = { live: false, liveP: null, playing: false };
    let poster = null;
    if (n !== 6 && D) {
      poster = el("div", "art__poster");
      const f = ctx === "home" ? `/assets/route-${n}${dpr > 1.4 ? "@2x" : ""}.webp` : `/assets/tour-${n}.webp`;
      poster.style.backgroundImage = hasWebp ? url(f) : url(`/assets/${ctx === "home" ? "route" : "tour"}-${n}.jpg`);
      poster._src = hasWebp ? f : `/assets/${ctx === "home" ? "route" : "tour"}-${n}.jpg`;
      root.appendChild(poster);
    }
    const live = el("div", "art__live");
    root.appendChild(live);
    if (n === 3) {                                   // Tengrian shanyrak: simple vector crown turning slowly behind the kobyz
      const sh = el("div", "lay art__shan", `left:${pc(78, FW)};top:${pc(150, FH)};width:${pc(944, FW)};aspect-ratio:1;--d:-0.2`);
      const s = el("div", "");
      s.setAttribute("data-sacred", "shanyrak"); s.setAttribute("data-decorative", "");
      sh.appendChild(s); root.insertBefore(sh, root.firstChild);
      if (window.TartariaSacred) window.TartariaSacred.mount(s);
    }
    if (n === 6) { rubStar(live); root.classList.add("is-live"); state.live = true; }
    if (ctx === "tour" && wpts.length) orbits(n, wpts, root.appendChild(el("div", "art__orb")) && root.lastChild);

    const decode = (src) => new Promise((ok) => { const i = new Image(); i.onload = i.onerror = () => ok(); i.src = `${src}?v=${V}`; if (i.decode) i.decode().then(ok, ok); });
    const posterReady = () => (poster ? decode(poster._src) : Promise.resolve());

    function goLive() {
      if (state.liveP || n === 6 || !D || reduced || !hasWebp) return state.liveP || Promise.resolve();
      D.layers.forEach((L) => {
        const lb = layerBox(L);
        if (n === 1 && L.name === "hair") hairWind(L, lb);
        else lb.appendChild(inner(L, ANIM[L.name] || ""));
        live.appendChild(lb);
      });
      overlays(n, D, live, ctx);
      if (!state.playing) live.querySelectorAll("svg").forEach((v) => v.pauseAnimations && v.pauseAnimations());   // SMIL starts on insertion: hold it until play()
      state.liveP = Promise.all(D.layers.map((L) => decode(L.file)).concat(D.glint ? [decode(D.glint.file)] : [])).then(() => { state.live = true; root.classList.add("is-live"); });
      return state.liveP;
    }
    function play() { state.hold = false; root.classList.add("is-play"); root.querySelectorAll("svg").forEach((s) => s.unpauseAnimations && s.unpauseAnimations()); state.playing = true; }
    function pause() { state.hold = true; root.classList.remove("is-play"); root.querySelectorAll("svg").forEach((s) => s.pauseAnimations && s.pauseAnimations()); state.playing = false; }
    function run() { // restart draw-on animations
      root.classList.remove("is-run"); void root.offsetWidth; root.classList.add("is-run");
    }
    function wipe() {
      if (reduced) { root.classList.add("is-fade"); return; }
      root.classList.remove("is-wipe"); void root.offsetWidth; root.classList.add("is-wipe");
      const end = () => root.classList.remove("is-wipe");
      root.addEventListener("animationend", function h(e) { if (e.target !== root) return; root.removeEventListener("animationend", h); end(); });
      setTimeout(end, 3400);
    }
    async function start() {
      if (state.started) { play(); return; }   // second visit: just resume — no wipe, no redraw, no flash
      state.started = true; state.hold = false;
      await posterReady();
      if (!reduced && D && n !== 6) await Promise.race([goLive(), new Promise((ok) => setTimeout(ok, 900))]);
      wipe(); run();
      if (!state.hold) play();                 // paused again while it was loading (card scrolled away): stays paused until play()
      goLive();
    }
    return { root, start, pause, play, goLive, posterReady, state };
  }

  /* ---------- parallax (home: mouse · tour: scroll) ---------- */
  function mouseParallax(host, getArt) {
    if (touch || reduced) return;
    let tx = 0, ty = 0, x = 0, y = 0, raf = 0;
    const loop = () => {
      x += (tx - x) * 0.07; y += (ty - y) * 0.07;
      const a = getArt(); if (a) { a.root.style.setProperty("--mx", x.toFixed(3)); a.root.style.setProperty("--my", y.toFixed(3)); a.root.style.setProperty("--PA", (a.root.offsetWidth * 0.024).toFixed(2) + "px"); }
      raf = (Math.abs(tx - x) + Math.abs(ty - y) > 0.002) ? requestAnimationFrame(loop) : 0;
    };
    const wake = () => { if (!raf) raf = requestAnimationFrame(loop); };
    host.addEventListener("pointermove", (e) => { if (e.pointerType !== "mouse") return; const r = host.getBoundingClientRect(); tx = ((e.clientX - r.left) / r.width) * 2 - 1; ty = ((e.clientY - r.top) / r.height) * 2 - 1; wake(); }, { passive: true });
    host.addEventListener("pointerleave", () => { tx = ty = 0; wake(); });
  }

  /* ---------- home card: where the visible artwork sits inside its 1122×1402 canvas ----------
     Union of the layer boxes (= the real content), so the card can centre and fit it in the image zone. Tour 6 is a drawn lattice. */
  function contentBox(n) {
    if (n === 6) return [170, 86, 952, 866];
    const D = DATA[n]; if (!D) return [0, 0, FW, FH];
    const boxes = D.layers.concat(D.glint ? [D.glint] : []);
    let x0 = 1e9, y0 = 1e9, x1 = 0, y1 = 0;
    boxes.forEach((L) => { x0 = Math.min(x0, L.x); y0 = Math.min(y0, L.y); x1 = Math.max(x1, L.x + L.w); y1 = Math.max(y1, L.y + L.h); });
    if (D.arc) { x0 = Math.min(x0, D.arc.cx - D.arc.r); x1 = Math.max(x1, D.arc.cx + D.arc.r); y0 = Math.min(y0, D.arc.cy - D.arc.r); y1 = Math.max(y1, D.arc.cy + D.arc.r); }
    return [Math.max(0, x0), Math.max(0, y0), Math.min(FW, x1), Math.min(FH, y1)];
  }
  function fitSlot(slot, n) {
    const [x0, y0, x1, y1] = contentBox(n), st = slot.style;
    st.setProperty("--fx", ((x1 - x0) / FW).toFixed(4));
    st.setProperty("--fy", ((y1 - y0) / FH).toFixed(4));
    st.setProperty("--cx", (((x0 + x1) / 2) / FW).toFixed(4));
    st.setProperty("--cy", (((y0 + y1) / 2) / FH).toFixed(4));
  }

  /* ---------- home: .preview card (desktop / large tablets) ----------
     The artwork starts only while the card is actually on screen (IntersectionObserver): before, route 1 started at page load,
     so its reveal + draw-on ran hidden behind the intro and the card looked static when the visitor finally scrolled to it.
     Off-screen cards are paused (no infinite CSS animations running for nothing). */
  function initHome() {
    const slots = [...document.querySelectorAll(".preview__art[data-slot]")];
    if (!slots.length) return;
    const desktop = matchMedia("(min-width: 901px)");
    const host = document.querySelector(".preview");
    let current = null, inView = !host || !("IntersectionObserver" in window);
    const mount = (slot) => {
      if (!slot._art) { const n = +slot.dataset.slot; if (!DATA[n] && n !== 6) return null; fitSlot(slot, n); slot._art = make(n, "home"); slot.replaceChildren(slot._art.root); slot._art.posterReady(); }
      return slot._art;
    };
    const sync = () => {
      if (!desktop.matches || !inView || document.hidden) { slots.forEach((s) => s._art && s._art.pause()); return; }
      const act = slots.find((s) => s.closest(".preview__slide.is-active"));
      slots.forEach((s) => { if (s !== act && s._art) s._art.pause(); });
      if (!act) return;
      const a = mount(act);
      if (act !== current) { current = act; a && a.start(); }
      else if (a && !a.state.playing) a.play();
    };
    const mo = new MutationObserver(sync);
    document.querySelectorAll(".preview__slide").forEach((sl) => mo.observe(sl, { attributes: true, attributeFilter: ["class"] }));
    desktop.addEventListener("change", sync);
    if (host && "IntersectionObserver" in window) new IntersectionObserver((es) => { inView = es[es.length - 1].isIntersecting; sync(); }, { threshold: 0.2 }).observe(host);
    if (host) mouseParallax(host, () => current && current._art);
    document.querySelectorAll("[data-route]").forEach((b) => ["pointerenter", "focus"].forEach((ev) => b.addEventListener(ev, () => { const s = slots[+b.dataset.route]; desktop.matches && s && mount(s); }, { passive: true })));
    sync();
    (window.requestIdleCallback || ((f) => setTimeout(f, 2200)))(() => desktop.matches && slots.forEach(mount));
    document.addEventListener("visibilitychange", sync);
  }

  /* ---------- tour page ---------- */
  function initTour() {
    const slot = document.getElementById("rtArt");
    if (!slot || !window.ROUTE_N) return;
    const n = Math.min(8, Math.max(1, window.ROUTE_N));
    if (!DATA[n] && n !== 6) return;
    const a = make(n, "tour");
    slot.replaceChildren(a.root);
    a.start();
    if (!reduced) {
      let vis = true, sy = 0, tick = 0;
      new IntersectionObserver((es) => { vis = es[0].isIntersecting; vis ? a.play() : a.pause(); }, { rootMargin: "80px" }).observe(slot);
      const upd = () => { tick = 0; if (!vis) return; sy = Math.min(Math.max(scrollY, 0), 700) * 0.022; a.root.style.setProperty("--sy", sy.toFixed(2) + "px"); };
      addEventListener("scroll", () => { if (!tick) tick = requestAnimationFrame(upd); }, { passive: true });
      document.addEventListener("visibilitychange", () => document.hidden ? a.pause() : vis && a.play());
      mouseParallax(document.querySelector(".rt-hero") || slot, () => a);
    }
  }

  /* ---------- phones / tablets: artwork inside each swipeable route card ----------
     Touch has no hover, so the card that crosses the middle of the swipe list becomes the "centre" card
     (.is-center on its <li>): its artwork plays (same live layers as the desktop preview), the frame lights up, glow + slow zoom
     start (mobile.css). Every other card idles paused. Driven by the list's scroll position (one rAF-throttled pass, one read per
     card), so it works for flicks, scroll-snap settling, orientation change and resize alike. */
  function initCards() {
    const list = document.getElementById("rList");
    const slots = [...document.querySelectorAll(".route__art[data-cslot]")];
    if (!list || !slots.length) return;
    const small = matchMedia("(max-width: 900px)");
    const lis = slots.map((sl) => sl.closest("li"));
    let center = -1, listSeen = !("IntersectionObserver" in window), raf = 0;   // unknown until the observer reports: nothing starts off-screen
    const mount = (slot) => {
      if (slot._art) return slot._art;
      const n = +slot.dataset.cslot;
      if (!DATA[n] && n !== 6) return null;
      fitSlot(slot, n);
      slot._art = make(n, "home");
      slot._art.root.classList.add("art--card");
      slot.replaceChildren(slot._art.root);
      const show = () => slot.classList.add("is-ready");
      slot._art.posterReady().then(() => requestAnimationFrame(show));
      setTimeout(show, 3000);                           // never leave a card without its artwork, whatever the network does
      return slot._art;
    };
    const setCenter = (k) => {
      if (k === center) return;
      if (center >= 0) { lis[center].classList.remove("is-center"); slots[center]._art && slots[center]._art.pause(); }
      center = k;
      if (k < 0) return;
      lis[k].classList.add("is-center");
      const a = mount(slots[k]);
      a && a.start();                                   // first time: wipe + draw-on, afterwards just resumes
      [k - 1, k + 1].forEach((j) => { const nb = slots[j] && mount(slots[j]); nb && nb.posterReady().then(() => nb.goLive()); });   // neighbours have their live layers built before they arrive: no empty / full-poster flash
    };
    const update = () => {
      raf = 0;
      if (!small.matches || !listSeen || document.hidden) { setCenter(-1); return; }
      const lr = list.getBoundingClientRect(), mid = lr.left + lr.width / 2;
      let best = -1, bd = 1e9;
      lis.forEach((li, k) => { const r = li.getBoundingClientRect(), d = Math.abs(r.left + r.width / 2 - mid); if (d < bd) { bd = d; best = k; } });
      setCenter(best);
    };
    const req = () => { if (!raf) raf = requestAnimationFrame(update); };
    list.addEventListener("scroll", req, { passive: true });
    addEventListener("resize", req, { passive: true });
    addEventListener("orientationchange", () => setTimeout(req, 350));
    small.addEventListener("change", () => { if (!small.matches) setCenter(-1); req(); });
    document.addEventListener("visibilitychange", req);
    if ("IntersectionObserver" in window) new IntersectionObserver((es) => { listSeen = es[es.length - 1].isIntersecting; req(); }, { threshold: 0.2 }).observe(list);
    // artwork of all cards decodes while the browser is idle, so a swipe never shows an empty card
    (window.requestIdleCallback || ((f) => setTimeout(f, 1200)))(() => small.matches && slots.forEach(mount));
    req();
  }

  const go = () => { initHome(); initCards(); initTour(); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", go); else go();
})();

