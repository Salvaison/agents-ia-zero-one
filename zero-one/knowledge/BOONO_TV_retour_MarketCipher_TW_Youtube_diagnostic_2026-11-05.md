# BOONO-TV — Vrai MarketCipher B TradingView et diagnostic YouTube

**Date :** 5 novembre 2026
**Décision :** OD-20261105-008
**Statut :** correction visuelle en service sur OVH, contrôlée dans Chromium. YouTube : lecture intégrée non confirmée dans Chromium automatisé sur OVH.
**Isolation :** aucun changement aux moteurs PAPER V494/V543, collecteurs, calibration ou fichiers du loft.

## Correction d'une substitution non autorisée

Dans OD-20261105-007, le rendu maison du MCB3 de Watch avait remplacé sur l'écran droit de BOONO la capture authentique de l'étude MarketCipher B de TradingView. Le propriétaire a explicitement demandé de revenir au vrai indicateur TradingView.

Le studio possède toujours :
- l'image **#deskMcLive** (vraie capture de la cible TA TradingView qljTf3vu, OKX:BTCUSDT.P en résolution 3 minutes, JPEG toutes les 60 secondes) ;
- le canvas maison **#deskMcCollectorCanvas** (BW/LBW/MF calculé pour Watch), qui n'est pas la même représentation que la vraie étude TradingView.

Le code OVH scène/app.js a été corrigé : **la capture TradingView est maintenant la source par défaut** de l'écran droit ; le mode de comparaison maison est seulement disponible si l'URL porte le paramètre **mcbCollector=1**. Le commentaire associé de scène/boono-v2.css explicite cette frontière. Le mode natif reçoit directement les mises à jour du JPEG d'Amsterdam ; le vieux mode **mcbNative=1** n'est plus nécessaire pour le voir.

**Preuve Chromium :** source native OKX:BTCUSDT.P, vraie résolution 3 minutes, image naturelle 580×159, visible par défaut ; le canvas maison reste masqué. En mode comparaison mcbCollector=1, l'inverse est observé. Zéro exception JavaScript. Script et résultat : tests/verify-OD-20261105-008-native-and-youtube.js, tests/verify-OD-20261105-008-native-and-youtube-result.json ; captures OD-20261105-008-normal.jpg et comparison.jpg.

La vraie capture peut représenter un intervalle temporel différent de celui de Watch, car le cadrage JPEG TradingView reste positionné dans son viewport TA. Il serait incorrect de prétendre avoir rendu la capture tick-LIVE ou synchronisé sa portion temporelle. Ceci constitue un chantier de cadrage séparé ; aucune fausse correspondance ne doit être rétablie par substitution de données.

## Ce qui bloque YouTube sur OVH

Le mode d'essai vidéo derrière la baie vitrée repose sur un iframe officiel YouTube, chargé seulement si youtubeWindow=1. Le lecteur de la vidéo BTB3F4vkUco affiche **This video is unavailable** sur Chromium automatisé OVH malgré HTTP 200. Cela ne donne pas un code explicite permettant de démontrer une restriction propre à la vidéo.

Un diagnostic supplémentaire a testé, dans **le même Chromium OVH, avec le même iframe et référent**, la vidéo utilisateur et deux contrôles :
- BTB3F4vkUco : message « This video is unavailable » ; statut de lecture détaillé non obtenu.
- M7lc1UVf-VE, vidéo exemple du développeur de l'API YouTube : réponse de youtubei/v1/player **LOGIN_REQUIRED**, motif **Sign in to confirm you’re not a bot**.
- jNQXAC9IVRw, vidéo de contrôle : même statut LOGIN_REQUIRED et même motif.

Les requêtes de l'iframe comportent déjà l'en-tête HTTP **Referer: http://127.0.0.1:3091/**. La disparition complète de cet en-tête n'est donc pas un diagnostic valide dans notre cas. Selon la documentation officielle YouTube, erreur 101/150 désigne le refus de l'auteur d'autoriser l'embed ; erreur 153 l'absence d'identification Referer ou équivalent ; les tests du navigateur OVH pointent en premier vers un blocage **antibot/connexion requise**, même sur les vidéos de contrôle, et ne permettent pas d'affirmer que le titre utilisateur est intégrable.

**Important :** quand un utilisateur ouvre BOONO-TV par le tunnel du Chromebook, l'iframe YouTube s'exécute normalement dans son navigateur **Chromebook**, pas dans le processus du serveur OVH. Son Chrome normal peut donc se comporter autrement que le Chromium automatisé utilisé pour les captures/tests sur OVH. Pour une lecture automatisée sur un VPS public, la vérification humaine/antibot, les règles d'embed de l'auteur et la politique de lecture du navigateur doivent être compatibles ; aucun contournement n'a été tenté.

La vidéo test reste **strictement opt-in**, avec miniaturisation officielle de repli si la lecture ne démarre pas dans le navigateur de prévisualisation. Le mode youtubeWindow=poster montre seulement son image fixe. Le skyline est normal sans paramètre. Pour une BOONO-TV publique avec musique régulière, préférer un fichier/flux **explicitement licencié par les partenaires musicaux** plutôt que dépendre d'une vidéo YouTube non autorisée pour rebroadcast.

## Loft alpha, sauvegarde et limites

L'utilisateur a annoncé qu'il reprendra lui-même l'alpha du loft. Aucun masque, image validée, fichier GIMP ni géométrie de bureau n'ont été modifiés. La superposition vidéo suit toujours les zones alpha existantes.

Sauvegardes OVH : /home/ubuntu/boono-tv-studio/backups/OD-20261105-008/ pour app.js, boono-v2.css et projection-config.json.
SHA-256 de projection-config.json inchangé : 39922e2434c59e282d3ee64ff851c6b9def9c43a345d5c2f68cf56b87d112c2f.
Sources PAPER, collecteurs et daemon de capture inchangés. Tests Node syntaxe et HTTP studio en réussite.

**Reste ouvert :** essai réel d'intégration YouTube sur le navigateur ChromeOS du propriétaire, éventuelle vérification d'autorisation d'embed de la vidéo, et correction ultérieure du cadrage temporel natif TradingView. La correction actuelle restaure avant tout la **bonne identité de l'indicateur**.
