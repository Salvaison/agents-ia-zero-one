# BOONO-TV — Récupération de l'éditeur Composition (17 novembre 2026)

## Symptôme observé chez l'utilisateur
Dans l'atelier Composition, boutons et poignées ne répondent plus. Un curseur d'attente apparaît sur « Enregistrer ».

## Enquête
- OVH : boono-studio et boono-mobile-viewer actifs ; HTTP 200 et ressources serveur normales.
- Penguin : tunnel 8310 joignable ; GET /api/layout HTTP 200 en ~0,07 s ; POST volontairement invalide HTTP 400 en ~0,10 s, indiquant que la route répond sans toucher à la calibration.
- Le CSS donne `cursor:wait` à un bouton désactivé. Le JS désactivait Enregistrer pendant `fetch('/api/layout')` sans timeout : si la requête n'aboutit pas, le bouton pouvait rester bloqué. Il s'agit d'un mécanisme plausible, non d'une preuve de la cause du gel navigateur.
- Test de clics dans Chromium : bouton et poignée reçoivent les événements ; une poignée passe de (658,660) à (687,674) en mémoire locale et indique « Modifié ». Pas de POST de sauvegarde lors de ce test.

## Correctif
- OVH `runtime/boono-tv/scene/layout-editor.js` : AbortController + délai 12 s, message « réponse non confirmée », conservation du brouillon local et bouton toujours réactivé dans finally.
- Cache-busting du script `layout-editor.js?v=20261117-recovery01` dans `scene/index.html`.
- Backup : `/home/ubuntu/boono-tv-studio/backups/OD-20261117-COMPOSER-RECOVERY/layout-editor.js`; index précédent sauvegardé à `backups/OD-20261117-BOONO-TABS/index.html`.
- Test navigateur avec POST artificiellement suspendu : état pending puis récupération, 15 poignées, aucune exception JS. Le test n'a rien enregistré.
- Aucun changement de `projection-config.json`, moteurs PAPER, trading, ou service systemd.

## À vérifier
Rafraîchissement de l'éditeur sur Chromebook par l'utilisateur, après sauvegarde éventuelle des valeurs non enregistrées. Si l'interface entière reste figée, distinguer surcharge du navigateur, anciennes requêtes et interactions CSS du menu.
