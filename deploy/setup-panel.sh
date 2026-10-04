#!/usr/bin/env bash
# Jednorazowa konfiguracja backendu formularzy i panelu Daniela (można uruchomić ponownie, np. by zmienić hasła).
# Użycie (jako root, najlepiej przez SSH z PowerShella):
#   bash /srv/daniel/deploy/setup-panel.sh
#
# Pyta o: skrzynkę i hasło do niej (do wysyłki maili) oraz hasło do panelu.
# Hasła zapisuje TYLKO na serwerze w /etc/daniel-api.env (dostęp tylko dla roota).
set -euo pipefail

SITE="/srv/daniel"
ENV_FILE="/etc/daniel-api.env"
DATA_DIR="/var/lib/daniel-api"
SERVICE="daniel-api"
PORT=3100

[[ $EUID -eq 0 ]] || { echo "Uruchom jako root." >&2; exit 1; }
[[ -d "$SITE/server" ]] || { echo "Brak $SITE/server — najpierw: bash $SITE/deploy/update.sh --force" >&2; exit 1; }

NODE="$(command -v node || true)"
NPM="$(command -v npm || true)"
if [[ -z "$NODE" || -z "$NPM" ]]; then
  echo "Nie znaleziono Node.js/npm. Zainstaluj: apt-get install -y nodejs npm" >&2
  exit 1
