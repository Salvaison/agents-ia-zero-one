# TP multi-fraction Shadow v0.1 — 2026-10-09

## Objet

Comparer causalement plusieurs tailles de TP1/TP2 sans modifier la position V4 réelle ni les lois de décision.

Le Shadow est **strictement observationnel** : `decisionImpact=false`.

## Variantes

Le moteur suit en parallèle :

- référence `HOLD_100` : aucune prise partielle, fermeture à la sortie V4 normale ;
- référence `EXIT_100_AT_FIRST_STRESS` : fermeture complète au premier stress productif ;
- TP1 : 10%, 20%, 25%, 33% de la position initiale ;
- TP2 : 0%, 10%, 20%, 25%, 33% du runner restant après TP1.

Cela produit 20 combinaisons TP1/TP2, plus `HOLD_100`. La sortie 100% au premier stress est une référence supplémentaire, pas une trajectoire maintenue.

## Événement TP1

TP1 utilise exactement la famille de conditions V4.9 :

- MFE >= 440 USD BTC ;
- giveback >= 180 USD et < 360 USD ;
- PM adverse productif ;
- microstructure adverse productive ;
- thèse MCB toujours alignée avec la position ;
- structure MF15 encore alignée.

Aucun prix cible fixe n'est introduit.

## Armement TP2

TP2 ne peut jamais être pris simplement parce qu'une deuxième attaque adverse survient.

Après TP1, il faut d'abord observer un **nouveau MFE causal** :

- `mfeAt` doit être postérieur au TP1 ;
- le nouveau `mfeUsd` doit être strictement supérieur au MFE enregistré au TP1.

Il n'existe donc aucun seuil arbitraire de type +50$, +100$ ou +250$ pour dire que la campagne a repris.

Une fois ce nouveau terrain établi, le prochain stress adverse productif répondant aux mêmes critères structurels peut déclencher TP2.

## Fractions TP2

TP2 est exprimé comme fraction du **runner restant après TP1**.

Exemple :

- TP1 25% sur 1500$ -> runner 1125$ ;
- TP2 25% -> 281,25$ fermés ;
- runner final -> 843,75$.

## Comptabilité économique

Chaque trajectoire possède sa propre comptabilité synthétique :

`PNL net = PNL brut réalisé + PNL brut runner - frais entrée - frais TP1 - frais TP2 - frais sortie finale`

Les frais utilisent le `feeModel` attaché à la position V4 réelle.

Avec la configuration actuelle :

- entrée : taker 0,05% ;
- sorties partielles : taker 0,05% ;
- sortie finale : taker 0,05%.

Le notionnel de sortie est valorisé au prix réel de chaque exécution synthétique.

Funding et slippage restent hors modèle, comme dans V4.9.1.

## Mesures finales

Pour chaque variante :

- PNL brut ;
- PNL net ;
- frais totaux ;
- gain net verrouillé après les prises partielles ;
- contribution brute du runner ;
- fraction finale du runner ;
- capture du MFE ;
- delta net vs `HOLD_100` ;
- mutilation vs `HOLD_100` ;
- bénéfice vs `HOLD_100`.

Le classement expose :

- meilleur couple TP1/TP2 ;
- meilleur résultat global, `HOLD_100` inclus ;
- résultat `HOLD_100` ;
- résultat de la sortie complète au premier stress.

## Stockage

Pendant le trade, l'état complet reste dans la position V4 afin de survivre à un redémarrage.

Les évaluations périodiques n'enregistrent qu'un résumé compact pour éviter de reproduire le problème de volumétrie V3.

À la clôture :

- résumé dans `trade-sim-v4-history.json` ;
- résultat complet une seule fois dans `trade-sim-v4-tp-shadow.ndjson`.

## Interface

Les rapports BOONO affichent :

- état TP1 / armement TP2 / TP2 ;
- nombre de trajectoires ;
- meilleur couple à la clôture ;
- PNL net du meilleur couple ;
- comparaison avec `HOLD_100` ;
- comparaison avec la sortie 100% au premier stress ;
- top 5 des variantes.

## Falsification

Le Shadow ne devra influencer V4 que si plusieurs campagnes montrent une supériorité nette et robuste après frais.

Une fraction n'est pas retenue parce qu'elle gagne sur un seul gros trade. Il faut notamment examiner :

- PNL net cumulé ;
- dispersion par campagne ;
- mutilation des gros gagnants ;
- gain sécurisé sur les campagnes qui rendent leur MFE ;
- fréquence réelle de TP2 ;
- sensibilité aux frais/slippage futurs.

## Version

- expérience : `tp-multifraction-shadow-v0.1`
- moteur hôte : `v4.9.2-tp-shadow-20261009`
- décision : **aucun impact**
