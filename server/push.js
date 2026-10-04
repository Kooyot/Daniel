"use strict";
// Powiadomienia push (Web Push) na telefon Daniela — Android i iPhone (aplikacja z ekranu początkowego).
// Klucze VAPID tworzą się same przy pierwszym uruchomieniu i są zapisywane w katalogu danych.

const fs = require("fs");
const path = require("path");
const webpush = require("web-push");

class Push {
  constructor(store, dataDir, contact) {
    this.store = store;
    this.file = path.join(dataDir, "vapid.json");
    if (!fs.existsSync(this.file)) {
      fs.writeFileSync(this.file, JSON.stringify(webpush.generateVAPIDKeys()), { mode: 0o600 });
    }
    this.keys = JSON.parse(fs.readFileSync(this.file, "utf8"));
    webpush.setVapidDetails("mailto:" + (contact || "kontakt@danielstaszak.pl"), this.keys.publicKey, this.keys.privateKey);
    this.sender = (sub, payload) => webpush.sendNotification(sub, payload, { TTL: 24 * 3600, urgency: "high" });
    if (!Array.isArray(store.data.push)) store.data.push = [];
  }

  publicKey() { return this.keys.publicKey; }

  list() { return this.store.data.push; }

  subscribe(sub, ua) {
    if (!sub || typeof sub.endpoint !== "string" || !/^https:\/\//.test(sub.endpoint) || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
      throw Object.assign(new Error("Nieprawidłowa subskrypcja"), { status: 400 });
    }
    const clean = { endpoint: sub.endpoint, keys: { p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth) } };
    this.store.data.push = this.list().filter((s) => s.endpoint !== clean.endpoint);
    this.store.data.push.push(Object.assign(clean, { ua: String(ua || "").slice(0, 200), createdAt: new Date().toISOString() }));
    this.store.save();
  }

  unsubscribe(endpoint) {
    const before = this.list().length;
    this.store.data.push = this.list().filter((s) => s.endpoint !== endpoint);
    if (this.list().length !== before) this.store.save();
  }

  // Wysyła powiadomienie na wszystkie zapisane urządzenia; usuwa te, które wygasły (404/410).
  async notify(message) {
    const payload = JSON.stringify(message);
    const subs = this.list().slice();
    let sent = 0;
    await Promise.all(subs.map((s) => this.sender(s, payload).then(
      () => { sent++; },
      (err) => {
        if (err && (err.statusCode === 404 || err.statusCode === 410)) this.unsubscribe(s.endpoint);
        else console.error("[push] nieudane:", err && (err.statusCode || err.message));
      }
    )));
    return sent;
  }
}

module.exports = { Push };
