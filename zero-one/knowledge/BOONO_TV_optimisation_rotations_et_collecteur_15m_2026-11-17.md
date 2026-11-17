# BOONO Systems — Optimisation des rotations TV et enquête mémoire TradingView 15m

**17 novembre 2026, soirée (Europe/Stockholm).**  
**Décision :** [OD-20261117-001](operational-decisions/OD-20261117-001/03-origine-et-justification.md).  
**Périmètre :** studio BOONO-TV OVH, collecteur TradingView 15m Amsterdam en lecture seule et partition Linux Penguin.  
**Statut :** optimisation des redessins **mise en service et testée** sur le studio privé ; confirmation perceptuelle du propriétaire sur Chromebook **encore ouverte**. Collecteur 15m **enquête réalisée, aucun changement ni redémarrage**. Penguin accessible, espace mesuré ; aucun nettoyage.

## 1. Rappel des faits et autorisation

L'audit hebdomadaire du 17 novembre avait mesuré environ **89 appels `drawPrice` et 178 appels `drawWave` sur 49 secondes** dans l'ensemble du rendu. Il avait observé un onglet TradingView consommant jusqu'à **866 MiB de heap JavaScript**, sans attribuer de cause. L'utilisateur demande explicitement de résoudre les redessins inutiles, accepte l'enquête mémoire et reconnecte Penguin via Desktop Commander 0.3.3.

La demande autorise un correctif visuel ciblé et une enquête mémoire ; elle n'autorise pas implicitement de changer les collecteurs de données ou les autorités de trading. Le registre OD contient la demande et la consigne technique avant implémentation.

## 2. BOONO-TV : inefficacité constatée

**Code réellement exécuté :** `/home/ubuntu/boono-tv-studio/runtime/boono-tv/scene/chart-views.js`.

- La minuterie de rotation utilise `state=25000`, `charts=15000`, `trades=5000` ms, cycle 45 s.
- Avant la correction, `onSnapshot(s)` appelait `drawTrio(s)` et `drawCompletedTrades(s)` même quand ces panneaux étaient masqués. Les prix et vagues du loft sont des couches distinctes, pilotées par `scene/app.js`.
- `setView(view)` savait déjà redessiner le dernier `lastSnapshot` à l'activation des vues.
- La branche de fallback `refreshMarkers` redessinait également le trio même hors de la vue active.

**Changement appliqué et limité :**

1. `onSnapshot(s)` conserve le dernier snapshot et les événements, mais exécute `drawTrio(s)` **seulement si `active==='charts'`**, ou `drawCompletedTrades(s)` **seulement si `active==='trades'`**.
2. Les événements `refreshMarkers` restent disponibles en mémoire ; le trio n'est rafraîchi sur cet événement que si Graphiques est actif. La mise à jour des vagues flottantes du loft est conservée.
3. `scene/index.html` référence désormais `chart-views.js?v=OD20261117-001` pour éviter un vieux cache navigateur. Aucun changement à `scene/app.js`, aux scènes/masques, aux graphes du bureau, aux sources WebSocket, aux moteurs PAPER ou au tarif de trading.
4. La copie versionnée `zero-one/boono-tv/scene/chart-views.js` dans Git a été modifiée **de façon strictement identique** à l'original OVH : SHA-256 des deux copies `2bc6a2fd48036677666c41b0149195bf754594b094051968496730cb86b64684`.

**Sauvegarde / retour arrière :** `/home/ubuntu/boono-tv-studio/backups/OD-20261117-001/chart-views.js.before` (SHA-256 `b8477c3b57bab13a989a527289e9d8272e505e41ace6497abe478d8780b1509d`) et `index.html.before`. Si besoin, restaurer ces deux fichiers et vérifier la page ; les services Node peuvent rester en fonctionnement, le changement se trouve dans les assets statiques.

## 3. Tests comparatifs avant/après en navigateur

Deux exécutions Puppeteer/Chromium headless sur OVH, de 49 s chacune, d'abord **sans vidéo**, puis **avec Clemens Costa Canvas 8 ips**. Les mêmes durées de rotation et les mêmes endpoints locaux ont été utilisés ; il ne s'agit pas de benchmarks de ChromeOS.

| Métrique, ~49 s | Avant normal | Après normal | Avant vidéo | Après vidéo |
|---|---:|---:|---:|---:|
| `onSnapshot` | 12 | 11 | 12 | 12 |
| `drawPrice` total scène | 89 | 77 | 88 | 79 |
| `drawWave` total scène | 178 | 154 | 176 | 158 |
| TaskDuration cumulée | 2,123 s | 1,967 s | 4,715 s | 4,708 s |
| Erreurs JS | 0 | 0 | 0 | 0 |

