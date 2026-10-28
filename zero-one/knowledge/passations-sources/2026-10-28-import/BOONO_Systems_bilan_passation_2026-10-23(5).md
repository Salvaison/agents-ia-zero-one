# BOONO Systems — Bilan complet de la discussion et passation

**Période : 21–23 octobre 2026, incluant l'étude rétrospective des Constitutions V1 à V4.**  
**État de référence : Amsterdam, dernier contrôle V4 le 23 octobre vers 14h28, heure de Stockholm.**  
**Nature : archive critique ; n'autorise pas de modification des décisions de trading.**

## Résumé exécutif

Cette discussion clôt l'analyse V1–V4 et inaugure V5 : un système qui ne doit plus empiler des preuves ponctuelles E15/E3/PM, mais situer **le prix et le territoire disputé**, reconstruire **la trajectoire structurelle MCB**, comprendre **les tentatives successives et leurs effets**, puis seulement qualifier une **opportunité économique**. La conversion/QUALITÉ décrit le combat et son rendement, elle ne remplace pas la campagne.

En parallèle, deux incidents majeurs ont été réparés : la réponse UI TRADES envoyait régulièrement plus de 100 Mo de JSON, et l'historique V4 de 523,5 Mo empêchait d'enregistrer une sortie de position. V4 a repris ses évaluations en DATA_OK ; V5 PAPER, très déficient, reste arrêté ; seul V5 Structure observe.

**Dernier point non corrigé à la clôture de cette discussion :** la position SHORT V5 PAPER encore mémorisée comme ouverte prolongeait une plage rose jusqu'au Live sur Vagues. Le problème a été diagnostiqué, mais le retrait de cette plage du rendu n'avait pas encore été exécuté. Il ne faut ni inventer une clôture ni supprimer la preuve : masquer sur Vagues les positions *ouvertes appartenant à un simulateur arrêté*, en conservant les 22 trades V5 clos.

## 1. Gouvernance et état des systèmes

- **BOONO Systems** : projet de moteur autonome de compréhension et paper trading sur BTC OKX. Amsterdam : collecte, décision, états et interface ; OVH : BoonoTV/rendus, séparés.
- Méthode : **« Serveur = réalité ; code = état implémenté ; documentation = mémoire ; intention = hypothèse. »** Distinguer constat, reconstitution, essai en shadow et décision opérationnelle.
- Les expérimentations V5 ne confèrent **aucune autorité** aux ordres réels. Les trades V5 décrits ont été produits par une comptabilité papier indépendante, sans ordre broker financé.
- **V4.10.10** : actif au dernier contrôle, **FLAT**, évaluations reprises (observées à 14h27m36s et 14h28m36s Stockholm), `DATA_OK`, `NO_TRADE`, admission/risk inchangés. Cela n'est pas une garantie de stabilité à 24h.
- **`boono-v5-shadow`** : PAPER arrêté, 22 trades clos, position papier SHORT résiduelle et figée dans l'archive.
- **`boono-v5-structure-readonly`** : recherche structurelle en observation, sans trades, sur les mêmes sources de marché.
- **Elastic v0.5.8** : interface existante de conversion (duel de carrés rouge/vert) distincte du nouveau moteur V5 Structure.

## 2. Bilan des quatre Constitutions, acquis et impasses

| Génération | Apprentissage conceptuel | Échantillon historique | Erreur majeure |
|---|---|---|---|
| **V1** (14–16 septembre) | Effort vs rendement ; absorption, persistance, structure vs risque | 13 trades, 5 gains, −8,87 % marge x10 brute | Connaître le combat ne suffit pas à choisir une bonne entrée |
| **V2** | WHERE → STATE → DOMINANCE → RISK → ACTION ; `UNKNOWN` ; provenance | 54 trades, 20 gains, +2,70 % marge brute | WHERE/DOMINANCE deviennent parfois des vétos ou permissions |
| **V2a** | Persistance de domination | 65 trades, 22 gains, −0,94 % marge brute | Attendre une domination stable peut signifier attendre la fin de l'impulsion |
| **V3-LAB** | Vagues et pivots E15/E3 causaux, crêtes/creux, mémoire des respirations | 146 trades, 63 gains, −1,25 % marge brute | Verrous, mémoires parallèles, sorties/réentrées répétitives |
| **V4** | MCB propose, PM traduit, ticker qualifie, risk protège ; campagne ≠ exécution | 155 trades au premier bilan, 29,7 % gains, −9,16 % marge affichée | Entre trop tard et manque des opportunités, malgré de nombreuses preuves |

