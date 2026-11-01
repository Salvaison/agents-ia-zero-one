# BOONO-TV — Chat noir, bibliothèque de cinq postures sur l’établi

**Date :** 1er novembre 2026  
**Statut :** cinq sprites PNG RGBA et masques alpha **réalisés et vérifiés** dans la conversation ; **nouveaux dessins et placement à valider** pour une installation dans BOONO-TV.  
**Registre :** [OD-20261101-003](operational-decisions/OD-20261101-003/03-origine-et-justification.md)  
**Références :** [Bureau canonique](BOONO_TV_bureau_ordinateur_reference_canonique_2026-11-01.md) et [loft canonique](BOONO_TV_chambre_canonique_vitrages_paysages_2026-11-01.md).

## Personnage

Le chat noir mince, joueur et rusé a été précédemment validé dans une planche de cinq postures située dans le loft musical. Les **nouveaux sprites** conservent ses yeux jaunes, ses oreilles rosées, ses moustaches, sa silhouette longiligne et sa queue expressive ; encrage BD rétro tramé, noir et touches bleu cyan.

## Cinq fichiers PNG alpha

| Pose | Sprite 640×512 RGBA | Masque 640×512 L | SHA256 du sprite |
|---|---|---|---|
| Observe, assis et curieux | `BOONO_chat_01_observe_sprite_RGBA.png` | `BOONO_chat_01_observe_masque_alpha.png` | `36c28c423781261f0a6384618c3e977fb7be7f074a4256a09062051d14123e6c` |
| Joue, bondit vers la balle rouge | `BOONO_chat_02_joue_sprite_RGBA.png` | `BOONO_chat_02_joue_masque_alpha.png` | `6b9c341af12c62a1937c618fd4fa7f9457b6034cca62e7eb443bbb6940da1520` |
| Rusé, allongé, pattes devant | `BOONO_chat_03_ruse_sprite_RGBA.png` | `BOONO_chat_03_ruse_masque_alpha.png` | `c39df237494cb04e99f6d8060b319ab5dd4d2c108cbe8c39c7ea229f8f1d160a` |
| Toilette, lèche sa patte | `BOONO_chat_04_toilette_sprite_RGBA.png` | `BOONO_chat_04_toilette_masque_alpha.png` | `587777473604bd2453b4afab7d71b3fef9072c95bb81db7fac297bf682dddd34` |
| Surveille, regarde vers le haut | `BOONO_chat_05_surveille_sprite_RGBA.png` | `BOONO_chat_05_surveille_masque_alpha.png` | `4e7a61a1764198fa1f3c440225fe0b7462c47045603893767fc1b9de9542f4bc` |

Tous les sprites sont sur un canevas transparent **640 × 512** ; chaque masque **8 bits** égale strictement le canal alpha du PNG associé (contrôle numérique : cinq masques, **zéro différence**). Blanc = opaque, noir = transparent, gris = antialiasing des contours.

Un découpage natif plus grand existe pour chaque pose, et le ZIP de livraison `BOONO_TV_chat_5_postures_RGBA_masques_v1.zip` contient cinq sprites, cinq masques, cinq découpes natives, les aperçus, le manifeste JSON, la planche source RGBA, le script Python de détourage et ce rapport. Test ZIP sans anomalie.

**Important :** le ZIP et les images sont disponibles **dans la conversation**, mais **pas importés sur Amsterdam ou OVH, pas versionnés dans GitHub en binaires**. Les SHA ci-dessus servent au transfert futur.

## Placement et compositing

Point d'ancrage normalisé pour chaque sprite : **(320,470)** sur son canevas 640×512. Les essais de superposition au coin arrière supérieur gauche du bureau canonique 1536×1024 utilisent **(472,325)** comme point d'appui, sprite redimensionné en **416×333**. Le chat reste un personnage indépendant, non peint dans le bureau.

Ces coordonnées sont un **essai de perspective**, pas une calibration mise en service ; les positions du bureau et des écrans sur OVH doivent être vérifiées avant intégration.

## Contrôles, validation, limites

- **Créé :** cinq visuels indépendants en PNG RGBA, cinq masques, découpes natives, planche sur fond damier, cinq composites de test sur le bureau, archive reproductible.
- **Vérifié :** dimension, mode RGBA/L, transparence, correspondance exacte des alpha, intégrité du ZIP.
- **À valider :** préférence du propriétaire pour les cinq nouvelles postures, taille et point d'appui ; au besoin occultation partielle des pattes par l'établi.
- **Non réalisé :** aucune copie des assets sur OVH, aucun déploiement dans le studio BOONO-TV, aucun changement de la collecte ou des moteurs PAPER.

Ce fichier n'est qu'une **documentation des assets réalisés** ; il ne donne aucune autorité à BOONO-TV sur les décisions de trading.
