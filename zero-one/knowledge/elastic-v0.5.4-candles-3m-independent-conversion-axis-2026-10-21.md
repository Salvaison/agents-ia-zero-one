# BOONO Systems — Elastic v0.5.4 : bougies 3m de Vagues sous le duel

Date : 21 octobre 2026. Demande utilisateur : « le même graphe prix que dans Vagues derrière le graphe conversion, chacun avec leur propre échelle et des bougies 3M ». Correction de l'interprétation erronée de v0.5.3 (tracé BTC vertical avec une unique échelle commune).

## Résultat, lecture graphique

Une seule vue superposée dans la seconde bulle Elastic (première bulle des familles inchangée) :
1. **Fond prix** : vraies bougies BTC 3 minutes OHLC et MA200, issues du **même fichier / lecteur et moteur graphique que Vagues** (`waveUiPriceSeries('3m',...)` et `window.BoonoCharts.drawPrice`, thème `interface`, chandeliers, grilles et MA).
2. **Avant-plan conversion** : tracé bleu **PM3** et deux carrés de volumes acheteurs/vendeurs initiateurs autour de la dernière observation, avec remplissage à 19 % d'opacité. Les carrés sont accolés et leur **surface représente le volume buy/sell** ; le niveau de leurs centres est défini par PM3 sur sa propre échelle et non par le prix BTC.
3. **Axes** : temps horizontal commun, prix BTC **à gauche** sur ses propres graduations `USD BTC`, et conversion **à droite** en `PM3/USD`. Les deux séries n'utilisent **pas** le même axe de valeurs. L'axe vertical de prix ne subit aucune déformation pour suivre la conversion.
4. Le bloc compact 480px, les sept familles en une colonne, la chaîne de thèse et le panneau chronologique repliable 6/24/48 h sont conservés.

Le chart principal affiche une fenêtre d'environ **90 min** (soit ~30 bougies 3m), avec six minutes de marge à droite pour les éléments de conversion. C'est un rendu **réellement 3m**, pas une reconstruction à partir de ticks 30 s. Les bougies sont celles de Vagues, y compris la dernière bougie Live fournie par son CSV.

## Sources / implémentation

- Le nouveau chemin protégé `GET /api/elastic-chart-3m` dans `modules/config-server.js` réutilise `waveUiPriceSeries('3m', start, end)` pour les OHLC et le cache natif de CSV `mcb_3m.csv` et `mcb_3m_live.csv`. Les observations de l'AUDIT sont traitées pour la série PM3 roulante : écart du prix depuis la première observation d'environ trois minutes précédentes ; aucun signal d'entrée ni permission de trade ne dépend de cet endpoint.
- Le client `modules/elastic-observer-ui.js` présente un canevas de fond des chandeliers et un SVG transparent par-dessus, aux mêmes dimensions et bornes temporelles. La courbe PM3 utilise une échelle droite auto-adaptée, alors que les bougies sont calculées et graduées à gauche par `BoonoCharts.drawPrice`.
- Un fetch à chaque rafraîchissement UI de TRADES (~30 s), fenêtre limitée à ~90 min, filtre sur l'AUDIT ; pas de nouveau collecteur ni de traitement côté moteur d'admission. Les flux restent respectivement marché 3m et conversion rolling PM3.
- La courbe de prix SVG de v0.5.3, sur axe de temps **vertical**, a été retirée de la seconde bulle. On conserve le shadow `elastic-observer-shadow-v0.5` et sa persistance pour ne pas remettre à zéro les états/mémoires.

## Vérifications et limites

- Tests de composition : deux carrés de conversion translucides, véritable fonction `BoonoCharts.drawPrice` réutilisée, chandeliers 3m / MA200 source Waves, axes verticaux de prix et PM3 indépendants, axe temporel commun, fallback sans OHLC synthétiques.
- Contrôle en lecture seule sur les données d'Amsterdam : 29 bougies 3m OHLC valides sur 84 min dans la fenêtre de 90 min, y compris MA200.
- La qualification de « force » conserve une limitation : la taille des carrés décrit seulement le volume agressif d'ordres initiateurs, pas l'ensemble des liquidités passives.
- **Aucune modification de V4.10.10** (stop virtuel dur au tick OKX, admissions, TP1, protections, anti-churn ou données de l'ancienne v0.4.3).

## Fichiers

`modules/config-server.js`, `modules/elastic-observer-ui.js`, `tests/v4/elastic-observer-v05.test.js`, `knowledge/version-log.md`.
