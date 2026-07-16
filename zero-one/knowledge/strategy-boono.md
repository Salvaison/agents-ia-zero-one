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

## Structure de position — 25 / 65 / 10

Cadre de départ. Les pourcentages seront dynamiques en pratique.

- **25% → TP1** : verrouillage (couvre frais + petit profit)
- **65% → TP2** : déclenché à l'amorce du mouvement inverse détectée par le système
  — PAS au simple contact du 0.618. Le Fib est une référence, pas le déclencheur.
- **10% → maintenus pendant le shlong** : ce n'est pas un pari sur la queue de
  mouvement, c'est une assurance.

### Rôle réel des 10% (clarifié le 16/07/2026)

Le shlong n'est pas une sortie en trois paliers sur un même mouvement — c'est une
bascule entre deux positions. Long et short coexistent par construction.

Les 10% du long se déprécient volontairement à mesure que le short s'affirme.
Deux issues, et ils jouent un rôle dans chacune :

- Short gagnant : le long est clos quand le short atteint son TP1. Les 10% ont
  perdu de la valeur, mais le PNL global reste positif — le long était déjà en
  bénéfice, et le PNL continue en positif à travers le short.
- Short perdant : le prix est reparti dans le sens du long, donc les 10% ont pris
  de la valeur. Ils couvrent la perte du short (plafonnée à ~1%) et servent de
  hedge pour la tentative suivante.

Conséquence : 10% suffit. La valeur de cette tranche ne dépend pas de sa taille
mais de son rôle de couverture d'une perte plafonnée.

### Correction d'une analyse erronée (12/07/2026)

Une note antérieure affirmait que le ratio 25/50/25 était structurellement mal
pensé, au motif que fermer 25% à TP1 (mouvement court) rapporte moins que 25% en
tranche finale (mouvement ample). Ce raisonnement est FAUX : il suppose que les
trois tranches jouent sur le même mouvement, comme une sortie en paliers. Ce
n'est pas le cas — la dernière tranche appartient à la mécanique de bascule, pas
à la sortie du long.

### À voir

Lors d'une 2e tentative de shlong, prendre un TP3 à 5%. Non tranché.

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

Cette section décrivait une approche par MCP TradingView, abandonnée depuis.
Le collecteur CDP (real-time-collector.js / tab2-collector.js) capture désormais
les valeurs MCB à CHAQUE clôture de bougie, signal ou non — pas seulement quand
un signal imprime, contrairement à ce qui est écrit plus haut.

## Signal MCB — mécanique réelle (établi le 16/07/2026 par sniff live)

Le gros point vert de la bande basse s'imprime quand la Blue Wave entre dans la
zone -93/-103. La bande n'est pas décorative : c'est la zone de survente extrême
qui déclenche le signal.

Conséquence importante : ce signal est RARE par nature. Sur 284 bougies 15m
consécutives, la colonne buy est restée à 0 — non pas parce que la capture est
cassée, mais parce qu'aucun signal ne s'est déclenché sur cette période. Une
colonne buy vide sur plusieurs centaines de bougies est donc NORMALE, pas un bug.

Mécanisme de préavis : un point s'affiche d'abord en préavis sur la bougie en
cours, puis se confirme ou disparaît à la bougie suivante. Cela permet de
détecter à l'avance la formation éventuelle d'une divergence — mais implique
qu'un point capté à la clôture peut être un préavis non confirmé.

Non résolu à ce jour :
- Le "sell flag" est actif en quasi-permanence — sens inconnu, probablement pas
  un point rouge.
- Le cas symétrique (survente haute / point rouge) n'a jamais été observé en live.
- Les gros points verts ne sont visibles que dans la fenêtre de rendu du chart :
  une bougie récupérée rétroactivement peut arriver sans ses valeurs DBSI.
