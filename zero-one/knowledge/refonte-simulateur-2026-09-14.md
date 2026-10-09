# BOONO — Refonte méthodologique et simulateur Constitution v0.1

Date : 14 septembre 2026
Statut : implémentation autorisée par Benjamin, simulateur uniquement.

## 1. Objet

Ce document récapitule l'enquête Market Watch des 11–13 septembre, les contrôles du 4 septembre lorsque disponibles, la synthèse méthodologique validée, puis la refonte du simulateur BOONO qui en découle.

Principe de gouvernance conservé : le serveur est la réalité opérationnelle, les documents la mémoire, le code l'état implémenté, les intentions des hypothèses de conception. La refonte décrite ici concerne uniquement le simulateur. Elle ne vaut pas autorisation générale de modifier BOONOTRADE, TradingView, les collecteurs ou les autres processus.

## 2. Résultat central de l'enquête

Architecture de lecture validée comme hypothèse de travail :

**MCB / structure multi-TF → vague → lieu → état énergétique → effort transactionnel → efficacité de l'effort → évolution du rapport de force → persistance/asymétrie → décision.**

Formulation courte issue du Market Watch :

**MCB / E15 : contexte structurel**
→ **Ticker / flow : événement et effort**
→ **price-yield : efficacité de cet effort**
→ **évolution du yield + PM successifs : changement possible du rapport de force**
→ **persistance / asymétrie : mouvement réellement gagné et conservé**.

Le Ticker ne remplace donc pas MCB. Il décrit la dynamique interne d'une structure donnée par MCB.

## 3. Ce que les données ont démontré

### 3.1 Cadence / flow = intensité, pas direction

Sur le 11 septembre, les événements de cadence extrême apparaissent dans les deux sens. Le top 5 % de cadence contenait autant de PM positifs que négatifs dans l'analyse de référence. Les 4, 12 et 13 septembre confirment également qu'une cadence élevée n'impose pas le signe du prochain mouvement.

Conclusion : cadence et BTC/s renseignent d'abord l'intensité de l'événement. Ils ne constituent pas une boussole directionnelle.

### 3.2 Vol, taille moyenne, cadence et BTC/s sont liés

Sur une fenêtre de 200 trades :

- `Vol ≈ taille moyenne × 200`
- `BTC/s ≈ taille moyenne × cadence`

Ces grandeurs ne peuvent donc pas être comptées comme confirmations indépendantes.

Le 13 septembre a fourni plusieurs contrôles où un volume élevé coexistait avec une faible cadence : de gros trades arrivaient lentement. Le volume absolu n'était alors pas synonyme d'impulsion.

### 3.3 La durée de fenêtre est structurante

Une fenêtre de 200 trades peut couvrir moins d'une seconde pendant un washout et plusieurs minutes dans un marché de weekend.

`winSec` est donc indispensable pour interpréter Vol et cadence. Un même volume sur 1 seconde ou 5 minutes ne décrit pas le même marché.

### 3.4 Price-yield = productivité de l'effort

Le rapport déplacement de prix / BTC engagés sépare deux situations différentes :

- beaucoup d'effort pour peu de prix : effort peu productif / neutralisé ;
- peu d'effort pour beaucoup de prix : fragilité locale / facilité de déplacement.

Le 13 septembre a montré les deux extrêmes à plusieurs reprises.

### 3.5 Faible yield n'est pas une absorption automatique

Le contrôle weekend a falsifié la règle naïve : `high-flow + low-yield = absorption = reversal`.

Une mauvaise conversion peut durer sans retournement, apparaître dans un marché mort ou précéder une continuation. L'absorption doit donc être une séquence causale, pas une valeur instantanée.
### 3.6 Séquence de changement de rapport de force

Hypothèse de travail validée :

**effort inhabituellement élevé pour le régime → conversion qui s'effondre → direction initiale incapable de prolonger → rendement opposé qui augmente → asymétrie opposée qui persiste.**

Cette formulation réduit le hindsight car chaque étape doit devenir observable avant la suivante.

### 3.7 Structure valide ≠ position survivable

Le washout du 11 septembre constitue le cas de référence. Le long simulé autour de 76 903,6 a été confronté à une excursion de plus de 500 USD alors que la structure MCB supérieure a ensuite survécu au reclaim.

