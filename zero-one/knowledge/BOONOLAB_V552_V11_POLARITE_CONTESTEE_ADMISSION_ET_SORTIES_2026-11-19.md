# BOONOLAB — V552 v1.1 : entrées sous polarité contestée et révision de l'autorité Cross15 confirmé

**19 novembre 2026, CET.**  
**Statuts : diagnostic vérifié, code V552 v1.1 implémenté/testé, migration PAPER mise en service, contrôles d'intégrité réalisés. Aucun nouveau moteur ni shadow parallèle.**

## 1. Déclencheur et observation utilisateur

Capture « Screenshot 2026-11-19 13.16.26.png » montrant le trade **V552 #14 LONG**, entrée **19/11 12h45m47s** à **63 950 $ BTC**, sortie **13h15m37s** à **63 777,70 $ BTC**, **−5,5394 USD nets**, raison `V552_CONFIRMED_15M_POSITION_EXIT`. L'utilisateur relève que le moteur continue d'entrer et sortir systématiquement sur les Cross15 confirmés, sans appliquer correctement l'attention LBW15 pente Live / Cross15 Live, et continue de négocier un marché de polarité 15m incertaine.

**L'anomalie est confirmée dans les décisions réelles et la constitution PAPER.** Le trade #13 SHORT perd **−5,2854 $**, fermé au Cross15 LONG confirmé vers 12h45, suivi **10 secondes** plus tard de l'admission LONG #14, alors que son parent de campagne est encore SHORT (`TRANSFER_CANDIDATE`). #14 perd −5,5394 $ et est fermé au Cross15 SHORT confirmé vers 13h15, puis #15 SHORT est ouvert à 13h16 alors que son Cross3 remonte à environ 25 minutes, avec un déplacement BTC d'environ 194 $ déjà accompli et seulement +3 $ de translation marginale du prix 3m.

Le marché présente des oscillations MCB3 et BW15/LBW15 dans un intervalle de prix disputé tandis que MF15 est globalement positif/progressif, ce qui expose les transactions SHORT à un conflit structurel malgré des confirmations de pente à court terme.

## 2. Cause de conception exacte

`modules/v552/decision.js#qualify` acceptait une nouvelle entrée dès qu'un Cross3 mémorisé était aligné avec les conditions ponctuelles PM/MF, sauf `attention.phase==='POLARITY_UNCERTAIN'`. Or `modules/v552/vigilance.js` émet cette phase seulement lorsque **les deux pentes instantanées** BW15 et LBW15 sont relativement faibles. Elle disparaît dès que la pente accélère : **l'historique des Cross15 contredits et des épisodes vendeurs/acheteurs qui n'ont pas conservé leur prix était oublié pour l'admission**. Le transfert de campagne rendait en outre `CAMPAIGN_ACTIVE` immédiatement disponible.

`positionReview` prévoyait également : `if(confirmedOpposite) EXIT_POSITION` pour **tout** Cross15 clôturé opposé, même si la position, son MF15, la conservation de prix et le parent stratégique étaient encore cohérents.

La vigilance LBW15 Live / Cross15 Live calculée et horodatée n'avait donc pas d'autorité suffisante ; un simple croisement 15m confirmé reprenait la priorité indépendamment de ce contexte.

## 3. Correction dans l'UNIQUE V552 v1.1

Politique exacte **`v5.5.2-lbw15-live-vigilance-campaign-paper-v1.1`**, ledger toujours **`v5.5.2-paper-ledger-v1`**.

**Moteur de lecture structurale intégré :** `modules/v552/market-quality.js`, bibliothèque pure appelée depuis `decision.js`, **aucun nouveau PM2**. Elle lit uniquement les bougies MCB15 **déjà clôturées à l'instant as-of**, les Cross15 successifs, le prix à leurs clôtures et les relevés Bâton déjà disponibles. Elle distingue :
- Un précédent Cross15 ayant ou non **conservé le prix dans sa direction**, sans inférer le futur ;
- Le dernier Cross15 nouvellement confirmé et **la réponse réelle du prix ensuite** (contre-attaque, respiration, reprise et conservation), avec conversion PM Live et MF15/MF3 ;
- Le déplacement encore productif après Cross3 : si la translation a dépassé le range 15m typique sans reprise défendue, candidature mature, à réexaminer ;
- Le MF15 **niveau et pente**, qui ne doivent pas confirmer une nouvelle position si tous deux la contredisent ;
- Les zones haut/bas 1h comme simples *lieux observés*, pas des frontières/stop garantis.

Le filtre `deferNewEntry` agit **sur les nouvelles admissions uniquement** dans un marché précédemment contesté, ou lorsque MF15 s'oppose clairement. Le Cross15 confirmé n'est plus une permission d'ouverture indépendante. Il n'y a pas de seuil PM Live absolu ni délai d'expiration 18/25 minutes nouvellement ajouté.

**Maintien de POSITION :** le Cross15 opposé confirmé devient un examen structurel, **pas une sortie inconditionnelle**. V552 peut conserver une position profitable, avec MF15 niveau+pente favorables, terrain positif sur 3m, parent de campagne aligné et contre-offensive n'ayant pas encore conservé son prix. Si ces preuves manquent, la sortie Cross15 confirmée continue d'être permise. Les protections Live antérieures et **le hard risk adverse 500 $ BTC** sont maintenus : aucune suppression du risque. Limite : MF15 montant mais encore sous zéro ne satisfait pas toujours ce contrat de maintien ; évaluer par la suite sans nouveaux réglages opportunistes.

