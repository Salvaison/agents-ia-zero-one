# strategy-boono.md
*Version 0.2 — 25 juin 2026*

---

## Architecture — 3 modules parallèles

### Module Scalp
- **Timeframes signaux :** 1H + 12min + 3min
- **Contexte :** 4H
- **Leverage :** 20x-75x
- **Stop-loss :** NON — bonne entrée = protection
- **Taille mise :** 10$ par trade
- **TP1 :** rapide, couvre les frais
- **Logique :** volume élevé, petits profits cumulés

### Module Day
- **Timeframes signaux :** 4H + 1H + 5min
- **Contexte :** Daily (tendance)
- **Leverage :** 5x-10x
- **Stop-loss :** OUI — défini par S/R technique
- **Risque max :** 1% capital = 10$

### Module Swing
- **Timeframes signaux :** 1D + 4H + 1H
- **Contexte :** Weekly (macro + tendance)
- **Leverage :** 5x-10x
- **Stop-loss :** OUI — S/R majeur
- **Risque max :** 1% capital = 10$

---

## Hiérarchie de confluence — conditions d'entrée

Minimum 3/5 alignés pour agir. Pondération dynamique selon le contexte.

1. **Divergences MCB** — signal primaire. Confluence multi-timeframes requise. Élément le plus fiable.
2. **Volume** — confirmation de l'engagement réel du marché. Potentiellement décideur ultime dans certains contextes.
3. **S/R** — zone, pas niveau précis. Pourcentage autour du niveau identifié. Fort élément de confluence mais non absolu — un événement macro peut l'invalider.
4. **Tendance** — lecture EMA sur timeframe supérieur.
5. **Macro** — signal périphérique, jamais déclencheur.

---

## Structure Shlong — 1 unité = 1 long + 1 short

Le Shlong est une unité discrète. Quand les deux positions sont fermées, il est terminé. Un nouveau Shlong repart de zéro.
Support identifié → ouverture LONG (100%)

↓

Résistance + divergences → ouverture SHORT + maintien 25% LONG

↓

Short descend → décision sortie LONG selon comportement SHORT

↓

Support identifié → ouverture nouveau LONG + maintien 25% SHORT

↓

Long monte → décision sortie SHORT

↓

Shlong terminé

**Rôle des 25% :**
- Assurance contre un retournement raté
- Pont entre les deux positions
- Jamais "entre deux" — toujours une position active

---

## Structure de position 25/50/25

Cadre théorique de départ — les pourcentages seront dynamiques en pratique.

- 25% → TP1 : verrouillage (couvre frais + petit profit)
- 50% → TP2 : cœur du mouvement (profit principal)
- 25% → laissé courir / hedge trade suivant

À optimiser par l'expérimentation en paper trading.

---

## Règles absolues

- TP1 n'est jamais optionnel
- Risque max 1% du capital par trade (10$ sur 1000$)
- L'agent n'agit jamais sans confluence minimum 3/5
- Transparence totale — chaque décision est explicable et traçable
- Journée négative → rapport immédiat
- 3 jours consécutifs négatifs → analyse obligatoire
- Semaine négative → stop et révision des paramètres

---

## Tickers surveillés

**Crypto :** BTC, ETH, SOL, XRP, ADA, LINK, ONDO, AAVE
**Macro :** Gold, Silver, Brent, S&P500

---

## Ce qui reste à définir

- Calcul précis TP1 par module (scalp/day/swing)
- Seuils de volume exacts pour confirmation
- Paramètres MCB encodés en if/then
- Règles de position sizing avec leverage variable
- Bibliothèque de mouvements historiques (après paper trading)

---

## Module MCB — Notes d'implémentation

**Accès via MCP TradingView :**
- Valeurs MCB bougie courante : accessibles (Blue Wave, Money Flow, Buy/Sell, VWAP)
- Valeurs MCB historiques : non accessibles via MCP

**Solution — historique auto-construit :**
Le bot enregistre chaque valeur MCB au moment où un signal imprime.
Il construit progressivement sa propre base de données de signaux.

Logique :
SI signal imprimé détecté :
  enregistrer timestamp, prix, Blue Wave, Money Flow
  comparer avec signal précédent
  divergence si prix et MCB divergent en direction

**Limite :**
Au démarrage, quelques sessions nécessaires avant historique suffisant.