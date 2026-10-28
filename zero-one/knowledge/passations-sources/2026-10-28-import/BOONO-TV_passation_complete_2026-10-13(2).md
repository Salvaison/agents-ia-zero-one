# PASSATION BOONO-TV — Architecture visuelle, références et intégration technique
**Date : 13 octobre 2026**  
**Projet : BOONO / BOONO Systems**  
**Objet : passation exhaustive de la discussion BOONO-TV et de la plateforme de mise en scène live**

---

# 1. Objet de cette passation

Cette passation documente l’état actuel du chantier **BOONO-TV** après la phase de conception visuelle et de prototypage technique conduite entre le 11 et le 13 octobre 2026.

Le point fondamental à retenir est que BOONO-TV n’est plus pensé comme une simple image composite ou comme un écran de dashboard.

BOONO-TV devient un **moteur de mise en scène live** :

- BOONO est un personnage/mascotte autonome ;
- le loft est un décor interchangeable ;
- les données de marché deviennent des plans visuels indépendants ;
- le bureau contient deux surfaces de projection ;
- les bulles, expressions, postures et mouvements sont des couches séparées ;
- le moteur BOONO réel continue d’alimenter la scène via son état vivant ;
- MarketCipher peut être capturé depuis TradingView et projeté dans le décor ;
- les illustrations actuelles ne sont que des **placeholders techniques** destinés à être remplacés sans modifier l’architecture.

La plateforme doit donc permettre, à terme, de remplacer entièrement les dessins de BOONO, du bureau et du loft sans refaire les mécanismes de données, de projection, de masquage ou de mise en scène.

---

# 2. Principe éditorial validé

Le système repose sur trois niveaux de lecture :

> **État vivant = ce que BOONO comprend / décide**  
> **Vagues = ce que BOONO voit**  
> **BOONO-TV = mise en scène pédagogique des deux**

La formulation retenue pour le flux décisionnel reste :

> **MCB propose → structure situe → marché traduit → BOONO décide**

BOONO-TV doit rendre ce fonctionnement visible sans prétendre transformer BOONO en “IA bavarde”.

BOONO est un bot déterministe, analytique, HPI, parfois drôle ou existentiel, mais jamais un personnage générique ou mignon.

---

# 3. QUI est BOONO — image canonique

## 3.1 Référence principale

La référence identitaire la plus importante est :

`00_references/BOONO_mugshot_CANONICAL.png`

Cette image est considérée comme l’image qui a révélé **QUI est BOONO** après plusieurs mois de développement du système.

Elle ne doit pas être comprise comme une scène définitive de BOONO-TV, mais comme la **référence de personnage canonique**.

### Ce qu’elle fixe

BOONO est :

- un robot mécanique bleu / métal patiné ;
- de construction carrée et robuste ;
- avec de grands yeux ronds très expressifs ;
- avec une antenne terminée par une boule rouge ;
- avec rivets, rayures, usure, joints mécaniques et câbles visibles ;
- techniquement brillant mais psychologiquement soumis aux paradoxes de la probabilité ;
- sujet à des tics, ruminations, “and if…”, scénarios multiples ;
- drôle sans être cartoon enfantin ;
- vulnérable intellectuellement mais jamais idiot ;
- le symbole de BOONO Systems.

### Pourquoi cette image a été retenue

Elle est issue directement du travail réel du bot et matérialise :
- son rapport aux probabilités ;
- ses scénarios concurrents ;
- ses interrogations sur le risque ;
- son obsession du contexte ;
- le conflit entre déterminisme et incertitude.

Toute future redéfinition graphique de BOONO doit rester reconnaissable par rapport à cette identité.

---

# 4. Les trois grandes images de référence BOONO-TV

La bibliothèque canonique actuelle contient notamment :

`00_references/BOONOTV01_states_and_layers.png`  
`00_references/BOONOTV02_character_attitudes.png`  
`00_references/BOONOTV03_master_composition.png`

Ces trois images ont des rôles différents.

---

## 4.1 BOONOTV01 — états et principes de découpage

### Rôle

