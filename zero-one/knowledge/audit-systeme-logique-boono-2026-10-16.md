# Audit BOONO — systèmes, données et admission — 2026-10-16

## Statut

Audit d'enquête. Aucun changement de logique active n'est réalisé dans ce document.

Principe :
- serveur = réalité opérationnelle ;
- code = état implémenté ;
- documents = mémoire ;
- intentions = hypothèses.

## 1. Incident MCB du 16/10 — CONFIRMÉ

### Fenêtre

- dernier MCB 3m confirmé normal avant incident : 2026-10-16 02:54 UTC ;
- perte CDP explicitement journalisée : 03:00:00 UTC ;
- premier changement réel du MCB3 live après panne : 06:45:36 UTC ;
- premier changement réel du MCB15 live après panne : 06:46:06 UTC.

En heure Paris : environ 05:00 → 08:46 pour le gel live.

Le CSV 3m confirmé conserve un trou historique :
- 02:54 → 05:48 UTC ;
- 174 minutes ;
- environ 57 bougies 3m manquantes.

Le rattrapage du collecteur n'a pu reconstruire que les 19 bougies encore disponibles dans le cache TradingView à partir de 05:48.

### Cause infrastructure

A 03:00 UTC :
- chrome-recycle tue/recycle Chrome ;
- collecteur-3m : "Session error: CDP disconnected" ;
- puis "ECONNREFUSED 127.0.0.1:9222" pendant plusieurs heures.

Le watchdog continue pourtant à déclarer :
"OK — 3 onglets actifs (3m, 15m, TA)".

Le watchdog ne vérifie actuellement que :
- disponibilité de /json/list ;
- présence des URLs des rôles 3m/15m/TA.

Il ne vérifie pas :
- attachement effectif des collecteurs ;
- fraîcheur de mcb_3m.csv / mcb_15m.csv ;
- progression des timestamps MCB.

Conclusion : faux sentiment de santé du pipeline.

### Audit 30 s

Le prix est resté frais pendant l'incident, mais le MCB était figé.

03:00–05:45 UTC :
- lastPrice : très nombreuses valeurs ;
- liveLbw 3m : une seule valeur, -35.124617 ;
- live15LbwRaw : une seule valeur, -50.853759.

Le journal Audit mélangeait donc prix frais + MCB stale.

### Impact V4

structural-trajectory.js utilise uniquement src.history confirmé et ne vérifie aucune fraîcheur.

Pendant la panne :
- à 03:04, nested3.currentTimestamp = 02:57 ;
- à 03:59, toujours 02:57 ;
- à 04:59, toujours 02:57 ;
- à 05:39, toujours 02:57.

A 05:39, dernier DN3 confirmé utilisé par BOONO :
- 02:45 UTC ;
- âge ~175 minutes.

La structure 3m continuait pourtant à avoir autorité de synchronisation.

Conclusion :
la panne a eu un impact logique réel potentiel, pas seulement graphique.

## 2. Activité / admission — CONFIRMÉ

### Dernières 24 h

2869 évaluations DAY :
- NO_TRADE : 94.67 % ;
- SETUP : 1.19 % seulement ;
- thèse actionable : ~33.74 %.

Principaux bloqueurs :
- LOW_EDGE_REQUIRES_MAJOR_MCB_OR_REINFORCED_UP : 48.9 % ;
- WAIT_3M_15M_SYNC : 46.7 % ;
- WAIT_MF_MEMORY : 18.9 % ;
- BOUNDARY_CONTEST : 18.5 % ;
- WAIT_MF_TRANSFER_1H : 9.6 % ;
- WAIT_MF_TRANSFER_3M : 7.6 % ;
- UP_REINFORCED_3M_CLOSES_SHORT_ENTRY_WINDOW : 5.8 % ;
- SETUP_LATE : 5.3 % ;
- THESIS_CONSUMED : 2.7 %.

Ces pourcentages sont des frames d'évaluation, pas des opportunités indépendantes.

### Depuis activation MF Memory et garde-fous récents

12/10 → 16/10 :
- SETUP seulement ~1.38 % des évaluations ;
- NO_TRADE ~92.4 %.

## 3. Fréquence des trades par couches — INDICATEUR, PAS CAUSALITÉ PROUVÉE

La fréquence d'entrée baisse à mesure que les protections s'empilent :

- 05/10 → 09/10 avant les gates du 09/10 : ~7.14 trades/jour ;
- LOW_EDGE + sync/retry : ~6.56/jour ;
- + MF Memory : ~4.38/jour ;
- + Protection Stack / SETUP_LATE : ~2.81/jour.

Caveat : régimes de marché différents ; ceci ne prouve pas à lui seul que chaque couche cause la baisse.

## 4. "BOONO sait mais ne peut pas agir" — CONFIRMÉ

Fenêtre 15/10 16:00 → 16/10 10:00.

220 frames :
- Price Behavior intéressant ;
- vague mémorisée alignée ;
- candidat MCB dans le même sens.

209/220 = 95 % restent NO_TRADE.