**Visibilité Watch :** l'état vivant V552 montre désormais `MARCHÉ / ADMISSION`, la présence de précédents retournements non conservés, l'acceptation du prix post-Cross15 et le motif d'une entrée différée, en plus de la vigilance LBW15 déjà présente. Les décisions journalisées V552 enregistrent également le contexte `marketQuality`.

## 4. Contrôles as-of et contre-exemples

Tests sur les données historiques réelles du moteur :
- **#14 LONG 12h45** : `priorPolarityRetained:false`, pas de défense après le Cross15 LONG, **admission différée** sous v1.1 au lieu d'ouverture immédiate.
- **#15 SHORT 13h16** : Cross15 SHORT préalablement précédé d'une direction LONG non conservée, MF15 niveau opposé au SHORT, pas de reprise de territoire claire, **admission différée** si V552 avait été FLAT à cet instant. La position #15 déjà ouverte sous v1 a été **conservée lors de la migration** : le code ne l'a pas liquidée rétroactivement.
- **#2 SHORT gagnant 18/11 20h34** : Cross15 SHORT suivi d'un nouveau terrain défendu, MF15 cohérent, **reste admissible** dans l'évaluation as-of.
- Contre-exemple important : **#6 LONG gagnant** aurait été initialement différé par le nouveau contrat, car la traduction et le MF15 n'étaient pas encore requalifiés au premier tick. Il faut donc mesurer le coût des opportunités manquées et la date de réadmission, et **ne pas affirmer que v1.1 augmente le P&L**.
- D'autres entrées de la séquence conflictuelle #8–#13 auraient été différées. Ce n'est pas un backtest de trajectoire de positions et frais ; le fait qu'une ancienne entrée soit refusée ne prouve pas qu'une entrée future aurait été meilleure.

**Tests automatisés : 95 PASS, 0 FAIL**, incluant 10 tests spécifiques qualité de marché/révision, compatibilité V552, anciennes protections V551/V55, routes Watch authentifiées, UI BOONO-TV et horloges as-of. Les prix / MFE / frais sont ceux des positions réellement enregistrées pour les tests de diagnostic ; aucun fill fictif n'est ajouté au ledger.

## 5. Migration v1 → v1.1 et intégrité

Procédure explicite `scripts/boonolab-v552-policy-v11-upgrade.js` :
1. Backup des sources v1 depuis Git et preflight de la politique et du ledger.
2. **STOP PM2 `boono-v552-paper`** avant tout changement.
3. Vérifier `boono-v551-paper` STOPPED, source figée et SHA256, archiver ledger/summary/journaux dans `/root/boonolab-archives/V552_V1_TO_V1_1_2026-11-19T12-42-09-717Z/`.
4. Migration **uniquement de `policyVersion` et d'une métadonnée `policyRevision`**, avec vérification que comptes, frais, P&L, 14 clôtures, historique, clés utilisées, parent, mémoire, et **SHORT ouvert** sont inchangés.
5. RESTART du seul `boono-v552-paper`, redémarrage de `config-server`, PM2 sauvegardé et endpoint authentifié vérifié.

Bilan à la bascule : **14 trades clôturés cumulés**, 11 historiques V551 + 3 V552 v1, equity réalisée **976,4501 USD**, nouvelle politique V552 cumulée **−12,2943 USD**, **SHORT en cours**. Il continue sous v1.1 avec son prix d'entrée/horodatage/MFE/MAE intacts. Aucune modification de V543 ni des processus BOONO-TV/Composer/vidéo.

V552 `boono-v552-paper` ONLINE, V551 STOPPED, V543 PAPER ONLINE, ticker 4×15 ONLINE, `config-server` ONLINE. Endpoint `/api/v552-paper` toujours protégé (HTTP 302 vers /login sans session), route testée avec simulation de requête authentifiée et contrat v1.1. **Rendu de la session navigateur utilisateur non directement contrôlé**.

## 6. Limites ouvertes

- Ce correctif réduit une cause démontrée de **churn à l'admission** et enlève une autorité de sortie inconditionnelle. Il ne prouve pas que V552 sait déjà identifier tous les bons moments pour protéger une position avant le Cross15 confirmé, ni préserver toutes les longues campagnes.
- Les variables de lieu et de volume sont encore principalement **descriptives** ; il ne faut pas prétendre mesurer les ordres agressifs / carnet L2 à partir du volume global.
- Une nouvelle politique plus conservatrice peut être **trop abstentionniste** (voir #6), ou maintenir excessivement des positions qui auraient dû être coupées. Le hard risk reste souverain.
- Faire une analyse prospective **par campagne**, incluant admis/refusés, manque à gagner, perte évitée, temps en position, restitutions du MFE, frais et polarités véritablement acceptées.
- Pas de nouveau moteur, pas de 46 000 SHADOWS, pas de disparition de l'historique V551/V552.

**Sources :** `modules/v552/{market-quality,decision,runner}.js`, `scripts/boonolab-v552-policy-v11-upgrade.js`, `tests/v552/market-quality-v11.test.js`, `data/v552-paper-{state,summary}.json`, `data/v552-paper-decisions.ndjson`, `data/audit-history.json`, `../data/mcb-live/mcb_15m.csv`, screenshot utilisateur du 19/11 13h16.
