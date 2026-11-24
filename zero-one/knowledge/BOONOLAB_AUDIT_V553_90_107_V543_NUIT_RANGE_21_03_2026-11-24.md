# BOONOLAB — Audit depuis #90 de V553 : nuit latérale et comparaison V543, 23–24 novembre 2026

**Référence temporelle : 24 novembre 2026, relevé vers 10h55 CET.**  
**Statut : analyse documentaire en lecture seule ; aucun changement de moteur, SHADOW, service ou position PAPER.**

## Mandat et sources

L’utilisateur corrige explicitement le périmètre : depuis **#90 de V553 inclus**, en examinant particulièrement **le 23/11 21h → 24/11 03h CET**, les synchronies avec les retournements Cross15/E15 et les différences avec V543. La version appelée « 552 » dans la discussion est en réalité **V553 actuellement en ligne** : PM2 indique V552 arrêté depuis 20/11.

Sources rouvertes sur Amsterdam : data/v553-paper-state.json, data/v52-paper-state.json, data/v552-paper-state.json, archives Bâton 30s data/audit-14d/audit-2026112[34]T*.ndjson(.gz), fichiers confirmés mcb_15m.csv/mcb_3m.csv, data/boonolab-market-snapshots*.ndjson et data/boonolab-ticker4x15-samples*.ndjson, modules/v553/{decision,market,paper}.js et modules/v5/{decision-v541,ma-contract-v531}.js. Les bougies natifs sont disponibles à leur clôture ; les prix échantillonnés ne garantissent pas un fill exécutable. Les P&L sont frais inclus, positions ouvertes exclues.

## 1. Résultats exacts

| Clôtures | N | Gagnants | Net USD |
|---|---:|---:|---:|
| V553 #90 (16h41 → 20h15) | 1 | 1 | +34,0271 |
| V553 **#91–#101** (première entrée 20h37, dernière clôture 02h47) | **11** | **0** | **−66,9285** |
| V553 #102–#107 (02h49 → 09h45) | 6 | 2 | +7,6286 |
| **V553 #90–#107** | **18** | **3** | **−25,2728** |
| **V543 #320–#323**, clôturés après l'entrée #90 | 4 | 3 | **+75,3592** |
| V543 #321–#323, uniquement entrées après #90 | 3 | 2 | +24,6117 |

Frais #91–#101 = **16,5011 USD** ; résultat brut avant frais **−50,4275 USD** : le problème n'est donc pas uniquement le coût des transactions. #320 V543 était déjà SHORT depuis15h37 avant le #90 V553 ouvert16h41 ; son gain réalisé +50,7475 est inclus si l'on compare les clôtures, mais pas dans la comparaison des NOUVELLES entrées. V543 #324 et V553 #108 sont encore ouverts à 10h55, exclus des bilans réalisés.

## 2. La fenêtre stricte 21h00–03h00

