# OD-20261112-010 — Retrait du quatrième panneau Conversion + 4x15

**Demande :** le propriétaire rejette explicitement la quatrième vue car elle contient trop d'informations. Ce rejet ne concerne pas la ligne de conversion PM3/PM5/PMLive déjà intégrée et validée dans la chaîne causale de l'État vivant.

**Choix technique :** restauration depuis les sauvegardes exactes OVH de l'index et du rotateur prises juste avant le quatrième panneau, et désactivation complète des assets spécifiques Conversion. Sur Amsterdam, suppression uniquement des champs, modules et appels REST 1m supplémentaires du pont de lecture boono-tv. Les moteurs PAPER et le shadow Elastic ne sont pas touchés.

**Contrôles :** SHA-256 des sauvegardes, HTML réellement servi sur OVH sans quatrième panneau, retour à 25/15/5 et 45 secondes, snapshot sans tvTicker4x15, 40 tests BOONO-TV réussis, source V5 récente, PM2 runners intacts.

**Traçabilité :** garder l'ancienne passation comme archive de la tentative rejetée avec un avertissement de statut, ajouter à OD-20261112-009 un événement de retrait sans réécrire les anciens événements, enregistrer cette décision et publier un commit ciblé.
