# BOONO — Compte rendu trades nuit 29→30/09/2026

Fenêtre analysée : 29/09 21:31Z → 30/09 06:55Z (23:31→08:55 Paris).
Config : `V3EXP-20260929-E15SEM-R1.1-MAJORLOBE`.
Aucune modification de code ou seuil dans cette revue.

## Résultat brut

13 trades fermés :
- 3 gagnants / 10 perdants ;
- P&L cumulé simulé x10 : **-7.5397 %** avant frais ;
- profit factor : **0.123** ;
- MFE cumulé : **1451.1 $** ;
- MAE cumulé : **952.0 $**.

Directions :
- 2 LONG ;
- 11 SHORT.

Sorties :
- 12 `EXIT_EXECUTION` ;
- 1 `EXIT_RISK`.
Sur les 12 EXIT_EXECUTION, **11** sont :
`dominance opposee + respiration > p90 du regime`.
La seule autre EXIT_EXECUTION utilise le transfert adverse + giveback.

## Séquence de campagnes

23:31 Paris LONG 83400.1→83409.1 : +0.108 %, MFE 114.7 $, sortie P90.
00:31 SHORT 83533.4→83708.4 : -2.095 %, EXIT_RISK, MFE 32.2 $.
01:05 LONG 83732→83591 : -1.684 %, sortie P90, MFE 84.7 $.

Puis 10 SHORT successifs entre 02:45 et 08:55 Paris :
résultat cumulé **-3.8687 %** malgré une direction globale baissière.
## Campagne SHORT 02:45→08:55 Paris

Premier short : 83400.
Dernière sortie : 83144.6.
Le déplacement direct entre ces deux points est ~255.4 $ favorable au SHORT,
soit environ **+3.06 % x10** pour un maintien continu purement illustratif.

Sur la même fenêtre audit :
- minimum ~82935.3 ;
- maximum ~83579.6 ;
- MFE potentiel depuis 83400 ~464.7 $ ;
- MAE potentiel ~179.6 $.

Ce contre-factuel n'est pas une stratégie additionnable aux trades réels,
mais démontre que la multiplication sortie/réentrée a détruit une translation directionnelle exploitable.

## EXIT P90 — fréquence

11/13 trades totaux, soit 84.6 %, sortent sur la règle P90.
11/12 EXIT_EXECUTION, soit 91.7 %, utilisent cette même raison.

P&L cumulé des 11 trades sortis par P90 : **-6.3674 % x10**.

Après ces sorties, dans le sens ORIGINAL du trade :
- 10/11 ont encore offert >=100 $ d'excursion favorable dans l'heure ;
- excursion favorable max médiane à +60 min : ~217.3 $ ;
- résultat directionnel à +60 min positif dans 9/11 cas ;
- résultat à +60 min médian depuis le prix de sortie : ~+109.7 $.
## Artefact P90 identifié

Dans `risk.js`, la "respiration" n'est pas mesurée depuis l'entrée du trade.
Elle utilise :
`wave.price.counterExcursionUsd`,
donc la contre-excursion du PRICE PATH depuis l'ancre E15 courante.

Le seuil P90 n'est pas non plus "du régime" :
il est calculé sur les amplitudes d'un zigzag prix (seuil 50 $)
des 12 dernières heures, tous régimes mélangés.

Puis `action.js` fait simplement :
opposite dominance persistante + `respiration.currentState === UNUSUAL`
=> `EXIT_EXECUTION`.

Conséquence démontrée :
le trade peut ENTRER alors que la respiration wave-level est déjà UNUSUAL,
puis sortir dès le prochain flip local de dominance.

Cas :
- trade #128 LONG entre avec counter 277.7 > P90 256.8 ;
- trade #137 SHORT entre avec 217.3 > 198.9 ;
- trade #139 SHORT entre avec 249.2 > 198.9.

La sortie P90 est donc parfois un "hair trigger" pré-armé avant même l'entrée.
## Churn / absence d'hystérésis

V3 n'a aucun cooldown explicite dans les modules v3lab.
Après une sortie P90, la dominance peut se réaligner quelques minutes plus tard,
ce qui réautorise une nouvelle entrée dans la même phase.

Exemples de réentrées SHORT :
03:25 sortie → 03:30 nouvelle entrée ;
04:02 sortie → 04:07 entrée ;
04:13 sortie → 04:24 entrée ;
04:26 sortie → 04:30 entrée.

Le système transforme ainsi une campagne directionnelle en séries de petits trades,
avec pertes, frais potentiels et giveback répétés.

## Deuxième anomalie structurelle exposée

Après le premier trade, la majorité de la nuit n'est PAS sous une thèse E15 majeure ACTIVE.
Le couple CREUX 21:45Z LBW -1.42 → CRETE 23:15Z +50.27
n'a qu'un span ~51.69 (<80), donc `structural.status=OBSERVING`, direction nulle.

Malgré cela, `risk.js` retombe en fallback sur `wave.direction`
et autorise des `PHASE_CONTINUATION` SHORT.

Ainsi, 10 shorts successifs sont admis sur la phase DESCENTE
alors que la relation E15 majeure n'est pas validée.
Cela doit être comparé au contrat Benjamin :
les E15 intermédiaires / petits lobes sont respiration ou bruit, pas structure majeure automatique.
## Cas où P90 a été utile

Le P90 n'est pas universellement mauvais.
Le LONG 83732→83591 (01:05→02:08 Paris) sort à -1.684 % ;
dans les 15 min suivantes le marché fait encore environ -204 $ contre le LONG.
Ici la sortie a clairement contenu une détérioration.

Donc la conclusion n'est pas "supprimer P90".
La question est de distinguer :
- respiration wave-level déjà ancienne ;
- giveback propre au trade ;
- opposition micro temporaire ;
- véritable transfert adverse.

La sortie #133, basée sur transfert adverse + giveback du MFE,
est sémantiquement plus proche de cette distinction :
SHORT 83449.3→83372.3, +0.923 %, MFE 191.3 $, giveback ~114.3 $.

## Conclusion

[DÉMONTRÉ] La règle P90 domine anormalement la gestion de sortie et provoque du churn.
[DÉMONTRÉ] Son état est wave-level, pas trade-level, et peut être UNUSUAL avant l'entrée.
[DÉMONTRÉ] Le libellé "P90 du régime" est faux.
[DÉMONTRÉ] La grande campagne SHORT était directionnellement exploitable mais économiquement détruite par les sorties/réentrées.
[ARTEFACT LOGIQUE] Quand structural=OBSERVING, le fallback wave.phase continue d'autoriser des trades sur des lobes non majeurs.
[À ÉTUDIER] Remplacer le rôle EXIT du P90 brut par une logique trade-aware :
MFE/giveback + transfert adverse + maturité + événement violent/reclaim, sans supprimer son rôle de signal de risque.

## Suite validée — R1.2

Benjamin valide la correction immédiate :
P90 est rétrogradé de sortie autonome à alerte d'attaque adverse pour les nouvelles positions.

Implémentation :
`V3EXP-20260930-P90ALERT-R1.2`.

Ajout du `combat-ledger-shadow-v0.1` pour mesurer :
bull/bear terrain, microstructure ticker, retracement des attaques, réabsorption et nouveaux extrêmes.

Une position R1.1 déjà ouverte est grandfathered sous l'ancienne règle jusqu'à sa fermeture,
afin de ne pas changer la gestion d'un trade en cours.
