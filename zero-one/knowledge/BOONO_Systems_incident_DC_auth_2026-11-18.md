# BOONO Systems — Incident Desktop Commander : déconnexions et perte d'authentification (17–18 novembre 2026)

**Diagnostic :** 18 novembre 2026, ~18:18–18:24 UTC.  
**Périmètre :** VPS Amsterdam/DigitalOcean, agent Desktop Commander Remote MCP et services d'accès.  
**Statut :** diagnostic en lecture seule ; **aucun service, agent, Chrome, collecteur ou moteur PAPER modifié/redémarré**.

## Demande et distinction des causes

Le propriétaire signale plusieurs interruptions Desktop Commander le 17 novembre et une reconnexion manuelle depuis la console Amsterdam le matin du 18 novembre. Il interroge aussi la gravité de la mémoire grandissante du collecteur TradingView 15m.

**Conclusion :** la perte durable d'accès Desktop Commander du 17/11 est expliquée directement par l'**expiration d'une session Remote MCP, assortie d'un jeton de renouvellement absent/invalide**. La consommation mémoire de Chrome constitue un risque de stabilité distinct, mais **aucun lien causal avec ces déconnexions n'est prouvé**. Les interruptions brèves `socket closed 1006` s'étaient résolues automatiquement avant l'expiration définitive ; leur origine réseau/transport exacte reste inconnue.

## Chronologie factuelle vérifiée (UTC ; ajouter une heure pour Stockholm)

| UTC | Événement prouvé |
|---|---|
| 17/11 15:12:30 | `Channel error: socket closed: 1006`, hors ligne ; `Channel subscribed` et online à 15:12:31 |
| 17/11 20:41:23 | Nouveau `socket closed: 1006`, retour online à 20:41:24 |
| 17/11 21:07:34 | `Manual token refresh failed: Invalid Refresh Token: Refresh Token Not Found` |
| 17/11 21:22:34 | Canal closed, appareil marqué offline |
| 17/11 21:22:35 | `Auth error: access token not usable and no refresh token`, `Remote session expired and could not be renewed`, message demandant de redémarrer la session DC |
| 18/11 09:45:45 | Nouvelle session console root `pts/0` enregistrée sur Amsterdam |
| 18/11 09:46:01–09:46:06 | Démarrage manuel `npm exec @wonderwhy-er/desktop-commander@latest remote` et ses processus Node ; accès Remote MCP actuellement disponible |

**Sources techniques :** `journalctl -u desktop-commander-remote.service --since '2026-11-17'`, `systemctl show`, `systemctl status`, `ps`, `last -F`, `journalctl -k`, `free -m`, `uptime`, `ss`.

## Défaillance de supervision démontrée

Sur Amsterdam **deux installations/instances coexistent au 18/11** :

1. **Service automatique systemd** `desktop-commander-remote.service`, `enabled`, `active`, PID parent `137834`, lancé le **13/11 06:52 UTC**, répertoire `/opt/desktop-commander/runtime/...`, **Desktop Commander version 0.2.51**. Option `Restart=always`, mais `NRestarts=0`. Les derniers logs Remote MCP indiquent une session expirée le 17/11 à 21:22 ; service **vivant comme processus mais non opérationnel comme liaison distante**.
2. **Instance manuelle du 18/11**, PID `662019` et fils `662044`, **version 0.3.3**, lancée depuis `npm exec` sur le terminal **`pts/0`** d'une session console. Cette instance est connectée. Elle ne bénéficie pas actuellement de la même protection de service systemd que l'agent automatique, et sa fin de session terminal pourrait couper l'accès.

**Important :** l'instance manuelle n'existait pas au moment du problème du 17/11. La coexistence de deux processus n'est donc **pas la cause démontrée des premières déconnexions**, mais une configuration à simplifier avant de rétablir une supervision durable. Le journal montre un **échec du renouvellement des jetons**, sans établir pourquoi le jeton était absent (révocation, expiration, changement d'identifiants, bogue de version, autre).

**Pourquoi systemd n'a pas réparé :** `Restart=always` réagit à la fin du **processus**, pas à la perte logique de connexion. L'ancien processus est resté `active (running)` après s'être déclaré offline.

## Autres indices techniques

- Amsterdam n'a subi **aucun redémarrage noyau** depuis le 26 août 2026 : uptime ~84 jours au contrôle. `ssh.service` actif depuis le 13/11, `NRestarts=0` au contrôle.
- Aucun événement `OOM`/processus tué par pression mémoire trouvé dans le journal noyau pour les 17–18 novembre.
- RAM disponible ~992–1129 MiB selon mesure, swap ~999–1010 MiB utilisée, disque 29 %. Aucune pression mémoire/IO PSI soutenue au contrôle, malgré CPU partagé et charges de pointe possibles.
- Réseau éthernet du VPS sans erreurs et sans paquets perdus dans les compteurs examinés ; cela ne permet pas d'exclure une microcoupure Internet ou un incident côté Remote MCP.
- Plusieurs tentatives SSH non authentifiées depuis Internet apparaissent dans les logs, courantes sur un service SSH exposé ; **aucune preuve ici qu'elles ont provoqué l'incident DC ni une compromission**.
- Collecteur MCB TradingView 15m : audit nocturne 17/18 documente **+180 MiB JS heap en 110 min**, pics lors des navigations avec libération partielle et hausse des compteurs DOM. Ce risque de mémoire mérite un traitement, mais les données MCB du rollover sont intactes. Il n'explique pas l'erreur d'authentification DC.

## Recommandations opérationnelles (non mises en œuvre)

**P0 — Restaurer une seule connexion durable :**
1. Conserver l'accès par l'instance manuelle **jusqu'à validation** d'une instance systemd fonctionnelle. Ne pas fermer la console avant la vérification d'un second accès.
2. Préparer dans une intervention distincte le remplacement propre de l'ancien binaire/version **0.2.51** par une version courante validée (aujourd'hui 0.3.3 opérationnelle), installée sur un chemin **stable** plutôt qu'un répertoire `~/.npm/_npx` transitoire ; éviter toute manipulation ou exposition de jeton dans les journaux/Git.
3. Réauthentifier **la session du service géré** si nécessaire, faire un redémarrage **contrôlé du seul service DC** avec l'accès console de secours ; vérifier qu'il s'enregistre en ligne sous son ID attendu et qu'une nouvelle session le retrouve après sortie de la console.
4. Après confirmation du service géré, supprimer la dépendance à l'instance manuelle en la terminant proprement ; n'avoir **qu'un agent responsable de cet ID**.
5. Ajouter une supervision **de l'état réel de connexion/autorisation**, pas seulement de `systemctl is-active`, et une alerte explicite en cas de refresh token invalide ou terminal principal interrompu.

**P1 — TradingView :** profiler l'usage RSS/PSS et heap JavaScript sur une durée de 24–48 h et examiner les navigations répétées dans un test isolé ; aucun recyclage incontrôlé des collecteurs.

**P2 — SSH et accès de secours :** vérifier les clés/tunnels et les protections de l'accès SSH de production dans une maintenance de sécurité séparée, sans modifier la configuration réseau ou les accès pendant l'enquête.

## Limites

La cause des **microcoupures 1006** n'a pas été prouvée. Le message `Invalid Refresh Token` explique la perte **durable** du 17/11 mais pas la cause amont d'invalidation des identifiants. La connexion via console/terminal manuel du 18/11 est fonctionnelle au diagnostic mais fragile. Toute remédiation doit préserver l'accès de secours et suivre les conventions d'archivage OD avant modification.
