# BOONOLAB — Analyse V553 du marché tortueux 17h–23h et des trades #56 à #61

**Période : 21 novembre 2026, 17h00 CET → 22 novembre 2026, ~10h54 CET.**
**Statut : DIAGNOSTIC HISTORIQUE ET OBSERVATIONS, sans modification des décisions PAPER.**
À l'instant de l'enquête, #61 était **toujours ouvert**. Aucun gain latent ne doit être confondu avec un profit clôturé.

## Mandat utilisateur

L'utilisateur constate que V553 suit mieux son contrat, mais que le marché entre 17h et 23h était peu praticable : LBW15 oscille fréquemment autour de BW15. Il demande si le régulateur peut suspendre les nouvelles entrées dans cette configuration sans empêcher les vraies tendances ; suggère que #56 et #57 illustrent la chaîne LBW15 pente Live → Cross15 et la participation de MF15 ; qualifie #58 de trade presque parfait ; relève un récit différent entre MF15, MCB3 et PM/Conversion pour #59, estime #60 mal motivé et félicite le départ et le maintien du LONG #61.

Sources **rouvertes directement sur Amsterdam** : data/v553-paper-state.json, data/v553-paper-decisions.ndjson, data/audit-history.json, bougies ../data/mcb-live/mcb_15m.csv et mcb_3m.csv, data/boonolab-ticker4x15-samples.ndjson et segments datés, data/boonolab-market-snapshots.ndjson et segments, data/v52-paper-state.json, code modules/v553/{market,decision,paper}.js. Les mesures du SHADOW sont prises au dernier relevé AVANT chaque entrée (~1–5 secondes), sans regarder ses labels futurs. Attention : les Cross15 Live rapportés ici sont des **changements de signe observés au relevé Bâton 30 secondes**, pas nécessairement des E15 natifs différents. Les clôtures MCB CSV sont disponibles à ouverture de bougie + durée de timeframe.

## 1. Marché 21/11 17h–23h

- 720 relevés Bâton, BTC de ~59 908 à ~60 448 USD (**+540 USD net**) sur chemin absolu des variations observées d'environ **12 796 USD BTC** : efficacité descriptive ~**4,2 %**. Mesure sensible à la cadence Bâton, pas ratio de rendement financier d'un trade.
- **38 bascules de polarité Cross15 Live** et **46 bascules MCB3 Live**, notamment 12 bascules Cross15 Live durant 19h–20h et 12 durant 22h–23h. Écart |LBW15−BW15| médian sur six heures environ 3,75 unités ; vers 21h, 1,4, et 22h, 2,4. Le phénomène « LBW se tortille autour de BW » est confirmé par les données.
- Ticker autonome 4×15 : **638/720 relevés (88,6 %) STERILE_HESITANT**, 82 (11,4 %) SILENCIEUX_PRODUCTIF. Le régime autonome parallèle confirme 88,4 % STERILE.
- MF15 Live progresse pourtant d'environ **−6,1 à +30,2** pendant les six heures : direction du flux de fond et praticabilité tactique ne sont pas la même chose. Il ne faut pas contraindre une sortie de position déjà détenue à cause du seul statut de marché stérile.
- **V553 #51–#55 entrés pendant ce créneau : cinq pertes consécutives totalisant −19,2856 USD nets**, dont #54 LONG près de la borne haute du range (16,4 USD BTC de marge, pente LBW15 +0,69, PM3 +8), #55 LONG gap15 +0,27, LBW15 pente +0,28, PM Live +4,4, PM3 +22, prix gagné depuis sa chaîne seulement +13,6 BTC USD. Les résultats PAPER confirment la mauvaise exploitabilité des micro-croisements.
- V543 #308 SHORT finit au hard stop −14,20 le 21/11 20h05 ; #309 LONG ouvert 20h05 ne sera clôturé que le 22/11 03h13 avec −11,15. Comparaison qualitative seulement : comptes, expositions et décisions ne sont pas équivalents.
- Ticker n'est pas un arbitre infaillible : #51 était SILENCIEUX_PRODUCTIF mais qualité INEFFICIENT, #53 STERILE mais qualité EXCEPTIONAL sur un effort extrêmement faible, puis perd. La classification doit être confrontée à l'effort réel, au prix et au lieu, pas imposée comme permission/veto.

## 2. Trades #56 à #61 : chiffres as-of

