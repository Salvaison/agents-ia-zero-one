# BOONO-TV — Vidéos privées accessibles depuis ChromeOS et retour Composer → Scène Live

**18 novembre 2026, soirée.**  
**Décision :** `OD-20261118-007`.  
**Statut :** **correctifs implantés, testés, en service OVH** ; résultat dans le navigateur ChromeOS du propriétaire non encore confirmé. Aucune modification des moteurs PAPER, collecteurs MCB, du bridge Amsterdam, des tunnels ni des médias originaux.

## 1. Incident utilisateur et deux causes démontrées

L'utilisateur signale deux symptômes : la page BOONO-TV ouverte directement par `http://100.115.92.26:8310` fonctionne **sans la vidéo**, puis après modification d'un texte de chat dans Composer via noVNC, retour en Scène Live et disparition du lecteur / des commandes vidéo.

**Cause A — autorisation privée fondée sur le nom de domaine.** Le serveur studio OVH écoute uniquement sur `127.0.0.1:3091`, et Penguin accède à ce serveur au travers de tunnels SSH. Mais les routes privées vidéo et les POST d'édition refusaient tout `Host` différent de `localhost` ou `127.0.0.1`, sans distinguer l'IP privée du tunnel Crostini.

Baseline mesurée avant le correctif sur OVH, avec socket loopback et `Host: 100.115.92.26:8310` :

| Ressource | Host local | Host privé de Penguin |
|---|---:|---:|
| `/api/private/clemens-video/status` | HTTP 200 | **403** |
| `/api/private/boono-media/catalog` | HTTP 200 | **403** |
| `/api/private/clemens-video/stream` (Range) | HTTP 206 | **403** |

Les requêtes de sauvegarde `/api/layout`, `/api/dialogue-script`, `/api/grand-screen` comportaient la même vérification stricte et ne fonctionnaient donc pas avec ce Host.

**Cause B — ancien URL sans moteur vidéo.** Dans le navigateur Chrome d'Amsterdam accessible via noVNC, lecture CDP (sans modifier la page) : `http://127.0.0.1:8310/?showcase=1&mediaPanel=1`, `window.BoonoTVLocalVideoTest` **absent**, `window.BoonoTVProjectionCycle` **absent**. Le module vidéo ne démarre que si `windowVideo=clemens|houseparty|forest` est présent au chargement. Depuis cet ancien URL, cliquer sur « Scène Live » faisait seulement `history.pushState` vers `?showcase=1` : aucun lecteur créé. Cette panne a été **reproduite par Puppeteer** sans enregistrer de scénario. Les URL d'atelier Scénarios possédaient, eux, un lien Live canonique avec vidéo, mais le bouton interne de fermeture supprimait `showcase` et pouvait renvoyer vers une page sans vidéo.

**Défaut connexe de robustesse :** `dialogue-editor.js` désactivait « Enregistrer » pendant un `fetch` non borné. En cas de blocage réseau, ce bouton pouvait rester désactivé. Un mécanisme plausible, sans preuve que le gel observé sur le Chromebook provienne uniquement de cette requête.

## 2. Modifications précises et sécurité

**Fichiers actifs OVH :** `/home/ubuntu/boono-tv-studio/runtime/boono-tv/`.

- `private-preview-access.js` (**nouveau** module partagé) : autorise les requêtes privées uniquement si `req.socket.remoteAddress` est une adresse de loopback ET `Host` est soit local, soit une IP `100.115.92.0/24` avec port **8310**. Il refuse les hôtes arbitraires, les IP hors réseau autorisé et les connexions dont la socket n'est pas locale. Le studio lui-même demeure attaché à `127.0.0.1:3091` : **aucun accès public ajouté**.
- `studio-server.js`, `private-media-catalog.js`, `forest-media-catalog.js` : utilisent ce module pour les routes privées vidéo, catalogue, audio et contrôles d'accès aux requêtes d'édition. **Vérifications existantes anti-CSRF conservées** sur les POST : `Origin` identique à `http://Host`, en-tête d'éditeur spécifique, type JSON et validation des données. Aucun contournement de la sécurité côté navigateur public.
- `scene/composition-tabs.js` : une vue Live/Vidéos sans lecteur est redirigée vers une URL canonique vidéo ; si une page ancienne était déjà ouverte, le clic sur Live/Vidéos provoque désormais une véritable navigation d'initialisation. Si le lecteur existe, **Live ↔ Vidéos conserve la navigation sans rechargement** et le décodeur unique.
- `scene/dialogue-editor.js` : le bouton « Fermer » retourne à la scène Live avec `showcase=1`, `windowVideo`, `projectionCycle=21`, `videoFps=30`. Sauvegarde bornée à 12 s via `AbortController` ; délai dépassé signale **réponse non confirmée** (ne prétend ni succès ni échec de persistence), garde le brouillon et réactive le bouton.
- `scene/index.html` : cache-bust des deux scripts modifiés avec `OD20261118-007`.

