# BOONO Systems — Incident MCB15 : mémoire d'événements disparue dans l'État vivant

Date : dimanche 25 octobre 2026, vers 22h11–22h20 CET. Diagnostic sur VPS Amsterdam, suite à la demande de contrôle de l'utilisateur.

## Symptôme

L'utilisateur constate que le panneau MCB15 de l'interface n'affiche plus les données attendues malgré un rechargement de la page, peu après l'évolution des bandes de trades sur les trois graphes.

## Contrôles serveur — collecte et moteur intacts

- PM2 : collecteur-tab2, collecteur-3m, V5.3.3 PAPER, V4.9.3 et config-server tous actifs.
- Fichier MCB confirmé `mcb_15m.csv` mis à jour à 21h00:35 UTC : dernière bougie source 20h45 UTC, LBW −49,18 / BW −41,43 / MF −0,72.
- Fichier MCB 15m Live `mcb_15m_live.csv` mis à jour à 21h12 UTC, avec LBW environ −51,21 / BW −47,50 / MF −0,66.
- Audit roulant : sur les 12 dernières heures observées, **1 440/1 440 relevés** contiennent des valeurs numériques pour chacune des colonnes live15LbwRaw, live15BwRaw, live15MfRaw ainsi que leurs valeurs confirmées ; 3m est lui aussi présent.
- V5.3.3 latestAnalysis a `quality=DATA_OK`, un MCB15 renseigné et une trajectoire structurelle SHORT. Aucun impact de la panne sur la logique de trading ou les ordres (toujours PAPER).
- Reconstruction de l'API Vagues : **48 ancrages 15m sur 12h**, tous avec LBW/BW/MF/VWAP numériques. Un test end-to-end de rendu Canvas utilisant les véritables frames Audit sur quatre heures produit 17 ancrages 15m, 16 appels de tracés, 80 segments Bézier, quatre remplissages MF : la courbe n'est pas vide côté données/render.
- Le dernier commit sur les pistes 10px n'est pas l'origine du manque de chronologie dans l'État vivant.

## Cause précise

Dans `modules/v5/v53-causal-chain-view.js`, la fonction build() limitait TOUS les événements MCB3 et MCB15 transmis à l'affichage à **3 heures**, grâce à un test `observedAt >= now-3h`. Le dernier E15 confirmé était observé vers 19h00 CET ; après 22h00 CET, les lignes `Cross15 / E15 Live / E15 confirmé` devenaient donc artificiellement vides, même lorsque les preuves étaient conservées par l'Elastic Observer et le moteur V5.3.3. Une heure de source de bougie ne doit jamais être substituée à l'heure de réception/observation.

## Correction

- Suppression du filtrage arbitraire à 3h sur la **mémoire diagnostique** MCB ; le module peut afficher le dernier cross/E15 disponible tant qu'il figure dans l'historique borné du serveur.
- Fallback sur les derniers événements E15 officiellement mémorisés dans V5.3.3 (`liveE15`, `confirmedE15`) si l'ancien journal Elastic a déjà tourné. Ne jamais inventer un cross manquant ou un événement futur.
- Chaque événement reçoit `ageMinutes` et `historyOnly`. L'État vivant précise **mémoire XhXX** pour les événements anciens, au lieu de les présenter comme de nouveaux signaux Live.
- **Séparation des autorités :** la direction structurelle *actuelle* provient toujours de `mcb15.currentOffensive`; un ancien cross15 affiché pour mémoire ne redevient pas une autorité stratégique active. La comparaison 3m/15m se déclare indéterminée si elle ne peut être établie par les données présentes.
- Le dernier LBW15/BW15/MF15 actuel reste affiché indépendamment de l'ancienneté des derniers événements natifs.
- Code modifié uniquement pour la lecture/présentation : `modules/v5/v53-causal-chain-view.js` et `modules/config-server.js`. Aucune réforme des décisions V5.3.3, aucune modification des collecteurs, ni du nouveau renderer de pistes trade, ni des autres moteurs.

## Tests

- `tests/v5/v53-causal-chain-ui.test.js` : maintien des E15 au-delà de 3h, affichage explicite de l'ancienneté, fallback après rotation Elastic, absence de fuite de données du futur, distinction événement historique vs direction MCB active.
- `tests/v5/v53-mcb15-data-path.test.js` : reconstruction réelle Audit → frames Vague15 → 15m anchors → Canvas, avec validation de présence des courbes BW/LBW/MF.
- Suite V4+V5 : **178 tests exécutés, 174 réussis, 0 échec, 4 replays historiques ignorés** faute d'Audit ancien.
- JavaScript client extrait et compilé sans erreur, label mémoire présent.

## Statut déploiement
À compléter après redémarrage contrôlé de config-server, contrôle HTTP et commit GitHub. Le rendu dans la session mobile authentifiée de l'utilisateur n'a pas encore été inspecté visuellement.

## Déploiement vérifié — 22h25 CET

- Sauvegardes des fichiers d'avant correctif : `/root/boono-mcb15-display-backup-20261025/` (fichiers `config-server.js` et `v53-causal-chain-view.js`), SHA-256 enregistrés.
- Le service `config-server` a redémarré avec la correction et écoute à nouveau sur le port 80. Les routes privées `/`, `/api/v52` et `/api/wave-live` répondent HTTP **302 hors authentification** (protection normale).
- Après redémarrage : l'État vivant reconstruit depuis le moteur V5.3.3 montre LBW15 −53, BW15 −50,8 ; dernier cross15 SHORT horodaté avec ancienneté d'environ 206 minutes ; dernier E15 DN confirmé conservé et daté, environ 204 minutes ; aucune direction offensive actuelle fabriquée à partir de ces signaux anciens.
- Vérification globale : collecteurs 3m/15m, config-server, V5.3.3, V4.9.3, V4.10.10, BOONO-TV et Execution Lab tous **online**. V5.3.3 garde son SHORT PAPER sans redémarrage ; `brokerOrdersEnabled=false`. Disque à 28% utilisé, RAM disponible environ 1,1 Go (swap présente).
- Le rendu du navigateur authentifié de l'utilisateur n'a pas été inspecté directement ; le DOM État vivant et le Canvas Vague15 ont été exécutés dans les tests avec vrais jeux de données d'Amsterdam.
