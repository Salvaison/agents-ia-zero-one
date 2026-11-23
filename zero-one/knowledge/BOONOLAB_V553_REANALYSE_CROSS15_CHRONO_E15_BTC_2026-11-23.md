# BOONOLAB — Réanalyse centrée sur Cross15 et continuité de phase E15

**23 novembre 2026 — AUDIT EN LECTURE SEULE.** Aucun changement des politiques PAPER, des SHADOWS ni des services.

## Demande et point corrigé

L’utilisateur rejette une vérification limitée à la pente LBW15, MCB3 et PM favorables au tick d’entrée. L’objet est le chemin causal et temporel entier : **LBW15 pente → Cross15 Live → E15 natif confirmé → développement et résolution économique par le prix**, avec E3/MCB3 comme instruments TACTIQUES et non directeurs. Il soupçonne un conflit entre la phase E15 confirmée et les inflexions Live lorsque le marché retourne plus vite que la confirmation et demande de comparer les décalages avec les extrêmes de prix.

L’audit des sources sur Amsterdam a utilisé le ledger v553-paper-state, les archives v553-paper-decisions y compris segments rotatifs, les archives horaires Bâton 30s 23/11, les CSV MCB3m/15m confirmés, et les modules v553 source, decision, market, paper. Une clôture MCB native est accessible à son instant de clôture, non au timestamp d’ouverture. Bâton 30s et meilleur prix ledger sont de cadences distinctes.

**Correction de conclusion : V553 conserve les prédicats locaux LBW15/gap/MCB3/PM, MAIS ne conserve pas une véritable autorité stratégique continue de la phase E15.** La direction de candidature vient de la pente LBW15 et non du parent E15, dont la présence seule suffit à inContext ; mem.e15 est mis à jour après E15 natif confirmé, mais entryReview ne demande pas le sens E15 aligné et la position conserve son campaignId du parent E15 enregistré à l’entrée. Les changements de phase ne réconcilient pas cette identité avec la campagne en cours ; exitReview attend l’adversaire Cross15 Live persistant et économique ou le confirmé adverse, avec early=false. L’événement E3 natif est disponible mais n’ordonne pas la direction de la candidature.

## Chronologie centrale du 23 novembre

| CET | Cross / événement | BTC USD et action V553 |
|---|---|---|
| 14:26:21 | Cross15 Live UP | 61 266 ; BOONO encore SHORT #86 |
| 14:27:48 | Cross15 UP persistant, prix adverse à SHORT | EXIT_SHORT #86 à 61 380 : BOONO reconnaît bien ce Live UP pour sortir |
| 14:27–14:30 | FLAT, marché SUSPEND_NEW et nouvelle chaîne insuffisante | aucun LONG |
| 14:30 (mémorisé 14:30:38) | **E15 UP confirmé** | clôture BTC 61 312 ; le Live repasse DN vers 14:30:51 |
| 14:33 | E3 DN confirmé | 61 148 ; contre-attaque |
| 14:39 | E3 UP confirmé | 61 326 ; reprise non durable |
| 14:45 (mémorisé 14:45:38) | **E15 DN confirmé** | 61 269 ; le précédent E15 UP n’a duré que 15 min |
| 14:45–14:47 | Succession de Cross15 Live UP/DN brefs | aucun maintien fiable du prix |
| 14:48 | **E3 DN confirmé** | clôture BTC 61 230 ; tactique alignée au dernier E15 DN |
| 14:52:13 | pente LBW15 DN + gap15 DN + MCB3/PM DN | **ENTER_SHORT #87 à 61 147**, 7m13 après E15 DN et 4m13 après E3 DN |
| 14:53:51 | creux prix Bâton | **61 073** ; #87 déjà très près de sa meilleure excursion |
| 14:56:03 | accélération acheteuse | EXIT_SHORT #87 au hard-risk à 61 685, net -14,69 USD PAPER |
| **14:56:21** | **nouveau Cross15 Live UP durable** | **62 057** ; déjà +985 BTC par rapport au creux Bâton |
| 14:57 | E3 UP confirmé | 62 408 |
| **14:57:28** | chaîne Live UP avec deux preuves | **ENTER_LONG #88 à 62 824** |
| **15:00** (mémorisé vers 15:00:37) | **E15 UP confirmé** | clôture BTC **63 832**, après la partie la plus rapide de la poussée |
| **15:26:51** | HH prix Bâton | **64 506** ; MFE ledger +1 712 BTC à un tick plus fin |
| **15:33** | E3 DN confirmé, mais E15 encore UP | prix clôture 63 720 ; affaiblissement multi-preuves |
| **15:45** | E15 encore UP confirmé, écart comprimé | gap E15 confirmé +8,89 (contre +34,57 à 15:15), prix clôture 63 299 |
| **15:48:51** | Cross15 Live DN | prix ~62 941 ; grande restitution déjà effectuée |
| **15:51:54** | Cross15 Live DN persistant, MCB3/PM adverses | EXIT_LONG #88 à **62 780**, net -2,56 |
| 16:00 | E15 DN confirmé | clôture BTC 62 869 |

