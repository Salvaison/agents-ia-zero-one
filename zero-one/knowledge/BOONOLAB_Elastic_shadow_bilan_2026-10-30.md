# BOONOLAB — Elastic shadow : bilan critique des observations

**30 octobre 2026 — enquête en lecture seule sur Amsterdam.**  
**Statut : OBSERVATION / RECHERCHE ; aucune règle, aucun runner, aucune décision de trading modifiés.**

## Origine et question
Demande du propriétaire (30/10) : « A propos des shadow, il y a l'elastic qui tourne depuis un moment, d'aprés les critères que nous avions enoncé quel sont les résultats que celà nous donne? Y a t il des bonnes observations, conclusions à tirer de ces observations? »

Distinguer : (1) Elastic Sync v0.3 / deux chaînes v0.4 ; (2) Elastic Observer v0.5 / qualités ; (3) mémoire Elastic V5 ; (4) flux natif V5.4 après retrait de l'ancien V4.10.10.

## Sources réellement vérifiées
- `data/trade-sim-v4-state.json` → `lastEvaluation.elasticSyncShadow`, dernier état **2026-10-26 12:36:15 UTC**.
- `data/v5-shadow-memory-state.json`, dernier état **2026-10-23 07:56:04 UTC**.
- `data/elastic-observer-events.ndjson` : 16 700 lignes dont **13 800** `elastic-observer-shadow-v0.5` (21/10 15:25:53–26/10 12:36:12 UTC) et **2 900** `BOONO_V54_EVENT_DATA_ONLY` (26/10 15:09:39–30/10 18:30:53 UTC lors du contrôle).
- `modules/v4/experiments/elastic-sync-shadow.js`, `modules/v4/experiments/elastic-observer-shadow.js`, `modules/v5/causal-event-feed-v54.js`.
- `knowledge/elastic-sync-v0.3-evidence-conversion-2026-10-19.md` ; `knowledge/BOONO_V5_elastic_memory_shadow_v01_2026-10-22.md` ; `knowledge/BOONO_V54_incident_faux_degrade_et_source_Elastic_2026-10-26.md`.

**Statut de la collecte :** la machine complète Elastic v0.3/v0.4 ne continue plus ses mesures ; le V5 Elastic Memory v0.1 n'a plus de nouveaux échantillons depuis le 23/10. Depuis le 26/10, le flux natif V5.4 assure E3/E15 et BW/LBWcross mais **pas** les classes de conversion P75/P95 `POWERFUL/EASY/...`. La continuité du fichier d'événements ne prouve pas la continuité du laboratoire complet. Trou historique le 26/10 entre l'arrêt V4 et la réparation partielle. En outre, le répertoire `data/audit-14d` ne contient, lors de la vérification, que des fichiers horaires depuis le 29/10.

## Elastic Sync v0.3 : unités et issue
Mémoire glissante retenue : **50 épisodes complétés + 1 actif**, entre **24/10 03:06 et 26/10 12:36 UTC**, répartis sur **26 identifiants de campagne** ; 26 SHORT / 25 LONG. Attention : les anciens épisodes v0.2 et les précédents v0.3 ont été évincés de cette mémoire, il ne s'agit pas de la totalité depuis l'installation.

- Test descriptif `+220 $ cours avant -180 $` : **8 positifs, 6 négatifs, 37 indécis/censurés** (aucun des deux seuils atteint avant changement/fin). **Ce n'est pas un win rate ni un P&L.**
- Résolutions des 50 clôtures : **37 `DIRECTION_CHANGED`**, **12 `15M_CAMPAIGN_CHANGED`**, **1 `DATA_DEGRADED`** ; durée médiane d'épisode ~**13,5 min**. Le modèle segmente très souvent sur bascule de candidature directionnelle plutôt que changement effectif de campagne 15m.
- **31/51** épisodes contiennent au moins un signal E3 adverse dans l'observateur, et **6/8** épisodes atteignant +220 avaient un E3 adverse *avant* l'atteinte de +220. Cela montre qu'une contre-épreuve peut coexister avec un trajet favorable ultérieur, sans constituer une preuve de politique EXIT. **Ne pas interpréter `relaxationCount` comme nombre d'E3 distincts :** le code peut répéter une condition E3 adverse persistante toutes les 2 min.
- Sur **22 paires** `E3_LIVE → E3_CONFIRMED` enregistrées dans les mêmes épisodes, seulement **10** partagent le même `sourceTs` natif ; **12** rapprochent des signaux différents. Les moyennes de délais par noms d'événements ne mesurent donc pas directement la maturation d'un même E3. Appariement obligatoire par `sourceTs`/lignée.

Premières conversions après preuve (v0.3, preuve évaluée dans sa propre direction, horizon 15 min **uniquement si disponible**) :
| Preuve observée | Favorable à +15 min | Déplacement moyen signé à +15 min |
|---|---:|---:|
| `PM5_EFFECTIVE` (thèse) | 14/23 | +7,2 $ BTC |
| `E3_LIVE` (thèse) | 12/21 | +35,3 $ BTC |
| `E3_CONFIRMED` (thèse) | 10/20 | +6,9 $ BTC |
| `E3_OPPOSITE_LIVE` (contrepreuve) | 11/21 | +6,2 $ BTC |
| `PRICE_OPPOSITE_PRODUCTIVE` (contrepreuve) | 8/23 | −17,1 $ BTC |
| `MF15_SLOPE_OPPOSITE` (contrepreuve) | 4/21 | −38,3 $ BTC |

