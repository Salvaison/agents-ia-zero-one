# BOONOLAB — Les meilleures campagnes de 494 et 543 : marché préalable et preuves communes

**12 novembre 2026, enquête en lecture seule sur Amsterdam (19h29 CET).**
**Demande corrigée du propriétaire :** « Nous avons surtout analyser ce qui ne fonctionnait pas, les mauvaises entrée/sorties... là je veux que tu fasse une recherche sur les meilleurs campagnes de 493 et 543, dans quel marché ont elles eu lieu? qu'est-ce qui à précéder ces bonnes campagnes? quel est le point commun entre ces trades? » Puis précision : « Pardon j'entendais bien sur 494 et 543 leur résultat et leur comparaison ».

**Périmètre définitif : V494 PAPER et V543 PAPER.** Les résultats V493 shadow A/B/C/D ne sont **pas** le moteur comparé ; seul le marqueur de lobe du shadow A sert de **jointure auxiliaire et incomplète** pour identifier certains groupes V494. Aucun moteur, paramètre, shadow ou service modifié.

## 1. Sources et précautions

- `data/v494-paper-trades.ndjson` : **171** transactions clôturées V494 ; `data/v52-paper-trades.ndjson` : **151** transactions clôturées **V5.4.3** (#80–230), hors versions V5 antérieures.
- `data/audit-14d/audit-*.ndjson.gz` : **40 319 observations** à ~30 secondes, mais seulement du **29 octobre 19h29 au 12 novembre 19h29 CET**. Les 3 gros trades V494 des 28–29 octobre parmi ses 10 premiers ne disposent pas d'une fenêtre Audit historique complète : **ne jamais inventer leurs indicateurs précédant l'entrée**. Les chiffres des « dix meilleurs » proviennent donc de **7 V494 couverts** et **10 V543 couverts**, pour les variables historiques.
- Variables calculées strictement **`ts <= entryAt`** : débit agressif `volumeFenetreBtc/winSec` (pas profondeur de carnet), déplacement de prix signé dans le sens du trade, rendement `abs(netPrice)/sum(abs(priceDelta))`, MF3/MF15 et LBW15 Live sur 3/15/60/120 min, sans utiliser MFE futur comme preuve initiale. Contrats V543 (`entryContext.structural54`, `conversion`, `flow15`, `MA`) mémorisés à l'entrée. Source des natifs : feed `elastic-observer-events.ndjson`, quand disponible.
- Pour les **campagnes** : V543 est regroupé par le vrai `entryContext.causalChain.campaignId` parent E15 (qui peut contenir LONG et SHORT successifs). V494 PAPER ne publie pas ce parent dans son ledger de clôture ; le shadow A possède un marqueur `lobeStartTs` appariable sur **93/171** entrées exactes. **Ses regroupements ne couvrent donc qu'un sous-ensemble : ils n'ont pas vocation à reconstituer toutes ses campagnes**. Ne pas les comparer comme deux cohortes exhaustives.
- Tous les P&L sont nets après frais simulés, notionnel virtuel 1 500 USD. Les prix/mouvements en **BTC$** ne sont pas des profits du compte. Les « dix meilleurs » sont sélectionnés après coup : cette étude identifie des *corrélations*, aucune supériorité prédictive ou seuil de trading n'est démontré.

## 2. Les campagnes gagnantes à connaître

**494 PAPER — exemples, regroupement par lobe seulement sur les entrées appariées :**
- **#95 LONG −8,3462 $ puis #96 LONG +29,7922 $**, 4 nov. 03h01–06h55, **net ensemble +21,446 $**. Au moment du bon #96 à 04h46 : prix sur les 60 minutes avant **−379,9 BTC$ contre son LONG**, mais +68,4 BTC$ sur 15 min, +81,6 BTC$ sur 3 min ; débit préalable 15m **1,483 BTC/s**. Inflexion captée alors que le grand déplacement baissier précédent n'était pas encore effacé.
- **#161 SHORT −4,38 $ puis #162 SHORT +16,0874 $**, 11 nov. 20h00–12 nov. 00h16, **ensemble +11,70 $**. Avant #162 : +331,4 BTC$ de déplacement horaire contraire au SHORT, mais une ouverture du SHORT malgré des signaux MCB tactiques contradictoires ; débit 15m ~1,067 BTC/s. Attention : le déplacement net des 15 minutes avant ce #162 restait **+97,7 BTC$ vers le haut** (donc **−97,7 BTC$ dans le sens du SHORT**) ; il serait faux de dire que chaque bon trade attend une 15m alignée.
- **#136 LONG +12,6982 $ puis #137 LONG −2,51 $**, 8–9 nov., **net +10,18 $** : le meilleur #136 intervient après **−1 005,6 BTC$** sur l'heure précédant l'entrée et une cadence forte (débit 15m ~0,966 BTC/s).
- **#143 SHORT +11,5784 $**, 9 nov. 17h01 : avant l'entrée **+722,8 BTC$ sur l'heure en sens contraire**, mais ~−80,6 BTC$ sur 15m dans le sens SHORT, et LBW15 ~+78 à l'entrée.
- Autres contre-exemples indispensables à l'idée de « gros volume obligatoire » : **#58 LONG +7,8419 $** du 30/10 avec débit 15m ~**0,208 BTC/s** ; **#76 SHORT +4,7429 $** du 01/11 avec débit ~**0,100 BTC/s**. Ils ont été profitables malgré un marché silencieux.

**543 PAPER — regroupement fiable par parent E15 :**
- **#173 SHORT +51,0325 $**, 5 nov. : parent stratégique encore LONG, phase `STRUCTURAL_REVERSAL_FORMING`, mais offensive SHORT déjà traduite de **−234,1 BTC$ sur les 15m précédentes et −564,9 BTC$ sur 60m** ; débit 15m **1,265 BTC/s**, MF3/MF15 baisse, retest du prix défendu, E15 SHORT Live. Représente une transition productive avant bascule complète du parent.
- **#165 LONG +38,4549 $**, 4 nov. : `STRUCTURAL_CONTINUATION`, territoire réellement retesté et défendu, MF renforçant ; prix +42,1 BTC$ sur 15m et +184,6 BTC$ sur 60m, débit 15m **0,342 BTC/s**. **Contre-exemple au profit immédiat obligatoire :** après entrée, prix encore −51,9 BTC$ à 15m et −36,7 à 45m, puis grande réussite sur trois heures.
- **#161 SHORT +23,0572 $**, 4 nov. : mouvement vendeur déjà **−232 BTC$ sur 15m**, **−389,8 sur 60m**, débit 15m 0,523 BTC/s. **Mais le parent complet #158–161 fait seulement +8,1582 $** après trois faux départs.
- **#162 LONG +20,8466 $**, 4 nov. : la nouvelle hausse avait déjà avancé de **+586,8 BTC$ sur les 15m précédentes**, et +806 BTC$ sur 60m, débit 15m 1,690 BTC/s ; entrée plus tardive que 494 #96, mais cohérente avec une continuation établie.
- **#202 LONG +9,8715 $ puis #203 SHORT +14,3282 $**, 9 nov., **même parent E15 +24,1997 $**, preuve qu'une histoire stratégique peut comporter deux sous-campagnes tactiques rentables. Le SHORT #203 démarre avec un débit 15m modeste 0,248 BTC/s, après reprise d'un territoire vendeur.
- **#230 SHORT +10,4918 $**, 12 nov. contre parent encore LONG ; le prix avait déjà décliné **−307,3 BTC$ sur 15m et −577 BTC$ sur 60m**, débit 15m 1,796 BTC/s, territoire prix défendu.
- **#172 SHORT +9,3542 $**, 5 nov. à 11h45 : excellent contre-exemple aux seuils bruts, prix −177,1 BTC$ en 15m, mais débit 15m seulement **0,213 BTC/s**.

## 3. Le contraste central dans les indicateurs disponibles à l'entrée

**Top 10 des trades nets réalisés** dans chaque moteur. Pour les mesures pré-entrée : **7 V494** sont entièrement couverts par l'Audit, **10 V543** le sont.

| Mesure as-of | V494 top10 | V543 top10 |
|---|---:|---:|
| Trajet signé **3 min** dans le sens de l'entrée | +81,6 BTC$ (7/7 positifs) | +30,6 BTC$ (8/10 positifs) |
| Trajet signé **15 min** | +68,4 BTC$ (4/7 positifs) | +156,6 BTC$ (**10/10 positifs**) |
| Trajet signé **60 min** | **−335,6 BTC$ (7/7 négatifs)** | **+241,4 BTC$ (9/10 positifs)** |
| Débit agressif médian **15 min** | **1,047 BTC/s** | 0,525 BTC/s |
| Médiane de durée des dix meilleurs trades | 121,8 min | 203,2 min |
| MFE médian **APRÈS entrée** | 994,5 BTC$ | 1 064 BTC$ |
| MAE médiane **APRÈS entrée** | 39,4 BTC$ | 43,4 BTC$ |

**Interprétation de recherche :**
- **V494** se distingue quand une **contre-offensive tactique de 3m** se développe après un mouvement d'une heure **dans le sens opposé**. Le prix peut encore être défavorable sur 15m, et MF15 négative pour LONG (ou positive pour SHORT) : une inflexion exploitable n'exige pas que toutes les preuves lentes soient déjà alignées. Dans les 125 trades V494 avec historique as-of 60m : 48 possédaient le motif « 3m en sens de l'entrée / 60m contraire », **17 gagnants (35,4 %) et +19,98 $ nets** ; les 77 autres **12 gagnants (15,6 %) et −196,10 $ nets**. **Aucune règle n'est validée par cette seule cohorte non indépendante**.
- **V543** se distingue dans ses meilleures réussites par **un mouvement favorable déjà traduit sur 15m, souvent aussi 60m**, même si le directeur E15 stratégique est encore opposé. **6 des 10** meilleures entrées sont `STRUCTURAL_REVERSAL_FORMING`, **4** `STRUCTURAL_CONTINUATION`. **10/10** possèdent un territoire déclaré confirmé (6 MA3 acceptées / 4 prix retesté défendu), **9/10** flow `REINFORCING`, et **8/10** `economics.viable=false` malgré leur réussite.
- **La qualité du déplacement précédent reste un faux ami** : sur les 15m précédant l'entrée, le ratio prix net / trajet total médian est **0,106 pour les meilleurs V494 contre 0,219 pour les V494 perdants**, et **0,223 pour les meilleurs V543 contre 0,238 pour les V543 perdants**. Le marché précédant une grande campagne n'était donc pas toujours déjà directionnel « propre ».
- **Le débit favorable est relatif, pas universel :** meilleur V494 débit 15m 1,047 contre **0,388** pour perdants ; meilleur V543 0,525 contre **0,317** pour perdants. Pour V494, l'accélération débit 15m / débit 120m est médiane ~**1,40×** pour top10 couverts contre ~**0,99×** pour perdants ; pour V543 ~**0,99×** contre ~**0,90×**. Mais #58 et #172 gagnent avec débit faible : veto faible volume interdit.
- **La catégorie de marché préliminaire 3 niveaux** (0,226 / 0,552 BTC/s à 1h, frontières calculées sur les 1–7 nov., non validées) classe les 7 top10 V494 couverts **6 FORT + 1 MÉDIAN** ; les top10 V543 **4 FORT + 5 MÉDIAN + 1 FAIBLE**. Ce n'est pas encore une autorité de trading.
- **Contre-épreuve essentielle V543 :** parmi les 151 entrées V5.4.3, `REINFORCING` s'applique à 134, dont **80 perdantes** ; la plupart des pertes ont aussi un territoire déclaré validé. Avoir MF renforçant, MA3 acceptée ou retest déclaré ne suffit donc pas à distinguer automatiquement une bonne campagne. Le réglage `economics.viable` de l'époque donne **false** à 8 des 10 meilleurs trades : un verrou sur cette variable aurait détruit les gagnants.

## 4. Quel suivi de prix a réellement différencié les meilleures campagnes ?

La qualité de la continuation **APRÈS l'entrée** est mesurée au prix Bâton enregistré, pas confondue avec une preuve disponible avant l'admission :

| D'ici 45 min après entrée | V494 top10 couverts | V494 perdants couverts | V543 top10 | V543 perdants couverts |
|---|---:|---:|---:|---:|
| Prix dans le sens du trade | **6/7 (85,7 %)** | 39/96 (40,6 %) | **9/10 (90,0 %)** | 35/77 (45,5 %) |
| Déplacement médian signé après 45m | **+493,9 BTC$** | **−64,0 BTC$** | **+459,4 BTC$** | **−20,0 BTC$** |

À 15m après entrée, **5/7 V494 top** (contre 38/96 perdants) et **7/10 V543 top** (contre 29/77 perdants) avaient déjà le prix favorable. Mais **V543 #165**, son deuxième meilleur trade (+38,45 $), était encore en territoire défavorable **à 15m et à 45m**, avant de produire la grande hausse. Toute politique de sortie trop rapide basée sur 15–45 min casserait aussi cette réussite.

**L'un des points communs les mieux observés :** les campagnes gagnantes finissent par convertir l'hypothèse en mouvement durable, avec une MAE globale post-entrée nettement moindre que les perdantes. **Mais leur départ peut être hésitant**. Il faut une mémoire de la progression et de la défense du prix, pas un minuteur de clôture ou une case « déjà productif » figée à l'entrée.

## 5. Résultats par parent et intégrité de comparaison

**V494** : seulement **93 des 171** entrées se joignent exactement aux entrées du shadow A pour obtenir le `lobeStartTs`. Parmi ces **54 groupes partiels**, 16 sont nets positifs et 38 nets négatifs ; les 10 meilleurs groupes partiels totalisent **+79,40 $**. Les 10 meilleurs débuts de lobe ont un débit 15m médian **0,637 BTC/s**, contre **0,347** pour les 38 groupes négatifs. Leur déplacement 60m médian avant **le premier trade de la campagne** est **−177,3 BTC$ dans le sens du futur trade**, contre **+70,7 BTC$** pour les groupes négatifs. **Attention : groupement partiel, pas taux général de réussite des campagnes V494.**

**V543** : **151 trades répartis en 84 parents E15**, 30 parents net positifs et 54 nets négatifs. Les 10 meilleurs parents totalisent **+181,01 $** ; leurs premières entrées sont précédées d'un débit 15m médian de **0,713 BTC/s**, contre **0,319** pour les 54 parents négatifs (47 avec Audit antérieur). Le déplacement signé 60m médian avant la première entrée est **+170,2 BTC$**, contre **+128,1 BTC$** chez les parents négatifs. Le parent #158–161 +8,16 $ apparaît parmi les meilleurs, mais le **meilleur trade #161 a effacé trois essais perdants** : ne pas oublier le coût de découverte du mouvement.

**Conclusion prudente :**
1. **494 tire ses meilleurs résultats de la saisie de transitions** : le mouvement horaire précédent est encore opposé, une translation tactique récente apparaît, et l'énergie du marché augmente souvent. C'est une *signature à vérifier*, pas un veto CONTINUATION.
2. **543 tire ses meilleurs résultats du suivi d'une offensive de prix déjà amorcée**, y compris contre l'ancien parent E15. La phase `STRUCTURAL_REVERSAL_FORMING` contribue fortement aux grands gains ; elle comporte néanmoins aussi de sévères pertes (#183/#185). Le label `REINFORCING` ou `territoryValidated` n'est pas assez discriminant à lui seul.
3. **Point commun aux deux :** preuves MCB et traduction prix prennent suffisamment de substance pour **être conservées au-delà des contre-attaques** ; la grande majorité des meilleurs trades ont un comportement favorable à +45min, alors que les perdants non. Cette évidence a posteriori ne peut être utilisée comme preuve d'entrée : tester la persistance *as-of* pendant la campagne et les requalifications contre les mauvaises entrées.
4. **Ne pas confondre marché productif avec volume fort** : #58 V494 et #172 V543 réussissent avec débit faible. Une intensité relative plus forte favorise plusieurs réussites, mais le critère économique demeure **le territoire conquis et retenu**, pas la cadence brute.

**Suite expérimentale proposée sans modifier PAPER :** confronter « 494 3m reprise après 60m opposées » et « 543 prix déjà traduit 15m et retest véritablement défendu » à de **nouveaux** épisodes, sous la grille des trois niveaux d'intensité et six qualités de marché, en archivant gains captés, admissions manquées, retours de prix et durée de maintien. Tester aussi la réponse des positions à 3/15/45 min **sans oublier #165**, qui a démarré lentement.
