# BOONO Systems — Interface Amsterdam et socle de BOONO Watch
## Passation technique et fonctionnelle consolidée — 10 novembre 2026

- **Statut :** référence de passation actualisée et document de travail interne.
- **Document d’origine :** `BOONO_interface_Amsterdam_socle_Watch_2026-10-19(2).md` (audit historique du 19/10/2026, conservé).
- **Référence de code vérifiée :** branche `main`, commit `05d9e39` (10/11/2026, retrait des anciens panneaux Elastic et Vagues).
- **Périmètre :** interface privée du VPS Amsterdam, données et contrôles associés, pont d’observation vers BOONO Watch. **Hors périmètre :** studio de diffusion BOONO-TV sur OVH, application commerciale multi-utilisateur et ordre financé.

> **Principe directeur :** État vivant = ce que BOONO observe, qualifie et décide ; Vagues = où et quand les phénomènes se développent ; Historique et rapports = actions et résultats ; AUDIT = relevés normalisés ; SHADOWS = hypothèses observées sans voix dans la décision. Le moteur et l’interface ne doivent jamais être confondus.

---

## 1. Pourquoi cette réécriture et ce qui a changé depuis le 19 octobre

Le document initial décrivait un prototype privé largement centré sur **V4.10.7** et son écran « État V4 ». Son instantané du 19/10 (143 trades, absence de position, motifs d’abstention) reste une **preuve historique datée**, pas une photographie actuelle. Il n’est pas reproduit comme état permanent.

Au 10/11, le centre de lecture a été déplacé vers **l’État vivant V5.4.3 PAPER**, présenté dans cinq modules verticaux. Le V4.9.4 PAPER et le shadow Elastic V494 peuvent continuer à fonctionner, tandis que **V4.10.10 est une archive arrêtée**. L’ancien graphe Conversion plein format et l’ancienne carte « Elastic v0.5.8 · archive V4.10.10 » ont été retirés de l’affichage courant **sans effacer les historiques ni désactiver les moteurs**.

Trois natures d’opérations doivent rester distinctes :
- **Présentation Watch** : lecture, classement, mise en forme, chronologie, graphique, calculs descriptifs et archives consultables.
- **Calculs des moteurs PAPER** : décisions, ordres simulés, invalidations et gain-floors. Les retouches d’interface documentées ici ne leur confèrent aucune nouvelle autorité.
- **Laboratoire SHADOW** : lectures parallèles et expériences, qui peuvent être instructives sans être des règles actives de trading.

## 2. Déploiement, accès et structure

### 2.1 Hôte et processus

- Dépôt : `/root/agents-ia-zero-one/zero-one` sur le VPS Amsterdam.
- Serveur Web : `modules/config-server.js`, processus PM2 **`config-server`**, port privé configuré par `CONFIG_UI_PORT` (valeur par défaut : **80**).
- Authentification : `express-session`, contrôle `requireAuth` sur les routes privées, redirection HTTP **302 vers `/login`** sans session valide ; réponses sans cache, JSON éventuellement gzip.
- Moteurs séparés observés en ligne au contrôle : **`boono-v494-paper`**, **`boono-v543-paper`**, **`boono-v494-elastic-shadow`**. **Ne jamais les redémarrer pour une retouche cosmétique de Watch.**
- BOONO-TV, studio, projections, éditeurs et lecteur vidéo résident sur une infrastructure **OVH distincte** et suivent un autre cycle de déploiement. Le fait que des données Amsterdam y soient projetées ne transforme pas OVH en moteur.

### 2.2 Navigation privée

Navigation principale conservée : **TRADES · NIVEAUX · SCENARIO · AUDIT**. Sous **TRADES** : **État vivant · Vagues · Historique · SHADOWS · BOONO**. Les rapports détaillés sont également accessibles depuis les trades et les vues de rapports.

L’apparence reste celle d’un laboratoire : fond très clair, cartes fines, monospace compact, accent de navigation bleu. La largeur principale est limitée à **480 px** ; l’État vivant utilise désormais **une colonne unique** sur ordinateur comme sur téléphone. Le téléphone est la surface de lecture de référence, mais ce n’est pas un produit public autonome.

## 3. Chaîne des sources : qui produit quoi ?

