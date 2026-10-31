# BOONOLAB — V494 et le marché peu productif du samedi ; V543 MCB/structure prioritaire sur les gain-floors

**31 octobre 2026 · OD-20261031-002 · examen du régime + changement contrôlé du PAPER V5.4.3**

**Mandat original et origine :** [OD-20261031-002](operational-decisions/OD-20261031-002/03-origine-et-justification.md) : conserver le verbatim utilisateur et la mission exécutée. Distinction importante : **V494 reste inchangé** ; **V543 PAPER change sa hiérarchie de sorties**. Les deux moteurs sont des simulateurs sans ordre financé.

## 1. L'hypothèse V494 du samedi est fondée sur des mesures, pas une règle de calendrier

L'utilisateur propose que V494 « n'aime pas le marché du week-end », avec peu de participation, faibles impulsions et hésitation tactique. L'enquête croise les **observations du Bâton/Audit14D**, publiées dans `data/audit-14d/audit-20261030T*.ndjson.gz` et `audit-20261031T*.ndjson.gz`, aux **20 mêmes heures locales 01–20** de vendredi 30 et samedi 31 octobre, en timezone **Europe/Stockholm**. **2 400 relevés de ~30s pour chaque journée**, mais **ils sont temporellement corrélés** et ne sont pas 4 800 expériences indépendantes.

| Indicateur de Bâton (médiane, mêmes heures 01–20) | Vendredi 30 | Samedi 31 | Rapport |
|---|---:|---:|---:|
| Cadence mesurée `cadence` (unité du Bâton) | **19,475** | **3,500** | **÷5,56** |
| Débit agressif indicatif `volumeFenetreBtc / winSec` | **0,862 BTC/s** | **0,181 BTC/s** | **÷4,76** |
| Durée médiane de fenêtre `winSec` | **10,30s** | **57,15s** | **×5,55** |
| Volume médian *par fenêtre* `volumeFenetreBtc` | 8,787 BTC | **10,612 BTC** | augmente |
| Déplacement absolu Bâton `abs(priceMove)` | **22,55 BTC$** | **5,40 BTC$** | **÷4,18** |

**Distinction importante :** le volume agrégé de chaque fenêtre n'est PAS plus bas le samedi ; c'est **le temps pour accumuler une quantité de BTC qui explose**, donc le débit par seconde diminue fortement. Aucun relevé ici ne mesure directement la liquidité passive ou la profondeur cachée du carnet. Les mouvements baissent aussi. C'est une observation empirique compatible avec la « mollesse et indécision » décrite, **pas une preuve que tous les week-ends ont le même profil**.

Les 10 entrées V494 du 30/10 ont donné **+29,6180 USD nets** avec MFE moyen **482,9 BTC$** ; les 10 entrées du 31/10 ont donné **−26,9553 USD nets**, **aucun trade gagnant** et MFE moyen **14,1 BTC$**. Le marché de samedi semble peu convertir les signatures tactiques reconnues par V494 en trajectoires économiques. Il ne faudrait pas toutefois inventer un **veto horaire ou du samedi**.

**Contre-exemple à préserver :** V494 #58, entré **vendredi à 23h33 local**, a rapporté **+7,8419 USD nets**, malgré un débit médian du quart d'heure précédent de **~0,208 BTC/s**, comparable au samedi. **Faible débit seul ≠ absence d'opportunité** : ce trade a développé un vrai mouvement de continuation. La future hypothèse discriminante doit intégrer la productivité/rendement prix, la stabilité de l'hypothèse MCB15/E15 et la mémoire des tests, pas un seuil de débit seul. L'investigation reste **sans modification V494**.

## 2. Problème prouvé sur V543 : gain-floor souverain contre MCB/structure

Le 31/10, **9 sorties au gain-floor sur les #123, #124, #125, #128, #129, #131, #132, #134, #135** ont toutes eu le **décideur MCB/structure à `HOLD`** au timestamp exact ; elles ont totalisé **+1,3252 USD nets**, frais cumulés **13,5042 USD**, MFE moyen **150,96 BTC$** et déplacement médian conservé **~86,8 BTC$**. Aucune des neuf n'a atteint MFE 220 : seul **120→90** les a fermées. Les **4** autres trades (#126, #127, #130, #133) ont échoué sans armer 120 et perdu **−13,4363 USD** nets.

Auparavant `modules/v5/paper-v543.js` appliquait : hard-risk −500 → floor autonome 120/90 ou 220/180 → exit stratégique V541. Même lorsqu'une simple respiration 3m était notée `HOLD_V54_3M_RESPIRATION_NOT_EXIT`, le floor forçait la clôture. Invalidation structurelle initiale (`entryInvalidation`) mémorisée à l'entrée : **toujours non exécutoire par elle-même**, tant que V541 ne valide pas des preuves de perte/contradiction ou hard-risk −500.

## 3. Modification mise à l'essai pour PAPER V5.4.3 : floor = attention économique, sortie = MCB/structure

