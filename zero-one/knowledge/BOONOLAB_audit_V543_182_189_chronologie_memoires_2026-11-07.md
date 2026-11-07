# BOONOLAB — Audit critique V543 #182–189 : sorties tardives, chronologie et coordination des mémoires

**7 novembre 2026 · enquête en lecture seule des données PAPER d'Amsterdam (10h52 Europe/Stockholm).**

**Mandat utilisateur (transcription synthétique fidèle) :** perte importante des gains récents de V543 ; admissions généralement justifiables mais sorties demandant une conjonction excessive de preuves ; signes structurels non exploités ; historique de la Chronologie limité à E3/E15 ; retour d'intérêt pour la structure de l'État vivant de V4.10.10 (sans vouloir réactiver sa logique), ses mémoires coordonnées et Elastic ; examen des trades SHORT #182, #183, LONG #184, SHORT #185–189 avec heures d'alerte E3/E15, MF, PM et MA3.

**Statut : OBSERVATIONS D'AUDIT / HYPOTHÈSES OUVERTES, PAS D'AUTORISATION DE CHANGER LE PAPER.** Aucune règle, aucun seuil, ordre, processus PM2 ni shadow modifié dans cette enquête. Les exemples « sortir à telle heure » restent des hypothèses de décision à évaluer, **pas** des ordres à reconstituer aux prix idéaux.

## 1. Période et résultat

- V5.4.3 PAPER cumulatif après #189 : 189 clôtures depuis la lignée V5, equity **800,901 USD**, P&L **−199,099 USD** (mélange des versions successives) ; V494 131 clôtures, P&L −155,5936 USD. P&L de la cohorte V543 #80–189 à distinguer du cumul de l'ancien V5.
- V543 #182–189 : **−39,1641 USD nets** ; #183–189 : **−43,0532 USD nets**, en prenant soin de ne pas confondre ces deux groupes.
- Parents E15 V543 : SHORT #181/182 **+0,0157 USD** ; parent LONG #183–185 (SHORT/LONG/SHORT) **−26,6362 USD** ; parent SHORT #186–188 **−13,6244 USD** ; nouveau parent SHORT #189 **−2,7926 USD**. Le coût du churn ressort mieux par parent que par un seul trade.
- Depuis #174 après le bilan du 5 novembre : **−77,2003 USD réalisés sur #174–189**. Une baisse de P&L affichée en fenêtre 24/48h ajoute un **effet de fenêtre glissante** quand les grands gains d'avant sortent de la période. Au contrôle du 7 novembre vers 10h51 : 24h glissantes **−42,858 USD**, 48h glissantes **−20,5508 USD**, calculées par **heure de clôture** et non d'entrée. Montants après frais modélisés (pas funding/slippage).
- V543 #182 SHORT : MFE de cours +1073,6 BTC$, net seulement **+3,8891 USD** ; entrée 14h06m38s à 75 941,0 et sortie 16h45m39s à 75 668,3. Ne pas lire MFE comme un profit de 1 073 USD sur un notionnel 1 500 USD.

## 2. Contrat de sortie réellement appliqué

Le source PAPER actif **`modules/v5/decision-v541.js`** donne autorité à `EXIT` lorsque :
- **MA3 rejetée depuis l'entrée ET MF3/MF15 adverses ET défense du prix par le camp opposé** ; OU
- **pivot E15 opposé devenu confirmé depuis l'entrée OU deux clôtures 3m sous/au-delà de l'invalidation structurelle initiale**, **ET** MF3/MF15 adverses **ET** défense du prix opposé.

Sinon un E3 opposé produit souvent `HOLD_V54_3M_RESPIRATION_NOT_EXIT` ou `HOLD_V54_STRUCTURE_CONTESTED_PROTECT`. La mémoire d'attention séparée observe des indices adverses, mais **leur accumulation n'a pas encore d'autorité autonome de protection de position**. Les gain-floors 120/90 et 220/180 sont devenus des **alertes non exécutoires** depuis le 31/10, sous MCB/structure ; hard-risk −500 BTC$ indépendant. Un E15 Live, MF et PM simultanément adverses **ne suffisent pas** si l'une des conditions structurelles/territoriales obligatoires manque.

**Hypothèse de défaut :** l'observation des preuves adverses et leur persistance temporelle ne sont pas assez coordonnées à l'autorité de sortie de **POSITION**. Ne pas en déduire que le premier E3UP ou premier PM contraire devrait produire `EXIT` : cela manquerait aussi de bonnes continuations. Le critère doit se fonder sur prix conservé, niveau défendu, effort/rendement et transfert en formation, avec contre-exemples.

## 3. Enquête trade par trade, heures locales Stockholm

