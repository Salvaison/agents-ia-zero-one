# OD-20261112-001 — Hiérarchie typographique État vivant BOONO-TV

**Autorisation et source :** message utilisateur du 12 novembre 2026 s'appuyant sur deux captures d'écran de l'État vivant OVH à 17:55 et 18:30 le 11 novembre. L'utilisateur demande explicitement les rubriques plus grandes, des indicateurs BW/LBW/MF/PM en bleu et la distinction gris précédent / vert-rouge nouveau selon évolution.

**Interprétation :** couleur de la deuxième valeur = variation arithmétique vis-à-vis de la première ; **ne signifie pas nécessairement LONG/SHORT**. Couleur UP/DN = sens de l'événement ou de l'offensive. Les deux sont séparées, sans modifier la causalité ou les séries de prix. Les couleurs et les polices ne créent aucune autorité PAPER.

**Fichiers en service :** OVH /home/ubuntu/boono-tv-studio/runtime/boono-tv/scene/tv-living-state.js et tv-living-state.css, seule modification de scene/index.html : cache-bust à OD20261112-001. Code versionné équivalent dans zero-one/boono-tv/scene/tv-living-state.js et .css, patch runtime de l'index dans knowledge. Le reste de la scène est expressément hors portée.

**Contrôle :** 11 tests Node passant ; test direct du panneau rendu sur un snapshot récent via l'API OVH ; deux captures headless à 1920×1080 avec CSS réelle. La première taille coupait le chapitre 4, correction validée par redistribution de la hauteur ; la dernière version garde toutes les lignes. Le message de source périmée vu sur une capture reste un symptôme temporel à surveiller, non un défaut corrigé par la présente retouche.

**Statuts :** autorisé, implémenté sur OVH, testé, livré (sans redémarrage PM2). Validation visuelle finale du propriétaire non encore fournie.
