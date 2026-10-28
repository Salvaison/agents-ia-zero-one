# Passation — 12 au 26 août 2026

*Compte rendu de la période écoulée depuis le rapport du 12/08. Analyses, développements, incidents et état actuel.*

---

## Ce qui a le plus compté

Trois choses dominent cette quinzaine, et elles se tiennent.

**Une méthode d'analyse a été corrigée.** Pendant une semaine, les mesures ont été faites en moyennant des milliers de relevés — et toutes plafonnaient autour de 0,10 de corrélation. Benjamin a nommé le défaut le 20/08 : *« tu cherches des constantes statistiques sur des flux alors que nous cherchons les cas qui sortent des moyennes, les événements »*. Le système a été construit pour donner une vision claire des **extrêmes de prix** ; toute analyse doit partir de là. Le reste n'est que progression, qui n'intéresse que si l'on se trouve dans un lieu.

L'effet a été immédiat. La même donnée qui donnait 53% de justesse sur l'ensemble en donne **83% quand on ne regarde que les moments où les deux timeframes désignent le même extrême**.

**Une confusion de timeframe a faussé des jours de travail.** L'audit et le moteur lisaient les colonnes MarketCipher du 3m alors que la stratégie se décide sur le 15m. Benjamin l'a repéré le 20/08 : *« trading sur le 15 et data du 3 ! »*. Toutes les analyses de MoneyFlow et de BW faites les 19 et 20/08 décrivaient le mauvais timeframe et sont à refaire.

**Le système entier a migré vers Amsterdam.** L'iMac collecteur est éteint, New York est arrêté. Tout tourne désormais sur le VPS européen, ce qui était nécessaire pour l'exécution OKX.

---

## Les sept lois

Formulées par Benjamin le 20/08 après une semaine d'observation, elles remplacent l'empilement de conditions par une chaîne ordonnée.

**LOI 0** — le VWAP15 se lit en permanence. Il donne le cadre, n'ordonne rien.

**LOI 1** — vigilance quand le Vslope15 entre dans la zone neutre ou la traverse, **ou** quand un lieu est actif. La vigilance n'est pas une décision, c'est un changement d'état.

**LOI 2** — en vigilance seulement, le bot ouvre le 3m. Hors vigilance, il n'est jamais consulté : il ne sert qu'aux retournements, ce qu'il est seul à voir et ce qui le rend inutilisable en régime établi.

**LOI 3** — les oscillations du 3m ne valent que si elles s'accordent au MoneyFlow 15m et au BW 15m, qui portent la tendance de fond. La direction se forme par corrélation de dW3, dW15 et Vslope3.

**LOI 4** — E3 et E15 doivent désigner le **même extrême de prix**. C'est la loi la mieux étayée.

**LOI 5** — l'événement donne le **moment**, jamais la direction. Cadence d'abord ; à défaut, priceMove.

**LOI 6** — bypass du retournement violent. La cadence n'y fonctionne pas : elle sature ou arrive trop tard. Quatre éléments simultanés court-circuitent les lois 3 à 5.

*Document complet : `lois-du-bot-200826.md`.*

---

## Ce que les mesures ont établi

### Le filtre décisif — la coïncidence des timeframes

Sur les moments de signal MCB 3m, en distinguant selon que le 15m désigne ou non le même extrême de prix :

| Configuration | n | Mouvement à 15 min | Justesse |
|---|---|---|---|
| **15m désigne le MÊME extrême** | 24 | **+78 USD** | **83%** |
| 15m proche, autre extrême | 5 | −19 USD | 40% |
| aucun 15m à proximité | 64 | −29 USD | 42% |
| *tous signaux 3m confondus* | *93* | *−1 USD* | *53%* |

Le signal 3m seul ne vaut rien. C'est la convergence qui décide.

### Le VWAP15 en niveau, pas en écart

L'écart VW15L moins VWAP15 avait été mesuré à +0,228 de corrélation le 18/08. Le 19/08, il s'effondre à **+0,027** — et il est resté négatif pendant toute une hausse de 3600 USD, indiquant short en pleine montée.

