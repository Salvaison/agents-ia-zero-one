# BOONOLAB — Audit trajectoires BW/LBW, Cross15, prix et soutiens : V553 #90–113 / V543 #320–329

**24 novembre 2026, relevé ~16h37 CET. Analyse en lecture seule sur Amsterdam. Aucun moteur, paramètre, service, ledger ou SHADOW modifié.**

## Mandat
Le propriétaire refuse de réduire la dynamique du marché au lobe V3 à quatre points : comprendre la trajectoire entière BW/LBW, sa déformation, les inflexions et croisements Live/confirmés, la trajectoire prix, les territoires reconquis, le soutien E3, PM, MF, E1. Le lobe peut décrire la forme, il n'est pas une nouvelle autorité. Comparer les deux moteurs depuis l'ouverture V553 #90 et inclure toutes les clôtures disponibles. Deux échanges fournis : audit nocturne #90–107 et réanalyse Cross15/E15 du 23/11.

## Sources et conventions
PM2 : V553 et V543 online ; V494/V55/V551/V552 arrêtés. Ledgers data/v553-paper-state.json et data/v52-paper-state.json, Bâton data/audit-14d/audit-2026112[34]T*.ndjson(.gz), CSV 3m/15m/1h/4h de data/mcb-live (racine du dépôt). 3351 relevés Bâton (4h préalables incluses), pas de valeur brute manquante sur les champs requis, pas maximal 30,066 s, dernier relevé exploité 24/11 16:36:52. Fenêtre depuis 23/11 16:41:24. Polarité Live = signe de live15LbwRaw−live15BwRaw ; les champs non Raw peuvent conserver la dernière clôture et ne retracent donc pas l'évolution Live. Cross = changement de signe échantillonné, non tick exact ni preuve automatique d'un événement natif. CSV confirmés disponibles au plus tôt à clôture ; distinguer parent géométrique de V543 et dernier E15 natif. MF15/3 et PM3 d'entrée viennent des contextes des moteurs, dont les fenêtres peuvent différer ; valeurs brutes Bâton et contextes ne sont pas interchangeables. E1/E4 natifs en contexte, pas veto. Prix des extrema échantillonnés et MFE ledger de cadence fine distincts. Pas de fit Bézier inventé, ni de replay contrefactuel. Analyse de changements, amplitudes, retours et signes à horizon 15m sur l'intégralité des relevés, avec exemples sélectionnés.

## Résultats
V553 #90–113 : 24 clôtures, 3 gagnantes, brut -19,4692 USD, frais 35,9730, net -55,4422. V543 #320–329 : 10 clôtures, 5 gagnantes, brut +65,2156, frais 14,9683, net +50,2474. #320 commence avant #90 : V543 #321–329 uniquement = -0,5001. #114 V553 et #330 V543 encore ouverts au relevé (hors réalisé). #91–101 = -66,9285 ; #103–107 = -13,4549 ; #108–113 = -30,1694 ; #324–329 V543 = -25,1118. Les groupes #103–107/#323 et #108–113/#324–329 ne sont pas des fenêtres parfaitement synchrones : #324 commence avant clôture #107.

## Matrice individuelle
U=UP/LONG, D=DN/SHORT. Cross brut + âge en minutes à l'entrée ; E natifs = E15/E3/E1/E4 dans cet ordre, connus au plus tôt à la clôture. PM3 en BTC$, MF15/MF3 = variations signées du contexte d'entrée. MFE en BTC$, net PAPER USD. Horaires CET. Pas de conclusion prédictive par simple confluence.

