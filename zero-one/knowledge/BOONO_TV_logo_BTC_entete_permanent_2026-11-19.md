# BOONO-TV — Second logo BTC permanent et placement manuel dans l’en-tête

**Date :** 19 novembre 2026 · **Décision :** OD-20261119-009 · **Chantier :** studio OVH privé, interface État vivant/Composer.

## Mandat validé et distinction essentielle

L'utilisateur demande un logo Bitcoin permanent **par-dessus l’en-tête de l’État vivant**, précise « je veux pouvoir le placé moi même » et insiste sur le fait qu'il s'agit d’« un élément supplémentaire par rapport au logo btc deja existant ».

Le résultat est **un deuxième objet**, non la transformation de l’accessoire BTC existant :

- **Objet préexistant** : `#accessory-btcSymbol` / `btcSymbol` dans les accessoires du loft, soumis aux choix et fenêtres d’apparition par posture, strictement inchangé.
- **Nouvel objet** : `#boonoHeaderBtcPermanent` dans `#statePanel header.state-head`, avec son propre contrôle et fichier de placement. Il ne dépend ni des 12 postures, ni des changements État vivant/Vagues/Trades, ni des rotations de panneaux/vidéos.
- **Source réutilisée** : PNG transparent GIMP `btcSymbolAlpha`, SHA-256 `544a2403905008566f46784b9a18649dfe794197f44d8f1225847851a675e914`. La source est partagée, mais pas l’objet graphique, son identité DOM ni son état.

## Fonctionnement de la régie

Dans **Ateliers → Scénarios → Accessoires**, une rubrique distincte s’appelle **« BTC · Logo permanent dans l’en-tête »**. Son fonctionnement :

1. **« Placer le logo dans l’en-tête »** : affiche un aperçu déplaçable dans le bandeau État vivant (720 × 82 dans la scène 1920 × 1080).
2. L'utilisateur le glisse à la souris, ajuste la **taille** (18–78 px) et, si nécessaire, corrige les **coordonnées X/Y**.
3. Le contrôle **« Afficher le logo en permanence »** règle la visibilité indépendante.
4. **« Enregistrer position »** sauvegarde sur OVH. Le bouton de sauvegarde principal des postures ne sauvegarde pas ce placement distinct.
5. **« Annuler le placement »** restaure l'état enregistré sans changer les autres objets.

**État initial intentionnel : « non placé »**. Le serveur connaît un point de départ purement provisoire (x=478,y=10,taille=55), mais ne l’affiche pas de façon permanente avant l’enregistrement par le propriétaire. C'est pour éviter qu'un placement choisi par l'assistant soit assimilé à une validation esthétique. Une fois placé/sauvegardé et visibilité activée, le logo reste affiché dans l'en-tête des vues du studio privé.

## Implémentation OVH

Sous `/home/ubuntu/boono-tv-studio/runtime/boono-tv/` :

- **Nouveau** `scene/btc-header-logo.js` : image supplémentaire dans le vrai en-tête, position absolue sans changer son flux de texte ; drag au pointeur avec correction du facteur d’échelle de la scène, ajustement de taille et de position, aperçu réversible. Le module ajoute ses commandes dans la rubrique Accessoires du Composer lorsque celle-ci est créée, sans modification des fonctions qui gèrent les 12 postures.
- **Nouveau** `btc-header-logo-config.js` : endpoints privés `GET/POST /api/private/btc-header-logo`. POST validé par Origin, hôte, en-tête d’éditeur, contrainte x+taille <=720/y+taille <=82, taille 18–78 px, révision SHA contre l'écrasement concurrent, écriture atomique.
- **Nouveau** `desk/btc-header-logo.json` : `version=1, placed=false, visible=true, x=478, y=10, size=55` jusqu'au placement de l'utilisateur. Fichier complètement indépendant de `desk/dialogue-script.json` et `desk/projection-config.json`.
- `studio-server.js` : montage unique du nouveau service privé.
- `scene/styles.css` : styles de superposition/drag dans l’en-tête et contrôles dédiés dans l’atelier.
- `scene/index.html` : chargement du module sous `dialogue-editor.js` et version du CSS `OD20261119-009`.

**Portée privée :** la ressource Vecteezy fournie et les commandes ne sont disponibles que par le studio SSH privé / preview local. Pas d'activation sur la surface spectateur 3092 tant que les droits de diffusion ne sont pas confirmés. Pas d’upload/asset public supplémentaire. Aucun changement des prix, TradingView/MarketCipher, PAPER, rotations, calibrations ou du compte des trades.

## Sauvegardes et préservation

Copie ciblée antérieure à modification : `/home/ubuntu/boono-tv-studio/backups/20261119-btc-header-logo/`, contenant `studio-server.js`, `scene/index.html`, `scene/styles.css`, `scene/dialogue-editor.js`, `desk/dialogue-script.json`, `desk/projection-config.json`.

Le fichier existant du Composer était déjà susceptible d'évoluer pendant les interventions ; aucun ancien snapshot n'a été restauré par-dessus. Les 12 scénarios sont relus tels qu'ils se présentent sur OVH.

## Tests

- Node `--check` OK sur backend, module d'en-tête, serveur et scripts.
- API privée : `GET` HTTP 200, `POST` à révision périmée **409**, placement hors du bandeau **422**, Origin externe **403** ; code affiché dans le studio HTTP 200.
- Le PNG transparent GIMP fournit les octets d'origine inchangés, et l'ancien accessoire `btcSymbol` reste présent dans les 12 scénarios.
- **Essai interactif réel Chrome Headless/Puppeteer sur OVH :** deuxième nœud DOM distinct, état initial masqué/non placé, clic Placer, déplacement souris et correction x/y, modification taille, annulation sans sauvegarde, enregistrement séparé, rechargement complet de la scène avec conservation position/taille et visibilité continue. Le projet a ensuite été **réinitialisé à « non placé »** pour laisser le choix au propriétaire ; le test n'a pas imposé d'emplacement.
- `boono-studio` redémarré seul et état **active** confirmé.
- **Contrôle final restant :** placer visuellement le logo à l’endroit désiré depuis le navigateur noVNC du propriétaire. Aucun emplacement n’est réputé approuvé avant sa sauvegarde.

## Mode d’emploi compact

Ateliers → Scénarios → Accessoires → **BTC · Logo permanent dans l’en-tête** → **Placer le logo dans l’en-tête**. Glisser le logo, régler éventuellement Taille/X/Y, laisser « Afficher le logo en permanence » coché puis **Enregistrer position**. Le bouton général « Enregistrer » concerne les postures et non ce logo.