**Choix d'implémentation parmi « enlever ou régresser » :** rétrograder les seuils 120/90 et 220/180 en **alertes non exécutoires**. Les valeurs et la MFE continuent d'être mesurées, mais le franchissement d'un floor n'a **plus aucune autorité de fermer seul une position**.

**Ordre de décision effectif du module `paper-v543.js` modifié :**

1. Conserver l'armement des seuils de restitution de gain (MFE ≥120 → alerte à +90 BTC$ ; MFE ≥220 → alerte à +180 BTC$) et horodater un événement lorsque le prix traverse un seuil alors que le MCB/structure recommande HOLD. Ceci est une **demande économique**, non un ordre.
2. Si prix live frais et perte du cours BTC depuis l'entrée **≤ −500 BTC$**, sortie `HARD_RISK_500`, indépendante et toujours prioritaire. La mesure est en **écart BTC$**, pas en P&L du compte.
3. Sinon si MCB/structure émet un véritable `EXIT_LONG`/`EXIT_SHORT` pour la position ouverte, la sortie est exécutée **pour sa raison structurelle/MA/MF originale**, même si un floor est aussi franchi.
4. Sinon **`HOLD`**, y compris si le floor a été traversé ; le statut d'observation est `HOLD_MCB_STRUCTURE_OVERRIDES_GAIN_FLOOR`. Si les données sont périmées, ne pas inventer une exécution de stop.

**Protection des positions héritées :** au contrôle pré-déploiement, V543 possédait déjà un SHORT ouvert. Il serait incorrect de modifier rétroactivement la convention de sortie de ce trade au milieu de son exposition. La migration marque donc une position ouverte avant l'activation `v543-legacy-autonomous-gain-floor-v1` : elle conserve ses **anciens exits gain-floor automatiques jusqu'à sa clôture** et le hard-risk. **Seules les prochaines positions réellement admises après la mise en service** portent `v543-mcb-structure-first-floor-advisory-v1`. Ce contraste n'est pas une réinitialisation du ledger, et son horodatage est observable dans le Watch.

**Aucune nouvelle règle de direction ou d'invalidation n'a été introduite.** Le module MCB/structure `decision-v543.js` et ses dépendances ne sont pas modifiés. La branche existante du shadow `STRUCTURAL_LEVEL_AND_TRANSFER` (sortie à niveau perdu ET transfert adverse) n'est **pas** promue automatiquement : elle reste une expérience séparée. Le nouveau comportement **a donc le risque de conserver une position perdante plus longtemps**, jusqu'à sa sortie structurelle ou son hard-risk ; les contre-exemples #128 et #131, où le maintien sans floor était moins bon, restent des alertes impératives pour l'évaluation.

## 4. Versionnement, mémoire et traces causales

Le moteur demeure **V5.4.3**, ledger `v5.4.3-paper-ledger-v1.0`, entrées inchangées ; la politique de sortie dispose désormais d'une version indépendante **`v543-mcb-structure-first-floor-advisory-v1`**, avec `floorAuthorityActivatedAt` enregistré à la première reprise. Cela évite de réinitialiser `policyActivatedAt` (horloge d'admission et anti-churn), `usedKeys`, capital, equity, historique ou position ouverte pendant l'activation. Les anciennes clôtures sont conservées telles quelles. **Chaque position reçoit sa propre version d'autorité de floor, héritée ou nouvelle**, enregistrée aussi dans chaque future clôture : les deux politiques peuvent donc coexister transitoirement sans confondre leurs résultats.

Chaque traversée **distincte** du floor crée `floorAttentionLast` dans le PAPER : horodatage tick, `positionEntryAt`, sens, parent E15, MFE, déplacement cours au seuil, floor armé, phase MCB15, recommandation `HOLD/EXIT`, raison structurelle, statut `FLOOR_EXIT_DEFERRED_TO_MCB_STRUCTURE` / `ALIGNED_WITH_STRUCTURAL_EXIT` / `HARD_RISK_OVERRIDE`. Un même franchissement continu sur plusieurs ticks 5s ne gonfle pas artificiellement `floorAttentionCount`.

Les journaux `data/v52-paper-decisions.ndjson` portent aussi une projection bornée `floorAuthority`, et `floorAttention` lors de son apparition ; les futurs trades clôturés auront `exitAuthorityVersion` et `floorAttentionEpisodes`, pour distinguer l'avant/l'après sans réécrire les anciens résultats.

L'interface BOONO Watch → **État V5** signale maintenant :
- `hard-cap −500$ BTC` toujours actif ;
- pour les **nouvelles** positions, floors **« ALERTES · sorties sous autorité MCB/structure »**, et `seuil floor indicatif (non-exécutoire)` ; **exception visible** `POSITION HÉRITÉE` lorsque le trade déjà ouvert continue avec son floor ancien exécutoire ;
- version, heure d'activation, nombre d'alertes distinctes et dernière recommandation MCB rencontrée.

