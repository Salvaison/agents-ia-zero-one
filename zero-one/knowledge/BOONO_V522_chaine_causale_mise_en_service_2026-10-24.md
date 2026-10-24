# BOONO Systems — Constitution opérationnelle V5.2.2 PAPER

Date : 24 octobre 2026 — Amsterdam. Mandat : améliorer la chaîne causale MCB, qualifier la maturité et la localisation des entrées, remplacer les invalidations de prix impropres ; continuer à produire des trades PAPER sans nouveau shadow volumineux. Concepts et critères de marché validés par le créateur ; code mis en forme et instrumenté par l'assistant.

## Principes

Architecture opérationnelle maintenue : PHASE MCB → TRANSITION GÉOMÉTRIQUE → LIEU → CONVERSION → PRONOSTIC → DÉCISION / INVALIDATION → RISQUE.

Le LIEU n'est pas un veto abstrait ; la géométrie MCB révèle quelle frontière est réellement disputée. L'absence de support ou d'invalidation causalement démontrable est en revanche une **contrainte de risque**, pas une opinion sur la direction du marché.

Le Bâton garde la référence de déplacement (~30 s), le prix OKX direct mesure l'évolution **depuis** le dernier Bâton (~5 s). PM3/PM5 sont des déplacements glissants de prix, non des volumes indépendants. La comparaison de vitesse utilise les **3 dernières minutes** contre les **2 minutes précédentes** calculées comme (PM5−PM3)/2. Jamais de somme de fenêtres PM3 et PM5.

Le croisement BW/LBW3 est daté à son **observation réelle Audit**, et rattaché à son événement E3 natif lorsqu'il existe ; ce sont une seule famille oscillateur et non deux votes distincts. E15 Live et confirmation sont datés séparément de la trajectoire causale E15→E15. Le 1h/4h demeure contexte qualitatif, pas veto directionnel.

## Maturité de marché

La nouvelle machine qualifie :
- REVERSAL_NASCENT : croisement 3m dans le bas/haut extrême cohérent avec retournement tandis que l'E15→E15 structurel précédent reste opposé.
- POST_REVERSAL_EXPANSION : trajectoire 15m déjà retournée, oscillateur toujours du côté du lobe précédent et en récupération ; la fenêtre initiale de retournement ne doit plus être inventée.
- CAMPAIGN_CONTINUATION : trajectoire confirmée dans le sens candidat, sous conditions de respiration et de progression.
- TRANSITION_UNRESOLVED : preuves insuffisantes pour qualifier une fenêtre.

La maturité d'une entrée mesure : temps depuis croisement (repère secondaire), amplitude MCB15 passée vs actuelle, position LBW3 au croisement et maintenant, terrain prix acquis depuis croisement en unités de range 3m observé, rendement marginal PM3/min vs (PM5−PM3)/2, recul/retest confirmé. Un croisement 3m en extrême ±60 n'a pas de permission automatique ; une impulsion tardive ralentissante demande un **nouveau cycle ou un retest causal défendu**.

Le prix peut requalifier une campagne EXISTANTE sans obliger de nouvelles confirmations simultanées. Une réentrée sur un ancien croisement reste interdite, sauf **nouveau retest observé après la sortie** ; clé de requalification incluant l'instant du retest pour empêcher le churn.

## Lieu et invalidation

Ancien bug : choisir une frontière la plus proche derrière le prix même si c'est un MCB3_LOCAL_HIGH franchi de quelques dollars, le traiter automatiquement comme support et calculer un rapport R/R artificiellement magnifique.

