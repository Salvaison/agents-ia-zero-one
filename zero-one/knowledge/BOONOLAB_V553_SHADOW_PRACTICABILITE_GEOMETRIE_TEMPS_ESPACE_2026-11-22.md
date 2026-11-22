# BOONOLAB — Géométrie du temps/espace dans V553 et SHADOW de praticabilité

**22 novembre 2026, environ 19h30 CET.**
**ÉTAT : SHADOW expérimental en production, aucune modification de V553 PAPER, du broker, de Watch ni de BOONO-TV.**

## Intention utilisateur

L'utilisateur décrit une reconnaissance de la FORME ENTIÈRE des trajectoires BW15 et LBW15 : niveau de vague, courbure, vitesse propre des deux lignes, angle relatif de leurs tangentes au croisement, naissance/persistance/rejet du Cross15 Live et résolution économique du mouvement par le prix et PM/MF. Il souhaite une interprétation numérique comparable à ce qu'il voit immédiatement sur le graphe, et la mesure par SHADOW de la fraction du marché qu'une politique de praticabilité pourrait suspendre aux NOUVELLES entrées.

**Précision essentielle :** V553 PAPER comprend une chronologie locale, mais PAS encore la forme entière d'une vague. Ce travail crée les instruments pour évaluer l'écart, sans prétendre qu'ils possèdent déjà une autorité décisionnelle.

## 1. SHADOW de praticabilité v0.1 : résultats réels

Implémentation : modules/attention/boonolab-market-practicability-shadow.js ; replay historique : scripts/boonolab-practicability-shadow-replay.js. Module hébergé dans le PM2 EXISTANT boono-market-regime-shadow, avec try/catch indépendant : pas de nouveau moteur, aucun ordre et aucune mutation du ledger V553.

Historique Bâton as-of du 20 novembre 16h au 22 novembre 19h22, 6165 relevés de 30s couverts, E1/E4 uniquement à clôture confirmée, sans faire fuiter les niveaux manuels futurs. Mesures : variations de signes Cross15/MCB3, proximité BW/LBW, qualité prix/chemin, rétention, contradiction E1/E4, réponse du prix, MF15, effort volumique observé. Trois variantes purement exploratoires :

| Variante | Relevés signalés « non praticables » |
|---|---:|
| STRICT_3_FAMILIES : géométrie instable + économie faible + conflit supérieur | **2,76 %** |
| GEOMETRY_CONVERSION : géométrie instable + économie faible | **13,53 %** |
| GEOMETRY_OR_SLOW : économie faible + (géométrie instable OU conflit lent) | **23,63 %** |

Deux fenêtres : 21 novembre 17h–23h = 4,44 / 22,08 / **35,56 %** ; 22 novembre 12h–17h = 7,50 / 18,50 / **34,83 %** dans le même ordre. Ces pourcentages sont la fraction d'observations qualifiées, PAS une performance, et ne constituent pas des seuils admissibles en PAPER.

**Test d'utilité négatif :** rapprochement as-of à 36 entrées de #33 à #68. Le profil strict ne signale que #55 perdant. Les deux profils plus larges signalent #38 et #56 GAGNANTS et #55 et #57 perdants. Aucun des trades perdants #62–#66 n'est signalé à son entrée. Il serait incorrect d'en déduire un profit de trades supposément évités. **Aucune variante de v0.1 ne doit commander V553.** Il manque une mémoire d'épisode de marché durable, au-delà d'une fenêtre 30 minutes, et une qualification du lieu et de la maturité économique.

Fichiers observateurs seuls : data/boonolab-practicability-shadow-state.json, -summary.json, -samples.ndjson, -events.ndjson et -replay-report.json. Version du modèle de fermeture : boonolab-market-practicability-geometry-shadow-v0.1, decisionImpact=false, brokerOrdersEnabled=false.

## 2. NOUVELLE signature numérique de la FORME ENTIÈRE des courbes

Suite à l'exigence utilisateur (« je considère toute la ligne »), ajout du module PURE modules/attention/boonolab-wave-geometry.js ; version boonolab-wave-geometry-signature-v0.1. La signature utilise **jusqu'à 8 heures de trajectoire LBW15/BW15 Bâton as-of** : il ne prétend PAS qu'une vague entière tienne toujours dans ces 8 heures.

