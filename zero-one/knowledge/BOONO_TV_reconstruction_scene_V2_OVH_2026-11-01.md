# BOONO-TV — Reconstruction V2 du studio OVH

**Rapport d'installation du 1er novembre 2026**  
**Opération :** [OD-20261101-006](operational-decisions/OD-20261101-006/03-origine-et-justification.md)  
**Statut :** **installé et servi par le studio sur OVH** ; tests d'intégrité, HTTP, code et source de marché réussis ; **contrôle visuel final du navigateur distant encore ouvert**.  
**Périmètre :** composition audiovisuelle en lecture seule — **aucune modification BOONOTRADE PAPER**.

## 1. Entrée et intention

Le propriétaire demande de reconstruire la scène BOONO-TV à partir des éléments graphiques retenus aujourd'hui, puis transmet l'archive par SCP depuis les Téléchargements ChromeOS vers OVH. La commande locale a terminé avec 100 % de transfert (environ 19 Mo). Les ressources ne transitent pas par le petit stockage Linux du Chromebook.

L'installation reprend :

- **La chambre canonique** : atelier industriel, très grande baie vitrée au nord, instruments/batterie, salon vintage et deux pochettes blues de **Muddy Waters** et **Howlin' Wolf** ; fenêtres transparentes et paysage interchangeable derrière.
- **L'établi canonique** : ancien établi de menuisier, ferrures et bordures de laiton, deux écrans encastrés, roue de contrôle et modules avant, enseigne BOONO TV, câbles et rack sous la table.
- **Le chat noir** : cinq postures découpées, indépendant du décor et de l'établi.
- **BOONO** : dix postures graphismes RGBA, dont sept associées aux états historiques et trois variantes supplémentaires ; tête vintage à face vissée, cuirasse et expressions matures, yeux dirigés parfois sur les écrans inclinés et parfois à gauche, à droite et autour de lui.

**Ordre de composition :** paysage → loft avec vitrages transparents → établi → deux surfaces de projection → BOONO et ses mains → chat, effets et bulles. Les **mains de BOONO sont dans sa couche au-dessus des écrans**, et non séparées en couches à raccorder.

## 2. Réception et validation des ressources

Archive de transfert :

`/home/ubuntu/boono-tv-studio/incoming/BOONOTV_v2_20261101_assets_et_apercus.zip`

**SHA-256 ZIP :** `4488b2a507ba59fc5cc7865e02f842d28e07c4eb6f0a8a175234aad8e2f3e5c2`.

Le ZIP comporte **33 entrées**, incluant 29 ressources dans `assets/`, un manifeste JSON et des aperçus. Le test ZIP complet ne signale aucune erreur.

Les **29 ressources** ont été installées dans :

`/home/ubuntu/boono-tv-studio/runtime/boono-tv/assets/boonotv-v2-20261101/`

Le SHA-256 et la taille de **chacune** des 29 ressources concordent avec le [manifeste archivé](../boono-tv/scene-v2/artwork-manifest.json).

**Limite intrinsèque du pack :** le manifeste signale explicitement que les masques BOONO proviennent d'un détourage automatique de la planche et ne sont pas tous retouchés manuellement à la perfection. Un artefact de bord demeure possible dans certains mouvements. Le remplacement des graphiques dessinés dans l'établi exige une calibration et le vrai flux projeté — c'est cette projection qui est installée.

## 3. Architecture technique en service

Studio historique : `/home/ubuntu/boono-tv-studio/runtime/boono-tv/`.

Les fichiers suivants ont été ajoutés, sans supprimer les anciens composants :

| Fichier OVH | Fonction |
|---|---|
| `scene/boono-v2.css` | Géométrie V2, ordre des couches, surfaces projetées et nouvelle mise en place du personnage |
| `scene/boono-v2.js` | Lecture du manifeste, préchargement, sélection automatique des postures et du chat, activation avec repli |
| `assets/boonotv-v2-20261101/*` | Assets image et manifeste de la nouvelle scène |
| `scene/index.html` (2 imports) | Ajoute les deux nouvelles ressources CSS/JS à la page historique |

**Copies sources Git :** [CSS](../boono-tv/scene-v2/boono-v2.css), [JavaScript](../boono-tv/scene-v2/boono-v2.js), [manifeste](../boono-tv/scene-v2/artwork-manifest.json). Les copies JS/CSS ont des empreintes **identiques** à celles des fichiers sur OVH, après vérification croisée.

Aucune modification du code de décision, des ledgers, des collecteurs d'Amsterdam, du serveur radio ni du service de studio n'a été nécessaire. Les imports sont servis immédiatement par le serveur Node déjà en cours d'exécution.

### Activation, repli et contrôles

- **Scène V2 :** activée par défaut si son manifeste et ses images nécessaires sont accessibles. Si la validation du pack échoue, la scène historique reste affichée.
- **Retour V1 par URL :** `?sceneV1=1` (aucune opération destructive).
- **Forçage d'une posture V2 :** `?v2Pose=1` à `?v2Pose=10`. Sans forçage, l'état visuel suit les sept postures du studio.
- **Choix d'un chat :** `?v2Cat=1` à `?v2Cat=5`, et `?v2Cat=0` pour le masquer. Par défaut, les cinq postures alternent lentement.
- **Décor montagne de démonstration :** `?v2Landscape=mountain` ; sans paramètre, le paysage initial reste visible derrière les vitrages.

Ces paramètres sont **uniquement graphiques** et n'interagissent pas avec les décisions de trading.

### Sept états historiques → dix dessins

