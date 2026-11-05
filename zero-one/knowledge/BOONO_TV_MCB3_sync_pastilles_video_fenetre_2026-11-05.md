# BOONO-TV — MCB3 synchronisé, pastilles déportées et essai YouTube derrière la baie vitrée

**Date :** 5 novembre 2026
**Décision :** [OD-20261105-007](operational-decisions/OD-20261105-007/03-origine-et-justification.md)
**Statut :** rendu en service sur OVH ; essai YouTube limité à la prévisualisation activée explicitement, lecteur non lisible sur le Chromium OVH, repli sur image. Validation esthétique utilisateur ouverte.
**Isolation :** aucun changement à V494/V543 PAPER, aux collecteurs, aux ledgers, à la calibration géométrique ou aux illustrations.

## Origine du décalage MCB3

L'image utilisateur montre la courbe 03 · MarketCipher 3m de Watch à gauche et la vague MarketCipher B - 3min du bureau à droite, avec une succession de lobes visiblement différente.

La source Watch est la série native MCB3 BW/LBW/MF issue de mcb_3m.csv et mcb_3m_live.csv sur Amsterdam. Le widget TradingView TA qljTf3vu renvoie bien OKX:BTCUSDT.P en 3m et contient l'étude MarketCipher_B. Le désaccord portait sur la découpe fixe du JPEG (x770 à x1350), et non sur la seule étiquette « 3min » : une comparaison indicatrice de pixels bleus de la capture contre les valeurs BW du collecteur a trouvé une corrélation visuelle voisine de 0,98 sur six heures, mais avec un décalage temporel estimé d'environ 90 minutes. Ce délai reste une estimation issue des pixels, non un timestamp natif certifié. Des variantes de capture plus à droite ont réduit le décalage sans offrir une synchronisation fiable. La méthode TradingView setVisibleRange répond « Not implemented » dans le widget actuel.

**Décision de présentation :** le petit écran droit utilise désormais par défaut **la même série snapshot.series.mcb3 que la vue Vagues de gauche**. Le renderer commun BoonoCharts.drawWave affiche exactement le même intervalle glissant de six heures, les valeurs BW, LBW, MF et les points E3, actualisés depuis le bridge. La valeur data-source du canvas est MCB3_COLLECTOR_SHARED_WITH_WATCH, et son dernier timestamp a été comparé avec succès à la dernière bougie du panneau gauche. Le titre vectoriel reste MarketCipher B - 3min, avec une infobulle précisant « source collecteur Watch, pas JPEG direct TradingView ».

L'authentique JPEG TradingView est **conservé pour comparaison** sur URL avec ?mcbNative=1, sans toucher à son fichier source ni aux collecteurs. Il ne faut pas présenter ce mode JPEG décalé comme le référentiel Live.

## Dix pastilles du volume à droite de Conversion

L'ancienne génération de rectangles à l'intérieur du SVG Conversion est désactivée dans scene/tv-mini-conversion.js. Le calcul du niveau demeure fondé sur les dix seuils existants du volume total de trades agressifs OKX 3m (pas la liquidité du carnet).

Le composant indépendant deskConversionVolumeMeter, créé dans scene/index.html et mis à jour par scene/app.js, contient dix pastilles DOM, rouges pour les niveaux actifs, blanches sinon, bordures noires. La jauge est fixée à 1 px du bord droit de l'écran projeté ; le graphe s'arrête à 58 px du même bord et la jauge mesure 30 px, ce qui réserve une bande de séparation de 27 px dans les coordonnées locales de l'écran. Cette distance ne se mesure pas via la différence des rectangles englobants projetés en 3D ; le premier test automatisé utilisant cette ancienne méthode a donc échoué à tort, et le contrôle DOM en coordonnées locales ainsi que les captures Chromium servent de preuve.

## Essai de la vidéo YouTube dans la fenêtre

La peinture du loft corrigée par GIMP comporte de vraies zones de transparence dans les fenêtres : l'alpha de loft_GIMP_corrige_20261103_1200x1080.png a été contrôlé. Le paysage habituel landscape_city_1200x1080.png est un objet distinct. Aucun asset original n'a été modifié.

