# BOONO Systems — activation V4.9.4 / V5.4.2 et écoute temporelle

**27 octobre 2026 — Amsterdam (heure des événements de migration ~12h37–12h38 CET).**

## Décisions reprises

Le propriétaire valide quatre régimes d'attention : `DISCOVERY`, `CAMPAIGN_HOLD`, `REVERSAL_ATTENTION`, `TRANSFER_EXAMINATION`. V4.9.4 hérite de V4.9.3 figé (`cdf1936`) et reçoit une mémoire temporelle de changement de camp pendant une position. V5.4.2 hérite de V5.4.1 et ajoute une écoute sélective des preuves, avec **shadow de la véritable admission V4.9.3**. Le nombre de retests MA est purement informatif.

La divergence et l'action MF appartiennent à **une seule famille de preuve** ; la réponse du prix est une famille indépendante. La divergence à deux creux 15m (27 octobre, 04h15 et 05h30 CET) ne devient connaissable qu'après clôture de la seconde bougie (05h45 CET), avec statut `FORMING_SECOND_PIVOT` tant que le pivot n'est pas confirmé. Aucun futur n'est antidaté.

## Code créé

- `modules/attention/attention-memory.js` : mémoire as-of des événements distincts MCB/MF/PRICE/MA, falsifications, stages d'attention, aucun ordre ni autorité de risque.
- `modules/attention/evidence-adapters.js` : extraction des faits observés des deux moteurs et des extrema 15m ; priorité au précédent pivot de prix le plus significatif et provenance datée.
- `modules/attention/listening-v494.js` : V4.9.4 ouvre une **révision de sortie** lorsque le transfert est cohérent, mais laisse l'ordre original V4.9.3 inchangé dans la première phase d'observation.
- `modules/attention/v493-exact-shadow.js` : charge le vrai moteur V4.9.3 immuable dans son worktree ; recalcule une hypothèse `position=null` sur un snapshot horodaté indépendant ; filtre les bougies futures et les données Live dont la date d'observation n'est pas encore passée. L'évaluation ne possède aucun ledger ni capacité broker ; ce shadow est comparable au code V493, mais les Live filtrés peuvent différer d'une exécution originale non filtrée.
- `modules/v5/decision-v542.js` : conserve les actions V5.4.1, ajoute la couche d'attention et le shadow V493 sans autorité de trading ; une nouvelle position V5.4.2 est traitée par l'intégralité de la logique de sortie V5.4.1 et **ne bascule pas** accidentellement vers le contrat historique V5.4.
- `modules/v5/paper-v542.js`, `modules/v5/runner-v542.js` : migration additive du ledger et collecte native unique. Le shadow V493 fonctionne dans le runner existant à cadence ~30 s, indépendamment de la position V5.4.2 ; état persistant `data/v542-admission-shadow-state.json`.
- `modules/v5/baseline-v494-runner.js` : successeur PAPER indépendant de V493, même moteur d'origine, ledger versionné et phase temporelle persistante. **Aucun troisième moteur de trading** ; le vieux processus V493 est arrêté.
- `modules/config-server.js` : BOONO Watch lit les nouveaux ledgers ; État vivant présente l'attention et le shadow ; `/api/v493-archive` expose l'ancien résumé en lecture seule (sous authentification).

## Contrats strictement préservés

1. Ordres financés désactivés : `brokerOrdersEnabled=false` pour les deux PAPER. Moteurs V4.10.10 et V5 artefacts non réactivés.
2. V4.9.4 **admet et sort** selon le moteur V4.9.3 historique pendant cette première phase. L'écoute temporelle est active en observabilité, avec propositions mais sans nouveaux ordres. La règle `setup CONSUMED` est conservée.
3. V5.4.2 **admet, protège et sort** selon V5.4.1 dans cette première phase. Une décision V493 adverse en shadow ne provoque jamais de trade, de sortie ni de veto.
4. Le risque dur −500 $ de mouvement BTC, les protections +120→90 et +220→180 et la taille notionnelle de 1500 $ restent inchangés dans V5.
5. Aucune donnée de divergence MF n'est inventée à partir d'une pente. Un E3 isolé ne suffit jamais à quitter une campagne. MA distante n'est pas une frontière obligatoire ; compteur de retests sans impact décisionnel.
6. Les opérations presque neutres peuvent être évaluées comme **succès opérationnels**, distincts de la rentabilité nette comptable.

