# BOONO-TV — Atelier unifié des scénarios et fenêtres temporelles

**Date :** 5 novembre 2026. **Décision :** OD-20261105-013.
**Statut :** implémenté, vérifié en Chromium, actif sur OVH. Dernier examen esthétique sur le Chromebook ouvert. **Frontière :** aucun changement aux collecteurs, aux moteurs PAPER ou à la géométrie validée des écrans.

## Intention et référence temporelle

Le propriétaire demande un atelier unique dans la surface de l'État vivant pour réunir les 12 postures de BOONO, les paroles en bulles, les accessoires et le calendrier de visibilité de chacun. La durée de la posture BOONO (secondes) constitue la référence ; les objets associés possèdent deux curseurs **début et fin** en pourcentage de cette durée (0–100 %, début strictement inférieur à fin). Par exemple, pour une posture de 12 secondes, bulle 20–70 % = 2,4–8,4 secondes, Like 25–55 % = 3–6,6 secondes. Il ne s'agit jamais d'une durée de trading.

Les **sept postures assises**, dont la durée historique était 7 secondes, et les **cinq debout**, dont la durée était 10 secondes, ont conservé leurs différentes durées lors de la migration. Aucun arbitrage arbitraire à 10 secondes partout.

## Interface, objet et contenu

Accessible sur le Chromebook à http://127.0.0.1:8310/?dialogueEdit=1 et par l'alias storyboardEdit=1, ou via **Atelier scénarios · postures / bulles / accessoires** depuis la calibration technique.

Quatre sections à navigation directe dans **un seul panneau gauche** :

1. **Posture :** une des douze illustrations, durée 2–300 secondes, déplacements X/Y et échelle, surcouche additionnelle aux positions déjà calibrées.
2. **Bulle et parole :** choix parmi les quatre bulles validées, texte libre, déplacement et grandeur indépendants par posture, et fenêtre d'apparition 0–100 %. Une barre colorée matérialise la tranche de visibilité.
3. **Accessoires :** pour chaque posture, les objets **Mug, Like, Subscribe**, et les futurs emplacements MarketCipher, OKX, TradingView disposent chacun d'une activation, de deux curseurs début/fin, d'une position X/Y et d'une échelle. Like/Subscribe sont les vrais SVG originaux déjà disponibles ; le Mug est un **pictogramme de prototype**, pas le sprite artistique final. Les trois logos demeurent **non activables**, en attente des assets officiels et des droits vérifiés.
4. **Aperçu temporel :** curseur manuel 0–100 %, bouton **Jouer la posture**, bouton Voir (sans sauvegarder), Enregistrer, Annuler, Quitter. Les gros graphes restent figés pendant l'édition pour ménager le Chromebook, les moteurs PAPER restent actifs. Hors atelier, les panneaux État vivant → Graphiques → Trades retrouvent leur rotation de 12 secondes.

Les précédents textes utilisateur, types et positions des douze bulles ont été conservés sans modification. Les nouveaux accessoires sont désactivés par défaut, tandis que les bulles occupent 0–100 % du temps de leur posture : la migration reproduit donc les anciennes scènes sans nouvelles apparitions imposées.

## Source de vérité et sécurité

**Fichier de scénario privé OVH :** /home/ubuntu/boono-tv-studio/runtime/boono-tv/desk/dialogue-script.json, schéma version 1 rétrocompatible. Chaque entrée possède maintenant :
- type, text, placement (anciens champs conservés) ;
- pose : durationSec, dx, dy, scale ;
- bubbleWindow : startPct, endPct ;
- accessories : objet par nom, enabled, startPct, endPct, x, y, scale.

**La calibration physique n'a pas été déplacée dans les scénarios.** Le fichier desk/projection-config.json reste octet pour octet inchangé (SHA-256 39922e2434c59e282d3ee64ff851c6b9def9c43a345d5c2f68cf56b87d112c2f). La géométrie de posture constitue seulement une surcouche relative à l'existant. L'éditeur de calibration du bureau reste distinct pour les quadrilatères/éléments techniques ; l'ancienne durée individuelle BOONO y est désactivée pour ne pas donner deux autorités concurrentes, et renvoie vers l'atelier.

