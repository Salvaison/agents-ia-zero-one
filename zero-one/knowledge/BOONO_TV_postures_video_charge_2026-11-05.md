# BOONO-TV — Postures visibles pendant la vidéo Clemens Costa

**Date :** nuit du 5 au 6 novembre 2026
**Décision :** OD-20261105-015
**Statut :** correctif en service sur OVH et validé dans Chromium. **Confirmation de stabilité dans le ChromeOS du propriétaire encore ouverte.**

## Signalement et diagnostic

Le propriétaire voit la vidéo de Clemens Costa, les bulles, le chat et le loft, mais pas les 12 postures de BOONO. L'anomalie n'a pas été reproduite dans Chromium côté serveur. Les 12 PNG de postures ont répondu HTTP 200 et l'inspection a trouvé dans les deux modes les bonnes images de 1200×1080, les classes de posture, le conteneur visible et le rang de profondeur z12. Tous les changements de pose fonctionnaient dans Chromium. Il serait donc incorrect d'annoncer un fichier manquant ou une panne de source certaine. Une interaction propre au rendu CSS transparent et au décodage vidéo dans le Chrome du Chromebook demeure une **hypothèse non démontrée**.

## Correction limitée au mode audiovisuel

Fichiers OVH modifiés :

- `scene/window-local-video.js` : en mode privé `?windowVideo=clemens` seulement, création d'une image DOM réelle `#boonoLocalVideoPoseArt` à l'intérieur du conteneur déjà transformé `#boonoCharacter`. Chaque changement de posture conserve la véritable URL validée calculée par `boono-v2.js`, charge et décode le PNG de manière asynchrone, puis utilise cette image comme couche de premier plan. Tant que le nouveau PNG n'est pas décodé, le rendu CSS originel reste le fallback. Les demandes concurrentes sont protégées par compteur de séquence et un échec de chargement laisse le CSS d'origine intact.
- `scene/window-local-video.js` : le MP4 privé ne démarre son transfert et sa lecture qu'après disponibilité confirmée du premier sprite de BOONO et du statut de fichier prêt côté serveur. Cela évite que le téléchargement/décodage H.264 monopolise les ressources avant le chargement du personnage. Le son reste muet au départ et contrôlé par clic.
- `scene/boono-v2.css` : uniquement en mode `local-window-video-test`, l'image DOM directe couvre exactement le canevas 1200×1080 du personnage. Une classe de préparation la rend visible et masque **uniquement** le `background-image` du même sprite après décodage réussi. Les coordonnées de posture, la perspective, les quatre masks du loft, le chat et le bureau restent inchangés.

La vidéo, le texte des bulles, la chronologie des scénarios, les sprites et la source TradingView ne sont pas modifiés. L'image DOM supplémentaire n'est **jamais créée en mode BOONO-TV normal**. Un état de diagnostic `window.BoonoTVLocalVideoTest.getStatus()` expose désormais `foregroundReady`, `foregroundStatus`, `foregroundSrc` et `videoInitialized`.

## Contrôles

Sauvegarde avant correction : `/home/ubuntu/boono-tv-studio/backups/OD-20261105-015/` (window-local-video.js, boono-v2.css, boono-v2.js, app.js et projection-config.json).

- `tests/diagnose-pose-video-load-20261105.js` et JSON : comparaison initiale du mode normal et vidéo ; dans Chromium, 12/12 images et 12/12 transitions de pose fonctionnaient déjà, et aucun fichier sprite ne manquait. Ce test confirme surtout que la cause ne pouvait pas être attribuée sans réserve à une ressource 404.
- `tests/verify-OD-20261105-015-video-pose-foreground.js` : mode normal inchangé et sans image DOM supplémentaire ; mode Clemens : premier PNG BOONO 1200×1080 chargé, décodé, affiché dans la couche explicite avant que `videoInitialized=true`. Vraie vidéo H.264 en lecture, muette, progression du temps, **12 postures successives sur 12** avec fichier PNG correspondant visible, et zéro erreur JavaScript. L'image CSS de fond est masquée uniquement après confirmation du PNG direct, le z-index demeure z12.
- Captures : `tests/OD-20261105-015-normal-after-fix.jpg` et `video-after-fix.jpg` montrent BOONO visible devant le bureau avec et sans vidéo.
- `node --check` valide, studio OVH HTTP 200, source MP4 privée inchangée.
- **Calibration inchangée**, SHA-256 `39922e2434c59e282d3ee64ff851c6b9def9c43a345d5c2f68cf56b87d112c2f`. Aucune modification aux moteurs V494/V543 PAPER ni aux collecteurs.

## À vérifier chez l'utilisateur

Actualiser complètement `http://127.0.0.1:8310/?showcase=1&windowVideo=clemens` avec Ctrl+Maj+R. Observer les postures assises et debout en alternance pendant la lecture. La réparation est conçue pour mieux tolérer un chargement concurrent et un comportement graphique ChromeOS différent, mais seule la validation sur le Chromebook confirmera que **le symptôme utilisateur** est résolu. Si BOONO reste invisible, le nouveau diagnostic `foregroundStatus` permettra de distinguer chargement et composition sans toucher aux assets approuvés.
