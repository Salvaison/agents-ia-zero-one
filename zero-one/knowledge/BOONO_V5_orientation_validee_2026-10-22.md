# BOONO Systems — V5 : orientation fondatrice corrigée et validée

**22 octobre 2026 — base conceptuelle de discussion, PAS une constitution implémentable ni une autorisation de modifier le moteur V4.**

## Portée de la validation

L'utilisateur valide les **trois objets fondateurs** de la version V5 :
1. **La campagne MCB**, définie par beaucoup plus que les seuls E15 : position sur la vague et le range, contexte 1h/4h/Daily/Weekly, trajectoires causales E15→E15 et E3→E3, extrema, frontières, croisements BW/LBW, signaux natifs Live/confirmés, MF, prix/terrain, respirations, tentatives adverses et persistance.
2. **Sa mémoire Elastic**, chargée de synchroniser dans le temps les mémoires de vagues E15 et E3, croisements, MF, succession de signaux entre horizons, prix, qualités de conversion et PM Live. Une mémoire parent/enfant préserve le lien entre les phénomènes plutôt que de compter les indicateurs comme des votes distincts.
3. **Sa fenêtre d'exploitation**, qui qualifie *quand* les signaux deviennent une opportunité économique et exploitable, **sans imposer de séquence rigide** à leur arrivée et sans délai artificiel de confirmation. Elle distingue première attaque, opposition, respiration, reprise et impulsion terminale.

## Correction importante : Conversion et QUALITÉ ne sont pas deux moteurs indépendants

- **Conversion** mesure le comportement de l'effort, son rendement et le terrain gagné/retendu ; le prix en temps réel / PM Live fait l'arbitrage de cette conversion pour la thèse courante.
- **QUALITÉ** (p. ex. `POWERFUL`, `EASY`, `INEFFICIENT`, `SILENT`, `CONTESTED`) est la **synthèse en classes de la conversion observée**, issue de la chronologie effort/rendement et de la microstructure. Ce n'est **pas une seconde famille autonome ni un score de confirmation**.
- Les changements rapides de QUALITÉ restent visibles, mais une fenêtre temporelle interprétative permet de distinguer une oscillation ponctuelle de la tendance des qualités d'effort. Ne pas synthétiser deux fois la même observation dans les permissions d'entrée.
- Le ticker temporel **4 × 15 min** est d'abord **un enrichissement de l'affichage du graphe de conversion Elastic** : qualité instantanée dans son en-tête, et à côté une profondeur 1h fondée sur quatre épisodes 15m. Il ne doit pas devenir une quatrième branche du moteur, un nouveau « ticker » indépendant du flux déjà présent, ni un vote directionnel.
- Chaque épisode 15m conserve fraction de temps par qualité et camp, évolution du rendement/effort, proportion d'efforts stériles/productifs, contre-efforts et conservation du terrain. Afficher la différence entre la dernière bougie en formation et les bougies closes ; prendre en compte la couverture et les données manquantes.
- Les moyennes de labels catégoriels sont dépourvues de signification ; préférer **distribution de durée**, fréquence des transitions et tendances des mesures numériques sous-jacentes. Éviter de sommer des fenêtres PM3/PM5 de volume chevauchantes.
- Exemple de résumé d'en-tête proposé (**exemple fictif**) : `QUALITÉ LIVE · POWERFUL SHORT | 1h : SHORT AFFAIBLI · 3/4 bougies vendeuses · rendement ↓ · contre-effort LONG ↑`. Affichage réel et nomenclature à tester visuellement, sans redondance avec FLOW.

## Horloges / synchronisation : lente propose, rapide traduit

- 1W, 1D, 4h, 1h : contextes et mémoires, pouvoirs respectifs encore **à conceptualiser**, ne pas leur donner de veto fixe et universel.
- 15m / E15 : structure et campagne de travail, hypothèse de fond possible **avant** un E3 exploitable ; vieillissement d'un mouvement, tentative de crête/creux et conditions d'invalidation.
- 3m / E3 : réactions et tests de la campagne, tentatives adverses réitérées, confirmation tactique, fenêtre d'entrée précoce.
- PM Live : arbitre immédiat de la **conversion réelle** des hypothèses qui se présentent et se synchronisent, à lire avec le prix conservé et la structure ; ce n'est pas une autorité indépendante de choisir une thèse sans MCB, ni un contournement des protections de risque.
- **« Sans délais »** signifie pas d'attente arbitraire de N bougies ou d'E15 confirmé lorsque la chaîne causale et le PM Live rendent déjà une opportunité exploitable. Ce n'est ni accès à des confirmations futures, ni disparition de la latence réelle du flux (observations actualisées environ 30s), ni permission sans données fraîches.

## Fenêtres d'entrée et alternances du marché

- Une forte impulsion dans un sens peut être suivie d'une respiration opposée ; il est essentiel de **détecter la fin économique** de l'impulsion précédente avant d'entrer dans la suivante. Exemple : chercher un LONG *après* une séquence SHORT lorsque la transition acheteuse devient productive, pas acheter aveuglément la crête d'un LONG déjà avancé.
- **Ce n'est pas une loi automatique de retour quasi équivalent** : le prix peut continuer, corriger faiblement ou inverser violemment. V5 doit tester amplitude, délai, ordre des événements et probabilité empirique par contexte, et ne doit ni anticiper le contre-mouvement par défaut ni interdire des continuations valables.
- **Opportunité** qualifie la pertinence des signaux dont l'ordre réel peut varier : leur origine temporelle, leurs liens causaux, leur maturité économique, leurs contradictions et le terrain restant, non une checklist figée.

## Niveaux de vérité et travaux réservés

### Points approuvés conceptuellement
- Trois objets : **campagne MCB + mémoire Elastic + fenêtre d'exploitation**.
- Qualité = classification/interprétation de la conversion, **pas un système parallèle**.
- Ticker temporel 1h **dans le graphe de conversion**, fourchette quatre bougies 15m ; enrichir qualitativement les fluctuations, sans double comptage.
- Relation temporelle causale, sans liste de signaux obligatoirement dans un ordre.
- Hiérarchie des horizons comme proposée ; leurs pouvoirs décisionnels précis restent ouverts.
- Préserver séparation marché / exécution, données fraîches, anti-doublons, protection de risque et frais.

### Hypothèses à falsifier avant code actif
- Fiabilité de l'alternance après une forte impulsion ; profondeur des retracements et timing exploitable.
- Quels rapports et résumés 4×15m anticipent un essoufflement plutôt qu'une simple respiration ?
- Relation et autorité 1h/4h/Daily/Weekly dans les campagnes 15m/3m.
- Groupement des 98 évaluations V4 refusées par lieu sur MCB, campagne E15, cycle E3 et rendement après décision.
- Risque de churn et continuité après sortie/réentrée sans nouveaux garde-fous superflus.

## Non-autorisation
Ce document représente une **orientation V5 de conception validée**. Il ne crée aucune règle d'entrée/sortie, ne modifie pas BOONOTRADE V4.10.10, Elastic shadow v0.5 ni l'interface, et ne promeut aucun shadow en autorité de trading. Les étapes de replay/épreuve économique après frais et la proposition d'un moteur opérationnel sont distinctes.
