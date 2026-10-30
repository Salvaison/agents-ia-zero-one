# BOONOLAB — Audit14D et laboratoire V4.9.4 à deux modules Entrée / Sortie

**30 octobre 2026 — chantier OD-20261030-004.** [Demande utilisateur complète](operational-decisions/OD-20261030-004/01-demande-utilisateur-integrale.txt) · [Origine des choix](operational-decisions/OD-20261030-004/03-origine-et-justification.md).

**Mandat :** conserver les observations Audit complètes 14 jours glissants sans alourdir BOONO Watch ; monter deux modules shadow pour **V4.9.4**, mesurer leur influence réciproque sur les campagnes et réentrées, **ne modifier aucun moteur actif PAPER**. Les notions validé/implémenté/testé/mis en service restent séparées.

## 1. Archivage froid Audit14D — en service

| Élément | Implémentation |
|---|---|
| Donnée source | `data/audit-history.json` : toutes les colonnes d'**observation Audit** du Bâton, normalement ~30 s, pas tous les ticks OKX |
| Rétention | **14×24 heures**, purge de fichiers horaires anciens et de la partie échue de l'heure limite ; une observation peut être conservée au plus 120 s supplémentaires avant passage du prochain cycle |
| Archivage | `scripts/boono-audit-14d.py`, PM2 **boono-audit-14d**, toutes les **120 secondes**, travail séparé |
| Stockage | `data/audit-14d/audit-YYYYMMDDTHH.ndjson[.gz]` avec UTC, objets complets JSON, **aucune agrégation/renonciation à des colonnes** |
| Compression | Gzip pour chaque heure terminée ; heure courante append NDJSON |
| Métadonnées | `data/audit-14d/status.json` : curseur, compte cumulatif, âge source, heures et lacunes détectées |
| Robustesse | Timestamps triés, déduplication du même relevé source, reprise idempotente si arrêt après append, refus de schéma/version incorrecte, fichiers temporaires et renommages atomiques |
| UI | **AUCUNE route supplémentaire**, aucun nouveau payload, aucun rafraîchissement BOONO Watch, aucune modification de `baton-relay.js` |
| Fichiers existants | `data/audit-history.json` continue d'être la source glissante d'interface ; le script historique `archive-audit.sh` et les anciens `data/archives/audit-*.gz` ne sont ni écrasés ni utilisés comme writer concurrent |

**Bootstrap réellement effectué le 30/10 :** lecture du snapshot de la précédente enquête plus l'historique source contemporain ; **2 985 observations initiales**, **26 shards horaires**, **55 champs sur le relevé de référence**, **aucun trou de temps détecté** dans la première plage reconstituable. Une vérification peu après a constaté plus de **3 005 observations** et la progression du curseur.

**Limite :** aucune archive quotidienne complète n'avait été retrouvée du 23 septembre au 28 octobre ; l'archivage 14 jours construit les données à partir de la date de relance et ne peut réinventer ces jours. Le détail d'une position n'est pas un flux OKX tick par tick ; seuls les relevés Audit source complets sont conservés.

Commandes d'audit depuis la racine du dépôt :
```bash
python3 zero-one/scripts/boono-audit-14d.py --verify
cat zero-one/data/audit-14d/status.json
pm2 status boono-audit-14d
```

Test de performance architectural : nouveau processus isolé PM2 avec ~20–23 MiB de RAM observés, CPU quasi nul hors réveil de lecture toutes les 120 s ; aucun module serveur UI ne lit `audit-14d/`. Surveiller RAM, write amplification, intégrité gzip et trous de source. Les gains de coût exacts au bout de 14 jours restent à mesurer.

## 2. Deux modules réellement séparés, comparateur V4 intact

**Moteur de référence :** `/root/boono-v493-baseline/zero-one/modules/v4/core/engine.js`, V4.9.3 figée `cdf1936` utilisée par le PAPER V4.9.4. Aucune version active V4.10.x réintroduite.

