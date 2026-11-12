#!/bin/sh
# Öppnar väderappen i ett eget fönster: en liten lokal webbserver för dist/ och
# Chromium i appläge. Servern stängs när fönstret stängs.
# Extra argument skickas vidare till Chromium.
DIR="$(dirname "$(readlink -f "$0")")"
PORT=48613
URL="http://127.0.0.1:$PORT/"
PROFILE="$HOME/snap/chromium/common/weather-app"

if [ ! -f "$DIR/dist/index.html" ]; then
  msg="Väderappen är inte byggd. Kör: cd $DIR && npm run build"
  command -v notify-send >/dev/null && notify-send "Väder" "$msg"
  echo "$msg" >&2
  exit 1
fi

# Starta servern bara om den inte redan kör (appen kan redan vara öppen)
if ! curl -sf -o /dev/null "$URL"; then
  python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$DIR/dist" >/dev/null 2>&1 &
  SERVER=$!
  trap 'kill "$SERVER" 2>/dev/null' EXIT INT TERM
  i=0
  until curl -sf -o /dev/null "$URL" || [ $i -ge 50 ]; do sleep 0.1; i=$((i + 1)); done
fi

# En egen profil gör att kommandot väntar tills fönstret stängs
chromium --app="$URL" --user-data-dir="$PROFILE" --class=weather-app --window-size=1180,920 "$@"
