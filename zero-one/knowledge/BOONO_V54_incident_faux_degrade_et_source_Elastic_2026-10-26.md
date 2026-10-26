# BOONO Systems — Incident « DÉGRADÉ » aux frontières 3m et provenance des événements Elastic

**Lundi 26 octobre 2026, Amsterdam, entre 15h42 et 16h04 (Europe/Paris CET).**

## Symptôme et bilan de santé

Utilisateur : État vivant V5.4 « DÉGRADÉ » ponctuel, malgré bon fonctionnement apparent. Diagnostic sur serveur :

- V5.4 et V4.9.3 PAPER actifs, boono-execution-lab, collecteurs MCB 3m/15m, UI, BOONO-TV, watchdog en ligne.
- Fichiers `mcb_3m_live.csv` et `mcb_15m_live.csv` mis à jour à quelques secondes de l'observation ; OKX trades/tickers connecté.
- Ledger V5.4 intact, uniquement PAPER, brokerOrdersEnabled=false. Au diagnostic : 61 clôtures, equity 920,7003 USD, FLAT.
- Le nouveau processus V5.4 n'a pas produit d'erreurs dans le journal PM2 sur cette période.

## Cause 1 : faux DATA_DEGRADED à chaque changement de bougie

Le noyau V5.4 réutilisait `decision-v52.evaluate` comme adaptateur d'observations, puis utilisait son `base.quality==='DATA_OK'` pour déclarer la santé du système. Or `decision-v52` définit `rawFresh` notamment par `lastAudit.ts>=bar3Start && lastAudit.ts>=bar15Start`, ce qui force artificiellement DATA_DEGRADED pendant les 5–30 secondes après **chaque frontière 3m/15m** avant le premier Audit de la nouvelle bougie.

Preuves réelles :
- 15h21:00 DATA_DEGRADED → 15h21:10 DATA_OK
- 15h24:00 DATA_DEGRADED → 15h24:10 DATA_OK
- 15h27:00 DATA_DEGRADED → 15h27:10 DATA_OK
- Cette alternance se répète à chaque ouverture de bougie ; les CSV 3m/15m et les Audit ne sont PAS perdus.

**Correction V5.4 active dans `modules/v5/decision-v54.js`:** distinguer données objectivement périmées (prix OKX >25s, Audit >65s, oscillateurs manquants, dernier MCB confirmé trop ancien, collecteurs indisponibles) d'une première observation de bougie encore **en attente**. Dans ce second cas, conserver `DATA_OK` et afficher `WAIT_MCB_NEW_BAR_FIRST_SNAPSHOT` ; empêcher une entrée nouvelle avant que 3m et 15m aient fourni le premier Audit de leur nouvelle bougie. Les protections indépendantes de position (−500$, gain floors 120/90 et 220/180) restent en service.

Interface : une mention « nouvelle bougie : premier relevé en attente (données précédentes fraîches) » peut apparaître sur MCB3 ; elle ne s'affiche pas comme panne.

**Vérification en temps réel après déploiement :** les cinq ouvertures 15h51, 15h54, 15h57, 16h00 et 16h03 ont été enregistrées en DATA_OK avec `WAIT_MCB_NEW_BAR_FIRST_SNAPSHOT` puis DATA_OK sans faux dégradé. Aucun événement DATA_DEGRADED dans le journal durant ces transitions.

## Cause 2 : chaîne Elastic native arrêtée lors du retrait de l'ancien V4.10.10

Un défaut indépendant a été découvert : `data/elastic-observer-events.ndjson` n'était écrit que par `trade-simulator-v4.js`, appelé par la boucle de l'ancien `cerveau-central`. L'arrêt voulu de V4.10.10 a donc arrêté **accidentellement la production des événements horodatés E3/E15/cross/qualité** vers 13h36 CET, même si les CSV et l'Audit MCB continuaient d'arriver. À 16h02, la dernière ligne enregistrée dans l'ancien journal portait encore l'id 13784. V5.4 pouvait continuer à lire les valeurs MCB confirmées et PM, mais ne recevait plus **les nouveaux événements natifs observés**.

