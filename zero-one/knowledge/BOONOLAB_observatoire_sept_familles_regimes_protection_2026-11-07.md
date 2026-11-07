# BOONOLAB — Observatoire causal 7 familles, menace de position et 4 régimes

**7 novembre 2026 · OD-20261107-001 · Amsterdam · OBSERVATION SEULEMENT**
Demande littérale, mission exacte et origine : dossier [OD-20261107-001](operational-decisions/OD-20261107-001/03-origine-et-justification.md).

## Trois chantiers implémentés, sans décision PAPER

**A. Chronologie à sept familles événementielles.** MCB15, MCB3, FLOW (MF3/MF15), MA (états, rejets et retests), CONVERSION (PM3/PM5, qualité Elastic V494), BOUNDARY (territoire testé) et CONTEXT (régime, parent E15 et menace). L'observateur lit les sources déjà produites par les moteurs, ne recompose pas un second flux TradingView et ne vote pas LONG/SHORT. Les événements natifs E3/E15 et leurs croisements BW/LBW conservent leur timestamp d'origine, mais ne sont pas des votes indépendants. Les sept familles d'ÉVÉNEMENTS ne doivent pas être confondues avec les sept dimensions d'ÉTATS du shadow Elastic V494 déjà en service. Provenance, sourceAt et knownAt sont distincts ; aucune histoire native antérieure au démarrage n'est inventée.

**B. Menace sur une position en shadow.** Depuis l'entrée PAPER V543 : meilleur prix observé, excursion favorable, restitution depuis le meilleur prix, déplacement adverse sur 60s, débit relatif, PM/MF connus à l'heure d'observation, et hypothèse de clôture nette après frais taker. Le shadow émet WATCH / MATERIAL_COUNTERATTACK / COUNTERATTACK_WITH_AGGRESSIVE_FLOW, mais **aucun ordre EXIT**. Les alertes historiques plus anciennes et fausses alertes sont obligatoirement conservées ; la comparaison avec le P&L PAPER à clôture n'est pas une simulation de portefeuille ou des réentrées.

**C. Quatre régimes de marché.** STERILE_HESITANT, SILENCIEUX_PRODUCTIF, DENSE_CONTRADICTOIRE, DIRECTIONNEL_PRODUCTIF, avec INDETERMINE si les sources manquent. Mesures : 4 × 15m (chemin de prix, déplacement net, rendement, débit), territoire 2h et contexte 4h si disponible ; classement comparé aux trois heures précédentes. Intensité relative au flux de référence, productivité basée sur le ratio trajet net/total et sur le prix conservé. Valeurs heuristiques purement descriptives : ratio net/chemin > max(10 %, médiane historique), conservation >=50 % ; alerte de position : excursion mature >3 fois l'équivalent frais puis retour >=15 % et >= équivalent frais sur 60s. **Ce ne sont pas des seuils de trading validés ; n'ajouter aucun NO_TRADE ou EXIT automatique.** BTC/s est un débit agressif, pas une profondeur de carnet L2.

## Architecture, performance et lecture

Modules indépendants :
- modules/attention/boonolab-causal-chronicle.js
- modules/attention/boonolab-position-attention.js
- modules/attention/boonolab-regime-observer.js
- modules/attention/boonolab-market-observer-runner.js
- modules/attention/boonolab-market-history.js
- modules/attention/boonolab-observatory.html
- Intégration authentifiée dans modules/config-server.js et tests/attention/boonolab-market-observer.test.js

Processus PM2 autonome : **boono-market-regime-shadow**, appelé toutes les 10 secondes, enregistrant seulement de nouvelles observations as-of (~30s). JSON état et résumé bornés, NDJSON rotatifs des sept familles et snapshots 30s : data/boonolab-market-{events,snapshots}.ndjson et data/boonolab-market-observer-{state,summary}.json. Aucune lecture cyclique dans l'État vivant.

Accès BOONO Watch → TRADES → SHADOWS → **Ouvrir l’observatoire BOONOLAB (lecture sans rafraîchissement)**. La page séparée est protégée par la connexion habituelle, sans minuterie, WebSocket ou auto-rerender : les refresh 30s de Watch ne changent pas le défilement ni les détails ouverts. Actualisation du résumé, filtre de famille, mode événements ou snapshots, fenêtres 6/24/48h/7j/14j et pagination ancienne **seulement sur action de l'utilisateur**. Le journal est borné, pas d'archive quatorze jours garantie. Routes GET en lecture seule /boonolab-observatoire, /api/shadows/boonolab-market et /api/shadows/boonolab-market-history. Les accès anonymes 302 vers /login ; rendu visuel dans un navigateur authentifié non encore constaté.

## Replay audit #182 : précoce, mais pas infaillible

SHORT #182 entré à 75 941 $ BTC. Observation Bâton du **06/11 16h05m44s** au creux **74 939,5 $** ; une minute après, **16h06m44s** au prix **75 146,1 $** : rebond **+206,6 BTC$**, débit relatif **4,18**, environ **20,6 %** du mouvement de cours acquis rendu. Le shadow détecte **COUNTERATTACK_WITH_AGGRESSIVE_FLOW**. Valorisation hypothétique au prix réellement observé **+14,2089 $ net**, contre **+3,8891 $ net PAPER** à la clôture 16h45 (frais taker modélisés ; ni slippage ni fill garanti).

**Contre-exemple crucial :** ce détecteur déclenche **déjà plus tôt** dans la même campagne, première alerte historique vers **14h32** à 75 799,5 $ (net hypothétique +1,2963 $), puis le prix poursuit fortement sa baisse. Il serait faux de revendiquer une sortie miraculeuse uniquement à 16h06 : il faut mesurer toute la série d'alertes, les éventuels faux exits et les réentrées manquées avant promotion d'un contrat EXIT.

## Validation et mise en service

Tests spécialisés : quatre régimes relatifs, dates as-of et absence de connaissance future, réponse adverse 60s, données manquantes, premier signal de position, sept familles et non-duplication des natifs, pagination, authentification et page sans auto-timer. Régression complète V5 + Attention : **328 tests, 315 réussis, 12 ignorés, 1 échec historique MA #66** dépendant de données 26 octobre absentes du CSV live. Régression excluant uniquement ce test historique hors périmètre : **325 exécutés, 313 réussis, 12 ignorés, 0 échec**. Source backend, JS embarqué Watch et script de page compilés sans erreur.

Sauvegarde initiale des states V494/V543 et source UI : /root/boonolab-market-shadow-prelaunch-20261107/. PM2 boono-market-regime-shadow **PID 3729367**, redémarrage seulement config-server **PID 3729400** et pm2 save. V494 PAPER PID 3123676 et V543 PAPER PID 3123690 non redémarrés ; les autres shadows actifs restent inchangés. PREMIER état réel : sept familles initialisées à l'instant actuel, position SHORT V543 reconnue, régime qualitatif courant STERILE_HESITANT, 9 événements bootstrap et un snapshot, tous decisionImpact=false et brokerOrdersEnabled=false. Compteurs et ledgers PAPER initiaux inchangés lors de la vérification.

**État final :** outil d'observation installé, politique PAPER inchangée ; les premières séries prospectives et l'authentification visuelle doivent encore être évaluées. Toute promotion des alertes en véritable exit, adoption des frontières de régime dans l'admission ou modification des seuils exige une nouvelle décision distincte et des contre-tests sur de bonnes campagnes.