```text
OKX BTC-USDT-SWAP (trades WebSocket, cours, volumes)
   ├──> prix BTC LIVE et duel acheteurs/vendeurs sur 3m
   ├──> OKX chandelles 1m confirmées (volCcy en BTC)
   │       └──> volume BTC/min et intensité moyenne du ticker 4×15
   └──> collecteurs / Bâton / AUDIT (~30s)
               └──> flow, PM, cadence, MCB Live, mémoire de marché

MCB/TradingView (3m / 15m / 1h / 4h)
   ├──> CSV confirmés + lectures intra-bougie
   ├──> événements Elastic/AUDIT horodatés
   └──> V5.4.3 PAPER et V4.9.4 PAPER (états isolés)
               └──> fichiers d'état et journaux de décision

                  config-server (authentifié)
                     ├── État vivant V5 (5 cartes)
                     ├── Vagues Prix / MCB15 / MCB3
                     ├── Historique et RAPPORT
                     ├── SHADOWS (dont Elastic 4×15)
                     ├── AUDIT
                     └── Niveaux / Scénario (édition privée)
```

**Ne pas assimiler :** prix spot/variation BTC ; volume **exécuté**/liquidité au carnet ; PM3/PM5/Live ; qualité de conversion ; pronostic MCB ; décision effective ; observation SHADOW ; P&L PAPER. Ces familles ne portent pas la même unité, la même fenêtre ni la même autorité.

### 3.1 Temps, disponibilité et fraîcheur

- `/api/v52` renvoie la synthèse bornée de `data/v52-paper-state.json` et enrichit l’écran avec la chronologie et les mesures **strictement descriptives**. Le client tente sa mise à jour environ **toutes les 10 secondes** lorsque l’onglet est actif.
- Les événements E3/E15 et croisements BW/LBW proviennent de la mémoire Elastic et des relevés AUDIT. Le serveur lit des queues bornées et applique un cache par date de modification ; **le flux n’est pas un second moteur décisionnel**.
- MCB15/MCB3 « confirmé » : valeurs de bougies CSV ; « Live » : valeurs intra-bougie fraîchement observées. Une donnée AUDIT Live trop ancienne n’est pas affichée comme actuelle (contrôle de fraîcheur de l’ordre de **95 s**).
- Les heures doivent distinguer **origine du phénomène**, **instant de confirmation/disponibilité** et **instant d’observation affiché**. Une valeur BW/LBW reconstruite à proximité d’un événement AUDIT n’est pas nécessairement un tick exact du signal.
- Le client surveille la fraîcheur du cours OKX ; si le WebSocket n’est pas frais, une lecture V5 serveur peut le suppléer, **sans présenter une ancienne cotation comme Live**.
- Un HTTP 302 non authentifié démontre la protection de la route, **pas** la validité graphique de toute la page.

## 4. État vivant V5.4.3 — cinq modules, en une colonne

**Fichier de rendu :** `modules/config-server.js`, fonction `renderV52Living(data)`. Les écrans V5 sont alimentés en priorité par `/api/v52`, pas par l’archive V4.10.10. Les chiffres donnés ci-dessous sont des **formats et conventions**, jamais des relevés de prix figés.

### 4.1 Module 1 — MCB15 · DIRECTEUR

- Thèse stratégique MCB15, état/maturité et rapport à la campagne.
- **BW15 et LBW15 : précédent confirmé en gris / Live en couleur**, avec évolution calculée et horodatages.
- Cross15, E15 Live et E15 confirmé dans la chaîne observée, avec sens, heures et, lorsque disponible, BW/LBW à l’instant de référence. `Since` désigne un **déplacement du prix BTC depuis l’événement**, pas une variante cachée de PM Live.
- `MF15` confirmé/Live, pente et lecture du flow. `MA15` et mémoire des retests visibles comme tests de structure, non comme veto implicite.
- La **mémoire de pivot géométrique** peut être affichée à titre informatif : elle n’est **pas automatiquement** l’origine d’un signal E15 natif.

### 4.2 Module 2 — MCB3 · TACTIQUE

- Même grammaire temporelle que MCB15, mais sur les phénomènes 3m.
- BW3/LBW3 confirmé gris / Live coloré, Cross3, E3 Live, E3 confirmé.
- `MF3` et `MA3`, interactions et retests.
- Rôle : synchronisation tactique, première respiration, conversion locale, confirmations ou contradictions au directeur 15m. Les événements ne sont pas des votes indépendants si leur causalité est commune.

### 4.3 Module 3 — Lieu

Ordre retenu : **4h → grand range / POC → niveaux enregistrés → détails**.

