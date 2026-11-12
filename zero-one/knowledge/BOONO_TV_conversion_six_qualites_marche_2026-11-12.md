# BOONO-TV — Conversion et six qualités de marché

**Date :** 12 novembre 2026 · **Décision :** OD-20261112-008 · **Autorité :** SHADOW descriptif, pas de changement PAPER.

## 1. Demandes et rendu

Le propriétaire demande la ligne « CONVERSION: PM3 −154,5 · PM5 −167,4 · PMLive −52,2 : Contested », entre la chaîne causale et la phase structurelle, puis « ajoute aussi aprés contested la qualité de marché celon les 6 cathégories établie sur les volume ».

La zone 4 de BOONO-TV présente donc deux lignes compactes (chiffres dynamiques, non ceux de l'exemple) :

**CONVERSION : PM3 −… · PM5 −… · PMLive −… :**

**CONTESTED · marché FORT PRODUCTIF · SHADOW**

**Deux sources distinctes** : PM3, PM5 et PMLive sont les trois déplacements BTC$ de `latestAnalysis.readings.conversion` du V5.4.3 PAPER, tous à son même `asOf`. `CONTESTED` décrit seulement le désaccord de signes PM3/PM5 ; sinon la qualité directionnelle reste `UNCLASSIFIED` car le P75/P95 de conversion n'est pas recalibré dans V5. La catégorie marché de six classes est indépendante des signes PM.

## 2. Six catégories de l'étude BOONOLAB du 7 novembre

**Référence exacte** : `knowledge/BOONOLAB_PM3_PM5_PMLive_dissonance_regimes_2026-11-07.md` et fichier reproductible `knowledge/BOONOLAB_PM_dissonance_study_results_2026-11-07.json`. Il s'agit de **trois intensités de volume agressif horaire × productif / improductif**, et non des six catégories Elastic de conversion (SILENT, INEFFICIENT, PRODUCTIVE, EASY, POWERFUL, EXCEPTIONAL).

| Intensité | Productif | Improductif |
|---|---|---|
| FAIBLE | FAIBLE PRODUCTIF | FAIBLE IMPRODUCTIF |
| MÉDIAN | MÉDIAN PRODUCTIF | MÉDIAN IMPRODUCTIF |
| FORT | FORT PRODUCTIF | FORT IMPRODUCTIF |

Seuils descriptifs figés depuis le travail du 1er au 7 novembre : **faible sous 0,2262 BTC/s**, **médian de 0,2262 à moins de 0,552 BTC/s**, **fort dès 0,552 BTC/s**. Leur stabilité hors échantillon **n'a pas été démontrée**.

Le nouveau `boono-tv/market-quality-six.js` exploite la **dernière heure glissante** de relevés Bâton AUDIT `volumeFenetreBtc/winSec` et `lastPrice`, seulement jusqu'à l'`asOf` V5. La productivité exige simultanément : rendement prix net / chemin total au moins égal à la médiane de son groupe, conservation du net / excursion maximale au moins égale à la médiane du groupe, et déplacement net absolu d'au moins **75 $ BTC**. Références du groupe (efficacité/rétention) : faible **0,0753/0,5261**, médian **0,0618/0,5135**, fort **0,0655/0,5038**. Ce sont des critères **exploratoires issus d'heures terminées historiques**, appliqués ici descriptivement à une heure glissante : pas une preuve de défense MA, ni un signal d'entrée/sortie, ni une probabilité de gain.

**Couverture requise** : au moins 90 relevés dans l'heure, début d'heure couvert, dernière observation datant de moins de 90 s, aucune lacune supérieure à 120 s, calibration BOONOLAB disponible. Sinon : catégorie affichée « — » et jamais inventée. Les seuils et mesures sont conservés avec horodatage et statut `SHADOW_ONLY`, `decisionImpact:false` et `brokerOrdersEnabled:false`.

**Limite déjà identifiée** : le débit AUDIT provient d'une fenêtre variable des 200 dernières transactions, parfois chevauchante ; il n'est pas le volume en BTC/min des bougies OKX confirmées du ticker 4×15. La calibration effort/rendement et la rétention doivent encore faire l'objet d'une validation prospective. Cette catégorie n'est ni la taxonomie Elastic, ni le régime V493 MIXED/CHOP_SHADOW.

## 3. Mise en œuvre

- Amsterdam : `boono-tv/tv-living-state.js` enrichit `tvLiving.causal.conversion` à partir du V5 PAPER et de `market-quality-six.js` ; le fichier de calibration historique est lu sous cache mtime/size ; seule la passerelle PM2 `boono-tv` a été redémarrée.
- OVH : `scene/tv-living-state.js` insère les **deux lignes** après les événements E3/E15 et avant PHASE STRUCTURELLE ; `scene/tv-living-state.css` les compacte et colorie la productivité verte ou improductive rouge, la catégorie indisponible étant neutre. Le qualificatif `SHADOW` est explicite ; un titre technique détaille débit, efficacité, rétention et statut expérimental.
- La scène OVH en service utilise le cache-bust `OD20261112-008` dans `scene/index.html` pour JS/CSS. Patch exact du runtime OVH préservé dans `knowledge/BOONO_TV_conversion_six_qualites_marche_OVH_2026-11-12.patch`. Aucune retouche du loft, des personnages, éditeurs, perspectives, autres projections, moteurs PAPER, ni de la rotation 25/15/5.
- **Tests** : 40 tests Node passés, dont les six combinaisons, limites de seuil, ignorance des sources futures, interruptions de mesure, qualité absente, contradiction PM3/PM5 et accès strictement SHADOW. Le relais OVH a été vérifié sur les valeurs V5 réelles. L'aperçu de contrôle Chrome headless 1920×1080 a d'abord révélé un débordement de 10 puis 5 px de la rubrique 4 ; un compactage limité à cette zone a permis de mesurer **cinq portions de 180 px, sans aucun débordement**.
- Les assets statiques OVH sont disponibles sur le serveur studio 3091 et le lecteur mobile 3092. La validation visuelle finale dans la scène complète appartient toujours au propriétaire.
