# BOONOLAB — Audit corrigé des campagnes V4.9.4, V5.4.3 et shadows

**31 octobre 2026, contrôle live ~21h34 Europe/Stockholm**
**Statut : ANALYSE EN LECTURE SEULE — publiée dans la Knowledge Base sur demande de l'utilisateur ; aucun changement de décision PAPER autorisé.**
**Registre :** [OD-20261031-001](operational-decisions/OD-20261031-001/03-origine-et-justification.md) (verbatim utilisateur, mission réellement exécutée, origine, journal de statuts et manifestes).
**Documents connexes :** [méthodes d'analyse](BOONOLAB_methodes_analyse_et_criteres_2026-10-28.md), [audit d'entrée/sortie V494](BOONOLAB_V494_contrastes_A_B_C_D_nets_live_2026-10-30.md), [shadows risque V543](BOONO_risk_maintien_shadow_v01_2026-10-30.md), [sans gain-floor, perte niveau et transfert](BOONOLAB_V543_sans_gainfloor_invalidation_et_transfert_2026-10-30.md), [audit Elastic](BOONOLAB_Elastic_shadow_bilan_2026-10-30.md).

## 0. Correction de lecture demandée par le propriétaire

**Observation utilisateur :** le 31/10, contrairement au 30/10, V494 ne construit plus de campagnes longues et accumule des fragments perdants ; V543 continue à saisir des mouvements parfois au début des inflexions et à maintenir des positions plus longtemps, mais presque toutes ses bonnes positions sortent par gain-floor autour du point mort. Il soupçonne l'invalidation et demande la publication GitHub du rapport d'abord seulement rédigé sur Amsterdam.

**L'enquête valide l'essentiel de la description.** La statistique initiale « V543 33 gagnants sur 56, mais perdant net » ne rendait pas justice à la **qualité de l'impulsion initialement trouvée** et n'expliquait pas **pourquoi V543 n'en cristallise presque aucun revenu**. La preuve décisive est dans les journaux décisionnels de la sortie : les **neuf** sorties gain-floor de V543 du 31/10 avaient simultanément **l'action stratégique `HOLD`**. Ce n'est **pas** un signal structurel de sortie qu'a produit le moteur; c'est le contrôleur PAPER qui a clos **avant de consulter cette action**.

Le problème est donc **double**, pas uniquement « ajuster les 90 $ » : **(A) des floors monétaires préemptent la lecture de campagne quand la thèse est encore défendue ; (B) l'invalidation structurelle initiale est une ancre diagnostique, pas un ordre de sortie autonome, et ses preuves de perte de territoire peuvent arriver trop tard.** La suppression globale du floor serait néanmoins dangereuse dans les contre-exemples où le maintien transforme une petite réussite en perte.

## 1. Périmètre exact, chronologie et méthodologie

Données de production lues sur Amsterdam **31/10 ~20h34 UTC**, correspondant à **~21h34 Europe/Stockholm** ; services PAPER V494, V543 et shadows vérifiés en ligne. V4 ledger atteint **#68**, V543 **#135**. Comparaison *par date d'entrée locale Europe/Stockholm* ; la sortie peut avoir eu lieu le lendemain. Montants en **USD de P&L du simulateur sur un notionnel de 1 500 USD**, frais taker **0,05 %/côté** (~1,50 USD l'aller-retour) ; le **MFE/MAE et le plancher 90/120/180/220 sont des déplacements du cours BTC en dollars**, pas des profits du portefeuille. Le prix des futurs remplissages, le slippage et le funding ne sont pas modélisés.

Sources vérifiées :
- `data/v494-paper-trades.ndjson`, `data/v494-paper-state.json` (V493 gelé `cdf1936` derrière V494) ;
- `data/v52-paper-trades.ndjson`, `data/v52-paper-state.json`, `data/v52-paper-decisions.segment-20261031T*.ndjson` ;
- **code exact** `modules/v5/paper-v543.js`, `modules/v5/decision-v541.js`, `modules/v5/decision-v543.js`, ainsi que `modules/v5/campaign-hold-shadow.js` et `structural-transfer-observer.js` ;
- `data/v494-dual-module-shadow-{summary,events}.ndjson/json`, `data/v543-campaign-hold-shadow-{summary,events}`, `data/v494-elastic-shadow-summary.json` et `data/v494-elastic-state-summary.json`.
- Fichier préliminaire local `knowledge/BOONOLAB_analyse_trades_shadows_2026-10-31_NON_PUBLIE.md` réconcilié avec les observations du soir, **pas pris pour une archive GitHub publiée**.

