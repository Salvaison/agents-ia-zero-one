# BOONO — Investigation causale ciblée E15 / turning / régime — 29/09/2026

Statut : analyse manuelle validée par Benjamin, sans modification de code, seuil ou processus.
Échantillon primaire : 24→27 septembre 2026 ; contrôles historiques à venir après clarification des définitions.
Méthode : marché/MCB brut d'abord, états calculés BOONO ensuite.

## 1. E15 : constat de code

[DÉMONTRÉ] `wave.js/confirmedPivots()` ne distingue pas actuellement E15 majeur et E15 mineur.
Un pivot 15m est produit dès qu'un maximum LBW positif ou minimum LBW négatif local dépasse `minAmp=2`.
Aucun critère d'espacement temporel, de translation prix minimale structurelle, ni d'écart LBW ~80 n'entre dans cette qualification.
`structuralLeg()` prend simplement les deux derniers pivots confirmés et exige seulement >=50 $ de déplacement prix.

[DÉMONTRÉ] Le champ `phase=MONTEE/DESCENTE` ne décrit pas la pente instantanée du LBW.
Après un CREUX confirmé il reste MONTEE jusqu'au prochain CRETE confirmé ; après un CRETE il reste DESCENTE jusqu'au prochain CREUX.
Donc `phase=MONTEE` avec LBW courant en baisse est possible par construction. Le nom est sémantiquement ambigu.

## 2. « Confirmation » structurelle et retard d'un leg

Le 26→27/09, les legs vus par V3 ont été :
- SHORT 02:15 CRETE +27.06 / 84090.2 → 06:15 CREUX -51.30 / 83836.2 ; reconnu ~07:00 ; span LBW 78.36.
- LONG 06:15 -51.30 / 83836.2 → 08:45 +66.19 / 84252.4 ; reconnu 09:15:58 ; span 117.49.
- SHORT 08:45 +66.19 / 84252.4 → 20:45 -47.80 / 83764.7 ; reconnu 21:15:59 ; span 113.99.
- LONG 20:45 -47.80 / 83764.7 → 27/09 08:15 +77.37 / 84836.6 ; reconnu 08:46 ; span 125.17.

[DÉMONTRÉ] La phrase du Deep Review « structure SHORT confirmée à 21:15 » était trompeuse :
21:15 est l'instant où le leg DESCENDANT déjà terminé 08:45→20:45 devient reconnaissable comme leg confirmé.
À 21:15, l'oscillateur vivant est déjà reparti depuis le CREUX, donc dans la phase suivante.
Même phénomène à 08:46 : V3 confirme rétrospectivement le leg LONG 20:45→08:15 alors que l'oscillateur commence déjà la phase descendante suivante.

[ARTEFACT LOGIQUE / SÉMANTIQUE] `wave.structural` est donc aujourd'hui « direction du dernier leg achevé », pas « structure directionnelle actuelle du mouvement en formation ».
Sur 27 entrées V3 du 24→27/09, 26 ont une direction `wave.structural` opposée à la phase oscillateur courante.
Cela ne signifie pas que l'opposition oscillateur/prix est fautive en soi ; cela démontre que « toutes les entrées étaient alignées à la structure » ne validait pas la lecture structurelle réelle.

Sur 14 legs structurels distincts visibles aux entrées, 5 ont un span LBW <80 points.
Le meilleur SHORT de la période (+8.174 %) s'appuyait encore sur un ancien leg achevé dont le span n'était que ~59.2 points.
Conclusion : le seuil ~80 proposé par Benjamin est une hypothèse prometteuse pour qualifier les grands mouvements, mais ne doit pas être codé seul avant reconstruction des cas.

## 3. Turning : définition active

[DÉMONTRÉ] Le turning actuel n'est pas un détecteur de retournement prix.
Dans `wave.js` :
- slope = LBW courant - LBW précédent ;
- `nearFlat = abs(slope) <= 2` ;
- LBW > 0 + nearFlat => CRETE_EN_FORMATION ;
- LBW < 0 + nearFlat => CREUX_EN_FORMATION.
Il n'exige ni extrême significatif, ni changement de pente confirmé, ni déplacement prix adverse, ni conversion, ni incapacité de reclaim.
La mémoire turning dure 18 min ; RISK accepte pour reassertion un turning aligné âgé de <=6 min.

