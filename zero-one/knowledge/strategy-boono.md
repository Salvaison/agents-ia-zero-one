# strategy-boono.md
*Version 0.4 — 2 août 2026*
*(v0.3 du 16 juillet ; cette version intègre le bâton de relais, la loi
d'invalidation et le passage à un module unique)*

---

## Convention de lecture

Ce document distingue systématiquement trois statuts :

- **ACTIF** — implémenté, tourne en paper trading aujourd'hui
- **INTENTION** — décidé sur le principe, pas encore implémenté
- **PISTE** — envisagé, non tranché

Un paramètre décrit ici sans mention de statut est ACTIF. Toute valeur
chiffrée doit correspondre à `config.json` : en cas de divergence, c'est
`config.json` qui fait foi et ce document qui est en retard.

---

## État du système au 2 août 2026

**Un seul module trade : DAY.** Scalp et swing sont évalués (scoring,
dashboard) mais ne prennent aucune position — `config.tradeSimulator.activeModules
= ["day"]`.

Raison : jusqu'au 2 août, les trois modules ouvraient **exactement la même
position** (même horodatage, même prix d'entrée, même direction). Ce n'étaient
pas trois stratégies mais trois copies, avec deux conséquences : l'exposition
réelle était de 3 % par signal au lieu du 1 % prévu, et tout PNL cumulé était
triplé artificiellement. Scalp et swing seront reconstruits comme de vraies
stratégies distinctes (voir « Architecture cible »).

**Levier : 50x uniforme**, en dur dans `ORDER_DEFAULTS` de
`trade-simulator.js` — pas encore différencié par module.

**Pas de stop-loss.** Retiré le 31/07 : *« essayons sans stop-loss, cela se
joue sur notre capacité à rentrer juste dans les trades »*. La protection
repose sur trois mécanismes, décrits plus bas : invalidation, liquidation par
levier, timeout anti-zombie.

**Portail de confluence désactivé** (`requiresConfluence: false` depuis le
29/07). Le simulateur est piloté uniquement par le bâton de relais, le temps
de calibrer ce déclencheur seul. Le scoring continue de tourner et de
s'afficher, mais ne conditionne pas l'entrée.

---

## Le bâton de relais — cœur du système

Processus PM2 indépendant (`baton-relay.js`), cycle de 30 secondes, connexion
WebSocket directe à MEXC. Il **ne décide pas** le trade : il expose l'état de
la chaîne dans `data/baton-state.json`, que `trade-simulator.js` consulte.

### Chaîne de décision

1. **ÉVÉNEMENT** — la cadence de ticks atteint 2× sa moyenne glissante sur 4h
2. **VIGILANCE** — état persistant, relayé de bâton en bâton, ne s'éteint pas seul
3. **RÉACTION PRIX** — seule juge de la direction :
   - `|netMove| ≥ 0,06 %` → action immédiate
   - `|netMove| ≥ 0,03 %` confirmé sur 2 bâtons consécutifs → action
4. **ENTRÉE** dans le sens du prix, via `lastAction` (version persistante du
   verdict, pour ne jamais rater un signal entre deux cycles de lecture)

Chaque action n'est consommée qu'une fois (`trade-sim-entry-tracker.json`).

### Garde-fou de plausibilité

Cadence > 120 ticks/s = anomalie (sweep extrême ou artefact d'horodatage
MEXC — observé une cadence de 50 000 sur une fenêtre de 0 seconde). Exclue de
la moyenne glissante, ne produit aucun signal.

### Déplacement de prix — `displacementPct`

Déplacement réel sur les 10 derniers bâtons (5 minutes), avec son signe :

```
(prix_maintenant − prix_il_y_a_10_bâtons) / prix_il_y_a_10_bâtons × 100
```

**Correction du 02/08** : la version précédente additionnait les `netMove`
de bâtons consécutifs. Or `netMove` est mesuré sur une fenêtre glissante
propre (`WinSec`, de 30 à 90 s selon la liquidité) — ces fenêtres **se
chevauchent**, et les additionner ne mesure aucun déplacement. Vérifié sur la
chute du 02/08 10:26–11:04 : le prix perdait 0,51 % pendant que la somme
plafonnait à 0,085 %, et son signe s'inversait par moments (+0,027 annonçant
« haussier » pendant un recul de −0,118 %).

Distribution mesurée sur 24 h (2 870 fenêtres) : p50 = 0,023 % · p75 = 0,048 %
· p90 = 0,084 % · p95 = 0,118 % · p99 = 0,212 %.

### Recommandation directionnelle — INTENTION

`recommendedDirection` combine le régime du VWAP15 (proche de zéro et
trajectoire décroissante = retournement possible ; s'écartant de zéro =
continuation) avec un déséquilibre fort, et recommande le **sens opposé** au
déplacement observé — principe du *retour à l'équilibre des flux* : un fort
déséquilibre directionnel rend probable un flux inverse ensuite.

Exposé dans `baton-state.json`, **en observation seulement** : ne pilote
aucune entrée à ce jour.

⚠ Réserve du 02/08 : ce principe de rééquilibrage n'a **pas** été confirmé sur
les bypass, où la continuation s'est révélée plus rentable que l'inversion
sur 24 h de données. Échantillon trop faible (31 trades) pour conclure. À
retrancher avec plusieurs jours de données.

---

## Sorties — trois mécanismes

### 1. Invalidation (ACTIF, ajouté le 02/08)

**Ce n'est pas un stop-loss.** Un stop sort à un niveau de *perte* fixé ; une
invalidation sort quand la *condition de marché* qui a motivé l'entrée n'existe
plus — en gain comme en perte.

Le scénario d'entrée est : « un événement de liquidité a produit une poussée
directionnelle, on entre dans ce sens ». Le pari est que ce flux se poursuit.
Il meurt de deux façons :

- **Flux inverse** — `displacementPct` devient contraire à la position au-delà
  de `reversalPct`, **confirmé sur 2 cycles consécutifs**. C'est l'« amorce du
  mouvement inverse » déjà décrite dans la structure Shlong : on ne fait
  qu'implémenter enfin cette règle.
- **Flux éteint** — `|displacementPct|` reste sous `stallPct` pendant
  `stallCycles` cycles. Le mouvement attendu n'a jamais eu lieu, on libère le
  capital. Cette règle a vocation à remplacer le timeout anti-zombie : au lieu
  de « 90 minutes se sont écoulées », on dit « le mouvement ne se produit pas ».

Paramètres dans `config.tradeSimulator.invalidation`. Valeurs au 02/08 au soir :
`reversalPct: 0.10` · `reversalConfirmCycles: 2` · `stallPct: 0.023` ·
`stallCycles: 20` · `graceCycles: 2` · `exitInProfit: true`.

Historique du réglage : `reversalPct` a démarré à 0,06 le 02/08 après-midi.
Sur 7 invalidations, **6 étaient prématurées** — le prix revenait dans le sens
de la position dans les 10 minutes (jusqu'à 221 points manqués). Cause :
`displacementPct` mesure le flux *global* du marché, pas le mouvement propre à
la position ; sur un marché sans tendance, il s'inverse constamment. D'où le
relèvement à 0,10 **et** l'exigence de confirmation.

### 2. Liquidation par levier (ACTIF)

À 50x, un mouvement de ±2 % contre la position épuise la marge. C'est une
contrainte structurelle de la marge isolée, pas un choix de stratégie. Prix de
liquidation calculé à l'entrée, vérifié à chaque tick en mode mèche.

**Correction du 02/08** : la vérification comparait au plus haut/bas de la
**bougie entière** du timeframe primaire (1d pour swing), donc à un pic pouvant
dater de plusieurs heures — d'où une fausse liquidation déclenchée sur un high
de la veille. Elle suit désormais `priceHighSinceEntry` / `priceLowSinceEntry`,
mis à jour tick par tick **depuis l'ouverture de la position**.

### 3. Timeout anti-zombie (ACTIF, garde-fou d'urgence)

Ajouté le 30/07 alors que le PNL était à −75 % avec des positions tenues des
heures sans jamais atteindre TP1, donc jamais protégées. Ferme de force au-delà
du délai : scalp 20 min · day 90 min · swing 240 min.

Statut : conservé comme filet ultime le temps de valider l'invalidation. Sur
l'après-midi du 02/08, il n'a **jamais eu à intervenir** — l'invalidation a tout
absorbé.

### 4. Coupe-circuit (ACTIF)

Si le PNL cumulé depuis la dernière remise à zéro descend à −25 % ou pire, les
**nouvelles** entrées sont bloquées (`circuitBreakerTripped`, à remettre
manuellement à `false`). Les positions déjà ouvertes continuent d'être gérées
normalement — jamais de position orpheline.

### 5. Blackout programmé (ACTIF, ajouté le 02/08)

Fenêtres pendant lesquelles le simulateur n'ouvre aucune position **et ferme
préventivement celles qui sont ouvertes** (`blackoutWindows`, format ISO 8601
UTC). Prévu pour les maintenances réseau annoncées et toute période sans
surveillance.

Pourquoi pas simplement `enabled: false` : ce flag est testé **avant** l'appel
à `simulateModule`, donc une position déjà ouverte ne serait plus gérée du
tout — ni invalidation, ni liquidation, ni timeout.

---

## Progression des tranches — 25 / 65 / 10

Trois déclencheurs indépendants, chacun compté une seule fois par occurrence
réelle (front montant, pas « toujours vrai ») :

- un **événement de cadence**
- un **passage à zéro du VWAP** — timeframe configurable
  (`vwapTriggerTimeframe`, actuellement `15m`)
- un **seuil netMove** (0,06 % immédiat / 0,03 % confirmé ×2)

### Filtre directionnel (ACTIF, ajouté le 02/08)

Un déclencheur ne fait avancer les tranches que si le mouvement va **dans le
sens de la position**. Si la position est en perte au-delà de
`ADVERSE_TOLERANCE_PCT` (0,02 % de prix), le déclencheur est **ignoré**.

Motif : le 02/08 à 04:07, un pic de cadence à ×23,92 est survenu pendant que le
prix explosait *contre* une position short. Le déclencheur a fermé la tranche
65 % à −19,29 %, puis le résidu à −29,44 %. Le même déclencheur servait à
prendre un profit et à encaisser une perte — deux situations opposées.

### Timeframe du VWAP

Le module day utilisait le VWAP **4h**, qui traverse zéro deux ou trois fois par
jour : sur 81 tranches, ce déclencheur n'a servi **qu'une fois**. Le 15m offre
~31 traversées par jour, cohérent avec des positions dont la durée médiane
gagnante est de 17 minutes.

Piège rencontré le 02/08 : `volByTf` est reconstruit pour chaque module avec
**uniquement ses propres timeframes de signal**. Pour day (`signal: ["4h"]`),
`volByTf["15m"]` était `undefined` et le fallback retombait silencieusement sur
le 4h. Corrigé dans `cerveau-central.js` : le timeframe du déclencheur est
chargé s'il manque.

### Rôle réel des 10 % — clarifié le 16/07/2026

Le Shlong n'est pas une sortie en trois paliers sur un même mouvement — c'est
une **bascule entre deux positions**. Long et short coexistent par construction.

Les 10 % du long se déprécient volontairement à mesure que le short s'affirme.
Deux issues, et ils jouent un rôle dans chacune :

- **Short gagnant** : le long est clos quand le short atteint son TP1. Les 10 %
  ont perdu de la valeur, mais le PNL global reste positif.
- **Short perdant** : le prix est reparti dans le sens du long, donc les 10 %
  ont pris de la valeur. Ils couvrent la perte du short (plafonnée à ~1 %) et
  servent de hedge pour la tentative suivante.

Conséquence : 10 % suffit. La valeur de cette tranche ne dépend pas de sa taille
mais de son rôle de couverture d'une perte plafonnée.

**Implémentation actuelle — simplifiée.** Le Shlong complet (coexistence
long+short, bascule de position) n'est **pas** implémenté. Aujourd'hui le
résidu de 10 % est simplement fermé au 3ᵉ déclencheur. Chantier à part entière.

---

## Structure Shlong — INTENTION

Le Shlong est une unité discrète. Quand les deux positions sont fermées, il est
terminé ; un nouveau Shlong repart de zéro.

```
Support identifié        → ouverture LONG (100 %)
Résistance + divergences → ouverture SHORT + maintien 25 % LONG
Short descend            → décision sortie LONG selon comportement SHORT
Support identifié        → ouverture nouveau LONG + maintien 25 % SHORT
Long monte               → décision sortie SHORT
                         → Shlong terminé
```

**Rôle des 25 %** : assurance contre un retournement raté, pont entre les deux
positions, jamais « entre deux » — toujours une position active.

---

## Architecture cible — 3 modules spécialisés (INTENTION)

Décidé le 02/08 : les trois modules ne doivent pas être trois copies mais trois
logiques distinctes. Seul DAY est implémenté.

### Module Day — ACTIF
- Timeframe de signal : 4h · déclencheur VWAP : 15m
- Piloté par le bâton de relais (chaîne événement → vigilance → réaction prix)
- Durée médiane observée : 17 min (gagnantes) / 8 min (perdantes)

### Module Scalp — INTENTION
- Timeframes prévus : 15m + 3m + 1h · contexte 4h
- Levier envisagé : 20x–75x
- **Logique pressentie : les bypass** (poussées à forte cadence ou amplitude
  anormale), avec des règles de sortie rapides.
- ⚠ Non validé. Backtest du 02/08 sur 24 h : signal positif mais échantillon
  de 31 trades, médiane proche de zéro, résultat entièrement porté par la queue
  droite de la distribution. Ne pas construire dessus sans plusieurs jours de
  données. Cas de faux signal identifié à 17:42 le 02/08 : NMx de 2,76 obtenu
  sur un netMove de 0,0147 % parce que la base des 10 bâtons précédents était à
  0,001 %, dans un marché à 0,6× de cadence — un ratio élevé sur un marché mort.

### Module Swing — INTENTION
- Timeframes prévus : 1d + 4h + 1h · contexte weekly
- Levier envisagé : 5x–10x (un swing tenu des heures est incompatible avec 50x)
- Logique pressentie : la vague MCB elle-même

---

## Structure de décision — trois étages

*« When score confluence for a certain trade is reached, let trigger find a good
entry and execute. »*

Le Trigger ne juge pas S'IL faut trader — il juge QUAND entrer. C'est pourquoi
il ne s'additionne pas au score sommé : il a son propre seuil et prend la main
une fois la confluence validée.

**Statut au 02/08 : ce portail est désactivé** (`requiresConfluence: false`).
Le scoring tourne et s'affiche mais ne conditionne pas l'entrée. À
reconnecter une fois le bâton calibré.

### Ce qui reste vrai du modèle
- **Divergence MCB** : signal primaire, confluence multi-timeframes requise
- **S/R** : une zone, pas un niveau précis. Un événement macro peut l'invalider
- **MA / Trend** : les moyennes mobiles sont aussi des lignes S/R. Logique en
  cascade — le prix touche la ligne, il est soit rejeté (résistance confirmée,
  probablement doublée d'un point rouge MCB), soit il traverse (flip) et la
  question se repose sur la ligne suivante

### Trigger — mécanique
- Buffer de ticks. **Un tick = une transaction exécutée**, pas une seconde.
  200 ticks peuvent représenter 20 secondes en séance active et plusieurs
  minutes la nuit — la fenêtre respire avec l'activité du marché.
- **Découpage en 8 tranches de 25 ticks** (passé de 4×50 le 27/07 pour une
  granularité plus fine : 0,125 par palier au lieu de 0,25). Fenêtre totale
  inchangée à 200 ticks.
- **Agrégation pondérée, pas sommée.** La somme écrase une information réelle :
  +4/+4/+4 (poussée régulière) et +4/−4/+4 (marché chahuté) ne veulent pas dire
  la même chose. La régularité entre tranches porte du sens.
- **La cadence est un signal en soi.** 200 ticks en 20 s contre 200 ticks en
  200 s, c'est un facteur 10 d'activité.

⚠ Observation du 02/08 à creuser : sur le spike de 04:06, le pic de cadence
(×23,92) est survenu **après** le début du mouvement, et la cadence déclinait
déjà depuis plus d'une minute quand le bot est entré. La cadence pourrait être
un indicateur **retardé** — ce qui poserait question, puisque le bâton en fait
son déclencheur d'événement. Non tranché, échantillon insuffisant.

### Unité de mesure — pourcentage, jamais dollars

Tous les seuils de volume, de Trigger et de sensibilité MA s'expriment en
**pourcentage du prix courant**. Un mouvement de 60 $ ne pèse pas pareil à 64k,
120k ou 200k. Figer des dollars absolus ne survivrait pas à un doublement de BTC.

Seuils Trigger (`scoring.trigger.thresholds`), pour une tranche de 25 ticks :

| Niveau | % du prix | à 64,5k | à 120k | à 200k |
|---|---|---|---|---|
| faible | 0,01 % | 6,45 $ | 12 $ | 20 $ |
| moyen | 0,033 % | 21 $ | 40 $ | 66 $ |
| fort | 0,066 % | 43 $ | 79 $ | 132 $ |
| puissant | 0,18 % | 118 $ | 216 $ | 360 $ |

### Péremption du signal — NON TRANCHÉ

Entre le moment où la confluence est atteinte et celui où le Trigger trouve son
entrée, le marché peut s'inverser. Trois options examinées :

1. **Re-demander la permission aux scores** — le plus juste, mais coûteux :
   relire les 6 CSV et rejouer le scoring à chaque tentative, sur un VPS 512 Mo.
2. **Le DBSI comme arbitre** — écarté. Sémantique inconnue (indicateur protégé,
   colonnes nommées par position à l'écran) et rendu sur ~25 bougies seulement.
3. **Date de péremption par module** — retenu sur le principe. Un signal scalp
   qui n'a pas trouvé son entrée en quelques minutes n'est plus un signal scalp ;
   un swing peut attendre. Réglable via `signalTtl`.

Statut : `signalTtl` est à `null` pour les trois modules. Non implémenté.

### Calibration — permissif d'abord, resserrer ensuite

Démarrer avec des seuils larges, resserrer progressivement jusqu'à trouver les
limites, puis relâcher un peu pour rester dans une zone sûre.

Raison : en partant large, on VOIT les trades qu'un seuil serré aurait rejetés
et on peut juger si le rejet aurait été bon. En partant serré, on ne les voit
jamais.

**Condition impérative** : le log doit enregistrer le détail complet du score de
chaque trade, pas seulement passé/refusé. Sans cela, impossible de rejouer a
posteriori ce qu'un seuil plus strict aurait donné.

---

## Règles absolues

- Risque max **1 % du capital par trade** — respecté depuis le 02/08 seulement
  (avant, les 3 modules cumulaient 3 %)
- TP1 n'est jamais optionnel
- Transparence totale — chaque décision explicable et traçable
- Journée négative → rapport immédiat
- 3 jours consécutifs négatifs → analyse obligatoire
- Semaine négative → stop et révision des paramètres
- Aucun changement de code en production sans validation explicite
- Pas de position orpheline : désactiver un module exige de fermer d'abord ses
  positions ouvertes

---

## Sources de niveaux S/R

### MA200 (DBSI) — établi le 20/07/2026

Le DBSI porte une moyenne mobile longue intégrée, nommée « Long Term Trend »
(période 200). Localisation : `v[1]` de la série `S8XNwk.st`.

**Rôle** : ce n'est PAS un score séparé « MA/Trend ». La MA200 est une source de
niveau S/R au même titre que DS/DR/WS/WR/MS/MR — sa touche score dans
`scoring.rangeSR`, pas dans un module à part.

**Une seule ligne suffit.** Contrairement à une cascade EMA 8/13/21/55 ou SMA
15/30/100/200 (Jayson Casper), on a choisi de ne pas construire de cascade : le
MA est un indicateur tardif, utile en confirmation mais peu réactif.

### Mécanique touch / reject / retest

Heuristique de marché, PAS une loi universelle :

1. Le prix touche un niveau S/R (y compris la MA200)
2. Deux issues : **rejet** (le niveau agit comme support/résistance confirmé) ou
   **traversée** (« flip », le niveau change de rôle)
3. **La confirmation fiable vient du RETEST**, pas du premier contact
4. Si le retest ne se produit pas immédiatement : attendre le signal suivant, ne
   pas forcer une lecture

### Barème progressif (`scoring.rangeSR.points`)

| État | Points |
|---|---|
| Hors zone | 0 |
| Touche simple (prix au niveau, rien confirmé) | 10 |
| Retest confirmé (réaction attendue au second passage) | 15 |
| Confluence avec un scénario établi | 25 |

Pour le swing, 25 est **bloquant** : pas de scénario, pas de trade.

La touche simple donne déjà 10 points exploitables — pas de blocage `null` en
attendant une confirmation qui peut ne jamais arriver.

---

## Signal MCB — mécanique réelle (établi le 16/07/2026 par sniff live)

Le gros point vert de la bande basse s'imprime quand la Blue Wave entre dans la
zone **−93/−103**. La bande n'est pas décorative : c'est la zone de survente
extrême qui déclenche le signal.

Conséquence : ce signal est **rare par nature**. Sur 284 bougies 15m
consécutives, la colonne `buy` est restée à 0 — non par défaut de capture, mais
parce qu'aucun signal ne s'est déclenché. Une colonne `buy` vide sur plusieurs
centaines de bougies est NORMALE, pas un bug.

**Mécanisme de préavis** : un point s'affiche d'abord en préavis sur la bougie
en cours, puis se confirme ou disparaît à la suivante. Permet de détecter à
l'avance la formation d'une divergence — mais implique qu'un point capté à la
clôture peut être un préavis non confirmé.

**Non résolu :**
- Le « sell flag » est actif en quasi-permanence — sens inconnu
- Le cas symétrique (survente haute / point rouge) jamais observé en live
- Les gros points verts ne sont visibles que dans la fenêtre de rendu du chart :
  une bougie récupérée rétroactivement peut arriver sans ses valeurs DBSI

### Collecte

Le collecteur CDP (`real-time-collector.js` / `tab2-collector.js`) capture les
valeurs MCB à **chaque clôture de bougie**, signal ou non. L'approche
antérieure par MCP TradingView (enregistrement uniquement au moment où un
signal imprime) est abandonnée.

Source de données : `MEXC:BTCUSDT.P` sur tous les timeframes depuis le 30/07.
Auparavant les signaux techniques venaient de Bybit pendant que la cadence
venait de MEXC — deux marchés jamais synchronisés, explication plausible de
plusieurs entrées à contresens.

---

## Chantiers ouverts

**Avant tout autre développement** — accumuler plusieurs jours de données sur
la configuration actuelle. Les décisions du 02/08 reposent sur 24 h ; deux
valeurs que j'avais posées à l'estime se sont révélées mal calibrées (plancher
de cadence inutile, seuil de déséquilibre hors d'atteinte).

Par ordre de priorité :

1. **Brancher `displacementPct` en entrée** — le bot est aveugle aux mouvements
   progressifs. Le 02/08 entre 10:27 et 11:03, le prix a chuté de 0,55 % en
   35 minutes avec 19 événements de cadence, et aucune position n'a été prise :
   la chute se faisait en escalier (~0,008 % par bâton), invisible à un seuil qui
   mesure un seul bâton de 30 secondes.
2. **Différencier le levier par module** — 50x uniforme est incompatible avec le
   swing. Attention : sous ~25x, la liquidation devient inatteignable sur ces
   échelles de temps, donc elle cesse d'être un filet.
3. **Retirer le timeout anti-zombie** une fois l'invalidation validée
4. **Construire le vrai Shlong** (coexistence long+short)
5. **Reconnecter le portail de confluence**
6. **Scalp par les bypass**, avec assez de données pour trancher
7. **Swing par la vague MCB**

### Pistes non tranchées

- **Circuit breaker par MA200** : si le prix retraverse la MA200 dans le sens
  opposé à une position ouverte, signal d'invalidation. Non codé.
- **TP3 à 5 %** lors d'une 2ᵉ tentative de Shlong.
- **Skills de sondage de cycles** (Pi-cycle et autres) comme référence de
  contexte. **Contexte, jamais décideur de trade.** Non intégré : l'ajouter
  reconfigurerait toute la structure du score.
- **Essoufflement de liquidité** : lors d'un mouvement soutenu, la liquidité
  s'épuise progressivement — le signal de retournement pourrait venir d'un
  *déclin* de cadence/netMove plutôt que d'un sursaut. Observé le 31/07
  (cadenceMult 0,54× lors d'une vraie inflexion VWAP) et le 02/08 sur le spike
  de 04:06. Non codé.

---

## Tickers surveillés

**Crypto :** BTC, ETH, SOL, XRP, ADA, LINK, ONDO, AAVE
**Macro :** Gold, Silver, Brent, S&P500

Seul BTC/USDT est tradé à ce jour.
