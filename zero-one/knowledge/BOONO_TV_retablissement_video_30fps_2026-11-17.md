# BOONO-TV — Rétablissement fluidité vidéo 30 ips (17 novembre 2026)

## Demande
L'utilisateur rejette explicitement le bridage vidéo 8 images/s introduit sans validation. Objectif : conserver la composition Live+vidéo et navigation sans reload, sans limiter artificiellement la fluidité.

## Réalisation OVH
- `runtime/boono-tv/scene/composition-tabs.js` : liens Live et Vidéos demandent `videoFps=30`, au lieu de 8.
- `window-local-video.js` : autorise le réglage 30 et le prend comme valeur par défaut. Déclenchement du Canvas à 30 ips avec tolérance 3 ms pour ne pas sauter chaque troisième RAF.
- `projection-cycle.js` : cadence de copie/contrôle des projections ramenée de 8 Hz à ~30 Hz (seuil 30 ms). Les changements de surface restent fondés sur le temps vidéo.
- `index.html` : versionnement des scripts pour invalider le cache.
- Sauvegarde : `/home/ubuntu/boono-tv-studio/backups/OD-20261117-VIDEO-FPS-RESTORE/`.
- Navigation Live ↔ Vidéos sans recharge complète préservée, calibrations non touchées.

## Vérification
Test Puppeteer `tests/verify-video-30fps-20261117.js` : 30 ips configurés, **29,9 images Canvas/s observées** après ajustement, vidéo qui progresse, rotation BOONO observée, zéro erreur de dessin, zéro exception JS. Cette mesure locale automatisée ne prouve pas la même fluidité sur le Chromebook.

## Statut
Déployé et testé sur OVH ; validation perceptuelle du Chromebook encore ouverte. Il n'y a pas d'autorisation à supprimer la vidéo ni réduire arbitrairement les fps. Aucun changement des moteurs PAPER.
