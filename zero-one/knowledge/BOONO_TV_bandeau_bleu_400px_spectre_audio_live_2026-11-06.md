# BOONO-TV — Bandeau compact bleu et spectre audio Live par second décodeur

**Date :** 6 novembre 2026
**Décision :** OD-20261106-008
**Statut :** actif sur OVH, analysé et testé dans Chromium. Validation visuelle et de charge sur le Chromebook du propriétaire encore ouverte.
**Frontière :** aucun changement des moteurs PAPER, collecteurs, sprites, masques GIMP, géométrie validée du bureau ou grand écran, ni de la vidéo originale.

## Demande et positionnement

L'utilisateur demande explicitement de réduire le bandeau musical à **un tiers de la largeur du loft**, d'agrandir la police et de la rendre **bleu intense sur fond transparent**. Il corrige « 2àpx » en **« 20pixel »** pour préciser la descente par rapport à l'ancien bord du plafond. Il souligne que le spectre pré-calculé ne convient pas à une émission Live ou à un morceau de 3 heures, et demande un **second décodeur audio** si possible.

Le loft vaut 1200×1080 unités de scène. L'ancien bandeau faisait 680×27 et top=5. Le nouveau fait exactement **400×27 et top=25**, centré horizontalement à 50 %, avec une police **21px bold** de couleur **#167dff** sur fond **transparent**, sans bordure ni ombre de boîte, avec une ombre limitée au texte pour la lisibilité. Il conserve le titre défilant exact :

Clemens Costa - We turned my kitchen into a club

Les 16 barres occupent désormais un Canvas transparent de **96×20** à droite du titre. L'animation du texte continue sur environ 21 secondes. Mesure réelle dans Chromium : le loft affiche une largeur de 1000px et le bandeau 333,33px, soit exactement un tiers ; sa hauteur rendue de 22,5px correspond aux 27px de scène, et son haut à 20,83px écran correspond aux 25px de scène (20px plus bas que l'ancien top de 5).

## Second décodeur audio, sans modifier la vidéo

La vidéo Clemens Costa conserve son unique lecteur HTML5 MP4 H.264/AAC et son rendu vidéo Canvas, solution validée auparavant sur ChromeOS. Le second décodeur demandé est uniquement un **décodeur audio AAC**, sans deuxième couche vidéo.

Pour cela, la piste AAC stéréo d'origine a été extraite sans réencodage : ffmpeg -map 0:a:0 -vn -sn -dn -c:a copy -movflags +faststart. Nouveau fichier **M4A audio seul** :
/home/ubuntu/boono-tv-studio/private-media/clemens-costa-kitchen-audio-only-20261106.m4a

Taille **49 284 408 octets**, codec AAC stéréo 44100Hz à 127999 bits/s, durée **3047,386848s**, SHA-256 :
450da9927699237dd8756c5d393d4dc3379b85df388ae429ca3412a87aec419a

Le MP4 utilisateur reste inchangé : SHA-256 6cc415c586e546293ff320d150c882ee973efa011aa693ddfb155c6dbe1f7904.

Le serveur de studio OVH expose le M4A via une nouvelle route privée GET /api/private/clemens-video/audio-only. La route impose le même contrôle localhost / tunnel SSH que le MP4 et fournit des réponses HTTP Range limitées à **2MiB**. En dehors de ce tunnel, Host extérieur refusé par HTTP **403**. Le fichier n'est pas placé dans les assets publics.

Dans scene/music-ticker.js, le second élément Audio décodé est relié à WebAudio :
AudioContext → MediaElementAudioSourceNode → AnalyserNode → GainNode(gain=0) → destination.
La dernière branche met l'audio de l'analyseur à **zéro volume** : aucun second son audible, aucun détournement du son du lecteur vidéo initial. L'analyseur fait une FFT 2048, avec 16 bandes logarithmiques approximativement 45–8000Hz, et redessine le petit Canvas environ 10 fois/seconde. Le signal est échantillonné **pendant** la lecture de l'AAC et non calculé à l'avance, ce qui permet de traiter un morceau long ou, ultérieurement, un flux Live approprié sans pré-calcul complet.

**Limite honnête :** ce second décodeur est connecté aujourd'hui au M4A de Clemens Costa. L'importation automatique d'un flux Live quelconque n'est **pas** implémentée : il faudra une source audio autorisée, décodable par le navigateur, accessible avec ses conditions d'accès / CORS et synchronisable avec son lecteur vidéo ou son horloge.

## Synchronisation, activation et secours

Le second audio suit video.currentTime et les événements play, pause, seek, reprise et changement de vitesse. Toute dérive dépassant environ ±0,35s est corrigée, et un seek force immédiatement la synchronisation.

ChromeOS peut suspendre WebAudio avant un geste utilisateur, et un décodeur supplémentaire au premier chargement pourrait refaire apparaître le problème de sprites. Le mode par défaut conserve donc l'ancien spectre réel **précalculé** comme secours, **explicitement étiqueté** « Spectre du fichier · secours ». Le second AAC n'est pas chargé avant l'activation. Un bouton dans le panneau vidéo, **Activer spectre LIVE**, crée et déverrouille le second lecteur sur clic. Cliquer sur les contrôles vidéo existants Lire/Pause ou Activer le son effectue également cette activation automatiquement. Après démarrage, le panneau indique « LIVE · décodeur audio indépendant ». Si WebAudio est interdit/suspendu, le secours est conservé sans prétendre être Live.

