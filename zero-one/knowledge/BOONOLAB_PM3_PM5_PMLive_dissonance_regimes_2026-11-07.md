# BOONOLAB — Recherche PM5 / PM3 / PM Live et trois intensités de marché

**7 novembre 2026, période historique du 1er novembre au 7 novembre 19h55 CET.**
**Statut : analyse statistique rétrospective uniquement ; aucun changement PAPER, aucun filtre ou seuil de décision mis en service.**

## Données et méthode

- **19 661 snapshots V494 Elastic 30 s**, avec PM3, PM5, PM Live, qualité et prix ; archives complètes par segments. **19 544 relevés Bâton Audit14D**, 163 heures d'au moins 90 observations. Les trois PM ne sont pas des votes indépendants, car leurs horizons se recouvrent.
- **PM Live V494** est le déplacement enregistré par le Bâton, dont la fenêtre d'accumulation a une durée **variable** ; ce sont les snapshots Elastic qui sont pris toutes les ~30s. **PM Live V543** ajoute la variation depuis le Bâton sur les ticks 5s. Les deux sources peuvent donner des chiffres différents au même instant. On mesure les événements V494 de façon homogène ; #182 est vérifié à part avec le journal V543.
- Contradiction « trois chiffres » : |PM3|, |PM5|, |PM Live| **au moins 100 $ BTC chacune**, avec au moins un signe opposé. Les horizons +3, +15 et +45 minutes utilisent le prix réellement relevé au premier snapshot après l'échéance (tolérance 75s), sans interpolation ni connaissance future dans le signal.
- Le résultat est le déplacement de BTC dans le **sens de PM Live**, pas le P&L d'un trade. Comparer aussi si ce déplacement dépasse l'équivalent des frais taker aller-retour (0,1 % du BTC, environ 75–80 $), sans prétendre une exécution garantie.
- Pour limiter les répétitions d'une même zone agitée, on retient **le premier épisode puis une fenêtre d'exclusion de 45 minutes**. Cette déduplication peut aussi exclure de vrais retournements à l'intérieur d'une même heure. Les 25 occurrences brutes restent toutes listées ci-dessous.

## 1. Trois intensités : frontières du marché médian

Trois groupes non supervisés sur le logarithme des **débits agressifs médians horaires BTC/s** donnent les centres **0,145 / 0,352 / 0,865 BTC/s**. Deux frontières exploratoires : **0,226 BTC/s** (bas du médian) et **0,552 BTC/s** (haut du médian).

| Groupe | Débit médian horaire | Heures | Cadence médiane | Amplitude médiane 1h BTC$ | Efficacité net/chemin |
|---|---|---:|---:|---:|---:|
| **FAIBLE** | <0,226 | 46 | 2,58 | 151,1 | 7,53 % |
| **MÉDIAN** | 0,226–0,552 | 72 | 8,24 | 314,1 | 6,18 % |
| **FORT** | >0,552 | 45 | 17,78 | 543,2 | 6,55 % |

**Ces frontières sont des seuils au sens mathématique, PAS des seuils d'entrée/sortie à adopter.** Leur instabilité est déjà détectée : 1–4 novembre seuls, frontières **0,239 / 0,524** ; 5–7 novembre seuls, **0,236 / 0,804**. Avec le 7 novembre exclu, **0,277 / 0,731**. Il faut un étalonnage glissant sur les données antérieures et un test hors échantillon.

### Les six qualités de marché proposées

| Intensité | Productif (territoire réellement tenu) | Improductif (terrain rendu) |
|---|---|---|
| **Faible** | Progression lente mais persistante avec retests défendus (horizon 2h potentiellement nécessaire) | Marché stérile, petits mouvements opposés, coût économique des frais dominant |
| **Médiane** | Conversion régulière, progression et conservation du prix entre plusieurs vagues 15m | Va-et-vient, campagnes répétées et déplacement net faible malgré l'effort |
| **Forte** | Grande impulsion MCB/prix conservant du territoire au-delà des contre-attaques | Marché violent, parcours de prix énorme et retour de balancier qui annule la conquête |

