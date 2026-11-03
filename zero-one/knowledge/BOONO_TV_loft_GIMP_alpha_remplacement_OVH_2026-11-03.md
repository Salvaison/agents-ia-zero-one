# BOONO-TV — Loft corrigé sous GIMP, alpha préservé, remplacement actif sur OVH

**3 novembre 2026.** Demande explicite du propriétaire : [OD-20261103-006](operational-decisions/OD-20261103-006/03-origine-et-justification.md). **Statut : exporté, transféré, déployé, vérifié en navigateur.**

## Document GIMP effectivement traité sur Penguin

Dans GIMP 3.0.4, deux documents étaient ouverts : `BOONO_loft_nord_TRAVAIL_1200x1080.xcf` (source demandée) et un autre loft `Loft musical vintage aux posters blues.xcf` de 1536×1024 (hors périmètre, non modifié).

La source demandée était ouverte, **dirty=true**, au moment de l'intervention. Elle comportait **un seul calque visible, RGBA, 1200×1080**, sans masque. Il n'y avait donc plus de calques à fusionner ; appeler `flatten-image` aurait risqué de supprimer l'alpha. L'état courant a été sauvegardé en XCF, puis dupliqué en mémoire GIMP et exporté via `file-png-export` non interactif, compression PNG 9.

- Projet XCF corrigé et modifiable : `/mnt/chromeos/shared/MyFiles/Amsterdam/YT/BOONO_TV_LOFT_EDIT_GIMP/BOONO_loft_nord_TRAVAIL_1200x1080.xcf`.
- Export PNG : `/mnt/chromeos/shared/MyFiles/Amsterdam/YT/BOONO_TV_LOFT_EDIT_GIMP/EXPORT_OVH_20261103/BOONO_loft_nord_CORRIGE_RGBA_1200x1080.png`.
- SHA-256 de l'export : `8881518e2ef5d183e4bd78edfb5ba2b39a36d42bb5963493cdbece3cf7a787c1`, taille **2 884 642 octets**, **1200×1080, PNG RGBA**.
- Statistiques alpha lues par GdkPixbuf : **82 297 pixels entièrement transparents**, **38 355 partiellement transparents**, **1 175 348 opaques**. Contrôles dans plusieurs zones de la baie vitrée : alpha zéro. Le papier/mobilier restent opaques là où attendu.
- L'export initial `BOONO_loft_nord_TRAVAIL_1200x1080.png` a été laissé intact ; le XCF corrigé est conservé pour toute reprise.

## Transfert et OVH

Chemin sécurisé de transport : Penguin → SFTP staging Amsterdam `/srv/boono-upload/incoming/staging/boonotv_loft_gimp_20261103/` → SSH authentifié vers OVH `/home/ubuntu/boono-tv-studio/incoming/BOONO_LOFT_GIMP_20261103/`. Empreinte SHA identique après chaque transfert.

**Studio OVH** : `/home/ubuntu/boono-tv-studio/runtime/boono-tv/`.

- Nouveau fichier installé sans écraser la version précédente : `assets/boonotv-v2-20261101/reframed-20261101/loft_GIMP_corrige_20261103_1200x1080.png`, même SHA-256 que l'export GIMP.
- Référence active remplacée **une seule fois** dans `scene/boono-v2.css` : auparavant `.../loft_north_1200x1080.png`, désormais `.../loft_GIMP_corrige_20261103_1200x1080.png`. Le CSS des sept + cinq postures, les quads des écrans, les curseurs de l'éditeur, le chat et le bureau restent inchangés.
- **Sauvegarde avant remplacement :** `/home/ubuntu/boono-tv-studio/backups/loft-before-gimp-correction-20261103/`, comprenant l'ancien `loft_north_1200x1080.png` SHA-256 `183c71a9ec2d1e38e518b5192b6fd5b9bcd1e2d874a38f64bffc642290244901` et `boono-v2.css` SHA-256 `250abfdcf754e427d5a0857c67605ded997535cc35ce69b475ead62a256b7db2`.
- Manifeste de version généré à côté du nouveau fichier : `loft_GIMP_corrige_20261103_manifest.json`.
- Pas de redémarrage du studio requis pour un asset et un CSS statiques. Cache du navigateur : recharger avec `Ctrl+R` pour voir le fond corrigé.

## Contrôles réalisés

1. OVH `GET /assets/.../loft_GIMP_corrige_20261103_1200x1080.png` → **HTTP 200, 2 884 642 octets**.
2. `GET /boono-v2.css` contient exactement la nouvelle référence.
3. Chromium headless réel via `127.0.0.1:3091/?showcase=1&showcaseHold=1&showcaseStart=10&panel=state` : la scène charge le nouveau loft CSS `background-image`, **1200×1080**, pose **NEUTRE 11/12**, bureau GIMP et transformations de calques préexistantes conservés, sans erreur JS ni ressource HTTP problématique. Capture QA locale : `/tmp/boono_loft_after_gimp_qa_20261103.png` et journal `.json`.
4. Accès à l'éditeur privé depuis Penguin rétabli : tunnel SSH `127.0.0.1:8310`, **HTTP 200** pour l'éditeur. Le VNC local `127.0.0.1:6080` était également HTTP 200.

## Restauration

Pour revenir au loft précédent **sans affecter la calibration** : restaurer `scene/boono-v2.css` depuis `backups/loft-before-gimp-correction-20261103/boono-v2.css` (s'assurer qu'aucun autre changement de CSS n'a eu lieu depuis) ou remplacer précisément la nouvelle référence CSS par l'ancienne. L'ancien PNG est resté intact et possède une seconde copie dans la sauvegarde. Ne jamais faire `git reset --hard` ou recopier un profil de quads antérieur pour cette restauration.

**Limites** : cette opération ne valide pas artistiquement tous les détails du décor ; elle valide le transfert et le rendu technique de la correction fournie par le propriétaire. L'autre projet GIMP 1536×1024 et les données de marché ne sont pas concernés.
