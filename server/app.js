"use strict";
// Backend strony Daniela: przyjmuje formularze, pilnuje limitów (IP, e-mail, telefon),
// zapisuje zgłoszenia, wysyła powiadomienia i obsługuje panel (/panel).
// Działa za Caddy: https://danielstaszak.pl/api/* → http://127.0.0.1:PORT

const http = require("http");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const crypto = require("crypto");
const { Store } = require("./store");
const { Mailer } = require("./mail");
const { Push } = require("./push");
const auth = require("./auth");

const env = process.env;
const PORT = Number(env.PORT || 3100);
const SITE_DIR = env.SITE_DIR || path.join(__dirname, "..");
const SECRET = env.SESSION_SECRET || "";
const STATUSES = ["new", "progress", "replied", "archived"];

if (!SECRET || SECRET.length < 32) {
  console.error("Brak SESSION_SECRET (min. 32 znaki) — uruchom deploy/setup-panel.sh");
  process.exit(1);
}

/* ---------- Konfiguracja strony (te same formularze co na stronie) ---------- */
function loadSiteConfig() {
  const code = fs.readFileSync(path.join(SITE_DIR, "assets/js/config.js"), "utf8");
  const sandbox = { window: {} };
  vm.runInNewContext(code, sandbox, { timeout: 1000 });
  return sandbox.window.SITE_CONFIG || {};
}
const site = loadSiteConfig();
const forms = site.forms || {};
const guard = site.antispam || {};
const LOCK_MS = (guard.lockHours == null ? 24 : guard.lockHours) > 0
  ? (guard.lockHours == null ? 24 : guard.lockHours) * 3600 * 1000
  : Infinity;
const MIN_MS = (guard.minSeconds == null ? 4 : guard.minSeconds) * 1000;

const DATA_DIR = env.DATA_DIR || path.join(__dirname, "data");
const store = new Store(DATA_DIR);
const mailer = new Mailer(env);
const push = new Push(store, DATA_DIR, env.MAIL_FROM);

/* ---------- Narzędzia ---------- */
function send(res, status, body, headers) {
  const json = JSON.stringify(body);
  res.writeHead(status, Object.assign({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  }, headers || {}));
  res.end(json);
}

function readJson(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (c) => {
      size += c.length;
      if (size > limit) { reject(Object.assign(new Error("too large"), { status: 413 })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {}); }
      catch (e) { reject(Object.assign(new Error("bad json"), { status: 400 })); }
    });
    req.on("error", reject);
  });
}

// Adres IP odwiedzającego: Caddy ustawia X-Forwarded-For (ufamy mu tylko z localhost).
function clientIp(req) {
  const remote = (req.socket.remoteAddress || "").replace(/^::ffff:/, "");
  const local = remote === "127.0.0.1" || remote === "::1";
  if (local && req.headers["x-forwarded-for"]) {
    const parts = String(req.headers["x-forwarded-for"]).split(",").map((s) => s.trim()).filter(Boolean);
    return parts[parts.length - 1] || remote;
  }
  return remote;
}

function keyOf(type, value) {
  return crypto.createHmac("sha256", SECRET).update(type + ":" + value).digest("base64url").slice(0, 22);
}

const str = (v, max) => String(v == null ? "" : v).trim().slice(0, max);
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

function fillTemplate(tpl, data) {
  return String(tpl || "")
    .replace(/\{([^}]+)\}/g, (_, k) => data[k] || "")
    .replace(/\s+—\s*$/, "");
}

// Limit liczby prób w oknie czasowym (w pamięci) — przeciw zalewaniu żądaniami.
const buckets = new Map();
function tooMany(name, max, windowMs) {
  const now = Date.now();
  const list = (buckets.get(name) || []).filter((t) => now - t < windowMs);
  list.push(now);
  buckets.set(name, list);
  if (buckets.size > 5000) buckets.clear();
  return list.length > max;
}

