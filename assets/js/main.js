(function () {
  "use strict";

  var cfg = window.SITE_CONFIG || {};
  var profile = cfg.profile || {};
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (id) { return document.getElementById(id); };

  /* ------------------------------ Ikony ------------------------------ */
  var ICONS = {
    instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1.1" class="fill"/>',
    tiktok: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.8 2.4 4.6 5 5"/>',
    youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.3v5.4l4.6-2.7z" class="fill"/>',
    facebook: '<path d="M14.5 21v-7.5H17l.5-3.5h-3V8a1.5 1.5 0 0 1 1.5-1.5h1.6V3.3A16 16 0 0 0 15 3c-2.6 0-4 1.6-4 4.2V10H8.5v3.5H11V21"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    chat: '<path d="M4.5 19.5 6 15.6A8 8 0 1 1 9 18.6z"/><path d="M9 10.5h6M9 13.5h4"/>',
    dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
    clipboard: '<rect x="5" y="4.5" width="14" height="16.5" rx="2.5"/><path d="M9 4.5V3h6v1.5"/><path d="m8.5 11 1.5 1.5 3-3M8.5 16.5h7"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    apple: '<path d="M12 7.5c-1.5-1-5-1.2-6.2 2.2C4.6 13.1 7 20.5 9.5 20.5c1 0 1.5-.6 2.5-.6s1.5.6 2.5.6c2.5 0 4.9-7.4 3.7-10.8C17 6.3 13.5 6.5 12 7.5z"/><path d="M12 7.5c0-2 1-3.5 3-4.5"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20.5h7M10 17h4"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  };

  function icon(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || ICONS.link) + "</svg>";
  }

  function make(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function setText(id, value) {
    var node = $(id);
    if (node && value != null) node.textContent = value;
  }

  function isExternal(url) {
    return /^https?:\/\//i.test(url) && url.indexOf(location.host) === -1;
  }

  function linkAttrs(a, item) {
    a.href = item.url;
    a.dataset.title = item.title || item.label || "";
    if (item.newTab) { a.target = "_blank"; }
    if (isExternal(item.url)) a.rel = "noopener";
  }

  /* ------------------------------ Render ----------------------------- */
  function renderProfile() {
    var fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
    setText("firstName", profile.firstName);
    setText("lastName", profile.lastName);
    setText("role", profile.role);
    setText("bio", profile.bio);
    setText("motto", cfg.motto);
    setText("footerName", fullName);
    setText("footerText", cfg.footer);
    setText("year", new Date().getFullYear());

    var status = profile.status || {};
    if (status.show === false) $("status").hidden = true;
    else setText("statusText", status.text);

    var box = $("avatar");
    var mono = box.querySelector(".avatar__mono");
    mono.textContent = ((profile.firstName || "")[0] || "") + ((profile.lastName || "")[0] || "");
    if (profile.avatar) {
      var img = new Image();
      img.alt = fullName;
      img.decoding = "async";
      img.onload = function () { box.classList.add("has-photo"); };
      img.src = profile.avatar;
      box.appendChild(img);
    }
  }

  function renderStats() {
    var list = $("stats");
    (cfg.stats || []).forEach(function (s) {
      var li = make("li", "stat");
      li.appendChild(make("span", "stat__value", s.value));
      li.appendChild(make("span", "stat__label", s.label));
      list.appendChild(li);
    });
    if (!list.children.length) list.hidden = true;
  }

  function renderSocials() {
    var list = $("socials");
    (cfg.socials || []).forEach(function (s) {
      if (!s.url) return;
      var li = make("li");
      var a = make("a", "social");
      linkAttrs(a, s);
      a.setAttribute("aria-label", s.label || s.icon);
      a.title = s.label || "";
      a.innerHTML = icon(s.icon);
      li.appendChild(a);
      list.appendChild(li);
    });
    if (!list.children.length) list.hidden = true;
  }

  function renderLinks() {
    var nav = $("links");
    var i = 0;
    (cfg.links || []).forEach(function (item) {
      if (item.type === "heading") {
        var h = make("h2", "links__heading reveal", item.text);
        h.style.setProperty("--i", i++);
        nav.appendChild(h);
        return;
      }
      if (!item.url) return;

      var a = make("a", "card reveal" + (item.featured ? " card--featured" : ""));
      linkAttrs(a, item);
      a.style.setProperty("--i", i++);

      var ic = make("span", "card__icon");
      ic.innerHTML = icon(item.icon);
      var body = make("span", "card__body");
      if (item.badge) body.appendChild(make("span", "card__badge", item.badge));
      body.appendChild(make("span", "card__title", item.title));
      if (item.subtitle) body.appendChild(make("span", "card__sub", item.subtitle));
      var arrow = make("span", "card__arrow");
      arrow.innerHTML = icon("arrow");

      a.appendChild(ic);
      a.appendChild(body);
      a.appendChild(arrow);
      nav.appendChild(a);
    });

    // usuń nagłówki, pod którymi nie został żaden link
    Array.prototype.slice.call(nav.querySelectorAll(".links__heading")).forEach(function (h) {
      var next = h.nextElementSibling;
      if (!next || next.classList.contains("links__heading")) h.remove();
    });
  }

  /* ------------------------------ Toast ------------------------------ */
  var toastTimer = 0;
  function toast(msg) {
    var t = $("toast");
    t.textContent = msg;
    t.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("is-visible"); }, 2400);
  }

  /* ------------------------- Ekran ładowania ------------------------- */
  function ready() {
    document.body.classList.remove("is-loading");
    document.body.classList.add("is-ready");
  }

  function runLoader() {
    var loader = $("loader");
    var lc = cfg.loader || {};
    if (lc.enabled === false) { loader.remove(); ready(); return; }

    var seen = false;
    try { seen = sessionStorage.getItem("ds-seen") === "1"; sessionStorage.setItem("ds-seen", "1"); } catch (e) { /* tryb prywatny */ }

    var minDur = reduceMotion ? 500 : seen ? (lc.repeatVisitDuration || 1000) : (lc.minDuration || 2300);
    var lifter = window.Figures && window.Figures.createLifter($("lifter"));
    if (lifter) reduceMotion ? lifter.pose(0.55) : lifter.start();

    var bar = $("loaderBar");
    var label = $("loaderLabel");
    var labels = [[0, "Rozgrzewka"], [0.38, "Zakładamy talerze"], [0.72, "Ostatnie powtórzenie"]];
    var loaded = document.readyState === "complete";
    var start = performance.now();
    var done = false;

    window.addEventListener("load", function () { loaded = true; });

    function finish() {
      if (done) return;
      done = true;
      bar.style.width = "100%";
      label.textContent = "Lecimy!";
      loader.classList.add("is-done");
      setTimeout(ready, 120);
      setTimeout(function () {
        if (lifter) lifter.stop();
        loader.remove();
      }, 750);
    }

    function tick(now) {
      if (done) return;
      var p = Math.min((now - start) / minDur, loaded ? 1 : 0.92);
      bar.style.width = (p * 100).toFixed(1) + "%";
      for (var i = labels.length - 1; i >= 0; i--) {
        if (p >= labels[i][0]) { if (label.textContent !== labels[i][1]) label.textContent = labels[i][1]; break; }
      }
      if (p >= 1) setTimeout(finish, 180);
      else requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    loader.addEventListener("click", finish);
    // awaryjnie — gdyby „load” nie przyszedł (np. wolny zasób zewnętrzny)
    setTimeout(finish, Math.max(minDur + 4000, 6000));
  }

  /* -------------------------- Przekierowanie ------------------------- */
  var overlay = $("redirect");
  var curler = null;
  var redirectTimer = 0;

  function showRedirect(title, url) {
    var rc = cfg.redirect || {};
    var delay = reduceMotion ? 350 : (rc.delay || 1250);
    if (!curler && window.Figures) curler = window.Figures.createCurler($("curler"));

    $("redirectTitle").textContent = title || "link";
    var bar = $("redirectBar");
    bar.style.transition = "none";
    bar.style.width = "0%";
    void bar.offsetWidth;
    bar.style.transition = "width " + delay + "ms cubic-bezier(.4,0,.2,1)";
    bar.style.width = "100%";

    overlay.classList.add("is-active");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-redirecting");
    if (curler) reduceMotion ? curler.pose(0.48) : curler.start();
    $("redirectCancel").focus({ preventScroll: true });

    clearTimeout(redirectTimer);
    redirectTimer = setTimeout(function () { window.location.href = url; }, delay);
  }

  function hideRedirect() {
    clearTimeout(redirectTimer);
    overlay.classList.remove("is-active");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-redirecting");
    if (curler) curler.stop();
  }

  function onLinkClick(e) {
    var a = e.target.closest("a.card, a.social");
    if (!a) return;
    var url = a.getAttribute("href");

    if (!url || url === "#") {
      e.preventDefault();
      toast("Ten link już wkrótce 💪");
      return;
    }
    var rc = cfg.redirect || {};
    if (rc.enabled === false || a.target === "_blank") return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (/^(mailto|tel|sms):/i.test(url)) return;

    e.preventDefault();
    showRedirect(a.dataset.title, a.href);
  }

  /* ---------------------------- Udostępnij --------------------------- */
  function share() {
    var data = { title: document.title, url: location.href };
    if (navigator.share) {
      navigator.share(data).catch(function () {});
      return;
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(location.href).then(
        function () { toast("Link skopiowany do schowka"); },
        function () { toast(location.href); }
      );
    } else {
      toast(location.href);
    }
  }

  /* ------------------------------- Start ----------------------------- */
  renderProfile();
  renderStats();
  renderSocials();
  renderLinks();
  runLoader();

  document.addEventListener("click", onLinkClick);
  $("redirectCancel").addEventListener("click", hideRedirect);
  $("shareBtn").addEventListener("click", share);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay.classList.contains("is-active")) hideRedirect();
  });
  // powrót przyciskiem „wstecz” (bfcache) — schowaj nakładkę
  window.addEventListener("pageshow", function (e) { if (e.persisted) hideRedirect(); });
})();
