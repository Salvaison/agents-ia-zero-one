# BOONO Systems — Passation conceptuelle et technique
## Du moteur autonome BOONOTRADE à BOONO-TV, BOONO Watch et BOONO PRO

**Date de préparation : 19 octobre 2026**  
**Destinataire :** prochaine discussion consacrée à l'évolution technique, fonctionnelle et commerciale de BOONO Systems.  
**Nature :** synthèse de transmission, non cahier des charges contractuel ni audit de production en temps réel.  
**Périmètre :** identité de BOONO ; atelier/loft, bureau et ordinateur ; BOONO-TV ; perspective de BOONO Watch et BOONO PRO ; proposition de marché ; gouvernance et questions ouvertes.

> **Principe impératif de lecture :** serveur = réalité opérationnelle ; code = état effectivement implémenté ; documents = mémoire ; intentions = hypothèses. Ne pas transformer une vision commerciale en caractéristique déjà développée.

### Légende des statuts

- **[VALIDÉ]** : choix conceptuel ou graphique expressément retenu au cours du travail.
- **[RÉALISÉ / TESTÉ]** : installation et essais documentés, avec date et périmètre ; la disponibilité au moment de la prochaine discussion doit être revérifiée.
- **[EXPÉRIMENTAL]** : montage techniquement présent, mais non qualifié pour une diffusion ou exploitation commerciale.
- **[VISION / PROPOSITION]** : architecture de produit ou de marché à discuter ; **pas** une décision actée.
- **[À CONFIRMER]** : définition, licence, droit, fonction ou résultat sans preuve suffisante.

---

## 0. Objet de cette passation — le changement de perspective

BOONO est né comme **système autonome d'analyse et de trading crypto**. Le développement de sa lecture MarketCipher, des événements de marché, de l'exécution simulée et du suivi de ses décisions a ensuite produit un second actif : une capacité à **montrer ce qu'il observe, comprend, tente et apprend**.

Le chantier BOONO-TV a transformé cette matière analytique en une représentation publique et incarnée. Le spectateur ne reçoit plus seulement une suite de chiffres ou un dashboard : il entre dans l'atelier d'un personnage reconnaissable, au bureau, qui examine le marché sur ses vrais écrans et prend des décisions. La musique, les bulles et les gestes servent cette continuité narrative.

La prochaine étape envisagée — et non encore spécifiée contractuellement — consiste à organiser une **gamme de produits** :

```text
                           BOONO Systems
                                 │
                  BOONOTRADE — moteur / données
                  (source privée, Amsterdam)
                                 │
                      API / flux en lecture seule
                                 │
              ┌──────────────────┴──────────────────┐
              │                                     │
         BOONO-TV                             Observabilité
   média public et scène                      et outils privés
              │                                     │
  découverte, communauté                    ┌────────┴────────┐
  visibilité, preuve de vie                 │                 │
                                          BOONO Watch     BOONO PRO
                                      suivi approfondi   outils experts
                                      [À DÉFINIR]        [À DÉFINIR]
```

**Avertissement :** les noms **BOONO Watch** et **BOONO PRO** ont été explicitement demandés pour cette transmission, mais aucun cahier des charges antérieur détaillé ou produit déjà déployé sous ces deux noms n'a été retrouvé dans les documents consultés. Les rôles indiqués ici sont un **positionnement proposé pour discussion**. Il ne faut pas les confondre avec l'ancien travail interne appelé « BOONO Market Watch ».

La valeur centrale pourrait alors évoluer de « un bot qui cherche à gagner de l'argent » vers une offre combinant **observation vérifiable, pédagogie, divertissement, outillage analytique et communauté**, tout en laissant la rentabilité de BOONOTRADE faire l'objet d'une validation indépendante.

---

## 1. Qui est BOONO ? L'agent réel et le personnage

### 1.1 Le BOONO informatique — [RÉALISÉ / EN RECHERCHE]

**BOONOTRADE** est un moteur déterministe d'analyse et de simulation de trades, centré sur BTC/USDT et les données du marché OKX. Il réunit notamment :

- MarketCipher B / MCB sur plusieurs horizons ;
- Blue Wave (BW), Light Blue Wave (LBW), Money Flow (MF), pivots E3/E15 et divergences ;
- niveaux, position dans la vague, trendlines, MA200, structure et limites ;
- price behavior, flow, prix, ticker, cadence, effort/rendement et conversion ;
- moteur de décision, risque, entrée, protection, sortie ;
- journal de décisions, trades simulés, analyses contrefactuelles et variantes **shadow**.

Ce système ne doit pas être présenté comme une intelligence mystérieuse, toute-puissante ou déjà rentable. Ses décisions sont traçables dans le code et les journaux. Il lit des informations imparfaites dans le temps et applique des règles en cours d'amélioration.

La formule de travail retenue :

> **MCB propose → structure situe → marché traduit → BOONO décide.**

Le principe éditorial de l'observabilité est aussi :

> **État vivant = ce que BOONO comprend et décide ; Vagues = ce que BOONO voit ; SHADOWS = ce qu'il teste ; BOONO-TV = mise en scène publique de ces dimensions.**

Les notions de « mémoire », de « conviction » ou de « combat » constituent un **langage de représentation** pour des phénomènes mesurables (persistance, conversion, opposition, terrain gagné), pas une affirmation que le robot possède une conscience ou des états psychologiques humains.

### 1.2 BOONO personnage — [VALIDÉ]

L'image canonique est documentée sous `00_references/BOONO_mugshot_CANONICAL.png`, avec les références `BOONOTV01_states_and_layers.png`, `BOONOTV02_character_attitudes.png` et `BOONOTV03_master_composition.png`.

**Apparence identitaire :**

- robot bleu métallique, carré, solide, ancien et légèrement patiné ;
- grandes lentilles/yeux ronds immédiatement expressifs ;
- antenne surmontée d'une **boule rouge** ;
- rivets, éléments articulés, câbles et traces d'usure, sans esthétisme de jouet enfantin ;
- langage visuel BD rétro / industriel, mélange de technique, d'humour, de fragilité et d'intelligence.

**Tempérament scénographique :** analyste obstiné, cérébral, parfois drôle, paradoxal et existentiel. Il est capable de douter d'une hypothèse, d'attendre une preuve, de vivre l'incertitude sans être présenté comme incompétent. Il ne doit pas devenir un robot générique « mignon », une figure marketing hors-sol ou un présentateur surexcité.