BOONOTV01 a servi à démontrer :
- plusieurs états émotionnels / comportementaux de BOONO ;
- l’idée de découpage en couches ;
- la relation entre décor, bureau, personnage et HUD ;
- la possibilité de conserver un cadrage constant tout en changeant l’attitude de BOONO.

### États représentés

Les 7 états retenus sont :

1. `WORKING`
2. `THINKING`
3. `WORRIED`
4. `CONCENTRATED`
5. `CONFIDENT`
6. `OBSERVE`
7. `EXECUTE`

### Limite importante

Les petites vignettes de BOONOTV01 ont été utilisées trop tôt comme images de production.

Elles ont alors été agrandies, ce qui a provoqué :
- du flou ;
- des crops trop serrés ;
- des changements de cadrage involontaires ;
- une sensation de zoom à chaque changement de pose.

**Décision :**
BOONOTV01 reste une **référence d’attitudes et d’architecture**, pas un fond plein écran de production.

---

## 4.2 BOONOTV02 — langage corporel

### Rôle

BOONOTV02 sert principalement de référence pour :
- posture ;
- direction du regard ;
- attitude corporelle ;
- relation des bras et des mains au bureau ;
- tics visuels ;
- symboles de pensée, surprise ou tension.

Cette image est importante parce que les futurs états de BOONO ne doivent pas être réduits à :
- un changement de bulle ;
- un changement de couleur ;
- un simple FX.

La posture elle-même doit changer.

---

## 4.3 BOONOTV03 — composition maître

### Rôle

BOONOTV03 a été retenue comme référence principale de **mise en scène générale** :

- loft industriel ;
- grande profondeur de pièce ;
- BOONO au centre / premier plan ;
- grande table de travail ;
- deux écrans tactiles horizontaux ;
- console centrale / sliders ;
- clavier ;
- accessoires ;
- chat ;
- lumière chaude ;
- panneau BOONO-TV LIVE ;
- beaucoup d’espace disponible derrière le personnage pour des plans de données flottants.

### Pourquoi cette composition a été choisie

Parce qu’elle montre simultanément :

- **qui travaille** : BOONO ;
- **où il travaille** : le loft ;
- **avec quoi il travaille** : son bureau / ses écrans ;
- **comment montrer ce qu’il voit** : projections dans la profondeur de la pièce.

### Limite de BOONOTV03 originale

L’image contenait déjà des panneaux `BTCUSDT` / `MarketCipher` peints dans le décor.

Ils entraient en conflit avec les futurs panneaux live.

Une nouvelle base plus propre a donc été créée et installée comme fond provisoire.

---

# 5. Bibliothèque visuelle canonique

Le pack principal transféré sur Amsterdam est :

`BOONO-TV_visual_assets_v1.zip`

SHA-256 validé de bout en bout :

`b823a4a50c7768c8bbe4c66971c19295ccc842dba60d565c75d312e8102968b2`

Contenu validé :
- 40 éléments ;
- 34 images ;
- 4 SVG statiques contrôlés ;
- références ;
- états ;
- bulles ;
- compositions.

La bibliothèque est montée sur Amsterdam sous :

`/srv/boono-tv-visual-library/releases/v1-b823a4a5`

et exposée dans BOONO-TV par :

`boono-tv/assets/library`

---

# 6. Backplates / décors

## 6.1 Fond propre

Un premier fond nettoyé a été créé :

`boonotv_clean_loft_1200x1080.webp`

Release :

`bg-20261012-03233fb2`

SHA-256 :

`03233fb22f822966cbc10b193b962d136f79c395c113ef6876faec34e71889b9`

---

## 6.2 Loft vide

Pour permettre le véritable compositing, un backplate sans BOONO/bureau a ensuite été créé :

`boonotv_empty_loft_1200x1080.webp`

Release :

`bg-empty-20261012-24dc69b8`

SHA-256 :

`24dc69b8683ef0cbe2633d42eb0f912543af51ec5d83d0a1fb7b925922db52b8`

### Pourquoi ce fond vide est essentiel

Il permet d’obtenir une vraie hiérarchie :

