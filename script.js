/* ============================================================================
   TARTARIA XP — script.js  (Stage 1: Intro · Header · Hero)

   MASTER TIMELINE — strictly sequential:
     A  Map      the Great Steppe outline is drawn by stroke-dashoffset
     B  Logo     STRICTLY AFTER the map is complete, the vector logo appears in the
                 exact centre of the map (red symbol, then cream letters, then tagline)
     C  Exit     the map is erased by the same line running backwards; at the same time
                 the logo flies from the centre into the header's top-left corner
     D  Hero     ONLY after the intro is gone and removed from the DOM: nav, text and
                 petroglyphs fade in with a stagger

   Click / Enter / Space / Esc during the intro skips ahead to phase C.
   ========================================================================== */

(() => {
  "use strict";

  const root = document.documentElement;
  if (!window.gsap) {
    console.warn("GSAP not loaded — showing the static page.");
    root.classList.add("gsap-unavailable");
    return;
  }
  const hasST = !!window.ScrollTrigger;
  gsap.config({ nullTargetWarn: false });
  if (hasST) gsap.registerPlugin(ScrollTrigger);

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const on = (el, t, fn, o) => el && el.addEventListener(t, fn, o);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;

  /* ---------- timing ---------- */
  const MAP_START = 0.3;
  const MAP_DUR = 2.6;
  const HOLD = 0.7;            // pause after the logo has assembled
  const GLOW_ALPHA = 0.2;

  /* ---------- elements ---------- */
  const intro = $("#intro");
  const introBg = $(".intro__bg");
  const introFrame = $(".intro__frame");
  const introMeta = $(".intro__meta");
  const plate = $(".intro__plate");
  const logoBox = $("#introLogo");
  const logoSvg = logoBox && $("svg", logoBox);
  const header = $("#siteHeader");
  const brandLogo = $(".brand__logo");
  const navItems = $$(".nav a, .header__cta");
  const art = $("#logoArt");

  const heroText = [$(".hero .kicker"), ...$$(".hero__line-inner"), $(".hero__description"), $(".hero__actions"), $(".scroll-indicator")].filter(Boolean);
  const petroImgs = $$(".petro img");
  const linesWrap = $(".hero__lines");
  const linesLayers = $$(".hero__lines-layer");
  const petroTarget = new Map();           // final opacity, read from CSS before hiding

  let mapLines = $$(".map-line");
  let mapGlows = [];
  const mapLen = new WeakMap();
  let lgIcon, lgWords = [], lgTags = [];
  let master = null;
  let introActive = true;
  let exiting = false;
  let ambient = null;                      // ambient ornament canvas
  let ambientTarget = 0.11;                // final opacity, read from CSS

  const hideOffset = (p) => (mapLen.get(p) || 0) * 1.02 + 4;   // a hair past the length: no round-cap dot left over

  /* intro runs once per session */
  const markSeen = () => { try { sessionStorage.setItem("hasSeenIntro", "1"); } catch (e) {} };
  const hasSeen = () => { try { return sessionStorage.getItem("hasSeenIntro") === "1"; } catch (e) { return false; } };
  const jumpToHash = () => {
    const go = () => { const t = location.hash && document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView({ block: "start" }); };
    go(); on(window, "load", go);
  };

  /* ---------- fail-safe: a visitor is never stuck behind the intro ---------- */
  const failSafe = (why) => {
    console.warn("Intro skipped:", why);
    root.classList.add("gsap-unavailable");
    document.body.classList.remove("is-locked");
    gsap.set([header, brandLogo, ambient, linesWrap, ...navItems, ...heroText, ...petroImgs].filter(Boolean), { clearProps: "all" });
    intro && intro.remove();
  };

  /* ==========================================================================
     SETUP
     ========================================================================== */

  // Map: real path length, plus a cheap "glow" clone under each line (no SVG blur filter)
  const prepareMap = () => {
    const lines = [];
    mapLines.forEach((path) => {
      const len = path.getTotalLength();
      if (!(len > 0)) return;
      mapLen.set(path, len);
      const glow = path.cloneNode(false);
      glow.removeAttribute("class");
      glow.style.cssText = `stroke:${getComputedStyle(path).stroke};stroke-width:7;pointer-events:none`;
      path.parentNode.insertBefore(glow, path);
      mapLen.set(glow, len);
      mapGlows.push(glow);
      lines.push(path);
    });
    mapLines = lines;
    [...mapLines, ...mapGlows].forEach((p) => {
      const len = mapLen.get(p);
      gsap.set(p, { strokeDasharray: `${len} ${len * 3}`, strokeDashoffset: hideOffset(p), autoAlpha: 0 });
    });
  };

  // Logo: live DOM clone of the sprite art so every letter can be animated
  const prepareLogo = () => {
    const clone = art.cloneNode(true);
    clone.removeAttribute("id");
    logoSvg.appendChild(clone);
    lgIcon = $(".lg-icon", clone);
    lgWords = $$(".lg-word path", clone);
    lgTags = $$(".lg-tag path", clone);
    // NB: the art group is flipped (scale .1 -.1): local y < 0 means "lower on screen"
    gsap.set(lgIcon, { opacity: 0, scale: 0.86, transformOrigin: "50% 50%" });
    gsap.set(lgWords, { opacity: 0, y: -380 });
    gsap.set(lgTags, { opacity: 0 });
    gsap.set(logoBox, { autoAlpha: 0, transformOrigin: "0 0" });
  };

  const setInitialStates = () => {
    prepareMap();
    prepareLogo();
    gsap.set(plate, { autoAlpha: 0 });
    gsap.set(introMeta, { opacity: 0 });

    if (ambient) {
      const o = parseFloat(getComputedStyle(ambient).opacity);
      ambientTarget = Number.isFinite(o) && o > 0 ? o : 0.11;
      gsap.set(ambient, { opacity: 0 });
    }
    linesWrap && gsap.set(linesWrap, { opacity: 0 });
    gsap.set(header, { opacity: 0 });
    gsap.set(brandLogo, { opacity: 0 });
    gsap.set(navItems, { opacity: 0, y: -8 });

    petroImgs.forEach((img) => {
      const o = parseFloat(getComputedStyle(img).opacity);
      petroTarget.set(img, Number.isFinite(o) && o > 0 ? o : 0.35);
    });
    gsap.set(heroText, { opacity: 0, y: 25 });
    gsap.set(petroImgs, { opacity: 0, scale: 0.94, yPercent: 4, transformOrigin: "50% 50%" });
  };

  /* Flight of the intro logo to the header slot (measured once, when the exit starts) */
  const morph = { ready: false, x: 0, y: 0, k: 1 };
  const measureMorph = () => {
    if (morph.ready) return morph;
    const a = logoBox.getBoundingClientRect();        // still untransformed here
    const b = brandLogo.getBoundingClientRect();      // header slot (header never moves, only fades)
    morph.k = b.width / a.width;
    morph.x = b.left - a.left;
    morph.y = b.top - a.top;
    morph.ready = true;
    return morph;
  };

  /* ==========================================================================
     TIMELINES
     ========================================================================== */

  const buildIntroTL = () => {
    const tl = gsap.timeline();
    const mapEnd = MAP_START + MAP_DUR;

    /* A — map is drawn along its line */
    tl.set(mapLines, { autoAlpha: 0.92 }, MAP_START);
    tl.set(mapGlows, { autoAlpha: GLOW_ALPHA }, MAP_START);
    tl.fromTo(
      [...mapGlows, ...mapLines],
      { strokeDashoffset: (i, el) => hideOffset(el) },
      { strokeDashoffset: 0, duration: MAP_DUR, ease: "power2.inOut", immediateRender: false },
      MAP_START
    );

    /* B — logo, strictly after the map has finished */
    const at = mapEnd + 0.2;
    tl.set(logoBox, { autoAlpha: 1 }, at);
    tl.to(plate, { autoAlpha: 1, duration: 1.2, ease: "power2.out" }, at);
    tl.to(lgIcon, { opacity: 1, scale: 1, duration: 1.1, ease: "power3.out" }, at);
    tl.to(lgWords, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, ease: "power3.out" }, at + 0.35);
    tl.to(lgTags, { opacity: 1, duration: 0.6, stagger: 0.03, ease: "power1.out" }, at + 1.05);
    tl.to(introMeta, { opacity: 1, duration: 0.8, ease: "power2.out" }, at + 1.2);
    return tl;
  };

  const buildExitTL = () => {
    const tl = gsap.timeline();

    tl.add(() => { intro.style.pointerEvents = "none"; measureMorph(); }, 0);
    tl.to([introMeta, introFrame, plate], { opacity: 0, duration: 0.6, ease: "power2.out" }, 0);

    /* C1 — the map is erased by the same line running backwards (0 → length) */
    tl.fromTo(
      [...mapGlows, ...mapLines],
      { strokeDashoffset: 0 },
      { strokeDashoffset: (i, el) => hideOffset(el), duration: 1.7, ease: "power2.inOut", immediateRender: false },
      0
    );
    tl.set([...mapGlows, ...mapLines], { autoAlpha: 0 }, 1.7);

    /* C2 — backdrop dissolves (hero has the identical background), logo flies to the header */
    tl.to(introBg, { opacity: 0, duration: 0.9, ease: "power2.inOut" }, 0.5);
    tl.to(logoBox, { x: () => measureMorph().x, y: () => measureMorph().y, scale: () => measureMorph().k, duration: 1.45, ease: "expo.inOut" }, 0.25);
    tl.to(header, { opacity: 1, duration: 0.8, ease: "power2.out" }, 0.7);

    /* swap: header logo takes over at the exact spot the flying logo lands */
    tl.add(() => gsap.set(brandLogo, { opacity: 1 }), 1.72);
    tl.set(logoBox, { autoAlpha: 0 }, 1.74);
    return tl;
  };

  const buildHeroTL = () => {
    const tl = gsap.timeline();
    if (linesWrap) tl.to(linesWrap, { opacity: 1, duration: 2.4, ease: "power2.out" }, 0.2);
    if (ambient) tl.to(ambient, { opacity: ambientTarget, duration: 2.6, ease: "power2.out" }, 0);
    tl.to(navItems, { opacity: 1, y: 0, duration: 0.9, stagger: 0.07, ease: "power3.out" }, 0);
    tl.to(heroText, { opacity: 1, y: 0, duration: 1.2, stagger: 0.1, ease: "power3.out" }, 0.1);
    tl.to(petroImgs, { opacity: (i, el) => petroTarget.get(el), scale: 1, yPercent: 0, duration: 1.8, stagger: 0.14, ease: "power3.out" }, 0.3);
    return tl;
  };

  /* Intro is gone → unlock scroll, start scroll scenes */
  const finish = () => {
    if (!introActive) return;
    introActive = false;
    markSeen();
    intro && intro.remove();
    document.body.classList.remove("is-locked");
    setupHeaderState();
  };

  const buildMaster = () => {
    const tl = gsap.timeline({ paused: true });
    const build = buildIntroTL();
    tl.add(build, 0);
    tl.addLabel("exit", build.duration() + HOLD);
    tl.add(() => { exiting = true; }, "exit");
    tl.add(buildExitTL(), "exit");
    tl.add(finish);                       // map erased, logo docked, intro removed
    tl.addLabel("hero", "+=0.2");
    tl.add(buildHeroTL(), "hero");        // D — strictly after
    tl.add(setupHeroScroll);
    return tl;
  };

  const requestExit = () => {
    if (!introActive || exiting || !master) return;
    exiting = true;
    const remaining = Math.max(0, master.labels.exit - master.time());
    master.pause();
    master.tweenTo("exit", { duration: Math.max(0.45, remaining * 0.28), ease: "power2.inOut", onComplete: () => master.play() });
  };

  /* ==========================================================================
     SCROLL + INTERACTIONS
     ========================================================================== */

  let scrollReady = false;
  function setupHeroScroll() {
    if (reduced || !hasST || scrollReady) return;
    scrollReady = true;
    const trig = { trigger: "#hero", start: "top top", end: "bottom top" };
    gsap.to("#heroTitleParallax", { yPercent: -7, ease: "none", scrollTrigger: { ...trig, scrub: 1.15 } });
    // topographic lines: each layer drifts at its own depth (data-depth = yPercent, -15 … 20)
    linesLayers.forEach((layer) => {
      const depth = parseFloat(layer.dataset.depth) || 0;
      gsap.to(layer, { yPercent: depth, ease: "none", scrollTrigger: { ...trig, scrub: 1.2 } });
    });
    [[".petro--sun img", -30], [".petro--ibex img", -18], [".petro--deer img", 16], [".petro--horse img", 26]].forEach(([sel, y]) => {
      const el = $(sel);
      if (el) gsap.to(el, { y, ease: "none", scrollTrigger: { ...trig, scrub: 1.4 } });
    });
    ScrollTrigger.refresh();
  }

  function setupHeaderState() {
    if (!header) return;
    let lastY = scrollY, idle;
    const update = () => {            // luxury auto-hide: down hides, up (or a pause) brings it back
      const y = scrollY, d = y - lastY;
      header.classList.toggle("is-scrolled", y > 40);
      if (document.body.classList.contains("menu-open") || y < 140 || d < -4) header.classList.remove("is-hidden");
      else if (d > 4) { header.classList.add("is-hidden"); clearTimeout(idle); idle = setTimeout(() => header.classList.remove("is-hidden"), 1100); }
      lastY = y;
    };
    on(window, "scroll", update, { passive: true });
    update();
  }

  const setupButtons = () => {
    if (coarse || reduced) return;
    $$(".luxury-button").forEach((btn) => {
      gsap.set(btn, { transformPerspective: 700 });
      const o = { duration: 0.45, ease: "power3.out" };
      const qx = gsap.quickTo(btn, "x", o), qy = gsap.quickTo(btn, "y", o);
      const qrx = gsap.quickTo(btn, "rotationX", o), qry = gsap.quickTo(btn, "rotationY", o);
      on(btn, "pointermove", (e) => {
        const r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        qx(x * 8); qy(y * 7); qrx(-y * 3); qry(x * 4);
      });
      on(btn, "pointerleave", () => { qx(0); qy(0); qrx(0); qry(0); });
    });
  };

  const setupCursor = () => {
    const dot = $(".cursor--dot"), ring = $(".cursor--ring");
    if (!dot || !ring || coarse) return;
    const dx = gsap.quickTo(dot, "x", { duration: 0.08 }), dy = gsap.quickTo(dot, "y", { duration: 0.08 });
    const rx = gsap.quickTo(ring, "x", { duration: 0.28, ease: "power3.out" }), ry = gsap.quickTo(ring, "y", { duration: 0.28, ease: "power3.out" });
    on(document, "pointermove", (e) => { dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY); });
    $$("a, button").forEach((el) => {
      on(el, "mouseenter", () => ring.classList.add("is-hover"));
      on(el, "mouseleave", () => ring.classList.remove("is-hover"));
    });
    gsap.to([dot, ring], { opacity: 1, duration: 0.6, delay: 0.5 });
  };

  const setupNavigation = () => {
    $$('a[href^="#"]').forEach((a) => on(a, "click", (e) => {
      const target = document.getElementById((a.getAttribute("href") || "").slice(1));
      if (!target) return;                       // sections arrive in later stages
      e.preventDefault();
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    }));
  };


  /* ---- Ambient background: slowly drifting ethnic ornaments + gold dust (canvas) ----
     Motifs: koshkar-muiz (ram's horns), rhombus "tumar", sun rosette. Opacity is set in CSS
     (.ambient, 0.11). Pauses when the hero is off-screen or the tab is hidden. */
  const setupAmbient = () => {
    const hero = $("#hero");
    if (!hero) return;
    const cv = document.createElement("canvas");
    cv.className = "ambient";
    cv.setAttribute("aria-hidden", "true");
    hero.insertBefore(cv, hero.firstChild);
    const ctx = cv.getContext("2d");
    if (!ctx) return cv.remove();
    ambient = cv;

    const TAU = Math.PI * 2;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const GOLD = (a) => `rgba(212,175,55,${a})`;
    let w = 0, h = 0, dpr = 1, items = [], raf = 0, running = false, inView = true, last = 0, clock = 0;

    // motif drawers — unit size 1, centred at 0,0
    const spiral = (cx, r, dir) => {
      for (let i = 0; i <= 44; i++) {
        const t = i / 44, a = dir * t * TAU * 1.6, rr = r * (1 - t * 0.9);
        const x = cx + Math.cos(a) * rr, y = Math.sin(a) * rr;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
    };
    const motifs = [
      () => {                                            // koshkar-muiz
        ctx.beginPath();
        spiral(-0.55, 0.4, 1); spiral(0.55, 0.4, -1);
        ctx.moveTo(-0.15, 0); ctx.quadraticCurveTo(0, 0.5, 0.15, 0);
        ctx.stroke();
      },
      () => {                                            // rhombus
        ctx.beginPath();
        ctx.moveTo(0, -1); ctx.lineTo(0.7, 0); ctx.lineTo(0, 1); ctx.lineTo(-0.7, 0); ctx.closePath();
        ctx.moveTo(0, -0.5); ctx.lineTo(0.35, 0); ctx.lineTo(0, 0.5); ctx.lineTo(-0.35, 0); ctx.closePath();
        ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 0.08, 0, TAU); ctx.fill();
      },
      () => {                                            // sun rosette
        ctx.beginPath(); ctx.arc(0, 0, 0.32, 0, TAU);
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TAU;
          ctx.moveTo(Math.cos(a) * 0.5, Math.sin(a) * 0.5);
          ctx.lineTo(Math.cos(a) * (i % 2 ? 0.72 : 0.9), Math.sin(a) * (i % 2 ? 0.72 : 0.9));
        }
        ctx.stroke();
      },
    ];

    const spawn = (fromEdge) => {
      const dust = Math.random() < 0.42;
      return {
        dust,
        type: (Math.random() * motifs.length) | 0,
        x: rnd(0, w), y: fromEdge ? h + 60 : rnd(0, h),
        s: dust ? rnd(0.8, 2.2) : rnd(16, 40),
        vx: rnd(-7, 7), vy: dust ? rnd(-14, -4) : rnd(-9, -3),
        rot: rnd(0, TAU), vr: dust ? 0 : rnd(-0.06, 0.06),
        a: dust ? rnd(0.5, 1) : rnd(0.45, 0.95),
        ph: rnd(0, TAU),
      };
    };

    const resize = () => {
      const nw = hero.clientWidth, nh = hero.clientHeight;
      if (!nw || !nh || (nw === w && nh === h)) return;
      const rx = w ? nw / w : 1, ry = h ? nh / h : 1;
      w = nw; h = nh;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      const n = Math.max(16, Math.min(40, Math.round((w * h) / 55000)));
      items.forEach((it) => { it.x *= rx; it.y *= ry; });
      while (items.length < n) items.push(spawn(false));
      items.length = n;
      if (!running) draw();
    };

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1.4; ctx.lineJoin = "round"; ctx.lineCap = "round";
      for (const it of items) {
        const sway = Math.sin(clock * 0.35 + it.ph);
        const tw = 0.65 + 0.35 * Math.sin(clock * 0.6 + it.ph * 2);
        ctx.globalAlpha = it.a * tw;
        ctx.strokeStyle = GOLD(1); ctx.fillStyle = GOLD(1);
        if (it.dust) {
          ctx.beginPath(); ctx.arc(it.x + sway * 6, it.y, it.s, 0, TAU); ctx.fill();
        } else {
          ctx.save();
          ctx.translate(it.x + sway * 10, it.y);
          ctx.rotate(it.rot);
          ctx.scale(it.s, it.s);
          ctx.lineWidth = 1.4 / it.s;                   // constant hairline regardless of size
          motifs[it.type]();
          ctx.restore();
        }
      }
      ctx.globalAlpha = 1;
    };

    const tick = (t) => {
      if (!running) return;
      const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
      last = t; clock += dt;
      for (const it of items) {
        it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.vr * dt;
        const m = 70;
        if (it.y < -m) { it.y = h + m; it.x = rnd(0, w); }
        if (it.x < -m) it.x = w + m; else if (it.x > w + m) it.x = -m;
      }
      draw();
      raf = requestAnimationFrame(tick);
    };
    const start = () => { if (running || reduced || !inView || document.hidden) return; running = true; last = performance.now(); raf = requestAnimationFrame(tick); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    resize();
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(hero); else on(window, "resize", resize);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => { inView = e.isIntersecting; inView ? start() : stop(); }).observe(hero);
    }
    on(document, "visibilitychange", () => (document.hidden ? stop() : start()));
    draw();
    start();
  };

  /* ==========================================================================
     STAGE 2 — Philosophy · Catalogue
     Default state in CSS = visible; JS only hides what it is about to reveal.
     ========================================================================== */

  // wrap every word of an element in <span class="w"> (keeps nested markup), returns the spans
  const splitWords = (el) => {
    const out = [];
    const walk = (node) => [...node.childNodes].forEach((n) => {
      if (n.nodeType !== 3) return n.nodeType === 1 && walk(n);
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach((t) => {
        if (!t) return;
        if (/^\s+$/.test(t)) return frag.appendChild(document.createTextNode(" "));
        const s = document.createElement("span");
        s.className = "w"; s.textContent = t;
        frag.appendChild(s); out.push(s);
      });
      n.replaceWith(frag);
    });
    walk(el);
    return out;
  };

  const setupPhilosophy = () => {
    const title = $(".philosophy__title");
    if (!title || reduced || !hasST) return;

    // headline: words rise in once, each with a gold flash that settles
    const tw = splitWords(title);
    gsap.fromTo(tw,
      { opacity: 0, yPercent: 70, textShadow: "0 0 28px rgba(212,175,55,1)" },
      { opacity: 1, yPercent: 0, textShadow: "0 0 40px rgba(212,175,55,.18)", duration: 1.3, stagger: 0.14, ease: "power3.out",
        scrollTrigger: { trigger: title, start: "top 85%", toggleActions: "play none none none" } });

    // paragraphs: word-by-word, scrubbed by scroll, a soft gold glow travels with the reading line
    $$(".philosophy__text").forEach((p) => {
      const words = splitWords(p);
      gsap.fromTo(words,
        { opacity: 0.1, y: 10, textShadow: "0 0 18px rgba(212,175,55,.95)" },
        { opacity: 1, y: 0, textShadow: "0 0 0px rgba(212,175,55,0)", ease: "none", duration: 1, stagger: { each: 0.05 },
          scrollTrigger: { trigger: p, start: "top 82%", end: "bottom 48%", scrub: 0.6 } });
    });

    // watermark drifts slowly against the scroll
    // CARPE DIEM: slow tracking-in fade with a gold glow
    const quote = $(".philosophy__quote span");
    if (quote) gsap.fromTo(quote, { opacity: 0, y: 26, letterSpacing: "0.7em" }, { opacity: 1, y: 0, letterSpacing: "0.3em", duration: 1.8, ease: "expo.out",
      scrollTrigger: { trigger: ".philosophy__quote", start: "top 85%", toggleActions: "play none none none" } });
  };

  const setupCatalogue = () => {
    const routes = $$(".route"), slides = $$(".preview__slide");
    if (!routes.length || !slides.length) return;
    let cur = -1;
    const show = (i) => {
      if (i === cur) return;
      cur = i;
      routes.forEach((r, k) => r.classList.toggle("is-active", k === i));
      slides.forEach((s, k) => { s.classList.toggle("is-active", k === i); s.setAttribute("aria-hidden", k === i ? "false" : "true"); });
    };
    routes.forEach((r, i) => {
      on(r, "mouseenter", () => show(i));
      on(r, "focus", () => show(i));
      on(r, "click", () => show(i));          // touch: tap previews
    });
    show(0);

    if (reduced || !hasST) return;
    gsap.from(routes.map((r) => r.parentNode), { opacity: 0, y: 34, duration: 1, stagger: 0.12, ease: "power3.out",
      scrollTrigger: { trigger: ".routes", start: "top 85%", toggleActions: "play none none none" } });
    gsap.from(".preview", { opacity: 0, y: 40, duration: 1.2, ease: "power3.out",
      scrollTrigger: { trigger: ".preview", start: "top 88%", toggleActions: "play none none none" } });
    gsap.from(".cta-banner", { opacity: 0, y: 40, duration: 1.2, ease: "power3.out",
      scrollTrigger: { trigger: ".cta-banner", start: "top 90%", toggleActions: "play none none none" } });
    gsap.from(".footer .container > *", { opacity: 0, y: 24, duration: 1, stagger: 0.12, ease: "power3.out",
      scrollTrigger: { trigger: ".footer", start: "top 85%", toggleActions: "play none none none" } });
  };

  const setupMenu = () => {
    const b = $("#burger"), m = $("#mmenu");
    if (b && m) {
      const set = (o) => { document.body.classList.toggle("menu-open", o); b.setAttribute("aria-expanded", String(o)); };
      on(b, "click", () => set(!document.body.classList.contains("menu-open")));
      m.querySelectorAll("a").forEach((a) => on(a, "click", () => set(false)));
      on(window, "keydown", (e) => e.key === "Escape" && set(false));
    }
    const env = $("#envelope"), prompt = $("#selectPrompt");
    if (env && prompt) on(env, "click", () => setTimeout(() => prompt.classList.add("is-called"), 650));
  };

  /* footer Helios half-sun: rises from the golden line only when the page is scrolled to its very bottom */
  const setupSunrise = () => {
    const wrap = $("#heliosWrap");
    if (!wrap) return;
    const rise = () => wrap.classList.add("is-risen");
    if (reduced) return rise();
    wrap.classList.add("is-armed");
    const check = () => {
      if (innerHeight + scrollY < document.documentElement.scrollHeight - 8) return;
      rise();
      removeEventListener("scroll", check);
      removeEventListener("resize", check);
    };
    addEventListener("scroll", check, { passive: true });
    addEventListener("resize", check);
    check();
  };

  /* ==========================================================================
     INIT
     ========================================================================== */

  const startIntro = () => {
    try {
      markSeen();
      master = buildMaster();
      master.play(0);
    } catch (err) {
      failSafe(err && err.message ? err.message : err);
    }
  };

  const init = () => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    scrollTo(0, 0);

    setupAmbient();
    setupButtons();
    setupCursor();
    setupNavigation();
    setupPhilosophy();
    setupCatalogue();
    setupMenu();
    setupSunrise();

    if (!intro || !logoBox || !logoSvg || !art || !header || !brandLogo) return failSafe("intro/header markup not found");

    if (reduced || hasSeen()) {                  // no motion, or intro already seen this session: straight to the page
      intro.remove();
      introActive = false;
      setupHeaderState();
      setupHeroScroll();
      jumpToHash();
      return;
    }

    try {
      document.body.classList.add("is-locked");
      setInitialStates();
    } catch (err) {
      return failSafe(err && err.message ? err.message : err);
    }

    on(intro, "click", requestExit);
    on(window, "keydown", (e) => {
      if (!introActive || !["Escape", "Enter", " "].includes(e.key)) return;
      e.preventDefault();
      requestExit();
    });
    on(window, "load", () => hasST && ScrollTrigger.refresh());

    // start once fonts are ready (max 1.2 s)
    Promise.race([document.fonts && document.fonts.ready, new Promise((r) => setTimeout(r, 1200))]).then(() => introActive && startIntro());
  };

  init();
})();