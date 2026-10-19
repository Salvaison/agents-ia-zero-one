# Elastic Sync v0.3 — Evidence Conversion — 2026-10-19

## Statut
SHADOW PUR — decisionImpact:false.

Aucune loi active BOONO n'est modifiée.

## Objectif
Passer de l'ordre des preuves à leur valeur causale observée :
- quand une preuve apparaît, que fait réellement le prix ensuite ?
- une contre-preuve est-elle récompensée ou absorbée ?
- quelles transitions entre preuves reviennent régulièrement ?
- l'ajout d'une nouvelle famille de preuve améliore-t-il la conversion de la thèse ?

## Conversion après preuve
Pour la première apparition de chaque preuve dans un épisode Elastic :
- timestamp et prix ;
- famille : MCB3 / MCB15 / CONVERSION / FLOW / BOUNDARY ;
- polarité : THESIS ou COUNTERFACT ;
- direction propre de la preuve ;
- contexte PM3/PM5, LBW3/LBW15, pente LBW15, pente MF15, MA3/MA15, lobe/structure.

Horizons prospectifs :
- +1 min
- +3 min
- +5 min
- +15 min
- +30 min

Mesures :
- déplacement signé dans la direction propre de la preuve ;
- déplacement signé dans la direction de l'épisode ;
- MFE / MAE depuis la preuve ;
- rétention du terrain favorable ;
- ratio net / excursion totale ;
- contexte des autres preuves au moment de l'horizon ;
- +220 avant -180.

Une contre-preuve est donc mesurée dans sa propre direction :
un E15 DN au milieu d'une campagne LONG peut être objectivement récompensé ou absorbé.

## Nouvelles preuves suivies
En plus du vocabulaire v0.2 :
- LBW3_ZERO_SIDE / OPPOSITE
- PM3_OPPOSITE / PM5_OPPOSITE
- PRICE_OPPOSITE_PRODUCTIVE
- LBW15_SLOPE_OPPOSITE
- E15_OPPOSITE_LIVE / CONFIRMED
- LBW15_ZERO_OPPOSITE
- MF15_SLOPE_OPPOSITE
- LOBE3 / STRUCT3 / STRUCT15 opposés
- MA3_SIDE_ALIGNED / OPPOSITE
- MA15_SIDE_ALIGNED / OPPOSITE

## Interactions causales
Les premiers événements sont regroupés par timestamp réel.
Aucun ordre n'est imposé à l'intérieur d'un même timestamp.

Entre deux groupes successifs, le shadow mesure :
- preuve source → preuve destination ;
- nombre d'occurrences ;
- délai moyen ;
- terrain prix consommé entre les deux ;
- prospectivement, conversion 5m après la preuve destination.

Les interactions historiques v0.2 sont conservées pour les ordres/délais.
Les conversions post-preuve commencent prospectivement avec v0.3.

## Migration
46 épisodes complétés v0.2 ont été conservés.
L'ancien épisode actif v0.2 a été abandonné au changement de version car il ne possédait pas d'horloge prospective de conversion fiable.

## Exemples d'interactions déjà observées sur l'historique v0.2
- E3_OPPOSITE_LIVE → E3_OPPOSITE_CONFIRMED : 14 occurrences, lag moyen ~4.1 min.
- LBW15_SLOPE_ALIGNED → PRICE_PRODUCTIVE : 10 occurrences, lag moyen ~2.2 min.
- LBW15_SLOPE_ALIGNED → PM3_EFFECTIVE : 9 occurrences, lag moyen ~1.4 min.
- E3_LIVE → E3_CONFIRMED : 9 occurrences, lag moyen ~5.7 min.
- PM3_EFFECTIVE → PM5_EFFECTIVE : 8 occurrences, lag moyen ~1.6 min.

Ces valeurs sont descriptives ; elles ne donnent aucune autorité live.
