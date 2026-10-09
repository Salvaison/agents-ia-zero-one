# BOONO / ZeroOne Systems — Constitution v0.2

Date: 2026-09-16
Statut: base conceptuelle validée pour reconstruction technique et expérimentation.

## 1. Principe fondateur

BOONO ne répond pas directement « long ou short ? ». Il reconstruit successivement cinq dimensions indépendantes :

**WHERE → STATE → DOMINANCE → RISK → ACTION**

Chaque couche a une responsabilité unique, un contrat de données propre et des critères de falsification explicites.

La plateforme actuelle est conservée comme artefact historique. Le nouveau moteur n'est pas évalué contre l'ancien moteur, mais contre les données, le replay, puis le semi-réel à 0$.

## 2. WHERE / Location

LOCATION répond uniquement « où regarder ? ».
Elle agrège LGI (ligne imaginaire), niveaux, MA200, VAH/VAL/POC, extrema, zones de structure et autres repères validés.
Elle ne porte pas de direction obligatoire.

Les seuils de proximité, largeur de zone, densité et confiance sont expérimentaux.
Hypothèse à tester: construire prioritairement les locations sur 1h et au-dessus, avec 15m pour l'intraday; 3m sert surtout à observer l'interaction avec la zone.

### Confiance Location

LOCATION doit pouvoir retourner `UNRELIABLE` ou `NO_VALID_LOCATION`.
Le cas du 3–4 septembre est le contrôle négatif de référence: forte expansion et extirpation vers un nouveau range, perte des repères du trendline detector, LGI trompeuses.
Une rupture de régime ou invalidation massive des ancres historiques doit réduire la confiance géométrique au lieu de forcer une ligne.

## 3. STATE / MCB

STATE décrit le marché, il ne déclenche pas seul une entrée.
Le signe de LBW/BW/MF ne suffit pas. STATE décrit au minimum:
- position dans la vague complète;
- lobe courant et E15;
- phase principale;
- cycle auquel appartiennent les pivots;
- live vs confirmé et fraîcheur;
- conversion vague → prix;
- relation entre timeframes.

Une vague traverse MCB; `0 → E15 → 0` est un lobe interne et non nécessairement l'objet complet pertinent pour le prix.
Les pivots historiques restent des zones possibles mais cessent d'être automatiquement les pivots de validation d'un nouveau cycle.

Phases de travail: `naissance`, `expansion`, `respiration`, `relance`, `couronne de crête`, `érosion`, `extension terminale`, `divergence de crête`, `relance stérile`, `résolution`, `bascule de polarité`, `nouveau lobe`.

## 4. Hiérarchie temporelle

Les TF ne votent pas. Ils décrivent des horizons différents:
- 1W: contexte de semaines;
- 1D: contexte de jours;
- 4h: climat/sentiment de la journée;
- 1h: réaction intraday;
- 15m: vague de travail;
- 3m: impulsion et construction interne;
- Ticker/prix live: microstructure immédiate.

Un 15m haussier peut être une oscillation valide dans un climat 4h bearish. Le 4h ne devient pas un veto automatique.

## 5. Prix BTC live et fraîcheur

Le flux OKX `BTC-USDT-SWAP` tick-par-tick existe déjà via `price-stream.js` et devient une donnée architecturale de premier ordre.
Chaque état critique transporte: valeur, timestamp source, TF, live/confirmé, âge/fraîcheur, origine.

Le prix live sert à mesurer notamment:
- distance à LOCATION;
- terrain gagné/perdu/conservé;
- MFE/MAE en temps réel;
- rendement prix par effort;
- distance à l'invalidation;
- ce qui s'est produit depuis la dernière donnée MCB fraîche.

Le système ne doit plus prédire le « gap » de fraîcheur: il doit le mesurer explicitement.

## 6. DOMINANCE / Ticker

Ticker mesure un métabolisme, pas une collection de votes.
Cadence, volume, taille moyenne, BTC/s et PM décrivent l'effort. La variable critique est la conversion de cet effort en terrain prix, puis la conservation de ce terrain.

Chaîne causale de référence:
**effort inhabituellement élevé → conversion qui s'effondre → incapacité de prolonger → rendement opposé qui augmente → asymétrie opposée qui persiste.**

États conceptuels à expérimenter: aucune domination, combat équilibré, attaque productive, attaque neutralisée, domination émergente, domination persistante, capitulation adverse, transition/force shift.

Un seul burst `PRODUCTIVE` ne prouve pas la domination.

## 7. Persistance comme compromis preuve / R-R

La persistance ne sera pas définie par un nombre fixe de secondes.
Elle doit combiner force de l'asymétrie, terrain conquis, terrain conservé, réponse adverse et durée.

Question centrale: **qui doit encore pousser fort pour obtenir peu, et qui obtient désormais beaucoup avec peu ?**

Le moteur doit arbitrer entre preuve gagnée en attendant et R/R perdu en attendant. Un choc peut fournir beaucoup de preuve en quelques secondes; un marché lent peut exiger plusieurs minutes.

## 8. RISK

RISK répond: « cette lecture mérite-t-elle un trade maintenant ? »
Il évalue invalidation, territoire disponible, phase/cycle, proximité Location, qualité de domination, régime normal/choc, MAE probable et MFE potentiel.
L'âge de vague est une information de risque, pas un veto mécanique.

## 9. ACTION / Execution

ACTION ne réinterprète pas le marché. Il applique une décision déjà justifiée par WHERE + STATE + DOMINANCE + RISK.
Actions de base: `NO_TRADE`, `WATCH`, `ENTER_LONG`, `ENTER_SHORT`, `HOLD`, `EXIT_RISK`, `EXIT_STRUCTURE`, `EXIT_EXECUTION`.

