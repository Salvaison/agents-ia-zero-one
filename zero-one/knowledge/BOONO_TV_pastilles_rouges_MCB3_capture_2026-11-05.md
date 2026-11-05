# BOONO-TV — dix grandes pastilles et capture MarketCipher 3m vérifiée

**Date :** 5 novembre 2026
**Décision :** [OD-20261105-004](operational-decisions/OD-20261105-004/03-origine-et-justification.md)
**Statut :** actif sur les VPS Amsterdam/OVH, validé par tests Chromium ; esthétique finale à confirmer par l'utilisateur. Aucune modification du code décisionnel V494/V543, de leurs runners ou de leurs données MCB.

## 1. Retour de MarketCipher au timeframe 3m

Le problème était une dérive de la cible TA TradingView : la capture `qljTf3vu` avait `actualTf=15` tandis que le programme BOONO-TV attendait 3m. L'étiquette « MarketCipher 15min » reflétait correctement la capture mais **pas le graphe souhaité**. La cible `qljTf3vu` est distincte des collecteurs 3m/15m `2AqpEMfD` : ces derniers n'ont pas été touchés.

Dans Amsterdam `zero-one/boono-tv/desk/desk-capture-daemon.js`, le programme contrôle désormais sur l'onglet TA uniquement la résolution et le symbole **réellement lus** depuis le widget : il rétablit `OKX:BTCUSDT.P` / `3` si l'utilisateur ou TradingView les a déplacés, attend le chargement puis vérifie les valeurs avant d'émettre le JPEG. La capture reste toutes les **60 secondes**. La durée maximale de session CDP a été relevée à 14,5 secondes pour intégrer la requalification, avec erreur explicite plutôt que publication mensongère si l'objectif n'est pas atteint. Les métadonnées `correctedTo3m`, `captureIsolation=TA_ONLY_3M_ENFORCED`, `provenance=TA_CHART_CAPTURE_3M_ENFORCED` permettent de distinguer une correction effective d'une capture déjà au bon timeframe.

**Effet secondaire explicite :** si une personne change manuellement la résolution du même onglet TA à 15 minutes, la capture BOONO-TV la rétablira en 3 minutes au prochain passage (au plus tard environ 60 s si le processus est opérationnel). Pour consulter librement d'autres timeframes TA sans intervention, utiliser un autre onglet indépendant ou prévoir plus tard un layout dédié à la capture. Aucun collecteur trading ne reçoit cet ordre.

## 2. Dessin indépendant des volumes à droite

Dans le seul module OVH `scene/tv-mini-conversion.js`, sans toucher au renderer Watch ou aux seuils, un panneau volume blanc de **45 unités SVG** occupe la droite du graphe. Il contient **10 pastilles de 39 × 13,6 unités**, réparties de y=3 à y=151,6 sur 156 unités : **95,3 % de la hauteur de la bande**. Pastilles actives rouges `#db2d40`, inactives blanches `#fff`, bordures noires `#101519` de 1,45 unité, coins arrondis. Leur sens et leur activation restent déterminés par les dix seuils historiques d'intensité de volume *exécuté* OKX sur la fenêtre 3m. Ne pas confondre ces volumes avec la liquidité du carnet.

## 3. Recentrement MCB3

Sur OVH `scene/boono-v2.css`, après comparaison visuelle des variantes I/II/III, le screenshot TradingView authentique est conservé **dans sa totalité horizontale**, au lieu de l'ancienne réduction à 92 % : `left:0`, `width:100%`, `top:-34px`, `height:129px`, `mix-blend-mode:screen`. Le graphe est remonté entre le titre SVG « MarketCipher B - 3min » et le texte de Chronologie sans toucher à la calibration et sans remplacer la source réelle.

## 4. Contrôles, sauvegardes et limites

- **Amsterdam backup** : `zero-one/boono-tv/backups/OD-20261105-004/` contient le daemon et son état source avant changement. **OVH backup** : `/home/ubuntu/boono-tv-studio/backups/OD-20261105-004/` contient mini-conversion, CSS, app et calibration.
- **Source initiale** : `actualTf=15`, `expectedTf=3`, `actualSymbol=OKX:BTCUSDT.P`. **Source après réparation** : `actualTf=3`, `actualSymbol=OKX:BTCUSDT.P`, `sourceMatchesDefault=true`, `correctedTo3m=true` au premier cycle, puis `correctedTo3m=false` au cycle suivant, `nextMs=60000`. Le daemon de capture et les deux moteurs PAPER sont restés online après son seul redémarrage.
- **Tests Chromium** `tests/od20261105-004-comparison.js`, `tests/verify-OD-20261105-004.js` et JSON de résultat : dix pastilles, dont le nombre de pastilles rouges égale le niveau de volume réellement fourni (exemple 4 rouges sur 10) ; largeur 39, hauteur 13,6, 95,26 % de la bande occupée ; affichage « MarketCipher B - 3min », source réelle fraîche `OKX:BTCUSDT.P`, rendu bien positionné et zéro exception JS.
- **Preuves visuelles sur OVH** : `tests/od20261105-004-MCB-close-I/II/III.jpg`, puis `tests/OD-20261105-004-final.jpg` et `tests/OD-20261105-004-close.jpg`.
- **Calibration inchangée** : SHA-256 `39922e2434c59e282d3ee64ff851c6b9def9c43a345d5c2f68cf56b87d112c2f`. Rien n'a été redessiné sur le bureau de BOONO et les 12 poses, le chat, les bulles et le trading PAPER n'ont pas été modifiés.
- **Limites** : l'affichage MarketCipher est un JPEG actualisé chaque minute ; BOONO-TV indique le timeframe réel et ne devient pas un TradingView interactif. Les seuils de volume ne prédisent pas le prix. Le centrage reste à confirmer dans le navigateur de l'utilisateur.

**Traçabilité Git :** le dépôt existant comportait déjà des modifications d'implémentation non liées, donc le commit de l'opération couvre uniquement la Knowledge Base et le dossier OD ; les fichiers techniques restent réellement actifs sur leurs serveurs, avec sauvegarde.
