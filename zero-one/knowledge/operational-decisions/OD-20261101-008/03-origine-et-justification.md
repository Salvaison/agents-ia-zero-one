# OD-20261101-008 — Reformatage de la scène BOONO-TV au canevas 1200×1080

## Origine et diagnostic

À partir de sa capture noVNC, le propriétaire se dit satisfait des objets graphiques construits le 1er novembre, mais constate qu'ils n'ont pas les bonnes proportions de composition. Le loft original est en 1536×1024 et était affiché comme 1200×800 dans une pièce de **1200×1080**, produisant une grande bande vide inférieure. L'établi compact a désormais la bonne taille. BOONO reste trop grand, malgré son inclinaison trois quarts gauche et son attention sur les deux écrans.

Le propriétaire demande de **refaire le cadrage et les proportions des ressources**, sans reprendre leur identité artistique validée.

## Décisions et limites

- **Validé** : conserver l'échelle de l'établi, réduire BOONO, reformatter toute la chambre en hauteur et maintenir des couches séparées.
- **Fait sur OVH** : construction de 19 nouveaux PNG pleine scène (loft RGBA transparent, paysage original, paysage montagne, bureau, dix poses BOONO, cinq poses chat), chacun 1200×1080 avec ancre et taille explicites.
- **Calage** : établi 920×613 à (140,465) inchangé ; BOONO 288×374 à (483,342), fond des mains proche de y716 ; chat 230×184 à (190,460), déjà présent à cette taille.
- **Couches** : paysage → loft → établi → projections live → BOONO/mains → chat/FX ; aucune double table peinte par le script de reformatage.
- **Fait sur OVH** : nouveau pack de 19 images sous `assets/boonotv-v2-20261101/reframed-20261101`, CSS/JS adaptés et deux retours arrière : `?reframeV1=1` et `?sceneV1=1`.
- **Vérifié** : manifest des 19 empreintes, géométrie et alphas, état du service HTTP et de la capture MarketCipher. Quatre essais unitaires avec faux DOM confirment sélection du nouveau pack, ancien pack, scène V1 et variante de pose.
- **Travaux ouverts** : prolongement inférieur du sol généré à partir de son propre motif, mais sans outpainting artistique final ; vestiges de dossier brun dans certains sprites BOONO issus des planches initiales, non corrigés automatiquement pour ne pas détruire les parties métalliques.
- **Non autorisé et non fait** : altérer les décisions de BOONOTRADE, les trades PAPER, l'état de risque, les collectors, la calibration historique des quads d'écrans ou les services Amsterdam.

## Provenance

Message utilisateur intégral en document 01, mission rétrospective en document 02, présente explication en 03. Les aperçus statiques de contrôle sont présents sur OVH ; aucun certificat de perfection graphique n'est établi tant que l'utilisateur n'a pas contrôlé le rendu dans noVNC.
