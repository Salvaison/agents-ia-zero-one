# BOONOLAB — Origine des gain-floors V4, replay V494 et garantie de continuation

**Enquête en lecture seule · 30 octobre 2026 · Amsterdam, vers 12h23 UTC.** Référence de provenance : [OD-20261030-002](operational-decisions/OD-20261030-002/03-origine-et-justification.md) ; demande utilisateur littérale et instructions de recherche archivées. **Aucun changement des moteurs PAPER, aucun stop promu.**

## 1. Historique vérifié : 440/180 et 220/180 ont COEXISTÉ

| Date | Version / source | Motif et fonction |
|---|---|---|
| 29/09 | [Enquête Turning E15](investigation-causale-E15-turning-regime-2026-09-29.md), section 17 | Proposition exploratoire 220→180 : sur 5 trades V3 MFE≥220, 4 ont retraversé +180. Une grande campagne #93 illustrait le risque de sortie anticipée |
| 12/10 | [V4.9.3](v4.9.3-mf-memory-admission-2026-10-12.md) | Mécanisme 440/180 conservé ; 220→180 chantier séparé, sans modifier admission et sortie ensemble |
| 15/10 | [V4.10.0](v4.10.0-protection-stack-2026-10-15.md), commit b418d7e | **220→180 introduit en actif** pour éviter répétition du trade #125 LONG (MFE +267,2 puis perte), tout en **gardant** le 440/180 |
| 21/10 | [V4.10.9](v4.10.9-staged-economic-gain-floor-2026-10-21.md), commit 10ab7a7 | Ajout du **120→90** proche du point mort net frais, en conservant 220→180 |
| 21/10 | [V4.10.10](v4.10.10-hard-stream-gain-floor-2026-10-21.md), commit 15efbba | Déclenchement dur PAPER au premier prix réellement observé au niveau, plutôt qu'attendre le cycle périodique |
| 24/10 | [V5.2](BOONO_V52_paper_mise_en_service_2026-10-24.md) | Réutilisation des deux étages fixes dans le nouveau PAPER |

440/180 = MFE **≥440** ET restitution **≥180**, avec PM/micro adverse, TP1/runner possible. 220→180 = MFE **≥220** puis sortie au retour du déplacement courant **≤+180**, **sans confirmation MCB/MF/PM**. Le « 180 » est donc une **amplitude de restitution** dans le premier mécanisme et un **gain fixe conservé** dans le second. V4.9.4 lit le worktree V4.9.3 figé cdf1936 et n'a donc pas ces nouveaux étages V4.10.x. V5.4.3 les utilise.

## 2. Comparatif indicatif des 14 trades V4.9.4 #37–50

**P&L réel cumulé : +27,5088 $ nets.** Sources : ledger réel V494 ; prix Audit OKX ~30s pour #47–50 ; sinon OHLC TradingView/MCB3 3m **confirmées seulement** pour #37–46. Le replay est un exercice de sensibilité de chaque position, **pas un portefeuille réalisable** ; il n'émule ni les nouveaux trades causés par les sorties déplacées, ni l'ordre intrabougie, ni le TP1 V4 entier. L'OHLC3m diffère parfois du MFE réel et le #43 arme et touche le 120/90 **dans la même bougie**, donc résultat particulièrement ambigu.

| Cas | Résultat réel V4 | Si 120→90 appliqué mécaniquement | Lecture |
|---|---:|---:|---|
| #37 LONG | −3,91 $ | −1,12 $ | Aurait probablement réduit la perte, MFE OHLC supérieur au MFE réel |
| #40 LONG | **+7,97 $** | **−0,81 $** | Floor armé avant un recul puis campagne conservée par V4 |
| #43 SHORT | **+17,11 $** | ~+0,06 $ | **AMBIGU** : ordre du haut/bas intrabougie 00h39–00h42 inconnu |
| #45 LONG | +3,80 $ | Pas de sortie plus précoce détectée | Continuation sauvegardée |
| #47 LONG | **−11,25 $** | **−0,25 $** | Audit 30s, évitement d'une grande partie de la perte vers 21h38 UTC ; 120→90 puis 220→180 aurait fait ~+1,14 $ |
| #48 LONG | +0,19 $ | +0,13 $ | Presque neutre ; avec 220→180 ~+1,44 $ |
| #49 LONG | **+22,30 $** | Pas de sortie anticipée détectée | Grand prolongement gardé par V4 |
| #50 SHORT | **+5,58 $** | **−0,97 $** | Audit 30s : floor toucherait vers 06h50, avant continuation baissière |

