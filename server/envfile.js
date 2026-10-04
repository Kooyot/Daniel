"use strict";
// Czyta plik /etc/daniel-api.env (format KEY="wartość", jak w systemd EnvironmentFile).

const fs = require("fs");

function parseEnvFile(file) {
  const out = {};
  fs.readFileSync(file, "utf8").split(/\r?\n/).forEach((line) => {
    const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/);
    if (!m) return;
    let v = m[2].trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/\\(["\\])/g, "$1");
    out[m[1]] = v;
  });
  return out;
}

module.exports = { parseEnvFile };
