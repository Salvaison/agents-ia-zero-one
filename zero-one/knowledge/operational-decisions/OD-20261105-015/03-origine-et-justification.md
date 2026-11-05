# OD-20261105-015 — Robustesse des sprites BOONO en mode vidéo

**Origine :** signalement du propriétaire du 5 novembre 2026 : dans BOONO-TV avec la vidéo Clemens Costa, tout apparaît sauf les postures de BOONO.

**Contrôle préalable :** sur OVH, 12 PNG de postures ont répondu 200 et des tests Chromium ont confirmé que toutes les URL de sprites sont sélectionnées. En mode normal et en mode vidéo, le CSS du personnage est à z12, visible, et les PNG sont décodables. Le dysfonctionnement n'a donc pas été reproduit côté serveur ; une interaction avec le navigateur ChromeOS ou l'ordre des chargements reste une hypothèse, et non une cause démontrée.

**Intervention conservatrice :** ne pas toucher aux images validées ni à leur calibrage. Ne modifier que le mode audiovisuel opt-in pour assurer qu'une image explicite de BOONO est peinte et chargée avant le démarrage du flux MP4 ; le CSS de fond reste un fallback en cas d'erreur. Tester puis demander confirmation sur le vrai Chromebook.

**Séparation :** Aucun changement de logique de marché ni de dimension des écrans, de sprite approuvé, ni des masques alpha.
