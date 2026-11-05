# OD-20261105-008 — Retour de la vraie source MarketCipher TradingView et diagnostic YouTube OVH

**Origine :** demande du propriétaire du 5 novembre 2026, correction de OD-20261105-007. Il constate que le moteur maison MCB3 a été substitué au vrai MarketCipher B de TradingView sur le petit écran droit. Il annonce qu'il reprendra lui-même le masque alpha du loft et demande ce qui manque pour lire une vidéo YouTube sur OVH.

**Erreur reconnue :** le précédent choix `MCB3_COLLECTOR_SHARED_WITH_WATCH` était une interprétation non autorisée. Le vrai objectif était de rendre la capture *MarketCipher B de TradingView* identifiable, non de la remplacer par notre courbe MCB3. Le service TV possède déjà un daemon qui capture l'onglet TA `qljTf3vu` en 3 minutes sur OKX:BTCUSDT.P ; la plage temporelle de ce screenshot peut être décalée, cela doit rester honnêtement étiqueté.

**YouTube :** l'iframe du clip répond HTTP 200 mais le lecteur affiche 'This video is unavailable' sur Chromium headless OVH. Il faut distinguer une erreur de client/référent HTTP, une interdiction d'intégration, la politique de lecture automatique et les droits. La documentation YouTube indique des codes d'erreur différents ; diagnostic, pas contournement.

**Isolation :** aucune modification à la peinture du loft, à son alpha, à la calibration, aux moteurs PAPER, aux collecteurs ou à la source TradingView. Archive créée avant la correction de scène.
