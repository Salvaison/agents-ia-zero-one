# BOONO — Version log

## Pré-Constitution
Dernier état actif de l'ancienne famille avant le 14/09/2026. Entrées orientées par le bâton et accumulation historique de filtres/guardrails.

## V1 — constitution-v0.1 — 14/09/2026
Première Constitution du simulateur: top-down, microstructure, FORCE_SHIFT, location, séparation des sorties, UNKNOWN.

## V2 — constitution-v0.2 — 16/09/2026
Pipeline WHERE → STATE → DOMINANCE → RISK → ACTION et séparation technique des couches.

## V2a — constitution-v0.2a — 17/09/2026
Admission renforcée par DOMINATION_PERSISTANTE et blocage de nouvelles entrées en érosion. Shadow divergences/Fib ajouté.

**Clôture expérimentale: 18/09/2026.**  
V2a devient un artefact historique reproductible. Son dernier trade actif a été fermé administrativement par `EXIT_VERSION_TRANSITION`, à exclure des performances stratégiques.

Archive finale pré-bascule:
`archives/v2a-final-20260918T092407Z`

Principaux enseignements ayant motivé V3-LAB:
- signe du lobe ≠ direction de vague;
- zéro MCB ≠ bascule de polarité;
- entrée même sens que le lobe fortement déficitaire sur le corpus prospectif étudié;
- une part importante des pertes récupère ensuite dans le sens initial: timing/respiration;
- sortie globalement meilleure que l'admission;
- divergence 3m utile surtout comme réaction locale;
- Fib V2 mal ancré;
- LGI utile comme localisation courte, confluence prometteuse;
- S/R pertinent lorsqu'il existe, catalogue incomplet;
- régime indispensable à l'interprétation de DOMINANCE.

## V3-LAB — prototype intégral — 18/09/2026
Seul chantier expérimental live/paper actif.

Objectif: laboratoire complet avant construction de la plateforme finale.  
Nouveaux contrats: Bâton V3 brut, prix live comme série, vague E15→E15, phases CRÊTE/DESCENTE/CREUX/MONTÉE, régime, respirationRisk, WHERE descriptif, divergence/Fib shadow.


## V3-LAB 0.2 — mémoire de séquence + reversal forming — 19/09/2026

Évolution active du prototype intégral.

Ajouts :
- wave.nested3m : phase/direction/pivots MCB 3m séparés du 15m ;
- SEQUENCE_MEMORY_V3 :
  - WHERE mémorisé 12 min ;
  - turning point 15m mémorisé 18 min ;
  - dominance mémorisée 6 min à titre descriptif ;
  - une entrée continuation exige néanmoins une DOMINANCE actuelle persistante/alignée ;
- REVERSAL_FORMING :
  - turning point 15m courant/récent ;
  - phase 3m opposée ;
  - DOMINATION_PERSISTANTE opposée actuelle ;
  - régime différent de HACHOIR/CHOC_COMBAT ;
  - le turning point 15m sert de localisation structurelle, sans exiger une LGI/SR externe simultanée.

Le passage zéro MCB reste sans valeur de bascule autonome.

Tests de référence :
- cas LONG 19/09 ~09:40 : la mémoire aurait autorisé l’entrée à ~09:52:41 / 81 055 après recombinaison WHERE récent + dominance long actuelle ;
- cas SHORT 19/09 ~11:20 : REVERSAL_FORMING_SHORT aurait été actif vers ~11:26:32 / 81 406, une fois CRÊTE_EN_FORMATION 15m + 3m short + dominance short réunis.

## Alignement source TradingView MCB sur OKX — 20/09/2026
TradingView/MCB passe de Bybit `BTCUSDT.P` à `OKX:BTCUSDT.P` afin d'aligner la structure MCB sur la source opérationnelle OKX déjà utilisée par le prix et la microstructure. Pas de reconstruction historique générale ; la fenêtre de transition est explicitement marquée et les comparaisons historiques restent source-aware. Voir `knowledge/data-source-transition-2026-09-20.md`.

## V3-LAB 0.2 — patch cohérence entrée/sortie — 20/09/2026
Correctifs ciblés : (1) une position `REVERSAL_FORMING` n'est plus liquidée mécaniquement par la phase 15m qu'elle anticipe ; (2) une structure déjà invalidée bloque désormais l'admission ; (3) `SEQUENCE_MEMORY` conserve la nature directionnelle de WHERE et interdit la réutilisation d'un support pour autoriser un short, ou d'une résistance pour autoriser un long. Position enrichie avec thèse/invalidation d'entrée et confirmation du reversal. Tests et replays ciblés validés. Voir `knowledge/v3lab-coherence-fixes-2026-09-20.md`.

## V3-LAB — divergence lineage shadow v0.1 — 20/09/2026
Ajout d'un shadow 15m sans impact décisionnel pour tester l'hypothèse `divergence age = structural lineage age`. Le shadow distingue âge temporel, âge en pivots et âge structurel, conserve les divergences multi-ancres malgré des E15 intermédiaires, mesure le contenu LBW entre ancres et classe provisoirement ACTIVE/HISTORICAL selon une frontière de mouvement expérimentale. Le changement de polarité MCB reste une preuve de transition et non une preuve suffisante de transfert de puissance. Cas live initial : campagne candidate short depuis la CRÊTE E15 du 19/09 15:30 UTC ; divergence bullish du 20/09 02:45 UTC active ; divergence bearish du mouvement précédent historique. Voir `knowledge/experiment-divergence-lineage-shadow-2026-09-20.md`.

## V3-LAB 0.2 — WHERE neutre LGI + MA200 + sortie transfert adverse — 20/09/2026
Correction du contrat de localisation : LGI strictement neutres et utilisées uniquement comme lieux ; niveaux fixes support/résistance et MA200 15m peuvent porter une sémantique directionnelle. Ajout MA200 15m au WHERE avec tolérance configurée à 0,1 %. RISK ne bypass plus la compatibilité sémantique via `where.relevant`. Ajout d'une `EXIT_EXECUTION` contextuelle lorsque le trade a produit une MFE significative, en rend >=50 %, et qu'une dominance opposée persistante conserve durablement le terrain. Turning point 15m inchangé. Voir `knowledge/v3lab-where-transfer-fixes-2026-09-20.md`.

## V3-LAB — MA200 multi-TF shadow v0.1 — 20/09/2026
Ajout d'un shadow MA200 sans impact décisionnel sur 3m/15m/1h/4h/1d. Il regroupe les contacts en épisodes, distingue CROSS_UP/CROSS_DOWN/HOLD_AS_SUPPORT/HOLD_AS_RESISTANCE, mesure durée au-dessus/dessous, distance, pente, fraîcheur et synthèse inter-TF. Première hypothèse suivie : reclaim 3m + maintien 15m comme support = candidat de maturation de retournement à falsifier dans le MW. Les archives pré-transition Bybit→OKX sont explicitement marquées et exclues de la synthèse de maturation ; le daily est inclus mais reste `PRE_CUTOVER_ARCHIVE` jusqu'à son prochain rafraîchissement OKX. Turning point 15m inchangé. Voir `knowledge/experiment-ma200-multitf-shadow-2026-09-20.md`.

## MW multi-jours — protocole horaire v0.1 — 20/09/2026
Création d'un agrégateur horaire read-only fondé sur l'état vivant : numériques entrée/moyenne/sortie, catégoriels entrée/occupation temporelle/sortie, contexte top-down causal, performance BOONO, shadows, gates, changements significatifs et déclencheurs de deep dive. Ajout d'un ledger de prévisions figées exigeant thèse + conditions observables de validation/invalidation sur 1h et 1–3h. Trois fenêtres rétrospectives du 20/09 ont servi à réduire le bruit des transferts et à supprimer tout look-ahead top-down. Voir `knowledge/mw-multiday-protocol-v0.1-2026-09-20.md`.

## Gouvernance MW — autorisation réglages locaux autonomes — 20/09/2026
Pour la semaine de validation MW, Benjamin autorise Astra à appliquer sans approbation préalable des ajustements locaux de seuils/paramètres lorsqu'ils sont directement soutenus par les données et ne touchent ni l'architecture globale, ni les responsabilités des modules, ni le concept de trading, ni une logique décisionnelle structurante. Toute modification doit être précédée d'un backup, suivie des tests pertinents, rapportée à Benjamin et documentée avec avant/après, preuves et résultat. Une revue approfondie 24h est prévue quotidiennement pendant la semaine.

### MW horaire — 20/09/2026 18:00–19:00 Paris
[DÉMONTRÉ] Prévision précédente H+1 : le reclaim/rebond s'est prolongé. Prix 80 860 → 81 300 (+440 $), max 81 430.9 ; MA200 3m et 15m tenues au-dessus 100 % de l'heure ; 80 930 franchi ; aucune invalidation sous MA200 ni sous 80 270. Lineage a changé de candidat short vers long mais reste PROVISIONAL / `MOVEMENT_TRANSITION_EVIDENCE`, sans transfert durable confirmé. Deux alternances de dominance persistante fortes (16:33Z short→long proof .75 retained 1 ; 16:47Z long→short proof .70 retained .97) justifient un deep dive, mais leur instabilité interdit d'en conclure un changement durable. Aucun trade BOONO sur l'heure. Aucun seuil modifié : les états 15m/3m restent `DESCENTE` malgré +440 $ et LBW15 78.7→91.7 ; contradiction notée [AMBIGU] à étudier sur plusieurs fenêtres avant toute correction. Nouvelle prévision figée `mwf-20260920-1700Z` : poursuite possible mais extension élevée, respiration 3m probable ; validation/invalidation explicitement liées à MA200 3m, 80 930/80 800, dominance persistante et future structure 15m.

## MW horaire — 20/09/2026 17:00–18:00 UTC
Rapport read-only. Prévision `mwf-20260920-1700Z` évaluée `[AMBIGU]`: respiration 3m observée mais poursuite >81300 non validée; aucune invalidation complète car MA200 3m/15m restent tenues et 80800 n'est pas perdu. Nouveau forecast `mwf-20260920-1800Z` figé. Deep dive déclenché par alternances de dominances persistantes. Défaut sémantique déjà démontré dans l'enquête live: `wave.origin.price=80750` sert à l'invalidation structurelle short alors que `wave.price.maxPrice` a dépassé 81430; ce défaut explique le gate `structure deja invalidee avant admission` présent sur 116/116 évaluations. Aucun seuil ni code modifié: la correction toucherait à la sémantique structurelle wave/risk, donc hors correction locale autonome et à soumettre à validation architecturale/conceptuelle.

