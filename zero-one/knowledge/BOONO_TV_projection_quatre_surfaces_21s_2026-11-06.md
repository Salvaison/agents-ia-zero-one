# BOONO-TV — Quatre surfaces de projection, écran géant, rotation toutes les 21 secondes

**Date :** 6 novembre 2026
**Décision :** OD-20261106-003
**Statut :** code implémenté sur OVH, tests Chromium réussis. Acceptation visuelle sur le Chromebook du propriétaire et réglage final des quatre coins du grand écran ouverts.
**Frontière :** uniquement composition BOONO-TV privée, aucun changement aux moteurs PAPER, collecteurs, données du marché, masques GIMP, personnage ou calibration des écrans.

## Demande

Le propriétaire dessine dans une capture un grand écran mural derrière BOONO. Il souhaite une même vidéo passant sans interruption entre quatre surfaces :
1. Fenêtres transparentes du loft ;
2. Deux affiches transparentes considérées ensemble ;
3. Les deux écrans encastrés du bureau considérés ensemble comme une seule surface panoramique ;
4. Nouveau grand écran mural derrière BOONO.

Son complément « avec un changement de surface toutes les 21 secondes ? » fixe le pas de rotation. Une boucle vidéo-visuelle complète dure **84 secondes** (4 × 21), et reprend automatiquement. Le trading continue pendant que l'écran du bureau affiche temporairement le clip.

## État technique relu avant travaux

Rapport source : knowledge/BOONO_TV_incident_video_sprites_charge_2026-11-06.md (OD-20261106-002). Le propriétaire a confirmé « Superbe, ça marche!! » le 6 novembre après la réparation de la concurrence entre PNG BOONO et vidéo sur ChromeOS. Conserver donc :
- la vidéo MP4 privée Clemens Costa (H.264/AAC) et son unique moteur HTML5 ;
- le rendu de frames dans un unique Canvas 640×360 limité à environ 12 ips ;
- la couche PNG DOM explicite de BOONO ; vidéo démarrant après la première posture prête ;
- les requêtes HTTP Range de vidéo par blocs de 2 MiB pour ne pas saturer le tunnel ;
- aucune exposition publique du clip tant que les droits ne sont pas établis.

Le double masque GIMP (fenêtres/affiches) est conservé, de même que les matrices de projection déjà validées des deux moniteurs du bureau.

## Architecture et rendu

Nouveau module client OVH : runtime/boono-tv/scene/projection-cycle.js, ajouté dans scene/index.html avec une URL versionnée. CSS additionnel dans scene/boono-v2.css.

Mode activable uniquement par URL :
http://127.0.0.1:8310/?showcase=1&windowVideo=clemens&projectionCycle=21

Sans le paramètre projectionCycle=21, le mode vidéo antérieur se limite aux fenêtres, strictement inchangé. Sans windowVideo=clemens, BOONO-TV est en mode normal, sans clip ni écran mural projeté.

La rotation est déterminée directement par **video.currentTime** : surfaces[floor(t/21) % 4]. La vidéo, l'audio, le lecteur et son src ne sont jamais réinitialisés au passage d'une surface à l'autre. Pause maintient le temps et la surface ; un seek actualise la surface correspondant à la nouvelle seconde. La vidéo originale reste l'unique décodeur, tandis que les opérations drawImage du Canvas source alimentent le seul écran actif.

- **Fenêtres (0–21 s)** : masque fenêtres transparentes, affiches opaques ; le Canvas source d'origine reste derrière la baie vitrée.
- **Affiches (21–42 s)** : masque affiches transparentes, fenêtres opaques ; le même Canvas source est présenté à l'emplacement des deux affiches.
- **Bureau (42–63 s)** : masque sans transparence ; deux canvases de projection 400×140 dans deskScreenLeft et deskScreenRight (les matrices matrix3d préexistantes sont inchangées). Une bande centrale du Canvas vidéo est partagée en deux demi-images contiguës 320×112, chacune projetée sans distorsion du ratio dans son écran. Les graphiques Conversion / MarketCipher continuent à s'actualiser sous les deux couches et sont retrouvés dès la sortie des 21 s. Les titres vectoriels sont masqués uniquement pendant l'affichage du clip.
- **Grand écran (63–84 s)** : masque opaque ; nouveau plan 640×360 transformé par homographie CSS sur un quadrilatère de coordonnées loft 1200×1080 : coins [[195,10],[965,72],[945,637],[195,742]]. Ce cadre suit approximativement le tracé rouge fourni par le propriétaire et pourra être ajusté après inspection. L'écran est devant la peinture du loft à z5, mais derrière rideau MCB z7, bougies z8, bulles z9, bureau z10, BOONO z12 et chat z13. Il ne modifie aucun asset ou pixel d'origine.