Le **niveau** du VWAP15, lui, a suivi la poussée sans faute : de −2,30 à 16h00 jusqu'à +10,65 à 17h30, culminant exactement au sommet, puis −2,10 à 18h00 quand le prix s'est retourné. Benjamin : *« je valide entièrement la stratégie de suivre VWAP15, les mouvements décrits sont des mouvements visibles du prix »*.

### La saturation d'événements

Proportion de bâtons portant `cadenceMult ≥ 2` :

| Régime | Taux | Exemple |
|---|---|---|
| calme | 2 à 6% | 19h–21h le 19/08 |
| actif | 10 à 16% | 08h–10h le 20/08 |
| **cascade** | **34 à 48%** | 14h–17h le 19/08, +2621 USD en une heure |

À 40%, un événement ne signale plus rien — c'est le bruit de fond. Une règle de sortie sur événement se déclenche à chaque bâton. Hypothèse de Benjamin, confirmée par la mesure.

### En tendance forte, seuls les signaux du sens de la tendance

Sur la montée du 19/08, quinze signaux de magnitude supérieure à 45 :

| Type | Réussis | Échoués |
|---|---|---|
| creux | **5** | 1 |
| pic | 2 | **7** |

Les pics échouent massivement — celui de 17h15 à magnitude 96 était suivi de +1893 USD. Le filtre de magnitude ne discrimine rien : les plus forts sont les pires.

### L'impact par transaction

En rapportant l'amplitude aux 200 ticks de la fenêtre :

| Fenêtre | cadence/s | USD/transaction |
|---|---|---|
| calme | 3,0 | 0,058 |
| cascade | 221,1 | 0,090 |
| **blocage post-cascade** | **23,1** | **0,093** |

Peu de transactions à fort impact — signature d'un carnet d'ordres appauvri après la cascade, plutôt que de petits participants. Piste mise en réserve : mesurer la **taille** des transactions via le champ `sz` du canal `trades` d'OKX, reçu mais non agrégé.

### Le BW et le MoneyFlow aux extrêmes

⚠ *Ces mesures portaient sur le 3m alors qu'on raisonnait 15m. À refaire.*

Le motif observé reste noté pour vérification : au creux, le MoneyFlow touche son plancher **en même temps que le prix** et remonte aussitôt, tandis que le BW continue de descendre quatre minutes de plus. Attendre le BW coûterait environ 80 USD sur un mouvement de 133.

---

## Le détecteur de lignes imaginaires

Repris en profondeur du 16 au 20/08, jusqu'à la version 5.

**Les corrections successives** : chaîne consécutive bornée au premier pivot qui rompt plutôt que rejet complet ; coexistence des lignes concurrentes jusqu'à ce que le prix tranche ; reconfirmation à deux ancres ; auto-ajustement par moindres carrés avec résiduel mesuré sur les prix d'origine ; deux sources de pivots — signaux MCB et extrema locaux du prix.

**La correction décisive du 19/08** : la recherche ne trouvait que les lignes dont la projection actuelle passe par le prix courant. Une résistance descendante que le prix n'a pas encore rejointe échappait donc à la détection — alors que c'est le cas le plus intéressant. Ajout d'une **recherche par paires de pivots passés**, sans contrainte de prix courant.

Résultat immédiat : la grande résistance descendante apparaît avec ses trois sommets à **1,5 USD de dispersion** — la ligne la plus nette du catalogue.

Le 20/08, Benjamin confirme : *« Luigi vient de confirmer sa présence au dernier pivot avec perfection, le prix est maintenant défini entre un support et une résistance »*. Le détecteur a aussi produit un triangle de consolidation complet sans qu'aucune reconnaissance de figures n'ait été codée.

**Reste ouvert** : un plafond d'extrapolation. Le catalogue contient des lignes à +183 USD/h projetant 7676 USD sous le prix — elles ont cessé de décrire quoi que ce soit.

---

## Le moteur Boono

Construit le 19/08 comme second simulateur, en **lecture seule**, tournant en parallèle de la logique de production pour comparaison.

