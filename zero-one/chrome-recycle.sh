#!/bin/bash
# Redemarrage quotidien de Chrome (27/08/2026).
# Les onglets TradingView accumulent la memoire sans jamais la liberer :
# 2.9 Go sur 3.8 apres 24h, avec des processus tues au hasard par le systeme.
cd /root/agents-ia-zero-one/zero-one
touch /tmp/chrome-recycle.lock
echo "[$(date '+%F %T')] recyclage de Chrome"
pkill -TERM -u tradingview -f "remote-debugging-port=9222" 2>/dev/null || true
sleep 5
pkill -KILL -u tradingview -f "remote-debugging-port=9222" 2>/dev/null || true
RECYCLE=1 bash chrome-watchdog.sh
# Once Chrome/tabs are back, reconnect both collectors immediately. The old
# sequence waited nearly a minute and only checked tab presence, which allowed
# a silent MCB freeze to survive the recycle.
pm2 restart collecteur-3m >/dev/null 2>&1 || true
pm2 restart collecteur-tab2 >/dev/null 2>&1 || true
HB3=/run/boono-mcb-3m.heartbeat
HBT=/run/boono-mcb-tab2.heartbeat
fresh() { local f="$1" now m; [ -f "$f" ] || return 1; now=$(date +%s); m=$(stat -c %Y "$f" 2>/dev/null || echo 0); [ $((now-m)) -le 30 ]; }
ok=0
for _ in $(seq 1 18); do
  if fresh "$HB3" && fresh "$HBT"; then ok=1; break; fi
  sleep 5
done
if [ "$ok" -eq 1 ]; then
  echo "[$(date '+%F %T')] collecteurs confirmes par heartbeat"
else
  echo "[$(date '+%F %T')] ERREUR: heartbeats absents apres recycle — le watchdog normal prendra la releve"
fi
echo "[$(date '+%F %T')] termine"
free -h
rm -f /tmp/chrome-recycle.lock
