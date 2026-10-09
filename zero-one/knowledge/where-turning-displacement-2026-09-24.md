# BOONO — Analyse WHERE → retournement → déplacement — 24/09/2026

Intervention d'analyse read-only. Aucun seuil, aucune règle et aucun processus modifié.

## Diagnostic central

[ARTEFACT LOGIQUE / DESIGN À FALSIFIER] V3 traite actuellement WHERE comme une condition qui doit encore être présente au moment final de l'admission, alors que le mouvement attendu implique précisément que le prix quitte le lieu après réaction.

Dans SEQUENCE, WHERE est mémorisé 12 min. Mais pour STRUCTURAL_REASSERTION, RISK exige explicitement locationSource === CURRENT_WHERE. La mémoire RECENT_WHERE est donc calculée mais ne peut pas satisfaire la réassertion.

À l'inverse, PHASE_CONTINUATION peut utiliser RECENT_WHERE. Cela crée une asymétrie :
- la réassertion, qui a besoin d'un délai pour observer la réaction au lieu, exige le lieu encore actif ;
- la continuation peut accepter un lieu ancien même après un déplacement important, sans plafond explicite de distance depuis l'ancre WHERE.

## Faits 24 h disponibles

Fenêtre analysée : dernières ~24 h disponibles, hors gap causal connu du 23/09. 2 746 évaluations.

STRUCTURAL_REASSERTION LONG :
- 48 évaluations ;
- 29 avec CURRENT_WHERE compatible ;
- 18 avec seulement RECENT_WHERE ;
- 30 avec turning frais ;
- 48 avec nested3m aligné ;
- 14 avec dominance persistante alignée ;
- 47 avec risk de base admissible ;
- 8 évaluations avaient toutes les conditions essentielles sauf CURRENT_WHERE ; regroupées causalement elles forment 2 candidats principaux, résultats mixtes.

STRUCTURAL_REASSERTION SHORT :
- 2 033 évaluations ;
- 233 CURRENT_WHERE ;
- 570 RECENT_WHERE seulement ;
- 1 230 sans lieu mémorisé compatible ;
- 215 turning frais ;
- 960 nested3m aligné ;
- 338 dominance persistante alignée ;
- aucun cas où CURRENT_WHERE était l'unique condition restante.
Conclusion : WHERE contribue à la rareté, mais n'explique pas seul la paralysie SHORT.

## Trois trades V3 récents

1. LONG 23/09 11:46:51, +0,871 % lev.
   - CURRENT_WHERE à l'entrée.
   - turning LONG courant, âge 0.
   - dominance LONG persistante proof 0,935.
   - bon cas de lieu + réaction + action quasi simultanés.

2. SHORT 23/09 23:18:52, +0,701 % lev.
   - WHERE n'était plus courant mais RECENT_WHERE datait de 1,5 min.
   - prix seulement ~7,1 $ plus favorable que le dernier lieu.
   - turning short mémorisé et dominance short présents.
   - montre qu'un lieu peut rester causalement valable juste après sa sortie.

3. SHORT 24/09 02:11:23, -3,252 % lev.
   - RECENT_WHERE vieux de ~7 min.
   - prix déjà ~267,9 $ plus loin dans le sens short depuis le dernier lieu.
   - aucune preuve de turning frais.
   - dominance short existait depuis ~29,5 min et le prix avait déjà parcouru ~466,3 $ depuis sa première présence persistante.
   - profil typique de poursuite tardive après consommation du lieu.

## Ancien moteur

Le moteur legacy est conceptuellement plus simple :
- LOI 1 : Vslope15 neutre OU lieu actif => vigilance ;
- le lieu ne donne pas l'autorisation finale, il dit seulement « regarder maintenant » ;
- LOI 2/3 : lecture rapide 3m + accord avec le fond ;
- LOI 4 : le signal 3m suffit ; le 15m est informatif car attendre sa confirmation coûtait historiquement 500–700 $ ;
- LOI 5 : l'événement donne le moment, jamais la direction.

Sur les cinq campagnes legacy des dernières 24 h, seulement deux avaient un lieu actif à l'entrée. Quatre campagnes sont positives. Le meilleur résultat récent est entré sans lieu actif. Les métriques legacy et V3 ne sont pas directement comparables en niveau (tranches/pondération différentes), mais la capacité d'action est supérieure.

## Hypothèse simplificatrice à tester

WHERE devrait être un ANCRAGE CAUSAL, pas un gate simultané.

Séquence candidate simple :
LOCATION_ANCHOR → REACTION → DISPLACEMENT → ACTION/EXPIRE.

- LOCATION_ANCHOR : mémorise prix, timestamp, nature et directions compatibles.
- REACTION : 3m / microstructure montre que le lieu a effectivement provoqué une réponse.
- DISPLACEMENT : mesure le terrain gagné depuis le lieu et sa conservation.
- ACTION : autorisée si réaction + conversion sont démontrées avant que le déplacement n'ait consommé l'asymétrie.
- EXPIRE : si le lieu est traversé/accepté dans le mauvais sens, ou si le mouvement s'est déjà trop éloigné et le R:R est consommé.

Le temps seul (CURRENT vs RECENT) ne suffit pas ; la variable centrale devient la distance et le comportement du prix depuis le lieu.

## Conséquence pour les MW

Les MW doivent raconter des campagnes causales :
« lieu détecté à X → réaction à T+N → déplacement de Y $ → conversion/persistance → admission/refus »,
plutôt qu'une succession de snapshots WHERE/turning/dominance sans relation temporelle.

## Statut

[DÉMONTRÉ] Le contrat actuel WHERE est asymétrique entre STRUCTURAL_REASSERTION et PHASE_CONTINUATION.
[DÉMONTRÉ] Un trade perdant récent illustre une entrée tardive à +267,9 $ du dernier WHERE et sans turning frais.
[DÉMONTRÉ] Un trade gagnant de continuation illustre qu'un RECENT_WHERE proche (1,5 min / ~7 $) peut rester causalement valable.
[AMBIGU] Simplement supprimer CURRENT_WHERE ou prolonger le TTL n'est pas soutenu : les candidats bloqués uniquement par le lieu ont des résultats mixtes.
[HYPOTHÈSE À FALSIFIER] Remplacer le gate spatial binaire par une séquence location→reaction→displacement peut simplifier la décision et restaurer la répartie sans supprimer la notion de lieu.
