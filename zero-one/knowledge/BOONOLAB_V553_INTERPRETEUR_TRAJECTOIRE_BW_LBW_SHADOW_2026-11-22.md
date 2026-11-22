# BOONOLAB — Interpréteur temporel et spatial des trajectoires BW/LBW15 (SHADOW)

**22 novembre 2026. Statut : IMPLÉMENTÉ, TESTÉ, ACTIF SUR AMSTERDAM, SHADOW UNIQUEMENT. Aucune autorité PAPER.**

## Mandat

L’utilisateur rappelle qu’un croisement initialement faible qui s’ouvre et accélère peut être plus productif qu’un croisement initialement ample déjà en train de se refermer. Il demande explicitement : « Donc tu as conçu un shadow qui interprète la géométrie entière ? Si non, fais-le ! »

La signature précédente **mesurait** la forme observée mais ne formulait pas encore une histoire structurée. Cette livraison ajoute une **couche d’interprétation des trajectoires** et une mémoire d’épisodes. La fenêtre source est **jusqu’à 8 heures d’observations Bâton** ; il ne faut PAS prétendre avoir reconstitué la vague entière depuis le véritable dernier E15 si celui-ci est plus ancien.

## Architecture mise en service

- **Signature instrumentée** : modules/attention/boonolab-wave-geometry.js, version boonolab-wave-geometry-signature-v0.1. Mesure les valeurs LBW/BW/gap, les extrema, les jambes successives de la courbe, leurs durées, l’amplitude observée, les vitesses 3/15/60m, l’accélération, les derniers croisements Live 30s, les réponses du prix/MF15. L’intensité de la vitesse relative d’ouverture est comparée au P75 **des propres vitesses de l’écart des huit heures observées**, sans seuil universel.
- **NOUVEL INTERPRÉTEUR de la figure** : modules/attention/boonolab-wave-geometry-interpreter.js, version boonolab-wave-geometry-interpreter-v0.1. Une fonction pure interpret() convertit ces mesures en **phase géométrique**, hypothèse descriptive, chronologie, vitesse et intensité relatives, résolution économique distincte du rendement du marché, contexte E1/E4 et lieu, preuves et **récit en français**.
- **Comparaison des angles correctement calibrée** : un ancien angle au Cross15 est réexprimé dans la **même amplitude 4h connue à l’instant d’observation** que l’angle actuel. Ceci rend la comparaison interne cohérente et ne prétend pas reconstruire les pixels TradingView ni une comparaison universelle d’angles entre des écrans d’échelles différentes. Le diagnostic d’accélération est fait principalement avec les **vitesses brutes MCB/min et leurs variations**.
- **Mémoire temporelle d’épisodes** : initial() et observe() persistent les changements de phases/hypothèses, temps dans chaque phase, épisode de polarité/croisement, maximum d’écart observé, restitution du prix et nombre de transitions. Un épisode n’est pas un trade ; il continue pendant que le moteur est FLAT.
- **Lecture par sens candidat pour l’audit uniquement** : assessCandidate() reconnaît une tentative pré-Cross15 en contradiction avec la trajectoire LBW15 15m, un Cross aligné ou une offensive tactique qui contredit simultanément E1/E4. Ce diagnostic n’est pas une permission d’entrée.
- **Intégration dans l’observateur existant** : boonolab-market-practicability-shadow.js intègre waveInterpretation et garde son propre état semantic ; boonolab-market-observer-runner.js publie récits et transitions dans les fichiers data/boonolab-practicability-shadow-*. Aucun nouveau moteur ni nouveau processus PM2. Aucun import ni modification de la politique v553.
- **Étude des cas historiques as-of** : scripts/boonolab-geometry-interpreter-case-study.js a généré data/boonolab-geometry-interpreter-cases-asof.json : **36 clôtures V553 #33–#68**, avec l’interprétation réellement constructible au moment de chaque entrée. Certains cas comprennent aussi une chronologie environ toutes les 3 minutes pendant la position. Les P&L réalisés sont ajoutés **après** la construction des interprétations.

## Les quatre dimensions de la figure

| Dimension | Éléments interprétés |
|---|---|
| Géométrie | Position des deux courbes, écart, amplitude des jambes, angle relatif, vitesse comparative et changement de vitesse |
| Maturité et espace | Position LBW15 dans son amplitude 8h observée, crête/creux, âge des extrema, lieu du prix dans les niveaux BigRange seulement si déjà connus |
| Temps et histoire | Dernières jambes UP/DN, durée et vitesse, premier Cross15 Live connu, âge du Cross, retours et recroisements, changement de phase, mémoire hors trade |
| Efficacité économique | Prix conservé ou rendu depuis Cross, excursion favorable/adverse, MF15 depuis Cross, efficacité/rétention des dernières 30 min **distincte de la productivité du Cross lui-même** |

