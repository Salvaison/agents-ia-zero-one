# BOONO-TV — Scène Live avec vidéo : correction des rechargements et charge Canvas (17 novembre 2026)

## Signalement utilisateur
L'onglet Scène Live affiche les rotations des postures sans la vidéo. Cliquer ensuite sur Vidéos active le clip mais l'ensemble finit par se bloquer, alors que le studio et les tunnels restent accessibles.

## Causes et constats
- `composition-tabs.js` distinguait Scène Live (`?showcase=1`) de Vidéos (`?showcase=1&windowVideo=clemens&projectionCycle=21`). Le clip n'est chargé que si `windowVideo` désigne une piste.
- Le passage entre ces deux onglets provoquait une navigation/reconstruction complète des couches de scène et du lecteur, ce qui pouvait renforcer la charge ; le gel précis du ChromeOS utilisateur n'a pas été reproduit ni attribué définitivement.
- Les modules `window-local-video.js` et `projection-cycle.js` avaient respectivement des boucles requestAnimationFrame pour leur Canvas source et leurs surfaces dérivées ; source par défaut 12 fps, projections inspectées à chaque frame.

## Implémentation OVH
- Scène Live ouvre désormais le clip privé avec les données Live : `?showcase=1&windowVideo=clemens&projectionCycle=21&videoFps=8`.
- Vidéos conserve le même compositeur et les mêmes 8 fps ; son URL comporte `mediaPanel=1`, utilisé uniquement pour la sélection d'onglet.
- Changement Live ↔ Vidéos : `history.pushState` sans rechargement, ni création de nouveau lecteur/décodeur. Le clip choisi est préservé lors des liens navigants.
- Les boucles de mise à jour des projections sont limitées à 8 Hz pour l'inspection/dessin, les changements de surface restant basés sur le temps réel de lecture.
- Les onglets d'édition restent distincts et la passerelle Android ne reçoit aucun droit d'édition.
- Fichiers modifiés : `runtime/boono-tv/scene/composition-tabs.js`, `projection-cycle.js`, `index.html`. Backups : `/home/ubuntu/boono-tv-studio/backups/OD-20261117-LIVE-VIDEO-FREEZE/`.

## Tests
- `tests/verify-live-with-video-stability-20261117.js` : passage Live ↔ Vidéos sans redémarrage du lecteur, BOONO WORKING→THINKING, vidéo jouée et 8 fps, zéro erreur JS.
- `tests/verify-live-video-long-20261117.js` : après 26,5 secondes, 199 images Canvas, vidéo avancée de 26,47 s, passage fenêtres→affiches, zéro erreur de dessin et zéro exception JS.
- Aucune modification de calibration, d'ordre PAPER, du bridge trading ni des médias originaux.

## Statut et limite
Correctif déployé et vérifié par Chromium headless côté OVH. La stabilité réelle sur Chromebook ChromeOS et les rotations sur plusieurs heures restent à valider. Ne pas affirmer qu'un gel ChromeOS est définitivement résolu sans cette validation. La vidéo tierce demeure privée.
