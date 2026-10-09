# V3-LAB — WHERE descriptif, non-veto — 24/09/2026

## Décision activée
Benjamin valide le rapport du 24/09 et son exécution. WHERE conserve la localisation, la compatibilité directionnelle, la mémoire et les mesures de qualité, mais ne bloque plus seul une admission.

## Modification unique du bloc
- retrait de `locationReady` dans `entryAllowed`;
- retrait de `CURRENT_WHERE` dans la readiness de `STRUCTURAL_REASSERTION`;
- ajout explicite de `eligibility.location.decisionImpact=false`;
- messages ACTION corrigés : WHERE est descriptif;
- MCB, structure E15, turning frais, nested3m, dominance, régime, R:R, protection et maturité inchangés.

## Preuve avant activation
Replay causal 24 h : 2 campagnes supplémentaires seulement.
- LONG 23/09 11:45:51Z : MFE/MAE 15 min +116,5/0,0 USD.
- SHORT 24/09 08:15:23Z : MFE/MAE 15 min +557,4/61,2 USD ; MFE 60 min +1 130,1 USD.

## Validation
Syntaxe risk/action OK. Suites V3 coherence, divergence lineage, MA200, MW, stockage rotatif et suites V2 passées, exit 0. Activation hors position ; redémarrage du seul `cerveau-central`.

## Bloc expérimental
Bloc `where-nonveto-20260924T102601Z` actif. Revue après 3 trades V3 clôturés. Aucune autre famille de seuils ne change avant cette revue.

## Rollback
Restaurer `modules/v3lab/layers/risk.js`, `action.js` et le test depuis `archives/v3lab-pre-where-nonveto-20260924T102300Z`, puis redémarrer uniquement `cerveau-central` hors position.
