#!/usr/bin/env bash
# Lance tous les tests du projet :
#   1. Coupe les serveurs dev s'ils tournent (ports 5000 et 5173)
#   2. Tests backend pytest (BDD de test, rapide)
#   3. Seed la BDD de test
#   4. Tests E2E Playwright (démarre Flask + Vite automatiquement)
#
# Usage : ./test.sh [--backend-only] [--e2e-only]

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

RUN_BACKEND=true
RUN_E2E=true

for arg in "$@"; do
  case $arg in
    --backend-only) RUN_E2E=false ;;
    --e2e-only)     RUN_BACKEND=false ;;
  esac
done

# ── 1. Vérifier que les serveurs sont arrêtés ────────────────────────────────
echo ""
echo "==> Vérification des ports 5000 et 5173..."

check_port() {
  local port=$1
  local pid
  pid=$(netstat -ano 2>/dev/null | grep ":${port} " | grep LISTENING | awk '{print $NF}' | head -1)
  # Vérifie que le PID existe vraiment (netstat peut garder des entrées fantômes)
  if [ -n "$pid" ] && [ "$pid" != "0" ] && tasklist /FI "PID eq $pid" 2>/dev/null | grep -q "$pid"; then
    echo ""
    echo "ERREUR : Un serveur tourne sur le port $port (PID $pid)."
    echo "Arrete le avant de lancer les tests (Ctrl+C dans le terminal du serveur)."
    echo ""
    exit 1
  else
    echo "    Port $port : libre"
  fi
}

check_port 5000
check_port 5173

# ── 2. Tests backend ─────────────────────────────────────────────────────────
if [ "$RUN_BACKEND" = true ]; then
  echo ""
  echo "==> Tests backend (pytest)..."
  cd "$BACKEND"
  python -m pytest tests/ --show-progress --tb=short
  echo "    Backend : OK"
fi

# ── 3. Seed de la BDD de test pour les E2E ───────────────────────────────────
if [ "$RUN_E2E" = true ]; then
  echo ""
  echo "==> Seed de la BDD de test..."
  cd "$BACKEND"
  python seed.py
  echo "    Seed : OK"

  # ── 4. Tests E2E Playwright ─────────────────────────────────────────────────
  echo ""
  echo "==> Tests E2E (Playwright)..."
  cd "$FRONTEND"
  npx playwright test --reporter=list
  echo "    E2E : OK"
fi

echo ""
echo "==> Tous les tests sont passes."
echo ""
