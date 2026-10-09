# BOONO — Deep Review 24 h — 24/09/2026

Fenêtre étudiée : 23/09 10:59:35 → 24/09 10:59:35 Paris (08:59:35Z → 08:59:35Z).

## Verdict exécutif

[DÉMONTRÉ] La correction de persistance structurelle du 23/09 améliore nettement la cohérence : après son activation, 2 566 évaluations conservent `wave.structural.status=ACTIVE`; 78 cas `fullyRetraced=true` restent descriptifs, sans aucune ACTION dans le sens opposé à la thèse.

[DÉMONTRÉ] Un LONG pris pendant un retracement complet a été profitable (+0,871 % levier) et n'a quitté la thèse que sur un nouvel E15 SHORT confirmé. La séparation retracement / protection / thèse fonctionne.

[DÉMONTRÉ] La faiblesse principale n'est plus le statut structurel. Elle se situe dans la temporalité WHERE → réaction → déplacement : `STRUCTURAL_REASSERTION` exige CURRENT_WHERE, tandis que `PHASE_CONTINUATION` accepte RECENT_WHERE même après consommation importante du mouvement.

[AMBIGU] Aucun changement de fenêtre décisionnelle n'est appliqué aujourd'hui. Relâcher CURRENT_WHERE produit des candidats mixtes ; durcir ou supprimer PHASE_CONTINUATION à partir de deux trades seulement serait prématuré.

## Qualité et frontière causale

- Évaluations : 2 852 lignes sur la fenêtre, 0 invalide, doublon ou régression ; continuité 30 s sans trou.
- Shadows : 2 852 lignes, mêmes garanties de continuité.
- Décisions : 1 665 objets valides, 0 invalide, doublon ou régression. Leur cadence est événementielle ; les intervalles irréguliers ne constituent pas une panne.
- Rotations lues conjointement : 3 segments évaluations, 2 segments shadows, 2 segments décisions, puis fichiers actifs.
- La portion 08:59:35Z → 09:13:37.951Z appartient à la panne déclarée : [DONNÉES INSUFFISANTES]. Aucun backfill.
## OBSERVATION — DATA → CONTEXT → WHERE → STATE → SEQUENCE → CONVERSION → DOMINANCE

### DATA / CONTEXT

- Prix causal : 85 924,9 → moyenne 84 512,8 → 83 586,4 $, soit −2 338,5 $ ; range 83 221,9–85 978,7 $.
- Phase 15m : MONTEE 70,5 %, DESCENTE 29,5 %. Nested3m : MONTEE 58,9 %, DESCENTE 41,1 %. Ce sont des géométries d'oscillateur, pas des permissions.
- Régimes : TENSION_BALANCE 34,7 %, TRANSLATION 30,9 %, COMPRESSION 15,5 %, CHOC_COMBAT 9,6 %, HACHOIR 9,2 %.
- MA200 : prix sous 3m 95,5 % et sous 15m 81,4 %, mais au-dessus 1h/4h/Daily sur toute la fenêtre. Position uniquement.

### WHERE / STATE

- WHERE pertinent : 549/2 852 évaluations (19,3 % du temps) ; absent : 2 303.
- Source de localisation RISK : CURRENT_WHERE 391, RECENT_WHERE 909, aucune 1 552.
- Avant activation du correctif : 286 `FALSIFIED_PRICE_LEG/THESIS_FALSIFIED_WAIT`, de 09:13:37Z à 11:36:10Z. Ce chemin est historique, pas actif.
- Après activation : aucune réapparition. Legs confirmés successifs : LONG 85 987,2→86 698,3 ; SHORT 86 698,3→85 402 puis 85 238 ; SHORT 85 238→84 591,9 ; SHORT 84 591,9→83 707 ; LONG 83 707→84 580.
- Dernier leg LONG confirmé demeure ACTIVE après retracement complet, conformément au contrat.

### SEQUENCE / CONVERSION / DOMINANCE

- Dominance persistante SHORT : 267,1 min ; LONG : 237,1 min. Aucun transfert tactique n'a remplacé seul un leg E15.
- La phase LONG de l'oscillateur a coexisté avec une translation prix baissière sans permission LONG autonome.
- La structure SHORT a accompagné l'essentiel de la baisse, mais le moteur a souvent rencontré le signal seulement après forte consommation du terrain.
- Les refus sont distribués : dominance non alignée 2 376 ; turning frais absent 1 924 ; CURRENT_WHERE requis 1 907 ; R:R insuffisant 1 829 ; localisation absente/ancienne 1 552 ; 3m non aligné 1 131 ; régime 538.
## DÉCISION — ELIGIBILITY → RISK → ACTION

