/* TARTARIA XP — shared data for index cards, route pages and the quiz.
   Fields: nm name · t headline · s subtitle · p route · m vector motif · h lead · c copy · nr narrative · v privileges · a CTA · slug clean URL folder */

/* ---- visit gate: intro / map animations play once per visit; a visit ends after 30 minutes of inactivity ---- */
window.TXP_VISIT = (() => {
  const K = "txp_visit", TTL = 30 * 60 * 1000;
  let mem = null;
  const rd = () => { try { return JSON.parse(localStorage.getItem(K)); } catch (e) { return mem; } };
  const wr = (o) => { mem = o; try { localStorage.setItem(K, JSON.stringify(o)); } catch (e) {} };
  const cur = () => { const o = rd(); return o && o.f && Date.now() - o.t <= TTL ? o : { t: Date.now(), f: {} }; };
  wr(cur());                                          // new visit → fresh flags; otherwise just refreshes the clock
  const beat = () => { const o = cur(); o.t = Date.now(); wr(o); };
  let lastBeat = Date.now();
  ["pointerdown", "scroll", "keydown", "touchstart"].forEach((e) => addEventListener(e, () => { if (Date.now() - lastBeat > 15000) { lastBeat = Date.now(); beat(); } }, { passive: true }));
  addEventListener("pagehide", beat);
  setInterval(() => { if (!document.hidden) beat(); }, 60000);
  return { seen: (k) => !!cur().f[k], mark: (k) => { const o = cur(); o.f[k] = 1; o.t = Date.now(); wr(o); } };
})();

