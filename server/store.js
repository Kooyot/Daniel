"use strict";
// Prosta baza w pliku JSON: zgłoszenia + historia wysyłek (do limitów).
// Zapis atomowy (plik tymczasowy + rename), zapisy wykonywane po kolei.

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class Store {
  constructor(dir) {
    this.file = path.join(dir, "db.json");
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    this.data = { submissions: [], attempts: [] };
    if (fs.existsSync(this.file)) {
      this.data = Object.assign(this.data, JSON.parse(fs.readFileSync(this.file, "utf8")));
    }
    this.queue = Promise.resolve();
  }

  save() {
    const snapshot = JSON.stringify(this.data, null, 1);
    this.queue = this.queue.then(() => {
      const tmp = this.file + "." + process.pid + ".tmp";
      fs.writeFileSync(tmp, snapshot, { mode: 0o600 });
      fs.renameSync(tmp, this.file);
    }).catch((err) => console.error("[store] zapis nieudany:", err));
    return this.queue;
  }

  newId() {
    return Date.now().toString(36) + crypto.randomBytes(4).toString("hex");
  }

  list() {
    return this.data.submissions.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  get(id) {
    return this.data.submissions.find((s) => s.id === id) || null;
  }

  add(sub) {
    this.data.submissions.push(sub);
    return this.save();
  }

  update(id, fn) {
    const sub = this.get(id);
    if (!sub) return null;
    fn(sub);
    sub.updatedAt = new Date().toISOString();
    this.save();
    return sub;
  }

  remove(id) {
    const before = this.data.submissions.length;
    this.data.submissions = this.data.submissions.filter((s) => s.id !== id);
    if (this.data.submissions.length !== before) this.save();
    return this.data.submissions.length !== before;
  }

  // Historia udanych zgłoszeń do limitu „jedna osoba = jedno zgłoszenie”.
  // Trzymamy tylko skróty (hash) IP, e-maila i telefonu.
  recordAttempt(keys) {
    this.data.attempts.push({ t: Date.now(), keys });
    this.save();
  }

  findAttempt(keys, sinceMs) {
    const since = Date.now() - sinceMs;
    this.data.attempts = this.data.attempts.filter((a) => a.t >= Date.now() - 400 * 24 * 3600 * 1000);
    return this.data.attempts.find((a) => a.t >= since && a.keys.some((k) => keys.includes(k))) || null;
  }
}

module.exports = { Store };
