# BOONOLAB — V553 : audit causal des trades #33 à #46

**21 novembre 2026 (CET), fenêtre du 20/11 16h08 au 21/11 11h35.**  
**Statut : OBSERVATIONS / HYPOTHÈSES / RECOMMANDATIONS DOCUMENTÉES. Aucune modification PAPER.**

## Périmètre et preuves

L'utilisateur a explicitement corrigé le périmètre de #36–#46 à **#33–#46 inclus**. Évaluation de premiers résultats prometteurs avec erreurs signalées #36, #40, #41, #42, #44 et opportunité MA3 #45, et bon comportement #43/#46. Sources relues directement sur Amsterdam en lecture seule : data/v553-paper-state.json, v553-paper-decisions.ndjson, boonolab-ticker4x15-samples.ndjson, boonolab-market-snapshots.ndjson, data/v52-paper-state.json, CSV mcb_3m.csv et mcb_15m.csv ; code modules/v553/decision.js, market.js et paper.js. Les classifications de marché sont les derniers relevés **antérieurs** à chaque entrée (~0–4s). Les CSV 3m portent l'ouverture de la bougie ; **leur close n'est connue qu'à ouverture+3min**.

## Résultats PAPER réalisés

**14 clôtures, 6 gagnantes et 8 perdantes.** Brut **+120,4240 USD**, frais aller-retour **20,9444 USD**, net **+99,4796 USD**. Trois principales réussites : #43 +74,9678, #33 +44,9080, #45 +34,2212. Les hard stops de #34/#35/#44 représentent environ **-43,4845 USD nets**.

| # | Direction | Entrée / sortie CET | Net USD | Sortie |
|---|---|---|---:|---|
| 33 | SHORT | 20/11 16:08–17:46 | +44,9080 | Cross15 confirmé |
| 34 | LONG | 20/11 18:09–18:38 | -14,1841 | Hard risk BTC -500 |
| 35 | LONG | 20/11 18:58–19:46 | -14,2646 | Hard risk |
| 36 | LONG | 20/11 19:55–20:03 | -11,3834 | Cross15 Live |
| 37 | LONG | 20/11 20:22–22:15 | +1,2169 | Cross15 confirmé |
| 38 | LONG | 20/11 22:21–21/11 00:33 | +12,5597 | Cross15 confirmé |
| 39 | SHORT | 21/11 00:50–01:30 | -5,7947 | Cross15 Live |
| 40 | LONG | 21/11 01:32–02:02 | -4,1572 | Cross15 Live |
| 41 | LONG | 21/11 02:14–02:30 | -6,6801 | Cross15 Live |
| 42 | SHORT | 21/11 02:48–03:06 | -4,1229 | Cross15 Live |
| 43 | SHORT | 21/11 03:16–05:45 | +74,9678 | Cross15 confirmé |
| 44 | LONG | 21/11 05:51–06:33 | -15,0358 | Hard risk |
| 45 | LONG | 21/11 07:21–09:32 | +34,2212 | Cross15 confirmé |
| 46 | LONG | 21/11 09:39–11:35 | +7,2288 | Cross15 Live |

À 11h44 CET, **#47 SHORT était ouvert** et hors périmètre. Les 31 trades historiques V552 puis #32 LONG hérité à -13,6619 produisent une equity réalisée cumulée de **978,4718 USD** après #46 ; net de la nouvelle politique depuis passation **+85,8177**, différent du net #33–#46.

## SHADOW 4x15 : classifications AS-OF

| Régime ticker à l'entrée | Trades | Gagnants | Net USD |
|---|---|---|---|
| DIRECTIONNEL_PRODUCTIF | #33 | 1/1 | +44,91 |
| SILENCIEUX_PRODUCTIF | #37, #43, #46 | 3/3 | +83,41 |
| STERILE_HESITANT | #34, #35, #36, #38, #39, #40, #41, #42, #45 | 2/9 | -13,81 |
| DENSE_CONTRADICTOIRE | #44 | 0/1 | -15,04 |

