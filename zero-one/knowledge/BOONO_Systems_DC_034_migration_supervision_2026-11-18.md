# BOONO Systems — Migration Desktop Commander 0.3.4 et supervision de connexion

**Date d'intervention :** 18 novembre 2026, ~19:56–20:12 UTC (20:56–21:12 CET).  
**Décision opérationnelle :** [OD-20261118-005](operational-decisions/OD-20261118-005/03-origine-et-justification.md).  
**Statut :** **implémenté, testé et en service sur Amsterdam** ; validation d'une expiration réelle future et d'un redémarrage complet du VPS **non effectuée**.

## 1. Déclencheur et diagnostic

Le propriétaire a validé une intervention de fiabilisation Desktop Commander après les déconnexions des 17–18 novembre. L'enquête antérieure est conservée dans [BOONO_Systems_incident_DC_auth_2026-11-18.md](BOONO_Systems_incident_DC_auth_2026-11-18.md).

L'ancien service systemd `desktop-commander-remote.service` utilisait la version **0.2.51**, sous `/opt/desktop-commander/runtime/`. Son processus (PID 137834) restait `active`, `NRestarts=0`, malgré les erreurs du 17 novembre `Invalid Refresh Token`, `Auth error ... no refresh token` et `Remote session expired and could not be renewed`. L'absence de sortie du processus explique que `Restart=always` n'ait rien réparé.

Le 18 novembre, une session **0.3.4**, opérante mais lancée manuellement depuis la console `pts/0`, assurait l'accès à Amsterdam. Le maintien de cette session constituait une dépendance fragile : fermer le terminal pouvait couper l'accès.

## 2. Sauvegardes et installation permanente

**Avant toute modification**, création du registre `OD-20261118-005` avec la demande utilisateur, la consigne d'exécution et l'origine. Les fichiers de travail ont été sauvegardés sous `zero-one/backups/OD-20261118-005/` sur Amsterdam (non publiés comme archives de code de production).

- Ancienne unité sauvegardée : `desktop-commander-remote.service.before`, SHA-256 `804d35eb95cea0b2d60f719ce648a3eb4fc7403e1296a61d4175ef4d20d63`.
- Copie **sans téléchargement de paquet ni modification de l'agent manuel** de ses dépendances locales version **0.3.4** vers `/opt/desktop-commander/managed-0.3.4/node_modules/` ; espace ~268 Mo sur une partition VPS ayant ~55 Go libres.
- Binaire Node utilisé : `/usr/bin/node` 22.23.2.
- Unité système active : `/etc/systemd/system/desktop-commander-remote.service`. **Un seul champ ExecStart changé** pour pointer vers le chemin stable :
  `/usr/bin/node /opt/desktop-commander/managed-0.3.4/node_modules/@wonderwhy-er/desktop-commander/dist/index.js remote`.
  La vieille option `--disable-no-sleep` a été retirée, car le nouveau lancement reproduit exactement la commande 0.3.4 qui fonctionnait manuellement. `Restart=always`, `RestartSec=5`, `User=root`, `HOME=/root` et les autres paramètres sont préservés.
- Copie de l'unité après modification dans `zero-one/scripts/systemd/desktop-commander-remote.service`, SHA-256 identique au fichier installé `21bb11c0ef40b5b70a56302cd0d1e3c47e2097ee5e23b525530081e8aa719ec7`.

## 3. Bascule contrôlée et test d'accès réel

1. `systemctl daemon-reload` et **redémarrage du seul** `desktop-commander-remote.service`. Aucun autre service BOONO/PM2 ni Chrome n'a été touché.
2. Au démarrage à **20:01:07 UTC**, nouveau PID systemd **708384**.
3. À **20:01:12–20:01:16 UTC**, journal du nouveau service : `Connected to Desktop Commander MCP`, `Connected to Remote MCP`, `Found persisted session for device 55eb009c-d6f2-4260-b749-d6eaedfce3ff`, `Session restored`, `Channel subscribed`, `Device marked as online`, `Device ready`, `Desktop Commander Remote is connected`.
4. La connexion manuelle a été conservée pendant les tests initiaux. La commande distante recevait encore ses appels tant qu'elle fonctionnait, donc l'état `active` du nouveau service ne suffisait pas à démontrer sa prise en charge réelle.
5. Un timer transient distinct `boono-dc-manual-release-20261118` a été programmé pour terminer **uniquement** le groupe de processus manuel validé (`PGID 707290`) avec vérification du PID et du groupe avant `SIGTERM`. Il s'est exécuté à **20:03:52 UTC**, sans toucher à la session système ni au shell parent de la console.
6. **Preuve décisive :** après la fin de la session manuelle, une nouvelle commande Remote Desktop Commander a été exécutée par un descendant du service permanent : PID **708718**, PPID **708447**, PGID **708384**, et son arrivée a été journalisée sous le PID principal **708384** (`Received tool call` à 20:03:52). Une seconde commande à ~20:07 UTC a également été exécutée par ce service. Plus aucun processus manuel `desktop-commander remote` restait visible à la vérification.
7. Un court état `offline` a été renvoyé une fois par le fournisseur après la transition ; l'agent est redevenu `online` et les appels suivants sont bien arrivés au service permanent. Son propre journal ne montre pas une nouvelle expiration de session pendant cette période. Une transition de présence lors de la fin de deux sessions concurrentes reste une explication possible, non démontrée.

