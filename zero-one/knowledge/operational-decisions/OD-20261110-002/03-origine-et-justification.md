# OD-20261110-002 — Compactage du ticker et échelle auto pour Conversion

**Provenance :** demande du propriétaire du 10 novembre 2026 en réaction à la nouvelle carte Conversion, suite à l'OD-20261110-001. Texte utilisateur intégral dans `01-demande-utilisateur-integrale.txt`.

**Décision approuvée :** adaptation de l'interface privée BOONO Watch d'Amsterdam, sans modifier les algorithmes de trading. Les données des quatre fenêtres 15 minutes sont toujours celles du shadow Elastic V494 ; aucune autorité ajoutée. Le rendu BOONO-TV/OVH reste inchangé.

**Implémentation :** mise à jour ciblée de `modules/config-server.js` (statuts du ticker) et `modules/elastic-mini-conversion-v542.js` (projection SVG des prix, graduations transparentes, montants BTC). Le moteur n'est pas concerné.

**Justification :** l'ancienne règle de plage de prix minimale 500 $ faisait paraître de faibles oscillations presque plates ; le plafond 1 600 $ pouvait cacher une partie d'un mouvement plus ample. Le nouvel auto-cadrage affiche les extrêmes du prix effectivement observés sur l'horizon du graphique et les adapte à sa hauteur. La bande des prix ne réserve plus une grande marge opaque à gauche. Les sources de trading/PM et leurs horodatages sont inchangés.

**Statuts :** `AUTORISE / IMPLEMENTE / TESTE / MIS_EN_SERVICE` consignés dans `events/`. Validation visuelle par le propriétaire encore ouverte.

