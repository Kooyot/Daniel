#!/usr/bin/env bash
# Instaluje stronę Daniela na serwerze, na którym działa już Caddy (np. obok innych stron).
# Użycie (jako root):
#   curl -fsSL https://raw.githubusercontent.com/Kooyot/Daniel/main/deploy/install.sh | bash -s twojadomena.pl
#
# Co robi:
#   1. pobiera stronę z GitHuba do /srv/daniel,
#   2. robi kopię /etc/caddy/Caddyfile i DOPISUJE na końcu blok dla podanej domeny
#      (pozostałe strony zostają bez zmian; ponowne uruchomienie podmienia tylko ten blok),
#   3. sprawdza konfigurację — przy błędzie przywraca kopię i niczego nie przeładowuje,
#   4. przeładowuje Caddy (bez restartu, inne strony działają dalej),
#   5. włącza automatyczne aktualizacje co 2 minuty (deploy/update.sh: strona, Caddy, backend panelu).
set -euo pipefail

DOMAIN="${1:-}"
DOMAIN="${DOMAIN#https://}"
DOMAIN="${DOMAIN#http://}"
DOMAIN="${DOMAIN#www.}"
DOMAIN="${DOMAIN%/}"
if [[ ! "$DOMAIN" =~ ^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$ ]]; then
  echo "Podaj domenę, np.:  ... | bash -s danielstaszak.pl" >&2
  exit 1
fi

REPO="https://github.com/Kooyot/Daniel.git"
SITE="${SITE:-/srv/daniel}"
CADDYFILE="${CADDYFILE:-/etc/caddy/Caddyfile}"
BEGIN="# >>> strona-daniel"
END="# <<< strona-daniel"

[[ $EUID -eq 0 ]] || { echo "Uruchom jako root." >&2; exit 1; }
command -v caddy >/dev/null || { echo "Nie znaleziono Caddy na serwerze." >&2; exit 1; }
command -v git >/dev/null || apt-get install -y git

echo "==> Pobieram stronę do $SITE"
if [[ -d "$SITE/.git" ]]; then
  git -C "$SITE" pull --ff-only --quiet
else
  git clone --depth 1 --quiet "$REPO" "$SITE"
fi

if sed "/^$BEGIN/,/^$END/d" "$CADDYFILE" | grep -qE "^(www\.)?${DOMAIN//./\\.}[ ,{]"; then
  echo "Domena $DOMAIN jest już w $CADDYFILE poza blokiem tej strony — przerywam, nic nie zmieniono." >&2
  exit 1
fi

NEW="$(mktemp)"
trap 'rm -f "$NEW"' EXIT
{
  # obecna konfiguracja bez starego bloku tej strony i bez pustych linii na końcu
  sed "/^$BEGIN/,/^$END/d" "$CADDYFILE" |
    awk '{ l[NR] = $0 } END { n = NR; while (n > 0 && l[n] ~ /^[[:space:]]*$/) n--; for (i = 1; i <= n; i++) print l[i] }'
  echo ""
  echo "$BEGIN ($DOMAIN) — dodane przez deploy/install.sh, nie edytuj ręcznie"
  sed "s/[_][_]DOMAIN[_][_]/$DOMAIN/g" "$SITE/deploy/Caddyfile"
  echo "$END"
} > "$NEW"

echo "==> Sprawdzam nową konfigurację Caddy"
if ! caddy validate --config "$NEW" --adapter caddyfile >/dev/null 2>&1; then
  echo "Błąd w nowej konfiguracji — NIC nie zostało zmienione. Szczegóły:" >&2
  caddy validate --config "$NEW" --adapter caddyfile 2>&1 | tail -5 >&2 || true
  exit 1
fi

BACKUP="$CADDYFILE.bak-$(date +%Y%m%d-%H%M%S)"
cp -p "$CADDYFILE" "$BACKUP"
echo "==> Kopia starej konfiguracji: $BACKUP"
cat "$NEW" > "$CADDYFILE"

echo "==> Przeładowuję Caddy (inne strony działają dalej)"
systemctl reload caddy

echo "==> Włączam automatyczne aktualizacje co 2 minuty"
cat > /etc/systemd/system/daniel-update.service <<UNIT
[Unit]
Description=Pobierz najnowszą wersję strony Daniela z GitHuba
After=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/bin/bash $SITE/deploy/update.sh
UNIT
cat > /etc/systemd/system/daniel-update.timer <<UNIT
[Unit]
Description=Aktualizuj stronę Daniela co 2 minuty

[Timer]
OnBootSec=1min
OnUnitActiveSec=2min

[Install]
WantedBy=timers.target
UNIT
systemctl daemon-reload
systemctl enable --now daniel-update.timer >/dev/null
echo "$DOMAIN" > /etc/daniel-domain

echo ""
echo "GOTOWE: strona ustawiona dla https://$DOMAIN (oraz www.$DOMAIN → $DOMAIN)."
echo "Certyfikat HTTPS pobierze się sam, gdy domena będzie wskazywać na ten serwer."
