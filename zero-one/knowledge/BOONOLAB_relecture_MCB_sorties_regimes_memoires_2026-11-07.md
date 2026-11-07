# BOONOLAB — Relecture critique : autorité des preuves, extrêmes LBW, mémoire et régimes de marché

**7 novembre 2026 — audit en lecture seule du code PAPER Amsterdam et des journaux V543 #182–189.**

**Origine :** l'utilisateur conteste l'affichage « extrême 45m 60,3 / 48,6 », la réentrée en 5 secondes (#184→185), l'autorité obligatoire MF sur les signaux E3/E15, la justification des SHORTs #183/#187, le retard de sortie #188/#189, l'affichage P&L en fenêtre glissante et propose de reprendre les mémoires, Elastic et la qualification de régimes plus longs que PM3/PM5/Live.

**Statut : constats techniques vérifiés / hypothèses de recherche. Aucun changement de politique PAPER, seuil, broker, service, code d'interface ou shadow n'a été exécuté.** Les performances des moteurs restent des résultats PAPER, pas une preuve d'edge durable.

## 1. Exactitude des extrêmes et limite de conception

- `modules/v5/decision-v52.js` mesure `Math.max(Math.abs(live15LbwRaw))` parmi les observations Audit 30 secondes disponibles dans les **45 dernières minutes glissantes** et expose `mcb15.extreme45m`. `modules/config-server.js` le montre dans **Watch → Rapport du trade → Phase à l'entrée**, mais ne marque pas l'origine sur la courbe LBW15.
- #183, à 17h15 : chiffre 60,3 = LBW15 **−60,259** mesuré à **16h37m14s**, LBW15 courant **−44,225**. #184, à 17h57 : chiffre 48,6 = LBW15 **−48,559** mesuré à **17h20m44s**, courant **−5,301**. Le mouvement du 16h45 imaginé par l'utilisateur est en dehors de la fenêtre #184 (17h12–17h57). Il peut aussi se référer au rendu des bougies *confirmées* plutôt qu'au `live15LbwRaw` intrabougie ; un extrême Live peut disparaître des graphes historiques clôturés.
- **45 minutes ne signifient pas trois bougies confirmées** ; cette métrique n'est **ni le pivot fondateur E15 ni la vraie mémoire de la vague** et l'absolu efface le signe. Il faut distinguer `lastStructuralPivot` horodaté connu à l'instant, extrême historique signé de la campagne et extrême glissant tactique, sans prétendre qu'ils sont équivalents. Suggestion UI non implémentée : signe, `observedAt`, `sourceTs`, valeur courante, progression et nature Live/confirmée.

## 2. Autorité des sorties et temporalité des preuves

- `modules/v5/decision-v541.js` exige pour l'EXIT de POSITION soit **MA3 déjà acceptée puis rejetée depuis l'entrée ET MF3+MF15 adverses ET prix défendu par l'opposition**, soit **pivot E15 opposé confirmé après l'entrée OU deux clôtures 3m au-delà de l'invalidation initiale**, le tout avec MF adverse ET prix adverse défendu.
- Il n'y a **aucune loi générale de « trois bougies complètes »** ; le contrat MA peut enregistrer le premier rejet d'un camp précédemment accepté dès sa première clôture adverse, alors que la **nouvelle polarité** exige deux clôtures. L'attente vient de la coordination des conditions indépendantes, de leur disponibilité et du contrat du rejet MA3 après entrée.
- **L'autorité obligatoire MF3+MF15 n'est pas imposée par MCB ou les faits de marché : c'est un choix d'architecture de la V541** pour ne pas quitter sur une simple respiration. Les événements E15 Live, E3 UP, PM forts, MA3 et prix défendu peuvent tous exister tout en laissant `decision.action=HOLD`. Ce couplage mérite un audit de qualité et de latence, pas une suppression de veto sans replay.
- #182 16h15 : E3 UP confirmé, E15 UP Live (confirmé vers 16h30), PM3 +575,4 BTC$, PM5 +524,5, PM Live +195,2, ΔMF3 +2,2, ΔMF15 +0,6 ; `mfAdverse=true` mais `opposingPivotConfirmed=false`, `structuralLoss=false`, `defendedOpposition=false` → HOLD. Preuves assez fortes pour une **alerte de danger majeur de POSITION**, pas validation automatique de nouvelle campagne LONG. La majorité du MFE +1073,6 BTC$ était déjà rendue à 16h15 : au BTC observé ~75 766, une clôture théorique SHORT sur notionnel 1 500 USD aurait produit **~+1,95 USD net**, contre +3,889 USD effectivement réalisé à 16h45. Pour préserver la plus-value, il faut étudier l'**apparition et l'accélération de l'opposition plus tôt**, pas seulement une règle « EXIT à 16h15 ».
- #188 : E3 UP confirmé 22h42 ; prix adversaire en défense vers 22h45 ; MF3+MF15 UP et E15 UP Live vers 22h57, MA3 encore `FAR` et non rejetée au sens du contrat de sortie ; à 23h00, MA3 LOST et MF/prix adverses → EXIT. Ce n'est pas une règle arbitraire de trois bougies mais une conjunction temporellement tardive.
- #189 : entrée SHORT 00h45 déjà **au-dessus de MA3**, `ma3.state=OPPOSITE_SIDE`. Le contrat de sortie `ma3RejectedSinceEntry` suppose le rejet après entrée d'un côté auparavant accepté : peu pertinent lorsque l'entrée part déjà du mauvais côté. E15 UP confirmé 01h30 et 02h45, MF et PM adverses à certains instants, défenses autour de 75 900 ; `structuralLoss` n'est enfin vrai qu'à 02h54. C'est un **angle mort admission/exit** à vérifier en shadow, pas une preuve suffisante pour déclarer des fills antérieurs.
- Les E15 Live ne sont pas des E15 confirmés et peuvent disparaître ; distinguer natif, directeur géométrique E15, dernier E15 confirmé et campagne E15. Ne pas produire des votes multiples à partir du même oscillateur.

## 3. Contestation des entrées et coordination interpositions

- #183 SHORT : directeur E15 LONG et LBW15 remontant du creux −60 ; l'entrée `STRUCTURAL_REVERSAL_FORMING` suit des preuves tactiques et MF, mais PM3 était haussier. Elle est **explicable par la permissivité de la formation**, sans être **suffisamment justifiée par la hiérarchie de preuves**.
- #187 SHORT : dernier E15 natif confirmé LONG (21h00), E15 SHORT Live vers 21h26, directeur géométrique réévalué SHORT, E3 SHORT tactique ; contradiction de couches non résolue. Entrée devenue perdante en 9 min sans MFE ; elle ne démontre aucune productivité réelle.
- #184 LONG sort **18h37m15s**, puis #185 SHORT entre **18h37m20s**, **dans le même parent E15 LONG**. 5 secondes = un cycle de simulation PAPER, pas cinq secondes de nouvelles preuves stratégiques.
- `paper-v543.js` utilise `lastAction` et `usedKeys` pour éviter surtout la **réentrée dans le même camp** avec un E3 réutilisé ; un `EXIT_LONG` n'impose pas une mémoire de requalification opposée à `ENTER_SHORT` dans le même parent E15. `attentionState` porte des preuves et `postExitEvidence`, mais `attentionOnly=true` et `entryAllowed=null`, `exitRequested=null` : cette mémoire observe et ne protège pas la réadmission.
- Question ouverte : à quel instant une preuve d'abandon de POSITION doit-elle autoriser, ou non, une **position nouvelle et opposée**, en faisant la différence entre campagne directrice, tentative tactique et niveau réellement défendu ? Éviter une réponse par délai fixe.

## 4. P&L : distinguer bilan de vie et fenêtre d'affichage

Ledger PAPER 7 novembre vers 10h52 Stockholm :
- V494 depuis son lancement : **131 clôtures, net réalisé −155,5936 USD**, equity **844,4064 USD**.
- V5.4.3 depuis #80 à #189 : **110 clôtures, −76,1742 USD** ; ledger V5 complet de l'ensemble des versions #1–189 : **−199,099 USD**, equity **800,901 USD**. Ces dénominateurs doivent rester distincts.
- Watch `v52PaperSummary` expose déjà `realizedUsd`, `feesUsd`, `equityUsd`, `completed` du **ledger intégral**. BOONO-TV `latestPaperLedgerTrades` ne transmet pour ses bandes/graphes que les **48h de trades clôturés** ; ce choix de viewport ne doit jamais devenir un P&L « vie complète » implicite. Le compteur exact rendu sur scène OVH n'a pas été certifié visuellement dans cet audit ; **ne pas confondre limitation des bandes et preuve de la formule du compteur scène**.
- Recommandation UI à valider : headline **net réalisé depuis activation**, période de version et equity, puis 24/48h comme comparatif secondaire, net marqué de position ouverte clairement provisoire, frais visibles, sans perte d'historique et sans charger les 189 trades dans le front à chaque cycle. **Aucune modification BOONO-TV**, fichiers en cours de travail par une autre intervention.

## 5. Protocole de qualification des marchés, sans se noyer dans PM3/PM5

**Question fondamentale :** le marché transforme-t-il l'effort en déplacement de prix, puis **en territoire retenu dans le temps** ?

Ne pas construire un seul « indice de puissance » ni un vote de plus. Observer des dimensions séparées, avec origine, fraîcheur, contexte et incertitude :
1. **Intensité / participation** : débit agressif BTC/s, cadence Bâton, plage confirmée des bougies, références **relatives au régime historique**, pas seuil brut ni liquidité passive affirmée sans L2.
2. **Efficacité directionnelle** : déplacement net vs somme du chemin parcouru, translation observée et **conservation du prix** après impulsion, à l'échelle 4×15 et 2h.
3. **Contradiction** : chronologie des E3 opposés, E15 Live/confirmés, croisements BW/LBW liés (pas double comptage), persistance ou falsification du camp MCB15 et des MF. Distinguer la contre-offensive **sans terrain gagné** d'un réel transfert de contrôle.
4. **Mémoire territoriale** : origines et extrêmes signés des E15, niveaux et MA acceptés/rejetés/retestés, défenses après conflit, durée depuis la dernière contradiction, preuves disponibles *as-of*. Le 1h/4h sert de contexte, sans veto automatique.
5. **Qualité de preuve / horizon** : état complet vs incomplet/stale ; ne pas dériver un nouveau régime de trois fluctuations PM instantanées.

**Grille descriptive testable :**

| Intensité | Prix/territoire non persistants | Prix/territoire persistants |
|---|---|---|
| Faible | Stérile / hésitant | Silencieux productif |
| Forte | Dense / volatile / contradictoire | Directionnel productif |

La transition d'un quadrant à l'autre n'est pas un simple tick : **persistence 4×15 + mémoire 2h/4h**, événements de nouvelle défense ou de transfert de terrain, indication de confiance et des désaccords, pas classement rétrospectif selon MFE.

Une éventuelle politique **différenciée** pourrait, plus tard et sous épreuve en shadow, modifier l'attention à l'admission après faux départs et l'autorité de protection d'une position lors de contre-offensives répétées, **sans exiger l'invalidation de toute campagne**. Mais **hypothèse H1 à tester contre une baseline PAPER inchangée H0**, dans plusieurs environnements, sans fixer aujourd'hui des seuils pour expliquer les pertes #182–189. Mesurer trades sauvés ET gagnants sacrifiés, effet de réentrée, P&L net, frais, MFE/MAE, drawdown et information connue avant chaque décision.

## 6. Inventaire des éléments déjà existants à réutiliser

- `modules/attention/attention-memory.js` et `evidence-adapters.js` : événement de preuve MF, prix et MCB avec `sourceAt/availableAt`, mais sans autorité de trading.
- `modules/v5/ma-polarity-memory-v541.js` : historique de polarité/rejets/retests, à ne pas réduire au seul `ma3RejectedSinceEntry` booléen de sortie.
- `modules/v5/conversion-campaign-v533.js` et `modules/v5/elastic-memory-engine.js` : mémoire de POWERFUL / respirations et relations E15/E3, prototypes anciens non automatiquement promus.
- `modules/attention/v494-elastic-ticker.js` : résumés sur **4 bougies 15m** et quantité de territoire conservé, observations partielles transparentes.
- `modules/attention/v494-elastic-state-layer.js` : **sept dimensions d'ÉTAT** déjà horodatées, distinctes des **sept familles ÉVÉNEMENTIELLES** de l'ancienne UI `MCB15 / MCB3 / FLOW / MA / CONVERSION / BOUNDARY / CONTEXT`. Aujourd'hui `causal-event-feed-v54.js` n'émet que `MCB3/MCB15` ; ne pas présenter les 7 catégories d'état comme les sept familles causales complètes.
- L'État vivant archivé de **V4.10.10** et les contrats `knowledge/elastic-v0.5.2-compact-family-chain-duel-2026-10-21.md`, `BOONO_V533_memoire_conversion_2026-10-25.md`, `BOONO_V541_MA_memoire_polarite_retests_2026-10-27.md` restent des références de **lisibilité des deux chaînes et de coordination mémoire**, sans réactivation de l'ancien moteur.

**Décision de méthode préservée :** audit et formulation seulement. Ni seuil arbitraire de marché, ni stop/reentrée automatique ajouté, ni statut de shadow promu en PAPER. Les prototypes n'ont de sens qu'avec tests prospectifs, as-of, et cas réussis comme contre-épreuves.