| Trade | Constat réel et indices adverses | Décision PAPER et conséquence |
|---|---|---|
| **#182 SHORT** | 16h15 environ : E15 UP Live, E3 UP confirmé à 16h15m44s, PM3 **+575,4**, PM5 **+524,5**, PM Live **+195,2**, ΔMF3 **+2,2**, ΔMF15 **+0,6**. Le décideur inscrit bien `mfAdverse=true`, mais `defendedOpposition=false`, `opposingPivotConfirmed=false`, `structuralLoss=false`. E15 UP n'est **confirmé qu'à 16h30m44s**, puis un E15 SHORT Live apparaît. | `HOLD` jusqu'à 16h45m39s, +3,8891 USD net, après grande restitution d'un MFE +1073,6 BTC$. **Important contre-test** : clôturer au premier signal de 16h15 (BTC ~75 766) aurait rapporté **~+1,95 USD net théorique, moins** que la clôture réelle. Il faut détecter plus tôt la restitution économique, sans faux fill ni preuve a posteriori. |
| **#183 SHORT** | 17h15m50s entrée 75 537,1 **contre le directeur E15 LONG** (parent LONG `STRUCTURAL_REVERSAL_FORMING`). Un E15 SHORT Live existe à 17h15, mais **dernier E15 confirmé LONG à 17h00**. LBW15 au point d'entrée −44,2 remonte de son extrême historique −60,259 (16h37). PM3 +75,5 contredit le SHORT, PM5 −65,4, PM Live +4,2, MF3/MF15 encore négatifs. À 17h24, PM3/PM5 et MF sont haussiers, mais la confirmation de territoire adversaire manque. | MFE +169,2 BTC$ puis −9,1252 USD net, exit 17h33m35s. `structuralLoss=true` apparaît dès 17h30 mais sortie attend `defendedOpposition`, constaté à la fin. |
| **#184 LONG** | 17h57m40s entrée 75 924,6 sous un parent LONG ; à 18h21 PM3/PM5 adverses et défense vendeuse constatée, sans MF15 négatif confirmé. **18h33m35s : MA3 REJECTED depuis l'entrée**, prix 75 758,2, PM3 −93,9, PM5 −89,8, mais MF3 +0,2 / MF15 +0,2 : `mfAdverse=false`. Premier E15 SHORT Live vers 18h37m14s. | `HOLD` jusqu'à 18h37m15s à 75 558,2, **−8,7351 USD** ; sortie `V541_CONFIRMED_MA3_FAILURE_WITH_MF_PRICE` dès que MF3 −3,9 et MF15 −0,3 corroborent rejet MA3/terrain vendeur. Sortir au prix journalisé de 18h33 ne serait qu'un contrefactuel ~−4,79 USD, pas un fill garanti. |
| **#185 SHORT** | **18h37m20s : entrée exactement 5 secondes après sortie LONG #184**, et **dans le même parent stratégique E15 LONG**. Retour d'E3 UP Live à 18h46 puis confirmé 18h57 ; MF3/MF15 positifs vers 19h15 ; défense opposée et MF tous deux haussiers vers 19h24, prix ~75 797,3. E15 UP Live à ~19h15, confirmé ~19h30 (ne pas confondre croisement BW/LBW UP vers 17h25 avec un E15 confirmé). | `HOLD` jusqu'à 19h33m36s à 75 920,4, **−8,7759 USD**. Exit seulement lorsque `structuralLoss` devient vrai en plus des MF et du prix. Hypothèse : la sortie LONG n'a pas mémorisé une interdiction cohérente de **réentrée SHORT sans nouvelle preuve**. |
| **#186 SHORT** | E3 UP confirmé 20h27, E3 DN 20h30, E3 UP 20h39. ΔMF3 +3 / ΔMF15 +0,6 vers 20h45. E15 UP Live observé à **20h50**, **confirmé 21h00** (pas 20h40). À 21h00 MF3 +3,8 et MF15 +3,7 et prix adversaire défendu, mais **structuralLoss=false**, `ma3RejectedSinceEntry=false`. | `HOLD` jusqu'à 21h03m36s, **−4,3905 USD**, sortie enfin sur `V541_CONFIRMED_MA3_FAILURE_WITH_MF_PRICE` lorsque rejet de MA3 post-entrée est reconnu. |
| **#187 SHORT** | 21h27m34s, dernière confirmation native E15 **LONG à 21h00**, mais E15 SHORT Live à 21h26 et parent structurel courant SHORT ; ce n'est pas une confirmation E15 SHORT. LBW15 **+12,37** à l'entrée contre ancien extrême +25,727 à 21h10 : positif mais **en dessous de son extrême antérieur**, pas une accélération UP démontrée par cette seule comparaison. E3 UP confirmé 21h33, PM3 +57/PM5 +103/PM Live +33 et MF3/MF15 UP avec prix ~75 850. | **MFE 0**, **−3,8935 USD** en neuf minutes. La phase `STRUCTURAL_CONTINUATION` du parent SHORT était moins probante que ne le laisse entendre l'étiquette face à l'alternance E15 Live / confirmé. |
| **#188 SHORT** | 22h30m36s, E15 SHORT confirmé à 22h30, MF3 −5,3 / MF15 −7,2, PM3/PM5 négatifs : admission défendable. E3 UP confirmé 22h42 ; prix adverse à ~75 800 reconnu 22h45 ; MF3/MF15 UP vers 22h57 et E15 UP Live 22h57, E15 UP confirmé ~23h00. | `HOLD` jusqu'à 23h00m36s à 75 927,3, **−5,3404 USD**, MA3 LOST et MF/prix adverses. Entre 22h45 et 23h00, la capacité à reconnaître une **contre-offensive qui conserve le terrain** est le sujet, plutôt que l'imposition d'un stop arbitraire. |
| **#189 SHORT** | Entrée 00h45m16s à **75 928,6**, MA3 déjà `OPPOSITE_SIDE` à ~75 847,7 ; dernier E15 SHORT confirmé 00h00, mais **nouvel E15 UP Live dès 00h45**. E15 UP confirmé **01h30**, E15 SHORT confirmé 01h45, E15 UP confirmé **02h45** : oscillation stratégique répétée. Retours/rétentions autour du prix ~75 900 et MA3 ~75 850–75 865 ; MF3/MF15 tous deux UP vers 02h03 avec PM3 +63,9/PM5 +41,5, prix adverse défendu, mais invalidation encore intacte. | `HOLD` jusqu'à **02h54m38s** à 75 994, **−2,7926 USD**, deux clôtures 3m au-delà du niveau de référence 75 976,5 enfin reconnues. `ma3RejectedSinceEntry=false` car l'admission avait été autorisée alors que MA3 était déjà du côté opposé : la condition spécifique « rejet d'une MA3 précédemment acceptée depuis l'entrée » n'était pas applicable. |