**Conclusion testée :** la liaison ne dépend plus du terminal `pts/0` ouvert ce matin et a reçu de véritables commandes du nouvel agent systemd. Un redémarrage complet du VPS et une expiration après plusieurs jours n'ont pas été provoqués pour ne pas perturber le trading PAPER.

## 4. Supervision de la connexion, pas seulement du processus

Pour remédier à la **défaillance logique** observée dans la version 0.2.51, un watchdog indépendant a été mis en service.

- Script versionné : `zero-one/scripts/boono-dc-health-check.py` ; copie installée dans `/usr/local/sbin/boono-dc-health-check.py`.
- Unités versionnées : `zero-one/scripts/systemd/boono-dc-health-check.service` et `boono-dc-health-check.timer`, installées dans `/etc/systemd/system/`.
- Timer : `enabled`, `active`, exécution environ toutes les **3 minutes**.
- Méthode : lit l'ID de processus `MainPID` de `desktop-commander-remote.service`, puis les événements journal de **ce seul PID**, en ignorant les citations de logs contenues dans des appels outils. Classe `ONLINE`, `RECOVERING`, `PERSISTENT_OFFLINE` ou `UNKNOWN`.
- Si l'agent se marque `offline`, si la session expire sans reconnexion ou si un canal reste fermé, attente d'au moins **180 secondes** ; puis `systemctl restart desktop-commander-remote.service` uniquement. Le script impose une limitation stricte : **au plus une tentative de récupération par heure**, horodatée dans `/run/boono-dc-watchdog-last-restart`, afin d'éviter les boucles en cas de véritables identifiants invalides.
- Si le service a été délibérément arrêté ou que ses journaux sont insuffisants, le watchdog **ne force pas de reprise**.
- Les tests `python3 -m py_compile`, `--self-test` et `--dry-run` ont réussi. Scénarios testés : état en ligne, déconnexion transitoire, déconnexion prolongée, puis reconnexion.
- Test systemd réel à **20:10:15 UTC** : `boono-dc-health-check.service` exécuté avec `DC_WATCHDOG status=ONLINE pid=708384 recent_events=2`, sans redémarrage. Prochain déclenchement prévu ~20:13:15 UTC.

**Limites :** ce watchdog observe les **messages d'état émis par l'agent**, pas un ping externe authentifié du fournisseur. Si l'agent se fige sans émettre de déconnexion, ou si les identifiants sont invalidés de façon permanente, un redémarrage seul ne garantit pas une réparation. Dans ce cas, une nouvelle authentification via la console reste possible et une alerte explicite est nécessaire. Le taux de reprise future n'est pas démontré.

## 5. État final et exclusions

- `desktop-commander-remote.service` : `active`, `enabled`, version **0.3.4**, PID **708384** au contrôle.
- `boono-dc-health-check.timer` : `active`, `enabled`, contrôle indépendant toutes les trois minutes.
- **Une seule instance Desktop Commander Amsterdam** à la dernière vérification, aucun processus manuel restant.
- Aucune modification des moteurs **V543, V551**, collecteurs MCB 3m/15m/1h/4h/1D, du code TradingView, de BOONO-TV, d'OVH, du tunnel Penguin ni de l'authentification SSH. Aucun jeton/session/secret copié dans la KB ou Git.
- Le dépôt contenant déjà de nombreuses modifications hors sujet et un fichier BOONOLAB déjà indexé, **le commit de l'opération doit inclure exclusivement** le script de watchdog, ses trois unités systemd et le registre OD, plus ce rapport.

## 6. Maintenance et retour arrière

- Contrôle : `systemctl status desktop-commander-remote.service`, `systemctl list-timers boono-dc-health-check.timer`, `journalctl -u desktop-commander-remote.service -n 60`, `journalctl -u boono-dc-health-check.service -n 25`.
- Restauration de l'unité précédente, si absolument nécessaire : copier `zero-one/backups/OD-20261118-005/desktop-commander-remote.service.before` sous `/etc/systemd/system/desktop-commander-remote.service`, puis `systemctl daemon-reload` et `systemctl restart desktop-commander-remote.service`. **Attention : le binaire précédent 0.2.51 avait une session expirée**, ce rollback est une restauration de configuration, pas un accès garanti.
- Pour désactiver seulement la supervision : `systemctl disable --now boono-dc-health-check.timer` ; ne pas supprimer l'agent principal.
- **Ne pas fermer l'accès de secours pendant une future migration d'agent avant d'avoir prouvé l'accès via le service de remplacement.**
