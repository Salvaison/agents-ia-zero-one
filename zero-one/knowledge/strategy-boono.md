# strategy-boono.md
*Version 0.5 — 11 août 2026 (soir)*
*(v0.4.1 du 2 août. La 0.5 documente : l'infrastructure de collecte — le trou
documentaire le plus coûteux —, la hiérarchie directionnelle mise en place le
11/08, les trois voies d'action du bâton, la pente VWAP à trois échelles, et
les mesures qui fondent chaque nouvelle règle.)*

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

## INFRASTRUCTURE DE COLLECTE — lire avant toute intervention

Cette section existe parce que son absence a coûté cher : l'information
n'était consignée nulle part, et plusieurs sessions ont relancé les
collecteurs à la main en créant des doublons qui se disputaient les onglets
Chrome. Constaté le 11/08 : quatre processus au lieu de deux.

**Les collecteurs sont gérés par `launchd`. Ne JAMAIS les lancer à la main.**

| Processus | Rôle |
|---|---|
| `real-time-collector.js` | 3m, onglet dédié, écrit `mcb_3m.csv` |
| `tab2-collector.js` | 15m/1h/4h/1d/1w en rotation sur UN seul onglet |

- **Exactement deux onglets TradingView** doivent être ouverts : un sur
  `interval=3`, un sur `interval=15`. Un troisième provoque des conflits
  (`No unclaimed TradingView chart tab`).
- Vérifier l'état :
  `curl -s http://localhost:9222/json | python3 -c "import json,sys; [print(t['url']) for t in json.load(sys.stdin) if 'tradingview' in t.get('url','').lower()]"`
- Vérifier les processus : `ps aux | grep -E "real-time-collector|tab2-collector" | grep -v grep`
  → doit montrer **deux** lignes, toutes deux avec le chemin absolu
  `/usr/local/bin/node` (signature de `launchd`). Une ligne sans chemin
  absolu = instance manuelle à tuer.
- Pour repartir propre : `pkill -f "real-time-collector"; pkill -f "tab2-collector"`
  puis **ne rien relancer** — `launchd` s'en charge en quelques secondes.

**Mort volontaire du collecteur** : `tab2-collector` se termine lui-même après
30 minutes sans clôture 15m écrite (`FATAL: no close written on 15m for
1810s — exiting so launchd restarts us`). C'est un garde-fou, pas un bug.
Mais ce délai est **mal calibré** pour un timeframe qui clôture toutes les
15 min : entre deux redémarrages, une bougie sur deux est perdue.

**Défaut de collecte identifié le 11/08 — À REVÉRIFIER**
Taux de bougies 15m manquantes, par période :

| Période | Trous |
|---|---|
| 16–29 juillet | 0–1 % |
| **30–31 juillet** | 10 % puis 24 % |
| 1er–11 août | **10 à 49 %** |

La bascule s'est produite au 30 juillet, date du passage Bybit → MEXC. Ce
n'est PAS lié aux redémarrages de patchs : du 4 au 9 août, pendant l'absence
de Benjamin et sans aucune intervention, le taux est resté entre 21 % et
49 %. Le motif est systématique — trous de **30 minutes exactement**, jamais
45 ou 60, soit une bougie sur deux.

Mécanisme observé dans `mcb_tab2.log` : le WebSocket TradingView se ferme
~4 min après chaque démarrage sans se reconnecter, le collecteur reste
aveugle jusqu'au timeout de 30 min, redémarre, rattrape **une seule** bougie,
et le cycle recommence.

Deux causes possibles, non tranchées au 11/08 :
1. Les instances en doublon (constatées ce jour-là) qui se volent les onglets
2. La popup Chrome « Quitter le site Web ? », qui apparaît plusieurs fois par
   jour et bloque le rechargement de la page. Un flag
   `--disable-features=BeforeUnloadRequiresUserInteraction` a été ajouté au
   lancement de Chrome — **son effet n'est pas vérifié**, ce flag pourrait
   être obsolète dans Chrome 150.

**Conséquence à garder en tête** : tout ce qui dépend de la vague 15m — dont
le régime directionnel, filtre de plus haut niveau depuis le 11/08 — a
travaillé sur des données amputées d'un tiers pendant douze jours.