**Important sur la précision :** les moments sont les **premiers événements effectivement présents dans les journaux disponibles**, qui comportent des intervalles sans décision conservée de plusieurs minutes ; ne pas fabriquer des décisions « 5 secondes plus tôt » en l'absence de preuve. E3/E15 Live peuvent être interrompus avant clôture ; source bougie, heure d'observation et heure de disponibilité doivent être gardées séparément.

## 4. « Extrême 45m » : traçabilité vérifiée, problème de libellé

Dans `modules/v5/decision-v52.js` :

`recent15=samples.filter(x=>now-x.ts<=45*min&&x.ts<=now&&live15LbwRaw disponible)`; `absPeak15=Math.max(...recent15.map(x=>Math.abs(x.live15LbwRaw)))`. Le label actuel dans `modules/config-server.js` est `extrême 45m`. **Il retire le signe et ne montre ni timestamp ni direction** : il ne s'agit pas d'un plus haut ou bas **de prix**, ni d'un extrême confirmé 15m indépendant.

Reconstruction exacte en reprenant les 90 observations Bâton 30s **connues avant les entrées** :
- #183 affichait **60,3** = LBW15 **−60,259**, observé **16h37m14s** ; LBW15 courant à l'entrée **−44,225**.
- #184 affichait **48,6** = LBW15 **−48,559**, observé **17h20m44s** ; LBW15 courant **−5,301**.
- #187 affichait **25,7** = LBW15 **+25,727** à **21h10m15s** ; courant **+12,371**.
- #189 affichait **37,5** = LBW15 **+37,481** à **00h03m15s** ; courant **+28,950**.

**Backlog strictement UI, aucune politique modifiée** : libellé `|LBW15| max 45m` et indication du signe, de l'heure `observedAt`, valeur actuelle et progression depuis extrême. Ne pas remonter rétroactivement la disponibilité d'un événement confirmé.

## 5. Chronologie : l'écart entre sept familles attendues et ce qui est réellement journalisé

