# BOONOLAB — Audit des trades V553 #64 et #66–#69 : marché hésitant, perte de gains et MA3

**22 novembre 2026 — CET. Statut : analyse documentée, aucune modification de V553 PAPER.**

## Mandat et preuves

L’utilisateur signale #64 sortie tardive malgré LBW15/MCB3/PM, #66 pente ralentissant avant l’entrée et MCB3 SHORT, #67 et #68 défiance au contrat dans un marché hésitant, et #69 SHORT juste au-dessus de MA3 avant son test. Analyse conduite directement sur Amsterdam à partir du ledger PAPER V553, des décisions horodatées et de leur archive de rotation, des archives Bâton 30s du 22 novembre, des CSV MCB3m/15m, des SHADOWS ticker/régime, de l’interpréteur géométrique as-of et du code de politique V553. Le timestamp du CSV 3m est celui de son ouverture : la valeur close/MA n’est disponible qu’à ouverture + 3 minutes.

## Bilan

| Trade | Sens | Entrée → sortie CET | P&L net USD | MFE prix BTC USD |
|---|---|---|---:|---:|
| #64 | LONG | 12:54 → 13:22 | -4,1813 | +571,1 |
| #66 | LONG | 15:58 → 16:39 | -5,9078 | +47,3 |
| #67 | LONG | 17:03 → 18:04 | -2,6830 | +408,4 |
| #68 | LONG | 18:23 → 18:48 | -3,1456 | +82,4 |
| #69 | SHORT | 19:07 → 20:46 | -3,5514 | +108,9 |

**0 gagnant sur 5, total -19,4691 USD nets et 7,4961 USD de frais.**

## Marché latéral et hésitant : observation, non veto

Proportions ticker/régime autonome observées : 15h–16h 90% STERILE_HESITANT, 16h–17h 92,5%, 17h–18h seulement 38,3% stérile et 40% DIRECTIONNEL_PRODUCTIF, 18h–19h 35% directionnel et 34,2% DENSE_CONTRADICTOIRE, 19h–20h 89% STERILE_HESITANT, et tous les relevés disponibles de 20h à environ 20h46 stériles. Il existe des épisodes localement directionnels dans cette période ; interdiction uniforme dès 17h non justifiée. Les cinq pertes se produisent autour d’une fragilité croissante de la translation durable du prix.

Les trois profils de fermeture du SHADOW praticabilité v0.1 n’auraient signalé aucune de ces cinq entrées comme non praticable à leur instant. C’est une limite mesurée du SHADOW, pas une preuve que les entrées étaient acceptables.

## #64 : la sortie ne suit pas suffisamment la contre-offensive combinée

LONG à BTC 61 059,8, meilleur déplacement favorable +571,1 BTC USD, finalement clôturé 60 950,6, net -4,1813.

- **13:17:49** BTC 61 644,9 ; LBW15 pente 3m +3,78, MCB3 LONG gap +9,25, PM Live +148,6.
- **13:18:19** BTC 61 473,8 ; PM Live -171,1 mais pente LBW15 +3,73 et MCB3 LONG : une alerte, pas encore preuve complète de liquidation.
- **13:20:49** BTC 61 385,8 ; pente LBW15 -0,77, MCB3 encore LONG gap +6,33, PM -80,0.
- **13:21:49** BTC 61 339,7 ; pente LBW15 -0,43, MCB3 SHORT gap -1,76, PM -34,5 : preuves adverses convergentes.
- **13:22:19** BTC 61 132,3 ; pente -0,71, MCB3 SHORT gap -3,31, PM -207,4.
- **13:22:53** sortie à BTC 60 950,6, après confirmation adverse.

Calcul hypothétique PAPER au prix Bâton observé de 13:21:49 = environ +5,37 USD net, soit +9,55 USD de différence avec la sortie enregistrée, sans garantie de fill. Le code exitReview conserve **early=false**, ce qui empêche l’invalidation structurelle pré-Cross15. À tester face aux bons maintiens #58/#61 avant toute activation.

## #66 : ralentissement bien réel, mais MCB3 pas SHORT au tick d’entrée

LBW15 pente 3m est montée à **+29,66 vers 15:45**, puis +24,48, +17,8, et -3,11 vers 15:48. Elle reste proche de zéro entre 15:50 et 15:53, revient +0,34 à 15:57 puis +3,40 à 15:58. Le moteur prend la reprise locale comme une offensive neuve sans tenir compte de l’épuisement de la première impulsion.

**Correction factuelle importante :** au tick d’entrée du LONG à 15:58:24, MCB3 Live était **LONG avec gap +6,85**, pas SHORT. Il avait connu des épisodes SHORT auparavant, ce qui compte pour l’histoire de la vague sans devoir être présenté comme son signe actuel. Ticker à l’admission SILENCIEUX_PRODUCTIF mais qualité INEFFICIENT, effort 2,712 fois P75 pour rendement 0,284 fois P75. Perte -5,9078 USD.

