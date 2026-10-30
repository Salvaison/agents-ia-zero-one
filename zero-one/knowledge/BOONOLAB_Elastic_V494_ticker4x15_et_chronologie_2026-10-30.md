# BOONOLAB — Elastic V494 rétabli, ticker 4×15 et chronologie des états
**30 octobre 2026 — dossier de travail OD-20261030-006 / 007 / 008**
**Statut : implémentation et tests; vérifier la section finale pour le statut de service.**

## Autorisation et objectif
- [OD-006 — demande et origine](operational-decisions/OD-20261030-006/03-origine-et-justification.md) : restaurer Elastic avec les mêmes mesures historiques P75 d'effort/rendement pour V4.9.4, étudier EASY, POWERFUL/EXCEPTIONAL, EASY→CONTESTED aux extrêmes du range BTC et le transfert de force.
- [OD-007](operational-decisions/OD-20261030-007/03-origine-et-justification.md) : rétablir le ticker 4×15 min, le corroborer aux épisodes Elastic, **sans double vote** puisque les mesures sont partagées.
- [OD-008](operational-decisions/OD-20261030-008/03-origine-et-justification.md) : une **autre couche** affiche et archive TOUS les états mentionnés, individuellement horodatés, au-delà des seules qualités d'entrée/sortie. Chaque OD contient message exact, consigne exécutée, origine, manifest SHA et événements.

## Architecture, sources et frontières
- **Source opérationnelle :** `data/v494-paper-state.json` et `priorEval` de l'authentique V493 figé (`cdf1936`), produits par `boono-v494-paper`. Lecture seule dans le nouveau processus `boono-v494-elastic-shadow`; aucun import moteur de décision, PAPER, broker ni effet sur le compte V4.9.4.
- **Classificateur identique à l'ancien Elastic v0.5** : `modules/v4/experiments/elastic-observer-shadow.js`, méthode `conversion`, appelée avec `translation.horizons` et `ticker.current` de la V494 courante (`yieldVsP75`, `yieldVsP95`, `effortVsP75`, PM3, PM5). Ce n'est pas un signal de nouvelle autorité.
- **Range 2h :** 40 dernières bougies 3m **confirmées** avec couverture de 105 min min et trous ≤6min; bande d'extrême 10 % **exploratoire**, calculée avec les extrêmes des bougies closes AVANT l'observation (mèche courante non injectée dans le range lui-même). Les valeurs d'un breakout en dehors du range restent hors frontière.
- **Journal événementiel prospectif :** +1/+3/+5/+15/+30/+60 minutes, BTC signé selon la direction du phénomène, MFE/MAE **en écarts du cours**, pas une position virtuelle, stop ou P&L. Lorsque les échantillons sont trop éloignés, le résultat porte `CENSORED`. Si la chaîne V494 n'émet pas, le shadow ne fabrique aucune qualification.
- **États et transitions expérimentaux** : EASY favorable à une continuation, POWERFUL susceptible d'extension consommée, EASY→CONTESTED à bord haut/bas comme possibilité d'inversion et de protection, CONTESTED→EASY de camp opposé ou initial, et résolution POWERFUL sans déduire systématiquement un retournement. Les entrées réelles V494 sont seulement annotées dans leurs catégories sans être bloquées.
- Le shadow V494 factoriel A/B/C/D précédent continue séparément ; le shadow V543 continue séparément.

## Le ticker 4 × 15 minutes
`modules/attention/v494-elastic-ticker.js` produit quatre slots as-of :
- fractions **du temps effectivement observé** par qualité de conversion, par camp LONG/SHORT/CONTESTED, par état de marché V493, par rendement d'effort, et par phase hypothétique;
- couverture de chaque 15m et de la dernière bougie en formation, échantillonnage source 30s, trous de données transparents ; aucun faux hour regime s'il n'existe pas encore assez de couverture ;
- **moyennes de métriques**, pas des noms de qualité : rendement/P75, effort/P75, cadence, débit agressif BTC/s, PM Live, PM3/PM5, prix conservé. **Ne pas sommer des fenêtres PM3/PM5 qui se recouvrent** ; le débit BTC/s n'est pas une mesure de la liquidité passive ou cachée.
- Résumé horaire descriptif : `PERSISTENT_LONG`, `PERSISTENT_SHORT`, `ASYMMETRIC_CONTEST`, `WEAKENING`, `TRANSITION_UNCONFIRMED`, ou `COVERAGE_INSUFFICIENT`. Les seuils de couverture, dominant/persistance et d'extrême sont des hypothèses techniques, pas des critères de trade validés.
- Chaque événement Elastic reçoit le **régime 4×15 connu à sa naissance**. Le shadow compare ce régime à la suite du prix; corrélation entre ticker et Elastic ≠ corroboration indépendante.

