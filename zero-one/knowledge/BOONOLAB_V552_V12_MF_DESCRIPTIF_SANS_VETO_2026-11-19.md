# BOONOLAB — V552 v1.2 : MF15/MF3 deviennent descriptifs, sans veto ni permission décisionnelle

**Date : 19 novembre 2026, CET.**  
**Statut : DÉCISION UTILISATEUR → IMPLÉMENTÉ → TESTÉ → MIS EN SERVICE dans l'UNIQUE V552 PAPER.**  
**Mandat :** « Surtout ce n'est pas cohérent, MF n'a pas une autorité sur le reste, d'ailleurs autant il n'est pas rare qu'il soit justement à contre courant, parfois un signal précurseur à la hausse comme à la baisse. C'est à corriger. »

## 1. Erreur de conception corrigée

L'audit du SHORT manqué 19/11 à 15h54–15h55 a constaté dans `modules/v552/market-quality.js` : `mfAligned = flowLevel > 0 && flow15 > 0` avec `flowLevel = MF15.signé` et `flow15 = penteMF15.signée`. Dans un marché précédemment contesté, `!mfAligned` déclenchait `deferNewEntry`, quel que soit le comportement MCB3/BW15/LBW15/prix/PM. Ce filtre a bloqué le SHORT malgré une pente MF15 déjà baissière parce que MF15 Live était encore au-dessus de zéro. **Ce veto était contraire au contrat causal défini par l'utilisateur.**

D'autres autorités MF étaient présentes : `qualify` exigeait parfois MF3/MF15 aligné, `ownMemoryStep` permettait à MF d'autoriser un changement de parent, `positionReview` exigeait une confirmation MF15 pour protéger ou maintenir, et `vigilance` combinait formellement MF aux preuves de contre-attaque.

**Contrat v1.2 :** MCB3 est le premier indicateur tactique ; BW15/LBW15/E15 jugent la campagne et son évolution ; **le prix réellement produit, conservé et PM Live qualifient la traduction** ; MF15/MF3 sont une lecture explicative, parfois confirmative, parfois contradictoire ou précurseuse, sans pouvoir seuls ouvrir, bloquer, maintenir ou fermer une position. Aucune règle « MF15 doit franchir zéro avant un SHORT/LONG ». Le niveau absolu et la pente peuvent être opposés pendant un transfert de force.

## 2. Changements de décision dans le même moteur V552

**Politique nouvelle : `v5.5.2-lbw15-live-vigilance-campaign-paper-v1.2` ; ledger inchangé `v5.5.2-paper-ledger-v1`.**

- `modules/v552/market-quality.js` : `flowLevel`, `flow15`, `flow3` et `mfReading` restent diagnostiques. Les catégories `MF15_SLOPE_LEADS_AGAINST_LEVEL` et `MF15_SLOPE_WARNINGS_BEFORE_LEVEL_CROSS` matérialisent le décalage niveau/pente. **Aucune condition sur le signe de MF n'entre dans `priceEvidence`, `transitionProved` ni `deferNewEntry`.**
- En polarité 15m historiquement contestée, la nouvelle entrée exige toujours des preuves MCB/prix/PM : réponse du prix depuis le Cross15, défense/reprise ou sortie des bornes 1h, cohérence MCB3 et pente/gap 15m, progression depuis le Cross3 et non recyclage d'un déplacement déjà accompli. L'exigence de déplacement permettant de couvrir le coût estimé d'un aller-retour PAPER est dérivée des **frais réels du modèle** (2 × taker 0,05 % = 0,1 % du prix BTC), **pas un nouveau seuil MF** ni une minuterie arbitraire. Le hard risk 500 BTC$ demeure séparé.
- `modules/v552/decision.js#qualify` : ni `mf15>0` ni `mf3>0` ne détermine l'admission, y compris lorsque BW15/LBW15 sont horizontaux. MCB3, MCB15, prix conservé et PM Live/marginale qualifient. MF reste dans `qualification` comme contexte `MF15_..._MF3_..._DESCRIPTIVE_NO_VETO`.
- `decision.js#ownMemoryStep` : un transfert E15/MCB15 est classé par vague clôturée/Live, **prix** et **PM Live**, MF15/MF3 n'est plus vote directionnel.
- `modules/v552/vigilance.js` : `counterConvinces` est fondé sur le Cross15 Live, contre-croisement MCB3, prix déplacé, éloignement BW/LBW15 et PM adverse productive ; MF demeure enregistré sous `mfAuthority:DESCRIPTIVE_ONLY`.
- `decision.js#positionReview` : la protection anticipée demande une contre-attaque structurelle **requalifiée après une respiration** et un risque de restitution d'un bénéfice économique réel, **pas la permission de MF15**. Le Cross15 opposé confirmé peut encore demander une sortie locale, mais le maintien d'une position soutenue par le parent et le prix conservé est possible même avec MF15 opposé. L'ancienne condition numérique MF n'est plus gouvernante ; les mesures MF sont conservées dans la justification. Le plafond adverse PAPER de 500$ BTC reste souverain.
- `modules/config-server.js` : contrat API authentifié mis à jour à v1.2 ; la ligne Watch `MARCHÉ / ADMISSION` expose **MF15 descriptif** plutôt que « MF15 aligné » comme autorité. **BOONO-TV continue de recevoir le vrai ledger V552**, sans modifier la scène OVH, le Composer, les vidéos ni le moteur V543.

