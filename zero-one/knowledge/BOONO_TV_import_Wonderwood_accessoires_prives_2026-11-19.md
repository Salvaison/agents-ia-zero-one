# BOONO-TV — WONDERWOOD et bibliothèque d'accessoires privés
**Date :** 19 novembre 2026. **Décision :** OD-20261119-003 (archivée rétrospectivement, voir origine). **Portée :** studio OVH privé ; aucun changement des moteurs PAPER ou des projections/calibrations enregistrées.

## Mandat et origine
L'utilisateur demande l'import de deux animations Like/Subscribe, trois animations Bitcoin, un symbole BTC, les trois logos affichés dans ses captures (MarketCipher, TradingView, OKX) et une nouvelle vidéo musicale. Il confirme expressément que « the futuristic Sound » désigne **WONDERWOOD 🍄 80s Fantasy Psychedelic Dub.mp4**. Les captures font partie de la source visuelle fournie, non d'une autorisation de diffusion publique.

## Source et transfert
- Originaux sur Chromebook Penguin : /mnt/chromeos/shared/MyFiles/Amsterdam/YT/ (animations et WONDERWOOD) et /mnt/chromeos/shared/MyFiles/Downloads/ (trois PNG de logo).
- Archive JPG BTC : extrait du ZIP vecteezy_bitcoin-symbol-icon-cryptocurrency-logo-in-flat-style_66661436_715.zip, originaux conservés sur Penguin.
- Transfert par tunnel SSH existant Penguin → Amsterdam:8310 → studio OVH:3091 via port local Penguin 19431. Aucun port média public et aucun stockage de la grosse vidéo sur Amsterdam.
- Répertoire OVH des vidéos musicales : /home/ubuntu/boono-tv-studio/private-media/ ; accessoires : private-media/accessories/ ; dérivés : private-media/accessories/processed/. Les fichiers importés sont en mode 0600 et non versés aux assets Git ou aux chemins statiques publics.
- **WONDERWOOD** : 502 804 176 octets, SHA-256 06c009876f61255942b409e3d498912afa541c949be0676a73a86cbe93e1686c ; 6 594,351 s, H.264 854×480, AAC. Piste audio seule AAC/M4A séparée préparée pour l'histogramme musical Live.

## Composer → Accessoires
Bibliothèque de **neuf nouveaux éléments fournis** : 2 animations Like/Subscribe ; 3 vidéos Bitcoin (circuit, or 3D, digital bleu) ; symbole Bitcoin en JPG ; logos MarketCipher, TradingView et OKX en PNG. Le mug prototype déjà en place demeure indépendant.

Les scripts du Composer utilisent les mêmes identifiants temporels, réglages par posture, positions X/Y, échelle 40–250 %, début/fin 0–100 %, aperçu et bouton Enregistrer. Tout nouveau réglage est **désactivé par défaut** dans les 12 scénarios existants ; desk/projection-config.json et desk/dialogue-script.json n'ont pas été remplacés.

Les deux Like/Subscribe et le BTC or 3D avaient un fond vert. Des dérivés WebM VP9 avec alpha sont utilisés pour la scène ; alpha_mode=1 vérifié. Les deux autres vidéos Bitcoin sont dérivées à 720 px, H.264, pour alléger le décodage, sans réduire explicitement la cadence. OKX et TradingView ont des PNG à fond noir retiré. Le logo MarketCipher et l'image BTC sont préservés tels que fournis. Les versions originales restent disponibles sur OVH en privé.

## Video Viewer
- Ajout au catalogue comme quatrième source privée : WONDERWOOD · 80s Fantasy Psychedelic Dub, après Clemens, House Party et Bioluminescent Forest.
- URL privée de flux avec réponse HTTP Range et segments bornés, piste audio seule privée pour le spectre réel ; lecteur existant, même décodeur vidéo/canvas, commandes, titres et alternance de quatre surfaces conservés.
- Les onglets Live/Vidéos et le retour du Composer préservent l'identifiant de source WONDERWOOD ; aucun nouveau lecteur concurrent ni modification du pont Amsterdam.
- Toutes les sources tierces restent des essais privés. **Aucun droit de diffusion ou de retransmission YouTube présumé** pour WONDERWOOD, Vecteezy, MarketCipher, TradingView ou OKX.

## Fichiers OVH modifiés
- Serveur : runtime/boono-tv/studio-server.js (validation des IDs d'accessoires, montage route privée), private-media-catalog.js (quatrième vidéo), **nouveau** private-media-extensions.js (endpoints privés et import temporaire).
- Client : scene/accessory-sprites.js, storyboard-timeline.js, dialogue-editor.js, styles.css, window-local-video.js, music-ticker.js, projection-cycle.js, composition-tabs.js, window-video-test.js, wall-editor.js, index.html.
- Copie de sécurité des anciens fichiers ciblés : /home/ubuntu/boono-tv-studio/backups/20261119-private-media/. Aucun reset global Git, aucun changement de /desk/projection-config.json.

## Tests et état
- Les 10 médias originaux ont été transférés avec accusés de réception tailles et empreintes SHA-256. ffprobe vérifie les codecs, durées et résolutions. Les dérivés alpha ont été décomposés sur fond coloré pour contrôle du détourage.
- node --check réussi sur les fichiers JS concernés.
- Après redémarrage du **seul** service systemd utilisateur boono-studio, l'interface studio HTTP 200, le catalogue privé annonce 4 vidéos disponibles, chacune ready=true ; storyboard GET conserve 12 scénarios. Tests HTTP Range 206 réussis pour Wonderwood, piste audio et tous les nouveaux assets dérivés ; type MIME conforme.
- Route d'upload temporaire refermée (POST retourne 404) ; routes de lecture privées conservées ; service boono-studio actif. La calibration et les runners PAPER d'Amsterdam n'ont pas été modifiés.
- **Ouvert :** contrôle manuel visuel dans Chrome/noVNC du Composer → Accessoires (chaque objet, posture, timing, échelle, enregistrement, repositionnement), des animations alpha WebM dans le navigateur réel, du sélecteur WONDERWOOD, du son et des quatre projections en rotation. Les vérifications HTTP/Node ne suffisent pas à annoncer cet essai comme réalisé.

## Reprise / rollback
Relire les sauvegardes et l'état courant avant toute correction, ne jamais écraser les calibrations récentes. Pour revenir à l'ancienne interface, restaurer uniquement les fichiers ciblés depuis backups/20261119-private-media/ et redémarrer boono-studio après vérification du diff ; conserver l'ensemble des vidéos et les données du Composer. L'absence de droits publics demeure une limite de publication, non un incident technique.
