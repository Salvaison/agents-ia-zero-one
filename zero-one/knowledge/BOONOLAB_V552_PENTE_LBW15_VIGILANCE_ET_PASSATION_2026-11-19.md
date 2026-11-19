# BOONOLAB — V5.5.2 : LBW15 Live première vigilance et remplacement contrôlé V551

**19 novembre 2026 CET. STATUT : IMPLÉMENTÉ · TESTÉ · MIS EN SERVICE EN PAPER.**  
**Demande utilisateur :** « je te propose de créer une nouvelle version du moteur 5.5.2 et remplacer 551 ». Contexte validé : pente LBW15 Live ouvre la vigilance **avant Cross15 Live**, MCB3 propose les opportunités tactiques, MCB15 arbitre la campagne, MF15/MF3 et PM Live expliquent l'effort/translation ; les intervalles entre inflexion, Cross3 et Cross15 doivent être mesurés en temps **et déplacement du prix**, sans empiler de seuils arbitraires. L'horizontalisation conjointe LBW15/BW15 peut justifier différer une entrée, pas inverser automatiquement.

## Architecture autonome V552

Le code PAPER V552 ne fait **aucun import du décideur, ledger ou runner V551/V543**. Modules nouveaux sous `modules/v552/` :
- `source.js` : TradingView CSV MCB3/15/1h/4h clôturés as-of + séries Bâton et prix public OKX. Aucun carnet L2 ni slippage réel.
- `decision.js` : MCB3 Cross3 = proposition tactique, parent 15m persistant, croisement confirmé 15m/ E15 comme preuves, suivis par MF3 et MF15, PM Live, débit Bâton et prix. **Correction du bug de type V551** dans la protection : les variables directionnelles restent `long/short` lorsqu'elles sont signées. Aucune checklist 18/25 minutes ni seuil PM absolu ajouté.
- `vigilance.js` : mémoire propre de `LBW15_PENTE_LIVE_VIGILANCE` et `CROSS15_LIVE_WATCH`, première référence prix/as-of, pentes BW15 et LBW15 3m/15m, rapprochement des courbes, observations MCB3/PM/MF, déplacement favorable et adverse depuis l'ancrage, meilleur terrain conservé, PM favorable/adverse et flips **sans sommer des fenêtres chevauchantes**. Retour du Live au parent = rejet géométrique de la tentative, mémoire d'origine conservée et nouvel essai indépendant. `POLARITY_UNCERTAIN` descriptif lorsque **les deux pentes courtes sont faibles relativement à leurs propres mouvements récents** ; comparaison sur distribution historique glissante, sans niveau absolu ajouté.
- `paper.js` : compte PAPER propre version `v5.5.2-paper-ledger-v1`, politique `v5.5.2-lbw15-live-vigilance-campaign-paper-v1` ; fees taker 0,05 % par côté et notionnel fictif 1 500 USD ; hard risk adverse 500 $ de cours BTC sur tick frais. Aucune commande broker et aucune promesse de frontière structurelle infaillible.
- `runner.js` : PM2 **`boono-v552-paper`** seul actif pour cette lignée, cadence 5 sec sur prix OKX, états `data/v552-paper-*` indépendants.

La sortie anticipée Live utilise une **séparation stricte** : `CROSS15_LIVE` et pentes activent d'abord attention, puis MCB3/PM/prix et MF rendent une contre-offensive crédible. Une sortie locale anticipée, **non automatique sur un simple Live**, nécessite aussi une direction de MF15 de fond et sa pente cohérentes, un gain latent positif après frais et une restitution économique plus grande que le gain de prix restant. Le Cross15 clôturé opposé conserve sa voie d'examen/sortie locale ; **la fermeture de position ne vaut pas autorisation d'entrée inverse**.

L'entrée MCB3 reste possible après des confirmations différées, mais doit encore traduire **du prix favorable sur les trois dernières minutes**, et pas seulement accumuler du déplacement depuis un Cross3 ancien. Lorsque BW15 et LBW15 sont conjointement peu directionnels, l'entrée exige la cohérence MF15/MF3 et PM ainsi que la conversion marginale : ceci vise le churn constaté sur V551 #7–#9.

**Évaluation économique non validée :** les premières comparaisons de sortie Live sont des prix Bâton rétrospectifs, non des fills ni un P&L complet avec réentrées. Relecture du nouveau contrat sur les onze premières sorties V551 : proposition anticipée pour #1 (prix observé 20h01m43s, hypothétique +1,10 $ net contre −1,81 $ réel) et #4 (02h25m13s, hypothétique +8,61 $ contre +4,56 $ réel). Il **n'anticipe pas** la sortie du SHORT gagnant #2 ni du LONG gagnant #6 sur ces observations. Cela ne prouve pas qu'un moteur complet aurait produit de meilleurs résultats : le chemin d'entrées et les futures campagnes peuvent changer.

## Passation 551 → 552 sans double gestion ni remise à zéro