Une « entrée au point d'inflexion » est une **hypothèse d'origine / synchronisation** qui doit être testée par géométrie MCB15/3m réellement connue, et non prouvée par la seule présence d'un MFE favorable après coup. Une « campagne E15 » peut contenir plusieurs trades et des contre-attaques tactiques. Aucun taux universel de gain n'est inféré des 30 secondes de ticker ou de trade répétées.

## 2. Le changement de régime spectaculaire de V494 entre le 30 et le 31 octobre

| V494 — date d'entrée locale | Trades ouverts | P&L nets positifs | Net final | Frais | Durée maximale | MFE moyen BTC$ |
|---|---:|---:|---:|---:|---:|---:|
| **30 octobre** (#49–58) | 10 | 6 | **+29,6180 $** | 15,0151 $ | 172,5 min | 482,9 |
| **31 octobre** (#59–68) | 10 | **0** | **−26,9553 $** | 15,0013 $ | **32 min** | **14,1** |

Ces regroupements sont **par date d'entrée**, comptabilisés après clôture ; #58 est entré 30/10 à 23h33 local mais sorti le 31/10 à 02h25. Le 30/10, V494 avait de vrais prolongements : #49 **+22,295 $ net**, #50 **+5,582 $**, #54 **+5,468 $**, #58 **+7,842 $** (compensés en partie par des pertes). Le 31/10, ses dix admissions sont toutes négatives, avec **7 SHORTs** et seulement **94 minutes cumulées d'exposition** (9,4 min par trade), contre 689,5 minutes cumulées pour les entrées du 30/10.

La matinée du 31/10 (heure locale) contient un groupe de six admissions #59–64 entre **05h21 et 07h51**, puis plusieurs nouvelles entrées à 15–16h et #68 SHORT à **21h30**, sorti deux minutes après. Leurs MFE sont faibles : beaucoup ne se déplacent même pas de 40 $ BTC dans le sens recherché avant sortie. **La fragmentation de V494 aujourd'hui est donc surtout une défaillance d'admission ou de synchronisation de phase, pas un problème de laisser filer une grande plus-value.** Même une meilleure règle de sortie ne saurait transformer automatiquement une entrée presque immédiatement contraire en campagne longue productive.

Il faut reconstituer les oppositions MF/MCB et la maturité du parent E15, comparer les **bonnes ET mauvaises** entrées rejetées par le filtre MCB15 et vérifier si le moteur a tenté de réutiliser des setups tactiques avant nouvelle preuve.

## 3. V543 le 31 octobre : 13 trades, 7 parents E15, 9 vraies impulsions à +120 BTC$ au moins

| V543 — date d'entrée locale 31 octobre | Valeur |
|---|---:|
| Trades #123–135 | **13** |
| Campagnes parentes `causalChain.campaignId` distinctes | **7** |
| Trades avec MFE >= 120 $ BTC | **9** |
| Trades nets positifs | **9** |
| Net cumulé des 13 | **−12,1111 USD** |
| P&L brut | **+7,3967 USD** |
| Frais | **19,5079 USD** |
| Temps en position cumulé | **647,7 minutes** |
| Plus longue position | **124,3 minutes** (#132 SHORT) |

Le fait que **9/13 positions trouvent effectivement au moins 120 $ BTC de mouvement favorable pendant leur durée** étaye l'impression que V543 reconnaît souvent une opportunité réelle au bon moment. Cela **ne prouve pas encore** une position exactement à l'inflexion MCB15 ou au creux/sommet prix.

Quelques positions longtemps actives : #125 SHORT **104,6 minutes**, #127 SHORT **64,7 minutes**, #128 LONG **63,1 minutes**, #132 SHORT **124,3 minutes**, #135 LONG **108,2 minutes**. À l'inverse, V494 ne dépasse pas 32 minutes sur ses dix nouvelles entrées du jour.

Les **7 parents E15** contiennent 13 positions (distinctes des E3) :
- parent LONG `E15:1793387700000` : #123 et #124 LONG, net +0,2325 USD ;
- parent SHORT `E15:1793408400000` : #125, #126 et #127 SHORT, net **−7,2106 USD** ;
- parent LONG `E15:1793421900000` : #128 et #129 LONG, net +0,3405 USD ;
- parent SHORT `E15:1793430900000` : #130 SHORT, net −3,4808 USD ;
- parent SHORT `E15:1793442600000` : #131 LONG en `STRUCTURAL_REVERSAL_FORMING` puis #132 SHORT en continuation, net +0,2414 USD ;
- parent SHORT `E15:1793449800000` : #133 SHORT puis #134 LONG en `REVERSAL_FORMING`, net −2,4154 USD ;
- parent LONG `E15:1793458800000` : #135 LONG, net +0,1813 USD.

**Important :** la parenté E15 est la campagne structurelle référencée par le moteur ; elle peut être contestée par des tentatives dans le camp opposé. Ne pas confondre 13 ordres et 13 campagnes nouvelles.

### Toutes les positions favorables ont été aplaties par le floor 120→90

Les **9 exits gain-floor du 31/10** ont réalisé **+1,3252 USD nets cumulés**, soit **+0,1472 USD par trade**, malgré **+150,96 BTC$ de MFE moyen** et **+85,01 BTC$ de déplacement favorable conservé** à la sortie, après **502,4 minutes cumulées de maintien**. Leurs frais totaux ont été **13,5042 USD** pour 14,8293 USD bruts.

| V543 | Sens | Durée | MFE BTC$ | Mouvement retenu BTC$ | P&L net | Floor |
|---|---|---:|---:|---:|---:|---|
| #123 | LONG | 11 min | 152,0 | 78,8 | +0,0313 $ | 120→90 |
| #124 | LONG | 15 min | 121,7 | 87,9 | +0,2012 $ | 120→90 |
| #125 | SHORT | 105 min | 148,1 | 86,8 | +0,1839 $ | 120→90 |
| #128 | LONG | 63 min | 180,1 | 84,2 | +0,1337 $ | 120→90 |
| #129 | LONG | 28 min | 173,5 | 88,0 | +0,2068 $ | 120→90 |
| #131 | LONG | 24 min | 191,3 | 80,2 | +0,0525 $ | 120→90 |
| #132 | SHORT | 124 min | 125,5 | 87,2 | +0,1889 $ | 120→90 |
| #134 | LONG | 24 min | 123,8 | 85,0 | +0,1456 $ | 120→90 |
| #135 | LONG | 108 min | 142,6 | 87,0 | +0,1813 $ | 120→90 |

**Aucun des neuf n'a atteint MFE 220 BTC$ : le floor 220→180 n'est PAS responsable des sorties gagnantes du 31 octobre.** C'est le 120→90 qui domine.

À 77 000 $ BTC, un mouvement conservé de 90 $ BTC sur 1 500 $ notionnels donne ~**1,75 $ brut**, dont ~1,50 $ de commissions aller-retour, soit **0,25 $ net théorique** si le prix exact de sortie était encore à 90. Le runner observe à cadence finie : 9 clôtures entre +78,8 et +88,0 BTC$, d'où seulement 0,03 à 0,21 USD net. **Les floors produisent une protection opérationnelle proche de zéro, mais pas un rendement économique qui compense les risques.**

Les **quatre autres trades** du 31/10 (#126, #127, #130, #133) n'ont jamais atteint MFE 120 ; sorties pour échec MA3/MF ou transfert structurel, total **−13,4363 $ net**. Les neuf floors +1,3252 ne les compensent pas.

## 4. Diagnostic vérifié : neuf décisions `HOLD`, neuf `EXIT_PAPER` monétaires

**Preuve as-of**, issue des segments `data/v52-paper-decisions.segment-20261031T*.ndjson` : pour **chaque** trade #123, #124, #125, #128, #129, #131, #132, #134 et #135, à l'horodatage **exact de sortie**, le champ `action` émis par le moteur décisionnel est **`HOLD`** (avec `decisionOutcome:EXIT_PAPER`, événement exécuté `EXIT_LONG/SHORT` et `reason:GAIN_FLOOR_120_90_OR_220_180`).

Pour #129 le moteur disait **`HOLD_V54_STRUCTURE_CONTESTED_PROTECT`** ; #131 et #134 disaient **`HOLD_V54_3M_RESPIRATION_NOT_EXIT`** ; les autres avaient `V54_CAMPAIGN_POSITION_ACTIVE`. **Il ne s'agit donc pas de neuf invalidations structurelles : le contrôleur économique a fermé alors que la thèse V5 ordonnait de maintenir.**

L'ordre *actuellement codé* dans `modules/v5/paper-v543.js`, fonction `step`, est :

1. Mise à jour du MFE courant ; armement automatique : `MFE>=120 → floor=90`, `MFE>=220 → floor=180`.
2. Si prix frais et perte courante ≤ −500 BTC$ : `HARD_RISK_500`.
3. **Sinon**, si floor armé et gain courant ≤ floor : `GAIN_FLOOR_120_90_OR_220_180` — **sortie immédiate indépendamment de `decision.action`**.
4. **Sinon seulement**, si `decision.action==='EXIT_'+direction` : sortie structurelle / MA/MF demandée par V541.

L'`entryInvalidation` est bien calculée et enregistrée à l'entrée, mais dans **ce gestionnaire PAPER** elle n'est **pas un stop exécuté autonome**. À l'admission, sa distance est soumise au budget max 500 BTC$ ; ensuite la structure V541 attend des preuves supplémentaires (`structuralLoss` avec clôtures 3m, MF adverses, prix adverse défendu, ou rejet MA3 confirmé avec MF et prix). Cette différence entre **niveau d'invalidation déclaré** et **critère de sortie effectif** est un **défaut d'architecture à étudier**, non la preuve que tout contact avec le niveau devrait être un stop automatique.

Deux conflits coexistent :
- **Une bonne opportunité** peut être fermée presque au point mort par l'automate 120/90 alors que la structure dit `HOLD`, ce qui fragmente la campagne.
- **Une mauvaise opportunité** peut dépasser largement son niveau de référence parce que l'invalidation requiert trop de preuves avant d'ordonner une sortie de position, sans forcément invalider toute la campagne E15.

## 5. V494 factoriel A/B/C/D : très différent de l'année précédente, mais sélection d'entrée prometteuse

Au dernier contrôle du 31/10 20h34 UTC, le shadow A/B/C/D disposait de **3 208 observations** depuis son activation le 30/10 à 17h53 UTC :

| Branche | Entrée | Sortie | Trades clôturés | Net après frais |
|---|---|---|---:|---:|
| A | V493 originale | V493 originale | 12 | **−19,1173 $** |
| B | V493 originale | Supervision expérimentale | 12 | **−19,1173 $** |
| C | Filtre `MCB15_INFLECTION` | V493 originale | 3 | **+4,3204 $** |
| D | Filtre `MCB15_INFLECTION` | Supervision expérimentale | 3 | **+4,3204 $** |

Le différentiel descriptif **C−A = D−B = +23,4377 USD** correspond **à 9 trades réellement absents chez C**, et non aux **22 évaluations répétées de candidatures filtrées** `blockedEntries`. Ces neuf transactions A supplémentaires étaient toutes perdantes dans cet échantillon, mais **C dépend principalement du long #58 (+7,8419 USD)** pour rester positive. Le filtre est un **seuil MCB15 ±45, expérimental et potentiellement sévère**, pas une bonne règle démontrée hors échantillon.

**A et B restent strictement identiques, C et D aussi.** Les sorties virtuelles portent toujours `V493_ORIGINAL_EXIT`. Le module superviseur de sortie V494 n'a **encore jamais changé la décision de sortie** ; il est donc trop tôt pour lui attribuer un gain, une perte ou un pouvoir de défragmentation. Dans `modules/attention/v494-exit-module-shadow.js`, le type de sortie originale V493 est testé et rendu **avant** les conditions complémentaires `CONFIRMED_TERRITORY_LOSS_WITH_PRICE_MF`, `NO_SURVIVABLE_ANCHOR...` et `LARGE_MFE_CONVERSION_FAILURE...`. Il faut instrumenter la première preuve adverse as-of **avant** l'EXIT original, plutôt que conclure B=A « aucun problème ».

**Fidélité de la baseline :** le premier trade V494 #57 commence à **76 676,1 BTC$ réel** mais à **76 745,6 BTC$ dans A**, d'où +0,0975 USD net réel contre −1,2617 en A ; #59 et #60 ont aussi des décalages initiaux, #67 est clôturé plus tôt en shadow. Un P&L total presque identique ne prouve pas une réplication exacte de chaque entrée/sortie.

## 6. Shadows V543 sans gain-floor : pistes, mais contre-exemples sérieux

Le shadow **`v543-campaign-hold-shadow-v0.3`** possède déjà **5 politiques prospectives**, le cinquième étant explicitement autorisé sous [OD-20261030-010](operational-decisions/OD-20261030-010/03-origine-et-justification.md) :
- `STRUCTURE_ONLY` (sans floor, sortie structure V541 ou hard-risk), 13 clôtures, net réalisé **−16,9853 USD**, 10 réentrées refusées ;
- `EARLY_INVALIDATION` (sans floor, invalidation précoce corroborée), 14 clôtures, **−17,3874 USD**, 9 réentrées refusées ;
- `TERRITORY_FLOOR_120` (120/90 + niveau de territoire confirmé pour grands mouvements), 23 clôtures, **−27,7055 USD**, zéro réentrée refusée ;
- `BASELINE_PLUS_FAST_INVALIDATION` (floors PAPER + invalidation rapide), 23 clôtures, **−27,3168 USD**, zéro réentrée refusée ;
- `STRUCTURAL_LEVEL_AND_TRANSFER` (**aucun floor**, sortie à **perte démontrée du niveau ET transfert adverse observé**, ou hard-risk), **1 clôture** pour −4,4113 USD, et LONG #123 toujours virtuellement ouvert avec **+6,0167 USD de valorisation provisoire** à la dernière lecture ; **12 nouvelles entrées V5 ont été ignorées** pendant son maintien.

**Ces résultats ne sont pas de même durée ni exposition ; leurs totaux bruts sont incomparables sans marquer la position ouverte et les coûts/occasions évités.** Sur #123, la référence V5 a pris seulement **+0,0313 USD net** ; `STRUCTURE_ONLY` l'a prolongé jusqu'à **+1,7861 USD net réalisé**, tandis que le fork structure+transfert l'a encore ouvert à +6,0167 latent au contrôle. C'est une piste de meilleure continuité de campagne, **pas une réussite encaissée** et pas 12 profits manqués.

**Contre-exemples obligatoires :** #128 rapporte **+0,1337 USD** avec son floor réel mais `STRUCTURE_ONLY` le ferme à **−0,4794 USD** ; le shadow invalidation rapide le ferme à **−3,0154 USD** après un franchissement transitoire. #131 avec floor réel rapporte **+0,0525 USD**, mais `STRUCTURE_ONLY` le prolonge à **−1,9782 USD**. Il serait donc faux de supprimer tous les gain-floors simplement parce que certains fragmentent des campagnes productives.

Les sorties invalidation rapide peuvent réduire des pertes graves : le 30 octobre #120 est à **−10,4166 USD PAPER** contre **−6,1233 USD shadow** ; #121 à **−9,1695** contre **−3,8170**. Mais les deux restent perdantes : le shadow n'implémente pas un fill parfait au niveau initial.

## 7. Elastic et ticker 4×15 : indices utiles, pas encore discriminants

Sur environ **2 800 observations 30 secondes** depuis 30/10 19h37 UTC :
- `POWERFUL_ONSET` : 241 événements évaluables à +15min, **106 favorables (~44 %)** ;
- `POWERFUL_RESOLVED` : 203 évaluables directionnellement à +15min, **90 favorables (~44 %)** ;
- `QUALITY_CONFIRMED_POWERFUL` : 4 évaluables à +15min, 3 favorables ;
- `QUALITY_CONFIRMED_EASY` : **2** évaluables à +15min, 1 favorable ;
- **aucun `EASY_TO_CONTESTED_AT_EXTREME` qualifié** à la dernière lecture.

Les centaines de transitions partagent des campagnes et des prix, elles ne sont pas des épreuves indépendantes. À la dernière lecture, le ticker 4×15 était `ASYMMETRIC_CONTEST`, avec ~99,6 % de couverture. Les classes `EASY`, `POWERFUL`, `CONTESTED`, `EXHAUSTED`, `ABSORBED` n'ont aucune autorité de trading : la bonne question est combien de **temps** elles persistent, à quel **lieu 2h**, dans quelle **campagne parent E15**, et quel **terrain** survit à une contre-attaque.

## 8. Diagnostic causal et protocole suivant — décisions non validées

**Pour V494, priorité à l'admission et à la maturité de campagne.** Le 31 octobre a vu dix admissions toutes perdantes avec MFE moyen 14,1 BTC$, pas dix bons mouvements gâchés par les sorties. Poursuivre en shadow la sélection MCB15 (y compris les faux refus) et identifier les déclencheurs réutilisés sur 3m avant preuves de phase E15/PM, sans transformer ±45 en veto PAPER par ce rapport.

**Pour V543, priorité à l'arbitrage entre protection économique et état de campagne.** Capturer, à chaque future sortie gain-floor, les états V541 **HOLD / EXIT**, étage d'attention, prix vs territoire initial, PM3/5, MF3/15, MA3, répétitions E3, durée depuis inflexion et MFE ; mettre en comparaison la continuation as-of, le prix réellement conservé et les réentrées que la sortie rend possibles. **Un floor automatique à 90 BTC$ proche du point mort doit être évalué dans une politique entière, pas ajusté en aveugle.**

**Pour l'invalidation V543, séparer abandon de POSITION et inversion de CAMPAGNE.** Étudier les cas #120/#121/#127/#130 tardifs, mais aussi les récupérations #128 et les maintiens défavorables #131. Test déjà autorisé : `STRUCTURAL_LEVEL_AND_TRANSFER` doit fournir des exemples indépendants avant toute promotion, y compris combien de requalifications il aurait refusées et la vraie valeur de ces refus.

**Pour les deux :** reconstruire une véritable analyse **par campagne E15** avec P&L **brut, frais, net**, MFE/MAE, survie de l'invalidation, prix défendu, décalage d'entrée, temps de sortie, nombre de réentrées et ombres de portefeuille sur la même horloge. Une étude qui conclut « 9 bons trades » parce que le MFE a dépassé 120 après coup ne prouve ni le meilleur point d'entrée ni une stratégie rentable.

**Aucune modification du trading en production n'est demandée ni effectuée dans ce rapport.** Toute proposition de promotion d'une sortie sans floor / invalidation plus précoce ou filtre entrée devra être approuvée, rejouée as-of, testée avec contre-exemples et documentée séparément avant mise en service.

## 9. Traçabilité et archivage

**Publication canonique de l'audit demandé :** `knowledge/BOONOLAB_analyse_trades_shadows_2026-10-31.md`. L'ancien compte rendu non publié `BOONOLAB_analyse_trades_shadows_2026-10-31_NON_PUBLIE.md` a servi de point de départ conceptuel, mais la nouvelle version **corrige la focalisation sur les P&L agrégés et distingue les jours d'entrée, la véritable priorité des floors et les décisions exactes HOLD au moment de chaque sortie**.

**États de l'intervention :** autorisation de recherche et de publication par l'utilisateur ; enquête en lecture seule et calculs contrôlés ; rapport et registre OD créés ; publication GitHub à constater par commit/push distincts. Aucun service, PAPER, shadow ni règle ne doit être touché dans cette intervention.
