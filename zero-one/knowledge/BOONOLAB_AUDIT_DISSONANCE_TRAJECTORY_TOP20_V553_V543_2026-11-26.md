# BOONOLAB — Dissonance prix/MCB, reprises du 25–26 novembre, meilleures campagnes et Trajectory SHADOW

**26 novembre 2026, fenêtre figée 25/11 16h–26/11 14h30 CET. Audit en lecture seule ; aucune modification PAPER ou SHADOW.** Demande : analyser les derniers trades déphasés, le contexte E15/E1/E4 de la reprise, comparer les 20 meilleurs résultats et vérifier la nouvelle mémoire géométrique.

## Sources et limites
Ledgers v553-paper-state.json, v52-paper-state.json et fichiers trades NDJSON (archives incluses) dédupliqués par numéro, uniquement politiques d'entrée V5.5.3 et V5.4.3. 115 et 267 clôtures respectivement à la coupure. Les positions ouvertes sont exclues. Bâton audit-14d : 40 311 observations brutes disponibles du 12/11 14h32:53 au 26/11 14h29:57, échantillonnées ~30s ; champs live15LbwRaw/live15BwRaw. CSV MCB 3m/15m/1h/4h disponibles au plus tôt à la clôture, pas l'heure exacte de première réception. Observations SHADOW jointes asOf <= entryAt/exitAt, âge max 95s. Prix d'exécution et prix Bâton peuvent différer notablement en marché rapide. MFE/MAE ledger plus fins que Bâton. 20 meilleures clôtures nettes combinées (sélection après résultat), puis 20 par moteur pour comparaison équilibrée ; historique brut disponible pour 17/20 combinées, 20/20 V553 et 14/20 V543. Ticker historique incomplet (dont UNCLASSIFIED). Pas d'échantillons indépendants, ni preuve prédictive/contrefactuelle.

## Résultats réalisés
| Périmètre | V553 | V543 |
|---|---:|---:|
| Depuis audit #113/#329 | #114–147, 34 clôtures, 8 gagnants, -87,0480 $ | #330–346, 17 clôtures, 2 gagnants, -70,9169 $ |
| Clôtures depuis 25/11 16h | 19, 4 gagnantes, -39,6928 $ (brut -11,1662, frais 28,5265) | 7, 1 gagnante, +2,9795 $ (brut +13,5059, frais 10,5266) |
| Entrées depuis 16h et clôturées | 18, -31,4960 $ | 7, +2,9795 $ |
| LONGs / SHORTs depuis 16h (clôtures) | 7 +10,62 / 12 -50,31 | 3 +28,80 / 4 -25,82 |
V553 #129 ouvert avant 16h. Capital observé 768,3991/659,6472 $ ; V543 #347 ouvert, V553 flat au contrôle 14h30. 

## Structure réelle
BTC dernier échantillon à/before 16h 58 191,2 $, à 14h30 60 838,6 $ ; première observation strictement dans fenêtre 58 300,2 $ ; min/max échantillonnés 57 700,9/61 490,9. Clôtures 1h 58 208,7 → 60 801,4 ; progression par paliers puis range. Bâton 2699 échantillons, chemin absolu 70 769,4 $, net +2538,4 entre premier/dernier de la fenêtre.
E1 DN initial ; E1 UP confirmé 25 17h (LBW -78,5), LBW monte à +49,4 à 26 06h ; E1 DN 07h, UP 11h, DN 12h. MF1 reste négatif, de -31,2 à -22,6. E4 DN initial, UP confirmé 25 21h (LBW -47,1), puis LBW -29,6 (01h), -11,5 (05h), +0,1 (09h), +8,4 (13h), MF4 -25,9→-18,9. E4 UP et E1 UP pendant la majeure partie de la montée nocturne ; après 07h conflit. 21 E15 natifs confirmés dans la période. V543 parent géométrique #340/#341 long 25 15h30, #342 short 19h15, #343/#344 short 26 01h15, #345 long 08h00, #346 short 11h00. Ne pas confondre l'ancre de fond du marché avec les parents effectivement remplacés par les moteurs.

