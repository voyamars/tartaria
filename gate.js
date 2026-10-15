/* ==========================================================================
   TARTARIA XP — gate.js  (site-wide access gate)
   Loads FIRST (blocking, in <head>) on every page. Until the visitor enters the site password the page body stays
   hidden, the animation entry points wait for the "txp:unlock" event, and nothing is revealed by deep-linking:
   every page includes this script.

   The password is never stored: only a salted PBKDF2-SHA256 verifier (200 000 rounds) lives here, and the check
   is done with the Web Crypto API. The unlocked state is kept per browser tab (sessionStorage), so a reload keeps
   the visitor inside while closing the tab locks the site again.

   NOTE (static hosting): this protects the experience, not the files. Anyone who requests the raw HTML/CSS/JS
   URLs can read them. Confidential material (the investment portfolio) is therefore NOT protected by this gate —
   it is AES-GCM encrypted at rest (see /tools/build-investment.py and /investment/).
   To change the password: python3 tools/set-site-password.py
   ========================================================================== */
(function () {
  "use strict";

  var V = { salt: "adItLQ8365sUK3snCs8Y0w==", iter: 200000, hash: "bwCp6Wq9/YFTOd2Vl9r+fng+utP1gY/MAayRWvKzY48=" };
  var STORE = "txp_gate_v1";
  var root = document.documentElement;
  var ready = false, waiters = [];

  var opened = false;
  try { opened = sessionStorage.getItem(STORE) === V.hash; } catch (e) { /* storage blocked: the gate simply asks every load */ }

  var api = window.TXP_GATE = { locked: !opened };
  /* run fn now when open, otherwise right after unlock (used by the animation entry points) */
  window.TXP_whenOpen = function (fn) { if (api.locked) waiters.push(fn); else fn(); };
  if (opened) return;

  root.classList.add("txp-locked");

  var css = [
    "html.txp-locked{background:#060608;overflow:hidden!important}",
    "html.txp-locked body{visibility:hidden!important}",
    ".txpg{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:22px;overflow:auto;color:#f4f1ed;",
    "background:radial-gradient(ellipse 70% 55% at 50% -5%,rgba(122,21,21,.28),transparent 66%),radial-gradient(ellipse 55% 50% at 15% 105%,rgba(212,175,55,.11),transparent 68%),#060608;",
    "font:400 16px/1.6 Montserrat,system-ui,sans-serif;-webkit-font-smoothing:antialiased;transition:opacity .9s cubic-bezier(.25,1,.5,1),visibility .9s}",
    ".txpg.is-out{opacity:0;visibility:hidden}",
    ".txpg__card{position:relative;width:min(440px,100%);padding:clamp(34px,7vw,56px) clamp(26px,6vw,48px);text-align:center;border:1px solid rgba(255,255,255,.1);",
    "background:linear-gradient(145deg,rgba(255,255,255,.05),rgba(255,255,255,.012));box-shadow:0 34px 90px rgba(0,0,0,.6);",
    "opacity:0;transform:translateY(22px);transition:opacity 1s cubic-bezier(.25,1,.5,1) .1s,transform 1s cubic-bezier(.25,1,.5,1) .1s}",
    ".txpg.is-in .txpg__card{opacity:1;transform:none}",
    ".txpg__card::before{content:'';position:absolute;top:0;left:50%;width:110px;height:2px;translate:-50% 0;background:linear-gradient(90deg,transparent,#d4af37,transparent)}",
    ".txpg__brand{font:500 .8rem Cinzel,serif;letter-spacing:.38em;color:#f5eee0;margin:0 0 6px;padding-left:.38em}",
    ".txpg__est{display:block;font:600 .62rem Montserrat,sans-serif;letter-spacing:.3em;color:#d4af37;margin-bottom:34px;padding-left:.3em}",
    ".txpg__lead{max-width:300px;margin:0 auto 26px;font-size:.9rem;color:rgba(244,241,237,.66)}",
    ".txpg__in{width:100%;height:58px;margin-bottom:14px;text-align:center;font:600 1.25rem Cinzel,serif;letter-spacing:.5em;padding:0 0 0 .5em;color:#f4f1ed;",
    "background:rgba(0,0,0,.32);border:1px solid rgba(255,255,255,.14);border-radius:0;outline:0;caret-color:#d4af37;-webkit-appearance:none;appearance:none;transition:border-color .35s,box-shadow .35s}",
    ".txpg__in:focus{border-color:rgba(212,175,55,.6);box-shadow:0 0 0 4px rgba(212,175,55,.06)}",
    ".txpg__btn{width:100%;height:54px;cursor:pointer;font:600 .7rem Montserrat,sans-serif;letter-spacing:.26em;text-transform:uppercase;color:#f4f1ed;",
    "border:1px solid rgba(212,175,55,.55);background:linear-gradient(135deg,rgba(122,21,21,.9),rgba(59,8,8,.95));transition:transform .45s cubic-bezier(.25,1,.5,1),box-shadow .45s}",
    ".txpg__btn:hover,.txpg__btn:focus-visible{transform:translateY(-2px);box-shadow:0 14px 30px rgba(0,0,0,.45);outline:0}",
    ".txpg__btn[disabled],.txpg__in[disabled]{opacity:.55;cursor:default;transform:none}",
    ".txpg__msg{display:block;min-height:22px;margin-top:16px;font-size:.78rem;color:rgba(244,241,237,.5);transition:color .3s}",
    ".txpg__card.is-err .txpg__in{border-color:rgba(226,94,94,.75);animation:txpgShake .46s}.txpg__card.is-err .txpg__msg{color:#e58b8b}",
    ".txpg__card.is-ok .txpg__in{border-color:#d4af37}.txpg__card.is-ok .txpg__msg{color:#f3e5ab}",
    "@keyframes txpgShake{20%{transform:translateX(-8px)}40%{transform:translateX(7px)}60%{transform:translateX(-5px)}80%{transform:translateX(3px)}}",
    "@media(prefers-reduced-motion:reduce){.txpg,.txpg__card{transition-duration:.01ms!important;animation:none!important}}"
  ].join("");
  var st = document.createElement("style");
  st.id = "txp-gate-css";
  st.textContent = css;
  (document.head || root).appendChild(st);

  var b64 = function (s) { var r = atob(s), a = new Uint8Array(r.length); for (var i = 0; i < r.length; i++) a[i] = r.charCodeAt(i); return a; };
  var derive = function (pw) {
    var enc = new TextEncoder();
    return crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]).then(function (k) {
      return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: b64(V.salt), iterations: V.iter }, k, 256);
    }).then(function (bits) {
      var a = new Uint8Array(bits), s = ""; for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
      return btoa(s);
    });
  };

  var fails = 0, until = 0;
  var build = function () {
    var g = document.createElement("div");
    g.className = "txpg";
    g.setAttribute("role", "dialog");
    g.setAttribute("aria-modal", "true");
    g.setAttribute("aria-labelledby", "txpgT");
    g.innerHTML =
      '<form class="txpg__card" novalidate>' +
      '<p class="txpg__brand" id="txpgT">TARTARIA XP</p><span class="txpg__est">EST. 2021</span>' +
      '<p class="txpg__lead">Private access. Please enter the password to continue.</p>' +
      '<input class="txpg__in" type="password" inputmode="numeric" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="32" placeholder="••••" aria-label="Site password" />' +
      '<button class="txpg__btn" type="submit">Enter</button>' +
      '<small class="txpg__msg" aria-live="polite"></small></form>';
    root.appendChild(g);

    var card = g.firstChild, inp = card.querySelector("input"), btn = card.querySelector("button"), msg = card.querySelector("small");
    var say = function (t, cls) { card.classList.remove("is-err", "is-ok"); void card.offsetWidth; if (cls) card.classList.add(cls); msg.textContent = t; };

    if (!(window.crypto && crypto.subtle)) {
      inp.disabled = btn.disabled = true;
      say("A secure connection (https) is required to open this site.", "is-err");
    }
    requestAnimationFrame(function () { g.classList.add("is-in"); setTimeout(function () { try { inp.focus({ preventScroll: true }); } catch (e) {} }, 500); });
    inp.addEventListener("input", function () { if (card.classList.contains("is-err")) say("", ""); });

    card.addEventListener("submit", function (e) {
      e.preventDefault();
      var now = Date.now();
      if (now < until) { say("Too many attempts. Please wait " + Math.ceil((until - now) / 1000) + " s.", "is-err"); return; }
      if (!inp.value) return;
      inp.disabled = btn.disabled = true;
      derive(inp.value).then(function (h) {
        if (h === V.hash) {
          try { sessionStorage.setItem(STORE, V.hash); } catch (x) {}
          say("Welcome.", "is-ok");
          setTimeout(unlock, 380);
        } else {
          fails++;
          if (fails >= 5) { until = Date.now() + 30000; fails = 0; }
          inp.disabled = btn.disabled = false;
          inp.value = "";
          say("Password not recognised. Please try again.", "is-err");
          inp.focus();
        }
      }).catch(function () { inp.disabled = btn.disabled = false; say("Could not verify. Please try again.", "is-err"); });
    });

    var unlock = function () {
      root.classList.remove("txp-locked");
      api.locked = false;
      g.classList.add("is-out");
      setTimeout(function () { g.remove(); st.remove(); }, 1000);
      var q = waiters.splice(0); q.forEach(function (fn) { try { fn(); } catch (err) { console.error(err); } });
      document.dispatchEvent(new Event("txp:unlock"));
    };
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
