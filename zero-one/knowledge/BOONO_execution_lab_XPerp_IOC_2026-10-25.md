# BOONO Systems — laboratoire d'exécution X-Perp IOC, 25 octobre 2026

## Mandat et séparation

Tester l'hypothèse selon laquelle BOONO peut exploiter sa conviction MCB15 / MCB3 / MF / MA, sa vitesse et la progression du prix pour améliorer l'exécution taker en plaçant une limite de prix de quelques dollars devant le meilleur bid/ask. L'expérience utilise **les mêmes signaux PAPER V5.3.1**. Elle ne change aucune admission, sortie ou protection de trading.

Lab autonome, PUBLIC BOOK ONLY, ZERO FUNDED ORDER. Il ne contient aucune clé API ni appel de placement d'ordre OKX ; il ne modifie jamais les ledgers historiques du simulateur.

## Instruments et flux

- Décision/conviction : OKX BTC-USDT-SWAP, comme BOONO V5.3.1.
- Simulation d'exécution : OKX BTC-USD_UM_XPERP-310404 (FUTURES X-Perp). Vérifié sur l'API publique au 25/10/2026 : ctVal=0,0001 BTC/contrat, tickSize 0,1 USD, lotSize et minSize = 1 contrat, instrument actif.
- WebSocket public OKX : wss://ws.okx.com:8443/ws/v5/public ; abonnement books5 seul, 5 meilleurs bids et asks, quantités en contrats.
- Un carnet public ne garantit aucun remplissage réel après latence ou changement de priorité de file.

## Modes A / B / C pour le même trade PAPER

**A, BASELINE** : PNL du trade original V5.3.1, entrée/sortie au prix global BTC-USDT-SWAP et frais taker modélisés. C'est une référence idéalisée, pas une preuve de fill.

**B, TAKER MARKETABLE LIMIT IOC ESTIMÉ** : à l'arrivée du signal d'entrée, prendre le meilleur carnet X-Perp disponible, calculer une marge de limite de 2 à 8 USD à partir du range 3m médian, de la vitesse et du spread, puis parcourir les cinq niveaux opposés jusqu'à la limite. Achat LONG : prix maximal ask + marge. Vente SHORT : prix minimal bid − marge. Full, Partial, No liquidity et No fresh book sont séparés. Les quantités non remplies sont annulées (simulation IOC).

**C, DÉCLENCHEMENT + IOC ESTIMÉ** : mémoriser le mid X-Perp vu par le laboratoire au signal, puis attendre un déplacement de 3 à 8 USD dans le sens de la thèse. Après déclenchement, le même simulateur IOC exécute selon le carnet public. Expiration après 60 s, annulation si position initiale close, mouvement adverse excessif ou offensive MCB15 opposée. Aucun ordre en attente chez OKX.

Les simulations de sortie B/C emploient la même chronologie de sortie que le ledger stratégique et le carnet X-Perp au moment où le laboratoire observe cette sortie.

**Comparabilité** : cumuler les PNL A/B/C sur les SEULES campagnes où B et C ont rempli intégralement les entrées et sorties. Un fill partiel est journalisé, mais n'est pas intégré au total de comparabilité triple ; en cas de carnet absent, le PNL reste INCONNU. Le nombre de manqués C est aussi important que les bonnes entrées.

## Modèle économique et limites

Notionnel de référence 1 500 USD. Conversion en contrats X-Perp par arrondi inférieur : floor(1500 / (mid × 0,0001)). Frais taker simulés 0,05 % par jambe, égaux au modèle PAPER actuel, **non confirmés comme frais du compte réel X-Perp**.

Le laboratoire ne peut reproduire la file d'attente, les rejets réels, le moteur de marge, les délais réseau échange, le prix au-delà de cinq niveaux ou l'impact de son propre ordre ; tous les fills sont ESTIMATES. La variation de basis BTC-USDT-SWAP/X-Perp peut aussi expliquer un écart de PNL.

Un book reçu depuis plus de 3 s est périmé ; un événement reçu avec plus de 5 s de retard ne peut recevoir un fill rétrospectif. Les déconnexions et trous de collecte sont traçables ; on ne les convertit jamais en succès fictifs.

## Implémentation

- modules/v5/execution-lab-model.js : sizing par contrat, limites IOC, consommation top-5, PNL théorique après frais et déclencheur prix.
- modules/v5/execution-lab-worker.js : processus indépendant PM2 boono-execution-lab, abonnement public X-Perp, lecture bornée du journal de décisions V5.3.1 ; aucun import broker ni client privé.
- Journal LAB : data/v53-execution-lab-events.ndjson, rotation 2 MB et cinq segments.
- État LAB : data/v53-execution-lab-state.json, sauvegarde atomique ; enregistre compteur, statut carnet, campagnes et comparable sums, sans modifier l'état stratégie.
- modules/config-server.js : endpoint authentifié GET /api/execution-lab en lecture seule, et panneau mobile A/B/C dans l'onglet Etat vivant.
- tests/v5/execution-lab-paper.test.js : validation des prix/quantités du carnet, limites, fills partiels, quote périmée, déclenchement, frais, absence d'autorité de trading, contrôle UI.

## Cohorte, suivi, gouvernance

Cible indicative : premières ~20 entrées observées prospectivement ; analyser disponibilité carnet, latence, prix moyen IOC vs meilleur prix, full/partial/no-fill, signaux manqués en C, coûts nets et comparabilité A/B/C. Ce n'est pas une promesse de rentabilité.

Le code V5.3.1 d'entrée/sortie, les protections −500 BTC, 120/90 et 220/180, les moteurs V4.9.3 et V4.10.10, BOONO-TV et les sources d'indicateurs sont inchangés.

Service : pm2 status boono-execution-lab ; logs via pm2 logs boono-execution-lab --lines 30 --nostream. Arrêt indépendant via pm2 stop boono-execution-lab (puis pm2 save). Aucun passage en exécution réelle n'est autorisé.
