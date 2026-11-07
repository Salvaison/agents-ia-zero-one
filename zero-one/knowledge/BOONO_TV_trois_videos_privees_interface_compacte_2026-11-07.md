# BOONO-TV — Trois vidéos privées et interface compacte — 7 novembre 2026

## Demande et périmètre
Demande utilisateur : terminer l'ajout de « The House Party You Wish You Were At… » aux côtés de Clemens Costa ; ajouter « Bioluminescent Forest – Deep Psychedelic Dub », source Chromebook `/mnt/chromeos/shared/MyFiles/Amsterdam/YT/` ; sélecteur entre les trois ; éditeurs repliables ; retirer l'overlay « Studio BOONO-TV · Source Amsterdam connectée ». Accès privé Android via Tailscale, sans modification des moteurs PAPER, flux MCB ou calibration des 4 surfaces.

## État constaté et réalisé
- Avant intervention, l'OD-20261107-001 avait déjà le sélecteur Clemens/House Party, mais House Party était un fichier test temporaire et n'était pas installé dans le catalogue permanent. Test UI existant réussi.
- Penguin reconnecté au Remote Desktop Commander par le propriétaire le 07/11 vers 22:27 CET. Deux fichiers originaux identifiés (443760398 et 863195120 octets).
- Copie chiffrée SCP des deux MP4 sur OVH, puis validation FFprobe H.264, extraction AAC audio-only et empreintes SHA-256. Originaux Penguin préservés.
- OVH, répertoire `/home/ubuntu/boono-tv-studio/private-media/` (hors assets publics) : `house-party-private-20261107.mp4` (443760398 octets, 4569.594195 s, SHA-256 `230a59d6bc1f642c4ceb552fe217619c25c944b41ba08e8aa56d39cc3c522214`) et `bioluminescent-forest-private-20261107.mp4` (863195120 octets, 5970.05932 s, SHA-256 `b1556e608670b18d7860eca1dc0c6e750bc461284f6ee5d9fa9e94f86242234f`).
- Catalogue privé étendu à `clemens`, `houseparty`, `forest` ; routes locales privées et import MP4 correspondant. Lecture sélectionnable avec un lecteur/décodeur, Canvas 640x360 12 ips, cycle des 4 surfaces de 21 secondes et bandeau/histogramme suivant la piste.
- UI compacte/éditeurs minimisables et suppression de l'affichage `studio-status.js` étaient déjà intégrés dans OD-20261107-001 ; conservés et revérifiés.
- Le service `boono-mobile-viewer.service` a reçu deux seules autorisations de lecture supplémentaires (`forest/stream`, `forest/audio-only`) ; aucun endpoint d'écriture exposé au spectateur. Lecture par segments Range `HTTP 206` vérifiée pour House Party et Forest sur port privé 3092.
- Autorisation SSH temporaire pour copie SCP ajoutée puis supprimée de `~/.ssh/authorized_keys` sur OVH.

## Tests / preuve
`/home/ubuntu/boono-tv-studio/tests/verify-OD-20261107-002-three-videos.js` exécuté via Puppeteer : trois changements `houseparty → forest → clemens` ; durées 4570/5970/3047 s, un seul lecteur, frames Canvas, zéro erreur de dessin, zéro exception JS, quatre surfaces disponibles ; `TEST_STATUS:0`.
`boono-studio.service` actif, `boono-mobile-viewer.service` actif. Catalogue local retourne trois pistes `ready:true`, `audioReady:true`. Test UI précédent (OD-20261107-001) sans erreurs.
Backups OVH : `/home/ubuntu/boono-tv-studio/backups/OD-20261107-002/`. Code actif uniquement sur OVH. Aucun fichier MP4 dans Git.

## Limites / suite
Un rendu Android réel par l'utilisateur, notamment plein écran horizontal et fluidité dans la durée, reste à valider en situation ; les vérifications d'API et de navigateur automatique ne remplacent pas ce contrôle visuel. Redistribution publique de vidéos et musique tierces non autorisée par cette intervention.
