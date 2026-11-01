# BOONOLAB — Marché à faible participation, chaînes LONG/SHORT concurrentes et campagnes maintenues

**1er novembre 2026 · audit descriptif du week-end BTC/USDT sur Amsterdam**
**Nature :** enquête sur trades PAPER V4.9.4 / V5.4.3, Bâton/Audit14D, native E3/E15, shadow de maintien, ticker 4×15 et filtre V494 A/B/C/D. **Aucune décision de changement ni mise en service de stratégie dans cet audit.** Les chiffres sont un relevé au 1er novembre vers **21h27–21h38 (Europe/Stockholm)** ; les contrôles peuvent avoir été actualisés entre eux.

## 1. Hypothèse testée

Le propriétaire décrit un marché **pauvre en participation, sans conviction, avec faux départs répétés et chaînes positives/négatives coexistant**, ce qui rend des changements de polarité tactique trop faciles ; il remarque aussi que les deux moteurs **savent désormais maintenir plus longtemps certaines campagnes**.

**Constat : hypothèse d'activité et de conversion extrêmement faibles fortement soutenue.** Contradiction temporelle LONG/SHORT observée dans les événements MCB3 et croisements MCB15 Live. **Mais** un croisement Live n'est pas une nouvelle campagne E15 confirmée : la couche stratégique conserve des états plus longtemps. **Capacité de maintien constatée, rentabilité systématique non démontrée.**

## 2. Liquidité réellement mesurée — Bâton d'Audit14D

Fenêtre horaire locale **01h00–20h59**, identique les 30/10, 31/10 et 01/11/2026 (Europe/Stockholm, CET), **2 400 observations à cadence ~30 s par journée**, échantillons de fenêtres glissantes donc **corrélés**. Sources `data/audit-14d/audit-20261030T*.ndjson.gz`, `audit-20261031T*.ndjson.gz`, `audit-20261101T*.ndjson.gz`, `audit-20261101T20.ndjson`.

| Médiane des fenêtres Bâton | Ven. 30/10 | Sam. 31/10 | Dim. 01/11 |
|---|---:|---:|---:|
| Cadence déclarée par Bâton | 19,475 | 3,500 | **2,910** |
| **Débit `volumeFenetreBtc / winSec`** | **0,862 BTC/s** | 0,181 BTC/s | **0,174 BTC/s** |
| Durée d'accumulation de la fenêtre | 10,3 s | 57,15 s | **68,70 s** |
| Volume agressif BTC **par fenêtre**, pas par seconde | 8,787 BTC | 10,612 BTC | **12,020 BTC** |
| Valeur absolue `priceMove` du Bâton | 22,55 $ BTC | 5,40 $ BTC | **2,60 $ BTC** |
| Médiane de `abs(priceMove)/volumeFenetreBtc` (descriptive) | 2,501 | 0,437 | **0,191 BTC$ par BTC de fenêtre** |
| Fenêtres à `abs(priceMove)<3$` | 7,8 % | 41,4 % | **50,7 %** |
| Fenêtres classées « neutre » par Bâton | 0,8 % | 16,6 % | **21,5 %** |
| Fenêtres « haussier » / « baissier » | 48,2 % / 51,0 % | 43,8 % / 39,6 % | **39,4 % / 39,1 %** |
| Signe MF3 live contre signe MF15 raw (désaccord) | 29,2 % | 30,3 % | **24,6 %** |

**Interprétation :** le débit d'exécution agressive médian de dimanche est ~**80 % inférieur** à vendredi, le déplacement par fenêtre ~**88 % inférieur**, et le rendement descriptif du déplacement par BTC observé ~**92 % inférieur**. Le volume BTC médian d'une fenêtre augmente car **la fenêtre prend beaucoup plus de temps**, ce qui invalide une lecture naïve « la fenêtre a plus de BTC donc il y a plus d'activité ». À certaines heures dimanche, des périodes nombreuses ont presque 0 $ de translation (`abs(priceMove)` médian ~0,1 $ entre 5h–6h, 12h ou 18h locales), alors que des transactions continuent de passer.

