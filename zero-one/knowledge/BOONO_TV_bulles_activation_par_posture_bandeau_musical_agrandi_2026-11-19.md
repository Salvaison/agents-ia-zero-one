# BOONO-TV — Bulle facultative par posture et agrandissement du bandeau musical

**Date :** 19 novembre 2026 · **Décision :** OD-20261119-010 · **Portée :** studio BOONO-TV privé OVH.

## Demande validée

L’utilisateur souhaite choisir, **indépendamment pour chacune des 12 postures**, si BOONO affiche ou non une bulle de dialogue. Il demande aussi d’agrandir le bandeau du loft qui affiche le **titre défilant de la musique et l’histogramme audio**.

## Changement A — Activation de la bulle par posture

Dans **Ateliers → Scénarios → Bulle et parole**, ajout d’une case : **« Afficher la bulle dans cette posture »**.

- Cochée : l’apparition continue d’être pilotée par les curseurs existants **Début / Fin** exprimés en pourcentage de la posture.
- Décochée : la bulle est masquée entièrement pour cette posture (y compris hors éditeur) mais le texte, le type de bulle, sa position, son échelle et sa fenêtre temporelle sont conservés dans le scénario.
- Les 12 postures restent **activées par défaut** : champ `bubbleEnabled` manquant sur les anciens fichiers = `true`, sans migration destructive. Le choix n’est persisté que lorsque l’utilisateur clique **Enregistrer** dans le Composer.
- Le booléen `bubbleEnabled` est ajouté au modèle normalisé de `scene/dialogue-editor.js`, validé strictement dans `studio-server.js`, et appliqué dans `scene/storyboard-timeline.js` par la même horloge de posture. Le moteur conserve son fonctionnement précédent lorsque le champ est absent.

## Changement B — Bandeau musique et spectre plus visibles

Conservation du style **bleu intense sur fond transparent**, du défilement et de la position haute sans nouvelle couche audio.

| Objet | Ancien | Nouveau |
|---|---:|---:|
| Bandeau musical total | 400 × 27 px | **620 × 44 px** |
| Position verticale | 25 px | **18 px** |
| Texte défilant | 21 px | **25 px** |
| Spectre affiché | 160 × 20 px | **240 × 32 px** |

La feuille `scene/boono-v2.css` modifie uniquement les règles de présentation du bandeau `#boonoMusicTicker`. Le fichier `scene/music-ticker.js` agrandit la toile Canvas intrinsèque de 160×20 à 240×32 et redessine les **mêmes 16 bandes** en 12 px de large avec espacement de 3 px et hauteur proportionnelle jusqu’à 30 px. Pas d’augmentation de fréquence FFT ni de nouveaux décodeurs. La source audio Live (AAC indépendant) et le vrai secours FFT restent tels que déployés.

Le moteur vidéo conserve sa cadence de **30 images/s** et les quatre clips privés restent dans le catalogue. Aucune nouvelle rotation vidéo n’a été introduite.

## Modifications, sauvegardes et limites

Racine sur OVH : `/home/ubuntu/boono-tv-studio/runtime/boono-tv/`.

Fichiers modifiés : `studio-server.js`, `scene/dialogue-editor.js`, `scene/storyboard-timeline.js`, `scene/music-ticker.js`, `scene/boono-v2.css`, `scene/styles.css` (mise en forme de la case) et `scene/index.html` (scripts et CSS versionnés `OD20261119-010`).

Sauvegardes antérieures à la modification : `/home/ubuntu/boono-tv-studio/backups/20261119-bubbles-music/`, comprenant ces fichiers ainsi que `desk/dialogue-script.json`.

Le fichier de scénarios originel **n’a pas été modifié pendant le déploiement ou les tests** :
SHA-256 `16d06458ccf7cc03efbb6e4c65b69840ead52a589119c1c37ec5825422054c6b`.

Le fichier de calibration des écrans **n’a pas été modifié** :
SHA-256 `7aaa265ef47ea0c1243e3d42c929debf0d9f1ba42dd2e6d243ba785d7e9e38c4`.

Aucune modification des moteurs PAPER, de Watch, de la collecte TradingView/MCB, des calques de perspective BTC, de l’accessoire BTC permanent ni du contenu musical n’a été introduite.

## Tests exécutés le 19 novembre 2026

- `node --check` réussi sur les quatre fichiers JavaScript modifiés.
- Test serveur `tests/boono-bubble-choice-music-size-20261119.test.js` : normalisation rétrocompatible des 12 scénarios, `bubbleEnabled:true` par défaut, désactivation isolée d’une posture sans perte de texte/fenêtre, rejet des valeurs non booléennes.
- POST réel au studio avec `bubbleEnabled:"false"` (chaîne invalide) : **HTTP 400** ; empreinte du JSON utilisateur inchangée.
- **Essai interactif Chrome headless/Puppeteer** : sur la posture *working*, la bulle initiale est visible pendant sa fenêtre 29–69 %, décocher la case la masque immédiatement ; son texte et sa fenêtre demeurent. Passage à *thinking* → bulle encore visible et case cochée ; retour à *working* → choix local désactivé toujours présent ; **Annuler** restaure l’état sauvegardé. Aucun scénario utilisateur n’a été enregistré pendant le test.
- Dans le même navigateur, visite de la scène de vidéo privée Clemens à 30 fps : géométrie du bandeau mesurée à **620×44**, `top=18`, titre bleu de **25 px**, spectre CSS et Canvas **240×32**, toujours **16 bandes**, authentique spectre secours (390 080 octets, 24 379 relevés à 8 relevés/s) chargé et réellement dessiné. `videoFps=30`.
- Contrôle réseau : scène et JS HTTP 200, 12 scénarios lisibles, catalogue des quatre vidéos privées **ready**, service utilisateur `boono-studio` actif après redémarrage ciblé.

## À utiliser dans le Composer

Choisir une posture, ouvrir **Bulle et parole**, cocher/décocher **Afficher la bulle dans cette posture**, puis cliquer **Enregistrer**. Les autres propriétés restent éditables, même quand la bulle est masquée. Les réglages s’appliquent lors de toutes les reprises de cette posture.

L’agrandissement du bandeau musical est déjà en service dans la scène privée et ne nécessite aucun réglage. Le contrôle artistique final peut être effectué depuis Chrome/noVNC.

Les droits de redistribution publique des vidéos et bandes musicales privées ne sont pas déduits de cette modification technique.