**Comparaison non contrôlée :** dates/régimes différents, frais modélisés seulement à partir de V4.9.1. Ce ne sont pas des backtests A/B homogènes.

### Détérioration par périodes de V4

- **1–3 octobre, V4.1** : 33 trades, 10 gains, +30,92 % de marge brute, avec gains très concentrés.
- **3–4 octobre, V4.2** : 21 trades, 3 gains, −8,90 %. Entre #39 et #50, **95,8 % du temps exposé et 15 inversions sur 16 transitions**. Première alerte churn.
- **4–8 octobre, V4.3–V4.7** : séparation setup/conversion, rôle du ticker dégradé de verrou à qualification, 3m sans autorité automatique de sortie, veto 1h réduit ; progrès locaux mais pas de mémoire unifiée de campagne.
- **9–12 octobre, V4.9.2** : 20 trades, brut +14,27 $, frais 30,01 $, **−15,74 $ net**. Les frais révèlent une mauvaise économie d'opération.
- **12–15 octobre, V4.9.3** : 13 trades, 5 gains, **+8,29 $ net** après activation d'une mémoire MF. La détérioration n'est pas linéaire.
- **15–17 octobre, V4.10.0–.5** : multiplication de `SETUP_LATE`, `LOW_EDGE`, `WAIT_3M_15M_SYNC`, mémoire MF, `BOUNDARY_CONTEST`, règles de campagne. Audit : **94,67 % NO_TRADE sur 2 869 évaluations** ; **98 refus sur 102 évaluations** ayant candidature MCB et PM3/PM5/efficacité cohérents. Ce sont des évaluations, pas 98 trades potentiels indépendants.
- **17–20 octobre, V4.10.7** : requalification parfois utile, 14 trades, 4 gains, +2,64 $ net ; pas de résolution du fond du problème.
- **20–22 octobre, V4.10.8–10** : 7 trades, zéro gain, −20 $ net. Onze dernières clôtures : zéro gain, **−33,86 $ net**, neuf `EXECUTION_FAILURE`, dix MFE sous +120 $ BTC.

### Comptabilité V4 homogène au début de la discussion

155 clôtures, dont **92 historiques sans frais homogènes** et **63 avec modèle de frais**. Sur ces 63 : **+43,38 $ brut, −94,51 $ de frais, −51,13 $ net**, avec 17 gagnants. Ne pas présenter le P&L général « −13,74 $ simulé » comme une somme nette homogène.

### Ce qu'il faut conserver, sans copier les anciennes lois

Conserver : E15→E15/E3→E3 causaux, lobe ≠ trajectoire structurelle, Live vs confirmé et horodatage réel, ancre LBW ≠ extrema du prix, thèse vs exécution vs risque, PM Live comme traduction, ticker comme qualification, frais et prix réellement conservé. Ne pas recopier sans validation les seuils issus d'une défaite particulière, les vétos anti-churn cumulés, les permissions résultant d'un vote entre indicateurs corrélés ou les snapshots gigantesques.

## 3. Les quatre séquences de retournement analysées

**21 octobre 07h–09h15.** E3 DN/E15 DN puis E3 UP vers 08h03 et E15 UP Live vers 08h30. Une première tentative E3 inverse peut précéder le vrai retournement E15→E15 ; une deuxième tentative inverse parfois plus productive n'est **pas un quorum obligatoire**.

**21 octobre 14h30–16h30.** Amplitude d'environ 844 $ BTC. Mauvais SHORT #151 et #152. #152 entre SHORT sur PM3 ~−86 $, PM5 ~−118 $, alors que le 30m soutient LONG et qu'E15 UP Live est apparu. BOONO avait l'information, pas sa conséquence décisionnelle.

**21 octobre 23h30 → 22 octobre 00h30.** #155 SHORT ouvert vers 00h19 avec PM3 ~−180,6 $, PM5 ~−171,4 $, « conversion puissante », mais seulement MFE +14,9 $ BTC et perte nette. Bonne confirmation d'une **impulsion déjà consommée**.

