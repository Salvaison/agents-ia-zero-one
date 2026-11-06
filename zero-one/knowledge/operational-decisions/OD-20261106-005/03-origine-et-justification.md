# OD-20261106-005 — Éditeur des quatre coins du grand écran mural

**Demande :** l’utilisateur juge la perspective du grand écran encore inexacte et souhaite régler personnellement ses quatre coins exactement comme ceux des moniteurs du bureau. Il ne demande pas une nouvelle interprétation graphique manuelle de l’assistant.

**Situation :** le quadrilatère mural est actuellement codé en dur dans scene/projection-cycle.js : [[174,12],[757,78],[688,462],[158,610]]. La fonction quadMatrix(quad,640,360) projette correctement le Canvas vidéo. Le studio possède un éditeur technique layoutEdit=1 avec quatre poignées pour chacun des moniteurs, mais sa sauvegarde vise desk/projection-config.json, déjà validé et à préserver.

**Choix :** un éditeur mural dédié, accessible directement et par le bouton de l’éditeur technique, quatre poignées visibles sur la scène, vidéo en cours de lecture, sauvegarde dans desk/grand-screen-config.json séparé, validation géométrique et contrôle d’origine. Le dernier quad existant devient la valeur initiale sans changement de rendu avant l’action de l’utilisateur. Pas de modification des deux moniteurs ni des règles de couches déjà validées. Le propriétaire est l'autorité finale pour les perspectives.

**Limite :** Penguin apparaît hors ligne dans Desktop Commander ; le site OVH peut être vérifié en Chromium sur serveur, l’accès sur le Chromebook doit être confirmé par l’utilisateur.
