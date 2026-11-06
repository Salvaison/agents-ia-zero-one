# BOONO-TV — Perspective du grand écran et rideau/bougies derrière la vidéo

**Date :** 6 novembre 2026
**Décision :** OD-20261106-004
**Statut :** implémenté sur OVH, testé en Chromium et en lecture continue. Jugement final du positionnement sur le vrai Chromebook ouvert.
**Frontière :** uniquement le grand écran dans le mode de test privé Clemens Costa. Moteurs V494/V543 PAPER, collecteurs MCB, les 12 sprites, le chat, les bulles, les images GIMP, les deux masques du loft et la calibration existante intacts.

## Demande et observation

L'utilisateur valide la rotation vidéo toutes les 21 secondes comme entièrement fluide après un petit glitch au premier affichage des surfaces. Il qualifie ce glitch de négligeable et demande de le garder sous observation, sans nouveau chantier. Il demande ensuite de modifier les quatre coins du grand écran pour suivre le tracé rouge du loft, que la vidéo soit mise dans la même perspective, et de placer le rideau MCB et les bougies derrière le grand écran.

## Géométrie du nouvel écran seulement

Avant la retouche, le quadrilatère du grand écran dans scene/projection-cycle.js était :
[[195,10],[965,72],[945,637],[195,742]]
Il était trop large et bas à droite par rapport au tracé utilisateur.

Après la retouche :
[[174,12],[757,78],[688,462],[158,610]]
(haut-gauche, haut-droit, bas-droit, bas-gauche, en coordonnées 1200×1080 du loft).

Le bord supérieur descend vers la droite, le bord inférieur remonte, et le côté droit est beaucoup plus court, reproduisant le raccourcissement voulu par le dessin. C'est une proposition calée sur ce croquis ; les derniers ajustements artistiques des coins restent possibles.

La transformation provient de la véritable homographie matrix3d du conteneur boonoGrandScreen, avec sa source 640×360 boonoGrandScreenCanvas comme enfant. Il n'y a aucun plan vidéo plat posé au-dessus : chaque pixel du clip hérite de la même transformation projective. Le CSS du conteneur utilise box-sizing:border-box et le Canvas ne reçoit pas de transformation indépendante.

Mesure Chromium des quatre coins depuis la vraie DOMMatrixReadOnly :
[[174.00,12.00],[757.02,78.00],[688.02,462.02],[158.00,610.01]]
Poids homogènes w environ [1.00,1.63,1.81,1.18], preuve d'une projection réellement perspective, pas d'une translation ou rotation simple. Capture visuelle à t=125,8s de la vraie vidéo : tests/OD-20261106-004-perspective-grand-scene.jpg et perspective-grand-full.jpg.

## Hiérarchie des couches : seulement pendant le grand écran

Avant, grand écran z5, rideau z7 et bougies z8 : les graphes passaient devant la vidéo.

La CSS scene/boono-v2.css applique désormais uniquement pour projection-cycle-active.projection-surface-grand :
- rideau MarketCipher 3m/15m : z3 ;
- bougies/panneau de prix : z4 ;
- grand écran vidéo : z5 (inchangé) ;
- bulles : z9 ;
- bureau : z10 ;
- BOONO : z12 ;
- chat : z13.

Les graphes du marché restent alimentés ; le plan écran les cache uniquement dans sa zone. Quand la vidéo passe dans fenêtres, affiches ou moniteurs du bureau, les z-index MCB et prix reviennent à 7 et 8 sans changement. La perspective de l'écran et la nouvelle hiérarchie ne touchent pas aux matrices matrix3d des deux écrans du bureau.

Le troisième fichier modifié, scene/index.html, fait passer la version d'URL du nouveau module projection-cycle.js de OD20261106-003 à OD20261106-004 afin que Chrome recharge la bonne géométrie.

## Tests et preuves

Sauvegarde avant modification sur OVH :
/home/ubuntu/boono-tv-studio/backups/OD-20261106-004/
(projection-cycle.js, boono-v2.css, index.html, projection-config.json).

- tests/verify-OD-20261106-004-perspective.js : mathématique des quatre coins vérifiée, perspective vidéo réelle, PNG BOONO, bureau et chat devant l'écran, rideau/bougies derrière, lecteur MP4 unique et en lecture, source Canvas 640×360, zéro erreur JS. Résultat verify-OD-20261106-004-perspective-result.json et captures JPG.
- tests/verify-OD-20261106-004-depth-only-grand.js : rideau/bougies à 7/8 sur fenêtres, affiches et bureau, mais 3/4 pendant grand écran ; grand z5, bulles z9, bureau z10, BOONO z12, chat z13 ; zéro erreur JS.
- Nouvelle exécution des tests de quatre projections et de non-régression de OD-20261106-003 : quatre surfaces et masques inchangés, BOONO-TV normal sans vidéo ni grand écran actif, ancien mode vidéo limité aux fenêtres inchangé, affichage panoramique des moniteurs toujours correct ; zéro erreur JS. JSON : OD-20261106-004-four-surfaces-regression.json et OD-20261106-004-normal-rotation-regression.json.
- Nouvelle exécution du véritable passage à 21 secondes (tests/verify-OD-20261106-003-actual-21s.js) : fenêtres vers affiches à t=21,2s, zéro pause, zéro changement de la source, un seul lecteur. À t=42,6/63,6/84,6s : bureau/grand/fenêtres. Résultat verify-OD-20261106-004-actual-21s-result.json.
- Syntaxe JS valide, studio HTTP 200 et module projeté servi HTTP 200.
- SHA-256 desk/projection-config.json inchangé : 39922e2434c59e282d3ee64ff851c6b9def9c43a345d5c2f68cf56b87d112c2f.

Aucun redémarrage de Chrome Amsterdam, des collecteurs ni des moteurs PAPER n'a été nécessaire.

## Observation et reprise

Le glitch furtif au premier changement de surface, signalé par l'utilisateur comme négligeable, reste **à surveiller** : aucune correction ni nouveau décodeur n'a été ajouté. Une aggravation de durée/fréquence justifierait un profilage ciblé sur ChromeOS.

Le nouveau quad est estimé depuis le dessin rouge, et la validation esthétique définitive sur le Chromebook du propriétaire demeure ouverte. Les tests Chromium sur serveur ne garantissent pas la même performance GPU sous ChromeOS.

URL normale des quatre projections :
http://127.0.0.1:8310/?showcase=1&windowVideo=clemens&projectionCycle=21

Pour vérifier spécifiquement le grand écran :
http://127.0.0.1:8310/?showcase=1&windowVideo=clemens&projectionCycle=21&projectionPreview=grand

La vidéo Clemens Costa reste en essai privé ; aucun droit de diffusion publique n'est présumé.
