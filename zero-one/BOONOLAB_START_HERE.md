# BOONOLAB — carte d'identité et passation générale de BOONO Systems

**Référence d'accueil des nouvelles discussions · 28 octobre 2026 · version 1.0.**
**À lire en premier, puis :** [index thématique](knowledge/BOONOLAB_INDEX.md) → [Knowledge Base](knowledge/) → [registre des décisions et prompts intégraux](knowledge/operational-decisions/README.md).
**Convention impérative :** *serveur = état opérationnel à l'instant du contrôle ; code = politique implémentée ; journaux = faits observés ; documents = mémoire ; propositions = hypothèses*. Une photographie datée n'est jamais un état live garanti.

## 1. Qu'est-ce que BOONO ? Qui est BOONO ?

**BOONO Systems** est un projet original de recherche appliquée, d'ingénierie et de création médiatique consacré à la lecture causale du marché BTC/USDT. Initié par Benjamin Weibel en 2026, il cherche à faire fonctionner un **agent analytique déterministe**, capable d'observer les marchés, de reconstruire leurs séquences, de décider d'entrées et sorties en simulation et de rendre ses raisons consultables. **La rentabilité durable après frais n'est pas démontrée** ; les ordres financés ne sont pas activés dans les deux moteurs PAPER actuels.

**BOONO** désigne aussi le **personnage** qui incarne publiquement cet agent : robot carré bleu métallique patiné, grands yeux ronds, rivets et antenne à boule rouge, personnalité obstinée, analytique, parfois drôle et existentielle, jamais un simple robot « mignon ». Ses sept postures sont `WORKING / THINKING / WORRIED / CONCENTRATED / CONFIDENT / OBSERVE / EXECUTE`. C'est une représentation graphique de phénomènes mesurables, **pas l'affirmation d'une conscience**.

**BoonoLab** nomme ici **l'atelier de recherche et la méthode d'enquête** sur la structure des marchés, les comportements des moteurs, les replays et les expériences. Ce nom **n'implique pas** l'existence d'un troisième moteur de trading ou d'un service autonome confirmé sous ce nom.

## 2. À quoi sert la plateforme ? Les quatre espaces

| Espace | Fonction et maturité |
|---|---|
| **BOONOTRADE** | Collecter, qualifier, interpréter, décider et simuler ; moteurs PAPER indépendants sur le VPS Amsterdam. Réel techniquement, efficacité économique encore en recherche. |
| **BOONO Watch / BoonoView** | Interface privée d'**observabilité et de laboratoire** : État vivant, Trades/Historique, Vagues MCB 3m/15m, prix/MA200, Niveaux/Scénario, Conversion/Flow, Audit et Shadows. Rapports complets chargés à la demande. Existe, mais **pas un service public commercial confirmé**. |
| **BOONO-TV** | Studio média séparé sur OVHcloud : rendre visibles le marché, le travail de BOONO, son bureau, ses postures et ses commentaires graphiques. Prototype/scène et régie privée réalisés ; **diffusion YouTube régulière non confirmée**. |
| **BOONO PRO** | Projet d'outillage analytique avancé et éventuellement de produit commercial. **Vision non spécifiée ni commercialisée**. Ne pas lui attribuer d'accès à des ordres ou des fonctions payantes existantes. |

**Règle de frontière :** BOONO-TV et les interfaces d'observation consomment les informations du moteur ; elles **ne commandent ni les ordres ni le risque**. Une expérience shadow ne devient pas une politique de trading par sa seule présence à l'écran.

## 3. Cartographie technique : un marché, deux centres de calcul

```text
TradingView / MarketCipher B (MCB : 3m, 15m et horizons de contexte)
             + prix / transactions / cadence OKX BTCUSDT
                         │
                         ▼
           AMSTERDAM — VPS DigitalOcean
      collecteurs Chromium/CDP + PM2 + fichiers MCB
                         │
        état causal / niveaux / MA / MF / PM / ticker
                         │
               ┌─────────┴─────────┐
               ▼                   ▼
        V5.4.3 PAPER          V4.9.4 PAPER
        structure E15/3       base V4.9.3 + attention
        + mémoire offensive   temporelle en observation
               │                   │
               └─────────┬─────────┘
                         ▼
        ledgers et décisions séparés, audits, shadows
                /              \
        BOONO Watch privé     bridge BOONO-TV
        config-server         read-only, local :3090
                                   │ SSH / WebSocket
                                   ▼
                          OVHCLOUD — VPS-3
                  studio local :3091, radio :3093
                 scène HTML/CSS/Canvas, homographies
                    loft + BOONO + prix + MCB
                     → prévisualisation / média
```

