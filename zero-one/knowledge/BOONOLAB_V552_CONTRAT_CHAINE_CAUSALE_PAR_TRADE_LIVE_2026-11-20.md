# BOONOLAB — Proposition de constitution V552 : CHAÎNE CAUSALE PROPRE À CHAQUE TRADE, jalons LBW15 pente Live et Cross15 Live

**20 novembre 2026 — proposition conceptuelle en discussion, non implémentée et non mise en service PAPER.**
**Origine :** critique détaillée de l'utilisateur sur l'audit 24h V552/V543 du 19–20/11 et révision de l'idée « nouveau E15 obligatoire après sortie ». Le moteur actuel PAPER v1.2 ne suit PAS ce contrat.

## Décision de conception proposée

**L'unité de décision n'est ni un Cross3 mémorisé, ni un Cross15 confirmé isolé, ni un nouveau E15 requis pour recommencer : c'est une chaîne causale indépendante PAR OPPORTUNITÉ / TRADE, évaluée en temps réel jusqu'à conclusion.**

E15 natif confirmé reste un **repère de contexte structurel et de maturité** : origine, extrême de la vague MCB, prix de marché réellement observé et sa provenance. Il peut référencer plusieurs campagnes tactiques ou trades successifs, mais n'accorde aucune permission d'entrée réutilisable. Un Cross15 ne remplace pas le parent E15 pour cause de seul croisement ; un nouveau E15 ne doit pas devenir une condition indispensable après chaque sortie. Les nouvelles preuves économiques actuelles peuvent valider une continuation dans le même contexte E15.

**Chaque nouveau trade peut référencer des événements plus anciens pour expliquer son origine, mais sa permission d'entrée doit reposer sur des preuves ACQUISES pour lui, fraiches, avec horodatages as-of et territoire disponible. Les signaux historiques sont des preuves/chronologie, jamais des autorisations transférables d'une entrée à l'autre.**

## Deux jalons structurels maîtres dans chaque confrontation

### Jalons et ordonnancement

A) **LBW15_PENTE_LIVE** : première modification de cap ou vitesse. Enregistrer instant t0, cours P0, LBW15 avant/après, dLBW15/dt, dBW15/dt, variation de l'écart LBW−BW, direction de la campagne précédente, zone de la vague (crête/milieu/creux), MCB3, PM Live, MF15/3 contextuel. Le changement de pente ne suppose PAS encore un Cross15 ; il crée vigilance et confrontation, et peut provoquer protection d'une position si déjà contre-attaque de prix évidente.

B) **CROSS15_LIVE** : instant t1, cours P1, gap croisé, angle/vitesse de séparation LBW15 vs BW15, stabilité **au fil des observations** (quelques minutes si disponibles, PAS un minuterie imposée), Δt=t1−t0 et ΔP=P1−P0, prix restant depuis le croisement, variations PM Live dans cet intervalle, participation MCB3, contre-attaques adverses. Traiter trois issues sans attendre la bougie 15m clôturée : **CROSS15_LIVE_PRODUCTIF**, **CROSS15_LIVE_CONTESTE**, **CROSS15_LIVE_REJETE**.

C) **CROSS15_CONFIRME / prochain E15** : clôture de la géométrie 15m. Sert à CONFIRMER/INVALIDER une thèse déjà reconnue en Live ; jamais passage obligatoire avant une sortie ou une entrée ni ordre automatique de retourner une position. Si la chaîne n'a pas démontré une initiative économiquement exploitable dans le délai de cette confirmation, la conclusion légitime peut être **PAS D'ADMISSION** ; aucune obligation de négocier un marché inconnu/ambivalent.

**Attention à l'ANGLE :** l'angle visuel en pixels dépend de l'échelle TradingView et n'est PAS un seuil numérique stable. Utiliser les pentes temporelles des valeurs MCB réelles et l'ouverture de l'écart (d(LBW−BW)/dt), contextualisées par l'amplitude de la vague et leurs distributions récentes ; distinguer une inflexion dans un creux d'une inflexion en haut de vague. Pas de degré ou de seuil ajusté au graphique a posteriori.