### Cas LONG 84077.4 — 26/09 13:07:58Z

[ARTEFACT LOGIQUE] L'entrée illustre directement le problème :
- prix 84077.4 ; MA200 15m résistante 84143.36, interaction active ;
- LBW15 -10.63 en DESCENTE depuis la crête 08:45 ;
- V3 déclare pourtant CREUX_EN_FORMATION parce que la pente LBW instantanée est presque plate ;
- la « thèse structurelle LONG » est le leg déjà achevé 06:15→08:45 (-51.30→+66.19), pas le mouvement courant ;
- nested3m LONG, dominance LONG 4/4, proof .902 ;
- R:R 1.035 seulement, rétention .509 seulement ;
- entrée STRUCTURAL_REASSERTION ;
- résultat -2.0945 %, MFE 0.1 $, MAE 191.4 $.

Ce cas confirme la critique visuelle de Benjamin : un turning artificiel et un leg achevé mémorisé ont permis de présenter comme « réassertion LONG » une entrée au sein de la descente suivante, sous une MA200 15m résistante.

### Contrôle positif : SHORT 84400 — 24/09 14:43:48Z

Ce trade gagne +8.1742 % levier ; MFE 1066.7 $, MAE 7.7 $.
Au moment d'entrer : LBW15 +81.27, CRETE_EN_FORMATION, nested3m DESCENTE, dominance SHORT 3/4, proof .856, terrain conservé 1.0.
Le prix avait déjà retracé 531.3 $ depuis le meilleur point du rebond et le R:R était 2.08.
Ici le turning correspond à un vrai contexte d'extrême + déplacement prix conséquent, contrairement au LONG 84077.
Hypothèse à tester : turning utile = extrême/maturité + déplacement net adverse significatif + conversion/terrain, et non simple aplatissement LBW.

## 4. P90 : définition exacte actuelle

[DÉMONTRÉ] Le `p90` utilisé par RISK n'est pas « P90 du régime ».
RISK prend les 12 dernières heures d'audit, construit un zigzag prix avec seuil de retournement fixe 50 $, puis calcule les percentiles des amplitudes des swings terminés.
`p50/p75/p90/p95` sont donc des percentiles de respiration prix sur 12 h, toutes conditions mélangées.

[ARTEFACT LOGIQUE / SÉMANTIQUE] ACTION écrit pourtant « dominance opposée + respiration > p90 du regime ».
Cette formulation est fausse : le percentile n'est pas segmenté par CHOC_COMBAT/TRANSLATION/COMPRESSION/etc.
Exemple LONG 84077 : p50 100.7 $, p75 137.4 $, p90 198.9 $, contre-excursion 169.1 $ = LARGE_NORMAL.
Exemple SHORT +8.174 % : p90 266.3 $, contre-excursion 531.3 $ = UNUSUAL.

Le seuil doit donc être réétudié séparément pour :
- admission ;
- respiration tolérable dans un trade ;
- sortie/protection ;
et éventuellement conditionné au régime/amplitude, plutôt que simplement abaissé globalement.

## 5. CHOC_COMBAT vs TRANSLATION

[DÉMONTRÉ] Le classificateur de régime actuel agrège les 60 dernières minutes.
CHOC_COMBAT = cadenceP95 >= P90 des heures de référence + moveP95 >= P75 + efficacité sous max(.08, P75 efficacité).
TRANSLATION = efficacité >= max(.06, P75 efficacité) + |net| >=100 $.
La référence est constituée d'environ 13 fenêtres horaires précédentes, recalculées en continu.
CHOC_COMBAT est évalué avant TRANSLATION et gagne donc si les deux signatures se chevauchent.

[ARTEFACT LOGIQUE / INSTABILITÉ] Sur 26/09 22:18→22:56Z, l'état bascule à plusieurs reprises CHOC_COMBAT↔TRANSLATION à 30 s d'intervalle.
Autour de 22:20, la cadenceP95 et moveP95 restent presque identiques ; la bascule provient principalement de petits croisements entre efficacité courante et P75 d'efficacité, tandis que la baseline elle-même bouge.
Cela ne représente pas encore proprement « combat qui se résout puis translation ».

