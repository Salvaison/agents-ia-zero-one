# BOONO-TV — Bandeau musical défilant et histogramme audio authentique

**Date :** 6 novembre 2026
**Décision :** OD-20261106-007
**Statut :** actif sur OVH, tests de scène et vidéo réussis dans Chromium ; lecture/lisibilité finale sur le Chromebook du propriétaire à confirmer.
**Frontière :** aucun changement des moteurs PAPER, collecteurs, flux de marché, sprites, chat, masques GIMP, calibration du bureau et des cinq ancres, ni du MP4 Clemens original.

## Demande et résultat

Le propriétaire demande un bandeau horizontal de 20–30 pixels au milieu tout en haut de l'image du loft, avec le texte défilant exact « Clemens Costa - We turned my kitchen into a club » et un histogramme dynamique du son. Il demande de remplacer le petit prix Live du haut du décor et de faire disparaître les deux affichages SHOWCASE du bas, dont les qualifications risqueraient d'être obsolètes avec les futurs sets de postures.

Le nouveau bandeau fait **680 × 27 pixels en coordonnées de scène 1200×1080**, centré (left 50 %, translation -50 %) et situé à 5 pixels du bord supérieur. Le titre est rendu par deux copies de la même phrase dans un carrousel CSS continu de 21 secondes, à fond bleu pétrole/gris mat et bordure discrète cyan. L'égaliseur est un Canvas 148×20 pixels, à 16 bandes de fréquences, cadencé à environ 10 images par seconde. Il est affiché seulement si l'URL contient windowVideo=clemens. Le mode réduit les animations selon prefers-reduced-motion.

## Source réelle du son, sans toucher au circuit audio de ChromeOS

Comme la vidéo et les sprites BOONO ont connu un problème de compétition de ressources sous ChromeOS, il était important de NE PAS ajouter de deuxième décodeur MP4, de WebAudio AudioContext, ni réorienter le son du lecteur. La solution lit les **fréquences réellement présentes dans l'audio du MP4 original**, analysées une seule fois HORS NAVIGATEUR, et utilise ensuite les niveaux numériques synchronisés avec video.currentTime.

Fichier d'entrée exact : /home/ubuntu/boono-tv-studio/private-media/clemens-costa-kitchen-club-20261105.mp4
SHA-256 : 6cc415c586e546293ff320d150c882ee973efa011aa693ddfb155c6dbe1f7904.

Analyse effectuée sur OVH avec ffmpeg et Node : PCM mono à 8192 Hz, fenêtre de Hann, FFT de 1024 points, 16 bandes logarithmiques d'environ 25 à 4096 Hz, quantiles de normalisation robustes par bande. Fréquence analytique : **8 mesures par seconde** pendant toute la chanson (24 379 instants sur environ 3047,375 secondes). Le navigateur interpole les niveaux de deux instants adjacents et redessine au plus 10 fois par seconde. Aucune fausse oscillation synthétique.

La sortie numérique, privée et non reconstructible comme musique, fait **390 080 octets** (~381 KiB) :
/home/ubuntu/boono-tv-studio/private-media/clemens-costa-kitchen-audio-spectrum-8fps-16bands.bin
SHA-256 : a0ac3114b20374301fd25ef8ea87841ef3a81fcd9007e10e2ef6201974cee5e7.
Le script d'analyse ponctuelle est conservé dans /tmp/boono_OD007_precompute_spectrum.js. Le fichier de métadonnées associé conserve la provenance et les bandes utilisées.

Le studio OVH sert la sortie sous GET /api/private/clemens-video/spectrum, avec la même protection localhost/tunnel SSH que le MP4 utilisateur et Cache-Control privé. Les connexions avec Host extérieur sont refusées HTTP 403. Le spectre est téléchargé une seule fois par chargement de la scène, puis échantillonné à video.currentTime. Une pause fige les barres ; un seek retrouve exactement la bonne portion musicale. L'histogramme suit les quatre projections (fenêtres, affiches, bureau et grand écran) sans créer de second flux audio.

## Libellés supprimés visuellement, trading préservé

Retraits CSS seulement, sans supprimer les éléments DOM ou modifier les décisions :
- priceLiveTag : ancienne grande étiquette prix flottante du loft ;
- pricePanelLive : deuxième petit prix LIVE trouvé à y≈30 px de la scène (le véritable libellé à remplacer en haut) ;
- showcaseBadge : compteur de posture SHOWCASE ;
- sceneStateChip : autre qualification SHOWCASE / SCENE ;
- boonoV2Label : badge BOONO-TV V2 / nom de posture / simulation.