- V553 : **11 clôtures, toutes perdantes, net −66,93 USD**, et 11 nouvelles entrées (#92–#102), la dernière #102 étant encore ouverte à 03h ; #91 avait été ouverte à20h37. Temps engagé 220,6 minutes sur360 = **61,3 %**.
- V543 : **une clôture #321 LONG +3,2666 USD**, et deux nouvelles entrées (#321 et #322 à02h48) ; #322 reste ouverte à03h. Temps engagé 310,7 minutes sur360 = **86,3 %**.
- Conclusion contre-intuitive : V543 n'a pas moins de **temps d'exposition**. Il conserve davantage **une seule histoire de campagne**, au lieu de changer souvent d'engagement. L'écart est le nombre de réengagements, le prix moyen d'entrée, la conservation des hypothèses et les frais.

BTC Bâton 21h ~61 302 vers03h ~61 067, net **−235 USD** sur six heures ; low **61 050,1**, high **61 633,5**, amplitude **583,4 USD** ; chemin absolu échantillonné ~17 137 USD et efficacité prix net/chemin **1,37 %**. Observateur indépendant (715 points) : **63,1 % STERILE_HESITANT** et **23,9 % DENSE_CONTRADICTOIRE**, total **87,0 %** de période défavorable.

## 3. Cross15 géométrique et résolution réelle du prix

Le Cross15 Live demeure parfois longtemps directionnel sans que le prix conserve la direction :
- UP **21:00:21–22:44:51** : **104,5 min**, BTC **−68,3 USD net** ;
- UP **00:00:21–00:44:51** : **44,5 min**, BTC **−116,8 USD net** ;
- DN **00:45:21–01:44:51** : **59,5 min**, BTC **+111,4 USD net** ;
- UP **01:56:51–02:46:51** : **50 min**, BTC **+19,4 USD net** ;
- nouveau DN à partir de **02:47:21** : BTC baisse encore d'environ **334 USD** jusqu'à 03:14:51, puis la vraie campagne baissière se développe.

Ce sont les déplacements NETS du premier au dernier Bâton de la phase, pas le cumul d'excursions. E15 confirmés dans la fenêtre : **21:15 UP, 23:00 DN, 23:30 UP, 23:45 DN, 00:15 UP, 01:00 DN, 02:00 UP, 03:00 DN**.

## 4. La défaillance V553 n'est PAS un simple mauvais alignement instantané

Pour #91–#101 : **11/11 entrées en EMERGING_DIRECTION**, 4 sans Cross15 Live du sens choisi dans la chaîne (#92, #93, #94, #96), #97 n'ayant qu'une observation Live, et 6 contre la direction de leur dernier E15 confirmé.

- #91 SHORT 20h37 sous parent E15 UP ; Cross15 Live tourne UP à 21h00 et #91 ne clôture qu'à21h15, −8,49.
- **#92, #93, #94 SHORT** 21h25–21h54 alors que **E15 confirmé UP et Cross15 Live UP**. Ils suivent pente récente LBW négative + MCB3 tactique SHORT + PM, sans véritable Cross15 DN dans leur chaîne : **cette convergence UP qui s'affaiblit est traitée à tort comme une nouvelle campagne SHORT**, alors qu'elle peut être seulement une respiration/contestation.
- #95 LONG 22h00 avec Live et confirmé UP : alignement réel mais BTC ne conserve pas le mouvement, net −6,10.
- #96 LONG 22h58 pendant Live DN, sans Cross15 Live UP propre, −3,97 ; E15 DN est confirmé deux minutes plus tard.
- #97 LONG 23h19 sous E15 confirmé DN, seulement une observation Live UP, −5,11 ; #98 SHORT 23h43 sous E15 confirmé UP et Live DN, −6,76.
- #99 LONG 00h28 au BTC **61 548,2** et **100 % de la hauteur de son range glissant 45min connu à l'entrée**, net −9,35.
- #100 SHORT 01h32 au BTC **61 107,1**, **1,7 % du range de 45min**, presque au creux, net −6,48.
- #101 LONG 02h08 au BTC **61 494,6**, **100 % du range glissant de 45min**, net −7,07.
- #94 SHORT 21h53 BTC 61 060,1, **0,7 % du range glissant de 45min**, autre vente au creux. Ces rangs sont AS-OF (sans prix futurs), estimés sur échantillons Bâton.

Deux défauts : **réification d'une inflexion tactique contraire avant la résolution Cross15**, et **manque d'intelligence du lieu/maturité dans le range**. Le marché lui-même est mauvaise matière première ; V553 lui donne accès au capital dès deux confirmations récentes, sans mémoire de la praticabilité des précédentes tentatives. Le défaut connu market.js chain.live15At au lieu de firstLiveAt reste intact à la demande explicite de l'utilisateur.

## 5. Le parcours de V543

- **#320 SHORT**, entrée V543 15h37 avant V553 #90 à16h41, clôture 20h55 à **+50,7475 USD**. V553 #90 SHORT 16h41–20h15 à **+34,0271 USD**. Les deux profitent de cette campagne réelle ; V543 capte un plus grand intervalle.
- **#321 LONG**, entrée **21:43:55 BTC 61 240**, clôture **02:43:17 BTC 61 434,7, +3,2666 USD**. Contrat V543 : phase **STRUCTURAL_CONTINUATION**, directeur de campagne LONG ; Cross15 UP depuis21:00 ; preuve E3 UP tactique à21:43 ; flow MF3 légèrement positif / MF15 neutre, PM5 positif, tests MA qualifiés. Le moteur conserve cette campagne à travers E15 DN/UP natifs de 23h,23h30,23h45,00h15,01h et02h. Sortie sur **V541_CONFIRMED_MA3_FAILURE_WITH_MF_PRICE** à02h43, donc AVANT le prochain Cross15 Live DN vers02h47.
- **#322 SHORT**, entrée V543 **02:48:37 BTC 61 286,5**, phase **STRUCTURAL_REVERSAL_FORMING**, directeur structurel hérité LONG mais **nouveau Cross15 Live DN connu depuis02:47:21**, tactique E3 SHORT et flow MF3/MF15 baissier, PM3 −170,8, PM5 −147,4 ; clôture 05h09 BTC 60 339,2, **+21,697 USD**. Le E15 DN natif ne sera confirmé qu'à **03h00**. L'exception est une anticipation de nouvelle phase explicite et argumentée, pas une inversion indépendante décidée par MCB3.
- **#102 SHORT V553** à02:49:54 BTC 61 210,1, environ **77s et 76,4 BTC USD plus bas que V543 #322**. Trade gagnant **+21,0835 USD** à04h46 ; il capture lui aussi le transfert économique désormais réel.
- **#323 LONG V543**, 05h09–09h03, **−0,3519 USD net** en près de4 heures, tandis que V553 **#103–#107 cumulent −13,4549 USD net**, en continuant à réengager plusieurs campagnes dans un terrain haché.

Ce contraste n'autorise PAS la règle « toujours conserver le dernier E15 confirmé » : V543 tient des changements E15 natifs dans le range, puis sait **requalifier un nouveau Cross15 Live** avant la confirmation de 03h00 quand prix/PM/MF/MCB3 et la phase de retournement convergent.

## Conclusion, sans promotion d'un seuil

La nuit est un test très clair de la **mémoire continue de campagne**, absente de l'autorité V553 actuelle et plus développée dans la logique V543. V553 n'a pas soudain oublié de calculer LBW15 : il transforme sa pente locale négative dans une phase UP en nouvelles admissions SHORT avant Cross15DN (cas #92–94), et entre tard dans le mouvement d'un range déjà presque épuisé (cas #94/#99/#100/#101). E15 et Cross15 Live peuvent donner des sens stables tout en restant non productifs : le prix doit aussi résoudre la figure.

**Hypothèse SHADOW à falsifier** : distinguer (a) E15 directeur et sa mémoire persistante, (b) LBW15 pente / Cross15 Live qui construisent ou contestent, (c) Cross3 tactique qui ne décide jamais le sens seul, (d) prix/PM/MF qui démontrent le territoire effectivement conservé et le coût économique de l'attente et de la réentrée, (e) lieu as-of dans le range et succession d'échecs. Comparer à des bonnes campagnes ; ne pas optimiser uniquement cette nuit.

**État opérationnel : V553 PAPER, V543, V552 arrêté, SHADOWS et BOONO-TV strictement inchangés.**
