# MW multi-jours — protocole horaire v0.1 — 20/09/2026

## Objet
Transformer le Market Watch en instrument de navigation longitudinal : **rapport horaire court et comparable**, avec deep dive Astra uniquement lorsqu'un événement significatif le justifie.

Le rapport horaire n'est plus un nouvel essai narratif à chaque heure. Il est une compression causale de l'**état vivant** sur une fenêtre fixe d'une heure.

## Architecture
Chaque heure comporte huit blocs fixes :

1. **Contexte global top-down** — 1d / 4h / 1h / 15m / 3m ; bref, uniquement les éléments qui structurent l'heure.
2. **État vivant H** — entrée / moyenne ou occupation / sortie.
3. **Changements significatifs** — uniquement les transitions qui modifient l'interprétation.
4. **Performance BOONO** — entrées/sorties, PnL, MFE/MAE, MFE rendue, causes de sortie, gates dominants.
5. **Shadows** — résumé bref MA200, divergence-lineage, tranches et futurs shadows.
6. **Évaluation de la prévision H−1** — avec label épistémique exact et preuve observable.
7. **Prévision H+1 et H+1→H+3** — thèse + conditions observables de validation + conditions observables d'invalidation.
8. **Deep dive** — oui/non ; si oui, déclenchement du protocole Astra complet.

## Contrat d'agrégation
### Variables numériques
Format standard :
- valeur d'entrée de l'heure ;
- **moyenne sur l'heure** ;
- valeur de sortie ;
- min/max conservés dans la donnée brute pour les extrema causalement importants.

Variables actuelles :
- prix ;
- LBW/BW/MF 15m ;
- LBW/BW/MF 3m ;
- pente LBW 3m ;
- preuve de dominance ;
- fraction de terrain retenu ;
- yield courant ;
- cadence ;
- volume de fenêtre ;
- winSec ;
- priceMove ;
- counter-excursion / respiration ;
- distances MA200 3m et 15m lorsqu'elles sont disponibles dans le shadow.

### Variables catégorielles
Une moyenne n'a pas de sens. Format standard :
- état d'entrée ;
- **occupation temporelle** de chaque état (% et minutes) ;
- état de sortie ;
- transitions horodatées.

Variables actuelles :
- phase 15m ;
- direction 15m ;
- phase nested 3m ;
- régime ;
- dominance état+direction ;
- WHERE ;
- reversal ;
- action V3 ;
- respiration ;
- entryAllowed.

## Contexte top-down
À la fin de chaque heure, le rapport prend le dernier état MCB **strictement antérieur à la fin de la fenêtre** pour éviter tout look-ahead :
- Daily ; 4h ; 1h ; 15m ; 3m ;
- close, LBW, BW, MF, MA200 si présente ;
- âge de la donnée ;
- source era `OKX_POST_CUTOVER` ou `PRE_CUTOVER_ARCHIVE`.

La transition Bybit→OKX du 20/09 reste explicitement visible.

## Performance BOONO
Le bloc performance est obligatoire :
- nombre d'entrées ;
- nombre de sorties ;
- PnL leveraged réalisé ;
- wins/losses ;
- profit factor horaire si calculable ;
- MFE cumulée ;
- MAE cumulée ;
- MFE rendue avant sortie ;
- capture de MFE ;
- détail bref par trade ;
- gates de refus les plus fréquents.

Une opportunité n'est qualifiée de « missed » que si un timestamp candidat et le gate exact existent. Le rapport brut se limite sinon à documenter les gates.

## Shadows
### MA200 multi-TF
Le rapport reprend brièvement :
- côté de la MA200 par TF ;
- occupation au-dessus/dessous ;
- dernier cross ;
- dernier hold support/résistance ;
- synthèse `reversalMaturationCandidate` ;
- frontière de source.

### Divergence-lineage
- campagne candidate ;
- nombre de divergences ACTIVE/HISTORICAL ;
- changements de statut ;
- `MOVEMENT_TRANSITION` / `powerTransferConfirmed`.

### Tranches
Résumé seulement s'il y a événement ; sinon stable/aucun événement.

## Prévision : règle de falsifiabilité
Chaque prévision est **figée** dans `data/mw-hourly-forecast-ledger.ndjson`.

Deux horizons obligatoires :
- `horizon1h` ;
- `horizon1to3h`.

Chaque horizon doit contenir :
- `thesis` ;
- au moins une condition observable de `validation` ;
- au moins une condition observable d'`invalidation`.

Le système refuse d'enregistrer une prévision qui ne possède pas ces trois éléments.