Le **critère de qualité reste un chantier de validation** : comparer l'efficacité trajet net / trajet total, la rétention du meilleur déplacement, le délai de défense des frontières et les retests MA. Comme première **classification descriptive de l'heure terminée**, le script exige les médianes relatives de ces deux qualités **par groupe**, plus un déplacement net ≥75 $ BTC (ordre de grandeur des frais taker). Il compte **15/46 heures faibles**, **30/72 médianes**, **20/45 fortes** comme productives. Ce résultat est construit par une heuristique et n'est ni une probabilité de gain ni une autorité de trading ; une heure faible peut être productive en 2h sans atteindre 75 $ en 1h.

### Intensité du 1er au 7 novembre

| Jour | Débit horaire médian BTC/s | Heures classées FORT | Fait marquant |
|---|---:|---:|---|
| 1 nov. | 0,173 | 0 | Marché faible |
| 2 nov. | 0,416 | 5 | Reprise du niveau médian |
| 3 nov. | 0,397 | 8 | Niveaux médians et épisodes forts |
| 4 nov. | 0,670 | 14 | Journée la plus forte en médiane horaire |
| 5 nov. | 0,411 | 9 | Pics extrêmes jusqu'à **7,645 BTC/s** (horaire) |
| 6 nov. | 0,426 | 9 | Volatilité et contradiction, pic horaire 1,636 BTC/s |
| 7 nov. partiel | 0,139 | 0 | **18 heures faibles sur 20** |

Ce n'est pas une progression uniforme de mercredi à vendredi : le **pic extrême du 5 novembre** contraste avec une médiane journalière inférieure à celle du 4. La rareté de transactions agressives du 7 novembre **ne démontre pas** une faible profondeur passive du carnet. Les données de liquidations forcées, spread et profondeur L2 ne figurent pas dans la source.

## 2. Signature de trois PM à trois chiffres

| Motif | Nombre de snapshots 30s |
|---|---:|
| Tous PM alignés (contrôle descriptif) | **129** |
| **PM Live opposé à PM3 ET PM5**, ces deux derniers alignés | **23** |
| PM3 et PM Live alignés contre PM5 | **1** |
| PM5 et PM Live alignés contre PM3 | **1** |
| **Toutes combinaisons à trois chiffres** | **154** |

Seuls **25 relevés** présentent donc une dissonance, et seulement **11 épisodes sans recouvrement 45m** dans l'ensemble des contradictions. Dans le motif principal, dix des onze épisodes relèvent d'une intensité FORT, un de MÉDIAN ; aucun FAIBLE. Une forte dissonance absolue des trois PM **ne permet pas d'étudier la reprise silencieuse** d'un marché où les mouvements restent sous 100 $ BTC.

### L'issue du motif principal, après déduplication 45 minutes

| Horizon | Suite favorable au sens PM Live | Médiane signée BTC$ | Déplacement > frais théoriques |
|---|---:|---:|---:|
| **+3 min** | **2/11 (18,2 %)** | **−41,2** | 1/11 |
| **+15 min** | **4/11 (36,4 %)** | **−44,1** | 3/11 |
| **+45 min** | **6/11 (54,5 %)** | **+21,9** | 4/11 |

Sur les **23 relevés bruts** du motif principal, non indépendants : **9/23**, **10/23**, **11/23** favorables à +3, +15, +45 min, respectivement. Le contrôle de 35 épisodes espacés de 45m où **les trois PM étaient alignés** donne 14/35, 17/35, 15/35 ; ces deux cohortes ne sont **pas appariées selon l'heure ou le régime** et ne démontrent pas un effet causal.

La sensibilité à la sélection est forte : si le seuil des trois PM est abaissé à 75 $ BTC, **10/23 épisodes** orientés vers PM Live sont favorables à +3min ; au seuil 100 $, seulement **2/11** ; au seuil 125 $, **1/5**. Nous ne devons pas optimiser ces seuils après avoir observé les résultats.

## 3. Inventaire exhaustif des 25 dissonances

Une valeur positive de Δ signifie que le prix a évolué **dans le sens de PM Live**. Négative : prix contraire à PM Live. Dates/heures CET ; PM et écarts en **$ de cours BTC**, pas P&L.