Le panneau privé de contrôle vidéo affiche désormais « PROJECTION [SURFACE] · [N] s ». Il conserve Pause/Lire, activation audio, volume et curseur de position. L'API de diagnostic window.BoonoTVProjectionCycle.current() révèle la surface, le temps média, le nombre de bascules, le quad et le masque. Le paramètre facultatif projectionPreview=fenetres|affiches|bureau|grand permet de tenir une surface fixe pour le réglage et les tests (toujours en vidéo privée).

L'implémentation n'introduit aucun second lecteur vidéo. Le Canvas original dessine toujours en arrière-plan à cadence réduite ; seulement pour le bureau et le grand écran, il sert de source aux Canvas projetés, prépeints avant leur activation.

## Backups, tests et preuves

Backup avant intervention : /home/ubuntu/boono-tv-studio/backups/OD-20261106-003/ sur OVH, contenant index.html, boono-v2.css, window-local-video.js, loft-mask-switcher.js, projection-config.json.

- JS syntaxe contrôlée avec node --check, studio et script HTTP 200.
- Tests/verify-OD-20261106-003-four-projections.js : chaque surface visible avec le bon masque et une seule source MP4/Canvas, boono-character toujours z12 ; mode bureau projette simultanément sur les deux moniteurs, grand écran visible en son tour ; zéro erreur JS. Captures OD-20261106-003-{fenetres,affiches,bureau,grand}-projection.jpg.
- Tests/verify-OD-20261106-003-actual-21s.js : test réellement exécuté sur le temps de lecture, passage FENÊTRES → AFFICHES à **21,3 s**, **zéro événement pause**, **zéro changement src** et **un unique élément video**. Des recherches de test à 42,4 s, 63,4 s et 84,4 s ont donné respectivement bureau, grand et retour fenêtres, sans remplacement du lecteur.
- Tests/verify-OD-20261106-003-projection-video-frames.js : à 125–127 s du fichier, les quatre surfaces affichent une vraie image Clemens Costa et non un rectangle vide. Luminosité moyenne du Canvas source ~191, bureau gauche ~197, grand ~192. Captures OD-20261106-003-{fenetres,affiches,bureau,grand}-video-125s.jpg.
- Tests/verify-OD-20261106-003-regression.js : BOONO-TV normal sans lecteur ni overlay ; mode vidéo seul sans rotation inchangé ; mode avec rotation et retour aux moniteurs validé. Titres vectoriels masqués seulement lors des 21 s bureau. Zéro erreur JS.
- Tests/verify-OD-20261106-003-cpu.js : sur Chromium avec CPU artificiellement 4× plus lent, bureau et grand continuent de projeter ~40–42 frames pendant 4,4 s, le MP4 avance de 4,4 s et BOONO conserve son PNG visible. Temps CPU JS ~1,16–1,18 seconde sur 4,4 secondes ; ce n'est pas une mesure du Chromebook.

Le fichier desk/projection-config.json conserve exactement son empreinte SHA-256 :
39922e2434c59e282d3ee64ff851c6b9def9c43a345d5c2f68cf56b87d112c2f

Tous les fichiers graphiques et données PAPER restent inchangés. Aucun redémarrage des simulateurs V494/V543 et des collecteurs n'a été nécessaire.

## Limites et retour arrière

L'utilisateur doit confirmer sur son véritable Chromebook la fluidité pendant un cycle complet de **84 secondes** et le positionnement artistique du grand écran selon son tracé. Le dernier rapport a montré que le GPU ChromeOS peut différer des tests Chromium serveur.

Pour revenir immédiatement à l'ancien test vidéo derrière les seules fenêtres, supprimer projectionCycle=21 de l'adresse. Pour retrouver le skyline, supprimer également windowVideo=clemens.

La vidéo Clemens Costa demeure un essai privé, aucune licence de diffusion publique n'est présumée.
