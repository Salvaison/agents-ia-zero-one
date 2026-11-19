# BOONO-TV — Logo BTC permanent flottant entre État vivant et loft

**Date :** 20 novembre 2026 (heure suédoise). **Décision :** OD-20261120-001. **Suite :** OD-20261119-009 et OD-20261119-010.

## Demande et décision

Le propriétaire n'est pas satisfait du logo permanent enfermé dans l'en-tête de l'État vivant. Il le souhaite **à cheval sur la frontière entre État vivant et loft, vers la mi-hauteur, et nettement plus grand**, tout en conservant le pouvoir de le positionner lui-même. Il exige aussi que ce logo permanent **reste distinct de l'ancien accessoire BTC · Symbole** soumis aux scénarios/postures.

**Solution déployée :** déplacer le **même second objet permanent** du conteneur `header.state-head` de 720 × 82 au conteneur général `#scene` de 1920 × 1080 ; accroître les limites de taille, ouvrir les coordonnées de la scène entière et permettre à l'image de chevaucher librement la frontière verticale x=720. Aucune nouvelle image n'est générée.

## Placement initial et personnalisation

La position réellement enregistrée avant ce chantier était `x=323, y=4, taille=78`, `placed=true`, `visible=true`. Ces données ont été **copiées intactes** dans `backups/20261120-btc-floating-logo/desk/btc-header-logo.json`.

Pour matérialiser le souhait explicitement exprimé, la nouvelle configuration active est :

- **X = 605**, **Y = 425**, **taille = 230 px**. Centre calculé : **x=720, y=540**. Le disque BTC recouvre ainsi 115 px de chaque côté de la séparation verticale et se trouve au milieu de la scène.
- Le logo est visible en permanence (`placed=true, visible=true`) sur les vues privées compatibles. Il est trois fois plus grand qu'avant, et sa position reste **provisoire** jusqu'au prochain ajustement personnel.
- Le curseur de taille va de **40 à 420 px** ; les coordonnées X/Y sont limitées à l'intérieur de la scène de 1920 × 1080, en tenant compte du diamètre choisi.
- Dans **Ateliers → Scénarios → Accessoires**, ouvrir **« BTC · Logo permanent flottant »**, cliquer **« Déplacer le logo sur la scène »**, glisser l'image n'importe où dans le loft ou l'État vivant, utiliser au besoin les contrôles de taille et X/Y puis **« Enregistrer position »**. **« Annuler le déplacement »** restaure la dernière configuration sans toucher à l'autre accessoire.
- Un guide vertical pointillé marque x=720 pendant le placement. Le déplacement tient compte du facteur d'échelle lorsque Chrome/noVNC n'affiche pas la scène à sa résolution native.

## Fichiers OVH modifiés

Racine : `/home/ubuntu/boono-tv-studio/runtime/boono-tv/`.

- `scene/btc-header-logo.js` : le logo est enfant direct du `#scene`, non du `header.state-head`. La logique de déplacement utilise `scene.getBoundingClientRect()` et les coordonnées 1920×1080, y compris en présence du scale CSS de la scène. Champs du Composer adaptés, nouvelle position provisoire par défaut.
- `scene/styles.css` : image permanente positionnée en absolu, `z-index:42` par-dessus les deux panneaux avec `pointer-events:none` hors édition ; poignées de déplacement actives uniquement lorsque l'éditeur est ouvert ; guide vertical x=720 en mode placement. Le texte de l'État vivant et les flux du loft ne sont pas recalculés.
- `btc-header-logo-config.js` : validation privée des nouvelles bornes (`40<=size<=420`, `x+size<=1920`, `y+size<=1080`). API, Origine, vérification de révision SHA et écriture atomique **inchangées**.
- `scene/index.html` : cache bust `btc-header-logo.js?v=OD20261120-001` et `styles.css?v=OD20261120-001`.
- `desk/btc-header-logo.json` : réglage initial repositionné explicitement x605, y425, size230. Modèle de fichier `version=1` inchangé.

**Inchangés :** sprite `#accessory-btcSymbol` et ses données par posture, PNG source privé `/api/private/boono-asset/btcSymbolAlpha` (SHA-256 `544a2403905008566f46784b9a18649dfe794197f44d8f1225847851a675e914`), flux vidéo, composition et perspectives des deux écrans, rotation, modules trading PAPER/Amsterdam.

## Sauvegardes et vérifications

Sauvegardes ciblées prises avant la modification :
`/home/ubuntu/boono-tv-studio/backups/20261120-btc-floating-logo/`. Elles comprennent ancien JS/CSS/index, ancien backend et la configuration **de l'utilisateur** de l'objet permanent.

- **Test réel Chrome/Puppeteer, scène 1920×1080** : parent DOM du logo `#scene`, image x605, y425, 230×230 ; frontière État vivant/loft à x720 ; il couvre correctement les deux côtés. La ressource d'image demeure privée et l'ancien accessoire BTC subsiste. Sur le rendu photographique observé, le logo orange se trouve effectivement sur la séparation.
- **Test d'interaction Chrome** : déplacement horizontal +80 et vertical −100, taille portée à 330 px, annulation ramenant à x605/y425/230. Ensuite sauvegarde d'un emplacement d'essai et rechargement complet du navigateur : x615/y320/330 retrouvés. **Retour automatique du test** au cadrage provisoire x605/y425/230 après validation et vérification de l'absence d'édition concurrente.
- **Test Chrome redimensionné 1366×768** : facteur de scène mesuré 0,7111. Un déplacement à l’écran de +56 px horizontal et −35 px vertical a produit des coordonnées logiques x684/y376 (au lieu de x605/y425), puis Annuler a restauré les valeurs enregistrées. Les contrôles restent ainsi utilisables sur un écran plus petit/noVNC.
- Vérification des limites de l'API : taille 421 px et débordement de scène rejetés par **HTTP 422**, révision périmée rejetée **409**, origine étrangère refusée **403** ; aucun de ces tests n'a altéré la configuration.
- Empreintes inchangées entre l'avant et l'après : `desk/dialogue-script.json` = `16d06458ccf7cc03efbb6e4c65b69840ead52a589119c1c37ec5825422054c6b` ; `desk/projection-config.json` = `7aaa265ef47ea0c1243e3d42c929debf0d9f1ba42dd2e6d243ba785d7e9e38c4`.
- `node --check` valide sur les JS touchés, service `boono-studio` redémarré seul et **active**, endpoint privé GET 200.

La source Vecteezy reste soumise à vérification de droits avant toute publication publique. Le studio privé fonctionne, sans revendication de droits de rediffusion.
