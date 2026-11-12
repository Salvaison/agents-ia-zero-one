# OD-20261112-009 — Quatrième vue Conversion + Elastic 4×15 dans BOONO-TV

**Autorisation :** message explicite de l'utilisateur du 12 novembre 2026 demandant un quatrième panneau dans la même identité visuelle que les Vagues.

**Interprétation :** les trois panneaux existants sont État vivant, Vagues et Trades accomplis, distincts des cinq rubriques contenues dans la première vue. Un quatrième panneau autonome Conversion 3m + ticker quatre fois quinze minutes a été ajouté au même carrousel. Les trois durées validées 25/15/5 sont conservées et 15 secondes sont retenues par analogie avec la vue Vagues pour Conversion ; ce nouveau temps reste un choix d'intégration non explicitement choisi par l'utilisateur.

**Sources et sécurité :** cours et transactions OKX déjà transmis par le pont TV, bougies MCB3 déjà utilisées par Vagues, fichiers Elastic V494 SHADOW de la même étude que BOONO Watch, volume BTC/min du provider OKX bougies 1m confirmées. La nouvelle interface n'a aucun chemin de courtage ni vote décisionnel, et n'ouvre pas de WebSocket supplémentaire. Les quatre fenêtres conservent leur provenance et leur statut de fraîcheur.

**Anomalie diagnostiquée pendant le chantier :** le ticker V494 s'est trouvé SOURCE_STALE pendant environ 18 minutes alors que la source papier V494 était DATA_DEGRADED ; le module shadow s'arrête volontairement dans ce cas. À 15h31 UTC, DATA_OK était revenu et le ticker avait repris une fraîcheur inférieure à la minute. Cette reprise est autonome, aucun runner/shadow n'a été redémarré pour la forcer.

**Frontière de modification :** section de panneau, JS/CSS autonomes et rotateur dans le runtime OVH ; un petit champ read-only ticker dans le pont Amsterdam. Le décor original et les fichiers d'éditeurs de la scène, ainsi que les moteurs V494/V543 PAPER, restent inchangés. Le patch exact du runtime est conservé.

**Validation :** capture de contrôle du panneau en Chromium 1920x1080, canvas de bougies de 434×616px, quatre cartes ticker en colonne et aucun débordement des conteneurs. Tests Node, sources asOf, source stale, minute OKX confirmée, minuterie une seule active. Contrôle visuel final du propriétaire encore ouvert.
