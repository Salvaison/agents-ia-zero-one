# BOONOLAB — Incident « ÉTAT VIVANT · OBSERVATION — Source V5.4.3 périmée » et sécurité V553

**20 novembre 2026, 17h08–17h24 CET.**  
**Statut : incident MCB identifié, collecte rétablie, protection supplémentaire V553 implémentée/testée/mise en service.**
**PAPER uniquement. Aucun ordre financé ; V552 reste arrêté.**

## 1. Signalement et diagnostic réel

L'utilisateur a rapporté dans BOONO-TV :

> !ÉTAT VIVANT · OBSERVATION  
> Source V5.4.3 périmée ou non reçue. Aucune ancienne trajectoire, position ou preuve ne sera présentée comme actuelle.

La phrase provient **exactement** de `boono-tv/scene/tv-living-state.js` (fonction `renderHtml`) lorsque `snapshot.tvLiving.status!==DATA_RECENT`. Le lecteur source `boono-tv/tv-living-state.js` exige un ledger V543 récent ET une analyse `a.quality==='DATA_OK'`.

**V543 continuait de recevoir des ticks OKX récents** (âge ~10 secondes) avec `boono-v543-paper ONLINE`, mais `latestAnalysis.quality=DATA_DEGRADED`, `reason=STRUCTURAL_SOURCES_STALE`, `checks.dataFresh=false`. Ceci n'était **PAS** une interruption du moteur V553.

**Source réelle périmée : fichiers CSV MCB TradingView.** À ~17h10–17h15 CET :
- `mcb_3m.csv` : dernière bougie horodatée 16h51 puis 16h54 CET (en retard de ~20 min).
- `mcb_15m.csv` : dernière bougie horodatée 16h30 CET (en retard de ~45 min).
- `mcb_3m_live.csv` et `mcb_15m_live.csv` : fichiers **réécrits toutes les ~15 s**, mais leur horodatage de bougie restait respectivement à 16h57 et 16h45 CET. **Mtime récent ≠ donnée de marché récente**.
- 1h/4h historiques également retardés ; ne pas forcer de confirmations en simulant un OHLC depuis OKX ou en falsifiant la source E15.

Les vrais collecteurs PM2 `collecteur-3m` (`modules/real-time-collector.js`) et `collecteur-tab2` (`modules/tab2-collector.js`) étaient marqués `online`. Leurs journaux montrent des pertes CDP/TradingView à 15h00 UTC pour multi-TF et des FATAL 3m à 15h58 et 16h05 UTC (« no close written »), puis rattrapage incomplet à plusieurs reprises. Les heartbeats/WebSockets fonctionnaient, mais pas la livraison de nouvelles bougies MCB. Le watchdog de fichier vérifiait surtout mtime, ce qui ne détectait pas ce type de gel silencieux.

## 2. Récupération opérationnelle

À ~16h13 UTC, **redémarrage ciblé PM2 des deux collecteurs**, et uniquement des collecteurs `collecteur-tab2` puis `collecteur-3m`. Pas de redémarrage Chrome global, ni de BOONO-TV Studio, ni des moteurs PAPER. Ils ont rouvert leur flux TradingView et commencé à rattraper leurs bougies.

Le rétablissement s'est fait **progressivement**, non immédiatement : vers 16h18–16h20 UTC, collecte à jour à 3m 16h15 UTC et 15m 16h00 UTC, avec rattrapage 1h/4h. À ~17h20 CET :
- V543 `latestAnalysis.quality=DATA_OK` ;
- sur Amsterdam, `GET :3090/api/snapshot` : `tvLiving.status=DATA_RECENT`, `analysis.fresh=true` ;
- sur OVH, `GET :3091/api/snapshot` : `tvLiving.status=DATA_RECENT` ;
- V553 reste online et autonome, et `engine553.status=DATA_RECENT` sur OVH.

**Il n'était pas approprié de cacher la panne en renommant les valeurs V543 comme provenant de V553 : le grand État vivant conserve sa source V543 explicite.**

## 3. Faille de sécurité V553 révélée, corrigée

`modules/v553/source.js` calculait `healthy` à partir de la fraîcheur des relevés Bâton (30s) et du nombre de bougies MCB présentes. Mais Bâton continuait de réécrire des lignes fraîches contenant des indicateurs issus de fichiers MCB anciens. **V553 pouvait ainsi émettre `DATA_OK` pendant que les bougies confirmées 3m/15m étaient gelées.**

