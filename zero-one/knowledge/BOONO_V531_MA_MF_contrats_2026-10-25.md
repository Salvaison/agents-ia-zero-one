# BOONO Systems — V5.3.1 PAPER, contrats MA / MF / maturité / risque

Date : 25 octobre 2026. Concepts de marché validés par le propriétaire ; mise en oeuvre technique par IA. Aucune exécution financée.

## Constitution

MCB15 = autorité directrice de campagne. MCB3 = autorité tactique sur l'impulsion. MF3/MF15 et PM Live = qualification de cohérence et de rendement. MA3 et MA15 (MA200 sur bougies 3m/15m) partagent avec MCB **l'autorité sur la maturité et le risque**, mais ne peuvent opposer un veto sur leur seule proximité. Risque = autorité dure indépendante.

Ne pas recréer une prolifération de lignes comme Luigi/LGI. Une seule zone de confrontation active peut fusionner MA3, MA15 et les extrema de prix confirmés dans le même territoire. Les données non testées restent hypothétiques.

## Seuils vérifiés puis nouvelle approche

Le détecteur Elastic précédent emploie une tolérance de CONTACT égale à max(5 USD, 0,03% de MA) ; vers 80 000 USD cela signifie environ ±24 USD. Une vraie sortie de cette bande correspond à une clôture à au moins 2 fois cette tolérance (environ 48 USD).

V5.3.1 conserve le contact existant et ajoute une zone d'APPROCHE selon la volatilité réelle :
- MA3 : max(2 × tolérance de contact, 0,65 × range médian des bougies 3m confirmées) ;
- MA15 : max(2,5 × tolérance de contact, 0,50 × range médian des bougies 15m confirmées).
À 80 000 USD, les planchers de zone d'approche sont ~48 USD (MA3) et ~60 USD (MA15), plus si la volatilité du TF le requiert. APPROACH ≠ WAIT.

## Preuves de prix

Approche → TEST_PENDING après véritable contact / franchissement Live → ACCEPTED après conservation sur des bougies clôturées, ou REJECTED après perte. L'entrée ne peut traiter un simple franchissement Live comme une frontière déjà défendue. MA15 fournit une preuve sur horizon structurel, MA3 sur horizon tactique.

Les extrêmes de prix confirmés autour d'une MA sont stockés dans un objet de confrontation (upper/lower, heures et nombre de contacts). Une fusion des deux MA proches ne crée qu'UNE zone active. Une zone provisoire Live ne peut servir d'invalidation structurelle.

MA peut partager la décision de STOP uniquement quand un territoire a été réellement démontré et confirmé. Un stop MA accepté doit respecter la volatilité minimale et le plafond de risque. Une MA15 acceptée à l'entrée puis réellement perdue, avec MF15 et PM3/5 adverses, peut contribuer à EXIT pour une position V5.3.1. Les positions plus anciennes conservent leur politique historique.

## Money Flow

REINFORCING signifie que MF3 ET MF15 progressent dans le sens du trade. TACTICAL_LEADING signifie MF3 favorable mais MF15 neutre ; TACTICAL_VS_SLOW_ADVERSE signifie MF3 favorable mais MF15 réellement adverse ; ADVERSE signifie double opposition. Une pente MF15 négative tolérée par l'ancien seuil n'est plus déclarée comme soutien. Si MF15 adverse accompagne une impulsion E3 déjà consommée (>1,25 ranges typiques), WAIT ; une entrée vraiment précoce n'est pas bloquée automatiquement par ce seul désaccord.

## Modules

- modules/v5/ma-contract-v531.js : logique MA et zone unique à partir des bougies confirmées connues à l'as-of ; données Live non antidatées.
- modules/v5/decision-v531.js : V5.3.1 PURE qui enrichit V5.3 par l'épreuve du prix et la classification MF sans nouvelle famille de vote.
- modules/v5/runner-v52.js : source MA200 Live depuis les CSV 3m/15m déjà collectés, horodatée par la dernière écriture réelle. Moteur PAPER existant PM2, aucune collecte shadow supplémentaire.
- modules/v5/paper-v52.js : migration explicite du ledger V5.3 vers V5.3.1 en conservant positions, frais, P&L, historique, clés anti-churn, protections.
- modules/config-server.js : V5.3.1 et les états MA3/MA15, distance, approche, zone active et qualité MF dans les blocs existants.
- tests/v5/v531-ma-contract.test.js : tolérances, état test vs accepté, horodatage, zone unique, qualité MF, migrations et replays.

