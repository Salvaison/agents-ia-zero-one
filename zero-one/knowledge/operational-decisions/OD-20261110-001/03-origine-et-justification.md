# OD-20261110-001 — Nouveau graphe Conversion et ticker Elastic 4×15

**Demande explicite du propriétaire :** conception d'une carte graphique Conversion conforme au croquis manuscrit joint le 10 novembre 2026, complétée par une demande de conserver sans suppression tous les relevés sous le graphique.

**Autorité :** présentation du BOONO Watch privé seulement. Le ticker Elastic V494 est déjà un SHADOW; ses fractions de qualités, directions et régimes ne prennent aucune décision de trading et ne deviennent pas des probabilités de gain. Le prix et le PM3/PM5/Live demeurent issus de leurs sources de marché distinctes.

**Source primaire :** les deux messages utilisateur reproduits sans réécriture dans `01-demande-utilisateur-integrale.txt`. Le croquis apparaît dans la conversation; il n'a pas été copié en pièce jointe dans le dépôt.

**Procédure :** intervention ciblée sur `modules/config-server.js` et `modules/elastic-mini-conversion-v542.js`, en conservant toute la partie MF/Bâton/PM/qualité demandée, test client et SVG isolés, redémarrage ciblé de `config-server` et contrôle du statut des deux runners PAPER. Publication GitHub de ce seul diff + documentation. Aucun redémarrage TV/OVH, aucun changement de stratégie.

**Traçabilité :** statuts autorisé, implémenté, testé et en service enregistrés dans `events/`. Validation visuelle en navigateur authentifié encore attendue, même si la syntaxe, les rendus de test et la santé du service sont contrôlés.

