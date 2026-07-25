# Bot Trading Boono — Histoire du projet

*Document de référence, reconstruit le 24 juillet 2026 à partir des transcripts complets des sessions de travail. Les phases critiques sont détaillées ; les incertitudes restantes sont marquées comme telles. Remplace le contenu narratif de `session-log.md`, devenu un simple index.*

---

## Vue d'ensemble

Bot Trading Boono est un système autonome de trading BTC/USDT construit par Benjamin Weibel (Salvaison/Boono) dans le cadre du programme ZeroOne Systems (60 jours de construction d'agent). Sources de signal : Market Cipher B (MCB) et MC DBSI, capturés en temps réel depuis TradingView. Exécution prévue sur MEXC Futures. Horizon critique : automne 2026.

Architecture à trois machines :
- **iMac** — collecte temps réel via Chrome DevTools Protocol (CDP). **Source de vérité de toutes les données CSV** — le VPS n'en est qu'un miroir rsync. Cette distinction, posée dès l'origine, s'est révélée décisive pendant la crise de juillet.
- **VPS DigitalOcean** — cerveau de décision (`cerveau-central.js`), interface de pilotage (`config-server.js`), sous PM2
- **Chromebook** — pilotage et édition via GitHub Codespaces

Contrainte structurante héritée du plan TradingView gratuit : **2 onglets maximum**. Toute l'architecture de collecte en découle.

---

## Phase 1 — Fondations (fin juin 2026)

ZeroOne Days 3-39 : matrice de priorités de l'agent, profil de personnalité INFP-A appliqué à l'agent, interview documentaire, `soul.md`, `CLAUDE.md`, SOP v1.1 (six composantes : Triggers, Inputs, Process Steps, Decisions, Outputs, Error Handling), protocole de daily brief en 3 phases.

Mise en place matérielle :
- iMac (iMac18,3, 8 Go RAM) monté vers macOS Monterey 12.7.6 via GibMacOS, dédié à la collecte
- Architecture CDP à deux onglets : Tab 1 verrouillé sur le 3m (`real-time-collector.js`), Tab 2 en rotation 15m→1h→4h→1D→1W (`tab2-collector.js`), avec garde de 120s et déclenchement anticipé à 45s
- Clés WebSocket identifiées : MCB = série `YXeZEi`, DBSI = série `S8XNwk` (labels graphiques Pine, `ci=8` top / `ci=9` bottom)
- Chrome lancé avec trois flags anti-throttling indispensables (`--disable-background-timer-throttling`, `--disable-backgrounding-occluded-windows`, `--disable-renderer-backgrounding`) — sans eux, la collecte s'arrête silencieusement dès que les onglets passent en arrière-plan
- PC Windows Acer configuré avec WSL2/Ubuntu, Node.js, Claude Code, MCP TradingView

---

## Phase 2 — Les incidents de collecte et le durcissement (8-15 juillet 2026)

Trois blocages en une semaine, tous détectés par le contrôle manuel du matin — jamais par le système lui-même. Chacun a durci l'infrastructure.

**8 juillet — six collecteurs, deux onglets.** Six `real-time-collector.js` en parallèle se disputaient les 2 onglets disponibles ; quatre tournaient en boucle sur "All tabs owned" sans jamais planter. Pendant cette mêlée, des collecteurs ont écrit dans les CSV des autres — `mcb_1w.csv` s'est retrouvé pollué de 30 bougies 15m/3m. Résolu le 13/07 par retour strict à l'architecture à 2 process.

**14 juillet — le zombie de 16h.** WebSocket techniquement ouvert mais muet pendant 16h41. Le watchdog sautait sa vérification dès que `wsMap` contenait une entrée.

**15 juillet — le correctif qui ne marchait pas.** 6h30 de trou supplémentaire : le fix du 14 mesurait le temps depuis la dernière *frame* — or les heartbeats TradingView le rafraîchissaient en permanence, donc le watchdog ne se déclenchait jamais. Le correctif définitif mesure le temps depuis la dernière **bougie écrite** sur le TF actif (seuil = 2× sa période) et fait `process.exit(1)` pour que launchd relance. Validé plus tard en conditions réelles : redémarrage automatique en ~155ms, coût maximum de 2 bougies par incident.

**Le blocage du 1W — quatre couches.** Le cas le plus instructif : `mcb_1w.csv` figé une semaine entière parce que les bougies parasites du 8/07 portaient un timestamp plus récent que la dernière vraie bougie hebdo — le scheduler concluait "à jour" et n'y retournait jamais. Quatre causes empilées, chacune bénigne isolément, aucune erreur nulle part. **Leçon : c'est l'empilement qui crée les problèmes invisibles ; il faut aller au bout de chaque investigation.**

---

## Phase 3 — Résolution MEXC 602 (13 juillet 2026)

L'erreur 602 ("signature verification failed") bloquait toute exécution d'ordre depuis des semaines. Ce n'était **ni la signature, ni l'horloge, ni le type de clé** : la clé `Cloclo` était liée à une mauvaise IP dans le whitelist MEXC (l'IP domicile au lieu de celle du VPS). Une fois l'IP du VPS renseignée, authentification du premier coup — la signature HMAC était correcte depuis le début. Solde Futures confirmé : ~22,47 USDT, permissions Futures complètes.

**Leçon : des semaines de suspicion sur le code pour un problème qui était en amont, au niveau réseau.** La même vérification, reproduite à l'identique le 24 juillet sur le nouveau serveur, retrouvera le même solde exact.

---

## Phase 4 — Élucidation du signal MCB et clarification du shlong (16 juillet 2026)

Journée charnière de compréhension, par sniff live du WebSocket (`ws-sniffer.js`).

**Le signal MCB.** On croyait les colonnes `buy`/`sell` cassées (0 point vert sur 284 bougies). En réalité, le mapping était juste : le gros point vert s'imprime quand la **Blue Wave entre dans la bande -93/-103** (bornes exposées par `v[18]`/`v[19]`) — zone de survente extrême, ~2% des bougies. Le signal est rare par nature. Les colonnes `buy`/`sell` ne servent pas au volume : elles marquent les bougies où comparer BW/LBW au prix pour détecter les divergences. Mécanisme de préavis documenté : un point peut s'afficher sur la bougie en cours puis disparaître à la suivante.

**Le shlong.** Une analyse antérieure erronée ("25/50/25 structurellement mal pensé") a été corrigée : le shlong n'est **pas une sortie en paliers, c'est une bascule entre deux positions** — long et short coexistent par construction. Répartition 25/65/10 : 25% → TP1 (verrouillage, jamais optionnel), 65% → TP2 déclenché à l'**amorce du mouvement inverse** détectée par le système (le Fib 0.618 est une référence, pas le déclencheur), 10% maintenus comme **assurance** couvrant la perte plafonnée du short en cas d'échec.

Durant cette période, **trois analyses erronées de l'assistant ont été corrigées par Benjamin** (colonnes buy/sell, réserve structurelle du shlong, différence signée vs valeur brute sur v[15]/v[16]) — la validation humaine reste indispensable même sur du travail d'analyse en apparence solide.

---

## Phase 5 — Architecture de décision et système de score (14-20 juillet 2026)

**14/07** — création de `config.json`, point de vérité unique des paramètres. Dry run #01 : 10 écarts documentés en trois familles (cas limites non prévus, dépendance aux interfaces non construites, absence de timeouts). Conclusion : le daily brief n'est pas exécutable en l'état.

**15/07** — architecture à trois étages arrêtée : (1) **score sommé** — Divergence + Range/S-R + Volume (Momentum/MoneyFlow/DBSI) ; (2) **Trigger** — seuil indépendant qui prend la main une fois le score validé ; (3) **MA/Trend** — filtre de direction. Barème v5.2 formalisé (divergence 5/10/15/20 selon 1tf/2tf/3tf/multi, S-R 15/25, échelles 1-5 pour le volume, seuils différenciés scalp/day/swing). Apport de l'analyse Jayson Casper : un scénario vivant a **trois branches**, pas deux — confirmé / infirmé / **traversée sans réaction** — précisément la branche qu'on oublie en formalisant.

**17/07** — réécriture de `cerveau-central.js` : de one-shot (le buffer de ticks du Trigger n'avait jamais le temps de se remplir) à boucle persistante avec warmup 30s. Invention du `volumeBypass` : quatre minimums simultanés comme porte d'entrée parallèle à la somme.

**20/07 — la découverte de la MA200 cachée.** En sniffant la série DBSI, identification que `v[1]` est la moyenne mobile 200 périodes ("Long Term Trend" dans les réglages MC DBSI — les deux "7" du réglage "7 7 200" étant des seuils internes sans rapport). Une donnée qu'on croyait devoir collecter séparément dormait dans un flux capturé depuis des semaines. Décisions associées : colonne `ma200` ajoutée en 13e position du CSV (rétrocompatible) ; la MA200 devient une **source de niveau S/R** alimentant le score `rangeSR` existant — pas un pilier séparé ; barème progressif 10/15/25 (touche simple / retest confirmé / confluence scénario), règle heuristique touch→reject-ou-retest→confirmation avec clause "wait for further confirmation" ; et le circuit breaker qui manquait trouve son critère objectif : prix retraversant la MA200 contre la position = invalidation.

**23/07 — le pivot OU.** Benjamin remet en question le score pondéré unique — le risque qu'une somme composite noie le signal à mesure que les ingrédients s'accumulent. Décision : deux systèmes de décision coexistent, reliés par un OU logique :

```
ENTRER si (somme pondérée >= seuil) OU (toutes les conditions d'un scénario nommé sont vraies)
```

Ce pivot généralise ce que le `volumeBypass` avait inventé intuitivement. Extension en grammaire conditionnelle modulaire : `SI [conditions] ALORS [action]` + `SINON SI [...]` (répétable) + `SINON [action]` (terminal), chaque bloc optionnel au-delà du premier.

---

## Phase 6 — Conception de l'interface de pilotage (21-23 juillet 2026)

Construction itérative, d'abord en maquettes (Interface 1 : soumission S/R), puis fusion en interface unique. Décisions retenues :
- Composeurs par famille (Points DS/DR/WS/WR/MS/MR, Fibonacci fib0/fib1, Range avec VAH/POC/VAL) — insertion par jeton cliquable, collage direct de séquences accepté
- Regroupement visuel des ensembles sémantiques, suppression en bloc pour préserver l'intégrité des groupes, édition en place des valeurs
- Navigation finale : **cinq onglets à plat** (NIVEAUX / SCENARIO / DIAGNOSTIC / TRADES / PARAMETRES), après abandon d'une proposition à deux niveaux jugée trop complexe
- L'onglet Diagnostic lit `data/latest-evaluation.json`, écrit par `cerveau-central.js` à chaque cycle — plutôt qu'une seconde connexion WebSocket
- Authentification obligatoire (l'interface pilote des décisions de trade), mobile-first, max 480px

---

## Phase 7 — La crise de corruption disque (21-23 juillet 2026)

*La phase la plus éprouvante et la plus formatrice.*

**Déclencheur.** Lundi 21 au matin : `Out of memory: Killed process (fwupd)` sur le VPS d'origine (512 Mo). Derrière ce symptôme, l'authentification entière du serveur s'est retrouvée cassée — mot de passe root, SSH, Web Console, Recovery Console, tout refusait.

**Le diagnostic, couche par couche.** Près de deux jours d'élimination méthodique : configuration SSH (deux fichiers `sshd_config.d/` désactivant `PasswordAuthentication`, corrigés), `PermitRootLogin`, verrouillage de compte, PAM/`faillock`, resets de mot de passe répétés qui ne "prenaient" jamais. Chaque couche éliminée resserrait l'étau.

**La vraie cause.** En tentant de neutraliser cloud-init (suspecté de réinitialiser le mot de passe à chaque boot), un `touch` réussissant silencieusement (exit 0) mais suivi d'un fichier illisible a révélé une **corruption des métadonnées du système de fichiers** dans `/etc/cloud/cloud.cfg.d/` — entrées `ls -la` affichant `?????????` sur toutes les métadonnées, signature d'une table d'inodes endommagée. Un `fsck` complet (5 passes, aucune erreur rapportée) n'a **pas** réparé. Le support DigitalOcean a confirmé : corruption au niveau bloc, un snapshot la reproduirait ailleurs. Seule voie : nouveau droplet, redéploiement depuis GitHub.

**La fausse piste évitée.** Avant la migration, tentative de récupération des CSV depuis l'ancien disque via chroot — dossier introuvable, moment de vraie inquiétude. La question de Benjamin — *"les CSV ne sont-ils pas d'abord sur le Mac ?"* — a rappelé l'architecture posée dès l'origine et perdue de vue sous la pression : le VPS n'a jamais été que le miroir. **Rien n'était perdu.** Cet épisode a ouvert une discussion sincère sur les différences entre mémoire humaine (structure durable, rappelée par un signal d'alerte quand "quelque chose cloche") et mémoire de l'assistant (cumulative, sans mécanisme naturel de retour sur une architecture établie) — et sur le rôle de vigie que Benjamin joue dans la collaboration.

**Reconstruction (23-24 juillet).** Nouveau droplet `BOONOtrader-VPS` (1 Go RAM, SSH par clé dès la création). Node.js, PM2, clone GitHub, `.env` reconstruit, déploiement de `config-server.js` v3 par **scp** (après l'échec instructif du collage par blocs dans la console web), patch de `cerveau-central.js` (écriture de `latest-evaluation.json`), collecte repointée, MEXC reconfirmé (même solde), résilience au redémarrage testée par un vrai `reboot` (nouveau noyau chargé, PM2 relance les deux services seul). Accès Git push configuré (clé SSH dédiée, distincte de la clé d'accès VPS) — et découverte au passage que `config-server.js` v3 n'avait **jamais été committé** : tout le travail de la semaine poussé sur GitHub avant la destruction de l'ancien serveur.

**Leçons retenues** : la résilience venait de choix faits sans en mesurer la valeur (code versionné, collecte à la source) ; le diagnostic méthodique n'est jamais du temps perdu (c'est lui qui a produit la preuve que le support a pu confirmer) ; `scp` d'emblée pour tout gros fichier ; et vérifier ce qui est committé *avant* de détruire quoi que ce soit.

---

## Phase 9 — Intégration du VWAP au code, compréhension du DBSI, et fermeture de gaps structurels (24 juillet 2026, après-midi/soir)

Suite directe de la découverte du VWAP (Phase 8), cette phase traduit la compréhension conceptuelle en code réel, et ferme plusieurs gaps de conception restés en jachère depuis des semaines.

**VWAP en code.** `analyzeMomentum` corrigé pour mesurer LBW seul (vélocité/amplitude immédiate), abandonnant la moyenne `|BW|+|LBW|` qui noyait le signal de convergence. Nouvelle fonction `analyzeVwap()` : calcule `LBW-BW`, détecte la traversée de zéro entre deux bougies consécutives, mesure l'amplitude de cette traversée (force du retournement). Seuils provisoires dans `config.json` (`scoring.vwap`), à calibrer par observation. Jeton `VWAP` ajouté au composeur Scenario ; fonctionnement confirmé en conditions réelles.

**DBSI élucidé par sniff live + comparaison visuelle.** Le tableau `v[]` de la série DBSI confirme `v[1]`=MA200 (cohérent avec la découverte du 20/07) mais `v[3]` à `v[6]` restent à zéro — confirmant que `dbsi_top`/`dbsi_bottom` proviennent bien des labels graphiques Pine, pas de ce tableau numérique. Comparaison chiffre-pour-chiffre entre les données CSV et une capture d'écran TradingView confirme le mapping (`dbsi_top` = chiffre rouge, `dbsi_bottom` = chiffre vert) et révèle un motif clair : chaque colonne agit comme un **compteur de pression directionnelle** (haussière pour l'un, baissière pour l'autre), montant tant que sa direction domine, sans plancher fixe malgré une apparence de plateau à -5 sur des fenêtres courtes. Utilisation dans un score : remise à plus tard, en attendant observation.

**Cadence exposée comme condition.** `analyzeTrigger()` calculait déjà une cadence (ticks/seconde sur les 200 derniers ticks) sans l'exposer comme score utilisable. Ajout de `cadenceScore` (seuils provisoires dans `config.json`), jeton `Cadence` dans le composeur Scenario — délibérément placé en dernière position, cohérent avec son rôle de filtre de contexte plutôt que de signal de décision.

**MA/Tendance enfin branché.** Resté un TODO explicite depuis des semaines (`evalMaTrend` retournait toujours `null`), ce filtre de direction est branché non pas sur la MA200 mais sur la **coherence** et le **cadenceScore** déjà calculés par `analyzeTrigger()` — une décision délibérée de Benjamin. Logique : coherence et cadence suffisamment hautes (seuils provisoires 0.75/3) → direction déterminée par le sens majoritaire des 4 tranches de prix du Trigger (haussier/baissier) ; sinon → neutre. Confirmé fonctionnel en conditions réelles et dans l'interface.

**Fallback DBSI sur bougie clôturée.** Observation en direct : le DBSI se recalcule en continu tant qu'une bougie reste ouverte, laissant `dbsi_top`/`dbsi_bottom` vides dans le CSV jusqu'à clôture — bloquant `analyzeDbsi` (et donc les modules DAY/SWING) pendant toute la durée de la bougie en cours (jusqu'à plusieurs heures sur 4h/1D). Corrigé : la fonction remonte désormais jusqu'à la dernière bougie clôturée avec un DBSI valide, avec un marqueur `stale`/`staleCandles` pour la traçabilité.

**Ergonomie interface.** Fiche Fibonacci tap-friendly ajoutée (bouton "i" sur le bloc fib0/fib1, affichant 0/0.382/0.618/0.65/1 calculés) — jugée non pertinente pour Range (VAH/POC/VAL sont des valeurs fixées, pas dérivées d'une formule). Nouveaux réglages VWAP/Cadence/MA-Tendance exposés dans l'onglet PARAMETRES.

**Discussion de fond, non codée** : gestion de trade pilotée par la force du retournement VWAP (zones proche-de-zéro / traversée faible / traversée forte → TP1/TP2/liquidation/shlong selon le cas), fenêtre de chat consultative avec un LLM tiers (DeepSeek V4 Flash retenu comme premier choix pour son coût négligeable à l'usage envisagé, ~1h/jour), esquisse d'un glossaire de grammaire conditionnelle (`SI`/`SINON SI`/`SINON`, `:`=ET, `OU`, actions `ENTRER_LONG`/`TP1`/`TP2`/`LIQUIDER`/`SHLONG`/`ATTENDRE`) — laissée en réflexion par Benjamin avant finalisation.

---

## État au soir du 24 juillet 2026 — fin de la phase de construction

Infrastructure stable sur `BOONOtrader-VPS`, résiliente au redémarrage, collecte opérationnelle, MEXC authentifié, code versionné avec push fonctionnel. Interface cinq onglets en production, Diagnostic affichant les vrais scores en direct, incluant désormais VWAP, Cadence et MA/Tendance.

La phase de construction de l'infrastructure et des signaux est considérée comme substantiellement close. Benjamin propose de clore ici cette phase et de poursuivre dans une nouvelle conversation dédiée au rodage des seuils et au paper trading, celle-ci étant devenue longue.

**Blocage structurel prioritaire pour la suite** : `rangeSR` reste à 0 sur les trois modules depuis le 20 juillet, faute d'interface S/R construite — ce score conditionne une bonne partie de la décision finale (SWING est explicitement bloqué par lui : `rangeSR=0 < 25`). C'est le vrai goulot d'étranglement avant tout dry run, plus prioritaire que la grammaire de scénario ou le chatbot.

**Chantiers ouverts, par priorité pour la prochaine conversation :**
1. **Interface S/R → débloquer `rangeSR`** → seul vrai blocage empêchant tout trade de passer un seuil, quel que soit le module
2. Logique d'exécution de trade (TP1/TP2/stop loss pilotés par le VWAP) — discutée en détail, pas codée
3. Code de passage d'ordre, au moins simulé pour le paper trading (rien n'existe encore au-delà de la lecture de solde)
4. Calibration des seuils provisoires (VWAP, Cadence, MA/Tendance) par observation réelle
5. Grammaire IF/SINON SI/SINON/OU dans le composeur Scenario, glossaire associé
6. Fenêtre de chat consultative (DeepSeek V4 Flash pressenti)
7. Script de déploiement automatisé (`deploy.sh`)
8. Sauvegardes régulières des CSV hors VPS
9. Révision sécurité (mots de passe réutilisés sous pression, clés passées par le chat, rotation)
10. **Dry run #2, puis paper trading** — objectifs suivants, une fois le point 1 stabilisé

---

## Phase 10 — Persistance, chatbot consultatif, et déblocage de rangeSR (25 juillet 2026, matin)

Trois chantiers identifiés comme prioritaires la veille au soir, tous complétés en une matinée.

**Le gap de persistance corrigé.** Diagnostic confirmé : `entries` (niveaux NIVEAUX/fib/range) et `scenarios` ne vivaient qu'en mémoire JavaScript du navigateur — aucune route serveur, aucun fichier, aucun `localStorage`. Corrigé par l'ajout de routes `GET`/`POST /api/levels` et `/api/scenarios` (même modèle que `/api/config` existant), écrivant dans `data/levels.json` et `data/scenarios.json`. Côté client : `saveLevels()`/`saveScenarios()` appelées en tête de `renderLedger()`/`renderScenarios()` (point de passage systématique après chaque mutation), et `loadLevels()`/`loadScenarios()` appelées au chargement de la page — un point d'initialisation qui n'existait tout simplement pas avant (le placeholder "Aucun niveau soumis" était du HTML statique). Testé avec succès en cross-device (scénario créé sur téléphone, visible immédiatement sur iMac).

**Chatbot consultatif DeepSeek, avec tool calling.** Bouton flottant 💬 (bas-droite, visible sur les 5 onglets), panneau de chat plein écran mobile. Route serveur `/api/chat` injectant le contexte (dernier `latest-evaluation.json` + bougies 15m/4h) et appelant l'API DeepSeek (modèle `deepseek-v4-flash` — noms corrects après une première tentative sur `deepseek-chat`, rejeté). Fenêtre de contexte passée de 20 à 100 bougies à la demande de Benjamin. Capacité de consultation à la demande ajoutée : un outil `lire_bougies(timeframe, debut, fin)` que le modèle peut appeler pour lire une plage précise du CSV hors de la fenêtre par défaut (un seul aller-retour d'outil géré, pas de boucle récursive). Testé avec succès sur une vraie question portant sur la cascade du 24/07 — le modèle a correctement converti l'heure française en UTC et appelé l'outil pour obtenir les bonnes bougies.

Vigilance de rigueur confirmée à l'usage : le modèle a une fois inversé le sens du DBSI (prétendant qu'un `dbsi_top` élevé signalait une tendance haussière sous-jacente, alors qu'on avait établi la veille l'inverse), et a hallucine une échelle sur 10 pour des scores qui sont en réalité sur 1-5. Les chiffres bruts qu'il cite (prix, valeurs CSV, timestamps) restent fiables ; ses interprétations causales ne le sont pas systématiquement. Benjamin : un point de départ pour la réflexion, jamais une exécution automatique — cohérent avec la décision de garder l'outil strictement consultatif.

**rangeSR débloqué — le vrai goulot d'étranglement identifié la veille.** Clarification préalable importante : `rangeSR` n'était pas cassé — `sr-detector.js` (écrit le 20/07) calculait bien un score réel, mais **uniquement à partir de la MA200**, jamais des niveaux soumis via l'interface. `points.non = 0` est une valeur légitime du barème (prix hors de toute zone), pas un signe de panne — la confusion de la veille venait de là.

Décision de Benjamin : niveaux fixes et MA200 sont deux sources indépendantes du même score (`tolerancePercent` 0,39% pour les niveaux, `ma200TolerancePercent` 0,1% pour la MA200 — déjà présents séparément dans `config.json` depuis le 20/07, jamais branchés ensemble). La **confluence** (25 points, seuil bloquant du swing) est définie comme : un niveau S/R soumis touché/retesté **et** un scénario actif du même module référençant ce niveau — pas niveau+MA200.

Implémenté dans `sr-detector.js` :
- `scoreFixedLevels(mainTimeframe)` : lit `data/levels.json`, réutilise `detectTouchRetest` en substituant le prix fixe de chaque niveau à la MA200 mobile (même machine à états, élégamment réutilisée sans duplication), retourne le meilleur statut trouvé parmi tous les niveaux soumis
- `evaluateScenario`/`parseCondition`/`getConditionValue` : évaluateur **minimal**, conditions `ET` uniquement, opérateur explicite obligatoire (`>=`,`<=`,`>`,`<`,`=`), tokens Momentum/MoneyFlow/DBSI/VWAP/Trigger/Cadence seulement — **DIV/S-R/MA200/SCORE délibérément exclus** pour éviter toute circularité avec le calcul de `rangeSR` lui-même. Pas de `OU`, pas d'actions : la grammaire complète SI/SINON/OU/actions reste un chantier à part
- `scoreRangeSR(module, mainTf, volByTf)` : confluence (25 pts) si niveau touché/retesté ET scénario du même module avec `levelLabel` correspondant dont toutes les conditions sont vraies ; sinon meilleur des deux résultats (MA200 vs niveaux fixes) → 10/15/0
- `cerveau-central.js` : `volByTf` (déjà calculé pour les scores de volume) transmis à `scoreRangeSR`, seul ajustement nécessaire côté appelant

Tests unitaires concluants avant intégration : `detectTouchRetest` sur un prix fabriqué proche du niveau DS (65700) → `touche_simple` correctement détecté ; `scoreFixedLevels` sur données réelles → `hors_zone` correctement renvoyé (prix réel ~64000, loin de tous les niveaux soumis) ; `parseCondition("VWAP 2")` → `null` (le scénario de test de Benjamin, tapé sans opérateur "sans réfléchir" la veille, reste invalide/ignoré comme prévu) ; `parseCondition("VWAP>=2")` → correctement parsé. Le `rangeSR=0` observé dans les logs en conditions réelles est un résultat honnête (prix loin de tous les niveaux), pas un signe de défaillance.

---

## État en fin de matinée du 25 juillet 2026 — prêt pour le dry run #2

Les trois chantiers prioritaires identifiés la veille sont complétés : persistance des niveaux/scénarios, chatbot consultatif fonctionnel, et surtout le déblocage réel de `rangeSR` (calcul niveaux fixes + MA200 + confluence, plus figé à zéro par construction).

**Ce qui reste, par priorité, avant ou pendant le dry run #2 :**
1. **Observer le comportement réel de `rangeSR`/confluence** sur plusieurs cycles — aucun scénario valide n'est actuellement actif (celui de test avait une syntaxe invalide sans opérateur), donc la branche confluence n'a pas encore été vue se déclencher en conditions réelles
2. Logique d'exécution de trade (TP1/TP2/stop loss pilotés par le VWAP) — discutée en détail le 24/07, jamais codée
3. Code de passage d'ordre, au moins simulé — rien n'existe au-delà de la lecture de solde (`test-mexc-auth.js`)
4. Calibration de tous les seuils provisoires (VWAP, Cadence, MA/Tendance, tolérances S/R) par observation réelle plutôt que par intuition
5. Grammaire complète SI/SINON SI/SINON/OU + actions (ENTRER_LONG/TP1/TP2/LIQUIDER/SHLONG/ATTENDRE) — la version minimale d'aujourd'hui ne gère que des conditions ET pour la confluence, pas la grammaire déclarative complète que Benjamin envisage pour piloter des décisions
6. Glossaire de cette grammaire, sur fiche accessible par bouton info (esquissé, pas encore mis en interface)
7. Script de déploiement automatisé, sauvegardes CSV hors VPS, révision sécurité — inchangés depuis la veille
