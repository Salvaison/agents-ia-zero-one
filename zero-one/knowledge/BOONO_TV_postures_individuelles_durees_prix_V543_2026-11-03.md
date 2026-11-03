# BOONO-TV — Variantes indépendantes, durées d'exposition et remplacement de l'ancien prix V4

**3 novembre 2026 — intervention exécutée sur Amsterdam + OVH, vérifications navigateur et API.**

Décision : [OD-20261103-005](operational-decisions/OD-20261103-005/03-origine-et-justification.md). Cette décision prolonge [OD-20261103-003](operational-decisions/OD-20261103-003/03-origine-et-justification.md) (éditeur spatial) et [OD-20261103-004](operational-decisions/OD-20261103-004/03-origine-et-justification.md) (tailles).

## Problème reproduit

Avant l'intervention, le pont de présentation `zero-one/boono-tv/bridge.js` lisait `zero-one/data/trade-sim-v4-state.json`, figé depuis le **26 octobre 2026**. L'API TV renvoyait `version=v4.10.10-hard-stream-gain-floor-20261021` et `market.price=80451.4`, alors que la série MCB 3m reçue sur cette même page était actuelle. La valeur de V4.10.10 ne représentait plus le marché courant ; une date `generatedAt` nouvelle ne prouvait pas sa fraîcheur.

La valeur déplaçable `#priceLiveTag` était simultanément bloquée dans le rendu V2 par la règle CSS `display:none!important` malgré les changements du calque. D'où l'impression de ne pas pouvoir déplacer ni agrandir le prix.

## Correction du prix : faits et garde-fous

**Amsterdam — pont en lecture seule** `/root/agents-ia-zero-one/zero-one/boono-tv/bridge.js` :

