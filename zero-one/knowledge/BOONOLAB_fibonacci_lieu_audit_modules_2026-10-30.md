# BOONOLAB — État vivant : Fibonacci manuels, 0,382 de campagne, Historique Audit et séparation Entrée/Sortie

**30 octobre 2026, Amsterdam (recherche 17h05–17h20 UTC), dossier de décision OD-20261030-003.**
**Statuts :** diagnostic de code et données vérifié ; réparation UI en lecture seule mise en service ; aucune politique d'entrée/sortie ni stop PAPER modifiés.

## 1. Diagnostic Fibonacci : défaut de chaîne de lecture, et non disparition des ancres

Le fichier `data/levels.json` contient trois groupes Fibonacci manuels :

| groupId | fib0 | fib1 | 0,382 selon la convention du composeur |
|---|---:|---:|---:|
| 3 | 126 260 | 15 738 | 84 040,6 $ BTC |
| 5 | 57 582 | 126 425 | 83 880,0 $ |
| 6 | 87 649 | 58 500 | **76 514,1 $** |

La colonne `time` ne contient que HH:MM, **sans date ni preuve d'un pivot TradingView valide aujourd'hui** ; ne pas prétendre que ces fibos manuels sont des swings actuels. Le composeur NIVEAUX sous `modules/config-server.js` calculait déjà les ratios `0 / .382 / .618 / .65 / 1` dans le navigateur : `price=fib0+(fib1-fib0)*r`. **Ce calcul n'était pas synchronisé avec les niveaux dérivés de LIEU.**

V5 `modules/v5/decision-v52.js:levelsAt()` exclut explicitement `fib0` et `fib1`; V5.4.1 `modules/v5/v53-causal.js:mapPlace()` reçoit les seules ancres brutes comme niveau MAPPED mais pas leurs retracements. V5.4.1 écrase `readings.place.nearest` par la prochaine frontière cartographiée *dans la direction de la candidature*, qui n'est pas forcément proche du prix. Dans l'exemple observé le prix était ~77 291 $, et LIEU indiquait `VAL 81 289` plutôt que le Fibo 0,382 du groupe 6 à 76 514 ; ce sont des objets différents mal distingués par le libellé. Le lecteur WHERE V4 `v3lab/layers/where.js` classe les niveaux bruts sans calculer non plus les niveaux Fibonacci intermédiaires.

**Contrôle de référence 30/10 17h12 UTC :** prix PAPER ~77 139,2 ; FIB groupe6 0,382 = 76 514,1 => distance **−625,1 $** (signe = niveau − cours). Le niveau enregistreur manuel ne doit pas se confondre avec la dynamique de la campagne.

## 2. Fibo causal de la campagne actuelle : deux conventions 0,382

Pour la campagne V5 LONG observée : origine E15 géométrique **CREUX 76 652**, connu après confirmation 15m ; sommet confirmé de la fenêtre 2h **78 070** postérieur à la confirmation du parent ; amplitude 1 418 $ BTC.

- **0,382 de progression depuis le CREUX** : 76 652 + .382×1418 = **77 193,7**. À cours 77 139,2, distance signée +54,5$.
- **38,2 % de retracement depuis le SOMMET** : 78 070 − .382×1418 = **77 528,3** ; distance +389,1$.

Ces niveaux ne sont pas interchangeables. L'origine E15 est une preuve géométrique datée ; le sommet est un extrême 3m **confirmé de fenêtre glissante**, et non nécessairement un pivot E15 achevé. Il peut changer lorsque la campagne progresse. Le code pur refuse les extrêmes futurs, non directionnels ou antérieurs à la confirmation du parent. Ces nombres sont des **frontières d'examen**, pas des invalidations/ordres automatiques.

Une règle future « EXIT au 0,382 » exigerait d'abord de fixer **l'orientation de l'outil, l'événement qui fige l'extrême, le statut d'acceptation/rejet du niveau et les preuves de non-récupération** ; une simple mèche/touche ne suffit pas. Ce contrat n'est ni autorisé ni mis en service.

## 3. Correction technique déployée — lecture seule

Création de `modules/v5/fib-context-readonly.js` : dérive tous les groupes de fib0/fib1 du fichier réel avec prix des ratios, distance signée, groupe, sens ascendant/descendant, ancienneté non datable ; calcule séparément un couple 0,382 « depuis origine » / « retracement depuis extrême » pour la campagne E15 confirmée si les extrêmes ont une disponibilité causale. Sorties marquées `decisionImpact=false` et `brokerOrdersEnabled=false`.

`modules/config-server.js` : `/api/v52` enrichit sa réponse **d'information seulement** par `fibContext`. La cellule **3 · LIEU** affiche :
1. `Frontière de contexte dans le sens candidat`, ancien champ `readings.place.nearest` renommé pour ne pas prétendre être le vrai niveau de prix le plus proche.
2. `FIB ENREGISTRÉ · groupe N` avec ratio, niveau et distance `niveau − prix`, mais ancienneté de la paire non datée.
3. `FIB CAMPAGNE illustratif` : 0,382 depuis creux et repli de 38,2 % depuis sommet, prix, distance, heure de disponibilité de l'extrême, **aucun stop automatique**.

