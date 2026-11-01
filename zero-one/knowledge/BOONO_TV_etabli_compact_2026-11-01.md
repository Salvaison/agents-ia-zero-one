# BOONO-TV — Établi compact et repositionnement au bord arrière

**1er novembre 2026 — correction géométrique de la scène V2 sur OVH**  
**Registre :** [OD-20261101-007](operational-decisions/OD-20261101-007/03-origine-et-justification.md)  
**État :** modification visuelle **mise en service sur la prévisualisation OVH**, tests serveurs positifs ; confirmation finale dans le navigateur utilisateur encore ouverte.

## 1. Demande et diagnostic

Après affichage de la scène V2 dans ChromeOS/noVNC, l'utilisateur signale que l'établi paraît **beaucoup trop grand**, occupant toute la partie inférieure de la scène et plaçant BOONO visuellement **au milieu de la large surface de bois libre derrière les écrans**. La capture de l'utilisateur documente ce défaut.

La correction ne change pas l'architecture. Elle retire la plage de bois vide **derrière** les deux écrans, conserve tous les détails validés (ferrures, vis, bordures de laiton, roue centrale, rack, câbles et enseigne), puis réduit et déplace l'établi pour que BOONO soit perçu près de son bord supérieur.

BOONO et ses mains demeurent **au-dessus des deux surfaces de projection** conformément à la règle explicitement validée.

## 2. Transformation de l'asset

**Source conservée :** `assets/boonotv-v2-20261101/desk_canonical_alpha.png` (1536 × 1024 RGBA).

**Nouvelle variante :** `assets/boonotv-v2-20261101/desk_canonical_compact_v1.png` (1536 × 1024 RGBA).

Seul le **canal alpha** change. Une découpe courbe de type `Y = 300 + 0.14(X - 550) + 0.00008(X-550)^2` retire la plage vide au-dessus de la ligne supérieure des écrans. Entre `X=370` et `X=425` la découpe s'active progressivement afin de préserver le panneau de connexions à gauche. Le seuil vertical reçoit un adoucissement de huit pixels environ.

L'image ne subit pas de redessin : les pixels de couleur, les écrans, les ferrures, le rack et les câbles restent inchangés.

La production est entièrement reproductible avec [`generate_compact_desk.sh`](../boono-tv/scene-v2/generate_compact_desk.sh), utilisant FFmpeg sans installer de nouvelle bibliothèque sur le serveur.

**SHA-256 du PNG compact sur OVH :** `e528c8d1d5c7083ca3a8c50be7c8023f3ef54474d1c1e0c0fda56cc4f0ee00d9`.

## 3. Nouvelle géométrie en coordonnées pièce (1200 × 1080)

| Élément | Avant modification | Désormais |
|---|---|---|
| Établi | (0,280), 1200 × 800 | **(140,465), 920 × 613.333** |
| BOONO | (440,125), 374 × 486 | **(440,230), 374 × 486** |
| Chat | (180,340), 230 × 184 | **(190,460), 230 × 184** |
| Bande arrière de bois | Visible | **Supprimée par transparence** |
| Superposition des mains de BOONO | Au-dessus du bureau | **Conservée**, sans calque de mains séparé |

La largeur de l'établi passe donc de 1200 à 920, soit **76,7 % de l'ancienne largeur**. Les deux écrans demeurent inclinés et actifs.

### Nouvelles surfaces projetées

**Écran gauche — instruments BOONO :**

```
TL (451.267, 655.900)
TR (660.567, 694.233)
BR (556.300, 802.333)
BL (327.833, 730.267)
```

**Écran droit — TradingView / MarketCipher réel :**

```
TL (713.467, 721.067)
TR (1019.367, 791.600)
BR (945.767, 984.800)
BL (604.600, 859.833)
```

Ces quads résultent d'un redimensionnement et d'une translation de la géométrie V2 de référence. Ils sont écrits dans `scene/boono-v2.css` et non dans le fichier historique de calibration.

## 4. Modifications sur OVH

- Nouveau PNG sous `/home/ubuntu/boono-tv-studio/runtime/boono-tv/assets/boonotv-v2-20261101/`.
- CSS modifié sous `/home/ubuntu/boono-tv-studio/runtime/boono-tv/scene/boono-v2.css`.
- Sauvegarde de la précédente V2 dans `/home/ubuntu/boono-tv-studio/incoming/backup-boono-tv-20261101-before-compact-desk/` ; source du bureau conservée dans le pack original.
- **Aucune modification** des runners Amsterdam, de leurs données ou du tunnel ; le fichier `desk/projection-config.json` ancien reste inchangé.
- L'URL `?sceneV1=1` demeure disponible pour rétablir le rendu historique.

## 5. Tests et limites

**Confirmés :**

- L'image d'origine et le nouveau PNG sont distincts ; la sauvegarde du CSS antérieur existe.
- Le masque rend bien transparents les pixels du bois arrière, tandis que les pixels des écrans et du panneau gauche conservent leur alpha.
- Les nouveaux quadrilatères ont été contrôlés sur une simulation de la composition aux dimensions 1200 × 1080, construite à partir des mêmes assets et coordonnées.
- CSS servi en HTTP `200`, PNG compact servi en HTTP `200`, `/api/health` répond avec `sourceOnline=true`.
- Le rapport de précédente reconstruction [OD-20261101-006](operational-decisions/OD-20261101-006/03-origine-et-justification.md) demeure la base des états, postures et règles de gouvernance.

**Encore ouverts :**

- **Validation visuelle dans le vrai navigateur noVNC après rechargement** : tête, mains, bord supérieur des écrans et placement du chat.
- Ajustement fin éventuel de quelques pixels des matrices d'écran.
- Certains sprites BOONO comportent encore des ombres de détourage de la génération initiale ; elles ne proviennent pas du recadrage du bureau.
- La scène V2 est un studio de prévisualisation, pas une modification des ordres de marché.

## 6. Retour arrière

**Repli général V1 :** ouvrir `http://127.0.0.1:8310/?sceneV1=1` sur le Chrome distant d'Amsterdam.

**Retour à la précédente V2 :** restaurer le CSS sauvegardé `backup-boono-tv-20261101-before-compact-desk/boono-v2.css` dans `scene/boono-v2.css`; l'ancien fichier `desk_canonical_alpha.png` n'a pas été touché.

**Vérification attendue côté utilisateur :** recharger la scène `?showcase=1` avec `Ctrl+Maj+R` et transmettre une capture s'il reste un décalage entre BOONO et les deux écrans.
