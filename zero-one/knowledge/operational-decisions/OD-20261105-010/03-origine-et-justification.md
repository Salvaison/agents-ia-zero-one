# OD-20261105-010 — Fenêtre Chrome Amsterdam de taille fixe

**Origine :** message du propriétaire BOONO-TV (5 novembre 2026) et capture jointe. Le mini écran MarketCipher B montre un décalage après recycle Chrome Amsterdam et zoom noVNC. Demande de figer la fenêtre Chrome Amsterdam à une taille proche de celle du navigateur utilisateur.

**Constats mesurés avant intervention :** xrandr DISPLAY=:99 rapportait **1366×743** sur VNC-0 ; Chrome, réellement rendu à 1365×742, avait été lancé avec le flag `--window-size=1920,1080`. Le script `chrome-autoresize.js` interrogeait xrandr toutes les **500ms** et envoyait Browser.setWindowBounds sur tous les changements. Son log confirmait des tailles variables jusqu'à 2049×1114 puis le retour à 1366×743. Tous les onglets Chrome TA/collecteur 3m/15m/BOONO-TV partagent un **même windowId CDP**, donc une simple opération de redimensionnement du navigateur concerne bien les collecteurs ; éviter toute perturbation en cours de trading et ne pas redémarrer le navigateur pour cette correction.

**Solution choisie :** fixer le *cadre Chrome* à 1366×743, taille de la session noVNC actuellement stabilisée, tant au démarrage qu'à l'auto-surveillance ; plus de suivi dynamique du zoom/résolution noVNC, ni de redimensionnement inutile. Conserver les onglets, les signaux et le mécanisme de capture authentique TradingView séparés. La correction future après un recycle sera contrôlée, mais ne pas déclencher un recycle non demandé avec interruption des collecteurs.

**Précision sur les masques :** il s'agit de quatre variantes PNG **alternées**, non de quatre couches toutes affichées simultanément. Le XCF maître garde les deux masques indépendants, aucun changement visuel ici.

**Traçabilité :** dossier créé avant modifications ; événements ultérieurs enregistrent implémentation/test/service réels.
