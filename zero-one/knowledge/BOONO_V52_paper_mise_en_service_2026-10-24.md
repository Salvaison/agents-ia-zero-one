# BOONO Systems — Mise en service V5.2 PAPER et V4.9.3 comparateur

**Date** : 24 octobre 2026. **Portée** : deux moteurs PAPER indépendants, sans ordre financé. Ancien V5 PAPER figé et V4.10.10 primaire inchangé.

## Mandat et architecture validée

L'utilisateur valide un V5.2 décisionnel qui prend de vrais trades **en simulation**, pas un énième observateur. Il demande un État vivant et un panneau de décision/invalidation V5.2 au premier plan, la Conversion Elastic comme mémoire commune color-codée, V4.9.3 indépendante en arrière-plan, et les deux moteurs affichés distinctement sur Vagues.

Ordre conceptuel : **PHASE MCB → TRANSITION GÉOMÉTRIQUE → LIEU → CONVERSION → PRONOSTIC → DÉCISION + INVALIDATION → RISQUE**. La géométrie révèle le lieu. Une position ouverte se gère différemment d'une recherche d'entrée FLAT. E3 contraire seul ne clôture jamais.

## Implémentations datées

### V5.2 PAPER

- modules/v5/decision-v52.js : phase structurelle E15/E3 causale selon les bougies disponibles, BW/LBW cross 3m/15m à l'instant d'observation Audit, fréquence des recroisements, position oscillateur ±50/60, pente de cross, niveaux VAL/POC/VAH, MA200, supports/résistances et extrema confirmés, conversion PM et variations MF. Rend ENTER_LONG / ENTER_SHORT / WAIT ou HOLD / EXIT en position, avec invalidation et justification.
- modules/v5/runner-v52.js : processus PM2 « boono-v52-paper » ; flux public OKX prix/ticks observé environ toutes les 5 secondes. Dernier Bâton Audit (~30s) est référence. La somme priceMove du dernier Bâton + variation prix OKX entre ce Bâton et maintenant couvre deux segments temporels successifs en USD BTC. **Ne somme jamais les volumes PM3/PM5 chevauchants.** PM3/PM5 observés sur valeurs de prix, MF comme contexte.
- modules/v5/paper-v52.js : PAPER uniquement, notionnel 1 500 $, equity initiale 1 000 $, frais taker 0,05 % par côté, une position max, risque dur −500 $ prix BTC, protections de gain 120/90 et 220/180, plus invalidation structurelle/évolution corroborée. Sorties comptabilisées au **prix réellement observé**, pas au seuil théorique. Pas d'ordre broker.
- Données propres : data/v52-paper-state.json, data/v52-paper-trades.ndjson et data/v52-paper-decisions.ndjson. Journaux rotatifs 4 Mo × 10 segments max, persistance compacte et PM2 auto-restart.
- Première opération enregistrée : LONG PAPER entrée BTC 80 799,4 $, sortie BTC 80 765,9 $, invalidation structurelle, −2,1216 $ net de frais. Une occurrence n'indique ni succès ni échec de la Constitution. Le niveau d'invalidation était relativement proche de l'entrée ; à revoir sur plusieurs cas, non optimiser sur une seule perte.

### Comparateur authentique de logique V4.9.3

- Détachement Git exact historique à /root/boono-v493-baseline, commit cdf1936, version v4.9.3-mf-memory-admission-20261012.
- modules/v5/baseline-v493-runner.js utilise le **moteur de décision original** de ce commit, contre les sources Amsterdam partagées, mais dans un wrapper moderne PAPER *séparé* : data/v493-baseline-state.json, data/v493-baseline-trades.ndjson et data/v493-baseline-decisions.ndjson. Journal rotatif ; son propre état, capital, P&L, frais, sortie/TP1 ; aucune écriture vers l'ancien ledger V4.
- Worktree data/mcb-live lié au dossier de collecte MCB Amsterdam, et fichiers data/audit-history.json, baton-state.json, levels.json, trendlines.json liés aux seules **sources** réelles. Ne jamais relier ses résultats aux fichiers de V4.10.10.
- PM2 « boono-v493-baseline », observations ~30 secondes, entrées sur Bâton, sans broker. Une première entrée LONG PAPER a été constatée.
- **Comparaison descriptive, pas backtest A/B contrôlé** : même marché mais V4.9.3 sur prix Bâton 30s et V5.2 sur ticks observés 5s ; accounting sandbox sur les deux, pas réutilisation de l'ancien simulateur V4.9.3 à l'identique. Le slippage et le funding ne sont pas modélisés.

