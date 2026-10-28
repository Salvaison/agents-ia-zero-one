# BOONOLAB — méthodes d'analyse et critères retenus

**Référentiel de méthode · 28 octobre 2026 · version 1.0 · lecture transversale.**
**Nature :** synthèse des principes *déjà formulés/validés dans la Knowledge Base*, des techniques effectivement utilisées dans nos audits et des questions encore exploratoires. **Ce document ne crée ni seuil de trading, ni règle d'entrée ou de sortie.** Les valeurs appliquées aujourd'hui par V5.4.3 et V4.9.4 figurent dans l'[audit des seuils et verrous](BOONOLAB_conventions_seuils_verrous_actifs_2026-10-28.md).

## 1. Finalité : trois questions différentes

BoonoLab analyse **(A) ce qui arrive sur le marché**, **(B) ce que chaque moteur a compris et décidé** et **(C) ce que cette décision a réellement coûté ou rapporté**. Ces trois évaluations ne s'impliquent pas : comprendre correctement une vague ne garantit pas une entrée rentable ; une sortie au gain-floor peut être économiquement utile alors que la campagne continue ; une hypothèse pertinente peut être refusée à cause d'un verrou mal placé.

**L'unité de lecture privilégiée est l'épisode de marché / la campagne**, pas le signal isolé et pas seulement le trade. Une campagne peut comporter plusieurs E3, tests et respirations, plusieurs positions successives, ou aucune position. À l'inverse, deux moteurs peuvent ouvrir dans des sens opposés pendant le même épisode. Les **trades**, **observations**, **candidatures**, **campagnes** et **évaluations** ont des dénominateurs distincts.

**Règle de preuve :** *serveur actuel = état opérationnel ; code chargé = politique appliquée ; ledger/journaux = faits passés ; documents = mémoire ; analyses a posteriori = interprétation ; scénario non testé = hypothèse.* Un test unitaire réussi démontre un contrat logiciel local, **pas une espérance de gain**. [Bilan des Constitutions V1–V4](BOONO_bilan_cloture_V1_V4_2026-10-22.md) · [Orientation V5 validée](BOONO_V5_orientation_validee_2026-10-22.md).

## 2. Comment nous observons le marché : événement, origine et territoire

**[VALIDÉ comme méthode] Partir de l'exception et de l'extrême, pas d'une corrélation moyenne globale.** L'observation d'août 2026 a montré que les signaux MCB3 dans leur ensemble ne racontaient pas la même histoire que les épisodes où 3m et 15m désignaient un extrême de prix concordant ; **cette statistique historique n'est pas une probabilité universelle ni une règle actuelle obligatoire**. Décrire des épisodes concrets, puis vérifier si la régularité subsiste sur d'autres périodes. [Passation du 26 août](passations-sources/2026-10-28-import/passation-260826%282%29.md).

**La carte temporelle de départ :** regarder les **30 min, 1 h et 2 h** précédant une entrée, parfois **4 h** pour retrouver l'origine de l'offensive. Relever dernier extrême confirmé du **prix**, heure et disponibilité de cet extrême, distance et vitesse déjà parcourues, position dans la fourchette observée, dernier E15/E3 causal, LBW/BW/MF15 et changements, frontières et territoire conservé/perdu. Il ne faut **pas** transformer « 250/325 $ déjà parcourus » en péremption automatique : des continuations réussies ont commencé après une grande amplitude. [Étude des origines et du rendement des camps, 26/10](BOONO_origines_2h_et_rendement_des_camps_2026-10-26.md).

**Hiérarchie des responsabilités** (cadre de lecture, et non liste de vétos) :

