#!/usr/bin/env bash
# Lance le backend Flask (port 5000) et le frontend Vite (port 5173) en parallèle.
# Usage : ./dev.sh

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# Arrête les deux processus enfants proprement à la sortie (Ctrl+C)
cleanup() {
  echo ""
  echo "Arrêt des serveurs…"
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  echo "Bye."
}
trap cleanup EXIT INT TERM

# ── Backend ────────────────────────────────────────────────────────────
echo "[backend] Démarrage Flask sur http://localhost:5000"
cd "$ROOT/backend"

# Secrets locaux — à renseigner ici pour le dev (ne jamais committer de vraies valeurs)
export GMAIL_USER="admin.bgg@gmail.com"
export GMAIL_APP_PASSWORD="vafc hrio yowt iwzi"
export FRONTEND_BASE_URL="http://localhost:5173"

python run.py &
BACKEND_PID=$!

# ── Frontend ───────────────────────────────────────────────────────────
echo "[frontend] Démarrage Vite sur http://localhost:5173"
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "  Backend  → http://localhost:5000"
echo "  Frontend → http://localhost:5173"
echo ""
echo "  Ctrl+C pour tout arrêter."
echo ""

# Attend que l'un des deux processus se termine (ou Ctrl+C)
wait -n "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || wait
