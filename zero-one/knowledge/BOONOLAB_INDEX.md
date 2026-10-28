# BOONOLAB — index d'orientation et carte des sources

**28 octobre 2026 · compagnon de [BOONOLAB_START_HERE.md](../BOONOLAB_START_HERE.md).** Cette page n'est pas un second rapport général : elle indique **où chercher** la vérité pertinente, puis quelle source lire sans réimporter tout le projet dans le chat.

## 1. Entrée rapide : quelle question, quel dossier ?

| Question | Sources spécialisées utiles (liens relatifs au dépôt) |
|---|---|
| **Qu'est-ce que BOONO / ses générations ?** | [Bilan des Constitutions V1–V4](BOONO_bilan_cloture_V1_V4_2026-10-22.md) · [Passation moteur 19/10](BOONO_passation_2026-10-19.md) · [Histoire juillet](passations-sources/2026-10-28-import/PROJECT-HISTORY_240726%281%29.md) · [Passation août](passations-sources/2026-10-28-import/passation-260826%282%29.md) |
| **Quelle politique V5 ? Pourquoi cette entrée/sortie ?** | [Constitution V5.4](BOONO_V54_constitution_active_2026-10-26.md) · [Mémoire V5.4.3](BOONO_V543_maturite_offensive_causale_2026-10-27.md) · [V4.9.4/V5.4.2 et attention](BOONO_V494_V542_ecoute_selective_active_2026-10-27.md) · code [decision-v543.js](../modules/v5/decision-v543.js) et [runner-v543.js](../modules/v5/runner-v543.js) |
| **Comment les moteurs se comparent-ils ?** | [Audit comparatif du 28/10](BOONO_audit_comparatif_V543_V494_gainfloor_sorties_2026-10-28.md) · [Écoute sélective et divergence MF](passations-sources/2026-10-28-import/discussion493_542%281%29.md) · code [runner baseline V4.9.4](../modules/v5/baseline-v494-runner.js) et [mémoire d'attention](../modules/attention/attention-memory.js) |
| **Comment analysons-nous les marchés et selon quels critères jugeons-nous BOONO ?** | [Méthodes d'analyse et critères retenus](BOONOLAB_methodes_analyse_et_criteres_2026-10-28.md) · [Origine et décision OD-20261028-004](operational-decisions/OD-20261028-004/03-origine-et-justification.md) |
| **Quels seuils, conventions, verrous et veto sont réellement appliqués aujourd'hui ?** | [Enquête des conventions et verrous, 28/10](BOONOLAB_conventions_seuils_verrous_actifs_2026-10-28.md) · [Registre de décision OD-20261028-003](operational-decisions/OD-20261028-003/03-origine-et-justification.md) |
| **Que savons-nous des pertes, stops, gain-floors ?** | [Audit invalidation et méthode compacte](BOONO_protocole_recherche_compacte_invalidations_2026-10-28.md) · [Audit V5/V4 économique](BOONO_audit_comparatif_V543_V494_gainfloor_sorties_2026-10-28.md) · [Audit 43 trades](BOONO_audit_43_trades_2026-10-26.md) · [Origines des mouvements 2h](BOONO_origines_2h_et_rendement_des_camps_2026-10-26.md) |
| **Comment fonctionnent MarketCipher, E15/E3, MF, MA, conversions ?** | [MA et MF V5.3.1](BOONO_V531_MA_MF_contrats_2026-10-25.md) · [Requalification E15](BOONO_V532_E15_live_requalification_MA_price_proof_2026-10-25.md) · [Mémoire MA V5.4.1](BOONO_V541_MA_memoire_polarite_retests_2026-10-27.md) · [Maturité offensive V5.4.3](BOONO_V543_maturite_offensive_causale_2026-10-27.md) · [Elastic](elastic-v0.5-shared-measures-causal-history-2026-10-21.md) |
| **Que voit-on sur Watch / Vagues / État vivant ?** | [Mini Conversion Watch](BOONO_Watch_mini_conversion_2026-10-27.md) · [Historique et rapports à la demande](BOONO_Watch_reparation_historique_rapports_sur_demande_2026-10-27.md) · [Incident bande passante](ui-bandwidth-emergency-2026-10-22.md) · code [config-server.js](../modules/config-server.js) et [renderer partagé](../shared/boono-chart-renderer.js) |
| **Qui est le robot, comment est construit BOONO-TV ?** | [Passation TV complète 13/10](passations-sources/2026-10-28-import/BOONO-TV_passation_complete_2026-10-13%282%29.md) · [Passation TV/Watch/PRO 19/10](passations-sources/2026-10-28-import/BOONO_Systems_passation_TV_Watch_PRO_2026-10-19%283%29.md) · code [bridge TV](../boono-tv/bridge.js), [scène](../boono-tv/scene/app.js), [capture MarketCipher](../boono-tv/desk/desk-capture-daemon.js) |
| **Quelle est la vision produit (Watch, TV, PRO) ?** | [Passation conceptuelle TV/Watch/PRO](passations-sources/2026-10-28-import/BOONO_Systems_passation_TV_Watch_PRO_2026-10-19%283%29.md) · [Bilan 23/10](passations-sources/2026-10-28-import/BOONO_Systems_bilan_passation_2026-10-23%285%29.md). **Actualisation :** Watch existe en interne ; la plateforme multi-utilisateur commerciale n'est pas validée. |
| **Où sont les décisions, leur origine et le prompt exact ?** | [Registre opérationnel](operational-decisions/README.md) · [OD-20261028-001 : mémoire et prompts](operational-decisions/OD-20261028-001/03-origine-et-justification.md) · [OD-20261028-002 : passation générique](operational-decisions/OD-20261028-002/03-origine-et-justification.md) · [AGENTS.md](../../AGENTS.md) |
| **Comment reprendre l'analyse sans saturer le chat ?** | [Protocole compact](BOONO_protocole_recherche_compacte_invalidations_2026-10-28.md) · [script de synthèse/checkpoint](../scripts/boono-research-brief.py) · **sur Amsterdam seulement :** `zero-one/data/research-briefs/active-research.md` (non versionné). |

## 2. Les sources réellement vivantes

Les documents précédents donnent le *sens et l'historique*. Pour connaître l'état actuel, lire directement les ressources **sur Amsterdam**, avec horodatage :

- **PM2** : processus effectivement actifs (`boono-v543-paper`, `boono-v494-paper`, collecteurs, `config-server`, bridge et capture TV ; les noms peuvent évoluer).
- **Code décisionnel** : `zero-one/modules/v5/`, `zero-one/modules/attention/`, worktree historique `/root/boono-v493-baseline/`. L'étiquette d'une version ne remplace pas la lecture du runner déployé.
- **Ledgers PAPER** : `zero-one/data/v52-paper-trades.ndjson`, `v494-paper-trades.ndjson` et états associés ; simulation, **pas ordres de marché financés**. Ces fichiers **ne sont pas dans Git**.
- **Audit et marchés** : `zero-one/data/audit-history.json`, `v52-paper-decisions*.ndjson`, collecteurs MCB sous `/root/agents-ia-zero-one/data/mcb-live/`. Relever complétude, timezone UTC, timestamp source, date de confirmation et qualité.
- **BOONO Watch** : `zero-one/modules/config-server.js` ; pages/routes privatives; rapports de trades **à la demande**.
- **BOONO-TV** : source read-only `zero-one/boono-tv/bridge.js` sur Amsterdam ; sur **OVH** `/home/ubuntu/boono-tv-studio/runtime/boono-tv/`, scènes, `studio-server.js` et calibration vivante `desk/projection-config.json`. Ne pas restaurer par mégarde d'anciennes coordonnées. Le studio peut avoir du code/runtime différent de la copie Git.
- **Expériences** : observateurs `zero-one/modules/v5/`, `zero-one/modules/attention/`, `zero-one/tests/` et rapports `knowledge/`. Un `shadow` observe ; il ne place pas d'ordres et n'a pas d'autorité sans validation séparée.

## 3. Passations originales de l'utilisateur (import intégral)

Les **sept pièces jointes fournies le 28 octobre 2026** ont été archivées **sans modification des octets** sous [passations-sources/2026-10-28-import](passations-sources/2026-10-28-import/README.md) ; leurs empreintes SHA256 sont conservées dans le sous-dossier. À lire dans leur ordre chronologique pour retrouver la genèse, et non pour déterminer la version actuelle.

| Archives, ordre historique | Fonction / précaution |
|---|---|
| [Histoire 24 juillet](passations-sources/2026-10-28-import/PROJECT-HISTORY_240726%281%29.md) | Naissance du projet, iMac/collecte CDP, MEXC et premiers choix ; **infrastructure et exchange obsolètes**. |
| [Passation 26 août](passations-sources/2026-10-28-import/passation-260826%282%29.md) | Migration Amsterdam, sept lois historiques, méthode événementielle et erreurs de TF ; **ancienne constitution**, pas la politique actuelle. |
| [BOONO-TV 13 octobre](passations-sources/2026-10-28-import/BOONO-TV_passation_complete_2026-10-13%282%29.md) | Identité visuelle, bureau, loft, capture réelle et couches de scène. |
| [TV / Watch / PRO 19 octobre](passations-sources/2026-10-28-import/BOONO_Systems_passation_TV_Watch_PRO_2026-10-19%283%29.md) | Architecture média et hypothèses produit ; **la qualification de Watch comme seule vision est dépassée par l'interface privée actuelle**. |
| [Bilan V1–V5 au 23 octobre](passations-sources/2026-10-28-import/BOONO_Systems_bilan_passation_2026-10-23%285%29.md) | Post-mortem, État V4, premier V5 suspendu ; **V5 actif ensuite relancé sous de nouvelles versions**, vérifier l'état d'aujourd'hui. |
| [Débat V493 / V541-542](passations-sources/2026-10-28-import/discussion493_542%281%29.md) | Écoute sélective, mémoire temporelle, V4 vs V5 : motivations et validations de méthode, avec textes de discussion. |
| [Préparation V494/V542 27 octobre](passations-sources/2026-10-28-import/V494_542.md) | Code préparatoire **non déployé à la rédaction de cette pièce** ; **mise en service ultérieure confirmée dans la KB** [V494/V542 active](BOONO_V494_V542_ecoute_selective_active_2026-10-27.md). |

## 4. Gouvernance : comment retrouver la raison d'un changement

**Chaîne documentaire :** observation contextualisée → analyse/replay → proposition → validation → **registre de décision avec messages/prompts intégraux et origine** → implémentation → tests → déploiement → comparaison → passation. Conserver aussi les refus, résultats négatifs et chemins non retenus ; ne jamais requalifier rétroactivement un fait.

Le dossier `knowledge/operational-decisions/OD-…/` contient : `01-demande-utilisateur-integrale.txt` ; `02-prompt-operationnel-integral.txt` ; `03-origine-et-justification.md` ; `manifest.json` avec empreintes ; `events/` pour états datés. Le commit de Git prouve une publication de texte, **pas** une modification effective des moteurs. Le journal des versions `knowledge/version-log.md` fournit l'histoire ancienne ; les documents **V5.4.3 et V4.9.4** font autorité pour leur périmètre spécifique, sous réserve de vérification sur serveur.

**Pour le prochain chat :** partir de [BOONOLAB_START_HERE](../BOONOLAB_START_HERE.md), sélectionner ici **2 à 4 sources maximum** correspondant à la question, consulter le checkpoint actif, contrôler l'état réel, et ne remonter dans la conversation que les résultats nécessaires.