| V553 | Sens | Entrée→sortie | Prix entrée→sortie | Cross/âge | E natifs | PM3 | MF15/MF3 | MFE | Net |
|---|---|---|---|---|---|---:|---|---:|---:|
|90|D|23 16:41→20:15|63055→61563|D 8,1|DDUU|-87,1|-0,6/+2,0|1832|+34,03|
|91|D|20:37→21:15|61090→61374|D 0,6|UDDU|-290|-0,8/+2,4|326|-8,49|
|92|D|21:25→21:30|61129→61225|U 25,6|UDDU|-82,7|-0,8/+0,1|101|-3,86|
|93|D|21:36→21:39|61115→61199|U 36,0|UUDU|-115,3|-2,5/-0,6|20|-3,57|
|94|D|21:53→21:57|61060→61250|U 53,6|UDDU|-60,7|-3/-4,1|11|-6,17|
|95|U|22:00→22:45|61320→61131|U 60,6|UUDU|75,9|-0,3/+2,5|110|-6,10|
|96|U|22:58→23:07|61309→61208|D 13,5|UDDU|107,6|+0,8/+0,7|8|-3,97|
|97|U|23:19→23:33|61295→61147|U 0,0|DDDU|118,2|-0,1/+0,1|69|-5,11|
|98|D|23:43→24 00:00|61130→61344|D 13,0|UDDU|-58,2|-0,2/+0,9|72|-6,76|
|99|U|00:28→01:02|61548→61226|U 28,0|UUDU|129,2|+0,4/+4,8|15|-9,35|
|100|D|01:32→01:57|61107→61310|D 47,0|DUDD|-114|-0,8/-2,9|82|-6,48|
|101|U|02:08→02:47|61495→61266|U 11,5|UUDD|111,2|+3,5/+1,7|156|-7,07|
|102|D|02:49→04:46|61210→60289|D 2,5|UDDD|-98,3|-1,3/-1,3|1783|+21,08|
|103|U|04:48→07:15|60342→60421|U 18,6|UUDD|56,4|+2/+0,6|398|+0,46|
|104|U|07:19→07:24|60520→60371|D 17,6|DDUD|110|-1/+0,6|54|-5,19|
|105|U|07:49→08:00|60450→60429|D 47,6|DUUD|38,4|+0,8/+0,7|142|-2,02|
|106|D|08:14→08:46|60381→60446|D 5,1|DDUD|-82,3|-0,3/-3,7|113|-3,11|
|107|D|09:05→09:45|60312→60396|D 8,6|DDUD|-58,1|-0,7/-3,8|258|-3,59|
|108|D|10:02→11:07|59937→60036|D 2,6|UDDD|-295,9|-2,1/-0,8|181|-3,98|
|109|D|11:30→12:28|59795→59830|D 2,6|DDDD|-147,5|-0,8/-4|428|-2,39|
|110|U|12:33→14:12|59871→59829|U 16,0|UUDD|18,6|+1,4/+2|743|-2,54|
|111|U|14:36→14:51|60168→60063|D 27,0|DDUD|168|+1,2/+2,5|17|-4,11|
|112|D|14:53→15:03|60075→60377|D 43,5|DUUD|-52,9|+0,5/+0,1|146|-9,05|
|113|U|15:11→16:06|60336→60071|U 9,5|DUUD|160,3|+1/+1,6|269|-8,10|

| V543 | Sens | Entrée→sortie | Prix entrée→sortie | Cross/âge | E natifs | PM3 | MF15/MF3 | MFE | Net |
|---|---|---|---|---|---|---:|---|---:|---:|
|320|D|23 15:37→20:55|63457→61248|U 41,0|UDUU|-124,7|-1,6/-3,1|2705|+50,75|
|321|U|21:43→24 02:43|61240→61435|U 43,6|UUDU|5,9|+0,1/+2,5|415|+3,27|
|322|D|02:48→05:09|61287→60339|D 1,3|UDDD|-170,8|-1,1/-2,1|1856|+21,70|
|323|U|05:09→09:03|60329→60375|U 39,4|UUDD|73,2|+0,7/+2,4|411|-0,35|
|324|D|09:09→12:00|60215→59806|D 12,2|DDUD|-103,9|-1,8/-4,3|848|+8,71|
|325|U|12:25→13:14|59710→60213|U 7,6|DDDD|142,9|-0,1/+1,7|718|+11,13|
|326|U|13:45→14:09|60552→60051|U 87,8|UUUD|180,2|+2,4/+3,4|0|-13,90|
|327|D|14:12→14:26|59835→60180|D 2,8|UDUD|-233,7|-1,5/-3,8|105|-10,15|
|328|U|14:26→14:57|60172→59960|D 16,4|DUUD|-2,6|+0,5/+1,7|16|-6,77|
|329|D|14:57→15:02|59970→60475|D 47,8|DDUD|-80,5|-0,5/-4,3|37|-14,14|

