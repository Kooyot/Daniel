#!/usr/bin/env bash
# Uruchamiane co 2 minuty (daniel-update.timer): pobiera zmiany z GitHuba i — jeśli trzeba —
# aktualizuje backend panelu i konfigurację Caddy. Ręcznie: bash /srv/daniel/deploy/update.sh
set -euo pipefail

SITE="${SITE:-/srv/daniel}"
before="$(git -C "$SITE" rev-parse HEAD)"
git -C "$SITE" pull --ff-only --quiet
after="$(git -C "$SITE" rev-parse HEAD)"
[[ "$before" == "$after" && "${1:-}" != "--force" ]] && exit 0

changed="$(git -C "$SITE" diff --name-only "$before" "$after" || true)"
echo "Aktualizacja $before → $after"

# Caddy (np. nowe przekierowania) — bezpiecznie, z walidacją, przez install.sh
if grep -qE '^deploy/(Caddyfile|install\.sh)$' <<<"$changed" && [[ -s /etc/daniel-domain ]]; then
  bash "$SITE/deploy/install.sh" "$(tr -d '[:space:]' < /etc/daniel-domain)"
fi

# Backend panelu (jeśli zainstalowany): zależności i restart
if systemctl list-unit-files daniel-api.service >/dev/null 2>&1 && systemctl is-enabled --quiet daniel-api 2>/dev/null; then
  if grep -qE '^server/package(-lock)?\.json$' <<<"$changed"; then
    (cd "$SITE/server" && npm ci --omit=dev --no-audit --no-fund --silent)
  fi
  if grep -qE '^(server/|assets/js/config\.js$)' <<<"$changed" || [[ "${1:-}" == "--force" ]]; then
    systemctl restart daniel-api
  fi
fi
