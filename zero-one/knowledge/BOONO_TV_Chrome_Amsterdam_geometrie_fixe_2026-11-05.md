# BOONO-TV — Géométrie fixe de Chrome Amsterdam

**Date :** 5 novembre 2026
**Décision :** OD-20261105-010
**Statut :** changement du lancement Chrome et surveillance active, syntaxe vérifiée. Aucun redémarrage complet de Chrome ni des collecteurs ; comportement après un futur recycle réel à confirmer.

## Diagnostic avant correction

Le propriétaire observe que le MarketCipher B 3min du petit écran BOONO se décale après les redémarrages de Chrome Amsterdam et lors du zoom noVNC. Deux mécanismes se contredisaient :
- Le script zero-one/chrome-watchdog.sh, appelé aussi par chrome-recycle.sh, lançait Chrome avec --window-size=1920,1080.
- Le PM2 chrome-autoresize.js observait DISPLAY=:99 via xrandr toutes les 500 ms et envoyait Browser.setWindowBounds à chaque changement de résolution noVNC.

Les journaux du moniteur montrent des redimensionnements à 2049×1114, 1707×928, 1517×825 et enfin 1366×743. Au diagnostic, noVNC était à 1366×743 et Chrome à 1365×742 (écart X11 d'un pixel). Le contrôle CDP Browser.getWindowForTarget montre que les onglets TA TradingView qljTf3vu, collecteurs 3m/15m 2AqpEMfD et prévisualisations BOONO-TV partagent un même windowId : modifier cette fenêtre peut déclencher le reflow des collecteurs.

La capture native TradingView de l'écran de BOONO demeure un vrai MarketCipher_B sur OKX:BTCUSDT.P, TF3m, capturé toutes les 60 s par clip x770,y480,w580,h159. Il ne faut pas substituer notre rendu MCB3 maison, précédemment refusé.

## Correction effectuée

1. zero-one/chrome-watchdog.sh : le paramètre de lancement est désormais --window-size=1366,743. Ce choix correspond à la résolution noVNC stable mesurée, sans dépendre des zooms éphémères.
2. zero-one/chrome-autoresize.js : cible FIXED_BOUNDS de 1366×743, indépendante de xrandr. Contrôle CDP toutes les 15 secondes au lieu de 500 ms. Browser.setWindowBounds n'est exécuté que si la fenêtre réelle diverge au-delà d'un pixel ou si sa position/son état dérivent. Reprise automatiquement après recréation de Chrome. Réduction des reflows et du trafic de contrôle.
3. Ne modifie ni la configuration des onglets, ni la source JPEG, ni les collecteurs, ni les moteurs PAPER, ni la calibration de BOONO-TV.

Sauvegardes intégrales des deux fichiers précédents dans zero-one/boono-tv/backups/OD-20261105-010/.

## Tests et vérifications

- Bash syntaxe : bash -n chrome-watchdog.sh ; JavaScript : node --check chrome-autoresize.js. Tous valides.
- Seul le service PM2 chrome-autoresize a été redémarré. Les processus Chrome, collecteur-3m, collecteur-tab2, daemon boono-desk-capture, V494 PAPER et V543 PAPER sont conservés.
- Ligne de journal au lancement : Chrome locked at 1366x743, window=1754999014, corrected=false. La fenêtre était déjà à la bonne taille et n'a pas été redimensionnée pendant l'intervention.
- Mesure Chrome de la vraie page TA : outer 1365×742, inner/viewport 1365×655, devicePixelRatio 1, visualViewport.scale 1. Le clip capture 770..1350 en X et 480..639 en Y reste dans ce viewport.
- Capture read-only OKX BTCUSDT.P / 3m et deux heartbeats collecteurs récents. Moteurs PAPER online. Aucun changement des quatre images et deux masques de loft.
- Calibration OVH desk/projection-config.json inchangée : SHA-256 39922e2434c59e282d3ee64ff851c6b9def9c43a345d5c2f68cf56b87d112c2f.

## Limites

Le prochain démarrage ou recycle réel de Chrome devra confirmer la tenue du gabarit 1366×743 ; aucun redémarrage forcé du navigateur n'a été déclenché pour ne pas interrompre les collecteurs. Si une dérive temporelle de MarketCipher_B persiste, la capture fixe de l'indicateur devra être ancrée à la région DOM réelle de TradingView plutôt qu'au rectangle en pixels. La taille de Chrome est maintenant fixe même si noVNC change de résolution : sur un visualiseur plus petit, il faut zoomer le visualiseur noVNC et non la page Chrome TradingView, sinon la capture peut à nouveau changer d'échelle interne.

**Traçabilité :** OD-20261105-010 créé avant modification. Publication Git ciblée uniquement de la Knowledge Base et de la décision ; les scripts actifs sont modifiés sur Amsterdam avec sauvegardes.
