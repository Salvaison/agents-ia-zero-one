# Passation — session des 10-12 août 2026

*Rédigé le 12 août 2026, en vue du changement de discussion.*

Ce document a deux objectifs distincts :
1. **Consigner ce qui a été fait et appris**, pour que rien ne se reperde
2. **Cartographier les méthodes de travail**, parce que c'est ce qui se perd le
   plus systématiquement entre deux conversations — et qui coûte le plus cher

---

# PARTIE I — LES PHASES DE LA SESSION

## Phase 1 — Retour de randonnée, diagnostic du collecteur (10/08 matin)

Benjamin rentre après cinq jours d'absence. Le collecteur 3m « moulinait » :
processus vivant, mais CSV figé depuis 17 minutes.

**Cause** : le processus tournait sans écrire. Résolu par un redémarrage propre.

**Leçon** : un processus vivant n'est pas un processus qui fonctionne. Le
watchdog surveillait la fraîcheur des fichiers, pas leur complétude.

## Phase 2 — Bilan de la semaine d'absence

**+295,47 %** sur 141 cycles, 60 % de gagnants, ratio gain/perte 1,75. Le
système a tourné seul sans intervention.

Question soulevée par Benjamin : le pivot MCB a-t-il nui ? Les cycles fermés
par pivot totalisaient −49,9 % contre +345,3 % pour les autres.

**Mesure** : à conditions comparables (positions n'ayant pris aucune tranche),
le pivot fait **−2,40 %** contre **−2,86 %** pour les autres mécanismes. Il ne
détruit pas de valeur — il constate des trades déjà mal engagés.

**Leçon méthodologique majeure** : une corrélation forte (−49,9 % vs +345,3 %)
peut disparaître entièrement quand on compare à conditions égales. Toujours
chercher la variable cachée avant de conclure à une causalité.

## Phase 3 — Le manque d'entrées (10/08 après-midi)

Benjamin constate que le bot rate des mouvements évidents. Analyse des moments
clés qu'il désigne sur son graphique :

| Moment | Cadence | netMove | déplacement 5min |
|---|---|---|---|
| 11:50 | 1,81× (sous seuil 2×) | 0,045 % (sous 0,06) | **−0,141 %** |

Les deux capteurs du bot étaient aveugles à un mouvement réel mais
**progressif**. Mesure : 148 événements cadence contre 396 déplacements ≥ p90
sur 24h, dont seulement 103 communs — **293 occasions invisibles**.

**Correctif** : `displacementPct` devient une seconde voie d'ouverture de
vigilance. Seuil 0,084 puis abaissé à 0,067 (+30 % de déclenchements).

## Phase 4 — La pente VWAP, construite de bout en bout

Constat : les pentes affichées n'étaient pas des pentes instantanées mais la
**dernière variation figée** entre deux clôtures — 18,2 min pour le VWAP15,
5,0 min pour le VWAP3.

**Chaîne construite** : capture intra-bougie côté iMac (snapshot 15s) → rsync
→ historique glissant côté VPS → régression linéaire sur 8 points, normalisée
par minute.

**Mais** : la pente ne prédit pas la direction du prix. VWAP3 à **46,0 %**
(moins bien que le hasard), VWAP15 à 56,4 %. Le remplacement de la stratégie
du passage à zéro par la pente a donc été **abandonné** malgré son attrait
conceptuel.

## Phase 5 — Inventaire complet (11/08)

Recensement de toutes les conditions actives, en observation ou mortes.

**Deux découvertes** :
- Le filtre pivot d'entrée ne bloquait **rien** depuis le matin (0 blocage sur
  57 candidats) — le passage de `maxAgePivotCandles` de 3 à 1 l'avait désactivé
  sans qu'on le sache
- `wavePivotType`, le mécanisme qui pilote réellement les blocages, n'était
  **écrit dans aucun des 2880 relevés d'audit** depuis le 4 août. Ce que
  Benjamin voyait dans la colonne « Pivot » était un autre mécanisme, calculé
  côté client sur le VWAP3