- `entryAllowed=true` seulement 10/2 852 évaluations, soit environ 5 minutes cumulées.
- ACTION : WATCH SHORT 2 399, WATCH LONG 336 ; 3 entrées et 3 sorties.
- Résultat V3 : 2 gains / 1 perte, total −1,680 % levier ; profit factor 0,483.
- LONG 85 564,4→85 638,9 : +0,871 %, STRUCTURAL_REASSERTION, CURRENT_WHERE + turning + 3m + dominance ; EXIT_STRUCTURE sur nouvel E15 opposé.
- SHORT 84 436,3→84 377,1 : +0,701 %, PHASE_CONTINUATION, RECENT_WHERE âgé d'environ 1,5 min et distant d'environ 7 $ ; EXIT_EXECUTION.
- SHORT 83 736→84 008,3 : −3,252 %, PHASE_CONTINUATION, RECENT_WHERE âgé d'environ 7 min, déjà 267,9 $ de déplacement, aucun turning frais, nested3m LONG ; EXIT_EXECUTION après 4 min.
- La perte unique efface les deux gains : le problème économique est concentré dans la poursuite tardive, pas dans la persistance structurelle.

## Test spécifique `fullyRetraced`

Sur 78 évaluations `fullyRetraced=true` :

- 0 action opposée à la thèse ; 50 WATCH LONG, 1 ENTER_LONG, 27 HOLD LONG ;
- protection et R:R disponibles 78/78 ;
- dominance alignée 18, nested3m aligné 48, turning frais 30, CURRENT_WHERE 32 ;
- conjonction complète 6 évaluations, `entryAllowed=true` 6 fois ;
- le seul trade issu de cette conjonction gagne +0,871 %.

[DÉMONTRÉ] Le retracement complet n'ouvre donc pas une contre-thèse et reste effectivement contrôlé par les gates tactiques.

## WHERE → retournement → déplacement

[DÉMONTRÉ] Le contrat actuel est asymétrique : la réassertion exige le lieu encore courant, tandis que la continuation peut exploiter sa mémoire.

[DÉMONTRÉ] Le trade gagnant de continuation utilise une mémoire proche ; le perdant utilise la même permission après un déplacement déjà largement consommé.

[AMBIGU] Remplacer CURRENT_WHERE par RECENT_WHERE dans la réassertion n'est pas validé : huit évaluations bloquées uniquement par ce point se regroupent en deux candidats aux résultats mixtes.

[HYPOTHÈSE À FALSIFIER] WHERE doit devenir une ancre causale `LOCATION → REACTION → DISPLACEMENT → ACTION/EXPIRE`, avec distance et terrain conservé depuis l'ancre, plutôt qu'un gate spatial simultané ou un simple TTL.
## Groupe de contrôle legacy

Cinq campagnes clôturées sur la fenêtre : 4 gagnantes, 1 perdante, +28,28 $ simulés cumulés. Deux seulement avaient un lieu actif à l'entrée.

Le legacy agit davantage parce que le lieu déclenche la vigilance, puis le 3m et l'événement donnent le moment. Cette comparaison ne prouve pas une supériorité économique directe : tailles, tranches et métriques diffèrent. Elle démontre toutefois une meilleure capacité de réponse.

## Décision de Deep Review

Aucun code, seuil, processus ou contrat de trading modifié.

Motif :
1. la persistance structurelle est validée prospectivement et ne doit pas être annulée ;
2. supprimer CURRENT_WHERE augmenterait potentiellement les admissions mais les contre-factuels sont mixtes ;
3. durcir PHASE_CONTINUATION empêcherait le trade perdant, mais supprimerait aussi un gagnant et ne repose que sur deux cas ;
4. la bonne simplification exige un replay ancré sur prix/temps du lieu, première réaction 3m, turning15, déplacement déjà consommé, MFE/MAE à 15/30/60 min.

## État au gel prospectif

À 09:06:23Z : prix 83 573,4 $ ; structure LONG ACTIVE 83 707→84 580, `fullyRetraced=true`.

- phase 15m DESCENTE ; nested3m DESCENTE ;
- WHERE absente ; aucun turning frais ;
- dominance COMBAT_EQUILIBRE SHORT ;
- cible de reclaim 84 580 ; protection 83 216,7 ; R:R 2,82 ;
- `entryAllowed=false`, WATCH LONG, aucune position ;
- stack MA200 3/5 au-dessus (1h/4h/Daily), 2/5 dessous (3m/15m), positionnel uniquement.

## Protocole à poursuivre

Pour chaque prochain WHERE : figer l'ancre prix/temps/nature, mesurer la première réaction 3m et le turning15, la distance consommée, la conservation, puis MFE/MAE 15/30/60 min. Comparer legacy, V3 et le modèle LOCATION→REACTION→DISPLACEMENT sans fuite rétrospective.

Aucune nouvelle décision structurelle avant un corpus suffisant de campagnes comparables.