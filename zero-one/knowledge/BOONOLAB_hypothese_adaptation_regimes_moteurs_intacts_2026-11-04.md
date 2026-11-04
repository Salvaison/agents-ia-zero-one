# BOONOLAB — Stabilité des logiques et hypothèse d'adaptation aux régimes de marché

**4 novembre 2026 — décision de méthode et hypothèse à valider ou infirmer**
**Registre :** [OD-20261104-001](operational-decisions/OD-20261104-001/03-origine-et-justification.md) (message utilisateur intégral, mission opérationnelle, origine, événements).
**Statut :** MÉTHODE VALIDÉE / HYPOTHÈSE OUVERTE — aucune modification des moteurs, seuils, verrous, risques ou positions PAPER.

## 1. Décision méthodologique confirmée

Le propriétaire juge qu'à ce stade V4.9.4 (494) et V5.4.3 (543) ont montré des logiques opérationnelles **cohérentes et potentiellement rentables**, malgré certaines admissions ratées. Le marché en berne semble moins discriminant : signaux MCB contraires et changeants, conversions peu productives et nombreux faux départs. **Il décide de ne pas ajouter maintenant des seuils ni des verrous visant à supprimer rétrospectivement les mauvais résultats.** Il veut d'abord confronter **les règles actuelles, inchangées**, à plusieurs régimes distincts.

Cette décision n'est ni la preuve que les moteurs sont globalement rentables (leur P&L cumulé peut rester négatif), ni un veto permanent à toute évolution. C'est une contrainte de méthode contre le **surajustement** : une exclusion des pertes passées pourrait éliminer des campagnes gagnantes qui partageaient les mêmes caractéristiques à l'entrée.

**Ne pas toucher maintenant** à : autorité MCB15 stratégique et 3m tactique, MF/MA/PM, invalidations, gain-floors désormais subordonnés à MCB dans V543, moteurs PAPER, hard-risk, admission V494, shadows A/B/C/D et Elastic. Continuer à documenter leurs résultats sans changer de définition au milieu de l'épreuve.

## 2. Hypothèse explicite, à réfuter si les données la contredisent

> **H1 :** un même signal causal MCB/structure/PM/MF n'a pas la même valeur économique selon le régime de marché dans lequel il apparaît. Une qualification de régime **connue avant l'action** pourrait justifier des paramètres, confirmations ou règles conditionnels, améliorant **le P&L net après frais et la stabilité du risque** hors échantillon sans supprimer trop de bonnes campagnes.

**H0 concurrente :** les règles actuelles fonctionnent aussi bien ou mieux sans adaptation ; la variabilité observée provient du bruit normal et de l'échantillon, et tout dispositif de régimes/seuils introduit surtout retard, fausses abstentions, transitions artificielles ou surajustement. Aucune des deux propositions n'est présupposée vraie.

Il existe aussi une alternative entre H0 et une politique adaptative complexe : **la logique fixe peut rester identique, mais la conviction/qualité descriptive peut varier selon le contexte** ; un tel outil peut aider BOONOLAB à comprendre sans jamais bloquer un trade. Il faudra distinguer la plus-value d'**observer** le régime de la plus-value de **l'utiliser pour agir**.

## 3. Régimes à étudier sans frontières numériques imposées

| Régime descriptif hypothétique | Questions |
|---|---|
| **Directionnel productif** | MCB15 tient-il un camp, PM/effort se transforme-t-il en terrain et le prix préserve-t-il les niveaux ? |
| **Silencieux productif** | Un petit débit peut-il être accompagné d'un progrès prix/MCB durable et rentable ? Ex. V494 #58/#76. |
| **Stérile / contradictoire** | E3/E15 Live alternent-ils, les deux chaînes adverses se manifestent-elles sans prix conservé, au coût répété de frais ? |
| **Transition / inflexion émergente** | Les chaînes opposées apparaissent-elles avant une vraie nouvelle campagne ? Risque de veto excessif sur V494 #96 et V543 #161. |
| **Dégradé / qualité de données insuffisante** | Peut-on encore attribuer as-of les lectures ? Ne jamais qualifier `UNKNOWN` de régime pauvre sans preuve. |

Ces catégories sont d'abord **des hypothèses descriptives**. Elles ne constituent ni un nouveau module de décision ni un nouveau verrou. Évaluer les régimes à l'instant où le signal était connu, avec un principe de persistance pour éviter de réétiqueter chaque tick. Utiliser MCB15, événements E3, MF, tenue de territoire et qualité conversion ; le Bâton fournit **débit agressif**, pas liquidité passive de carnet (spread/profondeur non mesurés sans L2). Éviter le simple veto « week-end », `CHOP_SHADOW` ou `effort<0.25`.

## 4. Protocole expérimental et métriques qui décident