**22 octobre 03h–04h.** E3 DN Live ~03h30, croisement BW/LBW3 ~03h31, E3 confirmé ~03h33, E15 DN Live ~03h34, croisement BW/LBW15 ~03h35, E15 confirmé ~03h45. Prix sommet ~84 315 $ vers 03h22 puis ~83 437 $ à 03h59 ; aucun trade SHORT. À 03h34, PM3 ~−135 $, PM5 ~−206 $, efficacité ~96 %, et prix chutant encore de ~628 $ ensuite. Ce déplacement futur est un **résultat ex post**, pas une information connue au moment d'entrer.

Recherche exploratoire : **13 chaînes E15 Live + E3 + QUALITÉ productive** avec résultat observé ; **6 sur 13** évoluent favorablement à +15 minutes, **5 sur 13** à +30 minutes, avant frais, sans simulation de remplissage. La chaîne SHORT de 03h34 est suivie de ~+429,8 $ à +15m et +753,1 $ à +30m. Ce ne sont **pas** des taux de réussite de trades V5 ; les séries ne sont pas indépendantes.

## 4. Elastic et l'interface : corrections et conceptualisation

### Visuel de conversion v0.5.4 → v0.5.8

Le graphe réutilise les bougies BTC **Waves OHLC 3m** et MA200. L'ancienne courbe bleue PM3, considérée intrusive, a été supprimée. Les deux grands carrés vert/rouge matérialisent les efforts acheteurs/vendeurs de part et d'autre de l'axe central, avec déplacement du duel dans le graphe et une information prix. La plaquette blanche translucide au milieu des carrés a été retirée : ne restent que les **volumes BTC en gras, vert/rouge opaques**. Au-dessus du graphe subsistent **ACHAT … BTC** et **VENTE … BTC**. Cet affichage est distinct de la logique décisionnelle.

### Ce que QUALITÉ représente et l'idée validée du ticker 4 × 15m

`POWERFUL`, `EASY`, `INEFFICIENT`, `SILENT`, `CONTESTED`, etc. sont des **classes de la conversion effort/rendement**, et non un système d'autorisation indépendant. Leur succession peut alterner toutes les ~30s parce que les mesures proviennent de fenêtres glissantes. Le nombre d'événements chronologiques n'est pas égal au nombre de cycles réels du marché.

L'utilisateur valide un **ticker temporel pour le graphe de conversion**, résumé sur **quatre bougies de 15 minutes** : proportion de temps productive par camp, distribution des QUALITÉS, rendement prix par effort, contre-efforts, terrain conservé, tendance des quatre tranches. Une moyenne numérique naïve des étiquettes qualitatives n'a pas de sens. Ne jamais additionner des volumes de fenêtres PM3/PM5 chevauchantes comme s'il s'agissait de transactions uniques. La statistique décrit le marché ; elle ne devient pas un vote de plus.

### Fraîcheur et horodatages

L'observateur V5 initial a souffert d'une perte d'événements lorsque le journal Elastic publiait quelques secondes **après** le dernier relevé Audit : des QUALITÉS devenaient `UNKNOWN` malgré une source disponible. Le lecteur a été corrigé pour conserver en tampon les événements futurs par rapport au relevé Audit courant.

Une autre confusion a été démontrée dans l'interface V5 PAPER arrêtée : des preuves affichées `E15 SHORT observé 07h15` et `E3 SHORT observé 07h45` étaient **en UTC**, mais l'utilisateur lisait TradingView en **UTC+2**. Ce sont respectivement des événements natifs confirmés à **09h15m44s** et **09h45m44s Stockholm**, pas des événements inexistants, et surtout **pas des preuves suffisantes d'une trajectoire E15→E15 SHORT**. L'interface a été corrigée pour indiquer heure locale, heure UTC d'origine, sémantique de signal natif et caractère **ARCHIVE GELÉE** du V5 PAPER.

## 5. V5 : orientation conceptuelle approuvée

**Trois objets fondateurs :**

1. **Campagne MCB** : contexte du prix, trajectoire E15→E15, cycles E3, range, frontières, pivots et interprétation structurelle.
2. **Mémoire Elastic** : temps source/observation, liens entre E3/E15/croisements/MF/prix, tentatives adverses, respirations, gains et pertes de territoire, QUALITÉ comme classification de conversion.
3. **Fenêtre d'exploitation** : opportunité économiquement accessible ou déjà consommée, sans liste figée de confirmations, et distincte de l'existence de la campagne.

