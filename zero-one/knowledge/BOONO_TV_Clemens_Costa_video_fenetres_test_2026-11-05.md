# BOONO-TV — Essai audiovisuel Clemens Costa derrière les fenêtres du loft

**Date :** 5 novembre 2026. **Décision :** OD-20261105-014. **Statut :** MP4 complet sur OVH, lecture vidéo et contrôle audio testés dans Chromium ; essai privé de mise au point, droits de diffusion publique NON établis. Aucun changement au trading ni aux masques GIMP.

## 1. Fichier original et transfert

L'utilisateur a joint « we turned my kitchen into a club.mp4 » et indiqué sa présence dans le dossier partagé Chromebook / Amsterdam / YT. Fichier trouvé sur Penguin :
/mnt/chromeos/shared/MyFiles/Amsterdam/YT/we turned my kitchen into a club.mp4

Taille **136 905 428 octets** (~130,6 MiB) ; SHA-256 **6cc415c586e546293ff320d150c882ee973efa011aa693ddfb155c6dbe1f7904**, identique à l'upload. H.264 640 × 360, 30 images/s, AAC stéréo 44,1 kHz, durée **3047,386848 s** (50 min 47 s). L'artiste Clemens Costa est indiqué par l'utilisateur ; avoir emprunté le fichier pour un essai ne prouve pas les droits de diffusion publique.

Transfert effectué par le tunnel SSH existant Penguin 8310 → Amsterdam 8310 → OVH 3091, via un point d'import streaming à jeton unique et vérification de la taille/hash. Réponse HTTP 200, tous les octets reçus et hash correspondant. Fichier stocké en privé hors de l'arborescence des assets web :
/home/ubuntu/boono-tv-studio/private-media/clemens-costa-kitchen-club-20261105.mp4
Mode de fichier 0600. Poster JPEG dérivé localement de la 32e seconde :
/home/ubuntu/boono-tv-studio/private-media/clemens-costa-preview-20261105.jpg

Le jeton d'import est consommé et supprimé. L'endpoint POST temporaire est **supprimé** du serveur et retourne HTTP 404.

## 2. Diffusion privée au navigateur du Chromebook

Le serveur de studio OVH ne publie aucun fichier dans /assets : les routes GET privées sont limitées aux requêtes bouclées depuis localhost/tunnel SSH :
- /api/private/clemens-video/status : taille, durée et état prêt, avec publicationRights = NOT_VERIFIED_FOR_PUBLIC_DISTRIBUTION ;
- /api/private/clemens-video/poster : aperçu JPEG ;
- /api/private/clemens-video/stream : MP4 intégral servi par flux HTTP avec Range, Content-Range et réponses 206.

Contrôles : demande des octets 0–1023 → HTTP 206 avec 1024 octets identiques à l'original ; plage impossible → 416 ; Host extérieur example.com → 403 ; même flux via le tunnel Penguin 8310 → 206. Aucun contournement du lecteur YouTube n'est nécessaire : la vidéo provient d'un fichier explicitement fourni par l'utilisateur.

## 3. Composition et réglages de lecture

Mode privé activé uniquement par URL :
http://127.0.0.1:8310/?showcase=1&windowVideo=clemens

Le nouveau scene/window-local-video.js ajoute un élément HTML video sous la peinture du loft, visible à travers les véritables fenêtres transparentes (layer 760 × 422). La scène, l'illustration, les quatre variantes des deux masques alpha indépendants, le chat, les postures, le bureau et sa calibration ne sont pas modifiés. Le paysage standard revient dès que le paramètre windowVideo=clemens est absent.

Lecture automatique **muette**, boucle, lecture vidéo au format original. Un panneau de contrôle privé en bas de l'État vivant donne Lire/Pause, Activer/Couper le son, volume et déplacement dans la durée. L'activation sonore exige un clic utilisateur ; si la BOONO Radio de test est active, elle est arrêtée via sa commande normale avant d'activer le son vidéo. Le lecteur réside dans le navigateur du spectateur, pas dans un média rendu par le serveur. Le script YouTube expérimental précédent reste désactivé dans ce mode pour éviter deux vidéos superposées.

Code modifié : studio-server.js (routes privées et Range), scene/window-local-video.js (nouveau), scene/index.html, scene/window-video-test.js (priorité au MP4 privé), scene/boono-v2.css (couche fenêtre et commandes). Aucun runner, bridge marché ou collecteur modifié.

## 4. Tests et conservation

Backup antérieur sur OVH :
/home/ubuntu/boono-tv-studio/backups/OD-20261105-014/
contenant studio-server.js, boono-v2.css, index.html, window-video-test.js, loft-mask-switcher.js et projection-config.json.

Chromium test : /home/ubuntu/boono-tv-studio/tests/verify-OD-20261105-014-local-video.js et résultat JSON ; captures OD-20261105-014-normal-loft.jpg, normal-window.jpg, clemens-loft.jpg et clemens-window.jpg.

**Résultats :**
- Mode standard sans paramètre : aucun lecteur ni contrôles vidéo, skyline original visible.
- Mode Clemens : vidéo **playing**, readyState 4, durée 3047,386848 s, vidéo H.264 640 × 360, temps de lecture passé à 2,59 s, muette par défaut.
- Requêtes de flux HTTP Range observées (bytes=0-, bytes=1146880-, etc.) ; audio activé par clic (muted false), Pause puis Lire réussis, retour au mode muet.
- L'image de baie vitrée diffère bien du skyline (écart moyen 44,01 sur pixels testés) : le club est visible derrière le loft sans modification du masque.
- Zéro erreur JavaScript. Tous les scripts modifiés passent node --check. Le studio répond HTTP 200 ; le tunnel Penguin et le lecteur privé répondent correctement.
- SHA-256 de projection-config.json **inchangé** : 39922e2434c59e282d3ee64ff851c6b9def9c43a345d5c2f68cf56b87d112c2f.

## 5. Limites

Il s'agit d'un **test audiovisuel privé**, sans droit de diffusion publique présumé. Une diffusion BOONO-TV publique nécessite l'accord explicite de Clemens Costa ou de l'ayant droit. La lecture pendant 50 minutes et le comportement du son sur le Chromebook réel restent à valider humainement : les tests automatisés ont confirmé les premières secondes, le streaming et les commandes.

Les moteurs PAPER V494/V543, collecteurs MCB, écran TradingView, sauvegardes et calibration ne sont pas modifiés. La trace de décision distingue explicitement implémentation, tests et mise en service.
