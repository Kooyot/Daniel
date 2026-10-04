"use strict";
// Logowanie do panelu: hasło (scrypt) + podpisane ciasteczko sesji (HMAC).

const crypto = require("crypto");

const COOKIE = "ds_panel";
const SESSION_DAYS = 30;

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 32, { N: 16384, r: 8, p: 1 });
  return "scrypt:" + salt.toString("hex") + ":" + key.toString("hex");
}

function verifyPassword(password, stored) {
  const parts = String(stored || "").split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const salt = Buffer.from(parts[1], "hex");
  const expected = Buffer.from(parts[2], "hex");
  const key = crypto.scryptSync(String(password), salt, expected.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(key, expected);
}

function sign(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function createSession(secret) {
  const exp = Date.now() + SESSION_DAYS * 24 * 3600 * 1000;
  const value = exp + "." + crypto.randomBytes(9).toString("base64url");
  return {
    token: value + "." + sign(value, secret),
    maxAge: SESSION_DAYS * 24 * 3600,
  };
}

function readCookie(req, name) {
  const header = req.headers.cookie || "";
  const m = header.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : null;
}

function isLoggedIn(req, secret) {
  const token = readCookie(req, COOKIE);
  if (!token) return false;
  const i = token.lastIndexOf(".");
  if (i < 0) return false;
  const value = token.slice(0, i);
  const sig = Buffer.from(token.slice(i + 1));
  const good = Buffer.from(sign(value, secret));
  if (sig.length !== good.length || !crypto.timingSafeEqual(sig, good)) return false;
  return Number(value.split(".")[0]) > Date.now();
}

function sessionCookie(token, maxAge) {
  return COOKIE + "=" + token + "; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=" + maxAge;
}

function clearCookie() {
  return COOKIE + "=; Path=/api; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
}

module.exports = { hashPassword, verifyPassword, createSession, isLoggedIn, sessionCookie, clearCookie };
