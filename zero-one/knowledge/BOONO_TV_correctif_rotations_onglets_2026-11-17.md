# BOONO-TV — Correctif des rotations figées par onglets (17 novembre 2026)

## Incident
Suite au déploiement des onglets de composition, l'utilisateur signale que toutes les rotations sont interrompues.

## Cause confirmée
Le module OVH `runtime/boono-tv/scene/composition-tabs.js` ajoutait `showcaseHold=1` aux liens Composition, Scénarios et Écran géant. Ce paramètre est interprété par `app.js` (`showcaseHeld`, `bubbleCastingHeld`) et `boono-v2.js` (`catHeld`) comme une pause volontaire. Il était incorrect dans une navigation ordinaire.

## Intervention
- Suppression de `showcaseHold=1` dans ces trois liens uniquement, préservation de la pause manuelle des éditeurs.
- Invalidation du cache JavaScript via `composition-tabs.js?v=20261117-rotations02` dans `index.html`.
- Backups : `/home/ubuntu/boono-tv-studio/backups/OD-20261117-ROTATIONS/`.
- Test Puppeteer `tests/verify-rotations-after-tabs-20261117.js` : menu 5 onglets, aucun URL d'onglet ne force la pause, onglet Composition en fonctionnement, posture passée automatiquement de WORKING à THINKING en 13,5 s, zéro exception JS. Test de rotation chat non attendu dans cette fenêtre (cadence potentielle 180 s), à confirmer sur un cycle complet.
- Aucune écriture vers les fichiers de calibration, les runners PAPER ni le pont TradingView.

## Remise en service utilisateur
Actualiser la page BOONO-TV, puis sélectionner à nouveau l'onglet Composition afin de remplacer l'ancienne adresse portant `showcaseHold=1`. Si une ancienne adresse était explicitement utilisée pour figer une posture, son paramètre reste volontairement honoré.