## Une chaîne propre PAR ADMISSION et sa validité économique

Conserver un enregistrement transitoire pour la candidature actuelle :
- id d'opportunité unique, version de politique, direction candidate, E15_context (origine connue as-of, référence prix/vague, pas permission).
- initialAt, trigger=t0 LBW15, t1 Cross15 Live éventuel, t2 confirmé éventuel, Cross3 Live/confirmé s'il contribue, mais **pas un Cross3 obligatoire**.
- Prix à chaque jalon, déplacement et excursions depuis t0/t1, vitesse, rendement/effort/volume, part réellement conservée après contre-offensive, hauteurs BW/LBW, dynamique de séparation, PM Live trajectoire signée (ne pas sommer les fenêtres PM3/PM5/Live chevauchantes).
- Lieu de prix : dernier extrême prix lié E15 avec provenance, haut/bas de vague 15m, valeur interne de la vague, distances aux extrêmes du range et MA200 sur horizons pertinents ; niveaux manuels Daily/BigRange seulement si récents et fiables. Une crête approchée n'est pas mécaniquement le lieu d'un LONG tardif, un creux pas systématiquement le lieu d'un SHORT.
- MF15/MF3 peuvent **départager un état MCB/prix vraiment incertain**, jamais contredire seuls une thèse de prix claire.
- Trois issues horodatées : VALIDEE -> admission possible si marché exploitable ; CONTESTEE -> attendre / pas de trade ; REJETEE -> archive causale, aucune permission reportée.
- Condition du marché distincte : OPEN / OBSERVATION / NO_NEW_ENTRY, fondée sur hachage répété BW/LBW15, effort vs translation du prix conservé, volume, polarité, lieu ; nouvelle offensive Live réellement productive peut réouvrir avant que le régime horaire ne change.

**Aucune admission sur simple accord de plusieurs indicateurs** ou parce que l'ancien Cross3 n'a pas encore été « consommé ». Chaque position doit pouvoir dire : « ce qui a changé, quand, où sur la vague, quelle conversion du prix s'est produite et quel territoire reste disponible MAINTENANT ». Tout marché non reconnu est une bonne raison de ne pas ouvrir de nouveau trade, sans forcer la clôture des campagnes déjà détenues.

## Gestion POSITION : pas de revenu nécessaire, ni reconquête artificiellement obligatoire

L'ancienne règle earlyProtect: counterConvinces && structuralRecovery && economicGainAtRisk && !parentSupports doit être SUPPRIMEE en tant que contrat général : economicGainAtRisk exige un gain encore positif après frais ; structuralRecovery exige une respiration de l'opposant puis une reconquête d'extrême. Les deux attentes ont laissé #21/#22 jusqu'au hard risk 500$ BTC.

À la position ouverte, évaluer constamment le contrat qui l'a rendue justifiée (sa propre chaîne causale). Quand LBW15 pente Live se retourne et que la contre-offensive MCB3/PM/PRIX commence à lui ôter sa base structurelle, ouvrir la protection et accepter de sortir même si la position est déjà négative, **avant le Cross15 confirmé**. Un Cross15 Live qui s'amplifie et trouve une translation adverse stable peut commander la sortie ; un Live qui recroise immédiatement sans progression retenue peut laisser le trade en HOLD. **Aucun minimum MFE ni test « 3 clôtures 3m » obligatoire.** Une troisième bougie défavorable est déjà un historique alarmant, pas un délai de confirmation imposé.

Le hard risk 500$ BTC reste filet de sécurité, non moyen normal de découvrir l'invalidation. Les floors gain 120/90 **ont déjà été jugés défavorables par l'utilisateur**, NE PAS les remettre. Les risques physiques des données/latences restent à prendre en compte : un vrai premier Cross15 Live peut devenir faux, aucune garantie de fills au prix Bâton observé.

## Réentrée : une nouvelle chaîne, pas un nouveau E15