## Replays de calibration, non preuves de performance

#2 LONG précoce reste accepté. #5 à 08h41 LONG aurait rencontré une MA3 autour de 80 667 USD, à seulement +9 USD alors que la dernière bougie 3m confirmée était sous MA : TEST_PENDING et WAIT. #9 LONG après un SHORT, PM3 fort mais MF15 pente −0,5 et E3 déjà avancé ~2,9 ranges : WAIT pour désaccord de qualité et maturité. #10 LONG précoce avec MF15 légèrement négatif et E3 peu développé n'est pas automatiquement bloqué. #4 gagnant historique se trouvait lui aussi près d'une MA3 non acceptée ; il constitue un risque de faux veto à mesurer.

La viabilité doit être démontrée sur des opérations PAPER nouvelles, sur leur qualité économique nette et sur les occasions perdues, et non par le replay de ces mêmes exemples.

## Gouvernance

No broker orders. Hard cap déplacement prix BTC −500 USD, protections +120/90 et +220/180 inchangées. Financement et slippage non modélisés. Moteurs V4.9.3 et V4.10.10 indépendants, V5.1 PAPER reste arrêté. Pas de nettoyage des vieux shadows ni de modification BOONO-TV.

## Déploiement

À compléter avec le relevé PM2 et les tests post-migration.


### Mise en service vérifiée, 25 octobre 2026

- Migration avant le basculement : 11 clôtures, 4 gagnants, equity 983,5961 USD, P&L réalisé −16,4039 USD, frais 16,5034 USD, 11 clés anti-réentrée. Position FLAT lors de la sauvegarde.
- Sauvegarde vérifiée par SHA-256 dans /root/boono-v531-preupgrade-20261025T125447Z ; contient ledger, journaux de décisions et de trades, et versions précédentes du runner, du ledger et de config-server.
- Nouveau ledger : v5.3.1-paper-ledger-v0.4 ; décision active : v5.3.1-ma-maturity-mf-quality ; prix OKX via service PM2 déjà existant boono-v52-paper. Le service nommé boono-v52-paper n'est qu'un identifiant PM2 historique, pas l'ancienne Constitution.
- Sources MA Live nouvelles seulement au niveau de l'évaluation : dernière valeur MA200 dans mcb_3m_live.csv et mcb_15m_live.csv, observée selon la date effective de modification du fichier. Refus de rétroactivité : un état Live postérieur à l'as-of d'un replay historique est ignoré.
- Correctif collatéral de cohérence : la V5.3 historique tentait de réaffecter la direction d'un nouveau cycle 15m à une variable déclarée constante lorsque le premier Live manquait, provoquant occasionnellement un TypeError. Cette variable de transition est maintenant modifiable, avec test de régression.
- Qualification du MA : prix qui a toujours vécu en dessous d'une MA = OPPOSITE_SIDE ; LOST n'est pas attribué sans preuve d'une précédente acceptation. Une mèche de franchissement Live = TEST_PENDING, pas ACCEPTED.
- Suite complète après les corrections : 140 tests réussis sur 140, zéro échec, dont tests de mémoire et d'autorité du risque MA, replay historique #2, #5, #9, migration, absence de données futures et cas 15m sans nouveau relevé Live.
- Après deuxième redémarrage PM2, politique V5.3.1 calculée en direct, compte préservé, pas d'ordre financé ; config-server redémarré et routes privées / et /api/v52 toujours sous authentification HTTP 302 sans session.
- V4.9.3, V4.10.10, l'ancien V5.1 arrêté et BOONO-TV demeurent inchangés. Le rendu graphique dans une véritable session mobile n'a pas encore été vérifié visuellement.
