# BOONO-TV — Réglage indépendant des perspectives des deux animations BTC

**Date :** 19 novembre 2026 · **Décision :** OD-20261119-008 · **Suite :** OD-20261119-007.
**Portée :** régie OVH privée, interface du Composer → Scénarios → Accessoires.

## Besoin corrigé

L'utilisateur constate que la précédente intégration suit les deux écrans, mais souhaite **régler manuellement la perspective des panneaux vidéo comme celle des deux vrais écrans**. Ce besoin ne se réduit pas à une superposition automatique. Les deux sources BTC Circuit / BTC Digital bleu restent indépendamment sélectionnables par écran et par posture ; les fenêtres temporelles et l'activation sont conservées.

## Fonctionnement livré

- Dans les accessoires **Écran Conversion · animation BTC** et **Écran MarketCipher · animation BTC**, nouveau bouton **Régler les 4 coins**.
- Quatre poignées **HG, HD, BD, BG** et quadrilatère de couleur apparaissent dans le loft. Déplacer chaque coin modifie **l'homographie du panneau vidéo concerné**, sans modifier celle de l'écran physique.
- **Enregistrer perspective** sauvegarde les nouveaux coins. **Aligner sur écran** restaure le suivi exact de l'écran d'origine ; cliquer ensuite **Enregistrer perspective** pour conserver. **Fermer les poignées** abandonne les ajustements non enregistrés.
- Les perspectives sont **communes à toutes les postures pour chacun des deux panneaux** (comme une calibration de surface). Le choix de vidéo, l'activation et **Début / Fin** restent au contraire distincts dans les 12 scénarios du Composer. Le bouton général **Enregistrer** conserve ces scénarios, indépendamment du bouton **Enregistrer perspective**.
- Par défaut, en l'absence d'une perspective personnalisée, chaque panneau suit exactement le quadrilatère calibré de Conversion / MarketCipher. Les animations ne rejoignent **aucune rotation**.
- Les deux panneaux restent **en dessous de BOONO et de ses mains** et au-dessus des sources réelles Conversion/MC, qui continuent à être calculées et affichées lorsque l'accessoire s'éteint.

## Implémentation OVH

Racine : `/home/ubuntu/boono-tv-studio/runtime/boono-tv/`.

- `scene/desk-screen-accessories.js` : les deux panneaux vidéo sont maintenant **frères**, et non enfants, de `#deskScreenLeft`/`#deskScreenRight` au sein de `#deskProjectionEngine`. Ils héritent du déplacement et de l'échelle du bureau, mais possèdent deux matrices `matrix3d` indépendantes, calculées sur quatre coins. Le même module gère l'édition par poignées, le suivi du quadrilatère d'origine, l'aperçu et l'arrêt individuel des décodages.
- `scene/dialogue-editor.js` : commandes de perspective de chaque accessoire, avec défilement pour éviter le recouvrement par la barre d'actions fixe.
- `scene/styles.css` : panneaux homographiques `400 × 140`, pointeurs et quadrilatères éditables dans les coordonnées du loft.
- `scene/index.html` : références des scripts/feuille de style versionnées `OD20261119-008`.
- Nouveau `btc-desk-perspectives.js` : API **GET/POST privée** `/api/private/btc-panel-perspectives`, validation de polygones convexes, révisions SHA et écriture atomique ; accès contrôlé par la route locale et l'origine. Appelé uniquement depuis `studio-server.js`.
- Nouveau `desk/btc-accessory-perspective.json` : `{version:1,quads:{btcDeskLeft:null,btcDeskRight:null}}` à la livraison. `null` signifie **suivre l'écran existant**, une liste de quatre points signifie **perspective personnalisée**. Il est indépendant du fichier de calibration des vrais écrans.
- Les MP4 H.264 proviennent du répertoire privé `private-media/accessories/processed/` ; les fichiers originaux, les deux choix distincts de vidéo, la rotation des projections du loft et les quatre vidéos du Video Viewer ne changent pas.

## Préservation et sauvegardes

Sauvegardes des fichiers ciblés antérieurs à l'opération :
`/home/ubuntu/boono-tv-studio/backups/20261119-btc-quad-editor/` (serveur, anciens JS/CSS/index et les deux JSON utilisateur).

Aucun changement aux moteurs PAPER, au collecteur TradingView, aux données Amsterdam ou au code de rotation `projection-cycle.js`.

Empreintes des deux JSON existants **inchangées** après l'installation :
- `desk/projection-config.json` : SHA-256 `7aaa265ef47ea0c1243e3d42c929debf0d9f1ba42dd2e6d243ba785d7e9e38c4`.
- `desk/dialogue-script.json` : SHA-256 `e758a54c31beccf5a45e83f92af7cb843b199caebfeca257df86b6a9f0108c83`.

## Tests effectués

- Tests Node.js réussis, y compris `tests/boono-tv-desk-screen-accessories.test.js`, actualisé après sauvegarde de l'ancien test ; géométrie convexe, compatibilité des 12 scénarios, refus de source non autorisée, séparation des deux panneaux et absence de média privé dans la vue spectateur.
- API GET HTTP 200, source MP4 privée accessible, fichier de perspective initial disponible. POST invalide **422**, révision obsolète **409**, origine extérieure **403**. Les vidéos ne deviennent pas publiques.
- **Contrôle réel en Chrome headless/puppeteer sur OVH :** les deux surfaces vidéo alignées par défaut sur leurs vrais écrans au pixel près dans la scène 1920×1080 ; 4 poignées par panneau ; glisser-déposer du coin HG de gauche modifie la seule géométrie BTC ; changement de panneau, annulation et retour corrects.
- **Persistance de bout en bout vérifiée dans Chrome :** déplacer un coin → cliquer *Enregistrer perspective* → GET du serveur → recharger entièrement la page → retrouver les quatre points → cliquer *Aligner sur écran*, puis *Enregistrer perspective* → JSON revenu à deux valeurs `null`. Ce cycle n'a pas altéré les deux JSON utilisateur.
- Service `boono-studio` redémarré de façon ciblée, HTTP 200 et état `active` constatés.

**Statut :** implémenté, testé en navigateur automatisé et mis en service sur le studio **privé**. Le placement final artistique reste à régler par l'utilisateur dans son navigateur noVNC. Les droits de diffusion publique des animations Vecteezy ne sont pas confirmés.

## Reprise

Ouvrir `Ateliers → Scénarios → Accessoires`. Déplier l'un des deux accessoires d'écran, choisir l'animation, puis **Régler les 4 coins**. Manipuler les poignées dans le loft et cliquer **Enregistrer perspective**. Régler ensuite les fenêtres d'apparition par posture avec **Début / Fin**, puis cliquer le bouton général **Enregistrer**. Le deuxième panneau se règle indépendamment.
