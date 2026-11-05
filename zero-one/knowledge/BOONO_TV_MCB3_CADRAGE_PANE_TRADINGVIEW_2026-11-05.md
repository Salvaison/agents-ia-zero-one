# BOONO-TV — Correctif du cadrage du véritable MarketCipher B

**Date :** 5 novembre 2026
**Décision :** OD-20261105-011
**État :** implémenté, testé dans Chromium et en service. Validation finale par l’utilisateur sur Chromebook encore ouverte.

## Cause exacte confirmée

Le problème subsistait après OD-20261105-010 parce que **la résolution de Chrome était stabilisée, mais la découpe de la capture n'était pas alignée sur le panneau de l'indicateur**.

Diagnostic en lecture seule par Chrome DevTools Protocol sur l’onglet TA TradingView \`qljTf3vu\` : marché OKX:BTCUSDT.P et timeframe réel 3m ; les deux éléments \`canvas[data-name="pane-canvas"]\` étaient respectivement la zone de prix (x56, y42, 1192×361) et le **panneau MarketCipher B** (x56, y404, 1192×184).

Ancien clip du daemon : **x770, y480, 580×159**. Il commençait 76 px après le haut du vrai panneau, supprimait les sommets bleus et descendait jusqu’à y639, au-delà du bas du panneau y588, dans la zone de l’axe du temps. Ce n’était pas une erreur de timeframe ni un défaut géométrique de la projection validée.

## Correction de source

Fichier actif Amsterdam : \`zero-one/boono-tv/desk/desk-capture-daemon.js\`.

Le clip fixe a été supprimé. À chaque cycle de 60 secondes, le daemon vérifie toujours que le symbole est OKX:BTCUSDT.P, résolution 3m, et ajoute maintenant :
- vérification de l’étude native \`MarketCipher_B\` dans les études de l’onglet TA ;
- lecture de la position actuelle du **deuxième canvas de panneau TradingView**, sans interroger ni modifier les collecteurs (onglets 2AqpEMfD séparés) ;
- calcul d’une découpe ancrée à droite sur une portion récente d’environ 610 pixels, avec 25 px de marge en haut du panneau et 7 px en bas ; limites et dimensions vérifiées avant capture ;
- refus explicite de publier un nouveau JPEG si la structure ou la géométrie du panneau n’est plus fiable (source périmée alors signalée), plutôt qu’un recadrage faux ;
- publication du vrai rectangle calculé et des bounds du panneau sous \`clip\`, \`pane\`, \`viewport\`, \`clipMode=MARKETCIPHER_B_PANE_DOM_ANCHORED\`.

Premier cycle après mise en service : source OKX BTCUSDT.P 3m, panneau **x56, y404, 1192×184**, clip dynamique **x606, y429, 610×152**, JPEG de 19 660 octets. Le haut et le bas de la vague sont intégralement conservés dans ce cadre. On ne reconstruit aucune donnée ni ne modifie l’étude TradingView.

## Correction du rendu OVH

Fichier actif OVH : \`scene/boono-v2.css\`. Seule l’incrustation native \`#deskMcLive\` a été ajustée de 400×110 à **400×100**, placée à **top=21px**. Le ratio 610/152≈4,01 correspond à la projection 400/100=4 ; la vague n’est plus disproportionnée. Les quatre coins du bureau, le texte vectoriel et toutes les couches de loft restent inchangés.

## Sauvegardes et preuves

- Amsterdam avant modification : \`zero-one/boono-tv/backups/OD-20261105-011/desk-capture-daemon.js\`, avec l’état de capture précédent.
- OVH avant modification : \`/home/ubuntu/boono-tv-studio/backups/OD-20261105-011/boono-v2.css\` et \`projection-config.json\`.
- Source CDP avant correction : \`/tmp/boono-TA-source-full-current-20261105.jpg\` et \`boono-TA-source-layout-current-20261105.json\`, lisibilité des deux panneaux confirmée. Trois découpes comparatives hors service montrent le nouveau cadrage complet.
- Javascript \`node --check\` valide. Seul le service \`boono-desk-capture\` a été redémarré ; PIDs des collecteurs et PAPER V494/V543 inchangés.
- Script Chromium \`/home/ubuntu/boono-tv-studio/tests/verify-OD-20261105-011-centered-native.js\` + résultat JSON, captures \`OD-20261105-011-centered-full.jpg\` et \`centered-desk.jpg\` : vrai JPEG TradingView visible par défaut, MCB3 maison masqué, titre \`MarketCipher B - 3min\`, source OKX 3m fraîche, image 610×152 projetée 400×100, clip dans le panneau avec marges 25px haut, 7px bas, zéro erreur JavaScript.
- Calibration OVH SHA-256 strictement inchangé : \`39922e2434c59e282d3ee64ff851c6b9def9c43a345d5c2f68cf56b87d112c2f\`.

**Limite explicite :** le clip suit maintenant les limites du panneau, pas le temps de la dernière bougie TradingView. Il s’agit d’un JPEG natif actualisé une fois par minute et non d’un flux tick-live. Si TradingView crée un troisième panneau ou cache l’indicateur, le daemon refuse la capture plutôt que d’inventer une correspondance. L'utilisateur doit confirmer le résultat esthétique sur son Chromebook.