L’interpréteur géométrique v0.1 donne localement une séparation accélérante, mais manque encore l’histoire de la première accélération puis ralentissement. Son étude doit monter à l’échelle de l’épisode complet.

## #67 : contrat codé satisfait mais exploitabilité contestée

LONG 17:03:24, à BTC 60 957,5, avec pente LBW15 +7,41, écart 15m +6,82, MCB3 LONG gap +11,80, PM3 +77,7, PMLive +35,1 ; deux confirmations et deux échantillons Cross15 Live. **Le contrat d’entrée codé était effectivement satisfait**.

Au même instant, le régulateur interne indiquait **contested=true, frequent=true et lowReturn=true**, avec efficacité du prix horaire **1,3%** et conservation **12,3%**. L’exception EMERGING_DIRECTION après deux observations favorables a contourné la suspension d’admissions. Ticker externe STERILE_HESITANT / UNCLASSIFIED. MFE BTC +408,4 mais résultat final -2,683.

Incohérence à travailler : la preuve d’une nouvelle candidature ne prouve pas que le **marché** est devenu praticable. Pas une violation littérale des tests du contrat actuel.

## #68 : anticipation encore faiblement fondée

LONG 18:23:50, alors que MCB15 Live reste **SHORT gap -18,06**, MCB15 confirmé SHORT, E3 natif SHORT, MCB3 Live LONG mais faible gap +1,79, LBW15 pente +1,38 et PM Live +18,1. PM15 reste **-54,7**, aucun Cross15 Live LONG dans la chaîne : firstLiveAt null et liveSamples 0. Géométrie sur 15m toujours baissière (LBW15 vitesse -1,4985 MCB/min), mais sur 3m une petite rotation haussière. L’exception EMERGING_DIRECTION a autorisé l’entrée.

Le bug connu du champ chain.live15At (champ réel firstLiveAt) rend l’exception pré-Cross permissive. À corriger sans supprimer les bons trades pré-Cross #38/#46. Ticker externe DIRECTIONNEL_PRODUCTIF mais conversion **SILENT** : un régime directionnel n’est pas une preuve de ce LONG.

## #69 : SHORT dans le support MA200 3m sans cassure confirmée

SHORT **19:07:50 à BTC 60 648**, MA200 3m **60 638,145**, seulement **9,85 USD sous le prix**. Dernière clôture 3m connue **19:06**, BTC **60 831,4**, MA3 **60 638,1** : support encore respecté. Le prix a eu une excursion intrabougie sous MA vers 19:07:31 (BTC ~60 529,6) mais est revenu au-dessus à l’entrée : pas de cassure acceptée ni de retest/rejet confirmé.

La première clôture sous MA n’est connue qu’à **19:09**, donc APRÈS l’entrée (60 608,4 vs MA 60 637,8) ; le prix reprend la MA à **19:12** (60 678,9 vs 60 638,3).

Le lieu interne affichait déjà NEAR_PRIOR_DIRECTIONAL_BOUNDARY, avec **65,3 USD BTC seulement** de marge jusqu’au bas de son range 4h de bougies 15m closes. Cependant poorLocation conditionné par !live peut être contourné quand Cross15 Live est aligné. **MA3 est lue dans sensor.place.ma3, mais n’influence ni entryReview ni exitReview**.

Les signaux directionnels immédiats étaient vendeurs : MCB15 gap -14,49 et pente -7,26, MCB3 gap -12,83, PM3 -179,8. Mais MF15 était +18,17, E1 et E4 haussiers selon le SHADOW, ticker SILENCIEUX_PRODUCTIF / INEFFICIENT (effort 3,005× P75 contre rendement 0,631× P75). Mauvaise exploitation de lieu malgré des preuves directionnelles ; sortie à **20:46:16**, **-3,5514 USD nets**.

## Conséquences expérimentales

1. **Sortie #64** : tester la perte conjointe de pente LBW15, MCB3, PM, territoire conservé et proximité d’une structure opposée, sans sortie automatique à chaque contre-attaque ni floor de bénéfice.
2. **Géométrie #66** : mémoriser toute la phase d’accélération initiale, puis son ralentissement et sa tentative de reprise ; ne pas seulement comparer la pente actuelle à sa moyenne sur 3m.
3. **Marché #67** : donner une histoire continue de praticabilité distincte des micro-chaînes d’entrée ; exiger un transfert économique réellement produit avant de lever SUSPEND_NEW.
4. **Admission #68** : distinguer anticipation avant Cross15 Live et offensive qui s’établit, sans veto général sur les pré-Cross gagnants.
5. **Lieu MA3 #69** : ajouter au SHADOW les phases prix au-dessus/dessous, premier test, cassure confirmée, acceptation, retest et rejet sur la MA200 3m ; éviter les SHORTs directement contre support non résolu.

**Statut final : audit documentaire uniquement. Aucune modification de V553 PAPER, du compte, des sorties, du SHADOW existant, de BOONO-TV ou des services en production.**
