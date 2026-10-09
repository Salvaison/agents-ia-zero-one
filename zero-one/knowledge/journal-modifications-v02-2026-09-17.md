# BOONO — Journal maître détaillé des modifications

Date: 2026-09-17
Périmètre: historique de la version originale → V1 (`constitution-v0.1`) → V0.2/V0.2a + expériences shadow divergences / R-R / Fibonacci.
Statut: document de traçabilité technique et méthodologique.

## 1. Principes de cette session

La Constitution V0.2 reste la référence: `WHERE → STATE → DOMINANCE → RISK → ACTION`.
Les changements décisionnels doivent être fondés sur un corpus mesuré; les expériences non validées restent shadow.
Le serveur constitue la réalité opérationnelle; ce journal décrit ce qui a effectivement été modifié sur le VPS.

Deux catégories de modifications sont distinguées:
- **ACTIVE**: peut modifier les entrées/sorties du simulateur;
- **SHADOW**: calculé et journalisé mais techniquement incapable de modifier ACTION.

Version décisionnelle active après cette session: `constitution-v0.2a`.
Version shadow active: `div-fib-shadow-v0.1`.


## 2. Historique — passage de la version originale à V1 (`constitution-v0.1`)

### 2.1 Nomenclature et point de départ

Dans ce journal, **version originale** désigne le simulateur actif juste avant la refonte constitutionnelle du 14 septembre 2026, sauvegardé sous:
`modules/trade-simulator.js.pre-constitution-20260914T120110Z`.

Ce fichier est l'aboutissement cumulatif des itérations de juillet à début septembre; il ne s'agit donc pas du tout premier prototype historique, mais de la dernière version de l'ancienne famille logique avant la Constitution.

La première refonte constitutionnelle a créé `modules/trade-simulator-v2.js`, mais ce fichier porte explicitement `VERSION = 'constitution-v0.1'`. Dans la chronologie conceptuelle du projet, cette étape est donc appelée **V1** dans le présent journal. Le suffixe `v2` du nom de fichier signifiait « nouveau simulateur » et ne doit pas être confondu avec la Constitution V0.2 écrite le 16 septembre.

Document source de cette transition:
`knowledge/refonte-simulateur-2026-09-14.md`.

### 2.2 Fonctionnement de la version originale juste avant la refonte

L'entrée était principalement pilotée par `baton-relay.js` via `data/baton-state.json`. Le `lastAction` du baton constituait une direction déjà résolue avant l'appel au simulateur. La chaîne documentée dans le code était:
**événement cadence → vigilance persistante → réaction prix → `lastAction` directionnel → entrée**.

Les seuils historiques de réaction prix utilisés par le baton étaient notamment `|netMove| >= 0.06 %` pour une action immédiate ou `>= 0.03 %` confirmée sur deux batons. Une même action n'était consommée qu'une fois grâce à `trade-sim-entry-tracker.json`.

Au fil des incidents de marché, plusieurs protections directionnelles s'étaient empilées autour de cette entrée: régime de vague MCB 15m, abstention sur désaccord VWAP3, filtre de pivot MCB optionnel, puis veto de pente Blue Wave 15m ajouté le 8 septembre. Cette architecture essayait de corriger a posteriori les erreurs d'un baton qui produisait déjà une conclusion directionnelle.

La gestion de position conservait également plusieurs couches historiques: tranches `25/65/10`, déclenchées par nouveaux événements de cadence, passages à zéro VWAP ou NetMove; invalidation par flux éteint/inverse; pivot MCB opposé; mouvement violent; timeout anti-zombie; cooldown après perte; coupe-circuit; liquidation par levier; et, depuis le 6 septembre, stop adverse fixe de `500 USD`.

La divergence MCB existait déjà comme détecteur séparé, mais le commentaire du simulateur original précise que l'argument `divRaw` n'était plus utilisé par sa logique active. La divergence était donc disponible dans l'écosystème sans être réellement intégrée à la stratégie du simulateur.

### 2.3 Problèmes conceptuels ayant motivé V1

L'enquête Market Watch des 11–13 septembre a montré que cadence, volume, BTC/s et taille moyenne décrivaient surtout l'intensité de l'effort et ne pouvaient pas être additionnés comme confirmations directionnelles indépendantes. Le price-yield a permis de distinguer effort et conversion, tandis que le weekend a falsifié la règle simpliste `high-flow + low-yield = absorption = reversal`.

La version originale mélangeait en outre plusieurs responsabilités: le baton collectait mais interprétait aussi la direction; des filtres tentaient ensuite de veto cette direction; les sorties mélangeaient gestion de tranches, invalidation de thèse, risque et événements d'exécution. Les corrections successives avaient créé une logique difficile à falsifier proprement.

La refonte a donc été motivée moins par un désir de « produire plus de trades » que par la nécessité de reconstruire une chaîne causale traçable et de permettre explicitement l'abstention lorsque BOONO ne comprenait pas le régime.

### 2.4 Principes introduits par V1

V1 (`constitution-v0.1`, 14 septembre) a remplacé la logique précédente par la chaîne de travail:
**MCB / structure multi-TF → vague → lieu → état énergétique → effort → conversion → rapport de force → persistance/asymétrie → décision**.

Le Ticker cessait d'être une boussole autonome: il décrivait le métabolisme interne d'une structure MCB. La vague 15m était modélisée autour de `0 → E15 → 0`, avec mémoire propre et métriques temporelles/transactionnelles. La lecture devenait top-down `1W → 1D → 4h → 1h → 15m → 3m → Ticker`.