## V3-LAB 0.2 — séparation ancre E15 / extrême prix structurel — 20/09/2026

Correction explicitement autorisée par Benjamin après diagnostic live.

- Avant : en continuation, `risk.js` utilisait `wave.origin.price` comme invalidation. Pour la phase short courante, l'ancre E15/LBW valait 80750 alors que le prix avait imprimé `wave.price.maxPrice=81432.1`; RISK déclarait donc la structure déjà franchie.
- Après : l'ancre `wave.origin` reste inchangée comme métadonnée E15/LBW. `pricePath()` agrège audits 30 s, ticks live et high/low des bougies OKX/MCB 15m causales depuis cette ancre. L'invalidation de continuation utilise `wave.price.maxPrice` pour un short et `wave.price.minPrice` pour un long. La valeur est figée dans la position à l'entrée et reste ensuite contrôlée par ACTION.
- Sécurité : si l'extrême prix observé est indisponible, l'admission échoue fermée avec `extreme prix structurel indisponible`.
- Affichage : l'état vivant distingue désormais `ancre E15`, `extrême prix` et `inval.`.
- Valeurs live après activation : prix 81100.1, ancre E15 80750, extrême/invalidation short 81485.9, minimum 80369, 17 bougies 15m couvertes, distance valide +385.8, `breached=false`. ACTION ne contient plus le faux motif `structure deja invalidee avant admission`; le refus observé reste attribué à dominance/localisation.
- Fichiers : `modules/v3lab/layers/wave.js`, `modules/v3lab/layers/risk.js`, `modules/config-server.js`, `tests/v3lab/coherence-regression.test.js`.
- Tests : syntaxe Node de wave/risk/config-server ; test dédié prouvant que les high/low 15m complètent les audits/ticks ; suites V3 coherence/divergence-lineage/MA200/MW ; suites V2 core/simulator. Tous validés.
- Activation : redémarrages contrôlés de `cerveau-central` et `config-server`, uniquement sans position V3 ouverte ; deux processus online, flux OKX reconnecté, page HTTP répond 302 vers authentification.
- Backup : `archives/v3lab-pre-structural-price-extreme-fix-20260920T1808Z`.

## MW horaire — 20/09/2026 19:00–20:00 UTC
Rapport read-only. Forecast `mwf-20260920-1900Z` évalué `[AMBIGU]`: le test 80930/MA200 3m ne s est pas produit, mais aucune invalidation complete non plus. Prix 81035.1→81150.4, range 81032.3–81275.6; MA200 3m/15m tenues 100%. Deep dive déclenché par POWER_TRANSFER long→short proof .74 retained 1 à 19:56Z et ouverture short day à 81196 avec invalidation structurelle corrigée 81485.9. Nouveau forecast `mwf-20260920-2000Z` figé. Aucun seuil/code modifié.

## MW horaire — 20/09/2026 20:00–21:00 UTC
Passe de récupération manuelle après déclenchement automation 23:00 Paris sans production/livraison vérifiable à 23:10, puis relance immédiate elle aussi sans trace serveur. Agrégateur validé exécuté directement, sans modification du moteur, des seuils ou des processus.

Forecast `mwf-20260920-2000Z` évalué `[DÉMONTRÉ]` : prix 81169.3→81053.5, range 81045.6–81197.2 intégralement dans 81000–81280 ; dominances short persistantes fortes mais MA200 3m/15m tenues 100% et aucune acceptation sous 80800. Short 81196 clôturé 81187.9, +0.100% lev, MFE 71$, MAE 0.1$, capture 11.4%, giveback 62.9$ ; deep dive requis mais un seul cas ne démontre pas un défaut de seuil. Nouveau forecast `mwf-20260920-2100Z` figé. Aucun code/seuil modifié.

## MW horaire — 21/09/2026 01:00–02:00 UTC
Forecast mwf-20260921-0100Z évalué [FALSIFIÉ] après extension 82053.3 puis rejet violent jusqu’à 80963.4, perte de 81485.9/81280 et CROSS_DOWN MA200 3m. Deep dive déclenché par POWER_TRANSFER, cross MA200 et deux shorts perdants (-1.982% lev total), dont un giveback MFE 99.7$. MA200 15m/1h/4h/1d restent au-dessus. Nouveau forecast mwf-20260921-0200Z figé. Aucun seuil/code modifié: aucune correction locale sûre démontrée; le problème de giveback/exécution reste à accumuler avant changement.

## MW horaire — 21/09/2026 02:00–03:00 UTC
Rapport read-only. Forecast `mwf-20260921-0200Z` évalué `[FALSIFIÉ]`: prix 80992→81297.5, min 80979.9; la poursuite vers 80880/MA200 15m n'a pas eu lieu. MA200 3m BELOW seulement 12.5% puis CROSS_UP @81182.2 à 02:36Z; MA200 15m ABOVE 100%. Deep dive déclenché par POWER_TRANSFER long→short .72/.97, CROSS_UP 3m, puis short→long .75/1. Aucun trade; aucun seuil/code modifié. Nouveau forecast `mwf-20260921-0300Z` figé: reclaim réel mais fragile sous 81485.9; frontières MA200 3m/~80980 et 81485.9.

## Gouvernance MW — addendum passation et autorisation structurelle conditionnelle — 21/09/2026 09:29 Paris

- La passation complète `BOONO_passation_discussion_laterale_2026-09-21.md` est désormais la base active
  commune aux MW horaires et au Deep Review 24 h ; son contenu source a été transféré intégralement,
  vérifié par SHA-256, puis complété par un addendum explicite.
- Fait constaté sans modification du moteur : l’extrême depuis E15 alimente actuellement
  `risk.structural.invalidationPrice`, est figé à l’entrée et peut déclencher `EXIT_STRUCTURE`.
- Hypothèse prioritaire à falsifier : séparer ancre E15/LBW, protection prix/exécution et
  invalidation de tendance, cette dernière devant être évaluée par tendance adverse MCB naissante
  puis retournement E15→E15 confirmé plutôt que par le seul top/bottom reconnu.
- Benjamin autorise, uniquement après conclusion et décision du Deep Review, une modification
  structurelle ciblée de l’admission `REVERSAL_FORMING` et de cette séparation sémantique/opérationnelle.
  Une seule fenêtre de changement par jour ; preuves convergentes, backup, tests, replays et rollback requis.
- La continuité des MW horaires est permanente pendant la semaine de validation et ne dépend plus
  d’une nouvelle confirmation dans les discussions parallèles.
- Aucun code, seuil, processus moteur ni position n’a été modifié lors de cette consignation.

## Gouvernance — autorisation Deep Review étendue — 21/09/2026
Benjamin autorise, pour cette semaine et après conclusion d'une Deep Review 24h, l'implémentation autonome d'une correction structurelle ciblée sur `REVERSAL_FORMING` / `ELIGIBILITY` / prévention des entrées tardives contre une thèse structurelle encore valide, lorsque les preuves 24h sont convergentes. Une seule fenêtre de modification/jour, backup + tests + vérification processus + log + rollback obligatoires. Cette extension ne couvre pas les refactors architecturaux sans lien direct. Les Deep Reviews continuent automatiquement sans nouvelle confirmation. Voir `knowledge/authorization-24h-deep-review-2026-09-21.md`.


## Infrastructure MW — snapshot partagé borné — 21/09/2026 08:19 UTC
- [CHANGEMENT AUTORISÉ] Création atomique de `data/BOONO-live-snapshot.json`, extraction read-only sans impact décisionnel ni redémarrage.
- Taille finale après rafraîchissement: 8 122 149 octets (<10 Mo); fenêtre réelle 1 h (<2 h); 120 évaluations, 120 audits, 1 trade; plafond 500 observations/série; aucun tick brut.
- Garde disque: 83,41% libre avant écriture. `audit-history.json` est borné à 2 880 observations et ses archives quotidiennes sont présentes jusqu’au 20/09.
- Premier candidat 2 h: 16 368 578 octets, rejeté avant `os.replace`; temporaire supprimé, aucun snapshot hors plafond publié.
- Vérification: JSON relu avant remplacement, permissions 0644, taille et caps contrôlés.
- Rollback: supprimer `data/BOONO-live-snapshot.json`; aucun composant moteur ne dépend de ce fichier.
- Aucun seuil, module décisionnel, processus moteur ou position modifié.

## BOONO 24h Deep Review — ELIGIBILITY R:R / respiration / maturité / WHERE breach — 21/09/2026
Intervention décisionnelle unique du jour après Deep Review immédiate autorisée. Sur 28 trades V3 étudiés: -21.936% levier, 6W/22L; PHASE_CONTINUATION -16.356%, REVERSAL_FORMING -5.580%. Trois défauts convergents corrigés: (1) R:R structurel devient décisionnel avec minimum 1.0 vers le prochain repère MA200 3m/15m ou niveau utilisateur; (2) l'invalidation d'entrée doit laisser au moins max(10$, 0.25×p50 respiration); (3) une PHASE_CONTINUATION est inadmissible si sa contre-excursion prix a dépassé 2.5× sa meilleure translation après une translation significative. En parallèle, SEQUENCE invalide une mémoire WHERE directionnelle après breach au-delà de sa tolérance et une LGI neutre ne peut plus override un niveau/MA200 directionnel explicite. Replay contrefactuel: 18/28 trades refusés, représentant -20.952% levier historique, seulement deux petits gagnants supprimés; résultat prospectif encore à falsifier. Backup `archives/v3lab-pre-deep-review-eligibility-20260921T110142Z`; suites V3/V2 toutes OK; redémarrage uniquement `cerveau-central` sans position V3 ouverte. Voir `knowledge/deep-review-24h-2026-09-21.md`.

## V3-LAB — intervention de cohérence exceptionnelle phase/thèse/éligibilité — 22/09/2026 ~07h Paris

