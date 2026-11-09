/* ============================================================
   AMIER — Portfolio v3 · Interaction & Choreography Engine v2
   Everything on the page is "written" and "built" as you scroll:
   letter-cascades, mask reveals, pixel-block assembly, hairlines.
   Vanilla ES6+. No dependencies. Reduced-motion aware.
   ============================================================ */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* gate all initial-hidden states behind this class so
     users without JS always see the full page */
  document.documentElement.classList.add("anim-ready");

  /* ---------------------------------------------------------
     1. Letter splitting — turns heading text into cascading
        chars while preserving inner markup (accent dots etc.)
  --------------------------------------------------------- */
  function splitNode(node, delayBase, ref) {
    if (node.nodeType === 3) {
      var frag = document.createDocumentFragment();
      var text = node.textContent;
      for (var i = 0; i < text.length; i++) {
        var ch = text[i];
        var span = document.createElement("span");
        span.className = "char" + (ch === " " ? " sp" : "");
        if (ch === " ") span.innerHTML = "\u00A0";
        else span.textContent = ch;
        span.style.setProperty("--d", Math.round((ref.n * 42) + delayBase * 1000) + "ms");
        span.style.setProperty("--sd", ref.n % 2 === 0 ? "1" : "-1");
        ref.n++;
        frag.appendChild(span);
      }
      return frag;
    }
    if (node.nodeType === 1) {
      var el = node;
      var fragEl = el.cloneNode(false);
      for (var j = 0; j < el.childNodes.length; j++) {
        fragEl.appendChild(splitNode(el.childNodes[j], delayBase, ref));
      }
      return fragEl;
    }
    return document.createDocumentFragment();
  }

  function pickNoRepeat(arr, key) {
    var last = null;
    try { last = sessionStorage.getItem("amier-" + key); } catch (e) { /* private mode */ }
    var pool = arr.filter(function (v) { return v !== last; });
    var v = pool.length ? pool[Math.floor(Math.random() * pool.length)] : arr[0];
    try { sessionStorage.setItem("amier-" + key, v); } catch (e) { /* ignore */ }
    return v;
  }

  /* —— welcome scene: a fresh intro every refresh (never repeats)
        slash · ink · stamp · ember · blink —— */
  var INTROS = ["slash", "ink", "stamp", "ember", "blink"];
  if (!prefersReduced) {
    document.documentElement.classList.add("intro-" + pickNoRepeat(INTROS, "intro"));
    /* the curtain is scheduled, not permanent: release it after the first
       paint so intro-blink's keyed assemble transitions actually play.
       (rAF + timer belt-and-braces: rAF is throttled in background tabs) */
    var releaseIntro = function () { document.documentElement.classList.add("intro-played"); };
    requestAnimationFrame(function () { requestAnimationFrame(releaseIntro); });
    setTimeout(releaseIntro, 150);
  }

  /* —— small flavor that also rerolls every refresh —— */
  var kanjiGhost = document.querySelector(".kanji-ghost");
  if (kanjiGhost) kanjiGhost.textContent = pickNoRepeat(["刃", "継", "心", "誠", "夢"], "kanji");

  var sideJa = document.querySelector(".side-ja");
  if (sideJa) sideJa.textContent = pickNoRepeat([
    "アミエ · full-stack bladesmith",
    "アミエ · code is a blade",
    "ブレード · sharpen the pixels",
    "アミエ · forged in the browser"
  ], "sideja");

  var tagline = document.querySelector("[data-tagline]");
  if (tagline) tagline.textContent = pickNoRepeat([
    "slayer of slow builds",
    "kills jank on sight",
    "forged pixel by pixel",
    "ships gold, never rust",
    "three.js approved"
  ], "tag");

  function splitChars(el, delayBase) {
    if (el.dataset.split) return;
    el.dataset.split = "1";
    var ref = { n: 0 };
    var frag = splitNode(el.cloneNode(true), delayBase, ref);
    el.textContent = "";
    while (frag.firstChild) el.appendChild(frag.firstChild);
  }

  /* ---- wbrick: wrap each word in a .w span with a stepped delay
         so paragraphs stack in like bricks on scroll.
         Walks text nodes recursively so <strong> etc. survive. ---- */
  function splitWords(el) {
    if (el.dataset.wsplit) return;
    el.dataset.wsplit = "1";
    var idx = 0;
    function walk(node) {
      var frag = document.createDocumentFragment();
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) { /* text node */
          child.textContent.split(/(\s+)/).forEach(function (tok) {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(" ")); return; }
            var s = document.createElement("span");
            s.className = "w";
            s.style.setProperty("--d", (idx++ * 85) + "ms");
            s.textContent = tok;
            frag.appendChild(s);
          });
        } else if (child.nodeType === 1) { /* inline element */
          var clone = child.cloneNode(false);
          clone.appendChild(walk(child));
          frag.appendChild(clone);
        }
      });
      return frag;
    }
    var frag = walk(el);
    el.textContent = "";
    el.appendChild(frag);
  }

  /* ---------------------------------------------------------
     2. Pixel sprites — every rect assembles block-by-block
  --------------------------------------------------------- */
  function prepBuild(el) {
    if (el.dataset.build) return;
    el.dataset.build = "1";
    var rects = el.querySelectorAll("rect");
    for (var i = 0; i < rects.length; i++) {
      rects[i].style.transitionDelay = Math.round(60 + i * 48) + "ms";
    }
  }

  /* ---------------------------------------------------------
     3. The reveal engine — one observer drives every variant
  --------------------------------------------------------- */
  /* transient colored swipe bars appear under every section head */
  document.querySelectorAll(".head-row").forEach(function (hr) {
    if (!hr.querySelector(".head-swipe")) {
      var s = document.createElement("span");
      s.className = "head-swipe";
      s.setAttribute("aria-hidden", "true");
      s.innerHTML = "<i></i><i></i><i></i>";
      hr.appendChild(s);
    }
  });

  var animEls = Array.prototype.slice.call(document.querySelectorAll("[data-anim], .reveal"));

  function prepare(el) {
    var type = el.getAttribute("data-anim") || "up";
    if (type === "chars") {
      splitChars(el, 0);
      el.classList.add("anim-chars");
    } else if (type === "wbrick") {
      splitWords(el);
      el.classList.add("anim-wbrick");
    } else if (type === "build") {
      prepBuild(el);
    } else if (type === "card") {
      el.classList.add("anim-card");
    }
    var delay = el.getAttribute("data-delay");
    if (delay) el.style.setProperty("--reveal-delay", delay + "s");
  }

  animEls.forEach(function (el) {
    prepare(el);
    if (prefersReduced) {
      el.classList.add("in");
      el.closest(".head-row") && el.closest(".head-row").classList.add("in");
      return;
    }
  });

  if (!prefersReduced && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        /* stagger sibling reveals inside the same parent grid */
        var parent = el.parentElement;
        var siblings = parent
          ? Array.prototype.slice.call(parent.children).filter(function (c) {
              return c.classList && (c.classList.contains("reveal") || c.hasAttribute("data-anim"));
            })
          : [];
        var i = siblings.indexOf(el);
        if (i > 0 && !el.style.getPropertyValue("--reveal-delay")) {
          el.style.setProperty("--reveal-delay", Math.min(i * 90, 500) + "ms");
        }
        el.classList.add("in");
        var head = el.closest(".head-row");
        if (head) head.classList.add("in");
        io.unobserve(el);
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -7% 0px" });
    animEls.forEach(function (el) { io.observe(el); });
  } else {
    animEls.forEach(function (el) {
      el.classList.add("in");
      var head = el.closest && el.closest(".head-row");
      if (head) head.classList.add("in");
    });
  }

  /* safety net: whatever is above the fold gets revealed no matter what
     (odd embedding roots, fonts shifting layout, observer edge cases) */
  setTimeout(function () {
    var vh = window.innerHeight || document.documentElement.clientHeight || 800;
    animEls.forEach(function (el) {
      if (el.classList.contains("in")) return;
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.96 && r.bottom > 0) {
        el.classList.add("in");
        var hr = el.closest && el.closest(".head-row");
        if (hr) hr.classList.add("in");
      }
    });
  }, 1600);

  /* ---------------------------------------------------------
     4. Active section nav highlighting
  --------------------------------------------------------- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll("[data-nav]"));
  var sections = navLinks
    .map(function (a) { return document.getElementById(a.getAttribute("data-nav")); })
    .filter(Boolean);

  function setActive(id) {
    navLinks.forEach(function (a) {
      var active = a.getAttribute("data-nav") === id;
      a.classList.toggle("is-active", active);
      if (active) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
  }
  setActive("");

  if ("IntersectionObserver" in window && sections.length) {
    var navIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) setActive(entry.target.id);
      });
    }, { rootMargin: "-40% 0px -55% 0px", threshold: 0 });
    sections.forEach(function (s) { navIO.observe(s); });
  }

  /* smooth anchor scroll with sticky-header offset */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function (e) {
      var id = link.getAttribute("href");
      if (id === "#" || id.length < 2) return;
      var target = document.getElementById(id.slice(1));
      if (!target) return;
      e.preventDefault();
      var topOffset = id === "#top" ? 0 : 58;
      var y = target.getBoundingClientRect().top + window.scrollY - topOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: prefersReduced ? "auto" : "smooth" });
      try { history.replaceState(null, "", id); } catch (err) { /* file:// contexts may refuse */ }
    });
  });

  /* ---------------------------------------------------------
     5. Hero stat counters
  --------------------------------------------------------- */
  var counters = Array.prototype.slice.call(document.querySelectorAll("[data-count]"));
  function animateCount(el) {
    var target = parseInt(el.getAttribute("data-count"), 10) || 0;
    var suffix = el.getAttribute("data-suffix") || "";
    if (prefersReduced) { el.textContent = target + suffix; return; }
    var started = null, dur = 1500;
    function step(ts) {
      if (!started) started = ts;
      var p = Math.min((ts - started) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if ("IntersectionObserver" in window && !prefersReduced) {
    var cIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { animateCount(entry.target); cIO.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cIO.observe(el); });
  } else {
    counters.forEach(animateCount);
  }

  /* ---------------------------------------------------------
     6. Scroll choreography
        a) hero exit — every hero layer flies up at its own
           depth (name, echo, role, icons, cta, stats, sprites,
           item-bars) with motion blur on the name, exactly
           like the reference video
        b) ghost name stays still (absorbed into hero exit)
  --------------------------------------------------------- */
  var hero = document.querySelector(".hero");
  if (hero && !prefersReduced) {
    var hTick = 0;
    var setSy = function () {
      hTick = 0;
      var y = window.scrollY;
      var cap = Math.round(window.innerHeight * 1.15);
      hero.style.setProperty("--sy", Math.min(y, cap).toFixed(1));
    };
    window.addEventListener("scroll", function () {
      if (!hTick) hTick = requestAnimationFrame(setSy);
    }, { passive: true });
    setSy();
  }

  /* ---------------------------------------------------------
     7. Copy-to-clipboard buttons (email, contact rows)
  --------------------------------------------------------- */
  var toast, toastTimer;
  function ensureToast() {
    if (toast) return toast;
    toast = document.createElement("div");
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    toast.style.cssText =
      "position:fixed;left:50%;bottom:26px;transform:translateX(-50%) translateY(20px);" +
      "background:#111;color:#f1f1ee;font:500 12px/1 'IBM Plex Mono',monospace;" +
      "letter-spacing:.08em;padding:12px 18px;border-radius:30px;opacity:0;" +
      "transition:opacity .3s cubic-bezier(.16,1,.3,1),transform .3s cubic-bezier(.16,1,.3,1);z-index:300;pointer-events:none";
    document.body.appendChild(toast);
    return toast;
  }
  function showToast(msg) {
    var t = ensureToast();
    t.textContent = msg;
    requestAnimationFrame(function () {
      t.style.opacity = "1";
      t.style.transform = "translateX(-50%) translateY(0)";
    });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.style.opacity = "0";
      t.style.transform = "translateX(-50%) translateY(20px)";
    }, 1800);
  }
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      var value = btn.getAttribute("data-copy");
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(
          function () { showToast("copied to clipboard ✓"); },
          function () { showToast("couldn't copy — " + value); }
        );
      } else {
        showToast(value);
      }
      e.preventDefault();
      e.stopPropagation();
    });
  });

  /* ---------------------------------------------------------
     8. Footer year ·  card tilt on desktop
  --------------------------------------------------------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  if (finePointer && !prefersReduced) {
    document.querySelectorAll(".proj").forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform =
          "perspective(900px) translateY(-6px) rotateX(" + (-y * 1.6).toFixed(2) + "deg) rotateY(" + (x * 1.6).toFixed(2) + "deg)";
      });
      card.addEventListener("mouseleave", function () {
        card.style.transform = "";
      });
    });
  }
})();