V1 a introduit les états explicites de compréhension `KNOWN`, `AMBIGUOUS`, `CONTRADICTORY`, `UNKNOWN`, `INVALID_DATA`; seul `KNOWN` pouvait ouvrir une position. Elle a aussi classé la microstructure relativement à une baseline glissante de deux heures: énergie (`DEAD/QUIET/NORMAL/REACTIVE/EXTREME`), effort (`LOW/NORMAL/HIGH/SLOW_LARGE_TRADES`) et conversion (`LOW/NORMAL/PRODUCTIVE/FRAGILE/NEUTRALIZED`).

La séquence causale de changement de rapport de force a été formalisée en quatre étapes observables: `EFFORT_NEUTRALIZED → INITIAL_FAILURE → OPPOSITE_PRODUCTIVE → FORCE_SHIFT`. Un `FORCE_SHIFT` complet, et non un événement isolé, devenait la preuve minimale d'un basculement de microstructure.

### 2.5 Entrées et sorties de V1

Deux archétypes étaient distingués. Une **CONTINUATION** exigeait cohérence top-down, vague 15m dans le même sens, lieu compatible, marché réactif/extrême, conversion productive et PM immédiat cohérent. Un **REVERSAL** exigeait un `FORCE_SHIFT` complet, un lieu compatible, une direction opposée à la vague et un E15 déjà observé.

L'entrée n'était possible que si l'opportunité atteignait `READY`; les états ambigus, contradictoires, inconnus, invalides, sans lieu ou en marché DEAD conduisaient explicitement à `NO_TRADE`.

La gestion historique par tranches `25/65/10` n'a pas été reconduite comme loi fondamentale. Les sorties ont été séparées en trois familles causales: `EXIT_RISK` (survivabilité), `EXIT_STRUCTURE` (thèse structurelle) et `EXIT_EXECUTION` (rapport de force/exécution). Le stop adverse fixe de `500 USD` a été conservé comme garde-fou de risque.

### 2.6 Journal scientifique et séparation des données

V1 a créé ses propres fichiers persistants, séparés de l'historique original:
- `trade-sim-v2-state.json`;
- `trade-sim-v2-history.json`;
- `trade-sim-v2-decisions.json`;
- `trade-sim-v2-waves.json`.

Les décisions et abstentions étaient désormais contextualisées et les cas `UNKNOWN` regroupés par empreinte. Ce corpus UNKNOWN est devenu plus tard un contrôle adversarial important lors de la conception de V0.2.

### 2.7 Bascule technique du 14 septembre

Avant intervention, les sauvegardes suivantes ont été créées:
- `modules/trade-simulator.js.pre-constitution-20260914T120110Z`;
- `config.json.pre-constitution-20260914T120110Z`.

Le nouveau moteur a été écrit dans `modules/trade-simulator-v2.js`, puis le point d'entrée stable `modules/trade-simulator.js` a été modifié pour charger ce nouveau moteur. `cerveau-central` a été redémarré après contrôle syntaxique. Les collecteurs, TradingView, `baton-relay`, `moteur-boono`, les données MCB et BOONOTRADE réel n'ont pas été modifiés par cette bascule.

Empreintes historiques relevées le 17 septembre pour figer cette filiation:
- pré-Constitution: `4736aa7e53503ad2aeb9a6b4acd8fa1866d814de68428b248d7bb75bdda47a29`;
- V1 / `constitution-v0.1`: `6f89e6a4ad6237cb42f712e15a506dc70c59c885d1f7dceff5b08879ea67ccf4`;
- document de refonte du 14 septembre: `e5096dcad706e5d73982d8b71effc490d5606ae23709c983894e8dd472ca464d`.

### 2.8 Ce que V1 n'avait pas encore résolu

V1 restait une première Constitution expérimentale. Elle approximait encore la vague complète par un lobe `0→E15→0`; son top-down reposait largement sur des signes agrégés; Location utilisait niveaux/trendlines sans véritable hiérarchie de confiance; les seuils énergétiques reposaient sur des percentiles locaux; et les divergences structurelles n'étaient toujours pas intégrées aux entrées.

C'est l'observation de V1, puis l'analyse des UNKNOWN et des Market Watch suivants, qui a conduit à la Constitution V0.2 du 16 septembre: séparation stricte **WHERE → STATE → DOMINANCE → RISK → ACTION**, responsabilité descriptive du STATE, dominance fondée sur effort/yield/terrain conservé, et expérimentation séparée des règles non démontrées.

### 2.9 Chaîne de filiation retenue

Pour éviter toute confusion future, la filiation officielle utilisée dans ce journal est désormais:
**version originale / pré-Constitution → V1 = `constitution-v0.1` (14/09) → V2 = `constitution-v0.2` (16/09) → V2a = `constitution-v0.2a` (17/09)**.

Les noms de fichiers historiques (`trade-simulator-v2.js`, `trade-simulator-v02.js`) sont des détails d'implémentation et ne définissent pas à eux seuls la version conceptuelle.
## 3. Corpus de référence — 51 premiers trades V2

Le corpus a été figé à 51 trades pour éviter qu'un 52e trade terminé pendant l'analyse ne déplace la population.
Mesures observées sur ce corpus:
- PnL cumulé x10: `+3,93 %`;
- 20 gagnants / 31 perdants, win rate `39,2 %`;
- profit factor `1,14`;
- gain moyen `+1,575 %`, perte moyenne `-0,889 %`;
- drawdown cumulé maximal environ `-12,51 %`;
- exposition environ `41,9 %` du temps.

