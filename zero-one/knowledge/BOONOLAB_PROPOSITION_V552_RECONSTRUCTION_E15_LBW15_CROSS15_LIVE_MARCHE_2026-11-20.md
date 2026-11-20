# BOONOLAB — Proposition de reconstruction ciblée V552 : E15 parent, deux jalons Live et marché souverain sur l'admission

**20 novembre 2026, CET — statut : PROPOSITION, NON IMPLÉMENTÉE, NON TESTÉE, NON ACTIVÉE en PAPER.**  
**Mandat utilisateur :** abandonner les empilements de conditions (profit minimum préalable pour sortir, double reconquête obligatoire, relecture des vieux Cross3) et les floors 120/90 déjà jugés défavorables. Centrer l'autorité structurelle sur **LBW15 pente Live → Cross15 Live**, avec évolution temporelle/économique évaluée au travers MCB3/PM/MF/prix. Seule mémoire stratégique persistante : **le dernier E15 confirmé correspondant au dernier extrême structurel observé**, avec son horodatage et le prix réel associé ; ne pas permettre qu'un simple Cross15 confirmé remplace ce parent. Le marché, et non une liste de permissions MCB arbitraires, doit savoir fermer la **NOUVELLE ADMISSION** dans les épisodes improductifs sans imposer la clôture de positions déjà valides.

## Défaillances précises vérifiées dans V552 v1.2

Sources réouvertes sur Amsterdam : modules/v552/{source,decision,vigilance,market-quality,paper}.js, knowledge/BOONOLAB_AUDIT_V552_V543_SHADOWS_24H_2026-11-19_20.md, ledger data/v552-paper-state.json et SHADOWS 4×15.

- positionReview exige counterConvinces **ET** protectiveTransfer (opposant ayant déjà subi respiration et reconquis un extrême) **ET** economicGainAtRisk (position encore positivement rentable après frais, avec MFE fortement restitué) **ET** parentSupports faux. Cela rend la sortie anticipée **quasi impossible pour une tentative perdante**, tandis que 12/16 sorties 24h se font au Cross15 15m clôturé et deux hard stops à −500$ BTC surviennent.
- vigilance.assess choisit actuellement owner = **position.direction** avant campagne et E15. Ses événements WATCH_OPEN et CROSS15_LIVE_OBSERVED sont présents, mais restent sans autorité avant la séquence trop exigeante.
- ownMemoryStep crée mem.cross3 ET mem.episode sur chaque nouveau Cross3 même **pendant une position ouverte** ; paper.step ne mémorise comme consommée que la clé réellement utilisée dans une entrée. Un épisode non utilisé peut ensuite être admis 5 secondes après une sortie ou un hard stop. lastExit n'est pas condition d'admission. #22 SHORT le 20/11 02h53, Cross3 âgé 31,5 minutes, déplacement de ~866$ BTC déjà parcouru, puis perte −14,14$.
- campaignFrom choisit initialement le dernier E15 natif confirmé, MAIS ownMemoryStep réattribue ensuite cam.direction/id sur TRANSFER_ACCEPTED de **Cross15 clôturé + prix/PM**, donc le parent stratégique n'est pas exclusivement le dernier E15. cam.originPrice est un prix au premier tick lu, non nécessairement l'extrême du prix lors de l'événement E15. cam.high/low est conservé au fil des phases ; à dissocier des extrêmes E15.
- qualify : support et uncertainProof réutilisent les **mêmes cinq booléens**. Le statut POLARITY_UNCERTAIN n'apporte donc **aucun veto additionnel effectif**. market-quality n'utilise pas les observations de qualité réelle ticker 4×15. Le mode de maturité « dépasse le range 15m » peut se désactiver précisément dans une impulsion avec breakout.
- Le niveau MF15 et sa pente doivent rester au mieux arbitres **SECONDaires uniquement quand MCB/prix sont indécis**, pas un veto absolu ni un vote qui renverse une thèse E15 établie.

## Constitution simplifiée proposée — UNE seule V552, pas de nouveau SHADOW PM2

### 1. E15 comme parent structurel et UNIQUE mémoire stratégique durable

Champs : dernier E15 natif **confirmé**, direction de l'extrême MCB, bar/knownAt, dernier extrême de prix réellement observé à l'événement avec la provenance du prix (high/low de bougie ou prix Bâton suivant la définition réellement choisie), prix et instant de l'événement, référence de campagne. Vérifier la correspondance entre E15 et l'extrême de prix avant de l'affirmer. **Le parent ne doit jamais être remplacé par un simple Cross15 confirmé** : les Cross15 Live/clôturés peuvent montrer une nouvelle thèse en formation et servir la gestion de la position avant le prochain E15.

