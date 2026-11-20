# BOONOLAB — V553 : moteur causal Live, passation contrôlée V552, Watch et BOONO-TV

**20 novembre 2026 — version mise en service : `v5.5.3-live-causal-price-market-paper-v1`**  
**Statut : DOCUMENTÉ / IMPLÉMENTÉ / TESTÉ / MIS EN SERVICE (PAPER uniquement).**  
**Aucune exécution financée. Pas de second V552 tournant en parallèle. La rentabilité de V553 n'est pas démontrée.**

## Mandat utilisateur

« Bon est bien réalise le moteur 553 pour remplaçer 552 ».

La passation est fondée sur le contrat approuvé lors des discussions du 20 novembre : chaque nouvelle opportunité doit établir sa propre **chaîne causale** ; **LBW15 pente Live → Cross15 Live** sont les deux jalons centraux, à interpréter économiquement grâce au prix et à PM Live avant que Cross15 15m soit forcément confirmé. Les campagnes ne doivent pas être retournées automatiquement après une sortie. La qualité du **marché** régule les nouvelles admissions, mais ne liquide pas d'office une position. E15 natif confirmé reste **contexte structurel** réutilisable, non permission d'entrée ou obligation d'attendre un nouvel E15. Aucun floor 120/90, aucun gain préalable ou deuxième reconquête obligatoire pour sortir.

## 1. Architecture autonome

Modules nouveaux exclusivement situés sous `zero-one/modules/v553/` :

- `source.js` : lecteur autonome horodaté de MCB 3m/15m/1h/4h, audit Bâton Live, et prix OKX public ; aucun import de politique V552/V551/V543.
- `decision.js` : `originalMemory` v553 avec origine E15 native confirmée, états de **chaîne actuelle**, **menace pour position ouverte**, dernière sortie, trace chronologique, plus un état de marché. Mémoires de `Cross3` historiques non utilisables comme permission ; pas de `mem.episode` hérité de V552. Une position ouverte est évaluée séparément d'une nouvelle admission. Quand FLAT, une nouvelle initiative as-of après `lastExit` ouvre une nouvelle candidature, sans exiger un nouvel E15, un délai arbitraire, ni un Cross3 obligatoire.
- `market.js` : qualification d'exploitabilité *relative* et as-of sur les quatre heures antérieures et les derniers quinze minutes/heure de Bâton : changements Live MCB3/15, effort BTC/min, part de prix conservée, efficacité prix/chemin, pentes relatives, rôle du lieu dans un range de bougies 15m clôturées. États `UNRECOGNIZED`, `SUSPEND_NEW`, `OPEN_OBSERVING`, `EMERGING_DIRECTION`. Une suspension persiste au-delà d'un simple relevé favorable : rouvre si l'offensive *réellement* productive apparaît, même lorsque l'ancien régime horaire reste contradictoire. Cette autorité ne demande jamais une sortie de position.
- `paper.js` : ledger PAPER propre `v5.5.3-paper-ledger-v1`, frais taker simulés 0,05 % par côté, notionnel 1 500 $, plafond adverse 500 $ de prix BTC ; nouvelle entrée uniquement à partir d'un ID causal V553 né après sortie, que l'on consomme une seule fois. Une sortie peut arriver sur Cross15 Live productif et persistant même quand la position est déjà perdante ; `PAPER` garde l'autorité finale du hard risk.
- `runner.js` : **un seul PM2** `boono-v553-paper`, sous flux OKX public, mémoire et fichiers `data/v553-paper-{state,summary,trades,decisions}` indépendants. Un mode `--test-read` n'écrit rien.

Contrat de sortie `exitReview` : la pente LBW15 Live déclenche observation de la menace ; un Cross15 Live opposé ayant persistance, écart de vagues qui continue de s'ouvrir, MCB3/PM/Δ3m et prix adverse réellement retenu peut demander `EXIT_POSITION` avant confirmation 15m, **sans** condition de P&L positif ni obligation d'une seconde reconquête après respiration. Un faux Live sans prix conservé ne liquide pas à lui seul. Le parent E15 est le dernier signal natif connu, avec `priceProxy` de l'extrême de sa bougie 15m **présenté explicitement comme proxy, pas extrême exact du prix à l'instant de signal**.

