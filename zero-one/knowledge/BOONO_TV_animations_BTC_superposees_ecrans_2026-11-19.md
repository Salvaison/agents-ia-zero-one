# BOONO-TV — Deux animations Bitcoin superposées temporairement aux écrans

**Date :** 19 novembre 2026 · **Décision :** OD-20261119-007 · **Suite des imports :** OD-20261119-003 et OD-20261119-006. **Infrastructure :** studio privé OVH, lecture seule depuis Amsterdam.

## Demande exacte

L'utilisateur veut que les **deux vidéos Bitcoin** (*Circuit* et *Digital bleu*) apparaissent par-dessus les panneaux physiques du bureau, à gauche **Conversion** et à droite **MarketCipher**, « pour superposer temporairement tel un accessoir », en pouvant les choisir **séparément**. L'intention exclut la création d'une nouvelle rotation des projections.

## Solution en service

Deux accessoires **distincts** dans le Composer → Ateliers → Scénarios → Accessoires :

- `btcDeskLeft` — **Écran Conversion · animation BTC**.
- `btcDeskRight` — **Écran MarketCipher · animation BTC**.

Chaque accessoire dispose, par posture parmi les 12 :

1. D'un interrupteur indépendant `Inclure dans cette posture`, **désactivé par défaut**.
2. D'un menu indépendant : **BTC Circuit** (`btcCircuit`) ou **BTC Digital bleu** (`btcBlue`). Les deux sources sont échangeables entre les écrans ; on peut même choisir la même sur les deux.
3. D'une fenêtre d'apparition **Début / Fin**, en pourcentage de la durée de la posture. Désactiver l'accessoire laisse immédiatement apparaître le contenu sous-jacent.

Les objets utilisent la perspective des écrans déjà établie : **pas de contrôle X/Y sur ces deux accessoires d'écran**. Les autres accessoires libres (dont les mêmes deux animations Bitcoin libres dans le loft) et le réglage de leurs positions/échelles restent indépendants.

## Implémentation technique

**OVH**, sous `/home/ubuntu/boono-tv-studio/runtime/boono-tv/` :

- **Nouveau** `scene/desk-screen-accessories.js` : monte les deux calques vidéo comme enfants directs de `#deskScreenLeft` et `#deskScreenRight`. Ils héritent ainsi des transformations `matrix3d`, des masques et de l'ordre de profondeur de l'écran parent, au-dessus des contenus Conversion et MC mais derrière BOONO et ses mains. Deux sources privées autorisées strictement : `/api/private/boono-asset/btcCircuitSmall` et `.../btcBlueSmall`. Les vidéos sont muettes, bouclées, chargées à la demande, mises en pause lorsqu'elles sont masquées, et révélées seulement après disponibilité des premières images. Les deux calques sont séparés, sans deuxième horloge de posture ni nouvelle rotation.
- `scene/storyboard-timeline.js` : réutilise l'horloge existante (rafraîchissement nominal de 250 ms) pour les fenêtres temporelles des deux nouveaux IDs, via l'API `BoonoTVDeskScreenAccessories.set`.
- `scene/dialogue-editor.js` : deux rubriques distinctes avec menu Circuit/Digital bleu et fenêtre temporelle, sans position ni échelle manuelle.
- `studio-server.js` : validation et sérialisation des deux `source` explicites dans le contrat des scénarios. Les sources hors liste autorisée sont rejetées. Le contrat d'origine `version=1` est conservé, sans écraser le JSON des scénarios actifs avant l'action volontaire `Enregistrer`.
- `scene/styles.css` : calque positionné dans chaque surface de 400 × 140, `z-index:90`, plus haut que le canvas optionnel de projection vidéo (`z-index:70`), avec une image 16:9 en `object-fit:cover` et une indication discrète de l'animation.
- `scene/index.html` : script nouvellement chargé **avant** `storyboard-timeline.js` ; références versionnées des fichiers touchés.

La rotation existante `scene/projection-cycle.js` n'a **pas été modifiée**. Les vidéos Bitcoin ne deviennent pas de nouvelles étapes de cette rotation. Ni les flux réels MC/Conversion, ni la capture TradingView, ni les runners PAPER, ni les mécanismes de trading d'Amsterdam n'ont été modifiés.

## Sécurité, origine et réversibilité

Les deux MP4 existants sont des dérivés H.264 légers fournis lors de OD-20261119-003 (BTC Circuit env. 1,61 Mo ; BTC Digital bleu env. 3,22 Mo). Ils restent **dans `private-media` et derrière les routes privées** : le code ne monte aucun calque vidéo sur la scène spectateur publique au port 3092. Aucune licence de diffusion publique n'est revendiquée.

Sauvegardes des fichiers ciblés dans `/home/ubuntu/boono-tv-studio/backups/20261119-btc-screen-accessories/`, dont `studio-server.js`, les trois fichiers d'interface ciblés, `scene/styles.css`, `desk/dialogue-script.json` et `desk/projection-config.json`.

**État des fichiers utilisateur vérifié après redémarrage** :

- `desk/dialogue-script.json` : SHA-256 `d345fbf51d110791f45555be548b792b7473df3c66606951f5107a773c0e2473`, inchangé.
- `desk/projection-config.json` : SHA-256 `7aaa265ef47ea0c1243e3d42c929debf0d9f1ba42dd2e6d243ba785d7e9e38c4`, inchangé.

## Contrôles effectués

- `node --check` : OK pour serveur, éditeur, timeline, module vidéo et scripts existants ciblés.
- Test de régression conservé sur OVH : `/home/ubuntu/boono-tv-studio/tests/boono-tv-desk-screen-accessories.test.js`. Il vérifie : normalisation rétrocompatible des 12 scénarios et des 10 accessoires existants, deux sources/horaires indépendants, blocage de toute source externe arbitraire, calques vidéo montant en complément du contenu existant, arrêt d'un décodeur sans interrompre l'autre, aucun calque chargé sur la scène publique.
- POST contre-exemple à l'API privée avec une source externe : **HTTP 400, refus et aucun changement du fichier des scénarios**.
- Dans la scène réelle du studio : HTTP 200, nouveaux JS servis HTTP 200, 12 scénarios récupérables, les deux MP4 privés HTTP 206 (Range), catalogue des quatre vidéos du Video Viewer inchangé, route temporaire d'import HTTP 404, `boono-studio` actif après un redémarrage ciblé.
- **Limite de validation** : tests système, fonctions d'interface simulées et endpoints réussis ; aucune validation graphique interactive via le navigateur utilisateur authentifié. Le rendu à vérifier dans Chrome/noVNC porte sur l'homographie des écrans, la transition au début/à la fin des fenêtres et les deux menus du Composer.

## Mode d'emploi

Dans la régie privée, ouvrir **Ateliers → Scénarios → Accessoires**. Déplier **Écran Conversion · animation BTC** ou **Écran MarketCipher · animation BTC**. Sélectionner la vidéo pour chacun, activer `Inclure dans cette posture`, ajuster **Début/Fin**, choisir **Voir**, puis **Enregistrer** pour conserver le changement. Désactiver l'un ne touche pas l'autre ni aux vues de marché.

L'état des deux accessoires est observable dans la console privée via `window.BoonoTVDeskScreenAccessories.status()` et la timeline `window.BoonoTVStoryboard.current()`. Les tests ne constituent pas une preuve de droits de diffusion publique.