#325 possède E3 Live UP effectivement observé, avant E3 confirmé 12:27. Le directeur géométrique V543 peut être différent du dernier E15 natif. Les #92/93/94/96/104/105/111 V553 entrent à contre-polarité Live brute sans vrai Cross du sens de l'entrée. Cela n'est pas un veto universel : #320 V543 constitue le contre-exemple gagnant. #97 V553 entre sur la première observation Live.

## Chronologie et mémoire des territoires
**23/11 première descente** : 15:26:51 BTC 64505,6 LBW/BW 50,0/29,3 ; 15:36:51 BTC 63391 et 54,6/45,5 : hausse BW plus rapide malgré perte prix, contraction +20,7→+9,1. #320 V543 SHORT 15:37, TACTICAL_RESPIRATION, parent LONG, E3 DN 15:33, PM5 -420,6, MF3/15 DN, swing haut causal 63873, pas de territoire défendu à l'entrée. Cross DN 15:48:51 et E15 DN 16:00. #90 sur nouveau Cross DN 16:33:21, chaîne propre 16:40:21, entrée 16:41:24. E1 DN 18:00. BTC creux 19:44:51 61291,2 ; UP 20:00:51. #90 sort 20:15, #320 tient à travers l'UP et nouveau DN 20:36, sort 20:55. #91 obtient 326 de MFE avant restituer toute la baisse.
**Nuit** : UP 21:00:21–22:44:51, LBW/BW -48,6/-50,4→-26,4/-31,0, prix -68,3. #92–94 SHORT sur ralentissement local, #95 LONG sur un Cross vieux de 61min, #96/97/98 sur inversions brèves. #99 +308 BTC déjà parcourus depuis Cross, rang45m 100% ; #100 rang45m 1,7% ; #101 rang45m 100%, +206 depuis Cross. 21:26:51 BTC 61057,4 LBW/BW -49/-50 ; 21:53:51 61060,1 -46,5/-46,7 ; 01:36:21 61050,6 -29,8/-21,7. 00:29:21 BTC 61551, LBW/BW 0,9/-19,6 ; 02:24:51 BTC 61549,4 LBW/BW 27,2/7,6. Les mêmes territoires sont revisités à des hauteurs géométriques différentes : prix non conquis malgré amplitude MCB. #321 V543 tient parent LONG sur 61119,7 défendu malgré E1 DN et E4 DN 01:00 ; E3 confirmé UP, PM5 +62,4. Gain modeste, pas prédiction des oscillations.
**02:11→04:45** : BTC 61633,5→61463,4 entre 02:10:51 et 02:42:51, LBW 12,3→34,8, BW -7,8→24,2, MF15 -8,8→-4,3 : BW rattrape LBW malgré perte de prix. #321 sort 02:43 sur MA3/MF/prix. Live DN 02:47:21 BTC 61284,8 ; #322 02:48:37 à 61286,5 et #102 02:49:54 à 61210,1. E15 DN confirmé 03:00. E1/E4 DN, E3/PM/MF favorables. V543 parent LONG, REVERSAL_FORMING, MA3 acceptée. Creux 04:17:52 59477 ; Live UP 04:30:22 à 60183 (+706), sorties tardives : les deux conservent environ moitié MFE.
**Matin** : LBW remonte de -63,8 à 9,7 (04:30→07:02) mais le prix seulement 60183→60448 au prochain Cross DN, maximum 60736,5 à 06:33. #103/#323 rendent quasi tout. E1 UP confirmé 07:00, E4 DN ; #104/105 longs sur pente courte UP contre trajectoire 15m DN. #106–107 shorts partiellement productifs puis rendus. #324 V543 avec territoire 60405,2 défendu, maintient à travers Cross UP non productifs. #108 short après -601 BTC en 15m ; E1 DN à 10:00, E15 natif UP. UP 10:40:52 à 60210,8 → segment -243,9. #109 MFE 428 au creux 11:53:22 59424,8 ; #324 sort 12:00 à 59805,5 au Cross UP, #109 attend jusqu'à 12:28. #107–109 = -9,96 vs #324 +8,71, fenêtres non parfaitement identiques.
**12:17→14:09** : Cross UP 12:17:52 à 59582,6 (LBW/BW -76,9/-77,2). #325 V543 E3 Live UP, 59546 défendu, entre 12:25 59709,9 avant E15 UP 12:30 et E1 UP 13:00. #110 entre 12:33 à 59870,5. BTC 60423,5 à 12:54:52, LBW/BW -32/-53,7. #325 sort 13:14 à 60212,9. #326 rachète 13:45:37 à 60552, +969,4 depuis Cross, 100% rang45m, MFE 0 ; E3/PM/MF/MA3/E1 soutiennent pourtant. Hard risk. #110 maintient et rend MFE 743. #325+#326 -2,77 vs #110 -2,54. Ni maintien aveugle ni sortie suivie de réadmission aveugle ne résolvent maturité.
**14:09→16:36** : Live DN 14:09:52 BTC 60116,8, LBW/BW 18,3/18,3 ; #327 short après -281,5 en 2,8min, rang45m 0%. Phase DN jusqu'à 15:01:22, min/max 59787,3/60216,7, déplacement net -1,2. #328 et #111 LONG contre Cross DN (V543 parent géométrique LONG, 59912,4 retest défendu mais MA3 perdue ; #111 E3 natif DN). #112 et #329 shorts dans la même phase stérile, #329 hard risk. UP 15:01:52, #113 15:11, nouveau sommet 60565,8 à 15:30:52. Comparer 13:45:22 BTC 60543,2 LBW/BW 24,4/12,4 et 15:30:52 BTC 60565,8 LBW/BW 30,3/17,3. 16:05:52 BTC 60124,1 LBW/BW 27,4/27,2 : BW augmente alors que prix rend 442, MF15 s'améliore. E1 UP confirmé 13:00, LBW1 -55,2→-33,3, MF1 -12→-4,8 à 16:00 ; E4 DN. #326–329 V543 et #111–113 V553 perdants : la mémoire V543 seule ne résout pas la contradiction temporelle-spatiale.