- **4h** : BW4/LBW4 précédent confirmé / dernier confirmé, puis dernier E4 confirmé connu si disponible ; les données proviennent de `mcb_4h.csv` et leur clôture est datée, pas d’un E4 Live inventé.
- **Grand range** : lire exclusivement le groupe utilisateur enregistré en `VAL/POC/VAH big-range` ; un groupe `daily` doit rester identifié comme tel. Ne pas substituer automatiquement l’un à l’autre.
- **Position géométrique** (non plafonnée) : `100 × (prix − VAL)/(VAH − VAL)`. VAL = 0 %, VAH = 100 % ; valeurs négatives sous VAL et au-delà de 100 % au-dessus de VAH.
- **Position relative à la Fair Value (POC enregistré)** : POC = 0 %, VAH = +100 %, VAL = −100 %. Normalisation différente au-dessus et au-dessous du POC, donc parfois asymétrique ; ce **POC est un repère enregistré, pas un prix fondamental garanti**. L’écart BTC `prix − POC` reste visible.
- **Niveaux** : plus proche au-dessus et plus proche en dessous du prix, notamment DS/WS selon l’emplacement réel ; distance signée convention **prix − niveau**.
- **Fibonacci** : les ancres saisies `fib0/fib1` et le niveau 0,382 manuel restent identifiables en détails ; le « Fib campagne illustratif » dérivé d’autres extrêmes a été **retiré** du résumé principal. Le `groupId` est un identifiant de registre, pas un ratio 0,4.
- **Volet « Autres repères »** : Fibonacci, MA3/MA15, mémoire de retests, origine 2h, territoire et ancre de risque. Son état ouvert/fermé est conservé lors des actualisations.

La couche `livingPlaceLandscape()` dérive ces lectures **sans modifier `data/levels.json`**.

### 4.4 Module 4 — Conversion · PM OKX LIVE 3min

**Disposition :** colonne gauche pour graphique et ses relevés ; colonne droite pour **quatre cartes superposées 4×15min**, jusqu’en bas des relevés. Les bandeaux de titre et Δ BTC 3m sont blancs. La présence des quatre cartes n’autorise aucune décision de trade.

**Graphique actuel (`modules/elastic-mini-conversion-v542.js`) :**

- Fenêtre d’environ **150 min** de vraies bougies 3m. Source OHLC : `/api/elastic-chart-3m`, issue des mêmes séries que Vagues ; mise à jour directe plafonnée à environ **45 s** pendant la lecture de Watch.
- **Échelle verticale automatique** selon les plus hauts/bas observés (mèches et cotation fraîche), sans les anciens plancher de 500 $ et plafond de 1 600 $. Une marge visuelle évite de couper les extrêmes. Les graduations du prix sont **transparentes** au-dessus des bougies.
- Les repères horaires verticaux ont été volontairement rétablis à une présence discrète : **`#edf1f3`, 0,55 px**.
- Les dix pastilles de volume à gauche mesurent environ **10,5 px**, bordure noire, blanc inactif, gris clair actif ; seuils fixes du **volume BTC exécuté sur 3m** : `1, 2, 5, 10, 20, 50, 100, 200, 500, 1000 BTC`. Elles ne représentent pas le carnet d’ordres.
- Les deux surfaces acheteur/vendeur sont semi-transparentes, séparées par l’axe bleu de référence de déport du prix. Montants **BTC sans les mots « Achat » et « Vente »** dans le tracé, verts/rouges ; taille supérieure pour téléphone.
- En haut : cours BTC et **MA200 3m / distance signée** ; en bas : **Δ BTC 3m** et déport prix normalisé, heures Début/Fin.
- **Ne pas supprimer sous le graphe** : MF3 Δ3m, MF15 Δ10m, cohérence/role MF15, âge Bâton ; `Bâton`, `PM3/PM5/Live` ; `eff3, yield/P75, effort/P75` ; vitesse 3m ; qualité et direction. L’absence de preuve est matérialisée par « — ».

**Chaîne Live des volumes et PM :**

`/app.js` conserve **un seul WebSocket OKX BTC-USDT-SWAP**. `modules/elastic-live-conversion-v541.js` reçoit ses ticks et construit le duel initiateur sur 3min (taille des contrats convertie en BTC). Le prix frais est propagé directement à `BoonoMiniConversion.setQuote()` ; le rendu des volumes/PM est alimenté par `BoonoMiniConversion.refresh(snapshot)` à cadence limitée d’environ **5 s** lorsque Watch est actif. **PM3/PM5/Live** proviennent de l’analyse courante V5 ; ne pas en déduire une « qualité P75 calibrée » si la source n’en fournit pas la preuve.

**Ticker Elastic 4 × 15 min :**