V5.2.2 sépare :
- frontière de contexte / obstacle : MA200, VAL, POC, VAH, S/R, extrêmes graphiques ; informative tant que le prix ne prouve pas un changement de rôle.
- ancre d'invalidation causalement défendable : creux/sommet 3m **confirmé par la bougie suivante** (sourceTs et availableAt séparés), extrême d'une bougie 15m **réellement clôturée**, ou ancien niveau devenu support/résistance après **franchissement + excursion + retour + nouvelle défense** enregistrés sur bougies 3m confirmées.
- invalidation proposée avec provenance, nature, instant auquel elle devient connaissable, distance de prix et volatilité.
- risque minimal adapté au range médian des bougies 3m (0,8×, et plancher de robustesse), pas un stop fictif à 27–41 USD dans un marché avec ranges 100+ USD. Risque initial structurel inférieur au plafond dur de −500 USD de mouvement BTC. Potentiel au prochain enjeu et frais doit couvrir suffisamment ce risque. Si aucune ancre causale n'existe, FLAT/WAIT ; ne pas fabriquer une nouvelle ancre.

## FLAT ≠ EN POSITION

FLAT : entrée uniquement lorsque phase, maturité/cycle géométrique, terrain causal, PM3/5, PM depuis Bâton, MF, frais/potentiel/risque correspondent. Les références ±50/60 et ratios de progression restent des repères expérimentaux, pas une probabilité démontrée.

EN POSITION : la thèse de campagne déjà engagée est conservée. **Un seul E3 inverse ou une mèche qui effleure une limite n'invalide pas la campagne**. La perte d'une frontière retenue requiert une conversion adverse et une persistance mesurable (ou pénétration matérielle avec conversion adverse), en conservant le plafond dur −500 BTC. Une transformation opposée 15m avec PM/MF adverses peut invalider. La politique de gain 120→90 et 220→180 reste gérée séparément dans la comptabilité PAPER, et n'a pas été relâchée après trois trades. Les anciennes positions éventuellement ouvertes au moment d'une migration conservent explicitement la convention de risque de leur entrée.

## Replay strictement observé, non preuve statistique

