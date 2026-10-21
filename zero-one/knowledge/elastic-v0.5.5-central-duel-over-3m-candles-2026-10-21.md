# BOONO Systems — Elastic v0.5.5 : duel central plein cadre, sans PM3 bleu

Date : 21 octobre 2026. Correction directe d'une capture utilisateur montrant : ligne PM3 bleue inutile et deux carrés minuscules plaqués sur la dernière bougie à droite. Exigence : « cette ligne bleue ? inutile ! et les carrés doivent être en milieu de graphe et occuper toute la place, nullement raccrochés au prix ».

## Correction effective

- **Conserver le vrai chart Vagues 3m** derrière (bougies OHLC, MA200, grille de prix, heures). La source reste `waveUiPriceSeries('3m')`, le moteur de dessin reste `BoonoCharts.drawPrice`.
- **Supprimer entièrement** la courbe bleue `el-pm3-trace`, son zéro, sa graduation PM3 à droite et la logique d'ancrage des carrés à `ypm(pmNow)` ou au dernier timestamp.
- Le duel est désormais **centré sur la surface de dessin** : centre horizontal = milieu de la zone entre marge gauche des prix et marge droite ; centre vertical = milieu de la zone entre haut et bas du chart. Les deux carrés restent accolés au centre ; **leur position ne dépend ni du prix BTC, ni de PM Live, ni de PM3**.
- Leur surface représente toujours les volumes initiateurs acheteur et vendeur OKX sur trois minutes. Le côté le plus grand occupe jusqu'à ~46,5 % de la largeur utile, sans dépasser 76 % de la hauteur utile ni 174 px ; les deux carrés ensemble peuvent ainsi remplir ~93 % de la largeur de la zone du graphe quand leurs efforts sont égaux. Chaque côté varie selon la racine du rapport de son volume au plus fort volume observé.
- Superposition semi-transparente (fill 21 %, bordure 80 %) pour laisser les vraies bougies visibles derrière.
- La marge droite de 47 px réservée à la graduation PM3 est réduite à 10 px afin de **redonner toute sa largeur aux bougies et aux carrés**.
- Les chiffres PM3, PM5, PM Live, efficacité, yield/P75, effort/P75, qualité et direction restent affichés en texte **au-dessus**, sans courbe bleue.
- Le service `/api/elastic-chart-3m` transmet **uniquement les bougies de Vagues** ; il ne reparcourt plus le lourd audit pour produire une courbe PM3 devenue inutilisée. Route v0.2, protégée et lecture seule.

## Réserve de sens

Cette représentation centrale met en scène **l'affrontement et l'effort relatif**, et non une valeur PM3 ou prix sur la hauteur du chart. La taille seule ne constitue pas une preuve de camp vainqueur. Les carrés restent centrés dans cette version : si l'on veut ultérieurement représenter un déplacement latéral de l'affrontement, il faudra une règle explicite fondée sur la conservation du terrain, distincte de l'ancrage à une bougie/valeur de prix. La ligne bleue et l'échelle PM3 n'ont plus de rôle graphique.

## Tests et intégrité

- Vérification DOM : deux carrés accolés au centre dans un chart de 420×268, largeur combinée >270 px pour des volumes 3/6, surfaces proportionnelles, conservation des chandeliers et de la graduation BTC, aucune courbe PM3 bleue ni graduation PM3.
- Test anti-régression : changer PM3 de +45 à −90 ne déplace **pas** les carrés ; aucune attache à la dernière bougie ; support des mêmes 3m OHLC que Vagues.
- V4.10.10, ses entrées/sorties, stop dur 120/90–220/180, anti-churn, historique Elastic et BOONO-TV **inchangés**.
- Seul le serveur d'interface `config-server` doit être rechargé. Les journaux précédents ne sont pas modifiés.

## Fichiers

`modules/elastic-observer-ui.js`, `modules/config-server.js`, `tests/v4/elastic-observer-v05.test.js`, `knowledge/version-log.md`.