| Famille | Ce qu'on cherche effectivement | Ce qu'elle ne peut pas prouver seule |
|---|---|---|
| **Prix / territoire / levels** | Où a commencé la tentative ? Quelle frontière est réellement testée, rejetée, réintégrée et *tenue* ? Position dans le grand range, VAL/POC/VAH, MA200, trendlines, extrêmes locaux. | Une mèche ou un niveau simplement touché ne prouve pas une acceptation durable ; un lieu n'a pas d'autorité directionnelle autonome validée. |
| **MCB15 : E15→E15, BW, LBW** | Trajectoire stratégique, lobe et régime, dernière crête/creux de l'oscillateur, divergence avec le prix, campagne active/contestée, origine de la thèse. | Dernier signal natif **E15 Live/confirmé** ≠ trajectoire causale E15→E15 ; l'intensité LBW seule ne donne pas un ordre. |
| **MCB3 : E3/cross/respirations** | Début de contre-attaque, test local, reprise/continuation, moment tactique et synchronisation avec le 15m. | E3 opposé seul ≠ transfert stratégique ; cross BW/LBW et signal natif reflétant la même géométrie ne sont pas deux votes. |
| **MF : pente, mémoire, divergence** | Cohérence du flux, évolution des tentatives sur même territoire, affaiblissement/renforcement, comparaison de creux/sommets **prix + MF** réellement observés. | Divergence et pente du même MF ne sont pas deux familles indépendantes ; un MF15 court favorable n'efface pas mécaniquement le contexte 2h. |
| **PM / Conversion / ticker** | Effort (transactions, volume agressif et cadence), déplacement effectivement obtenu, efficacité/rendement marginal, persistance et contre-effort, prix conservé. `QUALITÉ` nomme cette conversion. | `POWERFUL` ≠ entrée rentable ; `SILENT` ≠ absence de mouvement ; QUALITÉ n'est pas un vote supplémentaire ; le prix est l'arbitre de la traduction. |
| **1h/4h/Daily/Weekly** | Mémoire du régime, maturation et grandes divergences, contexte utile pour interpréter le 15m. | Pas de veto uniforme à inventer pour tous les trades ; les droits décisionnels effectifs sont ceux du code de la version examinée. |

**L'image de travail du « bras de fer »** signifie : mesurer les attaques répétées des deux camps, la quantité d'effort agressif observable, le **rendement du prix pour cet effort**, l'incapacité d'un camp à prolonger ses extrêmes et la conservation du terrain par l'autre. Il s'agit de **comportements**, pas d'une mesure psychologique de la « conviction » des acteurs.

**Le phénomène prime sur l'ordre des indicateurs.** Une divergence MF/prix, un E3, un retest MA et un déplacement PM peuvent arriver dans plusieurs ordres. Les relier par leurs horodatages, parentés et conditions de falsification ; ne pas exiger qu'un motif soit reconnu seulement parce qu'une checklist se déroule dans un ordre choisi. [Orientation V5](BOONO_V5_orientation_validee_2026-10-22.md) · [Constitution V5.4](BOONO_V54_constitution_active_2026-10-26.md).

## 3. Critères retenus pour juger un trade et une campagne

La grille suivante sert **à analyser**, non à voter automatiquement pour une nouvelle entrée.

| Critère d'évaluation | Question et mesure retenue |
|---|---|
| **Provenance / disponibilité** | Tous les éléments invoqués étaient-ils *réellement connus* à l'instant examiné ? `sourceTs` ≠ `observedAt` ≠ `availableAt` ≠ heure de consultation. Une bougie 3m/15m confirmée n'est exploitable qu'après sa clôture ; distinguer Live, confirmé, périmé et manquant. |
| **Lecture de phase** | Sens de la campagne E15→E15, origine du prix, position dans la vague/range, début/fin de tentative, respiration vs continuation vs retournement, preuves adverses et nouvelle qualification. |
| **Qualité de traduction** | Direction de PM3/PM5/PM Live, efficacité, rendement prix/effort, terrain réellement acquis **et gardé** ; regarder aussi les tentatives inefficaces et les attaques adverses. |
| **Timing d'entrée** | Quel prix/risque au moment du signal ? Déplacement déjà consommé, opportunité encore disponible, coût de la confirmation attendue, comparaison avec une admission plus précoce **causalement possible**. |
| **Solidité des contradictions** | Quelles preuves invalident la thèse, depuis quand, avec quelle persistance ? Franchissement furtif d'une invalidation vs clôtures adverses / reprise confirmée du territoire. |
| **Gestion de position** | Bonne raison de rester, de protéger ou de sortir ? Un E3 adverse n'est pas forcément une sortie ; une position peut devoir s'arrêter sans que toute la campagne change de direction. |
| **Économie réelle** | **P&L brut, frais et P&L net** pour une position, ses fractions et l'épisode entier ; taille, durée, exposition, MFE et MAE en **écarts de cours BTC**, mouvement favorable retenu vs meilleur mouvement accessible. |
| **Risque et robustesse** | Perte effectivement subie au-delà de l'invalidation, MFE/MAE, protections déclenchées au prix *réellement observé* (non au stop idéal), vitesse de perte, drawdown et exceptions. |
| **Churn / liberté de réentrée** | Nombre d'entrées/sorties/inversions par épisode, frais répétés, mêmes setups recyclés, réentrées justifiées par une preuve nouvelle, occasions manquées parce qu'une ancienne position restait ouverte. |
| **Abstention** | Quelle opportunité le moteur n'a-t-il pas prise ? Pourquoi ? Vérifier les refus contre les **bonnes ET mauvaises** impulsions, sans attribuer rétrospectivement un trade rentable à chaque mouvement du prix. |