À **19/11 11h30 CET**, `boono-v551-paper` a d'abord été STOPPED. La migration réelle est l'exécution unique de `scripts/boonolab-v552-handoff.js`, avec vérification PM2 de l'arrêt du prédécesseur, SHA-256 du ledger figé, sauvegarde de ses données et segments, refus d'écraser V552 et duplication atomique uniquement après intégrité vérifiée.

**Archive exacte :** `/root/boonolab-archives/V551_RETIRED_TO_V552_2026-11-19T10-30-05-448Z/` ; manifest SHA-256 dont ledger `a1c622d855bb04852189a738b93c3f701963a75f17fcdf0264a5c2b036b1539e`.

À l'instant de la bascule : V551 avait **11 trades clôturés, 988,7444 $ d'equity réalisée, 17,2617 $ de frais comptabilisés, et un LONG ouvert**. V552 reprend **exactement** ce capital, ces trades historiques (marqués `historicalPolicy/sourceEngine: V551`), les clés d'épisode consommées, le parent E15 et la position (prix d'entrée, `entryPolicyVersion=V551`, frais, MFE, MAE) ; **aucune fermeture fictive** ni transfert V543. Les comptes restent explicitement auditables et `migratedFrom.oldCompleted=11`. `newPolicyClosed` et `newPolicyNetUsd` comptent **seulement V552**, séparément du P&L cumulé.

Le premier nouveau trade clôturé #12 est la sortie du LONG **hérité**, enregistrée sous la **politique de sortie V552** : environ **−1,4695 $ nets**, equity cumulée **987,2749 $** ; après cela, une nouvelle position SHORT V552 a été ouverte. **Ne pas présenter les 11 résultats V551 comme performances obtenues par V552.**

## Affichage Watch et BOONO-TV

- `modules/config-server.js` : nouvelle route authentifiée **`/api/v552-paper`** au contrat strict, dernier état et `vigilance` (pente LBW15 Live, Cross15 Live, prix conservé, observations PM), panel État vivant V552, Vagues V552 bleu en haut / V543 rose en bas, Historique actif V552 ; V551 **archive repliable**, tout comme V55. Les tickets historiques hérités sont cachés de la bande V552 comme clôtures V552, avec comptabilité cumulative accessible. Rapports `/api/paper-trade-report/v552/:n` distinguent entrée V551 héritée et sortie V552. Routes sensibles gardent `requireAuth` (HTTP 302 vers login sans session).
- `boono-tv/bridge.js` : snapshot `engine552` depuis ledger V552 frais, seuls trades PAPER V552/V543 pour la scène, sans publication d'anciens V551/V55 comme positions actives. Résultat V552 *nouvelle politique* séparé de l'equity cumulative.
- OVH `/home/ubuntu/boono-tv-studio/runtime/boono-tv/scene/{index.html,app.js,chart-views.js}` : bandeau V552, résultats et position, marqueurs bleus V552 / roses V543 ; source réelle du bridge Amsterdam→OVH vérifiée. Sauvegarde des trois fichiers avant modification : `/home/ubuntu/boono-tv-studio/backups/V552_TV_20261119T102529Z/`. **Composer, vidéos, rotations, radio et autres travaux BOONO-TV non modifiés** ; `boono-studio` et `boono-radio` actifs. Le rendu DOM du bandeau a été évalué par VM contre le snapshot OVH réel, sans prétendre avoir visualisé la session utilisateur.

## Tests, preuves et limites

- `tests/v552/vigilance-policy.test.js` : 11 tests, pente Live avant Cross15, retours de Live, horizontalisation des deux pentes, MF/PM et bénéfice à risque, sortie 15m confirmée, pas de broker, migration unique, préservation des frais/position et hard adverse 500$.
- `tests/v552/watch-tv-integration.test.js` : 7 tests, auth/contrat d'API, visuels, report de version, archives distinctes, bridge OVH/V543 et moteur autonome.
- Tests historiques V551 et V55 adaptés pour affirmer « archivé » sans effacer le code historique.
- **85 tests de non-régression PASS, 0 échec** au contrôle du 19/11 à ~11h35 CET, incluant V552, V551, V55, Watch et BOONO-TV.
- Services vérifiés : **`boono-v552-paper` ONLINE**, **`boono-v551-paper` STOPPED**, **`boono-v543-paper` ONLINE**, `config-server` et `boono-tv` ONLINE, ticker 4×15 autonome en place. Snapshot OVH testé `engine552.status=DATA_RECENT`, boîtier V552 LIVE et vrais marqueurs V552/V543 ; aucun historique V551 actif. Source HTML et JS 200, aucun redémarrage vidéo/Composer.
- Ne pas extrapoler de rentabilité à partir de onze trades V551, et surveiller les contre-exemples après adoption. Le niveau exact de performance et le nombre de trades V552 évolueront avec le PAPER.

**Gouvernance :** `CONCEPTION` approuvée par l'utilisateur, `IMPLEMENTATION`/ `TESTS`/ `MISE EN SERVICE` vérifiés avec distinction explicite, pas de nouveau PM2 SHADOW ni de module de décisions V543/V551 importé.
