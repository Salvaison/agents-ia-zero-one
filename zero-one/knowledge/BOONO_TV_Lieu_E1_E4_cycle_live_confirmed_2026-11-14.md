# BOONO-TV — LIEU STRUCTUREL : cycle natif E1/E4 Live → confirmé

**Date :** 14 novembre 2026 · **Décision :** OD-20261114-002
**Statut :** implémenté sur Amsterdam et OVH, vérifié en tests et par aperçu Chrome ; appréciation finale de l'utilisateur dans la scène complète ouverte.
**Autorité :** affichage documentaire, aucune décision de trading ni ordre modifié.

## 1. Proposition et interprétation

L'utilisateur propose d'améliorer la troisième rubrique LIEU STRUCTUREL de BOONO-TV avec le même codage couleur que MCB15/MCB3 :

- `4h BW4 -83,5 / -82,1   LBW4 -82,7 / -81,4 · E4Live — · E4 -95,0`
- `1h BW1 -69,2 / -64,5   LBW1 -65,9 / -58,9 · E1Live — · E1 —`

Il précise : « quand un événement est confirmé la valeur live s'éteint en signe de confirmations de cette dernière et attend l'arrivée d'un nouveau signal contradictoire au confirmé ».

La règle validée comme *intention de présentation* est :

1. **Confirmé** : garder le dernier événement natif UP ou DN réellement inscrit dans une bougie close du timeframe. Il continue à être affiché tant qu'un autre événement natif confirmé ne le remplace.
2. **Live** : afficher uniquement un événement provisoire du timeframe **opposé au dernier confirmé**, observé sur sa **bougie actuellement ouverte** et dont la source est encore fraîche.
3. **Live → confirmé** : dès que le signal est confirmé par clôture, la colonne Live revient à **« — »**. Elle ne répète pas le nouveau confirmé et ne se réarme que sur l'apparition d'une **nouvelle contradiction native**.
4. **Disparition / interruption** : si le marqueur natif disparaît de la source intrabar ou si cette source devient périmée, Live s'efface. Il n'est pas mémorisé artificiellement.
5. **Couleur** : vert pour signal natif **UP**, rouge pour **DN**, sur le **nom E1/E4 et sa valeur**. Le signe négatif du chiffre ne signifie pas DN ; il peut représenter un UP depuis un creux LBW fortement négatif.

## 2. Sources vérifiées sur Amsterdam

**Confirmation :** les vrais CSV `/root/agents-ia-zero-one/data/mcb-live/mcb_1h.csv` et `mcb_4h.csv` portent les bougies MCB closes et les marqueurs natifs `wt1_cross_up` (colonne 13) et `wt1_cross_dn` (colonne 14). Ils sont admis uniquement si `barStart + timeframe <= latestAnalysis.asOf`. Les événements contradictoires simultanés, les champs vides et les bougies non clôturées sont ignorés.

**Live :** des fichiers distincts existent effectivement dans le collecteur TradingView : `mcb_1h_live.csv` et `mcb_4h_live.csv`. Ils contiennent la bougie en formation et les mêmes colonnes natives. La source est contrôlée avec `fs.stat.mtimeMs` (date de réception) et la date d'ouverture de la bougie ; la valeur Live exige :

- mtime d'observation ≤ asOf V5 + 3 s et âge ≤ 120 s ;
- sourceAt égal au début de la bougie réellement ouverte selon le timeframe ;
- un seul des marqueurs `wt1_cross_up` / `wt1_cross_dn` renseigné ;
- un événement confirmé antérieur connu et un Live **de polarité contraire** ;
- réception du Live postérieure à la disponibilité du confirmé.

Un CSV présent sur disque **ne prouve pas à lui seul** que sa valeur reste Live : s'il est périmé, correspond à la précédente bougie ou fournit le même sens que le confirmé, on affiche **« — »**.

**Champs ajoutés :** `tvLiving.place.h4.event` et `h1.event` (direction, LBW, valeur du marqueur BW natif, sourceAt et availableAt) ; `h4.live` et `h1.live` (événement provisoire opposé : direction, LBW, valeur native et observedAt). Le champ rétrocompatible `h1.e1Live` reste synchronisé avec `h1.live`.

