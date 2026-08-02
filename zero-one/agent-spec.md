# Agent Spec — Bot Trading Boono
Version: 2.0
Date: 2 août 2026 (v1.1 : 12–16 juillet 2026, traduite de SOP v1.1)

---

## Comment lire ce document

Il se divise en deux parties qui ne décrivent **pas le même système** :

- **PARTIE I — LE BOT (ACTIF)** : ce qui tourne réellement sur le VPS. Un
  programme JavaScript déterministe, sans LLM dans la boucle de décision.
- **PARTIE II — L'AGENT (INTENTION)** : la vision d'un agent LLM qui traderait.
  Non construit. Conservé pour ne pas perdre la cible.

La v1.1 mélangeait les deux et décrivait un agent inexistant comme s'il
opérait : score recalculé toutes les 5 minutes, brief quotidien à 9h, journal
dans `~/zero-one/memory/trade-log.md`. Aucun de ces éléments n'existe.

**Ordre d'autorité :** `config.json` > `knowledge/strategy-boono.md` > ce
document. Un chiffre écrit ici qui contredit `config.json` est de la
documentation en retard, pas une règle.

---
---

# PARTIE I — LE BOT (ACTIF)

## Objet

Surveiller BTC/USDT en continu, détecter les déséquilibres de liquidité, et
simuler des entrées/sorties en paper trading. **Aucun ordre réel n'est soumis.**

## Processus

Trois processus PM2, redémarrage automatique au boot activé (`pm2 startup` +
`pm2 save`, 02/08) :

| Processus | Cycle | Rôle |
|---|---|---|
| `baton-relay.js` | 30 s | WebSocket MEXC, chaîne de décision, historique 24h |
| `cerveau-central.js` | 30 s | Lecture CSV, scoring, appel du simulateur |
| `config-server.js` | — | Dashboard web port 80, `/audit-view` |

## Prérequis de fonctionnement

- CSV dans `/root/agents-ia-zero-one/data/mcb-live/` (mcb_3m, mcb_15m, mcb_1h,
  mcb_4h, mcb_1d, mcb_1w), synchronisés depuis l'iMac
- WebSocket `wss://contract.mexc.com/edge` connecté (reconnexion automatique :
  sur `close`, plus détection de connexion zombie par absence de message)
- `zero-one/data/` accessible en écriture

Si les CSV cessent d'être alimentés, le bâton continue de fonctionner (il tire
ses données du WebSocket, pas des CSV) mais le VWAP et le scoring se figent.

## Entrée — la chaîne du bâton de relais

1. **ÉVÉNEMENT** — cadence de ticks ≥ 2× sa moyenne glissante 4h
2. **VIGILANCE** — état persistant, relayé de bâton en bâton
3. **RÉACTION PRIX** — seule juge de la direction :
   `|netMove| ≥ 0,06 %` immédiat, ou `≥ 0,03 %` confirmé sur 2 bâtons
4. **ENTRÉE** via `lastAction`, consommée une seule fois par module

**Le portail de confluence est désactivé** (`requiresConfluence: false` depuis
le 29/07). Le scoring tourne et s'affiche mais ne conditionne pas l'entrée.

**Un seul module prend position : day** (`activeModules: ["day"]` depuis le
02/08). Avant cela, les trois ouvraient la même position — exposition réelle
3 % au lieu de 1 %.

## Sorties — cinq mécanismes

**1. Progression des tranches 25/65/10.** Trois déclencheurs indépendants,
comptés une fois par occurrence réelle : événement de cadence, passage à zéro
du VWAP (timeframe `vwapTriggerTimeframe`, actuellement 15m), seuil netMove.

Filtre directionnel : un déclencheur est **ignoré** si la position est en perte
au-delà de `ADVERSE_TOLERANCE_PCT` (0,02 %). Sans ce filtre, un pic de cadence
survenant pendant un mouvement adverse fermait la tranche au pire prix.

Le Shlong complet (coexistence long+short) n'est **pas** implémenté : le résidu
de 10 % est simplement fermé au 3ᵉ déclencheur.

**2. Invalidation.** La position meurt quand le scénario d'entrée n'existe
plus — flux inversé (`displacementPct` contraire, confirmé sur 2 cycles) ou
flux éteint. Ce n'est pas un stop-loss : aucun niveau de perte n'intervient.

**3. Liquidation par levier.** À 50x, ±2 % depuis l'entrée. Suivie tick par
tick via `priceHighSinceEntry` / `priceLowSinceEntry`.

**4. Timeout anti-zombie.** Garde-fou d'urgence du 30/07 : scalp 20 min, day
90 min, swing 240 min. Conservé le temps de valider l'invalidation.

**5. Coupe-circuit.** PNL cumulé ≤ −25 % → nouvelles entrées bloquées. Ne se
réarme jamais seul.

**6. Blackout programmé.** Fenêtres où le bot n'ouvre rien et ferme
préventivement les positions ouvertes. Actives : 4 et 5 août, 08:45–11:15 UTC.

## Sorties de données

| Quoi | Où |
|---|---|
| État courant du bâton | `zero-one/data/baton-state.json` |
| Historique 24h glissantes | `zero-one/data/audit-history.json` |
| Positions ouvertes | `zero-one/data/trade-sim-state.json` |
| Historique des trades | `zero-one/data/trade-sim-history.json` |
| Dernière évaluation | `zero-one/data/latest-evaluation.json` |
| Logs des processus | `/root/.pm2/logs/*-{out,error}.log` |

Le dossier `logs/` décrit en v1.1 **n'existe pas**. `memory/session-notes.md`
existe mais n'est plus alimenté depuis le 23 juillet.

