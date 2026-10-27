# BOONO Systems — 27 octobre 2026 — divergence LBW15/prix retrouvée

## Origine : observation de la capture BOONO Watch vers 12h51 CET

La capture montre plusieurs creux de prix de la matinée et un rebond au-dessus de MA200 3m, mais aucune ligne verte de divergence dans le graphe VAGUES 15m. L'utilisateur relève une divergence haussière 15m depuis ~04h30 et une reconquête MA3 qui semble se renforcer.

Les données 15m confirmées d'Amsterdam établissent :

| Bougie (début CET) | Low BTC USD | LBW15 | MF15 |
|---|---:|---:|---:|
| 04h15 | 79 611,5 | −52,18 | −23,55 |
| 05h30 | 79 607,2 | −53,85 | −16,30 |
| 07h45 | 79 553,6 | −28,64 | −21,38 |
| 08h15 | 79 580,0 | −39,26 | −20,31 |
| 11h15 | 79 477,9 | −51,07 | −17,22 |

**Divergence LBW/prix 05h30→11h15 :** le prix inscrit −129,3 USD de nouveau plus-bas, LBW15 inscrit un minimum supérieur de +2,775543. Ce n'est **pas** une hausse de MF15 sur exactement ces deux points (MF15 −16,30→−17,22). Le MF se renforce en revanche sur une période plus étendue (04h15→11h15 −23,55→−17,22) et entre deux autres pivots de prix (07h45→11h15 −21,38→−17,22). On ne compte pas ces preuves comme des votes indépendants du même indicateur.

**Pourquoi VAGUES ne traçait pas la ligne :** le module `divergence-causal-shadow-v0.7` distingue déjà pivots E15 non fusionnés et pivots structurels directeurs. Son `activeRegular15mFromStructuralAnchor` exigeait un gain LBW d'au moins **5 points** pour afficher la ligne. Le gain de 2,78 était omis. En parallèle, le reconstructeur directionnel `structural-trajectory.js` exige un sommet positif LBW15 d'au moins +10 pour séparer deux creux négatifs ; les offensives positives intermédiaires (~+4,56 / ~+4,71) ne satisfaisaient pas ce critère, donc le parent géométrique restait issu du 05h30. Ces deux limitations sont distinctes.

## Correction strictement observationnelle

1. `modules/v4/experiments/divergence-causal-shadow.js` : lorsque la divergence E15 structurelle n'atteint pas le seuil de gain LBW +5 mais qu'un nouveau plus-bas de prix d'au moins 50 USD et un gain LBW *strictement positif* sont établis avec deux extrema LBW causaux, exposer `STRUCTURAL_E15_WEAK_LBW_CANDIDATE` de statut `FORMING`. Les deux pivots sont bien confirmés, mais **l'amplitude de la divergence reste faible**. Aucun seuil d'admission/sortie n'est abaissé. La ligne diagnostique ne possède aucun pouvoir directionnel. Les bougies `_live` ne peuvent confirmer les pivots.
2. `modules/config-server.js` : le graphe VAGUES15 dessine cette relation en **pointillés verts** et faible opacité. État vivant, bloc MCB15, affiche l'ancre de prix, les deux valeurs LBW, l'heure connue et la qualité sous-référence ; mention explicite « sans autorité de trade ». Met à jour les étiquettes locales restantes V5.4.1 → V5.4.2 sans modifier l'historique des trades.
3. `modules/attention/evidence-adapters.js` : observation chronologique `MCB15_LBW_DIVERGENCE` indépendante de `MF_DIVERGENCE`, branchée sur les flux de V4.9.4 et V5.4.2.
4. `modules/attention/attention-memory.js` : conservation bornée de la divergence dans l'événement MCB15 et visibilité dans `aligned.oscillator.lbw15Divergence`. **Aucun changement** de phase, d'admission, de sortie ou de protection n'en découle seul.

La date source du second minimum LBW est **11h15 CET**. Deux bougies de confirmation 15m sont nécessaires ; la divergence est **disponible causalement à 12h00 CET**, jamais avant, même si le dessin remonte jusqu'à 11h15. La divergence MF/prix du 07h45→11h15 était déjà stockée dans la mémoire V5.4.2, mais pas montrée dans la case MCB15.

## MA3 : clarification importante

À la capture, le contrat MA3 était `ACCEPTED`, prix au-dessus, et le compteur recensait 3 retests. Le compteur est strictement informatif ; ses épisodes étaient alors `PENDING`, **pas trois retests défendus**. Lors du contrôle suivant, MA3 est repassée à `TEST_PENDING` autour de 79 836 USD, prix ~79 850 USD : l'acceptation précédente ne doit pas être présentée comme un support définitivement consolidé.

La MA15 restait autour de 80 140 USD, distante de plusieurs centaines de dollars : elle ne fait pas l'objet d'un test local et ne doit pas imposer une « reconquête » artificielle.

## Tests et exploitation

- Tests causaux : pas de signal avant la clôture de 12h00, pivots 05h30→11h15 exacts, prix −129,3, LBW +2,775543, lignes VAGUES15, aucune fuite depuis un `_live`, diffusion en mémoire sans ordre.
- Comparaison en entrée-sortie, au même snapshot, V5.4.1 vs V5.4.2 : **HOLD / HOLD_V54_STRUCTURE_CONTESTED_PROTECT** identiques avant activation.
- Suite complète V4/V5/attention : 258 cas, **246 réussis, 0 échec, 12 anciens sautés**.
- État des positions et des ledgers sauvegardé sous `/root/boono-div15-observation-20261027/` avant redémarrage ; les deux moteurs sont PAPER, financement désactivé.
- Nouvelle observation visible dans V5.4.2 et V4.9.4, sans troisième moteur et sans changer la politique de trade ni le comparateur V4.9.3 figé.

**Point de suivi :** comparer la durée de survie de cette divergence lors d'un éventuel nouveau plus-bas ou d'un retournement adverse du MF ; ne pas convertir sa présence en ordre.
