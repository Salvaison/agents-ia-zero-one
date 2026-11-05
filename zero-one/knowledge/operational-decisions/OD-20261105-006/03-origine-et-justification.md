# OD-20261105-006 — Géométrie des bulles par posture et refonte des deux écrans

**Origine :** demande du 5 novembre 2026 : bulle de type/texte, mais aussi emplacement/échelle associés à chaque posture. Correction de l'apparence de MCB3, inscription SVG Conversion et pastilles volume vers la droite.

**Enquête avant les retouches :** la cible TA dédiée TradingView qljTf3vu renvoie symbol=OKX:BTCUSDT.P, resolution=3, studies=MarketCipher DBSI + MarketCipher_B. Un screenshot complet confirme les boutons 3m et la présence de la vague MarketCipher_B. La capture publiée auparavant depuis clip x55,y425,w1195,h165 inclut une bande noire supérieure et omet le bas de la vague y>590, ce qui en déformait fortement la présentation. Des variantes recadrées sur le panneau MCB visible ont été préparées hors service pour comparaison. Aucune preuve d'une résolution 4h sur l'onglet actif au contrôle.

**Protection :** la calibration des écrans du bureau et les 12 illustrations sont déjà validées ; ne pas la modifier. Les scripts de trading V494/V543 PAPER et les collecteurs ne sont pas concernés. La position spécifique d'une bulle doit être un simple offset/scale sur sa position globale actuelle, et doit être enregistrée dans le document scénario dédié, pas dans la calibration.

**Statut initial :** décision archivée avant intervention. Les événements d'implémentation, tests et service seront saisis lorsque les actions auront réellement réussi.
