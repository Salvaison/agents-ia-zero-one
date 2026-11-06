# Origine, portée et chronologie — OD-20261106-002

**Date :** 6 novembre 2026. **Auteur de la demande :** propriétaire BOONO Systems.
**Autorisation :** demande de diagnostic et de tentative de solution pour la scène audiovisuelle privée, sans instruction de modifier le trading.

**Provenance exacte :** 01 contient intégralement et littéralement le message utilisateur. 02 est le plan communiqué par l'assistant **avant les actions**, et non le prompt d'un agent externe. Les opérations ont été conduites directement au travers des outils Remote Desktop Commander ; les appels exacts et leurs résultats sont dans l'historique de conversation, les diffs et la note technique. Aucune instruction d'un agent externe distinct n'a été envoyée.

**IMPORTANT — archivage tardif :** le dossier OD est créé **après** les premiers contrôles et changements OVH. C'est un écart réel à la règle de création du registre avant exécution ; il est explicité ici et n'est pas présenté comme une autorisation préexistante. Ne pas requalifier rétrospectivement la chronologie.

**Problème :** vidéo Clemens Costa lue en test privé ChromeOS : sprites BOONO absents pendant lecture, présents après pause ; les chats paraissent décalés, l'État vivant et les bulles continuent.

**État antérieur :** OD-20261105-015 (PNG de premier plan DOM), puis OD-20261106-001 (vidéo recopiée vers Canvas à 12 ips) avaient été mis en service, mais pas validés sur le Chromebook. Les rapports KB de ces OD démontrent des tests Chromium réussis ; ils ne démontrent pas la correction du GPU ChromeOS.

**Décision de maintenance limitée :** corriger le chemin de chargement du PNG : charger l'image directement dans son élément DOM plutôt que dépendre de `new Image().decode()` hors DOM. Réduire les rafales réseau du MP4 privé en limitant à 2 MiB les requêtes HTTP Range ouvertes (`bytes=n-`). Versionner l'URL du script pour contrecarrer le cache. Aucune modification des masques, images approuvées, coordonnées des chats, calibration GIMP ni politique/collecte BOONOTRADE.

**Périmètre technique :** uniquement OVH `runtime/boono-tv/{scene/window-local-video.js,scene/index.html,studio-server.js}` et redémarrage contrôlé du service systemd utilisateur `boono-studio`. Sauvegardes dans `/home/ubuntu/boono-tv-studio/backups/BOONO_AV_SPRITES_20261106/`.

**Contrôle de validité :** les mesures de CPU et la reproduction du blocage `decode()` proviennent de VPS/Chromium, pas du Chromebook. Des tests Puppeteer Chromium ont vérifié vidéo+Canvas, 12 poses et cinq chats, avec et sans CPU ×4. La cause GPU ChromeOS est encore une hypothèse. La validation de l'utilisateur reste requise.

**Documentation :** `knowledge/BOONO_TV_incident_video_sprites_charge_2026-11-06.md`.
