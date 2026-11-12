# BOONO-TV — Nouvel État vivant en quatre chapitres

**Date :** 11 novembre 2026 · **Déploiement :** Amsterdam (pont de données) + OVH (studio BOONO-TV).
**Autorité :** présentation privée/read-only exclusivement ; aucun ordre broker, aucune décision moteur.
**Source de mise en page :** PDF utilisateur `EV-boonoTv.pdf` (1 page, fourni dans la conversation du 11/11).
**Décision :** `OD-20261111-001`.

## 1. Proposition utilisateur et interprétation retenue

Le PDF réduit l'ancien « État vivant » du studio à **quatre parties hiérarchisées**, dans le panneau de gauche 720×1080 :

1. **Trajectoire** : état MCB15 directeur, offensive actuelle, BW15 et LBW15 précédent confirmé / Live, dernier Cross15 (heure, âge, BW/LBW au jalon, différence prix « Since »), MF15 confirmé/Live, débit BTC/s et pente MF15.
2. **Tactique** : phase MCB3 et relation au directeur, BW3/LBW3 précédent confirmé / Live, Cross3 (mêmes conventions), MF3 et distance/acceptation MA3, mémoire des retests et contacts s'ils sont réellement connus.
3. **Lieu** : direction candidate, état d'extension réellement enregistré, place au sein du range prix 2h, BW4/LBW4 précédent / dernier confirmé, source et disponibilité, dernier E4 **confirmé** (non Live).
4. **Chaîne causale** : PM Live, événements Cross3 → E3 Live → E3 confirmé → Cross15 → E15 Live → E15 confirmé ; phase et campagne MCB15 ; position PAPER, entrée, net potentiel, MFE/MAE, floor de la position, invalidation mémorisée ; maturité offensive, contexte prix 4h, extrême 2h et divergence opposée éventuelle.

**Les chiffres du PDF sont un exemple d'une observation passée, et ne sont pas fixés dans le code.** Les positions PAPER peuvent rester LONG alors que la trajectoire directrice est SHORT. Les flèches des jalons donnent un ordre de présentation, **pas** l'ordre chronologique imposé des preuves. L'ancienne carte analytique « Thèse/MCB, Structure/Position, Conversion/Combat, Décision/Risque » a été remplacée uniquement sur la surface État vivant TV.

## 2. Sources factuelles et conventions

### 2.1 Nouveau lecteur Amsterdam

Le module neuf `boono-tv/tv-living-state.js` est importé par `boono-tv/bridge.js`, qui reste le processus PM2 `boono-tv`. Chaque snapshot TV inclut un objet compact `tvLiving` d'origine `V5.4.3 PAPER + MCB/AUDIT/Elastic` avec les propriétés :

- `status` (`DATA_RECENT` / `SOURCE_STALE`), `asOf` et âge source ;
- `trajectory`, `tactical`, `place`, `causal`, `structure`, `position`, `offensive` ;
- `decisionImpact:false` et `brokerOrdersEnabled:false`.

Les informations proviennent de `data/v52-paper-state.json`, des bougies confirmées `/root/agents-ia-zero-one/data/mcb-live/mcb_{3m,15m,4h}.csv`, de `data/audit-history.json` et des événements `data/elastic-observer-events.ndjson` via `modules/v5/v53-causal-chain-view.js`. Les relevés AUDIT et événements sont **cachés par mtime/size** (lecture bornée) afin de ne pas relire plusieurs mégaoctets toutes les 5 secondes.