| # | Sens | Entrée / sortie CET | Net PAPER | Excursion favorable BTC | Commentaire |
|---|---|---|---:|---:|---|
| 56 | SHORT | 21/11 22h24 → 22/11 01h18 | **+1,9580** | 460,3 | Bonne anticipation puis bénéfice largement restitué |
| 57 | SHORT | 22/11 01h25 → 01h39 | **−1,5000** | 74,3 | Effort tactique insignifiant, frais seuls |
| 58 | SHORT | 22/11 01h48 → 04h43 | **+23,9424** | 1 048,9 | Très bonne validation et conservation |
| 59 | LONG | 22/11 04h56 → 06h13 | **−11,5946** | 261,6 | Perte progressive de la thèse LONG avant Cross15 DN Live |
| 60 | SHORT | 22/11 06h16 → 07h00 | **−3,9941** | 149,2 | Réentrée directionnelle mais mal située/trop tardive |
| 61 | LONG | 22/11 07h37 → ouvert au relevé | **latence variable, non réalisé** | >1 700 BTC USD à 10h54 | Bonne chaîne et maintien des respirations |

Les clôtures **#56–#60 totalisent +8,8117 USD nets**, auxquelles il ne faut pas additionner le gain latent du #61 comme gain accompli. À 10h54 CET, equity **réalisée** V553 cumulée **1 002,9375 USD**, position #61 LONG toujours ouverte, P&L latent marqué environ **+40,01 USD**, prix BTC ~60 760, avec possibilité de variation ultérieure.

### #56 : pente précoce, Cross15 confirmé plus tard et MF15 réoriente

SHORT ouvert 21/11 22h24 avec MCB15 Live encore marginalement LONG (gap +0,26), pente LBW15 -1,62, MCB3 SHORT net (gap -11,2), PM Live -7,2 et MF3 pente -5,95. MF15 Live est **+36,64 et sa pente encore +1,33** : MF15 n'autorise PAS encore un SHORT, mais la lecture MCB3/PM initie une hypothèse. À 22h30 le MF15 confirmé atteint environ 36,6, puis recule vers 32,8 à 22h45 et 20,8 à 23h45. Cross15 confirmé DN à 22h45, séparation LBW-BW -6,1 puis -17,2 à 23h45. Les preuves vendeuses s'établissent réellement après l'entrée.

Le moteur garde SHORT pendant de nombreux faux Cross15 Live haussiers entre 00h16 et 01h09, souvent des touches de gap proches de zéro ; c'est une bonne résistance au bruit. La reprise haussière finit validée à Cross15 UP confirmé 01h15, sortie 01h18. **MFE +460,3 USD BTC contre déplacement finalement conservé +139,2** (~30 % retenus). Bonne lecture initiale mais une partie importante du mouvement est restituée. Ne pas déduire qu'une liquidation au premier Live haussier serait meilleure : de nombreux faux signaux ont été rejetés.

### #57 : prémisse vendeuse très faible

SHORT à 01h25 pendant Cross15 confirmé LONG (gap Live **+8,81**), pente LBW15 -0,75 mais écart tactique MCB3 SHORT seulement -0,93, PM Live **−0,1 USD** quasi nul, MF15 +23,11 avec pente +0,30, MF3 pente +1,75 (pas aligné au SHORT). Ticker STERILE / SILENT et prix gagné depuis la nouvelle chaîne seulement 18 USD BTC ; marché interne EMERGING_DIRECTION malgré 15 croisements Cross15 Live sur l'heure précédente et pentes qualifiées de flat. Sortie 01h39 au **prix d'entrée identique** (60 269,1), soit **−1,50 USD de frais**. La chaîne n'apportait pas la preuve économique d'une nouvelle occasion.

### #58 : excellent SHORT, et MF15 signal secondaire pertinent

À 01h48, MCB15 Live devient SHORT (gap -0,85), MCB3 SHORT **gap -16,08**, PM Live **−32,2**, MF15 encore positif +21,65 mais **pente MF15 −0,62**, MF3 pente **−2,26**. LBW15 pente -0,83 et la chaîne n'a qu'un échantillon Cross15 Live à l'entrée, donc ce n'est PAS un croisement persistent plusieurs minutes déjà vérifié ; c'est une anticipation rapide à partir de plusieurs familles concordantes. Auparavant, les premiers contacts/croisements Live étaient contestés et rejetés ; la chaîne nouvelle est propre, après la sortie de #57.

