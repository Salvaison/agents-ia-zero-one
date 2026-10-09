# BOONO V3 — E15 semantics R1.1 MAJORLOBE — 29/09/2026

**Validation :** Benjamin, 29/09/2026 après observation live erronée.
**Config active :** `V3EXP-20260929-E15SEM-R1.1-MAJORLOBE`.
**Backup :** `archives/v3lab-e15sem-r11-pre-20260929T203347Z`.
**État avant correction :** aucune position legacy/V2/V3 ; R1 avait 0 trade fermé, 0 overflow.

## Bug démontré

L'état vivant restait :
`WAVE 15m DESCENTE → short · ancre CRETE 84544.9`
alors que le lobe négatif 15m était déjà achevé et qu'un nouveau lobe positif se développait.

Cause exacte :
`confirmedPivots()` exigeait une pointe locale avec
`min(|v-prev|,|v-next|) >= 2`.
Le vrai fond 16:00Z faisait -69.921, mais 15:45Z était déjà -69.759 :
écart adjacent ~0.163 seulement, donc le creux majeur était rejeté parce qu'il était large/plat.

## Nouvelle sémantique 15m

Un E15 majeur est maintenant l'extrême LBW absolu d'un lobe de signe complet
délimité causalement par deux passages de zéro.

Les extrema locaux restent disponibles séparément comme `intermediatePivots`
pour respiration/risque, mais ne structurent plus automatiquement WAVE 15m.
### Cas live corrigé

Lobe positif précédent :
- E15 majeur CRETE LBW +83.2248 à 06:45Z ;
- prix à l'ancre LBW : 83984.6 ;
- extrême prix du même lobe : 84544.9 à 13:15Z.

Lobe négatif suivant :
- passage sous zéro : 14:15Z ;
- E15 majeur CREUX LBW -69.9213 à 16:00Z ;
- prix à l'ancre LBW : 82937.9 ;
- extrême prix du lobe : 82850.8 à 16:45Z ;
- passage positif / lobe fermé : 18:30Z.

Relation majeure :
LBW span ~153.15 points ; translation prix E15→E15 ~-1046.7 $.

Après correction live :
- `wave.phase=MONTEE` ;
- `wave.direction=long` ;
- `wave.origin=CREUX 16:00Z / LBW -69.921 / 82937.9` ;
- `wave.price.minPrice=82850.8` ;
- `completedLeg.direction=short`, `status=COMPLETED`, `decisionImpact=false` ;
- `structural.direction=long`, `status=ACTIVE`.
## Thèse active

Le dernier leg majeur achevé reste descriptif.
La thèse active dérive du dernier E15 majeur confirmé + translation prix depuis ce pivot.

R1.1 exige pour rendre la thèse structurelle disponible :
- relation entre les deux derniers E15 majeurs avec span LBW >=80 ;
- déplacement prix du leg achevé >=50 $ ;
- translation prix depuis le dernier pivot majeur >=50 $.

Le seuil temporel n'est pas encore figé : la durée est exposée descriptivement.
LBW/phase seuls ne donnent jamais permission de trade.

Pour le cas courant :
- completed leg = SHORT (mouvement qui a mené au creux) ;
- thèse active = LONG (résolution depuis le creux confirmée par le prix).

## RISK

La protection est calculée depuis le dernier E15 majeur :
pour le LONG courant, le minimum causal depuis l'ancre est 82850.8.

Le reclaim structurel vise le prix du précédent E15 majeur ;
les extrêmes du pricePath restent cibles secondaires causales.

Au premier état vérifié, RISK reste LONG mais refuse l'entrée pour R:R insuffisant :
la correction structurelle n'a donc pas créé une entrée forcée.
## Tests et vérification

Tests passés :
- syntaxe action/wave/risk/three-trade-block ;
- V3 coherence regression ;
- causal-events shadow ;
- dominance threshold ;
- three-trade-block ;
- V2 core-contract ;
- V2 simulator regression.

Un test de régression reproduit explicitement un fond arrondi :
- local pivot detector rate le creux -69.921 ;
- completed-lobe detector le reconnaît ;
- WAVE passe MONTEE ;
- completedLeg reste SHORT descriptif ;
- structural devient LONG actif ;
- pricePath conserve le vrai minimum 82850.8.

Restart limité à `cerveau-central`.
Aucune nouvelle erreur PM2 observée.

R1 n'avait produit aucun trade avant cette correction :
R1.1 repart donc proprement à 0/3, baseline history=128.