Le fichier scene/window-video-test.js permet d'ajouter dans BOONO-TV un iframe officiel YouTube derrière le loft, uniquement si l'adresse comporte youtubeWindow=1. L'iframe utilise la vidéo fournie BTB3F4vkUco, en autoplay muet, sans contrôles, et la peinture alpha conserve l'apparence des montants. Sans paramètre, le skyline ordinaire revient et aucun lecteur YouTube n'est chargé. Le mode youtubeWindow=poster affiche immédiatement la miniature officielle du clip pour évaluer l'esthétique sans lecture.

Métadonnées publiques oEmbed de la vidéo : « The House Party You Wish You Were At // Euphoric DJ MIX » par Enka Joy.

**Limitation vérifiée :** les lecteurs intégrés standard www.youtube.com et sans cookie www.youtube-nocookie.com retournent HTTP 200 mais affichent « This video is unavailable » dans Chromium sur OVH. La disponibilité de la vidéo en lecture intégrée sur Chromebook n'est pas prouvée : on ne peut attribuer avec certitude la cause à l'auteur, aux droits, à la géographie ou au navigateur. En mode essai, après 15 secondes sans lecture confirmée, un repli vers l'image publique i.ytimg.com/vi/BTB3F4vkUco/hqdefault.jpg remplace l'iframe indisponible, avec l'état poster-fallback. Cela constitue un **aperçu fixe**, pas un flux vidéo. Aucune copie ni redistribution du son ou de la vidéo n'est effectuée ; aucun droit de diffusion publique BOONO-TV n'est acquis.

## Sauvegardes et tests

- Sauvegarde Amsterdam : zero-one/boono-tv/backups/OD-20261105-007 (daemon et état de capture). Le daemon reste inchangé par cette intervention.
- Sauvegarde OVH : /home/ubuntu/boono-tv-studio/backups/OD-20261105-007 (app.js, index.html, tv-mini-conversion.js, boono-v2.css, boono-v2.js, styles.css et calibration).
- Code OVH actif : scene/app.js, index.html, tv-mini-conversion.js, boono-v2.css, et nouveau scene/window-video-test.js. Les trois fichiers JS modifiés passent node --check.
- Test verify-OD-20261105-007-collector-poster.js : source collecteur du petit canvas identique à la source Watch à gauche, dernier timestamp identique, six heures communes ; mode mcbNative accessible ; dix pastilles indépendantes ; mode poster activé sans iframe. Zéro erreur JavaScript. Captures OD-20261105-007-collector-wave.jpg, native-wave.jpg et poster-wave.jpg.
- Test verify-OD-20261105-007-video-meter.js : skyline normal en mode par défaut, aucun iframe ni demande YouTube ; mode explicite vidéo intégré derrière la fenêtre avec masquage du skyline. Le test d'écart visuel en coordonnées 3D a donné un faux négatif, remplacé par le contrôle local de 27 px ; aucune erreur JavaScript.
- Test verify-OD-20261105-007-video-fallback.js : après 16 s le statut devient poster-fallback, iframe display:none, image officielle visible et source muette. Captures OD-20261105-007-youtube-after-fallback.jpg.
- Le SHA256 de desk/projection-config.json est inchangé : 39922e2434c59e282d3ee64ff851c6b9def9c43a345d5c2f68cf56b87d112c2f. Le studio OVH et le tunnel Chromebook localhost 8310 répondent HTTP 200 ; services PAPER, collecteurs et bridge Amsterdam en ligne.

**Points ouverts :** jugement visuel des deux mini-écrans à la taille du Chromebook ; éventuelle autorisation de lecture intégrée de cette vidéo chez l'utilisateur ; recherche de partenaires musicaux et droits avant diffusion publique. Le code des trading bots n'a pas été touché.

**Git :** le dépôt Amsterdam est déjà modifié par d'autres chantiers ; le commit de cette opération doit se limiter aux documents de la Knowledge Base et à OD-20261105-007. Les modifications actives de la scène sont sur OVH avec sauvegardes.
