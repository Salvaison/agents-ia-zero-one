# BOONO-TV — Chambre canonique, affiches blues et masquage des vitrages

**Date :** 1er novembre 2026
**Statuts :** décor de chambre **VALIDÉ** ; fichiers alpha/masque **FABRIQUÉS LOCALEMENT** et remis dans la conversation ; **NON INTÉGRÉS sur OVH**.
**Registre :** [OD-20261101-002](operational-decisions/OD-20261101-002/03-origine-et-justification.md)
**Bureau complémentaire :** [référence canonique du bureau](BOONO_TV_bureau_ordinateur_reference_canonique_2026-11-01.md)
**Compte rendu précédent :** [travail sur le loft, avant validation finale](BOONO_TV_compte_rendu_bureau_et_loft_2026-11-01.md)

## 1. Visuel retenu

L'image de la chambre validée le 1er novembre 2026 est le **loft industriel illustré en BD rétro** avec **les deux affiches musicales remplacées conformément aux références transmises** :

- **Muddy Waters — At Newport 1960** sur le mur droit, au-dessus de l'espace musical ;
- **Howlin' Wolf — The Real Folk Blues** sur le grand mur supérieur droit, près du salon.

Les deux pochettes respectent leur sujet, leur typographie reconnaissable et leurs couleurs de référence. L'illustration a été générée après la demande de garder **la même géométrie et le même mobilier** que le dessin précédent.

Le décor comporte une **grande verrière nord** occupant la gauche du plan, une ambiance de lumière diffuse froide, un ancien volume industriel profond, poutrelles et câbles, une **batterie**, plusieurs instruments, amplificateurs et micros sur les tapis de gauche, une zone centrale de sol dégagée et un **salon vintage** avec canapé et fauteuils à droite. Sa palette mêle acier bleu/gris, papier beige patiné, encres sombres et faibles sources localisées de lumière chaude, en **raster/granulation comics imprimés sur papier journal**.

La scène doit rester **sans bureau de BOONO ni personnage** : ces deux éléments font partie d'autres calques. Le **chat noir fin, joueur, rusé**, validé en cinq postures, est lui aussi un **calque mobile distinct**, jamais peint définitivement dans le loft.

## 2. Fichiers de la livraison artistique

La source exacte a été conservée sans redessin, recadrage ou changement de couleurs. Résolution **1536 × 1024**, rapport **3:2**.

| Fichier livré dans la conversation | Format | Rôle |
|---|---|---|
| `BOONO_TV_loft_nord_reference_canonique_v1.png` | RGB | Image définitive de référence (géométrie, mobilier et affiches) |
| `BOONO_TV_loft_nord_fenetres_transparentes_v1.png` | RGBA | Chambre à superposer à des **paysages variables** derrière la fenêtre |
| `BOONO_TV_masque_fenetres_v1.png` | N&B | **Blanc = vitrage transparent**, noir = décor opaque, gris = antialiasing |
| `BOONO_TV_apercu_transparence_fenetres_v1.png` | RGB | Contrôle de l'alpha sur fond damier |
| `build_boono_window_mask.py` | Python | Recette technique de génération du masque |

### Empreintes d'identité des quatre PNG livrés

| Fichier | SHA-256 |
|---|---|
| Référence canonique | `0ec58bd319e1f8514dcb73143b62659df9dd3db95a40e4d37814abd08b9430ea` |
| Version transparente RGBA | `2ce4725892526e8d8dc7b0f96fdf717a22d9ae8da6682b022c005296b303f9d6` |
| Masque vitrages | `e100e0ebbf86c8a7fff1cee6ba0882b1bd05e6e5d16a143c4b9d4968edecfc0d` |
| Aperçu damier | `20a4284168f75ef65447562b45057cf8dbb78726a32fff11df4b2bea6d97` |

**Transfert des binaires :** ils sont fournis comme fichiers téléchargeables **dans la conversation présente**, avec un kit ZIP comprenant les quatre PNG et leur script. **Ces fichiers binaires ne sont pas archivés dans le présent commit Git et n'ont pas été copiés dans OVH**. Récupérer leurs octets et comparer les empreintes ci-dessus avant toute mise en service. Ne pas assimiler la documentation Git à un asset serveur disponible.

## 3. Description du masque et ordre des calques

Le masque suit les baies vitrées dans la perspective exacte de la référence, **sans percer les murs ni supprimer les montants**, le grand luminaire suspendu, les accessoires proches de la vitre, les instruments, les plantes ou la structure industrielle. Le masque est ajusté autour des panneaux et des barres horizontales/verticales de la verrière. Il s'agit d'un premier détourage à contrôler sur des paysages contrastés, notamment au voisinage des micros, cymbales, feuilles et montants fins.

**Ordre de compositing de l'arrière vers l'avant :**

1. **Paysage** interchangeable (ville, montagnes, mer, nuit, météo), sans dépendance envers BOONOTRADE.
2. **Loft RGBA transparent aux vitrages**, parfaitement immobile et aligné à l'image canonique.
3. **Bureau et ordinateur BOONO** séparés, avec les deux écrans encastrés et leurs projections autonomes.
4. **BOONO et ses mains**, avec occultations respectant le bureau.
5. **Chat noir et autres accessoires mobiles**, indépendants des murs et des affiches.
6. **Bulles, informations et effets de scène**, selon priorité de profondeur choisie.

Le masque de cette étape n'est **pas** une modification du code de calibration des écrans. Le studio BOONO-TV fonctionne en **lecture seule** vis-à-vis du moteur de trading.

## 4. Validation et travaux ouverts

- **Décision validée :** cette image est désormais l'apparence de référence de la chambre ; géométrie, mobilier et affiches fixés.
- **Fabrication terminée :** masque de découpe transparent et PNG RGBA pixel-alignés à la référence ; contrôle sur damier.
- **Tests encore nécessaires :** contrôle fin des contours, continuité des barres, transition jour/nuit derrière les vitrages, recadrage pour la scène globale de 1920 × 1080.
- **Non réalisés :** intégration OVH, animation du fond, conversion et montage des assets bureau/chat/BOONO, mise en service publique, redémarrage du studio et toute modification PAPER.

L'arrière-plan canonique est **3:2**, et non le ratio historique du panneau loft 1200 × 1080 ; toute adaptation à ce panneau devra faire l'objet d'un cadrage **validé** et ne doit pas écraser `/home/ubuntu/boono-tv-studio/runtime/boono-tv/desk/projection-config.json`.

### Image canonique

Référence : **la dernière illustration de la pièce sans BOONO ni bureau, datée du 1er novembre 2026, avec Muddy Waters / Howlin' Wolf, approuvée explicitement dans la conversation**. Le fichier livré en est la copie octet pour octet, vérifiable grâce au SHA-256.
