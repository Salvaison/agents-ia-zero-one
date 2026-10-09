# BOONO V3-LAB — expérience de tranches

Date : 19 septembre 2026
Statut : shadow descriptif, aucun impact décisionnel.

## Question

Quelle proportion faut-il sécuriser lorsqu'un trade déjà profitable rencontre une dégradation d'exécution, et quelle proportion laisser courir comme runner de vague ?

Candidats live-shadow :
- 70 % sécurisé / 30 % runner ;
- 60 % sécurisé / 40 % runner ;
- 50 % sécurisé / 50 % runner.

## Backtest contrefactuel sur l'ancien moteur

Le test conserve les événements réellement observés par l'ancien moteur : TP1, TP2 et sortie finale. Il compare donc les répartitions, pas une nouvelle logique de déclenchement.

### 123 trades historiques

| Répartition | PNL x10 cumulé | PF | Max DD |
|---|---:|---:|---:|
| ancien 25/65/10 | +107.18 % | 2.04 | -14.83 % |
| 70/30 au TP2 | +149.75 % | 2.35 | -19.91 % |
| 60/40 au TP2 | +145.71 % | 2.29 | -21.44 % |
| 50/50 au TP2 | +141.67 % | 2.20 | -22.96 % |
| 40/60 au TP2 | +137.63 % | 2.12 | -24.48 % |
| 40/40/20 | +123.27 % | 2.25 | -15.13 % |

Sur l'ensemble historique, augmenter le runner au-delà de 30 % réduit le rendement cumulé et augmente le drawdown.

### 12 trades depuis le 16 septembre

| Répartition | PNL x10 cumulé | PF |
|---|---:|---:|
| ancien 25/65/10 | +22.70 % | 3.32 |
| 70/30 | +29.02 % | 3.58 |
| 60/40 | +31.07 % | 3.76 |
| 50/50 | +33.11 % | 3.94 |
| 40/60 | +35.15 % | 4.12 |

Le régime récent favorise beaucoup plus les runners, notamment à cause des grandes translations du 18 septembre. Cela ne suffit pas à inverser la conclusion historique.

## Conclusion actuelle

[AMBIGU] Il n'existe pas encore de ratio universel démontré.

70/30 est le meilleur compromis du corpus historique testé. 40/60 est le meilleur du petit régime récent. Le ratio optimal dépend probablement du régime et de la maturité de vague.

Aucune répartition n'est promue en loi active.

## Shadow prospectif V3-LAB

Module : modules/v3lab/experiments/tranche-shadow.js

Fichiers :
- data/trade-sim-v3lab-tranche-shadow.json
- data/trade-sim-v3lab-tranche-shadow.ndjson

Règle causale prototype :
1. Le trade V3 principal reste inchangé.
2. Si V3 déclenche EXIT_EXECUTION alors que le trade est profitable, chaque modèle sécurise sa fraction et le reliquat devient runner virtuel.
3. Le runner ignore ensuite les simples dégradations d'exécution.
4. Le runner sort au changement confirmé de phase de vague.
5. EXIT_STRUCTURE / EXIT_RISK sans PROTECT restent des sorties complètes.
6. decisionImpact:false.

Le shadow mesurera PNL pondéré total, contribution du runner, gain sécurisé, MFE restitué, drawdown supplémentaire et différence par régime.