**Leçon** : deux mécanismes différents portant le même nom rendent le système
illisible. Ce qui décide doit être visible.

## Phase 6 — Le bâton devient prédictif

Constat : 44 % des pics de cadence ≥ 3× ne débouchaient sur rien, alors que le
prix bouge presque deux fois plus après un pic.

**Le résultat qui change tout** — quelle direction prend le prix après un pic :

    sens du netMove courant      36,4 %   ← pire que le hasard
    sens du déplacement 5 min    38,6 %   ← pire que le hasard
    OPPOSÉ du déplacement        61,4 %   ← le seul exploitable

**Un pic de cadence marque un retournement, pas une continuation.** C'est le
principe de rééquilibrage formulé par Benjamin le 31/07, validé pour la
première fois.

Puis deux idées de Benjamin, testées, font mieux :
- **Second pic rapproché** : **75 %** (n=20), stable de 4 à 20 cycles de fenêtre
- **Attendre la confirmation directionnelle** : 62,5 % (n=48)

Et la prédiction par **essoufflement** : aucun signal isolé ne dépasse 57 %,
mais déplacement fort + cadence essoufflée = **70,7 %**, déplacement fort +
pente plate = **79,3 %**.

## Phase 7 — Les deux LONG à −12 % et la hiérarchie directionnelle (11/08 soir)

Deux LONG à contresens en une heure pendant une chute continue : −11,52 % et
−12,28 %. Tous les indicateurs de pente pointaient vers le haut — parce
qu'ils reflétaient le passé.

**Décision de Benjamin, sur des années d'observation** : le dernier point
confirmé de la vague MCB **15m** définit le sens autorisé. Pic = shorts
uniquement, creux = longs uniquement.

Puis, après un SHORT à −3,23 % pris alors que le VWAP3 remontait déjà :
**abstention sur désaccord** — si le signe du VWAP3 contredit le régime, on
n'entre dans aucun sens.

**Validation croisée exceptionnelle** : sur 27h, Benjamin compte 14 points sur
son graphique MarketCipher ; la détection en trouve **exactement 14**, dont 7
significatifs au seuil d'amplitude 2,0 — précisément son comptage.

## Phase 8 — La refonte de l'audit

La colonne Signal montrait des badges calculés côté navigateur avec des seuils
sans rapport avec ceux du bâton. Refondue pour afficher les **vrais**
événements et les **vrais** trades avec leur motif.

## Phase 9 — Le défaut de collecte (11/08 nuit → 12/08)

Découverte majeure : **10 % des bougies 15m manquent**, avec des pointes à
49 %. Trous systématiquement de **30 minutes**, jamais 45 ou 60.

| Période | Trous |
|---|---|
| 16–29 juillet | 0–1 % |
| 30–31 juillet | 10 % puis 24 % |
| 1er–11 août | 10 à 49 % |

**Hypothèses explorées et écartées** :
1. Les redémarrages de patchs → infirmé : du 4 au 9 août, sans aucune
   intervention, le taux restait entre 21 % et 49 %
2. La rotation entre timeframes → infirmé : elle existait déjà en juillet
3. Les doublons de processus → semblait résolu, mais le problème est revenu
4. Le WebSocket non rebasculé → infirmé par lecture du code (`wsMap` est une Map)
5. Le watchdog Chrome relançant sur Bybit → infirmé : aucune trace dans les scripts

**Mécanisme observé** : le WebSocket TradingView se ferme ~4 min après chaque
démarrage, le collecteur reste aveugle jusqu'au timeout de 30 min, redémarre,
rattrape **une seule** bougie, et le cycle recommence. D'où les trous de 30 min.

## Phase 10 — La bascule Bybit (12/08)