Trois entrées historiques V5.2 (conditions observables à l'instant, sans lecture du futur) :
- #1 LONG 80 799,4 : LBW3 +67 au croisement, sans retest défendu, near ancien local HIGH ; V5.2.2 **WAIT / 3M_EXTREME_SANS_RETEST_DEFENDU**.
- #2 LONG 79 467,8 : LBW15 −84, E15→E15 encore SHORT, croisement E3 au bas de −88, première reprise et MF ; V5.2.2 **ENTER_LONG / REVERSAL_NASCENT** ; ancre reconstruite à partir d'un creux 3m causal connu, avec un risque ≈286 USD de prix BTC. Ne démontre ni gain ni protection meilleure.
- #3 LONG 79 871,1 : E15→E15 LONG depuis plusieurs bougies, croisement E3 vieux de 11 minutes, prix déjà +204,6 USD, PM3 +38,2 vs PM5 +113 et ralentissement normalisé ; V5.2.2 **WAIT / IMPULSION_DEJA_MATURE_ATTENDRE_REQUALIFICATION**. L'ancien stop sur le HIGH 79 868 à 79 830 est interdit par la nouvelle nomenclature.
- Replay descriptif d'un nouvel événement confirmé vers 16h38 UTC : une ancienne résistance locale ≈79 548,6 a été retestée puis défendue par des bougies connues à cet instant ; V5.2.2 aurait pu émettre un candidat LONG avant le mauvais #3 V5.2. Ceci n'est **pas** un trade exécuté, ni une preuve de rentabilité, et ne tient pas lieu d'out-of-sample.

Ces trois cas forment une **calibration in-sample** ; préserver plusieurs jours et mouvements contradictoires pour la validation prospectivement mesurée.

## Technique, sécurité et migration

Nouveau moteur de décision pur : modules/v5/decision-v522.js ; ancienne politique modules/v5/decision-v52.js préservée pour comparaison.

Le même processus PM2 de trading PAPER : boono-v52-paper, mêmes prix publics OKX, mêmes ledgers data/v52-paper-state.json, data/v52-paper-trades.ndjson et data/v52-paper-decisions.ndjson. La migration explicite par modules/v5/paper-v52.js n'accepte que l'ancienne version connue, préserve historique, positions, equity, frais, numérotation, keys consommées, et établit policyActivatedAt. **Un croisement/retest antérieur à l'activation V5.2.2 ne doit pas créer rétrospectivement un trade.** Ne jamais réinitialiser automatiquement un état inconnu.

V4.10.10, véritable V4.9.3 comparateur, Elastic observation et BOONO-TV restent séparés. Aucun ordre financé, aucune connexion au broker dans ce moteur. Journaux événementiels restent compacts/rotatifs.

Interface Amsterdam : V5.2.2 au premier plan ; maturation, progression depuis croisement, conversion marginale, ancre et instant de connaissance, décision/invalidation, risque ; historique V5.2 #1–#3 conservé avec ses étiquettes d'origine, les nouvelles opérations de V5.2.2 sont identifiables ; Vagues magenta pour la série continue, bleu V4.9.3. Rapport de trade détaillé conserve phase/maturité/chaîne causale/lieu/PM/invalidations.

## Limites explicites

- Paramètres de maturité et volatilité expérimentaux, non prouvés rentables. Un veto de sécurité sur l'invalidation valide n'est pas la réintroduction du veto arbitraire WHERE.
- Le moteur ne mesure pas la profondeur globale du carnet d'ordres ; PM/Ticker mesurent des efforts et leur conversion observés.
- Slippage et funding non modélisés ; stops PAPER exécutés au prix réel observé, sans garantie de prix théorique.
- Nouvelles analyses post-sortie ou replays **ne sont jamais des preuves disponibles à l'entrée**.
- Revoir dès plusieurs trades l'évolution du nombre d'opérations, du P&L net, des non-entrées productives, des sorties par inval. structurelle vs gain floor. Ne pas retoucher tous les seuils après un seul trade.

## État de déploiement

À mettre à jour après vérification des processus et des tests de reprise.


### Déploiement confirmé — relevé du 24 octobre 2026 vers 17:53 UTC (19:53 Stockholm)

- Processus PM2 **boono-v52-paper** redémarré avec décision v5.2.2-causal-maturity-structural-invalidation et ledger v5.2.2-paper-ledger-v0.2. Flux prix OKX public reconnecté. Premier cycle analysé sous V5.2.2 : CAMPAIGN_CONTINUATION LONG, WAIT / TRANSITION_3M_NON_REQUALIFIEE. Pas d'ouverture rétrospective.
- Avant basculement : position PAPER FLAT. Snapshot et journaux originaux copiés sous /root/boono-v522-migration-backup-20261024T175229Z avant activation.
- Comptabilité historique **strictement conservée** : 3 trades de V5.2, 1 gagnant, equity 997,3557 USD, net −2,6443 USD, 3 clés de croisement consommées. Chaque trade ancien porte sa politique originelle. Policy activation timestamp distinct du démarrage historique du simulateur.
- V4.9.3 comparateur, V4.10.10, moteur structurel V5 en observation et anciens projets BOONO-TV inchangés. Comptabilité PAPER uniquement, brokerOrdersEnabled=false.
- Interface privée config-server redémarrée. Routes sans session /, /api/v52 et /api/paper-history redirigent HTTP 302, pas d'accès public involontaire.
- Vérifications : 112 tests V4+V5 réussis (112/112), syntaxe Node + client JS validée, replay causal in-sample des 3 trades validé, migration à blanc et migration réelle validées. Un second cycle observé a confirmé la nouvelle politique dans l'état vivant. Rendu visuel sur un téléphone authentifié non revérifié dans cette session ; l'utilisateur pourra le constater directement.
- L'ancienne politique V5.2.0 reste dans modules/v5/decision-v52.js comme référence, **sans processus concurrent ajouté**. Aucun shadow volumineux créé.
