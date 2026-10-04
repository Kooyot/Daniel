"use strict";
// Testy backendu: formularz, limity, logowanie, panel (bez prawdziwego SMTP).
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "daniel-api-"));
process.env.DATA_DIR = dir;
process.env.SESSION_SECRET = "x".repeat(40);
process.env.ADMIN_PASSWORD_HASH = require("../auth").hashPassword("tajne-haslo-123");
process.env.PORT = "0";

const { server, store } = require("../app");
let base;
test.before(() => new Promise((r) => server.listen(0, "127.0.0.1", () => { base = "http://127.0.0.1:" + server.address().port; r(); })));
test.after(() => { server.close(); fs.rmSync(dir, { recursive: true, force: true }); });

const post = (p, body, headers) => fetch(base + p, { method: "POST", headers: Object.assign({ "Content-Type": "application/json" }, headers || {}), body: JSON.stringify(body) });
const valid = (over) => Object.assign({
  form: "konsultacja", elapsed: 9000, website: "",
  name: "Ola", email: "ola@example.pl", phone: "+48 500 600 700",
  answers: [
    { label: "Forma konsultacji", value: "Na sali" },
    { label: "Temat", value: "Dieta, Trening" },
    { label: "Z czym przychodzisz?", value: "Chcę ułożyć dietę" },
    { label: "Nieznane pole", value: "hack" },
  ],
}, over || {});

test("odrzuca złe dane", async () => {
  assert.equal((await post("/api/submit", valid({ form: "nie-ma" }))).status, 400);
  assert.equal((await post("/api/submit", valid({ email: "zly" }))).status, 400);
  assert.equal((await post("/api/submit", valid({ phone: "12" }))).status, 400);
  const r = await post("/api/submit", valid({ answers: [] }));
  assert.equal(r.status, 400);
  assert.match((await r.json()).message, /Z czym przychodzisz/);
});

test("bot (pułapka / za szybko) dostaje sukces, ale nic nie jest zapisane", async () => {
  assert.equal((await post("/api/submit", valid({ website: "spam" }))).status, 200);
  assert.equal((await post("/api/submit", valid({ elapsed: 500 }))).status, 200);
  assert.equal(store.list().length, 0);
});

test("zapisuje zgłoszenie i blokuje drugie (IP / e-mail / telefon)", async () => {
  const r = await post("/api/submit", valid());
  assert.equal(r.status, 200);
  const subs = store.list();
  assert.equal(subs.length, 1);
  assert.equal(subs[0].subject, "Konsultacja: Na sali — Ola");
  assert.deepEqual(subs[0].answers.map((a) => a.label), ["Forma konsultacji", "Temat", "Z czym przychodzisz?"]);
  // to samo IP, inny e-mail i telefon → limit
  const again = await post("/api/submit", valid({ email: "inny@example.pl", phone: "600700800" }));
  assert.equal(again.status, 429);
  assert.equal((await again.json()).error, "limit");
});

test("panel wymaga logowania i działa po zalogowaniu", async () => {
  assert.equal((await fetch(base + "/api/panel/submissions")).status, 401);
  assert.equal((await post("/api/login", { password: "zle" })).status, 401);
  const login = await post("/api/login", { password: "tajne-haslo-123" });
  assert.equal(login.status, 200);
  const cookie = login.headers.get("set-cookie").split(";")[0];
  assert.match(login.headers.get("set-cookie"), /HttpOnly; Secure; SameSite=Strict/);

  const list = await (await fetch(base + "/api/panel/submissions", { headers: { cookie } })).json();
  assert.equal(list.items.length, 1);
  assert.equal(list.counts.new, 1);
  const id = list.items[0].id;

  // zmiana bez nagłówka panelu → CSRF
  const csrf = await fetch(base + "/api/panel/submissions/" + id, { method: "PATCH", headers: { cookie }, body: "{}" });
  assert.equal(csrf.status, 403);

  const patched = await (await fetch(base + "/api/panel/submissions/" + id, {
    method: "PATCH", headers: { cookie, "x-panel": "1", "Content-Type": "application/json" },
    body: JSON.stringify({ status: "progress", note: "zadzwonić w pon." }),
  })).json();
  assert.equal(patched.item.status, "progress");
  assert.equal(patched.item.note, "zadzwonić w pon.");

  // odpowiedź bez SMTP → czytelny błąd, status bez zmian
  const reply = await fetch(base + "/api/panel/submissions/" + id + "/reply", {
    method: "POST", headers: { cookie, "x-panel": "1", "Content-Type": "application/json" },
    body: JSON.stringify({ message: "Dzień dobry!" }),
  });
  assert.equal(reply.status, 502);
  assert.equal(store.get(id).status, "progress");

  // sfałszowane ciasteczko
  assert.equal((await fetch(base + "/api/panel/submissions", { headers: { cookie: cookie.slice(0, -3) + "abc" } })).status, 401);
});

test("dane przetrwają restart (plik db.json)", () => {
  const db = JSON.parse(fs.readFileSync(path.join(dir, "db.json"), "utf8"));
  assert.equal(db.submissions.length, 1);
  assert.ok(db.attempts[0].keys.every((k) => !k.includes("ola@example.pl")));
});
