# BOONO 24h Deep Review — 21/09/2026 — intervention contrôlée immédiate

## Périmètre
Fenêtre étudiée : environ 20/09 11:00 UTC → 21/09 10:55 UTC, avec priorité aux séquences documentées minuit / ~02:00 / ~07:06 et aux admissions V3-LAB.

Cadre :

> OBSERVATION = DATA → CONTEXT → WHERE → STATE → SEQUENCE → CONVERSION → DOMINANCE  
> DÉCISION = ELIGIBILITY → RISK → ACTION

Cette intervention constitue **l'unique fenêtre de modification décisionnelle du jour**. Les passes suivantes du 21/09 restent observationnelles ; prochaine fenêtre de changement au plus tôt après la Deep Review suivante.

## 1. Résultat brut
Sur 28 trades V3-LAB étudiés :

- PnL cumulé : **-21.936 % levier** ;
- 6 gagnants / 22 perdants ;
- PHASE_CONTINUATION : 22 trades, **-16.356 %**, 5W/17L ;
- REVERSAL_FORMING : 6 trades, **-5.580 %**, 1W/5L ;
- CURRENT_WHERE : 10 trades, **-6.678 %**, **0W/10L** ;
- TENSION_BALANCE : 12 trades, **-12.380 %**, 1W/11L.

[DÉMONTRÉ] Le défaut dominant est à l'**admission** : une direction microstructurelle peut être correctement détectée alors que la localisation, la maturité de phase ou l'asymétrie structurelle rendent l'entrée mauvaise.

## 2. Confirmation tardive et confusion phase/direction
Cas majeurs :

- short 21/09 06:45 UTC, REVERSAL_FORMING : 81398.7 → 81672.7, **-3.366 %**, MFE 0.1 $, MAE 325.8 $ ;
- short 07:09 UTC, PHASE_CONTINUATION : 81530.5 → 81646.6, **-1.424 %**, MFE 98.3 $, MAE 146.3 $ ;
- short 08:45 UTC, PHASE_CONTINUATION : 83274.5 → 83791.5, **-6.208 %**, MFE 11.2 $, MAE 521 $.

À 08:45 UTC, la couche 15m restait étiquetée DESCENTE alors que le prix avait dépassé l'ancre E15 81862.5 de plus de 1400 $, avec LBW/BW/MF 15m fortement positifs. La contre-excursion de phase valait ~1916.5 $ pour une meilleure translation favorable ~504.5 $.

[ARTEFACT LOGIQUE] `wave.phase=DESCENTE` décrit la géométrie E15/LBW, mais était encore consommé comme droit directionnel SHORT sans garde de maturité prix suffisante. L'invalidation pré-entrée basée sur le maximum courant pouvait continuer à monter avec le prix et ne suffisait donc pas à empêcher une admission tardive.

## 3. R:R et espace structurel
[DÉMONTRÉ] Plusieurs pertes importantes sont entrées avec un R:R structurel inférieur à 1 vers le prochain repère connu :

- REVERSAL short 81398.7 : risque ~463.8 $, espace vers MA200 3m ~54.9 $, R:R ~0.12 ;
- continuation short 81530.5 : risque ~332 $, espace ~165.1 $, R:R ~0.50 ;
- continuation short 05:09 UTC : R:R ~0.04 ;
- plusieurs continuations nocturnes : R:R ~0.26–0.78.

Le moteur exposait encore `rrDecisionImpact=false`.

[ARTEFACT LOGIQUE] ELIGIBILITY n'utilisait pas réellement le R:R/maturité alors que le protocole validé les place explicitement avant RISK/ACTION.

## 4. Respiration trop proche de l'invalidation
Trois entrées perdantes ont été admises avec seulement 2 $, 9 $ et 13 $ de distance structurelle alors que p50 de respiration était ~107.7 $.

[DÉMONTRÉ] Une thèse dont l'invalidation est à une fraction minuscule de la respiration normale n'a pas assez d'espace pour survivre au bruit normal du régime.

## 5. WHERE récent devenu causalement obsolète
Cas critique du short 83274.5 :

- `RECENT_WHERE` âgé d'environ 660 s ;
- mémoire d'une résistance WR 82439 observée lorsque le prix était près de 82529 ;
- à l'entrée, le prix avait accepté ~835 $ au-dessus de cette résistance ;
- cette mémoire continuait néanmoins d'autoriser la localisation short.

[ARTEFACT LOGIQUE] Le TTL seul ne suffit pas : une preuve directionnelle de WHERE doit mourir si sa frontière a été causalement traversée au-delà de sa tolérance.

Une LGI neutre peut fournir un lieu, mais ne doit jamais annuler une preuve directionnelle explicite apportée simultanément par un niveau ou une MA200.

## 6. Intervention autorisée et exécutée
### A. R:R structurel devient décisionnel
Fichier : `modules/v3lab/layers/risk.js`

