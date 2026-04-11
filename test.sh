#!/usr/bin/env bash
# Lance tous les tests du projet :
#   1. Menu interactif (ou flags --backend-only / --e2e-only)
#   2. Coupe les serveurs dev s'ils tournent (ports 5000 et 5173)
#   3. Tests backend pytest (BDD de test, rapide)
#   4. Seed la BDD de test
#   5. Tests E2E Playwright (démarre Flask + Vite automatiquement)
#
# Usage : ./test.sh [--backend-only] [--e2e-only]

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

RUN_BACKEND=true
RUN_E2E=true

# ── Flags CLI (non-interactif) ───────────────────────────────────────────────
FLAG_GIVEN=false
for arg in "$@"; do
  case $arg in
    --backend-only) RUN_E2E=false;     FLAG_GIVEN=true ;;
    --e2e-only)     RUN_BACKEND=false; FLAG_GIVEN=true ;;
  esac
done

# ── Menu interactif si aucun flag ────────────────────────────────────────────
if [ "$FLAG_GIVEN" = false ]; then
  echo ""
  echo "  Quels tests lancer ?"
  echo "  [1] Backend + E2E  (tous)"
  echo "  [2] Backend seulement"
  echo "  [3] E2E seulement"
  echo ""
  read -r -p "  Choix [1/2/3] : " CHOICE
  case "$CHOICE" in
    2) RUN_E2E=false ;;
    3) RUN_BACKEND=false ;;
    *) ;;  # 1 ou autre → les deux
  esac
fi

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
  python -m pytest tests/ --tb=short -q
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
  npx playwright test --reporter=line
  echo "    E2E : OK"
fi

echo ""
echo "==> Tous les tests sont passes."
echo ""