57 Cross15 Live bruts nés dans la fenêtre, 56 segments achevés (28 déplacements nets opposés), dont 23 durent >=5min et 14 de ces 23 sont opposés. 19h30–20h15 DN : BTC +403 ; 20h43–21h56 DN : +359 ; 01h45–02h20 DN : +186 ; 02h30–02h54 DN : +116. 17h57–19h29 UP +1165 et 06h39–08h29 DN -400. Signes déplacement BW/LBW vs prix 15m glissant : 40,6% / 26,9% opposés globalement ; 02h–06h39 50,9% /29,2%. Fenêtres superposées. Ce n'est pas un seuil d'admission.

## Erreurs déterminantes
| Moteur # | Entrée → sortie CET | Net USD | MFE BTC$ | Diagnostic |
|---|---|---:|---:|---|
|553 129 SHORT|25 14h36→16h02|-8,20|1010,9|Sommet de gain vendeur puis 1209 BTC$ restitués depuis creux Bâton 15:44:54 à 57338,6 ; Cross UP 16:01:24 à 58320|
|543 338/339 LONG|25 13h37 / 15h25|-14,69 / -15,31|189,9 / 29,4|Deux hard risks avant reprise ; #339 LONG malgré Cross DN brut naissant ; parent géométrique LONG|
|553 130 SHORT|25 16h11→16h26|-8,19|116,9|Cross UP depuis 10 min, LBW3 DN mais LBW15 15min UP ; vend après grand recul|
|553 131 LONG|25 16h37→16h45|-14,98|45,4|58607,2, rang 45m 99,9%, PM3 +392,9 ; hard risk -527,1 BTC$ ; même initiative que #132|
|553 132 LONG|25 17h11→19h57|+30,33|1566,8|58503,8, reprise après respiration, même initiative UP-20 ; conserve 79,3% excursion|
|543 340 LONG|25 17h01→17h40|-0,31|585|Restitution majeure, Cross encore UP à sortie|
|543 341 LONG|25 17h51→21h30|+35,66|2021,6|Nouvelle initiative UP-21 3 min, Cross encore DN, anticipe vrai UP 17:57:24|
|553 133 LONG|25 20h17→20h44|-7,43|206,3|Cross récent mais prix à 97,2% range45m, retour haut ; POWERFUL|
|553 134 SHORT|25 20h59→21h57|-13,57|92,2|59868,3 près bas local, Cross DN dont phase se termine +359 BTC$ contre SHORT ; E1 UP, E4 devient UP à 21h|
|553 137 LONG|26 00h20→02h27|+9,51|1258,5|Conserve 35,2% ; prix sommet Bâton 01:16:54 à 61490,9, Cross DN 01:45:24 à 60596,4, sortie 02:27:59 60713,6|
|553 143 SHORT|26 06h39→09h03|+6,46|588,3|60938,3, Cross DN à 06:39:25 60944,5 ; conserve 55%|
|543 344 SHORT|26 07h18→09h10|-8,04|29|60383,7, même initiative DN-35 et même Cross DN 39,2min plus tard, prix déjà -560,8 BTC$ depuis Cross, rang45m 2,2%, POWERFUL|
|553 144 LONG|26 09h20→11h32|+1,29|364,3|Conserve 31%, Cross UP 08:34:27 ; sommet 09:50:27 61028,9|
|543 345 LONG|26 09h10→11h45|-6,56|400,2|Même initiative UP-32, Cross DN 10:30:27 à 60765,8 ; sortie 60435,2 75min après Cross|
|553 145 SHORT|26 11h36→12h42|-1,28|304,6|60739,9, excursion rendue ; conversion effort 5,386×P75, rendement 0,059×|
|543 346 SHORT|26 11h45→12h24|-6,55|0|60446,6 au creux du range, même initiative DN-37 ; effort 8,594×, rendement 0,035× ; prix déjà -387,4 depuis Cross|
|553 147 SHORT|26 14h00→14h21|-3,35|28,5|Cross UP depuis 22,6min ; LBW3 -0,457/min mais LBW15 +0,971 et BW15 +0,501 ; parent E15 UP|