Réduction d'appels de dessin de **~13,5 % sans vidéo**, **~10,2 % avec vidéo**. Le coût CPU mesuré baisse modestement sans vidéo (~7,3 %) ; **en vidéo, pas de baisse significative** (~0,2 %) dans cet essai, ce qui confirme que le coût du lecteur/canvas reste prépondérant. Les `drawPriceMs` et `drawWaveMs` ponctuels varient avec les images et l'état du cache ; ne pas leur attribuer une garantie d'amélioration.

Rotations contrôlées après modification : sans vidéo **24,789 / 15,006 / 5,000 s** et avec vidéo **24,819 / 15,007 / 5,001 s**, sans erreur. La vidéo est restée en lecture, `canvasFrames=365` à la fin de la fenêtre vidéo, `canvasDrawErrors=0`, premier sprite prêt.

**Test fonctionnel ciblé**, fichier OVH `tests/verify-OD-20261117-001-render-only-visible.js` :
- `panel=state` et snapshot : **0** nouvel appel de dessin prix/vague du trio ;
- passage à `charts` : **1** nouvel appel prix + **2** vagues, avec dernier snapshot ;
- passage à `trades` : liste de trades reconstruite ;
- `panel=charts` et snapshot : **1** prix + **2** vagues ;
- `panel=trades` et snapshot : **0** prix/vague ;
- aucune erreur navigateur. Résultat **PASS**.
- Fichiers de preuve OVH : `tests/OD-20261117-001-rotation-before.json`, `OD-20261117-001-rotation-after.json`, `OD-20261117-001-render-only-visible-result.txt`.

Code JS validé par `node --check`, studio systemd utilisateur **active**, endpoint `/api/snapshot` HTTP 200. Passage complet SSH Amsterdam → OVH → Penguin confirmé : Penguin reçoit l'HTML avec le nouveau cache-buster et le nouveau JS.

**Limite :** les redessins de la **scène flottante** (`renderMarketCurtain`, `renderDeskProjection`) restent actifs pour les messages Live ; ne pas les couper aveuglément au risque de figer les courbes/indicateurs sur le loft. Une optimisation supplémentaire devra comparer l'effort 1 Hz des graphes flottants, la vidéo Canvas et la fraîcheur ressentie sur Chromebook.

## 4. TradingView 15m : enquête causale du collecteur, sans intervention

**Code réellement chargé :** `zero-one/modules/tab2-collector.js`, processus PM2 `collecteur-tab2` (Node ~18 MiB heap seulement) ; **ne pas confondre avec le très gros heap de son onglet Chrome**.

`tab2-collector` réutilise l'onglet Chrome `/chart/2AqpEMfD/?interval=15` pour collecter le 15m et récupérer les clôtures d'horizons supérieurs (notamment 1h, et potentiellement 4h/Daily/Weekly). `switchToTf` appelle `navigateToTf`, lequel déclenche **`Page.navigate`** vers la même page TradingView mais avec un autre `interval`. Cela recharge la page complète plutôt que de basculer seulement la résolution d'un widget déjà chargé.

**Observations en lecture seule au moyen de Chrome DevTools Protocol / `Runtime.evaluate` et `Memory.getDOMCounters` :**

| Onglet | TF | JS heap initial soirée | Docs DOM |
|---|---:|---:|---:|
| TA `qljTf3vu` | 3m | 108 MiB | 2 |
| Collecteur `2AqpEMfD` | 3m | 81 MiB | 2 |
| Collecteur `2AqpEMfD` | 15m | 329 MiB | **11** |

Un suivi de 4 mesures espacées de ~18 s a observé, sur l'onglet 15m, `usedJSHeapMiB` ~329 → 329 → 314 → 315, 11 documents DOM, ~27 000 à 31 600 nœuds et 8 817 écouteurs. **Cette courte fenêtre n'est pas une croissance monotone prouvée.**

Les journaux du même collecteur indiquent le 17/11 vers 19:00 UTC :
- `15m → 1h` pour rattraper une clôture horaire ;
- `1h → 15m` pour revenir au cycle principal.
- Juste après cette séquence, en conservant le même ID d'onglet CDP, les compteurs passent à **13 documents DOM**, **9 893 écouteurs**, **~32 377 nœuds** et **380 MiB** de heap JavaScript.
- Cette hausse coïncidant avec deux navigations s'ajoute à l'observation de l'après-midi (866 MiB sur un onglet 15m plus ancien, avant le redémarrage Chrome).