**EntryEvaluator** — `modules/attention/v494-entry-module-shadow.js` :
- `EXACT_V493` : admission à l'identique de la proposition originale du vrai V4.9.3 évalué en situation de portefeuille shadow.
- `MCB15_INFLECTION` : candidat déjà autorisé par V4.9.3 seulement ; filtre de recherche demandant LONG dans lobe `CREUX` avec extrême LBW15 ≤−45, SHORT dans `CRETE` avec LBW15 ≥+45. **45 est un seuil exploratoire, non validé**. N'invente jamais une entrée opposée ni ne transforme un signal E3 en vote stratégique.

**PositionSupervisor** — `modules/attention/v494-exit-module-shadow.js` :
- `FROZEN_V493` : mêmes sorties (TP1 de 25 %, sortie MCB/native et hard-risk −500 BTC) que le moteur gelé.
- `CONTINUATION_SUPERVISOR` : respecte les sorties de V493 et son TP1, **n'ajoute une sortie qu'en cas de preuves concordantes de non-continuation** : perte matérielle de l'invalidation initiale V5-like sur clôture 3m réellement confirmée, conversion prix adverse productive et MF3 adverse, avec corroboration supplémentaire si MCB15 reste aligné ; ou dégradation très importante sans ancre soutenue par PM/MF3/MF15 ; ou grand MFE restitué avec conversion et MF adverses. Ne ferme pas sur E3 seul, mèche seule, simple attention ou simple contact Fibonacci. **Les seuils d'expérience ne sont pas des règles approuvées pour V4.**
- L'ancre initiale utilisée est évaluée en shadow au moment de l'entrée via `v53-causal.mapPlace`, avec prix et bougies confirmées à cet instant ; ce n'est **pas** une invalidation historiquement calculée par V4.

### Matrice factorielle 2 × 2

| Branche | Entrée | Sortie | Hypothèse isolée |
|---|---|---|---|
| **A — Référence** | V493 exacte | V493 exacte | Reproduire au mieux le comparateur actuel |
| **B — Sortie seule** | V493 exacte | Superviseur de continuation | Effet de modifier la sortie **à admission comparable** |
| **C — Entrée seule** | Filtre inflexion MCB15 | V493 exacte | Effet des candidats sélectifs **à sortie comparable** |
| **D — Interaction** | Filtre inflexion MCB15 | Superviseur de continuation | Interaction des choix entrée et sortie |

**Contrat de position gelé vérifié :** chaque portefeuille fournit au moteur V493 original les champs de position utilisés par le PAPER V494 (horodatage entrée, setup, metrics MFE/MAE/PNL, notionnel et TP1). Une évaluation directe en lecture seule du vrai moteur V493 avec une position shadow reconstituée a retourné HOLD sans erreur. Une migration additive préserve les états existants.

Chaque branche possède son **propre état de campagne et de décision V493**, `prevEval`, mémoire d'attention, position, frais, TP1, PNL, MFE/MAE, historique, nombre d'entrées filtrées et résultats LONG/SHORT. Après une sortie anticipée dans B/D, le moteur gelé est réévalué en **FLAT uniquement dans cette branche** : si une nouvelle candidature est ensuite autorisée, elle peut ouvrir alors que la branche A/C garde encore sa position. Inversement, une entrée sélective bloquée peut changer les futures occasions.

`EXIT_INFLUENCES_ENTRY_EXPOSURE` et `ENTRY_FILTER_INFLUENCES_EXPOSURE` sont enregistrés lorsque les portefeuilles divergent. Une entrée post-sortie conserve sa précédente sortie et l'horodatage ; le labo pourra comparer P&L net, réentrées, temps d'exposition et opportunités bloquées **par campagne**, pas seulement par trade. Les résultats contrefactuels diffèrent des entrées/sorties historiques et **ne peuvent pas être comparés en naïve liste de trades par numéro**.

**Pas de propagation mutuelle d'une direction :** le module Sortie n'a pas le droit de créer un LONG/SHORT. Le module Entrée ne peut pas fermer une position : il peut seulement la proposer lorsqu'une branche est FLAT.