| Date / heure | PM5 | PM3 | PM Live | Forme | Δ+3m | Δ+15m | Δ+45m |
|---|---:|---:|---:|---|---:|---:|---:|
| 11-02 14:38 | +490.6 | +451.9 | -117.1 | Live ≠ 3/5 | -24.6 | +141.9 | +261.5 |
| 11-04 04:03 | -474.2 | -134.8 | +112.6 | Live ≠ 3/5 | -41.2 | +19.6 | +360.3 |
| 11-04 05:55 | +143.1 | +187.3 | -102.4 | Live ≠ 3/5 | -1.8 | -10.7 | -315.6 |
| 11-04 06:52 | +156.2 | +158.0 | -134.4 | Live ≠ 3/5 | +109.9 | +154.7 | +21.9 |
| 11-04 16:06 | +733.8 | +652.5 | -172.3 | Live ≠ 3/5 | -260.8 | -451.0 | -152.3 |
| 11-04 16:11 | +264.4 | +125.8 | -134.9 | Live ≠ 3/5 | -248.9 | +127.7 | +300.7 |
| 11-04 16:21 | -176.4 | -140.2 | +119.6 | Live ≠ 3/5 | +7.5 | -158.4 | -420.3 |
| 11-04 16:45 | -231.0 | -113.6 | +122.3 | Live ≠ 3/5 | +155.4 | +114.5 | +183.6 |
| 11-04 16:50 | +105.2 | +156.9 | -104.1 | Live ≠ 3/5 | +97.3 | +137.4 | -138.3 |
| 11-05 00:02 | -212.5 | -158.3 | +105.1 | Live ≠ 3/5 | -9.3 | -44.1 | +124.4 |
| 11-05 15:42 | -129.0 | -144.5 | +130.8 | Live ≠ 3/5 | -207.7 | -793.1 | -2833.4 |
| 11-05 16:02 | -325.6 | -338.2 | +174.1 | Live ≠ 3/5 | -265.3 | -366.1 | -1682.8 |
| 11-05 16:07 | -202.3 | -164.5 | +148.8 | Live ≠ 3/5 | -408.7 | -598.1 | -2058.6 |
| 11-05 16:11 | -368.6 | -349.3 | +137.5 | Live ≠ 3/5 | -207.4 | -672.0 | -1342.7 |
| 11-05 16:12 | -450.7 | -210.1 | +218.9 | Live ≠ 3/5 | +64.6 | -903.4 | -1137.0 |
| 11-05 16:18 | +276.7 | +242.0 | -148.4 | Live ≠ 3/5 | +216.6 | +779.0 | +1409.0 |
| 11-05 16:19 | +286.7 | -139.1 | -129.8 | 3 + Live ≠ 5 | +440.0 | +803.2 | +1663.1 |
| 11-05 16:43 | -125.7 | -118.3 | +126.2 | Live ≠ 3/5 | -289.0 | -442.6 | +269.6 |
| 11-05 16:53 | -549.8 | -277.7 | +104.8 | Live ≠ 3/5 | +497.0 | +101.1 | +1078.9 |
| 11-05 16:57 | +376.7 | +175.2 | -141.0 | Live ≠ 3/5 | -84.9 | -119.6 | -721.0 |
| 11-06 14:32 | -121.9 | -201.4 | +139.6 | Live ≠ 3/5 | +6.6 | +92.1 | -209.4 |
| 11-06 15:39 | +361.9 | +145.1 | -157.8 | Live ≠ 3/5 | -235.5 | -250.1 | +69.3 |
| 11-06 16:06 | -296.3 | -125.4 | +166.5 | Live ≠ 3/5 | +95.5 | +458.4 | +665.4 |
| 11-06 16:08 | -142.6 | +189.4 | -187.9 | 5 + Live ≠ 3 | -160.3 | -516.9 | -617.2 |
| 11-06 16:41 | +173.3 | +103.9 | -123.9 | Live ≠ 3/5 | -135.0 | -225.9 | -258.6 |

## 4. Deux cas qui interdisent un EXIT automatique sur la seule contradiction

