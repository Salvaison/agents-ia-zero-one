#!/bin/bash
# Script de démarrage bot trading

# Récupère l'IP Windows
WIN_IP=$(ip route | grep default | awk '{print $3}')
echo "IP Windows: $WIN_IP"

# Met à jour CDP_HOST dans .claude.json
sed -i "s/\"CDP_HOST\": \"[^\"]*\"/\"CDP_HOST\": \"$WIN_IP\"/" /home/boono/.claude.json
echo "CDP_HOST mis à jour: $WIN_IP"

echo "✅ Prêt — Lance Chrome sur Windows avec debug port 9222"
echo "Puis: cd /home/weibel/tradingview-mcp && claude"