Autres éléments d'infrastructure :
- `mcb_3m_live.csv` : snapshot intra-bougie écrit toutes les 15s par
  `real-time-collector`, synchronisé vers le VPS. Une seule ligne, écrasée à
  chaque écriture. Sert au calcul de la pente VWAP live.
- Synchronisation Mac → VPS : LaunchAgent `com.boono.vps-sync.plist`, toutes
  les 30s, via `sync-vps.sh` (liste explicite de fichiers — penser à y
  ajouter tout nouveau CSV).
- Rechargement des onglets en cas de doute : `node reload-tv-tabs.cjs` depuis
  `/Users/boono3d/tradingview-mcp` (extension `.cjs` obligatoire, le
  `package.json` du dossier est en `type: module`).

---

## État du système au 11 août 2026

### Hiérarchie directionnelle (mise en place le 11/08) — LA contrainte de plus haut niveau

Trois niveaux, dans cet ordre :

**1. Régime de la vague MCB 15m** — `waveRegimeFilter`
Le dernier point CONFIRMÉ de la vague 15m définit le sens autorisé :
pic (rouge) = **seuls les SHORT**, creux (vert) = **seuls les LONG**. C'est un
ÉTAT qui dure jusqu'au pivot suivant, sans fenêtre de validité temporelle.

Motif : le 11/08, deux LONG à contresens en une heure pendant une chute
continue de 64400 à 63700 (−11,52 % et −12,28 %), alors que VWAP3 et VWAP15
pointaient tous deux vers le haut — leurs pentes reflètent la dernière
variation entre clôtures, donc du passé.

⚠ **Non validé statistiquement** (9 pivots seulement dans l'historique au
moment du codage). Implémenté sur le jugement de Benjamin, plusieurs années
d'observation manuelle de cet indicateur. Même démarche que le filtre pivot
du 04/08.

**2. Abstention sur désaccord VWAP3** — `abstainOnVwap3Disagreement`
Quand le SIGNE du VWAP3 contredit le régime 15m et que `|VWAP3| ≥ 2.0`,
AUCUNE entrée n'est prise, ni dans un sens ni dans l'autre. Le VWAP3 peut
suspendre, jamais inverser — lui donner le dernier mot ramènerait le bruit
(un pivot toutes les 11 min, justesse directionnelle mesurée 33-50 %).

Motif : SHORT du 17:58 le 11/08 (−3,23 %), régime baissier mais VWAP3 déjà
repassé à +2,72. Le critère est le SIGNE et non la pente — celle-ci était à
+1,48, classée « plate », et n'aurait pas suffi.

**Portée : ENTRÉES UNIQUEMENT.** Une position ouverte doit toujours pouvoir
être fermée, sinon on crée des positions bloquées.

**3. Filtres classiques** — coupe-circuit −25 %, cooldown 10 min après perte,
module actif.

### Amplitude minimale des pivots — `scoring.wavePivot.minAmplitude = 2.0`

Un extremum local de `blue_wave` n'est retenu comme pivot que si son écart au
plus proche voisin atteint ce seuil. Sur 542 pivots bruts en 15m, la moitié
avait une amplitude < 1,59 — de simples hésitations d'un cran, pas des
apogées.

**Validation croisée — le meilleur ancrage obtenu sur ce projet** : sur 27h,
Benjamin compte **14 points** sur son graphique MarketCipher ; la détection en
trouve **exactement 14**. Elle reproduit donc fidèlement l'indicateur. Et le
seuil qui ne retient que ses 7-8 « significatifs » est précisément 2,0.

---

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

**Ouverture de vigilance — DEUX voies** (une seule suffit) :
1. **ÉVÉNEMENT CADENCE** — la cadence de ticks atteint 2× sa moyenne 4h
2. **DÉPLACEMENT** — `|displacementPct| ≥ 0,067` (ajouté le 10/08)

Le champ `vigilance.trigger` indique laquelle des deux a ouvert la vigilance,
pour pouvoir mesurer séparément leur performance.

Motif de la seconde voie : le bot était aveugle aux mouvements PROGRESSIFS.
Cas du 10/08 à 11:50 — cadence 1,81× et netMove 0,045 % sous les seuils, mais
déplacement 5 min à −0,141 %. Mesure sur 24h : 148 événements cadence contre
396 déplacements ≥ p90, dont seulement 103 communs — **293 occasions
invisibles** à la voie historique.

**Action — TROIS voies, par ordre de priorité** :

