# BOONO V3 — R1.2 P90 ATTACK, NOT EXIT — 30/09/2026

**Validation :** Benjamin, 30/09/2026.
**Config active :** `V3EXP-20260930-P90ALERT-R1.2`.
**Backup :** `archives/v3lab-p90alert-r12-pre-20260930T090442Z`.

## Hypothèse falsifiable

La règle active précédente confondait force d'une attaque adverse et succès durable :
`dominance opposée persistante + wave counter-excursion > P90`
déclenchait directement `EXIT_EXECUTION`.

Analyse nuit 29→30/09 :
- 11 sorties P90 sur 13 trades ;
- P&L des 11 : -6.3674 % x10 ;
- 10/11 ont ensuite offert >=100 $ dans le sens initial dans l'heure ;
- campagne SHORT directionnellement exploitable mais détruite par churn.

Hypothèse R1.2 :
P90 doit signaler une attaque adverse sérieuse, pas provoquer une sortie autonome.
La sortie reste autorisée par protection/garde-fou ou transfert adverse durable + giveback.

**Rollback :**
si R1.2 augmente fortement MAE/drawdown car les attaques acceptées ne sont plus coupées assez tôt,
restaurer le backup et utiliser le combat ledger pour formaliser l'acceptation avant une nouvelle règle active.
## Modification décisionnelle unique

### `modules/v3lab/layers/action.js`

Pour les nouvelles positions R1.2 :
- `oppDom + respiration UNUSUAL` produit `alerts.oppositeAttackP90` ;
- aucune sortie autonome P90 ;
- sémantique explicite : force de l'attaque, pas acceptation/succès ;
- `EXIT_RISK`, protection prix et garde-fou urgence inchangés ;
- `EXIT_EXECUTION` transfert adverse durable + giveback inchangé.

Compatibilité :
les positions ouvertes sous une ancienne config gardent la règle P90 historique.
Le policy est porté par la position via `p90Policy`.

## Position ouverte lors du déploiement

Une position LONG R1.1 était ouverte :
- entrée 83065.3 à 08:38:07Z ;
- protection 82918.9 ;
- config `V3EXP-20260929-E15SEM-R1.1-MAJORLOBE`.

Elle a été volontairement grandfathered :
`p90Policy` absent => comportement P90 legacy jusqu'à sa fermeture.
Ainsi aucune règle de sortie n'est changée au milieu d'un trade.
Sa clôture sera archivée comme foreign-config trade et ne comptera pas dans R1.2.
## Combat ledger shadow

Nouveau module :
`modules/v3lab/experiments/combat-ledger-shadow.js`.

Aucun impact décisionnel.

Deux horizons :
- campagne E15 courante ;
- trade ouvert.

Mesures prix :
- grossBullUsd / grossBearUsd à partir de deltas prix échantillonnés non chevauchants ;
- net et net dans le sens de la thèse ;
- swings >=50 $ ;
- attaques adverses matérielles >= max(150 $, P75 respiration) ;
- amplitude attaque ;
- retracement vs impulsion précédente ;
- réabsorption par le camp de la thèse ;
- attaque entièrement réabsorbée ;
- nouvel extrême après réabsorption.

Mesures ticker par camp :
- cadence médiane/P75/P95 ;
- débit BTC/s médian/P75/P95 ;
- yield $/BTC médian/P75/P95 ;
- amplitude `priceMove` médiane/P75/P95.

Les fenêtres ticker ne sont jamais additionnées, car elles se chevauchent.
## Intégration / stockage

Modifiés :
- `modules/v3lab/layers/action.js`
- `modules/v3lab/experiments/structure-shadow.js`
- `modules/trade-simulator-v3lab.js`
- `modules/v3lab/experiments/three-trade-block.js`

Ajout :
- `modules/v3lab/experiments/combat-ledger-shadow.js`

Le shadow compact expose maintenant `shadow.combatLedger`.

R1.1 a été archivé avec :
- bloc officiel 3/3 ;
- 11 overflow ;
- position R1.1 encore ouverte au rollover.

R1.2 démarre à 0/3 avec baseline history=142.
Le tracker rejette du nouveau bloc tout trade dont `experimentConfigId` est ancien
et l'archive séparément dans l'historique de reviews.
## Tests

Passent :
- syntaxe action/combat-ledger/structure-shadow/trade-simulator/three-trade-block ;
- combat-ledger-shadow.test.js ;
- coherence-regression.test.js ;
- causal-events-shadow.test.js ;
- dominance-v3-threshold.test.js ;
- ma200-shadow.test.js ;
- three-trade-block.test.js avec routing foreign-config ;
- V2 core-contract ;
- V2 simulator regression.

Régression R1.2 :
même contexte P90 :
- position legacy => EXIT_EXECUTION P90 ;
- position `p90Policy=ALERT_ONLY` => HOLD + `oppositeAttackP90`.

## Vérification live

`cerveau-central` online après restart.
`shadow.combatLedger.version = combat-ledger-shadow-v0.1`.
Config active : `V3EXP-20260930-P90ALERT-R1.2`, 0/3.

La position R1.1 ouverte est toujours intacte et son ACTION reste sous politique legacy.
Aucune nouvelle erreur PM2 observée après restart.
