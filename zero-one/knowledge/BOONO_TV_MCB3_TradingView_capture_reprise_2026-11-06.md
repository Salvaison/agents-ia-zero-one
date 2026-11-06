# BOONO-TV — Incident MCB3 TradingView figé et reprise automatique

**Date :** 6 novembre 2026
**Décision :** OD-20261106-009
**Statut :** capture native MCB3 rétablie, récupération automatique déployée sur Amsterdam et testée après simulation d'un onglet en arrière-plan. Validation du prochain redémarrage réel de Chrome encore à observer.

## Symptôme et chronologie vérifiée

Le propriétaire signale que la vague MarketCipher B du petit écran droit de BOONO est figée depuis la veille. Le dernier JPEG valide sur Amsterdam datait exactement du **06/11/2026 à 02:59:05 UTC**, soit **03:59:05 Europe/Stockholm**. À 10:40 UTC, le service PM2 boono-desk-capture était encore « online », mais son state.json indiquait **ok=false** et **CAPTURE_JPEG_SUSPECT_TOO_SMALL**. L'interface OVH servait le JPEG historique en le dégradant, ce qui donnait l'impression d'une vague immobile.

Les données des collecteurs 3m et 15m, V494 PAPER et V543 PAPER étaient indépendantes et toujours actives. Les heartbeats des collecteurs continuaient de changer à la seconde. Aucun problème de marché OKX ni de moteur de trading ne pouvait être déduit de la panne visuelle.

## Cause isolée

Le vrai onglet TradingView réservé aux captures BOONO-TV est le layout **qljTf3vu**, distinct des collecteurs **2AqpEMfD**. Sa zone centrale et son panneau MarketCipher B étaient devenus blancs après un cycle de redémarrage Chrome qui avait laissé l'onglet en arrière-plan. Le titre/URL portait parfois interval=15, tandis que le daemon demandait le TF réel 3m. Les captures JPEG devenaient minuscules et étaient, correctement, rejetées.

Un rechargement CDP du **seul onglet TA** ne restaurait pas le dessin. Une activation de cet onglet par CDP Target.activateTarget a, elle, fait réapparaître les chandeliers et le véritable MarketCipher B, avec TF réel 3m. À **10:47:05 UTC**, le daemon a publié une nouvelle capture **ok=true**, de **21 206 octets**. Une capture CDP du collecteur, effectuée en lecture seule à des fins de diagnostic, confirmait que la source TradingView native existait ; **le système BOONO-TV n'utilise jamais cette capture du collecteur comme substitut**.

## Récupération automatique implantée

Fichier modifié uniquement sur Amsterdam :
/root/agents-ia-zero-one/zero-one/boono-tv/desk/desk-capture-daemon.js

Au cycle d'une minute, le daemon sélectionne exclusivement qljTf3vu et maintient la cohérence OKX:BTCUSDT.P / 3m. Après le screenshot du panneau MarketCipher B, il examine sa taille :

- si le JPEG dépasse le seuil existant de 12 000 octets, publication normale ;
- si la capture est anormalement petite, il appelle **Page.bringToFront** sur **ce seul onglet TA**, laisse **2,4 secondes** à TradingView pour repeindre, puis tente un deuxième screenshot ;
- si le second screenshot demeure suspect, il ne remplace pas l'image valide et publie un état d'erreur ;
- l'état de capture publié inclut maintenant autoActivatedTABecauseBlank et firstCaptureBytes, permettant de connaître les auto-récupérations.

Les deux collecteurs 2AqpEMfD et les moteurs PAPER n'ont été ni navigués ni redémarrés. Seul le processus boono-desk-capture a été redémarré une fois pour charger le correctif. Le comportement de réactivation ne s'exécute que si une capture est jugée invalide, et non toutes les minutes. Un utilisateur de noVNC qui consulte un autre onglet peut donc voir le studio revenir ponctuellement au TA si celui-ci devient blanc : compromis à surveiller.

## Preuves de réussite

Sauvegardes avant patch sur Amsterdam :
/root/agents-ia-zero-one/zero-one/boono-tv/backups/OD-20261106-009/
avec desk-capture-daemon.js, dernier JPEG valide et état précédent.

- Test d'incident : activation temporaire de l'onglet BOONO-TV (pas d'un collecteur), puis rechargement ciblé de l'onglet TA en arrière-plan. Après reprise du seul daemon, sa première image faisait **1 343 octets** ; Page.bringToFront a permis une image de **21 381 octets** à **10:52:27 UTC**, tf=3, ok=true, autoActivatedTABecauseBlank=true, firstCaptureBytes=1343.
- PIDs collecteurs **3585609** et **3602894**, V494 **3123676**, V543 **3123690** inchangés pendant l'essai.
- Observations consécutives : à 10:54:21 UTC, JPEG 21 373 octets, SHA-256 ad9e2ada… ; à 10:55:21 UTC, JPEG 21 377 octets, SHA-256 4fb3ccca… ; à 10:56:21 UTC JPEG 21 372 octets, SHA-256 60cef451… Les images changent effectivement d'un cycle à l'autre, sans nouvelle activation nécessaire.
- Sur OVH, la route /assets/desk-live/marketcipher-live.jpg n'est pas un asset local figé : le studio relaie le fichier dynamique depuis Amsterdam via son tunnel. À 10:57 UTC, le JPEG servi sur OVH avait la même empreinte SHA-256 60cef451… que celui d'Amsterdam, et state.json affichait ok=true, actualTf=3, actualSymbol=OKX:BTCUSDT.P.
- Test Chromium OVH verify-OD-20261106-009-restored-frontend.js : écran BOONO avec image native **610×152**, titre dynamique **MC · 3m**, opacité normale **0,96**, classe capture-stale absente, état **ok=true**, âge JPEG de **11 secondes**, zéro erreur JavaScript. Capture : tests/OD-20261106-009-restored-mcb3-on-boono-desk.jpg.
- Syntaxe Node du daemon validée. Le marché et la géométrie des écrans n'ont pas été modifiés.

## Limites et suivi

La cause observée est l'absence de peinture de l'onglet TA tant qu'il reste inactif après un redémarrage Chrome. La réactivation répare l'incident testé. Le **prochain vrai cycle Chrome complet** reste à surveiller, ainsi que les éventuels effets d'un changement d'onglet noVNC pendant la lecture. Une surveillance de fraîcheur et une alerte visuelle d'âge dans le studio pourraient améliorer la détection, mais n'ont pas été ajoutées dans cette intervention.

Le code source actif est un fichier de travail Amsterdam déjà modifié par d'autres opérations hors de ce commit documentaire ; il n'a pas été commité globalement avec d'autres changements non liés. La KB précise le chemin actif et la sauvegarde pour passation.