| Voie | Déclencheur | Justesse mesurée |
|---|---|---|
| **Double pic** | 2ᵉ pic ≥ 3× en moins de 8 cycles | **75 %** (n=20) |
| **Confirmation** | pic ≥ 3× + `Dir.` confirme le sens opposé, ≤ 6 cycles | **62,5 %** (n=48) |
| **Réaction prix** (historique) | `netMove ≥ 0,06 %` ou `0,03 %` ×2 | — |

**Le principe qui a émergé le 11/08** : après un pic de cadence, le sens n'est
PAS celui du mouvement en cours mais son **OPPOSÉ**.

    sens du netMove courant      36,4 %   ← pire que le hasard
    sens du déplacement 5 min    38,6 %   ← pire que le hasard
    sens de la pente VWAP3       54,5 %
    OPPOSÉ du déplacement        61,4 %   ← le seul exploitable

Un pic de cadence marque un **retournement**, pas une continuation — c'est le
principe de rééquilibrage formulé le 31/07, qui se vérifie précisément là où
le bâton n'arrivait pas à décider. Et il expliquait pourquoi le bot ratait les
retournements : il attendait une confirmation allant dans le sens du mouvement
en train de finir.

Constat qui l'a motivé : **44 % des pics ≥ 3× ne débouchaient sur rien**,
alors que le prix bouge presque deux fois plus après un pic (0,100 % contre
0,058 % d'amplitude médiane).

Interprétation du double pic : deux pics rapprochés = une **bataille**, un
point de bascule. Le taux de 75 % est remarquablement stable de 4 à 20 cycles
de fenêtre — ce n'est pas un artefact de réglage.

**ENTRÉE** dans le sens décidé, via `lastAction` (version persistante du
verdict, pour ne jamais rater un signal entre deux cycles de lecture).

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

### Prédiction de retournement — OBSERVATION (refondue le 11/08)

`recommendedDirection` prédit un retournement à venir. La version du 01/08
(rééquilibrage sur `vwapRegime === 'retournement_possible'`) ne s'activait
quasiment jamais et reposait sur un principe jamais confirmé — elle a été
remplacée.

**Mesure sur 24h, base de référence 51,5 % de retournements :**

    SIGNAUX ISOLÉS — aucun n'est exploitable
      déplacement 5 min fort (≥0,084)      57,1 %
      cadence essoufflée (mult<0,7)        53,4 %
      pente VWAP3 plate (<2,19)            50,0 %
      VWAP3 proche de zéro                 50,6 %
      netMove change de signe              49,8 %
      pente VWAP15 plate                   41,2 %

    COMBINAISONS — c'est là que le signal apparaît
      déplacement fort ET cadence essoufflée   70,7 %  (n=75)
      déplacement fort ET pente VWAP3 plate    79,3 %  (n=29)

C'est l'hypothèse d'**essoufflement de liquidité** formulée le 31/07 et jamais
testée jusqu'ici : un mouvement fort dont la force motrice s'épuise se
retourne. Le sens prédit est l'OPPOSÉ du déplacement en cours.

⚠ Échantillons faibles (75 et 29 cas). Reste en OBSERVATION — expose la
prédiction sans piloter aucune décision. À confirmer sur plusieurs jours.

Champs exposés : `recommendedDirection`, `recommendedReason`,
`recommendedConfidence` ('moyenne' pour l'essoufflement, 'forte' pour la
pente plate).

### La pente du VWAP — trois échelles

| Mesure | Source | Rafraîchissement |
|---|---|---|
| `vwapSlope` | VWAP15, dernière variation entre clôtures | **18,2 min** |
| `vwap3Slope` | VWAP3, idem | **5,0 min** |
| `vwapLiveSlope` | régression sur snapshots intra-bougie | **30 s** |

**Piège majeur** : les deux premières ne sont PAS des pentes instantanées mais
la **dernière variation figée**, répétée à chaque relevé jusqu'à la clôture
suivante. D'où des situations où les deux disent « ça descend » alors que le
marché s'est déjà stabilisé.

La pente live corrige ça : le collecteur iMac écrit un snapshot intra-bougie
toutes les 15s (`mcb_3m_live.csv`), le VPS accumule un historique glissant
(40 points) et calcule la pente par **régression linéaire** sur les 8 derniers
points, normalisée en unités VWAP **par minute** — les intervalles n'étant pas
parfaitement réguliers, une différence brute serait faussée par un point
aberrant.

Seuils calibrés séparément (distribution mesurée sur 24h) :
`flatBelow` 2,04 / `strongAbove` 8,90 pour le 15m ;
`flat3Below` 2,19 / `strong3Above` 8,44 pour le 3m.

⚠ **Ce que la pente ne fait PAS** : elle ne prédit pas la direction du prix.
VWAP3 à **46,0 %** (moins bien que le hasard), VWAP15 à 56,4 %. Et
l'hypothèse « pente plate = apogée » ne ressort qu'à 60 %/56 % sur des
échantillons faibles. C'est pourquoi le remplacement de la stratégie du
passage à zéro par la pente n'a PAS été implémenté, malgré son attrait
conceptuel.

Les pentes ne servent donc qu'à : la levée anticipée du blocage pivot (sur le
VWAP3, 3,6× plus réactif que le 15m), et l'une des deux combinaisons de la
prédiction de retournement.

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

