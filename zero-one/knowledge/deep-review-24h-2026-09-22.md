# BOONO — Deep Review 24 h — 22/09/2026

Fenêtre causale : 21/09/2026 09:00Z → 22/09/2026 09:00Z. Activation du correctif d’urgence : 22/09/2026 05:22:55Z. Aucune donnée postérieure n’est utilisée pour juger une entrée passée, sauf les excursions prospectives explicitement annoncées.

## Synthèse exécutive

- [FAIT OBSERVÉ] 2 861 évaluations, prix 83 741,4 → 86 179,1 $, extrêmes 83 725,8–87 317,5 $.
- [FAIT OBSERVÉ] Cinq trades LONG : 1 gagnant, 4 perdants, total -5,3573 % levier, PF 0,0979, drawdown maximal 5,3573 %.
- [FAIT OBSERVÉ] MFE total 485,4 $, MAE 600,3 $, capture moyenne 6,49 %, giveback total 948,5 $.
- [DÉMONTRÉ] L’ancienne équivalence phase LBW → thèse directionnelle était un [ARTEFACT LOGIQUE]. La descente/montée LBW est désormais descriptive de la géométrie oscillateur E15→E15.
- [DÉMONTRÉ] Après le correctif d’urgence, la thèse prix est LONG ACTIVE sur 431/431 évaluations ; 71 dominances SHORT persistantes n’ont produit aucun WATCH/ENTER SHORT.
- [AMBIGU] La réouverture d’opportunités valides n’est pas encore démontrée en production : 425 WATCH STRUCTURAL_REASSERTION, 22 états tactiquement prêts, aucune admission.
- [DÉMONTRÉ] Deux évaluations à 08:01Z réunissaient WHERE courant, turning ≤6 min, 3m aligné et dominance LONG persistante, mais furent bloquées uniquement par un R:R de 0,58. Le prix a ensuite fourni +905,1 $ de MFE pour -65 $ de MAE sur 60 minutes.
- [ARTEFACT LOGIQUE] Le calcul de cible R:R avait une discontinuité autour de MA200 3m : sous la MA, elle devenait cible finale proche ; au-dessus, elle disparaissait et la cible suivante pouvait devenir un niveau fixe très lointain.
- [DÉCISION MÉTHODOLOGIQUE] Une seule modification additionnelle est retenue : priorité aux objectifs prix causaux E15→E15 pour le R:R structurel. Aucun seuil, gate de réassertion ni exit n’est changé.

## OBSERVATION — DATA → CONTEXT → WHERE → STATE → SEQUENCE → CONVERSION → DOMINANCE

### DATA

- 29 états 'entryAllowed=true' avant le correctif d’urgence ; chaque ENTER a suivi dès la première évaluation éligible observée (délai 0 s à la cadence d’évaluation).
- Actions 24 h : 1 ENTER_LONG REVERSAL_FORMING, 4 ENTER_LONG PHASE_CONTINUATION, 141 HOLD, 5 EXIT_EXECUTION.
- Régimes : TRANSLATION 776, TENSION_BALANCE 856, COMPRESSION 747, HACHOIR 412, CHOC_COMBAT 70.
- Prévisions gelées : 18 évaluées, 8 [DÉMONTRÉ], 10 [AMBIGU], 0 [FALSIFIÉ].

### CONTEXT

- Weekly causal exact : [DONNÉES INSUFFISANTES].
- Daily, 4h, 1h et 15m sont restés au-dessus de leur MA200 dans la phase nocturne observée. Le 3m a été perdu pendant le stress puis repris durant l’accélération matinale ; stack final 5/5.
- La structure prix confirmée reste LONG, mouvement E15→E15 81 862,5 → 86 340 (+4 477,5 $). La phase LBW courante n’est pas une permission directionnelle.
- [FAIT OBSERVÉ] UNKNOWN/CONTRADICTORY explicite : 0/2 861. Après séparation phase/structure/éligibilité, son besoin résiduel reste [DONNÉES INSUFFISANTES].

### WHERE

- 'NO_VALID_LOCATION' : 2 595/2 861 ; localisation pertinente : 266/2 861.
- Après correctif : WHERE courant pertinent 79/431. Le manque de localisation reste un filtre majeur, non un verrou absolu.
- À 08:01Z, WHERE courant était présent sur les deux faux-blocages R:R propres. À 08:35–08:54Z, la hausse continuait mais WHERE et turning frais manquaient : opportunité tardive [AMBIGU], pas faux blocage attribuable à un seul gate.