/* ---------- Formularz ze strony ---------- */
async function handleSubmit(req, res) {
  const ip = clientIp(req);
  if (tooMany("submit:" + ip, 10, 3600 * 1000)) {
    return send(res, 429, { error: "rate", message: "Za dużo prób. Spróbuj ponownie za godzinę." });
  }
  const body = await readJson(req, 32 * 1024);

  const key = str(body.form, 40);
  const def = forms[key];
  if (!def || def.show === false) return send(res, 400, { error: "invalid", message: "Nieznany formularz." });

  // Bot: wypełnione ukryte pole albo wysłane nienaturalnie szybko → udajemy sukces.
  if (body.website || Number(body.elapsed) < MIN_MS) return send(res, 200, { ok: true });

  const name = str(body.name, 80);
  const email = str(body.email, 120).toLowerCase();
  const phone = str(body.phone, 30);
  const digits = phone.replace(/\D/g, "");
  if (!name) return send(res, 400, { error: "invalid", message: "Podaj imię." });
  if (!EMAIL_RE.test(email)) return send(res, 400, { error: "invalid", message: "Sprawdź adres e-mail." });
  if (!/^\+?[0-9 ()-]{9,20}$/.test(phone) || digits.length < 9) {
    return send(res, 400, { error: "invalid", message: "Sprawdź numer telefonu (min. 9 cyfr)." });
  }

  // Jedna osoba = jedno zgłoszenie: sprawdzamy IP, e-mail i telefon.
  const keys = [keyOf("ip", ip), keyOf("email", email), keyOf("phone", digits.slice(-9))];
  if (guard.onePerPerson !== false) {
    const prev = store.findAttempt(keys, LOCK_MS);
    if (prev) {
      return send(res, 429, { error: "limit", at: prev.t, message: "Zgłoszenie od Ciebie już do mnie dotarło." });
    }
  }

  // Odpowiedzi tylko na pytania zdefiniowane w formularzu.
  const allowed = new Map();
  (def.fields || []).forEach((f) => {
    if (f.key === "name" || f.key === "email" || f.type === "tel") return;
    allowed.set(f.label, f);
  });
  const answers = [];
  (Array.isArray(body.answers) ? body.answers : []).forEach((a) => {
    const label = str(a && a.label, 120);
    const f = allowed.get(label);
    if (!f) return;
    let value = str(a.value, f.type === "textarea" ? 3000 : 400);
    if (!value) return;
    if (f.options && f.type === "choice" && !f.options.includes(value)) return;
    if (f.options && f.type === "multi") {
      value = value.split(",").map((v) => v.trim()).filter((v) => f.options.includes(v)).join(", ");
      if (!value) return;
    }
    if (!answers.some((x) => x.label === label)) answers.push({ label, value });
  });
  const missing = (def.fields || []).find((f) => f.required && allowed.has(f.label) && !answers.some((a) => a.label === f.label));
  if (missing) return send(res, 400, { error: "invalid", message: "Uzupełnij pole: " + missing.label + "." });

  const vars = { name, Telefon: phone, email };
  answers.forEach((a) => { vars[a.label] = a.value; });
  const sub = {
    id: store.newId(),
    createdAt: new Date().toISOString(),
    form: key,
    formTitle: def.title,
    subject: fillTemplate(def.subject || "Nowe zgłoszenie — {name}", vars),
    name, email, phone, answers,
    status: "new",
    note: "",
    replies: [],
    meta: { ua: str(req.headers["user-agent"], 200) },
  };
  await store.add(sub);
  store.recordAttempt(keys);
  console.log("[submit] %s %s (%s)", sub.id, sub.formTitle, sub.name);

  mailer.notifyNew(sub).catch((err) => console.error("[mail] powiadomienie nieudane:", err.message));
  push.notify(pushMessage(sub)).catch((err) => console.error("[push]", err.message));
  send(res, 200, { ok: true });
}

/* ---------- Panel ---------- */
function newCount() {
  return store.data.submissions.filter((s) => s.status === "new").length;
}

function pushMessage(sub) {
  const detail = sub.answers.map((a) => a.value).filter((v) => v.length < 40).slice(0, 2).join(" · ");
  return {
    title: "Nowe zgłoszenie: " + sub.formTitle,
    body: sub.name + (detail ? " — " + detail : "") + "\nStuknij, aby otworzyć.",
    url: "/panel/#/z/" + sub.id,
    tag: sub.id,
    badge: newCount(),
  };
}

async function handlePush(req, res, action) {
  if (!action && req.method === "GET") {
    return send(res, 200, { publicKey: push.publicKey(), devices: push.list().length });
  }
  if (action === "subscribe" && req.method === "POST") {
    const body = await readJson(req, 8 * 1024);
    push.subscribe(body.subscription, req.headers["user-agent"]);
    return send(res, 200, { ok: true, devices: push.list().length });
  }
  if (action === "unsubscribe" && req.method === "POST") {
    const body = await readJson(req, 8 * 1024);
    push.unsubscribe(String(body.endpoint || ""));
    return send(res, 200, { ok: true, devices: push.list().length });
  }
  if (action === "test" && req.method === "POST") {
    const sent = await push.notify({
      title: "Powiadomienia działają 💪",
      body: "Tak będzie wyglądać informacja o nowym zgłoszeniu.",
      url: "/panel/",
      tag: "test",
      badge: newCount(),
    });
    return send(res, 200, { ok: true, sent });
  }
  send(res, 404, { error: "not_found" });
}

function summary(s) {
  const last = s.replies[s.replies.length - 1];
  return {
    id: s.id, createdAt: s.createdAt, form: s.form, formTitle: s.formTitle,
    name: s.name, email: s.email, phone: s.phone, status: s.status,
    preview: (s.answers.find((a) => a.value.length > 25) || s.answers[0] || { value: "" }).value.slice(0, 140),
    repliedAt: last ? last.at : null,
  };
}