Décision de Benjamin : basculer toute la chaîne sur Bybit plutôt que de
rustiner. Réécriture complète de `price-stream.js` pour le protocole Bybit V5.

**Résultat** : le flux fonctionne, mais **le problème de collecte persiste** —
un `FATAL` supplémentaire en conditions stables. La cause n'était pas MEXC.

**Découverte au passage** : `api.bybit.com` renvoie **403 CloudFront** depuis
le VPS new-yorkais — Bybit bloque l'accès depuis les États-Unis. Le WebSocket
public fonctionne, mais l'API REST est inaccessible : **l'exécution live sur
Bybit serait impossible depuis ce VPS**.

---

# PARTIE II — LES MÉTHODES DE TRAVAIL

*C'est la partie qui se perd le plus entre deux discussions, et qui a le plus
de valeur.*

## 1. La règle fondamentale : mesurer avant de coder

**Aucune règle n'est implémentée sans avoir été mesurée sur les données
réelles.** Ce principe a été établi après le désastre du 31/07 (−189 %), causé
par une règle codée sans recul.

Exemples de cette session :
- L'idée « pente plate = apogée » : mesurée à 60 %, jugée insuffisante,
  **non implémentée**
- L'idée « attendre la confirmation » : mesurée à 62,5 % contre 58,3 % pour
  l'alternative, **implémentée**
- Le filtre de tendance VWAP15 du 3 août : mesuré, il aurait bloqué le plus
  gros gain de la session (+27,64 %), **abandonné**

**Le corollaire** : quand les données ne permettent pas de trancher, on le dit
et on n'implémente pas. Plusieurs fois cette session : « je ne peux pas
conclure sur 9 observations ».

## 2. L'exception assumée : le jugement de Benjamin

Certaines règles reposent sur son expérience plutôt que sur les mesures — et
c'est explicitement documenté comme tel.

Le filtre de régime de la vague 15m n'était validé que sur 9 pivots. Il a été
implémenté sur la base de « plusieurs années d'observation manuelle », avec la
réserve écrite dans le code **et** dans `config.json`.

**La règle** : quand on code sur intuition plutôt que sur mesure, on l'écrit
noir sur blanc, avec un interrupteur pour désactiver à chaud.

## 3. Le workflow de patch — jamais d'écriture à l'aveugle

Chaque modification passe par un **script Python** qui :

1. Lit le fichier cible
2. Vérifie que le texte à remplacer existe **exactement une fois**
   (`assert n == 1`)
3. N'écrit **que si toutes les vérifications passent**
4. Affiche ce qui a été fait

```python
n = src.count(old)
assert n == 1, f"bloc introuvable ou trouve {n} fois. Rien ecrit."
```

**Pourquoi c'est vital** : sur cette session, plus de la moitié des patchs ont
échoué à leur première tentative (ancre inexacte, ligne vide manquante,
indentation différente). **Aucun n'a laissé un fichier à moitié modifié.**

**Vérification de portée** : depuis le bug `_slopeCfg` qui a planté le bâton,
les patchs vérifient aussi que les variables utilisées sont déclarées **avant**
le bloc inséré. `node --check` ne détecte pas ce type d'erreur.

## 4. La séquence de déploiement, invariable

```
1. Sur le Mac   : scp du patch vers le VPS
2. Sur le VPS   : python3 patchXX.py
3.                node --check modules/fichier.js
4.                python3 -c "import json; json.load(open('config.json'))"
5.                cat data/trade-sim-state.json   ← position ouverte ?
6.                pm2 restart <processus>
7.                vérification du résultat
8.                git add / commit / push
9.                rm du patch
```

**Le point 5 est important** : redémarrer avec une position ouverte est
possible mais mérite d'être su — certains champs en mémoire sont perdus.

**Toujours préciser Mac ou VPS.** C'est la responsabilité de l'assistant, pas
celle de Benjamin. Cette règle a été explicitement demandée après plusieurs
confusions.

