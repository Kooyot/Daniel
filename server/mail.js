"use strict";
// Wysyłka maili przez skrzynkę w home.pl (SMTP): powiadomienia o zgłoszeniach i odpowiedzi do klientów.

const nodemailer = require("nodemailer");

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function nl2br(s) {
  return esc(s).replace(/\r?\n/g, "<br>");
}

// Szablon maila w stylu strony: czarny nagłówek ze złotym napisem, jasna treść (czytelna w każdej skrzynce).
function layout(title, bodyHtml, footer) {
  return `<!doctype html><html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f3f1ec;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f1ec;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;font-family:Inter,Segoe UI,Roboto,Arial,sans-serif;color:#1d1b17;">
<tr><td style="background:#0b0b0c;padding:22px 26px;">
  <div style="font-family:Oswald,Arial Narrow,Impact,sans-serif;font-size:13px;letter-spacing:4px;text-transform:uppercase;color:#a7a29a;">Daniel Staszak</div>
  <div style="margin-top:6px;font-size:20px;font-weight:700;color:#f3d18a;">${esc(title)}</div>
</td></tr>
<tr><td style="height:4px;background:linear-gradient(90deg,#f6d995,#d9a84e,#a5772a);background-color:#d9a84e;"></td></tr>
<tr><td style="padding:24px 26px;font-size:15px;line-height:1.55;">${bodyHtml}</td></tr>
<tr><td style="padding:16px 26px;border-top:1px solid #ece8df;font-size:12px;color:#8a857c;">${footer || "danielstaszak.pl"}</td></tr>
</table></td></tr></table></body></html>`;
}

function answersTable(sub) {
  const rows = [
    ["Imię", sub.name],
    ["E-mail", sub.email],
    ["Telefon", sub.phone],
  ].concat(sub.answers.map((a) => [a.label, a.value]));
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ece8df;border-radius:12px;border-collapse:separate;">` +
    rows.filter((r) => r[1]).map((r, i) => `<tr><td style="padding:10px 14px;${i ? "border-top:1px solid #ece8df;" : ""}">
      <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#8a857c;">${esc(r[0])}</div>
      <div style="margin-top:2px;color:#1d1b17;">${nl2br(r[1])}</div></td></tr>`).join("") +
    `</table>`;
}

function answersText(sub) {
  return [["Imię", sub.name], ["E-mail", sub.email], ["Telefon", sub.phone]]
    .concat(sub.answers.map((a) => [a.label, a.value]))
    .filter((r) => r[1])
    .map((r) => r[0] + ": " + r[1])
    .join("\n");
}

class Mailer {
  constructor(env) {
    this.from = env.MAIL_FROM;
    this.fromName = env.MAIL_FROM_NAME || "Daniel Staszak";
    this.notifyTo = env.NOTIFY_TO || env.MAIL_FROM;
    this.publicUrl = (env.PUBLIC_URL || "").replace(/\/$/, "");
    const port = Number(env.SMTP_PORT || 587);
    this.transport = env.SMTP_HOST ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port,
      secure: port === 465,
      requireTLS: port !== 465 && env.SMTP_TLS !== "off",
      ignoreTLS: env.SMTP_TLS === "off", // tylko do testów lokalnych
      auth: { user: env.SMTP_USER || env.MAIL_FROM, pass: env.SMTP_PASS },
    }) : null;
  }

  enabled() { return !!this.transport; }

  verify() {
    if (!this.transport) return Promise.reject(new Error("Brak ustawień SMTP"));
    return this.transport.verify();
  }

  // Powiadomienie dla Daniela o nowym zgłoszeniu (odpowiedź „Odpowiedz” trafia do klienta).
  notifyNew(sub) {
    if (!this.transport) return Promise.resolve();
    const link = this.publicUrl ? this.publicUrl + "/panel/#/z/" + sub.id : "";
    const html = layout("Nowe zgłoszenie: " + sub.formTitle,
      `<p style="margin:0 0 16px;">Nowe zgłoszenie przez stronę od: <b>${esc(sub.name)}</b>.</p>` +
      answersTable(sub) +
      (link ? `<p style="margin:22px 0 0;"><a href="${esc(link)}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#d9a84e;color:#17130c;font-weight:700;text-decoration:none;">Otwórz w panelu</a></p>` : ""),
      "Odpowiedz na tego maila, aby napisać bezpośrednio do klienta — albo odpisz w panelu.");
    return this.transport.sendMail({
      from: { name: "Strona danielstaszak.pl", address: this.from },
      to: this.notifyTo,
      replyTo: sub.email ? { name: sub.name, address: sub.email } : undefined,
      subject: sub.subject,
      text: "Nowe zgłoszenie: " + sub.formTitle + "\n\n" + answersText(sub) + (link ? "\n\nPanel: " + link : ""),
      html,
    });
  }

  // Odpowiedź Daniela do klienta, z cytatem zgłoszenia pod spodem.
  reply(sub, subject, message) {
    if (!this.transport) return Promise.reject(new Error("Brak ustawień SMTP"));
    const html = layout(subject,
      `<div>${nl2br(message)}</div>` +
      `<p style="margin:28px 0 8px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a857c;">Twoje zgłoszenie — ${esc(sub.formTitle)}</p>` +
      answersTable(sub),
      "Daniel Staszak · trener personalny · danielstaszak.pl");
    return this.transport.sendMail({
      from: { name: this.fromName, address: this.from },
      to: { name: sub.name, address: sub.email },
      replyTo: this.from,
      subject,
      text: message + "\n\n— — —\nTwoje zgłoszenie (" + sub.formTitle + "):\n" + answersText(sub),
      html,
    });
  }

  test(to) {
    if (!this.transport) return Promise.reject(new Error("Brak ustawień SMTP"));
    return this.transport.sendMail({
      from: { name: "Strona danielstaszak.pl", address: this.from },
      to: to || this.notifyTo,
      subject: "Test: panel danielstaszak.pl działa",
      text: "Jeśli to czytasz, serwer poprawnie wysyła maile ze skrzynki " + this.from + ".",
      html: layout("Test wysyłki", "<p style=\"margin:0;\">Jeśli to czytasz, serwer poprawnie wysyła maile ze skrzynki <b>" + esc(this.from) + "</b>.</p>"),
    });
  }
}

module.exports = { Mailer, esc };
