# BOONO V3-LAB — Revue bloc 3 trades #1 — 2026-09-24

## 1. Périmètre et verdict

Configuration évaluée : `V3EXP-20260924-WHERE-NOVETO-DOM2OF4-R1`.

Fenêtre du bloc : `2026-09-24T10:32:33.801Z` → `2026-09-24T13:00:49.424Z`.

Corpus causal disponible et continu sur cette fenêtre : 301 évaluations V3, 301 shadows V3, 163 décisions dédupliquées. Le gap causal documenté du 23/09 ne chevauche pas ce bloc.

**Verdict : aucune famille de seuils n'est modifiée pour le bloc suivant.** Le bloc est positif (+0,7205 % levier simulé, 2 gains / 1 perte), mais les trois trades et les occasions manquées ne fournissent pas une preuve convergente permettant d'attribuer le défaut à un seul seuil. La baisse de persistance dominance 3/4 → 2/4 doit donc rester sous observation pendant un bloc supplémentaire.

La configuration suivante reste : `V3EXP-20260924-WHERE-NOVETO-DOM2OF4-R1`.

## 2. Résultat du bloc

| Trade | Direction / mode | Entrée → sortie | Durée | P&L lev. | MFE | MAE | Capture | Sortie |
|---|---|---:|---:|---:|---:|---:|---:|---|
| 1 | LONG / STRUCTURAL_REASSERTION | 83375,8 → 83346,8 | 2,50 min | -0,3478 % | 0,0 $ | 30,8 $ | n/a | EXIT_EXECUTION — dominance opposée + respiration > p90 |
| 2 | LONG / STRUCTURAL_REASSERTION | 83483,3 → 83490,5 | 18,00 min | +0,0862 % | 152,1 $ | 20,6 $ | 4,73 % du MFE | EXIT_EXECUTION — dominance opposée + respiration > p90 |
| 3 | LONG / STRUCTURAL_REASSERTION | 83495,7 → 83577,7 | 4,51 min | +0,9821 % | 122,8 $ | 0,0 $ | 66,78 % du MFE | EXIT_STRUCTURE — nouveau E15→E15 opposé confirmé |

Total : **+0,7205 % levier simulé**, MFE cumulé 274,9 $, MAE cumulé 51,4 $, 2 gains / 1 perte. La capture brute positive des trades 2+3 est 89,2 / 274,9 = 32,45 % du MFE cumulé ; en incluant le mouvement réalisé négatif du trade 1, capture nette du bloc ≈ 21,90 %.

## 3. Contrat WHERE vérifié

Le retrait du veto WHERE est effectivement actif sur les trois entrées :

- trade 1 : `WHERE=NO_VALID_LOCATION`, `locationReady=false`, `decisionImpact=false` ;
- trade 2 : `WHERE=NO_VALID_LOCATION` au moment de l'entrée, mémoire `RECENT_WHERE` disponible mais descriptive ;
- trade 3 : `WHERE=NO_VALID_LOCATION`, mémoire `RECENT_WHERE` descriptive ;
- sur les 301 évaluations du bloc, aucun refus n'est produit par WHERE / `locationReady` / CURRENT_WHERE / RECENT_WHERE.

WHERE reste donc observable dans l'état et l'audit sans disposer d'un droit de veto. Les MA200, niveaux fixes et LGI restent également visibles. Le stack MA200 shadow est resté `POSITION_ONLY_NOT_DIRECTIONAL_BIAS`.

## 4. Trade 1 — entrée expérimentale 2/4

### OBSERVATION

**DATA / CONTEXT.** Entrée à 10:43:18Z, 83375,8. Les données 3m et 15m sont `source=live`. Le 3m courant est la bougie 10:42 ; le 15m courant est la bougie 10:30. Le dernier mouvement E15→E15 confirmé reste LONG : creux 02:00 à 83707 / LBW -75,624 → crête 08:00 à 84580 / LBW +54,585. `fullyRetraced=true` (ratio 1,379) est descriptif et ne retire pas cette thèse.

**WHERE.** Aucun lieu valide : densité 0, aucune interaction niveau fixe, MA200 15m ~84672,9 située ~1297 $ au-dessus. Cela n'empêche pas l'entrée.

**STATE / MCB.** Le 15m est encore en `DESCENTE`, LBW -45,316, BW -47,923, MF -10,562. Le 3m est en `MONTEE`, LBW +38,470, BW +19,901, MF -22,772, issu du creux E3 10:30 à 83118,2 / LBW -22,445. Un turning 15m en formation LONG est mémorisé depuis ~4,0 min à 83285,6 / LBW -47,101. Une divergence haussière 3m+15m existe dans le shadow, sans impact décisionnel autonome.

**SEQUENCE / CONVERSION / DOMINANCE.** Régime `TENSION_BALANCE`. Dominance LONG, proof 0,784, terrain conservé 0,898, mais seulement **2/4** observations persistantes. Elle est donc promue par le seuil expérimental 2/4 ; sous l'ancienne règle 3/4 ce trade n'aurait pas été admis à cet instant.

