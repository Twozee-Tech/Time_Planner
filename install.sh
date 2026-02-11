#!/bin/bash
set -e

REPO="Twozee-Tech/Time_Planner"
INSTALL_DIR="$HOME/Time_Planner"

echo "=== Time Planner - Instalacja ==="
echo ""

# Check dependencies
for cmd in git docker; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "Błąd: '$cmd' nie jest zainstalowany."
    exit 1
  fi
done

if ! docker compose version &>/dev/null && ! docker-compose version &>/dev/null; then
  echo "Błąd: 'docker compose' nie jest dostępny."
  exit 1
fi

# Clone or update
if [ -d "$INSTALL_DIR" ]; then
  echo "Aktualizacja istniejącej instalacji..."
  cd "$INSTALL_DIR"
  git pull
else
  echo "Klonowanie repozytorium..."
  git clone "https://github.com/$REPO.git" "$INSTALL_DIR"
  cd "$INSTALL_DIR"
fi

# Start
echo ""
echo "Uruchamianie kontenerów..."
docker compose up --build -d

echo ""
echo "=== Gotowe! ==="
echo "Aplikacja dostępna pod: http://localhost:3000"
echo "Login: admin@amplitiv.com"
echo "Hasło: admin123"
echo ""
echo "Aby zatrzymać: cd $INSTALL_DIR && docker compose down"