Les familles MCB (LBW/LOBE/cross) peuvent coder le même phénomène ; ne pas additionner leurs occurrences comme votes indépendants. Une contrepreuve isolée est fréquemment absorbée ; sa qualité prédictive de véritable transfert stratégique reste à démontrer.

## Elastic Observer v0.5 : reconstruction exploratoire de la qualification
`CONVERSION` a produit **6 116 transitions** entre 21/10 et 26/10 ; espacement médian des transitions ~**32,6 secondes**. Durée médiane des phases après transitions : `POWERFUL` ~30,3 s, `EASY` ~30,3 s, `EXCEPTIONAL` ~30,1 s ; seulement ~12,7 %, ~13,9 % et ~6,1 % de ces phases, respectivement, dépassent 90 s. Une étiquette isolée est instable ; cohérent avec le projet d'agrégation temporelle des quatre quarts d'heure.

**Méthode de reconstruction indépendante (lecture seule) :**
- Sélection de `key=CONVERSION, type=CONFIRMED, direction=long|short`. Ce `CONFIRMED` de qualité correspond au contrat logiciel `cv.samples===3` ; ce n'est **pas** la confirmation native d'un E3/E15.
- Déplacements signés par `direction` depuis le prix de l'événement jusqu'au prix observé le plus proche de +15 min (tolérance max 90 s). Avance préalable similaire mesurée vers −5 min. Prix issus des événements archivés (10 337 horodatages de prix uniques), **pas** de ticks exhaustifs.
- Événements non indépendants, régimes de marché non équilibrés, sans frais, stops, fills ou simulation de réentrée. L'étiquette qualité décrit la conversion actuelle (P75 effort/rendement), elle ne promet pas l'avenir.

| Qualité confirmée | Avance médiane à −5 min | Favorable à +15 min | Médiane signée à +15 min |
|---|---:|---:|---:|
| EASY | +54,2 $ | **9/13 (69,2 %)** | **+30,5 $** |
| POWERFUL | +159,5 $ | **9/31 (29,0 %)** | **−55,4 $** |
| EXCEPTIONAL | +191,3 $ | **4/10 (40,0 %)** | **−10,7 $** |
| INEFFICIENT | +66,5 $ | **34/86 (39,5 %)** | **−18,1 $** |
| SILENT | +33,5 $ | **310/651 (47,6 %)** | **−7,9 $** |

Contrôle simple de répétition : à raison d'un signal au plus tous les 15 min par paire (classe, direction), `POWERFUL` reste **8/28 favorable à +15 min**, `EASY` **9/13**. Par sens : `POWERFUL` LONG 5/12, SHORT 4/19 ; `EASY` LONG 4/7, SHORT 5/6. **N très faibles**, particulièrement par régime/sens.

**Horizon 30 min avec trajectoire échantillonnée, contrôle des trous >120 s :** `EASY` 13 fenêtres (3 atteignent +220 avant -180, 2 atteignent -180 d'abord, 8 indécises ; MFE médian 140,2 / MAE 58,9). `POWERFUL` 26 fenêtres (6 favorables, 9 défavorables, 11 indécises ; MFE médian 67,2 / MAE 148,7). Ces excursions en **cours BTC** ne sont ni un stop exécuté, ni un P&L net.

**Contrôle de confusion important :** un échantillon de référence du prix (un point par bloc 15m) montre que les 9 impulsions avec plus de 200 $ de progression au cours des 5 minutes précédentes ne continuent que **2/9** fois à +15m. Ainsi le défaut de `POWERFUL` peut être largement expliqué par l'avancement du mouvement lui-même, pas nécessairement par un effet prédictif particulier du P75/volume. Exiger un contrôle apparié par amplitude préalable, régime MCB15, sens, position dans le range et temps.

## Conclusions et expériences à poursuivre (non validées comme règles)
1. **Très utile descriptivement, non démontré économiquement** : Elastic révèle chronologie, effort, prix et contre-offensive, mais aucune rentabilité shadow full-policy n'a été établie.
2. **Différencier intensité et potentiel résiduel** : `POWERFUL` apparaît souvent après une forte avance et se rétracte ; `EASY` mérite un contrôle apparié comme continuation moins coûteuse. Aucun veto ni ordre automatique à dériver des petits échantillons.
3. **Une contrepreuve n'est pas un transfert** : E3 adverse, pente MF15 adverse et mouvement de prix opposé peuvent être absorbés ; tester explicitement **prix effectivement conservé, défense MA/territoire, persistance, hiérarchie E15→E15** avant toute conséquence sur EXIT.
4. **Requalifier les identités** : segmenter une campagne par parent E15 et tentatives E3 distinctes ; appariement Live/Confirmed par `sourceTs`, non par noms seuls ; `relaxationCount` doit compter des tentatives uniques, pas des répétitions d'une condition persistante.
5. **Réparer l'observabilité avant de promouvoir** : remettre en fonction, isolément et sans autorité, le collecteur des qualités, l'observateur d'épisodes et la mémoire 4×15m ; distinguer anciens états `STALE` de télémétrie native récente dans la page Shadows. Pas d'activation/restart autorisé ni effectué par cette enquête.
6. **Étude prospective sans fuite du futur** : comparer mêmes épisodes 4.9.4/5.4.3 avec fenêtres as-of, MFE/MAE, frais, P&L net, refus, sorties/réentrées et les deux modules entrée/sortie V4 en shadow. Chercher systématiquement les contre-exemples.

**Gouvernance :** document de résultats d'enquête uniquement ; aucun prompt d'implémentation, aucune décision opérationnelle nouvelle et aucune mise en service. Toute promotion d'Elastic ou changement de politique requiert validation explicite et registre OD avec textes intégraux.
