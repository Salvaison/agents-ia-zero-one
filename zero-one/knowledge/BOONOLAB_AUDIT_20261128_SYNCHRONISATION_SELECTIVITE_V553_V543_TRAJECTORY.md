# BOONOLAB — Synchronisation, sélectivité et maturité économique V553/V543 (28 novembre 2026)

**Audit en lecture seule.** Fenêtre figée du 26/11 14h30 au 28/11 15h52 CET. Demande : expliquer les trades déphasés, tester 3–4 bougies après Cross15 ou 100 BTC$ déjà parcourus, renforcer la qualité sans sacrifier les vraies campagnes et exploiter les observations de Trajectory SHADOW. Aucun changement de moteur, risque, admission, sortie, SHADOW, service ou UI. La proposition de synchronisation continue est une hypothèse de recherche, non une autorisation de modifier les politiques.

## Provenance et méthodes
Ledgers PAPER et NDJSON des politiques d'entrée V5.5.3 / V5.4.3, dédupliqués par numéro ; résultats nets de frais. Cross Live = changement de signe de live15LbwRaw-live15BwRaw, observé Bâton ~30s, non tick exact ; âge du dernier Cross brut, signe et prix distincts de candidature interne. Déplacement signé = sens trade × (prix du fill − prix Bâton au Cross). Les variantes d'expiration ci-dessous ne s'appliquent qu'aux entrées dans la polarité actuelle du Cross, pas aux anticipations/entrées opposées ; seuil 100 BTC$, non P&L de position. Rang directionnel 45m = rang prix LONG, 100-rang SHORT, range incluant prix d'entrée. CSV confirmés disponibles au plus tôt à clôture (proxy historique). Pentes calculées sur 3/15/60m ; MF/PM propres à chaque moteur peuvent employer des fenêtres différentes. MFE ledger à cadence fine, extrema Bâton échantillonnés, délai sortie depuis premier Cross adverse observé après meilleur prix Bâton en position. Pas de replay alternatif des entrées/sorties : somme des résultats effectivement réalisés des sous-ensembles, sans hypothèse de réinvestissement ni réadmission. Échantillons sélectionnés par résultat ou chevauchants, pas une validation hors échantillon.

Archives Bâton disponibles 14/11 15h51:36 à 28/11 ~15h52, 40316 observations pour reconstruction initiale ; 5922 observations dans la fenêtre de marché (archive relue un peu après, coupure inchangée). Ledgers : 159 transactions V553 de sa politique (115 avant la coupure initiale, 44 nouvelles), 284 V543 (267 avant, 17 nouvelles). Couverture des caractéristiques d'entrée : 159/159 V553, 120/284 V543 (103 historiques +17 récentes). Top20 de référence figé au 26/11 dans data/research-briefs/audit-20261126/boono-audit-20261126.json : couverture historique déjà enregistrée 20/20 V553 et 14/20 V543, même si certaines données brutes ont depuis expiré. Résultats détaillés récents et historiques : data/research-briefs/audit-20261128/boono-audit-20261128.json, boono-allr-20261128.json, scripts/logs associés et segments.

## Bilan
| | V553 #148–191 | V543 #347–363 |
|---|---:|---:|
|Clôtures|44|17|
|Gagnantes|7|3|
|Net|−87,6647|−56,6600|
|Brut|−21,6809|−31,1557|
|Frais|65,9838|25,5042|
|Exposition clôturée dans fenêtre, min|2402,9|1538,6|
|LONG|22 / 2 gagnants / −60,1635|10 / 2 / −26,2734|
|SHORT|22 / 5 / −27,5012|7 / 1 / −30,3866|
V543 #347 commencé avant fenêtre ; 16 clôtures de nouvelles entrées −52,8886. Positions ouvertes #192/#364 exclues, capitaux observés 680,7344/602,9872. De 27/11 04h35 à 15h26, 13 nouvelles entrées V553 toutes perdantes −64,9054 ; 5 V543 toutes perdantes −23,5662. Frais expliquent l'avantage net V543 malgré brut plus mauvais. Pas de prétention à supériorité cumulative.

