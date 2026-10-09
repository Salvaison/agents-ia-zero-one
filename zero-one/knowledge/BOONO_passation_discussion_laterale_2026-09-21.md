# BOONO / ZeroOne Systems — Passation de la discussion latérale

**Date :** 21 septembre 2026  
**Destinataires :** discussions `BOONO Overnight MW` et `BOONO 24h Deep Review`  
**Origine conceptuelle :** observations et propositions de Benjamin Weibel ; structuration et synthèse par Astra.  
**Objet :** fournir une base commune pour le Market Watch, l’analyse globale quotidienne et d’éventuelles améliorations locales de BOONO.

## 1. Statut et gouvernance

Le présent document est une passation méthodologique. Il distingue :

- les faits observés ;
- les hypothèses à falsifier ;
- les décisions méthodologiques validées ;
- les améliorations éventuellement implémentables dans le périmètre autorisé.

Règle directrice conservée :

> Le serveur est la réalité opérationnelle. Les documents sont la mémoire et le contexte. Le code est l’état implémenté. Les intentions sont des hypothèses de conception.

Autorisation donnée pour la semaine : Astra peut décider et implémenter des ajustements locaux justifiés par les données, sans nouvelle approbation préalable, à condition qu’ils ne modifient pas l’architecture globale, les responsabilités des modules ou le concept de trading. Tout refactoring, restructuration ou changement conceptuel reste soumis à l’approbation explicite de Benjamin.

Cadence validée :

- les MW horaires observent et accumulent des preuves ;
- l’analyse globale quotidienne a lieu vers midi ;
- une seule fenêtre de modification est permise par jour au maximum, après cette analyse ;
- aucune modification n’est obligatoire si les preuves sont insuffisantes ;
- tout changement exige sauvegarde, tests, vérification des processus, compte rendu avant/après, justification et condition de rollback.

## 2. Protocole canonique Observation / Décision

La séparation suivante est validée comme référence :

> **OBSERVATION : DATA → CONTEXT → WHERE → STATE → SEQUENCE → CONVERSION → DOMINANCE**  
> **DÉCISION : ELIGIBILITY → RISK → ACTION**

Définition compacte :

- `DATA` : intégrité, fraîcheur, synchronisation et distinction live/confirmé ;
- `CONTEXT` : lecture top-down Weekly → Daily → 4h → 1h → 15m → 3m → ticker ;
- `WHERE` : localisation uniquement — niveaux, S/R, trendlines, liquidité, extrema, turning points, position dans la vague, invalidation et structural breach ;
- `STATE` : structure MCB, vague, LBW/BW/MF et relations multi-TF ;
- `SEQUENCE` : histoire causale récente et mémoire des événements ;
- `CONVERSION` : effort, rendement, yield, territoire gagné et acceptation ;
- `DOMINANCE` : contrôle démontré dans le temps, non simple pic d’effort ;
- `ELIGIBILITY` : droit de décider, qualité épistémique, localisation, R:R et maturité ;
- `RISK` : exposition, invalidation, protection et territoire disponible ;
- `ACTION` : `NO_TRADE`, `WATCH`, `ENTER`, `HOLD`, `PROTECT` ou `EXIT`.

Les états `KNOWN`, `AMBIGUOUS`, `CONTRADICTORY`, `UNKNOWN` et `INVALID_DATA` restent des métadonnées de sortie de l’observation. `UNKNOWN` n’est pas un échec : il doit être conservé comme matériau d’apprentissage.

## 3. Correction opérationnelle : ancre E15, extrême prix et invalidation

Une anomalie a été détectée lorsque l’état vivant affichait :

`wave origin SHORT — crête @80750`

alors que la véritable crête prix était `81485.9`.

L’inspection du serveur a établi que `80750` n’était pas une ancre périmée : il s’agissait de l’ancre historique E15/LBW. Le défaut venait de la confusion entre cette ancre et l’extrême réellement parcouru par le prix, partiellement manqué par l’échantillonnage antérieur.

