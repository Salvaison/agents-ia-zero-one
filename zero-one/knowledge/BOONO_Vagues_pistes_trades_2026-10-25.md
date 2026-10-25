# BOONO Systems — Vagues : pistes de trades par moteur
Date : 25 octobre 2026, Amsterdam.

## Décision de présentation validée
Trois graphes sont concernés : prix BTC (bougies), VAGUE 15m, VAGUE 3m.

Supprimer les fonds de trades colorés sur toute la hauteur des trois graphes. Ils rendaient les oscillateurs et le prix illisibles lorsque les opérations PAPER V5 et V4.9.3 se chevauchaient.

Pour chaque graphe, conserver les fines lignes verticales aux vraies heures d'entrée et de sortie, et afficher seulement deux bandes de 10 px à l'intérieur de la surface du graphe :
- **En haut, bleu ciel #87cde9 : V4.9.3 PAPER** (comparateur).
- **En bas, rose #e98bc2 : V5.3.3 PAPER**, et les opérations antérieures V5 du même ledger.

La longueur de chaque bande représente l'intervalle réel de position, de l'entrée à la sortie. Une position encore ouverte continue jusqu'au temps LIVE du graphe. Si l'entrée se trouve avant le début de la fenêtre visible, n'afficher que la portion visible sans inventer de ligne d'entrée à sa limite. Même règle pour les sorties en dehors de la fenêtre. Le chevauchement des moteurs ne mélange plus les couleurs : chacun possède sa piste fixe.

## Interactions conservées
Toucher la bande supérieure sélectionne le trade V4.9.3 ; toucher la bande inférieure sélectionne le trade V5. Les identités V493:n / V52:n, détails historiques, prix, direction, PNL et bouton RAPPORT restent inchangés. Les zones tactiles de la bande sont légèrement élargies verticalement pour l'usage téléphone, mais l'épaisseur effectivement colorée reste de 10 px.

Le mode archives V4, lorsqu'il est explicitement demandé, conserve de fines lignes gris neutre aux entrées/sorties, **sans ajouter une troisième plage colorée**.

## Modifications techniques
- `modules/config-server.js` : fonction commune `wavePaintV5Bands` refaite en deux pistes fixes et deux traits d'entrée/sortie, utilisée sur tous les graphes ; fonction `wavePaintLegacyTradeLines` uniquement pour les marqueurs historiques.
- Le graphique prix appelle `window.BoonoCharts.drawPrice` avec `tradeSpans:[]`, pour éviter toute teinte de fond dans le renderer partagé, puis applique les pistes en surimpression.
- `drawWaveBand` pour 15m et 3m supprime les anciennes zones plein-hauteur, puis applique les pistes après le tracé MCB/MF afin d'assurer leur visibilité.
- `tests/v5/v5-wave-pink-spans.test.js` : vérifie l'épaisseur 10 px, la position Y fixe de chaque moteur, le clic non ambigu pendant chevauchement, les marqueurs entrée/sortie, les fenêtres tronquées et les 3 graphes sans grandes plages colorées.
- Le renderer partagé `shared/boono-chart-renderer.js` est volontairement **inchangé** pour ne pas toucher BOONO-TV et les autres usages du renderer.

## Gouvernance
Aucune modification des règles MCB/MF/MA, des admissions, des protections, du ledger PAPER, des trades enregistrés, des ordres financés, du laboratoire X-Perp A/B/C ou des processus des moteurs V5.3.3/V4.9.3/V4.10.10.

## Contrôle et déploiement
- Avant redémarrage : 173 tests V4/V5 exécutés, **169 réussis, 0 échec, 4 ignorés** faute d'Audit historique encore disponible.
- Le JavaScript authentifié `/app.js` a été extrait et compilé avec succès ; la fonction de pistes est présente et le renderer prix ne reçoit plus les plages.
- Déploiement, contrôle PM2 et commit GitHub à compléter.

## Déploiement confirmé
- Ancien fichier `config-server.js` sauvegardé dans `/root/boono-waves-fullheight-before-20261025.js` avant redémarrage.
- Les **173 tests V4/V5** se terminent sans échec : 169 réussis, 4 replays historiques ignorés faute de données Audit anciennes. Les six tests spécifiques aux bandes sont réussis.
- Le JavaScript du client authentifié a été extrait de `/app.js` puis compilé sans erreur, avec `tradeSpans:[]` pour le graphe BTC et les bandes top/bottom dans le même renderer de page.
- **Seul `config-server` a été redémarré.** Il est en ligne sur le port 80 et les routes privées retournent bien HTTP 302 hors session.
- V5.3.3 PAPER, V4.9.3, V4.10.10, BOONO-TV et Execution Lab A/B/C sont restés actifs, sans modification des trades ni des stratégies.
- Le rendu sur le navigateur authentifié de l'utilisateur n'a pas été inspecté visuellement : demander un rafraîchissement dans l'onglet Vagues pour vérifier le rendu final.
