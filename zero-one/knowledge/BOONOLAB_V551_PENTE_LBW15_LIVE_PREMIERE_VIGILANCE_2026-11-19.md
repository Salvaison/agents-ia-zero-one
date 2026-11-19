# BOONOLAB — V551 : LBW15 PENTE LIVE comme premier déclencheur de vigilance

**19 novembre 2026 — proposition de constitution, sans activation PAPER.**

## 1. Formulation précise de l'utilisateur

Après un E15 confirmé, les deux courbes MCB15, LBW15 et BW15, tendent à accompagner une campagne avec leurs irrégularités et respirations. **La première rupture informative peut se produire à la pente LBW15 Live** ; un ou plusieurs Cross3 Live puis Cross3 peuvent confirmer, par leur vitesse, leur puissance et leur réponse de prix, cette inflexion stratégique. La séquence idéale exprimée est : **E15 confirmé → LBW15 pente Live → Cross3 Live → Cross3 → Cross15 Live → Cross15 confirmé → E3/E15**, avec **PM/PM Live et MF** intervenant dans la qualification, à chaque stade où leur réponse est pertinente. Ce n'est pas une checklist chronométrée ni une assertion qu'un événement apparaît toujours avant un autre.

**L'attention accrue et le transfert d'autorité d'examen vers MCB3 et conversion doit commencer dès LBW15 pente Live, au plus tard à Cross15 Live.** Le rôle normal de MCB3 reste de signaler en premier une *opportunité d'entrée* : la vigilance structurelle de LBW15 peut être chronologiquement antérieure sans inverser ce contrat.

## 2. Deux trajectoires après l'inflexion

### A — Inflexion directionnelle

Observer la pente de LBW15 relative à sa propre histoire et à BW15 :
- décélération d'une campagne, changement d'angle, changement de cap, convergence/divergence de l'écart `LBW15−BW15` ;
- Cross3 Live et Cross3 successifs : direction, vitesse de traversée, persistance et réponse du prix ;
- MF15 lent et MF3 tactique : accélération ou conflit, sans exiger une pente MF15 forte ;
- PM Live : traduction immédiate et persistance, pas « volume d'ordres » ;
- Cross15 Live : confirmation provisoire et escalade de surveillance, non EXIT automatique ;
- Cross15 confirmé et éventuel E15 confirmé : information stratégique majeure et réexamen de la campagne, non absolu indépendant du prix.

### B — Horizontalisation / polarité incertaine

Lorsque LBW15 s'aplatit et que **BW15 a aussi une pente proche de zéro**, le système doit identifier un état descriptif `POLARITE_INCERTAINE` plutôt que forcer un LONG ou SHORT.
- Cette structure est compatible avec une pause, un range, un transfert avorté ou une future reprise ; une pente nulle ne garantit rien.
- L'interprétation dépend du lieu : *haut de range / crête MCB* pendant un LONG avec conversion qui se dégrade peut justifier une **protection ou sortie locale** ; *bas de range / creux MCB* pendant un SHORT : lecture symétrique.
- Une nouvelle entrée peut être **différée** si le prix se trouve au milieu du range ou si l'effort MF/MCB3 n'apporte pas de direction réellement conservée. Aucune MA ni frontière de range n'est une défense infaillible.
- Aucun seuil numérique « proche de zéro » ou minuterie n'est validé ici. Sa calibration doit être contextuelle et comparée aux cas de vraie continuation après respiration.

## 3. Autorité à construire dans l'unique V551

Proposition d'états *non implémentés* : `CAMPAGNE_ACTIVE` → `PENTE15_LIVE_VIGILANCE` → `TACTICAL_COUNTER_EVIDENCE` → `CROSS15_LIVE_WATCH` → `POSITION_REVIEW` → `CONFIRMED_15M_REVIEW` ; branche alternative `POLARITE_INCERTAINE / RANGE_REVIEW`. Il peut y avoir retour à `CAMPAGNE_ACTIVE` sans changement de parent. Une protection de POSITION peut précéder la fin de CAMPAGNE, et une sortie ne suffit pas à justifier une entrée opposée.

