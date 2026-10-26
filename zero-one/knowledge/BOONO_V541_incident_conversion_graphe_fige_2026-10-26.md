# BOONO Systems — Rétablissement du graphique Conversion LIVE

**Lundi 26 octobre 2026, Amsterdam, diagnostic et déploiement vers 23h CET.**

## Symptôme, cause exacte

L'utilisateur constate que le graphique de conversion (deux cubes volumes acheteurs/vendeurs, bougies prix BTC 3m, PM3/PM5/PM Live) paraît ne plus s'actualiser après la bascule V5.4.1.

Le graphique principal `modules/elastic-observer-ui.js` recevait `state.lastEvaluation.elasticObserverShadow` via le refresh du vieux panneau `/api/trades`, dont le fichier est **`data/trade-sim-v4-state.json`**. Ce producteur V4.10.10 a été arrêté volontairement lors de l'activation de V5.4. L'ancien dernier prix V4 était exactement **80 451,4 USD**. L'interface utilisait alors un WebSocket OKX pour **le label central du dernier BTC** mais non pour les volumes et le mouvement des cubes : l'illusion d'un graphique live persistait alors qu'il était figé.

Le cœur V5.4.1, les collecteurs MCB3/15 et ses métriques PM3, PM5, PM Live continuaient normalement de s'actualiser ; pas de panne générale de trading.

## Correction sans nouveau moteur ni WebSocket

- **Nouveau script navigateur purement observationnel** `modules/elastic-live-conversion-v541.js`, chargé avant `elastic-observer-ui.js` par l'interface authentifiée. Il réutilise exclusivement le WebSocket OKX `trades BTC-USDT-SWAP` déjà ouvert par `/app.js`, sans seconde souscription ni moteur d'analyse autonome.
- Traite chaque trade d'un batch OKX, avec `tradeId` dédoublonné, prix, `ts`, `side=buy/sell` et `sz` en contrats. Conversion validée dans `modules/price-stream.js` : **1 contrat BTC-USDT-SWAP = 0,01 BTC**.
- Calcule une fenêtre glissante réelle de 180 s dans le navigateur : `buyBtc`, `sellBtc`, écart agressif, `priceNetUsd` premier→dernier tick, `priceRangeUsd`, effectif, date de dernier tick, couverture temporelle. La fenêtre commence vide au chargement et devient complète **après environ trois minutes** d'observation sans interruption ; dès les premières transactions, les volumes sont affichés en mode `WARMING_3M`.
- Toutes les ~5 secondes, remplace **uniquement le composant Conversion dans son emplacement existant** et redessine son overlay et ses bougies depuis la route de prix 3m `/api/elastic-chart-3m`, déjà fonctionnelle. Le prix absolu central utilise toujours le même WebSocket, distinct de la variation 3m placée sous les cubes.
- `PM3`, `PM5`, `PM Live` sont lus des nouvelles observations `analysis.readings.conversion` du **même moteur V5.4.1 PAPER**, relayées par le polling authentifié `/api/v52` existant. Si l'analyse dépasse 65 s, ses PM deviennent indisponibles. Aucune modification des calculs PM du moteur.
- Aucun classificateur P75/P95 actuel n'est disponible en dehors de l'ancien V4 : les ratios `yieldVsP75`, `effortVsP75` et `efficiency3m` apparaissent **—** et la qualité reste `UNCLASSIFIED`, sauf `CONTESTED` lorsque PM3 et PM5 sont directement opposés. **Ne jamais réutiliser la dernière qualité V4**.
- Les blocs Elastic V4 qui restent visibles au-dessus de la chronologie sont désormais clairement étiquetés **« ARCHIVE V4.10.10 · FIGÉE »**. La Chronologie conserve l'accès aux événements historiques mais n'est pas présentée comme un nouveau moteur de décision.
- Un WebSocket silencieux pendant plus de 15 s invalide les volumes et la variation 3m affichés : pas de chiffres anciens prétendument LIVE. Le watchdog WebSocket existant gère la reconnexion. La fenêtre volume redémarre alors et se réchauffe. Le cours BTC central bénéficie toujours de son fallback V5.4.1 mais ce fallback prix ne fabrique **aucun volume par camp**.

## Vérification

- Tests de conversion live : contrat→BTC, agrégation achat/vente, doublons tradeId, fenêtre glissante 180s et réchauffement, perte de flux, PM actuel vs vieux PM V4, absence de deuxième WebSocket, prix du centre distinct du déplacement, boutons/chronologie inchangés.
- **230 tests exécutés après déploiement : 224 réussis, 0 échec, 6 replays historiques ignorés faute d'Audit ancien.**
- Scripts `config-server.js`, `elastic-observer-ui.js`, `elastic-live-conversion-v541.js` et le JS navigateur `/app.js` compilent. Routes privées HTTP 302 hors authentification, ce qui est normal.
- **Seul `config-server` a été redémarré.** V5.4.1 reste `DATA_OK` au dernier contrôle, un LONG PAPER est toujours ouvert, l'equity et le ledger sont inchangés, `brokerOrdersEnabled=false`. V4.9.3, BOONO-TV et collecteurs n'ont pas été redémarrés.
- Sauvegardes de l'ancien afficheur et du diff sous `/root/boono-conversion-display-before-20261026/`.
- **Limite de validation** : impossible d'inspecter visuellement la session authentifiée de l'utilisateur. Après Ctrl+Maj+R, le navigateur doit ouvrir son WS OKX pour recevoir les volumes ; s'il est bloqué localement, la cotation centrale peut toujours venir du fallback V5.4.1 mais les cubes afficheront « flux OKX non reçu ». Les tests et services côté Amsterdam ne prouvent pas la réception de trades dans le navigateur de l'utilisateur.

## Gouvernance

Correction d'observabilité uniquement : aucune modification des décisions V5.4.1, des admissions, sorties, floors, stop dur, ordres financés, profils de risque, ledgers, V4.9.3, de l'Execution Lab ni des échelles MarketCipher. Pas de création de nouveau shadow stratégique.
