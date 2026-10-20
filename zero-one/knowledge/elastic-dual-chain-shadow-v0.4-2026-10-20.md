# BOONO — Elastic Sync v0.4 : deux chaînes simultanées et affichage État vivant

Date : 20 octobre 2026. Validation utilisateur : deux histoires LONG et SHORT côte à côte au-dessus de l'État vivant d'Amsterdam.

## Statut et périmètre

- **SHADOW PUR** : `decisionImpact:false`, aucune modification de l'autorité MCB, des règles d'admission, des anti-churn, de l'exécution, des sorties ou du hard-risk V4.10.7.
- Elastic v0.3 reste opérationnel pour ses statistiques ordre/latence/conversion. v0.4 est un module parallèle : `modules/v4/experiments/elastic-dual-chain-shadow.js`.
- Deux chaînes toujours construites (`long`, `short`). Même collecte, histoires séparées et concurrentes ; toutes deux persistent au fil des évaluations. Une sortie de trade ne les efface pas.
- La direction MCB15 structurelle est distinguée de la `primaryThesis` narrative expérimentale ; une proposition opposée exige une traduction PM3 et PM5 cohérente, une efficacité PM3 suffisante et des familles MCB3/MCB15/CONVERSION présentes pour produire un **transfert shadow**. Ce transfert n'est pas un signal tradable, ni une loi calibrée.
- Deux fenêtres sous le prix live, juste au-dessus de « ETAT VIVANT », dans TRADES → État V4. LONG et SHORT fixes côte à côte, bandes colorées vert / rouge, largeur desktop plus confortable, mesures et récits extensibles.

## Données suivies

1. Natif MCB : E3/E15 LIVE, confirmés, signaux opposés ; respect de `sourceTs` distinct de `firstSeenAt`.
2. MCB3 / MCB15 : lobe, trajectoire structurelle, pente LBW15 et LBW3, franchissements des deux zéros, accélération des pentes, crête ou creux 15m.
3. MF : valeurs MF3/MF15, pentes MF3/MF15, accélération, mémoire temporelle lente et tactique.
4. Conversion : PM Live, PM3, PM5, efficiency 3m/5m, Price Behavior productif ou easy travel, rapport effort/rendement ticker.
5. MA : côtés 3m et 15m, contacts/rejets candidats sur OHLC live ; ces candidats ne valent pas encore preuve confirmée de séquence cassure→retest→rejet.
6. Désaccord géométrique descriptif : signe de la pente prix3m opposé à la pente LBW3.
7. Preuves et contre-preuves captées simultanément, avec changement ACTIVE → FADED → REASSERTED et comptage des réaffirmations.

## Cycle de vie et récit

Pour chaque condition, le module conserve première observation, instant de source natif lorsqu'il existe, première présence active, dernière présence, dernière disparition et réaffirmations. Les événements de transition sont bornés (24 par chaîne) et les preuves historiques conservées bornées (64). Cela limite la mémoire dans `trade-sim-v4-state.json` et le journal.

Une condition qui est déjà vraie au démarrage est simplement notée `OBSERVED` (non prouvée « née maintenant »). Les nouveaux événements natifs enregistrent la différence entre horloge source et horloge d'observation.

La narration est **descriptive et prospective**, sans calcul de probabilité calibrée. Les seuils de synchronisation qui figurent dans le handoff sont des critères exploratoires de l'hypothèse de transfert, et ne définissent pas une nouvelle admission.

## Différences à étudier avant promotion

- Distinguer retest et rejet MA réellement confirmés, via la géométrie de plusieurs bougies plutôt qu'un seul contact intrabougie.
- Tester les transferts hypothétiques sur campagnes favorables et défavorables ; ne pas supposer la validité statistique des trois familles de preuves.
- Étendre les mesures d'accélération LBW et de divergences prix/LBW entre pivots E3/E15 et horizons 1h/4h/D/W.
- Garder une trace des épisodes complets avant la rotation des snapshots, sans saturer Amsterdam.
- Comparer aux anti-churn `CAMPAIGN_RETRY_NEEDS_NEW_15M_OR_LOCAL_REQUALIFICATION` et `THESIS_CONSUMED_WAIT_MCB_CHANGE` en replay, sans les modifier.
- V4.10.7 et v0.3 restent des références distinctes : ne pas confondre statut de preuve, handoff shadow et autorisation d'entrée.

## Tests et déploiement

`node --test tests/v4/*.test.js` : 26 tests passés lors de l'installation.
Le module possède ses tests dédiés `tests/v4/elastic-dual-chain-shadow.test.js` : double histoire, preuve réaffirmée, handoff impossible sans prix, suspension en DATA_DEGRADED.

## Fichiers touchés

- `modules/v4/experiments/elastic-dual-chain-shadow.js` (nouveau)
- `modules/v4/core/engine.js` (appel et champs observationnels uniquement)
- `modules/trade-simulator-v4.js` (sérialisation du champ)
- `modules/config-server.js` (deux fenêtres sur Etat V4)
- `tests/v4/elastic-dual-chain-shadow.test.js` (nouveau)

Aucune modification dans `boono-tv/` ou `shared/`.