Le Cross15 clôturé DN est connu à **02h00**, gap -6,9 ; s'élargit -14,6 à 03h45. MF15 15m confirmé passe d'environ +20,4 à +8,0 entre 02h00 et 03h45 puis proche de zéro à 04h30, tout en restant longtemps du signe opposé ; sa **trajectoire** valide la thèse sans jamais avoir eu de veto sur MCB. Malgré plusieurs respirations et un faux Cross15 UP Live autour de 03h00, le moteur tient le SHORT, qui se clôt à 04h43 quand la thèse inverse est devenue structurellement crédible.

BTC 60 207,3 → 59 186,6 : déplacement SHORT réalisé **1 020,7 BTC USD**, MFE 1 048,9, restitution **28,2**, soit **97,3 % de la meilleure excursion favorable conservée** ; net **+23,9424 USD PAPER**. Exemple positif de gestion complète, pas seulement d'entrée.

### #59 : MCB3/PM/MF15 racontent la détérioration avant le Cross15 DN

LONG 04h56 à 59 393,4, parent E15 LONG, MCB3 Live LONG gap +17,39, MCB15 gap +3,66, PM Live +19,1/PM3 +146,9. Les indices permettent une hypothèse de retournement depuis un creux, mais le marché ticker est **DENSE_CONTRADICTOIRE**, MF15 niveau -5,20, pente à peine +0,39 et MF3 très négatif -36,89 malgré pente qui remonte +4,99.

- **05h00** MF15 baisse à -6,7, PM3 de nouveau négatif ;
- **05h15–05h22** MCB3 passe SHORT et les vendeurs reprennent le territoire, prix vers 59 273, MF3 redevient plus vendeur ;
- **05h30** MF15 recule vers -10,6 ;
- **06h05–06h10** MCB3 SHORT persiste et prix recule vers 59 091 ;
- **06h13** seulement, Cross15 Live DN impose EXIT_LONG à 58 993,5.

MFE temporaire de +261,6 BTC USD mais résultat final -399,9 BTC USD adverse, net -11,5946. **Le code conserve const early=false dans exitReview** : la perte pré-Cross15 des prémisses LONG sur LBW15 pente défavorable, MCB3/PM et MF15 qui s'affaiblit ne peut pas provoquer une sortie autonome tant que le Cross15 Live ne se structure pas. NE PAS remplacer cela par EXIT automatique au premier MCB3 SHORT : il y a eu des reprises et contre-signaux pendant la baisse. Rechercher la combinaison qui démontre la persistance des pertes de territoire.

### #60 : direction vendeuse plausible, mauvaise position dans le marché

SHORT 06h16:50 à 58 907,8 seulement ~3 minutes après le LONG #59 perdu. Le Cross15 confirmé DN est connu depuis **06h15**, LBW15 pente -4,27 / gapSlope -2,88 ; MCB3 SHORT, MF15 -18,55 et pente -3,70. Mais PM Live seulement **-6,3**, MF3 toujours très négatif mais pente **+1,19** (remonte déjà) et le prix BTC est **35,2 USD sous la borne basse du range 4h**, en breakout déjà avancé. Le ticker indique SILENCIEUX_PRODUCTIF mais conversion courante **INEFFICIENT**. MFE 149,2 puis réaction acheteuse ; sortie à 07h00 après Cross15 confirmé UP, net -3,9941. Ce n'est pas un trade sans signaux de direction, mais son potentiel marginal et sa localisation étaient mal qualifiés. Un nouveau E15 SHORT confirmé n'accorde pas un droit économique automatique d'entrée.

### #61 : entrée LONG et préservation du mouvement avant clôture

LONG à 07h37m20 à 59 123,1 sous E15 parent LONG. LBW15 gap +7,81 / pente +2,76 / ouverture gap +1,84 ; MCB3 LONG gap +13,21 ; PM3 +84,2/PM Live +6,5 ; MF15 encore -14,10 mais **pente +2,70**, MF3 -8,83 mais pente +3,79, ticker SILENCIEUX_PRODUCTIF/EASY, territoire prix horaire ~92,5 % conservé. Le prix se maintient d'abord près de 59 100 pendant un hachage tactique, et V553 ne ferme pas sur faux Cross15 DN Live vers 08h45 ni sur une nouvelle tentative vers 10h15. La structure 15m confirme la hausse (gap +16,4 à 09h15, +27,2 à 09h30) et le prix franchit ensuite 60k. P&L 10h54 latent +40,01 USD avec MFE +1 735,2 USD BTC ; **aucun résultat définitif tant que la position reste ouverte**. Illustration positive de la différence entre bruit MCB3 et véritable transfert d'autorité du 15m.

