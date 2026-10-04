"use strict";
// Test wysyłki maili: node smtp-test.js /etc/daniel-api.env
// Łączy się z serwerem SMTP i wysyła mail testowy na adres powiadomień.

const { parseEnvFile } = require("./envfile");
const { Mailer } = require("./mail");

const env = parseEnvFile(process.argv[2] || "/etc/daniel-api.env");
const mailer = new Mailer(env);

mailer.verify()
  .then(() => mailer.test())
  .then(() => {
    console.log("OK — mail testowy wysłany na " + (env.NOTIFY_TO || env.MAIL_FROM));
  })
  .catch((err) => {
    console.error("BŁĄD wysyłki: " + err.message);
    if (/auth|535|credentials/i.test(err.message)) console.error("→ Sprawdź hasło do skrzynki (uruchom setup-panel.sh ponownie).");
    if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND/i.test(err.message)) console.error("→ Serwer nie może połączyć się z SMTP — sprawdź nazwę serwera i port.");
    process.exit(1);
  });