```text
LOFT VIDE
   ↓
DATA
   ↓
BUREAU
   ↓
PROJECTIONS ÉCRANS
   ↓
BOONO / MAINS
   ↓
FX
   ↓
BULLES
```

Le décor n’impose donc plus le personnage ni les écrans.

---

# 7. Architecture générale BOONO-TV

La scène finale cible 1920×1080.

## 7.1 Découpage principal

### Gauche : État vivant

Environ 720 px de large.

Il reste fixe et dense.

Il contient les quatre blocs :

1. THÈSE / MCB
2. STRUCTURE / POSITION
3. CONVERSION / COMBAT
4. DÉCISION / RISQUE

### Droite : scène BOONO

Environ 1200×1080.

Cette zone contient :

```text
BACKGROUND
DATA PLANES
DESK
DESK PROJECTIONS
BOONO
EXPRESSION FX
SPEECH
```

---

# 8. Hiérarchie de profondeur actuelle

La hiérarchie technique retenue est :

```text
z≈1   Loft / décor

z≈6-9 Plans de données :
       - Prix
       - Vagues
       - Audit

z=10   Bureau physique

z=11   Projections écrans

z=12   BOONO + mains

z=14   Expression FX

z=20+  éléments de scène

z=30   Bulles / speech
```

Cette séparation est fondamentale.

Elle permet par exemple :
- à une main de passer devant MarketCipher ;
- à MarketCipher de changer sans changer le dessin du bureau ;
- à BOONO de changer de posture sans modifier les graphes ;
- aux bulles de changer indépendamment.

---

# 9. Market Curtain / Vagues

Le renderer partagé existe dans :

`shared/boono-chart-renderer.js`

Il est utilisé par :
- la page Vagues ;
- BOONO-TV.

Cela évite deux moteurs graphiques divergents.

## 9.1 Rôle du plan Vagues

Le plan Vagues doit montrer les vitesses lentes / structurelles :

- Wave15 ;
- Wave3.

Le prix a finalement été séparé de ce plan.

## 9.2 Style TV_NEON validé

Le thème TV actuel est destiné à devenir :

- fond transparent ;
- BW cyan épais ;
- LBW blanche 1 px ;
- VWAP cyan plus légère ;
- MF très léger ;
- zéro MCB bleu vif ;
- halos discrets ;
- labels cyan ;
- perspective forte.

### Épaisseurs actuelles cibles

- BW : ≈ 2.8 px + halo cyan ;
- LBW : **1 px blanc** ;
- VWAP : ≈ 1.6 px ;
- zéro MCB : **4 px bleu `#006cff` + halo** ;
- MF edge : ≈ 1.4 px.

## 9.3 Perspective

Le plan Vagues est projeté via `matrix3d`.

La géométrie a été accentuée pour mieux suivre les lignes de fuite de la pièce.

Le principe n’est pas de découper un rectangle en trapèze, mais d’appliquer la transformation au conteneur complet :
- lignes ;
- labels ;
- zéro ;
- Wave15 ;
- Wave3.

---

# 10. Panneau PRIX indépendant

Le prix a été extrait du Market Curtain.

## Rôle

Le panneau prix doit devenir :
- spectaculaire ;
- lisible ;
- proche ;
- tactique ;
- libre de se déplacer indépendamment.

Il montre :

- environ 3 heures ;
- bougies 3m ;
- ≈ 60 bougies ;
- bougies cyan épaisses ;
- MA200 rouge/verte.

Il peut être positionné librement dans la scène.

La cible actuelle est d’amener la dernière bougie / le dernier prix à une hauteur proche de la bouche de BOONO.

---

# 11. AUDIT

L’AUDIT existe encore comme panneau transparent.

La prochaine évolution validée conceptuellement est un **Audit crawl perspectif**.

## Idée

Les événements apparaissent :
- gros ;
- en bas / avant-plan ;
- puis remontent et s’éloignent ;
- rétrécissent ;
- perdent leur alpha ;
- disparaissent au loin.

Référence visuelle :
un crawl spatial de type générique de science-fiction.

## Intention

