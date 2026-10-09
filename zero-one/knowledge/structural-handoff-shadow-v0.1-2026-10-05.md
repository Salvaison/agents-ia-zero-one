# Structural handoff shadow v0.1 — 2026-10-05

## Statut

- Module : `modules/v4/experiments/structural-handoff-shadow.js`
- Impact décisionnel : **aucun** (`decisionImpact=false`)
- V4.5 reste le moteur décisionnel actif.
- But : tester un transfert de contexte structurel multi-TF sans recycler la preuve microstructurelle d'exécution.

## Hiérarchie

- **1h = contexte structurel / trajet E15→E15**
- **15m = thèse de campagne**
- **3m = timing / synchronisation locale**
- **PM = conversion fraîche**
- **ticker = qualification de conviction**

Le signe du lobe 1h n'est plus utilisé dans le shadow comme synonyme de direction structurelle. Une crête causale 1h ouvre `DESCENT_ACTIVE`; un creux causal ouvre `ASCENT_ACTIVE`. Cette direction persiste jusqu'au pivot causal opposé, même si la pente locale respire.

## STRUCTURAL_HANDOFF

Un handoff est détecté lorsque :

`1h structuralDirection == 15m thesis direction == 3m timing direction`

Exemples :
- `STRUCTURAL_HANDOFF_SHORT`
- `STRUCTURAL_HANDOFF_LONG`

Le 15m reste l'autorité de thèse : un vieux signal natif UP/DN ne peut pas écraser une thèse MCB 15m plus récente.

## Contrat anti-churn

La mémoire structurelle peut survivre à une sortie, mais **aucune preuve d'exécution pré-sortie ne survit**.

Interdit de recycler :
- PM pré-sortie ;
- ticker pré-sortie ;
- efficiency pré-sortie.

Après sortie, la nouvelle fenêtre de preuve commence à :

`proofStartTs = max(handoffTs, lastExitTs)`

Une ré-entrée shadow n'est éligible que lorsqu'une nouvelle PM construite strictement après ce timestamp passe la matérialité existante :
- |net| >= 10 USD ;
- efficiency >= 0.25.

## Replay #64 → #65 du 05/10/2026

Réel :
- LONG #64 sorti vers 16:30:58 Paris.
- SHORT #65 entré vers 16:53:28 à 85 549,9.

Shadow :
- `STRUCTURAL_HANDOFF_SHORT` détecté à **16:30:28**, prix ≈ **86 150,1**.
- sortie #64 réelle à **16:30:58**.
- preuve PM remise à zéro.
- première PM short fraîche valide à **16:31:28**, prix ≈ **85 980,9** :
  - net ≈ −109,4 USD ;
  - gross ≈ 109,4 USD ;
  - efficiency = 1,00 ;
  - 2 observations.
- contre-factuel : short potentiellement éligible ~22 min avant #65 sans recyclage d'ancienne preuve.

## Signal 1h

`native-signal.js` expose désormais les signaux 1h en contexte shadow. Le cas étudié est bien capturé une fois la bougie 1h finalisée : `wt1_cross_dn ≈ 9,6836` sur la bougie horodatée `2026-10-05T14:00:00Z`, soit 16:00 Paris. Le trajet structurel 1h était déjà `DESCENT_ACTIVE` depuis la crête dont la confirmation causale tombe vers 03:00 Paris ; le DN 1h de 16:00 renforce donc le contexte mais ne crée jamais à lui seul une entrée.

## Promotion

Aucune promotion décisionnelle avant observation sur plusieurs changements de camp. Le shadow doit être comparé aux trades réels et au churn contre-factuel.