V553 paper.js lignes 146–154 : MFE actualisé, hard risk -500 puis sortie décisionnelle. **Aucun plancher 120/90 actif dans cette version** ; ne pas supposer qu'il protège encore les bénéfices. Aucune modification effectuée. 

## 20 meilleures clôtures combinées
| Moteur # | Net $ | MFE BTC$ | Fraction réalisée du MFE | Âge dernier Cross Live (min) |
|---|---:|---:|---:|---:|
|553 43|74,97|3418|87,9%|3,5|
|543 303|73,58|3797|77,7%|25,6|
|543 307|55,41|2885|76,3%|0,1|
|543 173|51,03|3637|76,2%|ND|
|543 320|50,75|2705|81,7%|41 (UP contre SHORT)|
|553 49|47,81|2664|71,9%|42,6|
|553 33|44,91|2602|72,9%|15,5|
|543 233|44,38|2580|84,3%|1,2|
|543 310|41,68|2169|78,5%|67,1|
|553 61|40,04|2161|75,8%|46,5|
|543 165|38,45|2752|75,9%|ND|
|543 243|36,72|2128|80,4%|33|
|543 341|35,66|2022|71,6%|6,6 (DN contre LONG)|
|553 45|34,22|2467|54,2%|111|
|553 90|34,03|1832|81,5%|8,1|
|553 132|30,33|1567|79,3%|70|
|553 58|23,94|1049|97,3%|0,1|
|543 161|23,06|1817|69,8%|ND|
|543 322|21,70|1856|51,0%|1,3|
|553 102|21,08|1783|51,7%|2,5|
Total +823,75 ; MFE médiane 2318,2 BTC$, fraction réalisée médiane 76,2%. Cross aligné 15/17, pente LBW3 alignée 17/17, pente LBW15 alignée 13/17, BW15 alignée 11/17, E15 natif aligné 11/17, E1/E4 tous deux alignés 3/17 ; 16/17 sorties polarité Live opposée. ND faute d'archives Bâton historiques. Ticker disponible/qualifié inégalement ; parmi les 17 couverts : 7 stériles, 5 denses, 3 silencieux productifs, 2 directionnels productifs. Donc pas de veto de régime statique.

## Comparaison équilibrée top20 par moteur contre pertes récentes
| Mesure | 553 top20 | 553 15 pertes | 543 top20 | 543 6 pertes |
|---|---:|---:|---:|---:|
|Bâton couvert|20|15|14|6|
|Cross aligné|16/20|11/15|12/14|6/6|
|LBW pente 3m alignée|20/20|15/15|12/14|6/6|
|LBW pente 15m alignée|15/20|10/15|10/14|6/6|
|BW pente 15m alignée|15/20|8/15|7/14|6/6|
|E15 natif aligné|11/20|7/15|8/14|6/6|
|E3 natif aligné|13/20|11/15|8/14|5/6|
|PM3 aligné (contexte moteur)|20/20|15/15|13/14|6/6|
|MF3 variation alignée|17/20|14/15|14/14|6/6|
|MF15 variation alignée|15/20|11/15|10/14|6/6|
|E1+E4 alignés|4/20|4/15|1/14|0/6|
|Âge Cross médian min|13,05|10,1|11,8|37,65|
|Déplacement signé depuis Cross médian BTC$|113,4|58,6|66,45|198,9|
|Ce déplacement / médiane amplitude 20 dernières bougies 15m|0,46|0,23|0,33|0,75|
|Rang directionnel 45m médian %|85,7|82,8|77,3|85,8|
|Au-delà 90% rang directionnel|9/20|7/15|5/14|2/6|
|MFE médiane BTC$ (ledger entier)|1010|113,2|1836,7|80,5|
|Fraction signée MFE médiane (hors MFE=0)|54,6%|-157,4%|76%|-146%|
|Délai médian sortie depuis extrême Bâton en position min|45,5|18,1|48,9|34,6|
|Sortie Cross opposé|20/20|14/15|11/14|3/6|
Top20 V553 +409,33 ; V543 +601,48. Les mesures d'entrée sont as-of ; MFE/rétention/délai sont après décision. Rang directionnel = rang prix long, 100-rang short. Confluence des signes ne discrimine pas ; retard spatial plus net chez V543 ; les meilleures campagnes ont souvent un temps absolu de sortie plus long, parce qu'elles développent une excursion plus grande. Ne pas assimiler délai seul à mauvaise sortie.