## 3. Défaillances du régulateur de marché vérifiées dans le CODE, pas de correctif hâtif

- Le marché V553 qualifie contested par (frequent && lowReturn) ou (flat && lowReturn). Mais **lowReturn demande simultanément** une efficacité prix/chemin et une conservation du prix **inférieures aux trois heures précédentes**. Quand ces trois heures sont déjà mauvaises, un marché toujours très faible n'est plus reconnu comme contested. Exemple #55 (flat=true, frequent=true, lowReturn=false, prix/chemin récent 5,9 % vs base 2,8 %), et #57 (flat=true, frequent=true, lowReturn=false, prix/chemin 3,0 % vs base 1,5 %), malgré 15 flips Live Cross15/heure.
- Le statut emerging se déclenche après seulement **2 observations Bâton de la chaîne avec PM/mcb3/prix favorables** ; il peut annuler SUSPEND_NEW pour une micro-inititative insignifiante (#55 prix +13,6 BTC, #57 +18 BTC, PM Live -0,1), même quand le ticker autonome juge la période STERILE. À l'inverse, **#58** était encore STERILE et contested=true à l'entrée, mais devient une véritable offensive et gagne : une interdiction catégorique de STERILE tuerait #58.
- Référence de champ incorrecte dans modules/v553/market.js : vérifie chain.live15At alors que la chaîne enregistre firstLiveAt. En pratique cela laisse passer des admissions PRE-CROSS sans contrat séparé ; certaines sont valables (#56, #46 précédent) et d'autres non (#57). Ne pas simplement forcer firstLiveAt pour tout trade ; séparer **PRE_CROSS_STRUCTURE_ECONOMIQUE** de **CROSS15_LIVE_PRODUCTIF**, avec mesure réelle de l'exploitation possible.
- MF15/MF3 restent descriptifs au niveau de la politique v1 ; le projet prévoit d'en faire un arbitre secondaire en contexte indécis. #57 vs #58 montrent pourquoi **la pente MF15 et MF3**, et non leur signe absolu, peuvent aider à départager deux moments différents.
- ExitReview utilise toujours const early=false : les contre-signaux LBW15 pente / MCB3 / PM observés lors de #59 ne possèdent aucune autorité structurale de protection autonome avant Cross15 Live. Une modification doit absolument préserver les bons HOLD #58 et #61 malgré faux Live contraires.

## 4. Recommandations expérimentales

1. **Définir le marché non praticable de manière structurelle persistante** : plusieurs croisements Live proches de zéro et rejetés, séparation LBW15/BW15 qui ne croît pas, faible gain de territoire pour les efforts, échec économique répété des différentes candidatures. Ne pas exiger de battre un historique déjà stérile pour revenir à « ouvert ». La hauteur de vague et la position du prix dans le range aident à qualifier le lieu.
2. **Distinguer la préparation d'une nouvelle offensive de son accomplissement** : pré-Cross15 avec dynamique LBW15/MF/MCB3/PM et structure favorable vs vrai Cross15 Live qui s'éloigne et produit du prix. Éviter aussi bien les #55/#57 que le blocage du #58.
3. **MF secondaire de qualité** dans un marché incertain : comparer trajectoire MF15 (pas le signe) et MF3 à l'angle des vagues et à PM et aux prix réellement retenus. Divergence = signal de réexamen, ni veto absolu ni nouvel ordre autonome.
4. **Protection de l'entrée invalidée avant le cross15** : #59 donne un cas pertinent ; étudier les faux coups adverses de #58/#61 pour ne pas sacrifier des bonnes campagnes avec une sortie trop prompte.
5. **Contrefactuels par campagne** : rejouer #51–#61, sans labels futurs ni copier aveuglément les performances des SHADOWS. Contrôler mauvaises admissions refusées, bonnes entrées #58/#61 conservées, exposition, churn, gains restitués, fausses sorties et frais. La validation as-of doit précéder toute mise en service.

**Aucune stratégie ni aucun ledger PAPER n'ont été modifiés pendant cette enquête. Cette note n'est ni une nouvelle version V553 ni un seuil validé.**
