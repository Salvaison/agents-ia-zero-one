# strategy-boono.md
*Version 0.3 — 16 juillet 2026*

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

## Structure de décision — trois étages (arrêtée le 16/07/2026)

Remplace le modèle « minimum 3/5 alignés » du SOP, abandonné : ce seuil n'a jamais
été validé contre des données réelles. Statut dans config.json : null.
*« When score confluence for a certain trade is reached, let trigger find a good
entry and execute. »*

Le Trigger ne juge pas S'IL faut trader — il juge QUAND entrer. C'est pourquoi il
ne s'additionne pas au score sommé : il a son propre seuil, et prend la main une
fois seulement la confluence validée.

### Ce qui reste vrai du modèle précédent
- **Divergence MCB** : signal primaire, confluence multi-timeframes requise.
- **S/R** : une zone, pas un niveau précis. Un événement macro peut l'invalider.
- **MA / Trend** : les moyennes mobiles sont aussi des lignes S/R, bien respectées.
  Logique en cascade — le prix touche le 20MA, il est soit rejeté (résistance
  confirmée, probablement doublée d'un point rouge MCB), soit il traverse
  (résistance flip) et la question se repose sur la ligne suivante.

### Trigger — mécanique
- Buffer de ticks. **Un tick = une transaction exécutée**, pas une seconde. 200
  ticks peuvent représenter 20 secondes en séance active et plusieurs minutes la
  nuit — la fenêtre respire avec l'activité du marché.
- Découpage en **4 tranches de 50 ticks**, notées individuellement. Chaque tranche
  mesure « 50 décisions de traders », normalisée par l'activité.
- **Agrégation pondérée, pas sommée.** La somme écrase une information réelle :
  +4/+4/+4 (poussée régulière) et +4/-4/+4 (marché chahuté) ne veulent pas dire la
  même chose, et +2/+1/+1 donne le même total que le second. La régularité entre
  tranches porte du sens.
- **La cadence est un signal en soi.** 200 ticks en 20s contre 200 ticks en 200s,
  c'est un facteur 10 d'activité. L'horodatage de chaque tick est déjà dans le
  buffer (price-stream.js) — la donnée existe, elle n'est simplement pas exploitée.

### Unité de mesure — pourcentage, jamais dollars
Tous les seuils de volume, de Trigger et de sensibilité MA s'expriment en
**pourcentage du prix courant**. Un mouvement de 60 $ ne pèse pas pareil à 64k, à
120k ou à 200k. Figer des dollars absolus ne survivrait pas à un doublement de BTC.

Conversion des seuils Trigger (base ~64 500 $) :

| Niveau | $ d'origine | % retenu | à 120k | à 200k |
|---|---|---|---|---|
| faible | < 20 $ | 0,03 % | 36 $ | 60 $ |
| moyen | > 60 $ | 0,10 % | 120 $ | 200 $ |
| fort | > 120 $ | 0,20 % | 240 $ | 400 $ |
| puissant | > 360 $ | 0,55 % | 660 $ | 1 100 $ |

La zone S/R ±250 $ vaut 0,39 % au prix actuel — à convertir également.

### Péremption du signal
Entre le moment où la confluence est atteinte et celui où le Trigger trouve son
entrée, le marché peut s'inverser. Trois options ont été examinées :

1. **Re-demander la permission aux scores** — le plus juste, mais coûteux : il faut
   relire les 6 CSV et rejouer le scoring à chaque tentative, sur un VPS à 512 Mo.
2. **Le DBSI comme arbitre** — écarté. Sa sémantique est inconnue (indicateur
   protégé, colonnes nommées par position à l'écran seulement) et il n'est rendu
   que sur ~25 bougies visibles. Un arbitre qu'on ne comprend pas et qui a des trous.
3. **Date de péremption par module** — RETENU. Un signal scalp qui n'a pas trouvé
   son entrée en quelques minutes n'est plus un signal scalp ; un swing peut
   attendre. Mécanique, ne suppose rien, réglable depuis config.json (`signalTtl`).

Si le paper trading montre que des trades périmés auraient été bons, on saura quoi
ajouter — avec des données plutôt qu'une intuition.

### Calibration — permissif d'abord, resserrer ensuite
Démarrer le paper trading avec des seuils larges, puis resserrer progressivement
jusqu'à trouver les limites, puis relâcher un peu pour rester dans une zone sûre.

Raison : en partant large, on VOIT les trades qu'un seuil serré aurait rejetés et
on peut juger si le rejet aurait été bon. En partant serré, on ne les voit jamais.

**Condition impérative** : le log doit enregistrer le détail complet du score de
chaque trade, pas seulement passé/refusé. Sans cela, impossible de rejouer a
posteriori ce qu'un seuil plus strict aurait donné — on resserrerait à l'intuition.

### Log de trade — deux couches
- **Couche 1, la ligne de trade** : LONG/SHORT, prix d'entrée/sortie, et les quatre
  scores de module (DIV / S-R / VOL / TRIGGER).
- **Couche 2, derrière un bouton** : tous les paramètres composant chaque module
  (Momentum, Money Flow, DBSI, les 4 tranches du Trigger, etc.).

agent-spec.md ne prévoit aujourd'hui que « timestamp, entry price, confluence
score, contributing modules » — insuffisant pour la rétro-ingénierie. À corriger :
c'est une spec d'interface, pas seulement de log.

### Skills — reporté
Des API de sondage de cycles (Pi-cycle et autres) pourraient servir de référence
pour une décision commune avec l'agent. **Contexte, jamais décideur de trade.**
Non intégré : l'ajouter reconfigurerait toute la structure du score.

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

### À voir

Lors d'une 2e tentative de shlong, prendre un TP3 à 5%. Non tranché.

## Règles absolues

- Risque max 1% du capital par trade (10$ sur 1000$)
- TP1 n'est jamais optionnel
- L'agent n'agit jamais sans que le score de confluence atteigne le seuil de son module (voir « Structure de décision — trois étages »). Les seuils eux-mêmes sont non tranchés à ce jour — statut null dans config.json.
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
