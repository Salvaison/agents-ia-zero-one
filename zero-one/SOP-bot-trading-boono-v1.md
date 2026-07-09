SOP — Bot Trading Boono

Version 1.0 — 8 juillet 2026


1. TRIGGERS

Trigger A — Daily brief (9h00)


Analyse top-down des marchés : Weekly → Daily → 4H → 1H
Pause scalp pendant toute la durée de la TA
Peut attendre la résolution d'un trade en cours avant de démarrer
Commande REBOOT pour reprendre la collecte après la TA
Durée estimée : 30-60 minutes


Trigger B — Signal automatique (continu)


Confluence : divergences MCB multi-timeframes + prix dans zone S/R ±250$ + volume favorable
Score ≥ seuil (Scalp 5/9, Day 6/9, Swing 7/9) → entrée autorisée
Exception : spike volume exceptionnel → entrée scalp immédiate sans scénario préétabli
Fibonacci calculé par le bot sur dernier pivot (15m scalp / 4H day / 1D swing)


Trigger C — Sortie


TP1 : entre rentabilité frais + petit profit et 0.382 Fibonacci — obligatoire
TP2 : à l'ouverture du trade inverse (Shlong) ou 0.618 Fibonacci
Circuit breakers volume : conditions exceptionnelles peuvent invalider un trade
Stop dynamique : trade en profit >2% qui revient au niveau des frais → sortie


Trigger D — Rapport fin de journée (heure fixe)


Récapitulatif automatique de l'activité du jour



2. INPUTS

Permanents (continus) :


CSV MCB — LBW, BW, Money Flow, Buy/Sell, DBSI (6 timeframes)
Prix temps réel — WebSocket MEXC tick par tick
EMA multi-timeframes — MA/Tendance
Volume MEXC — force, vélocité, spike
État du portefeuille — capital disponible, positions ouvertes, P&L


Quotidiens (daily brief) :


Niveaux S/R saisis manuellement dans formulaire
Niveaux Fibonacci (entrée et sortie) saisis manuellement
Scénarios préétablis (haussier / baissier / neutre)


Optionnels :


Contexte macro — périphérique, jamais déclencheur



3. PROCESS STEPS


Surveillance continue 24/7

Lecture CSV MCB toutes les 3 minutes
Calcul score confluence toutes les 5 minutes
Comparaison prix live avec S/R préétablis



Daily brief (9h)

Analyse top-down des timeframes
Saisie S/R, Fibonacci, scénarios
Pause scalp pendant cette phase



Évaluation entrée trade

Score divergences MCB multi-timeframes
Vérification zone S/R ±250$
Validation 3 groupes volume (Momentum / Engagement / Trigger)
Score final ≥ seuil → entrée autorisée



Exécution trade

Calcul taille position (1% capital max)
Calcul niveaux TP1/TP2 (0.382/0.618 Fibonacci)
Structure 25/50/25 — à calibrer en paper trading
Ordre via API MEXC



Gestion du trade

Surveillance continue prix vs TP1/TP2
Détection circuit breakers volume
Ouverture position inverse Shlong si conditions réunies



Sortie et documentation

Rapport fin de journée
Log trade : timestamp, prix, score, confluence
Mise à jour session-notes.md






4. DECISIONS — règles if/then

Règle principale :

SI divergence MCB confirmée sur ≥2 timeframes
ET prix dans zone S/R ±250$
ET volume favorable
→ ENGAGER TRADE selon module (scalp/day/swing)

Exception volume :

SI spike volume exceptionnel soudain
→ ENGAGER SCALP immédiat sans scénario
→ SI confirmation divergence arrive ensuite
   → ENVISAGER conversion en swing trade

Gestion TP1 :

SI prix atteint zone rentabilité frais + petit profit
→ PRENDRE TP1 obligatoirement
SI prix revient brutalement après TP1
→ LIQUIDER immédiatement

Circuit breakers :

SI volume indique retournement fort et soudain
→ INVALIDER trade en cours
SI trade en profit >2% revient au niveau des frais
→ STOP LOSS dynamique

Note : sous-règles nombreuses à calibrer en paper trading


5. OUTPUTS

En continu :


Score de confluence mis à jour toutes les 5 minutes
Prix live et état de chaque module


À chaque trade :


Ordre MEXC exécuté avec paramètres complets
Log : timestamp, prix entrée, score confluence, modules contributeurs


Fin de journée :


Rapport quotidien : trades, P&L, justification par confluence
Mise à jour session-notes.md


Hebdomadaire :


Résumé performance, patterns identifiés, paramètres à ajuster



6. ERROR HANDLING

Connexion :


Perte WebSocket → pas de nouveau trade, trades en cours maintenus
CSV non mis à jour depuis >15 min → alerte, pause nouveaux trades


Exécution :


Erreur API MEXC → pas d'ordre, log, alerte
Score incohérent → confirmation humaine requise avant action


Règles :


Conflit entre règles → toujours favoriser la protection du capital
Ne pas devenir contradictoire avec les règles de trading


Note : error handling à compléter en paper trading — le système nous montrera où ça casse


Notes


Structure 25/50/25 à valider en paper trading
Scores non calibrés — attendre accumulation de données
S/R saisis manuellement — interface à développer
Rapport quotidien — à coder
Paper trading MEXC — erreur 602 Futures non résolue