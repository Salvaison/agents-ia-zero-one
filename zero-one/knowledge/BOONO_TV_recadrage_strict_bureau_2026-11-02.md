# BOONO-TV — Recadrage strict de l'établi canonique (sans redessin)

**Date :** 2 novembre 2026  
**Décision :** [OD-20261102-001](operational-decisions/OD-20261102-001/03-origine-et-justification.md)  
**Statut :** **variante et aperçu créés, test pixel à pixel réussi ; non mis en service, validation utilisateur du cadrage attendue.**

## Origine

Le propriétaire a rejeté le bureau régénéré : dessin, finition et proportions ne respectaient pas la référence canonique. Sa demande actuelle est un **simple recadrage du bureau déjà en service**, sans changer aucun élément de son illustration ni le style BD rétro.

## Source et opération

Source effective sur **OVH** :

`/home/ubuntu/boono-tv-studio/runtime/boono-tv/assets/boonotv-v2-20261101/reframed-20261101/desk_1200x1080.png`

Sortie candidate (asset indépendant) :

`/home/ubuntu/boono-tv-studio/runtime/boono-tv/assets/boonotv-v2-20261101/reframed-20261101/desk_reframe_droit_sans_redessin_v1.png`

Il s'agit du même PNG RGBA source, sur toile 1200 × 1080, translaté exactement de **+120 px horizontalement / −42 px verticalement**. **Aucune mise à l'échelle, reconstitution, recréation ou modification de couleur/forme.** La translation vise à placer le coin avant droit plus près du bord droit du cadre et à dégager le bas de la console. L'espace libre antérieur pour installer le personnage reste disponible ; ses futures ancres nécessiteront un calage ultérieur.

## Vérification objective

- Toile : 1200 × 1080 RGBA, les deux versions.
- BBOX alpha source : `[153, 549, 1046, 1071]` (coordonnées inclusives sur pixels alpha non nuls).
- BBOX alpha candidate : `[273, 507, 1166, 1029]`.
- **372 885 pixels de premier plan comparés.**
- **Aucun pixel perdu, aucun pixel modifié**, comparaison stricte des quatre canaux RGBA après translation.
- SHA-256 source : `e78b2c9ac66be0cd831a9cbfea255aee1b3acd897c2bb63c0de8659e9c74991d`.
- SHA-256 candidate : `0511a42d5b036167e98954c39e0bc7ceb6a589ad29d099e193415397e0fc759e`.
- Manifeste JSON sur OVH : `desk_reframe_droit_sans_redessin_v1_manifest.json`.
- Aperçu statique scène, sans BOONO : `desk_reframe_droit_scene_apercu_v1.jpg` (avec décor d'origine et chat en calque séparé translaté **uniquement pour la maquette**).
- La route de prévisualisation depuis le navigateur distant d'Amsterdam (`127.0.0.1:8310`) a répondu **HTTP 200** pour l'aperçu.

## Prévisualisation depuis le Chrome distant / noVNC

- [Aperçu cadrage dans le loft](http://127.0.0.1:8310/assets/boonotv-v2-20261101/reframed-20261101/desk_reframe_droit_scene_apercu_v1.jpg)
- [Calque bureau RGBA transparent](http://127.0.0.1:8310/assets/boonotv-v2-20261101/reframed-20261101/desk_reframe_droit_sans_redessin_v1.png)

Ce sont des URLs **locales au navigateur distant**, pas des pages publiques du studio.

## Frontières et travail ultérieur

- **Aucun CSS, JavaScript, service, flux ni moteur PAPER modifié.** L'illustration du bureau **en service** reste inchangée.
- Les deux projections d'écran devront être recalées de la même translation si la variante est validée, en préservant les sources réelles de données et leurs homographies. Ne pas les déployer dans l'étape présente.
- L'emplacement du chat sur le coffret gauche est conservé dans l'intention. Le chat reste dans un calque indépendant, à déplacer seulement lors d'une intégration après validation ; **ne pas le dessiner dans le bureau**.
- Le travail de cinq sprites BOONO DJ RGBA viendra **après** validation du cadrage. Le problème de l'angle trois quarts gauche sera alors corrigé contre cette nouvelle référence de bureau.
- Le cadre BD provient du loft actuel et n'a pas été modifié.

**À valider :** la nouvelle position de la table dans la scène; aucune mise en service par cette opération.