- Autorisation explicite de Benjamin : fenêtre exceptionnelle supplémentaire, distincte de la Deep Review 11h.
- [ARTEFACT LOGIQUE] phase LBW, tendance structurelle prix et permission d'entrée étaient confondues dans wave→risk→action.
- [DÉMONTRÉ] replay 28 trades : 18 trades contre le dernier mouvement prix E15→E15 = -17.942% lev; 8/10 trades structurellement alignés avec <50% de meilleure translation conservée = -7.213%; 2 >=50% = +1.117%.
- wave.js : structuralLeg() ajoute une thèse directionnelle issue de la géométrie prix du dernier E15→E15 confirmé, indépendante de phase/direction LBW.
- sequence.js : locationByDirection LONG/SHORT; WHERE n'est plus lié exclusivement à wave.direction.
- risk.js : thèse E15 prix prioritaire; contre-thèse microstructurelle bloquée; phase saine >=50% conservée reste PHASE_CONTINUATION.
- risk.js : phase épuisée ou phase LBW opposée bascule vers STRUCTURAL_REASSERTION; admission exige 3m aligné, turning <=6 min, CURRENT_WHERE, dominance persistante, R:R et protection respirable.
- action.js : limite prix = protection/EXIT_RISK; une phase LBW opposée n'est plus une invalidation de tendance; EXIT_STRUCTURE exige falsification du mouvement E15 prix ou nouveau E15→E15 opposé confirmé.
- trade-simulator-v3lab.js : protectionPrice + entryThesis stockés; confirmation reversal structure-aware.
- Backup : archives/v3lab-pre-emergency-coherence-20260922T051546Z.
- Tests : coherence-regression + divergence-lineage-shadow + ma200-shadow + mw-hourly-report + V2 core-contract + V2 simulator-v02-regression, tous exit 0.
- Activation sans position V3; seul cerveau-central redémarré; moteur-boono inchangé.
- Vérification live : thèse LONG 81862.5→86340 (+4477.5$), phase mature routée vers STRUCTURAL_REASSERTION; refus actuel local et explicite (dominance/turning/WHERE/protection), pas verrou global irréversible.
- Rollback : restaurer les fichiers depuis le backup et redémarrer uniquement cerveau-central hors position.
- Rapport détaillé : knowledge/emergency-coherence-2026-09-22-0700.md.

## BOONO 24h Deep Review — cible R:R structurelle E15→E15 — 22/09/2026

- [FAIT OBSERVÉ] Fenêtre 09:00Z→09:00Z : 2 861 évaluations, 5 LONG, 1W/4L, -5,3573 % levier, PF 0,0979, DD 5,3573 %, MFE 485,4 $, MAE 600,3 $, capture moyenne 6,49 %, giveback 948,5 $.
- [DÉMONTRÉ] Le correctif d’urgence garde la thèse prix LONG ACTIVE sur 431/431 évaluations post-activation et bloque les contre-thèses : 71 dominances SHORT persistantes, aucun WATCH/ENTER SHORT.
- [AMBIGU] Réouverture effective : 425 WATCH STRUCTURAL_REASSERTION, 22 états tactiquement prêts, aucune admission live.
- [ARTEFACT LOGIQUE] L’ancienne cible R:R sautait de MA200 3m proche sous la MA à un niveau fixe très lointain après reclaim. Deux réassertions complètes à 08:01Z furent bloquées uniquement à R:R 0,58 avant +905,1 $ MFE/-65 $ MAE ; les quatre LONG tardifs de minuit affichaient R:R 31–59 et trois ont perdu.
- [DÉCISION MÉTHODOLOGIQUE] Modification unique du jour : 'risk.js' privilégie 'STRUCTURAL_RECLAIM' vers l’extrémité du dernier leg E15→E15 confirmé, puis 'STRUCTURAL_EXTREME' vers l’extrême local ; fallback MA200/niveaux seulement ensuite.
- Seuil minimum R:R, protection, respiration, maturité, WHERE, turning, 3m, dominance et ACTION inchangés.
- Shadow 24 h : deux pertes (-3,7416 %) et un petit gain (+0,5816 %) auraient été bloqués ; amélioration historique indicative +3,16 %, sans PF rejoué complet.
- Fichiers : 'modules/v3lab/layers/risk.js', 'tests/v3lab/coherence-regression.test.js'.
- Backup : 'archives/v3lab-pre-deep-review-structural-target-20260922T091614Z'.
- Tests : syntaxe risk ; V3 coherence/divergence-lineage/MA200/MW ; V2 core-contract/simulator, tous validés.
- Activation hors position : restart uniquement 'cerveau-central', online compteur 1 ; 'moteur-boono' online compteur 0.
- Live 09:20:41Z : prix 85 904,2, LONG ACTIVE, cible STRUCTURAL_RECLAIM 86 340, protection 85 070,2, R:R 0,5225, WATCH, aucune position.
- Rollback : restaurer risk/test depuis le backup puis redémarrer uniquement cerveau-central hors position si cibles incohérentes ou dégradation PF/DD/capture.
- Rapport détaillé : 'knowledge/deep-review-24h-2026-09-22.md'.

## V3-LAB — nettoyage contrat protection / MA200 positionnel — 22/09/2026 ~18:40 Paris

- [DÉMONTRÉ] `invalidationPrice` persistait dans le contrat vivant alors que sa sémantique avait déjà été changée en simple protection d'exécution. Relation supprimée du périmètre V3 actif.
- `reversal.js` expose désormais `protectionPrice`; `risk.js` ne produit plus `risk.structural.invalidationPrice`; `action.js` ne lit plus de fallback legacy `invalidationPrice`; les nouvelles positions/évaluations/historiques stockent `protectionPrice` uniquement.
- `config-server.js` affiche `protection @ ...` au lieu de `inval. @ ...`.
- [DÉMONTRÉ] le shadow MA200 5/5 décrivait seulement la position du prix au-dessus des MA200. `directionalStack` est renommé `priceVsMa200Stack` avec sémantique `POSITION_ONLY_NOT_DIRECTIONAL_BIAS`.
- Aucun changement de seuil ou logique de trading lié au top-down; correction de contrat/représentation uniquement.
- Lecture MCB actuelle: 4h reste en reflux depuis son sommet LBW (88.60 le 21/09 20:00Z → 83.58 → 76.07 → 71.60 → 65.73 live 22/09 16:00Z), malgré prix au-dessus MA200. Daily reste élevé/positif. Donc `5/5 ABOVE MA200` n'implique pas `top-down haussier`.
- Backup: `archives/v3lab-pre-contract-cleanup-20260922T121455Z`.
- Tests: syntaxe V3/config-server; coherence-regression, ma200-shadow, divergence-lineage, mw-hourly, V2 core-contract et simulator-v02, tous validés.
- Activation hors position V3: restart uniquement `cerveau-central` et `config-server`; `moteur-boono` non redémarré.
- Vérification live post-restart: aucun `invalidationPrice` dans `risk`; protection séparée; `priceVsMa200Stack.semantic=POSITION_ONLY_NOT_DIRECTIONAL_BIAS`.
## V3-LAB — rétablissement flux stockage rotatif — 23/09/2026 11:13 Paris

- [FAIT OBSERVÉ] panne V3 causée par `trade-sim-v3lab-decisions.json` = 536 854 797 octets / 8 000 objets ; `JSON.stringify` monolithique provoquait `RangeError: Invalid string length` dans `writeJson -> appendCapped -> recordDecision`.
- [FAIT OBSERVÉ] évaluations = 500 656 073 octets et shadow = 456 195 398 octets ; croissance future également non bornée.
- [DONNÉES INSUFFISANTES] décisions/état à partir de 06:36:34Z ; évaluations/shadow après 06:38:08.330Z ; reprise causale intégrale à 09:13:37.951Z. Aucun backfill.
- [CHANGEMENT AUTORISÉ] décisions migrées vers `trade-sim-v3lab-decisions.ndjson`; décisions/évaluations/shadow utilisent NDJSON append-only rotatif 32 MiB.
- Plafonds : décisions 8 segments + actif ; évaluations/shadow 16 segments + actif. Rotation par rename atomique ; append + fsync.
- `trade-sim-v3lab-state.json` utilise désormais temporaire + rename atomique.
- Lecteurs adaptés : `/api/trades` via `readRecentNdjson`; MW via `readNdjsonSince`, sans chargement des archives géantes.
- Archives originales intactes : `archives/v3lab-storage-archive-20260923T091118Z/`; backup code/état : `archives/v3lab-pre-storage-repair-20260923T090753Z`.
- Position legacy SHORT préexistante conservée ; `moteur-boono` non redémarré et compteur PM2 resté à 0. Aucun trade V3 créé par le restart.
- Validation 10,79 min : 22 évaluations, 22 shadows, 15 décisions, 0 ligne JSON invalide, timestamps monotones, 0 doublon ; PM2 0 restart/0 unstable ; aucun nouveau RangeError.
- MW post-reprise relit correctement STATE/SEQUENCE/DOMINANCE/ELIGIBILITY sur la nouvelle fenêtre.
- Tests : rotating-ndjson, V3 coherence, MA200, divergence-lineage, MW, V2 core-contract, V2 simulator-v02 tous OK/exit 0.
- [DÉCISION MÉTHODOLOGIQUE] aucune logique de trading modifiée. Rapport : `knowledge/v3-storage-recovery-2026-09-23.md`.

## BOONO 24h Deep Review — persistance thèse E15 / retracement descriptif — 23/09/2026

- [FAIT OBSERVÉ] Fenêtre prévue 22/09 09:00Z→23/09 09:00Z ; V3 auditable jusqu'à 06:38:08Z puis [DONNÉES INSUFFISANTES] jusqu'à la reprise 09:13:37Z.
- [FAIT OBSERVÉ] 2 585 évaluations, 1 seul trade V3 : SHORT 86 447,2→86 235,6, +2,4477% levier, MFE 227,2$, MAE 22,5$, capture ~93,1% ; entrée STRUCTURAL_REASSERTION, sortie sur nouvel E15→E15 opposé confirmé.
- [ARTEFACT LOGIQUE] 6 legs E15 confirmés ont produit 30 changements de statut structurel, dont 28 sans nouveau leg ; ~260,3 minutes en FALSIFIED_PRICE_LEG/THESIS_FALSIFIED_WAIT par simple retracement/reclaim prix.
- [DÉMONTRÉ] Les MW horaires avaient observé indépendamment les mêmes auto-réactivations SHORT puis LONG sans nouveau E15.
- [DÉCISION MÉTHODOLOGIQUE] Correction unique : le dernier leg E15→E15 confirmé reste ACTIVE ; un retracement complet devient fullyRetraced / priceRetracementStatus=FULLY_RETRACED, purement descriptif. La thèse ne change qu'avec un nouveau leg E15→E15 opposé confirmé.
- ACTION ne sort plus sur simple full retracement ; EXIT_STRUCTURE reste déclenché par un nouveau leg E15 opposé actif.
- RISK ne produit plus THESIS_FALSIFIED_WAIT à partir d'un retracement prix. Tous les gates WHERE/turning/3m/dominance/R:R/protection/régime restent inchangés.
- Garde de données : wave.js rejette désormais null/undefined/chaîne vide avant conversion numérique ; corrige le minPrice=0 transitoire post-reprise causé par Number(null)=0.
- Backup : archives/v3lab-pre-deep-review-structural-persistence-20260923T113344Z.
- Tests : syntaxe wave/risk/action ; V3 coherence, MA200, divergence-lineage, MW, rotating-NDJSON ; V2 core-contract/simulator-v02, tous OK/exit 0.
- Activation hors position V3 : restart uniquement cerveau-central ; moteur-boono non redémarré ; position legacy conservée.
- Contrôle live : 6 premières évaluations post-activation, 0 statut falsifié, 0 minPrice=0 ; dernier leg LONG ACTIVE avec fullyRetraced=true ; STRUCTURAL_REASSERTION refusé actuellement par dominance SHORT / absence turning LONG frais, aucun trade créé.
- Rapport : knowledge/deep-review-24h-2026-09-23.md.


