# BOONO-TV — Sept postures assises : masquage et perspective de l'établi

**1er novembre 2026 — prototype de fabrication, revue technique**  
**Registre :** [OD-20261101-005](operational-decisions/OD-20261101-005/03-origine-et-justification.md)  
**Sources :** [Personnage BOONO canonique](BOONO_identite_visuelle_mecanique_personnalite_v1_2026-11-01.md) · [Établi canonique](BOONO_TV_bureau_ordinateur_reference_canonique_2026-11-01.md) · [Loft canonique](BOONO_TV_chambre_canonique_vitrages_paysages_2026-11-01.md)

## 1. La demande validée

L'utilisateur confirme l'apparence et la maturité des **sept attitudes assises** de BOONO, mais relève que leur image d'origine comporte un mobilier répété et des formes en perspective incompatibles avec l'établi canonique. Il demande des **silhouettes réellement séparées de leur fond** et une géométrie adaptée au décor de BOONO-TV, sans artefacts.

Le personnage conserve ses caractéristiques établies : tête large, légèrement rectangulaire, quatre vis, bord supérieur des cavités oculaires servant d'arcades, yeux ivoire asymétriques, petite pupille noire, bouche mécanique large, antenne et oreillettes rouges, cuirasse vintage bleu acier entretenue, attitude mature et analytique.

## 2. Les sept états du casting

| État BOONO-TV | Expression / activité voulue | Code |
|---|---|---|
| WORKING | Travaille, posture attentive devant les données | 01 |
| THINKING | Met en concurrence les hypothèses, main près du visage | 02 |
| WORRIED | Inquiétude devant une objection, regard ouvert/asymétrique | 03 |
| CONCENTRATED | Regard resserré sur un problème, peu de gestes | 04 |
| CONFIDENT | Confiance mesurée, sans mimique infantile | 05 |
| OBSERVE | Attention à un événement nouveau, vigilance | 06 |
| EXECUTE | Décision active, geste contrôlé | 07 |

La source générée représente **BOONO avec un faux ordinateur, des tasses, une chaise et une table** dans chaque état. Ces objets ne doivent pas être réutilisés comme un second bureau dans le studio.

## 3. Travail de découpe effectué

Un jeu de sept **PNG RGBA 640 × 560**, sept **masques grayscale 640 × 560** et sept vues natives a été généré à partir de la planche de personnages. Chaque masque grayscale est identique, pixel par pixel, au canal alpha du PNG correspondant. Les sprites ont un ancrage commun **(320, 520)**, à considérer comme origine de composition et non coordonnée validée dans OVH.

Un programme OpenCV/PNG a été employé avec masquage guidé, suppression des zones de décor et des composants isolés, et anti-aliasing. Un kit ZIP comprend les sprites, masques, manifest, script et aperçus.

**Livraison locale dans la conversation :** `BOONO_TV_7_postures_sprites_masques_et_perspective_v1.zip`.  
**Intégrité ZIP :** SHA-256 `55856831c3352976d6bcc3ef0d3bb51aa151a59b4e7567bd628e58ab16e0cc7c`, contrôle d'archive réussi.

**Qualification impérative : prototype.** Quelques attaches de siège/accessoire peuvent encore subsister près des épaules ; les bas de torse et avant-bras sont tronqués en vue de leur occultation par le bureau. Le cinquième état contient une tasse tenue par BOONO, à séparer si son animation est désirée. Les découpes ne sont pas encore certifiées **sans artefact** et ne doivent pas remplacer les fichiers d'exploitation.

## 4. La géométrie et le résultat du test de perspective

La référence artistique du bureau est une image **1536 × 1024** montrant un grand plateau de menuisier en trois quarts, une roue centrale et deux écrans vissés en laiton. Le studio BOONO-TV sur OVH utilise un canvas de référence **1200 × 1080** et des surfaces de projection `left.quad` et `right.quad` personnalisées dans :

`/home/ubuntu/boono-tv-studio/runtime/boono-tv/desk/projection-config.json`

Cette configuration a été **lue sans modification** pour confirmer que les coordonnées de l'ancienne scène existent et ne doivent pas être remplacées à l'aveugle.

Un essai de calage et un masque schématique de la partie avant de l'établi montrent que placer BOONO derrière la tablette préserve un ordre de profondeur plausible **mais cache la partie basse de son torse et les mains**. Un unique PNG de BOONO et ses accessoires ne peut pas résoudre ce problème.

### Solution de composition en couches

1. Paysage interchangeable derrière les fenêtres.
2. Loft industriel transparent aux vitres.
3. BOONO — **tête et corps** derrière la profondeur de l'établi.
4. Établi fixe, ferrures, écrans encastrés et contenu de projection live.
5. **Mains/avant-bras autonomes** devant le bord des écrans, avec point d'attache et perspective réglés pour chaque posture. Ne pas repeindre le faux ordinateur de la source.
6. Chat, autres accessoires et effets/bulles indépendants.

**Point technique important :** les mains ne sont pas encore produites comme couches réellement raccordées et sans artefact ; elles demandent retouche/dessin et calibration. Les essais de perspective fournis sont **maquettes visuelles**, pas un rendu exact de la scène en service.

## 5. Réalisation, limites, décisions

| Objet | Statut |
|---|---|
| Sept silhouettes BOONO en PNG RGBA | **PROTOTYPE RÉALISÉ** |
| Sept masques alpha égaux aux PNG | **TEST AUTOMATISÉ RÉUSSI** |
| Prévisualisation sur le vrai dessin de l'établi | **TEST INDICATIF RÉALISÉ** |
| Cohérence du visage et des expressions | **Direction artistique approuvée** ; détails encore à confirmer |
| Masquage totalement sans artefact | **NON ATTESTÉ** ; reste travail manuel |
| Avant-bras/mains raccordés aux écrans en perspective | **NON RÉALISÉ** |
| Calage réel du studio à 1200 × 1080 | **OUVERT** |
| Copie des sprites sur OVH, intégration, redémarrage | **NON RÉALISÉS** |
| Modification du moteur PAPER, des trades ou de MarketCipher | **AUCUNE** |

## 6. Prochaine fabrication nécessaire

Réaliser **une seule posture de référence** (WORKING) avec trois calques propres : silhouette derrière l'établi, main gauche au premier plan et main droite au premier plan. Fixer les ancres, l'échelle et l'occlusion sur l'image canonique du bureau, puis vérifier le rendu à la taille cible du studio. Répliquer ensuite cette même géométrie pour les six autres états.

Les illustrations et leur transparence sont des actifs de BOONO-TV, pas des outils de décision du moteur : toutes les interfaces média doivent rester en lecture seule.

## 7. Provenance

Demande et validation utilisateur intégrales dans [OD-20261101-005](operational-decisions/OD-20261101-005/03-origine-et-justification.md). Ce rapport consigne les fichiers produits et leurs limites ; **il ne constitue ni une validation de mise en service ni un déploiement du nouveau casting**.