## Marché et contexte supérieur
Prix dernier Bâton avant début 60838,6, vers fin 59250,2 (dernier échantillon de relecture phase 59245,6). Extrêmes 58761,3/62121,2. 133 phases Cross achevées nées dans la fenêtre, 78 net contraire (58,6%), 63 >=5min dont 39 contraires. 134 événements Cross Live SHADOW y compris phase non achevée. Efficacité de chemin absolue 1,44% ; BW/LBW opposés au prix sur 15m 41,0/26,4% (fenêtres glissantes).
| Fenêtre CET | Efficacité | Phases achevées / net contraire |
|---|---:|---:|
|26 14h30→27 01h15|1,43%|18/12|
|27 01h15→04h35|9,69%|3/2|
|27 04h35→15h26|0,84%|40/24|
|27 15h26→16h35|14,39%|1/0|
|27 16h35→28 10h45|1,18%|46/24|
|28 10h45→15h52|2,97%|25/16|
Les segments sont attribués à leur heure de naissance, pas tronqués à la fin de chaque sous-fenêtre. E1 UP 27 03h, LBW1 71,2 à 08h puis E1 DN 09h ; E4 UP depuis 25 21h, LBW4 45,9/BW4 38,2 à 27 13h ; E4 DN 17h après grande baisse. LBW4/BW4 28,8/38,1 à 17h puis −23,6/−14,2 à 28 13h. E1 UP 28 01h puis DN 07h, LBW1 −60,7 à 12h. E4/MF4 −15 à 28 13h. 5907 régimes observés, 4322 stériles/denses (73,2%). 

## Cause technique de la fausse fraîcheur de V553
modules/v553/decision.js : openChain mémorise firstLiveAt=instant courant si polarité déjà alignée. refresh recrée opportunity sur rotation pente ou PM, à chaque entrée/position efface opportunity. Âge médian chaîne 1,1min, **44/44 admissions ont exactement 2 confirmations**. Cross brut #148 65,6min, #157 22,5, #158 43,6, #180 28,0 ; candidatures respectives 1,1/1,0/1,1/1,5min.
modules/v553/market.js : emerging reprend les preuves immédiates de la candidature ; 43/44 admissions EMERGING_DIRECTION, 36/37 pertes et 7/7 gagnants. 17 entrées market.contested=true (14 pertes, 3 gagnants) et réouvertes par emerging. Deux observations et petit progressFromChain (médiane gagnants 32,4 BTC$, pertes 31,3) ne distinguent pas une nouvelle vague d'un rebond local. PM3 signé favorable dans entryReview ; market.late exige signed3<=0 et progressFromChain>typical15 : ce garde-fou ne peut pas écarter une admission par ailleurs qualifiée (même donnée marginale). poorLocation=nearBoundary&&!extension&&!live : le Live peut neutraliser le garde de proximité même sans extension du range. Huit entrées près de frontière 4h avec Live : sept pertes (#148/160/165/166/169/170/190), un gagnant #171. **Ne pas supprimer mécaniquement l'exception : elle autorise aussi le véritable breakout.** Le problème est l'absence de preuve d'un renouvellement réel du territoire, et non un délai CPU.
Sorties V553 : early=false ; adverse = MCB3 + pentes LBW/gap + PM Live/PM3 ; live exige ouverture adverse persistante + translation ; confirmed exige également adverse. 30 sorties Live (1 gain, net −132,54), 14 confirmées (6 gains, +44,88) ; groupes descriptifs, pas causalité du motif. Pertes : médiane délai depuis premier Cross adverse après extrême Bâton 0,65min (36/37 mesurables), 7 >12min. V543 pertes : 17,48min (12/14), 8 >12min. V553 peut sortir près du Cross mais bien après prix, V543 peut en plus attendre après Cross. Plancher 120/90 toujours absent de V553 (audit précédent), aucune correction effectuée.