**Nuance essentielle** : le Cross15 confirmé UP de 14:30 n’a pas précédé une hausse monotone de 30 min. E15 DN a été confirmé dès 14:45 et un nouveau creux est inscrit à 14:53. Il est donc incorrect de présenter #88 comme ayant eu simplement 27 minutes de retard sur le même Cross15 UP ininterrompu. Le véritable Cross15 Live UP de la grande poussée est celui de 14:56:21.

## La dimension temps × espace, mesurée

| Trade | Premier Cross15 Live → entrée | Translation BTC dans cette attente | Translation / amplitude médiane 15m récemment observée |
|---|---:|---:|---:|
| #43 SHORT gagnant | 61,6 secondes | +27,4 BTC USD dans le sens SHORT | 0,26× |
| #49 LONG gagnant | 65,0 secondes | +47,5 BTC USD | 0,34× |
| #61 LONG gagnant | 61,9 secondes | +62,1 BTC USD | 0,23× |
| **#88 LONG perdant** | **67,1 secondes** | **+715,2 BTC USD** | **3,41×** |

L’attente reste autour d’une minute, MAIS le prix réalise une portion beaucoup plus grande de sa campagne. À #88, PM3 atteint ~+1 732,6 BTC USD à l’entrée. Le filtre de maturité/late dans market.js vérifie travel>typical15Range ET signed3<=0 : lorsque PM3 reste positif, une entrée fortement étendue reste admissible. **La bonne unité de maturité n’est pas seulement le nombre de relevés : c’est l’espace consommé depuis le Cross15, comparé à l’amplitude et au régime.**

## Cross3 tactique : pourquoi les deux E3 DN de #88 ne signifient PAS la même chose

La structure prix démontre une vraie hausse en H/L puis H/H :
- creux ~61 073 vers 14:53 ;
- premier sommet Bâton ~63 615 vers 15:02 ;
- creux supérieur ~62 865 vers 15:09 ;
- sommet supérieur ~64 506 vers 15:26.

Le **premier E3 DN à 15:09** se produit pendant un Cross15 UP fort et persistant ; gap15 natif +32,41 à 15:00 puis +34,57 à 15:15 ; après le recul, le prix inscrit un nouveau HH. Cet E3 DN est une **respiration tactique**, ne doit pas imposer un SHORT ni une sortie mécanique.

Le **deuxième E3 DN à 15:33** se produit dans une figure devenue moins productive : gap15 natif confirmé +34,57 à 15:15 puis +20,48 à 15:30 ; à 15:33 le gap Live est +10,64, LBW15 pente3m ~-1,99, MCB3 gap -7,22, PM Live -144 BTC USD, PM3 ~-364 BTC USD et prix ~63 739 contre le maximum précédent ~64 506. À 15:45 gap E15 confirmé +8,89 et prix ~63 299. **Le E3 DN est ici une preuve tactique de contre-offensive au sein d’une phase E15UP fragilisée**, pas une nouvelle autorité directionnelle indépendante.