Elle enregistre :
- Positions absolues des deux courbes, écart LBW−BW, position normalisée de LBW dans son amplitude observée des 8h, derniers minimum/maximum et leur âge ;
- Vitesses séparées de LBW et BW sur **3, 15 et 60 minutes** en unités MCB/min, vitesse relative d'ouverture de l'écart ;
- Accélérations/discontinuités de vitesses entre deux sous-fenêtres de 3 minutes, en unités MCB/min² ;
- Angle de tangente de chaque courbe et **angle relatif entre tangentes**, avec calibration **explicitée** : 15 minutes sur l'axe horizontal, amplitude LBW observée sur 4 heures sur l'axe vertical. **Cet angle normalisé n'est PAS un degré d'écran TradingView**, qui dépend du zoom et des axes ; les angles obtenus avec des références d'amplitude différentes ne sont pas immédiatement comparables sans recalibration ;
- Succession des derniers segments UP/DN de LBW, leurs durées, déplacements LBW/BW et déplacements BTC, plutôt que le seul dernier point ;
- Dernier Cross15 Live observable : sens, instant, âge, angle relatif et prix/MF15 au croisement, réponse BTC depuis celui-ci, meilleure excursion favorable/adverse et part du déplacement conservé ;
- Fréquence des croisements dans l'heure, fraction de temps passée très près du contact des deux courbes, longueur d'historique réellement observée et réserves sur les faux contacts à 30s.

Signature observée en continu et isolée : ajout du champ waveGeometry aux futurs états et échantillons SHADOW ; **aucune lecture de ce champ par V553 PAPER**. Étude de cas : scripts/boonolab-wave-geometry-case-study.js ; 30 signatures d'entrée et de sortie as-of stockées uniquement dans data/boonolab-wave-geometry-trade-cases-asof.json, sans utilisation des résultats de trade dans la construction de la signature d'entrée. La comparaison des P&L est faite APRÈS.

### Exemples utiles de géométrie réelle au moment de l'entrée

| Trade | Résultat net PAPER | LBW15 vitesse 3m (MCB/min) | LBW15 vitesse 15m (MCB/min) | Angle relatif normalisé actuel | Position LBW dans son range observé 8h |
|---|---:|---:|---:|---:|---:|
| #43 SHORT | **+74,97 $** | **−3,072** | −0,846 | −18,46° | 0,626 |
| #58 SHORT | **+23,94 $** | −0,277 | **+0,102** | −1,65° | 0,239 |
| #61 LONG | **+40,04 $** | +0,921 | +0,581 | +10,87° | 0,466 |
| #62 LONG | −2,35 $ | +0,080 | **−0,245** | +0,39° | **0,899** |
| #63 LONG | −3,96 $ | +0,235 | **−0,149** | +1,13° | **0,884** |
| #64 LONG | −4,18 $ | +0,417 | **−0,254** | +2,16° | **0,862** |
| #65 SHORT | −9,06 $ | −0,741 | **−1,741** | −8,54° | 0,706 |
| #66 LONG | −5,91 $ | +1,134 | +1,891 | +6,77° | 0,442 |

Données de forme AS-OF : #62/63/64 LONG ont une légère inflexion LBW positive sur 3m, mais toute la trajectoire de 15m reste descendante ; pas de véritable Cross15 Live LONG au moment de l'entrée, MCB15 gap toujours SHORT. Ils sont proches de la crête de leur range LBW des 8 heures (0,86–0,90), avec une fraction de temps proche du contact BW/LBW d'environ 87–98 % sur l'heure précédente : leurs figures ont une structure de **réactions locales dans un milieu non prouvé productif**.

#43, à l'inverse, montre une vitesse vendeuse forte et une courbure de transfert plus nette, ensuite productive sur BTC.

**Contre-exemples indispensables** : #58 réussit avec un angle initial faible et une pente LBW15 sur 15m encore positive ; c'est PM/MF/prix et l'évolution ultérieure qui ont confirmé l'histoire. #65 échoue avec une géométrie vendeuse prononcée, car E1/E4 et conversion prix contredisaient la poursuite. #46 réussit lui aussi avec une pente3m faible et une grande proximité BW/LBW. **Ni l'angle ni la vitesse seuls ne prédisent les gains.**

L'angle normalisé est une représentation numérique de la figure et un outil d'investigation ; l'interprétation économique doit vérifier la durée de maintien après Cross, les rejet/retours, MF15/MCB3, le lieu dans la vague et la traduction du prix.

## 3. AUDIT de la compréhension réelle du temps dans V553 PAPER

Le code actif est inchangé : modules/v553/{decision,market,paper}.js.