## Comparaison de trades
- #149 V553 SHORT, Cross DN 26 15:15:27 60796,7, entrée 15:19 à 60769,3, MFE 844,6, sortie +1,58 (14,8% conservé). #348 V543 même initiative DN-40 (événement 15:09:27), entre 16:03 à 60440,1 après 356,6 BTC$ depuis Cross, MFE 528,8 puis −8,77 ; les deux manquent conservation.
- #157/#351 LONG : événement UP-40 26 23:08:58 à 60610,1. Entrées 27 01:23:01 à 60632,5 /01:39:46 à 60660, déplacement depuis origine +22,4/+49,9, âge initiative 134/150,8min ; Cross UP brut 01:00:28, âge 22,5/39,3, déplacement 77,6/105,1. MFE 1142,6/1179,3 ; net +21,23/+16,03 ; rétention 80,4/60,1%. V553 maintient jusqu'à 04:35, V543 sort 03:45. Ticker EASY/SILENT. E1 DN à admission, E4 UP. Vieille initiative ≠ mouvement consommé.
- #158/352 SHORT : Cross DN 04:00:58 à 61304,4, phase 128min sans excursion favorable depuis Cross brut, BTC termine +365,7 ; les entrées short au-dessus du Cross ne sont pas "tardives par distance positive", mais la thèse est déjà contredite ; −7,50/−6,18. #160 LONG 07:12 à 61900,6, Cross UP 2,1min, +13,4, rang45m 100%, E1/E4 UP, INEFFICIENT ; −6,99. #162 LONG 08:25 à 61869,9, Cross 9min, +49,8, rang100%, MFE4, effort 3,282×P75/rendement0,108×, −8,38. #161/#353 SHORT même DN-49, −5,92/−6,39.
- #164/#165/#166 SHORT : même initiative DN-51 née 09:11:28 à 61851,1, ages 63,5/97/145,5min, déplacements depuis origine +196,5/+260,5/+291,1, nouvelles candidatures, −5,11/−4,39/−4,42. #354 V543 même initiative (44min) −0,13 avec MFE259,9. #165 prix déjà −164,4 depuis Cross récent, bas du range.
- #163 LONG 08:54 à 61740, MFE429,8, sommet Bâton 09:19:58 62121,2, Cross DN 09:37:28 à61700,1, sortie −2,67. #171 DN-54 né 14:55:29 à61508, Cross DN 15:23:29 à61342,7, entrée 15:26:32 à61288,8 (+53,9 direction short), MFE2528,9, creux Bâton16:05:29 58761,3, Cross UP16:15:29 59732,9, sortie16:30:38 à59883,1 +32,92 (55,6% excursion). INEFFICIENT à entrée, V543 absent de cette baisse.
- #172 LONG 16:35 à59924, Cross UP20,1min et +191,1 ; initiative UP-55 née 15:29:29 à61401,6 pendant baisse, prix signé depuis origine encore négatif ; effort3,157×P75/rendement0,021× ; MFE569,6, net−10,32. #173 SHORT 18:43, même DN-55 depuis144min, ancien territoire proche, net−8,55.
- #357/358 V543 LONG même UP-56 depuis93,5/129,5min ; Cross âge63,6/99,6, MFE6,9/10,9 ; −4,49/−6,18 ; rétests défendus selon moteur ne suffisent pas. #358 EXCEPTIONAL au tick d'entrée.
- #188/#189 V553 LONG et #363 V543 LONG même UP-70 née 28 12:07:34. #188 initiative 44min, +9,9 BTC$ ; #189 107min, −0,8 BTC$, Cross frais 3min ; au voisinage de référence 59210,1, LBW/BW +33,04/+31,87 au #189 sans progrès prix, −3,09/−3,44 ; #363 initiative 85,5min, +76, Cross77,9min, −4,38. #190 SHORT près creux, 5,6min après Cross, +45,4 direction short, rendement0,073× malgré effort2,596× ; −6,98. 
- #182/#361 SHORT DN-64 : MFE334,8/712,6, net +2,00/+1,89. #187 SHORT Cross1,5min, +28,7 depuis Cross, MFE436,5, +5,71.

## Cohérence vs top20 figé au 26/11
|Mesure|V553 top20|V553 37 pertes|V543 top20 (14 couvertes)|V543 14 pertes|
|---|---:|---:|---:|---:|
|Cross aligné|16/20|29/37|12/14|14/14|
|LBW pente 3m alignée|20/20|37/37|12/14|14/14|
|LBW pente15m alignée|15/20|29/37|10/14|14/14|
|BW pente15m alignée|15/20|26/37|7/14|11/14|
|E15 natif aligné|11/20|28/37|8/14|10/14|
|E1/E4 tous deux alignés|4/20|9/37|1/14|0/14|
|Rang directionnel 45m médian|85,7%|93,8%|77,3%|95,3%|
|MFE médian BTC$|1010|76|1836,7 (20)|45,8|
|MFE réalisé médian|54,6%|−114,5%|76%|−345,2%|
|Âge Cross médian (dernier Cross, tout sens)|13,05|11,5|11,8|30,05|
Référence 26/11 conservée pour éviter de modifier groupe de comparaison avec nouveaux résultats et perte de rétention des archives. Top20 actualisé V553 +467,24 / V543 +606,38, couverture 20/20 et 10/20. Les 3–4 bougies doivent être précisées : 3m=9/12min, 15m=45/60min. En cohorte récente, 35/44 V553 dans polarité du Cross (6 gains), 9 anticipations/contradictions (1 gain) ; 17/17 V543 dans polarité.

