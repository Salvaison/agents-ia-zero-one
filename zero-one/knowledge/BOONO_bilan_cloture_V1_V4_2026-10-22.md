# BOONO Systems — Bilan de clôture des quatre premières Constitutions

**Date : 22 octobre 2026 — enquête historique V1 → V4, particulièrement V4.**

**Statut : ARCHIVE CRITIQUE / CONCLUSIONS HISTORIQUES — non constitution de V5, non implémentation, aucune règle active validée par ce document.**

## 0. Mandat
L'utilisateur souhaite **clore** proprement les générations V1 à V4, non accumuler leurs règles dans la future V5. Question : quels phénomènes ont dû être conceptualisés pour être reconnus par BOONO, quelles réalisations étaient réellement nouvelles, quand la qualité du moteur V4 s'est-elle dégradée et pourquoi ?
Hiérarchie des preuves : serveur réel / code / logs et trades, puis archives historiques, et enfin interprétations. Les tests unitaires prouvent une cohérence logicielle locale, jamais à eux seuls un avantage économique.
Aucune modification du trading n'est requise ou autorisée dans le cadre de cette étude.

## 1. Chronologie des Constitutions
- Avant Constitution : BOONO original fondé sur des déclencheurs Bâton, des filtres/guardrails accumulés ; comparaison de contrôle possible, mais pas un backtest identique aux Constitutions.
- **V1, Constitution v0.1, 14–16 septembre** : sortie de Market Watch 11–13 septembre. Hiérarchie top-down MCB → microstructure / effort → yield → persistance → action. Séparation des invalidations structure, exécution et risque. Distinction comportement « faible rendement » vs absorption démontrée. Premiers états KNOWN/UNKNOWN, énergie et conservation du terrain.
- **V2, Constitution v0.2, 16–17 septembre** : WHERE → STATE → DOMINANCE → RISK → ACTION, séparation responsabilités, temporalités 1W/1D/4h/1h/15m/3m/ticker, fraîcheur et importance de prix OKX réel. WHERE et dominance ont malgré cela pris trop de droits d'admission.
- **V2a, v0.2a, 17–18 septembre** : DOMINATION_PERSISTANTE, contrôle de l'érosion ; meilleure intention de prudence mais approbation directionnelle tardive et perte de timing. V2a archivée reproductible 18/09, sortie administrative EXIT_VERSION_TRANSITION.
- **V3-LAB, 18 septembre–1er octobre** : E15→zéro→E15 opposé, E3 imbriqué, phases CRETE/DESCENTE/CREUX/MONTEE, mémoires de séquence, WHEN/WHERE, rythme/régime, invalidation prix distincte de l'ancre E15, divergences et MA200 en shadow ; expériences et Deep Reviews. Plusieurs couches redonnent une autorité de décision à des descriptions/guardrails concurrents.
- **V4, 1–22 octobre** : rupture d'autorité validée. MCB_STATE/MCB_THESIS seul propose la direction ; PM Live/price translation constate conversion, ticker qualifie, RISK protège, dominance devient secondaire, WHERE et R/R ne choisissent pas le camp. V3 conservée en shadow.