Correction active sur Amsterdam :

- `wave.origin` : ancre historique E15/LBW ;
- `wave.price.maxPrice/minPrice` : extrême prix causal réel ;
- `risk.structural.invalidationPrice` : extrême utilisé par RISK puis figé à l’entrée d’une position ;
- `pricePath()` couvre maintenant les audits 30 s, les ticks live et les high/low des bougies OKX 15m.

État vérifié après correction :

- ancre E15/LBW : `80750` ;
- crête prix réelle : `81485.9` ;
- invalidation short : `81485.9` ;
- prix alors observé : `81118` ;
- distance structurelle positive ;
- `structuralBreached=false` ;
- disparition du motif erroné `structure deja invalidee avant admission` dans ACTION.

Fichiers modifiés sur Amsterdam :

- `modules/v3lab/layers/wave.js` ;
- `modules/v3lab/layers/risk.js` ;
- `modules/config-server.js` ;
- `tests/v3lab/coherence-regression.test.js` ;
- `knowledge/version-log.md`.

Toutes les suites V3 et V2 passaient après correction. `cerveau-central` et `config-server` étaient en ligne, le flux OKX reconnecté, aucune position n’était ouverte pendant les redémarrages et une sauvegarde complète précédait le correctif.

La question sémantique `DESCENTE/short` n’a volontairement pas été mélangée à cette correction factuelle.

## 4. Cas critique : SHORT engagé vers 02:00

### Observation de Benjamin

Le SHORT a été engagé au pire moment. Pendant environ 1 h 30, le prix suivait une structure ascendante identifiable avec des HH successifs à chaque retournement. Le contexte restait au-dessus des moyennes et le MF15 se renforçait.

Une attaque intense contre la frontière basse de cette structure — qu’elle soit matérialisée par LGI, une trendline ou une autre frontière causale — s’est bloquée malgré le combat. L’incapacité à franchir et conserver du terrain sous cette frontière indiquait que la structure tenait. BOONO a cependant interprété des preuves baissières locales comme une nouvelle dominance, sans suffisamment conserver la mémoire du contexte et du lieu.

Un phénomène comparable avait été observé avant la poussée de minuit.

### Synthèse validée

> Une attaque intense qui ne parvient pas à franchir une frontière structurelle n’affaiblit pas nécessairement la tendance. Elle peut constituer un stress test réussi qui renforce la preuve que la frontière tient.

Séquence hypothétique à rechercher :

> tendance de fond établie → retour contre la tendance → attaque de la frontière → effort intense → conversion insuffisante → absence d’acceptation → défense/reclaim → libération dans le sens de fond

Une simple pénétration ne suffit pas à invalider la structure. La falsification exige une acceptation au-delà de la frontière, l’incapacité de reclaim et une persistance adverse.

Conséquence décisionnelle : près d’une frontière déjà éprouvée, après échec causal de l’attaque adverse, une entrée dans le sens de fond peut offrir un meilleur R:R qu’une entrée tardive après expression complète du mouvement.

Cette séquence reste une hypothèse à tester sur les rapports de la semaine ; elle ne doit pas être transformée en loi universelle à partir de deux occurrences.

## 5. Défaut comportemental suspecté : confirmation tardive

Benjamin observe que BOONO valide parfois une tendance seulement lorsqu’elle s’est presque entièrement exprimée :

1. accumulation de confirmations ;
2. conviction maximale tardive ;
3. entrée loin de l’équilibre avec mauvais R:R ;
4. respiration ou retournement ;
5. nouvelle accumulation tardive de preuves opposées ;
6. prise à contre-sens.

Hypothèse de travail : BOONO confond encore trop souvent qualité de la preuve directionnelle et qualité du moment d’entrée.

La décision devrait séparer :

