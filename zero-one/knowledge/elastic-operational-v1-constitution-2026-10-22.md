# BOONO Systems — Constitution proposée : Elastic opérationnel V1
**22 octobre 2026 — spécification de transition, sans activation trading**
**Statut : conception à éprouver par replay avant autorisation d'admission.**
**Principes de l'utilisateur ; formalisation technique par IA.**

## I. Diagnostic établi sur Amsterdam
- 155 trades clôturés, 63 à frais modélisés ; cohorte nette 63 : brut +43,38 $, frais -94,51 $, net -51,13 $. Onze dernières clôtures : 0 victoire, net -33,86 $, 9 sorties EXECUTION_FAILURE, 10 MFE <120 $.
- #151, #152, #153, #154, #155 : SHORT_FORMING, impulsion PM récente utilisée comme preuve exécutable, puis sortie EXECUTION_FAILURE. En particulier #152 short pendant contexte prix 30m LONG et E15 UP Live ; #155 court après mouvement vendeur largement consommé.
- Le 22/10 03:30–03:35 : E3 DN Live/confirmed + BW/LBW-cross3, PM3 et PM5 très vendeurs, E15 DN Live + BW/LBW-cross15, MF15 basculant, prix productif. Pas de trade. Confirmation E15 après une baisse substantielle.
- Le croisement BW/LBW et VWAP MCB à zéro sont la **même famille d'événement géométrique**, non deux votes indépendants.
- Les décisions/évaluations V4 tournent à 32 Mio ×16 segments mais chaque record est surdimensionné : couverture observée seulement ~43–50 minutes, PAS 48h. Elastic events persistent depuis 21/10 17h25, sans trace des décisions antérieures.
- L'interface /api/trades relit et parse environ 264 Mo d'historique et un état ~11,5 Mo chaque 30 s ; latences importantes plausibles. Les classes Elastic changent entre deux snapshots via seuils glissants ; plusieurs événements peuvent provenir d'une seule évaluation.

## II. Les autorités et leurs limites
1. **MCB15 (E15 à E15)** = origine et maintien de la thèse/campagne structurelle ; prix et niveaux en sont le contexte de localisation. Ne pas rendre la 1h veto permanent à elle seule.
2. **MCB3 (E3 à E3)** = étapes tactiques et mémoire des respirations ; le 3m n'annule pas seul une structure 15m établie.
3. **PM Live** = premier juge de conversion effective d'une hypothèse, puis PM depuis setup/PM3/PM5, rendement et prix conservé évaluent sa maturité ; une poussée PM ponctuelle n'autorise pas une entrée tardive à elle seule.
4. **MF** = mémoire de transfert et de persistance, calibrée par son horizon ; **prix** = territoire gagné/conservé. **Ticker** qualifie l'intensité, jamais dernier veto absolu.
5. **MA/range/Fib/niveaux** = localisation et coût opportunité ; `WHERE` n'est pas un veto isolé ; R/R économique et proximité d'extrêmes restent visibles.
6. **Risk** = protecteur indépendant ; EXIT_RISK 500 $, protections 120/90→220/180, gestion TP1/runner, frais restent intacts dans V1.

## III. Mémoire minimale par campagne
`campaignId` = MCB15 pair structurelle + direction + pivot causal. **Une seule campagne dominante par horizon**, opposition structurée possible sans deuxième vérité simultanée.
Champs :
- `bias`: LONG/SHORT/TRANSITION ; `authority`: MCB15_CONFIRMED/MCB15_LIVE_TRANSITION ;
- `startAt, observedAt, sourceTs, pivotE15StartTs, lastE15Ts, lastConfirmedE3Ts, currentE3CycleId` ;
- `priceAnchor, priceExtreme, structuralInvalidation, boundaryAhead, availableRoomAfterFees` ;
- `priceRetention15m/30m`, `MF15 change/reference`, `PM direction/phase`;
- `counterE3Attempts[]` avec `firstAttempt, outcome, retainedTerritory, secondAttempt`, lien parent ;
- `signalledEvents` indexé par famille+TF : activation, maturité, suspension, remplacement (pas de double comptage) ;
- `lastDecision`, `entryWindow` et motif causal localisé.

## IV. Machine d'état proposée
### Campagne MCB15
`STRUCTURAL_BIAS → CONTESTED → TRANSITION_LIVE → ACCEPTED_REVERSAL` ou `BIAS_RETAINED`.
Une respiration E3 opposée (`COUNTER_TEST_1`) n'invalide pas la campagne 15m. Si elle échoue puis un nouveau E3 opposé apparaît (`COUNTER_TEST_2`), mémoriser que c'est une nouvelle tentative contre la **même campagne**, non un setup totalement neuf. Cette seconde tentative **peut** favoriser un renversement, mais aucun nombre d'E3 ne garantit automatiquement ce renversement ; exige effort/conversion/terrain/structure.

### Conversion (une qualité instantanée dans chaque état persistant)
`UNPROVEN → INITIATING → PRODUCTIVE → RETAINING → BREATHING → REACCELERATING` ou `EXHAUSTING → INVALIDATED`.
- `INITIATING` : structure E3 ou E15 Live récente et PM Live cohérent.
- `PRODUCTIVE` : rendement par effort + prix effectif suffisamment positif.
- `RETAINING` : terrain gardé après première respiration et opposition faible.
- `BREATHING` : E3 inverse, PM Live contraire mais MCB15/campagne encore valide.
- `REACCELERATING` : nouveau E3 cohérent après respiration, PM Live se remet dans le sens, meilleur rendement.
- `EXHAUSTING` : effort renouvelé mais rendement marginal se dégrade, dernière impulsion largement développée, terrain acquis contesté.
- `INVALIDATED` : le camp structurel/territoire est effectivement perdu, à comparer au biais d'horizon plus long.

