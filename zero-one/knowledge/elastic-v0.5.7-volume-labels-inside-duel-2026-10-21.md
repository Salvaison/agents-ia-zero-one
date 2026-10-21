# BOONO Systems — Elastic v0.5.7 : BTC engagés affichés dans les deux carrés

Date : 21 octobre 2026. Demande utilisateur : écrire la quantité de BTC dans le carré des acheteurs et celui des vendeurs, en conservant le duel mobile et les bougies 3m en arrière-plan.

## Modification

- Les volumes agressifs **initiateurs** acheteur et vendeur sur les trois dernières minutes, tels que déjà calculés par le shadow depuis les trades publics OKX, apparaissent **directement au centre des carrés**.
- Sur carrés moyens et grands, chaque étiquette présente le camp (`ACHAT` / `VENTE`) et le montant précis (par exemple `115.480 BTC`). Sur carrés très étroits, seul le nombre apparaît avec précision adaptée ; les unités `BTC / 3m` figurent au-dessus et le SVG comporte une infobulle contenant le montant à plus grande précision.
- Les textes ne débordent pas : dimension de police ajustée, compression horizontale `textLength` lorsque nécessaire, min de côté 30 px, petite plaquette blanche semi-transparente à l'intérieur pour rester lisible sur les chandeliers.
- Les valeurs précédemment dupliquées au-dessus ont été remplacées par les seuls labels `ACHAT · BTC / 3m` et `VENTE · BTC / 3m`.
- Les carrés conservent leur taille relative liée au volume et leur mouvement *commun* suivant le prix net BTC 3m par rapport à l'axe fixe. Le texte est solidaire de chaque carré ; les bougies 3m et la MA200 restent celles de Vagues.
- Aucun changement des calculs de marché, de la source OKX, des décisions d'admission ni des stops de V4.10.10 ; Elastic reste `decisionImpact:false`. `config-server` seul doit être rechargé.

## Précision de lecture

Ces nombres sont des **sommes de volumes de transactions agressives initiées**, pas les positions ouvertes nettes des bulls/bears, ni une mesure directe du volume passif. Leur rapport seul ne démontre pas une supériorité du rendement d'un camp ; il faut le comparer au déplacement du prix sur la même fenêtre. À 20:41 UTC lors de la vérification, le snapshot présentait 115.4804 BTC d'achats initiateurs contre 45.3172 BTC de ventes, et +73.2 USD de déplacement BTC sur 3m, situation instantanée qui peut différer d'un épisode antérieur décrit par l'utilisateur.

## Vérifications

- Montants et unités réellement contenus dans les balises SVG `text` à l'intérieur de chacun des deux `rect` correspondants.
- Libellés adaptés à des volumes très faibles sans afficher faussement `0.00 BTC` lorsque le volume est non nul.
- Ligne fixe, déplacement gauche/droite, label `PRIX +/-X $ · 3m` et tracé 3m vérifiés, non-régression V4 complète.

Fichiers : `modules/elastic-observer-ui.js`, `tests/v4/elastic-observer-v05.test.js`, `knowledge/version-log.md`.
