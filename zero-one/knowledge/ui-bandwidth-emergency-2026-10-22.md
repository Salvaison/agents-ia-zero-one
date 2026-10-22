# BOONO Systems — Correctif d'urgence consommation Internet — 22 octobre 2026

## Incident
L'utilisateur a consommé son enveloppe de 200 Go d'Internet et a dû acheter un ajout de 20 Go. Investigations en lecture seule sur Amsterdam :
- `data/trade-sim-v4-history.json` ≈264 Mo sur disque (format JSON indenté) ; les 12 derniers trades détaillés, après sérialisation non indentée, ≈103,6 Mo.
- `lastEvaluation` ≈5,9 Mo, dont `elasticSyncShadow` ≈5,5 Mo.
- L'API `/api/trades` envoyait régulièrement les 12 rapports complets et l'état entier, potentiellement plus de 110 Mo par rafraîchissement de 30 s.
- Sans mesure du trafic réellement facturé par le fournisseur (compression, nombre d'onglets, autres usages), cela constitue néanmoins une explication plausible de l'épuisement rapide des données.
- `/api/shadows` lisait jusqu'à 360 snapshots V4 extrêmement lourds, ainsi que le gros historique des trades, pour une réponse de synthèse ; son calcul initial pouvait prendre ~25 s.

## Corrections réalisées, interface seulement
- Réduire l'état vivant public : conserver la version, V4, MCB, PM, ticker, MF, Elastic v0.5 et commandes, mais exclure des réponses navigateur les archives imbriquées `elasticSyncShadow.completed` et les gros snapshots des autres expériences. Elastic Sync est ramené à son épisode actif compact, avec nombre de campagnes terminées, sans destruction du fichier serveur d'origine.
- L'API `/api/trades` transmet les résumés des trades et l'état de décision compact ; **aucun des 12 rapports détaillés** lors du rafraîchissement ordinaire.
- Nouvelle API auth `/api/trades/reports` : renvoie les 12 rapports récents sur demande, avec contextes épurés de leurs lourdes archives de simulation et conservation de l'analyse d'entrée/sortie utile.
- Interface : charger les rapports **seulement à l'ouverture de Rapports**, garder le DOM sans réécriture périodique ; éviter les fetch concurrents, ne pas demander TRADES sur un onglet principal inactif/masqué, arrêter les rafraîchissements lors de la lecture des rapports.
- Mettre en cache mémoire les résumés d'historique, calculés uniquement lorsqu'un fichier change au lieu de reparcourir ~264 Mo à chaque 30 s. Idem pour l'archive V3.
- `/api/shadows` utilise ces résumés archivés, envoie un Elastic Sync réduit et limite **temporairement l'échantillon de snapshots lourds à 60 évaluations** (~30 min au lieu de 3 h), en attendant un véritable journal compact de 48 h. Son calcul initial reste coûteux (~11 s en test) et nécessitera une seconde étape. Les statistiques reflètent bien la fenêtre réduite, sans prétendre couvrir davantage.
- `/api/wave-live` lit le cache des résumés de trades plutôt que le gigantesque fichier détaillé.

## Résultats du serveur de test authentifié
- Deux réponses `GET /api/trades` successives : chacune ~475 414 octets en JSON, 155 trades résumés, **aucun rapport embarqué**.
- `GET /api/trades/reports` sur demande : ~3 015 770 octets pour 12 rapports avec contexte d'analyse présent.
- `GET /api/shadows` : ~276 876 octets mais un calcul à froid d'environ 11 s, soit encore trop lourd, à traiter ensuite.
- Avant correction, les rapports seuls représentaient environ 103 632 916 octets et l'évaluation 5 911 580 octets.
- Bilan : >99 % de réduction du JSON dans le flux normal TRADES. Ne pas confondre taille JSON et volume exact facturé après encodage HTTP et transport.
- Vérifier le trafic réseau réel depuis un navigateur connecté à l'avenir ; compter d'autres flux comme `/api/wave-live`, WebSocket OKX ou médias YouTube séparément.

## Sécurité
- Aucune modification du moteur décisionnel V4.10.10, des seuils d'admission, des stops, des ordres 0$, des collecteurs ou de BOONO-TV.
- Seul `config-server` est redémarré.
- Ne pas supprimer les historiques de trades. Les données complètes restent stockées sur Amsterdam et disponibles pour l'investigation hors navigateur.
- Le nouveau journal décisionnel **48 h à taille compacte** doit être un chantier séparé : ni purge des logs existants ni assurance de 48 h au stade actuel.

## Addendum — compression HTTP gzip (mesurée sur serveur de test)
- Compression asynchrone native zlib uniquement pour les réponses JSON lourdes TRADES, rapports à la demande et SHADOWS, lorsque le navigateur accepte `gzip` ; les autres clients conservent le JSON ordinaire.
- Tests HTTP avec authentification réelle locale : `GET /api/trades` = **71 450 octets sur le fil** (`Content-Encoding: gzip`, contre 473 900 octets décompressés). Second rafraîchissement après construction du cache ≈374 ms.
- `GET /api/trades/reports` sur demande = **537 728 octets sur le fil** (3 015 770 décompressés), une seule fois quand l'utilisateur ouvre Rapports.
- À titre indicatif 71 450 octets × 2 880 rafraîchissements/jour ≈206 Mo/jour pour TRADES en continu, sans compter Vagues, SHADOWS, WebSocket, autres services et en-têtes réseau. Il ne s'agit **pas** d'une mesure exhaustive du trafic facturé.
- Le correctif respecte le rafraîchissement de 30 secondes lorsque TRADES est actif et visible ; il n'interrompt pas les protections ni le moteur V4.10.10.