L’AUDIT ne doit pas devenir un troisième tableau permanent.

Il doit être :
- fugace ;
- événementiel ;
- profond ;
- peu intrusif.

Les trois plans ont donc des fonctions différentes :

> PRIX = mouvement proche  
> VAGUES = contexte structurel  
> AUDIT = mémoire fugace

---

# 12. Bulles

Quatre familles ont été créées :

- `thought`
- `exclamation`
- `affirmation`
- `announcement`

Les assets existent en PNG / SVG.

## Logique

La bulle est choisie à partir de l’état réel de BOONO.

Une fonction unifiée associe :
- type de bulle ;
- texte.

Cela évite un texte “J’OBSERVE” dans une bulle d’affirmation.

## Positionnement

La géographie a été plusieurs fois ajustée.

L’idée actuelle :
- certaines bulles d’analyse/réflexion peuvent apparaître à droite ;
- certaines alertes/actions à gauche ;
- leur queue doit pointer vers BOONO ;
- elles ne doivent jamais agir comme un bandeau au-dessus du personnage.

Les futurs dessins pourront fournir des bulles plus cohérentes.

---

# 13. Expression FX

Décision importante :

Les petits signes graphiques ne doivent plus être cuits dans l’illustration.

Exemples :
- `...`
- `?!`
- traits d’énergie ;
- ✓ ;
- halos ;
- scan ;
- vibrations.

Ils deviennent une couche :

`expression-fx`

Avantage :
- animation possible ;
- apparition/disparition ;
- synchronisation avec état ;
- réutilisation sur plusieurs postures.

---

# 14. Les 7 états de BOONO

Les états logiques validés sont :

```text
WORKING
THINKING
WORRIED
CONCENTRATED
CONFIDENT
OBSERVE
EXECUTE
```

## 14.1 Mapping déterministe

Le système réel utilise déjà `poseFor(s)` pour déduire l’état à partir de :

- action V4 ;
- position ouverte ;
- contradiction ;
- marché ;
- PM ;
- ticker ;
- setup ;
- maturité MCB.

## 14.2 Bibliothèque de postures existante

Les images :

`assets/library/03_states/tv_1200x1080/*.webp`

contiennent de vraies variations corporelles :

- WORKING : penché au travail ;
- THINKING : main au menton ;
- WORRIED : mains sur la tête ;
- CONCENTRATED : regard serré ;
- CONFIDENT : pouce levé ;
- OBSERVE : tourné vers les écrans ;
- EXECUTE : penché vers le bureau.

Ces images servent aujourd’hui à démontrer la capacité de la plateforme.

Elles seront **entièrement redessinées plus tard**.

## 14.3 SHOWCASE

Un mode de démonstration a été créé :

`?showcase=1`

Il fait défiler toutes les 4 secondes :

```text
WORKING
→ THINKING
→ WORRIED
→ CONCENTRATED
→ CONFIDENT
→ OBSERVE
→ EXECUTE
→ boucle
```

Paramètres de test :

`showcaseStart=0..6`

`showcaseHold=1`

Touches clavier :
- 1 à 7 : force un état ;
- 0 : retour auto.

## 14.4 Rôle du SHOWCASE

Le SHOWCASE sert à démontrer que l’on peut modifier ensemble :

- posture ;
- illustration ;
- FX ;
- bulle ;
- contenu écran gauche.

Les données de marché restent live derrière.

---

# 15. Masques

Plusieurs générations de masques ont été créées pendant les tests.

Les premiers masques utilisaient des alphas imparfaits et contenaient :
- vieux HUD ;
- ghost BOONO ;
- fragments de panneaux.

Ils ont ensuite été nettoyés.

Versions principales :
- mask v1 ;
- mask v2 ;
- mask v3 clean desk ;
- mask v4 clean desk final ;
- mask v5 main component.

## Principe définitif

Le futur pipeline doit être :

```text
foreground final
      ↓
alpha
      ↓
mask généré automatiquement
```

Il ne faut pas peindre les masques manuellement.

Avec 30 ou 100 poses, chaque état doit avoir :