Le régime n'intègre actuellement ni :
- répétition d'attaques d'une frontière/MA200 ;
- échec de conversion après effort ;
- reclaim ;
- rendement opposé croissant ;
- conservation du terrain par le camp gagnant.
C'est exactement le matériau requis pour étudier le passage CHOC_COMBAT→TRANSLATION décrit par Benjamin.

## 6. Dominance 0.55→0.62 — première mesure, sans changement de seuil

Rappel : le proofScore n'est pas une mesure pure d'intensité.
Il combine asymétrie (.45), persistance dans les 4 derniers événements (.30), terrain retenu (.25), plus bonus shock+conservation (.10).
Le test exploratoire porte sur 6144 évaluations du 24→27/09.

Après dé-corrélation grossière à un événement maximum toutes les 10 min :
- 158 épisodes commencent dans la bande proof [0.55,0.62).
- sous-ensemble conservé + DOMINATION_EMERGENTE + persistCount>=2 : n=118.
- rendement médian signé dans le sens de la dominance : -4.0 $ à +3 min ; ~0 $ à +5 ; -5.6 $ à +10 ; -5.5 $ à +15 ; -4.9 $ à +30.
- taux de rendement positif : 41 %, 50 %, 46 %, 47 %, 46 %.

Contrôle [0.62,0.70), terrain conservé, espacements comparables : n=168.
Médian : 0.0 $ / -1.4 $ / -0.6 $ / -6.9 $ / -10.8 $ à +3/+5/+10/+15/+30 ; taux positif ~50/48/49/49/46 %.

[AMBIGU] Cette première coupe ne montre aucun avantage simple à « baisser 0.62 ».
Elle ne démontre pas non plus que 0.62 est bon : les deux bandes sont faibles sans contexte.
Une première séparation trajectoire/terrain montre surtout que les cas proof décroissant + terrain NON conservé sont mauvais.
Le prochain test doit grouper par campagnes indépendantes et ajouter position dans la vague, turning réel/faux, régime et frontière.

## 7. MA200 3m / retests répétés

Le shadow MA200 contient déjà des épisodes HOLD/CROSS, mais leur étiquette finale peut évoluer tant que l'épisode n'est pas résolu.
Exemple 26/09 : une interaction commencée 16:36Z est d'abord visible comme contact/hold ouvert puis finit rétrospectivement classée CROSS_DOWN vers 20:42–20:45.
[ARTEFACT MÉTHODOLOGIQUE] On ne peut donc pas compter naïvement les `recentContacts` finaux pour simuler ce que BOONO savait au 3e retest.

Pour tester la règle Benjamin « après ~3 attaques échouées, la conviction peut monter et tolérer encore quelques retests », il faut reconstruire causalement chaque attaque :
approche → pénétration → effort → conversion sous/au-dessus → durée d'acceptation → reclaim → terrain conservé après reclaim.
Le 4e/5e test sera ensuite évalué conditionnellement à l'échec des trois premiers, sans utiliser l'issue future de l'épisode.

## 8. Divergences — anomalie confirmée à auditer séparément

[DÉMONTRÉ] Une évaluation du 26/09 23:08Z expose simultanément :
- 3m : bullish=true ET bearish=true, multiBullish=4, multiBearish=4 ;
- 15m : bullish=true ET bearish=true.
Cela confirme l'observation de Benjamin dans l'état vivant.
La lineage historique peut expliquer mathématiquement plusieurs divergences encore valides, mais ce format n'est pas adapté au contrat demandé :
une seule divergence décisionnellement pertinente par TF, celle liée au mouvement prix actuel ; les anciennes restent historiques/analytiques.

## 9. Échantillon de travail retenu

Phase A — cas semaine passée, à reconstruire marché brut puis BOONO :
1. LONG 84077.4 du 26/09 : faux/fragile turning + MA200 15m résistante + leg achevé mémorisé.
2. SHORT 84400 du 24/09 : turning positif de contrôle, +8.174 %, MFE 1066.7 $.
3. séquences MA200 3m avec >=3 attaques/reclaims avant libération.
4. sorties EXIT_STRUCTURE autour des E15 courts/intermédiaires.
5. trades avec MFE significatif puis restitution, pour tester cycle début/milieu/profit sécurisé.
6. occasions refusées par CHOC_COMBAT avant vraie translation.
7. épisodes proof 0.55–0.62 avec trajectoire et terrain.
8. divergences opposées simultanément en 3m/15m.