Conclusion : une thèse structurelle peut rester valide alors que le chemin est financièrement non survivable. Les sorties doivent donc distinguer :

- invalidation structurelle ;
- invalidation d'exécution ;
- invalidation de risque.

### 3.8 Le fakeout du 11 n'est pas démontré comme prévisible ex ante

Les précurseurs précédant le washout étaient contradictoires. L'enquête n'a pas trouvé de signature suffisamment spécifique pour affirmer avant l'événement qu'il s'agissait d'un liquidity grab.

La piste exploitable est plus prudente : reconnaître causalement l'échec de continuation, l'amélioration du rendement opposé et sa persistance après le choc.

### 3.9 Le weekend est un contrôle nécessaire

Le 13 septembre a produit isolément presque toutes les briques qui auraient pu être prises à tort pour des signaux : forte cadence, gros Vol, gros trades, high-yield, low-yield, flips MCB courts, transitions E15.

Mais ces briques ne produisaient pas automatiquement une dynamique exploitable. Elles démontrent l'importance du régime et de la séquence.

### 3.10 CADENCE_SANITY_CEILING=120 est falsifié comme plafond économique

Des cadences supérieures à 120/s existent dans plusieurs journées et peuvent être cohérentes avec de vrais événements de marché. Le vrai contrôle de qualité doit porter sur la fenêtre : nombre de ticks, timestamps, monotonie, durée positive, résolution, duplications et gaps.

La Constitution v0.1 ne rejette donc aucune observation uniquement parce que la cadence est élevée.

## 4. La vague MCB : définition retenue

La vague complète n'est pas `E15 → E15`.

Une vague haussière est conceptuellement :

**0 → développement positif → E15 positif → retour vers 0**.

Une vague baissière :

**0 → développement négatif → E15 négatif → retour vers 0**.

E15 est l'extremum structurel reconnu de la vague.

L'intervalle `E15_n → E15_n+1` reste important : il contient la résolution de la vague précédente, le passage par zéro et la construction de la suivante.

### 4.1 Dimension temporelle

Le temps fait partie du signal. Pour chaque vague, il faut distinguer :

- durée `0 → E15` ;
- durée `E15 → 0` ;
- durée totale ;
- amplitude LBW ;
- vitesse moyenne de développement ;
- asymétrie entre construction et résolution.

Deux vagues de même amplitude peuvent être économiquement très différentes si leur durée, leur effort transactionnel ou leur impact prix diffèrent.

### 4.2 Ticker dans la vague

Il n'est pas nécessaire d'inventer un second ticker. Les métriques existantes peuvent être indexées sur la vague en cours.

Le simulateur V2 maintient donc une mémoire de vague et y rattache les observations de microstructure.

Important : `volumeFenetreBtc` est une fenêtre glissante et se chevauche. Il ne peut pas être additionné naïvement pour produire un volume cumulé exact de vague. La V2 utilise seulement une estimation intégrée à partir du BTC/s échantillonné, explicitement marquée comme estimation. Un volume de vague exact exigera plus tard des trades bruts non chevauchants ou des identifiants de transactions.

## 5. Top-down analyse

La lecture est désormais hiérarchique : Weekly → Daily → 4h → 1h → 15m → 3m → Ticker.

Chaque TF est décrit, pas forcé dans une fausse unanimité. Les états possibles incluent notamment : alignement haussier, alignement baissier, conflit ou information insuffisante.

Une oscillation courte contraire au temps long peut être une correction. Le Ticker ne possède jamais à lui seul l'autorité de renverser la structure.
## 6. États de compréhension

La V2 distingue explicitement :

- `KNOWN` : configuration reconnue ;
- `AMBIGUOUS` : plusieurs lectures plausibles ;
- `CONTRADICTORY` : couches lisibles mais incompatibles ;
- `UNKNOWN` : comportement réel hors des modèles connus ;
- `INVALID_DATA` : observation techniquement non fiable.

`UNKNOWN` n'est pas une erreur. Ces cas sont comptés par empreinte de contexte pour devenir des objets d'enquête ultérieurs.

Aucun état autre que `KNOWN` ne peut déclencher une entrée dans la V2.