## Infrastructure MW — pont snapshot Remote Desktop — 24/09/2026

- [FAIT OBSERVÉ] accès opérationnel au VPS prouvé via le connecteur Remote Desktop Commander, device `BOONOTRADE-VPS`; aucune dépendance à SSH/IP pour ce canal.
- [CHANGEMENT AUTORISÉ] création de `modules/v3lab/monitoring/generate-live-snapshot.js` et `read-live-snapshot.js`.
- Snapshot canonique : `data/BOONO-live-snapshot.json`, schéma `boono-live-snapshot-v2.0`, fenêtre 120 min, plafond 5 MiB, un actif + un previous maximum.
- Sources exclusivement NDJSON rotatifs actifs/segments récents ; anciennes archives géantes non lues ; aucun tick brut.
- Écriture atomique tmp+fsync+rename, validation JSON et SHA-256, relecture après publication.
- Tests répétés : ~2,93 Mo, 240 évaluations + 240 shadows + ~130 décisions, 0 ligne invalide, 0 doublon, 0 régression, continuité eval/shadow vraie ; 2 fichiers snapshot exactement après deux générations.
- Aucun token sensible/obsolète détecté dans le snapshot : pas de mot de passe/session/private key, pas de FALSIFIED_PRICE_LEG/THESIS_FALSIFIED_WAIT/invalidationPrice.
- `priceVsMa200Stack.semantic=POSITION_ONLY_NOT_DIRECTIONAL_BIAS`; structural ACTIVE/fullyRetraced séparés conformément au contrat 23/09.
- Transport GitHub public explicitement rejeté : aucun snapshot BOONO live publié dans `Salvaison/agents-ia-zero-one` car le dépôt est public.
- Automatisation existante `BOONO Overnight MW` mise à jour sans changement d'horaire ni création d'une nouvelle automation : Remote Desktop Commander devient le transport prioritaire, snapshot généré puis lu ; si connecteur absent => [DONNÉES INSUFFISANTES], sans backfill.
- Backup : `archives/pre-mw-shared-bridge-20260923T225404Z`.
- Aucun moteur, seuil ou règle de trading modifié ; aucun processus BOONO redémarré.
- Passation : `knowledge/mw-shared-snapshot-bridge-2026-09-24.md`.

## BOONO 24h Deep Review — WHERE → turning → déplacement — 24/09/2026

- [DÉMONTRÉ] Persistance structurelle validée : après activation, 2 566 évaluations ACTIVE ; 78 `fullyRetraced=true` sans aucune ACTION opposée à la thèse.
- [DÉMONTRÉ] Le seul trade pris pendant `fullyRetraced=true` gagne +0,871 % et sort uniquement sur nouvel E15 opposé.
- Performance V3 : 3 trades, 2W/1L, −1,680 % levier, PF 0,483. La perte SHORT PHASE_CONTINUATION (−3,252 %) concentre le déficit.
- [ARTEFACT LOGIQUE / DESIGN À FALSIFIER] STRUCTURAL_REASSERTION exige CURRENT_WHERE ; PHASE_CONTINUATION accepte RECENT_WHERE sans plafond explicite de déplacement depuis l'ancre.
- Le SHORT perdant avait déjà consommé ~267,9 $ depuis WHERE, sans turning frais et avec nested3m LONG ; le SHORT gagnant utilisait une mémoire de ~1,5 min et ~7 $.
- Groupe de contrôle legacy : 5 campagnes, 4 gagnantes, +28,28 $ simulés ; comparaison économique non homogène, capacité d'action supérieure.
- [DÉCISION MÉTHODOLOGIQUE] Aucun changement aujourd'hui : relaxation CURRENT_WHERE mixte ; durcissement PHASE_CONTINUATION fondé sur seulement deux trades.
- Prochaine falsification : replay `LOCATION → REACTION → DISPLACEMENT → ACTION/EXPIRE` avec prix/temps du lieu, réaction 3m, turning15, distance consommée et MFE/MAE 15/30/60 min.
- Stockage rotatif sain : 2 852 évaluations + 2 852 shadows continus, 1 665 décisions valides, zéro ligne invalide/doublon/régression. Gap causal du 23/09 conservé sans backfill.
- Rapport : `knowledge/deep-review-24h-2026-09-24.md`.

## V3-LAB — WHERE descriptif sans veto — 24/09/2026 10:26 UTC

- Autorisation explicite de Benjamin après validation du rapport opérationnel du 24/09.
- Modification unique de la famille `ELIGIBILITY_LOCATION` : WHERE reste observé/mémorisé mais `locationReady` ne bloque plus `entryAllowed`; `STRUCTURAL_REASSERTION` n'exige plus `CURRENT_WHERE`.
- `eligibility.location.decisionImpact=false` et `reassertion.locationRequired=false` rendent le contrat visible dans l'audit.
- MCB, structure E15, turning, nested3m, dominance, régime, R:R, protection et maturité inchangés.
- Replay causal 24 h : 2 campagnes supplémentaires ; LONG MFE/MAE 15 min +116,5/0,0 USD ; SHORT +557,4/61,2 USD à 15 min et MFE +1 130,1 USD à 60 min.
- Tests : syntaxe risk/action ; V3 coherence/divergence-lineage/MA200/MW/rotating-NDJSON ; V2 core-contract/simulator, tous exit 0.
- Activation hors position : restart uniquement `cerveau-central`, online compteur 2 ; moteur legacy non redémarré.
- Bloc `where-nonveto-20260924T102601Z` : figé jusqu'à 3 trades V3 clôturés, puis revue fréquence/entrée/MFE/MAE/capture/P&L/cohérence MCB/opportunités manquées.
- Backup/rollback : `archives/v3lab-pre-where-nonveto-20260924T102300Z`.
- Rapport : `knowledge/where-nonveto-experiment-2026-09-24.md`.

## V3-LAB — WHERE non-veto + dominance 2/4 + blocs 3 trades — 24/09/2026 12:32 Paris

- [CHANGEMENT AUTORISÉ] WHERE devient strictement descriptif pour l'admission : locationReady, CURRENT_WHERE, RECENT_WHERE et équivalents restent calculés/audités mais ne peuvent plus retirer entryAllowed. Live : eligibility.location.decisionImpact=false, CONTEXT_AND_QUALITY_ONLY_NO_ENTRY_VETO.
- [FAIT OBSERVÉ] 6 h pré-activation : 720 évaluations / 720 WATCH / 0 ENTER. Refus principaux : dominance 623, WHERE courant 616, turning frais 598, 3m 432, localisation 264, régime 211, R:R 180, protection 12.
- [DÉCISION MÉTHODOLOGIQUE] Premier desserrage contrôlé : famille dominance V3 uniquement. Persistance minimale 3/4 → 2/4 ; proof >=.62 et terrain conservé restent inchangés. R:R=1, protection=.25×p50, overrun=2.5, rétention=.50 et turning=6min inchangés.
- Replay indicatif 6 h : 43 états émergents alignés promouvables ; 3 évaluations auraient satisfait toute la chaîne après retrait du veto WHERE. Pas de shadow permissif ajouté.
- Test direct : NO_VALID_LOCATION + dominance promue 2/4 + nested3m + turning frais + R:R 2.33 → entryAllowed=true → ENTER_LONG.
- Config bloc initiale : V3EXP-20260924-WHERE-NOVETO-DOM2OF4-R1, fingerprint 3dccf7e7fdd53cf003c720202ef923eaad99ee6932b6e2d955001006c6ed76be, démarrage 2026-09-24T10:32:33.801Z, compteur 0/3.
- Tracking : data/v3lab-experiment-block.json ; à 3 trades clôturés reviewDue=true ; overflow séparé ; completeReview() archive puis ouvre le bloc suivant 0/3. Automation conditionnelle BOONO 3-Trade Review active en complément du Deep Review quotidien.
- Fichiers : modules/v3lab/layers/risk.js, modules/v3lab/layers/dominance.js, modules/trade-simulator-v3lab.js, modules/v3lab/experiments/three-trade-block.js, tests associés.
- Tests : syntaxe ; V3 coherence ; dominance-v3-threshold ; three-trade-block ; MA200 ; divergence-lineage ; MW ; rotating NDJSON ; V2 core-contract ; V2 simulator-v02, tous OK/exit 0.
- Activation hors position V3/legacy : restart uniquement cerveau-central. OKX reconnecté, subscriptions trades+tickers confirmées. Les autres processus n'ont pas été redémarrés.
- 10 premières évaluations post-activation : 0 motif WHERE/localisation dans les refus ; aucune entrée artificielle ; compteur 0/3.
- Backups : archives/v3lab-pre-where-nonveto-20260924T102300Z et archives/v3lab-pre-where-open-threshold-block-20260924T102626Z.
- Rapport : knowledge/where-nonveto-dominance-block-2026-09-24.md.

