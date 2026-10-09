# Divergence causal shadow v0.2 — 2026-10-05

## Statut

- Module : `modules/v4/experiments/divergence-causal-shadow.js`
- Version : `divergence-causal-shadow-v0.2`
- Impact décisionnel : **aucun** (`decisionImpact=false`)
- Usage : catalogue diagnostic + overlay WAVE 15m/3m.

## Motif de la refonte

L'ancien `divergence.js` dépendait de `blue_wave` et des lignes `buy != 0`, ce qui rendait invisibles plusieurs ancres valides.

Le shadow lineage v0.1 utilisait LBW et des pivots E15 mais comparait trop d'ancres entre elles. Il produisait une forêt de paires qui ne correspondait pas à la lecture visuelle.

Le nouveau modèle travaille en **lignées causales**, conserve séparément `extremeTs` et `confirmedAt`, et ne génère jamais toutes les combinaisons possibles d'ancres.

## Contrat causal par TF

### 3m / 15m
Les pivots réguliers viennent des signaux MCB live suffisamment persistants pour rejeter les flashes intra-bougie.

### 1h / 4h
Les pivots de lobe utilisent des extrema LBW locaux confirmés lorsque LBW s'est suffisamment éloigné de l'extrême. Les continuations utilisent des swings prix causaux avec LBW lu sur le swing.

### Daily
Les pivots confirmés utilisent directement les colonnes natives `wt1_cross_up/down` du CSV.

### Weekly
Le CSV Amsterdam commence actuellement en août 2026. Le cas de référence mars→juillet ne peut donc pas être calculé : statut attendu `INSUFFICIENT_HISTORY`.

## Structures reconnues

- `REGULAR` : divergence régulière entre prix et LBW.
- `CONTINUATION / CAUSAL_PRICE_SWING_CHAIN` : divergence établie puis prolongée par une continuation cohérente.
- `CONTINUATION / HIDDEN_FORMING` : structure hidden/forming sur le lobe courant.
- `MULTIDIV / ANCHOR_PERSISTENT` : plusieurs points restent divergents contre une même ancre initiale. Les points ne doivent pas nécessairement diverger pairwise entre eux.

## Jeu de vérité terrain validé visuellement

### 15m
1. Bearish : 04/10 ~23:30 → 05/10 ~03:45.
2. Bullish forming : 05/10 ~07:15 → courant.
3. Bullish continuation : 03/10 ~23:00 → courant.

### 3m
4. Bullish : 05/10 ~11:18/11:21 → ~17:45.

### 1h
5. Bullish continuation : 02/10 15:00 → 04/10 13:00 → 05/10 02:00.
6. Bullish forming : 03/10 01:00 → courant.

### 4h
7. Aucune divergence.

### Daily
8. Bearish multidiv : 25/08 → 24/09 → courant.

### Weekly
9. Bullish : 02/03 → 13/07. **Référence utilisateur non vérifiable actuellement faute d'historique weekly sur Amsterdam.**

## Affichage

Sur les Waves visibles :
- bullish = ligne verte fine ;
- bearish = ligne rouge fine ;
- 15m et 3m seulement, car ce sont les deux panneaux WAVE actuellement présents ;
- les TF supérieures restent dans le catalogue diagnostic et ne sont pas projetées artificiellement sur une autre TF.

## Falsification

Le détecteur reste shadow. Toute ligne visible jugée non pertinente doit être traitée comme un cas de falsification avant toute promotion vers la logique de décision.