**Sommes mécaniques des mêmes trades, NON des performances A/B de portefeuille :** actuel +27,5088 $ ; floor120→90 +8,8378 $ (écart −18,6710 $) ; floor120→90 puis 220→180 +9,2174 $ (écart −18,2914 $) ; première clôture 3m sous invalidation structurelle V5-like, *sans preuve MF/PM*, +16,7634 $ ; floor120 plus cette invalidation −0,2333 $ ; floor120 plus trailing 3m V5-like −3,4230 $. **Ces agrégats sont très fragiles** (10 trades seulement en 3m, un #43 ambigu, TP partiel #40, pas de réentrées). Ils repèrent surtout les cas que les règles trop simples abîment.

Sur les seuls **#47–50** couverts en Audit30s, réel +16,8203 $, somme mécanique avec 120/90 +21,1974 $ (principalement sauvetage #47), alors que #50 est amputé. **Ne pas généraliser depuis quatre cas.**

## 3. Structures de risque proposées par le code V5, appliquées AUX ENTRÉES V4 comme hypothèse

Le calcul V5 v53-causal.mapPlace/MA200 est évalué as-of à l'entrée de chaque trade V4 : **ce n'est pas un stop que V4.9.4 appliquait réellement**. Il sélectionne un swing 3m/15m causal ou niveau défendu, du bon côté, avec buffer de volatilité et distance admissible 0–500 $ BTC (min 36 ou 0,8×range3 médian).

**13/14** #37–50 disposent de ce type d'ancre, distance médiane **106 $ BTC** ; **#47 n'en dispose pas** avec les règles de sélection V5 (range3 médian ~281,6 $ BTC), et a perdu −11,25 $. **MA200 n'a proposé aucune ancre concurrente qualifiée** à ces entrées. Refuser toute entrée sans ancre ne serait pourtant PAS démontré : sur #1–50, #20 (+5,05 $), #24 (+0,60 $), #25 (+5,81 $) n'en avaient pas non plus et furent gagnants. Ce n'est pas une permission de réintroduire le veto WHERE.

**Contre-exemples immédiats :**
- **#45 LONG 79 973,5 $** : niveau protecteur hypothétique **79 888,3 $**. Clôture 3m 03h09 UTC à **79 863,8 $**. EXIT prix seul donnerait **−3,56 $** contre **+3,80 $ V4 réel** (différence 7,35 $). Un seul close ne peut pas suffire sans conversion/territoire adverses réellement prouvés.
- **#49 LONG 76 755,1 $** : un stop évolutif sur swings3/retests donnerait vers 03h14 une clôture **77 345,6 $**, net **+10,03 $**, contre **+22,30 $ V4 réel**. Un swing3 confirmé n'est pas une invalidation de toute la campagne.
- **#47 LONG 79 434,7 $** : MFE +229,2, aucune ancre initiale survivable de notre transposition V5, puis risque −516,4 et net −11,25 ; un filet économique aurait probablement sauvé le trade, mais peut détruire d'autres continuations.

## 4. Chaîne causale du +17,0747 $ hypothétique sur V5 #102

Entrée LONG réelle **29/10 14h32min22s UTC**, 80 601,6 $, invalidation 80 348,5 $, sortie vraie **14h50min07s à 80 781,0 $**, MFE +862,3, gain conservé +179,4 BTC, **+1,8370 $ net** sur floor V5 220→180.

La variante en replay **conserve 120→90 et n'arme PAS 220→180**. Sur les seuls snapshots Audit30s :
1. **14h33:51** prix 80 789,7, MFE +188,1 → floor +90 ; **14h35:21** prix 80 828,9, MFE +227,3 → toujours floor +90.
2. **14h49:51** prix Audit 80 804,7 (+203,1) ; entre deux Audit, **14h50:07 tick PAPER réel 80 781 (+179,4)** provoque EXIT au floor 180 ; **14h50:21** Audit 80 799 (+197,4). Le replay30s **manque le vrai tick de sortie** et maintient fictivement la position sans second floor.
3. **14h54:21** swing3 creux sous-jacent **80 762,7**, source 14h48, disponible après clôture de confirmation **14h54** : buffer 20,3 → stop **80 742,4** (= floor +140,8).
4. **15h33:21** swing3 bas sous-jacent **81 369,3**, source 15h27, disponible 15h33 : stop **81 348,0** (= floor +746,4).
5. **15h45:21** reconquête défendue d'ancien haut **81 557,9**, validée 15h45 : stop **81 535,6** (= floor +934,0).
6. **15h45 → 15h48 → 15h51 → 15h54** : franchissement, extension, retest et tenue confirmée de l'ancien haut **81 622,3**. Le niveau est disponible à **15h54**, pas avant.
7. **16h00:21** : range3 médian 118,9 ; buffer max(12, 0,14×118,9)≈16,6 → stop **81 605,7** (= floor +1004,1 depuis l'entrée).
8. **16h02:51** prix Audit **81 600,2** sous stop → sortie virtuelle à +998,6 BTC conservés ; MFE simulé +1223,1 ; giveback 224,5 ; au notionnel 1500$ avec frais taker : **+17,0747 $ nets**.

**Ce scénario est explicable mais non validé** : pas de chemin exact des prix 5s entre les observations, stop virtuel et requalification d'ancres possibles seulement sur ces observations, fausses réentrées réelles bloquées par une position prolongée. Il utilise **swings locaux MCB3 et reprises de hauts**, pas un transfert MCB15 ni une MA200. Le replay historique30s de la baseline **n'arrive même pas à reproduire la sortie V5 220/180** à 14h50 ; on ne peut donc ni attribuer ce +17,07 à une amélioration prouvée, ni promouvoir la variante.

Traçage détaillé et données limitées conservés sur Amsterdam : data/research-briefs/v543-102-trail-proof-20261030.json et v494-floor-structure-replay-37-50.json.

## 5. La continuation : pourquoi les preuves ne doivent pas être supprimées

**V4.9.4 et V5.4.3 n'appliquent PAS le même quorum.** V4 (V493 gelé) conserve une thèse devenue CONSUMED, requiert preuves MCB opposées + PM + ticker dans certaines sorties, ou signal E15 natif/stack spécial, PM/micro adverse pour protection MFE ≥440. V5 attend pivot E15 opposé confirmé **OU** 2 closes 3m au-delà invalidation, **ET** MF3/MF15 tous deux adverses **ET** territoire opposé réellement défendu, ou rejet MA3 confirmé avec MF/prix. **E3 seul ne sort jamais la campagne**.

Au seuil 120/90 hypothétique de #40, #43, #47 et #50, V4 affichait partout **REVERSAL_ATTENTION sans transfert**. Cet état ne différencie donc pas seul le bon maintien des pertes graves. #45 et #49 montrent qu'une sortie au premier signe structurel opposé peut encore sacrifier une grande partie de la campagne.

**Recommandation analytique [NON VALIDÉE COMME POLITIQUE] :** conserver une autorité stratégique de **CONTINUATION/MCB15** qui accepte E3 inverse et respiration ; créer séparément une épreuve de survie de la **POSITION**, fondée sur la perte matérielle d'un territoire réellement défendu, sa non-récupération, la capacité de conversion adverse (prix + PM/MF comme familles non doublées), l'évolution de l'effort et la vitesse de perte ; conserver la protection absolue du capital. Une sortie de position avant E15 confirmé ne doit PAS requalifier automatiquement la campagne en sens opposé. Ne pas mettre un 120/90 V4 en dur, ni un stop3m initial/trailing en EXIT mécanique : tester d'abord **sauvetage sélectif vs preservation de continuation** sur les mêmes épisodes et sur ticks réellement connus.

**Premiers contre-exemples prospectifs V5 du nouveau shadow** : #113 baseline 120/90 +0,1821 $ net ; maintien structurel -1,4479 $ net et réentrée #114 bloquée ; #114 baseline +1,942 $, trailing shadow +1,2942 $. La variante baseline shadow n'a pas reproduit précisément le fill #114 (1,683$ au lieu de 1,942$), donc calibrer d'abord la cadence/fills. Ces exemples **interdisent de conclure « structure seule > gain-floor »**.

## 6. Limites, statuts et suite

**[CONSTATS]** version/date/motivation documentaires, ledger V494, niveaux as-of transposés depuis V5, prix Audit/MCB, chaîne #102. **[HYPOTHÈSES]** gain futur d'un 120 conditionnel et d'une invalidation corroborée, qualité de la séparation continuation/abandon. **[MODIFICATION DES MOTEURS]** aucune. **[PAPER]** V4.9.4 et V5.4.3 inchangés ; shadow indépendant V543 déjà en service sous OD-20261030-001, sans autorité sur les ordres.

**Suite de travail :** reproduire d'abord les fills baseline à cadence identique ; comparer campagnes #40/#43/#47/#49/#50, succès V4 sans ancre #20/#24/#25, sorties V5 #102/#113/#114, échecs et faux franchissements #75/#80. Mesurer net par campagne, drawdown, reentrées, MFE capturé et cas de faux EXIT. Respecter disponibilité réelle des preuves et absence de double vote MCB3/E3/LBW et MF pente/divergence.
