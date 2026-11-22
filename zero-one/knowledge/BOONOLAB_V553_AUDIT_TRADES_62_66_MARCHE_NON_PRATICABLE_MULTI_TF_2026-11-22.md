# BOONOLAB — V553 : #62–#66, marché non praticable malgré des signaux LBW15 tactiquement lisibles

**22 novembre 2026, 17h42 CET — AUDIT EN LECTURE SEULE.**  
**Statut : OBSERVATIONS, CAUSES VÉRIFIÉES, HYPOTHÈSES ET RECOMMANDATIONS. V553 PAPER NON MODIFIÉ.**

## Mandat et constat

L'utilisateur juge que les cinq échecs #62–#66 surviennent malgré une lecture LBW15 largement cohérente avec le court terme, en raison d'un contexte 1h/4h haussier : parent E4 vers -85, E1 bullish, prix sous grand range, divergences MCB4 en prix, et prix BTC qui conserve sa zone malgré la descente LBW15, avec MF15 presque neutre. **Hypothèse centrale : le marché doit pouvoir être déclaré NON PRATICABLE pour les nouvelles admissions sans interdire tous les signaux et sans liquider les positions détenues.**

Sources relues sur Amsterdam : data/v553-paper-state.json, v553-paper-decisions.ndjson, data/audit-history.json, fichiers mcb_{15m,1h,4h}.csv, archives et flux as-of ticker 4×15 et régime, events du SHADOW E1/E4/lieu, modules/v553/{decision,market}.js, code modules/attention/boonolab-place-e1e4-shadow.js. Toutes les valeurs SHADOW aux entrées sont antérieures et récentes ; les clôtures MCB CSV deviennent disponibles à **ouverture de bougie + TF**. Le grand range est une **référence statique enregistrée par l'utilisateur**, pas un carnet d'ordres.

## 1. Mesure de la séquence

Les **cinq clôtures** V553 :
| # | Sens | Heure CET | Net PAPER USD | MFE prix BTC USD | MAE prix BTC USD | Sortie |
|---|---|---|---:|---:|---:|---|
| 62 | LONG | 12:26:22–12:30:37 | -2,3456 | 77,6 | 57,9 | Cross15 confirmé |
| 63 | LONG | 12:34:52–12:46:42 | -3,9586 | 46,2 | 100,7 | Cross15 Live |
| 64 | LONG | 12:54:23–13:22:53 | -4,1813 | **571,1** | 109,2 | Cross15 confirmé |
| 65 | SHORT | 13:35:23–15:46:39 | **-9,0601** | 97,0 | 422,2 | Cross15 confirmé |
| 66 | LONG | 15:58:24–16:39:59 | -5,9078 | 47,3 | 203,6 | Cross15 Live |

**0/5 gagnants, -25,4534 USD nets ; -17,9549 USD brut, 7,4987 USD de frais cumulés.** Sur la période #62–#66, les trois LONGs initiaux coûtent ensemble -10,4855 USD. #64 est un contre-exemple intéressant à l'idée de marché *entièrement immobile* : MFE +571,1 BTC USD puis clôture après déplacement final adverse de 109,2 (restitution de ~680,3 BTC USD). La mauvaise sélection de marché et la protection des bénéfices/invalidations sont des problèmes **distincts**.

Entre **22/11 12h00 et 17h00 CET** : 600 observations Bâton ; prix BTC net **+50 USD** (~60 808 → 60 858) sur **15 261,4 USD de fluctuations absolues cumulées**, efficacité de déplacement net ~**0,33 %**, sensibilité à la cadence du sampling. **8 basculements de signe Cross15 Live**, **37 basculements MCB3 Live**. MF15 Live ~-4,96 → +0,75. Le marché a bougé à l'intérieur d'un range réel (~60 490–61 645 USD) mais ne gardait pratiquement aucun territoire net à l'échelle de 5h.

SHADOWS autonomes as-of : **72,7 % STERILE_HESITANT**, **18,0 % DENSE_CONTRADICTOIRE**, soit **90,7 % dans ces deux classes** (600 relevés, 12h–17h). Les cinq admissions ont toutes été classées **EMERGING_DIRECTION** par V553 :
- #62 ticker STERILE / SILENT, effort 0,289×P75, yield 0,776×P75 ;
- #63 STERILE / EASY, effort 0,347×P75, yield 1,50×P75 ; un petit yield avec très faible effort ne valide pas le régime global ;
- #64 STERILE / EXCEPTIONAL, effort 0,225×P75, yield 3,391×P75 ; MFE a effectivement existé, mais le marché a ensuite restitué le mouvement ;
- #65 STERILE / **INEFFICIENT**, effort **6,634×P75**, rendement **0,144×P75** ; flux lourd pour peu de déplacement vendeur conservé ;
- #66 ticker SILENCIEUX_PRODUCTIF mais **INEFFICIENT**, effort **2,712×P75**, rendement **0,284×P75**. Un label favorable ne suffit donc pas.

