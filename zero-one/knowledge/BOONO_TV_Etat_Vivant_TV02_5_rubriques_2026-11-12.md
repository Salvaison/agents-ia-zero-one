# BOONO-TV — Passage à la maquette typographique TV02 (5 rubriques)

**Date :** 12 novembre 2026
**Statut :** implémenté, tests et rendu visuel de contrôle validés, assets OVH déployés ; validation utilisateur dans la scène complète ouverte.
**Source utilisateur :** `etat_vivant_typoTV02(1).pdf` (2 pages) et message « Mais je ne vois aucune mises à jour de la typo? ».
**Décision :** OD-20261112-003.
**Autorité :** affichage uniquement. Aucune règle de trading ou d'ordre n'est modifiée.

## 1. Pourquoi cette correction était nécessaire

La livraison `6335728` avait changé les libellés `ASCENT_ACTIVE` / `AWAIT_TACTICAL_ALIGNMENT` mais **n'avait pas appliqué la nouvelle composition du PDF**. Le panneau OVH montrait toujours quatre cartes avec bordures et les mêmes titres « Trajectoire, Tactique, Lieu, Chaîne causale ».

La proposition TV02 demande, elle, une page visuellement continue sur fond noir, cinq rubriques numérotées en cyan, une hiérarchie typographique forte, et une cinquième rubrique POSITION séparée. Elle ajoute la MA15 et les deux ranges enregistrés à LIEU STRUCTUREL.

L'ancien rendu et sa feuille de style ont été remplacés **uniquement pour le panneau gauche État vivant TV**. Le loft, les quads, les masques, les éditeurs, les surfaces de projection, la musique et les sprites ne sont pas modifiés.

## 2. Structure TV02 réellement en service

1. **MCB15 · DIRECTEUR** : pivot LBW15 confirmé (CRÊTE ou CREUX, sans appeler cela une tendance prix), offensive UP/DN, valeurs BW/LBW précédent confirmé grises / Live rouge-vert, Cross15 / LBW au jalon / heure / âge / différence prix, MF15 précédent/Live, flow, pente, MF15 Live, distance/état MA15 et mémoire des retests.
2. **MCB3 · TACTIQUE** : état de phase de V5, en vocabulaire lisible (attente alignement, continuation, respiration ou retournement *en formation*), BW/LBW confirmé/Live, Cross3 / LBW / heure / Since, MF3 et MA3 / retests / contact si disponible.
3. **LIEU STRUCTUREL** : position PAPER ou candidat et synchronisation en attente, BW4/LBW4 précédent / dernier confirmé et E4 confirmé ; `E4 Live —` lorsque aucune preuve native Live 4h vérifiée n'est disponible. Deux lignes indépendantes :
   - `DailyRange · VAH→VAL · SOUS VAL (ou autre zone) · % géométrique depuis VAL · prix − VAL $` ;
   - `BigRange · VAH→VAL · ABOVE POC (ou autre zone) · % normalisé par POC/VAH ou POC/VAL · prix − VAH $`.
4. **CHAÎNE CAUSALE · OBSERVATION** : PM Live et jalons Cross3/E3/Cross15/E15 issus des observations horodatées ; PHASE STRUCTURELLE, campagne MCB15, maturité 2h, MF15 2h et extension.
5. **POSITION** indépendante (LONG/SHORT ou FLAT) : entrée, heure, P&L net potentiel PAPER, MFE/MAE, floor, invalidation **mémorisée de la position** et maturité offensive.

Les exemples chiffrés du PDF **ne sont jamais codés en dur**. Le statut `SOURCE_STALE` continue à interdire l'affichage d'une vieille position ou d'une ancienne trajectoire comme si elle était actuelle.

### Nomenclature et preuve économique

