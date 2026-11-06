# BOONO-TV — Fin du flash de l'ancienne scène et suppression des Canvas obsolètes

**Date :** 6 novembre 2026
**Décision :** OD-20261106-011
**État :** correction active sur OVH, validée sous Chromium avec chargement ralenti, mode normal, mode vidéo et éditeur. Validation perceptive sur le vrai Chromebook ouverte. Aucun changement des moteurs PAPER, des collecteurs, de la vidéo originale, des masques alpha ni des deux calibrations.

## Signalement et diagnostic

L'utilisateur voit l'ancien bureau et l'ancien BOONO avant l'apparition de la nouvelle scène lors d'une actualisation et demande si cela alourdit son Chromebook.

Le HTML du studio conserve une ancienne maquette (ancien personnage, ancien poste de travail, fonds, anciens panneaux de vagues/prix et cinq Canvas). La nouvelle scène V2 n'était activée qu'après le préchargement d'un grand ensemble d'illustrations par boono-v2.js. Avant cette activation, le navigateur peignait la maquette antérieure. Le diagnostic a été reproduit dans Chromium en retardant volontairement cinq images de 1,9 seconde. Captures avant correction : tests/OD-20261106-011-before-legacy-flash.jpg (ancien robot et ancien bureau), puis before-v2-mounted.jpg (scène validée).

Le code de app.js continuait aussi à dessiner les cinq anciens Canvas, malgré leur invisibilité sous la CSS V2 : bougies historiques, ancien oscillateur, vagues et deux anciens écrans de console. Ce n'était **pas un deuxième moteur de trading**, mais une dépense graphique héritée.

## Modifications conservatrices

Fichiers actifs OVH :
- scene/index.html : une courte sélection synchrone de mode visuel avant le premier paint. Pour V2 normal, elle applique la classe boono-v2-boot immédiatement et donne des URL de script/CSS versionnées OD20261106-011. Les diagnostics explicites sceneV1=1 et reframeV1=1 restent possibles.
- scene/boono-v2.css : pendant le chargement V2, montre **le loft approuvé aux masques GIMP et le bureau GIMP validé**, sans faire apparaître la vieille posture ni les anciens panneaux. Les anciennes bulles, prix flottants et labels sont masqués dans cette phase.
- scene/boono-v2.js : après préchargement et montage du personnage V2, enlève la classe de bootstrap sans passer par l'ancienne scène. Sur erreur, permet le fallback historique pour diagnostic.
- scene/app.js : ne précharge plus les sept anciennes postures du dossier casting-poses en V2. Les sept vraies postures assises et les cinq debout validées restent chargées par boono-v2.js. La fonction paintLegacyOnly évite les cinq anciennes opérations Canvas pendant le bootstrap et sous V2, mais les laisse fonctionner dans le diagnostic V1.
- Les bougies et vagues actuelles, la capture TradingView MarketCipher B, la mini-conversion et le prix Live sont toujours dessinés et rafraîchis normalement.

Aucun sprite, aucune illustration et aucun quadrilatère n'ont été régénérés ou déplacés. Les éléments historiques restent en DOM, en état non rendu, pour le diagnostic explicitement demandé. On ne prétend pas avoir supprimé l'intégralité du code historique.

## Sauvegarde, tests et preuves

Sauvegarde **avant toute modification** :
/home/ubuntu/boono-tv-studio/backups/OD-20261106-011/
(index.html, styles.css, boono-v2.css, boono-v2.js, app.js, projection-config.json, grand-screen-config.json).

- tests/diagnose-OD-20261106-011-legacy-flash.js : preuve du problème initial au chargement des sprites.
- tests/verify-OD-20261106-011-bootstrap-and-legacy-canvas.js et JSON final : avec cinq téléchargements ralentis volontairement à ~2,2 secondes, premier rendu montrant directement le loft et le bureau approuvés et non l'ancien BOONO. Après préchargement, disparition du drapeau de bootstrap et affichage normal de la vraie scène. En V2, **zéro chargement** pour les anciens fonds boonotv_empty_loft, desk-runtime/desk-clean et casting-poses/working, contre trois requêtes observées avant correction. En V2, **zéro appel** aux cinq anciens Canvas sur les snapshots ; en mode diagnostic V1, trois appels par Canvas dans la même période, prouvant la rétrocompatibilité. Zéro erreur JS.
- Captures : OD-20261106-011-after-boot-no-old-scene.jpg et after-v2-normal.jpg.
- tests/verify-OD-20261106-011-video-boot-no-old-flash.js : pendant le chargement volontairement ralenti du mode privé Clemens, pas d'ancienne posture, de vieille bulle ni d'ancienne étiquette Live. Après chargement, BOONO, ses sprites et la vidéo restent actifs. Zéro erreur.
- tests/verify-OD-20261106-011-scene-regression.json : modes normal, fenêtres, affiches, deux moniteurs, grand écran et calibration à cinq ancres fonctionnels ; zéro erreur JS.
- tests/verify-OD-20261106-011-editor-regression.json : l'éditeur technique reste connecté à l'éditeur mural à cinq ancres ; les quatre surfaces et masques fonctionnent.
- tests/verify-OD-20261106-011-histogram.json : spectre audio Live 160px, fond transparent et bandeau compact conservés.
- tests/verify-OD-20261106-011-actual-21s.json : fenêtres vers affiches à 21,2 secondes, aucune pause, aucun changement de source, un seul lecteur vidéo ; recherche à 42,6, 63,6 et 84,6 secondes vers bureau, grand, fenêtres. Zéro erreur.
- Les fichiers JavaScript modifiés passent node --check et le studio OVH reste accessible.

**Calibration du bureau strictement inchangée** : SHA-256 39922e2434c59e282d3ee64ff851c6b9def9c43a345d5c2f68cf56b87d112c2f.
**Grand écran à cinq ancres strictement inchangé** : SHA-256 4cff3e82d4840f72a3006d5a9067508c5c8447af85f3ba954325cada02f0bd8a.

## Conclusion et limites

L'ancien décor ne sera plus visible au démarrage. Les demandes réseau de ses images historiques et les calculs des cinq anciens Canvas ont été supprimés du fonctionnement V2. Le coût des quelques nœuds HTML cachés est relativement modeste ; le moteur Canvas vidéo, le décodage AAC et les vrais graphes restent l'essentiel de la charge. **Aucun pourcentage de gain CPU/RAM n'a été mesuré sur le vrai Chromebook**, donc ne pas quantifier abusivement l'amélioration.

Point de contrôle utilisateur : ouvrir la scène privée, faire Ctrl + Maj + R et vérifier l'absence du flash historique et la fluidité. Le petit glitch initial des surfaces de projection reste en observation, comme décidé.

Lien de test : http://127.0.0.1:8310/?showcase=1&windowVideo=clemens&projectionCycle=21.