**Version 1** — direction issue des écarts VWAP, maintien issu du régime MCB. Défaut structurel : les deux sources se contredisant, il ouvrait sur l'une et fermait sur l'autre au cycle suivant. Résultat, des trades de **trente secondes à 0,03%**, sous le seuil de rentabilité des frais.

Benjamin, le 20/08 : *« si l'on doit mettre un garde-fou à ne rien faire 5 min après une entrée, c'est que les lois sont à l'envers »*. Le garde-fou masquait le symptôme au lieu de corriger la cause.

**Version 2** — réécriture complète selon les sept lois. Tout sur le 15m, chaque loi en fonction nommée, bypass testé avant la chaîne. Le garde-fou de durée a disparu : direction et maintien venant tous deux du 15m, l'oscillation ne peut plus se produire.

**Dimensionnement** : 1% de 1000 USD à levier 10, soit 100 USD de notionnel. Trois lectures affichées — pourcentage, dollars sur le notionnel, et pourcentage de marge.

**État au 26/08** : 50 sorties, +1,14%, 58% gagnantes. **La sortie `VWAP15` perd systématiquement** — 31 occurrences pour −1,37 USD contre 18 tranches à +2,57. C'est elle qui plombe le résultat, probablement un seuil trop bas qui la fait osciller.

---

## Les incidents et leurs causes

### Le repaint MarketCipher — corrigé à la source

Le CSV 15m contenait 21 signaux pour une journée où Benjamin en comptait trois significatifs. Et par paires absurdes : un pic à 95,61 à 13h30, un creux à 93,93 à 14h00. Un pic et un creux ne peuvent pas se produire à la même hauteur.

**Cause** : `SETTLE_DELAY_MS` valait 2 secondes. Or MarketCipher peint son point à l'**ouverture de la bougie suivante** mais l'attribue à la précédente — et cette ouverture prend 10 à 20 secondes. Le collecteur écrivait donc l'état transitoire, puis le vrai signal arrivait sur la bougie suivante et était écrit à son tour.

**Correction** : délai porté à **35 secondes** sur les deux collecteurs. Le mécanisme d'attente existant acceptait déjà les mises à jour pendant ce délai — il suffisait d'allonger.

Benjamin a confirmé le 20/08 que `E15` se comporte désormais très bien, marquant les oscillations 15m à **neuf dollars près**.

### La confusion 3m/15m

`liveBw`, `liveMoneyFlow`, `liveLbw`, `liveDbsiTop` venaient tous de `mcb_3m_live.csv`. Les champs 15m existaient dans le bâton depuis le début — calculés, écrits, jamais affichés.

**Corrigé** : le panneau VAGUE affiche `DBSI15`, `MF15`, `BW15`, `LBW15` ; le moteur lit `live15MoneyFlow` et `live15Bw`. Quatre champs manquaient aussi dans le bloc d'historique du bâton, ajoutés.

### L'onglet dupliqué

Le watchdog Chrome n'avait **qu'une seule URL** pour tous les onglets, avec le mauvais symbole (`BTCUSD.P` sans le T) et sans paramètre d'intervalle. Il recréait donc fidèlement un onglet inutile après chaque redémarrage, et les deux collecteurs se disputaient l'unique onglet valide — `tab2` refusant d'écrire pendant des heures avec `INCOHERENCE TF`.

**Corrigé** : trois URL distinctes, contrôle de chaque onglet par son intervalle plutôt que par comptage.

### Le 405 de Chrome

Le watchdog ouvrait les onglets par `GET /json/new`. Chrome exige un **PUT** depuis la version 111 — les appels échouaient silencieusement. Corrigé.

### La soirée perdue du 25/08

L'audit affichait des données figées sur toutes les colonnes sauf le prix. Benjamin a donné la bonne hypothèse dès le début : *« l'audit attend encore les données de la collecte de l'iMac »*.

**Cause réelle** : il consultait `161.35.61.241` — **New York**, dont les processus avaient été arrêtés la veille. Le prix et le priceMove continuaient de bouger parce qu'ils viennent d'OKX en direct.