- `ASCENT_ACTIVE` ne devient **pas** « retournement du prix confirmé ». Le TV affiche une lecture de CREUX LBW15 CONFIRMÉ, accompagnée de l'offensive actuelle. `DESCENT_ACTIVE` devient CRÊTE LBW15 CONFIRMÉE ; l'état natif reste disponible.
- Les termes CONTINUATION / RETOURNEMENT (EN FORMATION) restent réservés aux **phases V5 qui les justifient**, et non aux seuls creux/crêtes de l'oscillateur.
- Sur le DailyRange, la valeur `BELOW_VAL` est affichée **SOUS VAL**. Le libellé « RangeDaily_Lost » du PDF n'a pas été déclaré comme fait acquis : une perte de territoire défendue exigerait une preuve supplémentaire (retest/acceptation/prix). Ce n'est pas une correction silencieuse des données sources.
- Les mêmes niveaux `VAH/POC/VAL` saisis dans `data/levels.json` sont utilisés par BOONO Watch et TV. La classification des ranges est **descriptive, non décisionnelle**.

## 3. Évolutions du pont Amsterdam

`boono-tv/tv-living-state.js` lit maintenant (avec cache de fichier par mtime) les **deux groupes** de niveaux manuels (scope `daily` et `big`) depuis `data/levels.json`, et `r.maContract.ma15` depuis l'analyse V5.4.3.

Chaque groupe validé exige `VAL < POC < VAH`. Les dérivés sont :
- `positionPct = 100×(prix−VAL)/(VAH−VAL)`, sans plafonnement ;
- `fairValuePct = 100×(prix−POC)/(VAH−POC)` lorsque prix ≥ POC, sinon `100×(prix−POC)/(POC−VAL)`, sans plafonnement ;
- `distanceFromValUsd = prix−VAL` ; `distanceFromVahUsd = prix−VAH` ;
- états géométriques `BELOW_VAL / ABOVE_POC / ABOVE_VAH / BELOW_POC / AT_POC`.

Ces deux ranges utilisent **le même prix `a.price` et `a.asOf` de l'analyse V5**. La cotation Live présentée en haut de la scène peut avoir évolué légèrement depuis ce relevé ; ne pas prétendre que les distances sont calculées au dernier tick du WebSocket.

**Runners PAPER V494/V543 non modifiés.** Seul le pont PM2 `boono-tv` d'Amsterdam a été redémarré pour charger les deux nouvelles familles de données en lecture seule.

## 4. Présentation OVH et cache mobile

Fichiers autonomes dans le runtime réel OVH :
- `scene/tv-living-state.js` : rendu des cinq rubriques ;
- `scene/tv-living-state.css` : bloc `#statePanel .state-rows.tv-five`, fond noir continu, en-têtes cyan, nombres forts, premiers BW/LBW/MF en gris et suivants rouge/vert, sans cadres de cinq anciennes cartes ;
- `scene/index.html` : uniquement cache-bust du JS/CSS vers `OD20261112-003` (patch ciblé `knowledge/BOONO_TV_typoTV02_OVH_runtime_patch_2026-11-12.patch`).

Ne pas remplacer le runtime complet OVH par les anciennes copies de `boono-tv/scene/app.js` / `index.html` dans Git : le runtime actuel contient le loft et des éditeurs en service non versionnés à cet emplacement. La modification reste limitée à deux fichiers autonomes et à la version de leurs liens.

## 5. Vérifications

- Lecture et rendu des deux pages du PDF utilisateur selon les règles PDF ; la conception TV02 comporte cinq rubriques et la maturité offensive se poursuit en page 2.
- Tests de `recordedRanges` sur les deux triplets utilisateurs (Daily groupe 4, Big groupe 8) et contrôle des unités, du signe, des pourcentages et de l'absence de groupe (données indisponibles plutôt qu'inventées).
- Tests de MA15 récupérée via le contrat V5 ; 15 tests réunis initialement sur le pont et le front, avec nouveaux tests TV02 des cinq sections, rendu de la position FLAT et des sources périmées.
- OVH : relayage du nouveau `tvLiving.place.recordedRanges` et `trajectory.ma15` depuis Amsterdam, sans nouvelle connexion ni nouvel endpoint ; actifs statiques 3091/3092 servis HTTP 200.
- **Prévisualisation visuelle** Chrome headless sur 1920×1080 : CSS effectivement servie sur OVH + snapshot V5 réel, cinq rubriques entièrement visibles, pas de défilement ni de troncature dans le panneau 720×1080.
- **Limite :** rendu reconstitué du panneau de gauche, pas une capture de toute la scène studio en lecture média/animation. La validation finale dans le navigateur du propriétaire reste ouverte.

