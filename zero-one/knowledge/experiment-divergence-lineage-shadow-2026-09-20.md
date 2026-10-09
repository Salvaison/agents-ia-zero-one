# Expérience shadow — divergence lineage / âge structurel — 20/09/2026

## Hypothèse
L'ancienneté décisionnellement pertinente d'une divergence n'est pas principalement son âge en minutes ni le nombre de pivots E15 qui la séparent du présent. Une divergence reste descriptivement pertinente tant que ses ancres appartiennent à la même lignée de mouvement. Une transition de mouvement confirmée rend les divergences du mouvement précédent historiques.

Le passage de MCB par zéro est une preuve de transition possible, jamais une preuve suffisante de transfert durable de puissance.

## Implémentation
Module : `modules/v3lab/experiments/divergence-lineage-shadow.js`
Version : `divergence-lineage-shadow-v0.1`
Impact décisionnel : **aucun** (`decisionImpact=false`).

Le shadow 15m enregistre :
- un `movementCandidate` provisoire ;
- le début / fin / direction de la jambe E15 significative la plus récente qui reste structurellement non résolue ;
- preuve de transition MCB : premier changement de polarité, nombre de passages zéro, polarité courante ;
- toutes les divergences confirmées récentes et les divergences en formation contre plusieurs ancres antérieures ;
- `ageMinutesFromOlder` ;
- `agePivots` ;
- pivots intermédiaires et nombre de pivots de même côté ;
- `sameMovementCandidate` ;
- `structuralAge = CURRENT_MOVEMENT | PREVIOUS_MOVEMENT` ;
- `lifecycleCandidate = ACTIVE | HISTORICAL` ;
- contenu entre ancres : durée, intégrale de `|LBW|`, intégrale signée, passages zéro, extrema LBW, déplacement prix et `pricePerLbwMass`.

Un E15 intermédiaire ne supprime donc jamais automatiquement une divergence dans ce shadow.

## Définition provisoire de la frontière
La frontière de mouvement est volontairement expérimentale. v0.1 choisit la jambe E15 significative non résolue la plus récente, et non la plus grande jambe historique. Elle est marquée `PROVISIONAL` et ne prétend pas démontrer le transfert de puissance.

La confirmation d'une nouvelle campagne devra être confrontée au MW : géométrie E15→E15, structure prix, contenu des lobes et surtout transfert durable dans la microstructure (rendement du camp gagnant / perte de rendement adverse / terrain conservé).

## Cas live de validation initiale — 20/09/2026
Le shadow reconnaît actuellement comme campagne candidate :
- départ : CRÊTE E15 du 19/09 15:30 UTC (17:30 Paris), prix 81 954.6, LBW 78.468797 ;
- jambe structurante : jusqu'au CREUX E15 du 20/09 02:45 UTC, prix 80 354.8, LBW -90.255454 ;
- direction candidate : short ;
- retracement post-jambe observé lors de l'initialisation : ~0.199 ;
- premier passage de polarité MCB après le départ : 19/09 18:00 UTC (20:00 Paris) ; ce passage est seulement une preuve de transition.

Divergence active candidate initiale :
- bullish forming ;
- ancienne ancre : CREUX E15 20/09 02:45 UTC ;
- nouvelle extrémité : lobe live du 20/09 11:00 UTC ;
- `structuralAge=CURRENT_MOVEMENT` ;
- un pivot E15 intermédiaire n'annule pas automatiquement cette lecture.

La divergence bearish reliant la CRÊTE du 18/09 15:00 UTC à la CRÊTE du 19/09 15:30 UTC est classée `HISTORICAL`, car sa première ancre appartient au mouvement précédent tandis que la seconde correspond à la frontière candidate de la campagne baissière actuelle. Cela reproduit la lecture visuelle validée par Benjamin (ligne rouge historique vs ligne verte active).

## Falsification
Le shadow devra être considéré comme erroné si, sur le corpus MW multi-jours :
- ses frontières de mouvement ne correspondent pas aux transferts durables observables dans la microstructure ;
- il conserve comme ACTIVE des divergences clairement séparées par une nouvelle campagne établie ;
- il classe HISTORICAL des divergences qui continuent à décrire causalement le même mouvement ;
- le contenu des lobes n'apporte aucune information supplémentaire par rapport au simple couple prix/LBW.

Aucune promotion vers RISK/ACTION sans revue des observations.