Cette architecture conserve les responsabilités distinctes : 
- **Vigilance initiale** : qualité géométrique de LBW15 et BW15, et non la simple existence d'un Cross15 ;
- **MCB3** : premier candidat d'entrée et instrument de surveillance des contre-attaques (Cross3 Live, confirmé, vitesse) ;
- **MF15/MF3** : qualité de la force qui accompagne BW/LBW et PM ;
- **PM Live, prix et lieu/range** : conversion économique observée et territoire conservé ;
- **Risque** : indépendant de l'interprétation ; conserver le contrat PAPER existant sans modifier la politique actuelle.

## 4. Vérification du code V551 réellement déployé le 19/11 à 10h41 CET

Sources contrôlées : `modules/v551/decision.js` et `modules/v551/source.js` sur Amsterdam.

Le capteur expose `mcb15.slope3`, `mcb15.slope15`, `mcb15.gapSlope3`, LBW15/BW15 Live, le croisement clôturé, MF15/MF3, PM Live, mais **n'expose pas la pente propre de BW15** comme donnée première et ne construit pas de mémoire d'horizontalisation commune BW15/LBW15.

L'événement `LBW15_PENTE_CAP_CHANGE` est actuellement émis sur un **changement de signe** de `slope3`. Ce n'est pas une détection robuste et qualifiée de *première décélération ou rupture d'angle* ; elle peut réagir à des oscillations marginales, ou manquer une décélération importante qui garde le même signe. Cet événement est journalisé, **mais n'ouvre pas d'état de vigilance décisionnel**. La mémoire d'épisode et l'admission reposent surtout sur Cross3, puis le code de sortie écoute le Cross15 clôturé ou une combinaison tactique. L'ancien défaut d'argument directionnel `signed(x, ±1)` dans `positionReview` persiste, comme déjà signalé : NE PAS l'activer sans revoir le contrat de sortie pour éviter de couper des gagnants.

Le moteur PAPER V551 n'a pas été modifié pendant ce diagnostic ; son compte et ses positions ne sont pas touchés.

## 5. Chaîne spatio-temporelle LBW15 → Cross3 → Cross15 : temps, PM Live et déplacement

**Ajout explicite demandé par l'utilisateur :** il faut conserver **la durée ET la translation effective du prix / PM entre chaque palier**, et **le comportement de PM Live pendant les intervalles**, pas seulement l'ordre et le nombre d'événements.

Pour chaque inflexion LBW15 Live **détectée de façon as-of** (sans seuil arbitraire de pente) :

- **Ancrage t0 :** horodatage observé, direction et pente courante/précédente de LBW15 et BW15, vitesse du rapprochement, prix BTC `P0`, MF15/MF3, PM Live, régime et lieu du prix dans MCB/range.
- **Cross3 Live / confirmé :** horodatages de disponibilité distincts, direction, fréquence et vitesse de franchissement ; `Δt_0→3`, `ΔP_0→3 = P3−P0`, réponse MF3/PM Live, tentative tactique réellement convertie ou contrariée.
- **Cross15 Live :** `Δt_3→15L`, `ΔP_3→15L` et `ΔP_0→15L`; degré de rapprochement/éloignement BW/LBW15 et évolution de ses pentes, plus le **parcours de PM Live pendant toute la transition** (signes, inversions, grandeur et épisodes productifs/improductifs).
- **Cross15 confirmé / E3 / E15 :** horodatage de disponibilité sur clôture — distinct du temps où le Live a été observé —, temps et déplacement supplémentaires `Δt_15L→15C` et `ΔP_15L→15C`, qualité MF15/MF3, prix conservé ou cédé après contre-attaque. E15 natif et Cross15 peuvent provenir de **la même bougie close**, donc ne pas les présenter comme deux validations indépendantes.
- **PM Live entre deux événements :** stocker sa série horodatée, fraction des observations favorables et contradictoires, nombre de flips, progression / échec de conversion et lien au débit Bâton (proxy de volume négocié, non profondeur L2). **Ne jamais sommer les valeurs PM Live ou PM3/5 comme s'il s'agissait de deltas indépendants** : les horizons se recouvrent. Le vrai déplacement net entre événements est une différence de prix depuis les ancrages.
- **Vitesse et rendement :** vitesse moyenne `ΔP/Δt`, excursion maximale favorable, adverse, et fraction du terrain retenu depuis l'ancrage. Ce sont des descriptifs d'une campagne, pas des thresholds de trading; le temps long n'est pas une preuve automatique d'échec, le temps court n'est pas une preuve automatique de puissance.
- **Horizontalisation :** si LBW15 et BW15 perdent conjointement leur pente, confronter durée de stagnation, effort, détours tactiques Cross3, PM Live oscillante, déplacement net, position relative au haut/bas ou milieu du range. Distinguer `PAUSE_PRODUCTIVE`, `POLARITE_INCERTAINE`, `REJET` comme **hypothèses observées**, jamais comme frontières absolues.

