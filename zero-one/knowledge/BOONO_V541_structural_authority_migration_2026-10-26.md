# BOONO Systems — V5.4.1 · Autorité structurelle et admission causale corrigées

**Activation principale PAPER sur Amsterdam : 26 octobre 2026, vers 18h08 CET.**
Auteur des concepts : propriétaire BOONO Systems. Implémentation, replay et validation : assistant IA.
Le serveur est la réalité ; le code est l'état implémenté ; les documents la mémoire.

## Pourquoi la modification était nécessaire

V5.4 avait reconnu la campagne LONG née du creux géométrique LBW15 −67,1 du 26/10 à 14h45 (pivot disponible vers 15h30), mais restait en `WAIT_NEW_TACTICAL_PRICE_EPISODE` durant plus d'une heure. Un Cross3 UP et un E3 UP natif intervenaient dans une vague MCB15 LONG, mais le dernier pivot **géométrique LBW3** était encore étiqueté SHORT : `reversalRoom` réintroduisait un veto tactique contre la thèse directrice.

## Constitution effective V5.4.1

1. **MCB15 directeur** : origine géométrique LBW15/E15→E15 conserve sa fonction de trajectoire et d'identité de campagne. L'extrême géométrique est libellé `GEOMETRIC_LBW_EXTREMUM` et ne se confond plus avec **l'événement natif E15**, ni avec sa source/heure de disponibilité.
2. **MCB3 tactique** : E3 UP/DN natif et dernier BW/LBWcross3 sont des preuves de phase. Le dernier pivot géométrique LBW3 ancien reste mémoire de respiration, pas veto. Un E3 peut précéder son E15 : une confirmation E15 du même cycle peut requalifier un cross3 observé auparavant, sans ressusciter un signal sans rapport.
3. **Territoire vraiment défendu** : la simple bougie qui traverse une frontière locale ne donne plus une permission d'admission. Les voies reconnues sont (a) MA3/MA15 acceptée par clôtures confirmées **après un contact prix réellement observé** ; ou (b) retest causal confirmé `cross → extension → retest → hold` avec horodatages et invalidation connue. TEST_PENDING, APPROACH, OPPOSITE_SIDE et simple LIVE sont insuffisants.
4. **Maturité relative** : ne pas chasser une dernière impulsion où coïncident un nouveau bord externe de la plage 2h, un E3 proche de la bande d'extrême ±60 et un éloignement du dernier territoire défendu supérieur au range 15m confirmé typique. Il ne s'agit pas d'un seuil fixe de 250/325 USD. Une nouvelle défense réellement acquise peut renouveler une autre candidature.
5. **MF/PM/MA** : MF3 et MF15 continuent à qualifier la cohérence ; PM n'invente pas la thèse. MA présente un test du prix et une référence de risque. Les limites du risque, le stop structurel disponible, les frais PAPER et les invalidations financières ne sont pas assouplis.
6. **Campagne ≠ position** : un profit floor ne clôture pas la campagne. Pour une réentrée du même sens après sortie, le même ancien cross3 ne suffit pas : il faut un nouveau cross3 ou un **nouveau retest réellement défendu après la sortie**, avec preuve causale et clé distincte.

## Continuité du moteur

- V5.4.1 est **l'unique moteur V5 actif**, PM2 `boono-v541-paper` ; processus `boono-v54-paper` retiré. V4.9.3 demeure le seul comparateur indépendant.
- Le même compte historique est préservé dans `data/v52-paper-state.json`, désormais versionné `v5.4.1-paper-ledger-v0.8`. Les opérations antérieures gardent leur `entryPolicyVersion` d'origine.
- Une position ouverte avant l'activation de V5.4.1 conserve intégralement les décisions de sortie de `decision-v54.js`, y compris floors et invalidation ; V5.4.1 ne la requalifie pas rétroactivement.
- Le maximum dur −500 USD BTC, les floors +120→90 et +220→180, la simulation au notionnel 1 500 USD, les frais taker modélisés 0,05% par côté et `brokerOrdersEnabled=false` restent inchangés.
- Le laboratoire d'exécution X-Perp A/B/C, les collecteurs MCB/OKX, BOONO-TV et config-server fonctionnent indépendamment. Aucun nouveau shadow ni ordre financé.

## Replay des événements du 26 octobre, as-of, sans anticipation

Sources : `data/v52-paper-decisions.segment-20261026T145103000Z.ndjson` et `data/v52-paper-decisions.ndjson`, Audit et CSV MCB3/15 conservés dans le fichier de test figé `tests/v5/fixtures/v541-20261026-asof.json`. Les décisions sources sont prises à leur vrai timestamp / prix enregistré ; seules les bougies clôturées au plus tard à l'instant évalué sont disponibles.

