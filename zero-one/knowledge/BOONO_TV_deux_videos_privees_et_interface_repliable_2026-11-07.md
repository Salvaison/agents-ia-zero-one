# BOONO-TV — Deux vidéos privées sélectionnables, commandes et éditeurs repliables

Date : 7 novembre 2026
Décision : OD-20261107-003
Statut : implémentation et tests sur OVH réussis ; le vrai deuxième MP4 de 423,2 Mo n'a PAS été transféré (Penguin hors ligne). Vérification finale sur le vrai fichier et Chromebook ouverte.

## Demande et disponibilité vérifiée

Le propriétaire montre dans son gestionnaire ChromeOS, dossier YT, un second clip privé « The House Party You Wish You Were At... » (nom tronqué dans la capture) de 423,2 Mo. Il souhaite changer entre celui-ci et Clemens Costa dans BOONO-TV, replier les éditeurs en un bouton et enlever le panneau fixe « STUDIO BOONO-TV · SOURCE AMSTERDAM CONNECTÉE » qui occulte le loft.

Le fichier source est absent des dossiers OVH et Amsterdam. La connexion distante Linux Penguin est hors ligne depuis environ 39 heures au moment de l'inspection. Une capture PNG ne transporte pas la vidéo : aucun transfert du vrai MP4 ne doit être annoncé avant retour de Penguin et validation des octets.

## Ce qui est réellement installé

Un nouveau module de catalogue privé dans runtime/boono-tv/private-media-catalog.js fournit GET /api/private/boono-media/catalog avec deux choix :
- clemens : prêt, vidéo originale intacte ;
- houseparty : attente du fichier original, titre provisoire tronqué, ready:false.

Le lecteur scene/window-local-video.js est maintenant capable de changer de source sans recharger la scène ni créer un second lecteur vidéo. Le titre et la source audio de l'histogramme sont mis à jour par scene/music-ticker.js, sans afficher faussement le spectre Clemens sur la seconde vidéo. Le cycle des quatre surfaces toutes les 21 secondes continue de s'appuyer sur video.currentTime. scene/projection-cycle.js et scene/window-video-test.js reconnaissent les deux identifiants privés.

Import privé préparé pour le navigateur du Chromebook relié au tunnel SSH :
http://127.0.0.1:8310/?mediaImport=1&windowVideo=clemens

Le module scene/media-import.js affiche le choix du fichier MP4 dans YT, la taille, le bouton Importer sur OVH, la progression du transfert et l'état final. Le POST local /api/private/boono-media/import-houseparty reçoit le MP4 en streaming avec contrôle Origin, Host localhost, en-tête spécifique, taille entre 1 et 900 Mio, hash SHA256 et validation du conteneur/codec H264/durée par ffprobe avant stockage atomique hors assets publics. Il extrait ou encode une piste AAC-only privée pour le second décodeur d'histogramme. La passerelle Android Tailscale en lecture seule expose seulement le catalogue et les streams GET, et refuse tous les imports POST en HTTP 405. Le lecteur de la seconde vidéo est désactivé tant que ready:false.

Les commandes vidéo sont réduites par défaut à un bouton « Vidéo / Réglages » (dépliable sans redémarrer le clip). Nouveau scene/editor-minimize.js : bouton équivalent pour l'éditeur de scénarios postures/bulles/accessoires, la calibration des écrans et les cinq ancres du mur ; leurs brouillons restent montés en mémoire pendant la réduction. La feuille scene/boono-v2.css contient le style. scene/index.html ne charge plus studio-status.js, qui insérait l'ancien badge. Le contrôle de santé Amsterdam continue via l'API /api/health ; aucune source de données PAPER n'est supprimée.

## Sauvegardes avant travaux et tests

Backup OVH : /home/ubuntu/boono-tv-studio/backups/OD-20261107-001/ (copies exactes des fichiers JS/CSS/HTML concernés, serveur et deux configurations de perspective). Les deux SHA256 canonisés sont strictement identiques :
- desk/projection-config.json : 39922e2434c59e282d3ee64ff851c6b9def9c43a345d5c2f68cf56b87d112c2f
- desk/grand-screen-config.json : 4cff3e82d4840f72a3006d5a9067508c5c8447af85f3ba954325cada02f0bd8a

Tests HTTP : catalogue GET 200 sur studio et Android, House MP4 absent 404, POST d'import depuis Android 405, POST sans Origin locale 403, page d'import accessible via la route Amsterdam 8310. Le studio et le service spectateur restent actifs sur localhost.

Un MP4 SYNTHÉTIQUE de 16 secondes H264/AAC (1 759 055 octets) a été uploadé temporairement via l'API locale pour valider la chaîne. Le serveur a donné HTTP200, vidéo et audio privé HTTP206 Range et créé une piste AAC-only. Le test Chromium verify-OD-20261107-001-video-switch.js a vérifié la bascule Clemens -> clip de test -> Clemens sur le même élément HTML video, un seul lecteur, le titre correct et spectre audio Live indépendant. Aucune erreur JavaScript.

Le faux MP4, sa piste audio et le manifeste de test ont ensuite été retirés après contrôle strict de l'identité et de la taille du test. Le catalogue final vérifié est clemens ready:true, houseparty ready:false ; le vrai fichier du propriétaire n'a pas été remplacé par une imitation.

Les tests Chromium verify-OD-20261107-001-ui-final.json montrent la disparition du badge de statut, l'affichage du formulaire local uniquement, la lecture Clemens conservée en l'absence du second clip, et les ateliers dialogue/mur/layout repliables sans retirer leur interface de la mémoire. Capture de l'interface : tests/OD-20261107-001-video-controls-expanded.jpg.

## Ce qui reste ouvert

Le propriétaire doit remettre Linux Penguin et le tunnel SSH vers 127.0.0.1:8310 en service, puis sélectionner depuis le dossier YT le vrai fichier à importer. Il faudra alors relever sa taille effective, son SHA256, son vrai nom complet, son codec, sa durée et valider la lecture sur Chromebook et Android. Le code d'import est prêt et testé, mais **le transfert du vrai fichier n'est pas terminé**.

La permission de diffusion publique des deux clips empruntés n'est pas établie : BOONO-TV les utilise en test privé derrière les accès sécurisés existants. Aucun moteur V494/V543 PAPER, collecteur MarketCipher/OKX, masque alpha, sprite, ni réglage de trading n'a été modifié.
