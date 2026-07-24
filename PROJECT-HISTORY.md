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

## Phase 8 — La découverte du VWAP (23-24 juillet 2026)

Le principe validé avec la MA200 — *une donnée peut dormir dans un flux qu'on capture déjà* — se reproduit, en plus fort.

**L'observation.** Benjamin repère sur le 15m que l'écart entre Lt Blue Wave et Blue Wave se resserre systématiquement vers zéro aux retournements — une chaîne intelligible : écart qui s'amenuise → signal vendeur → signal acheteur avec divergence confirmée sur rebond MA200.

**La vérification.** Calcul sur 105 bougies : tendance cohérente mais valeurs discordantes avec la lecture d'écran — jusqu'à l'identification d'un **décalage de fuseau** (CSV en UTC, écran en heure française). Retest sur trois bougies consécutives correctement alignées : `LBW − BW` correspond aux valeurs affichées sous l'étiquette "VWAP" par MarketCipher **à moins de 0,05 près sur chacune**. Confirmation chiffre pour chiffre.

**L'interprétation.** LBW (WT1) porte la vélocité/amplitude immédiate ; BW (WT2, moyenne lissée de LBW) porte l'engagement soutenu ; leur écart capture le moment précis où l'engagement rattrape la vélocité — la bascule. Le "VWAP" de MCB n'est probablement pas un VWAP classique mais une valeur dérivée interne de leur agrégation — peu importe : sa valeur prédictive est confirmée par l'observation, et il est entièrement calculable depuis des colonnes capturées depuis l'origine.

**Décisions.** Suivre la paire **LBW + VWAP** plutôt que LBW + BW (la moyenne actuelle du Momentum noyait le signal de convergence). Pour le scalp (3m) : utiliser le **VWAP du 15m** comme signal d'entrée — filtre naturel du bruit, le VWAP 15m ne traversant zéro qu'après un mouvement réellement soutenu. Un filtre d'amplitude en dollars (vague = high/low entre deux traversées de zéro, ~150-200$ observés actuellement) reste **en réserve**, à ajouter seulement si le paper trading montre des faux départs — décision explicite de ne pas empiler de complexité non justifiée par l'observation ("pas de Tour de Babel").

---

## État au 24 juillet 2026

Infrastructure stable sur `BOONOtrader-VPS`, résiliente au redémarrage, collecte opérationnelle, MEXC authentifié, code versionné avec push fonctionnel. Interface cinq onglets en production, Diagnostic affichant les vrais scores en direct.

**Chantiers ouverts, par priorité :**
1. Calcul VWAP dans `volume-analyzer.js`, exposition comme condition de scénario (métrique 15m pour le scalp)
2. Grammaire IF/SINON SI/SINON dans le composeur Scenario
3. Interface S/R → débloquer le score `rangeSR` → évaluation paper trading complète
4. Script de déploiement automatisé (`deploy.sh`) — une future reconstruction en minutes, pas en heures
5. Sauvegardes régulières des CSV hors VPS
6. Révision sécurité (mots de passe réutilisés sous pression, clés passées par le chat, rotation)
7. Ménage : supprimer la clé MEXC obsolète `Api_clo_clo` ; documenter les trous de données du 21-22/07 ; l'hypothèse v[15]/v[16] est peut-être résolue par la découverte VWAP (à vérifier)
8. **Paper trading** — l'objectif suivant, une fois les chantiers 1-3 stabilisés
