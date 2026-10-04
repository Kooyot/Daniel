"use strict";
// Zamienia hasło (z wejścia standardowego) na hash do pliku /etc/daniel-api.env.
// Użycie: printf '%s' "$HASLO" | node hash-password.js

const { hashPassword } = require("./auth");

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", () => {
  const password = input.replace(/\r?\n$/, "");
  if (password.length < 8) {
    console.error("Hasło musi mieć co najmniej 8 znaków.");
    process.exit(1);
  }
  process.stdout.write(hashPassword(password) + "\n");
});