Si le PNL cumulé depuis la dernière remise à zéro descend à **−25 % ou pire**,
les **nouvelles** entrées sont bloquées (`circuitBreakerTripped`). Les positions
déjà ouvertes continuent d'être gérées normalement — jamais de position
orpheline.

**Le déblocage est manuel et délibéré.** Le flag ne se remet jamais à `false`
tout seul : il faut une révision des paramètres avant de relancer. C'est
l'implémentation technique de la règle « semaine négative → stop et révision »,
appliquée à un seuil de perte plutôt qu'à un calendrier.

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

Deux pièges rencontrés le 02/08, tous deux corrigés :

1. **`volByTf` incomplet** — il est reconstruit pour chaque module avec
   *uniquement ses propres timeframes de signal*. Pour day (`signal: ["4h"]`),
   `volByTf["15m"]` était `undefined` et le fallback retombait silencieusement
   sur le 4h : le patch n'avait rien changé. Corrigé dans `cerveau-central.js`,
   le timeframe du déclencheur est chargé s'il manque.

2. **Initialisation incohérente** — à l'ouverture d'une position,
   `lastCrossedZeroSeen` était initialisé avec le VWAP de `primaryVol` (4h)
   alors que la surveillance comparait contre le 15m. Le VWAP 4h étant en état
   « traversé » ~32 % du temps, le flag pouvait démarrer à `true` alors que le
   15m était à `false` — et le premier vrai front montant était manqué. Corrigé
   par `resolveVwapSource()`, fonction unique utilisée **aux deux endroits**.

Règle générale qui s'en dégage : **un état et sa surveillance doivent lire la
même source**. Les deux bugs viennent de la même faute.

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

⚠ **Le timeframe de signal ne pilote presque plus rien** (constaté le 02/08).
Recensement des usages de `primaryVol` dans `trade-simulator.js` :