**Amsterdam (machine du trading) :** VPS historiquement documenté à 2 vCPU / 4 Go RAM / 80 Go ; dépôt `/root/agents-ia-zero-one/`, code principal `zero-one/`. Collecte MCB TradingView et prix/transactions OKX ; stockage local `zero-one/data/` et `/root/agents-ia-zero-one/data/mcb-live/` (données volumineuses **non versionnées**). Services PM2 de collecte, simulation, interface, trendlines, audit, bridge TV et capture de l'écran réel. Chrome/noVNC peut être atteint via tunnel sécurisé ; ce n'est pas le navigateur du Chromebook qui produit la vérité de trading.

**État vérifié le 28/10/2026 sur Amsterdam :** `boono-v543-paper` et `boono-v494-paper` sont les **deux runners PAPER en ligne**. Ils n'ont **ni le même code de décision, ni le même ledger** ; `brokerOrdersEnabled=false` est explicite dans leurs runners. La base V4.9.3 est conservée dans un worktree immuable, `/root/boono-v493-baseline/` (commit `cdf1936`). Le runner V4.9.4 ajoute la lecture temporelle **sans autorité automatique de sortie** ; V5.4.3 ajoute la mémoire de **maturité de l'offensive** à la filiation V5.4.1/V5.4.2. Les versions plus anciennes des passations sont des **états historiques**.

**OVHcloud (machine du média) :** VPS-3 historiquement 6 vCPU / 12 Go RAM / 96 Go ; studio sous `/home/ubuntu/boono-tv-studio/`. Lors du contrôle du 28/10, les processus Node `studio-server.js` et `radio-engine.js` étaient lancés. Le studio relaie le flux Amsterdam par un tunnel local (`3309` côté OVH vers source `3090`) ; exposition studio et radio en ports locaux `3091/3093`. **Ce n'est pas une preuve de direct public en cours.** Les ports sont des détails d'exploitation à revérifier.

**Attention à la vérité des vues :** au contrôle du 28/10, `zero-one/boono-tv/bridge.js` mentionne encore `trade-sim-v4-state.json` et `trade-sim-v4-decisions.ndjson`. **Ne pas supposer** que la scène TV affiche déjà la décision des deux runners PAPER actuels : vérifier chaque source/âge/étiquette avant d'en déduire le comportement des moteurs.

## 4. Comment BOONO comprend-il le marché ?

L'expression de travail est : **« MCB propose → structure situe → marché traduit → BOONO décide. »**

- **MCB / thèse :** BW, LBW, écarts/croisements, E15 et E3, Money Flow, divergences et formation des vagues. Un **E15 natif Live ou confirmé** n'est pas, à lui seul, la **trajectoire causale E15→E15**. Distinguer source, événement, heure d'observation, confirmation et connaissance réellement disponible.
- **Structure et lieu :** trajectoire 15m, tentatives 3m, MA200, retests, extrêmes, trendlines, niveaux et grand range (VAL/POC/VAH). `WHERE` situe et informe ; **n'oppose pas seul un veto**. Le 1h/4h/Daily/Weekly est du contexte, pas un droit de veto mécanique.
- **Conversion :** PM3, PM5, PM Live, prix conservé, rendement marginal, ticker/cadence/dominance, `QUALITÉ` (silencieuse, productive, contestée, puissante, etc.). Conversion = **preuve de traduction du marché**, pas nouveau décideur indépendant ni promesse d'amplitude restante.
- **Mémoire et attention :** campagne ≠ lobe ≠ E3 isolé ≠ position. Les phases `DISCOVERY → CAMPAIGN_HOLD → REVERSAL_ATTENTION → TRANSFER_EXAMINATION` définissent **ce qu'il faut examiner**, pas un ordre. MF divergence et pente appartiennent à la même famille ; le prix apporte une preuve différente. Les familles corrélées ne votent pas plusieurs fois.
- **Décision économique :** thèse, timing d'entrée, maintien, protection, sortie et capacité de réentrée s'évaluent **séparément**, avec les frais et le risque. Un E3 inverse isolé est souvent une respiration et **ne suffit pas à provoquer EXIT**.

**Risk PAPER documenté :** notionnel de référence **1 500 $**, taker modélisé 0,05 % par côté (~1,50 $ aller-retour), gain-floors de déplacement BTC **+120→+90** puis **+220→+180**, limite de risque de déplacement défavorable **−500 $ BTC**. Ce sont des protections **observées sur ticks**, pas des fills stop garantis à prix exact. Le capital papier et les résultats changent avec les trades ; toujours consulter le ledger daté avant de citer un bilan.

## 5. BOONO-TV : l'atelier et les écrans

La scène vise **1920×1080** : environ **720 px à gauche** pour État vivant / trio de graphes ; **1200 px à droite** pour le loft industriel habité, bureau massif, BOONO, plans de prix et MCB, bulles et FX. **Deux écrans tactiles inclinés** : à **droite le MarketCipher authentique** capturé de TradingView/Chromium Amsterdam (cadence historique ~10 s), à **gauche les instruments internes BOONO** (`indicator/scenario/risk/trade/art`). Le bureau et les mains sont devant les projections ; les surfaces sont réglées par homographies et un éditeur de calibration avec JSON sur OVH.