- la conviction structurelle, construite et conservée dans le temps ;
- le déclencheur tactique, recherché à un lieu favorable ;
- la maturité/extension, qui peut interdire de poursuivre un mouvement pourtant correctement identifié.

## 6. Modèle du balancier et localisation

Une tendance forte ne signifie pas automatiquement retournement immédiat. Elle doit simultanément augmenter :

- la conviction de continuation tant que la structure tient ;
- la vigilance contre une entrée tardive lorsque le prix est déjà très éloigné de son équilibre dynamique.

Dans un canal ascendant :

- près de la frontière basse défendue : continuation potentielle avec bon R:R ;
- au centre : asymétrie plus faible ;
- très étendu au-dessus du centre : ne plus poursuivre aveuglément ;
- après transfert structurel démontré : envisager le sens opposé.

Le centre est dynamique : médiane du canal, régime de moyennes, valeur ou autre estimation causale à définir et à tester.

## 7. Prévision `mwf-20260921-0600Z`

Prévision figée à `2026-09-21 06:03:55Z` :

> H+1 : breakout haussier de `81485.9` confirmé localement, avec respiration 3m probable après `81750`. Validation : `81485.9` et MA200 3m (~`81293`) restent majoritairement support, puis nouveau test de `81750–81800` avec dominance long persistante `.70/.80` et terrain conservé. Invalidation : réintégration durable sous `81485.9`, puis perte de `81350` avec dominance short persistante et translation vendeuse ; plus sévèrement, ≥15 min sous MA200 3m avec dégradation LBW/BW3.

Éléments déjà observés au moment du gel :

- prix `81351.8 → 81516.2` ;
- moyenne `81491.7` ;
- maximum `81750.1` ;
- passage 15m `DESCENTE → MONTEE` ;
- prix au-dessus des MA200 3m, 15m, 1h, 4h et daily ;
- dominance short→long ;
- SHORT précédent : `−0.629 %` ;
- LONG de retournement : `+1.544 %` ;
- bilan : `+0.915 %` ;
- MFE du LONG : `407.6 $`, MAE `0 $`, capture `30.8 %`.

La partie réellement prédictive était le maintien du breakout, le nouveau test de `81750–81800` et la respiration sans réintégration invalidante.

Capture à `08:36:31` heure de Paris :

- prix `81699.9` ;
- `81485.9`, `81350` et le support visible `81401.9` conservés ;
- nouvelle impulsion au-dessus de `81750–81800` ;
- pointe graphique approximative vers `81850–81880` ;
- respiration vers `81700` sans destruction de la structure ;
- MACD 3m encore positif : `73.1 / 71.9`, histogramme `+1.2`.

Conclusion provisoire : la branche future de la prévision est validée graphiquement dans son ordre causal. L’audit doit encore vérifier dominance `.70/.80`, conversion, territoire conservé et comportement effectif de BOONO.

Fenêtre d’audit à examiner :

`2026-09-21 06:03:55Z → 06:36:31Z`  
soit `08:03:55 → 08:36:31` heure de Paris.

## 8. Conviction, falsification et retournement

Décision conceptuelle validée : une prévision doit être une conviction opératoire et falsifiable, pas seulement un commentaire probabiliste recalculé à chaque tick.

Principe fondamental :

> La falsification d’une thèse et la confirmation de la thèse inverse sont deux événements différents.

Donc :

> `LONG falsifié ≠ SHORT confirmé`  
> `SHORT falsifié ≠ LONG confirmé`

Machine d’état proposée comme hypothèse de conception :

1. `THESIS_LONG_ACTIVE` — la structure supérieure justifie la conviction ;
2. `THESIS_LONG_STRESSED` — attaque adverse dans la tolérance prévue ;
3. `THESIS_LONG_REASSERTED` — attaque échouée, structure renforcée ;
4. `THESIS_LONG_FALSIFIED` — condition propre à la thèse détruite ;
5. `FLAT / UNKNOWN` — la thèse est morte, sans preuve suffisante du sens opposé ;
6. `THESIS_SHORT_ACTIVE` — nouvelle thèse fondée sur ses propres preuves.