**#182 SHORT, 6 novembre 16h06m44s** : PM5 **−296,3**, PM3 **−125,4**, PM Live V494 **+166,5** au prix BTC 75 146,1. Le déplacement du marché **vers le haut** atteint **+95,5 $ à 3min, +458,4 $ à 15min et +665,4 $ à 45min**. La décision V543 du 16h06m39s relève PM Live **+217,2**, PM3 **−128,9**, PM5 **−303,8** (différence normale des granularités 5s et 30s). Le SHORT avait déjà conquis environ 1 001,5 $ BTC depuis son entrée et rendu **206,6 $ BTC en 60 secondes** : cette dissonance est une **alerte potentiellement utile pour protéger une avance majeure**, bien avant la confirmation E15 ultérieure. Elle était toutefois précédée d'autres contre-attaques qui n'ont pas mis fin à la baisse.

**#173 SHORT, 5 novembre 15h42m12s** : dans le flux homogène **V494 30s**, PM5 **−129**, PM3 **−144,5**, PM Live **+130,8**, donc **exactement la même signature de marché** dans CETTE source. Le prix a ensuite évolué **contre PM Live** : **−207,7 $ à 3min, −793,1 $ à 15min et −2 833,4 $ à 45min**. Le SHORT PAPER #173 a ensuite produit **+51,03 $ de P&L net**. **Attention à la source :** la décision 543 la plus proche (~8 s avant) donnait PM3 **−28,3**, PM5 **−100,5**, PM Live **+138,5** : les signes concordent, mais **les trois valeurs ne sont pas toutes à trois chiffres pour V543**. Le cas prouve que la contre-attaque ponctuelle peut se tromper et ne justifie pas un EXIT automatique ; il ne prouve pas qu'une règle strictement triple 100 appliquée sur V543 aurait fermé ce trade.

La distinction à explorer est donc **maturité de la campagne et extension déjà réalisée + reprise adverse relative + territoire accepté**, et pas seulement le signe des PM. Pour un SHORT à peine ouvert, PM Live UP peut être une respiration ; pour un SHORT après 1 000 $ de chute et un rebond de 200 $ en 60s, elle mérite une attention très différente.

### Contrôle croisé V494 (30s) / V543 (journal des décisions événementielles)

Les journaux de décisions V543 ne sont **pas un enregistrement PM complet toutes les 5s** et les segments antérieurs au 5 novembre ont été rotatifs. Sur les 25 dissonances V494 depuis le 1er novembre : **10 cas** avaient une décision V543 antérieure à moins de **90 secondes** avec les trois PM lisibles, **5** étaient trop éloignées dans le temps, et **10** n'avaient pas de décision précédente disponible dans les segments actuels. Parmi les dix comparaisons utilisables, les trois signes concordent **4 fois**, divergent au moins une fois **6 fois**. Ces désaccords reflètent surtout la rapidité des PM et les différences d'horloge / de sources : **ne pas confondre une statistique V494 avec les véritables signaux simultanés de V543**. Ce contrôle est qualitatif et non une preuve que l'une des deux sources est fausse.

## 5. Définition exacte des qualités Elastic déjà utilisées

Le code **modules/v4/experiments/elastic-observer-shadow.js** travaille avec **effort et rendement relatifs aux références P75/P95**, pas avec la profondeur de carnet.

| Qualité | Critère réellement codé | Ce qu'elle ne démontre pas |
|---|---|---|
| **SILENT** | Effort < P75, rendement < P75 | N'est pas une preuve de progression silencieuse productive |
| **INEFFICIENT** | Effort ≥ P75, rendement < P75 | N'est pas une condamnation de la campagne entière |
| **PRODUCTIVE** | Rendement ≥ P75, effort insuffisamment qualifié | Ne dit pas si le mouvement est déjà tardif |
| **EASY** | Rendement ≥ P75, effort < P75 | N'est pas automatiquement la meilleure entrée |
| **POWERFUL** | Rendement ≥ P75, effort ≥ P75 | Ne dit pas si le mouvement peut encore se poursuivre |
| **EXCEPTIONAL** | Rendement ≥ P95, indépendamment de l'effort | Ne garantit pas une direction nouvelle, ni une sortie |
| **CONTESTED** | **PM3 et PM5 de signes opposés** | **N'inclut pas le conflit PM Live contre les deux !** |
| **ABSORBED / EXHAUSTED** | Hypothèses temporelles, effort élevé sans rendement après état antérieur inefficace/productif | Demandent plusieurs observations et ne constituent pas un régime de liquidité |
| **UNCLASSIFIED** | Informations insuffisantes | Ne peut être rempli par supposition |

