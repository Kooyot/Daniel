(function () {
  "use strict";

  var app = document.getElementById("app");
  var state = { items: [], counts: {}, forms: [], status: "new", form: "", mail: true, loaded: false };
  var STATUS = {
    new: "Nowe",
    progress: "W toku",
    replied: "Odpisane",
    archived: "Archiwum",
  };
  var ICONS = {
    back: '<path d="M15 6l-6 6 6 6"/>',
    refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/>',
    logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 16l-4-4 4-4M6 12h10"/>',
    phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
    chat: '<path d="M4.5 19.5 6 15.6A8 8 0 1 1 9 18.6z"/>',
    sms: '<path d="M4 5h16v11H9l-5 4z"/><path d="M8 10h8"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    send: '<path d="M4 12 20 4l-6 16-3-7z"/>',
    clipboard: '<rect x="5" y="4.5" width="14" height="16.5" rx="2.5"/><path d="M9 4.5V3h6v1.5"/><path d="m8.5 11 1.5 1.5 3-3M8.5 16.5h7"/>',
    dumbbell: '<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    inbox: '<path d="M4 13l2.5-8h11L20 13v6H4z"/><path d="M4 13h5l1 2h4l1-2h5"/>',
  };
  var FORM_ICON = { online: "clipboard", treningi: "dumbbell", konsultacja: "calendar" };

  /* ---------------- Narzędzia ---------------- */
  function icon(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || ICONS.chat) + "</svg>";
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function btn(cls, label, iconName, onClick) {
    var b = el("button", cls);
    b.type = "button";
    if (iconName) b.innerHTML = icon(iconName);
    if (label) b.appendChild(el("span", null, label));
    if (onClick) b.addEventListener("click", onClick);
    return b;
  }

  var toastTimer = 0;
  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("is-visible"); }, 2600);
  }

  function ago(iso) {
    var d = new Date(iso);
    var s = (Date.now() - d.getTime()) / 1000;
    if (s < 60) return "przed chwilą";
    if (s < 3600) return Math.floor(s / 60) + " min temu";
    if (s < 86400) return Math.floor(s / 3600) + " godz. temu";
    if (s < 172800) return "wczoraj, " + d.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
  }

  function fullDate(iso) {
    return new Date(iso).toLocaleString("pl-PL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function api(path, opts) {
    opts = opts || {};
    var headers = { Accept: "application/json" };
    if (opts.body) headers["Content-Type"] = "application/json";
    if (opts.method && opts.method !== "GET") headers["X-Panel"] = "1";
    return fetch("/api/" + path, {
      method: opts.method || "GET",
      headers: headers,
      credentials: "same-origin",
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (r.status === 401 && path !== "login") { renderLogin(); throw Object.assign(new Error("auth"), { silent: true }); }
        if (!r.ok) throw new Error(data.message || "Błąd serwera (" + r.status + ")");
        return data;
      });
    });
  }

  function fail(err) {
    if (!err.silent) toast(err.message || "Coś poszło nie tak");
  }

  function setBadge() {
    var n = state.counts.new || 0;
    document.title = (n ? "(" + n + ") " : "") + "Panel · Daniel Staszak";
    try {
      if (navigator.setAppBadge) n ? navigator.setAppBadge(n) : navigator.clearAppBadge();
    } catch (e) { /* brak wsparcia */ }
  }

  function phoneHref(phone, kind) {
    var digits = String(phone || "").replace(/[^\d+]/g, "");
    if (kind === "wa") {
      digits = digits.replace(/^\+/, "");
      if (digits.length === 9) digits = "48" + digits;
      return "https://wa.me/" + digits;
    }
    return kind + ":" + digits;
  }

  /* ---------------- Instalacja jako aplikacja (Android / iPhone) ---------------- */
  var installPrompt = null;
  var ua = navigator.userAgent;
  var isIOS = /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
  var isAndroid = /android/i.test(ua);

  function isInstalled() {
    return window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  }

  function installDismissed() {
    try { return localStorage.getItem("ds-install-hide") === "1"; } catch (e) { return false; }
  }

  // Android (Chrome, Samsung Internet, Edge): systemowe okno instalacji na nasz przycisk
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    installPrompt = e;
    if (app.querySelector(".subs")) renderList();
  });
  window.addEventListener("appinstalled", function () {
    installPrompt = null;
    toast("Aplikacja zainstalowana ✔");
    var b = app.querySelector(".install");
    if (b) b.remove();
  });

  function installBanner() {
    if (isInstalled() || installDismissed()) return null;
    if (!installPrompt && !isIOS && !isAndroid) return null;
    var box = el("div", "install");
    var ic = el("span", "install__icon");
    var img = el("img");
    img.src = "icons/icon-192.png";
    img.alt = "";
    ic.appendChild(img);
    var text = el("div", "install__text");
    text.appendChild(el("strong", null, "Zainstaluj panel jako aplikację"));
    var how;
    if (installPrompt) how = "Ikona na ekranie telefonu, pełny ekran — jak zwykła aplikacja.";
    else if (isIOS) how = "W Safari stuknij Udostępnij ⬆️, potem „Do ekranu początkowego”.";
    else how = "W Chrome otwórz menu ⋮ i wybierz „Zainstaluj aplikację” albo „Dodaj do ekranu głównego”.";
    text.appendChild(el("span", null, how));
    box.appendChild(ic);
    box.appendChild(text);
    var actions = el("div", "install__actions");
    if (installPrompt) {
      actions.appendChild(btn("install__btn", "Zainstaluj", null, function () {
        var pr = installPrompt;
        installPrompt = null;
        pr.prompt();
        pr.userChoice.then(function (c) {
          if (c.outcome !== "accepted") installPrompt = null;
          renderList();
        });
      }));
    }
    var close = btn("install__close", null, null, function () {
      try { localStorage.setItem("ds-install-hide", "1"); } catch (e) { /* tryb prywatny */ }
      box.remove();
    });
    close.setAttribute("aria-label", "Ukryj");
    close.textContent = "×";
    actions.appendChild(close);
    box.appendChild(actions);
    return box;
  }

  /* ---------------- Logowanie ---------------- */
  function renderLogin() {
    app.textContent = "";
    var box = el("form", "login");
    box.innerHTML =
      '<div class="login__logo"><span>DS</span></div>' +
      '<h1 class="login__title">Panel</h1>' +
      '<p class="login__sub">Zgłoszenia ze strony danielstaszak.pl</p>';
    var label = el("label", "field");
    label.appendChild(el("span", "contact__label", "Hasło"));
    var input = el("input", "field__input");
    input.type = "password";
    input.name = "password";
    input.autocomplete = "current-password";
    input.required = true;
    label.appendChild(input);
    box.appendChild(label);
    var err = el("p", "contact__error");
    err.hidden = true;
    box.appendChild(err);
    var submit = el("button", "contact__submit");
    submit.type = "submit";
    submit.innerHTML = '<span class="contact__submit-text">Zaloguj</span><span class="contact__spinner" aria-hidden="true"></span>';
    box.appendChild(submit);
    app.appendChild(box);
    setTimeout(function () { input.focus(); }, 50);

    box.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!input.value) return;
      box.classList.add("is-sending");
      submit.disabled = true;
      err.hidden = true;
      api("login", { method: "POST", body: { password: input.value } })
        .then(function () { route(); })
        .catch(function (e2) { err.textContent = e2.message; err.hidden = false; input.select(); })
        .then(function () { box.classList.remove("is-sending"); submit.disabled = false; });
    });
  }

  /* ---------------- Lista ---------------- */
  function load() {
    return api("panel/submissions").then(function (data) {
      state.items = data.items;
      state.counts = data.counts;
      state.forms = data.forms;
      state.mail = data.mail;
      state.loaded = true;
      setBadge();
      return data;
    });
  }

  function topbar(title, left, right) {
    var bar = el("header", "topbar");
    var l = el("div", "topbar__side");
    if (left) l.appendChild(left);
    var t = el("h1", "topbar__title", title);
    var r = el("div", "topbar__side topbar__side--right");
    (right || []).forEach(function (n) { r.appendChild(n); });
    bar.appendChild(l);
    bar.appendChild(t);
    bar.appendChild(r);
    return bar;
  }

  function renderList() {
    app.textContent = "";
    var refresh = btn("icon-btn", null, "refresh", function () {
      refresh.classList.add("is-spinning");
      load().then(renderList, fail);
    });
    refresh.setAttribute("aria-label", "Odśwież");
    var logout = btn("icon-btn", null, "logout", function () {
      api("logout", { method: "POST" }).then(renderLogin, renderLogin);
    });
    logout.setAttribute("aria-label", "Wyloguj");
    var avatar = el("div", "topbar__logo", "DS");
    app.appendChild(topbar("Zgłoszenia", avatar, [refresh, logout]));

    var banner = installBanner();
    if (banner) app.appendChild(banner);

    if (!state.mail) {
      app.appendChild(el("p", "panel-warn", "Wysyłka maili nie jest skonfigurowana — odpowiedzi z panelu nie zadziałają. Uruchom na serwerze deploy/setup-panel.sh."));
    }

    // Statusy
    var tabs = el("div", "tabs");
    Object.keys(STATUS).forEach(function (st) {
      var b = btn("tab" + (state.status === st ? " is-active" : ""), STATUS[st], null, function () {
        state.status = st;
        renderList();
      });
      var n = state.counts[st] || 0;
      if (n) b.appendChild(el("b", "tab__count", String(n)));
      tabs.appendChild(b);
    });
    app.appendChild(tabs);

    // Formularze
    var chips = el("div", "filter");
    [{ key: "", title: "Wszystkie" }].concat(state.forms).forEach(function (f) {
      chips.appendChild(btn("filter__chip" + (state.form === f.key ? " is-active" : ""), f.title, null, function () {
        state.form = f.key;
        renderList();
      }));
    });
    app.appendChild(chips);

    var items = state.items.filter(function (s) {
      return s.status === state.status && (!state.form || s.form === state.form);
    });

    var list = el("div", "subs");
    if (!items.length) {
      var empty = el("div", "empty");
      empty.innerHTML = icon("inbox");
      empty.appendChild(el("p", null, state.status === "new" ? "Brak nowych zgłoszeń. Wszystko ogarnięte 💪" : "Nic tu nie ma."));
      list.appendChild(empty);
    }
    items.forEach(function (s) {
      var a = el("a", "sub sub--" + s.status);
      a.href = "#/z/" + s.id;
      var ic = el("span", "sub__icon");
      ic.innerHTML = icon(FORM_ICON[s.form] || "chat");
      var body = el("span", "sub__body");
      var top = el("span", "sub__top");
      top.appendChild(el("strong", "sub__name", s.name));
      top.appendChild(el("span", "sub__time", ago(s.createdAt)));
      body.appendChild(top);
      body.appendChild(el("span", "sub__form", s.formTitle));
      if (s.preview) body.appendChild(el("span", "sub__preview", s.preview));
      a.appendChild(ic);
      a.appendChild(body);
      if (s.status === "new") a.appendChild(el("span", "sub__dot"));
      list.appendChild(a);
    });
    app.appendChild(list);
  }

  /* ---------------- Szczegóły ---------------- */
  function renderDetail(id) {
    app.textContent = "";
    var back = btn("icon-btn", null, "back", function () { location.hash = "#/"; });
    back.setAttribute("aria-label", "Wróć do listy");
    app.appendChild(topbar("Zgłoszenie", back, []));
    var holder = el("div", "detail");
    holder.appendChild(el("p", "panel-loading", "Ładowanie…"));
    app.appendChild(holder);

    api("panel/submissions/" + id).then(function (data) {
      var s = data.item;
      // otwarcie nowego zgłoszenia = „W toku”
      if (s.status === "new") {
        api("panel/submissions/" + id, { method: "PATCH", body: { status: "progress" } }).then(function (d) {
          s.status = d.item.status;
          statusRow.querySelectorAll(".seg__btn").forEach(function (b) { b.classList.toggle("is-active", b.dataset.st === s.status); });
          load().catch(function () {});
        }).catch(fail);
      }
      holder.textContent = "";

      var head = el("div", "detail__head");
      var ic = el("span", "card__icon");
      ic.innerHTML = icon(FORM_ICON[s.form] || "chat");
      var ht = el("div");
      ht.appendChild(el("h2", "detail__name", s.name));
      ht.appendChild(el("p", "detail__meta", s.formTitle + " · " + fullDate(s.createdAt)));
      head.appendChild(ic);
      head.appendChild(ht);
      holder.appendChild(head);

      // Szybki kontakt
      var quick = el("div", "quick");
      function quickLink(label, href, iconName, sub) {
        var a = el("a", "quick__btn");
        a.href = href;
        if (/^https?:/.test(href)) { a.target = "_blank"; a.rel = "noopener"; }
        a.innerHTML = icon(iconName);
        a.appendChild(el("span", null, label));
        if (sub) a.title = sub;
        quick.appendChild(a);
      }
      if (s.phone) {
        quickLink("Zadzwoń", phoneHref(s.phone, "tel"), "phone", s.phone);
        quickLink("SMS", phoneHref(s.phone, "sms"), "sms", s.phone);
        quickLink("WhatsApp", phoneHref(s.phone, "wa"), "chat", s.phone);
      }
      if (s.email) quickLink("E-mail", "mailto:" + s.email, "mail", s.email);
      holder.appendChild(quick);

      // Dane i odpowiedzi
      var dl = el("dl", "form-review__list");
      [["Telefon", s.phone], ["E-mail", s.email]].concat(s.answers.map(function (a) { return [a.label, a.value]; }))
        .forEach(function (r) {
          if (!r[1]) return;
          dl.appendChild(el("dt", null, r[0]));
          dl.appendChild(el("dd", null, r[1]));
        });
      holder.appendChild(dl);

      // Status
      holder.appendChild(el("p", "contact__label", "Status"));
      var statusRow = el("div", "seg");
      Object.keys(STATUS).forEach(function (st) {
        var b = btn("seg__btn" + (s.status === st ? " is-active" : ""), STATUS[st], null, function () {
          api("panel/submissions/" + id, { method: "PATCH", body: { status: st } }).then(function (d) {
            s.status = d.item.status;
            statusRow.querySelectorAll(".seg__btn").forEach(function (x) { x.classList.toggle("is-active", x.dataset.st === s.status); });
            toast("Status: " + STATUS[s.status]);
            load().catch(function () {});
          }).catch(fail);
        });
        b.dataset.st = st;
        statusRow.appendChild(b);
      });
      holder.appendChild(statusRow);

      // Notatka
      var noteLabel = el("label", "field");
      noteLabel.appendChild(el("span", "contact__label", "Notatka (widzisz tylko Ty)"));
      var note = el("textarea", "field__input");
      note.rows = 3;
      note.value = s.note || "";
      note.placeholder = "Np. oddzwonić w poniedziałek po 17";
      noteLabel.appendChild(note);
      holder.appendChild(noteLabel);
      note.addEventListener("change", function () {
        api("panel/submissions/" + id, { method: "PATCH", body: { note: note.value } })
          .then(function () { toast("Notatka zapisana"); }).catch(fail);
      });

      // Historia odpowiedzi
      if (s.replies.length) {
        holder.appendChild(el("p", "contact__label", "Wysłane odpowiedzi"));
        s.replies.forEach(function (r) {
          var box = el("div", "reply-sent");
          box.appendChild(el("p", "reply-sent__meta", fullDate(r.at) + " · " + r.subject));
          box.appendChild(el("p", "reply-sent__text", r.message));
          holder.appendChild(box);
        });
      }

      // Odpowiedź mailem
      var composer = el("form", "composer");
      composer.appendChild(el("p", "contact__label", "Odpowiedz mailem do " + s.email));
      var subj = el("input", "field__input");
      subj.value = "Odpowiedź: " + s.formTitle + " — Daniel Staszak";
      subj.setAttribute("aria-label", "Temat");
      var msg = el("textarea", "field__input");
      msg.rows = 6;
      msg.placeholder = "Cześć " + s.name + "! Dzięki za zgłoszenie…";
      msg.setAttribute("aria-label", "Treść odpowiedzi");
      var sendBtn = el("button", "contact__submit");
      sendBtn.type = "submit";
      sendBtn.innerHTML = '<span class="contact__submit-text">Wyślij odpowiedź</span><span class="contact__spinner" aria-hidden="true"></span>';
      composer.appendChild(subj);
      composer.appendChild(msg);
      composer.appendChild(sendBtn);
      holder.appendChild(composer);

      var armed = false;
      composer.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!msg.value.trim()) { msg.focus(); return; }
        if (!armed) {
          armed = true;
          sendBtn.querySelector(".contact__submit-text").textContent = "Na pewno wysłać? Kliknij jeszcze raz";
          setTimeout(function () {
            armed = false;
            sendBtn.querySelector(".contact__submit-text").textContent = "Wyślij odpowiedź";
          }, 4000);
          return;
        }
        composer.classList.add("is-sending");
        sendBtn.disabled = true;
        api("panel/submissions/" + id + "/reply", { method: "POST", body: { subject: subj.value, message: msg.value } })
          .then(function () { toast("Odpowiedź wysłana ✔"); return load(); })
          .then(function () { renderDetail(id); })
          .catch(function (err) {
            fail(err);
            composer.classList.remove("is-sending");
            sendBtn.disabled = false;
            armed = false;
            sendBtn.querySelector(".contact__submit-text").textContent = "Wyślij odpowiedź";
          });
      });

      // Usuwanie (np. prośba o usunięcie danych)
      var del = btn("danger-link", "Usuń zgłoszenie", "trash");
      var delArmed = false;
      del.addEventListener("click", function () {
        if (!delArmed) {
          delArmed = true;
          del.querySelector("span").textContent = "Kliknij ponownie, aby usunąć na zawsze";
          setTimeout(function () { delArmed = false; del.querySelector("span").textContent = "Usuń zgłoszenie"; }, 4000);
          return;
        }
        api("panel/submissions/" + id, { method: "DELETE" })
          .then(function () { toast("Zgłoszenie usunięte"); return load(); })
          .then(function () { location.hash = "#/"; })
          .catch(fail);
      });
      holder.appendChild(del);
    }).catch(function (err) {
      if (err.silent) return;
      holder.textContent = "";
      holder.appendChild(el("p", "panel-warn", err.message));
    });
  }

  /* ---------------- Nawigacja ---------------- */
  function route() {
    var m = location.hash.match(/^#\/z\/([\w-]+)/);
    if (m) {
      if (!state.loaded) load().catch(fail);
      return renderDetail(m[1]);
    }
    load().then(renderList, fail);
  }

  window.addEventListener("hashchange", route);
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && !/^#\/z\//.test(location.hash) && app.querySelector(".subs")) {
      load().then(renderList, function () {});
    }
  });
  setInterval(function () {
    if (document.visibilityState === "visible" && app.querySelector(".subs")) load().then(renderList, function () {});
  }, 60000);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(function () {});
  }

  route();
})();