**Deux notions de réussite sont volontairement séparées :**

- **Réussite opérationnelle** : limiter le coût d'une tentative médiocre, sortir presque à l'équilibre, pouvoir rechercher une opportunité réellement neuve ; ce n'est pas nécessairement un trade gagnant économiquement. L'audit V5 #59–84 du 28/10 utilise **net ≥ −0,25 $** comme **convention descriptive de cette cohorte**, **pas un seuil universel ou un nouveau paramètre moteur**.
- **Rentabilité économique** : le bilan *net après frais* sur une cohorte et des campagnes suffisamment indépendantes ; les profits doivent compenser **les huit ou dix gros échecs aussi bien que les petits gains**. Un taux élevé de « réussites opérationnelles » peut coexister avec un P&L net négatif.

**Mesures à rapporter ensemble** : P&L net total et par épisode, frais cumulés et par aller-retour, taux de positions gagnantes **nettes** et de sorties opérationnellement utiles (séparés), MFE/MAE, part du MFE effectivement capturée lorsque le MFE est positif, drawdown, durée en position, nombre d'inversions, latence entrée/sortie, pertes évitées, faux positifs et occasions réellement ratées. Le ratio de captation ne suffit jamais seul : sortir tôt peut protéger d'un risque considérable. [Audit V5/V4 du 28/10](BOONO_audit_comparatif_V543_V494_gainfloor_sorties_2026-10-28.md).

## 4. Méthode d'enquête et de replay — critères de validité

1. **Fixer la question avant les résultats :** période, version d'entrée de chaque trade, épisode, position, dénominateur et hypothèse à contredire. Examiner les cas opposés, pas seulement l'exemple séduisant. Une observation sur dix secondes n'est pas une généralisation.
2. **Figer le passé :** code/commit, ledger, fenêtres, état du moteur et sources à la bonne date. Trier les événements sur **l'heure de connaissance réelle**, et non seulement leur timestamp de bougie ; une future divergence confirmée ne peut pas servir à justifier une entrée ancienne.
3. **Reconstituer la chaîne complète :** origine de la campagne → E15/3m/MF/prix/MA/PM accessibles → candidature → verrous visibles **et implicites** → décision et décision du PAPER → position/protection/sortie → coût net, puis épisode suivant. Les refus `WAIT` ne sont pas des trades fictifs.
4. **Comparer V4.9.4 et V5.4.3 sur les mêmes épisodes :** entrées proches ou déphasées, campagnes chevauchantes dans le même sens et opposées, maintien, sortie, réentrée et coûts. Deux trades qui se chevauchent ne constituent pas deux preuves indépendantes ; **21 chevauchements** du rapport du 28/10 représentent des *paires*, pas 21 expériences.
5. **Séparer observation et simulation :** « le prix est monté de 500 $ après la sortie » est un constat **ex post**. « Le moteur aurait gagné X » demande un replay complet avec position virtuelle, stops, P&L, nouvelles admissions bloquées ou permises, frais, qualité du flux et incertitude de fill ; calculer simplement le prix à +30/+60 min ne simule **pas** une politique.
6. **Contrôler les données négatives / manquantes :** mauvaise TF, décalage UTC/CET, Audit rotatif incomplet, trous MCB, snapshots à 30s plutôt que ticks 5s, ordre intrabougie indéterminé, résultats d'exécution hypothétiques. Étiqueter `UNKNOWN` ou `CENSORED`, ne pas « compléter » une preuve au jugé.
7. **Éprouver sans apprendre uniquement des cas d'origine :** tests unitaires positifs **et négatifs**, replay as-of sans fuite de futur, comparaison contre baseline inchangée, puis épisodes indépendants/prospectifs sur plusieurs régimes. Quantifier faux positifs et pertes nouvelles autant que gains potentiels.

**Un replay parfait des événements qui ont motivé une règle est seulement un test de cohérence *in-sample*.** Il ne prouve pas la performance hors échantillon ; il n'existe pas ici de **nombre minimal de trades, taux de réussite, ratio profit/risque ou p-value validé** comme seuil général de promotion d'une stratégie. De tels critères doivent être définis et approuvés séparément, puis mesurés sur des données adaptées.

## 5. Ce qui est acquis, et ce qui n'est pas encore un critère prouvé