## V3-LAB — Revue 3 trades #1 — 24/09 13:25 UTC
- Configuration évaluée : `V3EXP-20260924-WHERE-NOVETO-DOM2OF4-R1`.
- Bloc : 3 trades LONG `STRUCTURAL_REASSERTION`, 2 gains / 1 perte, P&L cumulé **+0,7205 % levier simulé**, MFE 274,9 $, MAE 51,4 $.
- Trade 1 : -0,3478 %, MFE 0, MAE 30,8 ; seule entrée du bloc dépendant directement de la promotion dominance 2/4. Sortie après 2,5 min sur dominance opposée + respiration > p90. Le prix développe ensuite >100 $ de MFE depuis le prix d'entrée : causalité insuffisante pour conclure que 2/4 est, seul, erroné.
- Trade 2 : +0,0862 %, MFE 152,1, MAE 20,6, capture 4,73 % ; dominance 3/4, donc indépendante du desserrage 2/4.
- Trade 3 : +0,9821 %, MFE 122,8, MAE 0, capture 66,78 % ; dominance 4/4 ; `EXIT_STRUCTURE` correct lors de la confirmation du nouveau leg E15→E15 SHORT 08:00→12:30.
- WHERE vérifié non-veto sur tout le bloc : `decisionImpact=false`, zéro refus WHERE/localisation sur 301 évaluations.
- Refus dominants : dominance 200, turning frais absent 148, 3m non aligné 138, régime hachoir/choc 73 ; RR insuffisant 0.
- Occasion manquée propre : LONG 10:38:48Z bloqué uniquement par `CHOC_COMBAT`, MFE H+15 +225 $ / MAE 0 ; même campagne que le trade 1, donc pas une preuve indépendante suffisante pour desserrer le régime.
- Décision : **aucun seuil modifié**. Maintien de `V3EXP-20260924-WHERE-NOVETO-DOM2OF4-R1` pour un deuxième bloc, afin d'obtenir davantage d'entrées réellement dépendantes du 2/4 avant de conclure.
- Rapport : `knowledge/three-trade-review-2026-09-24-1.md`.
- Snapshot pré-archivage : `archives/v3lab-three-trade-review-block1-20260924T132518Z/v3lab-experiment-block.json`.

## V3-LAB — Deep Review 24 h — 25/09/2026 11:02 Paris

- Fenêtre : 24/09 09:02:48Z → 25/09 09:02:48Z ; 2 878 évaluations, 1 577 décisions, 2 878 shadows.
- Performance : 6 trades, 4 gagnants / 2 perdants, +9,4608 % levier, profit factor 8,17.
- WHERE non-veto démontré après activation : 2 699 évaluations, `decisionImpact=false`, zéro refus WHERE/localisation.
- Contrat structurel démontré : 2 878 états ACTIVE, 793 fullyRetraced descriptifs, zéro action opposée, zéro ancien état de falsification.
- Entrées directement dépendantes du 2/4 : 2 pertes, -1,3186 % cumulé ; contre-factuels encore ambigus, aucun rollback quotidien.
- Bloc expérimental #2 à 3/3, `reviewDue=true` ; revue dédiée présente mais incomplète, `reviewedAt=null`. Aucun nouveau bloc ni changement autorisé avant finalisation atomique.
- Anomalie stockage mineure : intervalle évaluations/shadows de 63,756 s vers 06:05Z ; zéro ligne invalide, doublon ou régression.
- Décision : aucun code, seuil, processus ou architecture modifié.
- Rapport : `knowledge/deep-review-24h-2026-09-25.md`.

## V3-LAB — Revue 3 trades #2 finalisée — 25/09/2026 10:29 UTC

- Configuration : `V3EXP-20260924-WHERE-NOVETO-DOM2OF4-R1`.
- Bloc #2 : 3 trades, 2W/1L, +8,7403 % levier simulé, PF ≈10,0, MFE 1 471,6 $, MAE 140,9 $, capture agrégée ≈50,1 %.
- WHERE non-veto confirmé : 1 030/1 030 décisions avec `location.decisionImpact=false`, zéro refus de localisation.
- Verrous non exclusifs : turning frais 897, dominance 811, R:R 626, nested3m 402, régime 155.
- Décision : `NO_THRESHOLD_CHANGE`. Dominance maintenue à 2/4, proof ≥0,62, terrain conservé.
- Motif : bloc positif ; l'unique entrée 2/4 du bloc aurait atteint 3/4 ~90 s plus tard à prix quasi identique ; causalité insuffisante pour rollback ou nouveau desserrage.
- Finalisation atomique via `completeReview()` à 2026-09-25T10:29:28.223Z.
- Trade overflow SHORT 84 576,3→84 398,5 (+2,1022 %, MFE 220,4 $, MAE 33,7 $) transféré comme trade #1 du bloc #3.
- État courant : bloc #3 à 1/3, même configuration, aucun seuil/code/processus modifié.
- Rapport : `knowledge/three-trade-review-2026-09-25-2.md`.
- Backup : `archives/v3lab-three-trade-review-block2-20260925T102809Z`.

## V3-LAB — Deep Review 24 h — 26/09/2026 10:59 Paris
- Fenêtre : 25/09 08:59:25Z→26/09 08:59:25Z ; 2 880 évaluations, 1 385 décisions, 2 880 shadows ; zéro ligne invalide, doublon, régression ou rupture de cadence.
- Performance : 11 trades, 5W/6L, −2,4045 % levier, PF 0,685 ; MFE 832,9 $, MAE 843,3 $ ; onze entrées alignées à la structure.
- WHERE non-veto confirmé : 2 880/2 880 `location.decisionImpact=false`, zéro refus de localisation.
- Structure : 2 880/2 880 `ACTIVE`, 287 `fullyRetraced=true`, trois EXIT_STRUCTURE uniquement sur nouvel E15 opposé.
- Deux admissions pendant fullyRetraced : 0W/2L, −2,1524 % ; échantillon encore ambigu mais à surveiller.
- Entrées directement promues 2/4 sur la fenêtre : 0W/2L, −1,8214 %. Depuis activation : 0W/4, −3,1400 % ; trois auraient toutefois atteint 3/4 après 30–150 s à prix quasi identique, causalité non isolée.
- Bloc #3 : 3/3, −1,3238 %, `reviewDue=true`, `reviewedAt=null` ; huit overflow séparés, −1,0807 %. Revue dédiée en retard, aucun nouveau bloc ni seuil autorisé avant finalisation.
- Refus dominants : turning 2 469, dominance 2 274, nested3m 945, R:R 854, régime 520, protection 374 ; zéro veto WHERE.
- Décision : aucun code, seuil, processus ou architecture modifié. Rapport : `knowledge/deep-review-24h-2026-09-26.md`.

## V3-LAB — Revue #3 et réconciliation des blocs — 26/09/2026 10:27 UTC

- Deep Review 24 h : 11 trades, 5W/6L, −2,4045 % levier, PF 0,685, MFE 832,9 $, MAE 843,3 $.
- WHERE non-veto confirmé : 2 880/2 880 évaluations, zéro refus de localisation.
- Bloc #3 : 1W/2L, −1,3238 %, verdict `NO_THRESHOLD_CHANGE`.
- Bloc #4 réconcilié : 2W/1L, +0,7687 %, aucun changement rétrospectif.
- Bloc #5 réconcilié : 2W/1L, −0,0281 %, aucun changement rétrospectif.
- Bloc #6 : 2/3, 0W/2L, −1,8214 % ; changement interdit avant la troisième clôture.
- Dominance 2/4 : sous-ensemble directement promu à 0/4 et −3,1400 %, mais trois campagnes sur quatre atteignent 3/4 30–150 s plus tard ; rollback non causalement justifié.
- Correctif de monitoring : `completeReview()` transporte désormais automatiquement tous les `overflowTrades` vers le bloc suivant, sans les perdre.
- Test de régression mis à jour pour vérifier le report automatique des overflow.
- Tests : syntaxe, `three-trade-block.test.js` et V3 coherence regression, tous OK.
- Aucun seuil, protection, moteur ou rôle de module modifié ; aucun redémarrage requis.
- Rapports : `knowledge/three-trade-review-2026-09-26-{3,4,5}.md`.
- Backup/rollback : `archives/v3lab-review-reconcile-20260926T102655Z`.

## V3-LAB — Deep Review 24 h — 27/09/2026 11:00 Paris
- Fenêtre : 26/09 08:59:29Z→27/09 08:59:29Z ; 2 880 évaluations, 1 268 décisions, 2 879 shadows ; zéro ligne invalide, doublon ou régression.
- Performance : 7 trades, 5W/2L, -1,4267 % levier, PF 0,665 ; MFE 467,8 $, MAE 543,4 $, capture gagnants 54,0 %.
- WHERE non-veto confirmé : 2 880/2 880 decisionImpact=false, zéro refus de localisation. Les deux pertes ont consommé 0 $ depuis WHERE ; la tardiveté spatiale n'explique pas le déficit.
- Structure : 2 880/2 880 ACTIVE, quatre legs successifs, aucune entrée opposée. Quatre trades fullyRetraced : 3W/1L mais -1,1490 %.
- Cas central : structure SHORT confirmée à 84 079,9 ; full retracement à 84 359,7 ; prix 84 848 avant E15 LONG. Quatre SHORT fullyRetraced produisent un bilan négatif pendant cette remontée.
- Première perte : LONG sous MA200 15m résistante, R:R 1,035, rétention 0,509, MFE 0,1 $. Seconde : SHORT fullyRetraced avec turning mémorisé 300,8 s, R:R 2,897, MFE 27,8 $.
- Dominance 2/4 : 1 trade promu sur la fenêtre, gagnant +1,6026 % ; depuis activation 1W/4L, -1,5375 %, causalité encore ambiguë.
- Bloc #6 : 3/3, 0W/3L, -3,9159 %, reviewDue=true ; 6 overflow isolés, 5W/1L, +0,6678 %. Revue dédiée requise avant tout changement.
- Refus : turning 2 238, dominance 2 160, nested3m 1 442, R:R 732, régime 669, protection 99 ; WHERE 0.
- Décision : aucun code, seuil, processus, garde-fou ou architecture modifié. Rapport : knowledge/deep-review-24h-2026-09-27.md.

## V3-LAB — Revue et réconciliation blocs #6 à #8 — 27/09/2026 10:41 UTC

- Bloc #6 : 0W/3L, −3,9159 %, MFE 75,0 $, MAE 345,1 $, verdict `NO_THRESHOLD_CHANGE`.
- Deux pertes #6 directement promues 2/4 auraient atteint 3/4 après 30 s et 150 s avant les mêmes sorties ; rollback dominance non causalement justifié.
- Troisième perte #6 déjà à 4/4, avec R/R 1,035 et rétention 0,509 ; cas unique insuffisant pour relever R/R ou rétention.
- Bloc #7 réconcilié : 2W/1L, −0,3418 %, PF 0,842, MFE 287,0 $, MAE 300,3 $ ; l'unique admission 2/4 gagne +1,6026 %.
- Bloc #8 réconcilié : 3W/0L, +1,0096 %, MFE 180,7 $, MAE 51,7 $, capture agrégée ≈47,2 %.
- Blocs #6, #7 et #8 finalisés atomiquement ; bloc #9 ouvert à 0/3, aucun overflow.
- Aucun seuil, code de trading, processus, garde-fou ou responsabilité de module modifié.
- Tests : syntaxe three-trade-block, test unitaire du suivi et cohérence V3, tous OK.
- Rapports : `knowledge/three-trade-review-2026-09-27-{6,7,8}.md`.
- Backup/rollback : `archives/v3lab-review-reconcile-20260927T103829Z`.