fi
if [[ "$NODE" == /root/* ]]; then
  echo "Node jest zainstalowany w katalogu roota ($NODE) — usługa go nie zobaczy. Zainstaluj Node systemowo (apt / NodeSource)." >&2
  exit 1
fi
NODE_MAJOR="$("$NODE" -p 'process.versions.node.split(".")[0]')"
(( NODE_MAJOR >= 18 )) || { echo "Potrzebny Node 18+, jest $("$NODE" -v)." >&2; exit 1; }

DOMAIN="$(tr -d '[:space:]' < /etc/daniel-domain 2>/dev/null || true)"
DOMAIN="${DOMAIN:-danielstaszak.pl}"

# Poprzednie wartości (przy ponownym uruchomieniu)
old() { [[ -f "$ENV_FILE" ]] && sed -n "s/^$1=\"\(.*\)\"$/\1/p" "$ENV_FILE" | head -1 || true; }

ask() { # ask "Pytanie" "domyślna" → odpowiedź
  local answer
  read -r -p "$1 [$2]: " answer </dev/tty
  echo "${answer:-$2}"
}

ask_secret() { # ask_secret "Pytanie" → hasło (niewidoczne)
  local s
  read -r -s -p "$1: " s </dev/tty
  echo >&2
  printf '%s' "$s"
}

q() { # wartość do pliku env: KEY="..." z escapowaniem
  local v="${1//\\/\\\\}"
  printf '"%s"' "${v//\"/\\\"}"
}

echo ""
echo "=== Panel Daniela — konfiguracja ==="
echo "Wpisywanych haseł nie widać na ekranie — to normalne."
echo ""

MAIL_FROM="$(ask "Skrzynka, z której wysyłamy maile" "$(old MAIL_FROM | grep . || echo "kontakt@$DOMAIN")")"
MAIL_FROM="${MAIL_FROM:-kontakt@$DOMAIN}"
[[ "$MAIL_FROM" == *@* ]] || MAIL_FROM="kontakt@$DOMAIN"
SMTP_HOST="$(ask "Serwer SMTP" "$(old SMTP_HOST | grep . || echo poczta2649170.home.pl)")"
SMTP_PORT="$(ask "Port SMTP" "$(old SMTP_PORT | grep . || echo 587)")"
NOTIFY_TO="$(ask "Na jaki adres wysyłać powiadomienia o zgłoszeniach" "$(old NOTIFY_TO | grep . || echo "$MAIL_FROM")")"

SMTP_PASS=""
if [[ -n "$(old SMTP_PASS)" ]]; then
  SMTP_PASS="$(ask_secret "Hasło do skrzynki $MAIL_FROM (Enter = bez zmian)")"
  [[ -z "$SMTP_PASS" ]] && SMTP_PASS="$(old SMTP_PASS | sed 's/\\\(["\\]\)/\1/g')"
else
  while [[ -z "$SMTP_PASS" ]]; do SMTP_PASS="$(ask_secret "Hasło do skrzynki $MAIL_FROM")"; done
fi

ADMIN_HASH=""
if [[ -n "$(old ADMIN_PASSWORD_HASH)" ]]; then
  P1="$(ask_secret "Nowe hasło do panelu (Enter = bez zmian)")"
  [[ -z "$P1" ]] && ADMIN_HASH="$(old ADMIN_PASSWORD_HASH)"
else
  P1=""
fi
while [[ -z "$ADMIN_HASH" ]]; do
  [[ -z "$P1" ]] && P1="$(ask_secret "Hasło do panelu (min. 8 znaków)")"
  P2="$(ask_secret "Powtórz hasło do panelu")"
  if [[ "$P1" != "$P2" ]]; then echo "Hasła się różnią — spróbuj jeszcze raz."; P1=""; continue; fi
  if ! ADMIN_HASH="$(printf '%s' "$P1" | "$NODE" "$SITE/server/hash-password.js")"; then P1=""; ADMIN_HASH=""; fi
done
unset P1 P2

SESSION_SECRET="$(old SESSION_SECRET)"
[[ ${#SESSION_SECRET} -ge 32 ]] || SESSION_SECRET="$("$NODE" -e 'process.stdout.write(require("crypto").randomBytes(32).toString("hex"))')"

echo ""
echo "==> Zapisuję ustawienia w $ENV_FILE (dostęp tylko dla roota)"
umask 077
{
  echo "PORT=$(q "$PORT")"
  echo "SITE_DIR=$(q "$SITE")"
  echo "DATA_DIR=$(q "$DATA_DIR")"
  echo "PUBLIC_URL=$(q "https://$DOMAIN")"
  echo "MAIL_FROM=$(q "$MAIL_FROM")"
  echo "MAIL_FROM_NAME=$(q "Daniel Staszak")"
  echo "NOTIFY_TO=$(q "$NOTIFY_TO")"
  echo "SMTP_HOST=$(q "$SMTP_HOST")"
  echo "SMTP_PORT=$(q "$SMTP_PORT")"
  echo "SMTP_USER=$(q "$MAIL_FROM")"
  echo "SMTP_PASS=$(q "$SMTP_PASS")"
  echo "ADMIN_PASSWORD_HASH=$(q "$ADMIN_HASH")"
  echo "SESSION_SECRET=$(q "$SESSION_SECRET")"
} > "$ENV_FILE.new"
chmod 600 "$ENV_FILE.new"
mv "$ENV_FILE.new" "$ENV_FILE"
unset SMTP_PASS
umask 022

echo "==> Użytkownik systemowy i katalog na dane ($DATA_DIR)"
id -u daniel-api >/dev/null 2>&1 || useradd --system --no-create-home --shell /usr/sbin/nologin daniel-api
mkdir -p "$DATA_DIR"
chown daniel-api:daniel-api "$DATA_DIR"
chmod 700 "$DATA_DIR"

echo "==> Instaluję zależności backendu"
(cd "$SITE/server" && "$NPM" ci --omit=dev --no-audit --no-fund --silent)

echo "==> Usługa $SERVICE"
cat > "/etc/systemd/system/$SERVICE.service" <<UNIT
[Unit]
Description=Formularze i panel Daniela (danielstaszak.pl/panel)
After=network-online.target
Wants=network-online.target

[Service]
User=daniel-api
Group=daniel-api
WorkingDirectory=$SITE/server
EnvironmentFile=$ENV_FILE
ExecStart=$NODE $SITE/server/app.js
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=$DATA_DIR

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable "$SERVICE" >/dev/null
systemctl restart "$SERVICE"

echo "==> Codzienna kopia zapasowa bazy (/var/backups/daniel-api, 30 dni)"
cat > /etc/cron.daily/daniel-api-backup <<'CRON'
#!/bin/sh
mkdir -p /var/backups/daniel-api && chmod 700 /var/backups/daniel-api
[ -f /var/lib/daniel-api/db.json ] && cp /var/lib/daniel-api/db.json "/var/backups/daniel-api/db-$(date +%F).json"
find /var/backups/daniel-api -name 'db-*.json' -mtime +30 -delete
CRON
chmod 755 /etc/cron.daily/daniel-api-backup

echo "==> Caddy: przekierowanie /api do backendu"
bash "$SITE/deploy/install.sh" "$DOMAIN" | tail -3

echo "==> Sprawdzam, czy backend działa"
ok=""
for _ in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then ok=1; break; fi
  sleep 1
done
if [[ -z "$ok" ]]; then
  echo "Backend nie odpowiada. Ostatnie logi:" >&2
  journalctl -u "$SERVICE" -n 20 --no-pager >&2
  exit 1
fi

echo "==> Test wysyłki maila"
if "$NODE" "$SITE/server/smtp-test.js" "$ENV_FILE"; then
  mail_ok="tak"
else
  mail_ok="NIE — formularze i panel działają, ale maile nie wyjdą, dopóki tego nie poprawisz"
fi

echo ""
echo "GOTOWE"
echo "  Panel:   https://$DOMAIN/panel/"
echo "  Maile:   $mail_ok"
echo "  Logi:    journalctl -u $SERVICE -f"
