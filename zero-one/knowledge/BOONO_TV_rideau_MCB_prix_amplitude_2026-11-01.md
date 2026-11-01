# BOONO-TV — Réactivation du rideau MarketCipher et agrandissement du graphique de prix

**Date :** 1er novembre 2026  
**Décision :** [OD-20261101-009](operational-decisions/OD-20261101-009/03-origine-et-justification.md)  
**Statut :** appliqué sur la **prévisualisation BOONO-TV d'OVH**, tests serveur et unité réussis ; **inspection visuelle dans le navigateur noVNC encore ouverte**.

## 1. Demande et constat

L'utilisateur demande : « OK, remet le rideau de vagues mcb et aussi le prix et je veux que se dernier soit étirer avec une plus grande amplitude ».

Les éléments techniques existent déjà dans la scène : un graphique flottant du prix 3m, un rideau de vagues 15m/3m, les dernières OHLC/MA200 et les fonctions de rendu qui se nourrissent des snapshots du pont Amsterdam. La couche V2 installée le 1er novembre les avait cachés explicitement via une règle `display:none!important`. La correction consiste donc principalement à **réafficher** ces couches, avec un plus grand espace dédié au prix.

**Aucune raison de recalculer la logique BOONOTRADE, de modifier MarketCipher ou les moteurs PAPER.**

## 2. Configuration rétablie

| Élément | Avant V2 | Après correction |
|---|---|---|
| Rideau MCB | Masqué dans la nouvelle scène | **Visible** ; bandes 15m et 3m, fenêtre historique de 6h |
| Rideau géométrie | Transform 3D historique du studio | **Conservé**, largeur locale 940, hauteur 560 |
| Rideau opacité | Caché | **0,80**, transparent sur le loft, z-index 7 sous l'établi et BOONO |
| Prix 3m | Masqué dans la V2 (ancien plan 520 × 296) | **920 × 420**, x=35, y=130, z-index 8 |
| Horizon prix | Fenêtre 2h/3m | **Inchangé** ; environ 40–41 chandeliers |
| Rapport hauteur du prix | 296 px | **420 px : +42 %** |
| Rapport largeur du prix | 520 px | **920 px : +77 %** |
| Échelle | Chart renderer existant | Prix fidèles, zoom visuel accru par hauteur et réduction du padding d'échelle de 6 % à 2,5 % |
| Appui du niveau principal | y=154 dans la fenêtre historique | Niveau centré à **55 % de la nouvelle hauteur**, pour préserver une échelle stable |

Les nouvelles règles sont ajoutées en fin de `scene/boono-v2.css`. Elles ciblent exclusivement `#room.boono-v2`. L'ancienne scène `?sceneV1=1` reste inchangée.

**Ordre de profondeur :** loft → rideau MCB → prix → établi et écrans réels → BOONO/mains et chat. Ainsi, BOONO reste au premier plan, tandis que la visualisation flottante constitue un plan analytique derrière sa station.

Les graphiques sont **des mesures existantes** : leur amplitude apparente découle de la surface et du cadrage, non d'une multiplication artificielle des mouvements en dollars.

## 3. Anomalie de fraîcheur du ticker découverte pendant les tests

Le snapshot OVH lu le 1er novembre vers 19:22 UTC rapporte :

- `market.price = 80451.4` avec `market.marketTimestamp = 1793018172017` ;
- les dernières bougies de la série 3m portent les timestamps autour de `1793560860000` avec prix de clôture autour de `77729.1` ;
- le ticker est donc **environ 150,75 heures plus ancien** que les bougies utilisées par le graphique.

Lorsque le chart renderer impose ce vieux ticker comme niveau live, il élargit artificiellement le domaine vertical et compresse les fluctuations récentes, exactement à l'opposé de l'effet souhaité.

### Garde-fou strictement visuel

Dans `renderMarketCurtain`, le mode V2 vérifie si le timestamp du ticker est distant de **6 minutes ou moins** du dernier timestamp des séries. Si oui, il conserve le tick et sa ligne live.

