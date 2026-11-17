# BOONO-TV — Navigation des ateliers par onglets (17 novembre 2026)

## Demande validée
Regrouper les différentes pages de composition BOONO-TV sous des onglets, sans détruire leurs réglages ni recouvrir la scène.

## Réalisé sur OVH
- Barre repliable « ☰ Ateliers » en haut à droite de la page, sans modifier la géométrie 1920×1080.
- Cinq liens studio : Scène Live, Vidéos, Composition/calibration, Scénarios (postures/bulles/accessoires), Écran géant (perspective).
- Deux liens seulement pour le spectateur Android via passerelle : Scène Live et Vidéos. Le service mobile bloque toujours les endpoints d'écriture.
- Pages indépendantes rechargées via leurs paramètres existants : les sauvegardes de calibration et les états des ateliers n'ont pas été réécrits.
- Code OVH : `runtime/boono-tv/scene/composition-tabs.js`, `composition-tabs.css`, deux inclusions dans `scene/index.html`. Sauvegarde avant opération : `backups/OD-20261117-BOONO-TABS/index.html`.
- Vérification automatisée Chromium : cinq onglets et deux onglets mobile, activation correcte, menus repliés et ouvrables, zéro exception JS, sortie 0. Preuve : `tests/verify-composition-tabs-20261117-result.json`.
- Le navigateur Android réel reste à vérifier visuellement par l'utilisateur. Les changements ne touchent ni les moteurs PAPER ni le pont Amsterdam.

## Statut
Implémenté et testé automatiquement sur OVH le 17 novembre 2026. Validation ergonomique utilisateur ouverte.