V553 attend Cross15 Live DN vers 15:48:51, quand le prix a déjà restitué environ 1 565 BTC USD depuis le sommet Bâton. Il sort à 15:51:54, trois minutes plus tard, devenu perdant.

Calculs purement indicatifs sur prix de relevés/close et notionnel PAPER 1500 USD, frais estimés :
- clôture E3 DN 15:33, BTC 63 720,1 : ~+19,9 USD net ;
- E15 encore UP mais rétréci 15:45, BTC 63 298,9 : ~+9,8 USD net ;
- premier Cross15 Live DN 15:48:51, BTC ~62 940,7 : ~+1,3 USD net ;
- sortie effectivement enregistrée 15:51:54, BTC 62 779,5 : **-2,562 USD net**.
Ce ne sont PAS des fills démontrés et ne constituent PAS une stratégie de sortie validée.

## Durée des phases confirmées, comparaison qualitative

Trois campagnes gagnantes dans des phases E15 relativement persistantes :
- #43 SHORT : E15 DN confirmé 21/11 02:45, prochain E15 UP 05:45 — **180 min**, entrée 03:16.
- #49 LONG : E15 UP 21/11 12:45, prochain E15 DN 15:15 — **150 min**, entrée 13:14.
- #61 LONG : E15 UP 22/11 07:00, prochain E15 DN 11:45 — **285 min**, entrée 07:37.

Séquence critique 23/11 : E15 UP confirmé 14:30 → DN 14:45 (**15 min**) → UP 15:00 (**15 min**) → DN 16:00 (**60 min**). #87 SHORT entre 14:52 avec seulement ~7m47 avant la nouvelle confirmation UP, durée connue uniquement a posteriori. **Attention** : la médiane des intervalles confirmés sur la journée 21 et 23 est ~60 minutes dans les deux cas ; c’est un épisode local concentré qui change, pas une cadence générale uniformément accélérée. Comparer des bonnes campagnes sélectionnées ne constitue pas un test prédictif.

## Contrat cible CONCEPTUEL, pas modifié dans le moteur

**E15 confirmé = directeur de la thèse et mémoire des phases. Cross15 Live = traduction et remise en question dynamique de cette thèse. LBW15 pente/BW/LBW vitesse/angle = construction et maturation. E3/Cross3 = tactique d’entrée et de contestation, jamais décideur autonome de direction. PM/MF/prix conservé = résolution ou échec économique de la campagne.**

L’hypothèse de conflit E15 confirmé / Live est étayée : V553 met E15 dans mem.e15 mais n’exige que son existence, la candidature peut être opposée et une position peut porter un ancien campaignId. Exemple #88 LONG porte un parent E15 SHORT confirmé 14:45 au moment de son entrée 14:57, alors qu’E15 UP se confirme 15:00 et ne réconcilie pas la campagne de la position. Cette incohérence est **architecturelle**, pas preuve causale de tous les résultats négatifs.

Prochain SHADOW à étudier, sans mise en PAPER : fil temporel E15/Live/E3/PM/territoire et prix ancré à chaque Cross15, mémoire de retours/rejets, consommation d’espace durant la confirmation, premier E3 opposé comme respiration vs E3 opposé associé à une contraction E15 et à un territoire perdu, et évaluation as-of sur d’autres journées que celles de l’audit. Maintenir les bonnes anticipations Live sans attendre systématiquement E15 natif confirmé, qui peut être trop tardif en prix.

**Statut : AUDIT / HYPOTHÈSES DOCUMENTÉES. V553 PAPER, V543, BOONO-TV, SHADOWS EXISTANTS STRICTEMENT INCHANGÉS.**
