# BOONO — Deep Review 24 h — 23/09/2026

Fenêtre prévue : 22/09/2026 09:00Z → 23/09/2026 09:00Z.
Fenêtre V3 réellement auditable : 22/09/2026 09:00Z → 23/09/2026 06:38:08.330Z.
À partir de 06:38:08.330Z et jusqu'à la reprise causale 09:13:37.951Z : [DONNÉES INSUFFISANTES].
Les données post-reprise sont utilisées seulement comme contrôle prospectif séparé, jamais comme backfill de la fenêtre manquante.

## Synthèse exécutive

- [FAIT OBSERVÉ] 2 585 évaluations V3 auditées dans la fenêtre disponible ; prix 85 506,0 → 87 229,6 $.
- [FAIT OBSERVÉ] Actions : 2 536 WATCH, 34 NO_TRADE, 1 ENTER_SHORT, 13 HOLD, 1 EXIT_STRUCTURE.
- [FAIT OBSERVÉ] Un seul trade V3 : SHORT 86 447,2 → 86 235,6, +2,4477 % levier, MFE 227,2 $, MAE 22,5 $, capture ≈93,1 %, giveback ≈15,6 $.
- [DÉMONTRÉ] Le premier STRUCTURAL_REASSERTION effectivement admis a donc été profitable, correctement localisé (CURRENT_WHERE), R:R 1,304, puis clôturé sur un nouvel E15→E15 opposé confirmé.
- [FAIT OBSERVÉ] 1 997 évaluations en STRUCTURAL_REASSERTION ; 597 tactiquement reassertion.ready ; une seule admission.
- [FAIT OBSERVÉ] R:R <1 sur 1 489 évaluations, >=1 sur 575, non calculable sur 521.
- [DÉMONTRÉ] Les rares clusters bloqués uniquement par R:R ou par dominance/régime ont souvent offert une excursion favorable mais finissaient défavorablement à 60 min ; aucune preuve convergente ne justifie aujourd'hui de desserrer ces gates.
- [ARTEFACT LOGIQUE] 6 legs E15→E15 confirmés ont produit 30 changements de statut structurel ; 28 de ces changements ont eu lieu sans nouveau leg E15, uniquement par retracement/reclaim du prix.
- [DÉMONTRÉ] Ces oscillations ACTIVE ↔ FALSIFIED_PRICE_LEG ont immobilisé V3 environ 260,3 minutes en THESIS_FALSIFIED_WAIT et contredisaient la règle validée « protection/retracement prix ≠ invalidation de tendance ».
- [DÉCISION MÉTHODOLOGIQUE] Correction unique de la Deep Review : un retracement prix complet devient descriptif (FULLY_RETRACED) ; la thèse issue du dernier leg E15→E15 confirmé reste ACTIVE jusqu'à confirmation d'un nouveau leg E15→E15 opposé.
- [ARTEFACT LOGIQUE] secondaire découvert post-reprise : finite(null) dans wave.js transformait temporairement un low=null live en prix 0. Le garde de validité a été corrigé dans le même paquet de cohérence de données ; aucune règle de trading ni aucun seuil n'est modifié.

## OBSERVATION — DATA → CONTEXT → WHERE → STATE → SEQUENCE → CONVERSION → DOMINANCE

### DATA

- 2 585 évaluations V3 exploitables.
- Première : 22/09 09:00:19Z.
- Dernière avant panne : 23/09 06:38:08Z.
- Panne stockage V3 : décisions/état figés vers 06:36:34Z ; évaluations/shadow jusqu'à 06:38:08Z.
- Reprise causale après réparation stockage : 23/09 09:13:37.951Z.
- La plage manquante reste [DONNÉES INSUFFISANTES] ; aucun audit général ou legacy n'est utilisé pour inventer des admissions V3.
- Régimes observés : TRANSLATION 930, TENSION_BALANCE 769, COMPRESSION 371, CHOC_COMBAT 307, HACHOIR 208.

### CONTEXT

- Daily : MCB élevé et positif sur la journée (LBW ~51 au début de fenêtre).
- 4h : MCB en reflux depuis une zone haute : LBW ~71,6 à 08:00Z le 22/09, ~68,4 à 12:00Z, ~61,1 à 20:00Z, ~56,1 à 04:00Z le 23/09.
- [DÉMONTRÉ] « prix au-dessus MA200 » ne signifie pas « top-down haussier ». Le 4h descendant et la position haute du Daily rendaient le risque de reflux important malgré des MA200 inférieures au prix.
- 1h et 15m ont oscillé rapidement ; leur géométrie MCB n'est pas interprétée comme permission directionnelle autonome.
- 22 évaluations de prévisions horaires ont été scorées : 20 [AMBIGU], 2 [DÉMONTRÉ]. Le marché a surtout alterné compression, stress tests et legs confirmés sans validation tactique prolongée.