La route privée GET/POST /api/dialogue-script de studio-server.js valide : douze postures, quatre types de bulles, texte limité à 220 caractères, durées 2–300 secondes, fenêtres 0 ≤ début < fin ≤ 100, bornes de déplacement/échelle et droits d'activation des logos. Écriture atomique. En-tête de contrôle et origine localhost/tunnel obligatoires pour POST ; hash de révision pour prévenir les écritures concurrentes (HTTP 409).

## Code réellement modifié sur OVH

- studio-server.js — validation et sauvegarde étendue, source des scénarios uniquement.
- scene/dialogue-editor.js — interface réunifiée avec navigation Posture / Bulle / Accessoires / Aperçu, curseurs double bornes et contrôle de la lecture temporelle.
- scene/storyboard-timeline.js — nouveau moteur de visibilité visuelle, relatif au changement de posture, cadence légère de 250 ms, aucune donnée de trading ni ordre.
- scene/layout-editor.js — applique la géométrie additionnelle BOONO du scénario à la pose, sans modifier les quads ; entrée vers l'atelier unifié, ancien réglage de secondes BOONO technique désactivé.
- scene/app.js — la durée visuelle de la posture de scène utilise en priorité le scénario, avec l'ancienne durée comme repli. Ne modifie pas la logique des moteurs PAPER.
- scene/chart-views.js — le mode storyboardEdit gèle aussi la rotation des panneaux pendant l'édition.
- scene/index.html et scene/styles.css — chargement du nouveau module et interface ergonomique du panneau gauche.

Le groupe accessory-sprites.js, les SVG Like/Subscribe, le chat, les images des douze postures, le bureau et les deux masques alpha du loft ont été préservés.

## Sauvegardes, contrôles et preuves

**Backup OVH avant travaux :** /home/ubuntu/boono-tv-studio/backups/OD-20261105-013/ (app.js, layout-editor.js, dialogue-editor.js, accessory-sprites.js, index.html, styles.css, studio-server.js, dialogue-script.json, projection-config.json).

**Tests Chromium sur OVH, zéro erreur JavaScript :**

- verify-OD-20261105-013-workshop-initial.js : atelier parenté à statePanel, 12 poses, 6 accessoires, 3 marques non autorisées verrouillées ; duration initiale 7 secondes pour Working et textes originaux toujours présents.
- verify-OD-20261105-013-timing-edit.js : posture de test 12 secondes, bulle visible 20–70 %, Like 25–55 %, tests aux 0/20/30/54/55/69/70/100 %, extinction aux bornes, posture Thinking indépendante ; aucun enregistrement du brouillon.
- verify-OD-20261105-013-runtime-timing.js : durée de 2 secondes **en mémoire seulement**, apparition temporisée de la bulle, de Like et de Subscribe ; transition automatique vers Thinking, sans modifier le document enregistré.
- verify-OD-20261105-013-storyboard-api.js : POST sans permission 403, logo interdit 400, fenêtre inversée 400, révision ancienne 409, enregistrement valide 200. Une modification temporaire de Surpris a été sauvegardée puis annulée par POST : **les douze scripts ont été rétablis sémantiquement à l'identique**, y compris les anciennes paroles, types et positions.
- verify-OD-20261105-013-regression.js : navigation des sections, 12 poses visualisées sans erreur, lecture de 2 secondes jusqu'à 100 %, lien depuis la calibration technique et reprise de la rotation normale État vivant → Graphiques à 12 secondes hors atelier.

Captures : OD-20261105-013-workshop-initial.jpg, unified-accessories.jpg, unified-timeline.jpg et workshop-interaction.jpg, sur OVH sous /home/ubuntu/boono-tv-studio/tests/.

**Santé contrôlée :** boono-studio.service actif ; routes atelier, scripts, API, studio HTTP 200 ; tunnel Penguin 8310 actif ; collecteurs MCB 3m/15m, bridge BOONO-TV et PAPER V494/V543 en ligne. Node --check valide pour les scripts modifiés. Calibration intacte.

## Limites et suivi

Le Mug est volontairement un pictogramme **provisoire**, non une illustration BOONO canonique. Like et Subscribe sont opérationnels. Les logos de marques resteront désactivés en attendant les droits et les véritables fichiers approuvés. L'éditeur a été testé dans Chromium sur OVH ; la fluidité et la lisibilité réelles du Chromebook restent à juger par le propriétaire compte tenu du précédent plantage de l'ancien mode de démonstration lourd.

**Aucune modification du trading, des frais, des données du marché, des collecteurs, de la calibration ou de la diffusion musicale n'a été effectuée.**