## 7. États énergétiques et microstructurels

La V2 calibre les seuils relativement aux deux dernières heures de données, et non par valeurs absolues universelles.

Énergie : `DEAD`, `QUIET`, `NORMAL`, `REACTIVE`, `EXTREME`.

Effort : `LOW`, `NORMAL`, `HIGH`, `SLOW_LARGE_TRADES`.

Conversion : `LOW`, `NORMAL`, `PRODUCTIVE`, `FRAGILE`, `NEUTRALIZED`.

Les percentiles servent à décrire le régime local et non à attribuer directement une direction.

## 8. Garde-fou de qualité des fenêtres

La V2 contrôle :

- fraîcheur du dernier audit ;
- `winSec > 0` ;
- cadence non négative ;
- volume non négatif ;
- cohérence approximative entre cadence observée et `200 / winSec`.

Une erreur de cohérence supérieure à 20 % dégrade la qualité de la fenêtre mais ne crée pas de plafond de cadence arbitraire.

Les timestamps détaillés des 200 trades ne sont pas encore exposés au simulateur ; la validation complète monotonie/duplication/gaps reste donc un chantier ultérieur.

## 9. Séquence causale implémentée

La V2 recherche dans les dernières fenêtres :

1. effort élevé relativement au régime ;
2. faible conversion ;
3. incapacité du sens initial à prolonger ;
4. apparition d'un rendement élevé dans le sens opposé ;
5. persistance du sens opposé sur les PM récents.

Les étapes sont journalisées comme :

- `EFFORT_NEUTRALIZED` ;
- `INITIAL_FAILURE` ;
- `OPPOSITE_PRODUCTIVE` ;
- `FORCE_SHIFT`.

Seul `FORCE_SHIFT` constitue une séquence complète.

## 10. Lieu structurel

La V2 lit sans modifier :

- `trendlines.json` ;
- `levels.json`.

Un lieu est pertinent lorsqu'une trendline est active ou qu'un niveau est suffisamment proche. Le sens du lieu doit être compatible avec l'entrée : support pour un long, résistance pour un short, avec traitement neutre des familles POC/Fibonacci.

## 11. Opportunités

Deux archétypes sont actuellement définis.

### 11.1 Continuation

Une continuation ne devient `READY` que si :

- le contexte supérieur est aligné ;
- la vague 15m est dans le même sens ;
- le lieu est compatible ;
- le marché est réactif ou extrême ;
- la conversion est productive ;
- le PM immédiat va dans le même sens.

Sinon l'état reste `WATCH`, `FORMING` ou `NONE`.

### 11.2 Reversal

Un retournement ne devient `READY` que si :

- la séquence `FORCE_SHIFT` est complète ;
- le lieu est compatible ;
- le sens proposé s'oppose à la vague en cours ;
- un E15 structurel a déjà été observé dans cette vague.

Le système n'anticipe donc pas un fakeout avant preuve causale de changement de rapport de force.

## 12. Entrées et abstention

Une entrée n'est possible que sur `READY`.

Les états `UNKNOWN`, `AMBIGUOUS`, `CONTRADICTORY`, `INVALID_DATA`, marché `DEAD` ou absence de lieu cohérent conduisent à `NO_TRADE`.

Le simulateur est ainsi autorisé à ne pas avoir d'opinion.

## 13. Sorties

Trois familles sont désormais séparées dans l'historique.

### `EXIT_RISK`

- stop adverse fixe de 500 USD ;
- mouvement adverse violent sur un cycle selon le seuil existant.

Cette sortie peut survenir alors que la structure reste valide.

### `EXIT_STRUCTURE`

- passage de LBW15 à travers zéro donnant une vague opposée après la période de grâce ;
- alignement des timeframes supérieurs devenu opposé.

### `EXIT_EXECUTION`

- `FORCE_SHIFT` persistant contre la position ;
- marché classé `DEAD` pendant dix cycles consécutifs après la période de grâce.

Cette séparation permet d'étudier indépendamment thèse, exécution et survivabilité.
## 14. Journal scientifique

La V2 écrit quatre fichiers séparés :