### Exemples réels, relevés Bâton datés 18–19 novembre, CET

Ces points initiaux sont **des candidats d'inflexion sélectionnés pour illustrer le diagnostic**, non le résultat d'un algorithme validé de « premier changement de pente ». Les valeurs PM du tableau sont le `priceMove` des relevés Bâton, et **non un PM Live tick indépendant en continu**.

| Cas | Pente LBW15 Live observée (t0) | Cross3 Live | Cross15 Live | Déplacement BTC t0→Cross15L |
|---|---|---|---|---:|
| #1→#2 SHORT, 18/11 | 19h48m13s · prix 63 194,5 · pente3 −0,77 · PM Bâton −13,9 | 19h49m13s · prix 63 220,0 · PM +40,0 | **20h01m13s** · prix 62 995,4 · PM −4,6 | **−199,1 $** en 13 min |
| #4→#5 SHORT, 19/11 | 02h07m43s · prix 63 203,9 · pente3 −0,35 · PM −24,8 | 02h08m13s · prix 63 121,5 · PM −82,4 | **02h15m43s** · prix 62 975,4 · PM −36,4 | **−228,5 $** en 8 min |
| Faux SHORT 01h18, 19/11 | 01h16m43s · prix 62 807,9 · pente3 −0,07 · PM +12,7 | 01h17m13s · prix 62 780,1 · PM −27,8 | **01h18m13s** · prix 62 697,8 · PM −86,0 | **−110,1 $** en 1,5 min, puis rebond **+134,1 $** entre Cross15L et son rejet à 01h28m43s |

Sur les séries de relevés Bâton entre ces ancrages, la PM du SHORT est favorable respectivement pour **environ 52 %, 71 % et 50 % des échantillons** ; ses changements de signe sont **16, 6 et 3**. Ces fractions sont sensibles au nombre de relevés (27, 17 et seulement 4). **La continuité de PM n'est donc pas un simple "toujours positive"** : un vrai transfert peut traverser des respirations qui inversent ponctuellement la PM, et un faux transfert peut produire un mouvement initial impressionnant. La distinction exige l'acceptation du prix par étapes et les retests/contre-attaques.

Ces observations sont **rétrospectives** ; la rentabilité d'une sortie ou réentrée selon ces métriques reste non démontrée. Pas de nouveau moteur shadow PM2, ni de modification du V551 PAPER au stade documentaire.

## 6. Test économique préalable

Construire des observations AS-OF dans **la même instance V551**, en démarrant la vigilance sur la *rupture qualitative LBW15/BW15*, sans créer de nouveau processus. Tester les vrais contres :
- V551 #1→#2 et #4→#5 : Cross15 Live durable et réponse du prix productive ;
- V551 #7→#8→#9 : alternances de polarité et churn ;
- SHORT gagnant #2 : faux Cross15 UP Live ~21h15 vite rejeté ;
- LONG #4 : premier Cross15 DN Live à 01h18, rejeté, puis 02h15 durable ; comparer risque de sortie prématurée ;
- gains conservés, frais, dispersion des campagnes, temps de réaction et faux signaux à chaque étape de vigilance.

Pas de nouveau seuil "pente 0" ou nombre de minutes sans confirmation, ni de décision PAPER fondée sur une appréciation rétroactive. Une entrée ou sortie véritable nécessite un contrat explicite, des tests prospectifs et l'étude des contre-exemples.

**STATUT : VALIDATION CONCEPTUELLE DES RESPONSABILITÉS / CONTRAT D'OBSERVATION PROPOSÉ. NON IMPLÉMENTÉ EN PAPER.**