Sous-ensemble strict, 102 frames :
- conditions précédentes ;
- PM3 + PM5 même sens ;
- efficiency3m >=25 %.

98/102 = 96.1 % restent NO_TRADE.
0 entrée.

Principaux bloqueurs dans ces 98 frames :
- LOW_EDGE : 56 ;
- WAIT_SYNC : 47 ;
- MF_MEMORY : 14 ;
- SETUP_LATE : 14 ;
- BOUNDARY : 11 ;
- MF_1H : 11 ;
- MF_3M : 4 ;
- UP3 : 5.

## 5. Déphasage WAIT_3M_15M_SYNC — CONFIRMÉ

Dans les 47 frames strictes bloquées par WAIT_SYNC :
- 47/47 : STRUCTURAL_OPPOSING ;
- 41/47 : lobe 3m déjà aligné avec le candidat ;
- Price Behavior : EASY/PRODUCTIVE/EXTREME dans tous les cas ;
- PM3/PM5 aligné et efficiency3m >=25 % par construction ;
- âge de la trajectoire structurelle opposée : ~7 à ~58 min.

La structure E3→E3 a donc une autorité stricte qui peut surclasser :
- lobe tactique courant ;
- conversion prix ;
- PM multi-horizon ;
- signal memory.

Ceci correspond au symptôme "lecture correcte mais commande absente".

## 6. LOW_EDGE / sub-80 — INCOHÉRENCE DE CONTRAT

mcb-state déclare :
- 80 LBW = repère qualitatif ;
- decisionImpact:false ;
- "jamais un veto".

market-quality déclare LOW_EDGE/CHOP non bloquant seul.

setup-lifecycle combine pourtant :
LOW_EDGE + PAIR_SUB80 => admission refusée.

Le résultat combiné est le veto le plus fréquent du système.

Cela ne prouve pas qu'il est mauvais :
sur le petit échantillon contre-factuel des cas LOW_EDGE seul, le veto paraît plutôt protecteur.
Mais son statut réel doit être assumé/documenté comme loi active majeure, ou son autorité réétudiée.

## 7. BOUNDARY_CONTEST — À REQUALIFIER

structural-room donne admissionBlocked=true aux frontières contestées :
- MA200 15m ;
- niveau ;
- trendline.

Dans l'échantillon strict :
- MA200_15M : 7 occurrences ;
- TRENDLINE : 4 ;
- VAL daily : 2.

Il s'agit de localisation/R:R avec pouvoir de veto.
Cela ressemble partiellement au vieux WHERE veto supprimé, mais peut être économiquement pertinent.

Exemple 16/10 09:16 UTC :
- SHORT candidat ;
- MA200 15m seulement 37 $ plus bas ;
- VAL daily seulement 77 $ plus bas ;
- frais économiques impliquent ~83 $ de mouvement pour couvrir l'aller-retour.

Ici, le veto R/R était défendable.

## 8. Frame 16/10 09:16:42 UTC — CAS BOONO-VIEW

Prix 82152.1.

Alignements :
- candidat MCB : SHORT ;
- signal memory : SHORT, SIGNAL3_TO_SIGNAL15 ;
- lobe 3m : SHORT ;
- Price Behavior : EASY_TRAVEL SHORT ;
- PM3 : -69.2 $ ;
- PM5 : -73.4 $ ;
- efficiency3m : 61.8 % ;
- MF memory h4 : SHORT ;
- MF30m : SHORT ;
- MF1h : SHORT.

Refus :
- WAIT_3M_15M_SYNC ;
- LOW_EDGE_REQUIRES_MAJOR_MCB_OR_REINFORCED_UP ;
- BOUNDARY_CONTEST.

Cause WAIT_SYNC :
- dernier pivot causal E3 = CREUX ;
- structuralDirection = LONG ;
- confirmé à 09:09 ;
- le lobe courant avait déjà tourné SHORT.

C'est une illustration directe du conflit entre mémoire structurelle et conversion actuelle.

## 9. Bug setupTs=0 — CONFIRMÉ

Introduit par le changement V4.10.1 :
commit 4cfc286 "Preserve opportunity freshness".

Code :
Number.isFinite(Number(previousSetup.setupTs))

Quand setupTs vaut null :
Number(null) = 0, donc le test accepte 0 comme timestamp valide.

Manifestation observée :
- 11 lignes SETUP sur 17 de V4.10.4 avaient setupTs=0 ;
- toutes dans un même épisode.

Conséquence :
price-translation calcule "POST_SETUP" depuis timestamp 0 :
- milliers de lignes ;
- gross énorme ;
- efficiency artificiellement quasi nulle.

Dans l'épisode observé, corriger le timestamp n'aurait pas conduit à une entrée, car le prix/PM est ensuite parti contre le SHORT.
Mais le contrat causal post-setup est corrompu et le bug doit être corrigé.

Aucun timingShadow actif avec timingOriginTs=0 n'a été observé dans 3137 évaluations ; le bug mesuré concerne setupTs.

## 10. Double pénalisation CHOP / LOW_EDGE

LOW_EDGE agit à deux étages :

