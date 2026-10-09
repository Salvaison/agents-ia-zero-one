# V3-LAB 0.2 — Correctifs de cohérence entrée/sortie — 20/09/2026

## Portée
Correctifs ciblés validés par Benjamin. Aucun changement de stratégie de fond, de paramètre de marché, de seuil de dominance, de respiration ou de sizing.

## 1. REVERSAL_FORMING vs EXIT_STRUCTURE
Problème démontré : une entrée `REVERSAL_FORMING_LONG/SHORT` était autorisée contre la phase 15m encore non retournée, puis fermée au cycle suivant par la règle générique « phase de vague confirmée devenue opposée ».

Correctif :
- la position conserve son `entryMode` et son prix d'invalidation structurelle d'entrée ;
- tant qu'un `REVERSAL_FORMING` n'a pas été confirmé par une phase 15m dans le sens de la position, la phase 15m encore opposée n'est plus une cause autonome de sortie ;
- l'invalidation structurelle propre à la thèse d'entrée reste active ;
- dès que la phase 15m confirme le sens de la position, `reversalConfirmed=true`; une future phase opposée redevient une cause normale de sortie.

Replay causal : les huit entrées LONG du 20/09 ~02:02–02:17 UTC qui étaient fermées au tick suivant uniquement pour phase 15m opposée passent désormais en HOLD tant que leur invalidation d'entrée n'est pas franchie.

## 2. Admission avec structure déjà invalidée
Problème démontré : `risk.entryAllowed` pouvait être vrai alors que `risk.structural.breached=true`, puis `action.js` fermait immédiatement la position pour invalidation structurelle.

Correctif : `structuralBreached` fait désormais partie du contrat d'admission. Une structure déjà invalidée produit `entryAllowed=false` avec la raison `structure deja invalidee avant admission`.

Replay : plusieurs entrées historiques admises dans cet état (dont les LONGs du 20/09 matin sous l'origine CREUX 15m 80354.8) seraient maintenant refusées.

## 3. SEQUENCE_MEMORY / WHERE directionnel
Problème démontré : la mémoire WHERE ne conservait pas la nature support/résistance. Un `RECENT_WHERE` pouvait donc servir indifféremment à LONG ou SHORT.

Correctif :
- `where.js` expose désormais `nature` et `anchorType` sur les LGI actives ;
- la mémoire WHERE conserve prix d'observation, lignes LGI, interaction S/R, directions compatibles et preuve directionnelle ;
- un WHERE récent n'est réutilisable que si sa direction est compatible avec la direction courante de continuation ;
- un WHERE courant reste traité comme auparavant dans ce patch, afin de ne corriger que l'artefact démontré de mémoire sans élargir silencieusement la stratégie.

Replay du SHORT 81030.4 : le dernier WHERE pertinent avant entrée était une LGI `SUPPORT` ~81130.7. La mémoire corrigée la classe `long` uniquement ; elle ne peut plus autoriser une continuation SHORT.

## État de position enrichi
Une position V3 conserve désormais :
- `entryMode` ;
- `invalidationPrice` ;
- `entryStructuralOrigin` ;
- `reversalConfirmed` / `reversalConfirmedAt`.
Ces champs sont également exposés dans l'audit/évaluation et l'historique de sortie.

## Validation
- `tests/v3lab/coherence-regression.test.js` : OK
- `tests/v2/core-contract.test.js` : OK
- `tests/v2/simulator-v02-regression.test.js` : OK
- replay historique ciblé REVERSAL_FORMING : comportement corrigé sur les cas nocturnes ;
- replay WHERE du SHORT 81030.4 : ancien support non réutilisable pour short ;
- redémarrage contrôlé de `cerveau-central` effectué sans position V3 ouverte.

## Backup
`archives/v3lab-02-pre-coherence-fixes-20260920T101427Z`