**Aucun veto uniforme démontré par ces petites données** : #38 et #45 gagnent malgré STERILE. Les 14 admissions V553 sont toutes classées **EMERGING_DIRECTION** par le moteur, même lorsque le ticker 4x15 mesure une mauvaise conversion du volume en prix conservé. Les deux observatoires ne partagent toujours pas une autorité cohérente de qualité du marché.

## Analyse des cas

### #33 — bonne première campagne SHORT

Entrée à 61 377,9 USD BTC, MCB15 et MCB3 SHORT, LBW15 pente -3,85, PM3 -101,2, ticker DIRECTIONNEL_PRODUCTIF ; sortie à 59 479,9, gain +44,91 USD PAPER. MFE +2 602 BTC USD, mouvement final +1 898, donc environ 704 USD BTC restitués. La chaîne causale dirige correctement le trade. N'en pas déduire un plancher de gains fixe : l'utilisateur a déjà rejeté les floors 120/90.

### #34–#36 — trois pertes LONG successives = -39,83 USD

#34 entre avec pente LBW15 +0,55 et efficacité prix/chemin horaire seulement **0,008**, ticker STERILE, puis hard stop -14,18. #35 entre avec pente **+0,07**, élargissement du gap **+0,05**, ticker STERILE, puis hard stop -14,26.

**#36 est une anomalie de contrat vérifiée** : LONG à 19:55:50, MCB15 Live toujours SHORT, gap LBW-BW **-2,86**, dernier E3 natif SHORT, dernier E15 parent LONG, LBW15 pente +0,51 / gapSlope +0,34, PM Live +48,6, gain de prix depuis chaîne +105,4. La chaîne stocke firstLiveAt=NULL et liveSamples=0 : aucun Cross15 Live LONG dans cette candidature. L'admission est néanmoins permise par la porte EMERGING_DIRECTION. Sortie au Cross15 Live défavorable 20:03, -11,38. Le ticker annonce STERILE_HESITANT.

**Erreur de code** : modules/v553/market.js teste chain.live15At alors que la mémoire stocke firstLiveAt. Ce membre absent laisse systématiquement passer l'alternative vraie du filtre conditionnel. La fonction entryReview utilise (live OR emerging), sans exiger une validation pré-cross spécifique. **Ne pas simplement rendre Cross15 Live obligatoire** : #38 et #46 anticipent le croisement et gagnent. Créer deux contrats explicites : PRE_CROSS_ANTICIPATION (preuves fortes de lieu, conversion et marché) vs CROSS15_LIVE_PRODUCTIF.

### #37 et #38 — continuités acceptables mais conservation partielle

#37 net +1,22 avec MFE +698 USD BTC et mouvement final +105 ; #38 net +12,56 avec MFE +971 et final +548. Ces LONGs naissent aussi avant Cross15 Live haussier ; cette anticipation peut être économiquement valable. Pas de gain-floor automatique, plutôt surveillance du transfert adverse lorsque les prix conquis cessent d'être défendus.

### #39–#42 — trades hachés, net combiné -20,75 USD

**#40** : LONG à 01:32, Cross15 Live effectivement LONG avec pente initiale LBW15 **+7,01**, gapSlope **+6,02**, gap +4,58 ; donc pas « absence de cross » absolue. Mais prix gagné depuis sa nouvelle chaîne **seulement +28,4 USD BTC**, PM Live +5,7, ticker STERILE. Lieu du prix à **75 % de son range 4h basé sur bougies 15m clôturées**, marge à la borne supérieure **300 USD BTC**. À 01:35 LBW15 pente repasse -1,03 ; sortie 02:02 -4,16. L'erreur est l'admission sur croisement peu productif et mal situé.