**30 ips préservés**, rotation vidéo par surface de 21 s conservée, aucun changement de vidéo, musique, sprites, scène, calibration ou des 12 scénarios enregistrés.

**Backups OVH :** `/home/ubuntu/boono-tv-studio/backups/OD-20261118-007/` contenant les cinq scripts/fichiers HTML précédents et `dialogue-editor.js.before`. Patch exact **217 lignes, 10046 octets, SHA-256 `688166c63d79d9fad7251d9977b107370e37196b74b85442c98251050dcef706`**, versionné dans `knowledge/patches/OD-20261118-007-private-preview-and-live-nav.patch`.

## 3. Contrôles effectués avant production

Instance isolée sur OVH, liée à `127.0.0.1:3095` et automatiquement arrêtée après les essais, sans écriture des données :

- Syntaxe JS des six scripts : `node --check` réussit.
- Module d'autorisation privée : **10 cas unitaires** (loopback local, IP Crostini autorisée, Host public/non conforme, mauvais port, IP hors plage et socket non locale) : **PASS**.
- Accès HTTP après correction : statut Clemens et catalogue **200**, vidéos Clemens/Forest en `Range: bytes=0-1023` **206**, via Host `100.115.92.26:8310`. Un Host `not-private.example:8310` reste **403** sur toutes les routes privées testées.
- Les trois POST d'éditeurs sont maintenant **autorisés mais invalidés par validation métier** (HTTP **400** pour JSON `{}` volontairement invalide, avec `Origin` et en-tête éditeur requis). Avec Host arbitraire : **403**. Aucune sauvegarde valide n'a été envoyée.
- Tests navigateur Puppeteer sur cinq parcours : vieux URL Vidéos, vieux URL Live, page racine + clic Live, bouton Fermer depuis Scénarios, et onglet Live depuis Scénarios : **PASS**, lecture vidéo `playing`, **30 ips configurés**, rotation des projections active, un seul décodeur, aucune erreur JavaScript.
- Test du sélecteur privé : Clemens → House Party → Forest → Clemens : chaque clip `playing`, `readyState=4`, 30 ips, **0 erreur de dessin/JS**.
- Simulation d'un échec `POST /api/dialogue-script` par interception Puppeteer renvoyant 503, sans requête envoyée au serveur : message d'échec affiché et bouton Enregistrer réactivé : **PASS**.

Scripts de reproduction sur OVH : `tests/verify-OD20261118-007-private-host.js`, `-video-nav.js`, `-video-picker.js`, `-dialogue-save-recovery.js`. Copies versionnées sous `zero-one/tests/boono-tv-OD20261118-007/`. Les scripts de navigation visent par défaut le serveur isolé 3095 ; remplacer ce port par 3091 pour une vérification lecture seule de production. Le test de POST utilise une interception pour empêcher tout enregistrement réel.

## 4. Mise en service et vérifications

Le seul service `boono-studio.service` sur OVH a été redémarré après les tests ; PID nouveau **2045125**, état `active`. Aucun redémarrage de V543/V551, Amsterdam, Chrome TradingView ou des services Radio/Android.

Les requêtes immédiatement synchrones au redémarrage ont d'abord rencontré une brève absence de socket (démarrage asynchrone) ; seconde mesure quelques secondes plus tard : studio à nouveau `127.0.0.1:3091`, `/api/health` **200** et `/api/snapshot` **200**. Les services `boono-radio` et `boono-mobile-viewer` sont restés actifs.