async function handleLogin(req, res) {
  const ip = clientIp(req);
  if (tooMany("login:" + ip, 8, 15 * 60 * 1000)) {
    return send(res, 429, { error: "rate", message: "Za dużo prób logowania. Spróbuj za 15 minut." });
  }
  const body = await readJson(req, 4 * 1024);
  if (!auth.verifyPassword(body.password, env.ADMIN_PASSWORD_HASH)) {
    await new Promise((r) => setTimeout(r, 600));
    return send(res, 401, { error: "auth", message: "Nieprawidłowe hasło." });
  }
  const s = auth.createSession(SECRET);
  send(res, 200, { ok: true }, { "Set-Cookie": auth.sessionCookie(s.token, s.maxAge) });
}

async function handlePanel(req, res, parts) {
  // parts: ["submissions"] | ["submissions", id] | ["submissions", id, "reply"]
  if (parts[0] === "push") return handlePush(req, res, parts[1]);
  if (parts[0] !== "submissions") return send(res, 404, { error: "not_found" });
  const id = parts[1];

  if (!id && req.method === "GET") {
    const list = store.list().map(summary);
    const counts = {};
    STATUSES.forEach((st) => { counts[st] = list.filter((s) => s.status === st).length; });
    return send(res, 200, { items: list, counts, forms: Object.keys(forms).map((k) => ({ key: k, title: forms[k].title })), mail: mailer.enabled() });
  }

  const sub = id && store.get(id);
  if (!sub) return send(res, 404, { error: "not_found", message: "Nie znaleziono zgłoszenia." });

  if (parts.length === 2 && req.method === "GET") return send(res, 200, { item: sub, mail: mailer.enabled() });

  if (parts.length === 2 && req.method === "PATCH") {
    const body = await readJson(req, 16 * 1024);
    const updated = store.update(id, (s) => {
      if (body.status && STATUSES.includes(body.status)) s.status = body.status;
      if (typeof body.note === "string") s.note = body.note.slice(0, 4000);
    });
    return send(res, 200, { item: updated });
  }

  if (parts.length === 2 && req.method === "DELETE") {
    store.remove(id);
    return send(res, 200, { ok: true });
  }

  if (parts[2] === "reply" && req.method === "POST") {
    const body = await readJson(req, 32 * 1024);
    const message = str(body.message, 10000);
    const subject = str(body.subject, 200) || ("Odpowiedź: " + sub.formTitle);
    if (!message) return send(res, 400, { error: "invalid", message: "Napisz treść odpowiedzi." });
    try {
      await mailer.reply(sub, subject, message);
    } catch (err) {
      console.error("[mail] odpowiedź nieudana:", err.message);
      return send(res, 502, { error: "mail", message: "Nie udało się wysłać maila: " + err.message });
    }
    const updated = store.update(id, (s) => {
      s.replies.push({ at: new Date().toISOString(), subject, message });
      s.status = "replied";
    });
    return send(res, 200, { item: updated });
  }

  send(res, 405, { error: "method" });
}

/* ---------- Router ---------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const p = url.pathname.replace(/\/+$/, "");
  try {
    if (p === "/api/health") return send(res, 200, { ok: true, mail: mailer.enabled() });
    if (p === "/api/submit" && req.method === "POST") return await handleSubmit(req, res);
    if (p === "/api/login" && req.method === "POST") return await handleLogin(req, res);
    if (p === "/api/logout" && req.method === "POST") return send(res, 200, { ok: true }, { "Set-Cookie": auth.clearCookie() });

    if (p.startsWith("/api/panel/")) {
      if (!auth.isLoggedIn(req, SECRET)) return send(res, 401, { error: "auth", message: "Zaloguj się." });
      // Ochrona przed CSRF: zmiany tylko z panelu (nagłówek, którego zwykły formularz nie wyśle).
      if (req.method !== "GET" && req.headers["x-panel"] !== "1") return send(res, 403, { error: "csrf" });
      return await handlePanel(req, res, p.slice("/api/panel/".length).split("/"));
    }
    send(res, 404, { error: "not_found" });
  } catch (err) {
    const status = err.status || 500;
    if (status === 500) console.error("[api]", err);
    if (!res.headersSent) send(res, status, { error: "server", message: "Błąd serwera. Spróbuj ponownie." });
  }
});

if (require.main === module) {
  server.listen(PORT, "127.0.0.1", () => {
    console.log("daniel-api słucha na 127.0.0.1:%d (formularze: %s; mail: %s)", PORT, Object.keys(forms).join(", "), mailer.enabled() ? "tak" : "NIE");
  });
}

module.exports = { server, store, push };
