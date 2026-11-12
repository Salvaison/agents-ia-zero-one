# OD-20261112-008 — Trois PM et six qualités de marché BOONOLAB dans la chaîne causale TV

**Origine :** deux messages successifs de l'utilisateur demandant d'abord la ligne PM3/PM5/PMLive, puis une qualité de marché supplémentaire après CONTESTED.

**Nomenclature soutenue par les sources :** la référence pertinente est l'étude BOONOLAB du 7 novembre, qui propose trois intensités de volume agressif horaire croisées avec productif ou improductif. Ne pas confondre cette grille avec les six qualités Elastic et le cas directionnel CONTESTED ni avec les six régimes de marché V493 basés sur le trajet du prix.

**Décision technique :** nouvelle classification SHADOW read-only sur l'heure glissante des relevés Audit, seuils historiques figés, validation de couverture/horodatage, paramètres de productivité prix calculés sans données futures. Elle est informative, non validée prospectivement et ne possède aucune autorité de trading, y compris lorsque le mot PRODUCTIF apparaît.

**Implémentation :** enrichissement tvLiving.causal.conversion à Amsterdam ; rendu compact JS/CSS OVH entre la liste des jalons et la phase structurelle ; cache-bust 008 sans modifier les autres panneaux ni les projections.

**Tests :** six classes, seuils, sources manquantes/périmées, non-anticipation, CONTESTED PM3/PM5, UI et fraîcheur du pont ; 40 tests Node. Contrôle visuel Chromium à 1920x1080 ayant conduit à corriger un débordement mineur ; cinq zones de 180px intactes.

**Limites :** calibration descriptive 1-7 novembre, prix et volumes mesurés avec des fenêtres Audit/200 trades hétérogènes déjà signalées. Reste un chantier statistique de validation walk-forward ; ne pas promouvoir ce shadow en règle PAPER.
