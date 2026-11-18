# BOONOLAB — V5.5.1 : moteur PAPER autonome, retrait V5.5 et diffusion Watch/BOONO-TV

**18 novembre 2026, Stockholm — exécution sur Amsterdam et OVH.**  
**Statut : V551 IMPLÉMENTÉ, TESTÉ et MIS EN SERVICE en PAPER uniquement ; V55 ARRÊTÉ/ARCHIVÉ ; intégration Watch et TV VÉRIFIÉE techniquement. La rentabilité n'est PAS validée.**

## Mandat utilisateur et correction conceptuelle

« 5.5 était bâclé ... il est temps de passer à 551. 55 doit être archivé, un artefact ... voir les résultats de 551 dans l'interface et chez BoonoTv ... moteur propre avec toutes ces décisions indépendantes ... pas de bricolage. »

Signature théorique de retournement proposée par l'utilisateur : **E15 → changements de pente LBW15 → plusieurs Cross3 confirmant vitesse/puissance de la pente → Cross15 → PM/PM Live (conversion et faux départs) → E3 → E15**. Les événements peuvent se chevaucher et varier d'ordre ; **ne jamais transformer la signature en checklist chronologique obligatoire**. Son déclencheur d'entrée est **MCB3**, jugé par **MCB15 BW/LBW et E15**, avec **MF15/MF3** qualitatifs, **PM et prix** pour la traduction et le lieu/liquidité décrivant le combat. La campagne survit aux respirations tactiques ; une POSITION peut se fermer sans supprimer la CAMPAGNE. Aucun niveau structurel n'est une frontière d'arrêt garantie.

## Retrait V5.5 (fini, ledger et données intacts)

Avant arrêt : `boono-v55-paper` FLAT, 29 clôtures, 7 positives, equity PAPER réalisée **947,2420 USD**, net **−52,7580 USD** (capital initial 1 000 USD). Service PM2 **STOPPED** ; archive horodatée avec manifest SHA-256, segments et ledgers : `/root/boonolab-archives/V55_RETIRED_20261118T162419Z/`. Fichiers d'origine V55 non effacés et consultables en historique Watch. **Aucune importation de son capital, de ses frais ni de ses clés d'admission dans V551.**

Pour réduire les processus de recherche redondants, anciens `boono-v543-lbw15-s1-shadow`, `boono-v543-lbw15-s1-v02-shadow` et `boono-mcb3-first-mcb15-shadow` **STOPPED**, états et journaux copiés avec SHA-256 dans `/root/boonolab-archives/OBSOLETE_V55_SHADOWS_20261118T164036Z/`. Le comparateur stratégique `boono-v543-paper`, le ticker autonome 4×15, l'observateur de régime, Watch et BOONO-TV restent actifs. Les anciens shadows restent des archives, sans autorité.

## Noyau V551 complètement nouveau (code actif)

- `modules/v551/source.js` : lecture directement des **CSV TradingView MCB3/15/1h/4h** et des relevés Bâton horodatés, en respectant les bougies clôturées avant `asOf` ; pas d'import du décideur, du runner ou du ledger V543/V55.
- `modules/v551/decision.js` : état de campagne propre persistant ; source initiale du parent = dernier E15 natif confirmé connu, sinon géométrie BW15/LBW15 clôturée. **Un nouveau Cross3 MCB3 ouvre d'abord un épisode tactique** (mémoire `CROSS3_OBSERVED`, vitesse du franchissement). Ce signal n'est ni une permission finale ni un veto chronométré.
- LBW15/BW15 Live et clôturés : pentes 3/15m, vitesse du rapprochement, changement de cap, Cross15 sur bougie clôturée ; une opposition confirmée ouvre `TRANSFER_CANDIDATE`, puis la réponse du prix, du flux MF et de PM est observée pour qualifier la prise du nouveau territoire. Le parent antérieur est conservé si la vague revient avant une acceptation. E3/E15 natifs confirmés, MF15 lent/MF3 tactique et transitions de PM sont datés dans la `trace`, sans schéma rigide imposé.
- Qualifier l'opportunité MCB3 : 15m, MF et **PM Live actuelle** doivent démontrer une cohérence avec la vague et la progression depuis Cross3 ; PM3/PM15 anciens seuls ne sont pas une preuve fraîche. Les lectures `MF` et `PM` sont des changements signés qualitatifs **sans nouveaux seuils numériques d'autorité**. **Une candidature Cross3 reste `OBSERVING_CAUSAL_CONFIRMATIONS` et peut se qualifier plus tard** lorsque MF ou PM réagissent, tant que le 3m et la vague restent cohérents ; ni refus définitif sur le premier tick, ni minuterie 18/25 minutes. Une nouvelle tentative MCB3 opposée remplace l'épisode.
- **Entrée réellement simulée et clé consommée UNIQUEMENT dans `modules/v551/paper.js` après validation du tick et du ledger**. Une simple proposition du décideur ne consomme pas une opportunité.
- Sortie locale de POSITION : croisement BW15/LBW15 **opposé confirmé sur clôture et postérieur à l'entrée** a une autorité de protection sans attendre le triplet E15+MF+PM ; alternative MCB3 opposé + contestation 15m + transfert de prix et MF/PM. Un E3 opposé seul ne termine pas le parent. Hard risk indépendant **−500 USD de variation du cours BTC**, à prix tick réellement observé ; aucun arrêt sur niveau « certain ». Les autres protections et le rendement ne sont pas encore validés par test prospectif.
- `modules/v551/paper.js` : `v5.5.1-paper-ledger-v1`, politique `v5.5.1-mcb3-first-campaign-memory-paper-v1`, compte neuf **1 000 USD**, notionnel **1 500 USD**, taker **0,05 % chaque côté**, position unique, mouvements MFE/MAE, frais, equity et journal propres, **aucun broker**. Pas de slippage/funding modélisés ; toute sortie s'effectue sur un tick public observé, non un fill garanti.
- `modules/v551/runner.js` : **`boono-v551-paper` PM2 ONLINE**, flux public OKX BTC-USDT-SWAP, examen 5s, états atomiques sous `data/v551-paper-*` ; jamais de réutilisation de comptes, décisions ni `previousAttention` V543/V55. Mode `--test-read` sans mutations.
- Le fonctionnement de la confirmation MF/PM après un Cross3 a été amélioré et retesté **AVANT le premier trade V551**, avec redémarrage contrôlé strictement FLAT, mémoire et compte préservés, photographie `/root/boonolab-archives/V551_PRE_POLICY_FINALIZATION/`. Le code final est bien la version sous tests et commit. Aucune performance artificielle attribuée à ces essais.