**Correctif fail-closed `v553-mcb-bar-timestamp-freshness-safety-v1` :**
- `source.confirmedHealth(bars,asOf)` calcule l'âge depuis la **fin de la dernière bougie confirmée effectivement présente dans le fichier** (`knownAt=bar.ts+TF`), et non depuis mtime.
- Il exige `âge3m <= 3m+2min` et `âge15m <=15m+2min`, en complément de l'âge Bâton <=65 secondes et de la couverture historique de base. La marge 2 minutes couvre la stabilisation/collecte ; ces limites sont de **fraîcheur de données**, PAS de trading ou de gain.
- Lorsque la qualité confirmée est insuffisante, `source.healthy=false`, `decision.quality=DATA_DEGRADED` et le marché V553 devient `UNRECOGNIZED`. **Aucune nouvelle admission ne peut être proposée ou exécutée** à partir de MCB périmé. Si une position est déjà ouverte, aucune sortie structurelle n'est inventée sur les mauvaises données ; le hard risk PAPER sur prix OKX continue dans `paper.step`.
- `modules/v553/decision.js` conserve les preuves `confirmedSourceHealth` de la source dans l'analyse et `modules/v553/runner.js` les expose dans `v553-paper-summary.json`.
- Watch affiche, en cas de dégradation, **« MCB CONFIRMÉ PÉRIMÉ »**, l'âge en minutes des deux TF et le motif de suspension des entrées. L'interface ne présente pas une preuve obsolète comme Live.
- Le replay historique 19–20/11 consomme les archives Bâton horaires en lecture seule, sans relire à chaque tick le JSON Bâton roulant parfois partiellement réécrit : `S.load(asOf,{auditRows})`. C'est une fiabilisation de tests, pas un nouveau signal.

**Il ne s'agit pas d'une nouvelle stratégie ou d'un nouveau moteur, mais d'un garde-fou de provenance supplémentaire dans V553.** La politique reste `v5.5.3-live-causal-price-market-paper-v1`, le ledger reste `v5.5.3-paper-ledger-v1` ; la révision de santé des sources possède sa propre version `v553-mcb-bar-timestamp-freshness-safety-v1`. Aucun E15, PM ou prix manquant n'est reconstruit artificiellement.

## 4. Tests, migration et état du compte

- **128 tests PASS, 0 FAIL** sur la suite élargie V553/V552/V551/V55/Watch/BOONO-TV, dont cinq nouveaux tests `tests/v553/candle-source-health.test.js` portant sur les vrais horodatages, le fail-closed, le hard risk en données dégradées et les avertissements Watch.
- Code syntaxiquement vérifié ; backup de la source `/root/boonolab-archives/V553_CANDLE_FRESHNESS_SAFETY_BEFORE_20261120T161728Z/`.
- Redémarrage **du seul** `boono-v553-paper` et `config-server` après tests, PM2 sauvegardé. À la réactivation, le SHORT hérité de la situation avant correctif (entrée à **61 377,9 $ BTC**, `entryAt=1795187298418`) et toutes les clôtures, fees, MFE/MAE/capital étaient présents ; aucune remise à 1 000 $, aucune liquidation fictive.
- Recontrôle après ~30 secondes de mise à jour de la summary : `confirmedSourceHealth.valid=true`, `quality=DATA_OK`, `tvLiving=DATA_RECENT`. V553/V543 restent PAPER online, V552 stopped ; studio OVH/radio inchangés.

## 5. Limites et suivi

La panne origine **TradingView/CDP/collecteurs** et non V553 ; le redémarrage les a récupérés, mais **la cause profonde du gel des WebSockets TradingView n'est pas encore corrigée**. Le watchdog actuel sur les mtime des CSV peut manquer une répétition où les fichiers Live sont réécrits avec le même ancien horodatage. L'ajout d'une alerte automatisée au niveau du watchdog sur les bougies confirmées est un chantier distinct si l'incident se reproduit ; ne pas affirmer l'avoir effectué.

Même après rétablissement, aucune garantie de fills/prise de décision future profitable ; les tests prouvent uniquement la cohérence, l'intégrité et la sécurité de la provenance dans les cas ciblés.

**Rétablissement fonctionnel vérifié ; protection fail-closed implémentée, testée et déployée.**
