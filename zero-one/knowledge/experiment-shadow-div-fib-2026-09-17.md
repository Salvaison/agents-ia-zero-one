# Expérience shadow — divergences structurelles + R/R Fib

Date: 2026-09-17
Statut: actif en observation, aucun impact décisionnel.
Version décisionnelle: `constitution-v0.2a`.
Version shadow: `div-fib-shadow-v0.1`.

## Hypothèse

Les mêmes pivots structurels prix/LBW peuvent fournir une base cohérente pour:
- détecter les divergences prix ↔ LBW;
- mesurer leur géométrie et leur caractère multiple;
- construire une impulsion/retracement A-B-C;
- projeter un territoire de continuation Fibonacci;
- proposer une invalidation structurelle comparable au reward.

## Divergence shadow

TF observés: 3m, 15m, 1h, 4h.
Pivots: extrema LBW confirmés, amplitude minimale issue de `scoring.wavePivot.minAmplitude`.
Prix associé: low pour pivot LBW bas, high pour pivot LBW haut.
Bullish: prix fait LL tandis que LBW fait HL.
Bearish: prix fait HH tandis que LBW fait LH.
Les candidats live sont marqués `forming`; les paires causales confirmées sont `confirmed`.
Le détecteur historique `divergence.js` est conservé en parallèle comme référence indépendante.
## R/R shadow

Le R/R actif V0.2a reste inchangé.
Le shadow enregistre:
- risque micro 3m actif, comme témoin;
- invalidation structurelle 15m et 1h issue du pivot C;
- reward WHERE actif;
- Fib A-B-C 15m et 1h;
- projections 1.0 / 1.272 / 1.618 depuis C;
- ratios comparatifs entre chaque reward et chaque risque disponible.

Le retracement C est mesuré par rapport à l'impulsion A-B et comparé descriptivement à 0.382 / 0.618.
Aucun seuil Fib n'autorise ou n'interdit un trade.

## Falsification / promotion

Comparer après accumulation d'un nouveau corpus:
- projection shadow vs MFE réel;
- invalidation micro vs MAE réel;
- invalidation structurelle vs MAE réel;
- divergences forming/confirmed vs arrêt de translation, réaction et reconstruction;
- confluence 3m/15m/1h/4h vs simples divergences isolées.

Une variable shadow ne devient stratégique qu'après validation sur plusieurs régimes.
Données détaillées: `data/trade-sim-v02-shadow.ndjson`.