Depuis **Penguin avec l'IP privée `100.115.92.26:8310`**, après mise en service : `/api/private/clemens-video/status` **200**, catalogue **200**, Clemens et Forest en Range **206**, scène et API santé en fonctionnement ; noVNC 6080 toujours HTTP 200. Host arbitraire toujours refusé par OVH.

Un second essai Puppeteer a été fait **sur le serveur de production 3091** (pas seulement sur le serveur isolé) : les cinq parcours de navigation reviennent à une vidéo `playing`, 30 ips, **sans exception JS**. Les trois fichiers réellement sauvegardés sur OVH sont demeurés **bit pour bit inchangés** lors des contrôles :
- `desk/dialogue-script.json` : SHA-256 `ada084a26db046376217dfe13a8328c70656f3fdac2f2346c2ebb5a462bed9e1`.
- `desk/projection-config.json` : SHA-256 `7aaa265ef47ea0c1243e3d42c929debf0d9f1ba42dd2e6d243ba785d7e9e38c4`.
- `desk/grand-screen-config.json` : SHA-256 `4cff3e82d4840f72a3006d5a9067508c5c8447af85f3ba954325cada02f0bd8a`.

Les médias d'artistes restent en **prévisualisation privée**, droits de diffusion publique non vérifiés ; aucune publication ou transfert nouveau.

## 5. Rétablissement du navigateur noVNC déjà ouvert

Après la mise en service, inspection CDP en **lecture seule** de l'onglet BOONO-TV réellement ouvert dans Chrome Amsterdam (layout TV, pas TradingView) : `http://127.0.0.1:8310/?showcase=1&mediaPanel=1`, mode éditeur désactivé, lecteur inexistant. Cette page conservait l'ancien état JavaScript.

Un **seul** `Page.reload({ignoreCache:true})` a été appliqué à cet onglet BOONO-TV, **uniquement après vérification qu'aucun éditeur n'était ouvert**, sans naviguer ni recharger les collecteurs TradingView. Résultat CDP six secondes plus tard :

- URL réparée en `?mediaPanel=1&showcase=1&windowVideo=clemens&projectionCycle=21&videoFps=30` ;
- lecteur `window.BoonoTVLocalVideoTest` présent, état `playing`, piste `clemens` ;
- cycle de projection `fenetres` actif et **118 images Canvas** déjà dessinées à la lecture ;
- aucun changement des scripts de dialogue ou de calibration sauvegardés.

**La vidéo est donc confirmée en lecture dans le navigateur distant d'Amsterdam affiché via noVNC.** Cela ne garantit pas la même fluidité sur le navigateur ChromeOS direct : ce dernier dépend de son propre décodeur GPU et de son onglet, à contrôler auprès de l'utilisateur.

## 6. Réserves et procédure de vérification utilisateur

Le fonctionnement interne du studio, les endpoints privés, les transitions et la sélection ont été **testés**. La fluidité réelle avec le ChromeOS du propriétaire, noVNC et le réseau/décodeur propre à son appareil **nécessite encore confirmation humaine**. Une vidéo à 30 ips configurés ne prouve pas 30 ips effectivement affichés sur Chromebook ; ce test a été vérifié par l'état du lecteur et l'absence d'erreurs dans Chromium headless.

**URL directe :** `http://100.115.92.26:8310/?showcase=1&windowVideo=clemens&projectionCycle=21&videoFps=30`.  
**URL dans Chrome distant Amsterdam via noVNC :** `http://127.0.0.1:8310/?showcase=1&windowVideo=clemens&projectionCycle=21&videoFps=30`.

Ouvrir un nouvel onglet ou effectuer un rechargement fort pour abandonner les anciens objets JS et obtenir les scripts versionnés. Dans « Ateliers », sélectionner « Scénarios », modifier puis sauvegarder si voulu ; utiliser « Fermer » ou « Scène Live ». La vidéo doit revenir. Les anciens textes de chat enregistrés restent disponibles.

**Retour arrière :** restaurer les fichiers `.before` depuis `backups/OD-20261118-007/`, supprimer uniquement le nouveau `private-preview-access.js` s'il n'est plus référencé, puis redémarrer **seulement** `boono-studio.service`. Attention : ce retour arrière reproduirait l'ancien refus 403 pour ChromeOS par IP. En cas d'incident, vérifier les journaux avant de lancer des actions susceptibles d'écraser les scénarios.