`SILENT, INEFFICIENT, PRODUCTIVE, EASY, POWERFUL, EXCEPTIONAL, CONTESTED, ABSORBED, EXHAUSTED` sont les **attributs** d'un épisode, pas neuf campagnes. Requalifier avec mémoire/hystérésis et loguer la vraie transition, pas chaque variation de ratio P75.

## V. Fenêtre d'entrée, sans séquence imposée
`NO_WINDOW → CANDIDATE → OPEN_EARLY → OPEN_VALID → LATE → EXPIRED`.
Événements observables pouvant arriver dans n'importe quel ordre :
`BW_LBW_CROSS_3`, `E3_LIVE`, `E3_CONFIRMED`, `MF3`, `PM_LIVE_PRODUCTIVE`, `BW_LBW_CROSS_15`, `E15_LIVE`, `E15_CONFIRMED`.
Réduire les familles corrélées à une preuve par famille/TF, avec les sous-événements horodatés. La confirmation E15 est **une information de maturité** : elle peut être trop tardive comme exigence obligatoire pour entrée.
Lorsque BIAS_LONG établi : micro-SHORT = respiration par défaut ; une transition SHORT n'est admise que si la structure, la conversion et l'acceptation du nouveau camp convergent. Règle symétrique en BIAS_SHORT. Pas de veto aveugle de la 1h seule.
Ne pas conclure « toute impulsion gagnante appelle nécessairement une impulsion inverse » : une respiration est fréquente mais une continuation unidirectionnelle demeure possible. La mémoire doit distinguer pause et inversion.
**Fenêtre LATE** : pas un seuil arbitraire de « 120/220/325 $ déjà consommés » ; évaluer l'âge du cycle E3, le rendement marginal, la position MCB et les bornes de prix, PM conversion restante, asymétrie risque/profit nette de frais.

## VI. Anti-churns : migration avec filet de sécurité
Inspecter et comparer les règles actuelles :
- `THESIS_CONSUMED_WAIT_MCB_CHANGE` / `setupKey` ;
- `CAMPAIGN_RETRY_NEEDS_NEW_15M_OR_LOCAL_REQUALIFICATION` et ses remises à zéro ;
- `SETUP_LATE_CLOSES_ENTRY_WINDOW`, blocage `UP_REINFORCED_3M_CLOSES_SHORT_ENTRY_WINDOW` ;
- `WAIT_3M_15M_SYNC` et filtres temporels de MF ;
- divers garde-fous d'admission conditionnels.
Remplacer progressivement les verrous de répétition par **états explicites campagne + tentative + respiration + nouvelle conversion**. Conserver le rejet de doublons techniques, protection 500$, stops économiques, admission DATA_OK, coût des frais. Aucune suppression globale en une fois.

## VII. Journal décisionnel 48h et performance : prérequis
- Nouveau journal **compact, non récursif**, jusqu'à 48–72 h minimum : un record par cycle 30 s (ou transition) avec `timestampSource/observedAt, price, campaignId, MCB/E3/E15 events, syncState, PM phase, MF state, priceRetention, action, chosenGate, rejectedGates, feesExpected`. Garder les motifs de refus précis ; ne pas recopier les états imbriqués sur des centaines de champs.
- Rotation **à la durée**, archives suffisantes, vérifier réellement l'heure du plus ancien enregistrement.
- Index/synthèse légère des trades pour `/api/trades` : ne jamais parser 264 Mo de JSON entier à chaque refresh. Charger les rapports détaillés uniquement à la demande.
- Séparer rendu chart bougies et évaluation, fetch `AbortController` et `no overlapping requests`, date de snapshot affichée, synchronisation des rafraîchissements ; instrumentation TTFB, taille réponse, temps JSON.parse/draw.
- Afficher les qualités d'Elastic sur **le même snapshot horodaté** que les chiffres de conversion, tout en distinguant la fraîcheur du flux Live.

## VIII. Replay et critères de validation (aucune fuite future)
Récits à tester : 21/10 07:00–09:15, 14:30–16:30, 23:30–00:30 ; 22/10 03:00–04:00 ; derniers trades #145–#155.
Comparer V4.10.10 intacte vs V1 shadow sur mêmes points de décision, mêmes frais :
1) refuse #151/#152/#153/#154/#155 quand l'entrée est tardive, contre tendance persistante ou sans terrain ;
2) reconnaît 03:30–03:35 comme opportunité à étudier *avant* E15 confirmé sans supposer le futur ;
3) ne bloque pas les bonnes campagnes par une respiration E3 ou une 1h contextuelle isolée ;
4) estime coûts des frais, gross/net, R/R au départ, MFE, MAE, capture MFE, drawdown et nombre de faux signaux ;
5) produit des diagnostics reproductibles du pourquoi admettre, différer ou refuser.

## IX. Séquence d'implémentation et autorité
**Phase 0** : corriger journal 48h et latences UI, observer sans modifier admissions.
**Phase 1** : machine de campagnes, transitions E3/E15 et conversion avec mémoire, **shadow uniquement**.
**Phase 2** : replay comparatif, tuning anti-churn par rôle, sur plusieurs périodes dont pertes et trades excellents.
**Phase 3** : proposer un diff limité, obtenir validation distincte avant d'accorder à Elastic l'autorité de trading paper V1 ; garder V4 en shadow de comparaison, rollback et journal complet.
Serveur = vérité opérationnelle ; code = état implémenté ; archives = mémoire ; hypothèses = hypothèses.
