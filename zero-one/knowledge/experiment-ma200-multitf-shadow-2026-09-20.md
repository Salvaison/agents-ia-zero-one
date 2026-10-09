# Expérience shadow — MA200 multi-TF — 20/09/2026

## Objet
Observer prospectivement comment le prix interagit avec la MA200 sur plusieurs horizons sans modifier les décisions V3-LAB.

Timeframes suivies : **3m, 15m, 1h, 4h, 1d (daily)**.

`decisionImpact=false` : aucune couche RISK/ACTION ne lit ce shadow.

## Module
- `modules/v3lab/experiments/ma200-shadow.js`
- version `ma200-multitf-shadow-v0.1`
- raccordé à `modules/v3lab/experiments/structure-shadow.js`
- persisté dans le compact V3 sous `shadow.ma200`.

## Mesures par timeframe
Le shadow enregistre :
- MA200 utilisée, source et fraîcheur ;
- distance prix↔MA200 en USD et % ;
- position `ABOVE / BELOW / AT_MA` ;
- pente MA200 en USD/h et %/jour ;
- durée et nombre de barres de la séquence courante au-dessus ou au-dessous ;
- contacts regroupés en **épisodes** pour éviter de compter chaque bougie voisine comme un nouveau contact ;
- classification des épisodes :
  - `CROSS_UP`
  - `CROSS_DOWN`
  - `HOLD_AS_SUPPORT`
  - `HOLD_AS_RESISTANCE`
  - contact ouvert depuis dessus/dessous ;
- dernier franchissement strict close↔MA200 ;
- dernier maintien de MA200 comme support/résistance ;
- comptes des épisodes et historique récent.

La tolérance de contact reprend `config.srZone.ma200TolerancePercent` (0,1 % actuellement).

## Synthèse inter-TF
Le shadow produit :
- TF actuellement au-dessus / au-dessous / en interaction ;
- même synthèse limitée aux sources fraîches OKX ;
- `lowTf3mRecentReclaim` ;
- `tf15mAboveWithRecentSupportHold` ;
- `reversalMaturationCandidate` quand ces deux observations coexistent.

Cette dernière valeur est une **hypothèse descriptive** et non une instruction de trade :
> un reclaim 3m après une campagne sous MA200, combiné à une MA200 15m tenue comme support, peut décrire une maturation de retournement.

Elle doit être falsifiée par le MW multi-jours.

## Frontière de source TradingView
Les archives MCB/MA200 avant le 20/09/2026 sont multi-source Bybit→OKX. Le shadow expose donc explicitement :
- `archiveMixedSource=true` ;
- `okxStableFrom=2026-09-20T09:53:41Z` ;
- `currentMaSourceEra=OKX_POST_CUTOVER | PRE_CUTOVER_ARCHIVE`.

La synthèse de maturation utilise uniquement la preuve 3m/15m fraîche post-cutover OKX. Les anciens épisodes restent visibles à titre descriptif mais ne sont pas utilisés pour conclure au motif de maturation.

## Validation live initiale
Au premier passage live après activation :
- **3m** : prix au-dessus de MA200 ~80.50k ; dernier `CROSS_UP` strict vers 14:24 UTC ; maintien ensuite au-dessus ; épisode récent `HOLD_AS_SUPPORT` ;
- **15m** : prix au-dessus de MA200 ~80.31k ; plusieurs épisodes `HOLD_AS_SUPPORT` dans la journée ;
- **1h** : prix nettement au-dessus de MA200 ~78.68k ;
- **4h** : prix nettement au-dessus de MA200 ~76.15k ;
- **1d** : MA200 ~73.36k, mais la valeur live disponible au moment d'activation provient encore d'un fichier non rafraîchi depuis avant le cutover OKX : `PRE_CUTOVER_ARCHIVE`. Elle est observée mais exclue des preuves de synthèse tant qu'elle n'est pas rafraîchie sur OKX.

La synthèse initiale donne `reversalMaturationCandidate=true` parce que le 3m vient de reprendre sa MA200 tandis que le 15m reste au-dessus avec des maintiens récents comme support. Ce résultat est uniquement un point de départ expérimental.

## Non modifié
Le gate `TURNING_POINT_15M` et sa logique de reversal restent **strictement inchangés**. Aucun shadow spécifique de relaxation de ce gate n'a été ajouté dans ce chantier.

## Tests
- `tests/v3lab/ma200-shadow.test.js` : OK
- `tests/v3lab/coherence-regression.test.js` : OK
- `tests/v3lab/divergence-lineage-shadow.test.js` : OK
- `tests/v2/core-contract.test.js` : OK
- `tests/v2/simulator-v02-regression.test.js` : OK

Backup : `archives/v3lab-pre-ma200-shadow-20260920T150025Z`