## Opposition des trajectoires — mesure sur tous les relevés des fenêtres
Comparer signe du déplacement prix et de chaque courbe brute pendant les 15 minutes précédant chaque relevé. Fenêtres superposées, pourcentages descriptifs, pas observations indépendantes, ni seuil proposé.
| CET | N | BW opposée | LBW opposée | les deux | MF15 opposé |
|---|---:|---:|---:|---:|---:|
|23 16:41–20:00|398|23,6%|21,9%|18,3%|46,0%|
|23 21:00–24 02:47|694|33,0%|26,5%|21,6%|28,7%|
|24 02:47–04:30|206|23,8%|11,2%|11,2%|11,2%|
|04:30–07:02|304|39,8%|27,6%|26,6%|37,2%|
|07:02–12:17|630|40,0%|20,8%|17,5%|30,0%|
|12:17–14:09|224|27,7%|26,3%|26,3%|22,3%|
|14:09–16:36|294|48,6%|24,5%|24,1%|55,8%|

## Conclusion / hypothèse non validée
Ne pas transformer lobe, Cross, MF, E1 ou contradiction BW/prix en veto mécanique. Cas gagnants #320/#325/#102/#322 montrent la nécessité d'anticiper. Ne pas compter deux relevés de candidature comme maturité de la figure entière. Distinguer écart, vitesse et accélération propres BW et LBW, âge véritable du Cross, translation prix, prix conservé après attaques, reconquêtes de territoires à différentes hauteurs, soutien E3/PM/MF/E1/E4 dans leur chronologie. V543 préserve mieux une hypothèse à travers des Cross stériles (#321/#324) mais échoue après #325 ; V553 suit trop de tentatives et protège mal les mouvements réellement captés. Étendre l'interpréteur géométrique SHADOW existant par une mémoire des tentatives et des territoires, pas de nouvelle politique. Comparer aux campagnes V494/V543 gagnantes et #43/#58/#61 V553, tester as-of puis prospectivement sans seuil imposé. Pas de preuve de meilleure rentabilité contrefactuelle. Publication documentaire uniquement.