Les Cross3, E3, valeurs PM passées ne sont pas conservés comme dossiers d'entrée réutilisables. Une observation tactique courante est conservée temporairement pendant une confrontation puis renouvelée : elle ne devient pas une permission stockée de réentrer. Un état d'admission du **marché** est distinct de la mémoire stratégique E15, et les comptes/trades PAPER restent consignés dans le ledger pour audit.

### 2. Deux jalons structurants : LBW15 pente Live et Cross15 Live

**LBW15_PENTE_LIVE_RUPTURE** — capture t0, prix P0, pente actuelle/précédente LBW15, BW15, écart/gap, parent E15, position et lieu du prix, PM Live et MF15/MF3. La simple inversion de signe de la pente n'est **pas** une preuve suffisante : mesurer changement d'angle, accélération, convergence BW/LBW et conserver sa chronologie. Cela ouvre la confrontation et peut mener à une sortie immédiate **si** l'action MCB3/PM/prix met déjà le terrain détenu à mal ; aucun besoin de bénéfice préalable ni de nouveau Cross3.

**CROSS15_LIVE** — seconde borne t1 : delta temps t1−t0, prix P1−P0, excursions adverses/favorables et part de déplacement conservée, PM Live observée entre les deux, MCB3 à l'instant et son évolution. Le croisement approfondit-il son écart ? Le prix répond-il au challenger ou résiste-t-il ? **Autorité de protéger/fermer la POSITION** si l'invalidation locale s'accomplit ; les faux Live abandonnés après reprise du prix permettent de tenir la position. Pas d'obligation de 2m, 3 bougies ou seconde reconquête de l'opposant.

**CROSS15_CONFIRME / E15 suivant** — Cross15 clôturé actualise la lecture du 15m et la décision de risque ; ne crée ni sortie automatique quand la position défend le prix, ni nouvelle admission automatique. Le nouveau E15 confirmé devient le prochain parent lorsque l'événement et son extrême de prix sont correctement datés.

Champs de la confrontation (temporaire) : slopeAt, slopePrice, cross3LiveAt, cross3At éventuel, cross15LiveAt, cross15ConfirmedAt, Δt, ΔP entre jalons, PMLive observations datées (NON sommées), max favorable/adverse, territoire encore conservé, refus/retours de l'ancienne direction. Ces observations ne constituent PAS des thresholds de trading.

### 3. Position locale : dissocier HOLD, PROTECTION et nouveau parent

La sortie POSITION doit répondre à un **échec de sa thèse d'entrée maintenant observable**, pas à la valeur du gain réalisé ou à l'âge du cross. Un trade encore négatif peut sortir dès sa contre-offensive réellement productive ; un trade gagnant peut être maintenu lors d'un simple souffle contradictoire. Le hard risk 500$ BTC reste filet de sécurité, **non substitut à l'invalidation locale**. Les floors 120/90 en gain de prix BTC ne sont pas réintroduits.

Exemples d'acceptation d'une sortie : position LONG, LBW15 se retourne à la baisse, MCB3 tactique devient SHORT, PM Live adverse donne du déplacement durable aux vendeurs, le prix auparavant conservé commence à être cédé — demander sortie avant Cross15 confirmé. Aucun besoin de reconquête après une respiration de l'opposant si le prix adverse est déjà produit et retenu. Si le Cross15 Live se réinverse et que le prix est reconquis par le parent, maintien possible (gagnants #20/#24 comme tests de non-régression). MF secondaire départage UNIQUEMENT dans une vraie ambiguïté structurelle ; MF opposé seul ne liquide pas une thèse E15.

### 4. Régulateur du MARCHÉ pour les NOUVELLES admissions seulement

Trois états persistants sur même V552 : **ADMISSION_OUVERTE**, **OBSERVATION_STRUCTURELLE**, **NOUVELLES_ADMISSIONS_SUSPENDUES**. Ils ne sont **PAS** des ordres et ne ferment pas une position. Alimentations causales as-of : tendance vs oscillation BW15/LBW15, Cross15 Live répétés et rejetés, trajectoire MCB3/PM Live, effort volumique (ticker 4×15 et Bâton), déplacement prix conservé, lieu range/extremes enregistré, MF15/MF3 seulement arbitres secondaires.

