# OD-20261105-004 — Volume pastilles grand format et vrai MCB 3m

**Origine :** demande utilisateur du 5 novembre 2026 après OD-20261105-003. Le texte d'origine est conservé sous 01 sans modification.

**Diagnostic avant intervention :** la capture BOONO-TV enregistrait actualTf=15, expectedTf=3, requestedTf=3, actualSymbol=OKX:BTCUSDT.P. Le titre "MarketCipher 15min" était conforme aux données réelles capturées, pas une erreur de CSS ; l'onglet TA qljTf3vu avait changé de timeframe, les collecteurs TradingView étaient sur le layout distinct 2AqpEMfD. Le daemon boono-tv/desk/desk-capture-daemon.js restait passif, avec cadence 60 s, donc ne rétablissait pas le TF désiré après dérive.

**Mandat :** une représentation BOONO-TV en 3m authentique, des pastilles rouges volumineuses dans toute la bande blanche, et une meilleure composition centrale, sans altération de la logique des moteurs ni de la calibration géométrique.

**Réserve :** si le daemon maintient l'onglet TA à 3m, signaler explicitement que les changements manuels de timeframe sur ce même onglet risquent d'être remplacés lors de la capture. Une page dédiée totalement indépendante peut être envisagée ultérieurement.

**Méthode :** archivage avant modification, sauvegardes et tests spécifiques enregistrés ensuite, traçabilité séparée décision/implémentation/test/service.