Phase B — 5 à 8 contrôles historiques après stabilisation des définitions.
Phase C — validation prospective aveugle sur les prochains turning/transitions/trades, sans modifier les règles entre les cas.

## Décision actuelle

Aucun code, seuil, process ou architecture modifié.
[DÉMONTRÉ] Les priorités immédiates sont d'abord sémantiques/causales : qualifier E15 majeur, redéfinir turning, puis construire une vraie transition combat→translation.
[AMBIGU] 0.62 ne doit pas être abaissé sur les données actuelles.
[DÉMONTRÉ] Le libellé « p90 du régime » doit être corrigé conceptuellement : le calcul actif est un P90 de swings sur 12 h, non segmenté par régime.

### Premier contrôle causal des retests MA200 3m

Le 26/09 avant 11:03Z, le shadow causal avait déjà enregistré plusieurs HOLD_AS_SUPPORT résolus :
07:51, 08:00, 09:09→10:12, 10:33, 10:54 et 11:00.
À 11:03:58Z : prix 84125.9, MA200 3m 84008.1 ; structure V3 LONG mais phase15 DESCENTE.
La dominance n'est pas alignée/persistante (proof .402), le 3m n'est pas aligné, aucun turning frais et R:R est insuffisant.
Entre 11:03 et 12:00, le prix reste limité à 84095.6–84166 ; puis entre 12:00 et 13:30 il chute jusqu'à 83854.7 et la MA200 finit par être franchie.

[DÉMONTRÉ] « 3 retests ont tenu » ne peut pas devenir une règle autonome.
La version testable doit être conditionnelle : frontière cohérente avec la thèse + attaques répétées + effort adverse élevé + conversion adverse décroissante/insuffisante + reclaim + rendement opposé/terrain conservé.
C'est cette séquence, et non le compteur seul, qui pourra augmenter la conviction après le 3e échec.

## 10. EXIT_STRUCTURE — inversion causale démontrée

[DÉMONTRÉ] Les 6 EXIT_STRUCTURE du 24→27/09 surviennent tous ~30.8–31.0 min après le timestamp du pivot E15 final du leg.
Dans les 6 cas, la direction du leg achevé est opposée à la position, alors que la phase oscillateur vivante vient déjà de basculer dans le sens de la position :
- LONG sort : leg achevé SHORT, phase vivante MONTEE ;
- SHORT sort : leg achevé LONG, phase vivante DESCENTE.

Cela vient mécaniquement du contrat actuel :
1. le trade peut entrer près d'un CREUX/CRETE en formation ;
2. ~31 min après le timestamp du pivot, ce pivot devient confirmé ;
3. structuralLeg() décrit alors le mouvement qui A MENÉ jusqu'à ce pivot ;
4. ACTION lit ce leg rétrospectif comme « nouvelle structure opposée » et sort le trade qui joue précisément le mouvement suivant.

Les 6 EXIT_STRUCTURE étaient tous en gain au moment de la sortie, mais ce fait ne valide pas la logique.
Captures MFE approximatives : 67 %, 89 %, 65 %, 95 %, 23 %, 58 %.
Pour les quatre cas où les évaluations post-sortie sont encore disponibles :
- trade #100 SHORT : jusqu'à ~337 $ de continuation favorable après sortie ;
- #101 LONG : ~191 $ favorables ;
- #104 SHORT : ~126 $ favorables à 3 h avant retournement ultérieur ;
- #115 SHORT : ~514 $ favorables à 3 h.
[ARTEFACT LOGIQUE] EXIT_STRUCTURE utilise donc un événement retardé/descriptif comme s'il annonçait la direction active.

## 11. E15 majeur / intermédiaire — stabilité des ancres

