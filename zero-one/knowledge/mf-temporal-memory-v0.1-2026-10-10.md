# MF Temporal Memory v0.1 — 2026-10-10

## Objet

Donner à BOONO une compréhension temporelle du Money Flow 15m.

Une valeur MF instantanée ne suffit pas. Exemple :

- MF = -5 après -21 → -18 → -15 → -9 → -5 : pression qui remonte ;
- MF = -5 après +10 → +4 → 0 → -5 : pression qui descend.

Le niveau final est similaire, l'histoire est opposée.

## Modèle

Module hôte : `mf-structure-shadow-v0.2-temporal`.

Fenêtres causales :

- 30m : attaque / respiration tactique ;
- 1h : mémoire courte ;
- 2h : mémoire intermédiaire ;
- 4h : mémoire de fond.

Chaque fenêtre mesure :

- MF départ / arrivée ;
- delta MF ;
- chemin MF total ;
- efficacité du chemin MF = |delta| / chemin total ;
- persistance des pas dans la direction nette ;
- prix départ / arrivée ;
- déplacement prix net ;
- chemin prix total ;
- efficacité directionnelle prix ;
- USD de translation prix par point MF ;
- relation direction MF ↔ direction prix.

## États temporels

- `RISING_AND_TRANSLATING`
- `RISING_WITH_PULLBACK`
- `FALLING_AND_TRANSLATING`
- `FALLING_WITH_RECOVERY`
- `RISING_BACKGROUND`
- `FALLING_BACKGROUND`
- `BUILDING_UP`
- `BUILDING_DOWN`
- `MIXED_OR_FLAT`

La mémoire de fond préfère 4h, puis 2h, puis 1h lorsque le chemin est suffisamment cohérent. Les seuils de cohérence ne donnent aucun pouvoir de trading ; ils servent uniquement à produire un vocabulaire descriptif.

## Relation au candidat

Le module expose notamment :

- `MF_MEMORY_SUPPORTS_CANDIDATE`
- `MF_MEMORY_OPPOSES_CANDIDATE`
- `TACTICAL_SHORT_AGAINST_LONG_MF_MEMORY`
- `TACTICAL_LONG_AGAINST_SHORT_MF_MEMORY`
- `MF_MEMORY_SUPPORTS_BUT_TACTICAL_PULLBACK`
- `TACTICAL_MF_SUPPORTS_CANDIDATE`

Le cas `TACTICAL_SHORT_AGAINST_LONG_MF_MEMORY` signifie exactement : une attaque/respiration locale short apparaît dans une trajectoire MF persistante haussière. Cela ne signifie pas automatiquement que le short est faux ; cela interdit seulement de confondre l'attaque locale avec un changement de campagne.

## Cas nuit 09→10 octobre

### #94 LONG

- mémoire MF : SHORT ;
- tactique 30m : SHORT ;
- état : `FALLING_AND_TRANSLATING`;
- candidat LONG : `MF_MEMORY_OPPOSES_CANDIDATE`.

Le long tente un retournement alors que le MF et le prix traduisent encore la baisse.

### #97 LONG

- mémoire MF : SHORT ;
- tactique 30m : LONG ;
- état : `FALLING_WITH_RECOVERY`;
- candidat LONG : `TACTICAL_LONG_AGAINST_SHORT_MF_MEMORY`.

Ce trade montre pourquoi la mémoire ne doit pas devenir un veto : il s'agit d'un retournement précoce où la tactique change avant la mémoire lente.

### #98 SHORT

- mémoire MF : LONG, horizon 4h ;
- tactique 30m : SHORT ;
- état : `RISING_WITH_PULLBACK`;
- candidat SHORT : `TACTICAL_SHORT_AGAINST_LONG_MF_MEMORY`.

C'est le cas de référence : BOONO avait détecté une attaque short réelle, mais l'avait interprétée comme une campagne alors que le MF construisait haussier depuis plusieurs heures.

## Conversion

Le modèle conserve également la relation entre trajectoire MF et terrain prix :

- `ALIGNED_WITH_MF` ;
- `OPPOSES_MF` ;
- efficacité prix ;
- USD de prix par point MF.

Ces mesures serviront au futur Loss-Avoidance Shadow pour distinguer :

- attaque tactique contre mémoire ;
- failed attack conversion ;
- failed wave/economic conversion.

## Autorité

`decisionImpact=false`.

Le modèle ne crée aucune direction, aucun veto, aucune entrée et aucune sortie. Il enrichit la compréhension causale de la vague et produit des variables falsifiables pour les prochains tests.
