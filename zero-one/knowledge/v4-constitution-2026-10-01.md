# BOONO V4 — Constitution initiale — 01/10/2026

## Statut

Validation de Benjamin :
- V3 est classée comme artefact décisionnel trop complexe/ambigu.
- V3 peut rester comme shadow/counterfactual, mais ne doit plus être l'autorité de trading.
- V4 doit être confrontée aux données réelles du marché avant toute prétention de validité.
- MCB est l'autorité directionnelle première et ultime.
- Tout le reste décrit, contextualise, confirme ou protège ; aucun autre module n'invente une direction.

## Hiérarchie validée

1. **MCB_STATE** — observe la géométrie MCB, E15 majeur/mineur, maturité et phase.
2. **MCB_THESIS** — propose LONG / SHORT / FORMING / TRANSITION / UNCLEAR depuis MCB uniquement.
3. **CONTEXT** — niveaux, MA, liquidité, trendlines ; appuie ou contrarie le contexte sans confirmer la thèse.
4. **PRICE_TRANSLATION / PM LIVE** — mesure si le prix commence réellement à traduire la thèse MCB.
5. **TICKER_CONFIRMATION** — confirme effort, rendement, changement de camp et conservation du terrain.
6. **DOMINANCE** — résumé secondaire / suivi ; ne donne plus de permission souveraine.
7. **RISK / TRADE_LIFECYCLE** — protège capital et gains ; ne choisit jamais la direction.
## Lois architecturales

- Aucune direction LONG/SHORT ne peut être créée par PM, ticker, dominance, MA, niveau, liquidité ou R/R.
- Une observation contextuelle peut renforcer ou affaiblir la qualité d'une thèse MCB, jamais la renverser.
- Le R/R géométrique sur cible arbitraire n'est plus un veto ni un déclencheur d'entrée.
- Le risque maximal actuel est **500 USD prix absolus** au sizing actuel. Aucun percentile ne peut l'élargir.
- Une position gagnante doit être protégée dès que MCB mûrit et que PM+ticker traduisent contre elle.
- On accepte de sortir sur une respiration si le signal de protection est suffisamment cohérent.
- La réentrée est préférable à la restitution massive d'un MFE déjà obtenu.
- Objectif actuel : capturer proprement la partie du mouvement que BOONO comprend, pas la vague entière.

## Cas école V4-001

LONG 30/09/2026 ~10:38 Paris @ 83065.3.

Séquence causale de référence :
- grand creux MCB 15m autour de LBW -63.85 / prix 82918.9 ;
- retest MCB moins profond / maturité de la vague ;
- 3m tourne depuis son creux ;
- prix encore dans la partie basse de la structure ;
- PM Live traduit LONG efficacement ;
- ticker : yield LONG exceptionnel avec effort/cadence/flow modérés ;
- terrain LONG conservé ;
- entrée précoce avant confirmation complète du nouveau lobe 15m.

Toute V4 doit expliquer ce cas par les données causales ci-dessus, pas par un R/R arbitraire.
## Éléments formels indispensables ajoutés

### 1. Contrat causal / horloge
Chaque observation doit porter :
- source et timeframe ;
- timestamp de marché ;
- état LIVE ou CONFIRMED ;
- fraîcheur ;
- instant auquel l'information devient causalement disponible.
Aucune règle ne peut lire une donnée future ou une confirmation arrivée plus tard.

### 2. Provenance de preuve
Chaque conclusion doit exposer les observations brutes qui la soutiennent.
Pas de mot fort ("major", "turning", "confirmed") sans définition calculable et traçable.

### 3. Machine d'état explicite
Transitions autorisées :
OBSERVE → THESIS_FORMING → THESIS_TRANSLATING → CONFIRMED → POSITION → MATURITY / OPPOSITE_TRANSLATION → EXIT / FLIP.
Une transition doit enregistrer la condition qui l'a créée et celle qui l'invalide.

### 4. UNKNOWN est un état valide
Donnée absente, ambiguë ou non fraîche => UNKNOWN.
Le moteur ne remplace jamais une information manquante par une direction de secours.
### 5. E15 : candidat, mineur, majeur
Tout extrême d'un lobe zéro-borné est d'abord un **E15_CANDIDATE**.
Il n'est pas automatiquement "majeur".

Observations de qualification :
- span LBW avec l'E15 opposé précédent ;
- côté du zéro ;
- durée ;
- déplacement prix associé ;
- échelle de ce déplacement contre les legs récents ;
- relation entre extrême LBW et extrême prix ;
- traduction substantielle du prix après l'extrême.

Base validée à conserver comme repère, pas comme vérité exhaustive :
~80 points LBW entre E15 opposés est une forte preuve structurelle.
Une grosse translation prix peut rendre structurellement important un E15 autrement plus faible en LBW :
cela doit être exposé séparément et testé, pas caché sous un booléen.

### 6. Séparation marché / position
La thèse du marché existe indépendamment du trade ouvert.
Un trade ne peut empêcher l'apparition d'une nouvelle thèse opposée.
Le lifecycle décide alors : tenir, protéger, sortir, puis éventuellement réentrer.

### 7. Falsification / contre-factuel
Chaque décision V4 logue :
- pourquoi elle a été prise ;
- première observation qui aurait dû l'invalider ;
- MFE/MAE ;
- terrain rendu ;
- action V3 shadow au même instant ;
- opportunité opposée éventuellement manquée.
## Rôle des modules

### MCB_STATE
Décrit seulement MCB :
lobe courant, extrême, récupération depuis l'extrême, masse/temps, passage zéro,
E15 candidats, relations E15↔E15, prix associé et 3m imbriqué.

### MCB_THESIS
Direction exclusivement dérivée de MCB.
États minimum :
LONG_FORMING, LONG, SHORT_FORMING, SHORT, TRANSITION, UNCLEAR.

### CONTEXT
Niveaux fixes, MA200, liquidité, trendlines, WHERE.
Sortie : SUPPORTIVE / OPPOSING / NEUTRAL / MIXED avec détails.
Aucun veto directionnel automatique.

### PRICE_TRANSLATION
PM Live et déplacement prix court terme :
direction, amplitude, vitesse, efficacité, reclaim/failure.
Répond seulement : le prix traduit-il la thèse MCB ?

### TICKER_CONFIRMATION
Cadence, flow BTC/s, volume, yield $/BTC, conservation/reabsorption.
Répond seulement : le comportement transactionnel confirme-t-il la traduction ?

### RISK
-500 USD absolu.
Protection des gains prioritaire quand MCB mûrit + PM se retourne + ticker confirme.
R/R externe informatif uniquement.
## Première confrontation au réel

V4 doit être testée simultanément sur :
- V4-001 : LONG 83065 précoce, cas école ;
- grand LONG vers 85639 : respirations tolérées, gain mieux protégé ;
- LONG tardif 84383 : retournement SHORT détecté et sortie rapide ;
- SHORT 83689 : profit capturé puis flip LONG reconnu ;
- campagne SHORT nocturne précédente : attaques bull fortes mais réabsorbées, pas de churn P90.

V3 reste disponible uniquement comme shadow comparatif.
Aucune conclusion V4 n'est considérée démontrée parce qu'elle est élégante :
elle doit survivre à ces cas puis aux données live prospectives.
