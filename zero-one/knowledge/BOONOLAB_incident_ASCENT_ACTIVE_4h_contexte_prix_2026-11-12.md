# Incident d'interprétation : ASCENT_ACTIVE pendant un marché BTC baissier

**12 novembre 2026 — BOONOLAB / BOONO Watch / BOONO-TV.**
**Statut :** diagnostic confirmé dans le code et les séries enregistrées ; **aucune correction décisionnelle validée ni déployée**.
**Source utilisateur :** capture TradingView du 12/11/2026 à 12:08 UTC+1, BTC vers 73 396,8 $, avec tendance descendante visible sur plusieurs semaines ; commentaire « Alors gros problème car nous sommes vraiment en Descent active ».

## 1. Conclusion confirmée

`ASCENT_ACTIVE` dans `modules/v4/layers/structural-trajectory.js` ne signifie **pas** une tendance haussière confirmée du prix. Il signifie que le **dernier pivot géométrique LBW confirmé est un CREUX**. Après une crête confirmée, le même module nomme l'état `DESCENT_ACTIVE`. L'état persiste `UNTIL_OPPOSITE_CAUSAL_EXTREME`, même si le prix demeure dans un marché descendant.

Le module V5.4.x `modules/v5/decision-v541.js` réutilise ce code dans `readings.structural54.strategicState` ; `boono-tv/tv-living-state.js` l'affiche à l'écran comme une trajectoire. Les noms « ascent » et « descent » peuvent donc être trompeurs lorsqu'ils sont présentés **sans la précision MCB15 oscillateur, origine LBW et contexte de prix**.

Cela ne démontre pas une panne de collecte ni une invention d'événement. C'est une ambiguïté de la **nomenclature ET de la relation entre autorité directionnelle MCB15 et tendance du prix**.

## 2. Reconstitution au moment de la capture

Le serveur a été interrogé peu après 12:08 CET. L'analyse temporelle ci-dessous est faite **as-of 2026-11-12T11:08:22Z** à partir des chandelles fermées.

| Unité | État par dernier pivot LBW | Preuve et horodatage |
|---|---|---|
| MCB15 | `ASCENT_ACTIVE` | CREUX LBW ≈ −64,7, bougie du 12/11 09:15 UTC (10:15 CET), confirmation disponible 10:00 UTC (11:00 CET), extrême prix 73 214,8 $ |
| Précédent pivot MCB15 | `DESCENT_ACTIVE` | CRÊTE LBW +58,5, bougie du 11/11 21:15 UTC (22:15 CET), extrême prix 74 714,2 $ |
| MCB3 | `DESCENT_ACTIVE` | Dernière CRÊTE 12/11 10:27 UTC, confirmée 10:33 UTC, LBW +53,6 |
| MCB1h | `DESCENT_ACTIVE` | CRÊTE 11/11 20:00 UTC, confirmée 23:00 UTC, LBW +63,3 |
| MCB4h | `ASCENT_ACTIVE` | CREUX LBW ≈ −73,9 le 10/11 16:00 UTC, confirmé 11/11 04:00 UTC, extrême prix 72 688 $ |

Le fait que le 4h soit lui aussi `ASCENT_ACTIVE` est significatif : ce terme ne suffit donc pas pour caractériser la **grande tendance 4h** à partir du graphique TradingView.

### Mesures indépendantes des chandelles de prix 4h confirmées

Sur les seules chandelles fermées, la dernière clôture disponible à l'instant étudié était **73 617,5 $** (bougie close le 12/11 08:00 UTC, 09:00 CET).

- Variation de **7 jours** : de 80 363,7 $ à 73 617,5 $, soit **−6 746,2 $ / −8,39 %**.
- Variation depuis le haut 4h observé le 21/10 (84 876 $) : **−11 258,5 $ / −13,26 %**.
- Prix affiché sur la capture (~73 396,8 $) : encore **−1 317,4 $** sous la crête MCB15 précédente à 74 714,2 $ ; aucune reconquête du sommet n'était montrée.
- Le niveau enregistré `VAL daily = 81 289 $` se trouve bien au-dessus de ces prix, sans que cela suffise à lui seul à prouver une défense/résistance de marché.

Ces éléments confirment **un contexte baissier de prix multi-jours** malgré les états LBW « ASCENT » de courte portée.

## 3. Conséquence sur le moteur V5

- Le directeur stratégique V5 (`structural54.director`) prend `long` depuis le dernier CREUX MCB15 ; la lecture MCB3 reste `short` dans le relevé.
- Cette opposition produit `AWAIT_TACTICAL_ALIGNMENT`, conformément à la classification dynamique V5 (ce terme n'est pas fixe).
- À **12:12 CET** (relevé après la capture), V5 était `WAIT`, sans position ouverte, avec un candidat LONG ; ce relevé est postérieur à la capture et **ne prouve pas l'état exact à 12:08**.
- La hiérarchie existante qualifie 1h et 4h principalement comme contexte ; les préconditions d'entrée V5.4.x privilégient la synchronisation 15m/3m, MF, PM, prix et invalidation. Il existe donc un **risque à étudier** d'une campagne LONG tactiquement requalifiée alors que le contexte prix multi-jours reste baissier. Ce diagnostic ne démontre ni que ces entrées sont toujours mauvaises ni qu'il faut rétablir un veto 1h/4h.

## 4. Correction de sens recommandée, non encore validée

1. **Ne pas inverser artificiellement `ASCENT_ACTIVE` → `DESCENT_ACTIVE` dans le moteur** : cela falsifierait la signification actuelle du dernier pivot oscillateur.
2. Sur **BOONO-TV**, distinguer explicitement deux niveaux :
   - `MCB15 · CREUX LBW CONFIRMÉ · REPRISE LOCALE (ASCENT_ACTIVE natif)` ;
   - `CONTEXTE PRIX 4H / 7 J · BAISSIER · −8,39 %` avec horizon et as-of visibles.
3. Pour le laboratoire, introduire une **classification parallèle SHADOW de territoire/prix**, fondée sur les hauts/bas et leur chronologie, sur MA/POC/VAL, sur la défense après retest, plutôt que sur le seul sens de la dernière oscillation LBW. Tester plusieurs horizons et échantillons, les changements de pivots, les vrais retournements et les fausses reprises.
4. Ne pas changer les règles de trading, sorties, floors, permissions 1h/4h ni les données archivées avant une analyse comparative. Toute promotion d'une qualification shadow doit être une décision séparée, testée et publiée.

**Frontière :** ce rapport ne déploie aucune politique ni retouche UI. Une intervention cosmétique qui remplacerait seulement un mot ne résoudrait pas la question de l'autorité directionnelle.

## 5. Reproduction technique

`modules/v4/layers/structural-trajectory.js` : la fonction `structuralTurns` définit `crest=v>0 && v>=p && post.every(x=>v>x)` ou `trough=v<0 && v<=p && post.every(x=>v<x)` avec `confirmBars=2` et `minAbsLbw=10` sur 15m ; `evaluate` retourne l'état du **dernier** pivot disponible.

La même expérience a été répétée sur les CSV confirmés 15m, 3m, 1h et 4h de `/root/agents-ia-zero-one/data/mcb-live/`, filtrés pour interdire les bougies non fermées au moment considéré. Les données du screenshot et du fichier V5 courant ont été distinguées.

**Statut du travail :** observation / enquête **vérifiée**, proposition corrective **non implémentée**. Les moteurs PAPER et le studio BOONO-TV restent inchangés.