**Deux architectures complémentaires :** observation/compréhension (« qu'arrive-t-il, pourquoi ici, comment s'est construit le phénomène ? ») puis opportunité/exécution/risk (« qu'est-il pertinent de faire maintenant, avec quel risque et quels frais ? »). Le moteur décisionnel ne doit pas reconstruire sa propre vision en empilant des permissions sans mémoire.

### Responsabilités des horizons — hypothèses, pas droits de veto acquis

Weekly/Daily situent la grande structure, 4h sa maturation/affaiblissement, 1h le contexte intraday, 15m la trajectoire de travail, 3m les tentatives tactiques. PM Live mesure la conversion réelle ; il n'est pas un arbitre stratégique indépendant de MCB. L'autorité précise du 1h/4h/Daily/Weekly reste **ouverte**. Le lent fournit contexte et mémoire, le rapide exprime et exploite le changement sans délai arbitraire de confirmation, mais sans prétendre connaître un signal non encore arrivé.

Les contre-attaques E3 successives sont à mémoriser dans la même campagne ; une première peut échouer et la suivante devenir productive, mais il ne faut pas imposer « deux E3 = retournement ». Une forte impulsion peut être suivie d'une respiration ou d'une continuation : pas de loi de retracement équivalent garanti.

## 6. V5 : premières implémentations et conclusions mesurées

### V5 Elastic Memory — recherche causale v0.1

Premier observateur réel construit : `modules/v5/elastic-memory-engine.js`, `elastic-memory-watch.js`, `inspect-shadow.js`, et `research-series.py`. Ses objets stockent segments E15, ancres Live/confirmées, tentatives E3 et leur parent, croisements liés plutôt que votes indépendants, distribution des QUALITÉS 4 × 15m, et prix observé. Au premier bootstrap historique : **18 segments E15, 17 liens intersegments marqués `UNRESOLVED_CANDIDATE`**. Ce ne sont **pas** 18 campagnes identifiées avec certitude.

Le replay permet de reconstruire le cas SHORT productif du 22 octobre 03h34, mais a révélé beaucoup de chaînes ressemblantes qui ne réussissent pas. L'identité d'une campagne doit donc être **apprise des conséquences observées**, pas fixée arbitrairement à chaque nouvel E15.

### V5 PAPER — premier moteur de décision, échec et suspension

À la demande expresse de l'utilisateur, V5 a été relié à un `opportunity-engine.js` et un `paper-trader.js` autonomes (1500 $ notionnel, capital papier 1000 $, frais taker 0,05 % par côté, une position maximum, protections virtuelles). Le moteur a réellement produit des **positions simulées locales**, sans ordre broker financé. L'interface État V4 permettait de voir hypothèse, preuves, contradictions, position et P&L ; les trades V5 étaient affichés en **plages roses** sur prix/Waves15/Waves3, distinctes des plages bleues V4.

**Arrêt demandé pour hécatombe :** 22 trades V5 clôturés, **4 gagnants / 18 perdants (18,2 %)**, résultat **−38,74 $ brut −33,00 $ de frais = −71,74 $ net**, equity papier **928,26 $**. Position SHORT à 81 745 $ restée **ouverte seulement dans l'archive figée**, sans mise à jour après arrêt de `boono-v5-shadow`. Aucun ordre V5 financé.

### Enquête post-mortem — quatre erreurs prouvées

**A. Mauvaise source de direction.** Le code utilisait `slow = a.live ? a.live : a.confirmed`, puis `direction = slow.direction`, ce qui assimilait un **événement natif E15 Live ou confirmé** à la **trajectoire causale E15→E15**. Reconstruction indépendante avec le module V4 `structural-trajectory.js` et les seules bougies 15m confirmées disponibles à l'entrée : **9 entrées V5 contre trajectoire, 0 gain, −39,25 $ net** ; **13 alignées, 4 gains, −32,49 $ net**. Le défaut n'est donc pas seulement un signe inversé ; corriger le sens ne rendrait pas automatiquement V5 rentable.

**B. Mémoire d'observation non consommée.** `threads`, `lineageEdges`, tentatives, MF, 4×15m, niveaux et terrain étaient calculés dans Elastic, mais **presque absents de l'admission**. La première décision V5 se résumait à dernier E15, E3 récent de même sens, PM3/PM5/PM Live de même signe. La QUALITÉ était descriptive et non votante, ce qui ne remplaçait pas la notion de phase.

**C. Mauvais timing.** Un PM Live presque nul du bon signe pouvait permettre un trade ; une conversion forte récente pouvait être **une impulsion épuisée**. Pas de mesure de rendement marginal, de lieu structurel ni de territoire encore disponible.

**D. Churn.** **15 inversions sur 21 transitions** entre trades, **10 réentrées opposées en moins de deux minutes**, **14 sorties sur une chaîne adverse, toutes perdantes, −61,09 $ net**. La clé anti-doublon E15/E3 n'était pas une mémoire de campagne. Sept sorties sur plancher virtuel ont seulement produit environ **+0,14 $ net** au total ; le contrôle aux 30s ne garantit pas le prix d'un stop.

Les preuves brutes de V5 ont été conservées sur Amsterdam avec empreintes : `archives/v5-paper-stop-forensics-20261023/`. **Décision maintenue : V5 PAPER reste arrêté, aucune correction stratégique ni reprise avant une nouvelle vérification et validation.**

## 7. Le cœur du nouveau chantier : structure MCB, range, enjeux et campagnes

L'utilisateur remarque que la position **géométrique et structurelle du prix** prime, comme dans sa lecture de MarketCipher : il observe les vagues, leurs respirations et leurs niveaux, sans disposer de tous les chiffres de conversion du bot. **Hypothèse à tester : nous avions accordé trop d'importance décisionnelle à PM/QUALITÉ**, au lieu de nous demander d'abord *où se déroule le combat et ce qui y est disputé*. PM et QUALITÉ restent informatifs mais ne redéfinissent ni la structure ni les frontières.

La hiérarchie de recherche est devenue :

**Position du prix / grand range / profil Daily → trajet MCB causal → tentatives E3/E15/croisements/MF et prix conservé → modèles de phénomène (respiration, continuation, retournement, reclaim, épuisement) → conversion en description → éventuelle opportunité économique.**

Les modèles ne doivent pas imposer un ordre de signaux tel que « E3 puis cross puis PM puis E15 ». Ils décrivent des phénomènes susceptibles de se produire dans des ordres observables différents, avec une origine, des preuves, des contradictions et une invalidation. **Croisement BW/LBW et signal natif correspondant ne sont pas des votes indépendants** lorsqu'ils reflètent la même géométrie.

### Position du prix, VAL, POC, VAH et grand range

Pour comprendre le combat, distinguer **frontières du grand range** et **zone de valeur Daily**. Au-dessous du VAL, l'enjeu pour les acheteurs est d'abord la réintégration puis le maintien de la valeur. Le POC et la VAH ne deviennent des objectifs possibles qu'à mesure que les zones précédentes sont réellement acceptées, sans aucune cible garantie. Une cassure rejetée peut amener une visite des supports inférieurs ; une compression peut aussi durer. Le PM LONG au VAL et le PM LONG au POC ne veulent pas dire la même chose.

L'utilisateur a **mis à jour le range** pendant la discussion. Les données sauvegardées ont évolué d'une configuration autour de VAL **82 035 $**, POC **83 876 $**, VAH **85 498 $** à un profil enregistré autour de VAL **81 238 $**, POC **83 880 $**, VAH **84 904 $**. Ne jamais appliquer rétroactivement une photographie de niveaux actuelle à une archive comme si elle avait été disponible auparavant.

### Cas réel : retournement difficile du 22–23 octobre

Après une grande chute traversant une large partie du range, le prix touche les zones inférieures. Les acheteurs accumulent des E15 UP et de nombreux E3 UP ; MF15 se redresse mais le prix alterne reprises et rejets sous MA200. Le recul sur **1h, avec E1 Live UP** dans la deuxième capture utilisateur (et non 4h/E4 Live, erreur rectifiée) permet de mieux lire les balancements. Ces signaux peuvent constituer **plusieurs attaques d'une même tentative prolongée**, pas autant de nouvelles campagnes LONG.

Les événements enregistrés entre le 22 octobre 18h et le 23 octobre 11h18 comportaient environ **10 sources E15 UP Live distinctes et 28 sources E3 UP Live distinctes** ; ce nombre brut n'est pas le nombre d'attaques indépendantes. MF15 a fortement récupéré alors que l'acceptation du prix restait disputée. La divergence haussière 4h observée entre le **8 et le 15 octobre** a une géométrie prix/LBW cohérente : plus bas BTC **80 351 → 79 725 $**, LBW4h **−74,15 → −51,10** ; la confirmation causale exacte de ses pivots reste à établir. La divergence de continuation Daily citée par l'utilisateur **n'a pas été vérifiée** dans ces contrôles. Il s'agissait d'expliquer **ce retournement particulier**, pas d'édicter une loi générale V5 selon laquelle les divergences Daily/4h commanderaient tous les trades.

### RSI et Stochastic RSI

L'utilisateur compare l'observation des grandes respirations MCB à une lecture du RSI. RSI et Stoch RSI sont des couches distinctes dans MarketCipher, mais liées au prix ; leur **valeur ajoutée au-delà de MCB** reste inconnue. Décision : ne pas créer de nouveaux votes/conditions ; envisager plus tard une collecte comparative en shadow pour tester l'information marginale.

## 8. V5 Structure v0.3 : prototype réellement programmé et affiché

Une nouvelle machine `modules/v5/structural-story-engine.js` et `structural-story-runner.js` a été programmée. Elle utilise le module causal V4 `structural-trajectory.js` sur les **bougies confirmées connues à l'heure de chaque relevé**, lit les contextes 1h et 4h séparément, localise prix vs VAL/POC/VAH et extrêmes confirmés, relie E3/E15/croisements, garde la mémoire du prix d'origine de chaque attaque, et note le territoire conservé ou perdu. Elle observe MF et les évolutions du prix sur une heure ; QUALITÉ et PM Live restent descriptifs. Les scénarios sont conditionnels, sans exécution.

Le replay a porté sur environ **2 926 relevés Audit** ; plusieurs tests empêchent un E15 Live opposé d'écraser la structure E15→E15, une attaque ayant simplement rebondi depuis un creux intermédiaire d'être comptée comme terrain retenu, et un croisement associé d'être pris comme deuxième preuve. Les niveaux actuels ne sont pas projetés dans les replays antérieurs. L'état explicite la **fraîcheur des sources** : `STALE_CONFIRMED_MCB` et `STALE_ELASTIC_EVENTS` plutôt que d'affirmer de nouvelles synchronisations sur des flux périmés.

Le processus PM2 **`boono-v5-structure-readonly`** est distinct de `boono-v5-shadow` (PAPER arrêté). Il lit et écrit ses propres fichiers, environ toutes les 90 secondes, sans ordre broker. Sa lecture du 23 octobre a notamment distingué **trajectoire 15m LONG mais contextes 1h et 4h SHORT**, avec le prix dans la moitié basse de la valeur : une hypothèse de reprise locale encore contestée, pas un ordre LONG.

### Interface

L'interface TRADES → **État V4** a été réorganisée : **« V5 STRUCTURE — LECTURE VIVANTE » en premier**, mise à jour indépendante de V4 toutes les 30s, avec prix + heure/âge de la donnée, trajet 15m/1h/4h, zone de valeur et frontière, phénomènes, E3/E15, MF/prix, preuves, contradictions et derniers changements. L'ancien **V5 PAPER** est **replié dans une archive** et son contenu est chargé seulement à la demande. Vagues contient aussi une carte structurelle et des plages V5 PAPER historiques. Ces données structurées sont calculées par BOONO ; les commentaires explicatifs rédigés dans le chat étaient parfois des **synthèses de l'assistant**, distinction explicitement reconnue.

Le moteur est encore expérimental : décrire `PULLBACK_CONTESTING_UPTREND`, un retest provisoire ou une borne ne constitue pas la preuve qu'il sait prédire ou reconnaître toutes les campagnes. Les bornes canoniques du **grand range** restent à spécifier séparément du profil Daily.

## 9. Incident Internet majeur et correctifs du serveur d'interface

L'utilisateur a consommé son forfait mobile de **200 Go** et dû acheter 20 Go supplémentaires. L'enquête a trouvé une source vraisemblablement très lourde : l'interface envoyait environ **110 Mo de JSON** lors de certains rafraîchissements périodiques de TRADES, parce qu'elle embarquait douze énormes rapports détaillés et le gros état vivant, et relisait des centaines de Mo d'historiques pour produire chaque réponse.

Correctifs déployés : API TRADES compacte, **rapports détaillés chargés uniquement à l'ouverture de Rapports**, cache des résumés de trades, moins de polling d'onglets inactifs et pas de requêtes concurrentes, compression gzip des API volumineuses. Résultats mesurés sur Amsterdam : **TRADES ~71 Ko gzip**, **Vagues LIVE 12h ~197 Ko**, **Audit ~445 Ko**, **BOONO ~42 Ko**, **12 rapports sur demande ~538 Ko**. L'API V5 Structure ajoute de l'ordre de 1–2 Ko gzip. On ne peut pas attribuer la totalité du forfait consommé à un seul flux sans la facturation/mesure réseau globale. Les vues SHADOWS restent coûteuses au calcul initial ; le passage à un journal compact 48h n'a pas encore été fait.

## 10. Incident V4 critique du 23 octobre : sortie bloquée et réparation

### Diagnostic

V4 semblait online sous PM2, mais son état n'avait plus été actualisé depuis **10h57m49s Stockholm**. Les logs répétaient `RangeError: Invalid string length` lors de `writeJson → appendCapped → recordExit → finalizePositionExit` ; l'historique `trade-sim-v4-history.json` était arrivé à **523 549 575 octets** pour 167 trades, avec de gros historiques Elastic Sync copiés dans les contextes d'entrée **et** de sortie. La sortie de protection devait d'abord écrire ce fichier géant avant d'effacer la position ; son échec bloquait donc la clôture et la boucle d'évaluation.

### Protection réellement perdue

Position V4 DAY LONG entrée à **81 669,3 $ BTC**, MFE atteint **+217,7 $ de mouvement BTC**, plancher de gain théoriquement armé à **+90 $ BTC**, correspondant à environ **81 759,3 $**. À cause de la panne comptable, **aucune clôture à ce prix n'a eu lieu**. Après réparation du stockage, V4 a enregistré la sortie au **premier prix effectivement observé** le 23 octobre vers **14h16m21s Stockholm**, **81 475,9 $**, avec **−5,050354 $ net**. Ce résultat ne doit jamais être remplacé rétrospectivement par un gain théorique.

### Sauvegarde puis réparation

Original de 523,5 Mo et état 27,98 Mo sauvegardés avec empreintes SHA256 dans `archives/v4-storage-emergency-20261023/` sur Amsterdam. Un script de compaction a conservé les **167 trades, prix, dates, identités, motifs de sortie, MFE/MAE et résultats**, et allégé les énormes contextes de recherche : **523,5 Mo → 30,23 Mo (−94,2 %)**. L'ancien processus a ensuite pu enregistrer la sortie ; l'historique a brièvement remonté vers 65 Mo, car ce processus utilisait encore l'ancien code chargé en mémoire.

Correctif permanent `trade-simulator-v4.js` : contextes d'historique bornés pour les futures clôtures sans retirer les preuves principales de décision, sérialisation JSON compacte, idempotence par identité du trade, **petit journal de récupération** si l'écriture principale échoue, et sortie validée dans l'état sans blocage par un journal accessoire. `cerveau-central.js` : boucle d'évaluation protégée par `safeTick`, pour qu'une exception d'une évaluation ne supprime plus les suivantes. **Aucun seuil d'admission ou de risque modifié.**

### Validation finale V4

Redémarrage de `cerveau-central` **après vérification FLAT**. Évaluations observées à **14h27m36s** puis **14h28m36s Stockholm**, `DATA_OK`, `NO_TRADE` (`LOW_EDGE_REQUIRES_MAJOR_MCB_OR_REINFORCED_UP + WAIT_MF_MEMORY`). Historique à **168 trades clôturés**, sans doublon d'identité ; `/api/trades` HTTP 200, ~73 539 octets gzip, ~645 ms. **96 tests V4/V5 passés**. Aucun nouveau `Invalid string length` pendant cette validation ; **une vérification de quelques minutes ne garantit pas la stabilité sur plusieurs jours**. Rapports commits `c56a0e9`, `6b1e107`.

## 11. État opérationnel et travaux non terminés

| Objet | État réellement établi au dernier contrôle | Suite appropriée |
|---|---|---|
| V4.10.10 | PAPER actif, FLAT, évaluations redevenues fraîches et DATA_OK | Suivre CPU/RAM, état V4, sorties et échecs d'archivage ; créer journal compact 48h |
| V5 PAPER | **STOPPED**, 22 trades clos à −71,74 $ net ; SHORT résiduel figé dans l'archive | Ne pas réactiver sans nouvel examen et validation |
| V5 Structure | Observateur **ONLINE** en lecture seule, environ toutes les 90s | Éprouver ses modèles de chaînes sur prix réel, acceptation/rejet et replays contradictoires |
| Interface Vagues | Bleu = V4, rose = V5 PAPER ; affichage structurel V5 | **P0 : retirer du rendu rose la position V5 gelée encore marquée ouverte**, conserver les 22 anciennes plages closes |
| Elastic / QUALITÉ | Graphique validé, 4×15m expérimenté, événements parfois périmés | Renforcer fiabilité/provenance, ne pas donner d'autorité directionnelle sans nouvelle validation |
| Range/VAL/POC/VAH | Photographie actuelle des niveaux disponible | Définir source historique et bornes du grand range distinctes de la value area |
| Log d'audit | Journaux V4 tournent trop vite à cause des états volumineux | Construire vrai journal causal compact sur au moins 48h |
| RSI/Stoch RSI | Pas de contribution marginale prouvée | Expérimentation shadow comparative si utile, pas de veto automatique |

**Point de passation particulièrement important :** la dernière demande avant ce bilan portait sur la **plage rose V5 fantôme sur Vagues**, encore prolongée au Live parce que l'état papier arrêté porte `position` non nul. La correction de cette présentation **n'a pas encore été exécutée**. On doit vérifier l'arrêt du processus et la fraîcheur du dernier relevé, puis ne plus inclure `state.position` parmi les plages actives si V5 PAPER est suspendu ; laisser intacts les enregistrements V5 historiques et ne pas créer un faux ordre de sortie.

## 12. Archives de référence produites sur Amsterdam / GitHub

- `knowledge/BOONO_bilan_cloture_V1_V4_2026-10-22.md` — bilan V1–V4.
- `knowledge/BOONO_V5_orientation_validee_2026-10-22.md` — MCB / mémoire Elastic / fenêtre ; QUALITÉ comme classification de Conversion.
- `knowledge/elastic-operational-v1-constitution-2026-10-22.md` — première constitution exploratoire, **antérieure aux corrections d'autorité**, à lire avec recul.
- `knowledge/BOONO_V5_elastic_memory_shadow_v01_2026-10-22.md` — observateur E15/E3 et replay.
- `knowledge/BOONO_V5_premier_moteur_hypotheses_paper_2026-10-22.md` — première décision PAPER mise à l'épreuve puis arrêtée.
- `knowledge/BOONO_V5_audit_critique_22_trades_arret_2026-10-23.md` — post-mortem V5, 22 trades.
- `knowledge/BOONO_V5_cas_reconstruction_retournement_2026-10-23.md` — renversement contesté, E1 Live, range et niveaux.
- `knowledge/BOONO_V5_synchronisation_structure_enjeux_v03_2026-10-23.md` — moteur structurel expérimental.
- `knowledge/BOONO_V5_live_structure_first_2026-10-23.md` — interprétation V5 vivante en premier sur État V4.
- `knowledge/BOONO_V5_correctif_archive_timezone_RSI_divergences_2026-10-23.md` — décalage UTC, archive V5, RSI et macro divergences.
- `knowledge/BOONO_V5_pink_paper_trades_on_Waves_2026-10-22.md` — implémentation des plages V5 roses.
- `knowledge/ui-bandwidth-emergency-2026-10-22.md` — réduction drastique du trafic interface.
- `knowledge/BOONO_V4_urgence_integrite_sortie_historique_2026-10-23.md` — incident V4, sortie bloquée, sauvegarde et remise en service.

## Conclusion pour la prochaine discussion

> **BOONO doit d'abord reconnaître où se trouve le prix et quel territoire est disputé.** Il doit comprendre la trajectoire MCB E15→E15, puis rattacher E3, signaux, croisements, MF et réactions du prix à la même campagne causale. La conversion/QUALITÉ sert à qualifier le résultat du combat, non à fabriquer seule la thèse. **Compréhension** et **décision d'exploitation** sont deux architectures distinctes. Un signal n'est pas une tendance ; un lobe n'est pas une campagne ; une conversion forte n'est pas nécessairement une entrée encore rentable.

V4 est revenu à un fonctionnement vérifié après une réparation d'intégrité ; V5 PAPER reste suspendu et ne doit pas être réactivé sans revue de ses mauvais trades et validation distincte ; l'observateur V5 Structure doit être jugé à partir de **ses changements d'interprétation confrontés aux effets réels du prix**, plutôt qu'au nombre d'indicateurs alignés.