**Réparation partielle et sans troisième moteur :** `modules/v5/causal-event-feed-v54.js` produit, à partir du flux Audit existant, seulement les observations natives E3/E15 Live/confirmé/interrompu et les BW/LBWcross. Le producteur est intégré au **même processus V5.4** `boono-v54-paper` par `runner-v52.js`. Il possède un état persistant `data/v54-native-event-feed-state.json` avec dernier Audit traité, identifiant de dernier événement et famille de signaux. Aucune dépendance à un moteur V4, aucun vote directionnel, aucun broker, aucun shadow de décision. Le fichier d'événements historique est conservé, avec identifiants de continuité, rotation et source `BOONO_V54_EVENT_DATA_ONLY`.

- Amorce à partir de la dernière observation réelle vers 16h02 CET, **sans fabriquer rétrospectivement les événements manquants de 13h36 à 16h02**. Ce trou historique doit rester visible dans l'interprétation.
- Premiers tests : événements E3 UP Live à l'heure véritable, BW/LBWcross sans vote doublé, interruption Live avec sourceTs d'origine, confirmation native seulement après clôture et **première observation**, idempotence des snapshots et absence d'autorité de trading.
- L'état du producteur progresse avec les Audits 30 s. À la première vérification réelle, aucun nouvel E3/E15/cross n'avait encore été détecté après le bootstrap : ne pas annoncer le fichier comme déjà peuplé de nouveaux événements sans preuve.
- **Limite restante :** les anciennes classes qualitatives `INEFFICIENT/POWERFUL/SILENT/EASY` provenaient du classificateur V4 sur efforts/rendements P75/P95. Le nouveau collecteur rétablit les événements natifs structuraux, **pas automatiquement ces classes calibrées**. Les PM3/PM5 et le PM Live utilisés par V5.4 restent actuels et indépendants ; les anciennes transitions de qualité Elastic doivent être considérées comme HISTORIQUES tant qu'une source P75 causale autonome n'a pas été reconstruite. Ne pas inventer une classification avec le seul signe du prix.

## Tests et non-régression

- `tests/v5/v54-freshness-boundaries.test.js` : 8 tests avec fixture figée du 25/10 pour frontaliers 3m/15m, arrêt de faux DATA_DEGRADED, vrai Audit périmé, vrai collecteur périmé, champ oscillateur manquant, prix OKX périmé.
- `tests/v5/v54-native-event-feed.test.js` : 5 tests de télémétrie E3/E15, causalité observée, première confirmation as-of, interruption, non-double-vote, absence d'action trading.
- Ensemble des tests avant activation de la télémétrie : **204 exécutés, 198 réussis, 0 échec, 6 anciens replays sautés faute de données Audit**.
- Syntaxe des modules V5.4, runner, config-server et JavaScript authentifié validée. Seuls `boono-v54-paper` et `config-server` ont été redémarrés ; V4.9.3, BOONO-TV, collecteurs et Execution Lab sont restés indépendants.
- Sauvegardes ledger + ancien event journal dans `/root/boono-v54-native-events-prelaunch-20261026/`. Ancien ledger de 15h50 dans `/root/boono-v54-freshness-fix-20261026/`.

## À surveiller prospectivement

1. Vérifier la première écriture réellement provoquée par un nouveau E3/E15 ou BW/LBWcross, `observedAt` et `sourceTs` distincts, l'absence de duplication après redémarrage.
2. Maintenir le diagnostic de qualité de source sur plusieurs changements de bougies et, surtout, sur une vraie panne pour s'assurer que DATA_DEGRADED reste un blocage réel.
3. Ne pas requalifier le manque de conversion P75 en « données complètes » ; cette métrique n'a pas été reconstituée lors de cet incident.
4. Aucun ordre financé et aucune activation de V4.10.10/V5.3.3 comme moteur.

**Conclusion :** l'affichage DÉGRADÉ provenait d'une mauvaise condition de fraîcheur héritée de V5.2. La réforme V5.4 a aussi révélé une dépendance d'alimentation Elastic à l'ancien moteur ; la télémétrie native est séparée de l'autorité décisionnelle mais conservée dans le processus principal.