## Nouvelle troisième couche : Chronologie des états
`modules/attention/v494-elastic-state-layer.js`, avec deux NDJSON indépendants et un résumé :
- **Sept familles et vocabulaire exhaustif** :
  1. `CONVERSION_QUALITY` : SILENT, INEFFICIENT, PRODUCTIVE, EASY, POWERFUL, EXCEPTIONAL, CONTESTED (+ UNCLASSIFIED).
  2. `TEMPORAL_QUALITY` : ABSORBED, EXHAUSTED, NONE/UNRESOLVED — **hypothèses temporelles historiques**.
  3. `EFFORT_YIELD` : LOW_YIELD, HIGH_EFFORT_LOW_YIELD, PRODUCTIVE_TRAVEL, EASY_TRAVEL, EXTREME_PRODUCTIVE_TRAVEL, EXTREME_EASY_TRAVEL, UNKNOWN.
  4. `MARKET_REGIME` : ACTIVE, DIRECTIONAL, MIXED, DORMANT, CHOP_SHADOW, LOW_EDGE_SHADOW, UNKNOWN — état V493 réellement calculé.
  5. `CAMPAIGN_PHASE` : STRUCTURAL_BIAS, CONTESTED, TRANSITION_LIVE, ACCEPTED_REVERSAL, BIAS_RETAINED, UNRESOLVED — **machine d'interprétation expérimentale**. **ACCEPTED_REVERSAL n'est jamais fabriqué** sans contrat confirmé.
  6. `CONVERSION_PHASE` : UNPROVEN, INITIATING, PRODUCTIVE, RETAINING, BREATHING, REACCELERATING, EXHAUSTING, INVALIDATED — **phases hypothétiques**.
  7. `HOUR_REGIME` : PERSISTENT_LONG, PERSISTENT_SHORT, ASYMMETRIC_CONTEST, WEAKENING, TRANSITION_UNCONFIRMED et état technique COVERAGE_INSUFFICIENT — hypothèses d'une heure.
- `data/v494-elastic-state-timeline.ndjson` contient le **premier constat de chaque famille** (`BOOTSTRAP_OBSERVED`), puis ses changements `from → to` avec `at/asOf`, heure source E15 si connue, prix et source explicite.
- `data/v494-elastic-state-observations.ndjson` conserve à chaque observation admissible **toutes les familles simultanément**, plus PM, rendement/effort, débit BTC/s, prix/range et statut de liquidité passive `NOT_MEASURED`. État `AFTER_GAP_OR_NEW` après interruption, pas de continuité rétroactive fictive.
- `data/v494-elastic-state-summary.json` compact : valeurs courantes, vocabulaire de **tous** les états y compris ceux **jamais observés**, comptes d'apparitions, 16 derniers événements. Journaux **rotatifs, 8 MiB × 13 fichiers max pour chaque classe** ; ce n'est pas une archive de 14 jours garantie : les données complètes Audit14D restent ailleurs.
- Dans BOONO Watch / TRADES / SHADOWS : nouveau panneau **CHRONOLOGIE DES ÉTATS**, distinct du ticker et du comparateur A/B/C/D, visualisation des sept dimensions, dernier changement de chacune, vocabulaire avec `non observé`, filtres famille + 6/24/48/168/336h, consultation `Changements` ou `Snapshots 30s`, pagination 45 lignes / appel.
- Routes sécurisées `/api/shadows/v494-elastic`, `/api/shadows/v494-state-layer`, `/api/shadows/v494-state-history` : chargement uniquement dans SHADOWS. La route histoire lit des blocs de 64 KiB en arrière et limite chaque requête à 80 lignes et 32 MiB de lecture. Aucune lecture complète de ledger/Audit par l'interface.

