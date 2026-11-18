# BOONO Systems — Rétablissement BOONO-TV dans ChromeOS après incident de routage Crostini

**Date :** 18 novembre 2026, après 22 h CET.  
**Traçabilité :** décision `OD-20261118-006`.  
**Portée :** Chromebook Penguin seulement (tunnels clients). Aucun changement de code du studio BOONO-TV OVH, des services Amsterdam ou des moteurs PAPER.  
**État :** **implémenté, testé depuis Penguin et en service** ; confirmation d'affichage dans le navigateur ChromeOS par l'utilisateur encore ouverte.

## Symptôme, causes et mesures d'origine

Après la reprise de noVNC en ouvrant `http://100.115.92.26:6080/vnc.html`, BOONO-TV restait inaccessible dans ChromeOS. Le nom `penguin.linux.test` provoquait `ERR_NAME_NOT_RESOLVED`. Le navigateur ChromeOS ne rejoignait pas non plus convenablement les anciens tunnels locaux par `localhost`.

Sur Penguin, l'ancien service utilisateur `boono-tv-studio-tunnel.service` était `active` et effectuait la redirection SSH :
`-L 127.0.0.1:8310:127.0.0.1:8310 boono-amsterdam`.

- `curl http://127.0.0.1:8310/` → HTTP 200.
- `curl http://100.115.92.26:8310/` → connexion refusée.
- Sur OVH, `boono-studio.service` actif et endpoints `/`, `/api/health`, `/api/snapshot` HTTP 200.
- Le tunnel noVNC existant écoutait au port 6080 et répondait déjà par l'IP privée `100.115.92.26`.

**Cause réseau démontrée :** le tunnel BOONO-TV 8310 était lié uniquement à la boucle locale Linux `127.0.0.1`, non à l'interface privée `eth0` que ChromeOS peut atteindre. L'incident de résolution DNS de `penguin.linux.test` est distinct.

## Changement ciblé

Un **second** tunnel `autossh` écoute maintenant **uniquement** sur l'adresse privée IPv4 de Penguin (`eth0`) pour relayer le même port `8310` vers le tunnel Amsterdam–OVH. L'IP n'est pas codée en dur : calculée au démarrage via `ip -4 -o addr show dev eth0`, ce qui convient si ChromeOS modifie l'adresse lors du redémarrage.

Fichiers installés sur Penguin :

- `/home/boono70/.local/bin/boono-tv-crostini-ip-tunnel.sh` (mode 0700) ;
- `/home/boono70/.config/systemd/user/boono-tv-crostini-ip-tunnel.service` (activé avec `systemctl --user enable --now`).

Copies versionnées : `zero-one/scripts/boono-tv-crostini-ip-tunnel.sh` et `zero-one/scripts/systemd/boono-tv-crostini-ip-tunnel.service`.

Le service a `Restart=always`, `RestartSec=8`, `AUTOSSH_GATETIME=0`, `AUTOSSH_POLL=30` et `WantedBy=default.target`. Il ne modifie pas les deux tunnels existants `boono-tv-studio-tunnel.service` (127.0.0.1:8310) et `boono-tunnel.service` (noVNC 6080).

**Sécurité :** l'écoute 8310 est liée à `eth0` privé (au contrôle `100.115.92.26/30`), pas à `0.0.0.0`, afin de ne pas ouvrir inutilement le studio sur d'autres interfaces. Le flux vers Amsterdam passe par SSH. BOONO-TV comporte des ressources de prévisualisation privées ; ne pas créer d'exposition Internet publique de ce port.

## Tests avant/après

Un test transitoire `systemd-run --user` avec `ssh -L 100.115.92.26:8310:127.0.0.1:8310` a prouvé que le port IP pouvait écouter en parallèle de `127.0.0.1:8310`. Le test HTTP 200 a validé ce trajet.

Après passage à l'unité permanente `boono-tv-crostini-ip-tunnel.service`, la sonde a vérifié :

| Chemin de test depuis Penguin | Résultat |
|---|---|
| `http://100.115.92.26:8310/?showcase=1` | **HTTP 200**, 8685 octets, ~0,078 s |
| `http://100.115.92.26:8310/api/health` | **HTTP 200**, 233 octets, ~0,112 s |
| `http://100.115.92.26:8310/api/snapshot` | **HTTP 200**, ~118820 octets, ~0,358 s |
| `http://127.0.0.1:8310/` (ancien tunnel) | **HTTP 200**, ~0,110 s |
| `http://100.115.92.26:6080/vnc.html` (noVNC) | **HTTP 200**, ~0,088 s |

Le nouveau service et l'ancien service local sont `active`, le nouveau est `enabled` ; les sockets `127.0.0.1:8310` et `100.115.92.26:8310` coexistent sans conflit.

**Limite :** ces tests sont effectués depuis Linux Penguin, pas par une capture directe du navigateur ChromeOS. Le propriétaire a confirmé que la même IP privée débloquait noVNC 6080. Le rendu BOONO-TV dans ChromeOS reste à confirmer dans la conversation. Ne pas confondre HTTP 200 et preuve que le studio vidéo/son fonctionne visuellement.

## Reprise / retour arrière

Si une erreur survient, la commande `systemctl --user disable --now boono-tv-crostini-ip-tunnel.service` désactive exclusivement le nouvel accès IP ; l'ancien tunnel local 8310 et noVNC 6080 restent inchangés.

Si `eth0` obtient une nouvelle IP privée, l'URL ChromeOS devra reprendre cette nouvelle IP ; le script la détecte au redémarrage du service. Référence diagnostic : `ip -4 -o addr show dev eth0` et `systemctl --user status boono-tv-crostini-ip-tunnel.service`.

**Prochaine validation utilisateur :** ouvrir `http://100.115.92.26:8310/?showcase=1` dans ChromeOS, contrôler la rotation du loft, les contenus BOONO-TV et la lecture vidéo selon droits d'usage.