**Phase 1 — Caractérisation, moteurs PAPER inchangés.** Sur des fenêtres **as-of** et plusieurs périodes indépendantes, journaliser le régime sans lui donner autorité. Échantillonner à la fois marchés faibles, directionnels, transitionnels, et requalifications. Ne pas décider du régime en utilisant un futur MFE ou la clôture d'un trade. Réévaluer les **transitions de régime pendant une campagne** : entrée en marché faible, puis expansion; ou inverse.

**Phase 2 — Mesurer par moteur et par campagne parent E15.** Pour chaque contexte, compter admissions, absences de trade, faux départs, durée, nombre de réentrées et refus, MFE/MAE prix, distance d'invalidation et excursions, potentiel réellement conservé, **PNL net après frais**, dispersion des pertes, pire excursion/drawdown et coût du capital/exposition. Comparer le **même mouvement de marché** et non seulement des trades par ordre d'index. Les positions ouvertes sont valorisées séparément ; ne jamais les inclure comme profits réalisés.

**Phase 3 — Mettre à l'épreuve H0 et H1.** Chercher des différences **répétées et économiquement matérielles** de précision/effort-rendement/qualité de sortie selon les régimes ; distinguer les faux départs d'admission des campagnes correctes mal clôturées. Mesurer spécialement ce qu'une éventuelle abstention aurait **évité** en frais/pertes **et manqué** en gains, avec exécution simulée sur l'horloge commune et réentrées contrefactuelles. Ne pas sélectionner les seuils après avoir vu les trades à éliminer.

**Phase 4 — Éventuels scénarios adaptatifs uniquement en SHADOW, après nouvelle validation.** Comparer à une baseline congelée, observer les expositions réelles contrefactuelles, tester des périodes ultérieures jamais utilisées pour choisir les règles (walk-forward), varier légèrement les frontières de régimes pour voir la robustesse. Le gain doit être net de frais, du coût des occasions manquées et ne pas accroître excessivement les pertes. Si le régime n'est pas connu assez tôt, ou si ses classifications oscillent, une adaptation pilotée par ces états peut être moins bonne que l'actuel système.

**Critères d'infirmation :** aucune relation stable régime↔résultat, résultats dépendant de quelques grands trades, disparition de l'avantage hors échantillon, veto de bonnes campagnes silencieuses, retard d'inflexion, excès de basculements de politique, ou réduction apparente de pertes compensée par frais et opportunités manquées. Dans ce cas, **conserver les logiques actuelles** plutôt que créer un filtre artificiel.

## 5. Cas de référence pour vérification contradictoire

- **V494** : LONG #58 du 30/10 (+7,8419 $), #76 SHORT du 01/11 (+4,7429 $), #96 LONG du 04/11 (+29,7922 $) prouvent qu'un débit faible ou une phase contestée ne suffit pas pour interdire tout. Les faux départs #59–68 samedi et #95 LONG avant le véritable rebond constituent les cas opposés. Ne pas utiliser le MFE de #96 observé après l'entrée pour dessiner un seuil rétrospectif.
- **V543** : #147 LONG, #150/#153 SHORT le 02/11, #161 SHORT le 04/11 démontrent des campagnes utiles ; mais la campagne parent #158–161 cumule trois SHORTs perdants avant #161 et seulement **+8,1582 $ net** sur l'ensemble, contre **+23,0572 $** pour #161 seul. #162 LONG encore ouvert au moment du bilan du matin : marquer provisoirement, ne pas créditer.
- **Shadows** : les quatre branches A/B/C/D V494 et les forks de maintien V543 **ont des expositions et réentrées différentes** ; les comparaisons de soldes ne prouvent pas que des paramètres propres à un régime soient meilleurs. `STRUCTURAL_LEVEL_AND_TRANSFER` sur V543 #161 est un contre-exemple à toute promotion rapide de seuils : il a gardé un SHORT gagnant jusqu'à −9,6664 $ net et empêché le LONG suivant, là où PAPER avait réalisé +23,0572 $.

## 6. Gouvernance et statuts

**VALIDÉ (méthode)** : période d'observation sans modification de politique ; comparaison des moteurs inchangés sur régimes différents ; prudence vis-à-vis des seuils ciblés rétrospectifs.

**HYPOTHÈSE OUVERTE** : valeur des signaux, seuils et autorités pourrait dépendre du contexte de marché ; à vérifier ou invalider. Aucun seuil adaptatif choisi, aucun état `NO_NEW_ENTRY` promu.

**RÉALISÉ** : formulation, protocole expérimental et archive GitHub de la méthode (si push confirmé).

**NON IMPLÉMENTÉ** : classifieur de régimes doté d'autorité, nouveaux seuils adaptatifs, shadow conditionnel nouveau, filtres d'admission supplémentaires, modification des sorties.

**Règle de passation** : ne pas confondre cette hypothèse avec une autorisation de coder ou de déployer une adaptation. Toute expérimentation future en shadow ou modification PAPER demandera sa propre décision et validation explicite.