**Ce n'est PAS une mesure de la profondeur de carnet ni une estimation vérifiée d'illiquidité passive** : les fichiers consultés ne fournissent ni spreads bid/ask historisés, ni quantités aux niveaux, ni annulations/renouvellement de quotes, ni impact/slippage réellement mesurés de nos ordres notionnels 1500 $. Le ratio prix/volume de fenêtre ne donne pas le slippage d'une transaction. Ce qui est **observé**, c'est activité agressive raréfiée et rendement de déplacement plus faible, compatibles avec des transactions absorbées ou des tentatives antagonistes de faible ampleur.

**Nuance :** les désaccords de signe MF3/MF15 ne sont pas maximaux sur toute la journée (24,6 % dimanche contre 30,3 % samedi). Ils sont **concentrés** : sur des observations horaires dimanche, 12h, 13h, 20h locales sont à 100 % de signes opposés, et 19h à ~95 %, alors que d'autres heures sont proches de zéro. Il faut lire les campagnes *dans le temps* et ne pas résumer cette contradiction par un seul taux global.

## 3. MCB : oscillations LONG/SHORT mais pas 53 retournements stratégiques

Le flux causal `data/elastic-observer-events.ndjson`, réellement horodaté, couvre pour le dimanche **00h24–21h30 CET** à la consultation :

| Événement natif / géométrique | LONG | SHORT |
|---|---:|---:|
| E3 **CONFIRMED** | 47 | 46 |
| E15 **CONFIRMED** | 8 | 7 |
| BW/LBW 3m `OBSERVED` | 69 | 69 |
| BW/LBW 15m `OBSERVED` | 27 | 26 |

- **21 des 69 quarts d'heure avec au moins un E3 confirmé** contiennent **des E3 confirmés dans les deux directions**. Ce sont des événements à des instants différents **dans la même fenêtre**, pas deux confirmations littéralement simultanées.
- Pour les croisements BW/LBW15 **Live**, **14 des 26 bougies de 15 minutes contenant au moins un croisement** présentent **les deux directions**. Sur **52 inversions de croisement successives**, **18 interviennent dans les 3 min**. Cela montre une grande instabilité **de la géométrie tactique intrabougie**, non 53 vraies inversions de directeur MCB15.
- Les décisions de V543 (segments `data/v52-paper-decisions.segment-20261101*.ndjson` et fichier courant) permettent de reconstruire **11 états de parent E15 distincts, soit 10 changements après le premier état observé**, sur ~817 événements décisionnels depuis minuit ; **six changements impliquent effectivement une inversion du camp directeur** et les autres des phases successives de même direction. Des parents de camp différent peuvent être reconnus à peu de distance de prix (premier changement vers 00h15 pour ~1 $ BTC de différence entre prix de référence), mais le changement est ancré sur un état causal E15, pas sur un simple prix de 1 $.
- À la dernière observation Elastic, ticker 4×15 `TRANSITION_UNCONFIRMED`, fraction du temps LONG **42,2 %**, SHORT **38,2 %**, contestée **19,6 %**, couverture ~99,7 %. Sur l'instant la qualité est `SILENT / CHOP_SHADOW / LOW_YIELD` : compatible avec un prix peu productif. Ces catégories restent des diagnostics non autoritaires.

**Lecture :** une chaîne MCB3 LONG et une chaîne MCB3 SHORT peuvent obtenir des preuves locales au sein du même 15m, pendant qu'une chaîne structurelle E15 n'est pas confirmée dans une nouvelle direction. En milieu peu productif, un cross tactique ou Live E15 peut donc suggérer un nouveau camp sans que **le prix conserve un nouveau territoire**. Ce qui doit être testé est la **persistance de la traduction et du territoire**, et non un veto sur la simple existence d'une chaîne adverse.

