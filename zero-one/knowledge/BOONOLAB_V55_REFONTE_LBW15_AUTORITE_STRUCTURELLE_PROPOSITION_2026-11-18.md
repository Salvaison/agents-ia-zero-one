# BOONOLAB — Refonte envisagée V5.5 : LBW15 directeur, structure avant événements, minimum de seuils

**18 novembre 2026, discussion de conception — STATUT : ORIENTATION UTILISATEUR VALIDÉE, NOUVELLE POLITIQUE PAPER NON IMPLÉMENTÉE.**

## Intention et critique de l'utilisateur

L'utilisateur privilégie la lecture d'une campagne MCB 15m durable : angles de LBW15, variations de sa pente, contact / rejet / croisement confirmé de BW15, capacité de BW/LBW15 à poursuivre dans un marché satisfaisant, et rôle de LBW3/E3 pour temporiser les entrées/sorties. MF15 est une confirmation de qualité souvent lente, intégrant les impulsions tactiques MF3 ; le comportement de MF doit se lire avec celui des vagues et de PM. L'interprétation du lieu et de la liquidité doit expliquer le sens et la conservation du territoire, **non former une liste de verrous autonomes et diffus**. Plus d'autorité à LBW15, beaucoup moins de seuils.

## Constats confirmés dans les sources