Au rapport suivant, la prévision précédente doit recevoir **exactement un** des labels :
- `[DÉMONTRÉ]`
- `[FALSIFIÉ]`
- `[AMBIGU]`
- `[ARTEFACT LOGIQUE]`
- `[DONNÉES INSUFFISANTES]`

L'évaluation doit citer les faits de l'heure qui justifient le label. La prévision n'est jamais réécrite après coup.

## Critères de deep dive v0.1
Le rapport conserve tous les changements, mais ne demande un deep dive que sur des événements forts :
- transfert de camp vers `DOMINATION_PERSISTANTE` avec changement de direction et, pour un HIGH, `proofScore >= 0.70` + `retainedFraction >= 0.80` ;
- changement d'origine E15 ;
- `REVERSAL_FORMING` ;
- cross MA200 3m/15m significatif ;
- sortie de trade significative ;
- MFE importante dont >=50 % est rendue ;
- futurs changements de lineage / movement transition jugés significatifs.

Le deep dive applique ensuite le protocole Astra complet : top-down, fraîcheur, E15→E15, nested 3m, MCB, effort→conversion, yield, terrain, respiration, WHERE, divergences, MA200, niveaux, trade, falsification.

## Implémentation
- `modules/v3lab/monitoring/mw-hourly-report.js`
- `modules/v3lab/monitoring/mw-hourly-cli.js`
- ledger : `data/mw-hourly-forecast-ledger.ndjson`
- sorties de test : `data/mw-hourly-reports/`

Le générateur est **read-only vis-à-vis de BOONO**. Il ne modifie aucune décision, position, configuration ou état de trading.

## Test rétrospectif du 20/09
Trois fenêtres ont été produites :
- 12:00–13:00 UTC ;
- 13:00–14:00 UTC ;
- 14:00–15:00 UTC.

Exemple 14:00–15:00 UTC / 16:00–17:00 Paris :
- prix 80 529.9 → moyenne 80 568.8 → 80 640.6 ;
- 15m DESCENTE 100 % ;
- 3m DESCENTE ~79 %, MONTEE ~21 % ;
- régime principalement HACHOIR/TENSION_BALANCE ;
- BOONO : 1 sortie, -1.125 % levier, MFE 0.1 $, MAE 105.5 $ ;
- les transferts réellement forts, la sortie du trade et le changement d'origine E15 sont remontés comme candidats au deep dive.

Le test a permis deux corrections méthodologiques avant validation du protocole :
1. réduction du bruit des « power transfers » : seules les alternances de camp persistant sont considérées, et `HIGH` exige preuve/terrain élevés ;
2. top-down historique strictement causal : aucune bougie dont timestamp = fin de fenêtre n'est utilisée.

## Format attendu du commentaire Astra
Le générateur fournit les faits. Astra ajoute un commentaire très court :
- **Contexte** : 1–2 phrases ;
- **Heure** : ce qui a changé et ce que cela démontre/falsifie ;
- **BOONO** : qualité de la performance et cause principale ;
- **Shadows** : seulement les changements utiles ;
- **Prévision précédente** : label + preuve ;
- **Prévision suivante** : deux horizons, conditions observables.

Le rapport normal doit tenir environ sur un écran à un écran et demi. Tout développement supplémentaire appartient au deep dive.

## Autorisation expérimentale — semaine du 21/09/2026
Benjamin autorise Astra, pour la semaine de validation MW, à appliquer sans demande d'accord préalable des **ajustements locaux de seuils/paramètres** lorsque les données du MW ou de la revue 24h démontrent un défaut ou une amélioration mesurable.

Cette autorisation est limitée :
- pas de refonte architecturale ;
- pas de modification des responsabilités des modules ;
- pas de changement du concept de trading ou du cadre méthodologique ;
- pas de nouvelle logique décisionnelle structurante sans validation ;
- chaque changement doit être étayé par des observations falsifiables, sauvegardé avant modification, testé, puis documenté avec valeur avant/après et résultat.

Obligation de reporting : toute modification autonome doit être signalée à Benjamin et inscrite dans le journal/version-log avec timestamp, preuve, raison, fichiers touchés, tests et résultat.

Cadence de contrôle :
- MW horaire pendant la fenêtre de validation nocturne jusqu'au 21/09/2026 midi ;
- revue approfondie des dernières 24h une fois par jour pendant 7 jours, incluant performance, seuils, faux positifs/faux négatifs, MFE/MAE/giveback, divergences, MA200, WHERE, transferts de puissance et qualité des prévisions.