### Interface privée et Vagues

- modules/config-server.js ajoute /api/v52 et /api/v493 : réponses privées authentifiées, petites, en lecture seule, aucune route d'ordre.
- TRADES → État vivant : V5.2 en première carte (phase, géométrie, lieu, PM Live depuis Bâton, MF, pronostic, décision + invalidation, risque, résultats PAPER). Le graphique de Conversion/Elastic déjà validé suit, avec mémoire color-codée, **descriptif** et sans vote additionnel dans V5.2. V4.9.3 comparateur en arrière-plan repliable ; V5 Structure et V5.1 arrêté archives repliables ; V4.10.10 ancien état sous « contrôle technique » repliable.
- Vagues prix/MCB 15m/3m : trades **magenta = V5.2**, **bleu = comparateur V4.9.3** ; plages cliquables entrée-sortie ; position ouverte dessinée seulement si dernier état récent. Les anciennes plages V5.1 arrêtées ne peuvent pas prolonger une position figée au Live. Les trades V4.10.10 historiques sont préservés mais masqués de cette comparaison par défaut.
- Signal E15/E3 dans Vagues : barTs/sourceTs = début bougie source ; firstObservedAt = première apparition Live constatée dans Elastic/Audit ; confirmedObservedAt = confirmation constatée. Le marqueur principal se place sur le premier Live observé, un second cercle indique une confirmation E15 plus tardive. Pour absence de provenance historique, onset explicitement inconnu au lieu d'inventer une date.
- Exemple inspecté E15 UP le 24 octobre : source bougie 09:45 UTC, premier Live 09:57:07.936 UTC, confirmation reçue 10:00:37.624 UTC. Aucune promotion décisionnelle rétroactive n'est autorisée.
- Les divergences possèdent encore des conventions hétérogènes extremeTs/confirmedAt dans leurs anciens shadows ; **non modifiés** durant la mise en service. Vérification à planifier avant toute nouvelle autorité.

## Sécurité et statut existant

- Moteur V4.10.10 existant « cerveau-central » laissé intact et en fonctionnement ; une position PAPER était ouverte au moment de l'inspection, ne pas inventer de clôture.
- Ancien processus boono-v5-shadow arrêté, archive des 22 trades conservée, SHORT figé non étendu.
- boono-v5-structure-readonly continue en observation.
- Aucun ordre financé, aucun connecteur d'exécution OKX ajouté aux deux nouveaux processus ; prix OKX vient du flux public. Source observée fraîche obligatoire pour entrer, PM2 auto-restart, stop papier sur prix observé.
- Ressources : VPS 4 Go RAM, disque ~77 Go et ~56 Go libres au contrôle ; nouveaux journaux bornés. Les énormes shadows et anciens journaux V4 restent pour un futur nettoyage autorisé séparément.
- Aucune modification ni commit des fichiers BOONO-TV / partagé graphique modifiés par autre chantier.

## Vérifications

- Suite test complète V4+V5, **101/101 réussis** lors de la mise en place (avant retouches finales du rendu des heures ; à relancer après ces retouches).
- Tests V5.2 : timestamp réel observé BW/LBW vs origine de bougie, dernier Bâton+prix OKX, sans cumul de fenêtres de volumes, mécanique PAPER entrée-HOLD-sortie, seuil +120/90 au prix réellement observé, anti-double entrée, anti-replay d'événement avant démarrage.
- Serveur d'interface : code Node et JavaScript livré syntaxiquement valides, UI simulée compilable, redirection HTTP 302 sur accès non authentifié aux nouvelles routes.
- Pas de validation visuelle complète de la nouvelle interface dans une vraie session authentifiée à ce stade.

## Étape après démarrage

Accumuler des **trades** puis revue 3-trades/daily : pertinence de l'entrée sur phase/lieu/cross/PM, risques de stop trop proche vs volatilité 3m, invalidations de campagne, maintien à travers respirations, MFE/MAE et rendement net. Comparer les mêmes plages de marché V5.2 vs V4.9.3 PAPER, sans prétendre à des preuves de rentabilité sur une courte séquence.