**Unité du niveau affiché :** E4/E1 montre le **LBW au moment de la bougie portant le marqueur natif**. La vraie valeur du marqueur BW est conservée dans l'infobulle. Pour le dernier E4 confirmé UP : LBW `−95,0`, marqueur BW `−95,3` ; c'est **le sens UP** qui colore le niveau en vert.

## 3. Affichage réellement livré

Deux lignes compactes dans la troisième rubrique, précédant DailyRange et BigRange :

```text
3 · LIEU STRUCTUREL  SHORT · ATTENTE UP
4h BW4 −83,5 / −82,1  LBW4 −82,7 / −81,4 · E4Live — · E4 −95,0
1h BW1 −69,2 / −64,5  LBW1 −65,9 / −58,9 · E1Live — · E1 −79,7
DailyRange ...
BigRange ...
```

Ces nombres sont **l'exemple vérifié à 11h40 CET**, pas des valeurs figées. L'E4 confirmé est natif UP et apparaît en vert. Le dernier E1 confirmé est également UP (LBW `−79,7`, marqueur natif BW `−80,1`), bien que la proposition initiale de l'utilisateur montrait `E1 —` : notre affichage utilise les données effectivement confirmées plutôt que de recopier une absence illustrative.

Le Live est actuellement `—` pour les deux timeframes, car les observations intrabar ne fournissent pas de nouveau marqueur opposé frais. Une future contradiction DN apparaît **rouge** à côté de l'E confirmé UP **vert**, puis devient le nouveau confirmé lors de la clôture et éteint Live. La même règle s'applique symétriquement si le dernier confirmé est DN.

Les autres conventions de l'État vivant sont intactes : BW/LBW précédent en gris, nouvelle confirmation rouge/verte selon son évolution, numérotation et bandeau gris, plus la distribution en **cinq rubriques fixes de 180 pixels**. Le cycle des trois panneaux **25s/15s/5s** ne change pas.

## 4. Implantation et vérification

- `boono-tv/tv-living-state.js` (VPS Amsterdam) : fonctions pures `lastNativeConfirmed`, `oppositeLiveSignal`, `confirmedTf` et lecture sous cache mtime/size des deux CSV intra-bougie. Seul le pont PM2 `boono-tv` a été redémarré pour servir les champs supplémentaires dans `/api/snapshot`.
- `scene/tv-living-state.js` (runtime OVH) : `E4Live/E4` et `E1Live/E1` incorporés aux lignes respectives ; libellés + chiffres colorés par sens du marqueur, non par signe du chiffre. L'ancien sous-panneau séparé E4 confirmé a été supprimé pour conserver la hauteur utile.
- `scene/tv-living-state.css` (runtime OVH) : couleurs UP `#39f3a4` et DN `#ff6178` ciblées uniquement sur `#statePanel .tv-five .tv-place`.
- `scene/index.html` sur OVH : cache-bust spécifique aux JS/CSS de l'État vivant, version `OD20261114-002`. Le patch exact extrait du runtime OVH est archivé dans `knowledge/BOONO_TV_Lieu_E1_E4_cycle_live_confirmed_OVH_2026-11-14.patch`. **Ne pas remplacer le runtime OVH entier** par la copie historique du dépôt.

**Tests :** 49 tests Node des interfaces et des contrats de source, notamment neuf nouveaux tests couvrant opposition Live, confirmation qui l'éteint, réapparition opposée, exclusion des bougies futures, observations périmées, double marqueur contradictoire, couleur native et compatibilité avec les anciennes données.

**Contrôle Chromium headless :** 1920×1080, vraie CSS OVH et snapshot V5 reçu par le studio. Les cinq rubriques sont mesurées à **180 px** chacune, sans overflow ; E4 −95,0 (UP) et E1 −79,7 (UP) sont colorés `rgb(57,243,164)`. Les deux ranges restent affichés. Les assets sont HTTP 200 sur le studio OVH et le lecteur mobile privé.

**Isolation :** aucun nouveau WebSocket, aucune modification des sources TradingView, des seuils MCB, des entrées/sorties PAPER, des floors, des panneaux Vagues/Trades, du décor BOONO-TV ou des éditeurs. La validation visuelle finale dans la scène complète du propriétaire reste ouverte.
