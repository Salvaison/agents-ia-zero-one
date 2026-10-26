# BOONO Systems — Incident LIVE prix figé à 80 451,4 $ sur Vagues et en-tête

Date : lundi 26 octobre 2026, Amsterdam. Modification exclusivement de l'interface, aucun changement de stratégie/position/risque.

## Incident confirmé
L'utilisateur voit la ligne pointillée bleue du graphique Prix et le prix en-tête immobilisés à **80 451,4 $**, alors que le marché continue.

L'API `/api/wave-live` utilisait à tort `waveUiCompactEval(livingEval)`, dérivé de `data/trade-sim-v4-state.json`. Ce fichier a cessé de se mettre à jour quand V4.10.10 a été arrêté, mais était présenté comme LIVE. Dernier prix réel du fichier : **80 451,4 $**, exactement le nombre signalé par l'utilisateur.

En parallèle, le compte `data/v52-paper-state.json` du moteur principal V5.4 continue de recevoir les prix OKX avec qualité `DATA_OK`, et les collecteurs MCB3/15 continuent de fonctionner. À 16h32, l'analyse V5.4 donne environ 80 570 $, distinct de l'archive V4.

Le navigateur possédait déjà un WebSocket public OKX `trades BTC-USDT-SWAP`, mais sa mise à jour concernait la carte de prix et l'observateur Elastic ; elle ne redessinait pas la ligne du graphique Prix. De plus, le navigateur n'avait pas de watchdog pour le cas WebSocket OPEN resté silencieux : un ancien chiffre pouvait continuer à paraître frais à l'écran.

## Correction appliquée (lecture seule)
- **`modules/config-server.js`** : le serveur `/api/wave-live` construit maintenant `liveState` à partir de la V5.4 active et de `latestAnalysis.asOf/price`. Si V5.4 n'est plus assez frais (25 s), il peut afficher un relevé Audit récent (65 s) explicitement étiqueté `RELEVÉ`, jamais le prix V4.10.10. Si rien n'est frais, aucun ancien prix n'est présenté comme LIVE.
- `/api/btc-live-price` : petite route JSON authentifiée, sans ordre, retournant le dernier prix de V5.4 uniquement s'il est encore récent et si le compte reste PAPER, avec horodatage/source. HTTP 503 sinon.
- Le **WebSocket OKX déjà ouvert dans le navigateur** reste la source prioritaire. Il redessine maintenant la couche prix seulement (throttle 350 ms), sans refaire les oscillateurs 3m/15m, et actualise le label LIVE en tête de graphe ainsi que le bloc PRIX de l'État des Vagues. Aucun nouveau socket n'a été ajouté.
- Si le WebSocket demeure OPEN mais ne produit aucun trade pendant 15 s, il est fermé puis reconnecté. Pendant cette indisponibilité, le navigateur interroge la route V5.4 à faible fréquence (au plus toutes les 5 s) et peut continuer à montrer le dernier prix actuel du moteur ; la carte et la ligne n'utilisent jamais une vieille cotation anonyme.
- Hors des bornes du tracé des bougies, le label du prix reste présent en haut/bas du canvas avec une flèche de sortie du cadre, plutôt que de laisser la ligne à une position périmée.
- **`modules/elastic-observer-ui.js`** : le cours BTC central accepte lui aussi la cotation authentifiée V5.4 de moins de 25 s, identifiée comme source serveur. `OKX reconnect...` sans valeur fraîche continue d'afficher `—`.
- Le petit encart « V5 STRUCTURE · recherche » dans les Vagues ne doit plus dire que V5 est arrêté : il indique désormais V5.4 PAPER actif et provient de la même Constitution, pas d'un ancien shadow.

## Vérifications
- Test unitaire as-of reproduit exactement l'écart : **V4 archivé 80 451,4 $ vs V5.4 vivant 80 583,9 $**. Le graphe choisit V5.4, puis un trade OKX WebSocket valide plus récent ; toute valeur périmée est refusée.
- Autres tests : WebSocket zombie OPEN, reconnexion, repli V5.4 serveur, repli Audit étiqueté RELEVÉ, absence de prix frais -> `LIVE —`, mêmes sources pour ligne et en-têtes, pas de V4 archaïque.
- Contrôle d'intégration **réel après redémarrage config-server** : ancien V4 exactement **80 451,4 $** ; V5.4 **80 546,2 $ à 16h53 CET**, relevé ~0,865 s ; qualité et aucun ordre financé.
- 211 tests V4/V5 exécutés après déploiement, **205 réussis, zéro échec, six replays historiques ignorés** faute d'Audit ancien. JavaScript `/app.js` extrait et compilé, fichiers Node valides.
- **Seul `config-server` a été redémarré** pour l'incident ; les collecteurs, V5.4 PAPER, V4.9.3, BOONO-TV et Execution Lab n'ont pas été redémarrés.
- Copie de l'ancienne interface avant correction dans `/root/boono-live-price-before-20261026/`.
- Les routes HTTP privées retournent normalement **302 vers login** sans session. Le rendu effectif dans le navigateur authentifié du propriétaire n'a pas été inspecté ; une actualisation complète (Ctrl+Maj+R) est requise pour charger le nouveau `/app.js` (Cache-Control no-store).

## Portée

Aucun changement à l'identité de campagne, admission, sortie, protection, PNL, ledger, ancien moteur V4.10.10 archivé, V4.9.3 ou analyse Maker/Taker. Pas de WebSocket d'exécution réel ni ordre financé.

Le flux direct navigateur dépend du réseau de l'utilisateur ; le fallback V5.4 dépend de la fraîcheur du moteur. Si les deux deviennent indisponibles, c'est explicitement signalé au lieu d'afficher l'ancien cours « LIVE ».