- Source de **qualités historiques** : `data/v494-elastic-shadow-summary.json` → `modules/attention/v494-elastic-ui-summary.js` → `/api/shadows/v494-elastic` ; quatre fenêtres horodatées, de la plus récente à la plus ancienne.
- Première ligne compacte : **`Vol moy: 70% · 62,1BTC/min`** (exemple de format). Le **pourcentage n’est pas rapporté à une moyenne 24h**. C’est la moyenne, sur les minutes confirmées du créneau, du score 0–100 des **mêmes dix seuils de pastilles 3m** : somme des trois dernières bougies OKX d’une minute à chaque minute close, puis moyenne des scores. Le BTC/min est la moyenne du `volCcy` en BTC des chandelles OKX 1m confirmées ; il exprime un volume réellement échangé, pas le carnet.
- La moyenne historique utilise des minutes closes, donc **n’est pas exactement identique** à l’intensité intra-minute du graphe Live. Minute(s) manquante(s) : intensité indisponible, pas de nombre inventé.
- Deuxième information : **deux qualités dominantes** `SILENT / INEFFICIENT / CONTESTED / EASY / ...` avec pourcentages calculés sur le **temps des échantillons V494 (~30 s)**, *pas sur la quantité de BTC*. Puis `LONG/SHORT/CONTESTED` et régime de marché. Une fenêtre partielle porte `EN FORMATION` ; les compteurs de relevés demeurent accessibles en informations techniques, sans ligne finale sur téléphone.
- Source OHLC 1m indépendante sous cache serveur ~**45 s**, avec borne de temps `asOf` et route privée ; le ticker client recontrôle périodiquement les données et signale les sources anciennes.

**Réserve de recherche majeure :** le classificateur historique **SILENT/INEFFICIENT** est calculé à partir de `yieldVsP75` et `effortVsP75` V493 ; dans la version actuelle, le déplacement `priceMove` entre deux Bâtons est comparé au volume des **200 derniers ticks**, dont la durée réelle est variable. **Ces fenêtres ne coïncident pas toujours**. L’intensité absolue de volume a été corrigée/clarifiée **sans encore recalibrer les pourcentages historiques de qualité**. Une étude shadow à fenêtres prix/volume synchronisées demeure ouverte ; ne pas présenter ces classes comme preuve économique définitivement validée.

### 4.5 Module 5 — Pronostic · Décision + Invalidation

**Une carte à la place des anciennes cartes 5 et 6**, avec lecture causale prioritaire :

1. **CHAÎNE CAUSALE · observation** : PM Live puis Cross3 → E3 Live → E3 confirmé → Cross15 → E15 Live → E15 confirmé, avec heures observées ; cet ordre de présentation n’impose **pas** que les événements se soient produits dans cet ordre chronologique.
2. **PHASE STRUCTURELLE** : phase/campagne, maturité rang2h, MF15 sur 2h, extension.
3. **PRONOSTIC** : hypothèse/candidat MCB15 et **DÉCISION effective** (`HOLD`, `WAIT`, etc.) présentés ensemble mais sans équivalence automatique.
4. **POSITION** : seulement si ouverte — LONG/SHORT, prix et heure d’entrée, P&L potentiel net en simulation. Ligne **MFE/MAE, floor, invalidation de position**.
5. **MATURITÉ OFFENSIVE** : classification, origine du mouvement 4h, progression, bord 2h, LBW15/prix et fatigue éventuelle du PM.
6. **RISQUE** : cap historique de mouvement, gain-floors 120/90 et 220/180 décrits dans la restitution actuelle comme **alertes sous la structure MCB** (sauf cas de position héritée sous ancienne autorité), frais A/R disponibles, mobilité et non-veto du niveau ponctuel.

Les **cinq surfaces descriptives** (chaîne causale, phase, pronostic, maturité offensive, risque) ont un fond gris clair plus marqué **`#e1e4e7`** et des titres gras. La ligne **POSITION** reste blanche et distincte. Les détails techniques (action et motif, compte PAPER, attention, shadow V493, autorité des floors) restent **repliables**, ouverture préservée pendant le polling.

**Deux invalidations à ne pas fusionner :**
- `position.invalidationPrice` : niveau **mémorisé à l’entrée**, montré dans la ligne principale de la position.
- `analysis.invalidation.price` : lecture **contextuelle réévaluée** à l’instant courant, montrée avec son ancre/heure dans les détails techniques.

Leur divergence est attendue en cours de campagne et **ne justifie pas de modifier les protections du moteur depuis l’interface**. En état `FLAT`, pas de MFE, MAE ou de niveau d’entrée artificiel.

## 5. Vagues : représentation visuelle autonome, allégée

