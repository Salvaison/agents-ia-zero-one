# BOONO-TV — Volumes BTC sur transparence, écart réduit vers Qualité, vague MCB3 complète

**Date :** 5 novembre 2026
**Décision :** [OD-20261105-003](operational-decisions/OD-20261105-003/03-origine-et-justification.md)
**Statut :** installé sur la prévisualisation OVH, vérifié dans Chromium ; confirmation esthétique de l'utilisateur à venir. **Aucune modification des moteurs PAPER, des collecteurs ou de la calibration.**

## Demande et précision de sens

La demande initiale portait sur la disparition du fond noir derrière les deux volumes BTC, tout en conservant le contour des lettres, et sur la visibilité de la vague MCB3 et de son début. Le message de correction suivant précise : **c'est la ligne des volumes BTC qui doit être rapprochée de Qualité, et non l'inverse.** Le fond noir de Qualité et sa position doivent rester inchangés.

## Retouches ciblées OVH

- `scene/desk-vector-titles.js` : dans le seul module SVG `deskConversionTextModule`, le grand `volume.backing` (ancien trait horizontal noir de largeur 18) a maintenant `stroke=none` et `stroke-width=0`. Le texte conserve son propre contour noir fin `#04141d` de largeur SVG 3,5 et les `tspan` acheteur vert/vendeur rouge à une décimale. Le `quality.backing` noir de largeur 19 reste **intact**.
- **Déplacement BTC → Qualité** : le chemin des volumes est déplacé localement de `v=0.675` à `v=0.83` dans le même quadrilatère de l'écran ; le chemin de Qualité demeure exactement sur `v=0.962`. Les deux lignes restent vectorielles et suivent automatiquement les éventuels réglages de perspective utilisateur.
- `scene/boono-v2.css` : le JPEG TradingView réel reste `1195 × 165`, mais est projeté avec `left:6%`, `width:92%`, `top:-22px`, `height:129px`, `mix-blend-mode:screen`. Le début horizontal du tracé reste inclus car aucune coupe ni transformation du fichier source n'est effectuée ; l'incrustation `screen` fusionne le noir du JPEG avec le fond de l'écran plutôt que de créer un bandeau noir opaque. L'affichage est recentré entre le titre MarketCipher et la Chronologie, qui conservent leurs paramètres.

## Contrôles

- Sauvegardes antérieures sur OVH dans `/home/ubuntu/boono-tv-studio/backups/OD-20261105-003/` : `desk-vector-titles.js`, `boono-v2.css`, `app.js` et `projection-config.json`.
- Trois variantes de projection MarketCipher ont été testées en Chromium sans changer la configuration enregistrée : `OD-20261105-003-MCB-A/B/C.jpg`. La variante A, conservant la totalité de la largeur avec bande noire neutralisée, a été retenue et appliquée en CSS.
- Capture de vérification : `/home/ubuntu/boono-tv-studio/tests/boono-od-20261105-003-final.jpg` et recadrage `boono-od-20261105-003-close.jpg`. Script `verify-OD-20261105-003.js` et JSON de résultat de même nom : texte BTC bordé, `volume.backing` désactivé et `quality.backing` conservé, mise en page MCB et source `OKX:BTCUSDT.P`, timeframe 3m, aucune erreur JavaScript.
- Test de non-régression Chronologie : `OD-20261105-003-regression.json` conserve la reconnaissance de E3 CONFIRMED UP/DN, BW_LBW_CROSS OBSERVED et l'expiration d'une observation ancienne.
- Source de capture : le JPEG provient toujours de la capture passive TA du bridge, cadence 60 s, sans redémarrer ni toucher au TradingView collecteur.
- **Calibration inchangée** : SHA-256 `39922e2434c59e282d3ee64ff851c6b9def9c43a345d5c2f68cf56b87d112c2f`. Les deux moteurs PAPER, bridge BOONO-TV et daemon de capture étaient online après l'intervention.

**Limite :** la sensation de centrage, les occlusions par le robot et la perspective du décor restent à valider sur le navigateur utilisateur ; seul le rendu de prévisualisation Chromium a été contrôlé. La variation des volumes reste réelle et dynamique, sans valeurs figées.
