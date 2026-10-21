# BOONO Systems — Elastic v0.5.1 : duel mouvant, conviction explicite, chronologie sur demande

Date : 21 octobre 2026. **Révision du shadow Elastic et de son affichage uniquement**, sans effet sur les entrées, sorties, stops (V4.10.10), anti-churn ni décisions. Ancien v0.4.3 conservé pour audit.

## Validation de l'utilisateur

- Duel inspiré du tir à la corde : **deux carrés accolés au point de confrontation**, chacun de part et d'autre ; ils **se déplacent ensemble** vers le camp qui conserve du terrain en prix, **indépendamment de leur taille/volume**. Volume par camp = surface du carré.
- Ligne pointillée verticale **fixe** = axe initial. Au sommet de cette ligne apparaît le dernier événement du journal ; au bas le déplacement net du **prix**. L'abscisse de contact mobile est une représentation normalisée à l'amplitude du prix sur 3m, non une prédiction ni un bilan de forces.
- Chronologie repliable (fermée par défaut), ouverte sur clic, choix 6/24/48h, chargement **par pages de 120** avec « afficher plus anciens » et filtre facultatif par famille. Sa lecture et son défilement restent stables lors du rafraîchissement État V4 (30 s).
- En-tête enrichi : MCB propose, trajectoire MCB15, prix, **conviction qualifiée par le ticker** (status, jamais pourcentage inventé), et **PM Live** en évidence ; PM3/PM5 qualifient la continuité.
- Aucune admission supplémentaire n'est autorisée : **MCB crée la thèse** ; le flux PM Live est le premier **témoin de traduction du prix**, et la conversion PM cumulée depuis le setup, PM3/PM5 et l'efficacité restent les critères actuels d'entrée. Les preuves E3/E15/MF/PM peuvent apparaître dans différents ordres ; il ne faut pas imposer une séquence temporelle fixe.

## Preuve de foisonnement avant correction

Inspection à ~20h16 heure de Paris : 510 événements en 170 min (~3/min), environ 198 Ko. Répartition : **421 événements CONVERSION**, 66 MCB3, 21 MCB15, 2 MA. Le code émettait **deux événements** pour chaque changement de qualité de conversion (`INTERRUPTED` puis `OBSERVED` ou `RESTORED`).
Dans v0.5.1, **une transition de qualité produit un seul événement** `TRANSITION` contenant explicitement qualité précédente et suivante. L'historique déjà enregistré **reste intact** : il peut contenir l'ancienne structure doublonnée avant l'activation, sans réécriture trompeuse du passé. Les changements réels de classe encore rapides restent légitimement observables ; leur réduction statistique/épisodique demandera d'autres tests.

## Données et graphe

Le flux OKX public BTC-USDT-SWAP fournit prix et volume avec sens initiateur (buy/sell). Fenêtre 3m :
- carré achat et carré vente **se touchent** en permanence au point de contact ;
- taille de chaque côté = racine de la proportion de volume agressif de ce côté, afin que sa surface soit proportionnelle au volume ; le plus gros carré ne détermine **jamais la position** ;
- translation signée du point de contact = déplacement BTC `net3mUsd` normalisé par l'amplitude (`maxPrice - minPrice`) du prix sur les mêmes ticks ; plafonnement au cadre graphique ;
- dernier événement stocké `elasticObserverShadow.lastEvent` affiché au sommet de l'axe ; changement net du prix affiché au pied de l'axe.
L'animation n'est **pas** une mesure des ordres passifs, du véritable déséquilibre net du marché ni une force directement traduisible en prix. Aucune notionnelle quantité acheteurs/vendeurs n'est fabriquée depuis `effortVsP75`.

## Chronologie et performance

L'API `/api/elastic-history?hours=6|24|48&limit=120&beforeId=...&family=...` retourne une page à la fois, avec `hasMore`, `nextBeforeId`, `totalInWindow`. Les événements sont ordonnés **par id monotone** avant pagination pour préserver l'ordre entre événements de la même seconde. Le stockage existant est un journal NDJSON rotatif, jusqu'à 8Mo×33 segments, et non un archivage illimité.

Le panneau ne demande aucune page tant qu'il est fermé ; les pages suivantes sont chargées uniquement à la demande. Les 48 heures ne sont donc **pas** toutes rendues dans le navigateur en une seule fois.

## Conviction et autorité du PM

La vue `conviction` expose : statut ticker, qualification ticker confirmée/non confirmée, direction PM Live, concordance PM Live–candidature MCB, cohérence PM3/PM5, libellé descriptif. **Il ne s'agit pas d'un score probabiliste** et ce champ reste `decisionImpact:false`.
La logique d'admission V4 n'est **pas modifiée** : le ticker n'est pas un veto, la conversion fraîche depuis le setup et son efficacité sont déterminantes.

## Validation

Tests réels en lecture seule : ancien journal parcouru par pagination (548 événements en cinq pages), absence de doublons après tri par id. Tests des carrés accolés (prix positif déplace l'ensemble à droite même si le volume vendeur est supérieur, et inversement), du dernier événement sur l'axe, du chargement uniquement quand la chronologie est ouverte, de la pagination historique, de l'affichage de conviction, et de la transition unique.
La V4 active reste `v4.10.10-hard-stream-gain-floor-20261021`, aucun changement de règles de risque/trading.

## Fichiers

- `modules/v4/experiments/elastic-observer-shadow.js` : `lastEvent`, conviction descriptive, flux effort/range, transitions uniques.
- `modules/elastic-observer-ui.js` : duel accolée et mouvant, ligne centrale/dernier événement/prix, en-tête conviction, chronologie repliable et pagination.
- `modules/config-server.js` : API pagination 6/24/48 par identifiant + filtres, styles.
- `tests/v4/elastic-observer-v05.test.js` : non-régression.
- `knowledge/version-log.md`.
