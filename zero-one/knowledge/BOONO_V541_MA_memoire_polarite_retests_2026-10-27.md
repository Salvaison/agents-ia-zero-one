# BOONO Systems — V5.4.1 · Mémoire causale des MA et retests depuis polarité

**27 octobre 2026 · Amsterdam · PAPER 0 $**
**Statut du document : correctif du moteur V5.4.1 + observabilité ; le serveur reste l'autorité opérationnelle.**

## Mandat et origine

Le trade PAPER **#66 LONG** a montré la perte d'autorité d'un contrat MA connu depuis V5.3.1. Il était entré le 26/10 à **22h36min41s CET**, à **80 112,2 $ BTC**, malgré une MA3 (MA200 sur bougies 3m) à ~80 100,4 $ en **TEST_PENDING**. L'ancien module MA produisait **WAIT_3M_TEST_PENDING**, mais le noyau V5.4.1 n'en tenait pas compte lors de l'admission, car il s'appuyait sur une défense de prix précédente à 79 991,4 $. Ce n'est pas une absence de données.

La séquence LONG ne commence **pas** à 22h27 : l'étude complète en remontant plus tôt montre notamment :
- ~21h51min41s CET : cross3 vers LONG autour de LBW3 −69, MCB15 structurel LONG ; WAIT_ACTUAL_ACCEPTANCE_OR_RETEST.
- ~21h57 : E3 LONG disponible ; campagne 15m déjà LONG ; terrain de prix local encore non défendu selon le noyau.
- **22h03min11s** : MF REINFORCING, PM3 +112,8 $ et PM5 +122,4 $, prix ~79 954,4 $, mais toujours WAIT_ACTUAL_ACCEPTANCE_OR_RETEST ; MA3 éloignée (~80 112 $). Ce sont des éléments de la longue séquence citée par l'utilisateur dès ~21h45, et non une entrée prouvée sans risque.
- ~22h30 : retest de prix inférieur reconnu DEFENDED ; la synchronisation du nouveau cross3 reste ensuite insuffisante. ~22h34 MA3 REJECTED avec MF CONTESTED.
- 22h36 : MF REINFORCING, entrée PAPER ancienne ; MA3 TEST_PENDING.
- 22h49–22h51 : test réellement accepté puis nouvel échec au-dessus de MA3 ; LBW3 ~+70 n'est ni une certitude de rejet ni une direction stratégique.
- **22h59** : MA3 REJECTED, MF3 et MF15 adverses, territoire vendeur défendu. Ancien moteur : HOLD_V54_3M_RESPIRATION_NOT_EXIT ; clôture historique seulement à 23h30min42s, 79 938,6 $, **−4,7488 $ net**. La valeur de prix au point de replay 22h59 (~80 072,5 $) ne prouve pas une exécution réellement obtenable.

Cela distingue **l'opportunité possiblement manquée plus tôt** (problème d'identification de première défense / mémoire de campagne) du **problème concret MA d'entrée et de maintien**. La première question demande encore une étude prospective spécifique ; le correctif MA ne fabrique pas une admission rétroactive à 21h45.

## Implémentation

1. **Module pur** `modules/v5/ma-polarity-memory-v541.js` :
   - Bougies MCB 3m/15m **confirmées à l'instant de décision**, jamais une mèche Live future.
   - Une polarité AU-DESSUS / AU-DESSOUS est confirmée par **deux clôtures consécutives** au-delà de la zone de contact MA ; distinction entre première polarité observée dans l'historique et **véritable flip observé**.
   - Mémoire bornée de l'acceptation, du rejet de l'ancien camp, des tentatives de reconquête et des retests ; événements causaux horodatés, dernier rejet et dernière reconquête échouée. Le nombre de retests compte des **épisodes de contact séparés par une vraie sortie de zone**, et non chaque bougie au contact.
   - Le compteur se réinitialise au **changement de polarité confirmé**. Si l'origine du régime est antérieure à la couverture conservée, l'interface indique `≥ N / avant couverture`. Un comptage incomplet n'est pas présenté comme exact.
2. **Contrat MA** `modules/v5/ma-contract-v531.js` : `ma3.polarityMemory` et `ma15.polarityMemory` exposés avec leurs preuves, sans modifier les seuils historiques de contact/approche.
3. **Moteur actif** `modules/v5/decision-v541.js` :
   - Une admission nouvelle respecte un **MA3 TEST_PENDING / REJECTED** réellement identifié. Cela corrige le #66.
   - Une MA15 contestée reste informative lorsque MCB15 directeur LONG/SHORT dispose déjà d'une MA3 effectivement acceptée et d'une preuve causale concordante : le replay d'une bonne continuation à 16h00 ne devient pas un veto automatique.
   - Une position peut sortir si un **rejet MA3 après une acceptation connue depuis son entrée**, un **MF3 et MF15 simultanément adverses**, et une **défense du terrain par le camp opposé** convergent. MA3 seul, LBW3 extrême seul, PM seul, ou retest-count seul n'ont jamais autorité de sortie. Cela protège la *position* sans effacer automatiquement la campagne MCB15.
   - Hard risk −500 $ BTC et gain floors 120→90 / 220→180 restent indépendants, sans allègement.