Son identité vient directement du vrai travail de BOONOTRADE : les décisions ambiguës, les scénarios concurrents, les erreurs, le risque et les opportunités. Le personnage **incarne une logique**, il ne la remplace pas.

### 1.3 Les sept états corporels — [RÉALISÉ / TESTÉ]

`WORKING`, `THINKING`, `WORRIED`, `CONCENTRATED`, `CONFIDENT`, `OBSERVE`, `EXECUTE`.

Les poses existantes sont de vraies variations de corps et de regard, pas simplement des recolorations : penché sur le travail, main au menton, inquiétude, concentration, assurance, observation des écrans ou action vers le bureau.

En fonctionnement normal, le « casting » visuel suit les états réellement dérivés de l'activité de BOONO, avec temporisation pour éviter les changements nerveux. Il existe également un mode de démonstration des sept postures `?showcase=1`, des variantes figées `?showcaseHold=1&showcaseStart=0..6` et un pilotage par touches 1 à 7. Ces démonstrations ne doivent pas être prises pour un état de trading réel.

Les dessins utilisés en octobre 2026 constituent une bibliothèque **provisoire** : une refonte homogène et haute résolution, potentiellement animée en 2.5D ou Blender, reste envisagée. La **reconnaissabilité du personnage** doit survivre à cette refonte.

---

## 2. Où travaille BOONO ? Son loft et son atelier

### 2.1 Le lieu — [VALIDÉ]

Le lieu de travail n'est pas une salle de marché stérile, ni une fenêtre de navigateur agrandie : c'est un **grand loft/atelier industriel habité**, avec profondeur, objets, lumière et habitudes. La référence de composition est `BOONOTV03_master_composition.png`.

Éléments de langage visuel :