Moteur de scène : **HTML/CSS/Canvas + `matrix3d`**, couches indépendantes (loft → données → bureau → écrans → personnage → FX → bulles) ; moteur de graphes partagé `shared/boono-chart-renderer.js` entre Watch/Vagues et TV. PRIX = mouvement proche ; VAGUES = trajectoire/respiration ; AUDIT = événement fugace. Les poses/illustrations courantes sont **des supports techniques remplaçables**, l'identité canonique du personnage doit rester.

Une régie privée House/Deep House et effets existe en prototype ; **pas de licence générale de retransmission de musique tierce**, pas de partenariat musical confirmé. Le public et les produits futurs devront aussi respecter les droits de redistribution de TradingView/MarketCipher et des données.

## 6. Acquis, difficultés et enjeux ouverts

**Acquis solides :** architecture multi-machines, collecte et réparation du repaint/horodatage MCB, distinctions 3m tactique/15m structure, source réelle du prix, structure E15 causale, mémoire de campagnes et d'attention, deux PAPER comparables, comptabilité des frais, gain-floors, observabilité Watch, renderer partagé et studio TV en lecture seule. L'analyse est désormais centrée sur les **événements, les extrêmes et les épisodes**, pas sur une corrélation moyenne qui masque les retournements.

**Difficultés centrales :** concilier admission précoce et maturité de la phase ; distinguer respiration et transfert réel ; ne pas attendre toutes les confirmations après qu'une perte est déjà consommée ; reconnaître les attaques économiquement stériles ; conserver les grandes campagnes sans céder leurs gains ; limiter churn et frais. La comparaison d'audit du 28/10 (fenêtre V5 #59–84, V4 #17–35) constate **21 paires de positions chevauchantes**, dont **9 opposées** : deux politiques peuvent apprendre l'une de l'autre mais ne sont pas un A/B contrôlé. L'audit complémentaire des **85 premières clôtures V5** trouve **40 dépassements d'invalidation** et seulement **5 P&L nets positifs** après dépassement ; il manque encore un replay complet de la chronologie et des sorties possibles. **Aucune nouvelle politique d'invalidation n'a été validée.**

**Fiabilité :** incidents documentés de collecte/repaint, alignement 3m–15m/UTC–CET, prix/graphes figés, capture TV blanche/glitches, saturation de fichiers historiques et lourds transferts Watch. Une valeur live affichée n'est pas automatiquement fraîche ni confirmée ; le coût CPU/réseau/mémoire peut compromettre la recherche comme la diffusion.

**Enjeu économique et produit :** d'abord démontrer un résultat **net** robuste avec échantillons, risques et frais cohérents ; ensuite rendre cette lecture compréhensible via Watch et BOONO-TV, puis évaluer PRO et les revenus éventuels **sans promettre de rendement**. Les politiques de trading et de contenu/publication restent séparées.

## 7. Méthode et règles de passation

1. **Avant l'enquête :** lire cette page puis [l'index](knowledge/BOONOLAB_INDEX.md), choisir les documents précis, vérifier **live** version/PM2/ledger/qualité des données. Les documents datés ne sont pas des autorisations nouvelles.
2. **Enquêter causalement :** reconstruire ce qui était connu **à chaque instant** (`sourceAt`, `availableAt`, `asOf`), comparer cas réussis et contre-exemples, sauvegarder l'évidence complète sur Amsterdam, **ne montrer que des synthèses compactes** en conversation.
3. **Gouverner les changements :** séparer **constat, hypothèse, validation propriétaire, implémentation, tests, mise en service et travaux ouverts**. Tester en shadow/replay avant d'accorder une autorité active. Ne pas modifier moteur ou ledger par une simple étude.
4. **Garder les prompts exacts :** chaque opération reçoit un identifiant `OD-AAAAMMJJ-NNN` avec **demande utilisateur et prompt d'exécution intégraux**, origine justifiée, empreintes et événements de statut dans [le registre](knowledge/operational-decisions/README.md). Pas de reconstruction de faux verbatim.
5. **Conserver la continuité :** mettre à jour le [checkpoint compact](knowledge/BOONO_protocole_recherche_compacte_invalidations_2026-10-28.md) à chaque jalon, puis publier les décisions/rapports dans Git ; ne pas saturer le chat avec des NDJSON bruts, dumps massifs ou relectures inutiles.

**Pour reprendre une discussion :** « Lis `zero-one/BOONOLAB_START_HERE.md`, puis `zero-one/knowledge/BOONOLAB_INDEX.md`. Reprends le checkpoint actif et les décisions opérationnelles pertinentes. Vérifie le statut des moteurs et des sources avant de proposer une modification. Distingue toujours fait/hypothèse/autorisation/code/test/déploiement et conserve les prompts opérationnels intégraux avec leur origine. »

**Les détails techniques et sept passations d'origine sont navigables depuis l'[index thématique](knowledge/BOONOLAB_INDEX.md).**