## V3-LAB — E15 semantics R1 — 29/09/2026

- Validation explicite de Benjamin pour implémentation contrôlée.
- Nouvelle config : `V3EXP-20260929-E15SEM-R1`.
- Backup : `archives/v3lab-e15sem-pre-20260929T194215Z`.
- [DÉMONTRÉ] Le dernier leg E15→E15 confirmé est un leg achevé ; son opposition à la position ne provoque plus automatiquement `EXIT_STRUCTURE`.
- L'ancienne sortie est conservée en contrefactuel via `action.counterfactual.completedLegExit`.
- `wave.completedLeg` ajouté avec `decisionImpact:false`.
- Nouveau shadow `causal-events-shadow-v0.1` : netMove 1/3/5m, P90/P95/P99 5m sur 12h, mémoire MA200 3m, turning legacy séparé, inputs combat/conversion.
- Aucun changement actif de WHERE, dominance 2/4, proof .62, R:R, turning gate, régime, MFE protection ou tranches.
- Ancien bloc #9 (3 trades + 11 overflow) archivé comme `SUPERSEDED_BY_USER_VALIDATED_E15SEM_R1`; nouveau bloc 1 à 0/3, baseline history=128.
- Tests : syntaxe modifiée OK ; causal-events shadow OK ; coherence regression OK ; divergence lineage, dominance threshold, MA200, rotating NDJSON, three-trade-block OK ; V2 core/simulator OK.
- `mw-hourly-report.test.js` garde un handle ouvert et a été interrompu ; hors chemin de décision R1.
- Restart limité à `cerveau-central`, après vérification aucune position legacy/V2/V3 ouverte.
- Live : `completedLeg.decisionImpact=false`, `shadow.causalEvents` alimenté, config R1 active, aucune nouvelle erreur PM2.
- Rapport : `knowledge/e15-semantics-r1-implementation-2026-09-29.md`.

## V3-LAB — E15 semantics R1.1 MAJORLOBE — 29/09/2026

- Validation explicite de Benjamin après constat live : le lobe négatif complet n'était pas reconnu.
- Backup : `archives/v3lab-e15sem-r11-pre-20260929T203347Z`.
- Nouvelle config : `V3EXP-20260929-E15SEM-R1.1-MAJORLOBE`.
- R1 précédent avait 0 trade / 0 overflow : rollover propre avant tout échantillon.
- [ARTEFACT LOGIQUE] `confirmedPivots()` rejetait les fonds/plafonds larges si l'écart adjacent était <2.
- E15 majeur 15m = extrême LBW absolu du lobe de signe complet entre passages zéro.
- Extrema locaux conservés comme `intermediatePivots`, sans rôle structurel majeur automatique.
- Cas 29/09 : CRETE majeure +83.2248 (06:45Z), CREUX majeur -69.9213 (16:00Z), span ~153.15.
- Prix : ancre CREUX 82937.9 ; extrême prix du lobe 82850.8 à 16:45Z.
- Live corrigé : WAVE MONTEE/long, completedLeg SHORT/COMPLETED/descriptif, structural LONG/ACTIVE.
- Thèse structurelle active exige span LBW >=80, leg prix >=50 $, translation depuis dernier pivot majeur >=50 $.
- Protection LONG courante basée sur min causal 82850.8 ; premier état RISK LONG mais entrée refusée par R:R insuffisant.
- Tests V3/V2 ciblés : OK. Restart limité à `cerveau-central`. Pas de nouvelle erreur PM2.
- Rapport : `knowledge/e15-semantics-r11-majorlobe-implementation-2026-09-29.md`.

## V3-LAB — R1.2 P90 ATTACK, NOT EXIT — 30/09/2026

- Validation explicite de Benjamin après analyse de la nuit.
- Backup : `archives/v3lab-p90alert-r12-pre-20260930T090442Z`.
- Nouvelle config : `V3EXP-20260930-P90ALERT-R1.2`.
- [DÉMONTRÉ] 11/13 trades nuit précédente sortaient sur P90 ; 10/11 retrouvaient >=100 $ de MFE potentiel dans l'heure.
- Pour les nouvelles positions R1.2, `opposite dominance + respiration UNUSUAL` devient `oppositeAttackP90` ALERT_ONLY.
- P90 ne provoque plus une sortie autonome ; protection, urgence et transfert adverse + giveback restent actifs.
- Position LONG R1.1 ouverte au rollover conservée sous politique legacy jusqu'à fermeture ; pas de changement de règle mid-trade.
- Nouveau `combat-ledger-shadow-v0.1` : terrain bull/bear non chevauchant, attaques/retracements/réabsorption/nouveaux extrêmes, microstructure ticker par camp.
- R1.1 archivé : bloc 3/3 + 11 overflow. R1.2 démarre 0/3, baseline history=142.
- Tracker expérimental route désormais les clôtures d'anciennes configs hors du bloc actif.
- Tests V3/V2 ciblés + régression legacy-vs-alert : OK.
- Restart limité à `cerveau-central`, shadow live alimenté, aucune nouvelle erreur PM2.
- Rapport : `knowledge/p90-alert-r12-implementation-2026-09-30.md`.

## V4 — MCB authority / V3 shadow — 01/10/2026

- Validation Benjamin : V3 classée artefact décisionnel, conservée uniquement en shadow.
- V4 paper-trading devient moteur primaire via `modules/trade-simulator.js -> trade-simulator-v4.js`.
- Constitution : `knowledge/v4-constitution-2026-10-01.md`.
- Implémentation : `knowledge/v4-implementation-2026-10-01.md`.
- Backup : `archives/v3-demotion-to-shadow-20261001T102148Z`.
- Direction V4 : **MCB_ONLY**.
- Layers : MCB_STATE, MCB_THESIS, PRICE_TRANSLATION/PM LIVE, TICKER_CONFIRMATION, CONTEXT, RISK, ACTION.
- CONTEXT / R:R / dominance : aucun impact directionnel.
- Cap perte V4 : **500 USD absolus**.
- Nouvelle thèse MCB opposée + PM aligné + ticker confirmé => EXIT_PROFIT_PROTECTION / EXIT_MCB_FLIP.
- Tous les lobes zéro-bornés sont candidats ; plus de label "major" automatique.
- V3 position ouverte au rollover migrée en `v3ShadowPosition` sans pouvoir sur V4.
- V3 shadow journalisé dans `data/trade-sim-v3-shadow-v4.ndjson`.
- Replay causal V4-001 : LONG_FORMING reconnu au creux 83065 avec recovery 51.7%, span LBW 114.1, +146.4 USD depuis le low.
- Tests constitution V4 + syntaxe : OK. Tests V3 coherence/combat-ledger : OK.
- Activation live paper : V4 initialement UNCLEAR => NO_TRADE/OBSERVE, aucun fallback directionnel.
- UI : rapports conservent leur état ouvert et le refresh 30s est suspendu pendant la lecture du sous-onglet Rapports ; archive V3 conservée.

## V4.1 — E15 qualitatif / causalite live — 01/10/2026

- Validation Benjamin : 80 LBW = span entre deux E15 opposes de part et d'autre de zero, jamais magnitude d'un E15 individuel.
- 80 devient reference qualitative uniquement (`decisionImpact=false`), plus aucun veto d'admission.
- Reference economique 180 USD exposee qualitativement (`decisionImpact=false`) : BOONO cherche des segments capturables, pas la vague entiere.
- Lobe 15m CONFIRMED en extension peut maintenant proposer sa propre direction, meme sub-80.
- Reversal forming base sur recovery de l'extreme E15 sans exigence >=80.
- Extreme LBW live persistant entre evaluations : un extreme vu n'est plus oublie quand le bar live se retracte.
- Zero-cross live 15m ne clot plus un lobe ; seule la confirmation 15m le fait.
- PM/ticker utilisent `NO_THESIS` quand aucune direction MCB n'existe, au lieu de raconter faussement `NOT_TRANSLATING`/`UNKNOWN`.
- Version active preparee : `v4.1-e15-quality-20261001`.
- Backup pre-change : `archives/pre-v4.1-e15-quality-20261001T181500Z`.
- Tests V4 constitution + V4.1 E15 causality + V3 coherence/combat ledger : OK.

### Ajustement reference economique V4.1 — 01/10/2026
- Precision Benjamin : ~220 USD = minimum economique indicatif ; ~250 USD = reference preferee afin de laisser respirer un trade ; ~180 USD = niveau de gain conserve vise apres respiration.
- Ces valeurs restent non directionnelles et ne remplacent ni MCB, ni PM Live, ni ticker.
- Admission : aucun veto arbitraire base uniquement sur 220/250/180.

## Wave Replay diagnostic mock — 02/10/2026