window.WA_PHONE = "447521398370";
window.ROUTES = [
{ nm:"The Imperial Horde Expedition", t:"In Search of the Tomb of Genghis Khan",
  p:"Ulaanbaatar → Otuken → Aktau → Almaty → Samarkand → Bukhara → Tashkent",
  m:"Imperial Mongolian Tamga fused with Silk Road star geometry",
  h:"Unravel the greatest historical mystery on Earth across four thousand kilometers of imperial steppe and silk-draped oases.",
  c:"Traces the expansion of the Mongol Empire from the sacred, restricted ancestral sanctuaries of Mongolia to the monumental turquoise domes of Central Asia. Designed strictly for travelers who seek access over itinerary.",
  nr:"You do not travel as a tourist; you move as an envoy. This expedition retraces the westward push of Genghis Khan’s golden lineages. You cross infinite horizons by private chartered aircraft, landing on remote desert airstrips where private luxury yurt camps await. By day, you navigate restricted archaeological zones with lead historians; by night, you dine under open steppe skies accompanied by bespoke musical improvisations performed on ancient instruments.",
  v:[{t:"Private Steppe Aviation",d:"Direct charter transitions across Mongolia, Western Kazakhstan, and Uzbekistan, bypassing commercial hubs entirely."},{t:"The Otuken Sanctuary Access",d:"Closed-door access to the sacred Otuken mountain region with senior field archaeologists."},{t:"Vault Access in Samarkand & Bukhara",d:"After-hours private entry to restricted UNESCO manuscript vaults and active restoration labs inside the Registan."},{t:"Imperial Camp Comfort",d:"High-end mobile luxury glamping set up exclusively for your arrival in secluded desert and mountain valleys."}],
  a:"Request Private Dossier" },
{ nm:"Empires of the Steppe", t:"The Golden Warrior: Saka, Huns & Silk Road Citadels", s:"2,500 Years of Nomad Empires",
  p:"Saraychik → Sauran → Otrar → Turkestan → Sayram → Almaty",
  m:"Saka Golden Man royal crown and nomadic animal-style motifs",
  h:"Walk through two and a half millennia of nomadic statehood. Explore lost mudbrick fortresses and sacred citadels where Saka warrior kings, Attila’s Hunnic legions, and Turkic Khagans forged Eurasian civilization.",
  v:[{t:"Saka Kurgan Dig",d:"Active archaeological dig participation at Saka kurgan excavation sites."},{t:"Otrar at Sunset",d:"Private guided access through the siege ruins of ancient Otrar at sunset."},{t:"Sufi Mausoleums by Night",d:"Nighttime subterranean access to medieval Sufi mausoleums in Turkestan."}],
  a:"Inquire for Private Departure" },
{ nm:"The Sacred Mind", t:"Thus Spoke Zarathustra: Tengri, Sufism & Sound Healing", s:"Psychological & Spiritual Transformation",
  p:"Sacred Kazakh Steppe → Mangystau Underground Sanctuaries → Turkestan → Almaty",
  m:"Concentric Tengri sky orbits and Kobyz instrument silhouettes",
  h:"Realign your inner psyche through ancient Eurasian traditions. Experience deep sky-gazing under infinite Tengri horizons, Zarathustrian fire rituals, Sufi introspective meditation, and acoustic vibration therapy.",
  v:[{t:"Acoustic Healing",d:"Acoustic healing sessions utilizing ancient Kobyz and Dombra frequency resonances."},{t:"Mangystau Sanctuaries",d:"Private night stargazing and meditation inside Mangystau’s chalk underground sanctuaries."},{t:"Private Session with Dimash",d:"Exclusive private session featuring bespoke acoustic arrangements by global music icon Dimash Kudaibergen."}],
  a:"Reserve Spiritual Journey" },
{ nm:"The Great Kazakh Exodus", t:"The Great Exodus: The Long March to Freedom", s:"The Epic Transcontinental Migration Trail",
  p:"Kazakhstan → Mongolia → Tibet → India → Afghanistan → Pakistan → Turkey",
  m:"Alpine mountain pass with a single continuous migration line",
  h:"The ultimate test of human resilience. Retrace the legendary overland exile route of nomadic Kazakh tribes across high Himalayan passes and brutal deserts into Anatolian refuge.",
  v:[{t:"Trans-Himalayan Crossings",d:"Guided trans-Himalayan highland pass crossings with high-altitude support teams."},{t:"Mountain Nomad Enclaves",d:"Secluded encounters with mountain nomad enclaves holding oral histories of the trek."},{t:"Voices of the Descendants",d:"Transcontinental historical storytelling delivered by direct descendants of the exodus."}],
  a:"Request Expedition Details" },
{ nm:"The Friar’s Chronicle", t:"William of Rubruck: Secret Embassy to the Great Khan", s:"The 13th-Century Diplomatic Thriller",
  p:"Istanbul / Crimea → Kipchak Steppe → Great Khan Imperial Court",
  m:"Franciscan wax seal crossed with a Mongol diplomatic Paiza tablet",
  h:"Relive the perilous 13th-century journey of Franciscan monk William of Rubruck into the heart of the Mongol Empire. A high-stakes diplomatic expedition spanning wild frontiers and imperial court intrigue.",
  v:[{t:"Black Sea Embarkation",d:"Black Sea private maritime embarkation re-enacting medieval diplomatic departures."},{t:"Caravanserai Nights",d:"Caravanserai night stays along forgotten Kipchak steppe trade corridors."},{t:"Court Diplomacy Archives",d:"Immersion in medieval court diplomacy and historical manuscript archives."}],
  a:"Begin Diplomatic Inquiry" },
{ nm:"Rihla of the Nomad Kings", t:"Ibn Battuta’s Rihla: Lost Heritage of the Golden Horde & Transoxiana", s:"The Ultra-Luxury Royal Islamic Silk Trail",
  p:"Gulf Region → Golden Horde Steppes → Samarkand → Bukhara → Transoxiana",
  m:"Islamic geometric star lattice in champagne wireframe",
  h:"Tailored specifically for elite travelers seeking lost Islamic heritage. Traverse the vast realms of the Golden Horde and Transoxiana through the eyes of history’s greatest Arab traveler.",
  v:[{t:"Royal Halal Hospitality",d:"Ultra-luxury halal hospitality, including private royal estate stays."},{t:"After-Hours Madrasas",d:"Private after-hours entry to active Islamic madrasas and architectural restoration sites."},{t:"Golden Horde Banquets",d:"Curated culinary banquets recreating imperial Golden Horde court dining."}],
  a:"Request Royal Itinerary" },
{ nm:"Steppe Warriors", t:"Iron Nomad: MMA & Steppe Combat Academy", s:"Raw Power, Dust & Wild Horse Taming",
  p:"Almaty Mountain Foothills → Kazakh Steppe Academies",
  m:"Geometric wolf head fused with crossed nomad spears",
  h:"Test your physical limits in an elite warrior boot camp. Combine hard-hitting MMA fight conditioning alongside world champions with raw steppe combat arts and wild horse riding.",
  v:[{t:"Champion Sparring",d:"Sparring and tactical conditioning sessions with world-class Kazakh MMA fighters."},{t:"Wild Horse Taming",d:"Bareback wild horse taming modules under master steppe equestrians."},{t:"Steppe Survival Training",d:"Tactical steppe survival training, archery, and raw endurance conditioning."}],
  a:"Apply for Combat Academy" },
{ nm:"Lord of the Skies", t:"Rulers of the Wind: Apex Falconry & Equestrian Mastery", s:"The Wild Nomad Hunter Experience",
  p:"Almaty Highlands → Altai Mountains → Kazakh Wilderness",
  m:"Golden eagle spreading its wings in clean vector geometry",
  h:"Master the ancient lifestyle of elite steppe hunters. Train in the high-speed art of golden eagle falconry paired with bareback wild horse riding and mounted archery.",
  v:[{t:"Eagle Master Expeditions",d:"One-on-one hunting expeditions with third-generation hereditary Berkutchi eagle masters."},{t:"Altai Equestrian Mastery",d:"High-speed equestrian handling and wild horse taming in the Altai wilderness."},{t:"Mounted Archery Certification",d:"Field training and certification in horseback mounted archery techniques."}],
  a:"Request Hunter Consultation" },
];
const SLUGS = ["tombofgenghiskhan", "thegoldenwarrior", "thusspokezarathustra", "thegreatexodus", "williamofrubruck", "ibnbattutasrihla", "ironnomad", "rulersofthewind"];
ROUTES.forEach((r, i) => { r.i = i + 1; r.slug = SLUGS[i]; r.url = "/" + SLUGS[i] + "/"; });
window.ROUTE_SLUGS = SLUGS;