| Heure CET | Décision V5.4.1 en replay | Évidence |
|---|---|---|
| 15h39 et 15h51 | WAIT | Cross3 UP / E3 mais territoire et MA encore insuffisamment acceptés ; à 15h51 MA3 TEST_PENDING |
| 15h57 | WAIT | MA3 acceptée mais cohérence MF `CONTESTED` |
| **16h00min37s** | **ENTER_LONG** à ~80 390,4 $ (candidat) | Campagne MCB15 LONG, Cross3 UP, E3 UP natif confirmé, contact/acceptation MA3 par prix confirmé, MF REINFORCING, stop causal ~158 USD BTC |
| **16h21** | **WAIT** | Cross E3 près de +63,6, prix au-delà de la fourchette 2h et loin de son terrain défendu (~80395) |
| 16h39 | Candidature LONG requalifiée | Nouveau cross3 UP et vrai retest défendu, prix et MF favorables ; ce n'est pas un cross ancien automatiquement réutilisé |

Les cas perdants préexistants **#26, #35, #36, #37 et #42** ne deviennent pas des admissions automatiques en replay. Les premiers quatre cas du 26 octobre disposent de leurs véritables timestamps d'entrée des anciennes versions ; ces contre-exemples sont utilisés pour vérifier la cohérence, non pour calculer un PNL hypothétique.

**Limites des données :** les horodatages `observedAt` d'E3/E15 sont utilisés lorsqu'ils figurent dans le journal des événements. Lorsque la télémétrie manque, la clôture de bougie fournit seulement **l'heure théorique la plus précoce de disponibilité**, jamais un observedAt inventé. Le replay est *in-sample*, et ses entrées ne signifient pas qu'un trade aurait été entièrement rempli ni bien sorti dans les conditions économiques réelles.

## Couverture et fichiers

- `modules/v5/structural-evidence-v541.js` : lecture E3/E15 natifs distincte des pivots LBW et preuve de territoire confirmée.
- `modules/v5/decision-v541.js` : nouvelle décision V5.4.1. Les positions d'ancienne politique sont déléguées exactement à `modules/v5/decision-v54.js` (et héritages plus anciens). Aucun deuxième moteur principal.
- `modules/v5/paper-v52.js` : migration additive 0.7→0.8 et anti-churn après EXIT de même campagne ; aucun effacement du ledger.
- `modules/v5/runner-v52.js` : même processus logique PAPER et même collecte, nouvelle politique en vigueur ; libellé PM2 nouveau, fichier de ledger historique toujours inchangé.
- `modules/config-server.js` : affichage V5.4.1, événement natif vs pivot géométrique, preuve de territoire et maturité, étiquettes historiques V5.4 correctement conservées ; APIs Vagues LIVE compatibles.
- `daily-report.js` : récapitulatif V5.4.1 principal vs V4.9.3, distinction des clôtures antérieures V5.4/V5.3.3.
- `tests/v5/v541-structural-admission.test.js` et `tests/v5/v541-anti-churn.test.js` : disponibilité causale, séquences réelles, cas contraires, état hérité, migration, requalification sans double entrée.

## Activation et contrôles

- Avant bascule : **224 tests exécutés, 218 réussis, 0 échec, 6 tests historiques sautés** faute d'Audit ancien ; le JavaScript navigateur extrait de `/app.js` compile, comme tous les modules Node touchés.
- Instant pré-migration à 18h07 CET : ledger `v5.4-paper-ledger-v0.7`, 62 clôtures, 27 gagnants, equity PAPER 922,4035 USD, frais cumulés 93,7511 USD, 63 clés consommées, LONG ouvert à 80 267,3 USD depuis 18h00min41s sous l'ancienne politique V5.4. Stop 80 128,4 USD, floor +90 USD BTC.
- Snapshot strict **après arrêt de l'ancien moteur et avant migration** : `/root/boono-v541-before-20261026/`, contenant ledger, décisions, opérations. Le fichier du ledger et la sauvegarde ont la même empreinte SHA-256 `b79545bc64a885d9ae83f62faf5144dda69f80d80771a7f50ca30d99d2815198`.
- PM2 `boono-v54-paper` arrêté puis supprimé ; `boono-v541-paper` démarré avec le runner existant, config-server redémarré, `pm2 save` effectué. V4.9.3, collecteurs, BOONO-TV et Execution Lab non redémarrés.
- À 18h10 CET : `v5.4.1-paper-ledger-v0.8`, dernière décision `v5.4.1-structural-e3-territory-paper-v1`, `DATA_OK`, position LONG **toujours héritée de V5.4**, avec gain floor +90 et stop 80 128,4 intacts ; aucun ordre financé.
- Les endpoints authentifiés `/`, `/api/v52`, `/api/v5-structure` et `/api/btc-live-price` retournent HTTP 302 sans session, normal. Le rendu direct dans le navigateur authentifié n'a pas encore été validé visuellement.

## Hypothèses encore ouvertes

- Mesurer prospectivement le nombre de campagnes reconnues, nouvelles admissions, sorties, durées, MFE/MAE, frais et PNL net après sortie de la position héritée. Les décisions positives du replay restent des *opportunités hypothétiques*.
- Un cross E3 proche de la bande ±60 et au bord du range peut correspondre à une vraie continuation puissante : la nouvelle mesure de maturité doit être évaluée sur des cas indépendants, pas traitée comme preuve générale de fin de mouvement.
- Le mode maker/maker et les changements d'exit des floors ne font **pas** partie de V5.4.1 ; ils nécessitent leur propre évaluation économique.