**Lacune constatée :** PM Live opposé aux deux PM peut être étiqueté **POWERFUL** (#182) ou **EXCEPTIONAL** (#173) parce que le classifieur de conversion ne déclare CONTESTED que lorsque **PM3 s'oppose à PM5**. Il faut donc conserver une dimension événementielle **DISSONANCE_PMLIVE** séparée, avec horodatage, maturité E15, position éventuelle et territoire déjà conquis, sans écraser le vocabulaire historique Elastic.

Les états DORMANT, CHOP_SHADOW, LOW_EDGE_SHADOW, MIXED, DIRECTIONAL de la qualité de marché V493 sont **une autre classification** : fenêtre de prix, efficacité net / chemin et fréquence des inversions. Aucun de ces états ne mesure directement la liquidité passive.

## 6. Confrontation au graphique fourni : début de reprise ou nouvelle campagne ?

Le screenshot de ~18h11 montre une consolidation BTC vers 75,6–76 k$, sous une **MA rouge encore descendante** et une zone de résistance vers 76 580 $. La **double divergence haussière proposée par l'utilisateur** est une hypothèse visuelle plausible de rééquilibrage : il faut encore établir les deux paires d'extrêmes prix/LBW (et distinguer divergence classique/cachée), vérifier les horodatages et surtout la reconquête du prix. **Ne pas inférer une reprise confirmée de cette seule image.**

| 7 novembre CET | BTC | Débit 1h BTC/s | Net / trajet 1h | LBW15 Live | MF3 Live | MF15 Live |
|---|---:|---:|---|---:|---:|---:|
| 18h11 | 75 742,5 | 0,130 | +5,6 / 708 $ (0,8 %) | −59,81 | −13,90 | −11,47 |
| 18h45 | 75 820,7 | 0,094 | +67 / 564 $ (11,9 %) | −31,81 | −11,65 | −8,19 |
| 19h45 | 75 802,5 | 0,083 | −18,2 / 302 $ (6,0 %) | −1,43 | +11,26 | −0,94 |

Les oscillateurs se redressent alors que la consolidation de prix n'a pas encore produit de rupture. **Un marché faible peut préparer silencieusement une transition productive**, mais nos critères actuels ne doivent pas déclarer une nouvelle tendance en utilisant seulement la remontée de LBW/MF.

## 7. Protocole suivant, sans surajuster les moteurs

- **D'abord**, laisser les bornes d'intensité (0,226 / 0,552 BTC/s) comme référence expérimentale dans l'analyse. Les recalibrer sur une **fenêtre passée** et comparer les six états de marché sur plusieurs semaines, y compris les marchés de faible volume qui développent lentement des tendances sur 2h.
- **Ensuite**, étudier les PM en dissonance dans le contexte E15 : âge, MFE conquis, vitesse/fraction du giveback en 60s, nouveau prix défendu, opposition MF persistante ; garder #173 **comme contre-exemple à la sortie**, et #182 comme avertissement exploitable.
- **Enfin**, chercher les contradictions de **force relative au régime** (par exemple variation PM Live supérieure à sa propre référence P75) : la signature absolue à trois chiffres est absente le 7 novembre et manquerait précisément la transition silencieuse étudiée. Ne pas la transformer en nouveau seuil autoritaire.

**Résultat actuel :** il existe bien des signatures fortes et des frontières médianes mesurables, mais aucune règle profitable ne peut encore être revendiquée. Analyse et fichiers reproductibles uniquement ; pas d'impact sur les moteurs PAPER 494/543.

**Reproduction :** scripts/boonolab_pm_dissonance_study_20261107.py ; données détaillées (163 heures et 25 dissonances) : knowledge/BOONOLAB_PM_dissonance_study_results_2026-11-07.json.