- `MIN_ENTRY_RR = 1.0` ;
- risque = distance prix → invalidation structurelle candidate ;
- reward = distance vers le prochain repère connu dans le sens du trade parmi MA200 3m/15m et niveaux utilisateur ;
- si un repère est disponible et `R:R < 1.0`, admission refusée ;
- `rrDecisionImpact` passe à `true` ;
- détail exposé sous `risk.eligibility.rr`.

### B. Respiration minimale avant invalidation
Fichier : `modules/v3lab/layers/risk.js`

- distance minimale = `max(10 $, 0.25 × respiration p50)` ;
- en dessous : admission refusée ;
- détail sous `risk.eligibility.breathingRoom`.

### C. Garde de maturité E15 / contre-excursion
Fichier : `modules/v3lab/layers/risk.js`

Pour PHASE_CONTINUATION uniquement :

- la phase doit avoir déjà produit une translation significative (`bestTranslation >= max(50 $, p50)`) ;
- si la translation courante est devenue adverse (`signedTranslation < 0`) ;
- et si `counterExcursion / bestTranslation >= 2.5` ;
- alors la phase E15 est considérée trop dépassée pour une nouvelle admission dans son ancien sens.

Ce garde **ne renomme pas la phase MCB** et ne crée pas de nouvelle thèse opposée ; il retire seulement le droit d'entrer tardivement dans l'ancien sens.

### D. WHERE directionnel invalidé par breach
Fichier : `modules/v3lab/layers/sequence.js`

- résistance mémorisée pour short : invalidée si prix > niveau + 100 $ ;
- support mémorisé pour long : invalidé si prix < niveau - 100 $ ;
- MA200 mémorisée : même principe avec sa tolérance propre ;
- une LGI neutre n'override plus une preuve directionnelle explicite présente au même endroit ;
- diagnostic exposé via `recentWhereInvalidation`.

## 7. Replay de contrôle
Replay contrefactuel des trois gardes ELIGIBILITY (R:R + breathing room + phase overrun), avec uniquement les informations disponibles au moment des entrées :

- 18/28 trades auraient été refusés ;
- ces 18 trades représentent **-20.952 % levier** dans l'historique réel ;
- seulement 2 étaient gagnants, pour environ +0.307 % et +0.195 % ;
- les 10 trades restants représentent environ **-0.982 % levier**, 4W/6L.

[DÉMONTRÉ] sur cette fenêtre : ces critères discriminent fortement les pertes observées.

[DONNÉES INSUFFISANTES] pour conclure que 1.0 / 0.25×p50 / 2.5 sont des optima universels. Ce sont des valeurs de départ falsifiables pour la semaine.

## 8. Sécurité / tests / activation
Backup code :

`archives/v3lab-pre-deep-review-eligibility-20260921T110142Z`

Backup état avant restart :

`data/trade-sim-v3lab-state.pre-deep-review-eligibility-restart-20260921T110554Z.json`

Tests passés :

- `tests/v3lab/coherence-regression.test.js` ;
- `tests/v3lab/divergence-lineage-shadow.test.js` ;
- `tests/v3lab/ma200-shadow.test.js` ;
- `tests/v3lab/mw-hourly-report.test.js` ;
- `tests/v2/core-contract.test.js` ;
- `tests/v2/simulator-v02-regression.test.js`.

Activation :

- aucune position V3 ouverte avant redémarrage ;
- seul `cerveau-central` a été redémarré ;
- `moteur-boono` n'a pas été redémarré et sa position séparée n'a pas été touchée ;
- `cerveau-central` online après restart ;
- nouvel objet `risk.eligibility` observé live ;
- lors de la vérification live, le SHORT de phase 15m était explicitement refusé aussi par `phase E15 depassee par la contre-excursion prix`.

## 9. Rollback
Rollback si les prochaines fenêtres montrent que les nouveaux gardes :

- éliminent de manière répétée des trades dont l'asymétrie et la continuation se réalisent proprement ;
- réduisent excessivement les admissions sans amélioration de PF / drawdown / capture ;
- ou provoquent un conflit logique avec REVERSAL_FORMING/SEQUENCE.

Rollback technique : restaurer `sequence.js`, `risk.js` et le test depuis le backup ci-dessus, puis redémarrer uniquement `cerveau-central` hors position V3.

## 10. Ce qui n'a pas été fait
- aucune machine de thèse persistante complète n'a été ajoutée ;
- aucune responsabilité de module n'a été déplacée ;
- `TURNING_POINT_15M` reste inchangé ;
- aucune règle de divergence/MA200 shadow n'a été promue comme signal autonome ;
- aucun paramètre du moteur BOONOTRADE historique n'a été modifié.

La suite est observationnelle : mesurer prospectivement combien d'entrées sont refusées par chaque nouveau gate, lesquelles auraient gagné/perdu, et si la qualité moyenne des trades admis s'améliore.
