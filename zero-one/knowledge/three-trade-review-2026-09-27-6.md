# V3-LAB — Revue 3 trades #6 — 27/09/2026

Configuration : `V3EXP-20260924-WHERE-NOVETO-DOM2OF4-R1`.
Bloc : 3 trades, 0 gain / 3 pertes, **−3,9159 %** levier simulé.
MFE cumulé : **75,0 $** ; MAE cumulé : **345,1 $** ; capture positive : nulle ; PF : 0.

- LONG 83 961,8→83 931,6 : −0,3597 %, MFE 46,6 $, MAE 30,8 $, dominance promue 2/4.
- SHORT 84 010,8→84 133,6 : −1,4617 %, MFE 28,3 $, MAE 122,9 $, dominance promue 2/4.
- LONG 84 077,4→83 901,3 : −2,0945 %, MFE 0,1 $, MAE 191,4 $, dominance 4/4.

Les deux admissions 2/4 auraient atteint 3/4 respectivement 30 s et 150 s plus tard, à prix proche, avant les mêmes sorties perdantes. Un rollback 3/4 n'aurait donc pas supprimé ces campagnes.
La troisième perte passe avec R/R 1,035, rétention 0,509 et interaction sous MA200 15m résistante ; un seul cas ne justifie pas encore un seuil plus strict.

WHERE reste descriptif/non-veto. La cohérence directionnelle avec le dernier leg E15 est conservée.
Verdict : **NO_THRESHOLD_CHANGE**. Aucun seuil, moteur ou responsabilité de module modifié.
Rollback du suivi : restaurer `archives/v3lab-review-reconcile-20260927T103829Z/v3lab-experiment-block.json`.