**Les fonctions d'entrée ou de sortie de V4.9.4 et V5.4.3 ne reçoivent aucun nouveau niveau Fibonacci ; le modèle de stop et le fichier `data/levels.json` restent inchangés.** La correction est exclusivement observatoire, sans modifier `entryAllowed` ni le runner.

Tests : **45/45** sur calcul Fibonacci (groupes montant/descendant, repères inverses, sentinelles sans futur, contexte non autoritaire) + tests UI/contrats V5 existants ; `node --check` serveur et module ; service **config-server seul** redémarré et PM2 sauvegardé, page /login HTTP200, /api/v52 anonyme HTTP302 attendu. V4/V5/shadow PM2 restés online. Le navigateur authentifié utilisateur n'a pas encore été examiné visuellement ; les sessions de l'interface peuvent nécessiter une reconnexion après redémarrage.

## 4. Historique Audit — diagnostic d'une perte de rétention longue

`data/audit-history.json` maintient les ~24 dernières heures à ~30s (script `modules/baton-relay.js` et GET `/api/audit-history`), non pas un historique complet de ticks 5s. `archive-audit.sh` avait été créé en septembre pour une sauvegarde compressée nocturne, mais les fichiers sous `data/archives/audit-YYYY-MM-DD.json.gz` s'arrêtent au **22 septembre 2026**. Le contrôle du 30/10 n'a trouvé ni PM2 `archive-audit` ni tâche dans `crontab -l` root ou /etc/cron.d pour ce script ; `cron` système est actif. Cela rend impossible de reconstruire à partir de cette source toute la trajectoire Audit30s des trades du 23/09 à la fenêtre actuelle. Les archives anciennes restent utiles pour leurs dates, et les NDJSON décisionnels/bougies MCB apportent des preuves partielles, jamais les ticks manquants.

**Archive quotidienne à rétablir explicitement** avec vérification cron, sauvegarde rotative, horodatage UTC et contrôle que le backup correspond au jour nommé. **Aucun cron n'a été créé dans cette mission**, hors périmètre du correctif de lecture Fibo.

**Conservation ponctuelle effectuée :** une copie gzip validée des 2 926 observations Audit disponibles au contrôle a été écrite sous `zero-one/data/research-briefs/audit-snapshot-20261030-1717Z.json.gz` (environ 365 KiB, fenêtre 29/10 16:55 UTC – 30/10 17:17 UTC), sans réécrire le flux live ni rétablir automatiquement l’archivage quotidien. Cette preuve locale non versionnée ne reconstitue pas les jours manquants.

## 5. Architecture du moteur — hypothèse, pas implémentation

Au lieu de deux moteurs LONG/SHORT se neutralisant mutuellement, proposer :
- `CampaignMemory` : MCB15 et origine E15, mémoire des offensives et continuité, y compris E3 inverses comme respirations.
- `EntryEvaluator` : deux voies `LONG` et `SHORT` paramétrées séparément, avec asymétries à tester en bas/haut du LBW/MCB et preuves MF/PM/MA, arbitrage par ordre chronologique. Le `UP_REINFORCED <= -60` de V494 existe spécifiquement pour LONG, mais son avantage statistique reste non prouvé.
- `PositionSupervisor` : logique de continuation/abandon **distincte** des entrées, persistance du camp dans sa thèse, contrôle de l'échec de défense territoriale, conversion adverse et retests; peut fermer une position sans requalifier la campagne ni obliger l'ouverture de l'autre côté.
- `RiskGuard` : conservation du hard-risk, règles économiques indépendantes, simulations de sortie avant promotion.

Sur les 55 clôtures V494 recensées dans le ledger au moment de la consultation : 7 `LONG UP_REINFORCED`, 2 gagnants, net −3,851 $ (les 4 plus récents +6,951 $, dominés par #49 mais contrebalancés par #47). Ce n'est pas la preuve que « tous les LONG en bas MCB sont bons ». Les SHORT récentes restent également performantes par épisodes. Il faut qualifier chaque cas par E15/E3/MA/terrain, pas choisir une architecture d'après une impression sur la polarité.

**Principes de promotion :** garder les risques d'un exit trop rapide sur #40/#43/#45/#49/#50, et les risques de sortie tardive sur #47/#92 ; Fibo 0,382 est une épreuve de reconquête/invalidation possible, mais pas une loi à l'instant du contact. Les deux moteurs PAPER, shadow et ledgers inchangés.

**Travaux ouverts :** expérience temporelle sur Fib0.382 dans `REVERSAL_ATTENTION`, source de bornes automatiques rigoureusement figées, tests d'entrée LONG/SHORT aux extrêmes, reprise de l'archivage Audit, validation visuelle de l'état vivant authentifié et horodatage des paires manuelles.