/* Sacred SVG symbols (see sacred-svg.css / sacred-svg.js). Rendered by tour.js on the route page.
   bg = background layer behind the text · emblem = centred symbol that draws itself when it scrolls into view. */

/* Index: original catalogue layout (route list + hover preview), now with all 8 routes.
   Built before script.js runs, so its setupCatalogue() wires hover/focus/tap and scroll reveals. */
(() => {
  const list = document.getElementById("rList"), prev = document.getElementById("rPrev");
  if (!list || !prev) return;
  list.innerHTML = ROUTES.map((r, k) => `
    <li><button type="button" class="route${k ? "" : " is-active"}" data-route="${k}" data-href="${r.url}"><span class="route__art" data-cslot="${r.i}" aria-hidden="true"></span><span class="route__num">ROUTE 0${r.i}</span><span class="route__body"><span class="route__title">${r.t}</span><span class="route__sub">“${r.s || r.nm}”</span></span><span class="route__arrow" aria-hidden="true"><svg viewBox="0 0 16 16" focusable="false"><path d="M2.5 8h10.5M9 4l4 4-4 4"/></svg></span></button></li>`).join("");
  prev.innerHTML = ROUTES.map((r, k) => `
    <article class="preview__slide${k ? "" : " is-active"}"${k ? ' aria-hidden="true"' : ""} data-href="${r.url}">
      <div class="preview__art" data-slot="${r.i}" aria-hidden="true"></div>
      <span class="preview__tag">Tour preview</span><div class="preview__text"><span class="preview__label">ROUTE 0${r.i}</span><h3>${r.t}</h3><p>${r.h}</p><a class="open-btn" href="${r.url}"><span>Choose this route</span></a></div>
    </article>`).join("");
  // the whole active preview card is a link
  prev.addEventListener("click", (e) => { const sl = e.target.closest(".preview__slide.is-active"); if (sl && !e.target.closest("a")) location.href = sl.dataset.href; });
  // desktop: click on a route opens its page; touch: first tap previews, the preview has its own link
  if (matchMedia("(hover: hover)").matches || matchMedia("(max-width: 900px)").matches)
    list.querySelectorAll(".route").forEach((b) => b.addEventListener("click", () => (location.href = b.dataset.href)));
})();

/* Map waypoints per route: [name, latitude, longitude, mode of the leg arriving here: "l" overland · "a" air · "s" sea].
   Approximate placements (verify): Otuken, Sauran, Ulytau, Beket-Ata, Kapchagay/Balkhash academies. */
[
  [["Ulaanbaatar",47.92,106.92],["Otuken",47.20,102.82,"a"],["Aktau",43.65,51.15,"a"],["Almaty",43.24,76.95,"a"],["Samarkand",39.65,66.96,"a"],["Bukhara",39.77,64.42],["Tashkent",41.30,69.24,"a"]],
  [["Saraychik",47.47,51.71],["Sauran",43.56,68.31],["Otrar",42.85,68.30],["Turkestan",43.30,68.25],["Sayram",42.30,69.77],["Almaty",43.24,76.95]],
  [["Ulytau",48.65,67.00],["Beket-Ata",44.52,55.00],["Turkestan",43.30,68.25],["Almaty",43.24,76.95]],
  [["Ust-Kamenogorsk",49.95,82.61],["Ölgii",48.97,89.96],["Lhasa",29.65,91.12],["Leh",34.16,77.58],["Kabul",34.53,69.17],["Islamabad",33.68,73.05],["Ankara",39.93,32.86]],
  [["Istanbul",41.01,28.97],["Sudak",44.85,34.97,"s"],["Sarai Batu",48.77,46.17],["Karakorum",47.20,102.84]],
  [["Dubai",25.20,55.27],["Astrakhan",46.35,48.04,"a"],["Khiva",41.38,60.36],["Bukhara",39.77,64.42],["Samarkand",39.65,66.96]],
  [["Almaty",43.24,76.95],["Kapchagay",43.87,77.07],["Balkhash",46.85,74.98]],
  [["Almaty",43.24,76.95],["Ust-Kamenogorsk",49.95,82.61],["Katon-Karagay",49.17,85.61]],
].forEach((w, i) => (ROUTES[i].w = w));