La page **Vagues** conserve les trois plans synchronisés :
- **Prix BTCUSDT** : bougies 3m/15m, MA200, prix Live bleu, bandeaux de position et indications d’entrée/sortie.
- **Vague 15m** : BW/LBW, MF et signaux natifs, divergences et relations confirmées/Live.
- **Vague 3m** : lecture tactique homologue et alignement temporel avec les deux autres.

La page conserve `FLOW / AUDIT` (PM Bâton, cadence, BTC/s, pente MF15, MF15 Live), bouton **VIVANT**, fenêtres **24H/48H**, commande LIVE, sélection des unités, repères de trades, survol/clic et bouton **RAPPORT**. La plage de trade V4 est historiquement bleu ciel (rail supérieur), celle de V5 est rose (rail inférieur) ; il faut conserver leur distinction et leur statut PAPER.

Le mode Live est remis à jour environ toutes les **30 s** lorsque l’onglet est actif ; les archives peuvent être fusionnées depuis des snapshots, sans recalculer intégralement toute la fenêtre à chaque rafraîchissement.

**Nettoyage du 10/11 :** les panneaux d’état redondants `waveV5StructureStory` (visible) et `waveReplayState` (déjà caché mais recalculé) ont été supprimés avec leur rendu. Il ne faut **pas** rétablir un deuxième « État vivant » sur Vagues. Le moteur de graphes, les bandeaux FLOW et les outils de sélection de trades restent.

## 6. Historique, rapports et archives anciennes

- **Historique PAPER** : `/api/paper-history`, liste des trades V5 et comparateurs selon les sources disponibles ; `/api/paper-trade-report/:engine/:tradeNo` pour les preuves détaillées.
- **Anciennes archives** : V4.10.10 et V3 conservent des historiques distincts consultables ; `/api/trades` et `/api/trade-report/:tradeNo` sont toujours employés par les vues privées héritées.
- **Rapport par trade** : contexte d’entrée/sortie, âge des preuves, MCB/MF/MA/PM, décision, économie, MFE/MAE, P&L et motif ; chargement sur demande et affichage du détail dans une fenêtre dédiée depuis Vagues.
- **Attention financière :** ne pas additionner des résultats historiques bruts et des résultats nets de frais comme s’il s’agissait d’une série homogène ; ne pas appeler « gain protégé » une clôture nette négative. Distinguer déplacement du BTC en dollars, P&L monétaire simulé, frais estimés, glissement et funding.

Le registre d’événements historiques Elastic et les anciens fichiers de présentation sont **préservés** ; l’ancien grand composant `ELASTIC v0.5.8 · ARCHIVE V4.10.10` et son graphe plein format ne sont simplement **plus injectés** dans l’État vivant courant.

## 7. AUDIT et chronologies persistantes

`data/audit-history.json` contient des relevés agrégés Bâton approximativement **toutes les 30 s**, sur une couverture glissante de l’ordre de **24 h**, avec prix, cadence, volume 200-ticks, durée effective de fenêtre, MCB3/15 Live/confirmé, MF, VWAP, anomalies et autres mesures. **Ce ne sont pas tous les ticks OKX bruts**. L’AUDIT privé s’ouvre séparément avec fond sombre, tableau dense, filtres et repères. Les labels d’événements synthétiques ne sont pas automatiquement des ordres réels.

Un répertoire **`data/audit-14d/` a été observé** sur Amsterdam ; cela **ne suffit pas** à prouver qu’une interface `history-audit` de quatorze jours, complète, indexée et non bloquante est entièrement validée. Vérifier la politique de rétention, les fichiers, leurs champs et la consultation avant de la déclarer livrée.

La chronologie Elastic/AUDIT disponible à Watch permet de dater les cross et les E3/E15. L’observateur ne doit jamais attribuer au moteur une preuve dont `availableAt` serait postérieur à l’action analysée.

## 8. SHADOWS : expérimentation, pas deuxième autorité

La page **SHADOWS** historique présente notamment DATA QUALITY, PRICE BEHAVIOR, CONTINUATION RE-ENTRY, LIVE15 ACCEPTANCE, ADMISSION COUNTERFACTUAL, ELASTIC SYNC, STRUCTURAL HANDOFF, TP OPTIMIZATION et MF MEMORY. Certaines familles sont pures hypothèses ; les protections déjà incorporées au moteur doivent être identifiées comme telles au lieu d’être requalifiées « shadow » par leur voisinage.

