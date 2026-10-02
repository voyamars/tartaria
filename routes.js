/* TARTARIA XP — shared data for index cards, route pages and the quiz.
   Fields: nm name · t headline · s subtitle · p route · m vector motif · h lead · c copy · nr narrative · v privileges · a CTA */
window.WA_PHONE = "447521398370";
window.ROUTES = [
{ nm:"The Imperial Horde Expedition", t:"In Search of the Tomb of Genghis Khan",
  p:"Ulaanbaatar → Otuken → Aktau → Almaty → Samarkand → Bukhara → Tashkent",
  m:"Imperial Mongolian Tamga fused with Silk Road star geometry",
  h:"Unravel the greatest historical mystery on Earth across four thousand kilometers of imperial steppe and silk-draped oases.",
  c:"Traces the expansion of the Mongol Empire from the sacred, restricted ancestral sanctuaries of Mongolia to the monumental turquoise domes of Central Asia. Designed strictly for travelers who seek access over itinerary.",
  nr:"You do not travel as a tourist; you move as an envoy. This expedition retraces the westward push of Genghis Khan’s golden lineages. You cross infinite horizons by private chartered aircraft, landing on remote desert airstrips where private luxury yurt camps await. By day, you navigate restricted archaeological zones with lead historians; by night, you dine under open steppe skies accompanied by bespoke musical improvisations performed on ancient instruments.",
  v:["Private Steppe Aviation: Direct charter transitions across Mongolia, Western Kazakhstan, and Uzbekistan, bypassing commercial hubs entirely.","The Otuken Sanctuary Access: Closed-door access to the sacred Otuken mountain region with senior field archaeologists.","Vault Access in Samarkand & Bukhara: After-hours private entry to restricted UNESCO manuscript vaults and active restoration labs inside the Registan.","Imperial Camp Comfort: High-end mobile luxury glamping set up exclusively for your arrival in secluded desert and mountain valleys."],
  a:"Request Private Dossier" },
{ nm:"Empires of the Steppe", t:"The Golden Warrior: Saka, Huns & Silk Road Citadels", s:"2,500 Years of Nomad Empires",
  p:"Saraychik → Sauran → Otrar → Turkestan → Sayram → Almaty",
  m:"Saka Golden Man royal crown and nomadic animal-style motifs",
  h:"Walk through two and a half millennia of nomadic statehood. Explore lost mudbrick fortresses and sacred citadels where Saka warrior kings, Attila’s Hunnic legions, and Turkic Khagans forged Eurasian civilization.",
  v:["Active archaeological dig participation at Saka kurgan excavation sites.","Private guided access through the siege ruins of ancient Otrar at sunset.","Nighttime subterranean access to medieval Sufi mausoleums in Turkestan."],
  a:"Inquire for Private Departure" },
{ nm:"The Sacred Mind", t:"Thus Spoke Zarathustra: Tengri, Sufism & Sound Healing", s:"Psychological & Spiritual Transformation",
  p:"Sacred Kazakh Steppe → Mangystau Underground Sanctuaries → Turkestan → Almaty",
  m:"Concentric Tengri sky orbits and Kobyz instrument silhouettes",
  h:"Realign your inner psyche through ancient Eurasian traditions. Experience deep sky-gazing under infinite Tengri horizons, Zarathustrian fire rituals, Sufi introspective meditation, and acoustic vibration therapy.",
  v:["Acoustic healing sessions utilizing ancient Kobyz and Dombra frequency resonances.","Private night stargazing and meditation inside Mangystau’s chalk underground sanctuaries.","Exclusive private session featuring bespoke acoustic arrangements by global music icon Dimash Kudaibergen."],
  a:"Reserve Spiritual Journey" },
{ nm:"The Great Kazakh Exodus", t:"The Great Exodus: The Long March to Freedom", s:"The Epic Transcontinental Migration Trail",
  p:"Kazakhstan → Mongolia → Tibet → India → Afghanistan → Pakistan → Turkey",
  m:"Alpine mountain pass with a single continuous migration line",
  h:"The ultimate test of human resilience. Retrace the legendary overland exile route of nomadic Kazakh tribes across high Himalayan passes and brutal deserts into Anatolian refuge.",
  v:["Guided trans-Himalayan highland pass crossings with high-altitude support teams.","Secluded encounters with mountain nomad enclaves holding oral histories of the trek.","Transcontinental historical storytelling delivered by direct descendants of the exodus."],
  a:"Request Expedition Details" },
{ nm:"The Friar’s Chronicle", t:"William of Rubruck: Secret Embassy to the Great Khan", s:"The 13th-Century Diplomatic Thriller",
  p:"Istanbul / Crimea → Kipchak Steppe → Great Khan Imperial Court",
  m:"Franciscan wax seal crossed with a Mongol diplomatic Paiza tablet",
  h:"Relive the perilous 13th-century journey of Franciscan monk William of Rubruck into the heart of the Mongol Empire. A high-stakes diplomatic expedition spanning wild frontiers and imperial court intrigue.",
  v:["Black Sea private maritime embarkation re-enacting medieval diplomatic departures.","Caravanserai night stays along forgotten Kipchak steppe trade corridors.","Immersion in medieval court diplomacy and historical manuscript archives."],
  a:"Begin Diplomatic Inquiry" },
{ nm:"Rihla of the Nomad Kings", t:"Ibn Battuta’s Rihla: Lost Heritage of the Golden Horde & Transoxiana", s:"The Ultra-Luxury Royal Islamic Silk Trail",
  p:"Gulf Region → Golden Horde Steppes → Samarkand → Bukhara → Transoxiana",
  m:"Islamic geometric star lattice in champagne wireframe",
  h:"Tailored specifically for elite travelers seeking lost Islamic heritage. Traverse the vast realms of the Golden Horde and Transoxiana through the eyes of history’s greatest Arab traveler.",
  v:["Ultra-luxury halal hospitality, including private royal estate stays.","Private after-hours entry to active Islamic madrasas and architectural restoration sites.","Curated culinary banquets recreating imperial Golden Horde court dining."],
  a:"Request Royal Itinerary" },
{ nm:"Steppe Warriors", t:"Iron Nomad: MMA & Steppe Combat Academy", s:"Raw Power, Dust & Wild Horse Taming",
  p:"Almaty Mountain Foothills → Kazakh Steppe Academies",
  m:"Geometric wolf head fused with crossed nomad spears",
  h:"Test your physical limits in an elite warrior boot camp. Combine hard-hitting MMA fight conditioning alongside world champions with raw steppe combat arts and wild horse riding.",
  v:["Sparring and tactical conditioning sessions with world-class Kazakh MMA fighters.","Bareback wild horse taming modules under master steppe equestrians.","Tactical steppe survival training, archery, and raw endurance conditioning."],
  a:"Apply for Combat Academy" },
{ nm:"Lord of the Skies", t:"Rulers of the Wind: Apex Falconry & Equestrian Mastery", s:"The Wild Nomad Hunter Experience",
  p:"Almaty Highlands → Altai Mountains → Kazakh Wilderness",
  m:"Golden eagle spreading its wings in clean vector geometry",
  h:"Master the ancient lifestyle of elite steppe hunters. Train in the high-speed art of golden eagle falconry paired with bareback wild horse riding and mounted archery.",
  v:["One-on-one hunting expeditions with third-generation hereditary Berkutchi eagle masters.","High-speed equestrian handling and wild horse taming in the Altai wilderness.","Field training and certification in horseback mounted archery techniques."],
  a:"Request Hunter Consultation" },
];
ROUTES.forEach((r, i) => (r.i = i + 1));

