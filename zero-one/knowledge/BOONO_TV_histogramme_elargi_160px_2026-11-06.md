# BOONO-TV — Histogramme musical élargi à 160 pixels

**Date :** 6 novembre 2026
**Décision :** OD-20261106-010
**Statut :** mise à jour CSS/JS active sur OVH, test Chromium avec vrai analyseur WebAudio et retour visuel réussi. Contrôle final Chromebook toujours ouvert.

## Demande

Le propriétaire valide le nouveau bandeau musical transparent, puis demande simplement que **l'histogramme occupe davantage de place**. Les paramètres validés précédents doivent être préservés : bandeau de **400×27 px**, soit un tiers du loft en largeur, position **top 25 px** (20 px sous sa position initiale), titre « Clemens Costa - We turned my kitchen into a club » en bleu intense 21 px, défilement horizontal, sans fond opaque.

## Modification ciblée

- Canvas de l'histogramme dans scene/music-ticker.js : **160×20** au lieu de **96×20**.
- Seize bandes de fréquences réelles, largeur de chaque barre **7 px** au lieu de 4, espacement **3 px** au lieu de 1 ; bord latéral initial 2 px.
- CSS scene/boono-v2.css : largeur visuelle fixée à **160 px**. L'histogramme utilise désormais **40 % du bandeau** au lieu de 24 %, et laisse environ 240 px pour le texte défilant.
- scene/index.html : URL de music-ticker.js portée à la version OD20261106-010 afin d'éviter le cache ChromeOS.

Le signal spectral n'est pas inventé : il provient toujours du deuxième décodeur AAC seul synchronisé au MP4 via AudioContext/AnalyserNode lorsque l'utilisateur active le spectre LIVE, avec secours de FFT pré-calculée explicitement étiqueté. **Aucun second lecteur vidéo** et aucune modification de la piste originale.

L'ancien rendu et les deux fichiers de scène sont sauvegardés avant changement :
/home/ubuntu/boono-tv-studio/backups/OD-20261106-010/
(music-ticker.js, boono-v2.css, index.html).

## Vérifications réelles

Test Chromium sur OVH :
/home/ubuntu/boono-tv-studio/tests/verify-OD-20261106-010-wider-histogram.js
et verify-OD-20261106-010-wider-histogram-result.json.

- Bandeau : largeur écran mesurée 333,33 px pour un loft de 1000 px, **exactement 1/3** ; hauteur et top de scène conservés.
- Histogramme : 133,33 px rendus à l'écran pour un bandeau de 333,33 px, donc **40,0 %** ; dimensions internes du Canvas **160×20**.
- Titre exact inchangé, transparent, police bleu intense ; spectre en mode **live**, AudioContext actif.
- Les valeurs des pixels de l'histogramme changent avec les sons : somme RGB 290 934 puis 465 108 ; dérive audio/vidéo lors du test environ **−10 ms**.
- BOONO reste prêt, aucun message d'erreur JavaScript.
- Capture de preuve : tests/OD-20261106-010-histogram-160px-live.jpg.

**Aucun changement** des moteurs V494/V543 PAPER et collecteurs, du fichier MP4, des paramètres de la vidéo et quatre projections, du grand écran à cinq ancres, des masques alpha du loft, des scripts de posture et des prix Live.

Calibration du bureau SHA-256 : 39922e2434c59e282d3ee64ff851c6b9def9c43a345d5c2f68cf56b87d112c2f.
Calibration du grand écran SHA-256 : 4cff3e82d4840f72a3006d5a9067508c5c8447af85f3ba954325cada02f0bd8a.

## Observation

Le rendu client ChromeOS doit être jugé par le propriétaire : le texte défilant dispose maintenant de moins de place mais conserve son grand corps de 21 px et continue de circuler. Le décodage Live audio reste déclenché par clic, avec secours explicite. La vidéo reste en démonstration privée sans licence de diffusion publique présumée.
