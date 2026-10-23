# BOONO Systems — Cas V5 de synchronisation : la reprise contestée après la grande chute

**Observation arrêtée le 23 octobre 2026 vers 11h18–11h21 (Europe/Stockholm/Paris).**
**STATUT : cas d'étude empirique — ni signal de trading, ni validation de V5.**
**V5 trading PAPER toujours suspendu ; V4 non modifié.**

## I. Hypothèse humaine à éprouver

L'utilisateur suit une descente depuis ~84 800 $ jusqu'au bas du grand range, puis une inversion **en gestation depuis le 22/10 vers 19h** : triple multidivergence 15m observée visuellement, succession de plusieurs E15 UP et de nombreux E3 UP, MF15 en récupération. Malgré cela le prix a eu du mal à transformer les attaques haussières en hausse durable ; il consolide/comprime sous la MA200 descendante. Une résolution de cette compression est attendue, **sans direction prédite**.

Sources utilisateur : captures TradingView **15m vers 10h55** et **1h vers 11h15** du 23/10 (correction explicite apportée par l'utilisateur), qui montrent notamment le prix vers 81 765 $, la MA200 rouge vers 82 227 $, niveau affiché D ~81 209 et W ~82 925. Les valeurs de niveaux sont celles visibles sur les captures, pas des ordres automatiques. L'utilisateur a observé un **E1 Live UP provisoire sur le 1h**, et non un E4 Live UP. Les valeurs 4h issues du CSV Amsterdam sont des éléments de contexte distincts ; elles ne doivent pas être présentées comme une vérification ou contradiction de ce signal 1h.

## II. Données historiques observées, horodatage local

Source Amsterdam : `data/audit-history.json` (prix/MF/PM Live ~30s), `data/elastic-observer-events.ndjson` (E3/E15 et BW/LBW, source vs observedAt) et MCB CSV 15m/4h, vérifiés autour de 11h19.

| Fenêtre | Minimum et maximum prix Audit BTC | Mouvement / MF |
|---|---|---|
| 22/10 18h–21h | **80 908,4–81 719,4 $** | La baisse produit encore un nouveau bas ; MF15 très négatif autour de −38 |
| 22/10 20h30 → 23/10 04h | ~81 095–81 713 $ | Récupération progressive MF15 ~−39 → −17, oscillations du prix |
| 23/10 04h–09h | ~81 222–81 997 $ | MF15 ~−18 → +1,8 ; hausses réelles mais non encore acceptées au-dessus des résistances de range |
| 23/10 09h–11h15 | ~81 515–81 887 $ | Compression/rejets ; MF15 ~+1,4 → +5,3, prix final ~81 760 |

**Événements** : entre le 22/10 18h et le 23/10 11h18, Elastic journalise **10 sources E15 Live UP distinctes** et environ **28 sources E3 UP Live distinctes**, en plus des phases interrompues/superseded/confirmées. ATTENTION : compter chaque source ou retransmission comme une campagne serait une erreur ; la phrase humaine « quatre tentatives E15 UP » correspond à un regroupement **qualitatif** d'attaques visibles que nous devons encore définir, pas simplement au compte de chaque événement `OBSERVED`.

Quelques jalons d'E15 UP enregistrés (parmi davantage de sources ; ces signaux décrivent un événement, non la direction structurelle E15→E15) :
- 22/10 **19h20** : E15 UP Live source 19h15 à prix ~81 382 $, LBW ~−69,9 ; confirmation vers 19h30 autour de ~81 309 $, sans contrôle du prix.
- 22/10 **20h20** : nouvel E15 UP Live source 20h15 à ~81 196 $, LBW ~−68,6 ; confirmation ~20h30 prix ~81 145 $, autre tentative avec peu de suivi haussier durable immédiat.
- 23/10 **04h21** : E15 UP Live source 04h15 à ~81 449 $, LBW +15,6 ; confirmation ~04h30 à ~81 684 $ : reprise plus productive localement.
- 23/10 **05h45** : E15 UP Live source 05h45 à ~81 910 $, LBW +65,6 ; confirmation vers 06h00 au prix ~81 816 $, qui montre déjà une respiration.
- 23/10 **07h15** : E15 UP Live à ~81 819 $ mais interrompu ~07h26 avec prix ~81 630 $.
- 23/10 **07h45** : E15 UP Live, confirmé ~08h00 au prix ~81 780 $ ; une autre tentative.
- 23/10 **10h15** : E15 UP Live avec LBW encore négatif ~−14 ; confirmation ~10h31, sans que cela signifie nécessairement acceptation de la tendance longue.

**Donnée de contexte 4h indépendante de la deuxième capture (qui est en 1h)** : bougie confirmée 23/10 06h locale : LBW4h ~−25,1 et MF4h ~−1,91 ; la bougie provisoire démarrant vers **10h locale** dans le CSV d'Amsterdam restait LBW4h ~−27,4 / MF ~−2,88 lors de la première vérification. Le signal rapporté par l'utilisateur est **E1 Live UP sur le 1h**, qui nécessite sa propre vérification horodatée, et non E4 Live.

**À 11h19 locale**, AUDIT ~81 773 $, LBW15 Live +5,65, BW15 +4,71, MF15 Live +6,43 et pente MF15 +1,21 ; E15 Live UP présent, **MCB3** LBW Live +2,95, BW −2,57, MF3 −5,63, PM Live −12,9 $. Le 3m respirait donc déjà contre la reprise MF15. Une lecture purement simultanée aurait donné des conclusions contradictoires : c'est une raison de maintenir une histoire de campagne plutôt que de voter sur les signaux.

## III. Interprétation causale PROVISOIRE

**Campagne parente** : ancienne impulsion SHORT à forte extension, ayant parcouru une large portion du grand range. Le fait qu'une structure 15m ou 3m puisse repartir LONG n'invalide pas d'un coup cette réalité lente.

**Phénomène candidat** : `POST_DROP_REVERSAL_ATTEMPT / REPEATED_UP_ATTACKS`. Plusieurs sous-attaques E15 UP et E3 UP ont souvent échoué à conserver leurs gains. Le prix forme des déplacements opposés et une compression tandis que le MF15 se rétablit.

**Relations pertinentes** (non des points à additionner) :
- proximité du bas de range / niveaux puis tentative adverse ;
- E15 UP à LBW encore très négatif = réaction de retournement tactique sous campagne lente, pas une preuve d'acceptation ;
- E3 UP successifs = enfants de tentatives parentes, leur premier échec change le contexte du suivant ;
- MF15 récupère pendant que le prix peine = décorrélation productive à qualifier, pas nécessairement « divergence confirmée » sans pivots causaux vérifiés ;
- E1 Live UP observé par l'utilisateur = *observation 1h encore provisoire*, pas pivot confirmé ni renversement acquis ;
- prix = critère du territoire gagné, perdu ou conservé ; PM Live = effort/rendement de la traduction immédiate, pas autorité directionnelle autonome.

**Ce qui permettrait de qualifier la résolution** : cassure puis **acceptation/retest et conservation** de la borne haute (localement zone ~82 000–82 230 $ et MA200 sur les captures) vs cassure baissière puis acceptation sous le support inférieur (zones à confirmer par les niveaux instrumentés). Ne pas prédire direction, amplitude ou heure à partir de la seule compression.

## IV. Premier modèle de langage d'événements à greffer à MCB

L'objet principal ne serait pas une simple nouvelle classe LONG/SHORT, mais une structure persistante :
`hypothesis_id`, `parentCampaignId`, `rangeBounds/source`, `slowTrajectory`, `activeAttackId`, `eventSourceTimes`, `eventObservedTimes`, `counterAttempts`, `mfEvolution`, `priceTerritoryRetained`, `unresolvedContradictions`, `invalidationObservations`.

Schéma descriptif proposé :

```text
MAJOR_DROP_EXTENDED
  └─ RANGE_LOW_TESTED
      └─ COUNTER_ATTACK_UP(E15/E3, mf recovering)
          ├─ FAIL_TO_RETAIN_PRICE -> remember attempt, parent still SHORT
          ├─ RETAIN_PARTIAL_TERRITORY -> REVERSAL_BUILDING
          └─ REATTACK_UP(...)
               ├─ RANGE_REJECTION -> COMPRESSION/UNRESOLVED
               └─ ACCEPTANCE_BEYOND_LEVEL -> REVERSAL_ACCEPTED candidate
```

Les mots désignent des **relations hypothétiques** dont les critères de rattachement restent à apprendre du réel ; **ce n'est pas une machine d'admission prête à trader**. Ne pas exiger « exactement quatre E15 » ni « un second E3 » ; ce sont des séquences observées qui peuvent varier.

## V. Séparation entre deux sujets opérationnels

Le paper trading V5 reste **stoppé** depuis l'audit du 23/10 ; cette étude ne le rallume pas.

**Incident V4 indépendant, découvert en lecture seule pendant l'étude** : l'état V4 `trade-sim-v4-state.json` n'avait plus été mis à jour depuis ~10h57 locale, tandis que l'AUDIT progressait vers 11h21. V4 avait une position LONG papier ouverte et les logs rapportaient :
`[V4][HARD_GAIN_GUARD_ERROR] RangeError: Invalid string length` dans `recordExit → appendCapped → JSON.stringify`. Le dernier `DATA_OK` de V4 peut donc être **périmé** ; ne pas confondre le processus PM2 « online » avec un moteur de décision sain. Ce dossier nécessite un examen de cohérence des écritures/archives et de la sécurité du papier V4 **distinct de la construction du langage causal V5**. Aucune correction V4 effectuée dans cette étude.

## VI. Correction de cadre — 1h E1 Live et enjeux structurels range / value area

**Rectification de l'utilisateur :** la deuxième capture, initialement désignée 4h, est une **capture 1h avec E1 Live UP**. Le recul 1h éclaire l'effort et les effets de balancier de la tentative de retournement, sans démontrer à lui seul son succès. Les mesures du CSV 4h citées plus haut restent du contexte indépendant, et non une réfutation du signal 1h.

**Nouvelle priorité conceptuelle validée pour la recherche V5 :** MCB définit d'abord le **lieu et l'enjeu du prix** (trajet E15→E15, campagne, gamme de niveaux, bords du grand range et zone de valeur). Ce n'est qu'après qu'Elastic peut interpréter les tentatives E3/E15, MF, croisements, réponses du prix, et éventuellement conversion/QUALITÉ. Une conversion haussière au bas du range, à proximité du POC ou sous la VAH n'a pas le même sens économique.

Niveaux sauvegardés dans `data/levels.json` sur Amsterdam, modification du 23/10 09h48 locale : **VAL Daily 82 035 $, POC Daily 83 876 $, VAH Daily 85 498 $**. Avec ~81 765 $ sur la capture, le prix était **sous le VAL Daily**. Ces repères sont des niveaux enregistrés dans l'interface (pas un calcul actualisé ici d'un profil d'échanges). Il ne faut **pas confondre les limites du grand range et les limites de la zone de valeur Daily**.

La question pour le moteur n'est pas seulement LONG/SHORT, mais **quel scénario structurel le combat défend** :
- `BELOW_VALUE / RECLAIM_ATTEMPT` : les acheteurs tentent de réintégrer le VAL Daily (~82 035 $), puis démontrent ou non la conservation du prix au-dessus lors des contre-attaques. Même si réussi, le POC Daily (~83 876 $), puis la VAH (~85 498 $), ne sont que des étapes/hypothèses successives conditionnées par l'acceptation ; ce ne sont pas des prix-cibles garantis.
- `REJECTED_RECLAIM / LOWER_LEVEL_TEST` : rejet de la réintégration ou perte des supports de compression, ouvrant l'hypothèse de revisiter des niveaux inférieurs vérifiés. Ne pas déclarer une sortie du **grand range** sur la seule base d'un cours sous le VAL.
- `COMPRESSION_UNRESOLVED` : plusieurs E15 UP/E3 UP et récupération MF sans traversée/rétention durable d'une frontière. Observer si chaque attaque échoue au même niveau, gagne du terrain ou déplace la borne d'acceptation.

**Contrat proposé :** pour chaque événement MCB/Elastic, relier `rangeId`, `valueAreaState`, `priceStructuralLocation`, `boundaryTest`, `priceRetention`, `parentE15Trajectory`, `E3AttemptId`, `MFHistory`, `proposedPath`, `invalidation`. La conversion et sa QUALITÉ **ne doivent pas redéfinir ce lieu** ; elles qualifient l'effort et la traduction du scénario structurel dans le prix. Une explication du moteur doit nommer **ce qui est disputé**, puis **qui progresse** et **quelles frontières ont été acceptées ou rejetées**.

Ceci est une **spécification conceptuelle d'enquête**, pas une implémentation ni une nouvelle autorité de trading. V5 PAPER reste arrêté, et aucun paramètre V4 n'a été changé dans cet addendum.
