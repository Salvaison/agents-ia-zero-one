# BOONO Watch et Vagues — nettoyage des anciens affichages (10/11/2026)

**Objet :** supprimer de la présentation BOONO Watch le vieux graphique « PRIX BTC · BOUGIES 3m + CONVERSION · OKX LIVE » et le tableau « ELASTIC v0.5.8 · ARCHIVE V4.10.10 », puis supprimer les anciens tableaux État vivant redondants sur la page Vagues.

**Statut :** demande propriétaire reçue → implémentée et testée sur le code client généré → service Amsterdam redémarré. Validation visuelle dans le navigateur propriétaire encore ouverte.

## Provenance
Demandes explicites de l'utilisateur dans la conversation BOONOTRADE du 10 novembre 2026 :
- « tu peux enlevé l'ancien module conversion et l'ancien elastic 4.10.10 », suivi du contenu exact visible dans ces deux blocs ;
- « et aussi sur la page des vagues, enléve l'état vivant qui traine là ».

Les éléments listés dans la première demande correspondaient directement au renderer historiquement injecté par \`renderElasticObserverV05(current)\` dans \`loadTrades()\`, dans le panneau **État vivant**. La seconde cible les anciens blocs d'état sur **Vagues** : \`waveV5StructureStory\` (visiblement placé au-dessus des graphiques) et \`waveReplayState\` (déjà caché mais encore recalculé à chaque frame).

## Intervention effectuée

### 1. État vivant principal
- Suppression de l'injection du renderer \`window.renderElasticObserverV05\` et de son fallback \`renderElasticDualV04\` dans \`stateEl.innerHTML\`. Le nouveau \`v52-live\` et les panneaux techniques volontairement repliables restent.
- Fin des appels à \`window.loadElasticObserverHistory()\` et \`window.loadElasticChart3m(current)\` par le rafraîchissement historique V4. Donc les anciennes cartes/chronologies et le vieux graphique Conversion ne sont plus recréés toutes les 30 secondes.
- Suppression du chargement de \`/elastic-observer-ui.js\` dans la page du Watch. Ce fichier et son endpoint authentifié restent sur disque à titre de source archivale, mais **ne sont plus chargés ni rendus**.
- Retrait du bandeau initial obsolète « État V4 — chargement ». Le seul panneau de décision visible reste celui de V5.4.3.
- **Ni le contenu des archives V4, ni la chronologie historique persistée, ni les modules SHADOWS n'ont été supprimés.** L'archive V4 des trades reste accessible depuis Historique et les informations historiques repliables restent en place tant qu'une décision distincte ne les retire pas.

### 2. Conservation de la source du NOUVEAU Conversion
Le précédent \`elastic-observer-ui.js\` servait paradoxalement de relais pour le nouveau graphe : forwarding du prix OKX et chargement de bougies 3m. Afin de retirer réellement l'ancien affichage **sans figer le nouveau** :
- \`updateV3LivePriceDom()\` transmet désormais le dernier prix réel OKX ou le fallback V5.4 directement à \`BoonoMiniConversion.setQuote()\` (avec la même politique de fraîcheur).
- Nouvelle fonction \`loadMiniConversionCandles()\` dans le client : requête authentifiée **uniquement** à l'affichage de l'État vivant, à fréquence plafonnée à **45 s**, sur le endpoint de bougies **déjà existant** \`/api/elastic-chart-3m\` (Waves/MCB3 confirmé/live, fenêtre 150 minutes), puis \`BoonoMiniConversion.setCandles()\`. Erreur réseau signalée comme état de fraîcheur, pas de bougies inventées.
- \`modules/elastic-live-conversion-v541.js\` continue d'exploiter l'unique connexion OKX BTC-USDT-SWAP déjà ouverte dans la page. Sa restitution graphique toutes les **5 s** cible désormais directement le **nouveau** \`BoonoMiniConversion.refresh(snapshot)\`, et uniquement lorsque l'État vivant est l'onglet actif. Les volumes initiateurs et PM3/PM5/Live conservent leurs sources. **Aucun WebSocket supplémentaire**.

### 3. Page Vagues
- Suppression du DOM \`waveV5StructureStory\` et de son chargement \`loadWaveV5StructureStory()\`, ce qui évite le module d'état structurel redondant et la requête correspondante déclenchée depuis Vagues.
- Suppression du DOM \`waveReplayState\`, de l'assemblage répétitif de quatre tableaux « LIVE, MCB/THÈSE, CONTEXTE, EXÉCUTION/PREUVE », ainsi que de leurs reconstructions à chaque frame.
- Les indications d'erreur de replay/live utilisent le **statut Vagues déjà présent** plutôt que les anciens panneaux.
- **Préservés et testés :** canevas Prix, Vague 15m, Vague 3m ; cotation BTC Live dans l'en-tête Prix ; bandes de trades V4/V5 ; \`FLOW / AUDIT\`, son bouton VIVANT, historiques Vagues, contrôle 3m/15m et déplacements temporels. L'API de structure V5 utilisée ailleurs dans Watch demeure disponible.

## Vérifications
- Syntaxe \`node --check\` : \`modules/config-server.js\`, \`modules/elastic-live-conversion-v541.js\`, script client rendu depuis le template : OK.
- \`node --test tests/ui/watch-old-panels-retired.test.js\` : **4/4** tests passés : ancien script et injections absents ; DOM Vagues nettoyé, graphes/FLOW conservés ; alimentation de nouvelles bougies sur route existante et limitation des appels ; flux OKX initiateur conservé vers le nouveau mini, sans rafraîchir la carte cachée.
- Tests VM indépendants : rendu Vagues Prix/15m/3m, bande trades, FLOW et état historique ; chargement OHLC mini limité à une seule requête en appel répété ; volumes BTC calculés à partir des mêmes tailles de contrats OKX.
- Contrôle sur VPS : \`pm2 restart config-server --update-env\` ciblé, réponse HTTP locale 302 vers auth attendue, \`config-server\`, \`boono-v494-paper\`, \`boono-v543-paper\`, \`boono-v494-elastic-shadow\` online. Les moteurs PAPER et l'OVH BOONO-TV n'ont pas été redémarrés ni modifiés.
- **À valider :** rendu authentifié final dans le navigateur de l'utilisateur, absence de tout vestige visuel, et fraîcheur sur plusieurs cycles de chargement du nouveau Conversion.

**Autorité :** interface de visualisation uniquement, aucun nouveau signal, veto, risque ou ordre. La gestion des archives, des rangements historiques et du moteur reste distincte.