| **Retenu / documenté** | **Toujours hypothèse ou chantier ouvert** |
|---|---|
| Enquête centrée sur événement, extrême prix, campagne et contexte ; horizon 15m directeur et 3m tactique dans V5.4. | Un modèle complet de rendement de chaque camp acheteur/vendeur par **buckets non chevauchants de 30 s** : proposé le 26/10, **non implémenté dans ce rapport**. |
| Source temporelle, disponibilité réelle des signaux, Live/confirmé, prix et MF en interaction, famille de preuve non doublée. | La capacité d'une détérioration de rendement et d'un transfert de territoire à prédire une sortie rentable plus tôt, sans sorties nerveuses. |
| Distinction campagne/position/gain-floor ; frais, net, MFE/MAE et alternance de bons/mauvais cas ; audit de l'abstention. | Un **shadow complet de maintien structurel** qui remplace les sorties gain-floor et reproduit toutes les réentrées et coûts : le replay actuel est indicatif, pas exact. |
| Comparaison de moteurs sur mêmes séquences et comptabilités **distinctes** ; vérification des étapes d'implémentation avant promotion. | Valeur ajoutée prédictive précise de la 1h/4h/Daily/Weekly, RSI/stochastic, nouveaux filtres ou seuils économiques universels. |
| WHERE et position du prix sont des **informations analytiques** essentielles ; l'utilisateur a refusé le veto WHERE autonome. | **Contradiction toujours active dans V4 :** `BOUNDARY_CONTEST` réintroduit un blocage indirect depuis WHERE ; documentée, **non corrigée** dans cette enquête. |

**Ne pas confondre « méthode retenue » et « mécanisme parfaitement appliqué ».** Ex. : la reconstitution du territoire et le refus du veto WHERE sont des principes de travail, alors que le code V4 contient encore des barrières héritées ; V5 peut également sur-attendre une défense du prix. [Audit des conventions et verrous](BOONOLAB_conventions_seuils_verrous_actifs_2026-10-28.md).

## 6. Routines de BoonoLab et traçabilité

**Cycle habituel :** formulation d'une observation par le propriétaire ou les journaux → **question falsifiable** → lecture ciblée de code, états et données sur Amsterdam → replay des épisodes favorables et défavorables → tableau d'effets positifs/négatifs/résiduels → proposition argumentée → **validation explicite** de toute modification décisionnelle → implémentation limitée/versionnée → tests et vérifications en service → comparaison prospectivement suivie.

**Règle de sobriété :** calculs, replays et preuves volumineuses restent sur Amsterdam ; l'échange ne reçoit que la question, les résultats décisionnels, les exceptions, l'incertitude et la prochaine étape. Enregistrer un checkpoint **après chaque constat important**, sans attendre la saturation de la discussion. Le suivi peut être à la journée, à l'épisode ou après plusieurs trades ; **une cadence automatique permanente n'est pas démontrée par le seul présent document**.

**Règle de provenance :** chaque **décision opérationnelle** doit disposer dans [le registre](operational-decisions/README.md) des textes intégraux demande/validation utilisateur et prompt réellement exécuté, de leur origine, de leur périmètre et des événements `AUTORISE / IMPLEMENTE / TESTE / MIS_EN_SERVICE`. Ne jamais présenter une intention comme un changement mis en service ni inventer une instruction originale. [Protocole de recherche compacte](BOONO_protocole_recherche_compacte_invalidations_2026-10-28.md).

**Critère final pour un travail réussi :** que la prochaine discussion puisse **retrouver la raison exacte de chaque conclusion**, ses preuves et ses limites, refaire la comparaison sur la même période, et identifier ce qui **reste à éprouver** — indépendamment de la taille ou de la durée du chat.

## 7. Démarrer une prochaine enquête

Lire d'abord [la carte générale](../BOONOLAB_START_HERE.md) puis [l'index thématique](BOONOLAB_INDEX.md), consulter la présente méthode et le [checkpoint](BOONO_protocole_recherche_compacte_invalidations_2026-10-28.md). Avant de proposer une amélioration, écrire en quelques phrases : **« Quelle campagne ? Où, depuis quand, quelles preuves connaissait BOONO ? Qu'ont fait V5 et V4 ? Quel coût économique complet ? Quel cas contradictoire pourrait invalider notre idée ? »**

**Provenance de ce référentiel :** [Orientation V5, 22/10](BOONO_V5_orientation_validee_2026-10-22.md) · [Bilan V1–V4, 22/10](BOONO_bilan_cloture_V1_V4_2026-10-22.md) · [Constitution V5.4, 26/10](BOONO_V54_constitution_active_2026-10-26.md) · [Origines/rendements, 26/10](BOONO_origines_2h_et_rendement_des_camps_2026-10-26.md) · [Comparatif/gain-floor, 28/10](BOONO_audit_comparatif_V543_V494_gainfloor_sorties_2026-10-28.md). Cette synthèse reste un **guide d'enquête**, pas un ordre de trading.
