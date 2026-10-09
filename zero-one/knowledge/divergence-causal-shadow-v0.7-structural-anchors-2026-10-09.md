# Divergence causal shadow v0.7 — ancres structurelles actives — 2026-10-09

## Problème corrigé

Deux divergences UP 15m restaient affichées alors qu'elles n'étaient plus des relations causales actuelles :

1. une régulière réutilisait une ancienne ancre déjà dépassée par des creux structurels plus récents ;
2. une hidden/continuation du 4→5 octobre était déjà consommée par le déplacement prix et n'avait plus de relation avec la structure actuelle.

## Principe retenu

Une divergence 15m affichée comme relation **actuelle** doit partir du dernier pivot E15 structurel encore actif dans la mémoire de V4, pas d'un vieux pivot mathématiquement compatible.

La source d'ancre est désormais `structuralTrajectory.structuralTurns(..., '15m')`.

Cette mémoire a une propriété importante : des petits pivots de même côté ne remplacent pas automatiquement l'ancre structurelle ; ils peuvent au contraire devenir l'extrémité d'une divergence. L'ancre change seulement lorsque la trajectoire causale E-to-E produit un nouveau pivot structurel pertinent.

## État du cas 09/10

Ancre structurelle UP actuelle :
- CREUX 08/10 18:00 UTC+2
- prix 80 721,6
- LBW -63,817966

Creux local récent :
- 09/10 16:00 UTC+2
- prix 82 423
- LBW -4,025171

Le prix est plus haut et le LBW est également plus haut : **aucune divergence UP régulière ni hidden active**.

Ancre structurelle DOWN actuelle :
- CRETE 09/10 06:00 UTC+2
- prix 82 482,4
- LBW +83,608694

Extrémité locale :
- 09/10 14:15 UTC+2
- prix 83 310,9
- LBW +64,855796

Cette relation reste une divergence baissière régulière valide.

## Affichage

Le catalogue courant ne conserve plus les anciennes divergences bullish consommées comme relations actives. Elles peuvent rester disponibles dans les données historiques/replay, mais ne doivent pas polluer la Wave live.

## Autorité

`decisionImpact=false`.

Aucun changement d'admission, sortie, risque ou direction V4.