## 6. Frontières non corrigées

L'incident sur le prix global descendant et le pivot MCB15 `ASCENT_ACTIVE` ne doit **pas** être considéré résolu par une étiquette CRÊTE/CREUX : la classification du contexte de prix multi-jours reste un chantier SHADOW séparé. L'autorité 15m/3m et les sorties PAPER n'ont pas été changées.

---
*Passation complémentaire à `knowledge/BOONO_TV_Etat_Vivant_4_chapitres_2026-11-11.md`. Le présent document décrit la version TV02 **à cinq rubriques** réellement mise en place le 12 novembre 2026.*

## Ajustement graphique du 12 novembre — cinq bandeaux éclaircis et libellés blancs

**Demande explicite :** « Mhh, place les 5 rubriques sur un bandeau plus claire et aussi je t'ai demandé de changer les dénominateur bleu ciel à blanc ».

**Livraison OVH :** les cinq en-têtes de l'État vivant TV02 possèdent un fond gris bleuté plus clair (#24404b), une bordure discrète et les intitulés blancs (#f8fcff). Les étiquettes d'indicateurs (BW, LBW, MF, PM, MA, Cross, DailyRange, BigRange) passent également du cyan au blanc. Les numéros conservent leur petit fond cyan de repérage ; ils ne sont pas des dénominations de données.

