# BOONO Systems — Constitution active V5.4 · 26 octobre 2026

## Statut et mandat
**V5.4 est la nouvelle Constitution décisionnelle PRINCIPALE PAPER**, pas un shadow ni une hypothèse concurrente. Elle remplace la chaîne de décision V5.3.3. V4.9.3 demeure l'unique comparateur stratégique actif indépendant. Les anciennes V5.0.0, V5.3.3, V4.10.10 et la machine `boono-v5-structure-readonly` ne doivent plus publier des avis concurrents en exploitation ; leurs codes, dossiers et PNL restent archivés sans effacement.

Auteur des concepts de marché : propriétaire BOONO Systems. Implémentation et confrontation au code par IA. Le serveur est la réalité, le code est l'état implémenté, les archives la mémoire, les intentions des hypothèses.

## Erreur structurante éliminée
V5.3.3 héritait de V5.3 dont la direction candidate était :
`cross3?.direction || posture.liveDirection || posture.structuralMemory`.
Le cross 3m possédait donc une priorité directionnelle sur la trajectoire 15m. Les révisions successives V5.3.1–3 ajoutaient des permissions/vetos plutôt que remplacer cet ordre. **V5.4 remplace le noyau actif.**

## Contrat des responsabilités

1. **MCB15 directeur** : pivots LBW/E15 causalement confirmés sur bougies terminées, et relations E15→E15 définissent la campagne persistante, sa direction, sa date d'origine et sa phase. L'offensive BW/LBW15 Live contraire signale un épisode CONTESTED ou FORMING mais ne réécrit pas seule la trajectoire confirmée. Les points LBW/BW et leur relation au prix servent à évaluer la maturité et les divergences. Une confirmation E15 15m ne devient disponible qu'APRÈS la clôture de la dernière bougie requise : pas de fraude temporelle sur `sourceTs`.
2. **Origine de prix 30m/1h/2h** : dernier extrême réellement confirmé, distance parcourue depuis cet extrême, position dans le range, durée, changement de terrain, contexte 1h/4h (informatif, sans droit de veto autonome). L'identité de campagne est `direction|E15:sourceTs` ; elle ne naît pas de chaque cross3 ni d'un profit floor.
3. **MCB3 tactique** : E3, croisements et pivots imbriqués pour identifier une première attaque, une respiration, un retest ou une reprise DANS la campagne directrice. Les croisements E3 et événements natifs de la même famille ne constituent pas des votes directionnels indépendants. Un E3 opposé ne change pas seul la direction stratégique.
4. **Contre-campagne et retournement en formation** : exception structurellement qualifiée, sans inversion artificielle de la campagne 15m. Une nouvelle occurrence E15 Live opposée peut formuler une TRANSITION seulement avec croisement 3m cohérent et reconquête/defense du terrain par bougies confirmées. Un scalp tactique extrême E3 contraire reste un épisode distinct de respiration, non une nouvelle campagne stratégique.
5. **MA3 et MA15** : reconnaissance des tests réels, du territoire accepté/rejeté, de la maturité et des ancres de risque ; proximité de la MA seule ≠ veto. Une zone de confrontation active, sans prolifération LGI. Un rejet ne dispose d'autorité forte que s'il est démontré par les bougies/prix, pas simplement hypothétique.
6. **MF15 et MF3** : qualité de la candidature, cohérence et amélioration, pas autorité pour inventer une direction. `REINFORCING` implique des pentes réellement favorables ; les petites pentes adverses tolérées ne deviennent pas artificiellement positives. L'évolution 2h du MF15 reste visible, mais ne condamne pas un E15 nouveau avec reprise démontrée.
7. **PM/Conversion/liquidité** : qualité d'exécution, jamais souveraineté de thèse. `INEFFICIENT`/`CONTESTED` peuvent être des respirations d'une campagne productive ; `POWERFUL` ne constitue pas une permission automatique ni nécessaire d'entrée. Si PM3/PM5/PMLive s'opposent ensemble, le timing est suspendu, pas la campagne effacée.
8. **Position ≠ Campagne ≠ Protection** : une position peut sortir pour son gain floor alors que la campagne subsiste. Une nouvelle position dans la même campagne exige une preuve tactique réellement postérieure à la sortie (nouveau pivot E3/reconquête défendue). Interdit de retourner le sens uniquement parce que l'ancienne position a été invalidée.
9. **Risque et sorties** : le ledger PAPER conserve ses protections dures `−500 USD BTC`, `+120→90`, `+220→180`. Le nouveau EXIT stratégique ne peut pas être provoqué par un seul cross3, une conversion adverse isolée ou un cross15 Live provisoire. Il demande une transition E15 structurelle causale et une perte effective de territoire avec opposition MF, ou une invalidation structurelle confirmée par le prix. Ces nouvelles règles ne dispensent JAMAIS des stops durs. Les positions héritées de V5.3.3 conservent leurs anciennes règles de sortie jusqu'à leur clôture.

