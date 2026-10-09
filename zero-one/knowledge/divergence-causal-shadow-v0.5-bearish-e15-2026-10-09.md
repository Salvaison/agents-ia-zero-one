# Divergence causal shadow v0.5 — bearish E15 local — 2026-10-09

## Cas déclencheur

Le 09/10/2026, une divergence baissière 15m clairement visible sur MarketCipher n'était pas dessinée dans la Wave BOONO :

- E15 / LBW initial : environ +83,61, prix ~82 482 ;
- E15 suivant : environ +64,86, prix ~83 311 ;
- delta prix : +828,5 USD ;
- delta LBW : -18,75.

Il s'agit d'une divergence régulière baissière : prix fait un sommet plus haut tandis que LBW fait un sommet plus bas.

## Cause

Le côté bullish 15m utilisait déjà un flux local causal E15 non fusionné.

Le côté bearish 15m utilisait encore l'ancien modèle basé sur la persistance de signaux MCB live. Le sommet LBW le plus fort du cas présent n'avait pas produit le pivot persistant attendu ; le détecteur conservait donc une divergence plus petite et plus ancienne.

## Correction

Version : `divergence-causal-shadow-v0.5`.

Les divergences régulières bearish 15m utilisent désormais le même flux causal local E15 que les bullish :

- pivot LBW local confirmé après 2 bougies ;
- prix HH d'au moins 50 USD ;
- LBW LH d'au moins 5 points ;
- sélection de la divergence dont l'extrémité causale est la plus récente ;
- pour une même ancre, extension vers le plus haut sommet prix qualifiant.

Les hidden/continuation bearish ne sont pas promues par cette correction : elles restent à valider séparément.

## Autorité

`decisionImpact=false`.

Cette correction affecte uniquement le diagnostic / affichage Wave. Elle ne modifie ni l'admission, ni les sorties, ni la direction V4.

## Régression

Un test reprend les valeurs du cas du 09/10 et impose :

- ancre prix 82 482,4 / LBW 83,608694 ;
- extrémité prix 83 310,9 / LBW 64,855796 ;
- source `CAUSAL_E15_LOCAL_DIVERGENCE`.

Toute la suite V4 doit rester verte.