### STATE

- Phase oscillateur 15m : DESCENTE 1 696, MONTEE 1 165, strictement descriptive.
- Phase 3m : DESCENTE 1 227, MONTEE 1 634. [HYPOTHÈSE À FALSIFIER] son usage brut comme condition de réassertion peut encore confondre phase oscillateur et alignement prix ; ce n’est pas modifié aujourd’hui car WHERE/turning bloquaient aussi les cas observés.
- 'wave.structural' post-correctif : LONG ACTIVE 431/431. Aucun 'FALSIFIED_PRICE_LEG'.
- La protection 85 070,2 a été attaquée à 7,5 $ près puis conservée ; cette attaque est un risque/protection, pas une falsification automatique de la tendance E15→E15.

### SEQUENCE

- Minuit : quatre admissions LONG de continuation à 23:41, 00:13, 00:23 et 00:45Z, plus un REVERSAL_FORMING à 23:05Z. Toutes ont été immédiates dès l’éligibilité.
- Vers 02:00 : aucune nouvelle admission malgré la dégradation ; WHERE pertinent seulement 2/240 et maturité bloquée 240/240.
- Vers 07:06 : stress sur 85 195/85 070,2, reclaim, puis progression. Le correctif a gardé la thèse LONG et routé vers STRUCTURAL_REASSERTION sans rouvrir de SHORT microstructurel.
- [FAIT OBSERVÉ] Les quatre LONG tardifs de continuation avaient des R:R moteur 31,20 ; 58,90 ; 47,00 ; 35,31 après disparition de MA200 3m des cibles. Trois ont perdu.

### CONVERSION

- Minuit : la reprise de MA200 3m a supprimé la cible locale et projeté le reward sur WR 93 506 $, sans exiger un objectif prix intermédiaire causal.
- 02:00 : les vendeurs ont conservé MA200 3m et 85 787 sans convertir durablement 85 360/85 195 ; le refus de nouvelles entrées est cohérent.
- 07:06 : effort vendeur élevé, mais acceptation sous 85 195 limitée à 9,8 min et protection non rompue ; reclaim observé. Ce stress-test est [DÉMONTRÉ] pour cette frontière, non universalisé.
- 08:01 : ancien reward = MA200 3m proche, R:R 0,58. Après coup, reprise MA200 3m et extension jusqu’à +905,1 $ ; le faux blocage est [DÉMONTRÉ] sur ces deux observations.
- La correction proposée donne alors comme objectif causal le reclaim 86 340 : R:R shadow ≈2,90, sans modifier la protection ni le minimum R:R=1.

### DOMINANCE

- 24 h : refus dominance 2 432/2 861.
- Après correctif : 92 dominances LONG persistantes, 71 SHORT persistantes. Les 71 SHORT n’ont déclenché aucun WATCH/ENTER SHORT.
- À 07:47Z, une accélération ultérieure de +869,1 $ a été précédée d’une dominance seulement émergente/combat : manque à gagner [AMBIGU], car la persistance exigée n’était pas réunie.
- À 08:01Z, dominance LONG persistante '.929–.971', retained=1 : conjonction complète hors R:R.

## DÉCISION — ELIGIBILITY → RISK → ACTION

### ELIGIBILITY

- [DÉMONTRÉ] Le correctif d’urgence bloque les contre-thèses microstructurelles : aucun SHORT admis malgré 71 dominances SHORT persistantes.
- [DÉMONTRÉ] Les gates WHERE/turning/3m/dominance savent devenir simultanément vrais : 22 états 'reassertion.ready=true'.
- [DONNÉES INSUFFISANTES] pour prouver l’admission live d’une réassertion entièrement valide, car le R:R historique a bloqué les deux cas propres.
- Délai première éligibilité → entrée sur les cinq trades : 0 s à la cadence observée. Le défaut n’est pas une latence d’action, mais une éligibilité tardive/discontinue.

### RISK

