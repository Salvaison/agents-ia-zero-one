# BOONO Systems — 220/180, invalidations et shadow de maintien V5.4.3

**30 octobre 2026 — enquête + implémentation sous OD-20261030-001.** Source d'autorisation : [demande intégrale](operational-decisions/OD-20261030-001/01-demande-utilisateur-integrale.txt) ; origine et limites dans le même dossier. **Ne pas confondre shadow en service et nouveau stop actif.**

## 1. Résultat empirique vérifié (ledger Amsterdam, #1–112)

20 clôtures V5 au gain-floor 220→180 depuis le début, plusieurs politiques d'entrée V5.2→V5.4.3. Unité : **écart du cours BTC en dollars**, pas P&L du compte.

| Trade | Politique | MFE | Cours conservé | Giveback (= MFE−conservé) |
|---|---|---:|---:|---:|
| #2 | 5.2 | 332,1 | 172,1 | 160,0 |
| #4 | 5.2.2 | 294,3 | 177,0 | 117,3 |
| #10 | 5.3 | 220,0 | 175,7 | 44,3 |
| #15 | 5.3.2 | 296,4 | 179,7 | 116,7 |
| #18 | 5.3.3 | 230,6 | 174,6 | 56,0 |
| #22 | 5.3.3 | 224,2 | 168,0 | 56,2 |
| #25 | 5.3.3 | 567,6 | 167,8 | **399,8** |
| #31 | 5.3.3 | 284,0 | 157,9 | 126,1 |
| #38 | 5.3.3 | 324,8 | 175,6 | 149,2 |
| #48 | 5.3.3 | 237,0 | 175,0 | 62,0 |
| #49 | 5.3.3 | 242,3 | 175,5 | 66,8 |
| #60 | 5.4 | 231,1 | 174,8 | 56,3 |
| #62 | 5.4 | 485,5 | 171,3 | **314,2** |
| #63 | 5.4 | 261,3 | 168,5 | 92,8 |
| #82 | 5.4.3 | 234,2 | 178,8 | 55,4 |
| #83 | 5.4.3 | 220,6 | 156,4 | 64,2 |
| #84 | 5.4.3 | 228,0 | 176,0 | 52,0 |
| #86 | 5.4.3 | 273,1 | 144,9 | 128,2 |
| #89 | 5.4.3 | 284,6 | 162,6 | 122,0 |
| #102 | 5.4.3 | 862,3 | 179,4 | **682,9 (79,2 %)** |

#102 illustre un plafond de captation dû au 220→180 fixe, incapable de refléter les nouvelles défenses construites. Ne prouve pas qu'une sortie sommet était possible avec les preuves disponibles.

## 2. V4 #47 : pourquoi aucune protection du premier gain ?

V4.9.4 appelle le vrai V4.9.3 gelé `cdf1936`. Dans `modules/v4/layers/action.js`, le `mfeProtectionExit` exige **MFE≥440**, giveback≥180 et **PM adverse et microstructure adverse**. V4 n'utilise pas le gain-floor de V5 **120/90 ou 220/180**. #47 LONG atteint MFE 229,2 seulement, puis hard-risk -516,4 $ BTC, net **−11,2465 $**. L'attention observatoire indique `REVERSAL_ATTENTION` mais `exitRequested=null` : aucune sortie de risque proactive. Le veto V4 de sortie est donc distinct du simple stop de prix.

## 3. Diagnostic du quorum de transfert

`attention-memory.js` : `transferable = MCB15_recent && MF_sequence_or_transfer && PRICE_recent && PRICE_after_MF` ; cela peut détecter tard, et `attentionOnly=true` ne déclenche rien. La sortie V541 active attend E15 opposé **OU deux clôtures 3m** après invalidation **ET MF3+MF15 adverses ET défense du prix opposé**, sauf rejet MA3 avec MF/prix. Ces conditions peuvent être trop tardives pour abandonner la **position** sans qu'il soit nécessaire de déclarer la **campagne E15 renversée**. Le MCB15 peut demeurer stratégique sans veto préalable absolu sur la survie de la position.

## 4. Nouveau shadow réellement mis en service (lecture seule)

PM2 : `boono-v543-hold-shadow`, source `modules/v5/campaign-hold-shadow-runner.js`, politique `v543-campaign-hold-shadow-v0.2`. Sources réelles : entrées et ledger V543, prix frais OKX, sources MCB/audit confirmées as-of. Écrit seulement sous `data/v543-campaign-hold-shadow-{state,summary,events,ticks}` ; **jamais** le PAPER/les ordres; `brokerOrdersEnabled=false`, `decisionImpact=false`.

Quatre forks par nouvelle entrée V5, avec états, MFE/MAE, frais réels du modèle, sortie virtuelle et refus des réentrées concurrentes :
- `STRUCTURE_ONLY` : sans floor ; maintient jusqu'au EXIT structurel V543 ou risque −500.
- `EARLY_INVALIDATION` : maintien sans floor, mais ajoute EXIT initial si invalidation perdue avec nouvelle preuve causale (aucun pivot E15 obligatoire ni deux clôtures 3m).
- `TERRITORY_FLOOR_120` : conserve 120→90, remplace 220→180 par plancher relevé uniquement après **nouvelle ancre confirmée après entrée** (swing/retest/MA disponible) et ajoute invalidation anticipée.
- `BASELINE_PLUS_FAST_INVALIDATION` : conserve **exactement** les deux floors V5 et ajoute seulement l'invalidation anticipée pour isoler ce changement.

