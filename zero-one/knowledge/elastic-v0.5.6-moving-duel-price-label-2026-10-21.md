# BOONO Systems — Elastic v0.5.6 : duel mobile autour de l'axe fixe, déplacement BTC visible

Date : 21 octobre 2026. Demande : rétablir le **déplacement latéral des deux carrés** de part et d'autre de la ligne verticale au centre du graphique, et rétablir l'affichage du **prix du déplacement**.

## Réalisation

- Chandeliers 3m et MA200 issus du moteur Vagues, sans courbe bleue PM3 ni échelle PM3 dans le graphique.
- La ligne verticale pointillée de l'Elastic est désormais **l'axe fixe, de déplacement nul**, situé au centre de la zone utile (ne se déplace jamais).
- Les carrés de volume acheteur et vendeur sont accolés à un **point de contact mobile** ; ils se déplacent ensemble à droite lorsque la variation du BTC depuis le premier tick des trois dernières minutes est positive, à gauche lorsqu'elle est négative.
- La translation horizontale dépend du rapport **déplacement net BTC / amplitude BTC 3m**, borné à [-1,1]. Cela ne dépend ni de la taille des carrés, ni de PM3/PM Live, ni de la position verticale du chandelier.
- Une réserve horizontale permet de conserver les deux carrés grands sans les tronquer : taille maximale de chaque côté `min(0.365×largeur utile, 0.73×hauteur utile, 150 px)` ; excursion maxi `min(0.145×largeur utile, marge gauche restante−3px, marge droite restante−3px)`. Leur surface reste proportionnelle au volume agressif BTC de chaque camp.
- Le point de contact mobile et son déplacement sont visibles grâce à un trait de liaison sous les carrés vers la ligne centrale fixe, coloré par direction.
- Sous le graphique figure **PRIX +XX.X $ · 3m / PRIX −XX.X $ · 3m**, en couleur directionnelle, et la valeur existe dans le HTML avant même le rafraîchissement de l'API.
- Aucune valeur n'est inventée si le flux de prix ne donne pas de déplacement exploitable : label `PRIX — · 3m`.

## Précautions

- Il s'agit d'une représentation de l'**effort relatif** (taille des carrés) et du **terrain net réellement gagné par le prix** (déplacement du duo). Le déplacement n'est pas une prédiction de prix ni une mesure directe de pression passive.
- Rafraîchissement de l'interface TRADES comme auparavant ; non une animation tick par tick.
- V4.10.10, le stop dur 120/90 → 220/180, la machine de décision, les collecteurs, l'ancienne mémoire Elastic et BOONO-TV n'ont pas été modifiés.

## Tests

Tests automatisés sur le même moteur de bougies 3m que Vagues :
- +30 $ BTC sur une amplitude 50 $ : le point de contact des deux carrés se trouve à droite de l'axe fixe ;
- −30 $ BTC : il passe à gauche, sans changer taille ni position verticale des carrés ;
- PM3 retourné sans mouvement du prix : pas de mouvement géométrique ;
- étiquette PRIX +/−30.0 $ visible et colorée ; croisement des carrés conservé ; pas de ligne PM3 bleue ;
- non-régression générale V4.

Fichiers : `modules/elastic-observer-ui.js`, `modules/config-server.js`, `tests/v4/elastic-observer-v05.test.js`, `knowledge/version-log.md`.
