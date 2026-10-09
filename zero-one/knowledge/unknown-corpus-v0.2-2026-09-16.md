# BOONO v0.2 — Corpus UNKNOWN initial

Date: 2026-09-16
Source: `trade-sim-v2-state.json` + `trade-sim-v2-decisions.json`.

## 1. Ce que sont réellement les « 22 UNKNOWN »

Il existe 22 **fingerprints distincts**, représentant actuellement 187 occurrences enregistrées.
Ils ne correspondent pas à 22 données manquantes différentes.

Dans `trade-simulator-v2.js`, la règle déterminante est actuellement:
`if (microClass.energy === 'EXTREME' && seq.stage === 'NONE') return 'UNKNOWN';`

Donc le système transforme volontairement tout événement EXTREME sans FORCE_SHIFT reconnu en UNKNOWN, indépendamment de sa phase MCB, de sa conversion vague→prix ou de la persistance réelle.

Conclusion initiale: les UNKNOWN forment surtout un corpus de **régimes extrêmes non interprétés par v0.1**. Ils sont parfaitement adaptés comme corpus adversarial v0.2.

## 2. Première mesure empirique

Pour chaque occurrence disponible, le prix a été mesuré environ 5, 15 et 30 minutes plus tard. Ce test ne mesure pas encore le PnL d'une stratégie; il mesure simplement la direction réelle du prix après l'état UNKNOWN.

### Quadrants top-down / vague

- `ALIGNED_BULLISH + wave long`: 33–34 échantillons selon horizon. +0,030% moyen à 5m, ~0 à 15m, -0,029% à 30m. **Très peu de direction durable.**
- `ALIGNED_BULLISH + wave short`: 29–31 échantillons. -0,020% à 5m, -0,074% à 15m, -0,132% à 30m; seulement ~10% des observations sont positives à 30m. **Le lobe short a souvent dominé malgré le top-down bullish.**
- `ALIGNED_BEARISH + wave short`: 51–54 échantillons. ~0 à 5/15m puis +0,170% moyen à 30m; ~69% positives à 30m. **Les EXTREME short alignés arrivent souvent assez tard pour précéder une reprise plutôt qu'une continuation.**
- `ALIGNED_BEARISH + wave long`: 60–64 échantillons. -0,117% à 5m, -0,129% à 15m, -0,245% à 30m; seulement ~28% positives à 30m. **Le rebond long dans climat bearish échoue souvent sur ce corpus.**

Ces résultats sont descriptifs et issus d'une seule séquence de marché récente; ils ne sont pas encore généralisables.

## 3. Première conclusion falsifiable

La règle v0.1 « EXTREME sans FORCE_SHIFT = UNKNOWN » est trop grossière.
L'énergie extrême n'est ni intrinsèquement directionnelle ni intrinsèquement incompréhensible.
Son sens dépend au minimum de la phase/cycle MCB, de l'âge de la translation, de la conversion effort→prix, de la persistance et du terrain conservé.

Hypothèse v0.2 à tester:
**EXTREME doit augmenter le niveau d'attention et changer le régime d'analyse; il ne doit pas automatiquement annuler l'interprétation.**

## 4. Sous-tests à construire

Pour chaque occurrence EXTREME, reconstruire:
1. WHERE: distance/confiance Location et éventuelle invalidité géométrique;
2. STATE: phase 15m, cycle, position dans la vague complète, 1h/4h;
3. DOMINANCE: effort, yield, réponse adverse, persistance et terrain conservé;
4. RISK: territoire déjà consommé, invalidation, R/R restant;
5. ACTION contrefactuelle: WAIT / ENTER / HOLD / EXIT.

Mesures principales: retour prix 1m/3m/5m/15m/30m, MFE/MAE contrefactuels, délai avant changement de domination, distance au prochain pivot et qualité de capture.

## 5. Points déjà visibles

Les fingerprints contenant `PRODUCTIVE` ne forment pas un groupe homogène: un burst productif peut précéder continuation, épuisement ou retournement selon le cycle.
Les fingerprints `NEUTRALIZED` sont également intéressants: dans certains cas, un effort extrême neutralisé précède précisément la reprise opposée.

Le top-down actuel est trop agrégé pour expliquer ces différences, car il encode surtout des signes de TF. La v0.2 devra réinjecter la phase et la conversion vague→prix.

## 6. Statut

`[DÉMONTRÉ]`: UNKNOWN v0.1 est principalement une règle d'abstention sur énergie EXTREME sans FORCE_SHIFT, pas un manque de données.
`[DÉMONTRÉ]`: les quatre quadrants top-down/vague ont des comportements empiriques très différents dans l'échantillon actuel.
`[AMBIGU]`: généralisation à d'autres régimes de marché; le corpus actuel est concentré sur 14–16 septembre.
`[À TESTER]`: remplacer UNKNOWN par une machine d'état EXTREME intégrant phase, conversion, persistance et risque.
