# BOONO-TV — Dernier relevé Chronologie, volumes vectoriels et centrage MCB3

**Date :** 5 novembre 2026
**Décision :** [OD-20261105-002](operational-decisions/OD-20261105-002/03-origine-et-justification.md)
**Statut :** implémenté, testé et actif dans le studio OVH / bridge Amsterdam, validation esthétique finale par l'utilisateur ouverte.

## Origine et correction fonctionnelle

Le bridge BOONO-TV recherchait uniquement le dernier événement `MCB3 / BW_LBW_CROSS OBSERVED`, ce qui empêchait d'afficher un autre type d'événement plus récent, par exemple `MCB3 / E3 CONFIRMED UP`. Le flux Elastic Chronologie natif contient pourtant plusieurs familles et types de relevés : E3, E15, BW_LBW_CROSS et leurs états OBSERVED / CONFIRMED / INTERRUPTED.

Dans Amsterdam `zero-one/boono-tv/bridge.js`, une nouvelle lecture read-only `lastChronologyObservation()` sélectionne la dernière ligne exploitable du flux `data/elastic-observer-events.ndjson`, limitée aux sept familles de Chronologie existantes, avec garde-fou de fraîcheur de trois heures. La réponse `chronology.latest` fournit famille, clé, type, direction, identifiant et horodatage **interne**, jamais le texte d'affichage horodaté. L'ancien champ `chronology.mcb3BwLbwCross` subsiste pour compatibilité. Aucun événement n'est reconstruit ou inventé, aucun impact sur la politique PAPER.

Dans OVH `scene/app.js` et `scene/desk-vector-titles.js`, le bandeau inférieur utilise **`chronology.latest`** et se rafraîchit automatiquement avec chaque snapshot du bridge (cadence de publication 5 secondes pour les états). Il affiche les données authentiques : famille / événement / état, puis UP ou DN pour les signaux natifs E3/E15. Exemples testés : `MCB3 / E3 CONFIRMED UP`, `MCB3 / E3 CONFIRMED DN`, `MCB3 / BW_LBW_CROSS OBSERVED`. **Aucune date ni heure sur l'écran.** Pour un événement absent ou trop ancien, le texte est `CHRONOLOGIE —` plutôt que de conserver une affirmation périmée. Le panneau sous MarketCipher n'affiche cette ligne que lorsque la capture est réellement en 3m ; l'événement peut appartenir à l'une des sept familles de Chronologie, pas nécessairement au 3m.

## Textes SVG du panneau conversion

Le texte de volume était trop serré et illisible. Les deux nombres acheteurs et vendeurs sont désormais groupés en **un seul texte SVG indépendant de l'homographie** avec deux `tspan` colorés (vert achat, rouge vente), une décimale et séparation centrale. La qualité reste sur une seconde ligne SVG du **même groupe** `deskConversionTextModule`. La taille de la ligne de volumes est portée à 19 unités SVG et la qualité à 16 ; elles sont alignées sur les quadrilatères vivants de l'éditeur sans redessiner le bureau. Les chiffres sont issus du flux réel de trades agressifs OKX glissant 3m, jamais des valeurs fixes de démonstration.

## Centrage du MCB3

L'authentique JPEG TradingView était visuellement concentré dans les dernières lignes de son clip. Une inspection des pixels a confirmé le poids des tracés colorés principalement sur les lignes 105–155 de l'image source de 165 px. La projection à l'intérieur de l'écran droit est légèrement **remontée** (CSS top -6 px, hauteur 100 px au lieu de top 16 px, hauteur 93 px) pour centrer le tracé entre le titre SVG et la Chronologie. Ce changement affecte exclusivement la présentation : même capture, même instrument réel OKX:BTCUSDT.P, même timeframe 3m et mêmes coins homographiques.

## Tests, preuves et isolation

- Sauvegarde avant modification Amsterdam : `zero-one/boono-tv/backups/OD-20261105-002/bridge.js`. Sauvegarde OVH : `/home/ubuntu/boono-tv-studio/backups/OD-20261105-002/` (app.js, desk-vector-titles.js, boono-v2.css et calibration).
- JavaScript : `node --check` valide sur bridge.js, app.js et desk-vector-titles.js ; les serveurs de présentation et les deux moteurs PAPER restent actifs. Seul le bridge de présentation Amsterdam a été redémarré pour publier le nouveau champ.
- Test Chromium réel : `/home/ubuntu/boono-tv-studio/tests/verify-chronology-dynamic-and-vector-20261105.js` et fichier `verify-chronology-dynamic-and-vector-20261105-result.json` ; zéro erreur JavaScript. Simulation en mémoire **non publiée au bridge** : E3 CONFIRMED UP, E3 CONFIRMED DN, BW_LBW_CROSS OBSERVED, puis événement expiré, et restauration du véritable dernier relevé. Toutes les chaînes attendues ont été obtenues, aucune heure/date.
- Le groupe `deskConversionTextModule` contient exactement deux textes SVG : un pour les deux volumes avec `tspan` distincts et l'autre pour la qualité. La capture Chromium `boono-20261105-chronologie-final.jpg` montre la lisibilité obtenue et le graphe MCB recentré.
- SHA-256 du JSON de calibration inchangé : `39922e2434c59e282d3ee64ff851c6b9def9c43a345d5c2f68cf56b87d112c2f`.
- **Frontière :** aucun changement à l'évaluation V494/V543, au ticker public OKX, au collecteur TradingView, au dépôt de trades, aux scénarios des 12 poses ni aux assets validés.
- La scène reste une prévisualisation ; stabilité sur plusieurs jours et acceptation esthétique sont des contrôles distincts. En cas de source Chronologie interrompue plus de trois heures, l'écran ne doit pas prétendre présenter un relevé récent.

La présente intervention corrige seulement l'observabilité, pas une stratégie de trading.