Les recherches Elastic V494 disposent d’un processus séparé `boono-v494-elastic-shadow` et de données `data/v494-elastic-shadow-*.json/ndjson`. Le ticker 4×15 est un **résumé descriptif** de cette expérience ; il ne transmet pas de vote à V5.4.3 ni n’émet d’ordre. Les observations incomplètes/stales et la couverture doivent être visibles. Les pourcentages de qualité restent historiques tant que le recalibrage effort/rendement n’est pas démontré.

**Règle de provenance :** `decisionImpact:false`, `brokerOrdersEnabled:false` et les marquages `SHADOW_ONLY` sont des contrats de séparation, pas une décoration. Le client du ticker rejette un paquet ne respectant pas ces conditions.

## 9. NIVEAUX, SCENARIO, BOONO, AUDIT : frontières d’écriture

- **NIVEAUX** : éditeur privé de DS/DR/WS/WR/MS/MR, ancres fib0/fib1 et triplets VAL/POC/VAH regroupés par portée. L’éditeur **écrit** `data/levels.json` ; la carte LIEU, elle, **lit seulement** ces niveaux.
- **SCENARIO** : outil privé de scénarios et de conditions ; ne pas lui attribuer une autorité automatique sur les positions V5.4.3 sans vérification séparée.
- **BOONO** : historique et suivi d’une génération antérieure de l’assistant/moteur, pas le poste décisionnel V5 actuel.
- **AUDIT** : consultation de données d’observation, distincte des transactions et de l’historique des décisions.

Une future application commerciale ne doit pas simplement exposer ces formulaires opérationnels avec le compte serveur d’Amsterdam.

## 10. Carte technique des fichiers et endpoints

| Fonction | Code / stockage de référence | Endpoint authentifié |
|---|---|---|
| Application privée / session / DOM | `modules/config-server.js` | `/`, `/app.js` |
| V5.4.3 PAPER, analyse, position | `data/v52-paper-state.json` | `/api/v52` |
| Événements causaux MCB | `modules/v5/v53-causal-chain-view.js`, `data/elastic-observer-events.ndjson`, AUDIT | enrichissement de `/api/v52` |
| MCB 3m/15m confirmés et 4h | `/root/agents-ia-zero-one/data/mcb-live/mcb_{3m,15m,4h}.csv` | enrichissement de `/api/v52` |
| Niveau et Fair Value descriptifs | `data/levels.json`, `livingPlaceLandscape()` | `/api/v52`, `/api/levels` |
| Mini Conversion 3m SVG | `modules/elastic-mini-conversion-v542.js` | `/elastic-mini-conversion-v542.js` |
| Flux initiateur et PM Watch | `modules/elastic-live-conversion-v541.js`, WebSocket OKX partagé | `/elastic-live-conversion-v541.js` |
| Bougies 3m du mini (150m) | `waveUiPriceSeries('3m')` | `/api/elastic-chart-3m` |
| Ticker 4×15 shadow | `modules/attention/v494-elastic-ui-summary.js`, `data/v494-elastic-shadow-summary.json` | `/api/shadows/v494-elastic` |
| Volume réel 1m et pastilles 15m | `modules/attention/v494-elastic-volume-1m.js` | enrichissement de `/api/shadows/v494-elastic` |
| État et historique V4.9.4 | `data/v494-paper-state.json`, fichiers d’évaluation | `/api/v493`, `/api/trades` |
| Vagues live / archives / replay | `modules/config-server.js` + renderer partagé | `/api/wave-live`, `/api/wave-snapshot`, `/api/wave-replay` |
| Historique / rapports PAPER | journaux et états PAPER séparés | `/api/paper-history`, `/api/paper-trade-report/:engine/:tradeNo` |
| SHADOWS et expérimentation | états SHADOW, données et caches | `/api/shadows`, `/api/shadows/v494-elastic` |
| AUDIT | `data/audit-history.json` et archives éventuelles | `/api/audit-history` |

**Retraits sans destruction :** `modules/elastic-observer-ui.js` est toujours conservé sur disque et sa route peut subsister pour une consultation historique explicite, mais le **script n’est plus inclus dans le Watch courant** et `renderElasticObserverV05(current)` n’y est plus appelé. L’ancienne dépendance fonctionnelle du nouveau graphique à ce renderer a été supprimée : les bougies sont maintenant chargées directement et le cours Live est transmis au mini.

## 11. Cadences, charge et contrôles de qualité