**Constat du code :**
- Le feed natif `modules/v5/causal-event-feed-v54.js` est explicitement limité à **MCB3, MCB15**, avec clés **E3, E15, BW_LBW_CROSS**. Dans le NDJSON existant, **4 558 événements** : MCB3 3 385 / MCB15 1 173 ; aucun `FLOW`, `MA`, `CONVERSION`, `BOUNDARY`, `CONTEXT`.
- Or la route `/api/elastic-history` de `modules/config-server.js` autorise bien les filtres **`MCB15, MCB3, FLOW, MA, CONVERSION, BOUNDARY, CONTEXT`**, mais lit le fichier natif à deux familles : la sélection des autres familles ne peut pas inventer des événements absents. Le constat utilisateur est **confirmé comme lacune d'enregistrement sur cette route**, pas seulement un problème de CSS.
- La couche séparée `modules/attention/v494-elastic-state-layer.js` enregistre **sept catégories d'ÉTATS différentes** (qualité, temporalité, effort/rendement, régime, campagne, phase de conversion, 4×15) avec transitions et snapshots 30s : **ces sept catégories ne sont pas les sept familles événementielles ci-dessus**. Elle est V494, SHADOW uniquement.
- `modules/attention/attention-memory.js` et `evidence-adapters.js` reconnaissent des preuves `MCB`, `MF`, `MA`, `PRICE`; V543 a dans `data/v52-paper-state.json.attentionState.events` à la consultation **61 événements**, 33 MF, 22 prix, 6 MCB, mais ce n'est **pas** un registre historique natif multi-famille paginé et retenu 14 jours. Certaines preuves MA sont des événements dans le contrat MA3/mémoire et ne sont pas présentes parmi les 61 derniers événements d'attention.

**Chantier ancien à préserver, non à redéployer tel quel :**
- V4.10.10 a été retiré comme moteur actif, et sa logique PAPER était jugée déficiente. **Son ancien État vivant/Elastic et ses chaînages de preuve restent des références UI et mémoire.**
- `knowledge/elastic-v0.5.2-compact-family-chain-duel-2026-10-21.md` décrit les **sept familles attendues** MCB15/MCB3/FLOW/MA/CONVERSION/BOUNDARY/CONTEXT, deux chaînes LONG/SHORT, la progression des preuves par première disponibilité, séparation des chiffres de conversion et des étiquettes de qualité, chronologie paginée.
- `knowledge/BOONO_V533_memoire_conversion_2026-10-25.md` a établi qu'une fenêtre INEFFICIENT après POWERFUL ne peut effacer la campagne engagée. `knowledge/BOONO_V541_MA_memoire_polarite_retests_2026-10-27.md` préserve acceptations/rejets/retests sur polarité MA. `knowledge/BOONO_V5_elastic_memory_shadow_v01_2026-10-22.md` décrit les relations entre E15, E3 et fenêtres 4×15, sans double vote. Ces acquis **ne doivent pas être effacés** par l'architecture plus récente.
- Un vrai journal 7-familles **événementiel, as-of et distinct des états synthétiques**, réunissant FLOW MF, MA, conversion, frontières de prix et contexte par campagne, est un **travail d'observabilité** à étudier. Ne pas donner d'autorité trading à ces événements ni casser le budget latence/UI. Il doit lier les preuves par famille et dépendance (E3/cross, MF/divergence, prix/PM), **pas les compter comme votes indépendants**.

## 6. Questions de recherche et contre-épreuves

1. **Quand une contre-attaque devient-elle dangereuse pour la POSITION ?** Étudier la chronologie MFE et le *giveback* par rapport aux preuves MF, E3, E15 Live/confirmé et prix défendu : #182 illustre une prise de conscience trop tardive, mais l'EXIT exact à 16h15 aurait été moins rentable que l'EXIT réellement observé. Un modèle adaptatif ne peut pas être calibré sur ce seul cas.
2. **Sortie ≠ permission opposée :** entre #184 sortie et #185 entrée, **5 secondes** sous le même parent E15 LONG et à peine de nouvelle preuve stratégique. Mesurer prospectivement le besoin de requalification et le coût de réentrées sans inventer de délai d'attente arbitraire.
3. **Conjonction instantanée versus mémoire causale** : `mfAdverse`, `defendedOpposition`, `opposingPivotConfirmed`, `structuralLoss`, `ma3RejectedSinceEntry` doivent être étudiés comme chaînes d'événements temporelles, pas simplement comme booléens simultanés. Évaluer en shadow (sur nouvelle autorisation) si un superviseur de sortie **POSITION** peut protéger plus tôt sans dégrader les continuités réellement productives.
4. **Chronologie et ancien État vivant :** recenser les contrats, dates et producteurs qui subsistent ; rétablir une observabilité multi-famille dédiée et légère, sans faire revenir V4.10.10 et sans modifier les décisionnaires 494/543.
5. **Statistique hors échantillon :** garder les moteurs PAPER intacts jusqu'à un protocole validé ; mesurer les bonnes campagnes que toute nouvelle logique de sortie aurait interrompues, ainsi que les pertes évitées, sur plusieurs régimes. Les cas 494 #96 et 543 #161/#165 sont des contre-épreuves de l'excès de zèle en protection.

**Statut final : RECHERCHE ET ARCHIVE UNIQUEMENT.** Pas d'évolution de seuil, pas de déploiement ni redémarrage. La lecture du serveur/code et l'observation du modèle ne sont pas une preuve de gain économique futur.