[DÉMONTRÉ] Les pivots confirmés ne sont pas tous stables dans la lineage.
Exemples de pivots temporaires ensuite remplacés par un extrême plus fort du même côté :
- CRETE 25/09 19:45, LBW +33.09 : visible ~13 min dans les évaluations, puis remplacée par CRETE 20:30, LBW +46.05 ;
- CREUX 26/09 04:30, LBW -36.0 : visible jusqu'à la confirmation du CREUX 06:15, LBW -51.30 ;
- CREUX 27/09 21:30, LBW -20.27 : ensuite remplacé par CREUX 23:00, LBW -71.33.

Le SHORT #100 a justement été sorti par EXIT_STRUCTURE à partir du leg CREUX 14:15 → CRETE temporaire 19:45.
La CRETE 19:45 n'était donc pas l'extrême final de cette moitié de vague.

[CONCLUSION PROVISOIRE] Il faut au moins trois niveaux :
- pivot candidat / intermédiaire : utile pour respiration et risque, mais susceptible d'être remplacé ;
- extrême E15 majeur : suffisamment mature/éloigné et lié à une translation non marginale ;
- leg achevé entre deux extrêmes majeurs : descriptif de ce qui s'est produit, pas direction active automatique.

Le critère Benjamin « écart LBW ~80 + séparation temporelle + déplacement prix non marginal » reste une hypothèse de qualification du niveau majeur.
Il ne suffit toutefois pas à réparer EXIT_STRUCTURE : même un grand leg confirmé reste par définition le mouvement qui vient de se terminer au pivot, pas le mouvement qui commence après ce pivot.

## 12. Turning prix avant turning LBW — cas 26/09 20:45→21:30Z

Creux prix/E15 : 83764.7 à 20:45, LBW autour de -48.
À 20:50 le marché est encore dominé SHORT ; prix ~83805.
Puis le prix change brutalement de comportement :
- 20:55 : ~83984, soit +179 $ en ~5 min depuis 20:50 ; dominance LONG proof 1.0 / 4 ;
- 21:05 : ~84064, soit +299 $ depuis le creux ; dominance LONG proof 1.0 / 3 ;
- 21:15 : ~84080, +315 $ ; dominance LONG .646 / 3.
Pendant toute cette séquence, le turning 15m actuel reste NULL parce que LBW n'est pas encore « nearFlat » selon la règle ±2.

MA200 3m :
- contact/reclaim ouvert depuis ~20:51 ;
- prix passe durablement au-dessus à partir de ~21:03 ;
- à 21:15 il est ~65 $ au-dessus de la MA200 3m.

À 21:14:59, V3 est encore direction LONG mais refuse uniquement sur R:R insuffisant + turning frais absent.
Depuis ce point : MFE ~+90 $ à 15 min, +280 $ à 60 min, +725 $ sur ~11 h ; MAE seulement ~25 $.

Puis à ~21:30, la confirmation du CREUX 20:45 transforme structural en SHORT (leg 08:45→20:45), précisément alors que le prix vient de remonter ~405 $.
[ARTEFACT LOGIQUE] Le changement prix était détectable causalement avant le « turning » LBW, puis la confirmation retardée du leg passé a inversé la thèse V3.

## 13. Trois retests MA200 3m — contrôle positif et contrôle négatif

### Positif : résistance 3m, 27/09 avant 22:33Z
Après CROSS_DOWN de la MA200 3m, trois HOLD_AS_RESISTANCE causaux sont résolus :
1. 21:00→21:39 : net -37.8 $, dominance SHORT .859/3 ;
2. 21:45→22:03 : net -109.6 $, dominance SHORT .938/4 ;
3. 22:27→22:33 : net -100.3 $, dominance SHORT déjà forte.

Le troisième assaut est particulièrement instructif :
- le prix n'atteint même plus réellement la MA200 : meilleure distance encore ~57 $ SOUS la moyenne ;
- cadence médiane ~9, max ~122, donc l'activité n'est pas faible ;
- rendement médian des poussées LONG ~1.17 $/BTC ;
- rendement médian des poussées SHORT monte à ~5.31 $/BTC.

