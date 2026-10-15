# BOONO — Onglet SHADOWS V1 — 2026-10-15

## Position dans l'interface

Sous TRADES :
- Etat V4
- Vagues
- Historique
- SHADOWS
- BOONO

SHADOWS est placé juste avant BOONO.

## Rôle

Vagues = ce que BOONO voit.
Etat vivant = ce que BOONO comprend / décide.
SHADOWS = ce que BOONO observe, teste ou aurait pu faire sans autorité live.

## V1 — état live

Cartes :
1. PRICE BEHAVIOR — SHADOW PUR
   - état de déplacement prix
   - direction
   - relation à la mémoire signal 3m/15m
   - yield/P75 et effort/P75
   - PM 3m / 5m
   - efficiency 3m
   - durée / MFE / MAE de l'épisode

2. CONTINUATION RE-ENTRY — SHADOW PUR
   - état du shadow
   - sortie protectrice d'origine
   - trigger hypothétique
   - MFE / MAE shadow
   - 220 atteint ou non
   - churnRisk
   - PM 3m / 5m
   - attente / invalidation

3. STRUCTURAL HANDOFF — SHADOW PUR
   - direction / état
   - triple sync
   - directions 1h / 15m / 3m
   - reentryEligible
   - invalidation

4. TP OPTIMIZATION — SHADOW PUR
   - dernier trade analysé
   - meilleure variante TP
   - résultat net best TP
   - HOLD
   - delta vs HOLD
   - nombre de variantes

5. MF MEMORY — ACTIF / ADMISSION_ONLY
   - volontairement séparé des shadows purs
   - mémoire lente
   - tactique 30m
   - candidat
   - relation prix / MF
   - price efficiency
   - USD / point MF

## Statistiques V1

Fenêtre récente limitée aux 360 dernières évaluations DAY.
La durée réelle de la fenêtre est affichée dans l'interface.

Price Behavior :
- épisodes intéressants
- épisodes alignés avec vague
- épisodes avec MFE >= 220 USD
- épisodes avec MAE >= 180 USD

Continuation Re-entry :
- candidats uniques
- candidats MFE >= 220 USD
- churnRisk
- invalidations
- MFE / MAE observés en backend

Structural Handoff :
- épisodes
- reentryEligible
- invalidations

TP Shadow :
- trades analysés disponibles dans l'historique
- meilleur TP > HOLD
- égalités avec HOLD
- delta cumulé best TP vs HOLD

## Journal

Le journal récent ne répète pas chaque évaluation.
Il enregistre les transitions significatives :
- Price Behavior intéressant / changement de régime
- Continuation candidate / tracking / invalidation / churn
- Structural Handoff actif / éligible / invalidé
- MF Memory : changement de contexte actif

Chaque ligne indique heure Paris, catégorie, état, prix et détail utile.

## Performance

L'endpoint /api/shadows relit au maximum 360 évaluations récentes.
Le rafraîchissement est de 30 s uniquement quand l'onglet SHADOWS est ouvert.
Aucune nouvelle collecte n'est créée.

## Autorité

L'onglet est purement informatif.
Il ne modifie aucune action V4.
Les badges distinguent explicitement :
- SHADOW PUR
- ACTIF · ADMISSION_ONLY
