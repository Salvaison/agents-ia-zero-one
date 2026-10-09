# BOONO V3 — Implémentation contrôlée E15 semantics R1 — 29/09/2026

**Validation :** Benjamin, 29/09/2026.
**Config active :** `V3EXP-20260929-E15SEM-R1`.
**Backup :** `archives/v3lab-e15sem-pre-20260929T194215Z`.
**Périmètre :** une seule modification décisionnelle ; nouveaux métriques turning/combat en shadow uniquement.

## Rationale falsifiable

Constat causal : `wave.structural` décrit le dernier leg E15→E15 achevé.
Les six EXIT_STRUCTURE étudiés du 24→27/09 se déclenchaient ~31 min après le pivot final,
alors que la phase MCB vivante avait déjà basculé dans le sens de la position.
Hypothèse R1 : un leg E15→E15 achevé ne doit pas, à lui seul, liquider une position.

**Critère de rollback :**
si la suppression de cet EXIT_STRUCTURE augmente nettement MAE/drawdown ou transforme
des sorties anciennement protectrices en pertes sans gain compensatoire de capture/MFE,
restaurer le backup et l'ancienne règle.

## Changement décisionnel unique

### `modules/v3lab/layers/action.js`
**Avant :** si le dernier leg E15→E15 confirmé était opposé à la position,
ACTION retournait immédiatement `EXIT_STRUCTURE`.

**Après :** ce même événement est conservé comme contrefactuel
`action.counterfactual.completedLegExit`, mais ne provoque plus une sortie autonome.
Les sorties `EXIT_RISK` et `EXIT_EXECUTION` restent inchangées.
### `modules/v3lab/layers/wave.js`
Ajout de `wave.completedLeg` comme vue explicite du dernier leg confirmé.
`decisionImpact:false` pour cette nouvelle vue descriptive.
Le champ historique `wave.structural` reste encore utilisé par RISK pour l'expérience d'entrée ;
sa refonte n'est pas incluse dans R1.

## Observation shadow ajoutée

Nouveau module :
`modules/v3lab/experiments/causal-events-shadow.js`.

Expose sans impact décisionnel :
- netMove prix 1m / 3m / 5m ;
- rareté du netMove 5m via P90/P95/P99 des 12 dernières heures ;
- turning LBW legacy séparé ;
- dernier leg achevé ;
- mémoire descriptive des contacts MA200 3m ;
- inputs de combat : net 60m, efficacité, cadence P95, move P95,
  dominance, proof, persistCount, terrain conservé, scores gagnant/perdant.

Intégration :
- `modules/v3lab/experiments/structure-shadow.js` ;
- `modules/trade-simulator-v3lab.js` via `shadow.causalEvents`.

Aucune règle scalp automatique n'est créée :
un mouvement P95/P99 reste un événement à qualifier par lieu/acceptation/reclaim/conversion.

## Expérience et gouvernance

Ancienne config : `V3EXP-20260924-WHERE-NOVETO-DOM2OF4-R1`.
Le bloc #9 non revu (3 trades + 11 overflow) a été archivé intégralement
dans `data/v3lab-experiment-review-history.ndjson` avec verdict
`SUPERSEDED_BY_USER_VALIDATED_E15SEM_R1`.
Le nouveau bloc repart à 0/3 avec baseline historique 128 trades,
dernier exit `2026-09-29T18:10:08.820Z`.
Les seuils WHERE/dominance/R:R/maturité restent inchangés :
WHERE non-veto, dominance 2/4, proof >=0.62, terrain conservé.

## Tests

Avant restart :
- syntaxe Node : action, wave, causal-events-shadow, structure-shadow,
  trade-simulator-v3lab, three-trade-block : OK ;
- `tests/v3lab/causal-events-shadow.test.js` : OK ;
- `tests/v3lab/coherence-regression.test.js` : OK ;
- divergence-lineage, dominance threshold, MA200 shadow : OK ;
- rotating NDJSON, three-trade-block : OK ;
- V2 core-contract et simulator regression : OK.

`mw-hourly-report.test.js` conserve un handle/processus ouvert et a été interrompu ;
aucune assertion de trading R1 ne dépend de ce test.

## Restart et vérification live

Aucune position legacy, V2 ou V3 n'était ouverte avant arrêt/restart.
Seul `cerveau-central` a été arrêté puis relancé ; collecteurs et autres services sont restés online.

Premier état live vérifié après restart :
- modules V3 : aucune position ;
- `completedLeg.decisionImpact=false` présent ;
- `shadow.causalEvents` présent et alimenté ;
- config active `V3EXP-20260929-E15SEM-R1`, bloc 1, 0/3 ;
- process `cerveau-central` online ;
- aucune nouvelle erreur PM2 ; le dernier mtime du log erreur était 09:19Z, antérieur au patch.

## Non inclus dans R1

- aucun changement du seuil proof 0.62 ;
- aucun nouveau turning gate ;
- aucun changement actif CHOC_COMBAT/TRANSLATION ;
- aucune règle active MFE 220→+180 ;
- aucun TP/tranche 70/30 actif ;
- aucune refonte divergence.
