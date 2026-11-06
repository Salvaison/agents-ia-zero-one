# BOONO-TV — Grand écran à cinq ancres réglables par le propriétaire

**Date :** 6 novembre 2026
**Décisions :** OD-20261106-005 (éditeur demandé initialement à quatre coins) et **OD-20261106-006** (mise à jour explicite à cinq ancres).
**État :** implémenté sur OVH, testé dans Chromium et dans le moteur de rotation 21 s ; validation artistique par le propriétaire sur son Chromebook ouverte.

## Origine

**Traçabilité :** l’utilisateur a précisé la cinquième ancre *après* la création de OD-20261106-005. Les documents originaux de cette première décision restent immuables ; la nouvelle demande est conservée intégralement sous OD-20261106-006. Les travaux et tests ci-dessous couvrent la version finale à cinq ancres.


Le propriétaire a demandé de régler personnellement la perspective du grand écran mural comme les deux moniteurs du bureau. Il précise que le bord supérieur a besoin d'une ancre supplémentaire : autrement le coin haut-gauche risquerait d'être étiré hors du loft.

Le nouvel outil utilise exactement **cinq poignées** :
- HG — haut-gauche ;
- HS — haut intermédiaire (nouveau point déplaçable sur le bord supérieur) ;
- HD — haut-droit ;
- BD — bas-droit ;
- BG — bas-gauche.

Ce sont trois points qui définissent la bordure haute (les deux coins et le nouveau point intermédiaire), et deux points en bas. Le contour peut devenir pentagonal, avec décroché supérieur. Il n'est plus mathématiquement possible de l'exprimer avec une seule homographie rectangulaire.

## Véritable perspective vidéo en deux moitiés

La vidéo Clemens Costa conserve son seul lecteur HTML5, son seul décodeur H.264/AAC, son audio, son horloge et son unique Canvas de source 640×360. Elle est dessinée dans deux panneaux de projection 320×360, chacune ayant sa propre vraie matrice CSS matrix3d.

- Moitié vidéo gauche : quadrilatère HG → HS → MI → BG.
- Moitié vidéo droite : quadrilatère HS → HD → BD → MI.
- MI est le point de raccord inférieur **calculé** par la projection homographique des quatre coins extérieurs, et non une sixième poignée.

Le bord supérieur peut donc être plié à HS, les deux moitiés du clip restent raccordées et aucun second média n'est lu. La géométrie initiale hérite de l'ancien quadrilatère HG (174,12), HD (757,78), BD (688,462), BG (158,610), avec HS calculé à (535,1 ; 52,88) pour conserver le rendu initial. MI initial se situe vers (478,59 ; 520,48).

La projection n'est jamais activée hors du mode de rotation audiovisuel privé. La hiérarchie du grand écran reste : rideau MCB z3, bougies z4, écran z5, bulles z9, bureau z10, BOONO z12, chat z13.

## Atelier utilisateur

Lien direct (depuis le navigateur du Chromebook avec le tunnel BOONO-TV actif) :
http://127.0.0.1:8310/?wallEdit=1

Il ajoute automatiquement les paramètres de prévisualisation du grand écran et de la vidéo privée, pour montrer l'image vivante pendant le déplacement des poignées. L'atelier des cinq valeurs X/Y s'ouvre dans la surface de l'État vivant. Il comprend Voir la perspective, Enregistrer, Annuler, Quitter. Les poignées se glissent à la souris ; flèches clavier = 1 unité, Maj + flèche = 10 unités.

Voir et déplacer modifient seulement le brouillon local. **Enregistrer** seul écrit les cinq points sur OVH ; **Annuler** revient à la dernière géométrie sauvegardée ; **Quitter** supprime wallEdit et projectionPreview et revient au cycle vidéo normal de 21 secondes par surface. L'éditeur technique historique ?layoutEdit=1 contient désormais un bouton « Écran géant · régler 5 ancres ».

## Sauvegarde autonome, sécurité

Fichier dédié OVH : runtime/boono-tv/desk/grand-screen-config.json (version 1 ; cinq points HG, HS, HD, BD, BG). Il ne modifie jamais desk/projection-config.json des moniteurs du bureau.

Le studio expose GET/POST /api/grand-screen avec écriture atomique, contrôle du même hôte localhost/tunnel, en-tête x-boono-wall-editor, validation des bornes 0–1200 en X et 0–1080 en Y, de la convexité des deux moitiés, de l'aire minimale, et hash de révision pour empêcher l'écrasement d'un autre onglet.

La calibration canonique du bureau reste **octet pour octet identique**, SHA-256 :
39922e2434c59e282d3ee64ff851c6b9def9c43a345d5c2f68cf56b87d112c2f.

## Fichiers modifiés et sauvegardes

Sauvegardes de tous les fichiers historiques avant modification :
/home/ubuntu/boono-tv-studio/backups/OD-20261106-005/

Sources OVH changées : studio-server.js (nouvelle API), scene/projection-cycle.js (deux panneaux et cinq ancres), scene/layout-editor.js (raccourci), scene/index.html (scripts versionnés), scene/boono-v2.css (panneaux et poignée), nouveau scene/wall-editor.js, nouveau desk/grand-screen-config.json. Les moteurs PAPER, collecteurs, trading, sprites, masques et médias ont été laissés intacts.

## Tests Chromium reproductibles

Les preuves se trouvent sur OVH dans /home/ubuntu/boono-tv-studio/tests/.

- verify-OD-20261106-005-initial-five-anchors.js : géométrie réellement projetée sur les cinq points. Les deux panneaux se rejoignent aux bords haut et bas avec écart inférieur à 0,2 unité. Modification provisoire HS +50 en Y puis Annuler exact, un seul lecteur vidéo, zéro erreur JS. Captures OD-20261106-005-five-anchors-initial.jpg et five-anchors-preview.jpg.
- verify-OD-20261106-005-pointer-drag.js : vraie poignée HS déplacée à la souris de (535,1 ; 52,88) vers (557 ; 131), horloge vidéo toujours croissante, Annuler ramène la valeur sauvegardée.
- verify-OD-20261106-005-api-persistence.js : HTTP 403 sans autorisation, 400 pour cinq points invalides ou dépassement de scène, 409 pour révision périmée, 200 pour sauvegarde valide ; forme retrouvée après rechargement. Les valeurs de test ont ensuite été **restaurées**, la forme initiale est en service.
- verify-OD-20261106-005-regression.js : mode normal sans nouvelle projection ni poignées ; mode vidéo fenêtres inchangé ; quatre surfaces avec un lecteur, deux panneaux uniquement au grand écran, bons masques et z-index ; bouton technique ouvre l'atelier, zéro erreur.
- verify-OD-20261106-005-short-link.js : URL simple ?wallEdit=1 ouvre automatiquement la bonne prévisualisation avec cinq poignées et un seul lecteur.
- verify-OD-20261106-005-actual-21s-result.json : fenêtres vers affiches à 21,19 secondes, aucune pause et aucun rechargement de la source ; 42,62/63,64/84,63 secondes activent bureau/grand/fenêtres.
- verify-OD-20261106-005-cpu-result.json : CPU artificiellement ralenti 4×, vidéo avance de 4,41 secondes sur 4,41 secondes, environ 41 images projetées, PNG BOONO visible, zéro erreur. Cela ne vaut pas mesure sur Chromebook.

**À surveiller :** glitch très bref du premier chargement des surfaces (considéré négligeable par l'utilisateur) et fluidité sur ChromeOS pendant la manipulation. Les tests OVH ne remplacent pas une vérification réelle du Chromebook. Le média reste un essai privé, aucun droit de diffusion publique présumé.
