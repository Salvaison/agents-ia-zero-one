# BOONO Systems — V5.3 PAPER, Constitution causale
25 octobre 2026 · Amsterdam

## Mandat et lois
Le propriétaire valide une amélioration active de V5.2.2 : supprimer le délai arbitraire de 12 minutes, conserver les preuves jusqu'à leur contradiction structurelle, redonner priorité aux phases MCB15 et à la conversion Money Flow, empêcher le faux reclaim et retirer le veto de la première limite locale hypothétique. Aucune autorité broker financée.

PHASE MCB15 → TRANSITION BW/LBW 3m/15m → LIEU → CONVERSION / MF → PRONOSTIC → DÉCISION ET INVALIDATION → RISQUE.

## Constitution active

### MCB15 : mémoire distincte de l'offensive
La trajectoire E15→E15 reste le dernier pivot structurel confirmé. Elle n'est pas automatiquement le sens actuel du marché. Le BW/LBWcross15, E15 Live, E15 confirmé, LBW/BW15, MF15 et son évolution rendent visible l'offensive actuelle, y compris quand elle conteste une trajectoire mémorisée. Le 1h et 4h ne sont que contextuels. Le signe du lobe LBW15 donne le LIEU dans la vague, pas l'autorisation d'entrée.

### E3 : situation géométrique, sans minuteur
Un E3UP autour de −75 au sein d'un 15m LONG encore actif peut être un excellent reset tactique ; un E3UP autour de +45/+60, après prix déjà étendu, est plus risqué même s'il paraît synchronisé. Les croisements E3 et les native E3 sont une même famille, pas des votes cumulables. La preuve persiste tant que l'offensive 15m et la géométrie tactique ne l'ont pas contredite. Le nombre de minutes depuis un croisement est documentaire, non un veto. Après une sortie, un nouveau retest défendu, postérieur à la sortie, est requis pour reprendre un croisement consommé.

### Conversion et Money Flow
PM Live est suivi sur la chronologie du Bâton et du tick OKX complémentaire. PM3 et PM5 sont des fenêtres chevauchantes de déplacement prix, pas deux volumes sommables. La variation de MF3 et celle de MF15 sont traitées séparément ; une double opposition MF interdit une nouvelle admission. Un MF15 encore négatif mais en récupération peut soutenir un LONG naissant et un MF15 positif mais en pente descendante peut soutenir un SHORT. La conversion immédiate doit exister, sinon WAIT.

### Lieu et économie
Les S/R, MA200, VAL/POC/VAH et niveaux locaux sont contextuels tant que non défendus ; le prochain obstacle hypothétique n'est pas un objectif sûr, donc pas de veto automatique sur un R/R calculé à partir de ce seul obstacle. Les frais aller-retour restent comptabilisés et la mobilité observée est informative. Une entrée requiert en revanche une invalidation attachée à une structure confirmée et un risque borné, non un stop inventé sur une ancienne résistance. La chaîne de reclaim est réinitialisée en cas de perte effective du niveau : CROSS → EXTEND → RETEST → HELD ne peut pas être complétée plusieurs heures après une cassure contraire.

### Gestion de position
FLAT et EN POSITION ont des exigences distinctes. E3 contraire seul ne clôture pas une campagne ; perte durable du terrain et conversion adverse, ou offensive 15m opposée soutenue par MF et PM, peuvent imposer une sortie. Le cap de −500 USD de déplacement BTC, les floors +120/90 et +220/180 restent des protections indépendantes inchangées. Une position héritée de V5.2.2 reste gérée selon sa politique de sortie initiale après migration.

## Code et données
- modules/v5/v53-causal.js : E15 avec provenance, retests causaux réinitialisables, lieu structurel et niveau de risque.
- modules/v5/decision-v53.js : moteur décisionnel V5.3, MCB15 dynamique vs mémoire, E3 maturité et MF.
- modules/v5/runner-v52.js : même moteur PM2 PAPER boono-v52-paper, flux prix OKX 5 s, observation Audit/Elastic existante ; aucun nouveau shadow volumineux.
- modules/v5/paper-v52.js : migration explicite du ledger V5.2.2, préservation de l'historique, frais, equity, position, protections et clés déjà consommées.
- modules/config-server.js : premier plan V5.3, contexte MCB15 complet, version par trade et historique Vagues préservés.
- tests/v5/v53-replay.test.js : tests de causalité, cas de marché historiques et migration.
- Documents précédents et code décisionnel V5.2.2 conservés pour audit.

## Cas de calibration, pas preuve de profit
- #1 achat V5.2 tard dans E3 +67 : WAIT V5.3.
- #2 achat de retournement E3 −88 / MCB15 −84 : admissible en phase précoce.
- #3 entrée après expansion tardive : WAIT.
- #4 entrée productive de V5.2.2 : scénario reconnu.
- #5 25/10 08h41 : ancien niveau 80 594,2 faussement retenu depuis 07h27 malgré la rupture ultérieure ; la séquence est réinitialisée et V5.3 n'admet pas cette entrée.
- #6 25/10 09h42 : LONG contre offensive MCB15 SHORT, refus.
- 06h09–08h15 SHORT V4.9.3 : absence du veto de premier niveau hypothétique et persistance des preuves, sans garantir une reproduction parfaite.
- 09h24 MCB15 : dernière trajectoire confirmée LONG, mais offensive E15 DN et PM/MF SHORT ; afficher explicitement les deux directions.

Ces replays sont in-sample. La valeur de V5.3 se vérifiera sur ses propres trades PAPER prospectifs face au comparateur V4.9.3, à frais cohérents. Le slippage et le funding ne sont pas encore modélisés.

## Installation confirmée sur Amsterdam

Basculement réalisé vers 09h52 UTC (10h52 Stockholm, CET) le 25 octobre 2026. Snapshot des fichiers de compte et journaux avant mise à jour dans /root/boono-v53-preupgrade-20261025T095204Z. L'ancien service PAPER a été arrêté puis le même service PM2 boono-v52-paper redémarré avec le moteur décision-v53.js.

Migration vérifiée : v5.2.2-paper-ledger-v0.2 vers v5.3-paper-ledger-v0.3, **6 clôtures conservées**, réalisé −9,0501 USD, equity 990,9499 USD, frais 9,75 USD au relevé, **7 clés consommées conservées**. Le LONG PAPER en cours (entrée 80 222,5 BTC, politique V5.2.2) est resté ouvert et sous sa politique de sortie initiale. Vérification après connexion du flux public OKX : état vivant sous v5.3-causal-15m-flow-market-phase et réponse HOLD/LEGACY_POSITION_CAMPAGNE_TENUE. Sans ordre financé.

Interface config-server redémarrée, routes privées sans session HTTP 302 ; PM2 boono-v52-paper, boono-v493-baseline, cerveau-central, config-server tous online. V5.1 arrêté et BOONO-TV non modifiés. Mise à jour PM2 sauvegardée.

Tests avant mise en service : 123/123 réussis (suite V4 + V5). Replays de calibration in-sample montrent #1 WAIT, #2 ENTER_LONG précoce, #3 WAIT, #4 ENTER_LONG, #5 WAIT (retest ancien invalide), #6 WAIT (offensive E15 vendeur). Il ne s'agit pas d'une performance prospective prouvée. La prochaine étape d'analyse porte sur les nouvelles entrées, absences d'entrées, sorties et résultats réels du PAPER V5.3 à comparer au V4.9.3.