**#41** : LONG 02:14, PM Live **+0,1 USD BTC**, pente MF3 **-0,38** et ticker STERILE ; le prix est à 80 % du range 4h, seulement 244 USD BTC de marge haute. Plusieurs Cross15 Live LONG avaient déjà été rejetés quelques minutes avant l'entrée. À **02:20 LBW15 pente devient -2,22** et PM Live -74,7 ; à **02:22 MCB3 SHORT**, pente -4,07 et prix ~59 079,9. Pourtant HOLD jusqu'à 02:30, -6,68. **Code : early=false dans exitReview**. L'inflexion défavorable ne déclenche donc aucune sortie pré-Cross15 Live, même accompagnée de dégradation prix/PM/MCB3. Une sortie hypothétique au tick Bâton 02:22 donnerait ~-2,77 USD PAPER, **pas un fill garanti**.

**#42** : SHORT 02:48, dernier **E3 DN natif confirmé à 02:48** (donc ALIGNÉ au SHORT à l'instant d'entrée), MCB15 SHORT, LBW15 pente -1,95, écart MCB3 seulement -1,96, PM Live -5,2, prix gagné depuis chaîne **17,5 USD BTC**, MF3 pente **+0,92 à contrecourant**, ticker STERILE/SILENT. Il ne reste que 111 USD BTC vers la borne basse du range de référence. Dès **02:49 LBW15 pente rebondit +6,41**, MCB3 LONG, PM Live +71,5, puis sortie au Cross15 Live LONG 03:06, -4,12. E3 DN n'était pas contraire à l'entrée ; c'est la conversion qui était faible et le retournement adverse qui arrive juste après.

### #43 — l'apport majeur de la chaîne indépendante par opportunité

SHORT #43 débute 03:16 à 58 952,3 et sort 05:45 à 55 948,5, **+74,97 USD**, MFE +3 418,3 USD BTC, MAE seulement 25,1. Même parent E15 SHORT que #42, mais une NOUVELLE chaîne créée à **03:15:46** après la sortie de #42 à 03:06.

| Preuve as-of | #42 | #43 |
|---|---:|---:|
| LBW15 pente 3m | -1,95 | **-9,22** |
| Ouverture gap 15m | -1,30 | **-4,50** |
| Gap MCB3 Live | -1,96 | **-10,75** |
| PM Live BTC USD | -5,2 | **-11,0** |
| MF3 pente | **+0,92 contraire** | **-1,76 favorable** |
| Qualité ticker | SILENT / STERILE | **EXCEPTIONAL / SILENCIEUX_PRODUCTIF** |
| P&L | -4,12 | **+74,97** |

Le dernier E3 confirmé est encore **UP** lors de l'entrée #43 ; le prochain E3 DN n'est connu qu'à **03:18**. V553 arrive avant ce signal confirmé, grâce à MCB3 Live/MCB15/PM et prix. Il réussit donc à reconstruire une hypothèse après l'échec, sans réutiliser mécaniquement #42. C'est une vraie réussite du contrat.

**V543 #303** : SHORT de 02:55:50 à 07:21:39, net **+73,5813 USD**. #43 V553 fait **+1,3865 USD de plus sur le trade individuel**, mais entre ~21 min plus tard et sort ~96 min plus tôt. Les décisions de V553 #42+#43+#44 combinées donnent **+55,8091 USD**, vs +73,5813 pour V543 #303, sur des fenêtres partiellement différentes. Ne jamais conclure à la supériorité des campagnes en ne comparant que #43.

### #44 — la perte élevée n'est pas une modification de contrat de risque

LONG #44 à 05:51, entrée BTC **56 455,1**, stop à **55 945,4**, net **-15,0358 USD**. Le hard risk V553 vaut **500 USD de variation BTC** ; V543 avait exactement les mêmes **NOTIONAL=1500 USD**, **TAKER=0,0005 par côté** et risque de cours BTC 500 USD. Quand BTC passe de ~63 000 à ~56 000, 500 USD BTC adverse = variation relative plus grande, et le même notionnel exprime un P&L supérieur en USD. Equity réalisée juste avant #44 **952,0576 USD**, perte **1,579 %** de cette equity, notionnel **1,576×** equity. Hard stop exécuté après -509,7 USD BTC de variation, plus ~1,49 USD de frais.

