# OD-20261112-006 — Polarité propre aux événements Cross et E3/E15

**Origine :** demande explicite du propriétaire du 12 novembre 2026 de colorer les dénominations de la chaîne causale selon leurs polarités.

**Vérification des sources :** chaque événement historique est un objet distinct de tvLiving.causal, avec une direction native et un horodatage. Au premier contrôle, le 3m était SHORT et le 15m LONG ; l'observation suivante a montré une évolution de certains de ces états. Toute coloration globale aurait été trompeuse.

**Décision :** colorer chaque label à partir de la direction de son propre événement. Neutre si inconnu ou horodatage indisponible. Couleur blanche des autres libellés et codes de mouvements des valeurs conservés.

**Tests :** preuve sur des données réelles, six polarités alternées et état incomplet, CSS calculée dans Chrome, 25 tests cumulés réussis.

**Limites :** affichage OVH uniquement. Aucun changement de moteur V543 ou V494, de flux Amsterdam, d'ordres, de projections, d'éditeurs ni de cadence.
