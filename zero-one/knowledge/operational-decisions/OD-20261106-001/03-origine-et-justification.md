# OD-20261106-001 — Compositing vidéo canvas pour préserver les postures sur ChromeOS

**Origine :** retour utilisateur : les postures BOONO redeviennent visibles lorsqu’il met le MP4 Clemens Costa en pause ; elles disparaissent quand il joue. Cela oriente vers le décodage/compositeur, pas un problème d’absence des PNG. Aucune preuve directe de la cause GPU ChromeOS n’est disponible.

**État :** OD-20261105-015 a ajouté un vrai PNG DOM par posture, avec démarrage de la vidéo après décodage. Tous les tests Chromium OVH ont réussi mais le symptôme persiste réellement sur ChromeOS. Notre contrôle serveur ne reproduit donc pas l’environnement utilisateur.

**Choix expérimental réversible :** faire jouer le MP4 comme source de frames, mais afficher ses images sur un canvas 2D à fréquence limitée plutôt que rendre le lecteur HTML vidéo comme couche graphique GPU. Le son/seek/pause restent attachés au MP4 natif, contrôlé par l’utilisateur, mode normal et affichage des sprites inchangés. Permettre un mode de comparaison ?videoRender=native. Le test doit être fait sur ChromeOS avant validation définitive ; aucun droit de diffusion publique présumé pour la vidéo.

**Périmètre :** studio BOONO-TV OVH uniquement, sans changer les masques du loft, les illustrations, la calibration, les moteurs PAPER et collecteurs.
