# V3-LAB — corrections WHERE / MA200 / transfert adverse — 20/09/2026

## 1. Clarification des trades affichés
La page BOONO affiche l'historique de la journée. Le patch de cohérence précédent a été chargé vers 10:16 UTC / 12:16 Paris. Les trades visibles avant cette heure appartiennent donc à l'ancienne logique ; les quatre trades analysés dans le MW entre 13:31 et 15:44 Paris étaient les quatre premiers trades post-patch au moment de l'analyse. Un cinquième short a ensuite été produit à 16:20 Paris avant le présent patch.

## 2. Contrat WHERE corrigé
Principe validé par Benjamin :
- **LGI = lieu géométrique neutre**. Une LGI ne porte jamais, dans V3, une nature support/résistance et ne donne aucune direction long/short.
- Les **niveaux fixes** peuvent porter une sémantique directionnelle uniquement quand leur famille est explicitement `support` ou `resistance`. Les familles sans nature explicite restent des lieux neutres.
- La **MA200 15m** est intégrée comme niveau dynamique directionnel : sous le prix = support ; au-dessus = résistance. Tolérance d'interaction = `config.srZone.ma200TolerancePercent` (0,1 % actuellement).

Modifications :
- `modules/v3lab/layers/where.js` ignore désormais le champ legacy `nature` du catalogue LGI, recalcule `distanceUsd` et `side` depuis le prix live, et expose la MA200 15m.
- `modules/v3lab/layers/sequence.js` mémorise les LGI comme `neutralLocation=true`; seules les familles de niveaux explicites et MA200 alimentent `compatibleDirections`.
- La mémoire WHERE créée avant le patch est migrée à la volée : les anciennes preuves `LGI_SUPPORT/LGI_RESISTANCE` deviennent `LGI_LOCATION_MIGRATED` neutres.
- `modules/v3lab/layers/risk.js` ne peut plus contourner ce contrat via le simple booléen `where.relevant`; il consomme `sequence.continuation.locationReady`.

Observation historique vérifiée : les shorts de 15:18, 15:20 et 15:30 Paris étaient bien près de LGI autour de 80,47–80,48k. Ces LGI sont maintenant traitées comme lieux neutres ; elles ne sont donc ni un argument short ni un argument long. Le diagnostic précédent qui les qualifiait de support incompatible avec le short était erroné.

## 3. Sortie sur transfert adverse durable après MFE significatif
Problème live démontré : des trades pouvaient produire une MFE importante puis rendre la majorité du terrain alors que la dominance opposée était déjà durable et conservait le terrain, le moteur attendant encore le flip 15m ou l'invalidation structurelle.

Nouvelle sortie `EXIT_EXECUTION` dans `modules/v3lab/layers/action.js` lorsque, après confirmation de la thèse :
- dominance opposée `DOMINATION_PERSISTANTE` ;
- `proofScore >= 0.65` ;
- `retainedFraction >= 0.80` ;
- `persistCount >= 3` ;
- MFE significative : au moins `max(0.5 * risque structurel d'entrée, 0.25 * respiration p50)` ;
- au moins 50 % de cette MFE a été rendue.

Ce n'est pas un trailing stop fixe : la sortie combine maturité du trade, terrain rendu et transfert adverse durable. Les reversals encore `REVERSAL_FORMING` non confirmés restent exclus de cette nouvelle règle.

Replay des quatre trades post-patch précédemment analysés :
- long 13:31 Paris : sortie nouvelle simulée à 11:57:36 UTC / 13:57 Paris autour de 80428, soit ~+0,50 % levier au lieu de -0,94 % ;
- short 15:18 Paris : inchangé, invalidation structurelle avant transfert exploitable ;
- short 15:20 Paris : sortie transfert simulée vers 15:23:36 Paris, ~-0,06 % au lieu de -0,18 % ;
- short 15:30 Paris : sortie transfert simulée vers 15:40:37 Paris à 80452,5, ~+0,19 % au lieu de -0,56 %.

Un cinquième short (16:20–16:26 Paris, 80412,4 -> 80502,9, -1,125 % levier) n'aurait pas été sauvé par cette règle : l'invalidation structurelle reste la première sortie. Cela confirme que la correction ne résout pas toute la qualité d'admission.

## 4. Non modifié
Le gate de reversal exigeant un turning point 15m reste inchangé. Le cas du long manqué après transfert haussier demeure un objet d'étude pour le MW multi-jours ; aucune relaxation n'a été introduite sans preuve suffisante.

## Tests
- `tests/v3lab/coherence-regression.test.js` : OK
- `tests/v3lab/divergence-lineage-shadow.test.js` : OK
- `tests/v2/core-contract.test.js` : OK
- `tests/v2/simulator-v02-regression.test.js` : OK

Backup : `archives/v3lab-pre-where-transfer-fixes-20260920T143418Z`