Lecture principale: beaucoup de pertes ont très peu de MFE, donc le défaut dominant est l'admission de trades plutôt que la seule sortie.
`DOMINATION_PERSISTANTE` s'est révélée nettement meilleure que `DOMINATION_EMERGENTE` ou `FORCE_SHIFT` sur ce corpus.
Les résultats de replay ci-dessous sont des **replays de sélection d'entrée avec résultats observés**, complétés par mesures à horizons fixes; ils ne constituent pas un backtest contrefactuel complet de toutes les sorties.
## 4. Modification ACTIVE — admission V0.2a

Sauvegarde créée avant modification:
`modules/v2/layers/risk.js.bak-20260917T081920Z`.

Changements actifs dans `modules/v2/layers/risk.js`:
- une nouvelle entrée exige `DOMINATION_PERSISTANTE`;
- `proofScore >= 0.60` reste requis avec cette persistance;
- `DOMINATION_EMERGENTE`, `FORCE_SHIFT` et `ATTAQUE_PRODUCTIVE` ne suffisent plus seuls à ouvrir;
- la phase `érosion` bloque toute nouvelle entrée;
- `shockStructureOverride` est conservé mais exige désormais domination persistante, `shock=true`, preuve `>= 0.75`, et ne contourne pas `érosion`.

Le R/R actif n'a pas été recalibré dans cette modification.
Le système reste un simulateur; aucune exécution monétaire réelle n'est ajoutée.
## 5. Replay ayant motivé V0.2a

Filtre candidat testé: `DOMINATION_PERSISTANTE` + exclusion des entrées en `érosion`.
Résultat sur les 51 trades figés:
- trades conservés: `29`;
- win rate: `58,6 %`;
- PnL cumulé x10: `+19,27 %`;
- profit factor: `3,03`;
- drawdown maximal: environ `-5,40 %`;
- MFE médian: environ `69,4 $`;
- MAE médian: environ `42,6 $`.

Contrôle de stabilité temporelle: les 25 premiers trades et les 26 suivants restent positifs sous ce filtre.
Contrôle à horizon fixe: à 10 minutes, le corpus complet montrait en moyenne un déplacement d'environ `-29 $` dans le sens du trade, contre environ `+16,7 $` pour les entrées filtrées.
Conclusion méthodologique: promotion minimale du filtre, sans optimisation supplémentaire sur le passé.
## 6. Audit du R/R actif

Le R/R actif de V0.2a reste expérimental et inchangé.
Dans `modules/v2/layers/risk.js`:
- risque = dernier pivot prix 3m opposé au trade, s'il est situé à moins de `500 $`;
- sinon fallback `MAX_RISK_USD = 500`;
- reward = première cible WHERE exploitable dans le sens du trade (niveau ou LGI), après élimination d'une micro-zone trop proche;
- `RR_MIN_EXPERIMENTAL = 0.8`.

Problème identifié `[ARTEFACT LOGIQUE]`: le dénominateur peut être une microstructure 3m alors que le numérateur appartient à une structure beaucoup plus large. Les deux objets ne décrivent donc pas nécessairement la même thèse de trade.
Sur le corpus des 51 trades, le R/R observé n'a pas montré de relation monotone claire avec la qualité des trades; il reste `[AMBIGU]`.

Les anciens paramètres Fibonacci sont toujours présents dans `config.json`: `tp1Ratio=0.382`, `tp2Ratio=0.618`, avec TF historiques scalp=15m, day=4h, swing=1d, mais ils ne pilotent pas le R/R V2 actif.
## 7. Audit du détecteur historique de divergences

Fichier historique actif: `modules/divergence.js`.
Il continue d'être appelé par `cerveau-central.js`, mais V2 ne consommait pas ses sorties dans STATE/RISK/ACTION avant cette session.

Caractéristiques du détecteur historique:
- compare prix et `blue_wave`;
- ancre les chaînes sur les lignes MCB où `buy != 0`;
- détecte divergence bullish/bearish et multidiv;
- agrège la confluence multi-TF;
- peut maintenir des chaînes rapides jusqu'à 48 h selon `config.divergence.maxChainHours`.

Observation live lors de l'audit: l'ancien détecteur voyait une divergence haussière active sur 3m, multidiv, mais aucune active sur 15m/1h/4h.
Cela ne correspondait pas entièrement à la divergence visible manuellement sur 15m et a motivé une lecture structurelle LBW indépendante en shadow.
## 8. Modification SHADOW — divergence structurelle prix/LBW

Nouveau module:
`modules/v2/experiments/structural-shadow.js`.
Version: `div-fib-shadow-v0.1`.

Le module construit des pivots structurels LBW confirmés sur 3m/15m/1h/4h. L'amplitude minimale reprend `scoring.wavePivot.minAmplitude` (actuellement 2.0).
Association prix:
- pivot LBW bas → low de la bougie;
- pivot LBW haut → high de la bougie.

Définitions shadow:
- bullish confirmé: prix LL + LBW HL entre deux pivots bas confirmés;
- bearish confirmé: prix HH + LBW LH entre deux pivots hauts confirmés;
- forming: même géométrie contre le dernier pivot confirmé mais avec la barre courante fraîche;
- multidiv: nombre d'ancres antérieures compatibles avec le dernier pivot, plafonné dans le détail à quatre comparaisons.

