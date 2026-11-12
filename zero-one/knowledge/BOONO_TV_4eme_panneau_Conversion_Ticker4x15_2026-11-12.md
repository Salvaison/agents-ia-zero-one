# BOONO-TV — Quatrième panneau Conversion + ticker Elastic 4×15

**STATUT ACTUEL : RETIRÉ SUR DEMANDE DU PROPRIÉTAIRE, LE 12 NOVEMBRE 2026.** Cette passation reste une archive de l’essai rejeté. BOONO-TV a retrouvé ses trois vues et la rotation 25/15/5, cycle 45 secondes. Voir OD-20261112-010. La ligne CONVERSION de l’État vivant validée séparément n’est pas touchée.


**Date de mise en service :** 12 novembre 2026 · **Décision :** OD-20261112-009.
**Objet :** quatrième vue tournante du panneau gauche de BOONO-TV, graphiquement harmonisée avec « Vues analytiques / Vagues ».
**Frontière de sécurité :** interface et relais read-only ; aucun changement de moteur, de position, de règles ni d'ordres.

## 1. Demande et choix de composition

L'utilisateur demande : « Je voudrais que tu fasses un 4eme panneau avec le graphe conversion et le ticker 4X15 dans le même style visuelle que les vagues ».

La scène OVH possédait trois vues alternantes : `state` (État vivant : 5 rubriques), `charts` (Prix/MCB15/MCB3) et `trades` (trades PAPER accomplis). Une quatrième vue **`conversion`** est ajoutée **après** les trois existantes. Les durées précédemment validées **25s/15s/5s** restent inchangées ; la nouvelle Conversion reçoit **15 secondes**, comme la vue Vagues. Durée totale **60 secondes**. Les commandes `?panel=state|charts|trades|conversion` et les modes éditeur conservent leur comportement de prévisualisation fixe ; une seule minuterie de rotation est active.

Le quatrième panneau, dans les **720 × 972 px** utiles de l'espace de gauche, comporte :

- **Bandeau haut :** titre CONVERSION BTCUSDT, cours BTC récent et provenance de lecture.
- **Ligne PM :** PM3, PM5, PMLive issus du V5.4.3 PAPER, et qualité directionnelle CONTESTED/UNCLASSIFIED (pas de P75 inventé).
- **À gauche :** 150 minutes de bougies BTC 3m et MA200 selon les fonctions de dessin **réellement employées par les Vagues** (`window.BoonoCharts.drawPrice`, thème `tv-neon`), heures discrètes, prix Live, axe bleu, deux surfaces semi-transparentes acheteurs/vendeurs basées sur le **même flux initiateur OKX 3m** que le bureau miniature, dix pastilles de volume selon les mêmes seuils [1,2,5,10,20,50,100,200,500,1000] BTC. Le duel montre le volume de chaque côté en BTC. Les bougies sont mises à l'échelle sur leur amplitude de prix ; si la MA200 est trop éloignée, elle est renseignée avec sa distance dans l'en-tête sans écraser verticalement les bougies.
- **À droite :** quatre cartes Elastic 15 minutes superposées, du plus récent au plus ancien : heure, `Vol moy: % · BTC/min`, deux qualités dominantes, proportions LONG/SHORT/CONTESTED, régime marché. Le pourcentage est la moyenne des mêmes seuils de pastilles 3m, calculée à partir des bougies OKX 1m **confirmées**, pas un percentile de volume 24h.
- **Bandeau bas :** fenêtre horaire 3m, ticker 4×15 et mention SHADOW.

Le décor OVH, les projections 3D, les sprites et masques BOONO, vidéos, musique, autres panneaux et éditeurs n'ont pas été redessinés ni réinitialisés.

## 2. Sources, horloges et conservation des contrats

**Cours, OHLC, MA et duel :**

- `snapshot.market` et `snapshot.conversion.effort` proviennent du **pont BOONO-TV Amsterdam existant**, de son unique WebSocket public read-only OKX BTC-USDT-SWAP (pas de deuxième WebSocket), avec contrats convertis en BTC. Une fenêtre 3m peut être initialement `WARMING_3M` après redémarrage et n'est pas présentée comme complète avant couverture.
- `snapshot.series.mcb3` transmet déjà les OHLC/MA réels et les signaux de MCB3. La vue Conversion reprend cette série et la limite aux **150 dernières minutes**. Les bougies ne sont pas reconstruites à partir du ticker ou de PM.
- `snapshot.conversion.conversion` contient les trois PM existants et leur statut directionnel. Un prix Live non frais donne « — » ; le graphique peut conserver les bougies historiques, sans les faire passer pour une cotation Live.
- Les rectangles verts et rouges sont **un encodage visuel du volume d'agression acheteurs/vendeurs sur la même fenêtre 3m**, pas des positions ouvertes ni la profondeur passive d'un carnet.

**Ticker V494 Elastic :**

