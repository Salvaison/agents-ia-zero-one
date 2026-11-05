# OD-20261105-005 — Rétablissement tunnel et allègement de l’éditeur des bulles

**Autorisation :** les deux messages successifs de l'utilisateur, conservés intégralement en 01.

**Diagnostic avant modification :** Penguin connecté à Desktop Commander, et autossh VNC 6080 déjà actif au redémarrage ; tunnel local 8310 absent. Amsterdam possède un tunnel SSH vivant vers OVH 3091 sur sa boucle locale 8310. La clé Penguin boono-tunnel autorise les destinations 6080 et 8310. Un nouveau tunnel local 127.0.0.1:8310 → Amsterdam 8310 a été ouvert et vérifié en HTTP 200. La commande npx remote connecte Desktop Commander mais n’ouvre pas ce transfert SSH.

**Incident d’édition :** Chromebook s'est figé/planté lorsque l’utilisateur a demandé « Voir » avant sauvegarde dans le nouvel éditeur. Cause exacte du plantage ChromeOS non encore démontrée. Le mode actuel monte l’éditeur dans le loft, et l'ancien URL l'ouvre en même temps que showcase=1 ; tout cela accroît les opérations de rendu. Les touches numériques ont par ailleurs des raccourcis de changement de pose dans app.js. Retoucher uniquement les scripts clients de BOONO-TV en privilégiant une édition stable à gauche.

**Isolation :** aucun ordre, runner PAPER, collecteur MCB ni calibration homographique ne doit être modifié. Décision archivée avant changements de scène ; service SSH reconstitué avant archivage pour rétablir la disponibilité immédiate.
