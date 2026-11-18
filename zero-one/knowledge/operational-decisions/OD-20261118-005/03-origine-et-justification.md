# OD-20261118-005 — Service permanent Desktop Commander sur Amsterdam

## Source et mandat
Message utilisateur intégral : « oui fait qqch à DC ». Il valide le conseil formulé juste avant : remplacer l'ancien service DC par une instance récente gérée durablement par systemd, vérifier son authentification/reconnexion, supprimer la dépendance à la console manuelle après confirmation et préserver un accès de secours.

La consigne 02 est rédigée par l'assistant puis exécutée directement via Remote Desktop Commander, et ne constitue pas une citation littérale de l'utilisateur.

## Constats avant action
Contrôle 18 novembre ~19:56 UTC : service `desktop-commander-remote.service` actif depuis le 13 novembre PID 137834 avec binaire `0.2.51` sous `/opt/desktop-commander/runtime`, mais journal du 17 novembre montrant `Invalid Refresh Token`, `Auth error ... no refresh token` et `session expired`, sans arrêt du processus (`NRestarts=0`). Une nouvelle connexion `0.3.4` a été lancée manuellement sous `root` vers 19:51 UTC le 18/11 depuis `pts/0`, ses fichiers runtime sont dans `/root/.npm/_npx/4b4c857f6efdfb61/node_modules`. Le système dispose d'environ 55 Go libres et Node 22.23.2.

## Limites d'autorisation
Ne jamais exposer d'identifiants, de clés ou de jetons d'authentification dans la KB. Ne pas toucher aux moteurs PAPER, collecteurs, rendu TradingView ou infrastructure réseau pendant l'intervention. Si la version 0.3.4 sous systemd ne peut pas s'authentifier sans interrompre l'accès existant, conserver l'instance manuelle et décrire clairement l'obstacle plutôt que prétendre à une réparation complète.

## État documentaire
Les événements OD documentent séparément : sauvegarde, implantation technique, tests, mise en service éventuelle, et validation utilisateur restant ouverte.
