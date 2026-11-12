# OD-20261112-005 — Cinq zones fixes 20% et rotation 25s/15s/5s

**Origine :** instruction explicite de l'utilisateur du 12 novembre 2026 demandant de fixer la hauteur des cinq rubriques et de modifier les durées d'affichage des trois panneaux.

**Interprétation vérifiée dans le code :** les trois panneaux ne sont pas les cinq rubriques : ce sont state (État vivant V5), charts (Prix/MCB) et trades (Trades accomplis), pilotés auparavant à intervalle uniforme de 12 secondes dans scene/chart-views.js OVH.

**Décision :** cinq zones fixes de 180px dans la surface existante de 900px, texte long auto-scrollable dans sa propre zone sans déplacer les suivantes ; une minuterie variable par vue : 25 000, 15 000 et 5 000 ms, ordre state/charts/trades, cycle 45 000 ms. Ne pas changer la fréquence de l'observateur ni des marchés et ne pas toucher à la rotation des autres surfaces vidéo.

**Source et déploiement :** fichiers CSS et chart-views.js du runtime OVH réellement exploité, cache-bust ciblé dans l'index OVH. Cette famille de scripts chart-views.js n'était pas encore versionnée dans le dépôt Git principal ; le fichier actuel a été copié depuis OVH comme nouvelle référence technique, sans écraser la scène OVH par le vieux dépôt.

**Validation :** simulation déterministe des transitions et de la prévisualisation fixe ; mesure DOM par Chrome headless des cinq hauteurs 180px, sans débordement, sur données V5 réelles et sur fixture position PAPER ouverte ; 21 tests Node réussis. L'utilisateur conserve la validation finale de la composition globale avec les couches OVH.