## Watch — réel, authentifié, historique explicite

- `modules/config-server.js` : `/api/v551-paper` vérifie strictement `PAPER_ONLY`, versions de ledger et politique, compte, `brokerOrdersEnabled=false` et horodatage ; renvoie résumé au plus frais avec phase de campagne, décision, MF/PM, Cross3/E3, E15/cross15, trace, P&L.
- TRADES → ÉTAT VIVANT : **V551 remplace V55**, sans toucher au panneau V543, données V551 non récupérées auprès de V543.
- TRADES → HISTORIQUE : V551/V543 actifs et **V55 ARTÉFACT** dans une section archive distincte ; ses 29 résultats restent consultables.
- VAGUES : **bande supérieure bleue V551**, inférieure rose V543 ; rapport d'un trade V551 par `/api/paper-trade-report/v551/:n` avec sa mémoire d'entrée ; les historiques V55 `V55:n` restent accessibles depuis les archives seulement. Pas de faux profits shadow.
- Test serveur de routes en session absente : **HTTP 302 /login**, authentification conservée ; test de lecture authentifiée simulé et compilation du JS navigateur passés.

## BOONO-TV — données réelles transportées d'Amsterdam à OVH

- Amsterdam `boono-tv/bridge.js` : le snapshot `/api/snapshot` expose **`engine551`** (ledger V551 seulement, résumé, position, décision, campagne, frais et événements) et les vrais trades `V551`/`V543` exclusivement. Plus de fausse présence active V494 ou V55. `boono-tv` PM2 ONLINE.
- OVH `/home/ubuntu/boono-tv-studio/runtime/boono-tv/scene/index.html`, `app.js`, `chart-views.js` : nouveau bandeau V551 lecture seule, deux canaux de marques de positions (V551 bleu en haut, V543 rose en bas), deux ensembles de clôtures et P&L nets. Source et rendu testés **sur le vrai snapshot relayé depuis Amsterdam**, pas de trade déduit des animations. `boono-studio` et `boono-radio` actifs ; pages/JS 200.
- Sauvegardes OVH antérieures : `/home/ubuntu/boono-tv-studio/backups/V551_TV_20261118T165033Z/`. Pour reproduire le changement précis sur ce studio sans inclure ses autres modifications de Composer, patch `scripts/v551-boono-tv-ovh-display.patch` (de **ces fichiers sauvegardés** vers les fichiers OVH courants). **L'archive Github ne remplace pas ni ne fige les autres développements OVH/Composer préexistants**.
- Il n'a été fait aucune modification des processus d'animation, gestion de bulles, vidéos, rotation, ou scène OVH ; pas de redémarrage du studio imposé.
- La logique Watch et la fonction de rendu BOONO-TV ont été testées par code/VM et routes réelles. **Une inspection visuelle du navigateur authentifié de l'utilisateur n'a pas été réalisée**.

## Tests et critères de prudence

- `tests/v551/independent-policy.test.js` : 12 tests de pureté/séparation des ledgers, MCB3-first, confirmation as-of 15m, parent survivant, Cross3 qui peut recevoir MF/PM plus tard, absence de duplication après réel fill, hard 500$, frais, cross15 opposé sans triple confirmation. 
- `tests/v551/watch-tv-integration.test.js` : 7 tests d'API auth, comptes, rapports Watch, panneaux, bandes, bridge Amsterdam et non-mutation des archives.
- `tests/ui/v55-watch-replacement.test.js` : tests adaptés aux responsabilités historiques : v55 archive, v551 actif, V543 comparateur, anciennes sources de V55 conservées.
- Tests de non-régression V55/PAPER et panneaux BOONO-TV existants : **67 tests ciblés passés, zéro échec** lors de la vérification élargie (à réexécuter avec les ajustements finaux).
- Dernier contrôle lors du lancement : V551 **FLAT, 0 clôture, equity 1 000 USD** ; les prochains gains/pertes doivent venir des futurs vrais PAPER. Les patterns de signature de retournement sont des **hypothèses à falsifier**, pas une performance prédite. Simuler des alternatives complètes et comparer les campagnes avec V543 avant toute conclusion de rendement ; conserver les mauvais cas et les bonnes opportunités refusées.

**Gouvernance :** comptes V55 archivé et V551 nouveau distincts, décisions propres V551, aucun code broker financé, exceptions temporelles documentées, tests et déploiements horodatés. **Seul V551 PAPER est nouveau ; aucune ancienne version V551 cachée ne tourne en parallèle.** Revoir les signatures et le rendement après vraies campagnes, éviter de multiplier les shadow engines.