S'il est désynchronisé, le graphique utilise **la dernière clôture 3m** comme référence visuelle de zoom, **sans la présenter comme un ticker live**. L'en-tête du panneau porte alors la mention `3m <valeur> · TICKER ANCIEN` ; la ligne « live » est désactivée dans ce cas.

**Ne change pas :** `snapshot.market`, la valeur affichée par l'ancien État vivant, la série OHLC, l'ordre d'arrivée des bougies, les propriétés MarketCipher et les ordres de trading.

Le problème de ticker désynchronisé est **un sujet de flux distinct à investiguer**, et non une preuve d'une anomalie du moteur de trading lui-même.

## 4. Implémentation effective et sauvegarde

Sur OVH :

- `/home/ubuntu/boono-tv-studio/runtime/boono-tv/scene/boono-v2.css` — règles visuelles finales : rideau MCB rétabli, plan prix augmenté ;
- `/home/ubuntu/boono-tv-studio/runtime/boono-tv/scene/app.js` — ajout limité au rendu du prix V2 : ancre visuelle, nouvelle hauteur et étiquette de fraîcheur ;
- aucune modification du `boono-chart-renderer.js` partagé (utilisé aussi par d'autres interfaces).

Sauvegardes de `app.js`, `boono-v2.css` et `index.html` avant changement :

`/home/ubuntu/boono-tv-studio/incoming/backup-boono-tv-20261101-before-wave-price-restore/`

Le GitHub ne remplace pas l'ensemble du fichier `app.js` historique : un [patch limité et exact](../boono-tv/scene-v2/boono-v2-wave-price-app.patch) documente les lignes modifiées, afin de ne pas écraser les autres changements non publiés dans le dépôt. Le [CSS V2 actualisé](../boono-tv/scene-v2/boono-v2.css) est copie identique à celui servi sur OVH.

## 5. Contrôles et résultats

**Confirmés :**

1. `node --check` passe pour `app.js` et le composant V2.
2. Test unitaire isolé de `renderMarketCurtain` sur le snapshot reçu : **2 appels drawWave** pour 15m et 3m, graphique du prix comportant **41 bougies**.
3. Trois tests réussis :
   - ticker ancien : V2 ancre sur la dernière clôture 3m, `livePriceLine=false`, mention `TICKER ANCIEN` ;
   - ticker récent : V2 conserve le vrai ticker live et sa ligne de prix ;
   - retour V1 : ancienne ancre y=154, pas de nouvelle règle de prix imposée.
4. `/boono-v2.css`, `/app.js`, `/api/health` et `/assets/desk-live/marketcipher-live.jpg` répondent en HTTP **200**.
5. Source `sourceOnline=true` ; le fichier `desk/projection-config.json` sur OVH reste **octet pour octet identique** à sa sauvegarde.
6. Le prix demeure lu depuis le flux du studio ; aucun moteur PAPER, service de collecte MarketCipher ou registre de risque n'a été écrit par cette intervention.

**Encore ouvert :** vérifier dans le Chrome distant l'équilibre visuel du rideau, la lisibilité du prix sur le loft et l'absence de recouvrement gênant des affiches, de BOONO ou des bulles. Les valeurs affichées sur le ticker ancien doivent faire l'objet d'une investigation de fraîcheur indépendante.

## 6. Prévisualisation et repli

Ouvrir dans le Chrome distant connecté par noVNC :

- **Nouvelle scène :** `http://127.0.0.1:8310/?showcase=1`
- **Ancienne scène :** `http://127.0.0.1:8310/?sceneV1=1`
- **Cadrage V2 précédent :** `http://127.0.0.1:8310/?showcase=1&reframeV1=1`

Une actualisation forcée `Ctrl + Maj + R` recharge les nouvelles feuilles CSS et le rendu JS.

**Validation utilisateur attendue :** préciser si le prix et les vagues se lisent bien derrière BOONO. Toute modification ultérieure de la transparence/position doit rester limitée à la scène visuelle, sans empiéter sur l'autorité MCB ni sur les mécanismes de risque.
