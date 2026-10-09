# BOONO — intervention de cohérence exceptionnelle — 22/09/2026 ~07h Paris

Autorisation explicite de Benjamin : intervention supplémentaire à la fenêtre Deep Review de 11h, motivée par la gravité du mélange phase LBW / tendance / admission et par l'absence d'admissions exploitables.

## Diagnostic causal

- [DÉMONTRÉ] wave.js transformait directement le dernier pivot LBW en droit directionnel : CRETE→DESCENTE→short, CREUX→MONTEE→long.
- [DÉMONTRÉ] risk.js consommait wave.direction comme direction de PHASE_CONTINUATION.
- [DÉMONTRÉ] action.js pouvait aussi traiter une phase LBW opposée comme invalidation structurelle d'une position.
- [ARTEFACT LOGIQUE] phase oscillateur, thèse structurelle prix et permission d'entrée étaient donc confondues.
- Replay causal des 28 derniers trades : 18 contre le dernier mouvement prix E15→E15 = -17.942% leveraged.
- Parmi les 10 trades dans le sens structurel : 8 avec <50% de meilleure translation conservée = -7.213%; 2 avec >=50% = +1.117%.
- [DÉMONTRÉ] les mauvaises réassertions anciennes utilisaient souvent un WHERE seulement mémorisé; le LONG gagnant 21/09 05:18Z avait un WHERE courant pertinent.

## Rationale falsifiable

Le dernier mouvement PRIX confirmé entre deux E15 porte la thèse structurelle. La phase LBW reste descriptive.
Une phase alignée mais ayant rendu >50% de sa meilleure translation n'autorise plus une simple continuation : elle doit être réaffirmée tactiquement.
Une réassertion exige un WHERE courant, un turning point frais <=6 min, 3m aligné et dominance persistante.
La falsification d'une thèse ne confirme jamais automatiquement la thèse opposée.

Rollback si ces règles suppriment répétitivement de bonnes continuations sans amélioration de PF/drawdown/capture, ou si elles empêchent des réassertions propres sur frontières actuelles.
## Changements implantés

- modules/v3lab/layers/wave.js — ajout structuralLeg(): direction par géométrie prix du dernier mouvement E15→E15 confirmé, avec statut ACTIVE / FALSIFIED_PRICE_LEG.
- modules/v3lab/layers/sequence.js — localisation calculée indépendamment pour LONG et SHORT via locationByDirection; la phase LBW ne monopolise plus WHERE.
- modules/v3lab/layers/risk.js — thèse structurelle prioritaire sur wave.direction; contre-thèse microstructurelle bloquée tant que la thèse prix E15 est active.
- risk.js — continuation saine si >=50% de meilleure translation conservée; sinon bascule vers STRUCTURAL_REASSERTION.
- risk.js — STRUCTURAL_REASSERTION exige 3m aligné + turning frais <=360000 ms + CURRENT_WHERE + dominance persistante + R:R + respiration/protection.
- risk.js — séparation explicite protection / thesis; protection prix n'est plus appelée invalidation de tendance.
- modules/v3lab/layers/action.js — franchissement de protection => EXIT_RISK; EXIT_STRUCTURE seulement si mouvement prix E15→E15 falsifié ou nouveau mouvement E15→E15 opposé confirmé.
- action.js — WATCH suit d'abord la thèse RISK active, pas un candidat reversal microstructurel concurrent.
- modules/trade-simulator-v3lab.js — stockage protectionPrice et entryThesis; confirmation REVERSAL utilise la structure prix quand disponible.
- tests/v3lab/coherence-regression.test.js — nouveaux tests thèse prix/LBW, contre-thèse, réassertion fraîche, CURRENT_WHERE, rétention <50%, protection vs invalidation.

## Sécurité / activation

Backup complet ciblé : archives/v3lab-pre-emergency-coherence-20260922T051546Z.
Aucune position V3 ouverte avant chaque redémarrage.
Suites validées : coherence-regression, divergence-lineage-shadow, ma200-shadow, mw-hourly-report, V2 core-contract, V2 simulator-v02-regression.
Seul cerveau-central a été redémarré; moteur-boono n'a pas été touché.
Après activation : les deux processus sont online; aucune position V3 ouverte.

## Résultat live immédiat

[DÉMONTRÉ] thèse structurelle active LONG : 81862.5 → 86340, soit +4477.5$.
À ~05:31Z, prix ~85130.4; la phase nominale LONG est trop mature et bascule correctement en STRUCTURAL_REASSERTION.
Admission refusée pour raisons locales : dominance non persistante, turning frais absent, WHERE courant absent et protection trop proche.
[DÉMONTRÉ] l'ancien overrun ne condamne plus définitivement les admissions : une nouvelle réassertion propre peut maintenant devenir éligible.

## Rollback

Restaurer wave.js, sequence.js, risk.js, action.js, trade-simulator-v3lab.js et coherence-regression.test.js depuis le backup, puis redémarrer uniquement cerveau-central hors position V3.
La Deep Review de 11h reste une fenêtre séparée et doit évaluer prospectivement cette intervention avant toute décision supplémentaire.