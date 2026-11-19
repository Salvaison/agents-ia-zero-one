# BOONOLAB — Protocole proposé Cross15 Live → vigilance structurelle → examen d'action (19/11/2026)

**STATUT : HYPOTHÈSE D'ARCHITECTURE VALIDABLE, PAS EN SERVICE PAPER.**  
**Demande utilisateur :** les trades V551 #7–#9 dans un régime de polarité indécise montrent un hachage des campagnes (« churn ») ; le Cross15 Live doit ouvrir une vigilance et une analyse rapprochée, **pas une sortie ou une réentrée automatique**. Garder UN seul moteur V551 et son ledger ; ne pas relancer les SHADOWS arrêtés.

## 1. Faits contrôlés sur Amsterdam

Sources directes : `data/v551-paper-state.json`, `data/v551-paper-decisions.ndjson`, `data/audit-history.json`, `../data/mcb-live/mcb_15m.csv`, `modules/v551/{decision,paper,source}.js` (lecture seule).

V551 #7 SHORT (06h39→07h30) **−4,6264 $**, #8 LONG (07h30→08h30) **+0,7831 $**, #9 SHORT (08h31→09h00) **−4,0374 $** : total **−7,8807 $ nets**, environ **4,50 $ de frais** sur ces trois clôtures. Les trois sorties ont pour raison `V551_CONFIRMED_15M_CROSS_LOCAL_POSITION_EXIT`. Chaque clôture de Cross15 opposé a entraîné une fin de position, souvent suivie d'une nouvelle entrée dans l'autre sens, ce qui est différent d'un réel transfert de territoire gagné et conservé.

| Passage | Cross15 Live | Cross15 clôturé | Entrée ultérieure et observations |
|---|---|---|---|
| SHORT #7, issu du renversement du LONG #6 | 06h15 SHORT | 06h30 SHORT | entrée 06h39 sur Cross3 06h38 ; PM Live directionnelle SHORT **+1,5 $**, MF15 +3,02 **contre le SHORT**, résultat −4,63 $ |
| LONG #8, après #7 | 07h15 LONG | 07h30 LONG | entrée 07h30 sur Cross3 de **07h14**, donc déjà **16 min** ; PM Live LONG +6,7 $, MF15 +1,90, MF3 −1,24 ; net +0,78 $, MFE 346,1 $ BTC mais déplacement retenu 96,7 $ BTC |
| SHORT #9, après #8 | 08h19 SHORT (après contacts provisoires 07h50, 08h15) | 08h30 SHORT | entrée 08h31 sur Cross3 du **08h09**, soit **21,53 min plus tôt** ; PM Live SHORT +15,3 $, MF15 **+0,87 contre le SHORT** alors que MF3 −1,60 ; prix déjà avancé d'environ 141,2 $ BTC depuis Cross3 ; résultat −4,04 $ |

La polarité 15m Live oscille plusieurs fois en moins d'une minute :
- **07h50m43 SHORT → 07h51m13 LONG** (30s).
- **08h15m43 SHORT → 08h16m43 LONG** (1 min).
- **08h53m44 LONG → 08h54m44 SHORT → 08h55m14 LONG** (30s–1min).
- Un croisement Live plus persistant ne garantit pas un mouvement productif : **08h19 SHORT → 08h53 LONG** dure environ 34 minutes mais le prix avance **contre** le SHORT d'environ **98 $ BTC** jusqu'à la fin de la séquence.
- **07h15 LONG → 07h50 SHORT**, malgré 35 min d'affichage LONG, ne conserve qu'environ **−3,5 $ BTC** entre l'observation initiale et le dernier relevé précédant la réinversion.

**Attention à la causalité :** les durées et le résultat conservé ne sont connus qu'après les faits. Ils servent à évaluer un protocole, pas à décider rétroactivement à l'instant de la première observation.

## 2. Reprendre le contrat par responsabilités, et non par seuils

Le **Cross15 Live opposé** ouvre une *vigilance* de la position et de la campagne avec horodatage, prix de référence, écart BW15/LBW15, pentes et état MCB3/MF/PM. C'est un **changement d'état d'attention**, pas un EXIT ni un ENTER.

