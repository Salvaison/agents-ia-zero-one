# OD-20261118-006 — Réparation d'accès ChromeOS à BOONO-TV via Penguin

**Mandat :** « là novnc fonctionne reste BoonoTv » après l'incident `ERR_NAME_NOT_RESOLVED` sur `penguin.linux.test` et la restauration de noVNC via l'adresse privée `100.115.92.26:6080`. Cette demande autorise une correction du routage de BOONO-TV, sans modifier les moteurs ni ouvrir de service à Internet.

**Diagnostic confirmé avant correction :** le tunnel existant `boono-tv-studio-tunnel.service`, `autossh -L 127.0.0.1:8310:127.0.0.1:8310`, fournit HTTP 200 sur `127.0.0.1:8310` mais refuse les connexions à `100.115.92.26:8310`. Le tunnel noVNC existant écoute déjà sur 6080 et fonctionne via cette adresse privée. Le studio OVH est actif, ses endpoints `/`, `/api/health` et `/api/snapshot` répondent HTTP 200.

**Décision de périmètre :** créer un **deuxième** tunnel très limité, lié uniquement à l'adresse privée `eth0` de Penguin, sans modifier le service local initial ni le tunnel noVNC. La détermination de l'adresse est dynamique au démarrage pour éviter de coder en dur `100.115.92.26` dans le service. Le trafic jusqu'à Amsterdam est transporté par SSH. Le port reste accessible sur la liaison virtuelle privée ChromeOS–Penguin et ne doit pas être exposé au réseau public.

**Provenance :** le message source est conservé dans 01, la mission détaillée dans 02 et les constats dans 03. Les tests HTTP effectués dans Penguin prouvent la disponibilité du nouveau port sur l'interface privée, mais **ne prouvent pas encore l'affichage graphique dans le navigateur ChromeOS** ; une confirmation utilisateur est requise.