## Migration vérifiée

Avant le basculement, sauvegardes des deux ledgers et des journaux, vérifiées avec SHA256, sous `/root/boono-attention-pre-v494-v542-20261027/`.

**V4.9.3 → V4.9.4 :** ancien V493 stoppé alors que FLAT. Ledger original `v493-baseline-state.json` figé pour l'archive ; nouvelle copie `v494-paper-state.json` avec version `baseline-v494-attention-paper-v0.2`. Comptabilité conservée : **25 clôtures, 11 gagnants, equity 972,0419 $, net réalisé −27,9581 $**. Origine du code exécuté : `cdf1936`. Le nouveau PM2 s'appelle `boono-v494-paper`.

**V5.4.1 → V5.4.2 :** V541 stoppé ; même ledger historique `v52-paper-state.json`, migré vers `v5.4.2-paper-ledger-v0.9`. À l'instant exact du basculement : **74 clôtures, equity 901,6256 $, réalisé −98,3744 $, frais cumulés 111,7472 $**. Le LONG existant **79 927,7 $** (entrée version `v5.4.1-structural-e3-territory-paper-v1`) est conservé avec sa règle d'origine, sans clôture ni frais supplémentaires. Nouveau PM2 `boono-v542-paper`.

`config-server` redémarré après mise en ligne des deux moteurs, PM2 sauvegardé. V493 et V541 historiques arrêtés (pas de double PAPER actif). OVH/BOONO-TV et les collecteurs n'ont pas été redémarrés.

## Vérifications et limites

- Tests : **253 cas V4/V5/attention, 241 réussis, zéro échec, 12 anciens cas sautés** (sources Audit historiques absentes).
- Vérification ciblée du replay V541 16h00 (admission), de l'héritage de position V541 et des premiers flux V493 shadow ; tests négatifs de divergence trop tôt, MCB adverse isolé, preuve de prix antérieure à MF et prix falsifié.
- Premier état après activation : `V4.9.4 DATA_OK, DISCOVERY`; `V5.4.2 DATA_OK, REVERSAL_ATTENTION`, LONG hérité encore actif ; comparateur exact V493 `NO_TRADE` à son dernier snapshot, **sans autorité**.
- Connexion OKX publique trades/tickers confirmée. BOONO Watch port 80 en ligne, routes API protégées et renvoyant HTTP 302 sans session. Une validation visuelle authentifiée reste nécessaire.
- Les adaptations de stratégie qui changeraient réellement le timing V5 ou la date de sortie V4 sont **non activées** à ce stade : mesurer d'abord les occasions en shadow, reconstituer les replays positifs ET négatifs et l'impact net frais inclus. Ne pas attribuer de nouvelles performances aux versions avant des trades observés.
- Ne jamais restaurer un ancien ledger par écrasement si de nouveaux trades sont apparus depuis la migration : effectuer une réconciliation d'abord.

## Suites de contrôle

État d'attention affiché dans État vivant ; la proposition V493 en shadow est journalisée avec la provenance et l'âge réel du snapshot. Comparer les épisodes #17, #18, #20, #21, #23 de V4 aux #66–72 V5. Distinguer petites clôtures neutres, pertes évitées, retard d'entrée, sortie structurelle et durée de possession.

Document de passation technique. Amsterdam reste la réalité d'exécution ; GitHub est la mémoire versionnée.