## 3. État réellement actif et mesures

Processus indépendant **PM2 `boono-v494-entry-exit-shadow`**, source `modules/attention/v494-dual-module-shadow-runner.js`, cadence ~30 s, décalage de 12 s pour éviter le travail simultané exact avec le moteur réel. Lecture de `buildRuntimeSnapshot()` as-of et du code V493 gelé ; un seul snapshot pour quatre décisions indépendantes. **Aucun import broker et aucun changement de V494/V543.**

`data/v494-dual-module-shadow-state.json` conserve quatre mémoires causales ; `data/v494-dual-module-shadow-summary.json` est un résumé compact de statistiques ; `data/v494-dual-module-shadow-events.ndjson` conserve événements et divergences (rotation). Lecture humaine à la demande via `node zero-one/scripts/boono-v494-dual-shadow-report.js` : quatre performances, nombre de trades et nouvelles entrées, LONG/SHORT, effet descriptif B−A, D−C, C−A, D−B et contraste des interactions, sans calcul envoyé à l’UI. **Ces trois fichiers restent privés, non intégrés à BOONO Watch**. État incompatible : refus d'un reset silencieux ; migration des champs de statistiques sans réécrire les positions.

À la mise en place, chaque branche démarre sans position rétroactive, avec échauffement de 3 minutes. Si le V494 réel est FLAT, sa mémoire causale gelée et sa mémoire temporelle peuvent être copiées initialement, en snapshots indépendants et sans transaction. `originalComparison` indique si la branche A ressemble au V494 réel dans la même fenêtre d'observation. Une divergence de cadence/mémoire, même en A, invalide une comparaison de rentabilité à court terme : elle doit être vérifiée avant de promouvoir un changement.

Le `hard-risk -500 BTC`, nominal 1 500$, frais taker 0,05% par côté, TP1/runner de V493 sont conservés dans les portefeuilles virtuels. **Aucun ordre financé**, quatre positions simulées indépendantes, et aucune écriture `v494-paper-state.json`, `v52-paper-state.json`, fichiers de trades originaux ou config serveur.

## 4. Tests et limites / décisions ouvertes

- **Archivage : 7 tests** : champs complets, démarrage avec snapshot chevauchant, reprise/déduplication, refus de corruption, gzip, purge dans l'heure à 14 jours, détection de trous.
- **Laboratoire V494 : 10 tests directs**, complétés par **15 tests existants d'attention V494/V542 (25/25)** : candidature d'entrée inchangée, filtre LONG/SHORT, un E3/mèche n'invalide pas, une vraie contreconversion + MF peut déclencher un EXIT virtuel, les quatre ledgers se séparent causalement après une sortie, une réentrée devient disponible en B/D, frais/TP1, hard-risk, état versionné et duplicate.
- Test de lecture vraie `--test-read` depuis Amsterdam : V493 `cdf1936`, 4 branches annoncées, prix Audit as-of frais, `brokerOrdersEnabled=false`.
- Les deux nouveaux services PM2 sont actifs et sauvegardés ; le moteur V4.9.4 et le V5.4.3 PAPER étaient en ligne sans redémarrage.
- **Aucune performance prospective concluante n'existait lors de la mise en route**, car les branches commencent FLAT. Ne pas attribuer aux branches les trades #40/#43/#47/#49 historiques, ni assimiler état d'attention à autorité de sortie.

**Points ouverts (ordre recommandé) :** mesurer la qualité de réplication A vs V494 réel à timestamps similaires, puis les divergences B/A et D/C, valoriser les entrées rendues possibles ou empêchées par les sorties, suivre la captation MFE et le PNL complet par campagne ; tester les trades contraires et les respirations longues, notamment LONG en creux MCB. Les métriques restent purement informatives tant que l'expérience n'est pas démontrée.

**Travaux non réalisés :** aucun nouveau mécanisme PAPER actif, pas d'affichage automatique des quatre branches dans Watch, aucun rétro-backtest complet des deux semaines (historique prospectif en cours de construction), aucun fichier BOONO-TV touché.
