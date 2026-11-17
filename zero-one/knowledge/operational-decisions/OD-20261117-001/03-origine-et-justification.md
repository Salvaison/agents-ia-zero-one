# OD-20261117-001 — Optimisation BOONO-TV et enquête mémoire TradingView

**Date :** 17 novembre 2026, après le contrôle hebdomadaire.
**Mandat :** l'utilisateur approuve explicitement le traitement des redessins graphiques inutiles sur BOONO-TV et la recherche du comportement mémoire anormal de TradingView. Il signale le rétablissement de Penguin Desktop Commander.
**Provenance :** `01-demande-utilisateur-integrale.txt` reproduit le message de l'utilisateur tel que reçu, y compris le journal de reconnexion et ses citations du précédent audit. `02-prompt-operationnel-integral.txt` est la mission technique rédigée par l'assistant, mise en œuvre directement au travers de Desktop Commander, non un texte dicté mot pour mot par l'utilisateur.

**État initial vérifié :** audit initial publié sous `knowledge/BOONO_Systems_audit_hebdomadaire_2026-11-17.md`, commit `b0b9df3`. `chart-views.js` sur OVH exécute `drawTrio` et `drawCompletedTrades` pour chaque snapshot même lorsque leurs vues sont masquées ; `setView` sait déjà redessiner sur activation. L'onglet TradingView 15m sur Amsterdam a été mesuré à 866 MiB de tas JavaScript à 14:xx UTC, puis ~329 MiB à 18:56 UTC après un redémarrage Chrome ; documents DOM plus nombreux sur 15m. Ces mesures ne prouvent pas une fuite mémoire permanente.

**Frontières :** correction ciblée sur `/home/ubuntu/boono-tv-studio/runtime/boono-tv/scene/chart-views.js` (et cache-bust `scene/index.html` si utile), aucune modification du trading ni des collecteurs. Enquête mémoire Amsterdam strictement en lecture seule. Relevé Penguin sans nettoyage.

**Critères de validation :** conserver 25s/15s/5s, les données Live, l'affichage des trades au retour de vue, la vidéo/loft, tester la réduction d'appels de rendu avec/sans vidéo et mesurer les régressions. Le navigateur ChromeOS du propriétaire reste un test distinct des essais Chromium headless OVH.

**Traçabilité :** enregistrer implémentation/tests/service dans les événements OD après les opérations avec preuves ; dépôt Git sale, ne publier que le rapport, les scripts/patchs ciblés et la trace de décision.