## 5. La vérification par les données réelles, jamais par la mémoire

Avant d'écrire un patch, on demande systématiquement le code réel :

```bash
grep -n -A 20 "function xxx" modules/fichier.js
sed -n '450,470p' modules/fichier.js | cat -A
```

Le `cat -A` révèle les caractères invisibles — il a permis de trouver une ligne
vide qui faisait échouer un patch depuis trois tentatives.

**Ne jamais reconstruire une ancre de mémoire.** C'est la cause n°1 des échecs
de patch de cette session.

## 6. Le rythme d'observation

Chaque changement significatif est suivi d'une période d'observation avant
d'en ajouter un autre. Quand plusieurs changements sont faits en même temps
(ce qui arrive), on note explicitement qu'on ne pourra pas isoler leurs effets.

**Les snapshots** sont le support de cette observation :

```bash
cd /root/agents-ia-zero-one/zero-one
cp data/audit-history.json /tmp/audit-snap.json
cp data/trade-sim-history.json /tmp/trades-snap.json
cp data/trade-sim-state.json /tmp/state-snap.json
```
puis `scp` depuis le Mac, puis upload dans la conversation.

## 7. Le dialogue de conception

Le schéma qui a le mieux fonctionné :

1. **Benjamin décrit ce qu'il voit** sur son graphique, souvent avec une
   capture d'écran
2. **L'assistant traduit en hypothèse testable** et la mesure sur les données
3. **Le résultat est présenté sans enjolivement** — y compris quand il
   contredit l'hypothèse
4. **Benjamin tranche**, en tenant compte de la mesure et de son expérience

Ce schéma a produit les meilleurs résultats de la session : la troisième voie
d'action (75 %), la prédiction par essoufflement (70-79 %), le seuil
d'amplitude des pivots (validation croisée à 14 pivots).

**Ce qui ne marche pas** : proposer une solution avant d'avoir mesuré. Plusieurs
fois cette session, une suggestion s'est révélée fausse en quelques minutes de
vérification (le filtre de tendance sur 5-10 minutes, la cause du problème de
collecte attribuée successivement à quatre mécanismes différents).

## 8. La reconnaissance d'erreur

Les erreurs sont signalées immédiatement et sans détour, y compris quand elles
viennent de l'assistant :
- Une erreur de calcul dans un script d'analyse (0,15 $ au lieu de 7,30 $)
- Une confusion horaire qui a produit une fausse alerte sur le cooldown
- Une lecture UTC/Paris erronée qui a fait conclure à tort que Bybit ne
  résolvait rien
- Quatre hypothèses successives sur la cause du problème de collecte, toutes
  fausses

**Le principe** : mieux vaut dire « je me suis trompé » que laisser une
conclusion fausse orienter une décision.

## 9. La documentation comme antidote à l'oubli

`strategy-boono.md` est mis à jour à chaque session significative, avec une
convention de statut : **ACTIF** / **INTENTION** / **PISTE**.

La section **INFRASTRUCTURE** a été créée le 11/08 après avoir constaté que
l'absence d'une information (les collecteurs sont gérés par `launchd`) avait
conduit à créer des doublons plusieurs fois.

**Le test** : « une session future recommencerait-elle cette erreur ? » Si oui,
c'est que ce n'est pas documenté.

## 10. Les précautions de sécurité