### WHERE

- NO_VALID_LOCATION : 2 243 / 2 585.
- RELEVANT : 342 / 2 585 (~13,2 %).
- Sur les réassertions, CURRENT_WHERE était vrai 285 fois ; le manque de lieu demeure donc un filtre majeur.
- Le trade gagnant de 01:39Z utilisait CURRENT_WHERE.
- [DÉMONTRÉ] La rareté des admissions n'est pas due à un verrou unique : WHERE, turning, dominance, régime et R:R se relaient comme causes de refus.

### STATE

- Phase LBW 15m : MONTEE 840, DESCENTE 1 745 — descriptif uniquement.
- wave.structural ancien contrat : ACTIVE 2 069, FALSIFIED_PRICE_LEG 516.
- Directions des legs confirmés : LONG sur 1 835 évaluations, SHORT sur 750.
- Six legs structurels distincts ont été observés :
  - 21/09 06:15 CRETE → 21/09 23:30 CREUX : prix +4 477,5 $ ;
  - 21/09 23:30 → 22/09 12:30/13:00 : petits legs SHORT ~-155/-142 $ ;
  - 21/09 23:30 → 22/09 15:45 : LONG +396,6 $ ;
  - 22/09 15:45 → 22/09 22:15 : SHORT -749,4 $ ;
  - 22/09 22:15 → 23/09 01:15 : LONG +711,1 $.
- [ARTEFACT LOGIQUE] La même ancre E15 pouvait passer ACTIVE→FALSIFIED→ACTIVE plusieurs fois en quelques minutes, sans nouveau pivot.

### SEQUENCE

- 1 997 états STRUCTURAL_REASSERTION.
- reassertion.ready=true : 597.
- Nested 3m aligné : 1 005.
- Turning frais aligné : 105.
- CURRENT_WHERE pour réassertion : 285.
- Une seule conjonction finale admissible : 23/09 01:39:04Z SHORT.
- Le nouvel E15 LONG confirmé à 01:46Z a provoqué EXIT_STRUCTURE ; cette sortie est cohérente avec le contrat corrigé car elle repose sur un nouveau leg confirmé, non sur un simple retracement.

### CONVERSION

Cas bloqués uniquement par R:R :
- 22/09 16:05:28Z SHORT, R:R 0,270 : MFE 279 $, MAE 227,6 $, résultat à 60 min -134,9 $.
- 23/09 01:41:04Z SHORT, R:R 0,841 : MFE 218,4 $, MAE 233,3 $, résultat à 60 min -105,3 $.
Conclusion : [AMBIGU] pour la capture très courte, mais [DÉMONTRÉ] qu'abaisser mécaniquement le seuil R:R aurait aussi ouvert des cas à asymétrie défavorable.

Cas bloqué uniquement par dominance :
- 23/09 01:39:33Z SHORT, R:R 1,048, COMBAT_EQUILIBRE : MFE 263,2 $, MAE 188,5 $, résultat 60 min -91,4 $.
Le trade admis 29 s plus tôt a été sorti proprement 7 min plus tard ; le refus de réentrée tardive n'est donc pas démontré erroné.

Cas CHOC_COMBAT sans R:R bloquant :
- 22/09 14:24:15Z SHORT, R:R 1,697 : MFE 594,1 $, MAE 215,4 $, mais résultat 60 min -169,8 $.
La possibilité de scalp existait, mais le régime n'est pas falsifié comme gate sur ce seul exemple.

### DOMINANCE

- DOMINATION_PERSISTANTE short : 396 évaluations.
- DOMINATION_PERSISTANTE long : 420.
- Motif de refus « dominance actuelle non alignée/persistante » : 2 253 occurrences.
- Aucun élément ne justifie de réduire aujourd'hui le seuil de preuve de dominance.

## DÉCISION — ELIGIBILITY → RISK → ACTION

### ELIGIBILITY

- Admission totale : 1 / 2 585.
- La conjonction est extrêmement sélective, mais le seul trade admis a bien fonctionné.
- Les refus R:R/dominance/régime examinés ne fournissent pas de preuve suffisante pour desserrer les gates.
- Le principal faux verrou démontré n'est pas un seuil : c'est l'état THESIS_FALSIFIED_WAIT créé par un retracement prix réversible.

### RISK