À la sortie, **consommer et fermer le droit de la chaîne qui avait autorisé le trade**. Les Cross3, PM et autres signaux calculés pendant cette position restent dans la chronologie, PAS dans une file d'opportunités. Un nouveau trade, même dans la même direction et sous le même E15, doit produire un nouvel événement économique post-sortie (nouvelles preuves de conversion et de prix présentement disponible). Il **n'est pas obligatoire d'attendre un nouveau E15 ou un nouveau Cross3** : nouvelle continuation défendue et contexte actuel peuvent fournir un nouvel ancrage de preuve.

Éviter une minuterie fixe 15/18/25min, un plafond de PM arbitraire et un hard market veto qui tue les retournements productifs.

## Remise en question des SHADOWS et des seuils

Le rapport 24h montrant 0/12 trades V552 gagnants lors de DENSE/STERILE et 4/4 en SILENCIEUX_PRODUCTIF ne démontre PAS une frontière de marché prédictive. Les labels sont descriptifs et les conditions économiques sont in-sample. Seuils du régime actuellement lus dans modules/attention/boonolab-regime-observer.js : intensityHigh si débit relatif >=1 ; productive si prix net/chemin >= max(0,10, référence horaire) ET retainedFraction>=0,5 ; marges d'incertitude 0,15 / 0,04 / 0,10. Ces seuils mélangent intensité, rétention sur 1h et disponibilité des données ; ils ne sont pas validés pour décider du premier Live.

Le ticker autonome compare effort et rendement au P75 des quatre heures précédentes. La source est une **estimation de débit/translation Bâton 30s**, pas un carnet L2 ni une preuve d'acheteurs/vendeurs agressifs. Ne pas coupler le trading à un label sans comprendre ses composantes, son retard, la couverture et l'efficacité sur d'autres régimes.

Ne pas reconduire le seuil **prix post-Cross15 > BTC ×0,001** comme garantie de rendement : reflète seulement deux taker fees ~0,1 %, pas potentiel restant, contexte d'extrême ou lieu.

À partir du marché, distinguer **CHOP NON PRODUCTIF** (escalade de faux Cross15 Live et prix net faible pour l'effort) vs **TRANSFERT DIRECTIONNEL EMERGENT** (LBW15 pente Live nouvelle, MCB3/PM et prix conservé). Le second doit pouvoir être reconnu alors que l'ancien régime 1h dit DENSE, comme la baisse du 19/11 15h54.

## Bugs/incohérences code V552 confirmés à résoudre par reconstruction

1. qualify.support et qualify.uncertainProof sont exactement les mêmes cinq booléens ; donc POLARITY_UNCERTAIN ne ferme aucun trade via cette condition.
2. ownMemoryStep stocke une nouvelle mem.episode à chaque Cross3 même en position, et paper.step n'interdit que les clés utilisées ; une ancienne tentative peut être réadmise après sortie.
3. campaignFrom emploie E15 natif, mais TRANSFER_ACCEPTED réécrit ensuite l'identité de campagne sur simple Cross15 clôturé et prix/PM ; un E15 contextuel immuable est plus adéquat.
4. positionReview n'offre tôt que la protection économique gagnante, même si le prix commence à invalider une entrée perdante.
5. market-quality, ticker/régime et E1/E4 restent séparés et non reliés par une autorité cohérente de permission de marché.

## Exigences de validation et statut

Replay horodaté *AS-OF* sur des fenêtres diverses, en respectant les latences Bâton et closes 15m (aucune connaissance du futur), suivi de toutes les admissions/sorties et des frais, **pas une somme de pertes qu'on suppose évitées**. Cas : #21/#22 sorties avant hard risk sans MFE ; #20/#24 faux Cross15 Live => HOLD ; SHORT 19/11 15h54 exploitable en marché DENSE naissant ; SHORT gagnant #17, cas #2 et bonnes continuations ; #22/#23 interdiction de réutiliser anciennes chaînes ; prix dans la zone haute/basse de vagues. Auditer la distinction top/bottom E15 et extrême de prix réellement établi. Signaler chaque nouvelle permission/abstention avec chaîne causale visible dans Watch.

**Aucune politique PAPER n'a été modifiée pendant cette discussion. Cette note est un contrat de conception PROPOSÉ, pas une mise en service ni un résultat de backtest.**
