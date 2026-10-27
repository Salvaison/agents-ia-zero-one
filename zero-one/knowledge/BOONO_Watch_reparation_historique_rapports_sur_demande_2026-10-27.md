# BOONO Systems — réparation Historique / Rapports à la demande

**27 octobre 2026 — Amsterdam · modification de BOONO Watch uniquement.**

## Symptomatologie et reproduction

Dans BOONO Watch, onglet Trades → Historique, le panneau restait sur le texte « Chargement des trades PAPER… » au lieu d'afficher les transactions. Les boutons RAPPORT n'ouvraient pas la fenêtre. Les ledgers et les API demeuraient lisibles : /api/paper-history renvoyait V5.4.2 et V4.9.4 ; /api/paper-trade-report/v52/77 et /api/paper-trade-report/v493/26 étaient OK en session authentifiée.

Tests d'avant correction dans Chromium connecté :
- cliquer Historique ne lançait pas immédiatement de requête ; le chargement éventuel dépendait du rafraîchissement de fond de 30 secondes ;
- les boutons de rapports apparaissaient après chargement, mais le clic n'ouvrait pas la fenêtre ;
- une ouverture forcée de rapport ciblait la mauvaise route et pouvait provoquer HTTP 400.

## Deux causes et corrections

**1. Historique PAPER non demandé lors du clic.** Le gestionnaire d'onglet ouvrait bien le panneau, mais ne lançait pas loadPaperHistoryPanel. Un ancien setInterval de 30 secondes rechargeable en permanence allait à l'encontre du choix utilisateur du chargement à la demande.

- Le chargement se déclenche désormais UNIQUEMENT sur demande explicite : ouverture d'Historique, ou retour dans Trades lorsque cet onglet est encore sélectionné.
- Le panneau Historique existe même avant le premier chargement.
- Le timer d'historique de 30 secondes est SUPPRIMÉ. Les appels indirects depuis le rafraîchissement automatique de l'État vivant sont supprimés également. Toucher à nouveau Historique provoque une nouvelle lecture sur demande.
- En entrant dans Historique, le timer de l'État vivant est suspendu jusqu'à la sortie de l'onglet. Aucun rapport n'est préchargé.

**2. Expressions régulières incorrectes dans le JavaScript embarqué.** Le serveur construit /app.js dans une chaîne template JavaScript ; un seul antislash devant le symbole de classe numérique d dans deux regex était consommé lors de la génération. Les regex du navigateur rejetaient les identifiants normaux V52:77 et V493:27.

- Les deux regex (validation de data-paper-report et décodage dans waveOpenTradeReport) ont maintenant le double échappement serveur requis, produisant une expression régulière client qui reconnaît des chiffres.
- Les routes ciblées sont à nouveau /api/paper-trade-report/v52/N ou /api/paper-trade-report/v493/N ; plus d'appel erroné à la route V4 /api/trade-report/V52%3A77.

## Intégrité des versions

Les titres de l'Historique, de Vagues et des rapports affichent la VERSION D'ORIGINE de chaque trade, notamment V5.4.2 et V4.9.4 récents, sans renommer rétroactivement les trades anciens.

## Contrôle réel de bout en bout

Test sur une instance candidate distincte, puis sur BOONO Watch de production :

1. Connexion authentifiée dans Chromium mobile.
2. État vivant : zéro requête d'historique PAPER en arrière-plan.
3. Clic Historique : une requête à /api/paper-history, puis listes visibles.
4. Clic RAPPORT #77 V5.4.2 : une requête ciblée, fenêtre contenant entrée/sortie, MFE/MAE, frais et motifs.
5. Clic RAPPORT #27 V4.9.4 : deuxième requête ciblée, fenêtre et données complètes visibles.
6. Résultat : une requête de liste, deux requêtes de rapports individuels, zéro erreur JavaScript.

Les routes de l'archive V4 /api/trades, /api/trades/reports et /api/trade-report/184 répondaient en session authentifiée. Le flux de résumé legacy /api/trades conserve sa politique existante ; ce patch traite l'Historique PAPER et les rapports sur demande.

## Sécurité

Aucune modification des moteurs PAPER V4.9.4 / V5.4.2, des règles, des positions ni des ordres. Aucun abonnement supplémentaire. Sauvegarde du fichier serveur et des deux ledgers avant déploiement. Redémarrage de config-server UNIQUEMENT. Vérification du maintien des PID V4.9.4/V5.4.2.

Tests ciblés sur déclenchement par clic, expression régulière client, labels exacts et rapports. Tests de la suite complète V4/V5/attention : 285 cas, 273 réussis, aucun échec, 12 anciens cas sautés.
