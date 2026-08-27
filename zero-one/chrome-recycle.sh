#!/bin/bash
# Redemarrage quotidien de Chrome (27/08/2026).
# Les onglets TradingView accumulent la memoire sans jamais la liberer :
# 2.9 Go sur 3.8 apres 24h, avec des processus tues au hasard par le systeme.
cd /root/agents-ia-zero-one/zero-one
touch /tmp/chrome-recycle.lock
echo "[$(date '+%F %T')] recyclage de Chrome"
pkill -9 -f "remote-debugging-port=9222"
sleep 5
RECYCLE=1 bash chrome-watchdog.sh
sleep 25
RECYCLE=1 bash chrome-watchdog.sh
sleep 12
RECYCLE=1 bash chrome-watchdog.sh
sleep 5
pm2 restart collecteur-3m
sleep 20
pm2 restart collecteur-tab2
echo "[$(date '+%F %T')] termine"
free -h
rm -f /tmp/chrome-recycle.lock
