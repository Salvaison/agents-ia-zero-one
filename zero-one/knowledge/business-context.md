# Business Context

## What I'm Building
Bot de trading crypto autonome sur BTC/USDT utilisant Market Cipher B et DBSI, strategie Casper, execution MEXC. 3 modules : Scalp/Day/Swing. Supervision 30-60 min/jour.

## Current Activities
- Collecteur MCB+DBSI operationnel sur iMac (6 CSV : 3m/15m/1H/4H/1D/1W, format OHLC)
- Sync automatique iMac vers VPS toutes les 5 minutes via rsync
- mcb-analyzer.js deploye sur VPS
- ZeroOne Systems Day 29/60 en cours
- Paper trading MEXC a activer (erreur 602 non resolue)

## Constraints
- Solo, autodidacte, sans budget externe
- Capital liquide epuise debut automne 2026
- iMac doit rester allume pour collecte MCB
- Plan TradingView gratuit, 2 onglets max

## Current Goals
- Aout 2026 : paper trading valide, bot en production
- Automne 2026 : 3000 EUR/mois revenus passifs
- 2027 : application vendable a d autres traders

## State of Play
Ce qui fonctionne : infrastructure complete, collecte MCB+DBSI temps reel, modules VPS operationnels.
Ce qui est bloque : paper trading MEXC (erreur 602), mcb-analyzer manque de donnees, cerveau-central pas encore connecte aux CSV live.