J'ai cherché une heure dans le code au lieu de vérifier quelle machine il regardait. Erreur coûteuse en temps et en argent.

### Les alertes Telegram

Le watchdog signalait `chrome-watchdog` comme arrêté. **Faux positif** : ce processus s'exécute par cron toutes les cinq minutes puis se termine — son statut normal entre deux passages est `stopped`. Exception ajoutée.

---

## La migration vers Amsterdam

Décidée parce que l'iMac devait s'éteindre et que l'exécution OKX exige une IP européenne.

**L'obstacle principal** : se connecter à TradingView depuis Amsterdam modifiait la mise en page partagée `2AqpEMfD` et cassait la collecte. Résolu par l'achat d'un **plan Essential** permettant une seconde mise en page — `qljTf3vu`, dédiée à la TA de Benjamin, isolée de celle des collecteurs.

**Ce qui a été transporté** : le code par GitHub (avec génération d'une clé de déploiement pour Amsterdam), le `.env`, les niveaux et scénarios, l'historique des CSV fusionné avec les nouvelles bougies.

**Ce qui a changé** : `launchd` remplacé par PM2 ; `sync-vps.sh` supprimé, les collecteurs écrivant directement dans `data/mcb-live/` ; le watchdog Chrome réécrit pour Linux.

**Les points de blocage rencontrés** : `chrome-remote-interface` manquant ; `CONFIG_UI_PASSWORD` et `SESSION_SECRET` absents du `.env` — et le module les cherchant deux niveaux au-dessus, à la racine du dépôt ; le mode `--headless=new` empêchant toute interaction.

**L'accès distant** : Secure Shell ne parvenant pas à importer une clé privée malgré plusieurs tentatives, l'authentification par mot de passe a été activée, protégée par `fail2ban` — qui a banni trois adresses dans les minutes suivant son installation. L'écran est accessible par **noVNC** à travers le tunnel, ce qui fonctionne aussi depuis un téléphone.

**Vérifié le 26/08** : après redémarrage complet du serveur, les treize processus reviennent seuls et la session TradingView survit.

---

## Où nous en sommes

**Ce qui tourne** — treize processus sur Amsterdam : sept pour le cœur du système, trois pour la collecte, trois pour l'accès distant. Redémarrage automatique vérifié.

**Ce qui est acquis** — les sept lois, la règle de méthode fondée sur les extrêmes, la coïncidence des timeframes comme filtre décisif, le VWAP15 en niveau, le settle à 35 secondes, le détecteur v5 avec recherche par paires.

**Ce qui reste à faire** :

La sortie `VWAP15` du moteur perd systématiquement — c'est le premier réglage à revoir.

Les analyses de MoneyFlow et de BW sont à refaire sur les colonnes 15m.

Les seuils de la loi 3 — dW15, dW3, Vslope3 — décident de la direction et **aucun n'est mesuré**. Si le moteur s'abstient toujours pour « voix contradictoires », c'est là qu'il faudra regarder.

Le plafond d'extrapolation du détecteur.

Le passage de la collecte de Bybit à OKX, pour uniformiser les sources — décidé mais non fait, il faut d'abord vérifier le symbole exact sur TradingView et mesurer la discontinuité que ça créera dans l'historique.

Le branchement de `okx-executor.js` sur le moteur, et la régénération des clés API avant tout financement du compte.

---

## Ce qu'il faut se rappeler

**Les corrélations mesurées sur 24 heures ne tiennent pas d'un jour à l'autre.** Le MoneyFlow est passé de −0,069 à +0,222 en une journée. Aucune règle ne devrait être fondée sur une seule journée de mesure.

**Vérifier la source avant de mesurer.** Une analyse sur la mauvaise colonne produit des conclusions cohérentes et fausses — c'est arrivé deux jours durant.

**Écouter l'hypothèse de Benjamin avant de chercher ailleurs.** Elle était juste sur le repaint, sur la confusion 3m/15m, sur la saturation d'événements, et sur l'audit qui pointait vers l'ancienne machine.
