# BOONO-TV — Recadrage complet de la scène V2 (1200 × 1080)

**1er novembre 2026 — revue de format, proportions et installation OVH**  
**Décision :** [OD-20261101-008](operational-decisions/OD-20261101-008/03-origine-et-justification.md)  
**Statut :** **nouvelle composition installée et chargée par le studio OVH**, tests techniques positifs, vérification visuelle finale de l'utilisateur encore ouverte.  
**Portée :** présentation audiovisuelle BOONO-TV, en lecture seule ; **aucune modification des moteurs PAPER d'Amsterdam**.

## 1. Observation déclenchante

À partir d'une capture ChromeOS de la scène du 1er novembre, le propriétaire apprécie le loft, l'établi, BOONO et le chat, mais constate que leur **cadrage commun** n'est pas cohérent. Il veut conserver l'établi compact à sa taille actuelle, adapter le fond à la surface verticale disponible, et réduire BOONO, orienté trois quarts à gauche avec priorité visuelle vers les écrans encastrés, plutôt que le faire dominer la pièce.

Le diagnostic technique confirme une erreur de proportion : l'illustration du loft 1536 × 1024 (ratio 3:2) était étirée à **1200 × 800** dans un espace de **1200 × 1080**, ce qui laissait **280 pixels de vide** en bas, visibles sur les côtés de l'établi. BOONO faisait encore 374 × 486 pixels d'espace de scène.

## 2. Les nouvelles images pleine scène

Les références artistiques approuvées restent **les mêmes** : chambre industrielle avec baie vitrée nord, batterie et instruments, posters Muddy Waters et Howlin' Wolf, salon vintage, établi de menuisier avec vis et ferrures, personnages mécaniques et chat noir.

Un outil de composition Python/Pillow/Numpy sur OVH génère **19 images PNG RGBA**, toutes de **1200 × 1080 pixels** :

| Ressources | Nombre | Travail effectué |
|---|---:|---|
| Loft nord, vitrages transparents | 1 | Géométrie supérieure et masque fenêtre préservés, sol complété vers le bas |
| Paysage de ville et paysage montagne | 2 | Fonds cadrés sur le même canevas |
| Établi canonique compact | 1 | **Échelle préservée**, pixels de décoration de bord supprimés sur le seul calque de bureau |
| BOONO assis | 10 | Même dessin source, taille réduite et ancrage uniformisé |
| Chat noir | 5 | Cinq PNG sur canevas commun, taille et ancrage déjà validés conservés |

Les sources ont été conservées sur OVH. Les nouvelles versions sont installées sous :

`/home/ubuntu/boono-tv-studio/runtime/boono-tv/assets/boonotv-v2-20261101/reframed-20261101/`

Leur [manifeste vérifiable](../boono-tv/scene-v2/reframed-20261101-manifest.json) consigne les dimensions, tailles, empreintes SHA-256 et positions. Les **19 fichiers** ont passé les contrôles de taille et hash.

**Important :** il s'agit d'un **recadrage et d'une recomposition de fichiers déjà retenus**, pas d'une régénération artistique des personnages ou du contenu de la chambre. Aucune modification intentionnelle de la physionomie du visage ou du regard n'a été effectuée.

## 3. Proportions et points d'appui

Le panneau droit conserve son espace **1200 × 1080**, associé au panneau d'État vivant 720 × 1080 dans la composition globale 1920 × 1080.