- Nouveau petit adaptateur pur `boono-tv/tv-conversion-ticker.js`, qui lit sous **cache mtime/size** le fichier déjà produit `data/v494-elastic-shadow-summary.json`. Il réutilise **`modules/attention/v494-elastic-ui-summary.js`** pour conserver les fractions de temps historiques, **sans reclasser** les qualités. Il n'invente pas de nouvelles phases, votes ou catégories.
- Volume moyen OKX : réutilisation **`modules/attention/v494-elastic-volume-1m.js`**, même source `OKX_BTC_USDT_SWAP_CLOSED_1M_VOLCCY` et mêmes pastilles 3m que le ticker de BOONO Watch. **Un appel HTTP en lecture seule environ une fois par minute** dans le pont, indépendamment des snapshots envoyés toutes les 5 secondes ; valeurs cachées et horodatées. Les minutes incomplètes ou manquantes produisent « — », pas un faux chiffre.
- La source `tvTicker4x15` du snapshot est explicitement `SHADOW_ONLY`, `decisionImpact:false` et `brokerOrdersEnabled:false`. Le navigateur conserve les quatre fenêtres historiques si la source Elastic est ancienne, en les intitulant **SOURCE ANCIENNE** au lieu de les présenter comme un live confirmé. Le volume peut être daté d'au plus 90 secondes avant l'état Elastic courant ; son `asOf` réel est transmis sans prétendre une simultanéité parfaite.

**Incident constaté pendant l'intervention :** le 12 novembre, vers 15h19 UTC, le fichier Elastic avait cessé d'être rafraîchi depuis environ 17 minutes, bien que le processus PM2 `boono-v494-elastic-shadow` soit toujours `online`. Le contrôle strict de `modules/attention/v494-elastic-shadow.js` suspend ses nouvelles observations lorsque la source V494 indique `DATA_DEGRADED`. Le shadow n'était donc **pas bloqué par notre nouveau panneau** ; il protégeait l'exactitude des données. **Aucun contournement, aucune relance du shadow et aucune modification de PAPER**. À 15h31 UTC, la qualité V494 était revenue à `DATA_OK` ; le shadow a repris et son dernier relevé était de moins de 60 secondes, ainsi que l'indiquait `tvTicker4x15.status=DATA_RECENT`. Le nouveau panneau se met à jour automatiquement lors de ces reprises.

## 3. Implémentation concrète et cache

**Amsterdam :** `boono-tv/bridge.js` enrichi d'un champ `tvTicker4x15` au snapshot existant et d'un rafraîchissement asynchrone minute des volumes ; `boono-tv/tv-conversion-ticker.js` nouveau, cache et validation de provenance ; redémarrage ciblé du **seul processus PM2 `boono-tv`**. Les runners `boono-v494-paper` et `boono-v543-paper` ainsi que les autres services sont restés inchangés.

**OVH :** dans le **runtime réel** `/home/ubuntu/boono-tv-studio/runtime/boono-tv/scene` :

- `tv-conversion-panel.js` : dessin du graphe et du duel, pastilles, qualité et quatre cartes, à partir du snapshot existant.
- `tv-conversion-panel.css` : composition quatre-cinquième vue, même palette bleu pétrole, cyan, vert, rouge et bordures discrètes que les Vagues.
- `chart-views.js` : ajout de `conversion` à la liste des vues, minuterie `{state:25000,charts:15000,trades:5000,conversion:15000}`, visible uniquement à son tour, sans second rafraîchissement.
- `index.html` : section DOM dédiée (hors du loft), chargement JS/CSS et version de cache **OD20261112-009**. Le texte du titre du graphique a été raccourci à « 01 · PRIX 3m / DUEL » afin de ne pas passer sur deux lignes.

Le runtime OVH est plus riche que la copie historique de `boono-tv/scene/index.html` du dépôt. **Ne pas remplacer tout l'index OVH par cette ancienne copie Git.** Le diff exact des deux fichiers modifiés et des deux nouveaux fichiers est archivé sous `knowledge/BOONO_TV_4eme_panneau_Conversion_4x15_OVH_2026-11-12.patch`.

## 4. Vérifications et limites

- `node --check` sur le pont et les modules JS : PASS.
- Tests Node regroupés sur sources et interfaces BOONO-TV, incluant **quatrième panneau 25/15/5/15**, contrôle d'une seule minuterie, prévisualisation forcée `?panel=conversion`, source SHADOW bornée et validée, volume OKX 1m confirmé, six qualités de marché déjà existantes, cinq zones fixes 20% de l'État vivant : **48 tests passés** au moment de la livraison.
- Test de rendu sur un snapshot réel OVH : une vue Conversion de **718 × 972 px** avec canvas de prix **434 × 616 px** et quatre cartes de ticker dans une colonne d'environ 249 px. Capture Chromium à **1920 × 1080**, pas d'overflow des conteneurs, bougies et duel visibles, bandes de qualité conservées ; les mêmes assets sont servis sur OVH et dans la copie Git (SHA-256 correspondants).
- Les assets JS/CSS et rotateur sont servis en HTTP **200** sur le studio privé OVH port 3091 et le lecteur mobile privé 3092 ; l'application elle-même reste sous les contrôles d'accès existants, que cette retouche ne change pas.
- Aucun test de profitabilité ni de décision PAPER n'est impliqué. Les quatre fractions Elastic représentent la couverture **des échantillons de temps** ; le pourcentage de volume s'appuie sur les minutes OHLC effectivement clôturées. Les sources manquantes et les états anciens portent leur avertissement, notamment en cas de `DATA_DEGRADED`.
- **Validation visuelle finale dans la scène composite complète par le propriétaire : ouverte.** Le contrôle Chromium est une reconstitution fidèle du panneau de gauche, pas une captation de toute la scène animée OVH.

## 5. Retour arrière sans effet moteur

En cas de défaut purement visuel, retirer la section et les deux liens de modules `tv-conversion-panel.*` de l'index OVH et restaurer la rotation préalable dans `chart-views.js`, sans toucher à l'alimentation des moteurs. Le champ read-only `tvTicker4x15` peut rester dans le snapshot sans autorité ; une restauration du pont est indépendante. Toute action de maintenance sur les processus PAPER nécessite une décision et un audit distincts.
