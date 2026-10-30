# V5.4.3 — Sans gain-floor, invalidation structurelle ET transfert adverse observé

**30 octobre 2026 · OD-20261030-010 · expérience prospective en shadow, non autoritaire.**
Demande exacte : [message conservé](operational-decisions/OD-20261030-010/01-demande-utilisateur-integrale.txt). Prompt d'exécution intégral et justification dans le même dossier. L'utilisateur demande explicitement d'essayer **sans gain-floor mais avec invalidation par le niveau structurel proposé et le transfert observé**. Ce mandat porte sur une expérience et non sur la promotion de la règle PAPER.

## Constat à l'origine

V5.4.3 PAPER détient le niveau `entryInvalidation` établi à l'entrée mais ne le traite pas comme stop autonome ; il impose le gain-floor 120→90 / 220→180 avant une sortie structurelle du moteur. Dans les premiers forks V543 du 30/10, `STRUCTURE_ONLY` a capturé #115 virtuellement à +7,64 $ net au lieu de −0,18 $, mais a dégradé #116 à −7,61 $ net au lieu de −0,04 $ et #113 à −1,45 $ au lieu de +0,18 $. L'étude doit discriminer ce qui est une respiration productive de ce qui devient une perte de maîtrise, sans conclure sur trois exemples.

## Nouvelle politique expérimentale

**Fork `STRUCTURAL_LEVEL_AND_TRANSFER`, shadow `v543-campaign-hold-shadow-v0.3`.** N'utilise **aucun** gain-floor (ni 120/90 ni 220/180) ; maintient la position virtuelle tant que la condition conjointe n'est pas reconnue. Niveau de référence : `entryInvalidation` et `invalidationReference` réellement mémorisés à l'entrée. Ce niveau ne recule jamais défavorablement ; pas de niveau Fibonacci substitué, pas de stop virtuel déplacé sans nouvelle preuve.

**Condition A — Niveau structurel réellement perdu :**
- à un tick frais, pénétration au-delà du buffer `max(12 $ BTC, 0,14 × range 3m médian)` **et** clôture 3m post-entrée confirmée et suffisamment adverse, connue à l'instant de la décision ; ou
- perte matériellement rapide `max(50 $ BTC, 0,7 × range 3m médian)` au-delà du niveau, en présence d'un transfert PM/MF indépendant déjà observé (voie d'urgence, sans attendre la clôture).
Ces buffers viennent de l'observateur shadow précédent OD-20261030-001 ; ils **ne deviennent pas des seuils PAPER**.

**Condition B — Transfert adverse réellement corroboré :** PM3 et PM Live adverses **ensemble** + MF3 adverse ; **OU** défense du prix par le camp opposé + MF3 et MF15 adverses. Le prix/PM et MF sont des familles différentes ; E3 adverse isolé, mèche, fatigue d'un indicateur ou `REVERSAL_ATTENTION` ne suffisent pas. Le transfert valide une sortie **de la position**, pas forcément un E15 opposé confirmé. Les attributs du transfert sont horodatés et inspectables dans `lastInvalidation` / les événements de shadow.

**Condition d'EXIT spécifique :** `A ET B`, ou **hard-risk −500 $ BTC** sur tick frais (garde-fou inchangé). Une décision V541 `EXIT` qui ne satisfait pas la condition conjointe est observée comme contradiction, mais ne ferme pas ce fork. Il s'agit d'un choix de test qui peut être dangereux économiquement ; il reste strictement virtuel.

## Comparateurs inchangés

- `STRUCTURE_ONLY` : EXIT V541 ou hard-risk, sans floor.
- `EARLY_INVALIDATION` : invalidation précoce avec une preuve adverse plus permissive, sans floor.
- `TERRITORY_FLOOR_120` : floor 120/90 conservé, niveau de territoire confirmé à la place du 220/180.
- `BASELINE_PLUS_FAST_INVALIDATION` : floors 120/90 et 220/180 conservés, invalidation anticipée.

Les cinq forks partent des véritables **nouvelles entrées** PAPER V543, sans modifier ces entrées. Le nouveau fork est créé vide lors de la migration v0.2→v0.3 : **aucune rétroactivité ni P&L inventé**. Chaque fork refuse une nouvelle entrée PAPER si son portefeuille virtuel a encore une position ouverte ; cette réentrée bloquée est dénombrée, et non comptée comme opportunité gagnante fictive.

## Mesures et données

Unité économique : notionnel papier 1500 $, taker 0,05 % par côté ; P&L net de frais à partir du prix effectivement observé par le shadow et non un fill garanti. À mesurer **par campagne E15 et par position** : nombre de trades, frais, net réalisé, net provisoire des positions virtuelles ouvertes, MFE/MAE prix BTC, giveback, drawdown, durée, perte de l'invalidation, famille du transfert, conflits avec V541, entrées bloquées et mouvements ratés. Attention aux forks dont une position reste ouverte : leurs résultats réalisés ne sont pas directement comparables sans l'exposition restante et les réentrées refusées.

Traces sur Amsterdam : `data/v543-campaign-hold-shadow-state.json`, `-summary.json`, `-events.ndjson`, `-ticks.ndjson` (plus segments rotatifs). `brokerOrdersEnabled=false`, `decisionImpact=false`. Le service PM2 s'appelle `boono-v543-hold-shadow`.

## Contrôles et limites

Implémentation : `modules/v5/structural-transfer-observer.js`, ajout d'une cinquième variante et migration dans `modules/v5/campaign-hold-shadow.js`. Aucun appel de courtier, aucune modification de `paper-v543.js`, `decision-v543.js`, V494 ou de leurs ledgers.

Tests positifs et négatifs : **23/23 tests ciblés réussis**, incluant veto sur mèche, niveau seul sans transfert, PM seul, clôture 3m après entrée, vitesse d'urgence, LONG/SHORT, absence de floor, contradictoire V541, hard-risk, frais, stale et migration. Suite `node --test tests/v5/*.test.js` : **239 total, 227 réussis, 12 ignorés, 0 échec**.

**Performance de ce cinquième fork : non encore démontrée.** Le premier bilan doit attendre de vraies clôtures virtuelles ; des résultats rétrospectifs du vieux `STRUCTURE_ONLY` ne sont pas attribuables au nouveau. Le suivi devra inclure des contre-exemples et le coût complet d'exposition, et ne pourra promouvoir un changement PAPER qu'après décision distincte validée et testée.

## Statuts de gouvernance

- **[AUTORISÉ]** Essai expérimental en shadow sur V543, demande intégrale archivée sous OD-20261030-010.
- **[IMPLÉMENTÉ]** Cinquième fork, module de transfert, migration sans perte des quatre forks, tests.
- **[TESTÉ]** 23 tests ciblés + régression V5 ci-dessus.
- **[MISE EN SERVICE SHADOW]** Vérification PM2 et fichier résumé séparément dans les événements OD.
- **[NON AUTORISÉ]** Suppression des gain-floors sur le moteur PAPER ; modification des brokers, stop financé ou changement V494.