1. admission :
   LOW_EDGE + sub80 => pas de SETUP ;

2. après SETUP :
   entryContinuityProof impose en CHOP/LOW_EDGE :
   - PM3 aligné ;
   - PM5 aligné ;
   - efficiency3m >=37.5 %.

Cela peut créer :
"attendre pour armer le setup, puis attendre à nouveau pour prouver la conversion".

MF Memory ajoute également un transfert séquentiel :
30m → 1h → 3m → STRONG rolling PM.

## 11. Contre-factuel préliminaire par veto exclusif

Fenêtre récente, data outage exclue, configurations strictement cohérentes.
Déduplication approximative des épisodes à 5 min.
Echantillon très petit : ne pas modifier les lois sur cette seule base.

LOW_EDGE seul :
- 4 épisodes ;
- 0 succès +220 avant -180 ;
- médiane MFE ~104 $ ;
- médiane MAE ~199 $.
=> plutôt protecteur dans cet échantillon.

WAIT_SYNC seul :
- 4 épisodes ;
- 1 succès +220 avant -180 ;
- un autre atteint MFE +207 avec MAE 7.5 ;
- 2 autres clairement mauvais.
=> mixte.

SETUP_LATE seul :
- 2 épisodes ;
- 2/2 succès +220 avant -180 ;
- MFE ~387–398 $ ;
- MAE ~99–110 $.
=> signal d'alerte sur anti-churn, échantillon insuffisant.

MF_MEMORY seul :
- 2 épisodes ;
- 1 bon mouvement manqué ;
- 1 mauvais évité.
=> mixte.

BOUNDARY seul :
- 1 épisode ;
- MFE 15 $ / MAE 430 $.
=> protection utile sur cet exemple.

## 12. SHADOWS "Failed to fetch"

Aucun crash config-server correspondant n'est observé.

Benchmark local /api/shadows :
- HTTP 200 ;
- ~1.8 à 2.85 s ;
- ~78 Ko.

Profil :
- readRecentNdjson evaluations 360 : ~1.54 s ;
- trade history complet : ~0.52 s ;
- audit JSON : ~44 ms ;
- MCB15 CSV : ~5 ms.

La route utilise des lectures/parsing synchrones lourdes et bloque le Node event loop.
Ceci peut produire timeout ou rupture côté mobile/proxy.
La capture montre également le ticker "--", donc une perte réseau client reste possible.

Conclusion :
pas de corruption Shadows démontrée ; route trop lourde et à optimiser/cacher.

## 13. Priorités proposées

### P0 — cohérence système, sans changer la stratégie

1. Corriger setupTs null→0.
2. Ajouter un contrat de fraîcheur MCB :
   - structure 3m perd son autorité si confirmed/live est stale ;
   - exposer DATA_DEGRADED au lieu de persister un signal ancien.
3. Renforcer chrome-watchdog/recycle :
   - ne pas valider seulement les URLs ;
   - vérifier progression des timestamps CSV / heartbeat collecteurs ;
   - attendre un nouveau point réel après recycle avant de déclarer santé.
4. Marquer/exclure les fenêtres data-degraded dans SHADOWS.
5. Mettre /api/shadows en cache/pré-calcul pour éviter 2–3 s synchrones.

### P1 — étude logique, pas suppression aveugle

Créer/étendre un shadow "Blocked Opportunity / Admission Counterfactual" qui suit séparément :
- LOW_EDGE ;
- WAIT_SYNC ;
- SETUP_LATE ;
- MF Memory ;
- Boundary ;
- combinaisons.

Pour chaque épisode :
- prix de départ ;
- MFE/MAE ;
- +220 avant -180 ;
- temps jusqu'à +220 ;
- Price Behavior ;
- signal memory ;
- E3/E15 lineage ;
- R/R/niveaux.

### P2 — hypothèses à tester

A. WAIT_SYNC :
faire de structuralDirection une mémoire structurelle forte, mais tester si
lobe aligné + Price Behavior + PM3/5 + signal memory peuvent former une autorité de transfert avant le prochain pivot E3 confirmé.

B. LOW_EDGE :
conserver comme protection tant que les données ne démontrent pas l'inverse ;
tester une sortie de LOW_EDGE lorsque le prix devient durablement EASY/PRODUCTIVE.

C. SETUP_LATE :
ne pas desserrer immédiatement ;
l'échantillon 2/2 de mouvements manqués justifie un shadow dédié.

D. Boundary :
séparer nettement R/R économique utile d'un simple veto de localisation.

## Conclusion

Le problème n'est pas unique.

Trois couches distinctes sont confirmées :
1. incident de données réel ayant gelé MCB pendant ~3h45 ;
2. admission devenue extrêmement restrictive alors que la lecture directionnelle est souvent cohérente ;
3. bug causal setupTs=0 apparu dans V4.10.1.

Le symptôme "BOONO est au courant mais déphasé / sans commande" est donc supporté par les données.

Ne pas résoudre cela par un desserrage global.
D'abord restaurer la cohérence temporelle et la qualité des données, puis mesurer prospectivement chaque veto dans BOONO-View / SHADOWS.
