# OD-20261106-012 — BOONO-TV privé sur Android via Tailscale

**Origine :** l’utilisateur souhaite le rendu de BOONO-TV sur Android sans devoir laisser Penguin allumé. Il a installé Tailscale sur téléphone et attend la suite du raccordement.

**Configuration constatée :** OVH Ubuntu 26.04.1, studio BOONO-TV actif sur `127.0.0.1:3091`, aucun démon Tailscale initialement installé, aucun proxy nginx/caddy public. Les lecteurs vidéo Clemens Costa et contenus des scénarios peuvent être soumis à des conditions de diffusion privée et ne doivent jamais être ouverts à Internet. Le serveur studio contient des POST de calibration et d'édition (`/api/layout`, `/api/dialogue-script`, `/api/grand-screen`) ; ils doivent rester invisibles en lecture/écriture depuis le téléphone.

**Choix :** une passerelle distincte de consultation sur loopback `127.0.0.1:3092`, méthodes GET/HEAD et WebSocket sans contrôle sortant, puis un Tailscale Serve HTTPS exclusivement à l'intérieur du tailnet. Pas de Tailscale Funnel et pas de changement des flux du trading. L'installation Tailscale côté OVH se fait sans privilégier `sudo` si les outils d'administration ne permettent pas l'escalade, via daemon userspace et service utilisateur. Toute approbation du serveur dans le réseau privé demeure une action explicite de l'utilisateur. Documenter chaque état observé ; pas d'URL privée fictive.