## Machine d'état V5.4

`STRUCTURE_UNKNOWN` → `MCB15_PARENT_CONFIRMED` (E15/creux/crête causalement disponible) → `STRUCTURAL_CONTINUATION` (nouvel épisode E3 dans cette trajectoire) → `POSITION_OPEN` si MF/lieu/PM/risque compatibles. `STRUCTURAL_REVERSAL_FORMING` est une candidature distincte fondée sur E15 Live contraire PLUS prix reconquis, elle ne détruit pas le parent. `TACTICAL_RESPIRATION` est une opportunité explicitement limitée contre campagne depuis l'extrême E3.

En position : `HOLD` → `WARNING/PROTECT` quand 3m/LIVE contredisent sans transfert prouvé → `EXIT` seulement après transfert territorial structurel, ou `EXIT_RISK/FLOOR` selon protections financières indépendantes. Une sortie ne supprime pas l'objet campagne.

En FLAT après EXIT : `CAMPAIGN_STILL_ACTIVE` peut persister ; seule une nouvelle preuve E3/defense du prix postérieure à l'exit permet une réentrée, jamais l'ancien cross consommé ou la simple valeur PM.

## Implémentation délimitée
- `modules/v5/decision-v54.js` : nouveau noyau actif, directement basé sur la trajectoire E15→E15 structurée ; réutilise V5.2 uniquement comme **adaptateur d'observations** (géométrie, PM, MF) sans reprendre sa direction ou ses actions. Réutilise `ma-contract-v531` pour les épreuves de prix et `v53-causal.mapPlace` pour une invalidation réellement observée. N'hérite du moteur V5.3.3 **que pour la sortie d'une position historiquement ouverte sous cette politique**, jamais pour sélectionner une nouvelle entrée V5.4.
- `modules/v5/paper-v52.js` : migration additive v5.3.3→v5.4 (fichier et ledger historiques préservés), clés d'anti-réentrée et protections économiques inchangées ; nouvelle réentrée seulement après preuve post-sortie pour la même campagne.
- `modules/v5/runner-v52.js` : processus PM2 historique V5 réorienté vers la décision V5.4, même source OKX, mêmes CSV TradingView, sans nouvel agent de trading ni nouvel ordre financé. Le nom PM2 historique `boono-v52-paper` demeure temporairement l'identifiant de compatibilité ; il ne signifie pas V5.2 actif.
- `modules/config-server.js` : Etat vivant V5.4 et diagnostic de campagne depuis `readings.structural54`. La route `/api/v5-structure` lit désormais la **même analyse décisionnelle V5.4**, non le fichier d'une 3e opinion structurelle. L'ancien observateur autonome peut s'arrêter sans supprimer sa mémoire historique.
- `tests/v5/v54-structural-contract.test.js` : tests de trajectoire prioritaire, absence d'orientation créée par PM/cross3, lecture as-of sans futur, parent E15 connu après sa clôture, migration et protection de positions héritées, E3 consommé/non-requalification sans terrain post-sortie.

## Gouvernance, finances et honnêteté

Tous les ordres restent PAPER 0$, sans API de trading financé. Le `boono-execution-lab` A/B/C, qui mesure carnet et frais, ne prend aucune décision stratégique et continue séparément ; V4.9.3 comparateur garde sa propre comptabilité. Les données des anciennes versions restent intactes, les anciennes opinions actives sont arrêtées.

Les scénarios des trades #2, #18, #22, #25, #31, #35–42 ont servi à identifier et concevoir les principes : tests **in-sample** de cohérence, pas preuves d'un avantage de PNL. Mesurer prospectivement trades/jour, pertes évitées, sorties, campagnes maintenues, nombre de changements de polarité, opportunités manquées et PNL net après frais. Un nombre de trades plus faible n'est pas, à lui seul, une preuve de réussite.

