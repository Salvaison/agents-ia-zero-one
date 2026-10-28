# BOONO Systems — routine permanente de recherche compacte et dossier d'invalidation

**28 octobre 2026 — Amsterdam.** Validation propriétaire : le calcul lourd reste sur Amsterdam ; les conversations ne reçoivent que les agrégats, contrastes, exceptions et points ouverts. Cette discipline est **systématique**, pas réservée au présent audit. Mise en place sans aucun changement aux runners PAPER, ordres, risques, versions de décision ni flux live.

## 1. Pourquoi cette routine existe

Les longs extraits NDJSON, dumps de modules et répétitions de résultats consomment le contexte des discussions. Les analyses approfondies continuent sur le serveur, avec sources et preuves intégrales conservées localement. ChatGPT reçoit une note courte et vérifiable ; la Knowledge Base GitHub conserve les résultats stabilisés et les passations.

Le script `zero-one/scripts/boono-research-brief.py` est l'outil opérationnel en lecture seule. Il n'importe aucun moteur de trading. Les données détaillées et checkpoints sont conservés dans `zero-one/data/research-briefs/` (ignoré par Git) ; le compte rendu des découvertes et décisions est versionné dans `zero-one/knowledge/`.

## 2. Routine obligatoire pour CHAQUE enquête BOONO

1. **Ouvrir** la dernière passation compacte et les documents ciblés de la KB ; fixer l'objet, les moteurs, la plage de trades, la fenêtre temporelle et la provenance.
2. **Calculer sur Amsterdam** en lecture seule avec filtrage en amont. Ne pas verser des dizaines de milliers de lignes dans la conversation. Si une trace longue est utile, en produire un fichier local, puis ne renvoyer que compteurs, cas exemplaires et incertitudes.
3. **Au premier résultat décisif et après chaque sous-question** : enregistrer un checkpoint structuré (constats confirmés, hypothèses, décisions validées, implémentation, tests, mise en service, questions ouvertes, sources). Le checkpoint doit être actualisé **avant** d'ouvrir une nouvelle branche d'analyse, même si la discussion n'est pas encore saturée.
4. **Rendre une synthèse courte** : 5 à 10 faits pertinents au maximum, chiffres, cas contraires, statut, limites, prochaine question. Si la réponse grossit, renvoyer vers le dossier local ou la KB et conserver les gros tableaux sur Amsterdam.
5. **Avant toute modification active**, identifier le code concerné, distinguer proposition vs validation, prouver par tests les effets attendus ; garder les deux moteurs PAPER distincts. Ne pas transformer une hypothèse historique en vérité d'exécution.
6. **Au jalon et avant une passation** : transférer l'état utile et les preuves dans `zero-one/knowledge/`, faire un commit Git ciblé, vérifier le commit distant. Ne jamais seulement compter sur l'historique du chat. La KB ne doit pas contenir de secrets ou de flux volumineux.

La routine est **déclenchée par chaque enquête / jalon**, et non par un cron de trading ou des relances permanentes. Elle ne crée aucune surveillance ni aucun nouvel ordre.

## 3. Commandes réutilisables

Depuis la racine du dépôt :

```bash
# Un seul extrait court pour tous les trades V5 arrêtés à #85 :
python3 zero-one/scripts/boono-research-brief.py invalidation --first 1 --last 85 \
  --prefix invalidation-20261028-t85 --save

# Dossier actif durable : à mettre à jour immédiatement après chaque constat :
python3 zero-one/scripts/boono-research-brief.py checkpoint \
  --topic "Invalidations V5 — transferts de territoire" --reset \
  --confirmed "40/85 trades V5 ont franchi le niveau d'invalidation, selon MAE." \
  --open "Rejouer la chronologie as-of de #75 et #80."

# Lecture minimale en début de nouvelle discussion :
python3 zero-one/scripts/boono-research-brief.py show
```

Le checkpoint accepte `--confirmed`, `--hypotheses`, `--validated`, `--implemented`, `--tested`, `--deployed`, `--open`, `--sources`, répétables. Par défaut il complète le sujet existant ; `--reset` est obligatoire pour changer de sujet. L'affichage est plafonné (environ 3–4 k caractères), mais les sources détaillées ne sont pas tronquées sur Amsterdam.

## 4. Audit initial réellement exécuté

