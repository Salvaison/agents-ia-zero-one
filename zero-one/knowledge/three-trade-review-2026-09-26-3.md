# BOONO V3-LAB — Revue bloc #3 — 26 septembre 2026

Configuration : `V3EXP-20260924-WHERE-NOVETO-DOM2OF4-R1`.
Fenêtre des clôtures : 25/09 10:09:26Z → 11:28:56Z.

## Résultats

- 3 trades SHORT `STRUCTURAL_REASSERTION`.
- 1 gain / 2 pertes.
- P&L : **−1,3238 %** levier simulé.
- MFE : 248,2 $ ; MAE : 372,7 $ ; profit factor : 0,614.
- Seul gagnant : +2,1022 %, capture 80,7 % du MFE.
- Deux pertes suivantes : MFE 18,6 $ et 9,2 $, donc défaut d'admission/conversion plutôt que restitution d'un gain.

## Lecture causale

WHERE reste non-veto et n'explique aucune perte. Le troisième SHORT avait déjà consommé environ 254 $ depuis le lieu récent. Le sous-ensemble dominance directement promu 2/4 demeure négatif, mais trois campagnes sur quatre atteignent 3/4 30–150 s plus tard à prix comparable.

## Décision

`NO_THRESHOLD_CHANGE`. Le rollback 3/4 ne supprimerait pas causalement les pertes observées. Aucun second seuil n'est modifié. Les trades suivants, déjà clôturés sous la même configuration, sont transmis sans perte au bloc #4.

Backup : `archives/v3lab-review-reconcile-20260926T102655Z`.