## 4. Derniers résultats PAPER des deux moteurs

Au contrôle initial du dimanche ~21h27 CET, V494 #69–76 : **8 sorties, −8,8610 USD nets**, une seule positive. #71 SHORT tenu **158 min**, MFE +175,2 BTC$ mais clôture −0,2309 USD ; #74 LONG tenu **80,5 min**, MFE +161,7 BTC$ mais −0,7169 USD ; #76 SHORT tenu **178 min**, MFE +469,4 BTC$, clôture **+4,7429 USD**. Les cinq autres entrées très courtes et perdantes ont souvent MFE inférieur à 20 BTC$ : V494 sait parfois maintenir **quand le prix avance**, mais il ouvre encore des faux départs dans le régime mou.

V543 a une nouvelle politique depuis **31/10 22h06 CET** : `v543-mcb-structure-first-floor-advisory-v1` (floor 120/90 et 220/180 = **alerte seulement**, MCB/structure dirige la sortie, hard-risk −500 conservé). Le SHORT #136 ouvert avant activation est **LEGACY** et est sorti **−4,3565 USD** sous l'ancien contrat ; ne pas le compter comme preuve du nouveau mode.

Pour les **huit trades V543 #137–144** sous la **nouvelle autorité** (entrées depuis 31/10 ~22h57 CET), **8 clôtures, trois net positives, P&L net cumulé −12,8445 USD**. Les durées attestent que le moteur sait tenir : #139 LONG **222,8 min**, net **+0,8176 USD** après MFE 271,4 BTC$ ; #141 SHORT **147,2 min**, net **−2,2296 USD** malgré MFE 254,6 ; #143 LONG **187,2 min**, net **+0,1783 USD** après MFE 121,2 ; #144 SHORT **~129 min**, net **+0,9041 USD** après MFE 302,1. Le #144 était ouvert à 21h27 local, puis a **clôturé vers 21h30** pour `V54_CONFIRMED_STRUCTURAL_TERRITORY_TRANSFER`.

**Fait décisif de la nouvelle hiérarchie :** au moment où #144 (SHORT) retraversait son floor 180 BTC$, le parent courant MCB15 était déjà indiqué LONG et la décision restait `HOLD_V54_STRUCTURE_CONTESTED_PROTECT`. L'automate PAPER a donc **refusé de fermer sur le seul floor**. Mais ce maintien ultérieur n'a pas magiquement rendu la campagne optimale : la sortie structurelle finalement exécutée a cristallisé +0,9041 USD net. `floorAttentionCount=28` depuis activation compte **épisodes distincts de retraversée de seuils**, pas 28 transactions ni 28 nouvelles campagnes.

**Point de vérité :** les deux moteurs **peuvent tenir des positions longues malgré des contre-signaux**, c'est confirmé. Ce qui n'est PAS démontré est leur capacité à **séparer systématiquement la bonne respiration du début d'une perte économiquement nuisible**.

## 5. Contre-épreuve des shadows V543 — maintien utile ET nuisible