**Autre défaut, bien distinct du sizing :** marché ticker **DENSE_CONTRADICTOIRE / INEFFICIENT** (effort 3,308×P75, rendement 0,322×P75), LBW15 déjà près d'extrême **-92,94**, BW15 **-100,61**, pente haussière seulement **+0,45**, gapSlope +0,30, mais le marché interne déclare EMERGING_DIRECTION et autorise LONG. À 05:54 le LBW15 Live ralentit et s'inverse légèrement (-0,08) avec PM adverse -29,6 ; aucune protection pré-Cross15 Live n'agit, puis hard stop. Une pente -0,08 seule ne justifierait pas forcément EXIT : manque plutôt un examen continu de la perte de conviction et du prix réellement conservé.

**Axes distincts :** risque défini proportionnellement au capital et au cours (sans floor de gains), et vraie invalidation structurelle locale des mauvaises entrées.

### #45 — preuve de la MA3/MA200 3m perdue

LONG 07:21 à 56 140,3 → 09:32 à 57 477,9 : **+34,2212 USD**. Prix de plus forte excursion favorable ~**58 607,2**, mouvement réalisé +1 337,6, donc **1 129,3 USD BTC de déplacement potentiel restitué** (~30 USD de résultat notionnel entre le pic et la sortie théorique au plus haut, sans promettre le fill).

MA200/3m vers **57 713–57 787** selon bar. IMPORTANT : les CSV portent les heures d'ouverture, ci-dessous heures auxquelles la bougie 3m est **clôturée et sa MA connue** :
- 07:51 : close 57 929 > MA 57 713 ; 07:54 : perd MA ; 07:57 : retrouve MA.
- Prix reste principalement >MA jusqu'à 09:00.
- 09:03 : clôture ~**57 768,5 sous MA 57 786,8** ; 09:06 récupère MA ; 09:09 perd MA de nouveau ; 09:12 récupère ; 09:15 perd ; 09:18 récupère ; **09:21 perd**, **09:24 reste plus nettement sous MA (close ~57 575,6 vs MA ~57 784)**.
- V553 sort seulement 09:32 après la clôture Cross15 confirmée.

Sortie hypotétique à la clôture 09:03 : **+41,98 USD net** vs +34,22 réel, soit ~+7,76 PAPER ; à 09:09 ~+39,98 (+5,76) ; à 09:21 ~+41,13 (+6,91). **Pas de fill démontré** : MCB close et prix OKX de sortie simulé ne sont pas interchangeables, et des faux passages sous MA3 existent. La conclusion est que le prix a CÉDÉ durablement un support tactique qui fut accepté, et que V553 peut ajouter une lecture de **perte de support MA3** à exitReview, sans EXIT automatique au premier contact. Le code lit place.ma3 mais **n'utilise pas cette valeur dans exitReview**.

### #46 — pré-Cross15 réussi à préserver

LONG #46 à 09:39:50 prix 57 522,2, sortie 11:35:21 prix 57 857,1, net **+7,2288 USD**, MFE +677,3 USD BTC. Au moment de l'entrée le dernier E15 natif est SHORT, dernier E3 natif SHORT et MCB15 Live est encore SHORT (gap -3,45) ; pente LBW15 +0,48 et gapSlope +0,32. MCB3 Live est devenu LONG, PM Live +24,7, progrès prix +66,9 depuis la chaîne, ticker SILENCIEUX_PRODUCTIF, efficacité historique 0,181. La réussite repose sur une **anticipation**, pas sur une validation Cross15 Live LONG accomplie au moment de l'entrée.