Mesures enregistrées: delta prix %, delta LBW, delta LBW normalisé sur `WAVE_SCALE=200`, écart géométrique, distance temporelle en bougies, ancres complètes et statut confirmed/forming.
## 9. Extension de l'horizon historique V2

Fichier modifié:
`modules/v2/adapters/runtime-snapshot.js`.

Avant cette session, le snapshot ne conservait que ~80 lignes par TF, soit seulement ~20 h de 15m. Cette fenêtre était insuffisante pour reconstruire certaines divergences visibles sur plusieurs jours.

Nouvel horizon chargé:
- 3m: 1100 lignes;
- 15m: 240 lignes;
- 1h: 72 lignes;
- 4h: 36 lignes;
- 1d: 80 lignes;
- 1w: 80 lignes.

Cette extension alimente le shadow mais ne change pas les fenêtres locales utilisées par `STATE` pour ses calculs de phase/reconstruction, qui continuent à tronquer leurs propres séries en interne.
Après extension, le shadow a retrouvé la divergence haussière visible à la fois sur 3m et 15m.
## 10. Résultat divergence observé après extension

Sur 15m, le shadow a notamment identifié une divergence haussière confirmée entre:
- ancien pivot prix ≈ `76 158`, LBW ≈ `-19,304`;
- nouveau pivot prix ≈ `76 139,7`, LBW ≈ `-1,443`.

Le prix imprime donc un low légèrement inférieur tandis que LBW refuse de reproduire la profondeur précédente et remonte fortement: géométrie bullish structurelle.
Le shadow a trouvé plusieurs ancres antérieures compatibles (`multiBullish=3` lors du contrôle).

Sur 3m, une divergence haussière confirmée était également présente; le shadow a aussi trouvé des divergences baissières confirmées plus récentes sur 3m/15m.
Ces signaux opposés ne sont pas encore interprétés automatiquement comme "active", "résolue" ou "prioritaire". Leur sémantique de cycle reste `[AMBIGU]` et devra être calibrée par les données.

Le détecteur historique reste journalisé en parallèle pour comparaison de méthodes.
## 11. Modification SHADOW — R/R structurel + Fibonacci A-B-C

Le même module `structural-shadow.js` utilise les pivots structurels pour construire des séquences A-B-C:
- long: `low-lbw → high-lbw → low-lbw`;
- short: `high-lbw → low-lbw → high-lbw`.

Le segment A→B définit l'impulsion; C définit le retracement/reconstruction.
Le shadow mesure le ratio de retracement de C par rapport à A→B et sa distance aux ratios 0.382 et 0.618.
Depuis C, il projette trois objectifs de continuation: `1.0`, `1.272`, `1.618` fois l'impulsion A→B.

Pour chaque direction observée, il journalise en parallèle:
- risque micro 3m actif V0.2a, comme témoin;
- invalidation structurelle 15m issue de C;
- invalidation structurelle 1h issue de C;
- reward WHERE actif;
- cible Fib 15m la plus proche devant le prix;
- cible Fib 1h la plus proche devant le prix;
- ratios comparatifs reward/risk pour chaque paire disponible.

Aucune projection Fib n'autorise, ne bloque ni ne ferme un trade.
## 12. Exemple Fib observé au démarrage du shadow

Le contrôle live a trouvé sur 15m approximativement:
- A ≈ `75 211,1`;
- B ≈ `76 748,8`;
- C ≈ `76 139,7`.

Impulsion A→B ≈ `1 537,7 $`.
Retracement C ≈ `0,3961` de l'impulsion, proche du ratio 0.382 historique.
Projections calculées depuis C:
- 1.0 ≈ `77 677,4`;
- 1.272 ≈ `78 095,7`;
- 1.618 ≈ `78 627,7`.

Ces valeurs sont enregistrées comme hypothèses de territoire et devront être comparées au MFE réel; elles ne sont pas considérées comme targets validées.
Le but expérimental est de déterminer quelle projection décrit le mieux le territoire effectivement disponible selon le régime et le cycle.
## 13. Intégration technique du shadow dans le simulateur

Fichier modifié:
`modules/trade-simulator-v02.js`.

Le shadow est calculé **après** `core.evaluate()` et après l'override de risque violent déjà existant.
Ordre effectif:
1. snapshot live;
2. V0.2a: WHERE → STATE → DOMINANCE → RISK → ACTION;
3. éventuel `violentRiskOverride` existant;
4. calcul du détecteur historique de divergence pour référence;
5. calcul `structural-shadow`;
6. journalisation uniquement.

Le shadow est marqué partout `decisionImpact:false`.
Il est ajouté sous forme résumée à `state.divergenceShadow` et `risk.shadow`, mais aucune couche décisionnelle ne le relit dans le cycle courant.
La décision est donc déjà produite avant que ces champs n'existent.

Nouveau flux détaillé:
`data/trade-sim-v02-shadow.ndjson`.
Le fichier `data/trade-sim-v02-evaluations.ndjson` reçoit aussi un résumé compact du shadow pour faciliter les jointures avec ACTION/MFE/MAE.
## 14. Contrôles de non-régression

Avant activation, un test one-shot a comparé la décision V0.2a avec et sans shadow sur le même snapshot.
Résultat: `decision_unchanged = true`.
Exemple observé: ACTION restait `WATCH` avec le même motif décisionnel.