Chaque action doit stocker la preuve qui l'autorise.

## 10. Entrée

Une entrée doit pouvoir répondre séparément:
- WHERE: zone pertinente et niveau de confiance;
- STATE: phase/cycle/vague réellement observés;
- DOMINANCE: camp dominant ou simple burst local;
- RISK: asymétrie acceptable maintenant.

Si l'une de ces dimensions reste inconnue, `WATCH` est préférable à `READY`.

Le cas 3–4 septembre est utilisé pour tester qu'une Location trompeuse ne peut pas, à elle seule, produire un trade.

## 11. Reversal et reconstruction

`force shift` n'est pas synonyme de retournement structurel.
Après un falling knife, la chaîne de référence devient:
**détérioration/divergence → arrêt possible de translation → réaction → reconstruction multi-vagues → nouvelle structure/cycle.**

Les pivots du cycle précédent peuvent rester des zones historiques, mais ne sont pas les boutons de validation du nouveau cycle.

## 12. Sorties et monétisation

Une sortie n'est pas nécessairement l'inverse de l'entrée.
Familles actuelles: `EXIT_RISK`, `EXIT_STRUCTURE`, `EXIT_EXECUTION`.

Deux expériences sont ajoutées:

### EXIT_EFFICIENCY
Le trade peut rester directionnellement possible mais sa capacité à convertir en terrain s'est fortement détériorée. Objectif: éviter de rendre une part excessive d'un MFE déjà produit.

### GOD_YIELD / EXIT_GOD_YIELD
`GOD_YIELD` désigne un événement de rentabilité/translation exceptionnel, pas une sortie automatique.
À tester: prise de profit partielle, verrouillage d'une fraction du MFE, remontée rapide d'invalidation, ou `EXIT_GOD_YIELD` seulement quand le rendement exceptionnel se dégrade après avoir été capturé.

Principe: **une translation anormalement efficace ne doit pas redevenir un petit trade sans justification.**

## 13. Métriques d'expérimentation

Chaque trade conserve au minimum: PnL, MFE, MAE, MFE capturé %, temps vers MFE, temps vers MAE, phase/cycle à l'entrée et à la sortie, Location/confiance, domination d'entrée/sortie, terrain après sortie, contradiction logique éventuelle.

Le PnL seul ne distingue pas « bonne entrée + mauvaise sortie » de « mauvaise entrée + bon stop ».

## 14. Falsifiabilité

Chaque règle doit déclarer: hypothèse, observations qui la soutiennent, condition de falsification, populations/régimes testés et métrique d'amélioration.
Aucun seuil n'est sacralisé par avance.

## 15. Labels méthodologiques

Labels conservés: `[DÉMONTRÉ]`, `[FALSIFIÉ]`, `[AMBIGU]`, `[ARTEFACT LOGIQUE]`, `[DONNÉES INSUFFISANTES]`.
Ils décrivent le statut d'une observation ou hypothèse et doivent être utilisables dans les rapports automatiques.

## 16. Contrat du futur baton / Raw State

Le baton ne décide plus. Il fournit un état propre, horodaté et traçable: prix live, timestamp, cadence, taille, volume, flow, PM, yield, qualité/fraîcheur, fenêtres nécessaires et données MCB associées.

Les champs de type `recommendedDirection`, `vwapRegime`, `waveRegime` directionnel, `action` ou autres conclusions de trading n'appartiennent pas au Raw State.

## 17. Architecture cible

`COLLECTORS → RAW STATE → LOCATION → MCB/CYCLE STATE → DOMINANCE → RISK → DECISION → EXECUTION → AUDIT/EXPERIMENTATION`

Chaque module doit pouvoir être testé isolément et produire une sortie descriptive avec provenance.

## 18. Même noyau simulateur / moteur

Le simulateur, le replay, le semi-réel 0$ et plus tard l'exécution réelle doivent appeler le même noyau décisionnel.
La différence réside dans l'adapter d'entrée et l'adapter d'exécution, pas dans la logique.

L'ancien moteur est archivé comme artefact et ne constitue pas le benchmark du nouveau.
Le « shadow mode » signifie faire tourner le nouveau noyau dans les conditions réelles sans risque financier, pas le comparer décision par décision à l'ancien.

## 19. Corpus UNKNOWN

Les UNKNOWN de v0.1 ne doivent pas être masqués par ajout de règles ad hoc. Ils deviennent le premier corpus adversarial de v0.2.
Pour chacun: reconstruire WHERE / STATE / DOMINANCE / RISK / ACTION, mesurer les résultats à horizons définis, identifier si l'inconnu vient des données, du contrat ou d'une abstention volontaire.

## 20. Boucle expérimentale

**Observation → hypothèse → implémentation expérimentale → replay → semi-réel 0$ → mesure → falsification/validation → promotion ou rejet.**

Une règle n'est promue que si elle a été testée sur plusieurs régimes, possède une falsification explicite, n'introduit pas de contradiction connue et améliore une métrique définie.

## 21. Règle de reconstruction

Chaque changement répond à cinq questions:
1. Quel problème observé résout-il ?
2. Quelle hypothèse porte-t-il ?
3. Comment savons-nous qu'il fonctionne ?
4. Comment démontrer qu'il est pire ?
5. Quel comportement ou donnée doit rester intact ?

La constitution définit les objets et leurs responsabilités; les seuils et paramètres restent expérimentaux.

## 22. Principe épistémologique

Le serveur est la réalité opérationnelle. Les documents sont la mémoire et le contexte. Le code est l'état implémenté. Les intentions sont des hypothèses de conception. **Les données expérimentales décident quelles hypothèses survivent.**
