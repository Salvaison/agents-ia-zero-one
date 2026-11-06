# BOONO-TV — Android privé : Tailscale et passerelle spectateur

Date : 6 novembre 2026
Décision : OD-20261106-012
Statut : passerelle spectateur et Tailscale installés/testés sur OVH. **Accès Android NON encore finalisé : connexion du serveur au tailnet et HTTPS Serve en attente d'approbation utilisateur.**

## Origine

L'utilisateur souhaite regarder BOONO-TV depuis Android sans allumer Penguin. Il a installé Tailscale sur son téléphone. OVH fonctionne sur Ubuntu 26.04.1 LTS, studio existant exclusivement sur localhost 127.0.0.1:3091. Aucun Tailscale installé auparavant, aucune redirection web publique et aucun droit de diffusion publique présumé pour la vidéo Clemens Costa privée.

## Architecture préparée et prouvée

Nouvelle passerelle Node distincte sur OVH :
- /home/ubuntu/boono-tv-mobile/viewer.js
- service utilisateur boono-mobile-viewer.service, actif et activé au redémarrage
- écoute uniquement 127.0.0.1:3092 ; jamais 0.0.0.0, aucune modification de port/firewall public.

Elle relaie le studio en **lecture seule** : GET/HEAD des ressources de scène, snapshot, configuration de projection, images et flux privés MP4/AAC/FFT, WebSocket du serveur vers le client uniquement. Toute tentative POST/PUT/PATCH/DELETE est refusée, les éditeurs techniques et scénarios sont bloqués. Le raccourci GET / redirige le navigateur vers une URL de scène avec les paramètres showCase, Clemens Costa et projectionCycle=21 pour que le client affiche la vidéo (et pas seulement le serveur qui réécrit sa requête).

Tests :
- POST /api/layout et POST /api/dialogue-script → HTTP 405.
- GET /?wallEdit=1 → HTTP 403.
- GET API non listée → HTTP 403.
- GET scène /, API snapshot/layout et ressources → HTTP 200.
- MP4 privé et M4A audio-only via HTTP Range → HTTP 206, 1024 octets demandés.
- WebSocket gateway → connexion ouverte, flux d'environ 113763 octets reçu, aucune donnée utilisateur réexpédiée au serveur.
- Test Chromium configuration Android paysage 915×412 : vrai loft V2, BOONO PNG visible, vidéo Clemens en lecture, Canvas 12fps (68 frames observées, aucun draw error), audio fallback affiché correctement, aucune erreur JavaScript. Deux abort HTTP initiaux de plages vidéo sont liés à l'annulation normale de requêtes précédentes ; le MP4 se lit correctement.

## Tailscale sans privilège système

Binaire statique Tailscale version 1.104.5 téléchargé depuis les binaires officiels stables, installé dans /home/ubuntu/.local/opt/boono-tailscale. Daemon userspace lancé via service utilisateur boono-tailscale.service, socket privé et fichier d'état sous /home/ubuntu/.local/share/boono-tailscale. Pas de sudo/apt ni modification de routage : paramètres accept-dns=false, accept-routes=false, ssh=false, nom d'appareil prévu boono-tv-ovh.

À la fin de ce tour, **tailscale status renvoie encore Logged out** : une URL temporaire de validation du nœud a été produite et transmise à l'utilisateur dans le chat. Cette URL n'est pas stockée dans Git. **tailscale serve status : No serve config**, donc **pas encore de lien HTTPS privé vers Android**.

## Travail restant dépendant de l'utilisateur

L'utilisateur doit ouvrir Tailscale sur Android, se connecter au compte souhaité et approuver le nœud OVH via le lien privé d'authentification fourni dans le chat. Ensuite contrôler Tailscale status et configurer exclusivement Tailscale Serve HTTPS (jamais Funnel) vers la passerelle read-only 127.0.0.1:3092, jamais vers le studio 3091. Un consentement HTTPS/certificat MagicDNS peut être requis par Tailscale. Ne pas inventer l'URL *.ts.net avant confirmation de Serve.

Les règles d'accès du tailnet Tailscale restent à contrôler si plusieurs membres sont autorisés. Le MP4 Clemens est un essai privé uniquement. Le projet BOONO/V494/V543 PAPER, les collecteurs, la configuration des deux moniteurs et les cinq ancres du grand écran n'ont pas été modifiés.

**Statuts de décision :** IMPLEMENTE et TESTE pour la passerelle locale et le daemon Tailscale installé ; la mise en service du Serve HTTPS et validation sur Android restent OUVERTES.

## Complément 6 novembre 2026 — correction HTTPS Tailscale sur OVH

Après connexion du serveur au tailnet, Chrome Android ne pouvait pas ouvrir BOONO-TV et l'application Android affichait l'avertissement MagicSock ReceiveIPv4 not running.

Diagnostic : le serveur OVH détectait l'appareil Android ele-l29 et communiquait avec lui par DERP Helsinki (ping 122–156 ms), mais ses logs HTTPS montraient plusieurs erreurs TLS "no TailscaleVarRoot" provenant du téléphone. Le service utilisateur boono-tailscale.service lançait le démon en userspace avec --state mais sans --statedir, ce qui empêchait la création et la conservation de certificats HTTPS. Cette erreur est indépendante du warning Android.

Correction : sauvegarde préalable /home/ubuntu/boono-tv-mobile/backups/boono-tailscale-before-statedir-20261106.service, ajout de --statedir=/home/ubuntu/.local/share/boono-tailscale sans modifier l'adresse du socket, le fichier --state, les routes, les ports ou les options SSH. Redémarrage du seul démon Tailscale OVH. Aucun changement des moteurs PAPER ni de la passerelle.

Vérification : le démon a enregistré ACME, validé DNS-01 et reçu le certificat à 13:22:13 UTC le 6 novembre 2026. Certificat pour boono-tv-ovh.tail6abdc1.ts.net, valide du 6 novembre 2026 au 4 février 2027. Après le redémarrage, pas de nouvelles erreurs "no TailscaleVarRoot" dans les journaux. Serve affiche bien HTTPS (tailnet only) vers 127.0.0.1:3092. Passerelle lecture seule HTTP200 ; POST calibration refusé HTTP405 ; trois services user actifs.

Statut restant : la véritable ouverture HTTPS depuis Chrome Android après ce correctif n'a pas encore été confirmée par le propriétaire. L'avertissement MagicSock ReceiveIPv4 peut nécessiter de déconnecter puis reconnecter le VPN Android. En cas de nouvel échec, collecter le message exact de Chrome et distinguer transport Tailscale et DNS MagicDNS. Aucun Funnel public ; droits de diffusion du MP4 Clemens Costa non établis.
