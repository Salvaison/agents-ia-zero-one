# BOONO — WHERE non-veto + desserrage dominance + blocs 3 trades — 24/09/2026

## Statut

[CHANGEMENT AUTORISÉ] Intervention locale paper-trading selon validation explicite de Benjamin.
Aucune reconstruction générale, aucun changement d'architecture ou de responsabilité de module.

Configuration expérimentale active :
`V3EXP-20260924-WHERE-NOVETO-DOM2OF4-R1`

Fingerprint :
`3dccf7e7fdd53cf003c720202ef923eaad99ee6932b6e2d955001006c6ed76be`

Début du bloc 1 :
`2026-09-24T10:32:33.801Z`

Compteur initial :
`0/3`

## 1. État opérationnel avant modification

À 2026-09-24T10:24Z :
- cerveau-central online, ancien processus chargé depuis ~22 h ;
- config-server online ;
- moteur-boono online ;
- collecteur-3m / collecteur-tab2 online ;
- trendline / watchdog / daily-report online ;
- aucune position V3 ouverte ;
- aucune position legacy ouverte ;
- historique V3 : 90 trades clôturés ; dernier exit 2026-09-24T02:15:22.929Z ;
- disque ~82 % libre.

Le patch WHERE non-veto validé dans le rapport avait déjà été écrit sur disque vers 10:21Z, mais le processus cerveau-central actif datait du 23/09 11:36Z : il n'était donc pas encore chargé. Les évaluations live continuaient à produire les anciens motifs WHERE jusqu'au restart contrôlé.

## 2. Causes chiffrées de WATCH / NO_TRADE avant activation

Fenêtre 6 h : 720 évaluations, 720 WATCH, 0 ENTER.

Occurrences de motifs de refus :
- dominance actuelle non alignée/persistante : 623 ;
- reassertion structurelle: WHERE courant requis : 616 ;
- turning point frais absent : 598 ;
- 3m non aligné : 432 ;
- localisation absente/incompatible/trop ancienne : 264 ;
- régime hachoir/choc : 211 ;
- R:R structurel insuffisant : 180 ;
- protection trop proche : 12.

Dominance sur la même fenêtre :
- persistante long : 126 ;
- persistante short : 109 ;
- émergente long : 77 ;
- émergente short : 95 ;
- proof médian global ~0,619.

Pour les émergences :
- short : proof médian ~0,642 ;
- long : proof médian ~0,612.

Conclusion : la famille dominance est la famille de seuils la plus bloquante après neutralisation du veto WHERE.

## 3. WHERE : neutralisation exacte du veto

Contrat actif dans `modules/v3lab/layers/risk.js` :

- `locationReady` et `locationSource` sont encore calculés et conservés ;
- `eligibility.location.decisionImpact=false` ;
- sémantique : `CONTEXT_AND_QUALITY_ONLY_NO_ENTRY_VETO` ;
- `locationReady` n'entre plus dans la formule `entryAllowed` ;
- `CURRENT_WHERE` n'entre plus dans `reassertionReady` ;
- `locationRequired=false` dans les diagnostics de reassertion ;
- aucun motif `localisation absente...` ou `WHERE courant requis` n'est ajouté aux refus.

La formule de réassertion conserve :
- nested 3m aligné ;
- turning frais aligné ;
- dominance ;
- régime ;
- protection ;
- respiration ;
- R:R.

Les données WHERE, niveaux, MA200 et trendlines restent intégralement calculées, mémorisées et auditables.

## 4. Premier desserrage contrôlé

Famille choisie : `dominance_persistence`.

Avant (modèle V2 sous-jacent) :
- persistCount >= 3 parmi les 4 observations récentes ;
- terrain conservé requis ;
- proof >= 0,62.

Après, V3 uniquement :
- persistCount >= 2 ;
- terrain conservé toujours requis ;
- proof >= 0,62 inchangé.

Implémentation :
`modules/v3lab/layers/dominance.js` reclassifie localement une `DOMINATION_EMERGENTE` en `DOMINATION_PERSISTANTE` seulement si :
- direction long/short définie ;
- persistCount >= 2 ;
- conserved=true ;
- proofScore >= .62.

Le module V2 partagé et le moteur legacy ne sont pas modifiés.

Seuils inchangés :
- R:R min : 1,0 → 1,0 ;
- protection : 0,25 × p50 → 0,25 × p50 ;
- phase overrun : 2,5 → 2,5 ;
- rétention minimum : 0,50 → 0,50 ;
- turning reassertion max : 6 min → 6 min ;
- proof dominance : 0,62 → 0,62.

Replay indicatif sur les 6 h précédentes :
- 43 états émergents alignés auraient été promus par le nouveau seuil ;
- 3 évaluations récentes auraient satisfait toute la chaîne d'entrée une fois WHERE retiré du veto ;
- pas d'ouverture massive : les autres conditions restent discriminantes.

## 5. Validation explicite de la capacité ENTER sans WHERE