Le fork `BASELINE_PLUS_FAST_INVALIDATION` conserve les floors (mais ajoute aussi l'invalidation rapide, donc n'est **pas une réplication exacte de l'ancienne baseline**) ; il enregistre ces comparaisons avec les **mêmes entrées PAPER** pour les cas suivants :

| Trade V543 | Nouvelle sortie PAPER MCB/structure | Sortie du shadow floor + invalidation rapide | Lecture |
|---|---:|---:|---|
| **#137 LONG** | **−3,4942 $** | +0,0922 $ (`SHADOW_BASELINE_GAIN_FLOOR`) | Le maintien a aggravé une tentative MFE 126,3 BTC$ |
| **#139 LONG** | **+0,8176 $** | +0,1584 $ (floor) | Le maintien a amélioré la capture |
| **#141 SHORT** | **−2,2296 $** | **+1,9439 $** (floor) | MFE +254,6 BTC$ pourtant rendu au-delà de la perte |
| **#144 SHORT** | +0,9041 $ | +1,8808 $ (floor) | Sortie structurelle a rendu davantage du meilleur mouvement |
| **#143 LONG** | +0,1783 $ | −3,2917 $ (invalidation rapide) | Contre-exemple : invalidation précoce peut dégrader une récupération |

**Les cinq comparaisons sont des observations de politiques à sorties différentes, pas des preuves hors échantillon** ; le shadow a ses propres ticks, peut avoir une cadence légèrement différente et l'invalidation rapide n'existe pas dans le PAPER. La relation est néanmoins nette : *supprimer l'autonomie des gain-floors démontre la capacité de maintien mais ne suffit pas à démontrer un meilleur bilan net*. Il faudra peut-être que l'attention à la dégradation de la **position** acquière un pouvoir d'exit confirmé, sans attribuer automatiquement aux signaux E3 opposés une inversion de **campagne**.

Le fork `STRUCTURAL_LEVEL_AND_TRANSFER` maintient toujours virtuellement une ancienne campagne LONG #123, valeur nette provisoire ~**+11,2092 USD** à sa dernière observation, mais **21 réentrées V543 réelles ignorées** durant son maintien. Impossible de le classer gagnant par simple comparison de ce mark et des trades qu'il n'a pas pris.

## 6. Contraste V494 A/B/C/D et Elastic

La dernière projection factorielle V494 : branches **A/B = 18 clôtures, −23,2077 USD nets**, branches **C/D = 9 clôtures, +0,2300 USD nets**. Le filtre MCB15 expérimental réduit l'exposition et les frais sur cette fenêtre, mais **ne prouve pas une supériorité hors échantillon** ; A/B et C/D restent identiques en gestion de sortie. `blockedEntries=22` est un nombre de **candidatures refusées**, pas 22 trades. Les phases Elastic très agitées restent des labels corrélés, pas des votes supplémentaires dans la machine MCB.

## 7. Hypothèses et étapes d'analyse ouvertes — rien promu

1. **Mesurer la liquidité véritable** pour des fenêtres comparables : best bid/ask et spread (bps), profondeur BTC et USD autour du mid ±0,1 / ±0,25 / ±0,5 %, prix d'exécution estimé pour 1 500 USD, time-to-refill et déséquilibre des tailles bid/ask. Sans ces snapshots L2, ne pas qualifier factuellement la profondeur du carnet de « faible ». Ajouter en SHADOW seulement, pas de nouveau veto automatique.
2. **Mesurer la contradiction réellement causale**, avec des épisodes regroupés par parent E15 (familles de preuve indépendantes) : E3 long/short dans le même 15m, durée de l'opposition MF3/MF15, MCB15 Live confirmé ou non, territoire prix repris ou rendu, efficacité de PM et durée/volume d'effort. Lier chaque inflexion et chaque faux départ à sa frontière de prix disponible as-of.
3. **Juger le maintien comme une campagne, pas comme une durée** : P&L net cumulé à l'intérieur d'un parent, frais, MFE capturé, giveback, exposition concurrente empêchée, contre-entrée potentielle. Insister sur #137 et #141 (HOLD trop tard), #139 (HOLD utile) et #143 (sortie rapide dommageable). L'expérimentation de déclassement des floors ne doit être ni abandonnée ni déclarée gagnante sur 8 trades seulement.
4. **V494** : ne pas bloquer tout week-end ni tout débit faible. #76 prouve qu'une vraie continuation peut être maintenue même dimanche ; l'étude utile compare faibles volumes **productifs** et faibles volumes **stériles** selon la persistance des preuves de territoire, sans imposer le prix de sortie ex post comme preuve d'entrée.

**Statut :** analyse et publication documentaire. Aucun changement PAPER, aucune modification des shadows, du broker ou de la source de marché dans cette intervention.