Phases descriptives : CROSS_LIVE_NAISSANT_EN_OUVERTURE, SEPARATION_ACCELERANTE, SEPARATION_QUI_RALENTIT, SEPARATION_QUI_SE_REFERME, SEPARATION_EN_COURS, CONFRONTATIONS_REPETEES, INFLEXION_AVANT_CROISEMENT, INFLEXION_DE_TRAJECTOIRE et GEOMETRIE_NON_RESOLUE.

Deux scénarios synthétiques contrôlés distinguent une **faible séparation naissante dont la vitesse augmente** et une **séparation déjà ample dont le rapprochement commence**, à signe Cross identique. Aucune probabilité de réussite ni ordre d’entrée n’en est déduit.

## Épreuves de vérité sur les trades

| Trade | Net PAPER | Description à l’entrée et contradiction |
|---|---:|---|
| #43 SHORT | +74,97 USD | Séparation accélérante, vitesse relative au P75 historique **2,632×**, prix localement favorable malgré un marché horaire difficile |
| #58 SHORT | +23,94 USD | Cross15 Live naissant, angle initial faible, vitesse relative **0,288× P75**, prix encore en cours de validation |
| #61 LONG | +40,04 USD | Séparation accélérante et prix favorable, vitesse relative **1,034× P75** |
| #62–#64 LONG | -2,35 / -3,96 / -4,18 USD | Une légère remontée LBW15 sur 3m **contre la pente LBW15 toujours baissière sur 15m**, sans Cross15 Live LONG à l’entrée ; vitesses relatives **0,125 / 0,366 / 0,651× P75** |
| #65 SHORT | -9,06 USD | Vitesse vendeuse **1,142× P75**, mais séparation déjà en ralentissement et conflit E1/E4 tous deux UP |
| #66 LONG | -5,91 USD | Vitesse haussière relativement élevée (**1,432× P75**) avec conversion temporairement alignée, mais la traduction durable n’était pas acquise |

**Contre-exemples nécessaires** : #38 gagne malgré une rotation pré-Cross15 contraire à la pente longue, #58 gagne malgré un faible angle au départ, #65 et #66 perdent malgré des vitesses marquées. L’intensité n’est PAS l’efficacité.

Le résultat historique de l’étude regroupe 36 trades selon l’interprétation du sens candidat, sans en calculer un prétendu profit contrefactuel. Un veto ex post change les trades suivants, le risque, les frais et les gains potentiels.

## Tests, état réel et limites

- **164 tests PASS, 0 FAIL**, incluant cas synthétiques, as-of sans futur, comparaison des angles avec une calibration identique dans un même snapshot, intensité relative P75, mémoire d’épisodes, migration additive du SHADOW v0.1, cas réels #38/#43/#58/#61/#62–#66, et les suites PAPER et interface.
- SHADOW en production sur Amsterdam dans **boono-market-regime-shadow** : waveInterpretation.version et semantic.version vérifiés en données récentes, phase et récit stockés, ancien observateur conservé.
- V553 PAPER est resté **v5.5.3-live-causal-price-market-paper-v1**, en ligne, sans aucune modification de décision ni de position par cette recherche. V552 reste arrêté. Aucune modification BOONO-TV ni Watch.
- **Limites à ne pas masquer** : fenêtres de 8h ne couvrant pas toujours le départ du parent E15 ; croisement Live 30s pouvant jitter autour de zéro, distinct du Cross15 natif confirmé ; mots « accélérant », « faible », « productif » encore des **interprétations à règles explicites et non des états statistiquement prédictifs validés** ; prix depuis Cross n’est pas un ordre ou une preuve de causalité. Les critères ont un statut expérimental.

## Travail expérimental suivant, sans permission PAPER

Rattacher les trajectoires jusqu’au véritable parent E15 quand son origine est connue, qualifier la phase de vague complète par ses parents, observer l’évolution de **l’angle, la vitesse et leur accélération aux instants 0/3/6/15 minutes** avec le prix conservé, différencier confrontation MCB15 en formation et cycle de marché non praticable, et étudier les faux blocages avant tout emploi dans le moteur actif.

La stratégie V553 ne peut bénéficier de cette nouvelle compréhension qu’après avoir montré, en shadow prospective et contrefactuel causal, que le nouveau récit distingue les bonnes opportunités des fausses, sans supprimer les bonnes continuations.