À 22:33:01, BOONO est encore CHOC_COMBAT : net 60 min -201.8 $, efficacité .092, dominance SHORT .909/3.
À 22:33:31, sans hausse notable de cadence/moveP95, efficacité passe .106, net -236.7 $, dominance SHORT 1.0/4 et l'étiquette devient TRANSLATION.
Ensuite : environ -240 $ en 15 min, sans excursion adverse mesurable sur l'échantillon.
[DÉMONTRÉ] C'est un exemple propre de combat qui se résout par conversion : l'effort ne doit pas exploser davantage ; le rendement du camp gagnant devient supérieur et la frontière adverse ne peut plus être reprise.

### Négatif : support 3m, 26/09 matin
Trois défenses successives semblent d'abord favorables au LONG :
1. 07:51→07:57 : distance MA reste +70→+118 $, net +25.8 $ ;
2. 08:00→08:30 : distance reste +37→+112 $, net +16.9 $ ;
3. 09:09→10:12 : cette fois la pénétration descend jusqu'à ~67.7 $ SOUS la MA et l'épisode finit net -47.2 $.

Au troisième épisode :
- cadence max ~74.5 ;
- dominance LONG encore élevée (.898/3, terrain conservé) ;
- mais régime CHOC_COMBAT, efficacité seulement ~.056 et le terrain autour de la frontière est de moins en moins bien défendu.
Après 10:12 : MFE LONG ~+56 $ à 60 min seulement ; la MA finit ensuite par casser réellement.

[CONCLUSION] « trois retests » ne doit jamais devenir un compteur autonome.
La conviction augmente seulement si les attaques successives deviennent moins capables de pénétrer/accepter au-delà de la frontière ET si le rendement du défenseur s'améliore.
Une pénétration plus profonde au 3e test est au contraire un signal de fatigue de la défense, même si un score de dominance mémorisé reste élevé.

## 14. Le régime TRANSLATION doit devenir directionnel et causal

Le classificateur actuel est non directionnel : il utilise |netUsd| pour TRANSLATION.
Exemple 26/09 09:35 : l'état passe CHOC_COMBAT→TRANSLATION alors que le net 60 min est encore -240.9 $, tandis que la dominance micro est LONG.
Ce label décrit donc surtout l'efficacité du mouvement passé sur 60 min, pas le camp qui est en train de gagner maintenant.

À l'inverse, 27/09 02:22 : net +169 $, dominance LONG .805/3 et TRANSLATION durent ~17 min, mais le prix est déjà ~282 $ au-dessus de la MA200 3m, LBW15 ~+63 et nested3m DESCENTE ; le marché rend ensuite ~108 $ en 60 min.
[CONCLUSION] TRANSLATION ne peut pas être une permission autonome : direction, position dans la vague, distance au lieu et maturité restent indispensables.

## 15. Turning actuel — mesure exploratoire de sa valeur

Sur la portion d'évaluations encore disponible du 25/09 20:47Z au 27/09 23:59Z, 92 débuts de turning 15m ont été isolés (espacement minimal grossier 5 min).
Attention : événements corrélés, étude exploratoire seulement.

Dans le sens suggéré par CREUX/CRETE_EN_FORMATION :
- à +15 min : MFE médian ~35 $, MAE ~29 $, rendement final médian +5 $, 54 % positifs ;
- à +30 min : MFE ~72 $, MAE ~46 $, final médian +28 $, 65 % positifs.

Par amplitude LBW au moment du turning :
- |LBW| >=50 : n=26, final +30 min médian ~+66 $, 85 % positifs ;
- |LBW| 30→50 : n=39, médiane ~-1 $, 49 % positifs ;
- |LBW| <30 : n=27, médiane ~+62 $, 70 % positifs.
Le groupe <30 demande explication avant conclusion ; il peut mélanger des passages zéro/reclaims spécifiques.

Autre symptôme du lag structural :
- turning dans la même direction que le dernier leg achevé : n=50, ~58 % positifs à 30 min ;
- turning opposé au dernier leg achevé : n=42, ~74 % positifs.
Ce n'est pas une règle de trading ; c'est cohérent avec le fait que le dernier leg achevé est souvent justement celui qui mène au pivot d'où part le turning.

[AMBIGU] Le turning « LBW près de plat » contient donc de l'information, surtout aux extrêmes, mais sa définition actuelle est trop large pour servir de gate binaire.
Le déplacement net live depuis l'extrême, la vitesse, la conversion et le non-reclaim doivent devenir les variables centrales du prochain test.

