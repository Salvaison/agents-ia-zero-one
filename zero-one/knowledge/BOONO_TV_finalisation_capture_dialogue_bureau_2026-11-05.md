# BOONO-TV — finition MCB, bureau et scénarios — 5 novembre 2026

**Décision :** OD-20261105-001 (voir operational-decisions/OD-20261105-001). **État :** correctifs techniques en service et tests Chromium exécutés ; acceptation esthétique finale et marques/musique toujours ouvertes. **Isolation :** aucun changement des runners PAPER, risques, collecteurs MCB ou ledgers.

## 1. Provenance authentique de la capture

Au contrôle initial, le daemon annonçait tf=3 et capturait toutes les 10 secondes, mais la vraie cible TradingView TA qljTf3vu était **BYBIT:BTCUSD.P en 4h (résolution 240)**. L'URL indiquait 15m OKX mais ne correspondait pas au graphique réellement chargé : l'image de BOONO-TV ne pouvait pas être reconnue comme MCB3. Les deux onglets collecteurs distincts sous 2AqpEMfD n'ont pas été touchés.

- L'onglet TA uniquement a été configuré en **OKX:BTCUSDT.P, résolution 3m**, directement via son widget TradingView ; les lectures CDP l'ont confirmé.
- Amsterdam boono-tv/desk/desk-capture-daemon.js : **une capture toutes les 60 s**, contrôle de taille de JPEG, publication de actualTf/actualSymbol distincts du timeframe demandé, preuve de sourceMatchesDefault et métadonnées de fraîcheur. Aucun changement dans les collecteurs.
- Amsterdam chrome-watchdog.sh : URL de création par défaut de l'onglet TA mise à jour vers OKX BTCUSDT.P 3m. **Limite :** chrome-watchdog PM2 était stopped au contrôle ; un redémarrage complet de Chrome suivi d'un retour à 3m n'a pas été éprouvé.
- Amsterdam boono-tv/bridge.js : lecture en observation seule du dernier événement MCB3 / BW_LBW_CROSS / OBSERVED, avec direction, timestamp interne et garde de fraîcheur de 3h. **À la demande expresse de l'utilisateur : aucun horaire et aucune date affichés.** Le studio affiche seulement « MCB3 / BW_LBW_CROSS OBSERVED », ou tiret si aucune preuve récente.

## 2. Bureau et graphiques