| Usage | Dépend du timeframe ? |
|---|---|
| `trigger.lastPrice` (prix d'entrée/sortie) | **Non** — le Trigger lit le buffer de ticks |
| `trigger.priceHigh/priceLow` (suivi liquidation) | **Non** — idem |
| VWAP du déclencheur de tranche | Non — le 15m est utilisé (fallback seulement s'il manque) |

Les correctifs du 02/08 (VWAP sur 15m, liquidation sur suivi tick par tick)
ont vidé le TF de signal de sa substance sans qu'on s'en aperçoive. Passer le
module day de 4h à 1h ne changerait **aujourd'hui aucun comportement de
trading** — seulement l'affichage du scoring. La question redeviendra réelle
quand le portail de confluence sera reconnecté.

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

### Le « contexte » n'entre pas dans la décision

Les timeframes de contexte (4h pour scalp, 1d pour day, 4h+1w pour swing) sont
calculés et affichés, mais **explicitement exclus du score** — les logs le
disent littéralement : `[4h] DBSI: score=5 (contexte, hors score)`.

Le contexte existe donc pour la lecture humaine, pas pour la décision de
l'agent. À trancher : soit lui donner un poids réel, soit assumer qu'il est
purement informatif. Aujourd'hui c'est le second cas, sans que ce soit une
décision explicite.

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

1. **Re-demander la permission aux scores** — le plus juste. Écarté à
   l'époque pour une raison de ressources (relire les 6 CSV et rejouer le
   scoring à chaque tentative sur un VPS 512 Mo). **Cette contrainte n'existe
   plus** : le droplet est à 1 Go (vérifié le 02/08 — 480 Mo utilisés,
   481 Mo disponibles, pas de swap). Option à reconsidérer.
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

**Piste à tester au retour (02/08) : passer la période de 200 à 100.** Ses
retournements sont jugés trop tardifs à l'usage, ce qui est cohérent avec le
constat ci-dessus. La période se change dans les **paramètres de l'indicateur
sur TradingView**, donc côté collecteur iMac — et non dans `config.json`.
Conséquence à documenter le jour où ce sera fait : l'historique déjà collecté
reste en période 200, il y aura une **discontinuité dans les CSV** à la date
du changement.

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

**PRIORITÉ 1 — Vérifier que la collecte 15m est réparée.** Voir la section
Infrastructure. Tant que 10 à 49 % des bougies manquent, le régime
directionnel travaille sur des données trompeuses. Contrôle :
`grep -c FATAL mcb_tab2.log` doit cesser d'augmenter, et les horodatages de
`mcb_15m.csv` doivent s'enchaîner toutes les 15 min sans saut de 30.

**PRIORITÉ 2 — Mesurer l'effet des règles du 11/08.** Beaucoup a été ajouté en
une journée, presque rien n'a été observé :
- Les trois voies d'action tiennent-elles leurs 75 % / 62,5 % ?
- Le régime 15m bloque-t-il trop d'entrées ? (deux filtres cumulés)
- La prédiction par essoufflement se confirme-t-elle sur plus de 75 cas ?
Les motifs d'entrée portent `cadence_reversal_double` ou
`cadence_reversal_confirmed`, ce qui permet de les isoler.

**PRIORITÉ 3 — Calibrer `vwapLiveSlope`.** Le seuil « plat » à 1,0 est
arbitraire et manifestement mal calé (une valeur observée à 0,9989 tombait
pile à la limite). Attendre quelques heures de données, puis mesurer la
distribution comme pour les autres pentes.

Ensuite, par ordre décroissant :

1. **Timeout du collecteur** — 30 min est mal calibré pour un timeframe qui
   clôture toutes les 15 min. Le réduire à ~16 min diviserait les trous par
   deux, même si la cause racine n'est pas résolue.
2. **Différencier le levier par module** — 25x uniforme depuis le 04/08.
   Attention : sous ~25x, la liquidation devient inatteignable sur ces
   échelles de temps et cesse d'être un filet.
3. **Retirer le timeout anti-zombie** une fois l'invalidation validée
4. **Construire le vrai Shlong** (coexistence long+short)
5. **Reconnecter le portail de confluence**
6. **Scalp par les bypass**, avec assez de données pour trancher
7. **Swing par la vague MCB**

### Conflits et trous restants (inventaire du 11/08)

**Conflit — `vwapTriggerTimeframe` sur 15m.** Le déclencheur de tranche
« passage à zéro VWAP » utilise le 15m, qui ne change que toutes les 18 min.
Le passer en 3m le rendrait réellement actif, mais changerait le comportement
(sorties plus rapides). Laissé en l'état volontairement : le 15m filtre du
bruit, et ce choix mérite d'être comparé aux données face au pivot MCB.

**Trou — la vigilance ne s'éteint jamais.** Elle reste ouverte indéfiniment
jusqu'à ce qu'une action se déclenche. Mesure : délai médian de 16 cycles
(8 min) avant réaction, et un plafond à 7 cycles éliminerait 75 % des
réactions actuelles. Non corrigé — l'effet serait massif et n'a pas été
mesuré en termes de rentabilité.

**Trou — pas de filtre de tendance de fond au sens classique.** Le régime de
la vague 15m joue ce rôle depuis le 11/08, mais sur une échelle courte.

### Ce que le système ne sait PAS voir

Identifié le 11/08 en observant la lecture de Benjamin : il raisonne en
**comparaisons entre extremums successifs** — higher low, divergence,
touch-retest. Le code ne fait que des comparaisons à des seuils instantanés.

Un *higher low*, c'est comparer le creux actuel au précédent. Une *divergence*,
c'est comparer la direction du prix à celle de l'indicateur sur deux points.
**Aucun de ces deux mécanismes n'existe.** C'est probablement la prochaine
grande brique, d'une autre nature que tout ce qui a été fait jusqu'ici.

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