- Le contrat protectionPrice reste séparé de la thèse de tendance.
- Aucun retour à invalidationPrice.
- Le seuil R:R minimum 1 reste inchangé.
- La respiration/protection minimum reste inchangée.
- Les cibles STRUCTURAL_RECLAIM/STRUCTURAL_EXTREME restent inchangées.
- Post-reprise, cinq évaluations avaient temporairement wave.price.minPrice=0 à cause d'un low=null traité comme numérique ; aucune admission n'en a résulté. La validation des nombres a été durcie pour ignorer null/undefined/chaîne vide.

### ACTION

Trade 23/09 01:39:04Z :
- SHORT 86 447,2.
- protection 86 800.
- sortie 01:46:03Z à 86 235,6.
- +2,4477 % levier.
- MFE 227,2 $, MAE 22,5 $.
- capture ≈93,1 %.
- sortie : nouveau mouvement prix E15→E15 confirmé dans le sens opposé.
- Verdict : [DÉMONTRÉ] bon exemple de STRUCTURAL_REASSERTION + sortie structurelle causale.

## [CHANGEMENT AUTORISÉ] Correction unique de la Deep Review

### Cause

Ancien wave.structuralLeg() :
- direction = géométrie prix du dernier E15→E15 ;
- MAIS status=FALSIFIED_PRICE_LEG dès que le prix retraçait jusqu'au point de départ du leg ;
- si le prix repassait de l'autre côté, la même thèse redevenait ACTIVE.

Effet mesuré :
- 30 changements de statut ;
- seulement 5 vrais changements de leg ;
- 28 toggles de statut sur le même leg ;
- ~260,3 minutes en FALSIFIED_PRICE_LEG ;
- auto-réactivations observées symétriquement SHORT et LONG.

### Nouveau contrat

- wave.structural.status reste ACTIVE pour le dernier leg E15→E15 confirmé.
- fullyRetraced et priceRetracementStatus=FULLY_RETRACED|NOT_FULLY_RETRACED décrivent le retracement prix.
- Un retracement complet n'invalide plus à lui seul la thèse.
- ACTION ne sort plus sur retracement prix complet.
- EXIT_STRUCTURE reste déclenché par un nouveau leg E15→E15 confirmé dans le sens opposé.
- RISK ne produit plus THESIS_FALSIFIED_WAIT à partir du retracement prix.
- ELIGIBILITY, dominance, WHERE, turning, 3m, R:R, protection et régime restent décisionnels et inchangés.

### Garde de données associé

wave.js rejetait mal null parce que Number(null)===0.
La fonction de validité rejette désormais null/undefined/chaîne vide avant conversion.
Cela empêche un high/low live manquant de devenir artificiellement un prix 0.

## Tests / activation

Backup :
archives/v3lab-pre-deep-review-structural-persistence-20260923T113344Z

Tests :
- syntaxe wave/risk/action : OK ;
- V3 coherence regression : OK ;
- MA200 shadow : OK ;
- divergence-lineage shadow : OK ;
- MW hourly report : OK ;
- rotating NDJSON : OK ;
- V2 core-contract : OK ;
- V2 simulator-v02 regression : exit 0.

Activation :
- aucune position V3 ouverte ;
- seule cerveau-central redémarrée ;
- moteur-boono non redémarré ;
- position legacy SHORT préexistante conservée.

Contrôle live post-activation :
- 6 premières évaluations : 0 statut falsifié, 0 minPrice=0 ;
- dernier leg E15 confirmé LONG reste ACTIVE ;
- prix sous le départ du leg => fullyRetraced=true, uniquement descriptif ;
- mode actuel STRUCTURAL_REASSERTION ;
- aucune admission : dominance SHORT et turning LONG frais absent ;
- aucun trade créé par le redémarrage.

## Rollback

Restaurer wave.js, risk.js, action.js et coherence-regression.test.js depuis :
archives/v3lab-pre-deep-review-structural-persistence-20260923T113344Z

Puis redémarrer uniquement cerveau-central hors position V3.

## Verdict

- Stockage V3 : rétabli et prospectivement stable.
- STRUCTURAL_REASSERTION : première admission live observée, profitable et bien sortie.
- R:R / dominance / régime : sélectifs mais non falsifiés par cette fenêtre.
- WHERE/turning : restent les principaux facteurs de rareté tactique.
- [FALSIFIÉ] : « un retracement complet du prix peut falsifier puis réactiver la même thèse structurelle sans nouvel E15 ».
- [DÉMONTRÉ] : la thèse structurelle doit rester attachée au dernier leg E15→E15 confirmé ; le retracement prix est une observation, pas une permutation de thèse.
- La plage 06:38:08Z→09:13:37Z reste définitivement [DONNÉES INSUFFISANTES] pour V3.