Une seule mémoire de **confrontation en cours**, dans V551 :
1. `CAMPAGNE_ACTIVE` : trajectoire 15m et position actives, surveillance normale.
2. `CROSS15_LIVE_WATCH` : contact/cross opposé Live observé ; enregistrer `observedAt`, prix BTC de référence, sens de la pente, vitesse du rapprochement. L'identité de la campagne ne change pas.
3. `COUNTER_EFFORT_TEST` : comparer la trajectoire de MCB3 (cross, pente, vitesse, re-croisements), MF15 lent + MF3 interne, PM Live, effort du marché et **prix vraiment gagné/conservé** depuis la première alerte et après les contre-attaques. Lire la réaction comme hypothèse : `PRODUCTIVE_COUNTER`, `CONTESTED`, `REJECTED`, `UNKNOWN`. Un contact de MA ou une simple oscillation de gap ne suffit pas à décréter la défense d'un territoire.
4. `POSITION_PROTECTION_REVIEW` : décider séparément de `HOLD` ou `PROTECT/EXIT_POSITION` selon la conversion et le territoire adverse réellement observés. **La sortie n'efface pas le parent stratégique.** Garder le hard risk PAPER indépendant de 500 $ BTC.
5. `CROSS15_CLOSED` : autorité structurelle majeure sur l'hypothèse de campagne, avec distinction `CLOSE_CONFIRMED`, `FAILED_CROSS`, `TRANSFER_ACCEPTED`. **Jamais de retournement de position automatique** au même moment.
6. `REVERSE_ENTRY_REVIEW` : nouvel examen économique du Cross3 proposant la direction inverse : une hypothèse vieille de 16–22 min n'est pas obsolète par minuterie, mais peut être **déjà accomplie** ; vérifier quantité de déplacement post-cross et progrès encore productif, cohérence MF15/MF3 et PM Live, prix maintenu après respiration, et intérêt économique après frais. Une clôture LONG ne prouve pas un SHORT exploitable.

Ces états peuvent être suivis par la **même instance V551**, avec preuves observées et raisons de rejet, sans moteur PM2 supplémentaire ni accumulation de cinq veto numériques.

## 3. Comparer aux bonnes campagnes pour éviter le sur-ajustement

Références de bonnes transitions : Cross15 Live SHORT **18/11 20h01** avant la campagne #1→#2, et **19/11 02h15** avant #4→#5. Cas trompeurs : SHORT Live **19/11 01h18** puis rejet vers 01h28, UP Live **18/11 21h15** rejet en environ 1min durant le SHORT #2 finalement gagnant, et les contacts ambivalents #7–#9.

Trois résultats doivent être comparés **séparément** :
- **Qualité de l'alerte :** probabilité que la contre-offensive gagne et garde le prix après Cross15 Live, sans anticiper ce résultat.
- **Résultat de la protection :** sortie locale vs HOLD et risque/frais de réduire les campagnes gagnantes.
- **Qualité de l'entrée inverse :** frais et potentiel restant à l'admission, indépendamment de l'heure de fermeture de l'ancienne position.

L'ancien code V551 présente une **erreur de type avérée** dans `positionReview` : `signed(x, d)` reçoit le nombre `±1` au lieu de la chaîne `'long'/'short'`. Cette erreur rend inopérants plusieurs tests tactiques. **Ne pas la corriger et activer automatiquement l'ancien prédicat**, car le replay montre qu'il aurait parfois coupé trop tôt des gagnants (#2 notamment). Déboguer les observations avant d'attribuer une nouvelle autorité.

## 4. État de réalisation à la date du rapport

**ANALYSE ET PROTOCOLE PROPOSÉ RÉDIGÉS** sur des données réelles ; **AUCUNE modification** des sources V551 PAPER, de ses règles d'entrée/sortie, de ses compteurs, des autres moteurs ni des services OVH. Pour une validation future, coder d'abord un comparateur **interne et observationnel** à V551, sans nouvelle instance, qui journalise les preuves dans la même campagne et teste les événements as-of contre les réalisations postérieures. Ne pas promouvoir automatiquement les conclusions rétrospectives.

**Conclusion :** Cross15 Live n'est ni une sortie, ni une entrée, ni un changement de parent à lui seul. Il **ouvre l'enquête sur le transfert de force**, et la qualité de cette enquête doit permettre à V551 d'être actif sans churn lorsqu'une polarité 15m est instable.
