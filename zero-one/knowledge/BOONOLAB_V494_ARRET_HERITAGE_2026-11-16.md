# BOONOLAB — Fin du PAPER V494, patrimoine à transmettre

**16 novembre 2026, Amsterdam — décision et opération distinctes.**
L'utilisateur décide d'éteindre V494 PAPER et de conserver ses meilleures aptitudes pour la recherche V543. Le mécanisme de trading V494 ne doit pas être réactivé sans nouvel OD. Il a été arrêté **FLAT**, sans ordre de clôture artificiel.

## 1. État final effectivement observé

- PM2 `boono-v494-paper` : **stopped**, configuration `pm2 save` sauvegardée.
- Ledger final : **216 trades clôturés, 58 gagnants**, P&L net réalisé **−403,0901 USD**, frais enregistrés **323,9287 USD**, equity PAPER **596,9099 USD** ; **position null** ; `brokerOrdersEnabled=false`.
- `lastObservationAt=1794830529623` ; finance simulée sur notionnel 1 500 USD, sans slippage/funding modélisés. Ne jamais employer ce snapshot comme le LIVE d'un autre jour.
- Archive vérifiée : `/root/boonolab-v494-retired-20261116T120218Z/` ; états et trades et décisions PAPER, résumés/states V494 dual/Elastic et `MANIFEST.json` SHA-256. Les anciens fichiers de données restent à leur emplacement.
- Comparateur A/B/C/D V494 `boono-v494-entry-exit-shadow` arrêté et archivé.
- Shadow Elastic V494 `boono-v494-elastic-shadow` arrêté après vérification qu'il dépend du PAPER V494 figé. Les archives restent disponibles. **Ne pas considérer son dernier état comme LIVE.**
- V543, son shadow de maintien, Audit14D, Bâton, prix, collecteurs et observatoire sept familles restent en ligne. Aucune ressource BOONO-TV / shared n'a été modifiée.

## 2. Meilleures signatures V494 — conserver des preuves, pas copier une politique complète

Exemples de trades nets positifs documentés et vérifiés via ledgers/KB :
- `#96 LONG +29,7922` (4/11) après `#95 LONG −8,3462` : ensemble **+21,446 USD** ; +81,6 BTC$ sur 3m et +68,4 sur 15m, mais **−379,9 BTC$ sur 60m** avant l'admission #96.
- `#162 SHORT +16,0874` (11/11), malgré déplacement 60m contraire ; #161 et #162 réunis **+11,70 USD**.
- `#203 LONG +13,6373` et `#202 LONG +9,0059` (15/11), exemples récents d'inflexion UP_REINFORCED. À tester contre les mauvais LONGs plutôt que d'interdire toutes les exceptions.
- `#136 LONG +12,6982` après environ −1 005,6 BTC$ sur l'heure préalable ; `#143 SHORT +11,5784` après +722,8 BTC$ dans l'heure contraire ; `#149 LONG +11,0901`.
- `#181 LONG +11,2676`, `#180 LONG +7,3231` : inflexions tactiques valables même dans une journée où le moteur s'acharne ensuite à ouvrir des LONGs mal orientés.
- Contre-exemples aux seuils de volume universels : `#58 LONG +7,8419` (débit préalable 0,208 BTC/s) et `#76 SHORT +4,7429` (0,100 BTC/s).

L'étude du 12 novembre établit, sur **7 des 10 meilleurs V494 avec couverture Audit** : déplacement 3m favorable et déplacement 60m contraire dans les **7/7**. Sur **125 trades comparables**, le motif apparaît **48 fois**, donnant 17 gagnants et **+19,98 USD nets** contre 77 autres trades et **−196,10 USD**. **31/48 ont tout de même perdu** : motif de recherche, pas filtre prédictif validé. Les 216 clôtures globales ont un historique tronqué dans l'état courant ; employer les ledgers segmentés et la KB pour les numéros anciens.

## 3. Compétences transférables

1. **Détection d'inflexion naissante** : un E3 nouveau, un croisement 3m et une conversion PM effectivement traduite dans le prix peuvent précéder un E15 opposé confirmé ; éviter le veto mécanique du parent.
2. **Hiérarchie de temps** : séparer le recul de 60m encore adverse de la reprise tactique 3m/15m. Une reprise doit néanmoins reconquérir/défendre du terrain pour ne pas devenir un faux LONG au milieu d'une chute.
3. **Écoute sélective** : conserver mémoire de cross, E Live/confirmé, MF, PM et MA, mais ne pas confondre présence de l'attention avec autorité d'exécution effective.
4. **Marchés calmes** : certains épisodes silencieux produisent de bonnes inflexions. Bannir les seuils universels de volume et les interdictions « dimanche ».
5. **Économie de campagne** : privilégier résultats nets du parent, faux départs, répétition et frais ; les beaux trades individuels ne suffisent pas à sauver 494.

**Ne PAS transmettre** : multiplication d'admissions LONG dans baisse vendeuse 2h, souveraineté excessive E3/UP_REINFORCED, réentrées non requalifiées, sorties fragmentantes et frais répétitifs.

## 4. Suites et références

- Référence : `knowledge/BOONOLAB_meilleures_campagnes_V494_V543_conditions_2026-11-12.md` et `BOONOLAB_PASSATION_FINALE_494_543_SHADOWS_2026-11-14.md`.
- Une éventuelle future expérience doit utiliser **le patrimoine tactique V494 comme sous-module SHADOW**, non relancer son PAPER ni prétendre à un résultat autonome.
- Archive hors Git des données financières et événements ; seul le rapport versionné doit être publié dans la KB GitHub.
- Statuts : **ARRÊT PAPER V494 exécuté et vérifié**, A/B/C/D arrêté ; données préservées ; **aucune promotion V543 PAPER**.
