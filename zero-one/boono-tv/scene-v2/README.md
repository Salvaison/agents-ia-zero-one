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
