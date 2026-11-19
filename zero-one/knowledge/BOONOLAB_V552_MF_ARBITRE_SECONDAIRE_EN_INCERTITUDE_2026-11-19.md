# BOONOLAB — MF15/MF3 : arbitrage secondaire uniquement si thèse MCB ambiguë ou affaiblie

**19 novembre 2026 (CET).**  
**Statut : précision constitutionnelle exprimée par l’utilisateur ; DOCUMENTÉE, NON IMPLÉMENTÉE dans les décisions PAPER V552 v1.2.**  
**Pas de nouveau moteur ni de modification du ledger.**

## 1. Correction précise demandée

Utilisateur : « MF peut par exemple aider à trancher dans un marché incertain, quand lbw et bw ont latéralisé ou une conviction lors d'une entrée est mise à mal et qu'il faut envisager une sortie mais pas pour aller contre une thèse structurelle établie. »

**Principe :** MF15/MF3 n'est ni souverain ni passif. Sa fonction de **départage secondaire** est conditionnée à la faible détermination structurelle des courbes MCB ou à la détérioration des preuves d'une position existante. Dès qu'une campagne MCB15/MCB3 et le prix sont cohérents, MF opposé peut être **précurseur** d'une future vigilance mais pas veto automatique, direction inverse ni sortie imposée. MF n'est pas volume acheteur/vendeur L2. Son niveau absolu peut être encore opposé à l'inflexion de sa pente.

## 2. Contrat d’autorité à trois états

### A. THÈSE_STRUCTURÉE_ÉTABLIE — MF indicatif

Critères qualitatifs, évalués **as-of** : cohérence de la trajectoire BW15/LBW15 (confirmed + Live et pente), des épisodes tactiques MCB3, de la conservation du prix et de PM Live. En position, l'identité de campagne E15 est maintenue. Le MF15 à contre-courant devient une **divergence/alerte à mémoriser**, sans permission de trader ni opposition automatique.

### B. POLARITÉ_INCERTAINE — MF arbitre secondaire de l'admission

BW15/LBW15 s'horizontalisent ensemble, se touchent/croisent à répétition, les croisements récents ne gardent pas le prix et les Cross3 se multiplient. **MCB3 reste la première candidature ; MF ne crée pas d'entrée seul.**

La lecture dynamique MF15 (trajectoire, changement de pente, évolution depuis l'épisode), et MF3 (impulsions et leurs reprises) aide à discriminer :
- `MF_SOUTIENT_CANDIDATURE` : MF3 répond aux Cross3 et MF15 ne s'y oppose pas par une **dynamique de fond clairement divergente** ; l'admission exige toujours l'acceptation MCB/prix/PM.
- `MF_CONTESTE_CANDIDATURE` : dans une polarité **déjà indéterminée**, les impulsions MF3/trajectoire MF15 renforcent le doute ; le moteur peut maintenir l'attente au lieu d'entrer sur un croisement fragile.
- `MF_NON_CONCLUANT` : pente lente proche de zéro, contradictions de MF15/MF3, données absentes. Ne pas inventer de certitude et ne pas remplacer l'absence de preuve de prix par un vote MF.

L'autorité de départage est **limitée à l'incertitude déjà établie par MCB et le prix**. Ne pas imposer une valeur positive/negative absolue MF15, une variation minimum ou un minuteur arbitraire. Un MF favorable ne doit **pas** « réparer » un prix clairement contraire ; un MF défavorable ne doit **pas** invalider une offensive structurellement accomplie.

### C. CONVICTION_ENTRÉE_AFFAIBLIE — MF soutient l'examen de protection

Une position est en cours et les preuves économiques qui justifiaient son entrée se dégradent : MCB3 opposé, pente LBW15/BW15 qui perd son cap, Cross15 Live adverse/ambivalent, PM Live qui traduit mal et territoire précédemment gagné remis en cause. **C'est cette dégradation structurelle qui ouvre l'examen**, non MF.

MF15/MF3 peut alors aider à distinguer une simple respiration d'un transfert de force productif : continuité de pente, réactions MF3 aux contre-attaques et éventuelle divergence de MF15. MF peut appuyer `PROTEGER/SORTIR_POSITION` s'il existe déjà un choix structurellement raisonnable entre `HOLD` et `PROTECT` ; il ne donne pas un ordre de sortie sur son seul signe.

**Le hard risk adverse de 500 $ de prix BTC reste impératif indépendamment de MF.** La sortie de POSITION n'entraîne ni changement automatique de parent CAMPAIGN ni entrée inverse.

## 3. Contrôle du code actuellement en service

Références vérifiées sur Amsterdam : `modules/v552/market-quality.js` et `modules/v552/decision.js`, politique `v5.5.2-lbw15-live-vigilance-campaign-paper-v1.2`. À cette date :
- `mfReading`, `MF15Conflict`, `mf15` et `mf3` sont calculés et exposés dans les diagnostics.
- `phase.deferNewEntry` dépend du croisement 15m, de la réponse du prix, des frais et de la chaîne MCB ; MF ne peut **jamais** arbitrer ce test.
- `positionReview` conserve les MF en contexte mais ne leur donne aucune capacité de départage lorsque la conviction structurelle est affaiblie.
- La version v1.2 était une correction utile du veto absolu de MF15, mais l'absence **totale** d'autorité secondaire va plus loin que la constitution souhaitée. **Le comportement proposé ici n'est donc pas encore actif.**

## 4. Validation nécessaire avant toute nouvelle autorité PAPER

Tester les cas précis **en lecture seule dans l'UNIQUE V552 existant**, sans nouveau PM2 : 
- retournement SHORT 19/11 15h54–15h55 : MF15 encore positif mais pente baissière, ne doit pas bloquer une thèse MCB/prix devenue cohérente ;
- #14 LONG / #15 SHORT au marché haché : MF peut contribuer au doute lorsque MCB/PM/prix sont contestés, mais ne doit pas arbitrairement réactiver une entrée ;
- SHORT #2 gagnant : faux Cross15 UP/MF contraire ne doit pas liquider la campagne établie ;
- LONG #4 : Cross15 DN Live provisoire vers 01h18 puis rejet, comparé au vrai transfert 02h15 ; MF seul ne doit pas conduire à une sortie prématurée ;
- long #6 gagnant : ne pas allonger inutilement l'abstention quand MCB/prix confirme progressivement malgré MF opposé ;
- #7–#9 : vérifier si le départage MF en polarité incertaine évite réellement des allers-retours après frais.

Comparer `MCB_DIRECT` (thèse établie), `MF_SECONDARY_IN_UNCERTAINTY` et `MF_SECONDARY_POSITION_REVIEW`, avec horodatages de disponibilité, signes de pente, degré de prix conservé, faux signaux, opportunités manquées, frais, MFE et P&L par campagne. **Aucun seuil empirique, veto général ou nouveau moteur en service à partir de cette note.**

**Décision conceptuelle documentée ; implémentation/tests/mise en service d'un arbitrage MF conditionnel : ouverts.**