## 2. Le contexte supérieur E4 / E1 et le lieu ont été vérifiés

Le dernier **E4 natif UP** connu au moment de TOUTES les cinq admissions était celui du **21/11 à 13h00 CET**, LBW4 **-85,15** (E4 UP natif, BW4 autour de -89,99). Le dernier **E1 natif UP** connu à chacune des entrées date du **22/11 10h00 CET**, LBW1 à cette clôture -22,59 ; plus tard E1 LBW1 environ +17,74 à 12h et +28,30 à 13h avec gap haussier. Ce sont des **événements confirmés** disponibles as-of et non des déductions sur l'image.

Le grand value area enregistré était VAL **66 812 USD**, POC **77 121 USD**, VAH **84 671 USD**, avec version source antérieure aux entrées (provenance en SHADOW E1/E4/lieu). Les prix des entrées, 60 565 à 61 060, restaient **environ 5 752 à 6 247 USD sous VAL**. C'est du lieu structurel de valeur enregistré, pas une force directionnelle absolue ni un flux d'ordres L2.

### Divergences potentielles 4h mesurables

Sur les bougies 4h **déjà connues avant les trades** :
- Entre clôtures 21/11 05h et 09h, le low BTC fait **56 334 → 55 100 USD** (plus bas inférieur), alors que LBW4 fait **-92,96 → -91,88** (plus bas d'onde supérieur) : divergence locale haussière de prix/LBW.
- Entre clôtures 22/11 05h et 09h, low BTC **59 100 → 58 731 USD** et LBW4 **-34,93 → -34,31**, avec MF4 **-46,72 → -45,64** : une autre contradiction haussière prix/LBW4 et amélioration de MF4.

Ces divergences sont mesurées sur paires adjacentes de bougies **avec lows de prix**, et **ne prouvent pas** à elles seules les divergences de swing définitives ou un signal d'achat immédiat. En particulier, la première paire 21/11 n'était pas également haussière sur MF4. Ne pas gonfler en « divergence multi-signaux validée » ce qui n'est pas documenté par un détecteur officiel.

### Contraste MCB15 / prix et MF15 neutre

Sur les clôtures 15m **13h30 à 16h**, le BTC passe de **60 601,7 → 60 906,3 USD** (+304,6), alors que LBW15 baisse d'environ **52,58 → 14,72** (−37,86) et MF15 s'améliore de **-4,35 → +2,15** (écart +6,50). Ce contraste dépend de la fenêtre choisie : de 13h00 à 16h00 le prix baisse de ~131 USD ; il faut qualifier le rejet du prix à la baisse localement sans prétendre à une hausse monotone durant tout l'après-midi.

La signification économique possible est que les vendeurs peuvent faire reculer la géométrie MCB15 **sans obtenir la poursuite du déplacement BTC**, et que MF15 ne confirme pas une force vendeuse durable. Cela renforce un état de **transfert non accompli / marché en conflit d'horizons**, non un ordre automatique LONG.

## 3. Cinq chaînes et où le contrat a échoué

**#62, #63 et #64 LONG** : à leur entrée MCB15 est encore **SHORT Live et confirmé**, gap environ **-3,84 / -3,21 / -3,27**, mais pente LBW15 positive **+0,24 / +0,70 / +1,25**. Le parent stratégique V553 est **E15 SHORT**, et les chaînes d'entrée n'ont **aucun Cross15 Live LONG** (\`firstLiveAt=null\`, \`liveSamples=0\`). V553 les autorise via \`EMERGING_DIRECTION\` après 2 observations marginalement positives, alors que le marché de fond est STERILE et le prix est à environ **84–87 % de son range glissant 4h**. #62 sort après ~4 minutes au Cross15 confirmé SHORT ; #63 sort au Cross15 Live opposé, sans changement de marché fiable ; #64 réalise une forte excursion temporaire avant d'être repris dans la réaction vendeuse. La validité « 2 ticks positifs » ne requalifie PAS automatiquement une nouvelle opportunité indépendante sur le MARCHÉ.

**#65 SHORT** : la géométrie tactique est pour une fois nette : MCB15 SHORT gap -12,46, pente LBW15 -2,22, pente gap -1,48, MCB3 SHORT gap -9,96, PM3 -170,5 et MF15 -5,48 pente -1,3. Mais E1 UP et E4 UP ont autorité de **contexte** ; les divergences 4h + prix 15m mieux conservé que la chute de LBW15 avertissent contre une continuation SHORT non productive. L'observatoire 4×15 disait explicitement **INEFFICIENT**, effort 6,63×P75 pour rendement 0,144×P75. Pendant la position, LBW15 pente monte déjà dès ~13h41 alors que le prix retourne vers la hausse, puis sortie après Cross15 UP confirmé 15h46, -9,06. Ce n'est pas une erreur de signe au niveau 15m mais **un défaut de sélection économique et de conflit supérieur non arbitré**.

**#66 LONG** : E4 UP, E1 UP et MCB15 Live LONG avec écart +12,58, pente LBW +3,40, MCB3 LONG et PM3 +99,7 au moment de l'entrée. Mais la conversion 4×15 est **INEFFICIENT** malgré le label global SILENCIEUX_PRODUCTIF (effort 2,712×P75, yield 0,284×P75) ; le marché ne conserve pas le prix, pentes MCB15 baissent après admission, puis Cross15 DN Live fait sortir -5,91. **Direction cohérente ≠ opportunité exploitable.**

## 4. Défauts du code et propositions à étudier, pas de changement encore

- **V553 source/decision n'a pas E1/E4, ni structure BigRange, ni détecteur de divergence MCB4**, même si le SHADOW E1/E4/lieu sait les observer en lecture seule. Le moteur ne peut actuellement pas mesurer explicitement une contradiction structurelle entre des horizons supérieurs haussiers, un Cross15 vendeur, et un prix qui refuse de prolonger les plus bas.
- **Bogue déjà identifié** dans \`modules/v553/market.js\` : condition \`chain.live15At?live:true\` alors que champ réel \`chain.firstLiveAt\`; le contrôle de permission de tendance émergente n'a pas l'autorité attendue sur le statut pré-Cross. Ne pas en faire un verrou global « tout pré-Cross interdit » : d'autres trades pré-Cross productifs ont été observés (#38, #46).
- \`contested\` exige des mesures de productivité et conservation plus faibles que la propre référence historique, laquelle peut être déjà stérile. Une situation persistante d'impasses tactiques peut sembler relativement « meilleure » et rouvrir artificiellement.
- \`emerging\` après 2 relevés positifs de la candidature **annule la suspension de marché**, sans mémoriser la non-praticabilité persistante et sans justifier le nouveau potentiel à partir du lieu E1/E4/range. Ici les cinq admissions ont le même statut EMERGING_DIRECTION alors que 90,7 % des relevés d'environnement étaient Stérile ou Dense.
- **Contrat cible MARKET (nouvelles admissions UNIQUEMENT)** : NOUVELLES_ADMISSIONS_SUSPENDUES lorsque des vagues MCB15/3 produisent des croisements contradictoires et beaucoup d'effort sans territoire conservé, renforcé par conflits E1/E4 et divergences prix/MCB4 as-of. Le contexte n'impose ni LONG ni SHORT. Réouvrir uniquement si **une nouvelle chaîne** prouve la translation économique du prix, la continuité du Cross15 Live, le niveau de vague et la réponse des adversaires sur plusieurs observations ; pas de délai fixe ni de veto absolu par STERILE ou divergence.
- Le prix sous BigRange VAL n'est pas une preuve de hausse ni de baisse et ne doit pas être assimilé à une « zone de profit obligatoire ». Il est une référence de lieu/déséquilibre, particulièrement importante pour contextualiser la maturité de vagues et les oscillations du prix.
- **Gestion positions à part** : #64 ayant gagné MFE 571 BTC avant perte signale aussi un problème d'examen de préservation/invalidation, pas une raison de réintroduire un floor 120/90. Le code conserve \`early=false\`, donc la première inflexion adverse n'a toujours pas d'autorité autonome de sortie sans Cross15 Live persistant.

## Validation expérimentale recommandée avant toute activation

Construire replay causal **as-of** à plusieurs périodes, sans import de signal futur de SHADOW, comparant :
(1) #62–64 occasions pré-Cross non validées par marché,
(2) #65 vente 15m techniquement cohérente mais non suivie par prix sous E1/E4 UP,
(3) #66 bonne direction mais conversion sans rendement,
(4) bonnes campagnes #58/#61 et #43/#46 qui doivent rester admissibles, même lorsque le régime horaire a du retard.
Mesurer nombre d'admissions, réentrées, MFE/MAE, frais et **P&L reconstitué des campagnes complètes**, y compris faux blocages. Ne pas prétendre que filtrer cinq trades in-sample prouve un gain futur de 25,45 USD.

**Etat : V553 PAPER v5.5.3-live-causal-price-market-paper-v1 inchangé.** À la coupe de 17h42, le ledger a 66 clôtures et une position LONG #67 encore ouverte ; #67 est **hors périmètre** des cinq pertes et de la synthèse.