| Circuit | Cadence nominale | Précautions |
|---|---:|---|
| État V5 affiché | ~10 s | Onglet actif, source `DATA_OK`, ancienneté |
| Base observation Bâton/AUDIT | ~30 s | Agrégats et horodatages, pas ticks bruts |
| Rafraîchissement V4 privé | ~30 s | Éviter reconstructions lourdes ; suspendu lors de lecture des rapports |
| Vagues LIVE | ~30 s | Uniquement Vagues actif ; fusion incrémentale |
| Graphique mini : OHLC3m | ≥45 s entre demandes | Endpoint existant, pas de deuxième graphe historique |
| Graphique mini : volumes/PM | ~5 s si actif | Un unique WebSocket OKX, pas de deuxième souscription |
| Ticker 4×15 client | ≥35 s entre demandes | Couverture et fraîcheur des quatre tranches |
| Source OKX 1m côté serveur | cache ~45 s | Candles closes uniquement, timeout, état indisponible |
| API SHADOWS principale | cache serveur ~90 s | Statistiques corrélées, pas des trades indépendants |
| Watch données V5 stale | seuil de l’ordre de 90 s | Ne jamais afficher un vieux signal comme actuel |

Les réponses volumineuses peuvent être compressées en gzip ; les queues NDJSON sont bornées. Une optimisation d’affichage ne doit pas ralentir l’actualisation de la décision, allonger le chemin des runners ni ouvrir un flux de marché redondant.

## 12. Guide d’intervention sûre et reprise après incident

**Avant toute retouche :**
1. Vérifier les états PM2, la fraîcheur de `data/v52-paper-state.json`, de l’AUDIT et des CSV MCB.
2. Localiser précisément le module concerné dans `modules/config-server.js` ou le script de visualisation dédié.
3. Identifier les dépendances indirectes. Le retrait de l’ancien Conversion a montré qu’un composant « historique » pouvait encore alimenter le nouveau mini en cours d’exécution.
4. Limiter les corrections au **rendu et aux données descriptives**, jamais aux règles de trading sans décision explicite distincte.

**Validation recommandée sur Amsterdam :**

```bash
cd /root/agents-ia-zero-one/zero-one
node --check modules/config-server.js
node --check modules/elastic-mini-conversion-v542.js
node --check modules/elastic-live-conversion-v541.js
node --check modules/attention/v494-elastic-volume-1m.js

node --test tests/attention/v494-elastic-volume-1m.test.js tests/attention/v494-elastic-ticker.test.js
node --test tests/ui/watch-old-panels-retired.test.js

git diff --check -- <les-fichiers-ciblés>
pm2 restart config-server --update-env
pm2 list
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1/
```

Le `302` local sans session est attendu. Il faut ensuite **inspecter la session authentifiée**, sur ordinateur et téléphone : prix, statut LIVE, bougies récentes, volume BTC/min, historique du 4×15, régimes, mise en forme, champs indisponibles, menus dépliables, Vagues et liens vers rapports.

**Ne pas faire** de `git add .`, `git reset --hard`, `git clean`, de redémarrage en masse PM2 ou de manipulation d’archives et de fichiers de niveaux pour résoudre un problème visuel. Les dossiers du projet contiennent aussi des travaux BOONO-TV et des recherches hors du périmètre Watch.

**Incidents à distinguer :**
- Page protégée 302 : connexion attendue ; pas une panne en soi.
- `SOURCE_STALE` / `DATA_DEGRADED` : diagnostiquer la fraîcheur et le fournisseur, pas remplacer silencieusement par des anciennes valeurs.
- Graphique prix absent mais PM présent : contrôler `/api/elastic-chart-3m`, CSV, réponse 3m et redessin du mini.
- Chiffres du ticker absents : vérifier bougies OKX 1m closes et couverture avant de soupçonner le classificateur Elastic.
- Position et invalidation incohérentes : comparer `position.invalidationPrice` et `analysis.invalidation.price`, non écraser la première avec la seconde.
- Vagues figées : examiner `/api/wave-live`, les caches/snapshots et l’état de la page ; ne pas réactiver l’ancien panneau « État vivant Vagues ».

## 13. Chronologie condensée des dernières mises à jour

Les interventions ci-dessous sont **enregistrées et publiées dans GitHub**. Elles ne prouvent pas, à elles seules, une qualification UX de tous les téléphones :

