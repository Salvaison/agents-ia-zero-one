# BOONO-TV — loft GIMP à deux masques alpha indépendants

**Date :** 5 novembre 2026
**Décision :** OD-20261105-009
**Statut :** implémenté et contrôlé dans le studio OVH, appréciation esthétique finale de l'utilisateur ouverte. Aucun changement aux moteurs PAPER, collecteurs, personnages, desk/projection-config.json ou artwork d'origine.

## 1. Source GIMP et fichier maître

Le document de travail ouvert dans GIMP 3.0.4 sur Penguin était :
/mnt/chromeos/shared/MyFiles/Amsterdam/YT/BOONO_TV_LOFT_EDIT_GIMP/BOONO_loft_nord_TRAVAIL_1200x1080.xcf

Il contient trois calques à 1200×1080 : le calque supérieur possède le masque de transparence des **fenêtres**, le deuxième celui des **affiches**, et le troisième préserve le contenu original sans masque. Le calque de base est visible à 33 % dans le fichier historique. Les masques ont été identifiés et lus depuis leurs buffers GEGL : la zone noire des fenêtres couvre approximativement x72..584/y28..392 ; celle des affiches x700..1163/y56..349. L’original XCF était enregistré et non modifié au contrôle, SHA-256 inchangé : 93b1699568d3ce8c1610babd6a69a1951cbcde59a3d7fe85560dd5de46e143c0.

Une **copie XCF organisée et éditable** a été créée par GIMP avec les noms de calques FENETRES, AFFICHES et BASE ORIGINALE ; ni les masques ni les calques n’ont été aplatis ou fusionnés. Le fichier a été rouvert dans GIMP : les deux vrais layer masks étaient toujours présents et indépendants. La copie est enregistrée à côté de l’original :
BOONO_loft_nord_MASQUES_NOMMES_2026-11-05.xcf
SHA-256 : 79696bdde91176447d8436a78b787f685ccba9195db8fd2312c23db6ce52105f.

Copies de travail également disponibles sur Penguin : /home/boono70/boono-tv-assets/2026-11-05-loft-double-mask/ .

## 2. Exports séparés sans redessin

Les deux masques originaux ont été exportés comme deux PNG grayscale indépendants : BOONO_masque_fenetres_1200x1080.png et BOONO_masque_affiches_1200x1080.png.

Quatre PNG RGBA 1200×1080 ont été calculés directement depuis les pixels du XCF, sans image générée, recolorisation ou retouche de la géométrie :
- BOONO_loft_fenetres_1200x1080.png : fenêtres transparentes, affiches opaques ; 107 142 pixels d’alpha nul.
- BOONO_loft_affiches_1200x1080.png : affiches transparentes, fenêtres opaques ; 79 482 pixels d’alpha nul.
- BOONO_loft_fenetres_affiches_1200x1080.png : les deux jeux transparents ; 186 483 pixels d’alpha nul.
- BOONO_loft_sans_masque_1200x1080.png : aucun des deux masques ajouté, avec l’alpha d’origine conservé.

Les couches couleur du XCF comportent de minuscules différences locales ; chaque variante utilise les pixels de la couche pertinente, sans inventer ou remplacer de détails de l’illustration. Le manifeste d’export conserve les empreintes et la filiation.

## 3. Déploiement OVH et commutation

Les PNG et masques sont déployés dans le répertoire public :
/home/ubuntu/boono-tv-studio/runtime/boono-tv/assets/loft-dual-masks-20261105/

Le XCF **non aplati** est archivé hors site public dans :
/home/ubuntu/boono-tv-studio/source-art/loft-20261105/

Dans scene/boono-v2.css, l’ancien fichier PNG du loft est remplacé par la variable de composition --boono-loft-art. Le nouveau module scene/loft-mask-switcher.js est chargé par scene/index.html. Le défaut est **fenêtres transparentes et affiches opaques**. Les modes d’URL loftMask=fenetres, loftMask=affiches, loftMask=fenetres_affiches et loftMask=sans_masque peuvent être sélectionnés indépendamment. En cours de lecture, window.BoonoTVLoftMasks.setWindows(bool), setPosters(bool), set(mode) et cycle() permettent les mêmes combinaisons sans rechargement. Aucun défilement automatique des masques n’a été imposé.

Les surfaces transparentes révèlent **le média situé derrière**. Le paysage historique était une autre illustration complète du loft, qui peut donner l’impression qu’une région masquée n’a pas changé tant qu’on ne place pas un contenu alternatif derrière. Le mode de test youtubeWindow=poster a servi à vérifier les transparences réelles ; les futures sources des affiches demeurent libres et indépendantes.

L’ancien asset validé loft_GIMP_corrige_20261103_1200x1080.png demeure intact. Backups des anciens CSS/index, artwork historique et studio-server.js dans /home/ubuntu/boono-tv-studio/backups/OD-20261105-loft-2-masks/ .

## 4. Intégrité, transport et contrôles

L'archive signée par SHA-256 sur Penguin a été envoyée par le tunnel privé 8310, sous une route de transfert HTTP locale temporaire à jeton aléatoire et usage unique. SHA-256 du bundle de 24 853 165 octets : a24524144fac542d186d4909dc9cba83c33889997385d6e265ff0f57018b705f. Les neuf fichiers ont été vérifiés individuellement sur OVH avant publication.

**Sécurité :** la route temporaire de transfert a été supprimée ; le serveur studio-server.js a été remis **octet pour octet** dans son état d’avant transfert, le jeton consommé et supprimé, l’ancienne route répond HTTP 404, le petit serveur temporaire Penguin a été arrêté.

**Contrôle alpha direct sur OVH (sharp) :** x100/y100 transparent seulement avec le masque fenêtres ; x950/y200 transparent seulement avec le masque affiches ; x600/y500 toujours opaque. Manifestes et dimensions validés.

**Contrôles Chromium :**
- verify-OD-20261105-009-loft-mask-independence.js : quatre modes et bascules successives fenêtres → deux → affiches → aucun → fenêtres sans rechargement, zéro erreur JavaScript.
- verify-OD-20261105-009-loft-video-compositing.js : rendu comparatif avec image derrière les vitres ; écart moyen mesuré d’environ 60,77 dans les fenêtres et 28,23 dans les affiches lorsqu’on change de masque, zéro erreur JavaScript.
- Captures JPEG séparées de chaque mode conservées dans /home/ubuntu/boono-tv-studio/tests/ .

**Calibration rigoureusement inchangée :** SHA-256 de desk/projection-config.json = 39922e2434c59e282d3ee64ff851c6b9def9c43a345d5c2f68cf56b87d112c2f. GIMP source et moteur PAPER V494/V543 inchangés. Le site garde ses scripts et données de marché antérieurs.

**Traçabilité :** l’entrée OD-20261105-009 et son prompt opérationnel ont été rédigés **rétrospectivement après le début des travaux** ; ils ne constituent pas un enregistrement antérieur. Les étapes réellement effectuées et vérifiées sont distinguées dans le registre d’événements.

## Contrôle du tunnel Chromebook après publication

Après le déploiement, Penguin signalait son service autossh 8310 comme actif, mais la réponse HTTP expirait. Le relais Amsterdam 8310 et le studio OVH 3091 répondaient bien HTTP 200 : la partie Penguin de la connexion était périmée. Le seul service utilisateur boono-tv-studio-tunnel.service a été redémarré, puis les URLs du studio et du nouveau masque ont répondu HTTP 200 à travers le Chromebook. Aucune configuration ni processus PAPER n’a été modifié.