`structural-invalidation-observer.js` classe : simple traversée (`WATCH`), perte après **une clôture 3m confirmée au-delà du buffer avec conversion adverse OU MF3 adverse**, et pénétration importante sans attendre la clôture lorsque PM3/PM Live et MF3 sont adverses. `buffer = max(12, 0,14×range3m médian)` ; condition d'urgence `max(50, 0,7×range3m médian)`. **Ce sont des paramètres d'expérience du shadow, pas de nouveaux seuils actifs.** Le hard-risk de −500 reste toujours exécuté dans les forks.

Reprise des anciennes positions jamais inventée : nouvelle variante ajoutée en v0.2 démarre à la prochaine entrée réellement observée ; persistance de l'état v0.1 migrée sans réinitialiser les anciennes positions. `scripts/v543-campaign-hold-replay.js` permet aussi l'étude historique indicative.

## 5. Premiers replays — indicatifs, non validés

Depuis les observations Audit conservées à **~30 s**, sans état MA Live historique reconstitué ni ticks natifs du PAPER à 5 s. **Ce n'est pas un A/B exact**.

| Cas | Baseline réalisée | Shadow retenu | Commentaire |
|---|---:|---:|---|
| #102 LONG | +1,837 $ net | **+17,075 $** net (`TERRITORY_FLOOR_120`) | Sortie reconstituée à 81 600,2, au-delà de l'ancienne sortie 80 781 ; 4 nouvelles entrées PAPER bloquées pendant l'exposition virtuelle |
| #102 LONG | +1,837 $ net | +4,772 $ net (`STRUCTURE_ONLY`) | Maintien sans floor rend encore près de 971 $ BTC de son meilleur MFE virtuel |
| #103 SHORT | −9,472 $ net | −7,194 $ net (`EARLY_INVALIDATION`) | Sortie à 81 277,2, plus tôt que la sortie réelle 81 400,1 |
| #108 SHORT | −5,617 $ net | −5,351 $ net (`EARLY_INVALIDATION`) | Gain théorique limité ~0,27 $ |
| #104 LONG | +0,128 $ net | **−5,358 $** net (`EARLY_INVALIDATION`, sans floor) | Avertissement : enlever les floors peut détériorer gravement le résultat d'autres trades ; snapshots non identiques |

**ALERTE DE CALIBRATION :** le scénario `BASELINE_PLUS_FAST_INVALIDATION` avec snapshots de 30 secondes n'a **pas reproduit la sortie 220/180 effectivement réalisée par le runner #102 à 5 secondes**. Le +17,075 $ du trail est donc un scénario indicatif **non démontré**, qui peut bénéficier d'un déclenchement de stop manqué entre deux snapshots ; il ne peut être utilisé comme preuve de promotion de politique. Les mêmes limites expliquent l'écart sur #104. Seul un suivi prospectif des ticks observés, avec une baseline reproduite, pourra valider une comparaison d'EXIT.

**L'importance du 120/90 est confirmée ; la piste plausible est un plancher structurel pour les mouvements développés et un EXIT de risque anticipé pour les hypothèses qui échouent, pas un remplacement aveugle des règles existantes.** L'audit des succès récupérés après invalidation (#75/#80) nécessite des sources et un replay détaillé : les snapshots récents ne couvrent pas ces jours.

## 6. Tests, statut et points ouverts

**Tests exécutés : 52/52** (nouveaux cas de suivi, mèche, clôture, MF/PM urgent, non-futur, frais, faux ordres, migrations, conflits de réentrée + contrats V541/V543/attention). Dry-run `--test-read` réussi. Processus indépendant PM2 en service, configuration sauvegardée. Les deux moteurs V4.9.4 et V5.4.3 PAPER sont restés inchangés.

Statuts : [VALIDATION UTILISATEUR] demande d'implémentation d'un shadow et étude de l'invalidation ; [IMPLÉMENTÉ/MIS EN SERVICE] quatre comparateurs *non autoritaires* ; [TESTÉ] logiciel local + indicatif historique ; [NON PROMU] aucun nouveau seuil d'EXIT du PAPER, aucune substitution de 220/180 en service, aucune modification V4. Une promotion demande replay plus complet des cas adverses **et des cinq exceptions après franchissement**, frais, budget de risque et vérification prospective.

**Sources :** `zero-one/data/v52-paper-trades.ndjson`, `v494-paper-trades.ndjson`, `audit-history.json`, MCB CSV, `modules/v5/{decision-v543,decision-v542,decision-v541,paper-v543,structural-invalidation-observer,campaign-hold-shadow,campaign-hold-shadow-runner}.js`, `tests/v5/campaign-hold-shadow.test.js`, `scripts/v543-campaign-hold-replay.js`. Recherche et états volumineux restent dans `data/research-briefs/` sur Amsterdam.

**Travaux ouverts :** effets de l'invalidation initiale et du trail structurel sur toutes les pertes et récupérations, gouvernance d'un éventuel V5.4.4 PAPER, plan équivalent adapté aux ancrages de V4.9.4, possibilité d'exposer les résultats du shadow dans BOONO Watch.