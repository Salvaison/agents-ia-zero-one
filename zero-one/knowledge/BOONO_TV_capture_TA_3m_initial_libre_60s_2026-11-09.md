# BOONO-TV — Capture MarketCipher TA : TF3 seulement au redémarrage, libre ensuite

**Date du contrôle :** 9 novembre 2026, 14:34–14:42 UTC.  
**Décision :** [OD-20261109-001](operational-decisions/OD-20261109-001/03-origine-et-justification.md).  
**Statut :** implémenté et actif sur Amsterdam ; tests de logique et captures 60 s réussis ; **validation visuelle d'un changement manuel de timeframe encore à effectuer par le propriétaire**.

## Demande exacte et motivation

L'utilisateur demande que l'onglet TradingView d'analyse technique `qljTf3vu` reçoive **le TF 3 minutes une fois au redémarrage de Chrome**, puis reste entièrement libre : l'utilisateur peut choisir 15 min, 1 h, 4 h ou tout autre TF sans que BOONO-TV ne le ramène de force à 3m. La capture MarketCipher doit continuer toutes les **60 secondes** avec son cadrage existant.

**Cause prouvée :** le code effectif de `boono-tv/desk/desk-capture-daemon.js` avant correction appelait `w.setResolution('3')` lors de chaque cycle de capture si le TF réel différait de 3m. L'effet secondaire « retour forcé à 3m à chaque capture » était d'ailleurs expressément signalé dans `BOONO_TV_pastilles_rouges_MCB3_capture_2026-11-05.md` et son OD-20261105-004.

## Frontières techniques

- **Cible photographiée :** `qljTf3vu` / TradingView TA / MarketCipher B.
- **Collecteurs non concernés :** `2AqpEMfD`, correspondant aux flux MCB 3m/15m qui alimentent BOONOTRADE. Aucun changement au code décisionnel, runners PAPER V494/V543, configuration TradingView des collecteurs ou au studio OVH.
- **Capture :** `Page.captureScreenshot` du deuxième pane TradingView, clip calculé à partir du DOM MarketCipher. Cadrage actif observé `x=606, y=429, width=610, height=152`, pas de nouveau déplacement ou recadrage.
- **Cadence :** `NORMAL_MS = 60000` et `ROLLOVER_MS = 60000` maintenus. JPEG réel `assets/desk-live/marketcipher-live.jpg` et `state.json` restent produits.

## Changement limité déployé

1. Ajout d'un marqueur de démarrage par **ID de tab CDP** sous `/run/boono-tv-ta-tab-initialized.json` (hors Git, effacé après redémarrage de l'hôte). Le marqueur subsiste lors du seul redémarrage PM2 du daemon ; une **nouvelle** cible CDP signale un nouvel onglet Chrome à initialiser.
2. **Au premier cycle sur un nouvel onglet**, lire le TF et le symbole réel ; si nécessaire, initialiser `OKX:BTCUSDT.P` et `3m`, attendre leur mise à jour et vérifier. Marquer alors l'onglet comme initialisé.
3. **Cycles suivants de ce même onglet :** lire TF et symbole, cadrer le pane MarketCipher et prendre le JPEG ; **aucun appel** à `setResolution()` ni `setSymbol()` quel que soit le TF choisi manuellement. L'identité de l'onglet est la protection contre un reset involontaire.
4. Métadonnées désormais explicites : `startupDefaultTf:'3'`, `initializedNewTab`, `captureIsolation:'TA_ONLY_FREE_TF_AFTER_BOOT'`, `provenance:'TA_PANE_PASSIVE_AFTER_ONE_TIME_3M_BOOT'`, `requestedTf:null` en mode passif. `actualTf` est l'intervalle réel sélectionné et observé.

**Précaution de déploiement :** l'onglet TA déjà ouvert au moment de l'intervention a été marqué « initialisé » **avant** de relancer PM2. Cela évite que notre simple mise en service ne force le TF pendant que l'utilisateur consulte son graphique. À son prochain redémarrage de Chrome (nouveau target ID), le bootstrap 3m se produira une seule fois.

## Sauvegarde et reproductibilité