4. **Observabilité** `modules/config-server.js` : polarité, nombre de retests et horodatage du flip MA3/MA15, rejet et reconquête échouée visibles dans **État vivant → LIEU**. `runner-v52.js` journalise les transitions MA dans le NDJSON existant, sans nouvel agent ni nouveau shadow.

### Séparation impérative

**`retestsSinceChange` est purement descriptif** : aucune règle d'admission, sortie, risque, requalification ou seuil n'utilise sa valeur. Un test d'invariance modifie artificiellement le compteur à 99 999 sans changer la décision. En revanche, le **fait causal d'un rejet MA confirmé** peut participer à une protection *avec* MF et défense du prix.

## Validation avant activation

- Replay figé `tests/v5/fixtures/v541-trade66-ma-asof-20261026.json` : respect des heures de disponibilité, pas de bougies ultérieures injectées.
- #66 à 22h36min41s : `WAIT_3M_TEST_PENDING` en nouvelle admission, pas de LONG tardif ; #66 à 22h59min50s **avec position historique supposée encore ouverte** : `EXIT_LONG / V541_CONFIRMED_MA3_FAILURE_WITH_MF_PRICE` en replay. Ces deux contrefactuels ne constituent pas une même chaîne de trades exécutés ni une statistique économique.
- Replays d'alignement V5.4.1 : 16h00 garde sa capacité de LONG avec MA3 acceptée ; 16h21 reste WAIT tardif ; 16h39 peut toujours requalifier un véritable retest défendu.
- Tests d'intégrité : événement futur inaccessible, compteur sans impact, rejet antérieur à l'entrée non recyclé, position héritée V5.4 avec sortie d'origine conservée.
- 238 tests V4/V5 lancés, 232 réussis, zéro échec et 6 anciens replays sautés par manque de données Audit historiques.

## Discipline opérationnelle

- Pas de reprise d'ancien V4.10.10 ou V5 shadow, pas de branche décisionnelle parallèle.
- Paper unique V5.4.1, comparateur V4.9.3 inchangé, code du ledger et ses frais non modifiés, aucun ordre broker financé.
- Ne pas mélanger les fichiers non committés `boono-tv/` à ce chantier.
- Sauvegarder le ledger et vérifier **FLAT avant redémarrage** ; si une nouvelle position s'ouvre entre temps, ne pas lui changer son contrat de sortie silencieusement.
- Les tests as-of vérifient la logique et non une amélioration de rentabilité : évaluer les prochains trades en PNL net et étudier les cas où un test MA est faussement classé rejet ou confirmation.

## Mise en service et vérifications réelles — 27 octobre 2026

- Sauvegardes pré-bascule du ledger, des décisions et des trades sous `/root/boono-v541-ma-memory-before-20261027/`, empreinte SHA256 du ledger confirmée identique à l'original au moment de la copie : `5cdcfaef0e6ba68a44200d5a4da4e51b0aa6c2fa574850afdc014894870c1a60`.
- Redémarrage ciblé du seul `boono-v541-paper` puis `config-server` vers **01h34 CET**, après pré-contrôle `FLAT`, `brokerOrdersEnabled=false`. PM2 `save` réalisé. Les collecteurs, `boono-v493-baseline`, BOONO-TV et X-Perp n'ont pas été redémarrés.
- Ledger de reprise conservé : **67 trades clos, equity PAPER 913,6891 USD**, aucun trade ouvert au lancement. Version comptable toujours `v5.4.1-paper-ledger-v0.8` ; aucune clôture fictive ni réécriture rétroactive des opérations.
- Nouveau relevé moteur : `DATA_OK`, décision actuelle `WAIT_MCB3_INSIDE_MCB15_CAMPAIGN`, mémoire `ma-polarity-memory-v1` accessible pour MA3 et MA15 dans `latestAnalysis`. Exemple de télémétrie à ce relevé : MA3 AU-DESSUS, 1 retest depuis flip ; MA15 AU-DESSOUS, 2 retests. **Ces valeurs changent au fil des bougies confirmées.**
- Connexion OKX rétablie avec confirmations d'abonnement public trades + tickers. Pas d'erreur nouvelle identifiée dans le court extrait PM2 post-redémarrage. L'interface authentifiée utilisateur n'a pas été vérifiée visuellement ; cet examen ne démontre pas une stabilité sur plusieurs jours.
- Limite : corriger l'intégration des MA ne suffit pas à prouver qu'une entrée antérieure à 22h36 était admissible ou rentable ; cette question exige une revue causale de l'apparition effective des territoires défendus plus tôt dans la campagne.