```text
state/
  foreground.webp
  mask.png
  expression-fx.json
```

---

# 16. desk-projection-engine

Le moteur de projection du bureau est désormais construit.

Chemin :

`boono-tv/desk/`

Fichiers principaux :

`desk-capture-daemon.js`  
`projection-config.json`  
`README.md`

Processus PM2 :

`boono-desk-capture`

Statut lors du déploiement :
- online ;
- 0 restart au moment du contrôle.

---

# 17. Architecture du bureau

Le bureau est désormais séparé du personnage.

Hiérarchie :

```text
BUREAU PHYSIQUE
      ↓
ÉCRANS PROJETÉS
      ↓
BOONO + MAINS
```

Cela permet :
- à la main de passer devant l’écran ;
- au contenu d’écran de changer sans changer le bureau ;
- à une future animation de doigt d’être synchronisée avec un changement de vue.

---

# 18. Écran droit — MarketCipher LIVE

Décision finale de disposition :

> **MarketCipher LIVE = écran droit**

Le système utilise l’onglet TradingView déjà authentifié dans Chromium Amsterdam.

Onglets détectés :
- TradingView 3m ;
- TradingView 15m ;
- autres onglets BOONO.

Le daemon capture uniquement le panneau MarketCipher.

## Crop actuel

Environ :

`1195 × 165 px`

depuis la zone basse du TradingView 3m.

## Cadence normale

> **1 capture toutes les 10 secondes**

C’est considéré largement suffisant visuellement.

## Fichiers runtime

`boono-tv/assets/desk-live/marketcipher-live.jpg`

`boono-tv/assets/desk-live/marketcipher-3m.jpg`

`boono-tv/assets/desk-live/marketcipher-15m.jpg`

`boono-tv/assets/desk-live/state.json`

---

# 19. Roll-over multi-timeframe

Le système supporte un mode accéléré.

Commande :

`boono-desk-rollover 18`

Exemple observé :

```text
3m
→ 15m
→ 3m
→ 15m
→ retour 3m
```

Cadence pendant roll-over :

≈ 1.8 seconde.

Après expiration :
retour automatique à 3m / 10 s.

## Intention

Quand BOONO effectue visuellement un contrôle multi-timeframe :

- il regarde l’écran ;
- éventuellement touche l’écran ;
- MarketCipher bascule entre TF ;
- le spectateur voit BOONO “roll-over” ses horizons.

---

# 20. Écran gauche — surface BOONO

Décision finale :

> **Écran gauche = projection BOONO / scénographique**

Modes existants :

- `indicator`
- `scenario`
- `risk`
- `trade`
- `art`

Le contenu est volontairement léger.

Il n’est pas nécessaire de faire tourner une vraie application complète.

Le spectateur doit seulement comprendre ce que BOONO consulte.

### Mapping automatique de base

```text
WORKING       → indicator
THINKING      → indicator
WORRIED       → risk
CONCENTRATED  → scenario
CONFIDENT     → scenario
OBSERVE       → indicator
EXECUTE       → trade
```

Override possible par URL.

---

# 21. Interaction future de BOONO avec les écrans

Le moteur prépare une animation de type :

```text
BOONO regarde écran
      ↓
bras se déplace
      ↓
doigt touche surface
      ↓
screenMode change
      ↓
nouvelle projection
```

Il n’est pas obligatoire que le clic soit techniquement un vrai clic.

La synchronisation visuelle suffit.

Plus tard :
- Blender ;
- séquences pré-rendues ;
- sprites / poses ;
- interpolation ;
- timing.

---

# 22. Mode calibration du bureau

Paramètre :

`?deskCal=1`

Il permet d’afficher les quadrilatères des surfaces.

La géométrie est stockée dans :

`boono-tv/desk/projection-config.json`

Ceci est crucial pour le futur redessin du bureau :
- on remplace l’illustration ;
- on redéfinit quatre coins ;
- le moteur continue de fonctionner.

---

# 23. Transfert d’images vers Amsterdam

Le chantier a nécessité la création d’une passerelle SFTP sécurisée.

Utilisateur :

`boonoassets`

