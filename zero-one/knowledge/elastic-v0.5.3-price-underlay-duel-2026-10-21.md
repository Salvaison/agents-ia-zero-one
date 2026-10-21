# BOONO Systems — Elastic v0.5.3 : superposition prix et duel de conversion

Date : 21 octobre 2026. Demande utilisateur : « superposition des deux graphes, prix et conversion, avec prix en dessous des carrés semi-transparents de conversion ». Réalisée dans le **shadow d'observation et son interface**, V4.10.10 et ses décisions inchangées.

## Décision visuelle

Le duel acheteurs/vendeurs garde ses carrés accolés et son déplacement déterminé par le **prix net observé**, non par le camp au plus fort volume. La surface de chaque carré est proportionnelle au volume acheteur/vendeur initiateur, mesuré sur le flux public OKX BTC-USDT-SWAP. Les carrés sont désormais translucides (opacité de remplissage 12 %) et superposés sur une **trajectoire de prix bleue**.

Pour respecter les coordonnées et éviter une superposition trompeuse :
- **Axe horizontal commun** : déplacement du BTC en USD depuis le premier tick de la fenêtre, de -R à +R avec R = amplitude max-min du prix observé sur ~3min.
- **Axe vertical** : progression du temps, du premier tick en bas au dernier en haut, au niveau du contact des carrés. La forme du prix est donc un **tracé temps vertical**, et non le conventionnel prix sur axe vertical/temps sur axe horizontal. Cette présentation partage exactement l'abscisse des carrés.
- La trajectoire de prix est dessinée **avant** les carrés dans le même SVG ; un trait bleu et sa bordure blanche préservent la lisibilité du prix sous les carrés. Aucune ligne synthétique n'apparaît lorsque l'historique ticks est insuffisant.
- Les trois lignes de CONVERSION (PM3, PM5, PM Live, eff3, yield, effort, qualité, direction) restent au-dessus du graphe. La vue compacte mobile 480px et l'historique repliable 6/24/48h sont conservés.

## Collecte et performance

Le simulateur conservait déjà le flux OKX public avec `ts`, `price`, `side`, `volume` dans `frame.sources.liveTicks`. Le calcul existant `buySellEffort(frame,3)` reçoit une **projection supplémentaire en mémoire seulement** :
- `priceTrail` = points `{ts,deltaUsd}` triés de l'ancien au récent ;
- compression en 30 tranches temporelles, gardant premier, dernier, minimum et maximum de chaque tranche pour préserver les extrêmes des retournements rapides ;
- au plus environ 120 points pour trois minutes, non la totalité des quelque 1 000–2 000 ticks ;
- `priceTrailAxes` décrit explicitement les deux axes.
- Aucun flux nouveau ni appel réseau, aucun changement d'ordre, de collecte ou des stops.

## Contrôles

Tests : trajectoire en arrière-plan DOM/SVG avant les carrés, opacité 0,12, échelle horizontale identique, retournement positif/négatif préservé par compression, dernier point aligné sur le contact, aucune trajectoire inventée lorsque les volumes/ticks sont insuffisants ; tests V4 complets avant déploiement.

Version de persistance `elastic-observer-shadow-v0.5` inchangée afin de ne pas réinitialiser sa mémoire ; révision affichée `transparent-price-overlay-v0.5.3`. Nouveaux champs purement descriptifs `decisionImpact:false`. Le journal causal actuel n'est pas réécrit.

## Fichiers

- `modules/v4/experiments/elastic-observer-shadow.js`
- `modules/elastic-observer-ui.js`
- `tests/v4/elastic-observer-v05.test.js`
- `knowledge/version-log.md`