Les changements touchent `modules/v5/paper-v543.js`, `modules/v5/runner-v543.js`, `modules/config-server.js`, et tests V543 seulement. **Aucune opération de broker, aucun changement V494, aucune politique de shadow altérée.**

## 5. Tests : réussites, limite historique, mise en service

**Ciblés** `node --test tests/v5/v543-floor-authority.test.js tests/v5/v543-causal-offensive-maturity.test.js` : **29/29 réussis**, couvrant floor 120/90 et 220/180 contre HOLD, structure contestée `HOLD`, vraie sortie MCB, hard risk −500, données périmées sans remplissage fictif, réutilisation de campagne, migrations v543 et conservation des clés et frais.

**Régression large V5 + Attention** : la suite complète a exécuté **322 tests, 309 réussis, 12 ignorés, 1 échec préexistant et sans lien**. Le test `tests/v5/v541-ma-polarity-memory.test.js` exige un épisode MA précis du **26 octobre 2026** en relisant `csv('3m')` depuis `runner-v52` ; ce lecteur prend la **fenêtre CSV live tail** à l'instant courant, qui ne garantit plus les chandeliers nécessaires. Exécuté **individuellement**, le même test échoue avec `UNKNOWN` au lieu de `TEST_PENDING` sans import du module de floor modifié. Ce test historique n'a **pas** été corrigé dans cette intervention (hors périmètre). En excluant uniquement ce fichier de test, **318 cas, 306 réussis, 12 ignorés, 0 échec**. Syntaxe JS des trois sources et code `app.js` réellement généré vérifiées ; les tests ne démontrent pas de rentabilité future.

**Mise en service confirmée le 31/10/2026 à 21:06:58 UTC (22:06:58 Europe/Stockholm)** : copie pré-déploiement du ledger `/root/boono-v543-floor-authority-final-snapshot-20261031/{state.json,trades.ndjson,decisions.ndjson}` (empreintes SHA-256 contrôlées), puis redémarrage **uniquement** de `boono-v543-paper` et `config-server`, PM2 sauvegardé. Nouvelles instances **V543 PAPER PID 2183247**, **config-server PID 2183409** ; V494 PAPER reste au **PID 962864**, shadow de maintien V543 au **PID 1905494**, les autres shadows V494 également inchangés.

**Vérifications après plusieurs cycles :** le ledger V543 conserve **135 clôtures, P&L cumulé −198,132 USD, equity 801,868 USD, frais cumulés 203,2568 USD** au contrôle et `policyActivatedAt=1793138441307` inchangé. Le SHORT déjà ouvert au 31/10 21:03:36 UTC conserve son `entryAt=1793480616531` et sa politique **LEGACY `v543-legacy-autonomous-gain-floor-v1`**, avec son ancienne protection de gain-floor jusqu'à clôture. Les prochains trades auront la politique `v543-mcb-structure-first-floor-advisory-v1`. La date précise de mise en service persistée est `floorAuthorityActivatedAt=1793480818169`. Dans les décisions V543 fraîches, la première entrée post-redémarrage du journal est `HOLD / HOLD_CAMPAGNE` avec `floorAuthority` et `positionVersion` correctes ; aucun trade historique ajouté ni résultat inventé. `brokerOrdersEnabled=false`. Les endpoints web anonymes restent protégés par redirection HTTP302 ; code JavaScript Watch généré compilé et syntaxiquement vérifié, sans constat visuel de la session utilisateur authentifiée.

**Statut économique : politique PAPER réellement chargée, mais performance de la nouvelle politique non encore observée sur de nouvelles entrées.** La conservation des floors de la position héritée est intentionnelle, pas un échec du changement. Un suivi prospectif devra commencer à la prochaine entrée nouvelle, pas comparer les trades d'avant la migration comme si leur protection avait changé.

## 6. Expériences de suivi obligatoires

La première campagne prolongée par ce nouveau régime doit être comparée au contrefactuel floor sur **la même horloge de prix** : MFE, MAE, P&L brut/net, temps supplémentaire, nombre de réentrées économisées ou manquées, moment de MCB `EXIT`, perte de niveau et transfert prix/MF, hard-risk éventuel, frais, traversées de seuil sans suite. Chercher en priorité **les cas où la structure dit de rester mais où elle se trompe ensuite** ; c'est le principal risque de la régression des floors.

Pour V494, constituer des familles d'épisodes à **faible débit mais conversion productive** (comme #58) et à **faible débit, conversion stérile** (comme plusieurs shorts samedi), puis mesurer si effort/rendement et persistance 4×15 discriminent. **Aucune règle « samedi » ni seuil de volume n'est validé.**

**Gouvernance :** OD-20261031-002, source littérale 01, mission opérationnelle 02, origine 03, événements AUTORISE / IMPLEMENTE / TESTE / MIS_EN_SERVICE. Publication GitHub à vérifier séparément. Cette intervention n'autorise pas la promotion des shadows expérimentaux comme résultats acquis.