## 16. Turning prix par déplacement net — seuil seul falsifié

Distribution exploratoire du déplacement net absolu sur 5 min, même échantillon :
P50 ~23 $, P75 ~46 $, P90 ~75 $, P95 ~98 $, P99 ~163 $.

Cas intéressants :
- retournement LONG 26/09 20:55 : +178.7 $ / 5 min, donc >P99 ;
- libération SHORT 27/09 22:33 : ~-203 $ / 5 min, >P99 ;
- faux turning LONG 26/09 13:07 : seulement +47 $ / 5 min, proche P75 ;
- 3e défense support 26/09 10:12 : +23 $ / 5 min, proche médiane.

Mais [FALSIFIÉ] : « mouvement >P95/P99 => continuer immédiatement dans ce sens » ne fonctionne pas.
Sur 56 chocs >P95 espacés grossièrement de 10 min, le rendement final médian devient négatif à +30/+60 min.
Sur 17 chocs >P99, seulement ~35 % restent positifs à +15 min et ~18 % à +60 min dans le sens initial : les extrêmes sont souvent des fins de poussée/flush.

Près de la MA200 3m (|distance| <=100 $), les chocs >P95 sont plus intéressants à court terme : n=17, ~76 % positifs à +15 min, ~65 % à +30 min, mais l'avantage tombe vers ~53 % à +60 min.
[CONCLUSION] Le déplacement net live est un excellent détecteur d'événement, pas une permission directionnelle.
Il doit être interprété relativement à la thèse précédente, au lieu/frontière, à l'acceptation/reclaim et à la conversion.

## 17. Protection proposée MFE 220 $ → stop +180 $

Sur les 27 trades V3 du 24→27/09, cinq ont atteint au moins 220 $ de MFE :
- #93 SHORT : MFE 1066.7 $, sortie encore +689.9 $ favorable ;
- #94 SHORT : MFE 259.4 $, sortie -81.8 $ favorable (= perte) ;
- #96 SHORT : MFE 220.4 $, sortie +177.8 $ ;
- #103 SHORT : MFE 265.1 $, sortie +111.2 $ ;
- #108 LONG : MFE 221.7 $, sortie +134.5 $.

Quatre de ces cinq trades ont donc nécessairement retraversé le niveau +180 $ après avoir atteint +220 $.
Sur ces quatre, résultat réel cumulé ≈ +4.06 % levier ; un stop théorique exactement à +180 $ aurait représenté ≈ +8.55 % levier avant slippage/frais.
Pour #103 et #108, le stockage causal disponible confirme le franchissement après MFE :
- #103 : seuil 83833.9, retour au-dessus observé ~00:40:57Z ;
- #108 : seuil 84108.3, retour sous le seuil observé ~15:38:29Z.

[AMBIGU] #93 est le risque du mécanisme : son exit final reste très supérieur à +180 $, mais les évaluations intratrade du 24/09 ne sont plus disponibles pour vérifier si un retracement intermédiaire aurait déclenché prématurément le stop.
Conclusion : 220→180 est suffisamment prometteur pour être testé, pas encore promu en loi.

## 18. TP intermédiaire / tranche shadow — expérience prospective non concluante

Le backtest historique du 19/09 reste valide comme mémoire expérimentale :
- 123 trades : 70/30 meilleur P&L du corpus (+149.75 % x10, PF 2.35), devant 60/40 et 50/50 ;
- petit régime récent de 12 trades : davantage de runner était alors meilleur, donc ratio non universel.

Mais [ARTEFACT LOGIQUE] le shadow prospectif V3 n'a pratiquement rien testé du 24→27/09.
27 trades sont présents ; 9 ont déclenché PROTECT, mais 70/30, 60/40 et 50/50 donnent tous exactement le même total que le trade principal : +2.694 %.

Cause dans tranche-shadow.js :
après un EXIT_EXECUTION profitable, le runner est fermé dès que `result.wave.direction !== direction du trade`.
Or `wave.direction` représente la phase LBW courante et peut déjà être opposée au trade au moment même du PROTECT.
Exemple SHORT 84 400 : PROTECT et RUNNER_STRUCTURE_EXIT se produisent au même prix et au même timestamp ; le runner n'existe donc jamais réellement.