## 3. Contrôles causaux et comparaison

**102 tests étendus PASS, 0 FAIL**, dont 7 nouveaux dans `tests/v552/mf-descriptive-no-authority-v12.test.js` :
- As-of **19/11 15h55m14s CET**, prix Bâton ~63 624,6 BTC$, MCB3 SHORT, Cross15 DN Live, `PM3` et `PM Live` favorables au SHORT, MF15 Live **+19,10** (niveau encore positif) et pente MF15/10m **−1,10**. Le sélecteur pur donne `ENTER_SHORT` même si les signes MF15/MF3 sont inversés, ou si leurs mesures sont temporairement indisponibles. **C'est une proposition diagnostique, PAS un fill historique effectivement pris.**
- Les trades hachés **#14 LONG** et **#15 SHORT** de la séquence précédente restent `WAIT` dans cette relecture, pour manque de progression/acceptation structurelle post-Cross15 et déplacement insuffisant au regard des frais, **sans utiliser MF comme veto**.
- Le SHORT gagnant **#2** demeure admissible avec MF15/MF3 inversés.
- Position LONG structurée et protégée : un MF totalement contraire ne peut ni empêcher à lui seul un `HOLD`, ni empêcher un `EXIT` si les preuves MCB/prix/PM et le risque le justifient.
- Tests de régression V552/V551/V55, Watch et BOONO-TV, hard risk 500 BTC$, isolation PAPER, versions et reprise de position passés.
- **Réserve** : les sorties anticipées restent délicates. Une relecture as-of de l'ancien LONG #4 produit un signal de protection vers **01h20 CET**, alors que le mouvement aurait ensuite repris avant le vrai renversement 02h15. Cette heuristique n'est pas une stratégie de sortie validée. Le LONG gagnant #6 était déjà différé par les règles structurelles v1.1, et reste à comparer : **le retrait du veto MF ne résout pas chaque refus d'entrée**. Ne pas extrapoler une amélioration du P&L sans replay des positions/réentrées et observations prospectives.

## 4. Migration exacte et santé des services

- Le 19/11 vers **18h30 CET**, `boono-v552-paper` a été **arrêté avant la migration**. Préflight lecture seule du ledger, puis exécution unique de `scripts/boonolab-v552-policy-v12-upgrade.js` exigeant le V551 arrêté, source figée et archivage SHA-256. Snapshot : `/root/boonolab-archives/V552_V1_1_TO_V1_2_2026-11-19T17-30-58-543Z/`. Backup de code v1.1 : `/root/boonolab-archives/V552_V12_SOURCE_BEFORE_20261119T173057Z/`.
- **Aucun transfert de capital nouveau, aucune fermeture fictive.** Migration conserve `startedAt`, historique, clés consommées, frais, gains/pertes, position ouverte (y compris ancien `entryPolicyVersion`, MFE/MAE), mémoire de campagne, lineage V551 et référence v1.1 `policyHistory`.
- Avant et juste après la bascule : **15 clôtures cumulées**, equity réalisée **970,2430 $**, position **LONG ouverte**, même `entryAt=1795109117754`. Les nouveaux résultats futurs doivent être identifiés par `policyVersion=v1.2` ; les anciens `entryPolicyVersion` et `exitPolicyVersion` restent inchangés.
- Processus après vérification : `boono-v552-paper`, `boono-v543-paper`, `config-server`, `boono-tv`, `boono-ticker4x15-shadow` ONLINE ; `boono-v551-paper` STOPPED.
- Watch HTTP 80 : **302 → /login** sans session, preuve du routage protégé ; premier test immédiat après restart a échoué temporairement avant l'écoute du port 80, **réessayé avec succès** (service écoute bien sur port 80).
- Source BOONO-TV OVH : `engine552.status=DATA_RECENT`, `policyVersion` v1.2, compte/simulation V552 identifiés, `boono-studio` et `boono-radio` ACTIVE. Aucun redéploiement OVH nécessaire : la scène exploite déjà la version de politique exposée par Amsterdam.

**Statut exact : règle MF sans autorité décisionnelle = IMPLÉMENTÉE/TESTÉE/MISE EN SERVICE. P&L économique des futurs signaux = NON VALIDÉ.**
