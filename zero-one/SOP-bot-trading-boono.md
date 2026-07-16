SOP — Bot Trading Boono
Version 1.1 — 9 juillet 2026 (dernière modification : 16 juillet 2026)


1. TRIGGERS

Trigger A — Daily brief (9h00)

Phase 1 — Transition et bilan (15-20 min)


Bot suspend le scalp-trading
Bot présente état des positions scalp en cours
Décision commune : liquider les scalps dépassés TP1 ou attendre
Lecture et analyse du rapport quotidien (veille)
Succès et échecs — rédaction de nouvelles recommandations


Phase 2 — TA manuelle (20-40 min)


Bot indique les niveaux clés à surveiller avant de rendre la main
Bot passe en mode aveugle — Benjamin surveille le marché
Benjamin fait la TA multi-timeframes top-down :

Supprimer les niveaux obsolètes
Identifier S/R sur chaque timeframe
Tracer les Fibonacci
Identifier le range actuel et les ranges potentiels
Programmer les alarmes TradingView (lignes de tendance notamment)



Benjamin saisit les niveaux dans le formulaire selon syntaxe :

DS"prix" — Daily Support
WR"prix" — Weekly Resistance
MR"prix" — Monthly Resistance
fib0"prix"/fib1"prix" — niveaux Fibonacci



Formulaire = liste d'éléments cliquables + copier/coller du prix


Phase 3 — Reprise et scénarios (10-15 min)


Benjamin rend la main au bot via commande REBOOT
Benjamin transmet le document S/R au bot
Bot analyse et commente les niveaux — compte rendu et appréciation
Identification des confluences entre niveaux
Établissement des scénarios selon syntaxe préformatée :


if reaching S/R "prix" with at least 2 timeframes in divergence,
then ask if dbsi and ticker detect a trend change,
then enter trade if volume score >= X


30-60 minutes après le début → bot indépendant pour la journée


Alertes :


Bot peut envoyer SMS en cas de situation inhabituelle
Alarmes TradingView sur lignes de tendance pour événements non horizontaux


Trigger B — Signal automatique (continu)


Confluence : divergences MCB multi-timeframes + prix dans zone S/R ±250$ + volume favorable
Score ≥ seuil du module → entrée autorisée. **Seuils non définis à ce jour** — null dans config.json, à calibrer en paper trading. Les anciennes valeurs 5/9, 6/9, 7/9 n'ont jamais été validées.
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
Volume MEXC — force, vélocité, spike (3 groupes : Momentum / Engagement / Trigger)
État du portefeuille — capital disponible, positions ouvertes, P&L


Quotidiens (daily brief) :


Niveaux S/R saisis via formulaire cliquable
Niveaux Fibonacci entrée/sortie
Scénarios préformatés avec valeurs variables


Optionnels :


Contexte macro — périphérique, jamais déclencheur



3. PROCESS STEPS


Surveillance continue 24/7

Lecture CSV MCB toutes les 3 minutes
Calcul score confluence toutes les 5 minutes
Comparaison prix live avec S/R préétablis



Daily brief (9h) — voir Trigger A

Phase 1 : bilan et positions
Phase 2 : TA manuelle
Phase 3 : scénarios et reboot



Évaluation entrée trade

Score divergences MCB multi-timeframes
Vérification zone S/R ±250$
Validation 3 groupes volume
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


Alertes :


SMS en cas de situation inhabituelle


Hebdomadaire :


Résumé performance, patterns identifiés, paramètres à ajuster



6. ERROR HANDLING

Connexion :


Perte WebSocket → pas de nouveau trade, trades en cours maintenus
CSV non mis à jour depuis >15 min → alerte SMS, pause nouveaux trades


Exécution :


Erreur API MEXC → pas d'ordre, log, alerte SMS
Score incohérent → confirmation humaine requise avant action


Règles :


Conflit entre règles → toujours favoriser la protection du capital
Ne pas devenir contradictoire avec les règles de trading


Note : error handling à compléter en paper trading


Notes


Structure 25/50/25 à valider en paper trading
Scores non calibrés — attendre accumulation de données
Interface formulaire S/R — à développer
Rapport quotidien — à coder
SMS alertes — à configurer
Paper trading MEXC — erreur 602 Futures non résolue