## Déploiement
À compléter après sauvegarde du ledger, vérification des tests globaux, redémarrage unique du PAPER et arrêt des anciens moteurs.

## Activation réelle — lundi 26 octobre 2026, 13h35–13h42 CET (Stockholm)

- Tests V4/V5 et code browser authentifié avant activation : **189 tests exécutés, 183 réussis, 0 échec, 6 replays historiques indisponibles** à cause de la rotation des données Audit. La compilation syntaxique de `modules/v5/decision-v54.js`, `modules/v5/paper-v52.js`, `modules/v5/runner-v52.js`, `modules/config-server.js` et du client JavaScript extrait de `/app.js` a réussi.
- Contrôle `--test-read` sans mutation : V5.4 retourne `WAIT_MCB3_INSIDE_MCB15_CAMPAIGN`, `DATA_OK`, campagne directionnelle SHORT issue du pivot causal E15 crête de 80 549 USD. Code indique `brokerOrdersEnabled=false`.
- Snapshot avant migration : **`/root/boono-v54-preupgrade-20261026/`** contient ledger, décisions, trades et mémoire structurelle, plus les versions git précédentes du runner, du ledger et de l'interface. Empreintes SHA-256 de l'ancien ledger et de la sauvegarde identiques.
- État réel pré-bascule : 58 trades clos, 23 gagnants, 35 perdants ; net historique **−81,3447 USD**, equity **918,6553 USD**, frais comptabilisés **87,0027 USD**, 58 clés consommées, position FLAT. Migration additive v5.3.3→v5.4 confirmée sans réinitialisation et sans ordre financé. Les anciennes positions V5.3.3 éventuelles conservent leur ancienne logique de sortie ; aucun transfert arbitraire du stop.
- **Un seul moteur principal V5.4**, processus PM2 renommé **`boono-v54-paper`**, lit et écrit sur le ledger historique existant `data/v52-paper-state.json` (nom de fichier historique de compatibilité) avec version **`v5.4-paper-ledger-v0.7`**. Processus ancien `boono-v52-paper` supprimé de PM2, sans suppression de données.
- Première décision temps réel : `WAIT_MCB3_INSIDE_MCB15_CAMPAIGN`. Première entrée réelle simulée sous nouvelle politique : `ENTER_SHORT` à **80 327,9 USD**, événement du 26 octobre vers 13h40min40s CET, `V54_STRUCTURAL_CAMPAIGN_TACTICAL_ENTRY`, `brokerOrdersEnabled=false`. Une entrée PAPER n'est pas une preuve de stratégie rentable.
- Suppression de PM2 **uniquement** des anciens écrivains/observateurs `boono-v5-shadow`, `boono-v5-structure-readonly`, `cerveau-central` (historique V4.10.10) et `moteur-boono` (ancienne V2). Aucun code, archive ou ancien ledger n'a été supprimé. `pm2 save` après retrait et renommage enregistre ces statuts pour les prochains redémarrages.
- **`boono-v493-baseline` reste le seul comparateur stratégique PAPER.** Collecteurs TradingView 3m/15m, baton, prix OKX, trendline, watchdog, BOONO-TV, interface, noVNC et laboratoire indépendant `boono-execution-lab` demeurent en ligne. Le laboratoire ne possède aucune autorité d'entrée et ne place pas d'ordres financés.
- L'interface `config-server` a été redémarrée et sert l'État V5.4 en tête. `/api/v5-structure` est alimenté par **la même décision V5.4**, au lieu du vieux moteur structurel autonome. Les routes privées retournent HTTP 302 pour une requête sans authentification — comportement normal.
- L'ancien onglet/état V4.10.10 est marqué **ARCHIVE ARRÊTÉE** ; ses fichiers ne se réactualiseront plus. Les graphiques MCB et l'historique PAPER restent actifs. Le rendu visuel dans le navigateur authentifié de l'utilisateur n'a pas encore été constaté directement.
- Les modifications non reliées au moteur, déjà présentes dans le dépôt `boono-tv/` et `shared/boono-chart-renderer.js`, n'ont pas été modifiées ni incluses dans ce déploiement.