**Cas miroir #36 et #46** : presque même pente MCB15 / gap encore opposé, mais environnement différent : #36 STERILE_HESITANT et sous le bas de son range 4h de référence, #46 SILENCIEUX_PRODUCTIF avec reprise de prix dans le range. Un veto général « pas de Cross15 Live LONG » refuserait #46 aussi.

## Problèmes confirmés du code

1. **Champ inexistant chain.live15At** dans modules/v553/market.js ; champ réellement créé **firstLiveAt**. L'exception emerging contourne l'exigence Live. À reconstituer sans interdire globalement les anticipations gagnantes #38/#46.
2. **EMERGING_DIRECTION trop permissif** : deux relevés Bâton favorables (~30s) suffisent souvent, indépendamment des régimes STERILE ou DENSE et du potentiel structurel restant ; tous les 14 trades étaient dans ce statut. Exiger une preuve de marché réelle, non un simple statut horaire ou une durée arbitraire.
3. **early=false** dans modules/v553/decision.js#exitReview : une inflexion LBW15 adverse ne peut fermer une position sans Cross15 Live persistant ou Cross15 confirmé. #41 et #44 à étudier sans imposer les anciens floors ni une sortie mécanique à la première pente négative.
4. **Lieu incomplet** : la source est le range 4h glissant sur bougies 15m closes, pas la géographie complète du parent E15 et des vagues. #40/#41 près de la borne haute avec 300/244 USD BTC de marge, mais #43 réussit à dépasser une borne basse avec seulement 128 USD BTC de marge ; le lieu doit informer risque/potentiel plutôt que veto mécanique.
5. **MA3 3m ignorée par les sorties** : bon cas #45, avec multiples faux passages à gérer.
6. **Risque en USD PAPER variable** malgré stop constant de 500 USD BTC : notionnel fixe 1500 et BTC plus bas, equity diminuée. Proposer séparément un sizing/risk budget lié à equity, sans jamais réintroduire le floor 120/90 rejeté.

## Comparaison SHADOW et V543

SHADOW ticker 4x15 et market regime sont **observation-only** ; 14 résultats as-of sont trop peu pour calibrer un veto prédictif, et deux trades STERILE ont gagné. Le SHADOW v543-campaign-hold simule **les positions V543**, pas celles de V553. Sur le même intervalle calendaire que les sorties V553 #33–#46, V543 ferme seulement 4 positions, net réalisé **+47,174 USD** contre +99,480 USD sur 14 clôtures V553. Exposition/trades différents : ce n'est PAS un test A/B à conditions équivalentes.

## Priorités proposées, sans modification de moteur pendant l'audit

- **P1 : tester déterministement le bug firstLiveAt** et séparer deux voies de décision : PRE_CROSS_ANTICIPATION avec preuve marché/lieu plus exigeante, et CROSS15_LIVE_PRODUCTIF ; pairs de tests #36 vs #46, #34/#35 vs #38/#45.
- **P2 : marché** : confronter les mesures effort, rendement, persistance, prix conservé, hauteur de vague et position dans le range ; une étiquette indépendante STERILE ne doit pas tuer le retournement #45, mais les deux simples confirmations Bâton ne prouvent pas automatiquement une nouvelle opportunité.
- **P3 : protection pré-Cross15** : mesurer l'invalidation effective des prémisses d'une position après LBW15 pente adverse (cas #41, #44), tout en protégeant les continuations gagnantes.
- **P4 : MA3** : qualifier acceptation/perte/retest sans EXIT au premier toucher, contrefactuels sur #45.
- **P5 : gestion du risque** : proposer un budget de risque en % d'equity/cours, puis validation avant mise en service ; ne pas confondre stop de prix BTC avec stop de capital PAPER.

**Aucune modification de V553 PAPER n'a été effectuée pendant cette analyse ; à 11h44 CET #47 SHORT était ouvert, hors périmètre.**
