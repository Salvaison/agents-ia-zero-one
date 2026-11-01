# BOONO-TV V2 — Runtime CSS/JS reproduisant la scène OVH (01/11/2026)

**Opération :** [OD-20261101-006](../../knowledge/operational-decisions/OD-20261101-006/03-origine-et-justification.md) ; [rapport de mise en place](../../knowledge/BOONO_TV_reconstruction_scene_V2_OVH_2026-11-01.md).

## Fichiers source

- `boono-v2.css` : superposition du loft nord, écran droit MarketCipher authentique, écran gauche instrument BOONO, établi, BOONO et chat ; `matrix3d` des deux écrans de la **nouvelle illustration**.
- `boono-v2.js` : détecte le manifeste versionné `BOONOTV-v2-artwork-2026-11-01`, précharge les images, associe les dix poses aux sept états, gère la présence du chat et le paysage, et laisse la scène V1 en place en cas d'absence du pack ou avec `?sceneV1=1`.
- `artwork-manifest.json` : fichier de livraison original et empreintes exactes des 29 images installées. Les binaires sont conservés sur OVH et dans le ZIP transmis par l'utilisateur, **pas dans ce dépôt Git**.

Les copies CSS et JS ont été vérifiées byte-identiques à celles de la scène OVH au moment de la publication.

## Installation effectuée

Côté OVH :

`/home/ubuntu/boono-tv-studio/runtime/boono-tv/scene/boono-v2.css`

`/home/ubuntu/boono-tv-studio/runtime/boono-tv/scene/boono-v2.js`

`/home/ubuntu/boono-tv-studio/runtime/boono-tv/assets/boonotv-v2-20261101/`

La page `scene/index.html` ajoute `<link rel="stylesheet" href="/boono-v2.css">` dans son `<head>`, et `<script src="/boono-v2.js"></script>` après `/studio-status.js`. Ce script de présentation ne modifie aucun endpoint d'Amsterdam.

## Validation/limites

- 29 hash image vérifiés, ZIP intègre, JS syntaxique validé, URLs HTTP `200`, état bridge en ligne.
- La géométrie a fait l'objet d'une simulation de navigateur local aux dimensions 1200×1080. **Validation réelle dans le navigateur OVH encore ouverte**.
- `desk/projection-config.json` n'a pas changé ; les quads V2 sont actuellement en CSS, non stockés par l'éditeur historique.
- Il reste à examiner le contour de certains sprites semi-automatiques et la main au-dessus des écrans.

## Retour arrière

`?sceneV1=1` affiche l'ancienne scène sans supprimer aucun asset. La sauvegarde OVH du `index.html` historique se trouve dans `incoming/backup-boono-tv-20261101-before-v2/`.

Ne pas copier un ancien `projection-config.json` ni redémarrer BOONOTRADE pour résoudre un problème de studio visuel.


## Recadrage plein canevas 1200 × 1080 — OD-20261101-008

Cette version ajuste le cadrage après comparaison avec une capture du studio. **L'établi reste à son échelle validée** 920 × 613 à (140,465) ; BOONO passe de 374 × 486 à 288 × 374 et est ancré à (483,342), mains au même niveau de travail. Le chat conserve 230 × 184 à (190,460).

**Sur OVH :**
- `scene/build_reframed_scene.py` produit 19 images pleine scène à partir du pack source, sous `assets/boonotv-v2-20261101/reframed-20261101/`.
- `scene/boono-v2.css` sélectionne les images plein canevas avec la classe `boono-reframed` ;
- `scene/boono-v2.js` vérifie les 19 assets, les précharge et active la nouvelle mise en page, avec repli automatique sur l'ancienne V2 si les images manquent.
- `reframed-20261101-manifest.json` conserve les SHA256, dimensions et ancres. Les PNG volumineux sont **sur OVH**, non dans Git.

**Retours :** `?reframeV1=1` pour l'ancienne V2 (bureau compact mais fond tronqué) ; `?sceneV1=1` pour l'ancienne composition du studio.

**QA :** 19 SHA conformes, tests d'initialisation JS simulée sur quatre URLs, flux MarketCipher et snapshot Amsterdam conservés. Le prolongement de sol sous y=700 constitue une **retouche de compositing**, non une illustration finale. Plusieurs sprites gardent des fonds de chaise résiduels. Ne pas présenter ces défauts comme corrigés sans nouveau masque vérifié.

[Récit de l'intervention et statut](../../knowledge/BOONO_TV_reformatage_scene_1200x1080_2026-11-01.md) · [Registre OD-20261101-008](../../knowledge/operational-decisions/OD-20261101-008/03-origine-et-justification.md).

## Retour du rideau MCB et du graphique Prix (OD-20261101-009)

**Réglages actifs en V2 sur OVH :** les deux vagues de MarketCipher (15m et 3m) sont remises dans leur rideau translucide (`z=7`, `opacity=.80`). Le plan prix 3m tactique occupe désormais `920×420` à `x=35,y=130` (`z=8`), contre l'ancienne surface `520×296`, pour des fluctuations affichées avec davantage de résolution verticale. BOONO et ses mains restent au premier plan.

**Code déployé :** `boono-v2.css` (copie Git byte-identique à OVH) et une correction limitée à `scene/app.js`, documentée comme [patch](boono-v2-wave-price-app.patch). Le renderer partagé des graphiques n'est pas modifié. La fenêtre prix reste 2h ; les vagues conservent 6h.

**Anomalie observée :** le ticker `market.price=80451.4` peut être daté de plus de 150h tandis que les nouvelles bougies 3m se situent autour de `77729`. La V2 ne doit pas déformer le graphique en s'ancrant sur une valeur obsolète : elle prend la dernière **clôture 3m** comme ancre de *vue* et affiche `TICKER ANCIEN`. Ni les décisions de BOONOTRADE, ni les données OHLC, ni l'État vivant ne sont modifiés.

**Tests :** JS syntaxique, deux `drawWave`, un `drawPrice`, trois scénarios ticker ancien/récent/V1, captures et API côté studio en HTTP 200 et calibration historique intacte. **Disposition réelle dans le navigateur noVNC à confirmer.**

[Rapport complet et statut](../../knowledge/BOONO_TV_rideau_MCB_prix_amplitude_2026-11-01.md) · [OD-20261101-009](../../knowledge/operational-decisions/OD-20261101-009/03-origine-et-justification.md).
