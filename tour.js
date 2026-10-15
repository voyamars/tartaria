/* TARTARIA XP — tour.js: one shared script for all 8 tour pages.
   The page only sets window.ROUTE_N (1…8); everything else comes from routes.js (ROUTES). */
(() => {
  "use strict";
  const R = window.ROUTES, $ = (id) => document.getElementById(id);
  if (!R || !$("rt")) return;
  const n = Math.min(R.length, Math.max(1, window.ROUTE_N || 1));
  const r = R[n - 1], num = "0" + n;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ARROW = '<svg viewBox="0 0 12 12" focusable="false" aria-hidden="true"><path d="M3 9 9 3M4.5 3H9v4.5"/></svg>';   // SVG, never a text glyph (iOS draws those as emoji)
  document.title = `${r.t} — Tartaria XP`;
  document.body.dataset.route = String(n);   // lets motion.css give single routes their own background art

  // soft glow over the whole top of the page: dissolves on every side, also behind the header
  const glow = document.createElement("div");
  glow.className = "rt-glow"; glow.setAttribute("aria-hidden", "true");
  document.body.prepend(glow);

  const priv = r.v.map((x) => `<li>${x.t ? `<b>${x.t}</b>` : ""}${x.d}</li>`).join("");
  const prev = R[(n + R.length - 2) % R.length], next = R[n % R.length];
  const S = r.sacred || {};
  const sacBg = S.bg ? `<div data-sacred="${S.bg}" data-sacred-bg></div>` : "";
  const sacEmblem = S.emblem ? `<section class="rt-emblem"><div data-sacred="${S.emblem}"></div></section>` : "";
  const cta = (cls) => `<button class="luxury-button${cls || ""}" type="button" data-open="${r.a}"><span>${r.a}</span><b aria-hidden="true">${ARROW}</b></button>`;

  $("rt").innerHTML = `
    <section class="container rt-hero">
      <div class="rt-hero__copy">
        <span class="kicker">ROUTE ${num}</span>
        <h1>${r.t}</h1>
        ${r.s ? `<p class="rt-sub">“${r.s}”</p>` : ""}
        <p class="rt-lead">${r.h}</p>
        <div class="rt-actions">${cta()}</div>
      </div>
      <figure class="rt-art" id="rtArt" data-slot="${n}" aria-hidden="true"></figure>
    </section>
    <section class="atlas" aria-label="Expedition map">
      <canvas id="atlasCv"></canvas>
      <div class="atlas__cap"><span>ROUTE ${num}</span><i></i><span>${r.w.length} stops</span></div>
    </section>
    <div class="container rt-body">
      ${sacBg}
      ${r.c ? `<section class="rt-sec"><span class="kicker">THE EXPEDITION</span><h2>Access over itinerary</h2><p>${r.c}</p></section>` : ""}
      ${r.nr ? `<section class="rt-sec"><span class="kicker">NARRATIVE CONCEPT</span><h2>You move as an envoy</h2><p>${r.nr}</p></section>` : ""}
      ${sacEmblem}
      <section class="rt-sec"><h2>Exclusive Privileges</h2><ul class="rt-priv" id="rtPriv">${priv}</ul></section>
      <section class="rt-end">${cta()}</section>
      <nav class="rt-nav" aria-label="Expedition navigation"><a href="${prev.url}">Previous route</a><span>${num} / 0${R.length}</span><a href="${next.url}">Next route</a></nav>
    </div>`;

  if (window.Atlas) Atlas.mount($("atlasCv"), r);

  const heroIn = () => {
    if (!window.gsap || reduced) return;
    gsap.globalTimeline.timeScale(0.88);   // everything a touch calmer
    gsap.fromTo([".rt-hero .kicker", ".rt-hero h1", ".rt-sub", ".rt-lead", ".rt-actions"], { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.25, stagger: 0.12, ease: "expo.out", clearProps: "opacity,transform", delay: 0.1 });
  };
  (window.TXP_whenOpen || ((fn) => fn()))(heroIn);                // after the site gate, so the entrance is seen
  document.documentElement.classList.remove("txp-prep");   // hero start state is set (or no motion): reveal without a flash

  /* privileges: one row is "on" — a gold hairline draws along its top, the others dim, the title slides a little.
     Desktop: the row under the cursor. Touch: the row crossing the middle of the screen (IntersectionObserver). */
  const list = $("rtPriv");
  if (list) {
    const rows = [...list.children];
    let cur = null;
    const set = (li) => { if (li === cur) return; cur && cur.classList.remove("is-on"); cur = li; li && li.classList.add("is-on"); };
    if (matchMedia("(hover: hover)").matches) {
      rows.forEach((li) => {
        li.addEventListener("pointerenter", () => set(li));
        li.addEventListener("pointerleave", () => set(null));
      });
    } else if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => es.forEach((e) => {
        if (e.isIntersecting) set(e.target); else if (cur === e.target) set(null);
      }), { rootMargin: "-46% 0px -46% 0px", threshold: 0 });
      rows.forEach((li) => io.observe(li));
    }
  }

  // contact overlay → WhatsApp
  let intent = "";
  const M = $("rtM");
  document.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => {
    intent = b.dataset.open;
    $("rtH").textContent = intent;
    $("rtS").textContent = `Route ${num} — ${r.t}`;
    M.hidden = false;
    void M.offsetWidth;                                           // commit display:grid so the transition can run
    requestAnimationFrame(() => M.classList.add("is-open"));
    setTimeout(() => $("fName").focus({ preventScroll: true }), 420);
  }));
  let closeT = 0;
  const close = () => {
    if (M.hidden || !M.classList.contains("is-open")) return;
    M.classList.remove("is-open");
    clearTimeout(closeT);
    closeT = setTimeout(() => { if (!M.classList.contains("is-open")) M.hidden = true; }, 900);
  };
  $("rtX").addEventListener("click", close);
  M.addEventListener("click", (e) => e.target === M && close());
  addEventListener("keydown", (e) => e.key === "Escape" && close());
  $("rtF").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("fName").value.trim(), contact = $("fContact").value.trim(), dates = $("fDates").value.trim() || "Flexible";
    $("fName").parentNode.classList.toggle("is-invalid", !name);
    $("fContact").parentNode.classList.toggle("is-invalid", !contact);
    $("rtE").textContent = name && contact ? "" : "Please provide your name and a direct contact.";
    if (!name || !contact) return;
    const msg = ["Greetings Tartaria XP Concierge.", "", `Request: ${intent}`, `Route ${num} // ${r.t}`, `Client Name: ${name}`, `Contact Info: ${contact}`, `Proposed Dates: ${dates}`].join("\n");
    window.open(`https://wa.me/${WA_PHONE}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  });
})();