- [ARTEFACT LOGIQUE] Ancien ordre : cible la plus proche parmi MA200/niveaux. Sous MA200 3m, reward artificiellement court ; au-dessus, saut vers un niveau lointain.
- Shadow sur les cinq trades 24 h avec cible structurelle locale : blocage de deux pertes totalisant -3,7416 % et d’un petit gain +0,5816 % ; deux pertes restent admissibles. Gain historique net indicatif +3,16 %, sans prétendre à un PF rejoué complet.
- Sur les 28 trades disponibles, la règle aurait bloqué 15 trades totalisant -10,277 % ; les 13 restants totalisent encore -13,761 %. Elle corrige un défaut ciblé mais ne résout pas seule l’exécution.
- Rollback si les prochaines fenêtres montrent des admissions répétées dont la cible structurelle n’est pas atteinte avant protection, une dégradation PF/drawdown/capture, ou une cible nulle/derrière le prix.

### ACTION

- 5 sorties : total -5,3573 % levier ; MFE 485,4 $, MAE 600,3 $, giveback 948,5 $.
- Trade 23:05Z : -2,3122 %, MFE 137,6 $, MAE 200,2 $, capture 0 %.
- Quatre continuations : +0,5816 %, -0,4595 %, -1,7378 %, -1,4294 %. Capture positive uniquement sur le gain (32,5 %).
- Tranche shadow : le seul trade protégé (+0,5816 %) conserve encore ses runners. Marqués au prix de fin 86 179,1, les modèles 70/30, 60/40 et 50/50 valent environ -0,665 %, -1,080 % et -1,496 % levier. [AMBIGU] : échantillon unique, mais le runner ne corrige pas encore le giveback.
- [DÉMONTRÉ] ACTION n’a plus quitté une position sur phase LBW opposée seule. La faible capture/giveback reste une piste distincte ; aucun second changement aujourd’hui.

## [CHANGEMENT AUTORISÉ] Correction unique du 22/09/2026

Rationale falsifiable : pour une thèse structurelle ACTIVE, le reward doit d’abord viser un objectif prix causal du mouvement E15→E15, pas changer brutalement de sémantique lors du franchissement de MA200 3m.

- Fichier : 'modules/v3lab/layers/risk.js'.
- Fonction ajoutée : 'structuralPriceTarget(wave, direction, price)'.
- Avant le reclaim de l’extrémité du dernier leg confirmé : cible 'STRUCTURAL_RECLAIM'.
- Après ce reclaim mais avant le retest de l’extrême local : cible 'STRUCTURAL_EXTREME'.
- Après franchissement de ces objectifs : fallback inchangé vers 'nearestTarget()' MA200/niveaux.
- 'MIN_ENTRY_RR=1', protection, respiration, maturité, WHERE, turning ≤6 min, 3m, dominance et ACTION restent inchangés.
- Tests ajoutés dans 'tests/v3lab/coherence-regression.test.js' pour les deux côtés de la discontinuité.

Sécurité et activation :

- Position V3 vérifiée nulle avant backup et avant restart.
- Backup : 'archives/v3lab-pre-deep-review-structural-target-20260922T091614Z'.
- Tests validés : syntaxe risk ; V3 coherence, divergence-lineage, MA200, MW horaire ; V2 core-contract et simulator-v02.
- Redémarrage nécessaire limité à 'cerveau-central'; online, compteur 1. 'moteur-boono' non redémarré, online, compteur 0.
- Vérification live à 09:20:41Z : prix 85 904,2 ; thèse LONG ACTIVE ; cible 'STRUCTURAL_RECLAIM' 86 340 ; protection 85 070,2 ; R:R 0,5225 ; WATCH, aucune position.
- Le nouveau résultat live est cohérent : le R:R reste bloqué quand l’objectif causal ne rémunère pas le risque, sans réintroduire une contre-thèse.

## Verdicts et suite prospective

- Correctif d’urgence phase/thèse/éligibilité : [DÉMONTRÉ] pour le blocage des contre-thèses ; [AMBIGU] pour la réouverture effective des bons trades.
- Correction de cible structurelle : [DÉMONTRÉ] sur la suppression de la discontinuité logique et les tests ; performance prospective [DONNÉES INSUFFISANTES].
- UNKNOWN explicite : [DONNÉES INSUFFISANTES] après séparation des trois plans ; ne pas l’ajouter sur cet unique échantillon.
- 3m phase brute comme alignement : [HYPOTHÈSE À FALSIFIER] prioritaire, mais aucun changement supplémentaire autorisé aujourd’hui.
- Prochaine Deep Review : mesurer admissions STRUCTURAL_REASSERTION, faux positifs/négatifs, PF, drawdown, MFE/MAE, capture/giveback et fréquence de cible STRUCTURAL_RECLAIM/EXTREME.