| Commit (10/11/2026) | Livré sur Watch Amsterdam |
|---|---|
| `f6d641f` | État vivant en une colonne ; MCB15 puis MCB3 ; nouvelle carte LIEU 4h/ranges/niveaux |
| `867bb7c` | En-tête LIEU simplifié, BW4/LBW4 précédent / confirmé |
| `fa6844a` | Position hors Value Area chiffrée, POC/Fair Value et extensions |
| `02518f8` | Nouveau mini Conversion + ticker Elastic quatre fenêtres à droite ; mesures sous le graphe conservées |
| `33c2178` | Ticker compact, échelle automatique des bougies, graduations superposées, BTC acheteurs/vendeurs agrandis |
| `3a2e28b` | Volume moyen exécuté OKX 15m (BTC/min), séparé des parts de qualité Elastic |
| `4d0e800` | `Vol moy: pourcentage · BTC/min` ; pourcentage lissé avec les mêmes seuils que les dix pastilles 3m |
| `6cf0ebf` | Retour à des lignes horaires fines et peu contrastées |
| `d325446` | Fusion des anciennes cartes 5 et 6 en Pronostic / Décision / Invalidation |
| `fb2ea66` | Cinq surfaces grises et titres renforcés, position distincte |
| `05d9e39` | Retrait du grand Conversion ancien et de l’Elastic V4.10.10 courant ; retrait des « états vivants » redondants de Vagues, rétablissement des dépendances du mini |

### Documents d’implémentation de la Knowledge Base

- `knowledge/BOONO_Watch_Etat_vivant_Lieu_4h_range_niveaux_2026-11-10.md`.
- `knowledge/BOONO_Watch_Conversion_Ticker4x15_2026-11-10.md`.
- `knowledge/BOONO_Watch_Pronostic_Decision_2026-11-10.md`.
- `knowledge/BOONO_Watch_retrait_Elastic_ancien_Conversion_Vagues_2026-11-10.md`.
- Registres `knowledge/operational-decisions/OD-20261110-001` à `knowledge/operational-decisions/OD-20261110-006` (demandes d’origine, preuves, implémentation, tests et mises en service).
- `knowledge/BOONO_Watch_mini_conversion_2026-10-27.md` et `knowledge/BOONO_Watch_reparation_historique_rapports_sur_demande_2026-10-27.md` pour l’étape initiale.
- Le présent document est le **successeur consolidé** de l’audit du 19/10, non une altération rétroactive de ses observations historiques.

## 14. Ce qui reste ouvert

1. **Qualité de conversion Elastic :** recalibrer en SHADOW, sur fenêtres homogènes, volume exécuté et rendement prix afin d’examiner `SILENT / INEFFICIENT`. Ne pas changer la nomenclature historique par un simple renommage.
2. **Validation visuelle finale :** après la fusion et les nettoyages du 10/11, contrôler en navigateur authentifié la lisibilité des cinq modules, la conservation des interactions Vagues, la stabilité de tous les chiffres Live et l’absence de doublons.
3. **Historique AUDIT de quatorze jours :** confirmer contrat, rétention, lecture indexée et ergonomie sans alourdir l’État vivant ; l’existence du répertoire seul n’est pas une livraison vérifiée.
4. **Performance et maintenance** : mesurer CPU/RAM, transfert réseau, croissance des logs, latence, fraîcheur MCB/OKX, tunnels, sauvegardes et réactivité de Watch. Ce travail relève du poste BOONO Systems, non des moteurs PAPER.
5. **Gouvernance des preuves** : distinguer source/observation/disponibilité, confirmation/provisoire, contrefactuel/ordre, P&L brut/net, et statut de chaque hypothèse.
6. **Éventuelle offre BOONO Watch** : construire une couche séparée réellement read-only, cache et isolation multi-utilisateur, droits de redistribution MCB/TradingView et tests de diffusion avant toute commercialisation. **Ne jamais exposer le `config-server` privé tel quel.**

## 15. Conclusion de passation

**BOONO Watch est aujourd’hui un véritable poste d’observation structuré**, pas un simple panneau de signaux. La présentation privée relie les preuves MCB15/MCB3, le lieu du prix, sa conversion économique, la mémoire 4×15 et les décisions PAPER à leurs causes, leur fraîcheur et leurs invalidations. Les ombres et les archives permettent d’examiner ce qui aurait pu être tenté autrement, sans donner à ces hypothèses une autorité indue.

Le **socle actuel est en service sur Amsterdam**, contrôlé dans le code et par tests de rendu/PM2, mais **la validation visuelle complète de cette passation n’a pas été constatée dans une session navigateur automatisée authentifiée**. La séparation entre interface privée, moteurs simulés, expérimentation SHADOW et studio BOONO-TV doit rester une exigence permanente.

---

*Passation fondée sur l’audit original du 19/10/2026, les fichiers actuels du VPS et les interventions documentées du 10/11/2026 ; références des commits ci-dessus. Toute capture de prix ou de résultat est un instantané historique et ne doit pas être recyclée comme preuve de l’état présent.*