Dissonance antérieure 2h (médiane par entrée, déplacements 15m superposés) : BW opposée au prix top20/pertes V553 43,8%/45,8%, V543 37,5%/34,8%. Nombre médian segments Cross opposés parmi trois derniers achevés : V553 1/2, V543 2/1. Ne discriminent pas globalement ; #143 gagnant malgré 59% BW opposée sur 2h. Pas de veto simple.

## Trajectory SHADOW prospectif
Au contrôle 26 14h30 : 5323 observations Live +959 bootstrap ; 2699 Live dans la fenêtre, espacement max 61,813 s ; 1704 événements uniques par id : 442 tentatives locales, 31 nouvelles initiatives, 57 Cross Live, 21 Cross confirmés, 21 E15 natifs, 169 Cross3, 563 changements de relation à une référence de prix, etc. Couverture à l'entrée et sortie 26/26 clôtures. Le SHADOW ne simule aucun ordre. À l'entrée, ouverture dans le sens du trade pour 4/4 gagnants et 11/15 pertes V553 ; 6/6 pertes V543, #341 gagnant en rapprochement pré-Cross. Diagnostic local non discriminant. #131/#132 initiative UP-20 (âge 58,5/93 min) ; #143/#344 initiative DN-35 (âge 1/40 min) ; #144/#345 UP-32 ; #145/#346 DN-37. #344 : origine 40min, progression +592 BTC$, Cross 39min +560,4, retenu 97,4%, réévaluation proche d'un creux. #346 : initiative 65,5 min, +425,1 depuis origine, Cross 23min +363,1, ancien prix 60455,5 revisité, LBW +41,33 et BW +62,04 par rapport à référence ; attention différence prix Bâton/fill. #147 rapprochement DN contre Cross UP. Ces observations relient les décisions sans utiliser le ledger. Les initiatives sont convention de segmentation, pas thèse validée ; retour près d'un extrême n'est pas preuve de défense. Anciens filtres praticabilité : variant le plus large signale seulement #130,139,146 V553 sur 15 pertes et #343 V543 sur 6 ; aucune des 5 réussites, mais échantillon insuffisant. Régime 1908/2687 stériles/denses, 71,0%.

## Conclusion et prochaine hypothèse
Distinguer désynchronisation de la direction, décalage spatial par rapport à l'inflexion et au Cross, incapacité des offensives à conquérir/conserver, et protection après excursion. Développer en SHADOW un diagnostic continu de dissonance relatif à l'initiative et aux territoires : comparer le prix depuis origine, Cross et ancien extrême ; conserver les preuves successives de transfert ou de restitution ; surveiller le renouvellement réel de l'espace et l'autorité E1/E4, ne pas compter leurs signes comme des votes. Une suspension éventuelle des **nouvelles admissions**, non des protections, ne doit être envisagée qu'après validation prospectivement et en replay sur meilleures campagnes. Ne pas réduire à un seuil BW/prix, à un veto de régime ou à un compteur de pertes. Aucune suspension ou modification de moteur ordonnée.

Contrôle technique : les trois PM2 V543, V553 et market-regime-shadow ont de nouveaux PID depuis 26/11 07h41 CET ; machine non redémarrée selon uptime, cause du redémarrage PM2 non investiguée. État de Trajectory conservé, données fraîches, brokerOrdersEnabled=false. Pas de nouvelle intervention sur services.