Test direct de la chaîne active :
- WHERE absent / `NO_VALID_LOCATION` ;
- dominance initialement `DOMINATION_EMERGENTE`, proof .70, persistCount 2, terrain conservé ;
- reclassification V3 → `DOMINATION_PERSISTANTE` ;
- nested3m aligné ;
- turning frais 60 s ;
- R:R = 2,33 ;
- protection valide.

Résultat :
- `risk.entryAllowed=true` ;
- `action.type=ENTER_LONG` ;
- raison : `... dominance + risk; WHERE descriptif`.

Donc la nouvelle configuration peut effectivement atteindre ENTER sans lieu actif.

## 6. Blocs persistants de trois trades

Nouveau fichier :
`data/v3lab-experiment-block.json`

Nouveau module :
`modules/v3lab/experiments/three-trade-block.js`

Fonctionnement :
- chaque position V3 enregistre `experimentConfigId` à l'entrée ;
- chaque trade clôturé de cette configuration incrémente `closedTradesInBlock` ;
- à 3/3 : `reviewDue=true` ;
- tout trade supplémentaire avant revue va dans `overflowTrades`, sans contaminer les trois trades du bloc ;
- après revue, `completeReview(...)` archive le bloc dans `data/v3lab-experiment-review-history.ndjson` puis ouvre le bloc suivant à 0/3.

Une automation conditionnelle `BOONO 3-Trade Review` vérifie ce marqueur toutes les heures et ne notifie que lorsqu'une revue est réellement due.
La revue mesure entrée, MCB, WHERE causal, maturité, déplacement, R:R, MFE, MAE, capture, P&L, sortie et occasions manquées.
Au maximum une famille de seuils peut être modifiée pour le bloc suivant.

Le Deep Review quotidien reste activé et complémentaire.

## 7. Fichiers concernés

Actifs :
- `modules/v3lab/layers/risk.js` — WHERE non-veto ;
- `modules/v3lab/layers/dominance.js` — desserrage 3/4 → 2/4 V3 seulement ;
- `modules/trade-simulator-v3lab.js` — attribution config + compteur à la clôture ;
- `modules/v3lab/experiments/three-trade-block.js` — état persistant et cycle 3 trades ;
- `tests/v3lab/coherence-regression.test.js` — WHERE non-veto ;
- `tests/v3lab/dominance-v3-threshold.test.js` ;
- `tests/v3lab/three-trade-block.test.js`.

Aucun shadow permissif créé.

## 8. Tests

Tous validés :
- syntaxe Node risk/dominance/three-trade-block/trade-simulator ;
- V3 coherence regression ;
- dominance-v3-threshold ;
- three-trade-block ;
- MA200 shadow ;
- divergence-lineage shadow ;
- MW hourly report ;
- rotating NDJSON ;
- V2 core-contract ;
- V2 simulator-v02 regression (exit 0).

## 9. Activation et état post-intervention

Avant restart :
- V3 scalp/day/swing = null ;
- legacy position = null.

Restart :
- uniquement `cerveau-central`.

OKX :
- connexion wss OKX ouverte ;
- abonnement trades BTC-USDT-SWAP confirmé ;
- abonnement tickers BTC-USDT-SWAP confirmé.

Processus après :
- cerveau-central online, unstable restarts 0 ;
- config-server online ;
- moteur-boono online, non redémarré ;
- collecteur-3m / collecteur-tab2 online ;
- trendline / watchdog / daily-report online.

10 premières évaluations après activation :
- 10 évaluations produites normalement ;
- 0 motif WHERE/localisation dans `risk.reason` ;
- `eligibility.location.decisionImpact=false` visible live ;
- seuil dominance V3 exposé live via `v3ThresholdOverride` ;
- 0 entrée artificielle au restart ;
- position V3 toujours nulle ;
- compteur bloc toujours 0/3.

## 10. Backups et rollback

Backup véritable avant retrait du veto WHERE :
`archives/v3lab-pre-where-nonveto-20260924T102300Z`

Backup avant desserrage dominance / tracking 3 trades :
`archives/v3lab-pre-where-open-threshold-block-20260924T102626Z`

Rollback complet vers le comportement actif antérieur à cette intervention :
1. attendre qu'aucune position V3 ni legacy ne soit ouverte ;
2. restaurer `risk.js`, `action.js`, `coherence-regression.test.js` depuis `v3lab-pre-where-nonveto-20260924T102300Z` ;
3. restaurer `dominance.js`, `sequence.js`, `trade-simulator-v3lab.js` depuis `v3lab-pre-where-open-threshold-block-20260924T102626Z` ;
4. archiver puis retirer `data/v3lab-experiment-block.json` et les nouveaux helpers/tests si rollback complet désiré ;
5. relancer les tests ;
6. restart uniquement `cerveau-central` ;
7. vérifier état/OKX/absence de trade artificiel.

## 11. Gouvernance active

- WHERE ne redevient pas un veto.
- Aucun nouveau garde-fou compensatoire.
- Une seule famille de seuils modifiée dans ce bloc : dominance persistence.
- Configuration figée jusqu'à revue des trois trades, sauf défaut critique indépendant.
- Priorité analytique : MCB + relation lieu → réaction → déplacement → espace restant/R:R.
