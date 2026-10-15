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
  const hasGsap = !!window.gsap;
  const hasST = hasGsap && !!window.ScrollTrigger;

  /* GSAP (and ScrollTrigger) are optional enhancements: when the CDN is unreachable the page stays fully usable —
     navigation, menu, catalogue previews and every static state — and only the motion is dropped (see fallbackInit). */
  if (hasGsap) {
    gsap.config({ nullTargetWarn: false });   // force3D stays "auto": GPU layers only while an element is moving
    gsap.ticker.lagSmoothing(1000, 24);          // a long frame (decode / layout) never makes the tweens leap ahead
    if (hasST) {
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.config({ ignoreMobileResize: true });   // URL-bar show/hide on phones must not re-measure every trigger
    }
  } else {
    console.warn("GSAP not loaded — running without animation.");
    root.classList.add("gsap-unavailable");
    root.classList.remove("txp-resume", "txp-prep");
  }

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const on = (el, t, fn, o) => el && el.addEventListener(t, fn, o);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = matchMedia("(pointer: coarse)").matches;

  /* ---------- timing ---------- */
  const MAP_START = 0.3;
  const MAP_DUR = 2.3;
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
  let lgIcon, lgWords = [], lgTags = [], lgMask = null;
  let master = null;
  let introActive = true;
  let exiting = false;
  let ambient = null;                      // ambient ornament canvas
  let ambientStart = null;                 // starts the ambient canvas loop …
  let ambientHeld = true;                  // … but only once the hero entrance begins (one heavy thing at a time: no jank)
  let ambientTarget = 0.11;                // final opacity, read from CSS

  const hideOffset = (p) => (mapLen.get(p) || 0) * 1.02 + 4;   // a hair past the length: no round-cap dot left over

  /* intro runs once per session */
  const markSeen = () => { if (window.TXP_VISIT) TXP_VISIT.mark("intro"); };          // once per visit (30 min of inactivity ends a visit)
  const hasSeen = () => !!(window.TXP_VISIT && TXP_VISIT.seen("intro"));
  const jumpToHash = () => {
    const go = () => { const t = location.hash && document.getElementById(location.hash.slice(1)); if (t) t.scrollIntoView({ block: "start" }); };
    go(); on(window, "load", go);
  };

  /* ---------- fail-safe: a visitor is never stuck behind the intro ---------- */
  const failSafe = (why) => {
    console.warn("Intro skipped:", why);
    root.classList.add("gsap-unavailable");
    root.classList.remove("txp-resume", "txp-prep");
    document.body.classList.remove("is-locked");
    ambientHeld = false; ambientStart && ambientStart();
    const targets = [header, brandLogo, ambient, linesWrap, ...navItems, ...heroText, ...petroImgs].filter(Boolean);
    if (hasGsap) gsap.set(targets, { clearProps: "all" });
    else targets.forEach((el) => el.removeAttribute("style"));
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

  // Logo: live DOM clone of the sprite art so every part can be animated
  const NS = "http://www.w3.org/2000/svg";
  let lgWings = [], lgCaret = null, lgDefs = null;

  /* soft-edged mask that sweeps one element in from its left edge to its right edge */
  const makeSweep = (el, id, feather = 0.22) => {
    try {
      const bb = el.getBBox(), pad = 30, W = bb.width, H = bb.height;
      const gw = W * (1 + feather);                                   // gradient rect: solid part + soft edge
      const solid = 1 / (1 + feather);
      lgDefs.insertAdjacentHTML("beforeend",
        `<linearGradient id="${id}G" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff"/><stop offset="${solid.toFixed(3)}" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient>` +
        `<mask id="${id}M" maskUnits="userSpaceOnUse" x="${bb.x - pad}" y="${bb.y - pad}" width="${W + pad * 2}" height="${H + pad * 2}">` +
        `<rect id="${id}R" x="${bb.x - gw - pad}" y="${bb.y - pad}" width="${gw}" height="${H + pad * 2}" fill="url(#${id}G)"/></mask>`);
      el.setAttribute("mask", `url(#${id}M)`);
      const rect = lgDefs.querySelector(`#${id}R`);
      // x when the rect has not entered yet / when the whole element (incl. soft edge) is revealed
      return { el, rect, from: bb.x - gw - pad, to: bb.x + W - gw * solid + 2 };
    } catch (e) { return null; }
  };

  const prepareLogo = () => {
    const clone = art.cloneNode(true);
    clone.removeAttribute("id");
    logoSvg.appendChild(clone);
    lgIcon = $(".lg-icon", clone);
    lgWords = $$(".lg-word path", clone);
    lgTags = $$(".lg-tag path", clone);
    lgDefs = document.createElementNS(NS, "defs");
    clone.insertBefore(lgDefs, clone.firstChild);

    // emblem: each wing is revealed by its own soft-edged mask, left → right (left wing first, then the right one)
    lgWings = $$(".lg-wing", clone).map((w, i) => makeSweep(w, "lgWing" + i)).filter(Boolean);
    lgMask = lgWings.length === 2 ? lgWings : null;
    if (!lgMask) gsap.set($$(".lg-wing", clone), { opacity: 0 });
    lgWings.forEach((w) => w.rect.setAttribute("x", w.from));

    // typewriter caret (sits at the baseline band of the wordmark)
    try {
      const wb = $(".lg-word", clone).getBBox();
      lgCaret = document.createElementNS(NS, "rect");
      lgCaret.setAttribute("class", "lg-caret");
      lgCaret.setAttribute("y", wb.y - 6);
      lgCaret.setAttribute("width", 5);
      lgCaret.setAttribute("height", wb.height + 12);
      lgCaret.setAttribute("x", wb.x - 22);
      lgCaret.setAttribute("rx", 1);
      clone.appendChild(lgCaret);
      gsap.set(lgCaret, { opacity: 0 });
    } catch (e) { lgCaret = null; }

    gsap.set(lgWords, { opacity: 0 });
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
      { strokeDashoffset: 0, duration: MAP_DUR, ease: "power3.inOut", immediateRender: false },
      MAP_START
    );

    /* B — logo, after the map (≈7 s): emblem left wing → right wing, then the wordmark "typed", then the tagline last */
    const at = mapEnd + 0.1;
    tl.set(logoBox, { autoAlpha: 1 }, at);
    tl.to(plate, { autoAlpha: 1, duration: 1.8, ease: "expo.out" }, at);

    // 1) emblem: left part, then right part (each wing sweeps in from its left edge to its right edge)
    const WING = 1.45;
    if (lgMask) {
      tl.to(lgMask[0].rect, { attr: { x: lgMask[0].to }, duration: WING, ease: "power2.inOut" }, at + 0.15);
      tl.to(lgMask[1].rect, { attr: { x: lgMask[1].to }, duration: WING, ease: "power2.inOut" }, at + 0.15 + WING * 0.85);
      tl.add(() => lgMask.forEach((w) => w.el.removeAttribute("mask")), at + 0.15 + WING * 1.85 + 0.05);
    } else {
      tl.to($$(".lg-wing", logoSvg), { opacity: 1, duration: 2.4, ease: "power2.out", stagger: 1.2 }, at + 0.2);
    }

    // 2) main text: typewriter — letters appear one after another, caret runs along and blinks out at the end
    const T0 = at + 0.15 + WING * 1.85 + 0.35;       // starts when the emblem is fully drawn
    const STEP = 0.17;
    lgWords.forEach((ch, i) => {
      const t = T0 + i * STEP;
      let right = 0;
      try { const b = ch.getBBox(); right = b.x + b.width; } catch (e) {}
      tl.set(ch, { opacity: 1 }, t);
      tl.fromTo(ch, { y: 10 }, { y: 0, duration: 0.35, ease: "power2.out", immediateRender: false }, t);
      if (lgCaret) tl.set(lgCaret, { opacity: 1, attr: { x: right + 12 } }, t);
    });
    const typedEnd = T0 + (lgWords.length - 1) * STEP;
    if (lgCaret) {
      tl.to(lgCaret, { opacity: 0, duration: 0.12, repeat: 3, yoyo: true, ease: "none" }, typedEnd + 0.15);
      tl.set(lgCaret, { opacity: 0 }, typedEnd + 1.05);
    }

    // 3) tagline — the very last, softly, left → right
    const T1 = typedEnd + 1.0;
    tl.to(lgTags, { opacity: 1, duration: 0.9, stagger: 0.04, ease: "power2.out" }, T1);
    tl.to(introMeta, { opacity: 1, duration: 1.2, ease: "power2.out" }, T1 + 0.5);
    return tl;
  };

  const buildExitTL = () => {
    const tl = gsap.timeline();

    tl.add(() => { intro.style.pointerEvents = "none"; measureMorph(); }, 0);
    tl.to([introMeta, introFrame, plate], { opacity: 0, duration: 0.75, ease: "expo.out" }, 0);

    /* C1 — the map is erased by the same line running backwards (0 → length) */
    tl.fromTo(
      [...mapGlows, ...mapLines],
      { strokeDashoffset: 0 },
      { strokeDashoffset: (i, el) => hideOffset(el), duration: 2.12, ease: "power3.inOut", immediateRender: false },
      0
    );
    tl.set([...mapGlows, ...mapLines], { autoAlpha: 0 }, 1.7);

    /* C2 — backdrop dissolves (hero has the identical background), logo flies to the header */
    tl.to(introBg, { opacity: 0, duration: 1.12, ease: "power3.inOut" }, 0.5);
    tl.to(logoBox, { x: () => measureMorph().x, y: () => measureMorph().y, scale: () => measureMorph().k, duration: 1.81, ease: "expo.inOut" }, 0.25);
    tl.to(header, { opacity: 1, duration: 1, ease: "expo.out" }, 0.7);

    /* swap: header logo takes over at the exact spot the flying logo lands */
    tl.add(() => gsap.set(brandLogo, { opacity: 1 }), 1.72);
    tl.set(logoBox, { autoAlpha: 0 }, 1.74);
    return tl;
  };

  const buildHeroTL = () => {
    const tl = gsap.timeline();
    tl.add(() => { ambientHeld = false; ambientStart && ambientStart(); }, 0.8);
    if (linesWrap) tl.to(linesWrap, { opacity: 1, duration: 3, ease: "expo.out" }, 0.2);
    if (ambient) tl.to(ambient, { opacity: ambientTarget, duration: 3.25, ease: "expo.out" }, 0);
    tl.to(navItems, { opacity: 1, y: 0, duration: 1.12, stagger: 0.07, ease: "expo.out" }, 0);
    tl.to(heroText, { opacity: 1, y: 0, duration: 1.5, stagger: 0.1, ease: "expo.out" }, 0.1);
    tl.to(petroImgs, { opacity: (i, el) => petroTarget.get(el), scale: 1, yPercent: 0, duration: 2.25, stagger: 0.14, ease: "expo.out" }, 0.3);
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
    const PETRO = [[".petro--sun img", -30], [".petro--ibex img", -18], [".petro--deer img", 16], [".petro--horse img", 26]];

    /* gsap.matchMedia() builds the scroll tweens per viewport class and rebuilds them when the class changes
       (rotation, split-screen, resize), so nothing is measured by hand and nothing stays stale after orientationchange. */
    const build = ({ phone, touch }) => {
      gsap.to("#heroTitleParallax", { yPercent: -7, ease: "none", scrollTrigger: { ...trig, scrub: 1.15 } });
      // topographic lines + petroglyphs: driven by startHeroParallax() below (no timeline / ScrollTrigger dependency)
    };
    if (gsap.matchMedia) {
      gsap.matchMedia().add({ phone: "(max-width: 640px)", touch: "(hover: none)" }, (ctx) => { build(ctx.conditions); });
    } else {
      build({ phone: matchMedia("(max-width: 640px)").matches, touch: matchMedia("(hover: none)").matches });
    }
    let rt = 0;
    const settle = () => { clearTimeout(rt); rt = setTimeout(() => ScrollTrigger.refresh(), 280); };
    on(window, "orientationchange", settle);
    on(window, "pageshow", (e) => e.persisted && settle());      // back/forward cache restores the page without a load event
    ScrollTrigger.refresh();
  }


  /* Scroll parallax for the topographic lines + petroglyphs (transform only, eased every frame).
     Starts straight from init(), independent of the intro timeline and of ScrollTrigger, so it can never be skipped.
     progress = scrollY / hero height; petroglyphs travel PETRO px × k, line layers travel data-depth % of their height. */
  let parallaxOn = false;
  function startHeroParallax() {
    if (parallaxOn || reduced || !hasGsap) return;
    const hero = $("#hero");
    if (!hero) return;
    parallaxOn = true;
    const PETRO = [[".petro--sun img", -30], [".petro--ibex img", -18], [".petro--deer img", 16], [".petro--horse img", 26]]
      .map(([s, y]) => [$(s), y]).filter(([e]) => e);
    const layers = linesLayers.map((l) => [l, parseFloat(l.dataset.depth) || 0]);
    const mq = (q) => matchMedia(q).matches;
    let H = 1, k = 4.4, phone = false, cur = 0, last = -1;
    const measure = () => {
      H = Math.max(1, hero.offsetHeight);
      phone = mq("(max-width: 640px)");
      k = phone ? 0.6 : mq("(hover: none)") ? 1.4 : 4.4;     // laptop / desktop: clearly visible travel
    };
    measure();
    on(window, "resize", measure);
    on(window, "orientationchange", () => setTimeout(measure, 280));
    on(window, "load", measure);
    gsap.ticker.add(() => {
      const target = Math.min(1, Math.max(0, scrollY / H));
      cur += (target - cur) * (1 - Math.pow(0.88, gsap.ticker.deltaRatio()));   // soft follow, ~0.1 per frame at 60 fps
      if (Math.abs(target - cur) < 0.0004) cur = target;
      if (cur === last) return;
      last = cur;
      PETRO.forEach(([e, y]) => gsap.set(e, { y: y * k * cur }));
      if (!phone) layers.forEach(([l, d]) => gsap.set(l, { yPercent: d * cur }));
    });
  }

  /* Header light: --hdr-p follows the scroll position (0 at the top → 1 after ~340px) and is eased every frame,
     so the colour never jumps: a "falling light" at the top that slowly slides down and out while scrolling. */
  function setupHeaderLight() {
    if (!header) return;
    const RANGE = 340;
    const target = () => { const t = Math.min(1, Math.max(0, scrollY / RANGE)); return t * t * (3 - 2 * t); };   // smoothstep
    let cur = target(), raf = 0;
    const apply = () => header.style.setProperty("--hdr-p", cur.toFixed(4));
    const tick = () => {
      const t = target(), d = t - cur;
      if (Math.abs(d) < 0.0008) { cur = t; apply(); raf = 0; return; }
      cur += d * 0.085;                                              // critically soft follow
      apply();
      raf = requestAnimationFrame(tick);
    };
    apply();
    if (reduced) { on(window, "scroll", () => { cur = target(); apply(); }, { passive: true }); return; }
    on(window, "scroll", () => { if (!raf) raf = requestAnimationFrame(tick); }, { passive: true });
  }

  function setupHeaderState() {
    if (!header) return;
    // Luxury auto-hide: the header fades and lifts a little after ~90px of continuous scrolling down,
    // and comes back only after 40px+ of scrolling up (or near the top). No timers, nothing twitches on tiny moves.
    header.classList.add("is-live");
    let lastY = scrollY, acc = 0, hidden = false;
    const set = (h) => { if (h === hidden) return; hidden = h; header.classList.toggle("is-hidden", h); };
    const update = () => {
      const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      const y = Math.min(max, Math.max(0, scrollY)), d = y - lastY;   // clamps iOS rubber-band overscroll
      lastY = y;
      header.classList.toggle("is-scrolled", y > 40);
      if (document.body.classList.contains("menu-open") || y < 140) { acc = 0; set(false); return; }
      if (!d) return;
      if (d > 0) { acc = acc > 0 ? acc + d : d; if (acc > 90) set(true); }
      else { acc = acc < 0 ? acc + d : d; if (acc < -40) set(false); }
    };
    on(window, "scroll", update, { passive: true });
    update();
  }

  const setupButtons = () => {
    if (coarse || reduced) return;
    $$(".luxury-button:not(.invest-cta)").forEach((btn) => {
      gsap.set(btn, { transformPerspective: 700 });
      const o = { duration: 0.56, ease: "expo.out" };
      const qx = gsap.quickTo(btn, "x", o), qy = gsap.quickTo(btn, "y", o);
      const qrx = gsap.quickTo(btn, "rotationX", o), qry = gsap.quickTo(btn, "rotationY", o);
      let r = null;
      on(btn, "pointerenter", () => { r = btn.getBoundingClientRect(); });
      on(btn, "pointermove", (e) => {
        if (!r) r = btn.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        qx(x * 8); qy(y * 7); qrx(-y * 3); qry(x * 4);
      });
      on(btn, "pointerleave", () => { r = null; qx(0); qy(0); qrx(0); qry(0); });
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
    gsap.to([dot, ring], { opacity: 1, duration: 0.75, delay: 0.5 });
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
      if (w && coarse && Math.abs(nw - w) < 2 && Math.abs(nh - h) < 160) return;   // mobile URL-bar show/hide: keep the canvas, no flicker
      const rx = w ? nw / w : 1, ry = h ? nh / h : 1;
      w = nw; h = nh;
      dpr = Math.min(window.devicePixelRatio || 1, matchMedia("(max-width: 820px)").matches ? 1 : 1.25);
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
      raf = requestAnimationFrame(tick);
      if (t - last < 30) return;                         // ~30 fps: half the canvas work, the drift is far too slow to show it
      const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
      last = t; clock += dt;
      for (const it of items) {
        it.x += it.vx * dt; it.y += it.vy * dt; it.rot += it.vr * dt;
        const m = 70;
        if (it.y < -m) { it.y = h + m; it.x = rnd(0, w); }
        if (it.x < -m) it.x = w + m; else if (it.x > w + m) it.x = -m;
      }
      draw();
    };
    const start = () => { if (ambientHeld || running || reduced || !inView || document.hidden) return; running = true; last = performance.now(); raf = requestAnimationFrame(tick); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };

    resize();
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(hero); else on(window, "resize", resize);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([e]) => { inView = e.isIntersecting; inView ? start() : stop(); }).observe(hero);
    }
    on(document, "visibilitychange", () => (document.hidden ? stop() : start()));
    draw();
    ambientStart = start;
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
      { opacity: 1, yPercent: 0, textShadow: "0 0 40px rgba(212,175,55,.18)", duration: 1.62, stagger: 0.14, ease: "expo.out",
        scrollTrigger: { trigger: title, start: "top 85%", toggleActions: "play none none none" } });

    // paragraphs: word-by-word, scrubbed by scroll, a soft gold glow travels with the reading line
    $$(".philosophy__text").forEach((p) => {
      const words = splitWords(p);
      gsap.fromTo(words,
        { opacity: 0.1, y: 10, textShadow: "0 0 18px rgba(212,175,55,.95)" },
        { opacity: 1, y: 0, textShadow: "0 0 0px rgba(212,175,55,0)", ease: "none", duration: 1.25, stagger: { each: 0.05 },
          scrollTrigger: { trigger: p, start: "top 82%", end: "bottom 48%", scrub: 0.6 } });
    });

    // watermark drifts slowly against the scroll
    // CARPE DIEM: slow tracking-in fade with a gold glow
    const quote = $(".philosophy__quote span");
    if (quote) gsap.fromTo(quote, { opacity: 0, y: 26, letterSpacing: "0.7em" }, { opacity: 1, y: 0, letterSpacing: "0.3em", duration: 2.25, ease: "expo.out",
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
    gsap.fromTo(routes.map((r) => r.parentNode), { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 1.25, stagger: 0.12, ease: "expo.out",
      scrollTrigger: { trigger: ".routes", start: "top 85%", toggleActions: "play none none none" } });
    gsap.fromTo(".preview", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.5, ease: "expo.out",
      scrollTrigger: { trigger: ".preview", start: "top 88%", toggleActions: "play none none none" } });
    gsap.fromTo(".cta-banner", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.5, ease: "expo.out",
      scrollTrigger: { trigger: ".cta-banner", start: "top 90%", toggleActions: "play none none none" } });
    gsap.fromTo(".footer .container > *", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.25, stagger: 0.12, ease: "expo.out",
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

  /* ==========================================================================
     INIT
     ========================================================================== */

  /* Everything the first frames need is decoded BEFORE any motion starts (fonts, hero artwork),
     then two animation frames pass so the browser has painted the hidden start state. Capped: never blocks. */
  const whenReady = (cap = 1200) => {
    const decodes = petroImgs.map((i) => (i.decode ? i.decode().catch(() => {}) : Promise.resolve()));
    const fonts = document.fonts && document.fonts.ready ? document.fonts.ready.catch(() => {}) : Promise.resolve();
    return Promise.race([Promise.all([fonts, ...decodes]), new Promise((r) => setTimeout(r, cap))])
      .then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  };

  /* Reload / return within a visit: the intro is skipped, but the page still arrives softly
     (header, hero text, topographic lines and petroglyphs fade in) instead of popping into place. */
  const resumeEntrance = () => {
    if (ambient) {
      const o = parseFloat(getComputedStyle(ambient).opacity);
      ambientTarget = Number.isFinite(o) && o > 0 ? o : 0.11;
    }
    petroImgs.forEach((img) => {
      const o = parseFloat(getComputedStyle(img).opacity);
      petroTarget.set(img, Number.isFinite(o) && o > 0 ? o : 0.35);
    });
    ambient && gsap.set(ambient, { opacity: 0 });
    linesWrap && gsap.set(linesWrap, { opacity: 0 });
    gsap.set(header, { opacity: 0, y: -16 });
    gsap.set(navItems, { opacity: 0, y: -8 });
    gsap.set(heroText, { opacity: 0, y: 25 });
    gsap.set(petroImgs, { opacity: 0, scale: 0.94, yPercent: 4, transformOrigin: "50% 50%" });
    document.documentElement.classList.remove("txp-resume");     // inline styles now hold everything hidden: no flash

    const tl = gsap.timeline({ paused: true });
    tl.to(header, { opacity: 1, y: 0, duration: 1.3, ease: "expo.out", clearProps: "opacity,transform" }, 0);
    tl.add(buildHeroTL(), 0.1);
    tl.add(() => { setupHeaderState(); setupHeroScroll(); }, ">-0.2");
    whenReady().then(() => tl.play(0));          // smooth from the very first frame
    return tl;
  };

  const startIntro = () => {
    try {
      markSeen();
      master = buildMaster();
      master.eventCallback("onComplete", () => gsap.globalTimeline.timeScale(0.9));   // after the intro: everything a touch calmer
      master.play(0);
    } catch (err) {
      failSafe(err && err.message ? err.message : err);
    }
  };

  /* No GSAP: skip the intro, show the finished page, keep every non-animated feature alive. */
  const fallbackInit = () => {
    if ("scrollRestoration" in history) history.scrollRestoration = "auto";
    [setupNavigation, setupMenu, setupCatalogue, setupHeaderLight, setupHeaderState].forEach((fn) => {
      try { fn(); } catch (err) { console.warn("Fallback init:", fn.name, err); }
    });
    document.body.classList.remove("is-locked");
    intro && intro.remove();
    jumpToHash();
  };

  const init = () => {
    if (!hasGsap) return fallbackInit();
    startHeroParallax();
    const skipIntro = reduced || hasSeen();
    if ("scrollRestoration" in history) history.scrollRestoration = skipIntro ? "auto" : "manual";   // Back button keeps its place
    if (!skipIntro) scrollTo(0, 0);

    setupAmbient();
    setupButtons();
    setupCursor();
    setupNavigation();
    setupPhilosophy();
    setupCatalogue();
    setupMenu();
    root.classList.remove("txp-prep");           // all reveal targets now hold their gsap start state: unhide in the same task, no flash

    if (!intro || !logoBox || !logoSvg || !art || !header || !brandLogo) return failSafe("intro/header markup not found");

    setupHeaderLight();

    if (skipIntro) {                             // no motion, or intro already seen in this visit: straight to the page
      intro.remove();
      introActive = false;
      if (!reduced) gsap.globalTimeline.timeScale(0.9);
      if (!reduced && window.gsap && document.documentElement.classList.contains("txp-resume")) {
        resumeEntrance();                        // soft arrival instead of a pop
      } else {
        document.documentElement.classList.remove("txp-resume");
        setupHeaderState();
        setupHeroScroll();
      }
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
    whenReady(1400).then(() => introActive && startIntro());
  };

  /* the intro is a first impression: it starts only once the site gate (gate.js) has been passed */
  (window.TXP_whenOpen || ((fn) => fn()))(init);
})();