**Préservation de la sémantique colorée :** première valeur confirmée grise, seconde valeur en progression verte (#39f3a4) ou en recul rouge (#ff6178), UP vert et DN rouge. Une règle CSS plus spécifique a été ajoutée pour empêcher que la couleur blanche des libellés n'écrase celle des valeurs courantes BW/LBW/MF.

**Fichiers modifiés :** uniquement scene/tv-living-state.css sur OVH, et l'URL de cette feuille dans l'index OVH (v=OD20261112-004). Aucun JavaScript, source Amsterdam, niveau de prix, décor, moteur, éditeur ou service n'a été modifié/redémarré. Le patch de cache-bust OVH est archivé dans knowledge/BOONO_TV_bandeaux_clairs_typographie_OVH_2026-11-12.patch.

**Vérification :** aperçu du panneau construit avec le CSS réellement servi sur OVH et un snapshot V5 récent, capturé dans Chrome headless 1920×1080 ; cinq en-têtes visibles et blancs, bandeaux distincts, valeurs gris/vert/rouge conservées, aucune troncature. La suite automatisée de 16 tests s'est terminée sans échec. Contrôle final de la scène complète par le propriétaire encore ouvert.

## Ajustement du 12 novembre — zones fixes et cycle 25 / 15 / 5

La surface de 900px consacrée aux cinq rubriques TV02 est désormais divisée en cinq emplacements **exactement égaux de 180px (20%)**, quelle que soit la densité des informations. Le texte exceptionnellement long ne modifie plus la hauteur des autres rubriques et reste scrollable dans son emplacement. Le cycle du panneau gauche comporte **25s État vivant → 15s Graphiques Prix/MCB → 5s Trades accomplis → retour État vivant**, soit 45s au total. Ce cycle visuel ne modifie ni les données Live ni les projections sur le loft. Détails de code, tests et passation dans knowledge/BOONO_TV_5x20_rotation_25_15_5_2026-11-12.md et registre OD-20261112-005.

## Mise à jour du 12 novembre — Polarité des noms de la chaîne causale

**Demande :** « Dans la chaine causale, code en couleur rouge/vert les dénominateurs celon de leur polarités ».

**Implémentation OVH :** les six noms Cross3, E3 Live, E3 confirmé, Cross15, E15 Live et E15 confirmé prennent individuellement la couleur de leur événement natif dans tvLiving.causal : UP/long = vert #39f3a4, DN/short = rouge #ff6178. Si la direction ou la preuve temporelle est absente, le nom reste neutre #e4eff2. Il ne prend jamais la couleur de la thèse globale ou de son voisin. Les heures, flèches, PM Live, hauteur des cinq zones et rotation 25/15/5 restent inchangés.

**Code concerné :** boono-tv/scene/tv-living-state.js, fonction lineNames, et boono-tv/scene/tv-living-state.css. Les règles CSS de polarité sont plus spécifiques que la règle préexistante de noms blancs. Le runtime OVH charge les scripts et CSS avec le suffixe OD20261112-006 ; patch de liens d'origine enregistré dans knowledge/BOONO_TV_chaine_causale_polarites_OVH_2026-11-12.patch.

**Vérifications :** source native réelle relayée via OVH et test de six directions alternées ; données manquantes restant neutres ; source V5 stale protégée. Chrome headless avec feuille CSS OVH réelle : rouge rendu rgb(255,97,120), vert rendu rgb(57,243,164). 25 tests Node cumulés passés. Aucun moteur PAPER ou pont de données Amsterdam redémarré, aucune modification de trading. Validation dans la scène complète par le propriétaire encore ouverte.

## Ajout du 12 novembre — MCB1h confirmé dans LIEU STRUCTUREL

**Demande :** insérer immédiatement sous la ligne 4h une ligne analogue « 1h BW1 précédent / dernier confirmé · LBW1 précédent / dernier confirmé · E1 Live — ».

**Source réelle :** le lecteur read-only Amsterdam boono-tv/tv-living-state.js lit maintenant la queue du CSV /root/agents-ia-zero-one/data/mcb-live/mcb_1h.csv. Il sélectionne uniquement les deux dernières bougies 1h dont la clôture est disponible à latestAnalysis.asOf (sourceAt + 3 600 000 ms <= asOf). Il publie dans tvLiving.place.h1 le BW et le LBW précédents et confirmés, avec sourceAt et availableAt. Aucun chiffre de l'exemple 4h n'est copié vers le 1h.

**Affichage OVH :** la ligne 1h est placée entre 4h et E4 confirmé, devant les deux ranges enregistrés. Même convention : précédente valeur grise, dernière valeur confirmée rouge ou verte selon l'évolution. L'horloge source/disponibilité est conservée en attribut d'information. E1 Live reste à « — » : il n'existe pas de preuve intrabar native validée pour alimenter cette valeur ; une bougie 1h confirmée ne suffit pas à produire un événement E1 Live. Si la source 1h manque, les deux valeurs restent indisponibles, sans duplication du 4h.

**Contrôle réel au premier relevé :** BW1 −50,4 / −56,9 et LBW1 −58,2 / −65,8, à distinguer de BW4 −32,8 / −41,2 et LBW4 −39,2 / −53,2. Les nombres restent dynamiques et datés.

**Tests :** 29 tests Node cumulés réussis ; bougie ouverte 1h exclue, deux clôtures distinctes, absence de signal E1 Live inventé et ordre 4h / 1h / E4 / DailyRange / BigRange confirmé. En Chromium 1920×1080 sur CSS OVH réelle et snapshot V5 réel, cinq portions de 180 px sans débordement ni troncature après la nouvelle ligne.

**Déploiement :** seul le pont PM2 boono-tv Amsterdam a été redémarré. Les moteurs PAPER 494 et 543, le config-server et le studio OVH restent inchangés. Sur OVH, seul scene/tv-living-state.js a été adapté, avec son cache-bust dans scene/index.html à OD20261112-007. Le patch runtime exact est archivé dans knowledge/BOONO_TV_MCB1h_Lieu_OVH_2026-11-12.patch. Aucun impact sur la rotation 25/15/5 ou la géométrie TV02.

## 12 novembre — Conversion PM3/PM5/PMLive et six qualités de marché

Dans la quatrième rubrique, une ligne CONVERSION comporte maintenant PM3, PM5 et PMLive V5.4.3, leur opposition éventuelle CONTESTED, puis le marché classé selon les six qualités **FAIBLE/MÉDIAN/FORT × PRODUCTIF/IMPRODUCTIF** de l'étude BOONOLAB du 7 novembre. Cette qualification utilise l'AUDIT d'une heure glissante et les seuils historiques expérimentaux, **sans impact décisionnel**. Le rendu garde deux lignes compactes entre la chaîne E3/E15 et la phase structurelle pour respecter les cinq sections fixes de 180px. La passation complète est dans knowledge/BOONO_TV_conversion_six_qualites_marche_2026-11-12.md et le registre OD-20261112-008.