1. **18 minutes cross3 / 25 minutes E3** sont des horizons de validité codés à la création V5.5 sans justification empirique prouvée : `decision-v55.js` `freshCross` et `native3Aligned`. Ce ne sont pas des mesures de maturité de campagne. Leur rôle décisionnel est candidat à suppression dans une nouvelle constitution.
2. La pente signée LBW15 est mesurée sur des fenêtres d'observation de 3m/15m; continuation actuelle : delta15>=-1 et delta3>=-2 ; inflexion opposée au parent : delta15>=4 et delta3>=0. **Hypothèse utilisateur : autoriser delta3>=-2 pour la transition à pente15 favorable**, ce qui est un assouplissement par rapport à >=0, à tester sans promouvoir automatiquement au PAPER.
3. La géométrie relative BW15/LBW15 et la dynamique de leurs contacts ne détiennent **pas** une autorité équivalente dans V5.5. Le code calcule l'écart et la contraction, mais la sélection d'entrée repose sur une checklist. Le croisement de référence 15m est consulté pour un veto/sortie composé avec d'autres signaux.
4. **MF15 est calculé mais n'entre PAS directement dans le prédicat `conv.productive`** ; seul MF3 y est comparé à un seuil. Ceci contredit la relation confirmative qualitative MF15/MF3 exprimée par l'utilisateur.
5. **Territoire, prix, conversion, régime, lieu, maturité, macro, cross3/E3, stop, antigaspillage sont cumulés comme des conditions** d'admission. Il existe des exemptions disjointes et incohérentes : `MA15_CLOSED_CONTACT` a été admis comme `validated` sur V5.5 #14 sans vraie défense 3m. `boonolab-place-e1e4-shadow.marketReading` note `DESCRIPTIVE_SHADOW_NOT_VALIDATED`, mais `decision-v55.marketGate` en fait une permission/refus PAPER.
6. **Aucun ordre flow / liquidité passive L2 n'est mesuré directement par V5.5.** Bâton et observateur de régime apportent des proxies d'activité et de rendement, les niveaux BigRange/POC/VAH/VAL des lieux statiques (non carnet d'ordres). PM3/PM5/Live = déplacement de prix, pas mesure indépendante d'ordres agressifs ; ne pas additionner ces familles comme votes.
7. Le code exige pour sortie stratégique E15 confirmé opposé après entrée + cross15 contraire + PM ou MF adverse, parfois trop tard. La sortie locale peut être plus précoce sans transformer la campagne. Inversement, la contre-attaque 3m ne doit pas forcément finir la campagne.
8. Le **17 novembre 15h30–16h43**, les journaux V543 montrent parent E15 SHORT persistant malgré cross15 géométrique LONG dès 15h36, LONG→SHORT→LONG entre 15h36–15h39 et un E15 natif LONG vers 15h46 avant retour SHORT vers 16h03. Cela exige une distinction entre **contact / cross provisoire / cross confirmé et accepté par le prix**, plutôt qu'un principe absolu de croisement suffisant pour liquider à tous les instants. C'est un cas de très forte volatilité, pas une réfutation des observations de l'utilisateur en marché satisfaisant.

## Hiérarchie à formaliser dans une proposition de nouvelle constitution, sans nouvelle implémentation PAPER

### 1. Objet CAMPAIGN_15M — autorité principale

- Observer la trajectoire propre de LBW15 et BW15 : sens, accélération/décélération, pente relative `d(LBW15-BW15)/dt`, écart, contact, échec de croisement, cross15 Live, cross15 confirmé, relation E15 natif/parent.
- Parent stratégique mémorisé sans être réinitialisé par un Cross3. États qualitatifs : `ACTIVE`, `CONTACT_CONTESTE`, `CONTRE_ATTAQUE`, `REPRISE_PARENT`, `TRANSFERT_CONFIRMÉ` (à définir causalement).
- Un **cross15 confirmé opposé** devrait être une **présomption majeure de bascule stratégique**, non une donnée secondaire attendant E15 confirmé + PM/MF adverses comme trois votes. Le prix et la défense territoriale qualifient le transfert (réalisé, tentative, rejet), pas une série de seuils arbitraires.
- La continuation reste la **thèse par défaut** tant que la dynamique MCB15 n'a pas été réellement défaite, sous réserve du risque de position distinct et des preuves de transfert du prix.

### 2. Objet EPISODE_3M — timing, non changement automatique de parent

- Cross3, E3 et LBW3 pour reconnaître ouverture tactique, respiration, contre-attaque, nouvelle attaque dans même campagne, sortie économique locale.
- Fraîcheur définie par la relation aux **événements causaux pertinents de la campagne** et par la non-consommation de l'opportunité, pas par 18/25 minutes fixes.
- La sortie de POSITION ne détruit pas CAMPAGNE. Réouverture après une vraie tentative requalifiée, pas une nouvelle minuterie de 15 min à elle seule.

### 3. Objet CONFIRMATION — MF et conversion économique

- MF15 : trajectoire lente, variations discrètes, aplatissement, retournement, persistance ; **pas une obligation de pente instantanée importante**.
- MF3 : impulsions tactiques internes à MF15, cohérence/contradiction avec BW15/LBW15 et le déplacement PM/prix.
- PM/QUALITÉ : réponse du marché, effort/rendement/conservation ; ne pas baptiser productive une PM légèrement contraire simplement parce que PM3/PM5 sont positives. Contrôler la persistance et le prix gagné, sans double comptage.
- Le régime/liquidité conditionne la prudence, la fiabilité et la maturité de la lecture, **pas un quatrième vote directionnel**.

### 4. Objet PLACE — trois responsabilités claires

- **Où ?** BigRange, DailyRange, MA200 3m/15m, swing, front de prix, zones VAL/POC/VAH (lieux statiques, pas profondeur carnet).
- **Qu'a fait le prix ?** attaque, résistance, rejet, retest accepté, gain/perte de territoire, défense après contre-attaque, avec chronologie.
- **Quel niveau invalide la position ?** niveau structurel connaissable et logique de risque distincte ; pas d'invalidation automatique de la campagne sur simple oscillation 3m.
- Bannir la confusion `contact MA` = `défense confirmée`. Aucune règle de lieu seul n'impose une direction.

### 5. Objet POSITION/RISK — autorité séparée, non négociable

- Conserver le mode PAPER et le hard risk adverse 500 BTC$ tant que la politique de risque n'est pas rediscutée. Conserver comptes/frais/horloges.
- Distinguer `HOLD` (campagne et position), `ATTENTION` (contre-effort), `PROTECT` (risque croissant / territoire cédé), `EXIT_POSITION` (invalidation économique/locale) et `TRANSFER_CAMPAIGN` (cross15 confirmé et accepté).
- L'EXIT_POSITION peut précéder TRANSFER_CAMPAIGN ; dans ce cas la mémoire de la campagne subsiste et permet réexamen de la reprise.

## Validation et tests requis avant toute promotion PAPER

- Formuler d'abord les hypothèses contradictoires en SHADOW ; ne pas fabriquer de seuils numériques en place des 18/25/0/4/−2. Éprouver les valeurs existantes en observation sans leur donner automatiquement un droit de veto.
- Cas d'origine : 17/11 V5.5 #14/#15 vs V543 #272/#273, avec **cross15 provisoires et natif opposé temporaire** et mémoires parent/Candidate/position. Cas positifs à préserver V5.5 #13, V543 #273, autres bonnes campagnes.
- Comparer le niveau de campagne, et pas seulement le P&L par ticket : nombre de parents, faux transferts, fréquence des retours au parent, temps passé en conflit, points de reprise et stops locaux, gains réellement retenus, frais, exposition et abstentions. Replay as-of et données manquantes.
- Comparer les schémas `cross15 confirmé` seul, `cross15 + observation du prix conservé`, et `LBW15 pente + MF15/MF3 + microstructure` ; mesurer combien de signaux « forts » auraient été de faux renversements et quelles grandes campagnes auraient été préservées.
- Ne pas modifier V5.5 v1.1 PAPER, ni les comptes, ni S1 v0.2 durant cette phase de proposition. Toute promotion requiert une version/politique explicite et un audit de la migration/position ouverte.

**Statut exact :** PROPOSITION DE RECONSTRUCTION FONDÉE SUR LES OBSERVATIONS UTILISATEUR ET LA CONSTITUTION V5 DU 22/10/2026, non contrat numérique approuvé, non code en service. Les principes de priorité LBW15 et de réduction des seuils ont été exprimés explicitement par l'utilisateur le 18/11/2026. 