[CONCLUSION] On ne peut pas utiliser les résultats prospectifs actuels pour choisir 70/30 vs 60/40 vs 50/50.
La sortie du runner devra être redéfinie après clarification E15/structure/respiration ; sinon le shadow reproduit exactement l'erreur de phase que nous venons d'identifier.

## 19. Passage en expérimentation contrôlée

Benjamin valide l'implémentation le 29/09/2026.
R1 active : `V3EXP-20260929-E15SEM-R1`.

Modification décisionnelle unique :
le dernier leg E15→E15 achevé opposé à une position ne déclenche plus automatiquement EXIT_STRUCTURE ;
l'ancienne décision reste loggée en contrefactuel.

Les métriques turning prix / rareté netMove / mémoire MA200 / combat sont ajoutées en shadow seulement.
Aucun autre seuil ni règle d'entrée/sortie n'est modifié dans R1.

Détails, tests et rollback :
`knowledge/e15-semantics-r1-implementation-2026-09-29.md`.

## 20. Bug live 29/09 — E15 majeur de creux non reconnu

Observation Benjamin + vérification serveur vers 20:24Z :
l'état V3 affiche encore `WAVE 15m DESCENTE → short`, ancré sur la CRETE 13:15Z LBW +61.35 / prix 84544.9.
Pourtant le lobe négatif suivant est déjà complètement terminé et le nouveau lobe positif est en développement.

Données MCB 15m confirmées :
- CRETE 13:15Z : LBW +61.349, high 84544.9 ;
- passage sous zéro 14:15Z : LBW -7.457 ;
- creux du lobe 16:00Z : LBW -69.921 (low barre 82937.9) ;
- plus bas prix ultérieur pendant la résolution : 82850.8 à 16:45Z ;
- retour proche zéro : 18:15Z LBW -15.231 ;
- passage positif 18:30Z : LBW +1.364 ;
- 19:00 +22.032 ; 19:15 +25.481 ; 20:00 +25.058 ; live 20:15 ~+29.7.

[ARTEFACT LOGIQUE DÉMONTRÉ] `confirmedPivots()` rejette le creux 16:00 parce que son test local
`amp = min(|v-p|,|v-n|) >= 2` donne seulement ~0.163 entre 15:45 (-69.759) et 16:00 (-69.921).
Le fond est large/plat mais structurellement majeur ; le critère de "pointe locale" confond donc platitude d'un extrême et faiblesse structurelle.

Contradiction interne actuelle :
- `wave.phase=DESCENTE` et latest pivot = CRETE 13:15 ;
- `wave.lobe.direction=POSITIVE` depuis le cross 18:30 ;
- baton `waveRegime15=haussier`.
Le bug est dans l'état V3, pas seulement dans l'affichage.

Le couple +61.35 → -69.92 a un écart LBW ~131 points, largement au-dessus de l'hypothèse ~80,
avec translation prix non marginale : c'est précisément un candidat E15 majeur selon le contrat Benjamin.

Correction candidate (NON IMPLÉMENTÉE pour préserver l'isolement R1) :
détecter l'E15 majeur comme extrême absolu d'un lobe de signe complet entre passages zéro,
au lieu d'exiger une pointe locale >2 sur les barres adjacentes.
Les E15 locaux/intermédiaires peuvent rester séparés pour respiration/risque.

## 21. Correction live validée — R1.1 MAJORLOBE

Benjamin valide la correction immédiate avant le premier trade R1.

Implémenté :
- E15 majeur 15m = extrême absolu du lobe complet zéro-borne ;
- extrema locaux séparés comme intermédiaires ;
- completedLeg descriptif ;
- thèse active issue du dernier E15 majeur + confirmation prix.

État vérifié après restart :
`MONTEE → long`, ancre majeure CREUX 16:00Z LBW -69.921 / prix 82937.9,
extrême prix causal 82850.8, completed leg SHORT descriptif, structural LONG actif.

R1 n'avait encore produit aucun trade ; l'expérience devient
`V3EXP-20260929-E15SEM-R1.1-MAJORLOBE` à 0/3 sans contamination d'échantillon.