Le dernier tick micro au moment de l'entrée est cependant SHORT et très peu productif : ceci ne suffit pas à invalider l'asymétrie accumulée mais montre que la domination était déjà instable au niveau très court terme.

### DÉCISION

ELIGIBILITY : 3m aligné LONG, turning frais, dominance promue, régime non bloquant. RISK : protection 82812,5 ; risque 563,3 $ ; espace au reclaim structurel 84580 = 1204,2 $ ; **R:R 2,14**. La phase descendante avait déjà produit 1767,5 $ au mieux et conservait 1204,2 $, soit 68,1 % du meilleur déplacement ; pas de veto de maturité.

### Résultat

Sortie 2,50 min plus tard à 83346,8, P&L -0,3478 %, MFE 0, MAE 30,8 $. La dominance devient SHORT persistante (proof 0,685, 3/4) et l'exécution coupe sur dominance opposée + respiration > p90.

Point important : **la perte ne démontre pas à elle seule que 2/4 est trop permissif.** Après cette sortie, le prix produit encore un MFE contrefactuel d'environ +129 $ à H+15 et +180 $ à H+30 depuis le prix d'entrée. Le défaut observé peut donc être une combinaison timing d'entrée / régime / sortie de microstructure, pas uniquement le seuil de persistance.

## 5. Trade 2 — reassertion confirmée 3/4

### OBSERVATION

Entrée 12:09:18Z à 83483,3. E15 structurel LONG toujours actif 02:00→08:00. 15m encore `DESCENTE`, mais LBW/BW se sont nettement rapprochés de zéro : LBW -12,310, BW -15,079, MF -3,971. Le 3m est `MONTEE`, LBW +3,088, BW -15,208, MF -5,505, issu du creux E3 11:54 à 83362,5 / LBW -39,614. Turning LONG très frais, ~30 s.

Dominance LONG forte **3/4**, proof 0,857, terrain conservé 1,00 : ce trade aurait été admis sous l'ancienne règle de persistance. Régime `COMPRESSION`.

WHERE courant est `NO_VALID_LOCATION`; une mémoire RECENT_WHERE est observable mais non nécessaire à l'admission.

### DÉCISION / RISK

Protection 82812,5 ; risque 670,8 $ ; espace vers 84580 = 1096,7 $ ; **R:R 1,63**. La descente depuis 84580 avait produit 1767,5 $ au mieux et en conservait 1096,7 $, soit 62,0 %. Admission cohérente avec le contrat actuel.

### Résultat

MFE +152,1 $, MAE 20,6 $, mais sortie à +7,2 $ de translation seulement : **capture 4,73 %**. L'EXIT_EXECUTION intervient à 12:27:18Z avec dominance SHORT persistante et régime devenu HACHOIR ; P&L +0,0862 % levier.

Le faible taux de capture est un signal à surveiller sur les sorties : le moteur a correctement protégé le capital, mais a presque entièrement rendu une excursion favorable significative. Un seul cas ne justifie pas de modifier le seuil de sortie dans ce bloc.

## 6. Trade 3 — reassertion forte puis bascule E15 confirmée

### OBSERVATION

Entrée 12:56:18Z à 83495,7. La thèse structurelle connue au moment de l'entrée reste encore le leg LONG 02:00→08:00 ; le futur pivot E15 12:30 n'est pas encore confirmé comme nouveau leg opposé.

15m : `DESCENTE`, LBW -4,371, BW -3,347, MF -8,092. 3m : `MONTEE`, LBW -7,174 mais pente positive +14,395, MF **+6,070**. Turning LONG créé au même instant que l'entrée. Dominance LONG extrêmement forte **4/4**, proof 0,991, terrain conservé 1,00. Régime `TENSION_BALANCE`.

Le pivot E3 de référence reste le creux 11:54 (83362,5 / LBW -39,614). Le signal est donc une reassertion de bas timeframe à l'intérieur d'une phase 15m encore négative, pas une permission donnée par LBW seul.

### DÉCISION / RISK

R:R **1,59** : risque 683,2 $, espace au reclaim 84580 = 1084,3 $. La phase descendante conservait 61,35 % de son déplacement maximal. WHERE courant n'est pas valide ; RECENT_WHERE est descriptif.

### Résultat

MFE +122,8 $, MAE 0, sortie +82 $ après 4,51 min, P&L +0,9821 % levier, capture **66,78 %**.

À 13:00:49Z, un nouveau leg E15→E15 SHORT devient confirmé : crête 08:00 à 84580 → creux 12:30 à 83295,7. `EXIT_STRUCTURE` est donc déclenché conformément au contrat. À cet instant le MCB live 15m et 3m est déjà en remontée et la dominance micro reste LONG ; cela illustre correctement la séparation entre **structure confirmée** et **phase oscillator/live**. Le moteur n'utilise pas LBW ou le stack MA200 pour remplacer la confirmation E15.

## 7. Qualité et fraîcheur MCB

La fenêtre du bloc ne croise aucun gap causal connu. Les 301 évaluations disposent toutes de leur shadow correspondant (301/301). Les décisions d'entrée/sortie sont retrouvées dans le journal dédupliqué et les shadows à quelques millisecondes des évaluations.