**Sources** : `data/v52-paper-trades.ndjson` (85 trades clôturés, #1 à #85), `../data/mcb-live/mcb_3m.csv` (3m confirmées), rapports `BOONO_audit_comparatif_V543_V494_gainfloor_sorties_2026-10-28.md` et `BOONO_V543_maturite_offensive_causale_2026-10-27.md`. Anciennes versions V5.3.3 à V5.4.3 ; ne pas présenter cette cohorte comme une performance strictement V5.4.3.

| Indicateur constaté | N |
|---|---:|
| Positions closes V5 avec niveau d'invalidation exploitable | 85 |
| MAE adverse ayant dépassé le niveau d'invalidation fixé à l'entrée | 40 |
| Parmi elles, trades finalement nets > 0 $ | **5** |
| Parmi ces cinq, trades nets ≥ +1 $ | **1** |
| Parmi les 40 franchissements, ≥2 clôtures 3m adverses consécutives | **8** |
| Parmi ces huit, trades nets > 0 $ | **1 : #75, +0,08 $** |

Les cinq exceptions :

| Trade | Version d'entrée | Excès adverse au-delà du seuil (cours BTC $) | Clôtures 3m adverses | P&L net |
|---|---|---:|---:|---:|
| #18 | V5.3.3 | 6,3 | 0 | +1,75 $ |
| #59 | V5.4 | 1,4 | 0 | +0,16 $ |
| #72 | V5.4.1 | 2,8 | 0 | +0,18 $ |
| #75 | V5.4.1 | 33,6 | 3 consécutives | +0,08 $ |
| #80 | V5.4.3 | 63,0 | 1 | +0,10 $ |

**Interprétation :** une MAE au-delà d'un niveau ne révèle pas à elle seule une acceptation durable de ce niveau par le marché. Pour #18, #59 et #72, aucune clôture 3m adverse confirmée ; #80 a une clôture ; #75 en a trois consécutives. Les quatre derniers trades protégés rapportent seulement 0,08 à 0,18 $ net : ils ne démontrent pas une bonne économie du maintien malgré l'invalidation. L'hypothèse d'un stop au premier tick reste non validée : quelques franchissements furtifs seraient des faux positifs.

**Limites** : données rétrospectives ; seuil fixé à l'entrée ; mesures MAE intégrées par le ledger, pas horodatage du tick extrême ; les OHLC 3m ne reconstruisent pas l'ordre intrabougie ; les clôtures comptées sont entièrement confirmées pendant la position ; on ne déduit ni gains de replay ni déclenchement exécutable à un niveau théorique.

## 5. Tests et gouvernance

- **Implémenté :** outil `scripts/boono-research-brief.py`, stockage compact et preuves locales, suivi de recherche par catégories distinctes.
- **Tests :** `python3 -m unittest zero-one/tests/research/test_boono_research_brief.py -v` — **6 tests réussis le 28/10** : wick vs clôture, confirmation temporelle, discontinuité 3m, doublons, sens d'invalidation, distinction des statuts de passation.
- **Mis en service :** routine d'analyse documentaire et de compression uniquement (exécution manuelle à chaque enquête/jalon).
- **Non mis en service :** aucune règle de sortie V5 ni aucun stop nouveau ; runners V5/V4 inchangés.

## 6. Questions ouvertes prioritaires

1. Rejouer précisément la chronologie de #75, #80 et des huit grosses pertes #65, #66, #68, #71, #73, #77, #78, #79 : franchissement, réponse prix, tentative MCB15, MF, PM et retest MA, seulement avec preuves disponibles à chaque instant.
2. Comparer une alerte immédiate d'invalidation puis un EXIT multi-preuves de transfert de camp avec une protection d'urgence sur forte excursion rapide ; vérifier le risque des « mèches » et les pertes déjà consommées.
3. Évaluer le net par campagne, les faux positifs, le drawdown et les frais dans un shadow d'exécution, **sans changer les moteurs PAPER actifs**.
4. Faire tenir les prochains résultats et questions dans le checkpoint puis la KB avant saturation du chat.

**Décision validée :** mettre en oeuvre une routine permanente de recherche compacte. **Hypothèse non validée :** remplacer la logique actuelle de sortie par l'invalidation structurelle. La distinction est explicite pour toute passation ultérieure.
