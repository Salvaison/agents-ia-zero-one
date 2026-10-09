# BOONO V4 — Implémentation initiale et mise en observation — 01/10/2026

## Décision validée

Benjamin classe V3 comme artefact décisionnel : trop complexe, ambigu et devenu difficile à relier directement au réel.
V3 est conservée uniquement comme **shadow/counterfactual**.

V4 devient le moteur paper-trading primaire.
Aucun ordre réel n'est envoyé.

Constitution source :
`knowledge/v4-constitution-2026-10-01.md`.

Backup pré-bascule :
`archives/v3-demotion-to-shadow-20261001T102148Z`.

## Rupture architecturale

V4 n'est pas un vote entre modules.

Hiérarchie active :
MCB_STATE → MCB_THESIS → PM LIVE / PRICE_TRANSLATION → TICKER_CONFIRMATION → ACTION.

CONTEXT observe niveaux/MA/liquidité/trendlines sans confirmer ni veto.
RISK protège capital/gains et n'a aucune autorité directionnelle.
DOMINANCE V3 n'a plus d'impact décisionnel V4.
R/R arbitraire n'a plus d'impact décisionnel.
## Lois actives V4-0.1

- `directionAuthority = MCB_ONLY`.
- Aucun fallback vers une direction externe si MCB est `UNCLEAR`.
- Tout lobe zéro-borné est d'abord `E15_CANDIDATE`, jamais "majeur" par simple existence.
- Preuve majeure oscillateur initiale : relation opposée avec span LBW >=80.
- Importance prix atypique est exposée séparément comme candidat structurel ; elle ne crée pas seule une direction.
- PM Live ne crée pas de direction ; il mesure la traduction de la thèse MCB.
- Ticker ne crée pas de direction ; il confirme rendement/effort/conservation.
- Contexte : informatif uniquement.
- R/R : informatif uniquement.
- Cap perte : **500 USD absolus**.
- Position : nouvelle thèse MCB opposée + traduction PM alignée + ticker confirmé => sortie rapide.
- Si un gain/MFE existe : `EXIT_PROFIT_PROTECTION`.
- Sinon : `EXIT_MCB_FLIP`.

## Modules

- `modules/v4/layers/mcb-state.js`
- `modules/v4/layers/mcb-thesis.js`
- `modules/v4/layers/price-translation.js`
- `modules/v4/layers/ticker-confirmation.js`
- `modules/v4/layers/context.js`
- `modules/v4/layers/risk.js`
- `modules/v4/layers/action.js`
- `modules/v4/core/engine.js`
- `modules/trade-simulator-v4.js`
## V3 shadow

Le point d'entrée stable `modules/trade-simulator.js` charge désormais V4.

V3 est encore évaluée dans V4 mais :
- ne peut pas ouvrir une position V4 ;
- ne peut pas fermer une position V4 ;
- sa position paper déjà ouverte au moment de la bascule a été migrée en `v3ShadowPosition` ;
- ses entrées/sorties futures sont journalisées uniquement dans
  `data/trade-sim-v3-shadow-v4.ndjson`.

Position V3 migrée au shadow :
SHORT 83550.2, entrée 01/10 10:17:26Z, ancien mode `PHASE_CONTINUATION`.

Le fichier d'état V3 original est figé depuis la bascule ; V4 possède désormais son propre état.

## Stockage V4

- `data/trade-sim-v4-state.json`
- `data/trade-sim-v4-history.json`
- `data/trade-sim-v4-decisions.ndjson`
- `data/trade-sim-v4-evaluations.ndjson`
- `data/trade-sim-v3-shadow-v4.ndjson`
## Vérification causale V4-001

Replay partiel causal du LONG école 30/09 @83065.3 :
- current lobe 15m CREUX ;
- extrême LBW -63.853 ;
- LBW live à l'entrée ~-30.823 ;
- récupération MCB ~51.7% ;
- span E15 opposé ~114.12 ;
- prix seulement +146.4 USD depuis le low 82918.9 ;
- résultat V4 : `LONG_FORMING`.

La partie PM/ticker ne peut plus être replayée depuis `audit-history.json`,
car ce fichier roulant commence maintenant après l'entrée.
Les valeurs exactes restent conservées dans le contexte du trade V3 :
PM +33.8 USD, yield ~15.69 USD/BTC, ~1.69x P95 avec effort modéré.

Conclusion :
[DÉMONTRÉ] la nouvelle couche MCB reconnaît causalement le cas école comme reversal LONG en formation.
[À VALIDER] admission complète V4 en conditions prospectives avec PM/ticker live.

## État live après activation

`cerveau-central` online, V4 active.
Première observation :
- V4 position : aucune ;
- MCB thesis : UNCLEAR ;
- ACTION : NO_TRADE / OBSERVE ;
- contrat : MCB_ONLY, contexte/RR/dominance hors décision, maxLoss=500.
Ce comportement d'abstention est conforme : aucune direction de secours n'est inventée.
## Interface

Correction de lecture des rapports :
- l'état ouvert/fermé de chaque rapport est conservé pendant les refresh ;
- sur le sous-onglet **Rapports**, le refresh automatique 30s est maintenant suspendu ;
- il reprend automatiquement en revenant sur Etat/Historique ;
- l'archive complète des rapports V3 reste visible sous les futurs rapports V4.

Ainsi l'utilisateur peut laisser un rapport ouvert aussi longtemps que nécessaire pour l'étudier.

## Points formels encore à confronter au réel

1. **Indépendance des preuves / double comptage.**
   PM Live et ticker peuvent parfois dériver de la même fenêtre de transactions.
   V4 doit tracer la provenance pour éviter de considérer deux transformations du même signal comme deux preuves indépendantes.

2. **Hystérésis / réentrée.**
   Puisque V4 accepte de sortir sur une respiration afin de protéger les gains,
   il faut mesurer prospectivement quand et comment une même thèse MCB peut redevenir éligible sans churn.

3. **Qualité et fraîcheur des données.**
   Toute preuve doit rester timestampée LIVE/CONFIRMED/UNKNOWN et ne jamais être substituée par un fallback directionnel.

4. **Évaluation économique.**
   Pour chaque campagne : P&L après frais, MFE capturé, giveback, MAE, durée d'immobilisation,
   sorties sur fausse respiration et opportunités opposées manquées.

5. **Qualification E15 prix-structurel.**
   Le seuil exploratoire de translation prix atypique n'est pas une loi.
   Il doit être falsifié sur cas historiques puis prospectifs avant de devenir une qualification majeure.