Les noms SHOWCASE restent utilisables dans les fonctions internes de prévisualisation mais ne s'affichent plus en bas du loft. La grande valeur prix Live de l'État vivant, les données de bougies, la conversion et les courbes MarketCipher continuent à s'actualiser normalement. Le bandeau est masqué dans wallEdit/layoutEdit afin que les poignées de calibration restent accessibles.

## Modifications déployées

Avant le travail : backups intégraux dans
/home/ubuntu/boono-tv-studio/backups/OD-20261106-007/
(boono-v2.css, styles.css, index.html, window-local-video.js, projection-cycle.js, studio-server.js, projection-config.json, grand-screen-config.json).

Modifications de scène réellement actives :
- Nouveau scene/music-ticker.js : titre, 16 bandes audio numériques, Canvas de faible cadence, lecture par position du MP4 et nettoyage.
- scene/boono-v2.css : bandeau 27px, CSS marquee, 5 badges du loft masqués sans altérer les graphiques de prix.
- scene/index.html : chargement du nouveau script versionné et cache-busting CSS.
- studio-server.js : une route GET privée pour le spectre.
- Nouveau fichier privé binaire du spectre et métadonnées, issu du MP4 utilisateur inchangé.

Les deux masques alpha du loft, les quatre surfaces de projection, le player privé, la vidéo Clemens, la géométrie des écrans du bureau et le grand écran mural ne sont pas modifiés.

## Tests Chromium OVH et vérifications

1. Test verify-OD-20261106-007-music-banner.js : bandeau présent seulement en mode Clemens et centré, hauteur 27px, deux copies exactes du titre et animation horizontale. Lecture du fichier spectre 24379x16 avec un seul élément video. Aux positions ~0, 2, 35, 125, 268 secondes, les pixels de l'histogramme diffèrent sensiblement selon les fréquences de la piste ; à la pause, les barres restent identiques. Aucun message JS. La source prix Live dans l'État vivant reste visible.
2. Diagnostic inspect-OD-20261106-007-live-label.js : distinction nécessaire entre les deux libellés de prix ; le second pricePanelLive était encore visible à y≈30px tant que sa suppression n'était pas explicitement ciblée.
3. Test verify-OD-20261106-007-scene-regression.js : modes normal, fenêtres, affiches, les deux moniteurs, grand écran et éditeur mural à cinq ancres. Les cinq badges visuels du loft sont maintenant masqués, le prix vivant et les bougies demeurent visibles, le bandeau est actif seulement pendant la piste Clemens et absent pendant la calibration des poignées ; zéro erreur JS. Image du rendu final : OD-20261106-007-final-grand-with-music.jpg.
4. Rotation réelle après changement : verify-OD-20261106-007-actual-21s.json : fenêtres vers affiches à 21,2 secondes ; aucun événement pause, changement de source 0, un seul lecteur MP4. Recherches 42,6 / 63,6 / 84,6 secondes : bureau / grand / fenêtres.
5. Charge avec processeur Chromium 4x ralenti : verify-OD-20261106-007-cpu-regression.json : clip audio/vidéo avance ~4,4 s pendant 4,4 s, environ 41 images de projection, BOONO reste visible, zéro erreur JavaScript. Ce n'est pas une mesure de consommation CPU du vrai Chromebook.
6. GET spectre HTTP 200, Content-Type octet-stream, 390080 octets et SHA-256 identique à la source calculée ; Host invalide : 403. Les tests Node --check sont valides.

L'invariant du bureau reste SHA-256
39922e2434c59e282d3ee64ff851c6b9def9c43a345d5c2f68cf56b87d112c2f
pour desk/projection-config.json. Le fichier utilisateur du grand écran conserve SHA-256
4cff3e82d4840f72a3006d5a9067508c5c8447af85f3ba954325cada02f0bd8a
pour desk/grand-screen-config.json.

**Limites :** examen final de la lisibilité sur Chromebook ouvert, et petit glitch du premier chargement des projections en simple observation conformément à la demande antérieure. Le test Clemens Costa demeure privé et ne confère aucune licence de diffusion publique.

URL d'essai :
http://127.0.0.1:8310/?showcase=1&windowVideo=clemens&projectionCycle=21
