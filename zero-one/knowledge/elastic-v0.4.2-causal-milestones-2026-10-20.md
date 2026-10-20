# BOONO — Elastic v0.4.2, jalons causaux de retournement

Date : 20 octobre 2026. **Extension du shadow uniquement** ; `decisionImpact:false`. Moteur actif V4.10.8 intact.

## Demande

Reconstituer le retournement de 17h00–17h15:40 Paris en intégrant la conversion PM, la détérioration des vagues LBW3/LBW15, E3 DN Live et E15 DN Live, E15 confirmé, ainsi que les événements de franchissement zéro dans les **deux chaînes** Elastic au-dessus de l'État vivant.

## Chronologie vérifiée dans l'AUDIT 30 s d'Amsterdam

- 17h00:43 : BTC ~83 236, LBW3 +48,48, LBW15 +80,44.
- 17h01:13 : DN15 Live dans la bougie source 17h00, prix ~83 182, PM Live -53,9 USD.
- 17h02:43 : DN3 Live, LBW3 +38,99, LBW15 +77,61, prix ~83 011, PM Live -67,2 USD.
- 17h10:43 : LBW3 +8,79, LBW15 +77,38.
- 17h12:13 : **franchissement zéro de LBW3**, de positif à négatif (AUDIT ~-6,68). **LBW15 ne franchit pas zéro**.
- 17h12:43 : PM Live -252,5 USD, cadence 315,5 transactions/s ; LBW3 ~-13,88, LBW15 ~+74,90 ; BTC ~82 674,5.
- 17h13:43 : BTC ~82 412,3, LBW3 -21,74, LBW15 +72,27 ; cadence ~418,4 tx/s.
- 17h14:43 : BTC ~82 171,2, LBW3 -25,91, LBW15 +69,31.
- 17h15:40 : le moteur MCB propose SHORT, E15 DN confirmé de bougie source 17h00. 17h15:43 AUDIT LBW3 ~-44, LBW15 ~+55,57. **LBW15 reste nettement positif**.

Conclusion : le retournement a été révélé progressivement, sans attendre que LBW15 franchisse zéro. Les signaux ne sont pas tous simultanés ; l'horodatage de la bougie n'est pas l'instant de connaissance par le moteur.

## Extension instrumentée

Le module `modules/v4/experiments/elastic-dual-chain-shadow.js` conserve maintenant, par direction :
- `milestones` (30 maximum), `recentMilestones` et `newMilestones` ;
- un jalon daté pour E3/E15 **Live** et **confirmé**, avec `sourceTs` de la bougie ET `observedAt` de disponibilité du moteur ;
- des jalons de démarrage/réaffirmation PM3 et PM5 productifs ainsi que des pentes LBW15/MF15 alignées ;
- `LBW3_ZERO_CROSS` et `LBW15_ZERO_CROSS` uniquement lorsque deux observations successives prouvent un changement réel de signe. « Sous zéro » n'est plus confondu avec « vient de franchir zéro ».

Les jalons s'ajoutent aux preuves actives, aux contre-preuves et aux récits v0.4 existants. Ils ne sont ni un nouveau signal de trading, ni un score probabiliste, ni une preuve prédictive validée. Les histoires LONG et SHORT persistent.

## Interface

TRADES → État V4 → fenêtres Elastic LONG et SHORT : section **JALONS CAUSAUX** (derniers cinq événements) et historique des jalons repliable. L'horodatage affiché est celui de l'observation ; les signaux natifs portent la mention « barre » pour leur horodatage source différent.

## Validation et limites

- 35 tests V4 dont les tests de franchissement LBW3 vérifié et de confirmation E15 à un horaire postérieur à celui de la bougie.
- Smoke test HTML : `ELASTIC_JALONS_UI_OK`.
- Les jalons historiques antérieurs au déploiement ne sont pas inventés rétroactivement par le shadow. Le cas 17h00–17h15 est reconstruit dans cette archive depuis l'AUDIT.
- Ne pas confondre source/observation, double-comptage des familles PM/prix ou signal confirmé/entrée rentable.
- `elastic-dual-chain-shadow-v0.4` reste l'identifiant de version top-level ; fonctionnalité ajoutée sans toucher à V4.10.8.

## Fichiers

- `modules/v4/experiments/elastic-dual-chain-shadow.js`
- `modules/config-server.js`
- `tests/v4/elastic-dual-chain-shadow.test.js`
- `knowledge/elastic-v0.4.2-causal-milestones-2026-10-20.md`
- `knowledge/version-log.md`