- **Jamais de clé ou de token dans la conversation.** Elles vont dans `.env`
  sur le VPS, saisies via `nano` (plus sûr qu'un `echo` pour le copier-coller)
- Une clé exposée est **considérée comme grillée** et doit être régénérée
- Vérification de forme sans révéler la valeur :
  `grep "^CLE=" .env | sed 's/CLE=//' | wc -c`
- Le piège classique : un `$` ou un espace parasite capturé au copier-coller —
  rencontré avec le token Telegram, détecté par `tail -c 3`

---

# PARTIE III — L'ÉTAT AU 12 AOÛT MIDI

## Ce qui tourne

**VPS** (`161.35.61.241`, New York) — trois processus PM2 :
`baton-relay`, `cerveau-central`, `config-server`.

**Mac** — deux collecteurs gérés par `launchd` :
`real-time-collector` (3m) et `tab2-collector` (15m/1h/4h/1d/1w).

**Source de données** : Bybit depuis le 12/08 (`BYBIT:BTCUSDT.P` sur
TradingView, `wss://stream.bybit.com/v5/public/linear` pour les ticks).

**Hiérarchie directionnelle** : régime vague MCB 15m → abstention si le VWAP3
contredit → cooldown 10 min après perte → coupe-circuit −25 %.

**Levier 25x**, module `day` seul, position 1 % du capital.

## Les trois chantiers ouverts, par ordre de priorité

### 1. Reconstruire `tab2-collector` — LA priorité

C'est la cause racine, indépendante de l'exchange. Diagnostic établi :

- Le WebSocket TradingView se ferme ~4 min après chaque démarrage
- Le collecteur reste aveugle jusqu'au timeout de **30 minutes**
- Il redémarre, rattrape **une seule** bougie, et le cycle recommence
- D'où les trous systématiques de 30 minutes

**Correctif immédiat possible** (5 min, sans risque) : réduire le timeout de
30 à ~16 min. Diviserait les trous par deux sans résoudre la cause.

**Ce qu'il faut conserver de l'actuel** :
- Le garde-fou du 15/07 : ne PAS mesurer le silence sur « temps depuis la
  dernière frame » — les heartbeats TradingView le rafraîchissent en
  permanence, ce qui avait causé 6h30 de trou
- Le rattrapage rétroactif au démarrage
- La logique de `pickNext` (garde de clôture imminente, priorité aux
  timeframes non collectés)

### 2. Migrer le VPS vers l'Europe

`api.bybit.com` renvoie **403 CloudFront** depuis New York. L'exécution live
sur Bybit est impossible en l'état.

DigitalOcean ne permet pas de changer la région d'un droplet : il faut un
snapshot, une recréation à Amsterdam ou Francfort, puis reconfigurer.

**À prévoir** : nouvelle IP dans `sync-vps.sh` (Mac), `~/.ssh/config`, PM2 et
son démarrage automatique, les fichiers `.env` (Telegram, Bybit) qui ne sont
pas dans git.

### 3. Trancher Bybit vs MEXC

Le choix de Bybit reposait sur l'hypothèse — infirmée — que MEXC causait le
problème de collecte. La question se repose donc, sachant que :
- Bybit nécessite un VPS hors États-Unis pour l'exécution
- MEXC fonctionne depuis le VPS actuel
- Aucun des deux ne résout le problème de collecte

## Les chantiers de fond, non urgents

- **Calibrer `vwapLiveSlope`** : le seuil « plat » à 1,0 est arbitraire
- **Mesurer les règles du 11/08** : les trois voies d'action tiennent-elles
  leurs 75 % / 62,5 % ? Les motifs `cadence_reversal_double` et
  `cadence_reversal_confirmed` permettent de les isoler
- **`stallPct` étrangle les positions** : sur la nuit du 11-12, 8 sorties sur
  26 par flux éteint, et les 5 cycles perdants sont tous sortis ainsi sans
  avoir pris de tranche. Le seuil adaptatif calcule ~0,07, près du plafond
- **Le watchdog devrait surveiller la complétude**, pas seulement la
  fraîcheur : une alerte « plus de 20 % de trous sur 4h » aurait signalé le
  problème dès le 31 juillet
- **Ce que le système ne sait pas voir** : les comparaisons entre extremums
  successifs — higher low, divergences, touch-retest. C'est la façon dont
  Benjamin lit le marché, et le code n'en fait rien. Prochaine grande brique,
  d'une autre nature que tout ce qui a été fait

---

*Fin du document de passation.*