| Critère | Mesuré/mémorisé ? | Pouvoir décisionnel ACTUEL |
|---|---|---|
| E15 parent et horaire de confirmation | Oui | Existence requise, pas direction imposée |
| Horodatage de naissance de candidature après inflexion LBW15 | Oui | Nouvelle chaîne et anti-recyclage d'avant sortie |
| Pente LBW15 sur 3m, BW15 sur 3m, changement d'écart | Oui | Signe de LBW15 et écart favorables requis ; BW/15m slope surtout descriptive |
| Horodatage premier Cross15 Live, prix et gap à ce moment | Oui | Utilisé pour compter les observations et la séparation après Cross |
| Nombre de preuves consécutives positives | Oui | **2** preuves souvent suffisantes (pas de durée de maturation proprement dite) |
| Rejets Live, extrêmes de prix dans la chaîne | Oui | Rejet remet à zéro la persistance ; extrêmes peu exploités pour admission/sortie |
| Vitesse normalisée par durée, angle des tangentes et accélération de courbe | Non dans PAPER | **SHADOW seulement désormais** |
| Chronologie de la vague entière, crête, creux, hauteur et dernier segment | Pas comme figure complète | **SHADOW seulement désormais** |
| MF15 pente10m et MF3 pente3m | Mesurées | Descriptives uniquement : aucun arbitre réel dans entryReview et exitReview |
| E1/E4 parent, BigRange, divergences MCB4 | Disponibles dans SHADOW séparé | Aucune autorité d'admission V553 |
| Temps réel pente→Cross et temps de persistance Live | Date et nombre d'échantillons disponibles | Non utilisés comme score temporel/maturité continu |
| Prix/PM signé depuis la candidature, gap directionnel et MCB3 | Oui | Autorité réelle ENTER et EXIT ; PM fenêtre issue de Bâton, pas profondeur L2 |
| Protection structurelle LBW15 pente contraire avant Cross15 Live | Observation oui | **early=false** : pas de sortie autonome pré-Cross Live |
| Cross15 confirmé + MCB3/PM adverse | Oui | Peut ordonner sortie |
| Hard risk adverse BTC prix -500 USD | Oui | Protection de dernier recours indépendante des lignes |

Mesures sur 36 trades #33–#68 : médiane de **64,2 secondes** entre début de candidature et entrée ; 12 entrées avant Cross15 Live, 1 sur premier relevé Live, 23 après au moins deux ; 16 sorties sur Cross15 Live, 17 sur confirmé, 3 hard-stops. V553 comprend un **enchaînement local d'événements**, pas encore la géométrie complète vue par l'utilisateur.

Bogue de contrat connu dans la permission émergente, NON MODIFIÉ : market.js lit chain.live15At au lieu du champ réel firstLiveAt. Des entrées pré-cross peuvent ainsi contourner la preuve Live. Corriger ce bug avec un unique veto « pas de Cross » bloquerait de bonnes anticipations #38/#46.

## 4. Proposition d'architecture à tester, pas à déployer en PAPER pour le moment

- **Forme globale** : reconstruire l'ensemble de la vague MCB depuis les derniers parents E15, pas uniquement les 3m. Placer les extrêmes, l'amplitude, la maturation et la vitesse relative.
- **Chronologie géométrique** : avant Cross (approche/convergence), contact, angle et accélération, persistance/separation, rejet et recross, confirmation.
- **Résolution économique** : effort/rendement et prix conservé entre ces jalons ; MF15/MF3 appui secondaire plutôt qu'un veto absolu ; espace E1/E4 et BigRange positionne l'offensive.
- **Deux histoires distinctes** : la chaîne causale propre à chaque trade et l'épisode de praticabilité du marché où s'enchaînent des tentatives avortées. Les frontières du marché restent observables même quand BOONO est FLAT.

Le prototype actuel à base d'une fenêtre glissante 30 minutes n'est PAS la mémoire d'épisode nécessaire ; il offre surtout un résultat de falsification : trop peu de mauvaises admissions reconnues et certains bons trades potentiellement bloqués.

## Tests et opérations

- Tests unitaires supplémentaires tests/boonolab-wave-geometry.test.js : as-of sans fuite future, amplitude et pente multi-horizons, angle normalisé, pseudo-courbure, géométrie attachée au SHADOW uniquement, cas historiques #58 et #65.
- Contrôle de l'observateur historique, du SHADOW E1/E4/lieu et des tests de non-régression V553/V552 et interfaces : **153 tests PASS, 0 FAIL**, y compris la signature de forme et les cas historiques #58/#65.
- Le SHADOW tourne dans le service EXISTANT boono-market-regime-shadow, à cadence observation ~10s. Le champ waveGeometry est vérifié dans les nouveaux états et la summary prospectifs ; 30 signatures d'entrées et de sorties sont archivées à part. Les échantillons chiffrés de forme sont conservés dans ce même domaine observateur, sans changer son contrat versionné de décision PAPER.
- Aucune modification des comptes V553/V543, de l'interface BOONO-TV, des ordres ou d'un broker financé. V552 reste arrêté.