Lorsque le marché montre des efforts et croisements répétés mais peu de déplacement retenu, suspension temporaire **par propriété observée du marché**, pas par règle d'heure. Une nouvelle offensive réellement productive peut réouvrir immédiatement l'admission après LBW15 pente Live + MCB3/PM + conservation de prix **sans attendre le libellé horaire** de DENSE→DIRECTIONNEL ; exemple SHORT 19/11 ~15h54, alors que le ticker indique encore DENSE mais POWERFUL short.

La suspension ne doit ni bloquer une continuation déjà en position ni interdire éternellement de négocier un marché initialement contradictoire. Surtout pas de veto unique « volume fort », « DENSE », « MF15 signe adverse », « Cross3 >18min ».

### 5. Réentrée : toute sortie consomme et clôt l'opportunité tactique courante

Si une position sort à tExit (protection structurelle ou hard risk), les Cross3/E3/PM qui précèdent la sortie restent dans le journal mais **ne peuvent plus servir de candidat d'admission**. En FLAT, observer **une nouvelle initiative de prix post-sortie** liée à la structure présente, avec PM Live et MCB3 actuel ; une continuation validée peut se présenter sans nouveau Cross3 (ne pas en faire une obligation). L'absence de preuve fraîche = rester FLAT. Aucune minuterie arbitraire « 15 minutes après une perte ».

Le parent E15 reste l'ancrage stratégique pendant et après la sortie, mais **ne garantit pas** que l'entrée est redevenue économiquement intéressante.

## Cas de test obligatoires, critères de succès

**Cas perdants à protéger plus tôt sans gain préalable :** V552 #21 LONG / #22 SHORT, Cross15 Live opposés à 02h45/03h52 avec PM adverse, ne pas attendre hard stop. Tests as-of avec vraie chronologie, pas des sorties hypothétiques présentées comme profits acquis.

**Contre-exemples de faux Live :** #20 LONG et #24 SHORT, dont la clôture dès premier Cross15 Live serait moins favorable que le résultat PAPER réel, et le SHORT gagnant #2 antérieur. Ne pas liquider les campagnes sur le simple premier signe de croisement.

**Réentrées absurdes :** #21→#22→#23 (deux inversions 5s après hard stop) ; Cross3 #22 déjà vieux de 31,5 minutes et +866$ BTC parcourus, au lieu d'un nouveau signal frais. Exiger *preuve nouvelle* post-sortie indépendamment de l'âge chronométrique.

**Admission dans marché contesté :** 24h as-of : 8 V552 DENSE net −46,41 $, 4 STERILE net −29,85 $, tous perdants ; 4 SILENCIEUX_PRODUCTIF net +10,68 $, tous gagnants. Ces 16 cas servent de diagnostic, **non de preuve statistique suffisante pour un veto global**. Tester la naissance de SHORT 19/11 15h54 (DENSE mais POWERFUL vendeur) et V543 #294 gagnant à 16h34 (DIRECTIONNEL_PRODUCTIF) ; exceptions nécessaires.

**Mesures de validation :** taux d'admissions après sortie à 0–60 secondes, exposition (base V552 77 %), frais (base V552 24$ 16 clôtures), P&L / campagne avec ordre de marché simulé et frais, pertes des bons trades refusés, retours MFE conservés, délais t0 pente Live → t1 Cross15 Live → t2 confirmé → action, sorties risquées et gains de continuation tenus. Au moins replay causal 24h et échantillons d'autres régimes avant activation, puis validation prospective. Comparer V543 et SHADOWS sans mélanger leurs comptes ni compter l'ancien SHADOW S1 comme actif.

## Gestion immédiate recommandée (NON exécutée)

**Recommandation prioritaire :** ne plus laisser V552 accumuler des réentrées PAPER invalidées pendant la reconstruction : un mode **EXIT_ONLY / NO_NEW_ADMISSIONS** dans le même service V552, avec suivi des positions ouvertes et du hard risk, conservation des données, affichage Watch clair, sans stopper les flux ni geler une position en perte. Ceci demande un petit patch et des tests, **non déployés ici**, car le mandat présent demande des solutions, pas une nouvelle politique déjà autorisée. Le comparateur V543 et les SHADOWS resteraient indépendants.

**Statut juridique/technique de cette note : PROPOSITION POUR DÉCISION. Aucun nombre de trades économisés ni rentabilité future n'est affirmé. Aucun changement des moteurs/positions au cours de sa rédaction.**
