# BOONO Systems — V5 Structure vivante en tête de l'État V4

**23 octobre 2026 — Correction d'affichage et de méthode. Moteurs de trading inchangés.**

## Problème utilisateur

Le V5 PAPER a été arrêté après 22 mauvais trades. L'interface État V4 persistait à afficher son **hypothèse figée** en priorité, ce qui empêchait l'utilisateur de juger le nouvel observateur structurel. Le seul panneau V5 Structure réellement vivant se trouvait dans Vagues, et non dans l'État V4. La correction explicite de l'utilisateur : les divergences macro Daily/4h **servaient à expliquer la tentative de retournement du 22–23 octobre**, non à imposer une loi générale au moteur V5 à ce stade.

## Comportement effectivement déployé

- **TRADES → État V4** met **V5 STRUCTURE · LECTURE VIVANTE** en tête, avant le prix live et les diagnostics V4. Cette carte existe dans le HTML dès l'ouverture, **même si la grosse route /api/trades tarde**.
- Une **requête compacte GET /api/v5-structure toutes les 30s**, indépendamment de la route V4 /api/trades. La carte affiche le prix horodaté, son **âge en secondes** et une alerte si le relevé ou le MCB est ancien. Débit supplémentaire ~1–2 KiB gzip par rafraîchissement, au lieu de recopier le snapshot V4.
- Contenu pour juger le moteur : trajectoire causale 15m, contextes 1h/4h, E3, lieu de prix vs VAL/POC/VAH, frontière et son état, compte des E15/E3 **observés** sans vote double, MF15/prix 1h, PM/qualité descriptive, **deux scénarios conditionnels**, ainsi que **les quatre changements historiques récents** horodatés et les preuves/contradictions. Les informations viennent du programme `boono-v5-structure-readonly` et de ses fichiers indépendants, non d'un commentaire de l'IA.
- **L'ancien compte V5 PAPER** reste accessible **dans un panneau replié** « V5 PAPER · ARCHIVE ARRÊTÉE », qui **n'est téléchargé qu'au clic**, puis conservé en cache côté navigateur. La position PAPER ouverte à l'arrêt reste historique et figée. Les preuves E15/E3 du vieux PAPER sont affichées en heure de Stockholm, avec leur provenance UTC.
- La vue TRADES → Vagues conserve sa lecture V5 Structure et ses zones roses V5 PAPER historiques.
- **Aucun ordre/trade** V5 autorisé, et aucune modification V4, BOONO-TV ni collecteur. L'observateur `boono-v5-structure-readonly` reste indépendant, le paper `boono-v5-shadow` reste arrêté.

## Validation

- **92 tests V4/V5 réussis**, dont des tests dédiés à la lecture vivante, au rendu conditionnel, au vieux PAPER replié, à l'indépendance de la nouvelle requête et à l'affichage de la fraîcheur.
- Vérification JavaScript navigateur généré et syntaxe config-server.
- Vérification HTTP de `/api/v5-structure` et de `/api/v5` authentifiés sur le serveur de test, puis sur le serveur de production.

## Précautions de lecture

La nouvelle V5 Structure est **vivante** au sens des données réellement collectées, mais ne constitue pas encore une compréhension validée économiquement. Elle reconnaît quelques liens ; l'identité d'une campagne durable, son acceptation et ses scénarios restent des hypothèses testables. Si la chronologie Elastic manque d'événements récents, le panneau le dit ; un PM Live récent ou un E3 confirmé ne ressuscite pas une qualité Elastic périmée.

**Incident V4 distinct** : `trade-sim-v4-state.json` est resté périmé pendant plusieurs heures alors que le processus cerveau central était online. Il a été observé des erreurs `Invalid string length` sur un déclenchement de sortie. Aucun remède ou redémarrage V4 n'est revendiqué dans ce correctif UI.