- Ajout de `normalizeV543Live()` ; `buildPayload()` utilise désormais cet adaptateur et non `normalize()` historique V4.10.10.
- Lit exclusivement `zero-one/data/v52-paper-state.json → latestAnalysis` (runner actuel **V5.4.3 PAPER**), avec les séries MCB natives indépendantes conservées. Vérifie `brokerOrdersEnabled === false`, préfixe `v5.4.3`, prix fini/positif, `asOf` et **âge maximal de 25 s** (tolérance d'horloge de 3 s). Lorsque le contrôle échoue, `market.price=null`, `fresh=false` : jamais de prix V4 ancien rebaptisé LIVE.
- Étiquette claire de source : `V543_PAPER_OKX_READ_ONLY`, `market.source=V543_PAPER_OKX`, `market.marketTimestamp=asOf`, `market.ageMs`, `market.fresh`. `generatedAt` demeure l'heure de publication du bridge, distincte de l'horodatage du marché.
- Les champs de l'état vivant sont redérivés à partir de l'analyse actuelle V543 quand elle est fraîche, ou déclarés `SOURCE_UNAVAILABLE`. Ne pas compléter par les valeurs obsolètes de V4. Les champs non disponibles sont nuls ; aucune décision ou position papier n'est fabriquée. Les fichiers historiques V4 demeurent inchangés.
- Service PM2 `boono-tv` seul redémarré (ID 12), runners V494 et V543 inchangés. Vérification : HTTP 200 `127.0.0.1:3090/api/snapshot`, version `v5.4.3-causal-offensive-maturity-paper-v1`, prix frais, `v4.10.10` absent de la réponse.

**OVH — scène :** `scene/app.js` et `scene/boono-v2.css` corrigés. L'étiquette `priceLiveTag` n'est visible que lorsqu'une observation fraîche ou une dernière clôture 3m récente est disponible, ou en mode éditeur ; sa position `left/top` et sa taille sont commandées par le JSON, sans propriété de masquage contradictoire. En absence de prix V543 frais, l'interface ne qualifie pas un ancien ticker de « LIVE ». Le panneau d'état actif (deuxième déclaration de `renderState` en fin de fichier) étiquette désormais le prix `V543 / OKX · N s` et utilise `—` si la valeur est nulle. Le graphique 3m conserve ses vrais OHLC.

## Variantes, géométrie et exposition individuelles

Les trois familles désormais sélectionnables dans l'éditeur :
- **BOONO : 12 poses** : `working, thinking, worried, concentrated, confident, observe, execute, dubitatif, surpris, inquiet, neutre, enthousiaste`.
- **Chat : 5 poses**, identifiées `1..5`, conservant les sprites et masques V2.
- **Bulles : 4 types** : `thought, exclamation, affirmation, announcement`.

L'éditeur propose pour chacune un sélecteur de variante et une exposition réglable de **2 à 300 secondes**, ainsi que une correction de position `dx/dy` et d'échelle `scale` propre à la variante. BOONO et le chat proposent aussi **« Toutes les postures (commun) »** pour les réglages globaux existants. Les quatre bulles conservent leurs positions historiques indépendantes `overlays.thought/affirmation/exclamation/announcement` ; leur taille et leur durée sont réglables individuellement.

- Fichier de configuration `desk/projection-config.json → sequences.{boono,cat,bubble}.{durations,poses}`; valeurs initiales : BOONO **10 s**, chat **180 s**, bulles **8 s**, facteurs de taille par pose = 1, `dx=dy=0`. Les positions et échelles déjà définies par l'utilisateur demeurent inchangées.
- `scene/app.js` : défilement BOONO avec `setTimeout` par variante ; cycle indépendant des quatre styles de bulles ; fonctions `window.BoonoTVShowcase.previewPose()/resume()` et `window.BoonoTVBubble.preview()/resume()`.
- `scene/boono-v2.js` : cycle indépendant du chat avec `setTimeout`, fonction `window.BoonoTVCat.preview()/resume()`. Les prévisualisations en mode édition immobilisent la famille sélectionnée afin de permettre un réglage stable ; les autres familles restent indépendantes.
- `scene/layout-editor.js` : sélecteur d'objet, de variante, de durée, déplacements et tailles globales/individuelles, bouton Enregistrer et Annuler. L'alignement des deux calques des postures debout est conservé (corps / mains).
- `studio-server.js` : stockage et validation des durées (entiers 2–300 s) et offsets (±700 px) / échelles (0,5 à 1,8) par variante, listes autorisées fixes, protection même origine + port privé. Les anciens onglets qui n'envoient pas `sequences` ne détruisent pas les nouvelles données. Restart par l'unité effective `systemctl --user restart boono-studio.service` exécutée sous `ubuntu`.

## Tests effectivement passés le 03/11

1. Dans Chromium headless OVH : affichage `V5.4.3`, prix frais `77 625,4` au moment du test, étiquette `LIVE V543` affichée, position **(441,291)** et taille **94 %** conservées ; l'éditeur et les trois sélecteurs sont chargés sans erreur JS.
2. Sélection BOONO `inquiet`, durée **22 s** en test et taille **120 %** : la pose `neutre` conserve sa taille individuelle initiale de 100 % ; corps et mains affichent une transformation identique.
3. Sélection chat n°3, durée **41 s** en test : chat n°1 conserve 180 s.
4. Bulle `affirmation`, durée **15 s** et taille **128 %** en test : pose et transformation reconnues.
5. Prix : réglage temporaire à **150 %**, puis glissement de la poignée de (+25,−30) ; style effectif `left:466px;top:261px`. Après Annuler, retour à (441,291), 94 %, valeurs d'origine et temps standards sauvegardés.
6. Cycle indépendant sans aucune écriture de valeurs de test dans le JSON : injection en mémoire navigateur de 2 s par variante, `resume()` des trois familles ; observation **WORKING→THINKING→WORRIED**, chat **1→2→3**, bulle **thought→exclamation→affirmation**, aux échéances attendues. Cela valide l'indépendance des trois compteurs.
7. API invalide : un POST avec durée `0` pour BOONO est rejeté **HTTP 400** `Invalid duration boono/working`. API valide : POST de la configuration d'origine retournant **HTTP 200** `ok:true`, sans déplacer les objets de l'utilisateur.
8. Test Chromebook : éditeur `http://127.0.0.1:8310/?layoutEdit=1&showcase=1&showcaseHold=1&showcaseStart=10&panel=state` répond **HTTP 200** via tunnel SSH. Studio OVH `127.0.0.1:3091` actif ; bridge Amsterdam `127.0.0.1:3090` actif.
9. État prix courant lors d'un second contrôle : prix V543 différent (par ex. `77 714`) et horodatage courant, prouvant la disparition de la valeur fixe `80 451,4` propre à V4.10.10. Les prix sont des observations ponctuelles, pas des prévisions.

## Sauvegardes, risques et reprise

- Avant modification OVH : `/home/ubuntu/boono-tv-studio/backups/boono-poses-prices-20261103/`, copies des CSS/JS, JSON d'éditeur, et serveur de studio. Sauvegarde pont Amsterdam : `/root/boono-tv-backups/bridge-pose-price-20261103/bridge.js` (SHA256 `8b88e64453b9dd6a44532390b1e621ebf76121d35d314798ba3ea36cc2e10715`). Ne restaurer que les chemins concernés, jamais `git reset --hard`.
- Toute restauration du bridge doit être suivie d'un redémarrage ciblé `pm2 restart boono-tv`; ne pas redémarrer les runners PAPER. Toute restauration de `studio-server.js` nécessite l'unité systemd utilisateur du studio, pas une unité système historique au nom identique.
- **Contrat de fraîcheur** : si le runner V543 ou le flux OKX ne fournit plus une analyse actuelle, le prix TV passe à `—` ou le graphe affiche une clôture 3m étiquetée, plutôt que de recycler V4. Le maintien d'un prix LIVE dépend des sources actuelles, pas du HTTP 200 seul.
- Anciennes données de décision et d'audit V4 non recopiées dans le nouveau pont. Les zones encore non documentées par les champs V543 sont affichées comme indisponibles. Une étude plus générale de la représentation des thèses V543 dans BOONO-TV demeure distincte du périmètre de ce changement.
- Le dépôt Git Amsterdam avait **déjà des modifications non attribuées à cette mission**, notamment dans `boono-tv/bridge.js`. Ne pas embarquer ces modifications dans un commit opportuniste. La Knowledge Base est versionnée et peut documenter le runtime effectivement testé sans prétendre que toutes les modifications du studio OVH sont des commits Git.

**Statut : implémenté, testé et mis en service sur les interfaces privées.** L'ajustement artistique et les durées définitives sont laissés au propriétaire.