Les trois entrées utilisent des valeurs MCB `source=live` :

- trade 1 : 3m 10:42 pour entrée 10:43:18 ; 15m 10:30 en formation ;
- trade 2 : 3m 12:09 pour entrée 12:09:18 ; 15m 12:00 en formation ;
- trade 3 : 3m 12:54 pour entrée 12:56:18 ; 15m 12:45 en formation.

Les pivots E15 structurels utilisés pour le contrat décisionnel sont, eux, des pivots confirmés. Le nouveau creux 12:30 n'acquiert un effet structurel qu'à sa confirmation vers 13:00, ce qui produit la sortie du trade 3. Aucun backfill du gap 23/09 n'intervient.

## 8. Refus et occasions manifestement manquées

Sur les WATCH/NO_TRADE du bloc :

- dominance non alignée/persistante : 200 occurrences ;
- turning frais absent : 148 ;
- 3m non aligné : 138 ;
- régime HACHOIR/CHOC : 73 ;
- protection trop proche : 1 ;
- refus WHERE : **0** ;
- R:R insuffisant : **0**.

### Occasion propre #1 — régime seul

10:38:48Z : LONG à 83280, tous les autres éléments sont prêts (dominance LONG 4/4 proof 0,716, 3m aligné, turning frais, R:R 2,78), mais `CHOC_COMBAT` bloque seul. Suite de prix : MFE +225 $ / MAE 0 à H+15, +276 $ / MAE 0 à H+30.

C'est une occasion manquée manifeste, mais elle appartient à **la même campagne causale que le trade 1** quelques minutes plus tard. Elle ne constitue donc pas une preuve indépendante suffisante pour desserrer immédiatement la famille régime.

### Dominance : occasions apparentes mais non convergentes

À 12:00–12:08, la dominance bloque avant le trade 2 ; le prix finira par monter et le moteur entre ensuite lorsque la preuve se renforce. À 12:33–12:36, la dominance est fortement SHORT alors qu'un rebond LONG important suivra. Il serait incorrect d'appeler cela une simple erreur de seuil : la donnée disponible à cet instant exprime réellement un camp SHORT dominant. Desserrer davantage la dominance pour exploiter le futur mouvement reviendrait à prédire contre l'observation.

### 3m / turning

Quelques fenêtres bloquées par 3m non aligné ou turning expiré développent ensuite 100–200 $ de MFE, mais plusieurs présentent aussi 60–150 $ de MAE. La distribution est mixte ; pas de preuve convergente pour toucher le TTL turning 6 min ou l'alignement 3m.

## 9. Évaluation spécifique du seuil dominance 2/4

Le seuil expérimental a promu 30 évaluations dans le bloc. **Une seule entrée réelle dépend directement de cette promotion : le trade 1.** Les trades 2 et 3 disposent respectivement de 3/4 et 4/4 et ne dépendent donc pas du desserrage.

Le trade 1 est perdant et sans MFE avant sa sortie, ce qui est un signal négatif contre 2/4. Cependant :

1. avant cette entrée, une dominance 4/4 LONG était déjà présente mais le régime CHOC_COMBAT bloquait une entrée à meilleur prix ;
2. après la sortie, le mouvement redevient favorable et produit >100 $ de MFE depuis le prix d'entrée ;
3. le bloc global reste positif ;
4. aucune autre entrée 2/4 indépendante n'est disponible pour confirmer que la promotion est systématiquement trop précoce.

Conclusion : **preuve insuffisante pour revenir à 3/4 après ce seul bloc**. Maintenir 2/4 un bloc supplémentaire est plus falsifiable que modifier déjà une deuxième fois la même famille sur un seul cas causal ambigu.

## 10. Décision pour le bloc suivant

Aucun seuil modifié.

Configuration maintenue : `V3EXP-20260924-WHERE-NOVETO-DOM2OF4-R1`.

Points prioritaires à mesurer au bloc #2 :

- nombre d'entrées dépendant réellement de la promotion 2/4 et leur MFE/MAE/P&L ;
- différence entre entrée précoce 2/4 et première admissibilité contrefactuelle 3/4 ;
- rôle du régime lorsqu'il bloque seul une campagne déjà cohérente ;
- capture après MFE significatif lors d'EXIT_EXECUTION ;
- localisation descriptive : distance depuis le dernier lieu/réaction et déplacement déjà consommé, sans jamais réintroduire de veto WHERE ;
- confirmation E15 opposée comme seule bascule structurelle.

## 11. Gouvernance et rollback

Aucun fichier de logique ou seuil n'est modifié dans cette revue, donc aucun restart n'est requis. Le passage bloc #1 → bloc #2 est une transition de journal expérimental uniquement.

Snapshot du bloc avant archivage : `archives/v3lab-three-trade-review-block1-20260924T132518Z/v3lab-experiment-block.json`.

En cas de problème de traçabilité, ce snapshot permet de restaurer l'état `reviewDue=true` du bloc #1 sans toucher au moteur de trading.
