# BOONO-TV — Ordre des plans : vagues, bougies, bulles et personnages

**Date :** 5 novembre 2026
**Décision :** OD-20261105-012
**Statut :** actif sur OVH, testé en Chromium sur les postures assises, debout et l’éditeur ; validation esthétique finale du propriétaire ouverte.
**Périmètre :** CSS de scène seulement, sans modifier les moteurs PAPER, leurs données, le chat, le bureau, les poses, les dialogues ou les coordonnées de calibration.

## Demande et cause

L'utilisateur demande que le rideau MarketCipher 15m/3m et les bougies du prix restent **derrière les bulles**, et que celles-ci soient **derrière BOONO, le chat et le bureau**.

La règle précédente dans scene/styles.css fixait le conteneur parent des bulles boono-stage au z-index **6**, tandis que marketCurtain était au z-index **7** et pricePanel au z-index **8**. La bulle possédait bien z-index 30, mais uniquement dans le contexte d'empilement de son parent : cette valeur ne pouvait pas faire passer la bulle devant les graphes.

La correction est limitée aux deux feuilles CSS du studio :
- scene/styles.css : boono-stage passe de z-index **6 à 9**, le commentaire sur la profondeur est mis à jour.
- scene/boono-v2.css : le sprite boono-standing-back passe de z-index **9 à 10**. Il reste peint derrière le bureau (inséré antérieurement dans le DOM à profondeur égale) mais devant la bulle en posture debout.

**Nouvelle hiérarchie :** rideau 7 → bougies 8 → bulles 9 → bureau / corps arrière de BOONO debout 10 → écrans 11 → sprite BOONO de premier plan 12 → chat 13.

Les éléments de présentation qui ne sont pas concernés (prix Live séparé, badges d'état, illustrations et leur masque, écran TV, éventuel décor vidéo) conservent leurs propres profondeurs.

## Sauvegardes et vérifications

- OVH : sauvegardes de scene/styles.css, scene/boono-v2.css et desk/projection-config.json sous /home/ubuntu/boono-tv-studio/backups/OD-20261105-012/.
- Deux modifications CSS localisées. Aucune relance du navigateur Amsterdam, des collecteurs MCB, des runners V494/V543 PAPER ni du daemon de capture.
- Test Chromium exécuté : /home/ubuntu/boono-tv-studio/tests/verify-OD-20261105-012-layer-order.js. Son JSON de sortie vérifie les profondeurs effectives (7,8,9,10,11,12,13), la présence des vrais canvases du rideau et des bougies, et **zéro erreur JavaScript** sur trois modes.
- Preuves visuelles : OD-20261105-012-seated-layering.jpg, OD-20261105-012-standing-layering.jpg et OD-20261105-012-editor-layering.jpg dans le dossier OVH tests.
- Calibration géométrique du bureau rigoureusement inchangée ; SHA-256 : 39922e2434c59e282d3ee64ff851c6b9def9c43a345d5c2f68cf56b87d112c2f.
- Studio OVH HTTP 200 ; aucun réglage de trading modifié.

**À confirmer dans le navigateur utilisateur :** appréciation visuelle de la superposition sur les différentes expressions et tailles de bulle. Les positions par posture restent issues du document dialogue-script.json sans changement.
