#!/bin/bash
# chrome-watchdog.sh — version Linux, adaptee du Mac le 24/08/2026.
# Verrou : ne rien faire pendant un recyclage (27/08/2026). Sans lui, le
# watchdog passe pendant que chrome-recycle rouvre les onglets et en ajoute
# d autres -- cinq onglets constates au lieu de trois.
[ -f /tmp/chrome-recycle.lock ] && [ -z "$RECYCLE" ] && exit 0
#
# Garantit que Chrome tourne sur le port CDP avec TROIS onglets TradingView :
# deux pour la collecte (3m et 15m, mise en page 2AqpEMfD) et un pour la TA
# de Benjamin (mise en page qljTf3vu, separee pour ne pas perturber l'etat
# des collecteurs).
#
# Appele toutes les 5 minutes par PM2 (voir ecosystem ou pm2 start --cron).

CDP_PORT=9222
USER_DATA_DIR="/root/ChromeDebug"
CHROME_BIN="/usr/bin/google-chrome-stable"
CHROME_LAUNCH_WAIT=15

TV_URL_3M="https://www.tradingview.com/chart/2AqpEMfD/?symbol=BYBIT%3ABTCUSDT.P%26interval=3"
TV_URL_15M="https://www.tradingview.com/chart/2AqpEMfD/?symbol=BYBIT%3ABTCUSDT.P%26interval=15"
TV_URL_TA="https://www.tradingview.com/chart/qljTf3vu/?symbol=BYBIT%3ABTCUSDT.P%26interval=15"

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }

launch_chrome() {
  log "Lancement de Chrome"
  # --no-sandbox est necessaire en root ; le port n'ecoute que sur localhost
  # et rien d'autre ne tourne sur cette machine.
  export DISPLAY=:99
  nohup "${CHROME_BIN}" \
    --window-position=0,0 \
    --remote-debugging-port="${CDP_PORT}" \
    --remote-debugging-address=127.0.0.1 \
    --user-data-dir="${USER_DATA_DIR}" \
    --no-sandbox --disable-gpu \
    --no-first-run --no-default-browser-check \
    --disable-features=Translate \
    --disable-background-timer-throttling \
    --disable-backgrounding-occluded-windows \
    --disable-renderer-backgrounding \
    --window-size=1920,1080 \
    "https://www.tradingview.com/chart/2AqpEMfD/" > /root/chrome.log 2>&1 &
  log "Chrome lance"
}

HEALTH=$(curl -sf --max-time 3 "http://localhost:${CDP_PORT}/json/list" 2>/dev/null) || HEALTH=""

if [ -z "$HEALTH" ]; then
  log "CDP injoignable — redemarrage de Chrome"
  pkill -9 -f "remote-debugging-port=${CDP_PORT}" 2>/dev/null || true
  sleep 2
  launch_chrome
  sleep "${CHROME_LAUNCH_WAIT}"
  HEALTH=$(curl -sf --max-time 3 "http://localhost:${CDP_PORT}/json/list" 2>/dev/null) || HEALTH=""
fi

# On verifie CHAQUE onglet par son intervalle, pas par un simple comptage :
# deux onglets sur le meme intervalle passaient l'ancien test alors qu'ils
# sont inutiles et se disputent l'attribution des collecteurs.
HAS_3M=$(echo "$HEALTH" | grep -c "interval=3\"" || true)
HAS_15M=$(echo "$HEALTH" | grep -c "2AqpEMfD.*interval=15" || true)
HAS_TA=$(echo "$HEALTH" | grep -c "qljTf3vu" || true)

if [ "$HAS_3M" -ge 1 ] && [ "$HAS_15M" -ge 1 ] && [ "$HAS_TA" -ge 1 ]; then
  log "OK — 3 onglets actifs (3m, 15m, TA)"
  exit 0
fi

log "Onglets : 3m=${HAS_3M} 15m=${HAS_15M} TA=${HAS_TA} — ouverture des manquants"
if [ "$HAS_3M" -lt 1 ]; then
  curl -sf -X PUT --max-time 5 "http://localhost:${CDP_PORT}/json/new?${TV_URL_3M}" > /dev/null 2>&1 \
    && { log "  onglet 3m ouvert"; sleep 8; }
fi
if [ "$HAS_15M" -lt 1 ]; then
  curl -sf -X PUT --max-time 5 "http://localhost:${CDP_PORT}/json/new?${TV_URL_15M}" > /dev/null 2>&1 \
    && { log "  onglet 15m ouvert"; sleep 8; }
fi
if [ "$HAS_TA" -lt 1 ]; then
  curl -sf -X PUT --max-time 5 "http://localhost:${CDP_PORT}/json/new?${TV_URL_TA}" > /dev/null 2>&1 \
    && log "  onglet TA ouvert"
fi
