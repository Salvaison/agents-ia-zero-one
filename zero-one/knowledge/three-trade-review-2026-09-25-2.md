# BOONO V3-LAB — Revue du bloc de trois trades #2 — 25 septembre 2026

## 1. Périmètre et verdict

Configuration évaluée : `V3EXP-20260924-WHERE-NOVETO-DOM2OF4-R1`.

Fenêtre du bloc : `2026-09-24T13:27:57.637Z → 2026-09-25T04:45:49.563Z`.

Les données V3 sont continues sur cette fenêtre. Le gap causal du 23 septembre ne la chevauche pas.

**Verdict : NO_THRESHOLD_CHANGE.** Aucun seuil, aucune responsabilité de module et aucun processus de trading ne sont modifiés. WHERE reste descriptif et non-veto. La dominance reste à 2 observations persistantes sur 4, avec preuve ≥ 0,62 et conservation du terrain.

Le quatrième trade, clôturé pendant l'attente de cette revue, est transféré comme premier trade du bloc #3 sous la même configuration.

## 2. Résultats du bloc

| Trade | Direction | Entrée → sortie | Résultat levier | MFE | MAE | Capture |
|---|---|---:|---:|---:|---:|---:|
| 1 | SHORT | 84 400 → 83 710,1 | +8,1742 % | 1 066,7 $ | 7,7 $ | 64,7 % |
| 2 | SHORT | 84 259,4 → 84 341,2 | −0,9708 % | 259,4 $ | 121,3 $ | −31,5 % |
| 3 | LONG | 84 126,8 → 84 256,1 | +1,5370 % | 145,5 $ | 11,9 $ | 88,9 % |

Agrégat : 2 gains / 1 perte, **+8,7403 % levier simulé**, profit factor ≈ 10,0, MFE 1 471,6 $, MAE 140,9 $, capture agrégée ≈ 50,1 %.
## 3. Cohérence MCB et structurelle

Les trois entrées sont des `STRUCTURAL_REASSERTION`. Elles respectent le dernier leg prix E15→E15 confirmé et n'utilisent pas le signe instantané de LBW comme direction autonome.

- SHORT 84 400 : turning, nested3m et dominance alignés après réaction rapide près de MA200 15m/LGI ; plus de 1 100 $ d'espace structurel disponible.
- SHORT 84 259,4 : localisation et espace encore acceptables ; le défaut principal est la restitution d'un MFE de 259,4 $, pas une admission trop tardive.
- LONG 84 126,8 : réaffirmation LONG pendant une phase oscillatoire DESCENTE, avec R:R 5,93 et faible MAE.

Aucune entrée n'est opposée au leg structurel actif. Les divergences restent descriptives/shadow et n'ont déclenché aucun trade seules.

## 4. WHERE, niveaux et trendlines

Sur les 1 030 décisions du bloc :

- `eligibility.location.decisionImpact=false` dans 1 030/1 030 cas ;
- aucun refus causé par WHERE ou la localisation ;
- WHERE est `RELEVANT` 392 fois et `NO_VALID_LOCATION` 638 fois ;
- les trois entrées ont lieu avec `NO_VALID_LOCATION`, ce qui confirme que l'ancien veto aurait supprimé les trois observations réelles.

Les niveaux, LGI, trendlines et MA200 restent disponibles pour mesurer réaction, déplacement consommé, espace restant et R:R. Ils ne sont pas transformés en direction ni en permission.

## 5. Verrous restants

Comptages non exclusifs sur le bloc :

- turning frais absent : 897 ;
- dominance non alignée/persistante : 811 ;
- R:R bloqué : 626 ;
- nested3m non aligné : 402 ;
- régime mentionné comme frein : 155.

Ces volumes montrent encore une sélection forte, mais trois trades plus un overflow ont été obtenus sans nouveau relâchement.
## 6. Décision sur la dominance 2/4

Sur les six trades des deux premiers blocs, les deux entrées directement promues par le seuil 2/4 sont perdantes, pour −1,3186 % cumulé. Ce signal défavorable est réel mais encore ambigu :

- dans le bloc #2, l'entrée concernée aurait satisfait l'ancienne règle 3/4 environ 90 secondes plus tard ;
- le prix d'entrée contrefactuel aurait été presque identique ;
- la perte ne peut donc pas être attribuée causalement au seul passage 3/4 → 2/4 ;
- la configuration complète demeure positive sur les deux blocs et produit enfin des observations.

Décision : conserver la dominance 2/4 pendant le bloc #3. Aucun autre seuil n'est desserré avant trois nouvelles clôtures.

## 7. Occasions manquées et sorties

- Après le grand SHORT gagnant, l'extension LONG n'a pas été reprise immédiatement : la répartie tactique reste à observer, mais l'E15 LONG n'était pas encore confirmé au début du mouvement.
- Le mouvement SHORT 84 760 → 84 020 puis 83 713,9 n'a pas donné de nouvelle entrée, principalement faute de turning frais et d'alignement complet.
- Le trade SHORT perdant montre un problème de conservation/capture après MFE, à examiner côté sortie ; il ne justifie pas de modifier une deuxième famille pendant le même cycle.

## 8. Passage au bloc #3

Configuration conservée : `V3EXP-20260924-WHERE-NOVETO-DOM2OF4-R1`.

Le trade overflow suivant devient le premier trade du bloc #3 :

- SHORT 84 576,3 → 84 398,5 ;
- clôture `2026-09-25T10:09:26.334Z` ;
- résultat +2,1022 % ;
- MFE 220,4 $, MAE 33,7 $ ;
- sortie `EXIT_EXECUTION`.

État attendu après finalisation : bloc #3 à **1/3**, aucun changement de seuil.
## 9. Traçabilité et rollback

Snapshot pré-finalisation :

`archives/v3lab-three-trade-review-block2-20260925T102809Z`

La finalisation utilise le helper atomique `completeReview()`, archive le bloc #2 dans `data/v3lab-experiment-review-history.ndjson`, ouvre le bloc #3 et réinjecte uniquement le trade overflow déjà clôturé.

Rollback de traçabilité : restaurer les fichiers du snapshot ci-dessus. Aucun fichier de logique de trading n'est modifié et aucun processus n'a besoin d'être redémarré.

## 10. Conclusion

Le retrait du veto WHERE a fourni trois observations supplémentaires que l'ancien contrat aurait refusées. Le bloc est fortement positif, mais l'échantillon reste trop petit pour modifier une deuxième famille. Le prochain test conserve donc exactement la même configuration jusqu'à deux clôtures supplémentaires, afin d'atteindre 3/3 dans le bloc #3.