## Méthode et limites d'analyse
Toutes les observations ont une heure de connaissance `asOf`. La source d'un E15 peut remonter à une bougie antérieure et **n'autorise pas un trade rétroactif**. Le nouveau laboratoire n'a pas été rempli artificiellement avec les périodes anciennes où le shadow complet était arrêté. Les états effectivement calculés par V493 sont distingués de ceux **reconstruits hypothétiquement** pour notre recherche. La liquidité passive, les volumes cachés et le carnet n'ont pas été mesurés.

Pour confronter le ticker à Elastic : comparer `REGIME_ALIGNED`, `REGIME_OPPOSED`, `WEAKENING_NOT_DIRECTIONAL_CONFIRMED`, `REGIME_CONTESTED` et les valeurs à +15min, en **comparant les bons cas aux contre-exemples** et les mêmes camps/ranges. Une vraie promotion d'une règle exige simulation contrefactuelle avec entrées, sorties, réentrées, risque, frais et vérification hors échantillon. **Aucun filtre d'entrée, sortie, gain-floor ou hard-risk n'est modifié par le présent chantier.**

## Tests et mise en service — vérifiés le 30/10/2026
- **83 tests Node** ciblés et de non-régression `tests/attention/*.test.js tests/v4/elastic-observer-v05.test.js` : 83 réussis, 0 échec. Incluent les 9 qualités historiques, EASY/POWERFUL/CONTESTED, étiquetage de source, extrême range confirmé, segmentation 4×15 avec couvertures, transition/affaiblissement, snapshot de campagne, journal de sept familles, interruption, pagination, sécurité XSS, source périmée, idempotence et absence d'autorité de trading.
- **Le JavaScript UI réel généré** depuis le template `/app.js` (263 840 caractères) a été assemblé hors requête et compilé avec `vm.Script` ; six scripts HTML supplémentaires analysés sans erreur. Syntaxe Node `modules/config-server.js` et nouveaux modules vérifiée.
- **Test de lecture réelle** : `node modules/attention/v494-elastic-shadow-runner.js --test-read` et dry-run sans écriture des sept familles à partir du V494 courant. Aucun ordre PAPER émis ni compte modifié.
- **Service autonome démarré** : PM2 `boono-v494-elastic-shadow` (PID initial 1887174, zéro redémarrage au contrôle), état `SHADOW_ONLY`, `decisionImpact:false`, `brokerOrdersEnabled:false`. Première observation source 2026-10-30T19:37:53 UTC ; après plusieurs cycles, trois relevés complets et douze transitions horodatées déjà constatés. Les anciens historiques Elastic ne sont pas confondus avec cette nouvelle série prospective.
- **Interface mise en service** par redémarrage de `config-server` uniquement (nouveau PID 1887299), PM2 sauvegardé. Les PID de `boono-v494-paper` 962864, `boono-v543-paper` 1081650, `boono-v494-entry-exit-shadow` 1867294 n'ont pas changé, et leurs politiques sont intactes.
- **Sécurité HTTP** : les routes `/`, `/app.js`, `/api/shadows/v494-elastic`, `/api/shadows/v494-state-layer`, `/api/shadows/v494-state-history`, `/api/shadows/v494-dual` renvoient bien HTTP 302 sans session, conformément à `requireAuth`. Lecture programmée directe des fichiers de synthèse et des pages d'historique vérifiée. **La réponse HTTP 200 sous une session navigateur authentifiée et l'apparence visuelle exacte sur le navigateur de l'utilisateur n'ont pas été vérifiées** ; ne pas prétendre à cette preuve.
- **Charge isolée :** shadow autour de 56–60 MiB au premier contrôle, CPU PM2 proche de zéro entre deux cycles, aucun parsing lourd ajouté à l'État vivant. Le serveur Watch utilise les résumés compacts; la chronologie paginée n'est lue qu'à l'ouverture de sa couche. Ces mesures ponctuelles ne démontrent pas le coût au bout de deux semaines.

**Statut final :** `IMPLEMENTE`, `TESTE`, `MIS_EN_SERVICE` (shadow et couche d'interface); `NON_VALIDÉ POUR ENTRÉES/SORTIES`. Travaux ouverts : vérifier visuellement la couche avec une session utilisateur, accumuler des épisodes indépendants complets, comparer opportunités/faux signaux avec V494 A/B/C/D et coûts nets, et fixer si nécessaire un vrai contrat de rétention 14 jours pour ces journaux d'état.