| Élément | Avant | Désormais |
|---|---|---|
| Fond du loft | 1200 × 800 avec 280 pixels manquants | **1200 × 1080, sans bande vide** |
| Établi | (140,465), 920 × 613 | **Inchangé** ; seule normalisation du fichier en plein canevas |
| BOONO | (440,230), 374 × 486 | **(483,342), 288 × 374** |
| Bas du canevas BOONO | y = 716 | **y = 716** (repère d'appui préservé) |
| Chat | (190,460), 230 × 184 | **Inchangé** |
| Projections gauche et droite | Matrices CSS sur les deux écrans compacts | **Inchangées**, pas de nouveau dérèglement de l'établi |

BOONO occupe désormais **77 % de la largeur/hauteur précédente**, mais ses doigts restent placés à hauteur des commandes. Cela améliore sa proportion dans le loft tout en lui conservant sa présence de robot mature.

Ses deux mains restent dans la **même couche que le personnage**, **au-dessus de l'établi et des deux projections** : aucune main supplémentaire séparée n'est introduite.

La perspective visuelle des postures est conservée à partir des sources approuvées (dont plusieurs vues trois quarts gauche). Une modification des pupilles et de la direction de ses yeux exigerait un travail d'illustration distinct ; le présent recadrage ne prétend pas l'avoir fait.

## 4. Adaptation du loft : méthode et réserve graphique

Le haut de l'illustration est conservé dans ses proportions : verrière, montants, mobilier et affiches ne sont pas étirés verticalement. Une **extension de sol** a été calculée avec une texture de béton/tapis du décor existant, pour compléter la partie inférieure de la pièce et supprimer les bandes bleu sombre.

La partie y = 0 à 700 du loft est préservée ; le raccord entre y = 700 et y = 760 est progressif. En-dessous, le sol est prolongé avec un échantillon du sol illustré en évitant de recopier les plantes et grandes flight cases sur les côtés.

**Réserve esthétique explicite :** ce prolongement du sol est une **retouche technique provisoire**. Ce n'est pas une image entièrement redessinée en perspective par un illustrateur ; des étirements de motifs de béton et de tapis peuvent rester visibles dans les coins inférieurs. Une extension artistique / outpainting parfaitement raccordée reste ouverte si la prévisualisation ne satisfait pas le propriétaire.

Les vitrages transparents et le paysage interchangeable restent opérationnels ; la transparence des vitres dans le haut de l'image n'a pas été supprimée.

## 5. Code, installation et retour arrière

Le studio OVH conserve ses scripts existants. Les fichiers suivants sont **mis à jour** dans :

`/home/ubuntu/boono-tv-studio/runtime/boono-tv/scene/`

- `build_reframed_scene.py` : script de fabrication des 19 PNG pleine scène à partir des sources approuvées.
- `boono-v2.css` : applique le loft, l'établi, BOONO et le chat au canevas 1200 × 1080 uniquement lorsque la classe `boono-reframed` est active ; n'altère pas les projections existantes.
- `boono-v2.js` : valide la présence du nouveau manifeste, précharge les images et active le nouveau cadrage. Si le jeu de ressources est incomplet, il revient au rendu V2 précédent.

Ces fichiers et le [manifeste des ressources](../boono-tv/scene-v2/reframed-20261101-manifest.json) sont copiés dans [`boono-tv/scene-v2/`](../boono-tv/scene-v2/README.md) dans Git, avec empreintes identiques à celles de l'installation OVH.

Les sauvegardes antérieures de la scène sont conservées dans :

`/home/ubuntu/boono-tv-studio/incoming/backup-boono-tv-20261101-before-reframing/`

**Contrôles d'affichage :**

- **Cadrage actuel :** `http://127.0.0.1:8310/?showcase=1`
- **Cadrage V2 précédent :** `http://127.0.0.1:8310/?showcase=1&reframeV1=1`
- **Scène historique :** `http://127.0.0.1:8310/?sceneV1=1`
- **Dix postures :** `?v2Pose=1` à `?v2Pose=10`
- **Paysage montagne :** `?v2Landscape=mountain`

Ces URLs sont à ouvrir dans le **Chrome distant d'Amsterdam**, via le tunnel noVNC, non comme liens externes publics.

## 6. Tests et conformité

**Vérifications réalisées :**

- 19 fichiers PNG produits, format 1200 × 1080 confirmé et empreintes SHA-256 concordantes.
- Masque de vitrage toujours transparent et zones de sol conservées opaques.
- Nouveau CSS et JavaScript syntaxiquement valides, servi en HTTP **200** par le studio.
- Chargement initial du script testé dans une simulation de DOM avec quatre cas : V2 reformatée par défaut ; V2 précédente ; ancienne scène ; posture 9 et paysage alternatif. Les quatre cas ont passé les assertions.
- Vraie capture MarketCipher du pont Amsterdam accessible en HTTP **200**.
- `/api/health` répond, le studio est **en lecture seule**, source Amsterdam active.
- `desk/projection-config.json` historique vérifié byte-identique à sa sauvegarde antérieure.
- Ancienne V2 et V1 conservées, sans écrasement de la composition historique.

**Non démontré :**

- Validation parfaite du rendu final dans le navigateur distant de l'utilisateur après cette dernière intervention.
- Qualité de retouche irréprochable du sol en bord de cadre.
- Suppression intégrale des petits fragments de chaise/brun restés dans **certaines silhouettes sources de BOONO**. Une première tentative automatique de détourage plus agressif a détruit des éléments métalliques et a donc été **rejetée** ; les silhouettes approuvées ont été conservées, sans falsifier leur qualité.

**Aucune modification** des runners de trading, des règles de risque, des ledgers PAPER, du tunnel de marché ou des données d'Amsterdam.

## 7. Prochain contrôle artistique

Le propriétaire peut maintenant comparer dans noVNC les deux cadrages et confirmer :

1. Que le loft remplit correctement sa surface sans déformation de l'architecture, tout en restant lisible derrière BOONO.
2. Que BOONO, plus petit, semble effectivement travailler **depuis le bord supérieur de l'établi** en manipulant les deux écrans.
3. Que les effets de masque, les contours et la transition de sol sont acceptables ou nécessitent une véritable phase de retouche artistique.

La présente intervention a pour effet une nouvelle **version de cadrage du studio**, pas une nouvelle identité graphique de BOONO.
