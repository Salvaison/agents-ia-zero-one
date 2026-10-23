# BOONO Systems — Incident critique V4 : clôture bloquée et archive surdimensionnée

**Date : 23 octobre 2026, diagnostic et réparation d'urgence sur Amsterdam.**
**Portée autorisée : cohérence de stockage et capacité d'exécution des protections V4, aucune modification de la stratégie d'admission, MCB, MF, PM, seuils de risque ou prises de profit.**

## Incident constaté
- `cerveau-central` était déclaré PM2 online, mais son dernier `trade-sim-v4-state.json` datait du **23/10 10h57m49s Europe/Stockholm**, alors que le collecteur Audit continuait (vérifié à 14h07 locale).
- Le papier V4 conservait une position DAY **LONG BTC à 81 669,3 $**, ouverte **23/10 10h12m47s locale**. MFE enregistré **+217,7 $ BTC**, donc déclenchement théorique du plancher **+90 $** à un prix de **81 759,3 $**.
- Les logs V4 répétaient `[V4][HARD_GAIN_GUARD_ERROR] RangeError: Invalid string length` avec la pile `writeJson -> appendCapped -> recordExit -> finalizePositionExit -> protectOnPriceTick`.
- Le journal des trades `data/trade-sim-v4-history.json` pesait **523 549 575 octets**, avec 167 clôtures, suite à la **duplication de l'historique Elastic Sync dans les contextes d'entrée et de sortie**. Exemples des plus gros trades : ~24 Mo JSON brut par opération, dont deux copies d'Elastic Sync totalisant ~10 Mo, outre l'indentation du JSON.
- `recordExit` écrivait le lourd historique avant d'effacer la position et de sauvegarder l'état. Échec de cette écriture = **sortie non actée malgré déclenchement du garde**. Le cerveau redémarrait ou cessait sa boucle d'évaluation ; PM2 « online » ne prouvait pas la santé opérationnelle.

## Sauvegarde et intervention initiale sur données
- Copie intégrale de l'historique 523,5 Mo et de l'état 27,98 Mo **avant toute réduction**, avec empreintes SHA256, dans `archives/v4-storage-emergency-20261023/` sur Amsterdam, non publiée dans Git.
- Compactage transactionnel du tableau historique, en conservant les **167 trades, toutes les colonnes de comptabilité, les prix, heures, identités, motifs de sortie, MFE/MAE et informations d'entrée/sortie utiles**. Retrait des copies géantes de `elasticSyncShadow.completed` et des autres gros historiques de recherche, avec résumé version/état/épisode. Les données complètes demeurent dans l'archive originale.
- Résultat compact vérifié : **30 230 003 octets** (-94,2 %), somme PNL affichée des 167 trades **−33,388 $**, somme des frais explicitement modélisés **112,513 $**. Le format restant est JSON valide, compatible avec l'interface.
- Au swap atomique du fichier compact, le moteur encore actif a réussi à acter la clôture de la position DAY sur le **premier prix observé après déblocage**.
- Sortie effective au **23/10 14h16m21s Stockholm** : prix **81 475,9 $**, `EXIT_ECONOMIC_PROFIT_FLOOR`, PNL net **−5,050354 $**, MFE +217,7 $, MAE désormais ~217,4 $. **La sortie théorique du plancher à 81 759,3 $ n'a PAS eu lieu.** La comptabilité conserve le prix observé à la reprise, sans gain inventé. L'historique remonte ensuite autour de 65 Mo, car l'ancien processus encore chargé en mémoire a sérialisé le nouveau trade avec les gros contextes et l'ancienne indentation.

## Corrections permanentes du code
- `trade-simulator-v4.js` : `compactV4TradeHistoryContext` retire seulement les copies géantes de mémoire `elasticSyncShadow` et quelques shadows multi-épisodes des **rapports de trades historiques**, tout en conservant les preuves structurelles MCB, le contexte, les décisions, le risque et la comptabilité ; pas d'effet sur l'état utilisé par la décision V4.
- Un report de sortie possédant la même identité `module + entryTimestamp` est idempotent ; évite les doublons si l'état avait échoué après un append antérieur.
- Historique JSON désormais sérialisé sans indentation lors de futures clôtures, réduisant significativement le volume sans changer le contrat de lecture.
- **Continuité de protection :** si l'archive principale échoue malgré tout, `finalizePositionExit` consigne un petit `trade-sim-v4-exit-recovery.ndjson` avec la vraie clôture/PNL et poursuit l'effacement de la position papier. L'écriture facultative du journal de décision vient **après** le commit de l'état, et ne bloque plus ce dernier.
- `cerveau-central.js` : une évaluation ponctuelle qui lève une exception est loggée `[cerveau][EVALUATION_ERROR]`, mais la minuterie de 30 secondes continue ses cycles. Aucun filtre de trading modifié.

## Vérifications
- Tests sur données V4 isolées : stops de gain 120/90 et 220/180, idempotence par identité d'entrée et compaction des énormes contextes Elastic, **défaillance provoquée de l'archive** avec écriture de récupération et clôture effective de la position, résilience de la boucle cerveau.
- **96 tests V4/V5 réussis** ; les autres moteurs n'ont pas été modifiés.
- À compléter impérativement après redémarrage du cerveau (possible seulement une fois la position devenue FLAT) : vérifier écriture V4 récente, cycles à 30 secondes, absence d'erreurs RangeError répétées, absence de trade fictif ou doublonné et santé PM2.

## Limites
- Cette réparation est **une intervention d'intégrité**, pas une preuve de rentabilité de V4. Les évaluations V4 peuvent encore consommer beaucoup de RAM à cause des mémoires Elastic volumineuses, et les NDJSON de décisions/évaluations tournent trop rapidement pour conserver 48h.
- L'historique full original est préservé sur le VPS mais la partie « rapports détaillés » de l'UI utilise maintenant les contextes compactés ; ses historiques Elastic Sync complets antérieurs sont à consulter dans l'archive.
- Aucun ordre financé n'a été envoyé au marché ; le système analysé était en paper trading.