Mode test forçant uniquement le secours : ajouter &audioSpectrum=offline à l'URL.

Diagnostic read-only : window.BoonoTVMusicTicker.getStatus() expose mode, audioTime, videoTime, audioDriftSec, contextState, syncCorrections, draws et liveError.

## Fichiers modifiés, sauvegardes

Sauvegarde préintervention :
/home/ubuntu/boono-tv-studio/backups/OD-20261106-008/
avec anciens music-ticker.js, boono-v2.css, index.html, window-local-video.js, studio-server.js, projection-config.json et grand-screen-config.json.

Sur OVH, modifications actives :
- studio-server.js : route privée M4A audio-only avec HTTP Range ;
- scene/music-ticker.js : second décodeur AAC et analyseur WebAudio, spectre secours, synchronisation vidéo, contrôle d'activation, 16 bandes bleues ;
- scene/boono-v2.css : largeur 400px, top25, fond transparent, titre 21px intense blue et barre audio 96px ;
- scene/index.html : versions CSS/JS OD20261106-008 pour contourner le cache Chrome ;
- nouveau M4A privé audio-only dérivé par simple copie du flux AAC original.

L'ancien spectre numérique calculé (390080 octets) reste disponible comme secours. Aucun moteur audio/vidéo principal, aucune source TV, aucun sprite BOONO et aucune calibration de perspective ne sont modifiés.

## Tests Chromium et résultats

1. verify-OD-20261106-008-live-audio-final-result.json : après clic sur Activer spectre LIVE, AudioContext en état running, audio MP4 privé en lecture synchronisée et réponses AAC HTTP 206 plafonnées à 2MiB. Le spectre est différent aux secondes ~2, ~3, ~141, suit un seek à 140s puis pause/reprise. Écarts audio/vidéo observés **de -1ms à +44ms** ; pause de l'élément audio et du spectre parfaitement stable, aucune erreur JS.
2. verify-OD-20261106-008-gesture-fallback-result.json : mode BOONO-TV standard sans lecteur ni bandeau ; mode &audioSpectrum=offline avec secours, **aucune deuxième piste téléchargée** ; mode normal de vidéo avec secours initial puis clic Activer le son déclenchant WebAudio Live, dérive ~21ms, son original déverrouillé, zéro erreur JS.
3. verify-OD-20261106-008-live-audio-cpu-final.json : avec CPU Chromium normal et artificiellement ralenti ×4, le temps de vidéo ET d'audio progresse d'environ 4,61s pendant 4,61s. Les Canvas vidéo source produisent respectivement 47 et 45 images ; le spectre Live 46 et 42. BOONO reste visible, aucune erreur ; dérive finale ~2ms. Thread principal Chromium mesuré ~540ms sur 4,6s sans frein, ~1928ms avec CPU×4. Ces mesures serveur ne remplacent pas le contrôle des ressources ChromeOS.
4. verify-OD-20261106-008-scene-regression-result.json : bandeau affiché dans fenêtres, affiches, bureau et écran géant, masqué dans l'atelier mural et absent en mode BOONO-TV normal ; labels SHOWCASE disparus du loft, prix Live véritable conservé, aucune erreur JS.
5. verify-OD-20261106-008-actual-21s-result.json : vrai cycle toujours fenêtres → affiches à 21,2s avec **0 pause et 0 changement src**, un seul lecteur vidéo ; puis bureau/grand/fenêtres aux secondes ~42,6/63,6/84,6. Cela préserve la séparation du moteur de marché et des surfaces audiovisuelles.
6. Source M4A inspectée par ffprobe et endpoint contrôlé HTTP 206 audio/mp4, 1024 octets pour Range 0-1023, refus d'un Host externe HTTP 403. Node --check validé pour fichiers modifiés.
7. Capture : OD-20261106-008-blue-400-top25-live.jpg, bandeau compact bleu transparent et histogramme temps réel au sommet du loft ; plusieurs instants de vidéo et mise en pause vérifiés.

**Calibration du bureau inchangée** :
SHA-256 39922e2434c59e282d3ee64ff851c6b9def9c43a345d5c2f68cf56b87d112c2f

**Grand écran mural à cinq ancres inchangé** :
SHA-256 4cff3e82d4840f72a3006d5a9067508c5c8447af85f3ba954325cada02f0bd8a

La vidéo Clemens Costa demeure un test audiovisuel **privé**, aucune autorisation de diffusion publique n'est déduite du fait que le propriétaire l'a empruntée.

## Points ouverts

- Juger la lisibilité du nouveau titre et le rythme du spectre sur le véritable Chromebook.
- Surveiller CPU/RAM/latence du second décodeur audio et revenir au secours en cas de surcharge.
- Pour les prochaines émissions Live, brancher un véritable flux audio source et ses droits avant de revendiquer une compatibilité universelle.
- Conserver le bref glitch de la première activation des surfaces seulement en observation comme décidé précédemment.

**URL de test :** http://127.0.0.1:8310/?showcase=1&windowVideo=clemens&projectionCycle=21