- `trade-sim-v2-state.json` : état vivant ;
- `trade-sim-v2-history.json` : entrées/sorties et causes ;
- `trade-sim-v2-decisions.json` : décisions et abstentions contextualisées ;
- `trade-sim-v2-waves.json` : vagues 0→E15→0 fermées et leurs métriques.

Les décisions répétitives identiques sont compressées temporellement afin de ne pas saturer le journal, tout en conservant les changements d'état importants.

## 15. Première observation live après activation

Au premier test puis après redémarrage de `cerveau-central`, la V2 a observé :

- vague LBW15 partielle baissière ;
- régime top-down conflictuel ;
- microstructure passant d'un état extrême/productif à un état plus calme ;
- une séquence partielle `EFFORT_NEUTRALIZED` ;
- aucun setup `READY`.

Décision : `NO_TRADE`.

Ce comportement est cohérent avec la Constitution : la présence d'une activité transactionnelle ne suffit pas à produire une direction lorsque les couches structurelles se contredisent.

## 16. Modifications techniques effectuées

Sauvegardes créées avant intervention :

- `modules/trade-simulator.js.pre-constitution-20260914T120110Z`
- `config.json.pre-constitution-20260914T120110Z`

Nouveau moteur :

- `modules/trade-simulator-v2.js`

Point d'entrée stable :

- `modules/trade-simulator.js` charge désormais `trade-simulator-v2.js`.

`cerveau-central` a été redémarré après vérification syntaxique afin de charger la nouvelle version. Aucun autre processus n'a été redémarré ou modifié.

Le collecteur, `baton-relay`, TradingView, `moteur-boono`, les données MCB et BOONOTRADE réel n'ont pas été modifiés par cette refonte.

## 17. Ce qui reste volontairement non résolu

### 17.1 Seuils

Les frontières entre DEAD/QUIET/NORMAL/REACTIVE/EXTREME utilisent actuellement des percentiles locaux sur deux heures. C'est une hypothèse de départ, pas une loi validée.

### 17.2 Volume exact d'une vague

L'intégration BTC/s fournit une estimation de matière transactionnelle. Le vrai volume exact exigera un flux brut non chevauchant.

### 17.3 Top-down

La classification initiale utilise les signes de LBW/BW/MF des TF supérieurs. Elle doit être confrontée aux observations visuelles et pourra évoluer, notamment avec l'enrichissement Daily/Weekly historique.

### 17.4 Divergences structurelles

Elles ne sont pas encore intégrées comme condition d'entrée V2. Elles restent un chantier prioritaire, particulièrement avec la future fiche d'identité des vagues et les ancres historiques longues.

### 17.5 Niveaux / trendlines

Ils sont utilisés comme lieu, mais leur qualité et leur hiérarchie ne sont pas encore scorées ni comparées à l'historique des réactions.

### 17.6 Tranches 25/65/10

La V2 ne reconduit pas la mécanique historique de tranches comme loi fondamentale. Elle privilégie d'abord des sorties entièrement attribuables à `RISK`, `STRUCTURE` ou `EXECUTION`. Une structure de prise de profit pourra être réintroduite après mesure, sans mélanger la validation de la thèse avec la gestion de taille.

## 18. Critère de réussite de la prochaine phase

La V2 n'est pas jugée sur sa capacité à produire beaucoup de trades.

Elle sera jugée sur sa capacité à :

1. expliquer causalement ses décisions ;
2. s'abstenir lorsque l'état est ambigu ou inconnu ;
3. reconnaître les mêmes configurations sur plusieurs régimes ;
4. séparer correctement structure, exécution et risque ;
5. conserver les cas UNKNOWN comme nouveaux objets d'enquête ;
6. être falsifiable sans réécriture rétrospective des règles.

## 19. Principe final

**La vague donne la structure. Le temps décrit son développement. Le Ticker décrit son métabolisme interne. Le prix révèle ce que cet effort réussit à produire. Le lieu donne le sens contextuel. La persistance indique si le rapport de force est réellement gagné.**

Lorsque ces couches ne composent pas une histoire suffisamment cohérente, BOONO ne trade pas.

La réalité des prochaines séances dira quelles parties de cette Constitution survivent, lesquelles doivent être corrigées et quelles configurations inconnues obligeront BOONO à étendre sa logique.