Flux :

```text
Chromebook
   ↓ SFTP
/incoming/staging/...
   ↓ rename atomique
/incoming/ready/...
   ↓ validation
archive
```

## Validation

Contrôles :
- SHA-256 ;
- type ;
- dimensions ;
- contenu ZIP ;
- image valide ;
- SVG statique sûr.

Les SVG sont refusés s’ils contiennent :
- script ;
- foreignObject ;
- JS ;
- événement on... ;
- URL externe ;
- contenu actif.

## Marqueur atomique

Même le `.sha256` doit suivre :

```text
staging/file.sha256.part
→ rename
ready/file.sha256
```

Un défaut initial de lecture prématurée du marqueur a été corrigé.

Commit passerelle :

`771b765 — Make BOONO upload commit markers atomic`

Autre commit :

`37f09b2 — Validate safe static SVG assets in BOONO gateway`

---

# 24. Relation avec la page Vagues

La page Vagues a été fortement simplifiée.

Elle contient :
- Prix BTCUSDT ;
- Wave15 ;
- Wave3 ;
- FLOW / AUDIT.

Le renderer partagé est :

`shared/boono-chart-renderer.js`

Modifications validées historiquement :
- MA200 rouge/verte ;
- lignes horizontales 100/200 $ ;
- grille horaire ;
- échelle prix overlay ;
- zéro MCB renforcé ;
- zones trade bleu ciel ;
- scroll/axes synchronisés ;
- bouton VIVANT.

BOONO-TV réutilise ce moteur au lieu de réinventer une représentation parallèle.

---

# 25. BOONO-TV bridge

Processus :

`boono-tv`

Port :

`3090`

Bind :

`127.0.0.1`

Routes principales :

`/api/health`

`/api/snapshot`

`/ws`

Le bridge lit les données du moteur de trading en lecture seule.

Il ne modifie pas BOONO.

---

# 26. Sources de données principales

Le bridge lit notamment :

- `data/trade-sim-v4-state.json`
- `data/trade-sim-v4-decisions.ndjson`
- `data/audit-history.json`
- MCB 3m CSV ;
- MCB live 3m ;
- MCB 15m ;
- MCB live 15m.

Les séries servent :
- aux graphes ;
- aux vagues ;
- au prix ;
- aux projections ;
- à l’état vivant.

---

# 27. Nomenclature de l’État vivant

Documents existants :

`knowledge/etat-vivant-nomenclature-complete-2026-10-11.md`

`knowledge/etat-vivant-nomenclature-boono-tv-2026-10-11.md`

Les quatre grands blocs restent :

### THÈSE / MCB
MCB propose la direction.

### STRUCTURE / POSITION
Le système situe l’opportunité.

### CONVERSION / COMBAT
Le marché montre si la thèse se traduit.

### DÉCISION / RISQUE
BOONO agit ou attend.

---

# 28. Cadence et rôle des panneaux live

La structure actuelle se stabilise autour de trois plans principaux :

## PRIX

Fonction :
mouvement.

Proche, spectaculaire, grandes bougies.

## VAGUES

Fonction :
respiration / contexte.

Plus profond, large, perspective.

## AUDIT

Fonction :
mémoire / événements.

Fugace, en mouvement, faible persistance visuelle.

Cela évite que les trois blocs aient le même poids.

---

# 29. Outils vidéo / animation envisagés

## Blender

Choix principal pour :
- 2.5D ;
- compositing ;
- masques animés ;
- mouvements de caméra ;
- séquences BOONO ;
- gestes ;
- keyframes ;
- transitions.

## Kdenlive

Intéressant pour :
- montage final ;
- assemblage ;
- timing ;
- audio ;
- publication.

## OBS / FFmpeg

Pour :
- capture live ;
- encodage ;
- stream ;
- YouTube.

Le live BOONO-TV reste naturellement piloté par Chromium / HTML pour les data.

---

# 30. Ce qui est confirmé

## Visuellement