Une position doit pouvoir être liquidée quand sa propre thèse échoue, sans attendre que la tendance inverse soit entièrement démontrée. Un retournement de position exige toutefois une nouvelle thèse opposée suffisamment mature.

La conviction doit avoir de la mémoire et de l’hystérésis : les attaques adverses prévues ne la remettent pas à zéro. BOONO doit être fidèle à sa condition de falsification pré-engagée, non obstiné envers une direction.

Hypothèse décisionnelle à tester : lorsqu’une prévision structurelle LONG reste active, une action SHORT issue de la seule microstructure devrait être interdite jusqu’à falsification de cette thèse. Ce point peut toucher l’architecture décisionnelle ; toute implémentation structurelle doit donc être proposée à Benjamin avant exécution.

## 9. Comportements attendus à mesurer dans les faits

Les analyses horaires et quotidiennes doivent déterminer si BOONO :

- évite les SHORT contre une structure haussière éprouvée tant qu’aucun transfert baissier n’est démontré ;
- reconnaît une attaque échouée comme stress test de la frontière ;
- recherche l’entrée près d’une invalidation structurelle au lieu d’attendre la fin du déplacement ;
- conserve une conviction de fond pendant les respirations 3m compatibles ;
- utilise `HOLD/PROTECT` sans confondre protection et liquidation ;
- sort dès que sa propre thèse est falsifiée ;
- reste `FLAT/UNKNOWN` si la thèse initiale meurt sans thèse opposée mature ;
- évite une entrée tardive lorsque le mouvement est déjà très étendu ;
- distingue qualité directionnelle, localisation, maturité et R:R.

Mesures recommandées pour la revue quotidienne :

- nombre d’entrées tardives après expression majeure du mouvement ;
- nombre de trades contre une thèse structurelle encore valide ;
- distance normalisée de l’entrée au centre et aux frontières du canal ;
- MFE/MAE et capture ;
- attaques adverses : effort, pénétration, durée, acceptation et reclaim ;
- temps entre première éligibilité structurelle et entrée réelle ;
- comportement du bot pendant les séquences minuit, 02:00 et 07:06 ;
- comparaison entre prévision figée, actions du bot et résultat futur ;
- cas `UNKNOWN` et information manquante ayant empêché la décision.

## 10. Pont de données partagé entre discussions

Benjamin a validé le principe qu’une discussion d’analyse doit elle aussi accéder aux données récentes. Comme les accès SSH ne sont pas transférables entre discussions, la solution retenue en principe est un snapshot partagé en lecture seule.

Fichier proposé :

`BOONO-live-snapshot.json`

Contenu :

- état vivant ;
- fenêtre récente d’audit ;
- positions et trades ;
- RISK/ACTION ;
- événements importants ;
- prévision active et évaluation ;
- fraîcheur et timestamps des sources.

Garde-fous validés en principe :

- aucune collecte supplémentaire ; extraction des données déjà produites ;
- fenêtre roulante maximale de 2 heures ;
- environ 240 observations à cadence 30 s, plafond recommandé de 500 ;
- exclusion des ticks OKX bruts ;
- un seul fichier remplacé atomiquement, jamais append sans limite ;
- plafond dur recommandé de 10 Mo non compressés ;
- génération en streaming ;
- suppression du temporaire après remplacement ;
- aucune duplication horaire conservée sur Amsterdam ;
- arrêt de l’export et alerte si l’espace libre descend sous 20 % ;
- vérification préalable de `df`, de la taille/croissance des audits et du fonctionnement de leur rotation.

La revue 24 h peut produire une synthèse séparée beaucoup plus légère ; les données brutes restent dans l’audit opérationnel existant.

## 11. Consignes aux deux discussions destinataires

### `BOONO Overnight MW`