- Pour MCB15/MCB3, la première valeur est la **dernière bougie confirmée** (gris), la seconde la valeur AUDIT **Live fraîche** (couleur verte/rouge selon l'évolution). Une bougie ouverte n'est pas promue « confirmée ».
- Pour MCB4h, les deux valeurs sont les **deux dernières bougies fermées** ; `sourceAt` et `availableAt` sont séparés, le signal E4 n'est affiché que s'il figure réellement dans les CSV natifs confirmés.
- Les heures des événements Cross/E3/E15 proviennent de la chronologie Elastic/AUDIT, pas d'une reconstruction d'affichage ni du graphique TradingView. Les BW/LBW attachés à un événement sont les relevés audit compatibles les plus proches, pas des valeurs inventées.
- `Since` = déplacement **du prix BTC en dollars** depuis l'événement Cross, et non PM3/PM5 ou P&L.
- `flowBtcPerSec` = volume AUDIT de la fenêtre de 200 transactions / durée réelle de cette fenêtre ; il ne faut pas le confondre avec le volume moyen du ticker 4×15.
- `RANGE_LOW/MID/HIGH` est un **repère d'affichage** dérivé du `priceRangeRank` confirmé du 2h (bas ≤0,25 ; haut ≥0,75 ; milieu sinon), pas une nouvelle entrée ou invalidation. `ÉTENDU` n'est affiché que si `extendedTacticalWave===true`.
- Pour la position PAPER, le niveau affiché est `position.invalidationPrice`, mémorisé dans la position. Il n'est pas remplacé par l'invalidation contextuelle évolutive de l'analyse.
- `floorAdvisory` distingue la version d'autorité MCB de l'ancienne politique autonome ; l'interface n'ajoute aucun ordre de sortie.
- Si l'état V5 dépasse ~90 secondes, si `DATA_OK` manque ou si `brokerOrdersEnabled!==false`, le panneau n'affiche pas de structure et de position périmées comme Live. Les absences de preuves apparaissent comme « — ».

### 2.2 Présentation OVH, sans toucher au studio

Nouveaux fichiers servis par le studio OVH :
- `scene/tv-living-state.js` : renderer des quatre chapitres, échappement HTML, couleurs précédent/actuel, horloges Europe/Stockholm, état périmé et FLAT.
- `scene/tv-living-state.css` : style **scopé au panneau gauche** `#statePanel .state-rows.tv-four`, fond sombre du studio conservé, textes agrandis, bandeaux descriptifs gris et position distincte.

L'intégration dans le runtime OVH existant est limitée à :
- `scene/index.html` : liens JS et CSS versionnés `OD20261111-001` ;
- `scene/app.js` : dans `render(s)`, appel au nouveau `window.BoonoTVLivingState.render(s)` à la place de l'ancien rendu, avec repli conservé si le script externe n'a pas chargé.

**Patch runtime exact :** `knowledge/BOONO_TV_EV4_OVH_runtime_patch_2026-11-11.patch`, fabriqué sur OVH avec diff des sources avant/après. La copie `boono-tv/scene/*.js/css` dans le dépôt Git contient les deux nouveaux fichiers versionnés. Le runtime complet OVH diffère sur d'autres points de l'ancien brouillon `boono-tv/scene/app.js` du dépôt : ne jamais réinstaller par-dessus son loft, ses géométries d'écrans, ses masques alpha, les éditeurs ou ses fichiers de projection sans comparer les versions.

**Intacts** : scène V2 loft, desk, projection des quatre surfaces, postures BOONO/chat, musique/vidéo, bulles, calibration des quads, éditeurs, affichage Conversion mini et MarketCipher, lecteur mobile privé.

## 3. Déploiement vérifié

- **Amsterdam :** PM2 `boono-tv` a été redémarré **seul** après ajout du nouvel objet `tvLiving` à la charge utile. Les moteurs `boono-v494-paper` et `boono-v543-paper`, le serveur `config-server` et le shadow Elastic n'ont pas été redémarrés. Le pont reste HTTP loopback `127.0.0.1:3090`, read-only.
- **OVH :** `studio-server.js` est resté en place, sans redémarrage ; il relaie `/api/snapshot` et `/ws` via le tunnel existant `127.0.0.1:3309` vers Amsterdam. Le serveur studio `127.0.0.1:3091` et le lecteur privé mobile `3092` servent les nouveaux JS/CSS (HTTP 200 confirmé).
- **Temps réel :** le canal snapshot complet continue à environ 5 secondes ; les messages `marketTick` à environ 1 seconde maintiennent le cours et les volumes sans redessiner tous les panneaux. Le nouveau panneau suit le même `render(s)`, pas un deuxième WebSocket ni un nouveau moteur.

## 4. Tests effectués

- `node --test tests/boono-tv-four-block-state-20261111.test.js tests/boono-tv-four-block-front-20261111.test.js` : **9 tests passés**, comprenant causalité source/asOf, confirmation 4h, états récents/périmés, position/FLAT, échappement HTML, ordre des quatre sections et isolation du CSS.
- Contrôle direct `/api/snapshot` sur Amsterdam puis à travers le **proxy OVH**, vérification de `tvLiving.status=DATA_RECENT` et des sept groupes de mesures ; source et cible cohérentes.
- Tests JS en VM sur la charge réellement reçue par OVH : présence des quatre rubriques, Cross/MA/4h/position/maturité ; absence de contenu périmé présenté comme actif.
- **Contrôle visuel à 1920×1080** : rendu headless Chrome isolé à partir de la feuille CSS réellement déployée sur OVH et d'une charge V5 réelle, sans débordement ni troncature dans le panneau 720×1080. Il s'agit d'une **prévisualisation locale reconstituée**, et non d'une capture d'écran de l'ensemble du studio interactif authentifié.
- Vérification de la livraison HTTP 200 des assets JS/CSS sur `3091` et `3092`, ainsi que des checksums des nouvelles sources identiques entre OVH et Git.

## 5. Limites et suivi

1. **Validation utilisateur** : confirmer le cadrage final dans le studio avec toutes les couches compositées, dans le navigateur habituel et sur téléphone ; le test headless reproduit seulement le panneau gauche.
2. **Fidélité temporelle** : le PDF montre des jalons visuellement enchaînés dont certains ne sont pas dans l'ordre des heures ; ne pas simplifier la chaîne en une fausse causalité causée par l'ordre d'affichage.
3. **Provenance du lieu** : `RANGE_LOW/MID/HIGH` est une localisation relative au rang 2h V5, pas une qualification indépendante du range VAL/POC/VAH que l'utilisateur tient à jour dans Watch.
4. **Couleurs** : gris = valeur confirmée/ancienne, vert ou rouge = variation de la seconde valeur ; la couleur du mouvement n'est pas nécessairement la direction de la thèse MCB.
5. **Sécurité** : aucun accès à la configuration ni aux ordres ; ne jamais ajouter d'action `POST` vers les moteurs pour alimenter une page média.
6. **Traçabilité des sources** : le pont V5 actif d'Amsterdam préexistait déjà au présent développement mais comportait des évolutions non historisées ; la réconciliation de ce socle a été isolée dans le commit préparatoire `722fb29`. La présente intégration est enregistrée séparément pour ne pas l'attribuer rétroactivement à la maquette du 11/11.

## 6. Reprise technique

1. Sur Amsterdam : vérifier `pm2 status boono-tv` puis `curl -s http://127.0.0.1:3090/api/snapshot` (champ `tvLiving`) et la fraîcheur de `data/v52-paper-state.json`.
2. Sur OVH : vérifier `/api/health`, `/api/snapshot` et le canal `/ws` sur le serveur studio ; ne pas toucher au tunnel si ces tests passent.
3. Pour réparer une disparition du panneau seul : vérifier `scene/tv-living-state.js` / `.css`, l'ordre des scripts dans `scene/index.html` et le branchement dans `scene/app.js` ; garder le renderer historique comme repli technique, mais ne pas revenir à la présentation V4.
4. Réexécuter les tests de lecture, de source périmée, de position FLAT et le rendu visuel avant la mise en service. La géométrie des projections, les masques et le contenu des assets validés sont **hors de portée de ce chantier**.

---

*Cette passation décrit uniquement les changements effectivement réalisés et testés sur Amsterdam et OVH le 11/11/2026. Les valeurs chiffrées du PDF fourni servent d'exemple de mise en page ; le système en service affiche le marché et les positions PAPER réels de ses sources vivantes.*

## Retouche du 12 novembre 2026 — typographie contrastée, données gris/vert/rouge

**Demande explicite :** après deux captures du panneau TV (11/11 à 17:55:26 et 18:30:15), l'utilisateur réclame des titres de rubrique plus grands, davantage de contraste et de couleur, indicateurs **BW/LBW/MF/PM** en bleu, UP vert / DN rouge, premières valeurs en gris et secondes en vert/rouge selon l'évolution. **Le panneau TV reste en quatre sections** ; aucune donnée de stratégie ni de trading n'est modifiée.

**Mise en place sur OVH :**
- `scene/tv-living-state.js` : ajout d'un marqueur sémantique bleu `tv-indicator` aux étiquettes BW, LBW, MF15/3, pente, MF Live, PM Live, MA3, BW4/LBW4 et E4 confirmé ; aucune manipulation de la valeur numérique.
- Paires de valeurs : `tv-prior` gris, slash neutre, `tv-current tv-up/tv-down` dynamique. Vert si **deuxième valeur supérieure** à la première, rouge si inférieure ; cette évolution arithmétique doit rester distincte de la direction LONG/SHORT stratégique.
- `Cross3/15`, `E4 confirmé`, `offensive`, `POSITION` : normalisation des libellés **UP/DN** depuis les sources `long/short` ou `UP/DN` et affichage vert/rouge. Les chiffres signés (pente MF, PM Live, Since, P&L net) portent leur signe en couleur ; les indicateurs sans direction restent neutres.
- `scene/tv-living-state.css` : rubriques 23 px, valeurs jusqu'à 17 px, texte plus blanc, libellés indicateurs cyan `#4ed8ff`, valeur précédente gris `#a7b6c1`, valeur montante vert `#39f3a4`, descendante rouge `#ff6276`. Le contraste de la carte demeure sombre et cohérent avec l'identité BOONO-TV.
- **Équilibrage vertical** `grid-template-rows:.85fr .91fr .65fr 2.15fr` : la place inutilisée des trois premiers panneaux est réservée à la Chaîne causale. Le contrôle headless en 1920×1080 a révélé une coupure de la Maturité offensive avec la première proposition typographique ; cette coupure a été **corrigée** et le panneau entier a été inspecté à nouveau.
- `scene/index.html` sur OVH : seule la version des ressources JS et CSS du nouvel État vivant passe à `OD20261112-001` pour forcer le rafraîchissement navigateur ; patch isolé dans `knowledge/BOONO_TV_typographie_runtime_patch_2026-11-12.patch`. Tous les décors, masques, scripts de projection, éditeurs, vidéos et sprites restent inchangés.

**Contrôles :** 11 tests Node, dont validation explicite du code couleur BW/LBW/MF, Cross UP/DN, E4 et P&L, source périmée/FLAT, CSS limité au panneau gauche. Montage d'un aperçu dans Chrome headless à 1920×1080 avec la CSS OVH et un snapshot V5 reçu via le proxy OVH : 4 rubriques, pas de troncature après rééquilibrage. SHA256 des nouveaux JS/CSS identiques sur OVH et dans Git. Routes `3091` et `3092` rendent les assets HTTP 200.

**La première capture (18:30:15) montre un message `V5.4.3 périmée`.** Un contrôle en direct du 12/11 sur `/api/snapshot` a ensuite montré `tvLiving.status=DATA_RECENT` et un âge de l'ordre de quelques secondes. Cette vérification **ne démontre pas la cause de l'indisponibilité transitoire du 11/11** et ne doit pas être déclarée réparation du collecteur. Le garde-fou `SOURCE_STALE` est conservé.

**Portée opérationnelle :** pas de redémarrage du bridge Amsterdam, des runners PAPER ni du studio OVH : scripts statiques servis en direct. Ne pas attribuer à cette correction une nouvelle qualification économique ou un impact décisionnel. **Validation esthétique finale par l'utilisateur en scène composite complète toujours ouverte.**