## 2. Chiffres réels — ne pas comparer comme des backtests A/B
Sources : `data/trade-sim-v2-history.json`, `data/trade-sim-v3lab-history.json`, `data/trade-sim-v4-history.json`, archive `archives/simulator-v0.1-final-20260916T135547Z/trade-sim-v2-history.json`. P&L marge = somme des `pnlPercentLeveraged`, ≈×10, **sans frais** avant V4.9.1. Périodes/régimes/fenêtres/versions d'entrées différentes.
- V1 : **13 trades, 5 gagnants, −8,87 % marge brute x10**.
- V2 : **54 trades, 20 gagnants, +2,70 % marge brute x10**.
- V2a : **65 trades, 22 gagnants, −0,94 % marge brute x10** (une clôture administrative dans l'archive V2).
- V3-LAB : **146 trades, 63 gagnants, −1,25 % marge brute x10**, très hétérogènes ; mauvais épisodes 21/09 (-16,88 %), 30/09 (-6,26 %), sans frais.
- V4 : **155 clôtures, 46 gagnantes, −9,16 % marge cumulée affichée**, `pnlUsd` cumulé **−13,74 $** mais ce dernier mélange 92 trades historiques bruts et 63 trades fee-aware et n'est PAS un résultat net homogène.
- **Les 63 trades fee-aware V4 : brut +43,38 $, frais −94,51 $, net −51,13 $, seulement 17 gagnants** ; avec frais, la rentabilité non démontrée.
- **11 derniers trades clôturés : zéro gagnant, net −33,86 $, neuf EXECUTION_FAILURE, dix MFE <120 $ prix BTC** ; #151–155 cinq SHORT_FORMING rejetés ensuite par EXECUTION_FAILURE, net −15,62 $.

## 3. V1 → V3 : acquis irréversibles et erreurs à archiver
### V1
Acquis : cadence/vol = intensité non direction ; yield = prix/effort ; low yield sans preuve temporelle n'est pas absorption ; éviter de prédire ex ante le CDW ; structure survivante ≠ position survivable. Limite : théorie naissante, peu de mémoire, entrées économiquement fragiles.
### V2 / V2a
Acquis : contrats de modules, UNKNOWN, top-down sans vote homogène, provenance temps réel, rôle des zones et contexte, tentative de domination persistante. Limite : WHERE ou DOMINANCE deviennent permissions/vetos ; l'attente d'une confirmation peut tuer la meilleure part de la translation ; signe du lobe ≠ direction de vague.
### V3
Acquis majeurs : paire E15 causale, distingue source LBW et extrême prix ; phases vs direction, E3 embarqué, mémoire de turning, structure 15m persiste malgré retracement, fausses divergences à filtrer, rôle de MA200, distinction WHERE lieu vs preuve, journal périodique/test.
Échecs démontrés :
- 21/09 deep review 28 trades, 6W/22L, −21,94 % marge ; `DESCENTE` MCB reste légitime alors que l'admission SHORT est devenue tardive, relation lieu/price non validée.
- P90 sur nuit 29→30/09 : 13 trades, 3W/10L, −7,54 % ; 11 sorties p90 et réentrées très rapprochées. `wave.price.counterExcursionUsd` de la vague entière consommée comme respiration trade-level ; timer/percentile pré-armé, restarts d'une campagne sans continuité.
- V3 crash 23/09 : décisions JSON monolithiques ~537 Mo, évaluations ~501 Mo, shadow ~456 Mo ; perte d'archive causale 06h36–09h13 UTC, sans backfill ; NDJSON rotatif mis en place mais la politique de rétention demeurait fondée sur taille, non profondeur.
- WHERE a dû perdre son veto le 24/09 après 720 observations / zéro entrée dans un état d'analyse excessivement restrictif.
Leçon : une description structurelle ne confère pas un droit d'entrée ; une protection exige son propre horizon et une continuité de campagne.

## 4. V4 : étapes de progrès et détérioration observée
Toutes les statistiques de cohortes V4 ci-dessous sont classées par **version d'entrée**, pas forcément version de sortie (`exitEngineVersion` peut différer), et aucun petit échantillon ne permet d'attribuer une causalité à un commit seul.

**01–02/10, V4/V4.1 — bon départ conceptuel, performances très concentrées.**
- MCB_ONLY, qualité E15 (span LBW entre E15 opposés ≠ amplitude d'un E15 isolé), conservation d'extrêmes Live et causalité CONFIRMED vs LIVE.
- 33 trades V4.1, 10W, **+30,92 % marge avant frais**. Ce chiffre masque les quelques gros gains ; **le 03/10, 27 trades toutes versions confondues, seulement 5W, MFE médian ~21,9 $**.
- Les premiers signes de détérioration apparaissent donc **dès le 3 octobre**, avant la majorité des modules ultérieurs.

**03/10 V4.2 — tentative anti-churn insuffisante.**
- TRANSITION_NEUTRAL, promotion avec PM3 et MCB3 cohérents, sizing 1 000/150/1 500 $.
- Cohorte 21 trades, 3W, **−8,90 % marge** ; investigation V4.3 : **95,8 % d'exposition** sur #39→#50 et **15 flips sur 16 transitions**. Beaucoup d'allers-retours, pas assez de phase persistante.

**04–05/10 V4.3→V4.5 — clarification utile, conséquences ambivalentes.**
- V4.3 sépare le cycle de setup, preuve PM post-setup, base MCB, contexte 1h et structure room. Huit trades, 4W, +14,83 % brute, petit échantillon.
- V4.4 ajoute UP_REINFORCED asymétrique, filtre LOW_EDGE/sub80, matérialité PM ; corrige des contre-factuels, mais peut bloquer une vraie impulsion contre la 1h.
- V4.5 règle explicitement que le ticker ne soit plus verrou final et que 3m UP_REINFORCED ne puisse pas sortir seul un SHORT ; le PM/efficiency post-setup peut admettre des mouvements silencieux. Quatre trades, deux gagnants, +2,97 % brute. Danger restant : PM « frais » peut être dernière impulsion déjà consommée.
- V4.6 généralise la trajectoire structurelle E3→E3, E15→E15 et 1h ; 14 trades, 7W, **−3,51 % marge avant frais**, plusieurs MFE importants et pertes importantes ; mieux expliquer la structure n'assure pas la qualité d'exécution.

**08/10 V4.7–V4.8 — comprendre campagne vs exécution et protéger.**
- V4.7 retire le veto 1h trop puissant, garde la 1h comme qualificatif ; mémoire de campagne 15m, continuité PM3/PM5 renforcée CHOP, `EXIT_EXECUTION_FAILURE`, `EXIT_MFE_PROTECTION`, range R/R informatif.
- V4.7.1 distingue le reclaim échoué après MFE modéré ; V4.8 ajoute garde 4h profonde sur LONG knife-catch et support E4h.
- Amélioration locale de sécurité/exits ; la mémoire de campagne repose encore sur des verrous de réarmement et pas une interprétation complète des tentatives E3/E15.

**09–12/10 V4.9.1/2 — transparence économique, rupture dans la mesure.**
- 92 historiques à ce moment : gain brut cumulé ~+37 $ ; frais simulés ~−138 $ => économie potentielle négative. V4.9.1 introduit frais taker entrée/sortie, V4.9.2 shadow TP1/TP2.
- Cohorte V4.9.2 : **20 trades, 6W, brut +14,27 $, frais 30,01 $, net −15,74 $**. Même les moteurs générant une valeur brute positive ne couvrent pas la commission.
- Ce n'est pas nécessairement une nouvelle dégradation ; c'est une **dégradation enfin rendue visible**.

**12–15/10 V4.9.3 — phase favorable confirmant progrès locaux.**
- La mémoire MF lente devient active dans l'admission, avec transfert 30m/1h/3m et contournement renforcé sous conditions.
- Cohorte 13 trades, 5W, **brut +27,79 $, frais −19,50 $, net +8,29 $**.
- Cela interdit de raconter une « détérioration linéaire irréversible » et montre que des corrections pouvaient avoir une utilité locale, sans preuve universelle.

**15–17/10 V4.10.0→V4.10.5 — contrepoids qui commencent à se neutraliser.**
- V4.10.0 : `SETUP_LATE` devient verrou, seuil 12 min/12 % recovery ; gain-floor 220/180 ; stack E15 Live adverse + 3m + PM + MA200 peut sortir avant confirmation.
- V4.10.1 préserve fraîcheur/identité de setup ; V4.10.2/3 shadows re-entry et price behavior.
- 16/10 : panne collecteur CDP = **174 min de MCB3 confirmé manquant**, watchdog déclarait faussement OK pendant que le prix OKX continuait. V4.10.5 remet la fraîcheur MCB au niveau « fail closed », corrige `Number(null)=0` qui corrompait le setupTs et crée le shadow d'admission contrefactuel.
- Audit du 16/10 : **94,67 % NO_TRADE sur 2 869 évaluations**, 1,19 % SETUP ; LOW_EDGE, WAIT_SYNC, MF_MEMORY, BOUNDARY et SETUP_LATE s'additionnent. Dans 102 frames ayant une candidate MCB, PM3/PM5 et efficacité cohérentes, **98/102 restent NO_TRADE**. Des occasions passent sous les protections.
- Cohorte V4.10.5 : six trades, une victoire, **−21,72 $ net**, quatre EXECUTION_FAILURE. Cela démontre une période mauvaise, pas que la sécurité DATA_OK en soit la cause.

**17–20/10 V4.10.7 — tentative de requalification locale (effets mixtes).**
- Après une sortie perdante, retry possible avec nouvelle structure/lobe 3m post-exit + PM3/PM5 + efficiency + price behavior, sans nouvel E15 obligatoire.
- Cohorte 14 trades, 4W, **brut +23,65 $, frais −21,01 $, net +2,64 $**, portée notamment par un très grand gagnant ; les autres mauvais trades restent nombreux.
- La problématique « une seule campagne reconnue comme multiples setups » n'est donc pas résolue.

**20–22/10 V4.10.8→V4.10.10 — rechute d'admission visible.**
- V4.10.8 : exception à LOW_EDGE/sub80 quand PM3 et PM5 confirment, pour rouvrir des setups bloqués ; plusieurs autres gates restent inchangés.
- V4.10.9/10 : protections du gain sur flux prix (+120/90, +220/180), gardes utiles mais aucun pouvoir sur entrées MFE <120.
- Cohorte V4.10.8 (2 trades) : 0W, net −4,38 $. Cohorte V4.10.9 (1 trade) : −4,71 $. Cohorte V4.10.10 (4 trades) : 0W, net −10,91 $.
- Derniers 11 trades (versions mélangées) : **0W, net −33,86 $, 9 EXIT_EXECUTION_FAILURE, 10 MFE<120** ; le 21/10 seul, 6 trades perdants et net −17,93 $.
- #151–155 : tous SHORT_FORMING admis avec PM récente en `CHOP_SHADOW`, 5 EXECUTION_FAILURE, net −15,62 $. #152 SHORT contraire à l'orientation longue 30m et E15 UP Live. #155 SHORT à la fin d'une impulsion baissière déjà fortement consommée. Les protections 120/90 ne pouvaient pas les sauver.

## 5. Pourquoi V4 a pu se détériorer malgré des concepts plus justes
1. **Horizon insuffisamment mémorisé à l'admission.** MCB propose la direction mais la relation temporelle avec les E3 antérieurs, les respirations et les contre-attaques peut être perdue par la notion de setup local `setupTs`.
2. **Preuve PM fraîche ≠ phase de conversion naissante.** Le reset post-setup empêche de recycler de vieux PM, mais n'établit pas si la dernière impulsion est début, milieu ou fin de cycle. Une preuve numérique impeccable peut correspondre à un mouvement déjà épuisé.
3. **Multiplication de permissions et veto conditionnels** : WAIT_SYNC, LOW_EDGE, MF_MEMORY/TRANSFER, BOUNDARY, SETUP_LATE, CAMPAIGN_RETRY, THESIS_CONSUMED, exceptions UP_REINFORCED. Dans des fenêtres différentes, on sur-filtre et sous-filtre ; des tests locaux verts ne prouvent pas une politique globalement cohérente.
4. **Un prix productif adversaire peut rester descriptif.** #152, #154 : la chaîne LONG dispose de preuves, mais SHORT est admis via une nouvelle poussée PM momentanément vendeuse. La direction « MCB_ONLY » ne suffit pas à évaluer la maturité réelle de l'opposition.
5. **Sécurité et rentabilité mélangées dans les expérimentations** : des stops réussissent à plafonner une perte mais ne créent pas une bonne entrée. Les frais (~1,50 $/trade notionnel 1 500 $) effacent un petit edge.
6. **Mesure rétrospective fragile** : les états imbriqués ajoutés à chaque shadow se retrouvent dans les rapports historiques et dans chaque évaluation ; taille des fichiers explose, couverture des logs rotatifs par taille passe à ~43–50 min au lieu de 48 h. Le 22/10, UI TRADES réenvoyait ~110 Mo JSON/30s ; incident utilisateur sur forfait Internet. Correction UI seule déployée, logs compacts 48h à faire.

## 6. Phénomènes effectivement reconnus vs seulement décrits
- **Reconnu et décisionnel** : MCB15 thèse, 3m cohérence structurelle, setup PM frais+continuité, MF memory transfert, garde DQ, protections de risque/exit et certains anti-churns.
- **Reconnu mais shadow/descriptif** : divergence causale, 4h/1d/1w selon périmètre, contexte niveaux comme R/R, price behavior, admission counterfactual, Elastic Sync ordre des preuves, deux chaînes et qualifications Elastic v0.5.
- **Encore insuffisamment compris / ne peut être proclamé acquis** : origine lente d'opportunité distincte du premier E3 productif, mémoire E15/E3 des contre-attaques, distinction breathing/reacceleration/exhaustion avec rendement marginal, relation temporelle entre les qualités, réarmement de campagne sans churn, efficacité économique prospective hors régime particulier.

## 7. Clôture des dossiers — ce qu'il faut conserver et ce qu'il ne faut pas migrer
**Conserver comme connaissances et contraintes de vérité :**
- provenance temporelle `sourceTs` vs `observedAt`, Live vs Confirmed, qualité DATA_OK, `UNKNOWN` légitime ;
- MCB E15/E3 causal et séparation `lobeSign` / trajectoire E→E, ancre MCB vs extrema prix ;
- MCB propose la thèse ; PM traduit ; ticker renseigne effort/rendement ; prix juge le terrain retenu ; risk protège le capital ;
- CONTEXT/WHERE/R:R ne choisissent pas la direction, 1h ne devient pas automatiquement veto ;
- une respiration 3m peut être opposée sans invalider 15m ;
- les sorties peuvent distinguer structure, exécution et hard risk ;
- les frais réels modélisés, le gapping possible, aucune rentabilité prouvée sans résultat net ;
- audit prospectif et protocoles de contre-factuels sans fuite de futur.

**Ne pas migrer automatiquement en V5 :**
- les chaînes de veto anti-churn empilées et exceptions liées à des échecs ponctuels ;
- les seuils 55/120/220/440/500, 12min/12%, 37.5%, etc. **sauf les contraintes de sécurité distinctes explicitement reconfirmées** ;
- la confusion entre dernière poussée PM productive et nouvelle opportunité ;
- le « vote » de phénomènes corrélés E3 + croisement BW/LBW3, E15 + BW/LBWcross15 ;
- la tendance à ajouter un nouveau shadow avec son histoire complète dans chaque snapshot, chaque trade et chaque réponse UI ;
- l'idée que des replays ciblés montrent l'amélioration de rendement hors échantillon.

**Questions ouvertes, pas réponses imposées pour V5** :
- quand la tendance lente donne-t-elle naissance à une hypothèse avant E3 ? quels contre-efforts E3/E15 mémoriser ?
- quelle relation entre qualité instantanée et moyenne/distribution sur 4×15 min ?
- comment reconnaître ex ante l'entrée précoce mais économiquement justifiée, sans acheter la dernière impulsion ?
- comment mesurer un segment exploitable net des frais plutôt que le simple fait que les indicateurs sont alignés ?

## 8. Gouvernance de clôture
Classer V1, V2/V2a, V3-LAB et V4 comme **bases historiques gelées et auditables**. Ne pas supprimer les logs existants, ne pas ajouter des lois V4 automatiquement dans V5. Conserver V4.10.10 comme baseline de comparaison tant que la transition n'est pas validée. Comparer une éventuelle V5 sur des échantillons causaux comprenant des gains et des échecs, avec frais, plus un journal décisionnel compact 48 h et une limitation stricte du trafic UI.
**Ce document n'autorise aucun changement de comportement du moteur actif.**

## 9. Sources inspectées
- `knowledge/version-log.md`, `knowledge/refonte-simulateur-2026-09-14.md`, `knowledge/constitution-v0.2-2026-09-16.md`, `knowledge/v3-lab-spec-2026-09-18.md`, `knowledge/v4-constitution-2026-10-01.md`.
- `knowledge/deep-review-24h-2026-09-21.md`, `knowledge/overnight-trades-review-2026-09-30.md`, `knowledge/audit-systeme-logique-boono-2026-10-16.md`, `knowledge/v4.7-context-campaign-execution-2026-10-08.md`, `knowledge/v4.10.5-data-integrity-admission-shadow-2026-10-16.md`, `knowledge/v4.10.8-low-edge-rolling-requalification-2026-10-20.md`.
- Archives des 13 trades V1, 119 V2/V2a, 146 V3-LAB, 155 V4 clôturés (snapshot historique 22/10).
- Git jusqu'au 22/10 (notamment mises à jour MF, protections, requalification, Elastic), modules `v4/layers/setup-lifecycle.js`, `v4/layers/action.js`, `trade-simulator-v4.js`, `config-server.js`.
- Notes d'audit d'Elastic et de performance de bande passante 22/10.
