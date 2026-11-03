# BOONO-TV — Éditeur de calques déplaçables et redimensionnables, bougies à bordures directionnelles

**3 novembre 2026 — runtime OVH modifié et vérifié.** Registre : [OD-20261103-003](operational-decisions/OD-20261103-003/03-origine-et-justification.md) (déplacements + bougies) et [OD-20261103-004](operational-decisions/OD-20261103-004/03-origine-et-justification.md) (agrandissement des objets).

## Mandat et périmètre

À la demande explicite du propriétaire, rendre modifiables dans l'éditeur privé BOONO-TV les positions du **chat, BOONO, établi, prix et plan de chandeliers, vagues MCB**, puis permettre le changement de taille par objet. Accroître l'amplitude graphique des bougies sans réécrire la série de prix. Conserver le remplissage cyan/bleu et le glow cyan des chandeliers mais colorer leurs contours **vert pour close ≥ open, rouge pour close < open**. Aucune nouvelle source de données, aucun changement du risque, des ordres, des runners PAPER, ni de la collecte.

## Installation effective sur OVH

Studio : `/home/ubuntu/boono-tv-studio/runtime/boono-tv/`, port local `127.0.0.1:3091`. Les changements du **3 novembre 2026** sont limités à :
- `scene/layout-editor.js` : poignées **BOONO, CHAT, ÉTABLI, BOUGIES, VAGUES, PRIX**, poignées des coins des deux écrans et de la bulle ; sélecteur d'objet, curseur de **Taille** et curseur indépendant **Amplitude des bougies** ; bouton `Enregistrer`, `Annuler`, export JSON et fermeture.
- `scene/styles.css` : présentation du panneau d'édition et des curseurs, visibles uniquement en mode `layoutEdit=1`.
- `scene/boono-v2.css` : étiquette de prix pouvant être affichée et déplacée.
- `scene/app.js` : options de contours des bougies + zoom vertical du prix, actualisation du rendu sur changement de contrôle ; lorsqu'un ticker est ancien, l'étiquette de prix précise `3m` plutôt que de présenter comme live une valeur périmée.
- `runtime/shared/boono-chart-renderer.js` : deux nouvelles options **facultatives** `candleOutlineUp / candleOutlineDown` et `visualZoom` dans `drawPrice`. Les autres vues utilisant le renderer sans ces options conservent leurs couleurs d'origine. Les bougies sont toujours calculées sur les OHLC reçus.
- `studio-server.js` : `POST /api/layout` autorise, **valide et enregistre** les quatre nouveaux points d'objet et les facteurs de taille ; accepte les anciens clients sans effacer les nouveaux réglages ; maintient les protections **same-origin + entête local**, l'accès `127.0.0.1` et l'enregistrement atomique dans le JSON. Service redémarré **via la vraie unité systemd utilisateur `boono-studio.service`** (session `ubuntu`).
- `desk/projection-config.json` : les quadrilatères et coordonnées des six poignées historiques sont **conservés**. Nouvelles clés `overlays.desk/boono/cat/candles` et `visuals.scales`; `visuals.candleAmplitude=1.45`. Dimensions de scène : **1200×1080**.

## Particularités géométriques à conserver

- L'établi (`#boonoDesk`) et **le moteur des deux projections** (`#deskProjectionEngine`) utilisent exactement la même translation et échelle, de sorte que la surface MarketCipher réelle et les instruments internes suivent le meuble.
- Les anciennes positions de quadrilatères sont sauvegardées dans leur repère de référence. Les poignées de coins affichées dans l'éditeur sont transposées à travers l'échelle de l'établi ; le glissement du coin applique l'inverse de cette transformation avant d'enregistrer les quads.
- Les couches `#boonoCharacter` et `#boonoV2StandingBack` reçoivent la même transformation : mains et corps des cinq poses debout ne se séparent pas. Les sept autres poses V2 restent disponibles.
- `#boonoV2Cat` est redimensionné seul, sans affecter le loft.
- `#pricePanel` (bougies OHLC 3m) et `#marketCurtain` (MCB 3m/15m) sont des plans séparés. Le rideau conserve sa perspective `matrix3d` ; la taille modifie uniquement ses coefficients X/Y sans changer les séries.
- **Zoom vertical des bougies** : rapproche les bornes visibles de prix autour de l'ancre du graphique. Cela grossit les variations à l'écran mais peut couper des extrêmes hors du cadre si l'utilisateur choisit un zoom élevé ; les valeurs OHLC, niveaux réels et décisions ne sont pas modifiés. Le curseur d'échelle du **plan entier** est indépendant du zoom des valeurs.
- L'étiquette du prix permet une position et une taille indépendantes, avec indication de fraîcheur quand le ticker est ancien.

## Tests réellement réalisés

1. Test Chromium headless depuis le studio `127.0.0.1:3091` : la scène V2 et l'éditeur chargent sans erreur JavaScript ; quinze poignées affichées dont les six objets modifiables.
2. Déplacement du chat de (+28,+24) : état UI corrigé, transformation `translate(28px, 24px) scale(1)` observée.
3. Établi agrandi à **120 %** : `#boonoDesk` et `#deskProjectionEngine` ont présenté **la même transformation**, les coins des écrans ont suivi visuellement, leurs quads stockés sont restés inchangés.
4. BOONO agrandi à **130 %** : deux couches `front` et `back` identiques.
5. Curseur d'amplitude réglé temporairement à **172 %** et lu dans l'état du navigateur ; test du renderer sur deux bougies synthétiques, avec pixels verts et rouges observés et cyan conservé.
6. `Annuler` : toutes ces modifications expérimentales ont été rétablies ; comparaison avant/après : quadrilatères, positions sauvegardées et facteurs d'échelle initiaux préservés. Appel de sauvegarde avec valeurs d'origine : `POST /api/layout` **HTTP 200**, JSON `ok:true`.
7. Vérification finale depuis Chromebook Penguin via le tunnel SSH privé déjà installé : `http://127.0.0.1:8310/?layoutEdit=1&showcase=1&showcaseHold=1&showcaseStart=10&panel=state` a répondu **HTTP 200** ; `/api/layout` aussi.
8. L'unité systemd utilisateur `boono-studio.service` est **active** après redémarrage. Le studio n'est exposé ni sur une interface publique ni à un compte de trading.
9. Capture QA serveur : `/tmp/boono_editor_extended_qa.json`, avant/après `/tmp/boono_editor_extended_before.png` et `/tmp/boono_editor_extended_modified.png`. Ces captures sont des preuves locales ponctuelles, pas un asset Git.

## Sauvegarde et rollback

**Sauvegarde réalisée avant modification :** `/home/ubuntu/boono-tv-studio/backups/boono-editor-elements-20261103-v1/`, contenant :
`scene_layout-editor.js`, `scene_boono-v2.js`, `scene_boono-v2.css`, `scene_app.js`, `scene_styles.css`, `studio-server.js`, `desk_projection-config.json` et `shared_boono-chart-renderer.js`.

Restaurer seulement les fichiers concernés et redémarrer **l'unité systemd utilisateur exacte** `boono-studio.service` si `studio-server.js` a été restauré. Ne jamais remettre un JSON d'ancienne calibration sans vérifier les réglages intervenus depuis.

**Statut : IMPLÉMENTÉ, TESTÉ ET ACTIF** dans le studio privé OVH. L'ajustement artistique final des positions et des tailles reste le choix du propriétaire. Le flux MarketCipher authentique reste un point de surveillance distinct s'il devient blanc ou obsolète.