- Ajout isolé du sous-onglet **Trades → Vagues**.
- Replay figé 02/10 10:45–16:30 Paris : six pertes V4 (#10–#15) puis entrée short #16.
- 690 frames audit ~30 s synchronisées avec l'évaluation V4 la plus proche.
- Deux bandes : 15m et 3m ; BW/LBW noirs, MF gris, VWAP jaune, UP vert, DN rouge.
- État vivant synchronisé + slider ±30 s + lecture automatique + marqueurs entrée/sortie.
- Aucune logique de trading/collecte/simulation modifiée.
- Anomalie documentée : archives audit journalières présentes seulement du 04/09 au 22/09 ; glissant actuel 24 h OK.
- Documentation : `knowledge/wave-replay-mock-2026-10-02.md`.

## Wave Live diagnostic — 02/10/2026 soir

- Validation visuelle de la maquette replay.
- Ajout du mode **LIVE Amsterdam** dans Trades → Vagues, sans impact trading.
- Fenêtre live : 6 h glissantes, ~30 s par relevé, rafraîchissement UI toutes les 30 s.
- Le replay historique reste disponible via le bouton REPLAY.
- Le mode LIVE utilise les mêmes séries que le replay et synchronise chaque relevé avec l'évaluation V4 la plus proche (<=45 s).
- Les entrées/sorties V4 présentes dans la fenêtre sont projetées comme repères.
- Échelle verticale rendue dynamique par bande (minimum ±50, ajustée au maximum observé) afin d'éviter l'écrasement visuel.
- Renderer toujours bar-anchored (3m/15m) + courbes de Bézier ; aucune loi de trading/collecte/simulation modifiée.
- Première confrontation live : position SHORT @86529.3 encore ouverte, campagne fortement gagnante ; MCB15 SHORT en extension tandis que le 3m tente une respiration LONG non encore confirmée par PM+ticker.

## Correction MF zero-anchor — 02/10/2026 soir

- Défaut visuel identifié sur la maquette vagues : le polygone de remplissage MF créait une fermeture diagonale entre la fin et le début de la courbe.
- Cause : le helper de courbe Bézier ouvrait un nouveau sous-chemin pendant le remplissage MF, ce qui faisait perdre l'ancrage explicite à zéro.
- Correction : le tracé MF réutilise désormais le sous-chemin existant et ferme strictement la zone sur la baseline 0 aux deux extrémités.
- Correction appliquée aux bandes 15m et 3m.
- Aucun impact sur les données, le moteur, les seuils ou les décisions.

## V4.2 — neutralité / maturité / sizing réel — 03/10/2026

- Version active : `v4.2-neutral-maturity-20261003`.
- Churning traité par une étape `TRANSITION_NEUTRAL` avant `LONG_FORMING/SHORT_FORMING`.
- Promotion sans timer : `net3m` aligné + structure MCB 3m cohérente.
- PM : `TRANSLATING` exige désormais net3m aligné ; sinon `BURST_ALIGNED`.
- Contre-factuel ciblé : #7 et #16 passent ; #25–#28 restent neutres au contexte d'entrée enregistré.
- Sizing repris du vieux BOONO : capital 1000$, marge 150$, notionnel 1500$, x10 ; risque ~8–9$ pour 500$ de déplacement BTC autour des prix actuels.
- V4 stocke et affiche désormais PNL USD, MFE/MAE équivalent USD, cumul et equity.
- Vagues : bandes trades bleu ciel 50%, tooltip entrée/sortie, MA200/distance/tests/retests au-dessus des 15m/3m.
- MA200 reste diagnostic-only.
- Backup pré-changement : `archives/pre-v4.2-neutral-maturity-20261003T072342Z`.
- Documentation : `knowledge/v4.2-neutral-maturity-2026-10-03.md`.

## Correction rendu signaux MCB UP/DN — 03/10/2026

- Défaut confirmé : le renderer regroupait les données par bougie puis ne conservait qu'un UP et un DN par bucket, ce qui pouvait perdre/recomposer l'ordre réel des signaux rapprochés.
- Les points sont désormais dessinés depuis le flux natif MCB `wt1_cross_up / wt1_cross_dn` en ordre chronologique, indépendamment des ancres de courbe BW/LBW.
- Les signaux confirmés sont affichés pleins ; le signal de la bougie live courante peut être affiché plus léger comme provisoire.
- La succession rouge → vert → rouge → vert est donc conservée exactement quand elle existe dans les données MCB.
- Fallback sur l'ancien rendu seulement pour un snapshot ne contenant pas encore `signalEvents`.
- Aucun impact trading.

## V4.3 — setup causal / background MCB / limites structurelles — 04/10/2026

- Version active : `v4.3-setup-context-20261004`.
- Churning V4.2 confirmé : exposition ~95.8% sur la séquence #39→#50 ; 15 flips de direction sur 16 transitions V4.2 observées.
- MCB 1H devient le background central/actionnable ; 4H/D restent shadow uniquement.
- Une candidate `AGAINST_BACKGROUND` exige `MATURE_REVERSING` 15m + `REVERSAL_FORMING` + 3m `TURN_ALIGNED`.
- Nouveau `structural-room` : MA200/niveaux/trendlines ne choisissent pas la direction ; un `BOUNDARY_CONTEST` devant la candidate suspend le setup.
- Nouveau lifecycle : `OBSERVE → SETUP → preuve post-setup → ENTER → CONSUMED`.
- MCB persiste à travers les sorties. Seules les preuves PM/ticker d'admission sont remises à zéro à `setupTs`.
- Le même `setupKey` consommé ne peut pas être repris avant changement de la thèse MCB/setup ; une thèse MCB différente peut armer un nouveau setup sans exiger que tout MCB soit postérieur à la sortie.
- PM/ticker d'entrée utilisent désormais uniquement la preuve postérieure au setup ; les données plus anciennes restent baseline de calibration seulement.
- `DORMANT` peut suspendre un setup ; `CHOP_SHADOW` reste observation-only.
- Vues V4/Vagues enrichies : background 1H, macro shadow, setup, structure/room, market quality, preuve post-setup.
- Provenance corrigée : une position héritée garde sa version d'entrée ; `exitEngineVersion` trace la version qui la clôture.
- Tests V4/V3 : OK.
- Backup : `archives/pre-v4.3-setup-architecture-20261004T083057Z`.
- Documentation : `knowledge/v4.3-setup-context-2026-10-04.md`.

## V4.4 — signal natif renforcé / low-edge / matérialité — 05/10/2026

- Version : `v4.4-native-signal-quality-20261005`.
- `UP_REINFORCED` = UP MCB natif confirmé <= -60 ; asymétrique, aucun DN renforcé synthétique.
- `UP_REINFORCED` peut créer une candidate LONG et bypasser le background 1H pour l'admission, mais pas la cohérence 3m ni la structure.
- Voie accélérée LONG renforcée : net post-setup >= +50 USD et efficacité >=12 % ; ticker/1H peuvent alors être bypassés.
- LOW_EDGE = eff60 <=12 % + flips >=35/h. En LOW_EDGE, une structure sub-80 reste OBSERVE sauf UP_REINFORCED.
- PM post-setup : TRANSLATING exige désormais |net|>=10 USD et efficacité>=25 %. Sinon COMBAT_ALIGNED / OPPOSITE_COMBAT.
- Mémoire du turn 3m : un lobe aligné commencé après l'extrême 15m compte comme transition déjà accomplie.
- Sortie : UP_REINFORCED après entrée SHORT → EXIT_NATIVE_STRONG_SIGNAL ; UP/DN standard peut protéger si 3m + net3m confirment l'opposition.
- Contre-factuel : #57/#58/#59 rejetés par LOW_EDGE+sub80 ; #60 devient COMBAT_ALIGNED ; #61/#62 passent.
- Replay signal renforcé du 05/10 : entrée LONG théorique ~07:34 Paris @ ~85 562 au lieu du refus prolongé contre 1H.
- Backup : `archives/pre-v4.4-native-signal-quality-20261005T074147Z`.
- Documentation : `knowledge/v4.4-native-signal-quality-2026-10-05.md`.


## V4.5 — PM/efficiency suffit à l'entrée, ticker qualifiant, timing 3m — 05/10/2026

- Version : `v4.5-entry-timing-20261005`.
- Entrée : un setup MCB valide + cohérence 3m + PM post-setup `TRANSLATING` avec matérialité V4.4 (|net|>=10 USD, efficiency>=25%) peut désormais entrer sans ticker confirmé.
- Le ticker reste journalisé comme qualificateur de conviction ; `entryTickerDecisionImpact=false`.
- Nouveau `UP_REINFORCED_3M` : UP natif confirmé 3m <= -60, actif jusqu'au prochain DN 3m, sans timer ni distance prix.
- Pour un SHORT flat : `UP_REINFORCED_3M_CLOSES_SHORT_ENTRY_WINDOW` / `noNewShort=true`.
- Pour un SHORT ouvert : `HOLD / RESPIRATION_ALERT`, jamais sortie autonome.
- Le `UP_REINFORCED` 15m stratégique reste distinct et inchangé.
- Shadow setup timing : `SETUP_OPEN -> SETUP_LATE -> SETUP_EXPIRED`, sans impact décisionnel ; observation prévue sur 5–10 cas avant éventuel veto sur LATE.
- Aucun seuil arbitraire 250/325 USD de mouvement consommé ajouté.
- Contre-factuel trade système #63 : V4.5 aurait autorisé SHORT à 11:02:31 Paris @ 86154 avec ticker NOT_CONFIRMED, contre entrée réelle V4.4 à 11:16:31 @ 85825.6 ; écart d'entrée 328.4 USD BTC.
- Tests V4.1→V4.5, constitution V4 et régressions V3lab : OK.
- Backup : `archives/pre-v4.5-entry-timing-20261005T105246Z`.
- Documentation : `knowledge/v4.5-entry-timing-2026-10-05.md`.

## Divergence causal shadow v0.2 — 05/10/2026

Refonte du catalogue de divergences en shadow (`decisionImpact=false`). Le modèle abandonne les comparaisons combinatoires de toutes les ancres. 3m/15m utilisent des signaux live persistants; 1h/4h utilisent des pivots causaux prix/LBW; Daily utilise les signaux natifs CSV; Weekly retourne `INSUFFICIENT_HISTORY` tant que mars–juillet 2026 manque sur Amsterdam.

Jeu de référence reproduit : 15m bearish 04/10 23:30→05/10 03:45; 15m bullish forming 05/10 07:15→courant; 15m bullish continuation 03/10 23:00→courant; 3m bullish 05/10 11:18/11:21→17:45; 1h bullish continuation 02/10 15:00→04/10 13:00→05/10 02:00; 1h bullish forming 03/10 01:00→courant; 4h aucune; Daily bearish multidiv 25/08→24/09→courant. Référence Weekly bullish 02/03→13/07 conservée mais non calculable faute de données historiques.

## Structural handoff shadow v0.1 — 05/10/2026

Ajout d'un shadow multi-TF sans impact décisionnel : 1h contexte structurel E15→E15, 15m thèse, 3m timing. Le contexte structurel peut survivre à une sortie, mais PM/ticker/efficiency sont obligatoirement remis à zéro. `proofStartTs=max(handoffTs,lastExitTs)`.

Replay #64→#65 : handoff SHORT à 16:30:28 (~86 150,1), sortie LONG réelle 16:30:58, première PM short entièrement fraîche valide 16:31:28 (~85 980,9), contre #65 réel à 16:53:28. Aucun changement aux décisions V4.5.

## V4.6 Structural trajectory — 05/10/2026

Version active candidate : `v4.6-structural-trajectory-20261005`.

Contrat MCB généralisé sur 3m/15m/1h/4h/1d/1w : `lobeSign` décrit la position de la vague, `structuralDirection` décrit le trajet causal E→E persistant. Le 1h utilise désormais la direction structurelle comme contexte primaire; le 15m peut proposer une candidate structurelle sans entrer seul; le 3m utilise d'abord la trajectoire E3→E3 pour sa cohérence. 4h/D/W restent shadow.

Replay #64→#65 : handoff SHORT à 16:30:28, sortie #64 16:30:58, reset microstructure, nouvelle PM short valide 16:31:28; #65 réel 16:53:28. Aucun recyclage PM/ticker/efficiency pré-sortie.

## Divergence causal shadow v0.4 — 06/10/2026

Correction ciblée 15m, sans impact décisionnel. Les bullish 15m n'utilisent plus les longues ancres historiques de `priceSwingPivots`. Nouveau flux E15 causal non fusionné (confirmation sur 2 bougies) + sélection locale.

Catalogue validé après correction :
- bullish continuation / hidden : 04/10 16:30 (prix 85 089,9 ; LBW -27,389) -> 05/10 07:00 (85 450 ; -74,574), pointillée ;
- bullish régulière : 05/10 07:00 (85 450 ; -74,574) -> 05/10 18:15 (84 937,5 ; -52,538), pleine.

Une continuation 15m affichée doit rester dans les 4 derniers creux E15 causaux et présenter >=20 points de divergence LBW. Les anciennes continuations longues 03/10->06/10 sont supprimées. V4.6 / cerveau-central inchangés ; seul config-server a été rechargé.

## V4.7 — contexte/campagne/exécution — 08/10/2026

Validation utilisateur après audit #68→#80.

- 1h démoté de veto à qualificatif ; suppression de `AGAINST_BACKGROUND_NEEDS_MATURE_15M_AND_3M_TRANSITION_MEMORY`.
- mémoire de campagne 15m après trade perdant ; un nouveau cycle 3m seul ne réarme plus la campagne.
- entrée normale exige continuité rolling 3m ; en CHOP/LOW_EDGE : 3m+5m alignés et efficacité3m >=37,5 %, sauf UP_REINFORCED.
- nouveau `EXIT_EXECUTION_FAILURE` : faible MFE + PM adverse persistante + microstructure adverse.
- nouveau `EXIT_MFE_PROTECTION` : MFE >=440, giveback >=180 + PM/micro adverses.
- Range VAH/POC/VAL expose maintenant un R/R normalisé, informatif uniquement.
- replay : #70/#73/#75/#76/#77 filtrés ; #78 protégé vers -85 USD prix au lieu de hard risk ; #79/#80 gain mieux protégé.

## V4.7.1 — reclaim execution failure — 08/10/2026

Correctif immédiat après #83.

#83 LONG 82 510,8 sous VAL 82 918 était `LONG_RECLAIM_REQUIRED`. Il avait déjà MFE +100,1 USD, donc la règle V4.7 standard `MFE <=55` désactivait `EXIT_EXECUTION_FAILURE`, malgré PM/microstructure clairement adverses.

V4.7.1 rend le seuil adaptatif au range :
- exécution ordinaire : MFE <=55 USD ;
- tentative de reclaim du range (LONG sous VAL / SHORT au-dessus de VAH) : MFE <=220 USD, soit tant qu'aucun mouvement économique minimum n'a été produit.

Toujours requis : position adverse + PM adverse productive + microstructure adverse productive. Aucune invalidation MCB supplémentaire.

Replay #83 : sortie `EXIT_EXECUTION_FAILURE` à 15:27:02 ~82 412,3, soit ~-98,5 USD prix, contre sortie réelle hard risk à 81 956 / -554,8 USD prix.

## V4.8 — 4h capitulation guard — 08/10/2026

Validation utilisateur après séquence #83/#84/#85.

- collecte 4h UP/DN promue : signal sub-60 exploitable seulement après clôture causale de la bougie 4h ;
- régime `DEEP_4H_WAIT_UP_SUB60` : bloque uniquement les nouveaux LONGs de retournement quand le lobe 4h a atteint <=-60 et reste structurellement SHORT ;
- `UP4H_SUB60` arme la recherche, puis une preuve 15m nouvelle postérieure à l'armement est obligatoire avant que 3m + PM puissent exécuter ;
- un même armement 4h ne finance pas plusieurs campagnes après un échec ;
- `EXIT_STRUCTURAL_PIVOT_BREACH` : prix + LBW15 cassent ensemble le creux E15 qui soutenait le LONG pendant deep-4h ;
- hard risk 500 utilise désormais aussi la MAE observée, pas seulement la perte au tick décisionnel ;
- migration automatique des headers CSV multi-TF legacy vers le schéma 15 colonnes incluant MA200 + wt1_cross_up/down.

L'état actuel en flat est bien bloqué LONG par `DEEP_4H_WAIT_UP_SUB60`; la position ouverte préexistante n'est pas fermée rétroactivement par le nouveau filtre d'admission.

## 2026-10-09 — MF Structure Shadow v0.1
- Ajout de modules/v4/experiments/mf-structure-shadow.js.
- 15m uniquement, decisionImpact=false.
- Pivots MF causaux confirmés après 2 clôtures ; structure HH/HL/LH/LL → ADVANCING_UP / ADVANCING_DOWN / COMPRESSION / EXPANDING.
- Relation au candidat MCB exposée comme contexte de maturité, jamais comme veto ni source directionnelle.
- Motivation : observations historiques du 11/09 et 21/09 + série #88–#92 du 09/10.

## 2026-10-09 — V4.9 Stress TP / Runner
- Version moteur : `v4.9-stress-tp-runner-20261009`.
- TP fixe rejeté après mesure sur 92 trades : les prises mécaniques 25% à MFE 120–440 dégradent le PNL historique.
- Nouvelle loi : sur gros MFE (>=440) + giveback >=180 + PM/micro adverses, si MCB + MF15 restent alignés et giveback <360, `TAKE_PROFIT_PARTIAL` ferme 25% et conserve 75% runner.
- Après TP1, le runner reçoit une respiration MFE supplémentaire jusqu'à 360 USD de giveback tant que MCB+MF restent alignés.
- #82 reste une sortie complète (giveback ~531) ; #86 devient le cas de référence TP1 partiel (giveback ~185, MF15 ADVANCING_UP).
- Comptabilité simulateur étendue : PNL réalisé + PNL runner, notionnel/marge initial/restant, événements TP dans les rapports.
- Aucun changement d'admission ou de direction.

## 2026-10-09 — V4.9.1 Fee-aware accounting
- Version moteur : `v4.9.1-fee-aware-20261009`.
- Ajout d'un modèle de frais configurable sous `tradeSimulator.fees`.
- Hypothèse active : OKX Europe X-Perps, maker 0,02%, taker 0,05%; V4 market => taker entrée/sorties.
- Frais calculés sur le notionnel quote réellement exécuté à chaque ouverture, TP partiel et sortie finale.
- `pnlUsd` devient le PNL net de frais pour les nouveaux trades; brut + détail des frais restent audités.
- Position ouverte : PNL net si clôture maintenant = brut courant - frais payés - frais de clôture estimés.
- Historique #1-#92 conservé brut; estimation rétroactive séparée : +37,39$ brut, ~138,01$ frais, ~-100,62$ net.
- Funding, slippage et spread restent explicitement non modélisés.

## 2026-10-09 — V4.9.2 TP1/TP2 multi-fraction shadow
- Version moteur : `v4.9.2-tp-shadow-20261009`.
- Ajout de `tp-multifraction-shadow-v0.1`, strictement `decisionImpact=false`.
- TP1 testés : 10/20/25/33% de la position initiale.
- TP2 testés : 0/10/20/25/33% du runner restant.
- TP2 exige un nouveau MFE causal post-TP1 avant un deuxième stress adverse productif ; aucun seuil fixe de reprise n'est ajouté.
- 20 couples TP + référence HOLD_100 + référence sortie 100% au premier stress.
- Comptabilité fee-aware par trajectoire ; classement en PNL net, delta/mutilation/bénéfice vs HOLD.
- Évaluations compactes ; résultat complet écrit une seule fois à la clôture dans `data/trade-sim-v4-tp-shadow.ndjson`.
- Interface V4 expose état du shadow et classement final.

## 2026-10-09 — Divergence causal shadow v0.5
- Correction d'une divergence baissière 15m manquante observée visuellement le 09/10.
- Bearish regular 15m bascule du modèle de signal persistant vers le même flux E15 local causal que le bullish.
- Cas régression : 82482,4 / LBW 83,608694 → 83310,9 / LBW 64,855796.
- Sélection par extrémité causale la plus récente ; pour une ancre, extension au plus haut prix qualifiant.
- Hidden/continuation bearish inchangées ; `decisionImpact=false`.

## 2026-10-09 — Divergence causal shadow v0.7
- Les divergences 15m affichées comme relations actuelles utilisent désormais la dernière ancre E15 structurelle active (`structuralTrajectory`).
- Les anciennes ancres bullish mathématiquement compatibles mais structurellement périmées ne sont plus réutilisées.
- Les hidden/continuation bullish historiques consommées ne restent plus affichées comme relations live.
- Cas 09/10 : aucune div UP active ; div DOWN 82482,4 / LBW 83,608694 → 83310,9 / LBW 64,855796 conservée.
- `decisionImpact=false`.

## 2026-10-09 — Wave UI fixed Y-axis overlay
- Les échelles verticales gauche des bandes 15m et 3m restent fixes au-dessus du défilement horizontal.
- Overlay limité aux 36 px de marge déjà réservés à l'axe : aucune perte de zone utile pour les courbes.
- Les graduations reprennent dynamiquement le même `yLimit` que chaque canvas ; aucun impact trading.

## 2026-10-10 — MF temporal memory v0.1
- `mf-structure-shadow` devient `mf-structure-shadow-v0.2-temporal`.
- MF15 n'est plus lu comme une valeur instantanée seulement : mémoire 30m/1h/2h/4h, persistance, efficacité de chemin et conversion prix.
- Nouveaux états : RISING_WITH_PULLBACK, FALLING_WITH_RECOVERY, RISING/FALLING_AND_TRANSLATING, etc.
- Relation au candidat : ex. `TACTICAL_SHORT_AGAINST_LONG_MF_MEMORY` pour une attaque short locale dans une mémoire MF haussière.
- Cas de référence #98 : mémoire LONG 4h + tactique SHORT 30m.
- Wave live et rapports exposent désormais `MF MÉMOIRE`.
- `decisionImpact=false` : compréhension/shadow uniquement, aucun veto ni autorité de trading.
