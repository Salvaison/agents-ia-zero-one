# BOONO-TV — Vidéo Canvas et postures pendant la lecture

**Date :** 6 novembre 2026
**Décision :** OD-20261106-001.
**Statut :** Correctif expérimental actif sur OVH, testé dans Chromium. **Validation sur le Chromebook utilisateur encore ouverte.** Aucun changement aux moteurs PAPER, collecteurs, masques GIMP, positions ou calibration du bureau.

## Origine et diagnostic

L’utilisateur signale que BOONO est invisible lorsque la vidéo Clemens Costa joue et réapparaît dès qu'il met le MP4 en pause. Les images de ses 12 postures ne sont pas manquantes : tous les PNG ont renvoyé HTTP 200 et les tests Chromium sur OVH affichent ces images avec et sans vidéo. Le premier correctif OD-20261105-015 (PNG DOM explicite et démarrage différé de la vidéo) n'a pas suffi sur le navigateur ChromeOS de l'utilisateur.

Le fait que le symptôme dépende de la lecture vidéo oriente vers un conflit de composition des couches vidéo native et sprites transparents ou une surcharge graphique. Aucune preuve directe du moteur graphique ChromeOS n'est disponible ; il s'agit d'une hypothèse motivée par l'observation utilisateur, et non d'une cause GPU définitivement démontrée.

## Correctif ciblé et réversible

La scène privée OVH conserve le vrai MP4 H.264 640×360/AAC et son audio, les commandes Lecture/Pause/Son/Volume, la boucle et le même emplacement derrière les fenêtres alpha. Mais pour le mode expérimental ?windowVideo=clemens, la grande couche HTML vidéo native devient invisible et les images de la vidéo sont recopiées dans un canvas 2D distinct. Les sprites de BOONO demeurent au premier plan, décodés dans le PNG DOM déjà installé. Aucune illustration ou géométrie n'est régénérée ni modifiée.

- scene/window-local-video.js : création de boonoWindowLocalCanvas (640×360) et copie des frames avec drawImage, cadence plafonnée par requestAnimationFrame à **12 images/s** par défaut ; audio reste en temps réel grâce au lecteur MP4 caché.
- scene/boono-v2.css : règle CSS locale limitant la couche native vidéo à display:none en mode canvas et laissant visible le canvas animé au même emplacement, après la première frame.
- scene/index.html : script vidéo versionné dans l'URL pour éviter la reprise du vieux code par le cache du navigateur.
- Retour immédiat au comportement antérieur pour comparaison : ajouter **&videoRender=native**.
- Si le Chromebook a besoin de davantage de marge, option **&videoFps=8**. Pour plus de fluidité après validation : **&videoFps=15** ou **&videoFps=18**.
- L'écran BOONO-TV normal, sans ?windowVideo=clemens, est inchangé et ne charge aucun MP4.

## Sauvegardes et contrôles

Sauvegarde antérieure sur OVH : /home/ubuntu/boono-tv-studio/backups/OD-20261106-001/ (window-local-video.js, boono-v2.css, boono-v2.js, index.html et projection-config.json).

**Tests Chromium OVH :**
- tests/verify-OD-20261106-001-video-canvas.js et verify-OD-20261106-001-video-canvas-final-result.json : vidéo effectivement en lecture, canvas affiché 640×360, vidéo native invisible, images de canvas évolutives (12 puis 37 frames sur environ 2,3 secondes, hashes d’image différents), **12 postures visibles** tout au long des transitions, aucun message JavaScript ni erreur de dessin, pause, reprise et activation/désactivation du son fonctionnent. Le mode ?videoRender=native restaure le lecteur vidéo direct.
- tests/verify-OD-20261106-001-canvas-cpu.js et JSON : lecture continue avec CPU normal (~44 frames sur 4,2 secondes, ~10,5 fps) et CPU ralenti artificiellement 4× (~40 frames sur 4,2 secondes, ~9,5 fps), BOONO affiché et 0 erreur. Les métriques TaskDuration du navigateur test sont ~308 ms puis ~1051 ms sur 4,2 secondes : ces chiffres ne garantissent pas la performance du Chromebook.
- Captures : OD-20261106-001-canvas-frame.jpg, canvas-all-poses.jpg, native-frame.jpg et native-all-poses.jpg.
- Node --check valide. Calibration desk/projection-config.json **strictement inchangée**, SHA-256 39922e2434c59e282d3ee64ff851c6b9def9c43a345d5c2f68cf56b87d112c2f.

## Validation encore requise

Le lien à tester est http://127.0.0.1:8310/?showcase=1&windowVideo=clemens, avec Ctrl+Maj+R. La vidéo doit défiler derrière la baie vitrée, et BOONO doit rester visible pendant sa lecture. Si le symptôme persiste, tester la cadence réduite &videoFps=8 ; comparer éventuellement au rendu natif avec &videoRender=native.

**Ne pas déclarer définitivement le bug ChromeOS corrigé** avant confirmation par l'utilisateur : le serveur OVH ne reproduit pas la composition GPU du Chromebook. La vidéo reste un test privé, sans droit de diffusion publique présumé.
