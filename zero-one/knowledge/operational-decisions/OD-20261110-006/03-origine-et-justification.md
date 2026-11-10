# OD-20261110-006 — Retrait du vieux Conversion/Elastic et des états Vagues redondants

**Autorisation :** deux demandes explicites successives du propriétaire le 10 novembre 2026. La première reproduit les intitulés et valeurs affichés par l'ancien Conversion plein format et l'ancien Elastic v0.5.8. La seconde étend le nettoyage à la page Vagues (« l'état vivant qui traine là »). Texte recopié dans `01-demande-utilisateur-integrale.txt`.

**Constat technique :** l'ancien renderer `renderElasticObserverV05` était réinjecté toutes les 30 s dans `loadTrades`. Il incluait l'ancien graphe et la chronologie figée V4.10.10. Il servait aussi, par héritage non nécessaire, de relais à la source du NOUVEAU mini Conversion. Dans Vagues, deux panneaux d'état redondants subsistaient, l'un visible, l'autre masqué mais calculé à chaque frame.

**Frontière :** retirer les affichages et leur activité de chargement, **pas les données historiques**. Préserver le nouveau Conversion avec le ticker 4×15, les trois graphes Vagues et les mécanismes de calcul papier/shadow. Les sources MCB3/OKX restent inchangées, sans nouvelle connexion.

**Résultat :** présentation clarifiée, dépendance du mini Converter indépendante de l'ancien renderer, tests de non-régression et redémarrage ciblé du serveur d'interface. L'utilisateur doit encore confirmer la disposition visuelle dans son navigateur.

