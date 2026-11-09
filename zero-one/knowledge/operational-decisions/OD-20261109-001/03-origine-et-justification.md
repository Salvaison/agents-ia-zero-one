# OD-20261109-001 — Capture TA initialisée une seule fois en 3 minutes

**Origine datée :** conversation de maintenance BOONO Systems, lundi 9 novembre 2026. Message original accompagné d'une capture d'écran TradingView (image non versée au dépôt), puis précision explicite du propriétaire. Les deux textes complets figurent dans 01, dans l'ordre ; la ligne `---` sépare les deux messages et ne fait partie d'aucun message utilisateur. **Le prompt 02 est rédigé par l'assistant et exécuté directement via Remote Desktop Commander ; ce n'est pas un texte dicté mot pour mot par l'utilisateur ni un prompt remis à un agent externe.**

**Décision utilisateur explicite :** conserver le retour en 3 minutes après lancement/restart de Chrome, puis autoriser les changements manuels 15m/1h/4h sans retour forcé à 3m toutes les minutes. Conserver le cadrage réel MarketCipher et la capture à 60 secondes.

**État prouvé avant changement :** `desk-capture-daemon.js` exécuté par PM2 sur Amsterdam, ciblant uniquement le layout TA `qljTf3vu`. À chaque `cdpShot`, le code `setSymbol(OKX:BTCUSDT.P)` puis `setResolution('3')` si nécessaire, avant la capture. Cadence `NORMAL_MS=ROLLOVER_MS=60000` et recadrage DOM au panneau MarketCipher. Les collecteurs 3m/15m utilisent un autre layout `2AqpEMfD`. Le rapport OD-20261105-004 avait documenté l'effet secondaire de la réinitialisation toutes les minutes.

**Solution limitée choisie :** garder le bootstrap TA 3m par identité de tab (nouvelle cible CDP), avec marqueur d'initialisation hors Git permettant de distinguer un redémarrage de Chromium d'un simple redémarrage de PM2. Les autres captures sont strictement passives : observation TF/symbole et JPEG du pane sans changement de résolution. En cas d'onglet nouveau non encore initialisé, le premier cycle l'amène en 3m. Pas d'opération graphique sur les captures collector.

**Précautions :** copie de l'état exécuté et du fichier `state.json` dans `boono-tv/backups/OD-20261109-001/`; préserver les modifications existantes non commitées et tous les autres fichiers. Les tests automatisés ne valent pas validation par le propriétaire.

**Mises en service/tests :** journalisés dans `events/` après exécution ; ne pas attribuer une validation navigateur qui n'a pas eu lieu.