- volume d'atelier, murs et ouvertures en arrière-plan ;
- mobilier réel, espace autour et derrière BOONO ;
- éclairage chaleureux ambre/cuivre contrastant avec le cyan froid des données ;
- enseigne lumineuse **BOONO-TV LIVE** ;
- affiches, notes et objets personnels (dont l'affiche « Un jour de meilleurs trades » et son smiley) ;
- possibilité d'ajouter accessoires, musique, platines ou scène d'artiste sans masquer le travail du robot.

Le loft remplit trois fonctions à la fois : **identité de marque**, **spatialisation de l'information** et **point de rencontre communautaire**. En voyant BOONO à sa table, le public doit comprendre qu'il travaille réellement sur un marché, plutôt que de regarder une publicité pour un programme de trading.

### 2.2 Décor recomposable — [RÉALISÉ / TESTÉ]

L'une des décisions structurantes est de **séparer l'image de fond des éléments vivants**. Les premiers essais avaient des écrans et des morceaux de BOONO peints dans la même image : à chaque mise à jour apparaissaient des doubles contours, du flou, des recadrages et des conflits de profondeur.

Une base de loft vide a été créée :

`boonotv_empty_loft_1200x1080.webp`.

Elle permet de reconstruire la scène par couches :

```text
Loft vide (décor)
     ↓
Plans de données dans la profondeur
     ↓
Bureau et accessoires
     ↓
Surfaces d'écrans recalibrées
     ↓
BOONO, bras et mains au premier plan
     ↓
Expressions graphiques et bulles scénarisées
```

Le principe méthodologique est : **une image doit contenir le minimum de responsabilités possible**. Changer de loft, de pose ou d'écran ne devrait pas obliger à reconstruire les autres composants. Les masques sont idéalement générés à partir des alphas des dessins, plutôt que repeints manuellement.

### 2.3 Une architecture conçue pour évoluer — [VISION]

Une fois le moteur de composition stable, l'atelier peut avoir plusieurs cadrages ou ambiances : travail quotidien, séquence d'explication, soirée House/DJ invité, séquence de stress ou de réussite, transition de caméra. Ce ne sont pas actuellement autant de scènes entièrement produites.

---

## 3. Le bureau de BOONO et son ordinateur

### 3.1 Bureau physique — [VALIDÉ / RÉALISÉ]

BOONO est installé **derrière un grand bureau/table de travail massif**, en partie au premier plan. La table possède des touches, un clavier, des commandes/sliders et deux **écrans tactiles horizontaux** proches du robot, insérés dans la surface.

La composition a été conçue pour donner une relation matérielle crédible entre l'action de BOONO et les données : ses mains doivent pouvoir passer **devant** les écrans ; son regard doit pouvoir se porter vers l'un ou l'autre ; une future animation du doigt pourra accompagner un changement d'outil.

Le bureau physique et les **contenus de ses deux écrans sont indépendants**. Les projections exploitent des transformations `matrix3d` / homographies et non un simple recadrage carré collé sur l'image.

### 3.2 Écran droit — vrai TradingView / MarketCipher — [RÉALISÉ / PRÉSERVÉ]

**Décision ferme : écran droit = authentique MarketCipher/TradingView.**

Un onglet Chromium déjà connecté sur le VPS Amsterdam présente TradingView sur BTCUSDT, et un captureur visuel lit périodiquement la bande MarketCipher. La capture est relayée au studio OVHcloud en **lecture seule**. La cadence normale étudiée est **10 secondes**. Le contenu peut alterner 3m/15m dans un mode roll-over de démonstration.

C'est une pièce identitaire importante : **le spectateur voit un fragment du véritable poste de travail de BOONO**, pas seulement une imitation. Le créateur du projet a explicitement souhaité conserver cette source réelle.

**Incident confirmé lors de la discussion :** en octobre 2026, des captures blanches de 1 995 octets ont été envoyées, alors que des images valides pesaient ~48–49 Ko. Un crop CDP fixe (`x=55,y=425,width=1195,height=165`) débordait du viewport de TradingView, parfois ramené à `1195×165` après redimensionnements/zoom du bureau noVNC. Le captureur acceptait le JPEG blanc comme « succès ». Le processus était déclaré online et continuait de publier le blanc.

Un test synchronisé du 15 octobre : arrêt du seul captureur à **22:07:03**, reprise à **22:08:40** (France/Suède). Le spectateur a confirmé que les glitches graphiques du 3m disparaissaient pendant l'arrêt et revenaient après reprise ; les collecteurs de données et le moteur avaient continué de fonctionner. Cela établit un lien causal fort entre capture et gêne visuelle, sans isoler exactement la commande CDP responsable.

**Décision de l'utilisateur :** ne **pas** supprimer TradingView authentique ni le remplacer par un faux MarketCipher. Une correction de la capture peut être envisagée ultérieurement, mais elle doit préserver sa nature réelle et ne pas perturber le collecteur et l'usage noVNC. L'incident graphique n'avait pas justifié de refonte urgente du moteur de trading.

### 3.3 Écran gauche — outils BOONO — [RÉALISÉ]

**Décision ferme : écran gauche = projection des instruments internes de BOONO.**

Modes scénographiques mis en place :

- `indicator` : indicateurs / mesures ;
- `scenario` : lecture du scénario ;
- `risk` : protection / incertitude ;
- `trade` : exécution, position et événements ;
- `art` : panneau/animation dédiée.

Le contenu est volontairement compact : à cette échelle, il sert à expliquer **ce que regarde BOONO**, et non à remplacer l'interface analytique complète. Les modes peuvent suivre la pose et être forcés pour un test de mise en scène.

### 3.4 Le bureau n'est pas un faux outil d'exécution — [PRINCIPE]

Les touches, sliders, projections et gestes du personnage sont des **signes visuels de son travail**, pas une interface de commande capable d'ouvrir une position depuis le flux vidéo. Le métier de trading reste dans le moteur autonome ; le studio est un consommateur de données, pas un contrôleur de risque ou de passage d'ordres.

### 3.5 Édition directe de la perspective — [RÉALISÉ / VALIDÉ PAR UTILISATEUR]

Une réalisation majeure de cette discussion est le mode **calibration interactive** :

`?layoutEdit=1&showcase=1&showcaseHold=1&panel=state`.

Depuis Chrome dans le bureau noVNC d'Amsterdam (tunnel de prévisualisation vers OVH, port local 8310), l'utilisateur peut :

- déplacer par glisser-déposer les quatre coins de chaque écran ;
- déplacer le prix mural, l'origine des vagues et la bulle ;
- voir immédiatement le résultat dans le loft ;
- `Enregistrer`, `Annuler`, `Copier JSON` et `Quitter`.

Les quadrilatères et positions sont conservés dans :

`/home/ubuntu/boono-tv-studio/runtime/boono-tv/desk/projection-config.json`.

Le test automatisé a vérifié l'homographie, les 11 poignées et une sauvegarde effective sur OVHcloud. L'utilisateur a ensuite réglé lui-même les éléments et déclaré cette manière de travailler « parfaite ».

**Attention à la prochaine discussion :** les coordonnées historiques d'octobre ne font pas foi après cette calibration manuelle. Relire **le fichier de configuration vivant**, ne pas réécrire les valeurs préalables par défaut.

---

## 4. BOONO-TV — Plateforme visuelle existante

### 4.1 Mission éditoriale — [VALIDÉ]

BOONO-TV est **le canal public de représentation du fonctionnement du robot**. Il n'a pas vocation à révéler toute la complexité de ses règles internes en permanence ni à être un tableau de monitoring brut. Il associe pédagogie, spectacle, transparence visuelle et personnalité.

La scène représente la collaboration entre le véritable moteur et sa représentation :

- BOONO travaille sur son ordinateur et lit ses instruments ;
- les données réelles entourent le personnage ;
- l'État vivant raconte sa thèse, sa structure, la conversion et sa décision ;
- ses postures, bulles et effets traduisent graphiquement sa manière de travailler ;
- le prix et les vagues restent lisibles même si le personnage change d'état.

### 4.2 Composition 1920 × 1080 — [RÉALISÉ]

La composition principale est divisée en :

**À gauche, ~720×1080 :** panneau analytique fixe et densément structuré, avec prix BTCUSDT et quatre familles de lecture :

1. **Thèse / MCB** : direction candidate et structure ;
2. **Structure / Position** : localisation, niveaux, horizon et contexte ;
3. **Conversion / Combat** : effort, rendement, Money Flow, PM et continuité ;
4. **Décision / Risque** : action ou non-action, protection et invalidation.

Ce panneau peut alterner avec un **trio de graphiques analytiques** : prix/bougies 3m, MarketCipher 15m et MarketCipher 3m. La présentation lumineuse bleue/cyan garde le même code visuel.

**À droite, ~1200×1080 :** le loft et BOONO, avec plans de données en perspective, bureau, écrans, gestes et bulles.

### 4.3 Market Curtain — ce que BOONO voit — [RÉALISÉ]

Le rideau de vagues est composé de **MCB 15m et MCB 3m** rapprochés sur une échelle commune, en perspective dans la pièce. Il utilise le même moteur graphique que la page Vagues :

`shared/boono-chart-renderer.js`.

Il montre notamment BW (cyan), LBW (blanc), MF, ligne zéro bleue, labels de fin BW/LBW/0/MF, parfois indicateurs complémentaires et marqueurs de contexte. Les deux bandes ont été rapprochées, puis légèrement desserrées. Les valeurs numériques du MCB15 ont été replacées visuellement près/sur l'enseigne BOONO-TV LIVE.

**Temporalité validée :** environ six heures visibles, les **trois heures les plus anciennes vers la gauche commencent à s'estomper**, tandis que les trois heures les plus récentes à droite restent pleinement visibles. Le passé disparaît donc derrière BOONO pendant que le présent reste lisible.

### 4.4 Prix / bougies et dernier prix — [RÉALISÉ]

Un panneau tactique de **bougies 3m**, avec MA200 verte/rouge, est distinct des vagues. La fenêtre récente y est d'environ **deux heures** après les ajustements d'octobre. Les chandeliers se développent depuis un point live stable lié à l'affiche du loft et au smiley. Les bougies passées restent vers la gauche ; la dernière information est spatialement reliée au **prix live mural**, affiché de façon plus grande.

Dans le trio analytique de gauche, le prix live a été aligné **à droite** du graphique, au même niveau que les valeurs MCB, avec conservation d'une **ligne pointillée** horizontale. Les deux indications ont été agrandies. Le panneau de prix n'essaie pas de remplacer l'OHLC source par un prix inventé ; toute mise à jour visuelle intra-bougie doit rester causale.

### 4.5 Visualisation des trades — [RÉALISÉ]

Les trois graphiques analytiques et les plans flottants ont reçu des **bandes de trades bleu ciel**, encadrées par de fines lignes verticales pour les instants entrée/sortie. Les **petits drapeaux visuels** ont été supprimés, car ils gênaient la lecture.

Cette représentation donne une mémoire spatiale des opérations sans transformer la scène en rapport détaillé de P&L. Les rapports de trades complets restent dans l'observabilité privée.

### 4.6 Bulles, expressions, rythme de scène — [RÉALISÉ / EXPÉRIMENTAL]

Quatre types de bulles sont préparés : `thought`, `exclamation`, `affirmation`, `announcement`.

Elles dépendent du type de posture et/ou de l'état réel ; leur texte est séparé de leur décor. Les bulles de pensée ont été descendues sous la zone visuelle dominante des vagues et tournées vers BOONO. Un décor de bulle peut être inversé sans inverser ses lettres. Des signes graphiques « ? », « ✓ », « … », stress, scan ou réaction sont gérés comme FX indépendants.

Plusieurs cadences d'animation existent (rotation des bulles, alternance des panneaux, changement de posture) avec temporisation. Le rythme doit rester **lent et lisible**, plutôt que multiplier les effets nerveux à chaque tick de prix.

### 4.7 Audit visuel — [EXPÉRIMENTAL]

La représentation d'« AUDIT » est volontairement secondaire. Un flux d'événements fugaces, éventuellement en profondeur et en perspective, est envisagé, mais l'audit complet n'est **pas** imposé dans la composition publique. Dans le casting courant, AUDIT est masqué par défaut, sauf activation volontaire (`?audit=flow` ou `?audit=legacy`).

### 4.8 Moteur et contraintes techniques — [RÉALISÉ]

La scène est constituée en HTML/CSS/Canvas, avec couches indépendantes, CSS `matrix3d`, projection d'images et renderer de données partagé. La composition a été automatisée et testée dans Chromium sans qu'il soit nécessaire de figer une vidéo complète pour chaque pose.

Séparation physique des responsabilités :

```text
AMSTERDAM — VPS trading
  ├─ BOONOTRADE V4 / moteur et collecteurs
  ├─ données MCB et prix OKX
  ├─ État vivant / décisions / journal / SHADOWS
  ├─ Chromium TradingView réel (collecte MCB)
  └─ bridge read-only 127.0.0.1:3090
                   │
                   │ tunnel SSH + flux /ws /api/snapshot
                   ▼
OVHCLOUD — VPS-3, studio
  ├─ boono-studio.service · 127.0.0.1:3091
  ├─ loft + personnage + bureau + écrans projetés
  ├─ prix / vagues / trade bands / bulles / FX
  ├─ moteur de calibration interactive
  ├─ boono-radio.service · 127.0.0.1:3093
  └─ sortie future FFmpeg / plateforme de diffusion
                   │
                   ▼
            BOONO-TV, public
```

Les ports indiqués sont des **ports locaux de la configuration documentée**, pas des endpoints de vente. Depuis le Chromebook de l'utilisateur, noVNC donne accès à un Chrome distant d'Amsterdam, lequel utilise son tunnel vers OVHcloud.

**Principe de sécurité et gouvernance :** aucune modification du moteur de trading ne doit être nécessaire pour déplacer un panneau, changer une bulle ou introduire un morceau de musique. Les composants public/média doivent rester en lecture seule vis-à-vis de l'exécution.

---

## 5. La dimension musicale de BOONO-TV

### 5.1 BOONO aime la musique — [VALIDÉ]

BOONO n'est pas seulement un analyste ; il possède aussi un univers musical. L'objectif éditorial est d'associer un loft chaleureux et du **House / Deep House / Chill House**, de préférence avec des artistes ou collectifs indépendants.

Un rendez-vous a été imaginé pour les vendredis **18h30–21h30** heure France/Suède, avec un DJ invité et les dernières heures de négociation new-yorkaises visibles derrière lui. Attention : les marchés actions new-yorkais ferment typiquement à **22h00** heure de Paris/Suède pendant la majorité de l'année ; 21h30 ne comprend donc pas le dernier quart d'heure / la clôture. Les écarts de changement d'heure doivent aussi être traités.

L'ambition est qu'on regarde BOONO travailler et qu'on écoute aussi de la bonne musique, éventuellement avec un artiste filmé ou une mini-scène de DJ dans le loft. Il s'agit d'une **vision d'émission**, pas encore d'un rendez-vous public réalisé.

### 5.2 Régie musicale — [RÉALISÉ / PRÉVISUALISATION PRIVÉE]

Une première régie autonome a été montée sur OVHcloud :

- `boono-radio.service` : service audio local indépendant ;
- lecture à la demande d'une playlist locale via FFmpeg ;
- flux MP3 stéréo privé, 160 kbit/s, 48 kHz ;
- volume et bouton écouter/arrêter dans une interface activée explicitement par `?radioUI=1` ;
- pas d'autoplay imposé au navigateur ;
- audio et futurs effets sur circuits distincts ;
- pas de flux musical YouTube public lancé ;
- test privé audiovisuel de 20 secondes réalisé.

Deux fichiers WAV du catalogue **StreamBeats / Low-key** ont été téléchargés depuis la source officielle : *Mindless Matter* (~2m24) et *Ride the Wave* (~2m14). Le document de licence a été conservé sur OVHcloud.

**Restriction impérative :** StreamBeats peut accompagner un contenu audiovisuel original selon sa licence applicable, mais ne doit pas être présumé autoriser une **station musicale pure** ou un DJ set consacré principalement à sa musique. Ce catalogue ne résout donc pas l'identité musicale complète de BOONO Friday House.

### 5.3 Sources et partenaires explorés — [RECHERCHE, PAS CONTRATS]

Pistes examinées : **Mixcloud**, **BeachGrooves**, collectifs de DJ indépendants présents sur SoundCloud, radios et producteurs indépendants. L'utilisateur a explicitement trouvé **Mixcloud** et **BeachGrooves** intéressants, sans arrêter de partenariat.

**YouTube est souhaité comme plateforme principale de diffusion**, mais la retransmission de musique tierce demande les droits appropriés pour les compositions, les enregistrements, l'audiovisuel en direct, et parfois une autorisation Content ID. Un abonnement SoundCloud ou Mixcloud ne transfère pas automatiquement les droits vers YouTube.

Trois formes restent à examiner : artiste jouant ses propres productions autorisées, coproduction avec une webradio, syndication d'une émission existante avec licences adaptées. Aucun partenaire n'était contractualisé au moment des échanges.

### 5.4 BOONO Sound Engine et voix robotique — [INFRASTRUCTURE PARTIELLE, PROJET FUTUR]

L'architecture prévoit un **Music Bus** et un **FX Bus** séparés. Quatre effets synthétiques originaux ont été créés pour essais : `entry-long`, `entry-short`, `tp-protection`, `exit-risk`. Le déclenchement automatique des effets sur signaux du moteur était encore désactivé.

Le projet suivant est de créer **la voix distinctive de BOONO** : faire enregistrer plusieurs manières de dire « BOONO », puis traiter séparément ces prises avec un mixer/effects (formants, filtres, saturation, vocoder/robotisation, etc.). Les personnes, autorisations et prises vocales nécessaires n'étaient pas encore disponibles. Ne pas prétendre que cette identité vocale est achevée ou que les effets sont déjà déclenchés à chaque trade.

---

## 6. BOONO Watch — hypothèse de deuxième étage de produit

**[VISION / SPÉCIFICATION À ÉTABLIR]** — Le nom est mentionné par le propriétaire du projet, mais son périmètre exact n'est pas confirmé dans les passations accessibles. **Ne pas assimiler automatiquement BOONO Watch à l'ancien « Market Watch » interne**, qui était une activité d'enquête et de suivi méthodologique en septembre 2026.

### 6.1 Positionnement à discuter

Après le canal public BOONO-TV, BOONO Watch pourrait être le **lieu où le spectateur devient observateur actif**, sans obtenir le contrôle de BOONOTRADE. Autrement dit :

> **BOONO-TV montre ; BOONO Watch permet de suivre, retrouver et comprendre.**

Des fonctions possibles, **non validées individuellement**, pourraient comprendre :

- lecture structurée de l'État vivant, des Vagues et du contexte ;
- chronologie des changements de thèse et des événements MCB ;
- événements d'entrée, de protection, de sortie et d'abstention ;
- consultation de périodes et replays pour comprendre un trade ;
- filtres par timeframe, événements, contexte ou scénario ;
- alertes personnalisées et journal des événements à définir ;
- références explicites à l'âge et à la fraîcheur des informations ;
- séparation entre événement prospectif, observation confirmée et analyse a posteriori.

Une partie de la **matière technique** nécessaire existe déjà dans l'observabilité privée BOONO (État vivant, Vagues, SHADOWS, journaux). En revanche, **cela ne prouve pas l'existence d'une application BOONO Watch**, d'une authentification multi-utilisateur, d'une infrastructure de notifications, ni d'un site commercial fonctionnel.

### 6.2 Public et valeur proposés

Public possible : auditeurs réguliers BOONO-TV, traders qui veulent regarder le marché avec une méthode, utilisateurs souhaitant apprendre les étapes d'une décision plutôt que recevoir un signal opaque.

Valeur potentielle : **continuité, explication et traçabilité**, entre deux passages devant le live. Il ne s'agit pas de promettre que suivre BOONO produit des trades gagnants.

### 6.3 Questions à valider pour Watch

- Watch s'adresse-t-il au grand public, aux abonnés ou à un cercle d'expérimentateurs ?
- Propose-t-il un journal de BOONO ou aussi des alertes sur d'autres actifs ?
- Une donnée différée/gratuite et une donnée live/premium seront-elles séparées ?
- Le spectateur voit-il seulement BOONO ou peut-il configurer ses propres tableaux de lecture ?
- Quelles données MarketCipher/TradingView peut-on légalement republier à des tiers ?

**Aucune réponse n'est inventée dans cette passation.**

---

## 7. BOONO PRO — hypothèse de troisième étage de produit

**[VISION / SPÉCIFICATION À ÉTABLIR]** — La marque « BOONO PRO » est donnée dans la demande présente ; aucun périmètre et prix déjà validés n'ont été retrouvés.

### 7.1 Positionnement à discuter

BOONO PRO pourrait être une **offre d'outillage avancé et de travail analytique**, destinée à ceux qui ont dépassé l'écoute et l'observation.

> **BOONO-TV attire et explique ; BOONO Watch suit ; BOONO PRO approfondit et outille.**

Fonctions envisageables — **pistes, non fonctionnalités actives** :

- travail multi-timeframe approfondi ;
- accès avancé aux chronologies de preuves, contre-preuves et transformations du prix ;
- filtres de configuration, replays, exports et comparaisons ;
- analyse de contexte, risque, MFE/MAE, frais et scénarios ;
- tableaux d'expérience avec tests shadow et statistiques, lorsque la méthodologie est robuste ;
- éventuellement outils de surveillance ou de recherche propres à l'utilisateur, après conception et validation de leurs sources et autorisations.

**Ne pas affirmer** que BOONO PRO permettra de brancher un compte OKX personnel, d'exécuter automatiquement des ordres, de copier les trades de BOONO ou d'offrir des recommandations d'investissement individuelles : rien de cela n'est confirmé ici. Un éventuel passage vers de telles fonctions demanderait une décision de conception séparée, une architecture de sécurité et une analyse juridique/réglementaire adaptée.

### 7.2 Ce qui peut être mutualisé avec le moteur

Les actifs les plus importants pour PRO ne sont pas des signaux commerciaux immédiats, mais :

- le traitement causal de MCB et la distinction live/confirmé ;
- la structure de preuves et contre-preuves ;
- l'historisation des décisions et non-décisions ;
- les expériences en shadow et leurs résultats mesurés ;
- l'observabilité, les replays et la discipline du risque ;
- la comptabilité des frais et la notion de conversion réelle en prix.

Cette mutualisation doit passer par des **interfaces de lecture et de calcul dédiées**, sans exposer un accès d'écriture aux processus critiques d'Amsterdam.

### 7.3 Ce qu'il reste à démontrer

BOONO PRO ne doit pas être lancé sur un discours de « robot rentable » avant preuve. Une offre analytique peut avoir une valeur autonome par la qualité de son instrumentation et de son enseignement, mais il faudra démontrer qu'elle est compréhensible, fiable et utile à ses utilisateurs.

Questions ouvertes : produit SaaS ou installation autonome ? individuel/professionnel ? périmètre crypto uniquement ou multi-marchés ? politique des données propriétaires ? profondeur de l'interface et coût d'exploitation ? droits logiciels et limites réglementaires ? Aucun prix d'abonnement n'est fixé.

---

## 8. Évolution de la proposition de marché de BOONO Systems

### 8.1 Point de départ : moteur autonome

L'idée d'origine est de construire un système de trading capable de lire la structure, gérer le risque et agir de manière autonome. La question économique initiale est la performance **après frais**, qui reste non démontrée.

Ce premier projet a généré un savoir-faire technique : collecte MarketCipher, analyse multi-TF, journalisation, replays, étude des erreurs et des contre-exemples, méthodes de séparation entre vérité du prix et intentions des signaux.

### 8.2 Premier élargissement : média et personnage

Le produit immédiatement visible devient **BOONO-TV** : un média de démonstration de la vie du robot. Il est potentiellement diffusé sur YouTube, avec des formats musicaux et des invités. Ce canal peut exister comme **première prise de contact du public avec BOONO Systems**, même si la rentabilité du moteur reste en recherche.

La monétisation par la publicité, les sponsors, le soutien communautaire ou la programmation DJ est **hypothétique** : aucun revenu récurrent n'est établi ici.

### 8.3 Deuxième élargissement : utilité récurrente / Watch

Un spectateur qui apprécie le live pourrait vouloir retrouver les explications, événements et évolutions hors antenne. C'est le raisonnement commercial derrière l'hypothèse BOONO Watch : transformer l'attention d'une émission en **utilité quotidienne vérifiable**, par l'observabilité et la mémoire.

Le concept nécessite validation utilisateur : fonctions, droit d'accès, gratuité/abonnement, actualisation live, données de marché et coûts.

### 8.4 Troisième élargissement : outils experts / PRO

Un utilisateur avancé pourrait rechercher une plateforme d'enquête et d'analyse plus complète. La valeur viendrait de la **méthode et de la précision** des outils, et non de la simple promesse de reproduire une performance de BOONOTRADE.

Cela pose une progression commerciale plausible :

| Niveau | Promesse éditoriale ou utilitaire | Public envisagé | État au 19 octobre |
|---|---|---|---|
| **BOONO-TV** | Voir BOONO travailler et comprendre ses décisions dans son atelier | Public, communauté, passionnés de marché et de musique | **Studio technique démontré**, diffusion commerciale non constatée |
| **BOONO Watch** | Suivre l'évolution du marché et de BOONO avec mémoire et contexte | Spectateurs réguliers, observateurs et apprenants | **Positionnement à définir**, app spécifique non démontrée |
| **BOONO PRO** | Étudier, comparer et exploiter des outils d'analyse avancée | Utilisateurs experts, professionnels éventuels | **Hypothèse commerciale**, cahier des charges non validé |

**Ce tableau est une architecture de proposition, pas une tarification ni une feuille de route approuvée.**

### 8.5 Actifs distinctifs et différenciation possible

- **Visibilité du travail réel** plutôt que captures marketing déconnectées de l'exécution ;
- **personnage/atelier** offrant continuité de marque et émotion sans falsifier les signaux ;
- **moteur causal** : distinction entre preuve nouvelle, ancienne, confirmée, fragile ou invalidée ;
- **mesure du prix** comme arbitrage de la valeur d'une thèse ;
- **observabilité** des erreurs, abstentions, protections et trades ;
- **récit musical et communautaire** indépendant de la performance instantanée ;
- **séparation technique** entre décision, consultation et diffusion.

Cela peut faire passer BOONO d'un « logiciel qui trade » à un **écosystème de recherche, spectacle et outils**. Pour éviter la dilution, chaque étage devra cependant avoir **une utilité propre** et des frontières nettes.

### 8.6 Limites économiques et de crédibilité

Le dernier rapport moteur du 19 octobre confirme qu'il serait prématuré de commercialiser une promesse de profit : sur **51 trades intégrant les frais**, le brut était **+54,47 $**, les frais **−76,51 $** et le résultat net **−22,04 $**. Une courte fenêtre V4.10.7 apparaissait positive mais dominée par un gros gagnant et statistiquement insuffisante.

La stratégie continue donc d'être améliorée selon une discipline d'enquête : observation → hypothèse → shadow → mesure → validation → modification active limitée.

**La viabilité économique de BOONO Systems pourrait provenir de plusieurs sources différentes.** Elle ne doit pas être assimilée automatiquement au rendement du compte de trading.

---

## 9. Connexion de BOONO-TV, Watch et PRO au moteur — frontières impératives

### 9.1 Une seule source de faits

Les applications publiques ou clientes ne doivent pas produire leur propre vérité de marché différente de celle qui nourrit BOONOTRADE. Elles doivent réutiliser, avec la bonne fraîcheur, les mêmes événements ou des vues calculées et clairement identifiées.

```text
Moteur / MCB / prix / décisions / audit
             │
             ▼
       Couche de publication
  (lecture seule, timestamps, version,
   niveaux d'accès et nettoyage données)
             │
     ┌───────┼────────┐
     ▼       ▼        ▼
 BOONO-TV  Watch     PRO
 public    suivi     étude avancée
```

### 9.2 Isolation des responsabilités

- Amsterdam est le système de vérité pour la collecte et les décisions. Il ne doit pas porter des charges lourdes d'encodage, d'animation ou d'abonnements publics.
- OVHcloud fournit des capacités de studio, audio, projection et éventuellement demain des services publics, après sécurisation.
- Aucune application client n'écrit dans les règles de BOONOTRADE sans contrat d'autorisation explicite.
- Les shadows ne deviennent pas des décisions actives simplement parce qu'un produit commercial les expose.
- Les identifiants OKX, les journaux sensibles et les données propriétaires restent hors de la surface publique.
- La diffusion ou la redistribution de données et de visuels tiers (TradingView, MarketCipher, musique) requiert une vérification des droits applicable à chaque produit.

### 9.3 Provenance et horodatage

Dans une future offre Watch/PRO, un événement doit pouvoir porter : `source`, `generatedAt`, `effectiveAt`, `timeframe`, `liveOrConfirmed`, `version`, `decisionImpact`, `dataQuality` et éventuellement `tradeId`. Ce schéma est une **proposition de contrat de publication** à spécifier, et non une affirmation que l'API existe déjà avec tous ces champs.

---

## 10. Les grandes phases de travail et leurs enseignements

### Phase 1 — Le moteur devient observable (avant octobre 2026)

BOONOTRADE s'est construit sur la collecte MarketCipher, le prix, le ticker et les décisions. Les premières interfaces montraient l'état et les trades, mais les difficultés de timing, de frais, de synchronisation multi-TF et d'autorité de chaque signal ont imposé un journal et des outils plus précis.

**Leçon :** le moteur réel et ses preuves constituent un actif informationnel qui peut être montré, mais sans interprétation romancée ni simplification mensongère.

### Phase 2 — Naissance du personnage et du loft (11–13 octobre)

Travail de conception sur le **robot canonique**, sept attitudes, expressions indépendantes, trois images de référence et un loft. Les premiers compositings avec images recadrées ont révélé le besoin de retirer les écrans et autres éléments peints du décor.

**Décision :** fond vide, objets séparés, masques/alpha, réutilisation d'un vrai renderer de données.

### Phase 3 — Poste de travail crédible, capture vraie (13–14 octobre)

Le bureau, les deux écrans projetés et un daemon de capture TradingView sur Amsterdam ont été intégrés. À droite le véritable MCB ; à gauche les instruments de BOONO. Le prototype démontre le lien entre les gestes et ses écrans sans toucher aux collecteurs.

**Décision :** garder la preuve visuelle d'un environnement de travail authentique.

### Phase 4 — Ajustements du casting et de la lecture (14–15 octobre)

Multiples boucles d'observation en captures d'écran : disposition de l'État vivant et de trois graphes, perspective du rideau MCB3/15, fondu du passé, ligne zéro et labels MCB, dernier prix près de l'affiche, bougies rattachées au live, bandes de trades sans drapeaux, bulles réorientées, AUDIT caché par défaut.

**Leçon :** l'emplacement des éléments graphiques influence la compréhension et doit pouvoir être réglé sans modifier du code.

### Phase 5 — Mode calibration par l'utilisateur (15 octobre)

Installation d'un éditeur direct avec poignées, homographies calculées, sauvegarde JSON OVHcloud et tests automatiques. L'utilisateur a ensuite placé les éléments manuellement selon son propre jugement.

**Décision :** conserver la maîtrise artistique du créateur, automatiser seulement la géométrie et le rendu.

### Phase 6 — Univers musical et régie privée (15 octobre)

Naissance de « BOONO Friday House » : House/Deep House, webradios et DJ invités ; exploration Mixcloud, BeachGrooves, SoundCloud et partenaires. Installation d'une chaîne de lecture FFmpeg sur OVHcloud, premiers titres StreamBeats sous restrictions, création d'un bus FX et de sons d'essai.

**Leçon :** une atmosphère musicale peut augmenter l'attrait du média, mais les droits des oeuvres et les capacités de live YouTube doivent être traités avant tout usage public.

### Phase 7 — Audit des deux VPS et problème Chromium (15 octobre)

La source des JPEG blancs a été localisée sur la capture graphique, pas dans le moteur V4 ni dans le studio OVHcloud. L'arrêt de la capture pendant une fenêtre synchronisée a arrêté les glitches observés sur le 3m ; sa reprise a fait réapparaître le phénomène. Les données du collecteur sont restées saines pendant le test.

**Décision :** préserver le MCB authentique et traiter la gêne graphique de capture sans restructuration du moteur ; surveillance mémoire Amsterdam et stabilité des vues noVNC.

### Phase 8 — Passage possible à une gamme de produits (19 octobre, présente passation)

Le studio réel constitue le premier niveau tangible. Le propriétaire souhaite maintenant intégrer **BOONO Watch** puis **BOONO PRO** dans le récit de l'évolution de la proposition de marché.

**État méthodologique :** ces deux produits ne doivent pas être « dessinés » comme s'ils existaient déjà. Le prochain échange doit récupérer ou définir leur périmètre exact, puis en déduire une architecture cohérente et un modèle économique vérifiable.

---

## 11. État des serveurs et limites d'interprétation

**Ce qui a été testé les 15 octobre :**

- Amsterdam : VPS 2 vCPU, ~4 Gio RAM, ~80 Gio disque. Moteur et collecteurs actifs dans les contrôles de l'époque. Des processus Chromium consommaient une fraction significative de la RAM et ~1 Gio de swap était occupé, sans saturation CPU permanente selon les mesures historiques.
- OVHcloud : VPS-3, 6 vCPU, ~12 Gio RAM, plus de 90 Gio de disque disponible lors des tests. Faible charge CPU et grande réserve mémoire ; studio et régie audio opérationnels en test.
- L'interface BOONO-TV continuait à lire l'État vivant et les graphes depuis Amsterdam via tunnel ; les problèmes de JPEG concernaient le **flux de capture visuelle**.

**Dernier snapshot V4 documenté le 19 octobre, 16h45 Paris :**

- version : `v4.10.7-local-retry-requalification-20261017` ;
- position : **FLAT** ;
- 143 trades V4 clôturés ;
- qualité MCB : `DATA_OK` ;
- Elastic Sync v0.3 en shadow ;
- le SHORT #143 et sa sortie prématurée constituent une étude en cours.

Cette photographie du trading est fournie pour situer la conception produit : **elle n'est pas un audit en direct de 18h23 et ne doit pas remplacer un contrôle du serveur.**

Le travail BOONO-TV/OHVcloud et les versions du moteur V4 vivent dans des sous-projets distincts. Le dépôt trading contenait historiquement des fichiers BOONO-TV modifiés hors de l'autre chantier : ne pas les inclure dans un commit de stratégie par mégarde.

---

## 12. Ce qui est réalisé, ce qui relève de la vision

| Élément | Qualification à transmettre |
|---|---|
| Moteur BOONOTRADE, collecte MCB, État vivant, Vagues, SHADOWS | **RÉALISÉ**, états/progrès à revérifier |
| Identité de BOONO, loft, bureau et deux écrans projetés | **VALIDÉ et prototypé** |
| Sept postures, bulles, data planes, calibration interactive | **RÉALISÉ / TESTÉ** ; dessins définitifs et animation avancée restant ouverts |
| MarketCipher réel écran droit + capture 10 s | **RÉALISÉ**, glitch de capture confirmé ; conserver authenticité |
| Trois graphes analytiques et plans MCB/prix flottants | **RÉALISÉ** |
| BOONO Radio : deux WAV et régie privée FX | **RÉALISÉ en test**, diffusion musicale publique non qualifiée |
| DJ invités / Friday House sur YouTube | **VISION**, droits et partenaires non confirmés |
| Voix robotique originale de BOONO | **PROJET**, enregistrements tiers et mixage attendus |
| BOONO Watch | **PRODUIT À DÉFINIR**, non démontré comme application déployée |
| BOONO PRO | **PRODUIT À DÉFINIR**, non démontré comme application déployée |
| Rentabilité du moteur ou revenu commercial | **NON DÉMONTRÉS** à la date de cette passation |

---

## 13. Points de départ pour la prochaine discussion technique et conceptuelle

1. **Valider la cartographie de produits** : les noms BOONO Watch et BOONO PRO correspondent-ils bien aux rôles présentés comme hypothèses ? Quelles fonctions doivent absolument en faire partie et lesquelles en être exclues ?
2. **Définir la proposition d'utilité de chacun** : pourquoi un spectateur BOONO-TV passerait-il à Watch ? Pourquoi un utilisateur Watch paierait-il PRO ? Quel problème concret est résolu ?
3. **Séparer les degrés de preuve** : état réel de BOONO, contenu public, démos artistiques, shadow et historiques ; éviter toute promesse de gains.
4. **Dessiner les contrats de publication read-only** entre Amsterdam et les futurs produits ; envisager mise en cache, droits d'accès, fréquence, historisation et incident de données.
5. **Protéger les actifs de marque** : robot canonique, atelier, authenticité de l'écran TradingView, calibrage manuel, présence du prix et des vagues, univers musical.
6. **Décider des droits de tiers** avant monétisation : TradingView/MarketCipher, musique, images, données redistribuées, YouTube/Content ID.
7. **Conserver l'étanchéité d'exploitation** : décision/exécution Amsterdam ; studio, audio et services publics hors du moteur ; modifications de trading uniquement après protocole d'audit, mesures et autorisation explicite.
8. **Clarifier la feuille de route** : prototype BOONO-TV opérationnel → produit Watch spécifié et utile → pilote PRO mesurable → lancement seulement lorsque produit, sécurité et droits sont prêts.

### Formulation de reprise, prête à transmettre

> Nous poursuivons BOONO Systems comme système cohérent de produits : BOONOTRADE est le moteur privé et expérimental ; BOONO-TV en est la représentation publique incarnée par BOONO dans son loft avec ses véritables outils ; BOONO Watch et BOONO PRO doivent être définis comme niveaux suivants de l'utilité et du marché. Préserve l'identité du robot et de son bureau, le vrai MarketCipher sur l'écran droit, l'architecture read-only Amsterdam/OVH, la calibration interactive, la régie audio et la discipline factuelle du moteur. Commence par valider les définitions exactes de Watch et PRO, puis cartographie les données, les fonctionnalités, les droits, les risques et la proposition de valeur ; n'invente ni application commercialisée, ni rentabilité, ni autorité de trading supplémentaire.

---

## 14. Sources et provenance utilisées

**Documents de mémoire consultés :**

- `BOONO-TV_passation_complete_2026-10-13.md` — identité canonique, composants du loft, sept poses, moteur de scène, bureau et capture de MarketCipher, détails de la bibliothèque visuelle et du rendu.
- `BOONO_passation_2026-10-19.md` — architecture du moteur, statut 16h45, difficultés fee-aware, rôles de l'observabilité, séparation BOONO-TV / SHADOWS / Vagues / État vivant.
- `BOONO_etat_2026-09-24.md` et documents de Market Watch — protocole observation/décision et principe de distinction des faits, de la mémoire et des hypothèses.
- `knowledge/business-context.md` sur Amsterdam — mémoire ancienne (juillet 2026) d'une ambition d'application commercialisable en 2027 ; **texte historique obsolète techniquement**, ne pas réutiliser ses serveurs, son exchange ou ses projections financières comme faits actuels.

**Constats et validations de la présente discussion (octobre 2026) :**

- retouches successives du rideau MCB, du prix live, du bureau et des bulles ;
- réalisation/essai puis appréciation positive du mode calibration interactive ;
- mise en place et test d'une régie musicale privée et préparation des effets ;
- veille préliminaire sur les partenaires House ;
- audit Amsterdam/OVH et test causal de suspension de capture.

**Lieux techniques/documentaires à consulter à nouveau, sans en supposer la validité permanente :**

```text
Amsterdam :
/root/agents-ia-zero-one/zero-one/boono-tv/
/root/agents-ia-zero-one/zero-one/boono-tv/desk/desk-capture-daemon.js
/root/agents-ia-zero-one/zero-one/boono-tv/assets/desk-live/
/root/agents-ia-zero-one/zero-one/data/trade-sim-v4-state.json
/root/agents-ia-zero-one/zero-one/knowledge/

OVHcloud :
/home/ubuntu/boono-tv-studio/runtime/boono-tv/scene/
/home/ubuntu/boono-tv-studio/runtime/boono-tv/desk/projection-config.json
/home/ubuntu/boono-tv-studio/runtime/shared/boono-chart-renderer.js
/home/ubuntu/boono-tv-studio/audio/
```

**NOTE DE PASSATION IMPORTANTE :** La présente synthèse établit solidement **qui est BOONO**, **où et comment il travaille** et **ce qui a été construit sur BOONO-TV**. Pour **BOONO Watch** et **BOONO PRO**, elle livre une articulation commerciale argumentée mais **pas une spécification préexistante retrouvée**. La prochaine discussion doit faire valider ce point par le propriétaire avant de structurer son développement.

---

*Fin de passation — BOONO Systems, 19 octobre 2026.*