## Tests de sélection rétrospective, aucune simulation d'exécution
Règles appliquées aux trades dans polarité Live ; tous les autres inchangés, ne pas assimiler prix signé négatif à opportunité. Limite temps depuis Cross échantillonné, distance depuis Cross au fill. Chiffres = somme des trades non écartés ; pas nouvelle equity.
| Variante | 553 récent retirés/gagnants retirés/net restant | 543 récent retirés/gagnants retirés/net restant |
|---|---|---|
|Aucun|0/0/−87,66|0/0/−56,66|
|>100 BTC$|7/0/−45,22|6/1/−38,87|
|>9min ou >100|19/1/−19,69|13/2/−12,75|
|>12min ou >100|16/1/−29,82|12/2/−12,88|
|>45min ou >100|8/0/−41,60|10/1/−17,64|
|>60min ou >100|8/0/−41,60|9/1/−23,82|
|>12min ou >100 ET rang directionnel >=90%|11/0/−23,81|7/0/−13,85|
|précédent ET conversion SILENT/INEFFICIENT/CONTESTED|7/0/−44,28|4/0/−35,28|
La conjonction se lit (âge>12 OU déplacement>100) ET rang≥90. >12 OU >100 enlève #157, #351/#359. Top20 figé : >100 seul retire 10/20 V553 +205,49 et 5/14 V543 +95,10 ; >12 OU >100 retire 11/20 +250,39 et 7/14 +205,40. Late+rank90 retire 7/20 +98,19 (#33,45 entre autres), 1/14 +12,40 ; ajout conversion retire 3/20 +4,97, 0/14. Échantillons non représentatifs des gagnants anciens non couverts.

### Vérification sur toutes les transactions historiques couvertes avant 26 14h30
|Variante|V553 : exclus / gagnants exclus / net restant (115)|V543 : exclus / gagnants exclus / net restant (103)|
|---|---|---|
|Aucune|0/0/−110,59|0/0/−161,19|
|>100|42/11/−118,60|61/17/+50,66|
|>12 ou >100|56/13/−77,92|76/20/+41,68|
|Late+rank90|41/8/+0,67|39/11/+2,20|
|Late+rank90+conversion|23/4/−2,59|19/7/−103,31|
|Late+rank90+INEFFICIENT seulement|18/2/−22,54|10/4/−138,38|
|Late + >=3 Cross Live 60m|23/7/−130,68|25/10/−209,87|
L'ajout conversion SILENT/INEFFICIENT/CONTESTED donne sur V553 un compromis intéressant, mais les labels ne sont pas intrinsèquement des veto (SILENT peut être productif). Le test a été construit en voyant la période, pas holdout prospectif. Les 164 clôtures V543 historiques non couvertes ne doivent pas être extrapolées. Conserver la dynamique de la conversion, pas une classe instantanée. Une suspension générale dense/stérile supprimerait tous les 7 gagnants récents V553 ; uniquement 2 pertes resteraient. 
## Trajectory SHADOW
Contrôle 28/11 15h52 : 11245 observations Live et 959 bootstrap ; état disponible, SHADOW_ONLY, decisionImpact=false. Journal événements 3822 uniques sur fenêtre : 1008 rotations locales, 72 nouvelles initiatives (2 directions), 134 Cross15 Live, 44 Cross15 confirmés et E15 natifs, 356 Cross3, 1285 relations à référence prix. Les snapshots rotatifs complets conservés commencent seulement le 27/11 11:58:36 (3346 relevés jusqu'à 28 15h51:37), couverture d'entrée V553 25/44, V543 9/17, sortie 26/44 et 10/17. **Les événements d'initiative remontent au 24/11 18h14 et permettent les origines effectivement connues pour les cas antérieurs**, mais ne remplacent pas un snapshot complet. Ne pas prétendre disposer de toutes les lectures prospectives. Durée réelle de rétention ~28h ; proposer archivage compact plus long (non modifié). Géométrie ouverture dans sens à entrée : 3/3 gagnants et 19/22 pertes V553 couvertes ; V543 1/2 gagnants et 6/7 pertes. L'interprète ne discrimine pas encore. Ancien filtre praticabilité couvert depuis 27 00h05 : variante large détecte 3 pertes V553 et 2 pertes V543, mais aussi #359 gagnant, couverture partielle. 
## Recommandation de recherche (pas politique)
1. Distinguer horloge véritable Cross / initiative / candidature ; garder les Cross rejetés et maturité du prix, ne jamais recréer âge du marché sur PM/rotation.
2. Explorer en SHADOW qualification retard + position spatiale + conversion, en comparaison avec le filtre simple 100/9–12min. Le résultat des sous-ensembles est informatif mais insuffisant pour activer. Évaluer le prix déjà consommé avant Cross, l'ancien extrême de l'initiative et le renouvellement/acceptation de territoire ; permettre un vrai transfert (#171) même près limite, reprise productive (#157/#351) même ancienne. "EMERGING" doit signifier une transformation économique nouvelle, pas deux observations locales. 
3. Tester séparément sorties : reconnaitre restitution à partir des extrêmes et opposition prix avant Cross ; conserver hard risk et protection positions ; réexaminer 120/90 en chantier séparé. 
4. Évaluer toutes les nouvelles initiatives indépendamment des trades, puis replay séquentiel avec réadmissions et frais ; préenregistrer variantes et observer prospectivement. Aucune décision de suspension automatique ou changement PAPER/SHADOW dans cet audit.