/* Index: original catalogue layout (route list + hover preview), now with all 8 routes.
   Built before script.js runs, so its setupCatalogue() wires hover/focus/tap and scroll reveals. */
(() => {
  const list = document.getElementById("rList"), prev = document.getElementById("rPrev");
  if (!list || !prev) return;
  list.innerHTML = ROUTES.map((r, k) => `
    <li><button type="button" class="route${k ? "" : " is-active"}" data-route="${k}" data-href="route.html?r=${r.i}"><span class="route__num">ROUTE 0${r.i}</span><span class="route__body"><span class="route__title">${r.t}</span><span class="route__sub">“${r.s || r.nm}”</span></span><span class="route__arrow" aria-hidden="true">→</span></button></li>`).join("");
  prev.innerHTML = ROUTES.map((r, k) => `
    <article class="preview__slide${k ? "" : " is-active"}"${k ? ' aria-hidden="true"' : ""}>
      <svg class="preview__geo" style="--r:${Math.round(k * 22.5)}deg" aria-hidden="true"><use href="#geo" /></svg>
      <img src="assets/route-${r.i}.jpg" alt="" loading="lazy" onerror="this.remove()" />
      <div class="preview__text"><span class="preview__label">ROUTE 0${r.i}</span><h3>${r.t}</h3><p>${r.h}</p><a class="text-link" href="route.html?r=${r.i}">Open expedition <span aria-hidden="true">→</span></a></div>
    </article>`).join("");
  // desktop: click on a route opens its page; touch: first tap previews, the preview has its own link
  if (matchMedia("(hover: hover)").matches || matchMedia("(max-width: 900px)").matches)
    list.querySelectorAll(".route").forEach((b) => b.addEventListener("click", () => (location.href = b.dataset.href)));
})();