## Gestion des erreurs — comportement réel

- **WebSocket coupé** → reconnexion automatique. Les positions ouvertes restent
  gérées, mais `displacementPct` devient indisponible ~5 min le temps que le
  buffer se remplisse : l'invalidation ne peut pas agir pendant ce délai.
- **CSV figés** → le bâton continue, le VWAP et le scoring se figent. Aucune
  alerte automatique n'est configurée (voir Points ouverts).
- **Redémarrage du VPS** → PM2 relance les trois processus. Les positions
  survivent (état persisté sur disque), les buffers mémoire sont perdus.

## Paramètres actifs — voir `config.json`

Les valeurs ne sont **pas** recopiées ici pour éviter la divergence. Sections
concernées : `tradeSimulator` (activeModules, invalidation, blackoutWindows,
maxHoldMinutesWithoutTp1, vwapTriggerTimeframe), `positionSizing`, `scoring`,
`timeframes`.

Constantes en dur dans le code (à externaliser un jour) : levier 50x
(`ORDER_DEFAULTS`), `ADVERSE_TOLERANCE_PCT` 0,02 %, seuils netMove 0,06/0,03 %,
`EVENT_MULTIPLIER` 2×, `CADENCE_SANITY_CEILING` 120.

---
---

# PARTIE II — L'AGENT LLM (INTENTION)

Non construit. Cette partie décrit la cible, pas un système en fonctionnement.

## Rôle envisagé

Lire les signaux, appliquer le portail de confluence, décider des entrées et
sorties, animer un brief quotidien copiloté à 9h, produire un rapport de fin de
journée.

## Prérequis avant construction

1. Un bot déterministe calibré — référence stable de comparaison
2. Le portail de confluence reconnecté
3. Une infrastructure de journalisation qui existe réellement
4. Des règles claires sur ce que l'agent décide seul vs ce qui exige validation
5. L'erreur MEXC 602 résolue, si des ordres réels sont dans le périmètre

## Brief quotidien — conception conservée

**Phase 1 — Revue des positions (15–20 min).** Suspendre le scalp. Présenter
les positions et leur statut vs TP1. Demander à Benjamin : liquider les scalps
au-delà de TP1, ou tenir ? Attendre sa décision. Lire le rapport de la veille,
résumer gains et pertes.

**Phase 2 — TA manuelle (20–40 min).** Énoncer les niveaux surveillés. Entrer
en mode aveugle : ne pas agir sur le mouvement de prix pendant cette phase.
Attendre que Benjamin soumette ses niveaux S/R via le formulaire, syntaxe
`DS"prix"`, `WR"prix"`, `MR"prix"`, `fib0"prix"` / `fib1"prix"`.

**Phase 3 — Scénarios et reprise (10–15 min).** Attendre la commande `REBOOT`.
Lire le document S/R soumis, commenter les niveaux, identifier les confluences
entre timeframes. Construire les scénarios avec la syntaxe conditionnelle
établie. Reprendre l'autonomie complète 30–60 min après le début de la Phase 1.

## Règles qui s'appliqueraient à l'agent

- Ne jamais soumettre un ordre réel tant que l'erreur 602 n'est pas résolue —
  simuler, journaliser, signaler
- Score incohérent ou composant manquant → s'arrêter et exiger la confirmation
  explicite de Benjamin. Ne jamais deviner.
- Ne jamais entrer en Phase 3 avant la commande `REBOOT`
- En Phase 2 (mode aveugle), ne pas agir sur le prix quoi que disent les données
- En cas de conflit entre deux règles, toujours privilégier la protection du
  capital
- Signaler explicitement dans les logs toute décision reposant sur un paramètre
  non calibré, plutôt que de la présenter comme validée

---
---

# Points ouverts

**Résolu depuis la v1.1 :**
- ~~Persistance PM2~~ — `pm2 startup` + `pm2 save` faits le 02/08
- ~~Structure 25/50/25~~ — c'est 25/65/10, et le rôle des 10 % est clarifié
  (assurance de bascule, pas pari sur la fin du mouvement)
- ~~Erreur MEXC 602 bloquante~~ — contournée : le flux public ne demande aucune
  authentification. Reste un prérequis du passage en live, pas un blocage actuel.

**Toujours ouvert :**
- **Seuils de confluence** — non calibrés, portail désactivé
- **Formulaire S/R cliquable** — non construit
- **Rapport de fin de journée** — non codé
- **Alertes SMS** — aucun fournisseur choisi. Conséquence concrète : aucune
  alerte n'existe si les CSV se figent ou si un processus meurt.
- **Levier différencié par module** — 50x uniforme, incompatible avec le swing.
  Attention : sous ~25x, la liquidation devient inatteignable sur ces échelles
  de temps et cesse d'être un filet.
- **Journal de trade détaillé** — `trade-sim-history.json` enregistre le motif
  de sortie et le PNL, mais pas le détail du score au moment de l'entrée. Sans
  cela, impossible de rejouer a posteriori ce qu'un seuil plus strict aurait
  donné. Condition impérative de la méthode de calibration.

**Préoccupation structurelle conservée de la v1.1 :** fermer 25 % au premier
palier rapporte mécaniquement moins en valeur absolue que la tranche finale si
celle-ci se déclenche après un mouvement plus large. Les *tailles* de tranches
mériteraient d'être repondérées selon l'espérance par palier, pas seulement les
seuils de déclenchement. À examiner en paper trading.

---

Save this to: `~/zero-one/agent-spec.md`
(VPS: `/root/agents-ia-zero-one/zero-one/agent-spec.md`)
