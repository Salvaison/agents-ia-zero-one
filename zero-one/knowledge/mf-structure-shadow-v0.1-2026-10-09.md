# MF Structure Shadow v0.1 — 2026-10-09

## Objet

Observer causalement le Money Flow 15m comme une **structure persistante par paliers** plutôt que comme une valeur instantanée ou une simple pente.

Origine de l'hypothèse : observations de Benjamin sur les marches HH/HL/LH/LL du MF, recoupées avec les cas du 11/09, 21/09 et 09/10.

## Contrat

- module : \`modules/v4/experiments/mf-structure-shadow.js\`
- version : \`mf-structure-shadow-v0.1\`
- timeframe initial : **15m uniquement**
- \`decisionImpact=false\`
- aucun veto, aucune entrée, aucune sortie, aucun seuil de trading modifié.

## Lecture

Pivots MF causaux confirmés après deux clôtures 15m.

Relations :
- deux hauts MF : \`HH / LH / EH\`
- deux bas MF : \`HL / LL / EL\`

Structure :
- \`HH + HL => ADVANCING_UP\`
- \`LH + LL => ADVANCING_DOWN\`
- \`LH + HL => COMPRESSION\`
- \`HH + LL => EXPANDING\`
- sinon \`UNRESOLVED\`

Le live peut ensuite qualifier \`UP_EXTENSION\`, \`DOWN_EXTENSION\` ou respiration à l'intérieur de la structure, sans créer de pivot confirmé.

## Relation avec MCB

Le Shadow reçoit le candidat MCB mais ne le modifie pas :
- MF aligné : \`MF_SUPPORTS_CANDIDATE\`
- MF opposé : \`MF_OPPOSES_CANDIDATE / IMMATURE_AGAINST_MF_STRUCTURE\`
- cas mixte : \`MF_TRANSITIONAL\`

Sémantique :
**LBW détecte la tension ; MF décrit si le courant persistant nourrit encore le mouvement ; 3m + PM donnent le timing.**

Important : MarketCipher Money Flow est traité comme proxy de pression/flow persistant, pas comme mesure directe de la liquidité du carnet.

## Hypothèses à falsifier

1. Les SHORTS pris pendant \`ADVANCING_UP\` ont moins de MFE et/ou plus de MAE.
2. Les LONGS pris pendant \`ADVANCING_DOWN\` ont le défaut symétrique.
3. Une divergence LBW/prix est plus exploitable après dégradation de la structure MF qu'au premier DN/UP.
4. Une attaque microstructurelle adverse peut être tactique si elle ne casse pas la structure MF de fond.
5. Après protection MFE, un retour du MF dans la structure initiale peut aider à identifier une ré-appropriation du mouvement sans réutiliser la preuve PM pré-sortie.

## Cas de référence

- 11/09 : MF retardait LBW/BW aux pivots majeurs et décrivait mieux une pression persistante qu'un timing ponctuel.
- 21/09 : structure prix ascendante + MF15 renforcé malgré attaque baissière intense qui n'acceptait pas sous la frontière.
- 09/10 #90–#92 : DN/LBW short locaux alors que MF15 construisait des paliers ascendants.
- #86 : la sortie MFE reste localement justifiable ; la question Shadow porte surtout sur la ré-appropriation LONG ultérieure.