1. Utiliser immédiatement le protocole Observation/Décision séparé dans les rapports.
2. Examiner la fenêtre d’audit `06:03:55Z → 06:36:31Z` pour évaluer `mwf-20260921-0600Z` après son gel.
3. Vérifier si BOONO a conservé la conviction LONG ou envisagé des SHORT issus de la seule microstructure.
4. Continuer à figer les prévisions avant leur fenêtre d’évaluation et séparer ce qui était déjà observé de ce qui était réellement prédit.
5. Mettre en place le snapshot partagé borné si cela reste un changement d’infrastructure local et sûr ; documenter sauvegarde, test, taille réelle et rollback.
6. Ne pas modifier les seuils à chaud sur un événement isolé.

### `BOONO 24h Deep Review`

1. Reconstituer causalement les séquences comparables de minuit, 02:00 et 07:06.
2. Évaluer la confirmation tardive, la localisation des entrées et la mémoire de conviction.
3. Distinguer échec d’une thèse et maturité de la thèse inverse.
4. Examiner les attaques de frontière par effort, conversion, acceptation, reclaim et rendement opposé.
5. Décider au maximum une fois par jour d’un éventuel changement local, uniquement sur preuves convergentes.
6. Si l’amélioration exige une machine de thèse persistante ou une modification des responsabilités décisionnelles, produire une proposition explicite pour validation de Benjamin avant implémentation.

## 12. Résumé directeur

> Une prévision utile n’est pas seulement une estimation du futur : c’est une thèse structurelle choisie, localisée, mémorisée et falsifiable. Elle doit survivre aux attaques prévues, mourir dès que ses propres conditions échouent, puis laisser le système neutre tant qu’une thèse inverse n’a pas été démontrée.

> BOONO ne doit plus attendre que le mouvement soit presque entièrement exprimé pour acquérir sa conviction. Il doit reconnaître quand une structure déjà éprouvée vient de survivre à une attaque, à un endroit où l’erreur coûte peu.

## 13. Addendum actif — autorisation et hypothèse du 21 septembre 2026

### Fait implémenté à vérifier
Le code actif associe actuellement l’extrême de prix depuis E15 à `risk.structural.invalidationPrice`,
fige cette valeur dans la position, puis ACTION traite son franchissement comme `EXIT_STRUCTURE`.
Pour un retournement SHORT après une crête reconnue, cette valeur peut donc être égale au top reconnu.

### Hypothèse de Benjamin à falsifier
Cette égalité pourrait révéler une confusion sémantique : une limite de protection prix n’est pas
nécessairement l’invalidation de la tendance. À ce stade, il pourrait ne pas exister de niveau prix
unique qui invalide à lui seul la tendance. L’invalidation directionnelle devrait être testée comme
une séquence : tendance adverse MCB naissante, puis retournement E15→E15 confirmé.

Le Deep Review doit distinguer :
- l’ancre historique E15/LBW ;
- l’extrême parcouru et l’éventuelle limite de risque/exécution ;
- le stress ou la falsification de la thèse active ;
- la confirmation autonome de la thèse inverse.

### Autorisation conditionnelle étendue
Après les conclusions et la décision du Deep Review 24 h, une modification structurelle ciblée est
autorisée sans nouvelle demande dans le périmètre suivant : admission `REVERSAL_FORMING` selon
position dans la vague, localisation, maturité/extension et R:R ; séparation entre protection prix
et invalidation de tendance E15→E15. Une seule fenêtre de changement par jour demeure permise,
avec preuves convergentes, backup, tests, replays, journal avant/après et rollback. Si les preuves
sont insuffisantes, aucune modification ne doit être faite. Toute refonte plus large reste exclue.

### Continuité impérative
Les MW horaires doivent se poursuivre pendant toute la semaine de validation sans nouvelle
confirmation. Aucun commentaire dans une discussion parallèle ne doit les suspendre ou les annuler.
