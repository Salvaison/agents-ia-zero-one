# BOONOLAB — S1 LBW15 en observation active, simplification des shadows V543

**Date : 16 novembre 2026 — Amsterdam.** Portée : expérimentation **SHADOW** et maintenance de l'observabilité, non modification de la constitution PAPER V5.4.3. Requête utilisateur : « D'accord pour tes shadows mais je serais partant pour déjà rendre actif le S1 et donner plus d'autorité à LBW15 » ; arrêt V494 ; retrait des forks devenus inutiles.

## 1. Pourquoi MCB15 peut se contredire

Dans `modules/v5/decision-v541.js`, le **parent stratégique E15 géométrique** est issu du dernier pivot géométrique LBW confirmé ; il demeure historiquement stable jusqu'au prochain pivot. Le **signal E15 natif** suit une autre horloge (`sourceTs`, `availableAt`, Live ou confirmé). L'un peut donc devenir contraire à l'autre. Cette mémoire n'est pas un bug en soi, mais **un défaut de hiérarchie** existe lorsque la direction parent est réutilisée comme autorité de continuation alors qu'un E15 confirmé plus récent et un cross15 s'y opposent (#260 LONG, −5,3975 USD).

L'attention sélective V5.4.2 (`DISCOVERY → CAMPAIGN_HOLD → REVERSAL_ATTENTION → TRANSFER_EXAMINATION`) a explicitement `attentionHasTradeAuthority:false`. V5.4.3 bloque parfois **de nouvelles admissions** via mémoire de maturité, mais son `offensiveMaturityAuthoritativeOnlyForNewEntries` laisse les sorties selon V5.4.1 ; un E15 opposé ne commande donc pas automatiquement la protection d'une position. **Le souhait d'autorité supplémentaire LBW15 s'exerce ici dans un shadow d'examen, pas encore comme EXIT/VETO PAPER.**

## 2. S1 réellement mis en service

Processus PM2 **`boono-v543-lbw15-s1-shadow` ONLINE**, fichiers :
- `modules/attention/v543-lbw15-s1.js` : analyse pure sans broker/ordre, `decisionImpact:false`, `entryAllowed:null`, `exitRequested:null`.
- `modules/attention/v543-lbw15-s1-runner.js` : lecture seule de `data/v52-paper-state.json` et des observations as-of Audit30s ; ne réécrit ni ledger ni stratégie PAPER.
- `data/v543-lbw15-s1-shadow-{state,summary}.json` et `events.ndjson` : mémoire continue, états LBW15, transitions horodatées et admissions PAPER enregistrées prospectivement.
- `tests/attention/v543-lbw15-s1.test.js` : 6 tests ciblés réussis, dont horloge native, formation de retournement conservée, confirmation future ignorée, absence d'autorité.
- Mémoire initiale 4h Audit Bâton (`live15LbwRaw/live15BwRaw`, `ts` observation) ; fenêtres 3m/15m reconnues uniquement lorsque la couverture existe. Les données de décisions seules sont trop intermittentes pour reconstituer chaque minute, et sont un secours, non une histoire fictive.

S1 observe : `ΔLBW15/3m`, `ΔLBW15/15m`, amplitude/resserrement `BW15-LBW15`, parent E15, croisement 15m, dernier E15 natif confirmé et son `availableAt`, E15 Live **actif**, cross3, PM3/PM5/Live, MF3/MF15, territoire défendu, rang de prix 2h.

Trois autorités sont **séparées dans les propositions** :
- `DEFER_CONTINUATION_REVIEW` : conflit natif confirmé + cross15 opposé ou dégradation LBW15 prolongée et appuyée par une contre-preuve ; ne s'applique pas automatiquement à `STRUCTURAL_REVERSAL_FORMING`.
- `EXAMINE_ECONOMIC_POSITION_PROTECTION` : menace pour une position déjà ouverte ; **pas un EXIT**.
- `EXAMINE_STRATEGIC_TRANSFER_NOT_CONFIRMED_BY_PRICE` : contradiction MCB15 possible ; ne change pas le parent sans nouvelle défense de prix. La réadmission nécessitera ultérieurement sa propre mémoire après sortie.

**Seuils `ΔLBW15 −6 points/15m` et `−3 points/3m` uniquement exploratoires** : ni calibration historique robuste ni validation hors échantillon. Ils ne modifient aucun moteur PAPER.

## 3. Contre-vérification immédiate

Replay de la seule information d'entrée (sans utiliser les résultats de sortie comme preuve) sur les cas présents dans le ledger :
- `#260 LONG −5,3975 USD` : **signal S1 `DEFER_CONTINUATION_REVIEW`**, car E15 SHORT natif confirmé plus récent que le parent LONG + cross15 SHORT.
- `#237 SHORT +11,1705 USD` : conflit parent/natif observé mais **pas de blocage systématique** ; préserver cette exception productive.
- `#173 SHORT +51,0325`, `#233 SHORT +44,3753`, `#239 SHORT +15,5655` : `STRUCTURAL_REVERSAL_FORMING` explicitement préservés. Ils restent les contre-exemples essentiels.
- Une grande partie des mauvais #247–260 **n'est pas encore discriminée par S1**. Il ne serait pas sérieux d'annoncer une amélioration nette prouvée. Pour les événements hors mémoire Audit glissante, la pente 15m peut être **inconnue**, jamais reconstruite avec un futur ultérieur.

## 4. Nettoyage des forks

`boono-v543-hold-shadow` reste **ONLINE**, code `modules/v5/campaign-hold-shadow.js` et runner modifiés avec `activePolicies`. Seulement **`STRUCTURE_ONLY` + `EARLY_INVALIDATION`** avancent et apparaissent dans le résumé nouveau. H0 structurel et protection précoce constituent les deux contrefactuels encore pertinents.

**Retirés de l'observation active**, mais présents intactement dans l'état historique (positions virtuelles non fermées fictivement) :
- `TERRITORY_FLOOR_120` ;
- `BASELINE_PLUS_FAST_INVALIDATION` ;
- `STRUCTURAL_LEVEL_AND_TRANSFER` (SHORT virtuel #167 très ancien, sans comparaison des nombreuses réentrées empêchées).

Archive pré-nettoyage vérifiée : `/root/boonolab-v543-hold-shadow-preclean-20261116T121050Z/` avec états, sommaire, événements et ticks courants, manifeste SHA-256 ; fichiers segmentés historiques en data non supprimés. Les tests existants hold-shadow + S1 totalisent **29/29 réussis** ; aucune modification de la règle de sortie réelle.

## 5. Nettoyage V494 Elastic et P0 chronologie

- V494 PAPER et dual shadow A/B/C/D arrêtés FLAT/finalisés. Elastic V494 dépend directement du `v494-paper-state.json` désormais figé : processus arrêté pour éviter d'entretenir une illusion de conversion Live.
- L'observatoire sept familles `boono-market-regime-shadow` reste en ligne ; `MCB3` ne devrait plus être `UNKNOWN` lorsqu'il possède une direction dans `structural54.mcb3.direction`. Correction de lecture (aucune autorité de trading).
- Le dernier état Elastic V494 est ignoré si `asOf` date de plus de 90 s : `v494Quality:null` au lieu d'une fausse qualité récente. PM3/PM5/PM Live de V543 continuent de qualifier CONVERSION. **Ne pas réutiliser la qualité V494 figée comme mesure actuelle ; réimplémenter éventuellement un futur Elastic indépendant du moteur arrêté.**
- Vérification du nouvel observateur : statut MCB3 réel, qualité V494 `null` après débranchement, service en ligne. Tests observateur + S1 : **14/14 réussis**.

## 6. Protocole et statut d'autorité

**H0** : V543 PAPER actuel à logique fixe est économiquement meilleur ou équivalent après frais et occasions manquées. **H1** : S1 LBW15 distingue les continuations contestées sans supprimer les bonnes campagnes. Mesurer par parent E15 : faux départs, P&L net, frais, gains évités et manqués, MFE restitué, durée et sorties→réentrées. Les états S1 premiers n'ont **pas** de portefeuille d'exécution contrefactuel ; leurs comparatifs de clôtures identiques ne sont pas un P&L de stratégie ; aucun fill fictif n'est revendiqué. Tester avec horloge et coûts identiques sur jours futurs hors calibrage.

**Version effective PAPER : V5.4.3.** L'étiquette « 545 » évoquée n'est **pas** un nouveau moteur PAPER en service. Pour envisager V5.4.4/5.4.5, il faut un OD supplémentaire validant une règle précise de veto, sortie, risque et réadmission ; **aucune politique PAPER, floor ou broker n'a été modifiée ici**.

**Statuts OD** : V494 arrêt/archives **EXÉCUTÉS + CONTRÔLÉS** ; S1 actif en SHADOW **EXÉCUTÉ + TESTÉ** ; les trois variantes V543 retirées **EXÉCUTÉES + CONTRÔLÉES** ; une autorité LBW15 PAPER **NON IMPLÉMENTÉE / NON PROMUE** ; prochaine phase : véritable replay comparatif prospectif.