**Conclusion probatoire :** forte association entre les rechargements `Page.navigate` du collecteur multi-timeframe et une augmentation des ressources retenues dans Chrome. Cela **ne prouve pas** à lui seul une fuite permanente : une collecte différée et le garbage collector peuvent parfois les libérer, et le changement de contenu TV lui-même coûte de la mémoire. Ce comportement mérite un test isolé avant modification.

**Solution candidate NON IMPLÉMENTÉE :** comparer en environnement de test isolé une bascule `TradingViewApi._activeChartWidgetWV.value().setResolution(...)` avec le `Page.navigate` actuel. Vérifier (a) les preuves MCB des 400 bougies, Live/confirmé, timing E15/E3 et TF, (b) la mémoire et la taille DOM sur cycles répétés, (c) la récupération des clôtures 1h/4h et (d) les erreurs et backfills avant tout remplacement. Ne pas changer le collecteur actif, ne pas déclencher de garbage collection forcée, et ne pas lancer de recyclage du navigateur ou d'onglet pendant ce diagnostic.

Une autre option à évaluer en cas de vrai problème mémoire à long terme : recyclage contrôlé du navigateur dans une fenêtre prévue, avec disponibilité des fichiers collectés, fermeture/reprise des collecteurs, vérification du dernier confirmé et rollback. **Aucun seuil ni recyclage automatique n'est validé par cette étude.**

**Outil de contrôle reproductible, lecture seule :** `zero-one/tests/boono-tv-collector-memory-audit-20261117.js` (4 séries à 18 s d'intervalle, trois onglets ; n'utilise ni `Page.navigate`, ni `HeapProfiler.collectGarbage`). Il imprime les résumés, sans secrets ou contenus de page.

## 5. Penguin reconnecté, partition mesurée

Agent Desktop Commander Penguin 0.3.3 en ligne, tunnels 8310/6080 actifs, HTTP depuis Penguin vers le studio OVH OK.

- Partition Linux Btrfs `/dev/vdb` **4,0 Go, 2,9 Go utilisés (80 %), 752 Mo libres**. Ce n'est pas une saturation effective, mais marge limitée. Le 05/11 elle était à 77 % avec 853 Mo libres.
- `~/.npm` ~292 Mo dont `_npx` ~273 Mo, `~/.local` ~187 Mo, `~/.cache` ~2,3 Mo. L'agent Desktop Commander actuellement en service est lancé **depuis un répertoire `~/.npm/_npx`** ; supprimer cet arbre à l'aveugle risquerait d'interrompre l'accès.
- Une moyenne de charge Linux affichée ~40 alors que `ps` montre des processus presque inactifs et la pression CPU/mémoire PSI faible ; le load de la VM ChromeOS ne suffit pas à conclure à une saturation CPU réelle.
- Aucun paquet désinstallé, répertoire supprimé ni changement de partition.

## 6. Bilan et suites

| Objet | Résultat | Prochaine étape |
|---|---|---|
| Rotations BOONO-TV et panneaux masqués | Correctif ciblé actif, baisse des dessins mesurée, tests PASS | Vérifier la fluidité réelle sur Chromebook, y compris en lecture vidéo |
| Scène/loft et vidéo | Aucun changement structurel, vidéo test fonctionnelle | Optimiser ensuite le rendu flottant à 1 Hz seulement après tests comparatifs |
| TradingView collecteur 15m | Mécanisme `Page.navigate` identifié ; augmentation DOM/heap observée après changement TF | Test séparé A/B navigation vs `setResolution`, à valider avant promotion |
| Penguin | Accès restauré, 80 % de partition utilisée | Préserver `_npx`, envisager extension de partition seulement après mesure des fichiers et de ChromeOS |
| PM2 / PAPER | Collecteurs et moteurs laissés en service sans modification | Suivi de fraîcheur et stabilité ; ne pas intervenir sur l'exécution pendant l'analyse |

**Traçabilité :** sauvegardes OVH dans `backups/OD-20261117-001/`; fichiers de test sous `tests/` OVH ; code `zero-one/boono-tv/scene/chart-views.js` versionné, aligné au SHA-256 du runtime OVH ; décision opérationnelle `OD-20261117-001` avec états horodatés. Le dépôt Amsterdam contenait des fichiers modifiés et un autre fichier de recherche déjà staged ; tous ces autres chemins doivent rester intacts.