Après extension historique, un second contrôle a également renvoyé `decision_unchanged = true`.
Le shadow retrouvait alors simultanément des divergences structurelles sans modifier `tradeable` ni ACTION.

Après redémarrage de `cerveau-central`, le premier enregistrement live shadow a été produit avec:
- `shadowVersion = div-fib-shadow-v0.1`;
- `decisionImpact = false`;
- ACTION V0.2a = `HOLD` sur la position alors ouverte;
- divergence structurelle et comparaisons R/R correctement présentes.

`cerveau-central` a été redémarré sous PM2 après validation syntaxique et one-shot; les autres services n'ont pas été redémarrés pour cette modification.
## 15. Incident mineur pendant l'implémentation

La première écriture de `structural-shadow.js` contenait un caractère parasite initial (`\`) et a échoué au contrôle syntaxique Node.
Le fichier a été corrigé immédiatement **avant toute activation**.
Le contrôle `node --check` a ensuite réussi.

Aucune version contenant cette erreur n'a été chargée par `cerveau-central`.
Cet incident est conservé ici pour traçabilité complète des opérations.

## 16. Éléments explicitement NON modifiés

- aucune utilisation stratégique du shadow divergence;
- aucune utilisation stratégique des Fib;
- aucun changement du seuil actif `RR_MIN_EXPERIMENTAL = 0.8`;
- aucun changement des sorties `EXIT_EFFICIENCY` / `EXIT_GOD_YIELD` pendant cette session;
- aucun cooldown arbitraire ajouté malgré les résultats de replay sur le churn;
- aucun retrait de `shockStructureOverride`;
- aucune exécution réelle ajoutée.
## 17. État actif à la fin de la session

Décisionnel:
- simulateur version `constitution-v0.2a`;
- entrée standard = domination persistante + STATE admissible + WHERE/RISK existants;
- `érosion` interdit une nouvelle entrée;
- `shockStructureOverride` conservé sous conditions renforcées.

Shadow:
- divergences prix/LBW structurelles 3m/15m/1h/4h;
- détecteur historique `divergence.js` en référence parallèle;
- projections Fib A-B-C 15m/1h;
- invalidations structurelles 15m/1h;
- comparaisons avec risque 3m et reward WHERE;
- journal NDJSON continu, sans impact décisionnel.

Documents associés:
- `knowledge/constitution-v0.2-2026-09-16.md`;
- `knowledge/experiment-shadow-div-fib-2026-09-17.md`;
- présent journal `knowledge/journal-modifications-v02-2026-09-17.md`.
## 18. Retour arrière / réversibilité

Pour l'admission V0.2a, la sauvegarde immédiate disponible est:
`modules/v2/layers/risk.js.bak-20260917T081920Z`.
Un rollback doit être effectué explicitement puis validé par contrôle syntaxique et redémarrage de `cerveau-central`.

Pour désactiver le shadow, retirer son appel de `trade-simulator-v02.js` suffit conceptuellement; les fichiers NDJSON historiques peuvent être conservés comme données expérimentales.
La suppression du shadow ne nécessite aucune modification de `risk.js` ou `decision.js`, puisque ces couches n'en dépendent pas.

## 19. Critères de la prochaine analyse

Après accumulation d'un corpus prospectif suffisant, comparer:
- V0.2a contre les performances observées hors replay;
- divergences forming/confirmed contre arrêt de translation, réaction et reconstruction;
- divergence isolée vs multi-TF / multidiv;
- reward WHERE, Fib 15m, Fib 1h contre MFE réel;
- risque micro 3m, invalidation 15m, invalidation 1h contre MAE réel;
- qualité des entrées selon proximité/interaction LGI;
- churn restant après exigence de domination persistante.

Aucune variable shadow ne sera promue sur la seule base d'un exemple spectaculaire. La promotion exige plusieurs régimes, une métrique définie et une condition de falsification explicite.
## 20. Empreintes de l'état actif

SHA-256 relevés après activation:
- `modules/v2/layers/risk.js`: `09d5174de3cd74921003d0483f48a09833be06ffc874f086c91ab3b07bcf19bd`
- `modules/v2/adapters/runtime-snapshot.js`: `3466bf166108dc40c7ee56864100c9ad011d93cce95f4260738fee865343bb23`
- `modules/v2/experiments/structural-shadow.js`: `e2a04e7a4dd2b53527a23b0af350f13be53f9a0ecb82168887d88465b98b1d23`
- `modules/trade-simulator-v02.js`: `95536329ce8df7682716f115d45c6c42e7be6b037e708ae6412f2c4ee9b8507f`

Ces empreintes permettent de vérifier ultérieurement si l'état implémenté a changé par rapport au présent journal.


## 21. Retraite V2a et bascule V3-LAB — 18/09/2026

### 21.1 Décision méthodologique

V2a (`constitution-v0.2a`) est considérée comme **expérience terminée**. Elle n'est plus conservée comme groupe de contrôle live permanent.

Motif:
- elle a déjà produit suffisamment de données prospectives sur plusieurs régimes;
- plusieurs artefacts conceptuels sont identifiés et documentés;
- continuer à la faire tourner obligerait à revalider en permanence des mécanismes déjà considérés dépassés;
- une comparaison ultérieure reste possible par replay offline à partir de l'artefact figé.

À partir de cette bascule, **tout nouveau résultat expérimental du simulateur appartient à V3-LAB**.

### 21.2 Archive finale V2a

Archive complète créée avant bascule:
`archives/v2a-final-20260918T092407Z`

Contenu:
- `modules/v2/`;
- `modules/trade-simulator-v02.js`;
- ancien point d'entrée stable `modules/trade-simulator.js`;
- état, historique, décisions, évaluations et shadow V2a;
- Constitution/journal/expérience shadow associés;
- `config.json`;
- `MANIFEST.sha256`.

Une copie de l'état et de l'historique **après clôture administrative** est ajoutée sous:
`archives/v2a-final-20260918T092407Z/retirement/`.

### 21.3 Position ouverte lors de la transition

Au moment de la retraite, V2a avait un LONG ouvert:
- entrée: `78 306,9`;
- clôture administrative: `78 304,3`;
- PnL prix: environ `-0,0033 %`.

La sortie est enregistrée comme:
`EXIT_VERSION_TRANSITION`

Elle est explicitement marquée **hors statistiques stratégiques**. Il ne s'agit ni d'une invalidation ni d'une décision de marché.

## 22. V3-LAB prototype intégral

Version initiale active:
`v3-lab-prototype-0.1`

Document de contrat:
`knowledge/v3-lab-spec-2026-09-18.md`

Version log:
`knowledge/version-log.md`

### 22.1 Principe

V3-LAB n'est pas une version light. Il constitue le laboratoire complet du futur moteur, mais ses couches interprétatives restent volontairement remplaçables jusqu'à convergence expérimentale.

La plateforme technique finale sera construite seulement après stabilisation des meilleurs contrats conceptuels.

### 22.2 Bâton V3

Nouveau module:
`modules/v3lab/adapters/baton-v3.js`

Contrat:
`BATON_V3_RAW_ONLY`

Il expose:
- prix;
- série tick live;
- Ticker brut;
- MCB live/confirmé multi-TF;
- structures LGI/SR;
- fraîcheur.

Il n'émet plus:
- `recommendedDirection`;
- `vigilance`;
- `action`;
- déduction de polarité;
- sens de trade.

Le `baton-relay` legacy n'est pas réécrit à ce stade: V3-LAB le traite comme source technique existante tout en construisant son propre frame propre. Cela évite de casser les collecteurs avant la plateforme finale.

### 22.3 Prix temps réel

Nouveau runtime:
`modules/v3lab/adapters/runtime-frame.js`

Le flux OKX de `price-stream` est conservé comme série tick-by-tick courte et injecté dans le frame V3.

Le prix devient un objet analytique de STATE:
- traduction depuis l'origine de phase;
- meilleure traduction;
- excursion contraire;
- min/max depuis l'origine;
- nombre de ticks live et observations audit.

Le premier contrôle live après activation contenait déjà plusieurs centaines de ticks OKX.

### 22.4 Nouveau modèle de vague

Module:
`modules/v3lab/layers/wave.js`

Objet directionnel:
**E15 → zéro MCB → E15 opposé**

Phases:
**CRÊTE → DESCENTE → CREUX → MONTÉE**

Le passage LBW par zéro est conservé comme événement interne:
`zeroCrossSinceOrigin`

Contrat explicite:
`zeroCrossMeaning = position interne de la phase; jamais une bascule de polarite a lui seul`

Le lobe `0→E15→0` est conservé uniquement comme objet quantitatif:
- durée;
- masse `|LBW| × temps`;
- signe du lobe courant.

Le signe du lobe n'est plus la direction de trade.

### 22.5 Régime

Module:
`modules/v3lab/layers/regime.js`

États expérimentaux:
- `CHOC_COMBAT`;
- `HACHOIR`;
- `COMPRESSION`;
- `TRANSLATION`;
- `TENSION_BALANCE`.

Mesures:
- distance brute/h;
- efficacité de translation;
- fréquence des flips;
- cadence p95;
- priceMove p95.

Les seuils sont comparés dynamiquement aux heures précédentes du même audit, plutôt qu'à une unique valeur absolue fixe.

### 22.6 WHERE V3

Module:
`modules/v3lab/layers/where.js`

LGI et S/R localisent; ils ne donnent pas la direction.

Pour LGI:
- `ABOVE/BELOW` décrit seulement le côté du prix;
- l'ancien label automatique SUPPORT/RESISTANCE n'est pas utilisé comme vérité stratégique;
- densité/confluence est enregistrée.

Pour S/R:
- le catalogue est conservé comme source utilisateur;
- une nouvelle TA/niveaux est attendue avant promotion décisionnelle forte;
- interaction prototype serrée à 100 USD, et non fenêtre legacy ~0,39 %.

### 22.7 DOMINANCE

Le calcul effort/conversion/persistance V2 est conservé comme brique technique déjà utile, encapsulé sous:
`modules/v3lab/layers/dominance.js`

Il ne définit plus à lui seul le sens du trade. Il doit être interprété dans la phase de vague et le régime.

### 22.8 RespirationRisk

Module:
`modules/v3lab/layers/risk.js`

Le Ticker reconstruit une distribution récente de swings avec seuil expérimental de 50 USD et journalise:
- p50;
- p75;
- p90;
- p95;
- excursion contraire actuelle.

Classification:
- `NORMAL`;
- `LARGE_NORMAL`;
- `UNUSUAL`.

Principe:
**distance naturelle nécessaire à la respiration/structure → sizing → risque financier**.

Une dominance opposée n'entraîne plus automatiquement une sortie tant que le contre-mouvement reste compatible avec une respiration normale.

### 22.9 ACTION prototype 0.1

Module:
`modules/v3lab/layers/action.js`

Nouvelle entrée seulement si:
- phase de vague directionnelle;
- DOMINATION_PERSISTANTE alignée;
- WHERE pertinent;
- régime différent de HACHOIR / CHOC_COMBAT.

Sortie:
- invalidation de l'origine structurelle;
- changement confirmé de phase contre la position;
- dominance opposée persistante **et** respiration > p90;
- garde-fou d'urgence.

Les anciens mécanismes V2a `EXIT_GOD_YIELD`, `EXIT_EFFICIENCY`, lobe-direction et zéro-polarité ne sont pas importés comme lois V3.

### 22.10 Divergence et Fib

Les divergences structurelles + détecteur historique restent présents en shadow descriptif.

Nouveau Fib:
`modules/v3lab/experiments/wave-fib.js`

Il n'utilise plus la succession générique de pivots LBW V2. Il s'ancre sur les trois derniers pivots de vague V3:
- CREUX → CRÊTE → CREUX pour long;
- CRÊTE → CREUX → CRÊTE pour short.

Il marque explicitement une géométrie trop profonde/cassée et reste `decisionImpact:false`.

### 22.11 Fichiers V3 séparés

- `data/trade-sim-v3lab-state.json`
- `data/trade-sim-v3lab-history.json`
- `data/trade-sim-v3lab-decisions.json`
- `data/trade-sim-v3lab-evaluations.ndjson`
- `data/trade-sim-v3lab-shadow.ndjson`

Le point d'entrée stable `modules/trade-simulator.js` charge maintenant:
`./trade-simulator-v3lab`

L'API Trades du config-server lit désormais les fichiers V3-LAB.

### 22.12 Activation et non-régression

Contrôles effectués:
- `node --check` sur tous les modules V3-LAB;
- one-shot causal avant activation;
- redémarrage limité à `cerveau-central` et `config-server`;
- services collecteurs, `baton-relay`, `trendline`, `moteur-boono` et exécution OKX laissés intacts;
- V3-LAB reste simulation uniquement;
- premier état live V3 écrit avec flux OKX réel;
- aucune position V3 ouverte au premier contrôle.

Premier état observé après activation:
- nouvelle phase: DESCENTE depuis une CRÊTE 15m;
- DOMINANCE short persistante;
- respiration courante normale;
- WHERE absent;
- ACTION = WATCH.

Ce comportement confirme que l'admission exige l'accord du contexte complet et ne se contente plus du signe du lobe.

## 23. Correction supervision archive-audit

Le rapport quotidien marquait `archive-audit stopped` comme anomalie alors que ce job est exécuté par `cron_restart`.

Correction dans `daily-report.js`:
tout processus PM2 possédant `pm2_env.cron_restart` est désormais considéré normal lorsqu'il est `stopped` entre deux exécutions.

Le comportement d'archivage lui-même n'a pas été modifié.

## 24. Empreintes V3-LAB initiales

- `modules/trade-simulator.js`: `1d2579fa6158ccf71c5e914ad05a07eea414de6eb2077790f7702bebfb5e6fa8`
- `modules/trade-simulator-v3lab.js`: `2fe1ffaecb0d897503a20e8f446d01ccd4fbfca8703308ffd16d48b7c5d890f6`
- `modules/v3lab/adapters/baton-v3.js`: `9b940facefa3aa408b869bcbe8873d578769121ff30288c083684aff3ef9f595`
- `modules/v3lab/adapters/runtime-frame.js`: `ed3bea34f04ea557e11f4f4c7f13d5c3f2ba1d2c9007a3cc5c0265839cef260e`
- `modules/v3lab/layers/wave.js`: `98bd4d1cb18767f7ccf26b0414b3fd826e958052ddab7e72dcc986e8811f7293`
- `modules/v3lab/layers/regime.js`: `42f129f7d47ea8785e6b8821bf37d3bbbed918ce71c78dfd86e180b37a07e6eb`
- `modules/v3lab/layers/where.js`: `528fc6248a8085c681b8ecfe0db153b9860bc5c416ddad6625937d827498188e`
- `modules/v3lab/layers/dominance.js`: `d4c3ae5b138b3f36771ef5f04bc899900b4597ed3c57dd190c59a5cf77d6aa5a`
- `modules/v3lab/layers/risk.js`: `f00d662a74d9abc85681bad5c19aaa2421ad38a4c6d122fd3d95f4cdf86de443`
- `modules/v3lab/layers/action.js`: `93029e93e09557e6908651294b12284e528e2be39b2571eafcf45a0d96b10d6a`
- `modules/v3lab/core/engine.js`: `3c85908796dbcce8d1844521ceb72c22416e0c7a6540c20f4f7818e64c603a66`
- `modules/v3lab/experiments/structure-shadow.js`: `ca1466b6df33e54ec8853faa3e3a558dc7210012ca5000d67e852e31aa05e7cb`
- `modules/v3lab/experiments/wave-fib.js`: `f5a7ee920ae2f0065bba87d667d700d855434b537593677231eec44b06e3226a`
- `daily-report.js`: `d543988abf777f872ce57355125cd469eb51efce6203f7c5c4bca24f16fa9ebc`
- `modules/config-server.js`: `5f64731381b232262e3398ec7f07ab397350302379d30fe27eddc5c9a2dce79f`

## 25. Cockpit V3-LAB + expérience de tranches — 19/09/2026

### 25.1 Test des répartitions

Backtest contrefactuel sur l'ancien moteur, en conservant ses événements TP1/TP2/final.

Sur 123 trades : ancien 25/65/10 +107.18 % x10, PF 2.04, DD -14.83 % ; 70/30 +149.75 %, PF 2.35, DD -19.91 % ; 60/40 +145.71 %, PF 2.29 ; 50/50 +141.67 %, PF 2.20 ; 40/60 +137.63 %, PF 2.12.

Sur les 12 trades depuis le 16/09, le régime récent favorise au contraire un runner plus grand, avec 40/60 à +35.15 %. Aucun ratio n'est promu en loi active.

Document : knowledge/experiment-tranches-v3lab-2026-09-19.md

### 25.2 Shadow de tranches

Nouveau module : modules/v3lab/experiments/tranche-shadow.js

Règle : EXIT_EXECUTION profitable = PROTECT partiel ; modèles 70/30, 60/40 et 50/50 ; runner virtuel jusqu'au changement confirmé de phase ; sorties structure/risk complètes ; aucun impact ACTION.

Fichiers : data/trade-sim-v3lab-tranche-shadow.json et .ndjson.

### 25.3 Cockpit visuel V3-LAB

config-server.js est adapté au contrat V3 : onglet Etat V3-LAB ; suppression des fallbacks visuels V2 pour les cartes actives ; affichage WAVE 15m, MCB LBW/BW/MF, traduction prix/respiration, régime, Ticker Vol BTC + winSec + cadence + priceMove, respirationRisk p75/p90, WHERE détaillé LGI/SR, divergences 3m/15m/1h/4h, DOMINANCE, ACTION et statut du shadow de tranches.

Le compact V3 journalise désormais le Ticker utile au cockpit, le résumé des divergences multi-TF et le résumé du tranche shadow.

### 25.4 Prix live interface

Le navigateur ouvre un WebSocket public OKX BTC-USDT-SWAP / trades exclusivement pour l'affichage. Le prix est présenté dans une carte dédiée PRIX LIVE et se met à jour tick par tick, indépendamment du cycle analytique de 30 s. Ce flux UI n'alimente aucune décision et utilise le snapshot V3 comme fallback visuel.

### 25.5 Déploiement

Backup pré-modification : archives/v3lab-cockpit-20260919T092422Z

Services redémarrés : cerveau-central pour la télémétrie compacte + tranche shadow ; config-server pour l'interface. baton-relay, collecteurs, trendline et vieux moteur-boono non modifiés.


## 26. V3-LAB 0.2 — séquençage causal et reversal 3m→15m — 19/09/2026

### 26.1 Motivation

Deux occasions manquées ont montré deux défauts distincts de V3-LAB 0.1 :
- LONG ~09:40 : les preuves WHERE / DOMINANCE / turning point arrivaient successivement mais V3 exigeait leur simultanéité exacte ;
- SHORT ~11:20 : le 3m et le Ticker commençaient à signaler le retournement avant confirmation complète du pivot 15m.

### 26.2 Nouvelle couche 3m

modules/v3lab/layers/wave.js expose désormais wave.nested3m : phase, direction, turning point, pivots, LBW/BW/MF et lobe 3m. Le 15m reste l’autorité de phase principale.

### 26.3 Mémoire de séquence

Nouveau module : modules/v3lab/layers/sequence.js

TTL initiaux expérimentaux :
- WHERE : 12 min ;
- turning point : 18 min ;
- dominance : 6 min.

La mémoire ne permet jamais une entrée à partir d’une dominance périmée : la DOMINANCE requise pour ACTION doit être actuelle et persistante.

### 26.4 REVERSAL_FORMING

Nouveau module : modules/v3lab/layers/reversal.js

Pour un reversal anticipé :
- turning point 15m courant ou récent compatible ;
- 3m dans la direction opposée à la phase 15m ;
- DOMINATION_PERSISTANTE actuelle dans ce même sens ;
- régime non HACHOIR / CHOC_COMBAT.

Le turning point 15m constitue la localisation structurelle du reversal. Une LGI/SR simultanée n’est donc pas obligatoire.

Le statut REVERSAL_FORMING_LONG/SHORT ne remplace pas la phase 15m confirmée.

### 26.5 RISK / ACTION

risk.js distingue désormais PHASE_CONTINUATION et REVERSAL_FORMING.

Continuation : phase 15m + dominance actuelle alignée + WHERE courant ou récemment mémorisé + régime admissible.

Reversal : REVERSAL_FORMING complet + dominance actuelle opposée + turning point 15m comme localisation + invalidation candidate sur l’extrême de prix de la phase en cours.

### 26.6 Replays causaux

Cas LONG 19/09 ~09:40 :
- WHERE devient pertinent ~09:48 ;
- DOMINANCE long redevient persistante ~09:52 ;
- avec TTL WHERE 12 min, entrée théorique ~09:52:41 à ~81 055 ;
- la mémoire n’aurait pas autorisé l’entrée pendant la dominance short précédente.

Cas SHORT 19/09 ~11:20 :
- phase 3m déjà short ;
- CRÊTE_EN_FORMATION 15m apparaît ~11:23 ;
- DOMINANCE short persistante + régime admissible réunis ~11:26:32 ;
- REVERSAL_FORMING_SHORT aurait donc pu devenir actif vers ~81 406.

### 26.7 Version

Version active : v3-lab-prototype-0.2

Migration de l’état depuis 0.1 sans position ouverte.

Backup pré-bascule :
archives/v3lab-01-before-sequence-20260919T094850Z
