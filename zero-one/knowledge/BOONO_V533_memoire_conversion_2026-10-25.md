# BOONO Systems — V5.3.3 PAPER · Mémoire de conversion

25 octobre 2026. Correctif demandé par le propriétaire.

## Constitution rectifiée

Une fenêtre CONVERSION INEFFICIENT ou CONTESTED après POWERFUL est une respiration normale possible. Elle ne peut, par son seul libellé, invalider la thèse MCB15 ou effacer les preuves causales déjà observées.

Séparer impérativement trois responsabilités :
- Thèse structurelle : MCB15/E15 et continuité du prix, avec la mémoire du pic POWERFUL et de son premier/dernier événement productif. Une confirmation structurelle adverse est requise pour contester réellement la thèse.
- Qualité tactique courante : PM Live, PM3/PM5, MF3/MF15 ; INEFFICIENT, CONTESTED ou SILENT peuvent signaler une respiration normale sans détruire la mémoire productive.
- Admission : un nouveau LONG/SHORT reste soumis à la cohérence MCB3, MF, PM, maturité mesurée depuis preuve E15, épreuves MA véritablement démontrées, invalidation et risque.

Le sens opposé productif peut suspendre une entrée, mais ne supprime pas à lui seul la thèse directrice.

## Cas du 25 octobre 2026, heure Stockholm

15:41:10 EASY LONG ; 15:41:40 E15 UP Live avec E3 confirmé, MF3/MF15 favorables ; 15:42:10 cross15 UP et conversion POWERFUL LONG. À 15:42:39 une fenêtre INEFFICIENT LONG apparaît avec PM Live négatif, puis de nouvelles phases INEFFICIENT/SILENT/CONTESTED. V5.3.2 donnait trop de pouvoir au dernier libellé et perdait la permission causale.

V5.3.3 conserve MCB15_PRODUCTIVE_CAMPAIGN_ENGAGED, peakQuality POWERFUL, et affiche séparément RESPIRATION_AFTER_PRODUCTIVE_IMPULSE et WAIT_PM_RESPIRATION. Dès que PM/MF retrouvent leur cohérence, une candidature peut redevenir admissible sans devoir réimprimer POWERFUL. La même preuve E15 ne justifie pas des réentrées répétées après une sortie.

## Implémentation

- modules/v5/conversion-campaign-v533.js : mémoire pure et as-of des événements Elastic, peakQuality, first/last productive, last POWERFUL, E15 opposé confirmé, timing distinct de la thèse.
- modules/v5/decision-v533.js : conserve les conditions V5.3.2, ajoute la reprise lorsque seules les étiquettes de conversion dégradées empêchaient une entrée autrement valable.
- modules/v5/runner-v52.js : même processus PAPER, journal conversionCampaign ajouté, aucun flux supplémentaire.
- modules/v5/paper-v52.js : migration explicite du ledger V5.3.2 vers V5.3.3, préservation des positions et politiques de sortie historiques, du PNL, des frais, de la protection 120/90 et 220/180 et de l'anti-churn.
- modules/config-server.js : état vivant avec pic de conversion mémorisé vs dernière qualité et état de timing.
- tests/v5/v533-conversion-memory.test.js et tests/v5/v533-ledger-migration.test.js : replays et migrations.

## Gouvernance

PAPER seulement, aucun ordre réel ni broker. Le laboratoire X-Perp A/B/C reste indépendant. Les seuils hard-risk BTC −500, floors +120/90 et +220/180 sont inchangés, ainsi que le comparateur V4.9.3, la V4.10.10 et BOONO-TV.

Le replay est in-sample et ne prouve aucune rentabilité nouvelle. Comparer prospectivement le nombre de respirations correctement conservées, les nouvelles admissions, les fausses reprises et le PNL net.

## Déploiement

À compléter après vérification du nouveau ledger et de PM2.

## Installation vérifiée sur Amsterdam

Basculement contrôlé le 25 octobre 2026. Service PM2 historique boono-v52-paper redémarré sous politique v5.3.3-conversion-memory-no-instant-veto. Snapshot préalable du ledger et des journaux dans /root/boono-v533-before, empreinte SHA-256 identique à la source.

À la bascule : 15 clôtures, equity PAPER 980,1028 USD, frais 22,5041 USD, 15 clés anti-churn, aucune position ouverte. Le nouveau ledger est v5.3.3-paper-ledger-v0.6, la comptabilité est conservée et brokerOrdersEnabled reste false. V4.9.3 et V4.10.10 ainsi que le service Execution Lab sont indépendants. Le serveur d'interface a été redémarré et PM2 sauvegardé.

Suite pré-déploiement : 170 tests exécutés, 166 réussis, zéro échec, quatre anciens replays historiques sautés faute de données Audit conservées. Les neuf tests spécialisés V5.3.3 ainsi que la migration V5.3.2 ont réussi.
