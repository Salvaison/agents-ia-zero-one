# BOONO-TV — sprite du bureau GIMP, cinq postures debout et cycle de 10 s

**3 novembre 2026 — intervention effective, contrôlée sur OVH et Penguin.** Décision utilisateur : [OD-20261103-002](operational-decisions/OD-20261103-002/03-origine-et-justification.md).

## Mandat et limites

Remplacer le sprite du bureau dans la scène BOONO-TV, conserver les sept états déjà utilisés, leur ajouter successivement les cinq postures debout exportées après retouche GIMP, réduire le **défilement de démonstration à 10 secondes par image** puis fournir le lien de l'éditeur. Supprimer du stockage Linux les six fichiers XCF en les déplaçant vers la corbeille ChromeOS. **Aucune modification du trading, des ordres, des collecteurs MCB, des moteurs PAPER ou de la calibration d'origine sans sauvegarde.**

## Résultats sur OVH — VÉRIFIÉS

- Studio : `/home/ubuntu/boono-tv-studio/runtime/boono-tv/`, HTTP `127.0.0.1:3091`, pont privé Amsterdam `127.0.0.1:3309`.
- **Bureau actif V2 :** `assets/boonotv-v2-20261101/reframed-20261101/desk_GIMP_user_20261102_1200x1080.png` ; SHA-256 `ad02307f1afed54842d1b8b9cd04ad189743d245f14051acae668fe6c28c2732`. Remplace seulement la référence CSS de `desk_1200x1080.png` ; l'ancienne image demeure disponible.
- **Cinq originaux validés, PNG RGBA :** `assets/boono-postures-rgba-20261103/BOONO_0{1..5}_*_RGBA.png`, conservés. Pour chaque posture, deux images pleine scène transparentes ont été créées dans `assets/boono-postures-rgba-20261103/reframed-1200x1080/` : une couche complète derrière le bureau (`z-index:9`), et une couche avec masque frontal des mains devant les écrans (`z-index:12`). Bureau `z-index:10`, projections `z-index:11`. Lire `manifest.json` de ce répertoire pour les empreintes, positions et tailles.
- **Ordre du défilement de démonstration :** `working → thinking → worried → concentrated → confident → observe → execute → dubitatif → surpris → inquiet → neutre → enthousiaste`. Les sept premiers restent issus des assets V2 historiques. L'intervalle des douze états du `showcase` est `10000 ms`; les changements de posture en mode état vivant restent déterminés par les données, avec temporisation minimale de 10 s.
- **Contrôles navigateur Chromium headless sur OVH :** page V2 reformatée chargée sans erreur JS, visuels et manifest présents ; mode éditeur actif ; déplacement d'une poignée et restauration des coordonnées testés **sans enregistrer** de déplacement expérimental ; passage observé `7/12 EXECUTE → 8/12 DUBITATIF → 9/12 SURPRIS` avec intervalles proches de 10 s.
- **Calibration** : après l'activation du bureau, les quadrilatères du fichier de 15 octobre provoquaient un désalignement manifeste. Le profil de départ a été rebasé sur les anciennes matrices V2 du 1er novembre ; l'ancien `projection-config.json` est archivé sans altération. Profil supplémentaire : `desk/projection-config-20261103-GIMP.json`. Le profil actif est éditable depuis l'outil. Un réglage visuel de précision peut rester nécessaire ; ne pas confondre alignement de départ avec validation finale par le propriétaire.
- **Problème distinct ouvert :** pendant le contrôle, `/assets/desk-live/marketcipher-live.jpg` renvoyait HTTP 200 mais une image d'environ 2106 octets, semblant blanche à l'écran. Aucun remplacement factice de la capture TradingView ni intervention sur Amsterdam n'a été effectué.

## Penguin — corbeille et stockage

- Les cinq XCF corrigés et un duplicata XCF Dubitatif, **8 347 641 octets**, ont été retirés de `/home/boono70/.local/share/Trash/files/` après copie vérifiée, et déposés dans `/mnt/shared/MyFiles/Downloads/.Trash/files/` avec leurs `.trashinfo` correspondants. Six fichiers vérifiés dans la corbeille ChromeOS ; zéro XCF restant dans la corbeille Linux des postures. La suppression définitive n'a pas été demandée.
- PNG RGBA originaux toujours disponibles dans `/mnt/chromeos/shared/MyFiles/Amsterdam/YT/BOONO_5_POSTURES_RGBA_20261103/`. Le projet de travail GIMP initial a été fermé ; le document de bureau étranger à la tâche est resté ouvert.

## Fichiers modifiés, sauvegarde, restauration

- Modifiés sur OVH : `scene/boono-v2.css` (nouveau bureau, couches), `scene/boono-v2.js` (cinq postures, chargement et prévisualisation), `scene/app.js` (douze états, cycle 10 s), `desk/projection-config.json` (quads initiaux rebasés).
- Copies intégrales **avant changement** : `/home/ubuntu/boono-tv-studio/backups/boono-tv-desk-5poses-10s-20261103/` (quatre fichiers originaux). Restauration : recopier **sélectivement** la sauvegarde correspondante au runtime ; ne jamais faire de reset global du projet ni réutiliser une calibration sans contrôle des écrans.
- Pas de redémarrage du studio ni modification des moteurs PAPER. Les fichiers JS/CSS sont servis statiquement ; un rechargement du navigateur charge les nouveautés.
- **Éditeur depuis Chrome Amsterdam (tunnel privé 8310)** : `http://127.0.0.1:8310/?layoutEdit=1&showcase=1&showcaseHold=1&showcaseStart=10&panel=state`. Démarrage du défilement : `http://127.0.0.1:8310/?showcase=1&panel=state`. Accès depuis Chromebook par noVNC `http://localhost:6080/vnc.html` après tunnel SSH existant.
- La scène complète n'est pas ici déclarée artistiquement validée dans tous ses détails ; le rendu doit être jugé en situation par le propriétaire.

**État :** implémenté et vérifié sur le studio OVH, démonstration à 12 états en service ; vérification esthétique finale et capture réelle MCB à poursuivre séparément.