| État historique | Ressource graphique V2 |
|---|---|
| WORKING | `boono_01_concentrated.png` |
| THINKING | `boono_02_thinking_left.png` |
| WORRIED | `boono_06_pause_right.png` |
| CONCENTRATED | `boono_08_verify_left.png` |
| CONFIDENT | `boono_07_idea.png` |
| OBSERVE | `boono_05_observe_right.png` |
| EXECUTE | `boono_03_right_finger_left_screen.png` |

Variantes supplémentaires `v2Pose=4` (main gauche ouverte), `v2Pose=9` (regard vers la fenêtre), `v2Pose=10` (détendu). La dénomination commerciale ou psychologique de ces états supplémentaires est encore à définir.

## 4. Géométrie : nouvel établi et surfaces réelles

Le studio demeure sur un **canvas de pièce de 1200 × 1080** à droite du panneau d'observation ; le dessin canonique de l'établi est ramené de 1536 × 1024 à **1200 × 800**, placé à `y=280`. Le loft est lui-même affiché à 1200 × 800, au-dessus du fond/paysage.

La géométrie préliminaire en coordonnées de la pièce :

- **Écran gauche — instruments internes :** TL (406,529), TR (679,579), BR (543,720), BL (245,626).
- **Écran droit — vraie capture TradingView/MarketCipher :** TL (748,614), TR (1147,706), BR (1051,958), BL (606,795).
- **BOONO :** sprite 374 × 486, position (440,125), en **z=12** devant le bureau et les surfaces vidéo.
- **Chat :** sprite 230 × 184, position (180,340), en **z=13**.

Les quads ont été estimés sur l'illustration canonique puis contrôlés dans une **simulation Chromium locale** aux dimensions 1200 × 1080 avec projection `matrix3d`. Les deux quadrilatères sont cohérents avec les contours des écrans de cette simulation. **Ce n'est pas encore une validation par capture du navigateur distant en cours.**

Le studio possède son éditeur de calibration historique. Son fichier vivant

`/home/ubuntu/boono-tv-studio/runtime/boono-tv/desk/projection-config.json`

a été **conservé byte pour byte**, les nouveaux quads étant propres à la composition V2. L'éditeur historique n'enregistre pas encore ces nouveaux quadrilatères dans un fichier V2 séparé. Les retouches fines et l'évolution éventuelle de l'éditeur restent ouvertes.

## 5. Préservation des flux et gouvernance

À la vérification :

- `127.0.0.1:3091` : studio Node répond, page HTML et nouveaux CSS/JS servis (`200`).
- `127.0.0.1:3309` : tunnel privé Amsterdam opérationnel.
- `/api/health` : sourceOnline=true.
- `/assets/desk-live/marketcipher-live.jpg` : HTTP `200`, capture non vide, 45 735 octets lors du contrôle.
- `/api/snapshot` : réponse avec `generatedAt`, `living`, `series` et `boono`.
- Le rôle **écran droit réel** de MarketCipher est préservé. Le bridge peut indiquer des métadonnées divergentes entre TF affichée et TF réellement capturée (au contrôle `tf=3` et `actualTf="15"`) : incident à diagnostiquer indépendamment ; cette reconstruction ne modifie pas la capture.
- Les anciens fichiers, projections, états de BOONO et contenus sont conservés pour revenir à V1.

Le masque du loft et les sprites BOONO ont été préchargés par le script V2 avant activation. La **frais de données** et la licence de redistribution restent les responsabilités du flux de publication existant, pas du visuel dessiné.

## 6. Sauvegarde et retour arrière

Avant changement, les fichiers HTML, CSS, JS, serveur et configuration de projection ont été copiés dans :

`/home/ubuntu/boono-tv-studio/incoming/backup-boono-tv-20261101-before-v2/`

**Retour sans serveur :** ouvrir la page avec `?sceneV1=1`.  
**Retour permanent :** retirer les deux lignes d'import `boono-v2.css` / `boono-v2.js` de `scene/index.html` en rétablissant le fichier `index.html` sauvegardé ; les anciens assets n'ont pas été écrasés. Un redémarrage ne doit pas être nécessaire pour le simple HTML statique.

## 7. Statuts vérifiables et travaux ouverts

| Élément | Statut |
|---|---|
| Réception archive et vérification SHA | **VÉRIFIÉ** |
| Installation des 29 ressources V2 | **RÉALISÉ** |
| Sauvegarde avant modification | **RÉALISÉ** |
| Scripts/css V2 + imports et retour V1 | **RÉALISÉ** |
| Identité de l'état et 10 postures consultables | **CODE INSTALLÉ** ; contrôle navigateur utilisateur à confirmer |
| Deux écrans, projection géométrique approximée | **CALCULÉ ET TESTÉ EN SIMULATION** |
| Liaison studio → Amsterdam et capture visuelle | **VÉRIFIÉE** |
| Visuel sans aucun halo/détourage résiduel | **NON DÉMONTRÉ** |
| Calibrage visuel exact à la main dans le navigateur remote | **OUVERT** |
| Nouveau paysage animé, météo, variations lumière | **NON RÉALISÉ**, deux couches statiques/démonstration seulement |
| Moteurs PAPER, ordres, risk et ledgers | **INCHANGÉS** |

**Prochaine vérification utile :** inspecter la nouvelle scène dans le Chrome distant d'Amsterdam, via le tunnel privé `127.0.0.1:8310`, comparer au modèle de perspective, relever les raccords des mains, de la tête, du chat et des bordures d'écrans, puis corriger seulement la configuration graphique V2.

Le commit de ce rapport fournit une preuve documentaire de l'installation observée, pas une certification de qualité de diffusion publique.
