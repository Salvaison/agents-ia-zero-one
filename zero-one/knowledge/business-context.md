# Business Context

## What I'm Building
Bot de trading crypto autonome sur BTC/USDT (Bybit perpetual) utilisant Market Cipher B et DBSI comme signaux principaux, stratégie Casper, exécution sur MEXC. 3 modules : Scalp/Day/Swing. Supervision 30-60 min/jour. Objectif : revenu passif suffisant pour couvrir les besoins sans intervention active.

Portefeuille de réserves — métaux précieux et crypto (~30K$) comme fondation patrimoniale. Pas un business actif.

## Current Activities
- Collecteur MCB+DBSI opérationnel sur iMac (6 CSV : 3m/15m/1H/4H/1D/1W, format OHLC)
- Sync automatique iMac → VPS toutes les 5 minutes via rsync
- mcb-analyzer.js déployé — détection de divergences en attente de données suffisantes
- ZeroOne Systems Day 29/60 — CLAUDE.md complété
- Paper trading MEXC — à activer (erreur 602 API Futures non résolue)

## Constraints
- Solo, autodidacte, sans budget externe
- Capital liquide épuisé début automne 2026 — premier seuil critique
- iMac doit rester allumé pour la collecte MCB (launchd + watchdog)
- Plan TradingView gratuit — 2 onglets max, 1 session active

## Current Goals
- Août 2026 — paper trading validé, bot en production
- Automne 2026 — revenus couvrent les dépenses (3000€/mois)
- 2027 — application clé en main vendable à d'autres traders

## State of Play
**Ce qui fonctionne :**
- Infrastructure complète : iMac Monterey, Claude Code, TradingView MCP, VPS
- Collecte MCB+DBSI temps réel sur 6 timeframes avec OHLC
- Modules VPS : ma-tendance.js, volume-analyzer.js, mcb-analyzer.js opérationnels
- Cerveau central : structure en place, score MCB à connecter

**Ce qui est bloqué :**
- Paper trading MEXC — erreur API 602 Futures non résolue
- mcb-analyzer.js — données insuffisantes (collecteur démarré ce jour)
- cerveau-central.js — MCB/DBSI pas encore connectés aux vrais CSV