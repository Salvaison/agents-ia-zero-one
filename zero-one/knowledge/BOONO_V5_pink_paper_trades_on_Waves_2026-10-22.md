# BOONO Systems — Trades V5 sur Vagues, bandes rose translucide

**22 octobre 2026 — UI uniquement, aucun changement du moteur trading.**

## Demande utilisateur
Superposer les **positions réellement prises par le simulateur V5 PAPER** aux courbes de prix BTC, MCB15 et MCB3 des Vagues, comme les plages V4 bleues, mais en **rose translucent**, pour permettre leur observation comparée. L'utilisateur signale aussi plusieurs attaques E3 UP improductives, une divergence haussière 15m et un MF15 en récupération ; ces interprétations restent des hypothèses visuelles distinctes de cette modification.

## Implémentation
- Authentification conservée. `/api/wave-live` et `/api/wave-snapshot` transmettent un petit tableau `v5PaperTrades` provenant **uniquement** du fichier `data/v5-paper-state.json` ; aucune utilisation de la collection V4, aucune fabrication de position.
- Un V5 trade validé porte `source:'V5_PAPER'`, numéro, direction LONG/SHORT, `entryTs` et `exitTs` UTC en millisecondes, prix entrée/sortie, P&L net modélisé et motif de sortie ; si encore ouvert, `exitTs:null`.
- **Plage verticale rose** `rgba(224,72,151,.15)` et fines limites `rgba(190,53,121,.72)` superposées sur **le prix, Vague 15m et Vague 3m**, depuis l'entrée jusqu'à la sortie. Une position ouverte est prolongée jusqu'à la dernière frame LIVE, sans inventer de clôture.
- Respect exact du mapping d'horodatage prix/MCB existant ; les zones clippées en dehors de la fenêtre visible. La MA200, les courbes, les divergences, les signaux et les plages V4 bleu ciel ne sont pas modifiés.
- Sur la vue Prix, utiliser un overlay sur le canvas **sans modifier le renderer partagé** `shared/boono-chart-renderer.js`, dont les modifications non liées à cette intervention restent intactes.
- Au clic sur une zone rose, le panneau du trade affiche **V5 PAPER #**, direction, prix/heure d'entrée, prix/heure de sortie ou POSITION OUVERTE, P&L net simulé et motif de sortie. Les zones bleues continuent d'ouvrir les résumés et rapports V4 comme auparavant. Le click V5 est prioritaire seulement si V4/V5 se chevauchent.
- La légende « bleu V4 · rose V5 PAPER » est visible même lorsqu'aucun trade V5 n'est encore ouvert. **Ne jamais dessiner une bande fictive** en l'absence de trade.

## Limites et sûreté
- Ceci n'est pas une modification du moteur V5 ni une preuve de sa rentabilité : les traits roses représentent des transactions simulées à partir des décisions du paper trader, pas des ordres financés sur OKX.
- V4.10.10, `cerveau-central`, `boono-v5-shadow`, les stops, les frais et le scénario BOONO-TV demeurent inchangés. Seul `config-server` doit être rechargé.
- L'API existante Vagues conserve ses réponses gzip, et l'ajout V5 est un tableau minuscule, non l'état complet du simulateur.

## Vérifications
- Tests unitaires de source V5 isolée, plages closes/ouvertes, projection X fidèle aux timestamps, limitation aux données V5 paper et transparence rose.
- Régression complète V4+V5 : **76 tests réussis**.
- Test HTTP authentifié sur serveur de test : `/api/wave-live?hours=1` répond 200, retourne `v5PaperTrades:[]` lorsque V5 n'a encore aucun trade, garde les frames MCB et bougies prix. Payload gzip ~28,7 Ko pour la fenêtre d'une heure.
