# OD-20261105-011 — Vrai cadrage DOM du MarketCipher B

**Demande intégrale :** « Mais MCB3 est encore décentré » (5 novembre 2026), suite de OD-20261105-010.

**Cause démontrée par lecture CDP :** sur l'onglet TA TradingView qljTf3vu, source OKX BTCUSDT.P en résolution réelle 3m, le deuxième canvas pane-canvas MarketCipher B est à y404..588 (184px), x56..1248. Le daemon capture pourtant depuis la position fixe y480 jusqu'à y639, ce qui supprime le haut de la vague et inclut l'axe temporel. La stabilisation de fenêtre Chrome n'agit pas sur ces coordonnées internes.

**Choix :** déterminer le rectangle à chaque capture à partir des limites de l'indicateur TradingView, conserver le début d'une portion récente et les deux extrêmes, ajuster l'incrustation en gardant la perspective du bureau. Le moteur MCB3 de Watch demeure distinct, aucun changement du trading.

**Traçabilité :** archive initiée avant les modifications de code ; sauvegardes et preuves de tests ensuite.