Le marché n'ajoute pas un veto rigide sur `DENSE_CONTRADICTOIRE` ni un seuil « attendre 15/18/25 minutes ». MF reste aujourd'hui contextualisé ; sa future autorité d'arbitre secondaire strictement sous incertitude MCB/prix n'est pas présentée comme un algorithme validé.

## 2. Tests des cas historiques, as-of

Source `scripts/boonolab-v553-replay-asof.js` : archives Bâton 14 jours (dossiers horaires .ndjson.gz plus relevés roulants), MCB confirmé as-of, **sans importer les futurs cours** ; relecture de sorties en conditions simulées. Elle mesure un prix d'observation Bâton hypothétique, **pas un fill exécuté garanti** ni un portefeuille complet avec réentrées.

- V552 #21 LONG, sortie réelle hard risk **−13,8925 $ nets** le 20/11 02h53 ; V553 en relecture reconnaît Cross15 Live adverse à **02h41m45s** et sortie structurelle à **02h43m15s** ; valeur si exécutée à ce prix observé **environ −4,0751 $**.
- V552 #22 SHORT, sortie réelle hard risk **−14,1410 $ nets** 03h56 ; relecture Cross15 Live contraire **03h52m45s**, sortie V553 **03h53m15s**, valeur hypothétique **environ −8,3984 $**.
- **Contre-exemples** V552 #20 LONG et #24 SHORT : V553 ne demande **pas** une sortie prématurée au premier faux Live ; les résultats réels conservés de l'ancien moteur étaient +1,7527 $ et +0,9894 $.
- **19 novembre 15h53m44s**, malgré un marché contradictoire, la chaîne as-of ouverte à 15h52m44s donnerait une entrée SHORT à prix Bâton 63 800,1 $ sous `EMERGING_DIRECTION`, avant le Cross15 clôturé. Ce n'est pas un trade réellement pris.
- Les comparaisons ci-dessus ne sont **PAS** une validation de gain net futur : les bonnes entrées éventuellement refusées, la totalité des réentrées et les glissements/funding doivent être évalués prospectivement.

**Tests automatisés** : 11 tests spécifiques causalité/continuité, 7 tests nouveaux Watch/TV, et ancienne suite de non-régression V552/V551/V55/Watch/BOONO-TV adaptés pour le statut de V552 archivé. **123 tests PASS, 0 FAIL sur Amsterdam AVANT, puis APRÈS bascule**, le dernier fichier de preuve `/tmp/v553-posthandoff-all-tests-final.txt`. Une première tentative post-handoff a subi un `SyntaxError` ponctuel lors de la lecture d'un JSON Bâton roulant écrit simultanément ; le replay historique utilise désormais les archives horaires et tolère cette réécriture temporaire, puis toute la suite a repassé 123/123.

## 3. Handoff V552 → V553 sans concurrence ni perte d'historique

Source gelée : `data/v552-paper-state.json`, politique `v5.5.2-lbw15-live-vigilance-campaign-paper-v1.2`. Script `scripts/boonolab-v553-handoff.js` :

1. Préflight `--dry-read` valide le ledger et simule la migration en lecture seule.
2. **Arrêt PM2 `boono-v552-paper` AVANT** toute copie ou démarrage du nouveau runner ; vérification supplémentaire V551/V55 STOPPED. Aucune fenêtre V552+V553 simultanés.
3. Backup SHA-256 état, summary et journaux V552 dans `/root/boonolab-archives/V552_RETIRED_TO_V553_2026-11-20T14-38-27-434Z/`, manifest SHA source **`46c2e3f846c33270f187a4216dc07131e0c3a211e45ea4a4da85663acc421630`**.
4. Nouveau ledger écrit atomiquement avec **31 trades historiques**, capital et équité réalisés inchangés, frais, provenance V551/V552 (policyHistory / migrations), clés et MFE/MAE de la **position LONG héritée** ; **USD 892,6541 réalisés et USD 47,2612 de frais cumulés** à la bascule. Les nouveaux résultats V553 `newPolicyClosed/newPolicyNetUsd` partent de 0, sans réinitialiser le capital.
5. **Démarrage uniquement après STOP confirmé** : `boono-v553-paper` ONLINE, `boono-v552-paper` STOPPED, `boono-v543-paper` ONLINE et indépendant, `pm2 save --force` exécuté.

