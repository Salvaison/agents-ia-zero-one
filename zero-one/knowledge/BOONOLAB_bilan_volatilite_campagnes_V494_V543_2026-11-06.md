# BOONOLAB — Bilan de volatilité, campagnes V494/V543 et shadows du 6 novembre 2026

**Observation directe Amsterdam, 6 novembre 2026, 16h45–16h50 Europe/Stockholm.** Mandat utilisateur : « Aujourd'hui, c'est une grande volatilité, 494 souffre énormément, pourquoi n'arrive t'il plus à faire de longue campagne. et 543 à bientôt réavalé tout ces bénéfices. Bilan de la journée? »

**Statut : enquête et comparaison, aucun changement PAPER, shadow, frais, seuil, service ou broker.**

## 1. Bilan PAPER fiable : période par clôture le 6 novembre jusqu'à 16h45

| | V4.9.4 | V5.4.3 |
|---|---:|---:|
| Trades clôturés du jour | 7 (#120–126) | 7 (#176–182) |
| P&L net positif | 2 | 3 |
| P&L net réalisé | **−14,4005 USD** | **−13,9490 USD** |
| Gains positifs | +9,4102 USD | +6,3729 USD |
| Somme des pertes | −23,8107 USD | −20,3219 USD |
| Frais | 10,5068 USD | 10,4946 USD |
| Net 48h glissantes au 6 nov. 16h45 | −86,6333 USD (26 trades, 3 gagnants) | +47,4200 USD (18 trades, 7 gagnants) |
| Variation nette depuis 5 nov. 17h30 | −32,8491 USD | −34,1471 USD |
| Cumul historique des ledgers | −148,7175 USD, equity 851,2825 USD (126 clôtures) | −156,0458 USD, equity 843,9542 USD (182 clôtures) |

Le 543 avait encore +97,8806 USD sur une *autre* fenêtre 48h lors du contrôle du 5 novembre. Le nouveau +47,4200 tient à la fois aux nouvelles pertes et au déplacement de la fenêtre. Les cumuls historiques ne sont pas une comparaison parfaitement appariée (versions antérieures V5 et dates de démarrage différentes). Les deux moteurs étaient **FLAT** au dernier contrôle 16h50.

Hier après le gros SHORT #173 +51,0325 USD, V543 a déjà clôturé #174 LONG −11,6712 et #175 LONG −8,5269. Les 7 clôtures du 6 novembre totalisent −13,949 : c'est pourquoi le bilan s'est dégradé depuis hier, sans prétendre que les bénéfices ont tous disparu.

## 2. Intensité et polarités

Le 6 nov., high observé 76 349,7 à 01h43 locale, low 74 939,5 à 16h05 ; amplitude prix observé 1 410,2 USD. Ce n'est pas l'effondrement quasi linéaire du 5 nov. dans la fenêtre 15h30–17h37. Compare les médianes Bâton :

| | 5 nov. 15h30–17h37 | 6 nov. 14h–16h45 |
|---|---:|---:|
| Débit agressif | 5,520 BTC/s | 1,241 BTC/s |
| Cadence | 122,4 | 38,57 |
| abs(priceMove) par fenêtre | 59,3 BTC$ | 32,0 BTC$ |
| Temps d'accumulation | 1,6 s | **5,2 s** (médiane observée 14h–16h45) |

**Ne pas interpréter ce débit comme une profondeur L2 du carnet.** Des signaux forts peuvent coexister avec une direction de prix non persistante. Le 6 novembre, E3 confirmés : 29 LONG/30 SHORT ; sur 48 fenêtres 15m avec E3 confirmé, dix ont vu les deux directions successivement. Le 5 nov. (journée plus longue) : 44 LONG/43 SHORT ; 23 fenêtres contradictoires sur 61. Périodes et dénominateurs distincts.

## 3. Pourquoi V494 ne tient pas comme dans ses meilleures campagnes

**Ce n'est pas un échec permanent du maintien.** V494 #124 LONG 08h40–11h42, **182 min**, MFE +602,1 BTC$ et déplacement conservé 550,1 BTC$ (91,4 %), net +9,4026 USD. Le flux MCB native a vu E3 LONG confirmé 08h36, puis E15 LONG confirmé 08h45 ; entrée avant validation E15 tardive.

En revanche, parmi les **7 sorties V494 du 6 nov., 5 sont `EXIT_NATIVE_SIGNAL_PROTECTION`** (MCB natif opposé après entrée, tactique 3m opposée et PM adverse corroborés, selon `modules/v4/layers/action.js`), **2 sont `EXIT_EXECUTION_FAILURE`** (mouvement favorable insuffisant + PM/microstructure adverses). Les durées : 28,5 / 3 / 5,5 / 49 / 182 / 74,5 / 42 min, **médiane 42 min** (contre médiane V543 96 min). V494 suit ses propres protections ; ce ne sont pas des fermetures aléatoires. En régime de rotations/contre-signaux rapides, il sort puis réadmet avec des frais répétés.

Cas V494 #126 : SHORT 15h58 à 75 305,7, **huit minutes avant** low de 16h05 à 74 939,5 ; MFE +366,2, mais exit 16h40 à 75 525,3 **−5,8764 USD net**, donc trop tard pour un SHORT au sein de la baisse et restitution de la faible marge obtenue. V543 avait déjà ouvert le SHORT #182 à 14h06, **~112 min plus tôt**, et conservait la position. V494 #120/121 SHORTs perdants, #122/123 LONGs perdants : le marché a bien contredit plusieurs tentatives tactiques.

## 4. V543 maintient, mais ne cristallise pas assez et reste cher en réentrées

Sept sorties V543 #176–182 du jour, **toutes `V54_CONFIRMED_STRUCTURAL_TERRITORY_TRANSFER`**, dont :
- #178 SHORT 04h55–07h31, MFE +494,3 BTC$, conservé 192,2 (~38,9 %), net **+2,3043 USD**.
- #180 LONG 10h12–11h48, MFE +207,3, conservé 85,2 (~41,1 %), net **+0,1795 USD**.
- #182 SHORT 14h06–16h45, MFE +1 073,6, conservé 272,7 (~25,4 %), net **+3,8891 USD** ; retournement après meilleur point réduit la rentabilité.
- #176 LONG −4,5091 ; #177 SHORT −4,7107 ; #179 LONG −7,2287 ; #181 SHORT −3,8734.

Reconstruction par parents E15 : SHORT #177–178 **−2,4064 USD** ; LONG #179–180 **−7,0492 USD** ; SHORT #181–182 **+0,0157 USD** (le SHORT réussi #182 ne fait que rembourser le faux départ #181) ; LONG #176 −4,5091 USD appartient à un parent ouvert hier. Somme −13,9490 USD. Ne pas confondre la dernière position gagnante et la campagne rentable.

## 5. Shadows

Au contrôle ~16h45 :
- V494 A (exact/frozen) 70 trades −128,994 USD ; B (exact/superviseur) 77 −138,4361 ; C (MCB15 inflection/frozen) 45 −76,309 ; D (inflection/superviseur) 50 −75,5828. Portefeuilles différents ; le superviseur entraîne des réentrées supplémentaires et n'améliore pas automatiquement le net. C/D ont aussi accepté le SHORT V494 #125 et l'entrée LONG #124 ; #126 absent du dernier relevé C, mais ne pas faire de cette seule exception une preuve de veto profitable.
- V543 `STRUCTURE_ONLY` 60 clôtures net +25,1066 USD ; `EARLY_INVALIDATION` 61 −23,5871 ; `TERRITORY_FLOOR_120` 70 −134,6921 ; `BASELINE_PLUS_FAST_INVALIDATION` 70 −127,727 ; `STRUCTURAL_LEVEL_AND_TRANSFER` 13 −68,4595 **avec SHORT #167 encore ouvert, P&L marqué provisoire +90,865 USD et 47 réentrées évitées** ; aucun de ces totaux ne partage une exposition strictement équivalente.
- Sur les mêmes entrées PAPER de V543 aujourd'hui, `BASELINE_PLUS_FAST_INVALIDATION` simule #176 +0,2397 au lieu de −4,5091, #179 −3,9111 au lieu de −7,2287, mais #182 +0,2707 au lieu de +3,8891. Le floor protège certaines pertes, mais supprime une partie des bonnes campagnes. `EARLY_INVALIDATION` a aussi coûté la magnifique campagne #165 du 4/11, transformant +38,4549 PAPER en −5,1187 virtuel. Aucune règle nouvelle validée.

## 6. Orientation d'étude

L'hypothèse centrale est le **régime d'activité et de volatilité** : V494, plus réactif aux signaux natifs opposés corroborés, peine à bâtir une campagne quand de nombreux signaux alternent sans territoire durable ; mais sait en tenir une vraie (#124). V543, plus patient, conserve les campagnes plus longtemps mais rend beaucoup du meilleur prix lorsque le transfert adverse est reconnu tard. Les faux départs coûtent aussi très cher au niveau **campagne E15**.

**Décision méthodologique en vigueur : ne pas calibrer maintenant des seuils sur les pertes de ce jour**. Conserver V494/V543 PAPER inchangés et comparer prospectivement les régimes et le terrain défendu, avec preuves connues à l'entrée, puis les coûts des sorties et des réentrées. Ce bilan est descriptif et ne constitue pas une promotion de shadow.
