# OD-20261105-012 — Profondeur rideau, bulles et sprites

**Autorisation :** demande de l'utilisateur du 5 novembre 2026, conservée en 01.

**Diagnostic vérifié avant modification :** la règle `#room .boono-stage{z-index:6!important}` place le conteneur de toutes les bulles **derrière** `#marketCurtain` à z7 et `#pricePanel` à z8. La grande valeur z30 de `.bubble` ne pouvait pas traverser le contexte d'empilement de son parent z6. Les illustrations du bureau, des écrans, de BOONO et du chat sont aux z10–13. Le changement requis est donc local à l'autorité de profondeur du conteneur, avec préférence pour z9, sans retoucher les assets ni les positions.

**Périmètre :** BOONO-TV studio OVH, CSS uniquement. Aucun changement aux market data, aux runners, aux graphes MCB, à la calibration, aux poses ou dialogues.

**Traçabilité :** OD créée avant les modifications, étapes effectuées documentées ensuite.
