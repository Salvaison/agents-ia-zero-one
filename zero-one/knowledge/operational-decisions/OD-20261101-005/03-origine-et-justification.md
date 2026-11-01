# OD-20261101-005 — BOONO assis : géométrie et alpha de sept postures

## Motif

L'utilisateur valide la direction du jeu d'expressions de sept BOONO assis, puis exige deux corrections matérielles : (1) une géométrie convaincante face au grand établi encastrant deux écrans et (2) un détourage transparent réellement exploitable, sans mobilier peint ni artefacts visibles.

## Travail exécuté

Sur les images générées dans la conversation, un protocole de sélection assistée a produit sept découpes RGBA avec masque alpha correspondant, ainsi que des essais de superposition du BOONO sur la référence du bureau. Les essais ont **révélé un conflit de profondeur** : lorsque l'établi est correctement placé devant le personnage, son plateau masque le bas du torse et les mains censées agir sur les écrans.

Les fichiers et scripts, comprenant un ZIP vérifié, sont disponibles dans la conversation ; ils ne sont pas copiés dans Git ni sur OVH.

## Statut exact

**VALIDÉ** : direction visuelle mature du robot dans sept états ; nécessité des masques et de la perspective.

**RÉALISÉ / TESTÉ dans la conversation** : extractions, masques pixel identiques aux alphas, compositing de prévisualisation et manifeste.

**NON VALIDÉ POUR MISE EN SERVICE** : les sept sprites nécessitent encore des retouches manuelles des limites d'occlusion, des accessoires résiduels et surtout la création de véritables mains au premier plan avec ancres 3D cohérentes.

**AUCUNE intégration live** : pas de code studio ou runner modifié, pas d'écrasement de `projection-config.json`.

Les dimensions du bureau canonique (1536×1024 dans l'image) ne doivent pas être confondues avec le canvas de projection existant (1200×1080 sur OVH). Les quads en production sont conservés.