**Événement post-migration à NE PAS masquer** : le LONG transmis, déjà engagé sous V552, a été fermé ultérieurement **par le hard risk 500 BTC$**, pour **−13,6619 $ nets**, comme nouvelle clôture **#32** (`newPolicyClosed=1`) de V553. À la vérification **20/11 15h44 CET**, equity réalisée **878,9922 $**, position **FLAT**, marché `SUSPEND_NEW`. Il ne faut pas attribuer l'ouverture de ce LONG à la stratégie V553 et ne pas présenter sa clôture comme une protection anticipée réussie. Le P&L inclut l'ancien trade dont V553 a repris le risque.

## 4. Watch et BOONO-TV

**Amsterdam Watch :**
- Route privée `GET /api/v553-paper` contrôlant versions exactes, mode PAPER, équivalence ledger/summary, indépendance des comptes, âge source, `302 /login` sans authentification.
- État Vivant V553 prioritaire avec deux jalons Live et parent E15, contexte marché et état d'admission, prix/marge range, événements, P&L.
- `V543` conserve son grand état MCB détaillé, **source séparée**.
- V552 est **archive accessible sur demande**, pas compte actif ni ligne de position fictive.
- Vagues : **bleu V553 / rose V543**, aucun marqueur V552 actif ; rapports historiques V552/V551/V55 disponibles dans `/api/paper-history` et `/api/paper-trade-report`.

**Amsterdam BOONO-TV bridge** `boono-tv/bridge.js` : `engine553` lit le vrai ledger nouveau, ses trades, position, décisions, market et E15 ; `trades` ne comprend que V553 et V543, pas V552 (archive interne disponible séparément). Le grand État Vivant TV reste un lecteur structurel V543, explicitement étiqueté comme tel : **ne pas prétendre que toute la structure riche est calculée par V553**.

**OVH scène** : uniquement `scene/app.js`, `scene/chart-views.js`, `scene/index.html` réétiquetés/reliés V553 et V543. Backups `/home/ubuntu/boono-tv-studio/backups/V553_TV_SOURCE_20261120T143130Z/`, patch reproductible `scripts/v553-ovh-scene-display.patch`. **Composer, vidéos, postures, musique, mixer et radio non modifiés.** Checks `node --check` et vrai snapshot OVH `http://127.0.0.1:3091/api/snapshot` renvoyant `engine553=V553, status=DATA_RECENT`, capital, position, nouvelle politique et trades V553/V543 seulement ; studio/radio `active`.

## 5. Réserves expérimentales et suites

- **La rentabilité ne peut pas être affirmée.** Les bons cas replays sont de courts contrôles causaux as-of, insuffisants pour mesurer toute la distribution de performances et les rejets d'admission, les slippages et frais réels.
- Les signaux `LBW15 pente Live` et `Cross15 Live` ont maintenant une autorité de décision structurale, mais la vitesse utile en marché très nerveux doit être observée sur de nouvelles campagnes.
- Les états de marché utilisent des normes relatives de quelques heures d'audit et les prix dans le dernier range 4h de bougies MCB15 clôturées ; ce ne sont pas encore des seuils calibrés/validés dans les six régimes de marché.
- L'extrême prix lié à E15 est un **proxy d'une bougie 15m confirmée**, non un cours exact au timestamp natif.
- V553 surveille les positions existantes même si le marché suspende les nouvelles admissions ; ne pas confondre la protection et un arrêt de tout trading.
- Les comptes V543 et V553 restent indépendants ; V552 est définitivement figé. Vérifier l'absence de churn immédiat et la fréquence de chaînes causales rejetées/suspendues avant d'envisager d'autres changements.

**Réalisation technique effective et traçable : V553 remplace V552, PAPER seulement ; les propriétés et les limites sont vérifiables sur les fichiers de code, tests et archives ci-dessus.**