- identité canonique de BOONO ;
- loft industriel ;
- grande pièce ;
- bureau massif ;
- deux écrans tactiles horizontaux ;
- sliders ;
- clavier ;
- espace arrière destiné aux données ;
- style comics 70s / rétro industriel ;
- BOONO Systems comme marque.

## Techniquement

- état vivant ;
- bridge read-only ;
- WebSocket ;
- renderer partagé ;
- Vagues / Prix séparés ;
- perspective ;
- thèmes TV ;
- MarketCipher capture ;
- cadence 10 s ;
- roll-over 3m/15m ;
- deux surfaces de projection ;
- écran gauche BOONO ;
- écran droit MarketCipher ;
- 7 états logiques ;
- SHOWCASE ;
- FX indépendants ;
- SFTP sécurisé ;
- runtime versionné.

---

# 31. Ce qui reste provisoire

Les illustrations actuelles.

En particulier :
- BOONO ;
- bureau ;
- poses ;
- loft ;
- bulles ;
- symboles FX.

Elles ne doivent pas être polies au pixel près.

Elles seront entièrement refaites.

Leur rôle actuel est uniquement :
- tester l’architecture ;
- tester la profondeur ;
- tester le changement d’état ;
- tester les surfaces de projection ;
- tester les masques ;
- tester les animations futures.

---

# 32. Leçon méthodologique essentielle

Il faut arrêter de fabriquer des composites “finaux” qui mélangent :

- décor ;
- personnage ;
- écran ;
- graphes ;
- FX.

La plateforme doit toujours préférer les couches indépendantes.

Principe :

> **Une image doit contenir le minimum de responsabilités possible.**

Exemple :

```text
loft.webp
desk.webp
boono-thinking.webp
boono-thinking-mask.png
fx-thinking.svg
screen-left
screen-right
bubble-thought
```

Puis BOONO-TV compose le tout.

---

# 33. Prochaines étapes recommandées

## 1. Finaliser Scene Composer

Externaliser dans une config :
- x/y ;
- tailles ;
- quadrilatères ;
- opacité ;
- profondeur ;
- mode calibration.

## 2. Audit crawl

Transformer l’AUDIT en flux spatial :
- apparition ;
- déplacement ;
- perspective ;
- fade ;
- durée de vie.

## 3. Expression FX engine

Passer les FX actuellement CSS vers :
- SVG ;
- PNG transparents ;
- sprites ;
- animation.

## 4. Refaire les 7 illustrations

Créer de nouvelles images haute résolution cohérentes :
- posture réellement distincte ;
- perspective constante ;
- bureau cohérent ;
- silhouette propre ;
- alpha propre.

## 5. Masques automatiques

Pour chaque foreground :
- alpha ;
- masque dérivé ;
- validation ;
- versionnage.

## 6. Interaction écran

Synchroniser :
- regard ;
- main ;
- doigt ;
- changement de screenMode ;
- roll-over.

## 7. OBS / stream

Une fois la scène stable :
- test encodeur ;
- fréquence ;
- CPU/GPU ;
- résolution ;
- débit ;
- diffusion longue durée.

---

# 34. Vision cible

BOONO-TV doit donner l’impression que le spectateur se trouve réellement dans l’atelier de BOONO.

Il doit voir :

- BOONO travailler ;
- le marché se déplacer autour de lui ;
- ses horizons 3m / 15m ;
- son véritable MarketCipher ;
- son raisonnement synthétique ;
- son écran d’outils ;
- ses doutes ;
- ses décisions ;
- ses alertes ;
- ses exécutions.

Mais BOONO-TV ne doit pas devenir un écran de monitoring surchargé.

Le décor et la mise en scène doivent transformer les données en langage visuel.

La plateforme actuelle est construite précisément pour permettre cette évolution sans dépendre des illustrations provisoires.

---

# 35. Résumé en une phrase

> **BOONO-TV est désormais conçu comme un moteur de mise en scène temps réel où l’État vivant pilote le comportement, les données deviennent des plans visuels perspectifs, MarketCipher est projeté depuis TradingView, le bureau possède deux surfaces indépendantes, et BOONO peut changer de posture, expression, bulle et outil sans modifier le moteur de trading ni le décor.**