- Sur OVH, le titre SVG MarketCipher est légèrement remonté et sa taille réduite. Il indique le TF **réel** (3m, 15m, 1h ou 4h), jamais la valeur programmée supposée ; le visuel MCB est comprimé verticalement et centré sans déplacer les coins homographiques validés.
- Qualité SVG abaissée de quelques pixels, typographie réduite. Une ligne verte/rouge donne les **deux volumes BTC réellement achetés/vendus** de la fenêtre OKX 3 minutes (pas les chiffres d'exemple figés).
- Diagramme Conversion mini dézoomé légèrement ; zéro bleu épaissi à 3,25 SVG et corridor bleu accentué (opacité 0,39). Les **10 pastilles blanches/noires**, dont l'intensité dépend du volume exécuté total, sont déplacées dans la **marge droite**, vers le module central du bureau.
- Dans les trois graphes analytiques, les bandes des trades PAPER de V494 sont maintenant **en haut**, celles de V543 **en bas** ; chaque bande conserve ses 5 px bleu ciel et ses petites bornes. Rideau : aucun trade, points verts/rouges seulement.
- En tête du panneau Trades accomplis : « PAPER TRADING · VIABILITÉ ÉCONOMIQUE NON DÉMONTRÉE », notionnel de référence 1 500 $ par position, capital initial 1 000 $, risque de référence approximatif 1 % (10 $), **non garanti**. Dates et prix augmentés pour lecture.

## 3. Stop-motion : dialogues de 12 postures BOONO

Éditeur accessible via la prévisualisation locale OVH avec query **?showcase=1&showcaseHold=1&dialogueEdit=1** ou bouton « Scénarios / Bulles » dans le mode Calibration. Trois sous-menus/champs : posture parmi 12, type parmi les 4 bulles validées (thought, exclamation, affirmation, announcement), texte libre (220 caractères maximum). Boutons Voir, Enregistrer, Annuler, Quitter.

- Fichier distinct de la calibration utilisateur : OVH runtime/boono-tv/desk/dialogue-script.json. API privée GET/POST /api/dialogue-script, uniquement localhost, validant les 12 postures, types, taille de texte et origine/header. Sauvegarde atomique.
- Les associations personnalisées s'appliquent aux **scènes SHOWCASE et prévisualisations manuelles**, pas à l'interprétation ni aux décisions de trading. Les **cinq postures du chat** sont indépendantes et inchangées.
- Les paramètres de projection, de taille et de durée de chaque posture restent sous l'éditeur de calibration préexistant.

## 4. Accessoires et futurs contenus musicaux

Un groupe de sprites indépendant accessoire est préparé sur OVH via scene/accessory-sprites.js et assets/accessories/ : deux SVG originaux **Like/Subscribe** sont visibles en opt-in sur ?accessories=1. Trois emplacements Market Cipher, OKX et TradingView sont définis mais **inactifs**, en attente des logos officiels et des droits/positions de diffusion. Le bandeau « BOONO feats ... » et la visualisation audiowave de la vraie musique sont **reportés jusqu'à la recherche et l'autorisation de partenaires musicaux** ; aucune fausse prestation n'est annoncée.

## 5. Preuves, sauvegardes et état

- Sauvegarde Amsterdam avant opération sous zero-one/boono-tv/backups/OD-20261105-001 : bridge, daemon de capture, watchdog et capture-state. Sauvegarde OVH avant opération sous /home/ubuntu/boono-tv-studio/backups/OD-20261105-001 (scripts, CSS, HTML, studio-server, JSON homographique).
- SHA-256 du JSON de calibration OVH **inchangé** : 39922e2434c59e282d3ee64ff851c6b9def9c43a345d5c2f68cf56b87d112c2f.
- PM2 : les deux PAPER, les deux collecteurs, bridge TV et daemon de capture étaient ONLINE après intervention. Studio OVH redémarré par son vrai superviseur systemd --user, boono-studio.service, pour activer l'API de dialogues ; source TV et composants actifs, aucun runner redémarré.
- Tests Chrome : capture OKX:BTCUSDT.P / 3m / nextMs=60000, vraie source récente ; ligne MCB3 sans date/heure ; dix pastilles à droite ; volumes dynamiques, qualité, cube, corridor, source réelle 3m ; V494 top/V543 bottom ; avertissements PAPER et taille de référence ; **zéro erreur JavaScript**.
- Scénarios : POST sans header privé → HTTP 403 ; POST autorisé de configuration inchangée → HTTP 200 ; douze états valides. Un essai texte personnalisé sur SURPRIS a changé **l'aperçu sans changer la configuration enregistrée**.
- Accessoires : deux images SVG originales chargées et prévisualisables, slots de logos tiers en attente.
- Scripts, fichiers JSON et captures de test sous /home/ubuntu/boono-tv-studio/tests/verify-finalization-20261105.js et verify-dialogue-save-accessories-20261105.js et sorties correspondantes.
- Restent ouverts : test de redémarrage total Chromium/TA, revue esthétique des nouveaux affichages à leur échelle réelle, licence de republication des graphes et logos tiers, sélection des partenaires musicaux. Aucune garantie de performance économique n'est impliquée.

**Publication Git :** seules la Knowledge Base et l'archive de décision sont destinées à un commit ciblé. Code actif OVH/Amsterdam présent sur serveurs mais non englobé dans un commit automatique du dépôt largement modifié.
