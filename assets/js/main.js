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
    a.dataset.title = item.redirectLabel || item.title || item.label || "";
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
    if (url.charAt(0) === "#") {
      e.preventDefault();
      if (!openSheet(url.slice(1)) && !scrollToHash(url)) toast("Ten link już wkrótce 💪");
      return;
    }
    var rc = cfg.redirect || {};
    if (rc.enabled === false || a.target === "_blank") return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (/^(mailto|tel|sms):/i.test(url)) return;

    e.preventDefault();
    showRedirect(a.dataset.title, a.href);
  }

  /* ----------------------------- Formularze -------------------------- */
  var w3f = cfg.web3forms || {};
  var forms = cfg.forms || {};
  var guard = cfg.antispam || {};
  var built = {};
  var uid = 0;
  var inlineKey = $("kontakt") ? $("kontakt").getAttribute("data-form") : "";

  var CHECK_SVG = '<svg class="contact__check" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="24"/><path d="m15 27 7.5 7.5L38 19"/></svg>';
  var LOCK_SVG = '<svg class="contact__lock" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>';

  function fieldName(f) { return f.key || f.label; }

  function fillTemplate(tpl, data) {
    return String(tpl || "")
      .replace(/\{([^}]+)\}/g, function (_, k) { return data[k] || ""; })
      .replace(/\s+—\s*$/, "");
  }

  /* ---- Ochrona przed spamem: jedno zgłoszenie na osobę (to urządzenie) ---- */
  var LOCK_KEY = "ds-form-sent";

  function readLock() {
    var raw = null;
    try { raw = localStorage.getItem(LOCK_KEY); } catch (e) { /* tryb prywatny */ }
    if (!raw) {
      var m = document.cookie.match(new RegExp("(?:^|; )" + LOCK_KEY + "=([^;]*)"));
      if (m) raw = decodeURIComponent(m[1]);
    }
    if (!raw) return null;
    try {
      var lock = JSON.parse(raw);
      var hours = guard.lockHours == null ? 24 : guard.lockHours;
      if (hours > 0 && Date.now() - lock.t > hours * 3600 * 1000) return null;
      return lock;
    } catch (e) { return null; }
  }

  function writeLock(formTitle) {
    var raw = JSON.stringify({ t: Date.now(), form: formTitle });
    try { localStorage.setItem(LOCK_KEY, raw); } catch (e) { /* tryb prywatny */ }
    var hours = guard.lockHours == null ? 24 : guard.lockHours;
    var maxAge = hours > 0 ? hours * 3600 : 3600 * 24 * 365 * 5;
    document.cookie = LOCK_KEY + "=" + encodeURIComponent(raw) + "; max-age=" + maxAge + "; path=/; SameSite=Lax";
  }

  function guardEnabled() { return guard.onePerPerson !== false; }

  /* ---- Budowanie pól ---- */
  function buildChoice(f) {
    var box = make("fieldset", "contact__topics");
    box.appendChild(make("legend", "contact__label", f.label));
    (f.options || []).forEach(function (opt, n) {
      var label = make("label", "chip");
      var input = make("input");
      input.type = f.type === "multi" ? "checkbox" : "radio";
      input.name = fieldName(f);
      input.value = opt;
      if (f.type !== "multi" && n === 0) input.checked = input.defaultChecked = true;
      label.appendChild(input);
      label.appendChild(make("span", null, opt));
      box.appendChild(label);
    });
    return box;
  }

  function buildInput(f) {
    var label = make("label", "field" + (f.half ? " field--half" : ""));
    var cap = make("span", "contact__label", f.label);
    if (!f.required) {
      cap.appendChild(document.createTextNode(" "));
      cap.appendChild(make("em", null, "(opcjonalnie)"));
    }
    var isText = f.type === "textarea";
    var input = make(isText ? "textarea" : "input", "field__input");
    if (isText) input.rows = f.rows || 4;
    else input.type = f.type || "text";
    input.name = fieldName(f);
    input.required = !!f.required;
    input.maxLength = isText ? 3000 : 120;
    if (f.type === "tel") input.inputMode = "tel";
    if (f.placeholder) input.placeholder = f.placeholder;
    if (f.autocomplete) input.autocomplete = f.autocomplete;
    label.appendChild(cap);
    label.appendChild(input);
    return label;
  }

  var PHONE_RE = /^\+?[0-9 ()-]{9,20}$/;
  var EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

  // własna walidacja telefonu i e-maila (ostrzejsza niż domyślna w przeglądarce)
  function checkContact(form) {
    Array.prototype.forEach.call(form.querySelectorAll(".field__input"), function (input) {
      var v = input.value.trim();
      var bad = false;
      if (v && input.type === "tel") bad = !PHONE_RE.test(v) || v.replace(/\D/g, "").length < 9;
      if (v && input.type === "email") bad = !EMAIL_RE.test(v);
      input.setCustomValidity(bad ? "invalid" : "");
    });
  }

  function errorFor(input) {
    if (!input.value.trim()) return "Uzupełnij zaznaczone pola.";
    if (input.type === "email") return "Sprawdź adres e-mail.";
    if (input.type === "tel") return "Sprawdź numer telefonu (min. 9 cyfr).";
    return "Uzupełnij zaznaczone pola.";
  }

  function actions(primaryText, secondaryText) {
    var row = make("div", "form-actions");
    var primary = make("button", "contact__submit");
    primary.type = "button";
    primary.appendChild(make("span", "contact__submit-text", primaryText));
    var spinner = make("span", "contact__spinner");
    spinner.setAttribute("aria-hidden", "true");
    primary.appendChild(spinner);
    var secondary = make("button", "form-back", secondaryText);
    secondary.type = "button";
    row.appendChild(primary);
    row.appendChild(secondary);
    return { row: row, primary: primary, secondary: secondary };
  }

  /* ---- Formularz: wypełnianie → sprawdzenie → wysłano / blokada ---- */
  function buildForm(key, def) {
    var wrap = make("div", "form-wrap");
    var titleId = "form-title-" + (++uid);
    var shownAt = Date.now();
    var pending = null;

    function header() {
      var head = make("div", "contact__head");
      var ic = make("span", "card__icon");
      ic.innerHTML = icon(def.icon || "chat");
      var headText = make("div");
      headText.appendChild(make("h3", "contact__title", def.title));
      if (def.subtitle) headText.appendChild(make("p", "contact__sub", def.subtitle));
      head.appendChild(ic);
      head.appendChild(headText);
      return head;
    }

    /* krok 1 — formularz */
    var form = make("form", "contact__form");
    form.noValidate = true;
    form.action = "https://api.web3forms.com/submit";
    form.method = "POST";
    var head = header();
    head.querySelector(".contact__title").id = titleId;
    form.appendChild(head);

    var trap = make("input", "contact__trap");
    trap.type = "text";
    trap.name = "website";
    trap.tabIndex = -1;
    trap.autocomplete = "off";
    trap.setAttribute("aria-hidden", "true");
    form.appendChild(trap);

    (def.fields || []).forEach(function (f) {
      form.appendChild(f.type === "choice" || f.type === "multi" ? buildChoice(f) : buildInput(f));
    });

    var error = make("p", "contact__error");
    error.setAttribute("role", "alert");
    error.hidden = true;
    form.appendChild(error);

    var submit = make("button", "contact__submit");
    submit.type = "submit";
    submit.appendChild(make("span", "contact__submit-text", "Dalej — sprawdź zgłoszenie"));
    form.appendChild(submit);

    /* krok 2 — sprawdzenie przed wysłaniem */
    var review = make("div", "form-review");
    review.hidden = true;
    review.tabIndex = -1;
    var reviewHead = make("div", "form-review__head");
    reviewHead.appendChild(make("p", "contact__label", "Krok 2 z 2 · Sprawdź zgłoszenie"));
    reviewHead.appendChild(make("h3", "contact__title", "Czy wszystko się zgadza?"));
    var picked = make("div", "form-review__form");
    picked.appendChild(make("span", "form-review__form-label", "Wybrany formularz"));
    var pickedRow = make("span", "form-review__form-row");
    var pickedIcon = make("span", "form-review__form-icon");
    pickedIcon.innerHTML = icon(def.icon || "chat");
    pickedRow.appendChild(pickedIcon);
    pickedRow.appendChild(make("strong", null, def.title));
    picked.appendChild(pickedRow);
    reviewHead.appendChild(picked);
    review.appendChild(reviewHead);
    var summary = make("dl", "form-review__list");
    review.appendChild(summary);
    var reviewError = make("p", "contact__error");
    reviewError.setAttribute("role", "alert");
    reviewError.hidden = true;
    review.appendChild(reviewError);
    var reviewActs = actions(def.button || "Tak, wysyłam", "Popraw dane");
    review.appendChild(reviewActs.row);
    var switchBtn = null;
    if (key !== inlineKey) {
      switchBtn = make("button", "form-link", "To nie ten formularz? Zmień wybór");
      switchBtn.type = "button";
      review.appendChild(switchBtn);
    }

    /* krok 3 — wysłano */
    var done = make("div", "contact__done");
    done.hidden = true;
    done.tabIndex = -1;
    done.innerHTML = CHECK_SVG;
    done.appendChild(make("p", "contact__title", def.successTitle || w3f.successTitle || "Wysłane!"));
    done.appendChild(make("p", "contact__sub", def.successText || w3f.successText || ""));

    /* blokada — ta osoba już wysłała zgłoszenie */
    var locked = make("div", "contact__done contact__done--locked");
    locked.hidden = true;
    locked.tabIndex = -1;
    locked.innerHTML = LOCK_SVG;
    locked.appendChild(make("p", "contact__title", "Zgłoszenie już do mnie dotarło"));
    var lockedText = make("p", "contact__sub");
    locked.appendChild(lockedText);

    wrap.appendChild(form);
    wrap.appendChild(review);
    wrap.appendChild(done);
    wrap.appendChild(locked);

    function show(step) {
      form.hidden = step !== form;
      review.hidden = step !== review;
      done.hidden = step !== done;
      locked.hidden = step !== locked;
    }

    function setError(box, msg) {
      box.textContent = msg || "";
      box.hidden = !msg;
    }

    function showLocked(lock) {
      var when = new Date(lock.t);
      var date = when.toLocaleDateString("pl-PL", { day: "numeric", month: "long" }) +
        ", " + when.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
      lockedText.textContent = "Twoje zgłoszenie „" + (lock.form || "formularz") + "” jest już wysłane (" + date + "). " +
        (guard.lockedText || "Jedna osoba może wysłać jedno zgłoszenie — odezwę się do Ciebie. Jeśli chcesz coś dodać, napisz na Instagramie.");
      show(locked);
    }

    function refresh() {
      var lock = guardEnabled() && readLock();
      if (lock) { showLocked(lock); return; }
      if (!done.hidden) return;
      if (locked.hidden === false) show(form);
      shownAt = Date.now();
    }

    function collect() {
      var fd = new FormData(form);
      var data = {};
      fd.forEach(function (v, k) {
        if (k === "website") return;
        v = String(v).trim();
        if (!v) return;
        data[k] = data[k] ? data[k] + ", " + v : v;
      });
      return data;
    }

    function renderSummary(data) {
      summary.textContent = "";
      (def.fields || []).forEach(function (f) {
        var v = data[fieldName(f)];
        if (!v) return;
        summary.appendChild(make("dt", null, f.label));
        summary.appendChild(make("dd", null, v));
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      setError(error, "");

      var lock = guardEnabled() && readLock();
      if (lock) { showLocked(lock); return; }

      checkContact(form);
      var invalid = form.querySelector(".field__input:invalid");
      form.classList.add("was-validated");
      if (invalid) {
        invalid.focus();
        setError(error, errorFor(invalid));
        return;
      }
      pending = collect();
      renderSummary(pending);
      setError(reviewError, "");
      show(review);
      review.focus({ preventScroll: true });
      review.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
    });

    reviewActs.secondary.addEventListener("click", function () {
      show(form);
      var first = form.querySelector(".field__input");
      if (first) first.focus();
    });

    if (switchBtn) {
      switchBtn.addEventListener("click", function () {
        carry = pending;
        showPicker(key);
      });
    }

    reviewActs.primary.addEventListener("click", function () {
      var btn = reviewActs.primary;
      if (btn.classList.contains("is-sending") || !pending) return;
      setError(reviewError, "");

      var lock = guardEnabled() && readLock();
      if (lock) { showLocked(lock); return; }

      // bot: wypełnione ukryte pole albo formularz wysłany nienaturalnie szybko
      var minMs = (guard.minSeconds == null ? 4 : guard.minSeconds) * 1000;
      if (trap.value || Date.now() - shownAt < minMs) {
        show(done);
        return;
      }
      if (!w3f.accessKey) {
        setError(reviewError, "Formularz będzie aktywny już wkrótce — napisz na Instagramie 💪");
        return;
      }

      var data = { Formularz: def.title };
      Object.keys(pending).forEach(function (k) { data[k] = pending[k]; });
      data.access_key = w3f.accessKey;
      data.subject = fillTemplate(def.subject || "Nowa wiadomość ze strony — {name}", data);
      data.from_name = w3f.fromName || document.title;
      if (data.email) data.replyto = data.email;

      btn.classList.add("is-sending");
      btn.disabled = true;

      fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data),
      })
        .then(function (r) { return r.json().catch(function () { return {}; }); })
        .then(function (res) {
          if (!res.success) throw new Error(res.message || "error");
          if (guardEnabled()) writeLock(def.title);
          form.reset();
          form.classList.remove("was-validated");
          pending = null;
          show(done);
          done.focus({ preventScroll: true });
          refreshAll();
        })
        .catch(function () {
          setError(reviewError, "Nie udało się wysłać. Spróbuj ponownie za chwilę albo napisz na Instagramie.");
        })
        .then(function () {
          btn.classList.remove("is-sending");
          btn.disabled = false;
        });
    });

    function prefill(data) {
      if (!data) return;
      ["name", "email", "Telefon"].forEach(function (k) {
        var input = form.querySelector('[name="' + k + '"]');
        if (input && data[k] && !input.value) input.value = data[k];
      });
    }

    function backToForm() {
      if (!review.hidden) show(form);
    }

    refresh();
    return { root: wrap, titleId: titleId, refresh: refresh, prefill: prefill, backToForm: backToForm };
  }

  function getForm(key) {
    if (!built[key] && forms[key]) built[key] = buildForm(key, forms[key]);
    return built[key];
  }

  function refreshAll() {
    Object.keys(built).forEach(function (k) { built[k].refresh(); });
  }

  /* Formularz w treści strony (sekcja „Formularz”) */
  function renderInlineForm() {
    var section = $("kontakt");
    if (!section) return;
    var def = forms[inlineKey];
    if (!def || def.show === false) { section.remove(); return; }
    setText("contactHeading", def.heading);
    $("contactMount").appendChild(getForm(inlineKey).root);
  }

  /* Formularze w wysuwanym panelu (karty usług):
     krok 1 — potwierdzenie wyboru formularza, krok 2 — formularz i sprawdzenie */
  var sheet = $("sheet");
  var sheetReturn = null;
  var carry = null;

  function isSheetForm(key) {
    return !!(key && key !== inlineKey && forms[key] && forms[key].show !== false);
  }

  function sheetKeys() {
    return Object.keys(forms).filter(isSheetForm);
  }

  function mountInSheet(node, labelId) {
    var body = $("sheetBody");
    body.textContent = "";
    body.appendChild(node);
    var panel = sheet.querySelector(".sheet__panel");
    panel.setAttribute("aria-labelledby", labelId);
    panel.scrollTop = 0;
    setTimeout(function () { panel.focus({ preventScroll: true }); }, 60);
  }

  function showPicker(key) {
    var def = forms[key];
    var lock = guardEnabled() && readLock();
    var box = make("div", "picker");
    var titleId = "picker-title-" + (++uid);

    box.appendChild(make("p", "contact__label", "Krok 1 z 2 · Potwierdź wybór"));
    var h = make("h3", "contact__title picker__q", "Czy to formularz, którego szukasz?");
    h.id = titleId;
    box.appendChild(h);

    var chosen = make("div", "picker__chosen");
    var ic = make("span", "card__icon");
    ic.innerHTML = icon(def.icon || "chat");
    var txt = make("div");
    txt.appendChild(make("p", "picker__title", def.title));
    if (def.subtitle) txt.appendChild(make("p", "contact__sub", def.subtitle));
    chosen.appendChild(ic);
    chosen.appendChild(txt);
    box.appendChild(chosen);

    var acts = actions("Tak, przejdź do formularza", "Anuluj");
    acts.primary.querySelector(".contact__spinner").remove();
    box.appendChild(acts.row);
    acts.primary.addEventListener("click", function () { showSheetForm(key); });
    acts.secondary.addEventListener("click", closeSheet);

    var others = sheetKeys().filter(function (k) { return k !== key; });
    if (others.length) {
      box.appendChild(make("p", "contact__label picker__or", "Albo wybierz inny formularz"));
      var list = make("div", "picker__list");
      others.forEach(function (k) {
        var o = forms[k];
        var btn = make("button", "picker__option");
        btn.type = "button";
        var oi = make("span", "picker__option-icon");
        oi.innerHTML = icon(o.icon || "chat");
        btn.appendChild(oi);
        btn.appendChild(make("span", null, o.title));
        var arrow = make("span", "picker__option-arrow");
        arrow.innerHTML = icon("arrow");
        btn.appendChild(arrow);
        btn.addEventListener("click", function () {
          try { history.replaceState(null, "", "#" + k); } catch (e) { /* file:// */ }
          showPicker(k);
        });
        list.appendChild(btn);
      });
      box.appendChild(list);
    }

    if (lock) {
      var note = make("p", "picker__note", "Masz już wysłane zgłoszenie — kolejne nie zostanie przyjęte.");
      box.insertBefore(note, chosen);
    }

    mountInSheet(box, titleId);
  }

  function showSheetForm(key) {
    var f = getForm(key);
    f.refresh();
    f.backToForm();
    f.prefill(carry);
    carry = null;
    mountInSheet(f.root, f.titleId);
  }

  function openSheet(key) {
    if (!isSheetForm(key)) return false;
    if (!sheet.classList.contains("is-active")) sheetReturn = document.activeElement;
    showPicker(key);
    sheet.classList.add("is-active");
    sheet.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-sheet");
    try { history.replaceState(null, "", "#" + key); } catch (e) { /* file:// */ }
    return true;
  }

  function closeSheet() {
    if (!sheet.classList.contains("is-active")) return;
    sheet.classList.remove("is-active");
    sheet.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-sheet");
    carry = null;
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* file:// */ }
    if (sheetReturn && sheetReturn.focus) sheetReturn.focus({ preventScroll: true });
  }

  function scrollToHash(hash) {
    var target = document.getElementById(hash.slice(1));
    if (!target) return false;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    return true;
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
  renderInlineForm();
  runLoader();
  if (location.hash) openSheet(location.hash.slice(1));
  window.addEventListener("hashchange", function () { openSheet(location.hash.slice(1)); });
  Array.prototype.forEach.call(sheet.querySelectorAll("[data-close]"), function (el) {
    el.addEventListener("click", closeSheet);
  });

  document.addEventListener("click", onLinkClick);
  $("redirectCancel").addEventListener("click", hideRedirect);
  $("shareBtn").addEventListener("click", share);
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (overlay.classList.contains("is-active")) hideRedirect();
    else closeSheet();
  });
  // powrót przyciskiem „wstecz” (bfcache) — schowaj nakładkę
  window.addEventListener("pageshow", function (e) { if (e.persisted) hideRedirect(); });
})();