- Backup avant édition, enregistré sous `boono-tv/backups/OD-20261109-001/` : `desk-capture-daemon.before.js` SHA-256 `513c7b31c27a05750353f2f695c0ddbdd3d61913ac30c01b6b0b769d6a0eeecb`, `capture-state.before.json`, `TA-target-at-control.json`.
- Script actif après correction SHA-256 `fb06be70cf3b64e12b8661413231a4a52a0be46a52b3dd6698c3b05b30be51fd`.
- Diff isolé à appliquer sur **l'état du script actif avant intervention**, sauvegardé dans [patch réversible](patches/OD-20261109-001-ta-3m-once-then-passive.patch). Ce patch n'est pas directement applicable au vieux baseline Git, car ce fichier comptait déjà des modifications historiques **non commitées**. Ne pas reconstruire ou forcer une fusion des autres changements.
- Test de non-régression reproductible dans `tests/boono-tv-ta-capture-tf-freedom-2026-11-09.js` (simule un protocole CDP et des snapshots JPEG sans écrire dans Chrome réel).

## Tests exécutés

**Test isolé avant la mise en service (PASS) :**
- Onglet déjà initialisé et TF15 choisi : capture TF15 **sans commande** `setResolution`.
- Nouvel ID de tab avec TF15 sauvegardé : initialisation en TF3 **une seule fois**.
- Après cette initialisation, changement manuel simulé vers 1h : capture TF1h sans nouveau `setResolution`.
- Trois captures simulées ; exactement **un appel setResolution**, aucun appel setSymbol (symbole de référence déjà correct) ; clipping identique.

**Contrôles effectifs sur Amsterdam :**
- `node --check` réussi. Seul `pm2 restart boono-desk-capture` a été exécuté : PM2 ID 13, nouveau PID `3943085`, statut online. Les deux collecteurs `collecteur-3m`, `collecteur-tab2`, les deux runners PAPER et BOONO-TV sont restés online et non redémarrés.
- Immédiatement après le redémarrage, premier JPEG réel à `2026-11-09T14:40:32.354Z`, puis nouveau JPEG réel à `2026-11-09T14:41:32.251Z`, soit ~59,9 s plus tard.
- `ok=true`, `actualTf='3'` (l'utilisateur ne l'avait pas encore modifié), `initializedNewTab=false`, `correctedTo3m=false`, `nextMs=60000`, clip `606×429 / 610×152`, `error=null`. Image HTTP 200 depuis le bridge Amsterdam.
- Contrôle supplémentaire OVH à `2026-11-09T14:42:32.246Z` : l'API de prévisualisation retourne la nouvelle métadonnée `captureIsolation='TA_ONLY_FREE_TF_AFTER_BOOT'`, TF3 réel et cadrage inchangé ; le JPEG (21 025 octets) répond HTTP **200**, service studio actif. Trois captures successives à cadence d'environ une minute sont ainsi observées.
- Tests n'impliquant pas de changement forcé de TF sur l'onglet réel **dans la session en cours** ; les passages à 15m puis 1h ont été éprouvés par simulation CDP, et devront être confirmés par observation humaine.

## Validation à faire sur le navigateur utilisateur

Dans l'onglet TradingView TA `qljTf3vu`, sélectionner 15m ou 1h ; observer qu'au prochain JPEG (60 s) il **ne revient pas en 3m** et que la capture BOONO-TV reflète le TF réellement affiché. Lors du prochain redémarrage **naturel** de Chrome, confirmer le passage initial à 3m une fois et la liberté retrouvée après.

**Retour arrière si nécessaire :** restaurer `desk-capture-daemon.before.js` sur son chemin actif puis redémarrer uniquement `boono-desk-capture`. Ce rollback rétablirait le retour forcé historique à TF3 toutes les 60 s ; ne l'utiliser que pour un problème sérieux, et jamais sur les moteurs PAPER.

**Statuts de gouvernance :** demande et autorisation enregistrées avant modification ; implémentation et tests constatés ; service actif confirmé ; validation manuelle ouverte. Git déjà sale : les autres modifications d'Amsterdam ne doivent pas être englobées dans ce commit.
