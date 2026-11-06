# BOONO Systems — registre des décisions opérationnelles, prompts intégraux et provenance

**Règle validée le 28 octobre 2026** : chaque décision opérationnelle doit conserver **le(s) message(s) source intégral(aux)**, **le prompt opérationnel final intégral** et **une explication de son origine**. Un simple résumé ou numéro de version ne remplace jamais les textes originaux.

## Ce qui déclenche l'archivage

Chaque décision opérationnelle qui autorise ou modifie un comportement, script, paramètre, service, déploiement, interface, méthode de recherche, politique ou procédure BOONO. Une observation, hypothèse ou proposition non approuvée est dans la KB comme hypothèse ; elle ne doit jamais être inventée comme autorisation.

Le dossier **doit exister avant le premier acte d'exécution**. C'est un préalable de travail obligatoire pour les agents et nouvelles discussions, pas une collecte automatique des chats par ChatGPT. L'agent doit effectuer l'archivage explicitement via l'outil et le dépôt. S'il ne dispose pas du texte original, il ne doit pas fabriquer de faux verbatim : retrouver la source ou indiquer que l'archive intégrale manque avant d'affirmer la décision exécutable.

## Contenu d'une décision OD-AAAAMMJJ-NNN

- `01-demande-utilisateur-integrale.txt` — texte **copié exactement**, sans synthèse, du ou des messages utilisateur constituant la demande et l'autorisation. Si plusieurs messages forment l'autorisation, préserver chaque texte sans coupure et identifier clairement l'auteur, l'ordre et la référence de la conversation.
- `02-prompt-operationnel-integral.txt` — consigne finale **exactement telle qu'elle est confiée à l'agent exécutant**, avec contraintes, interdictions et critères d'acceptation. Signaler distinctement s'il s'agit d'une formulation rédigée par l'assistant plutôt que par l'utilisateur.
- `03-origine-et-justification.md` — événement déclencheur, analyse et faits antérieurs, raison des choix, références, alternatives rejetées, mandat/autorisation, portée et limites. Les observations rétrospectives ne sont jamais présentées comme des preuves disponibles lors d'un trade historique.
- `manifest.json` — identifiant, référence, mandat et empreintes SHA-256 du contenu original exact. Les fichiers ci-dessus ne sont jamais remplacés silencieusement.
- `events/0001.json`, `events/0002.json`, etc. — étapes successives **AUTORISE / DOCUMENTE / IMPLEMENTE / TESTE / MIS_EN_SERVICE / SUSPENDU / ANNULE / REMPLACE**, chacune avec justification et preuve. Les événements antérieurs sont conservés ; une évolution substantielle fait l'objet d'une **nouvelle décision** liée à la précédente.

Une approbation brève (« oui ») n'est pas un prompt complet autonome. Retrouver la proposition exacte approuvée et la conserver littéralement dans le dossier, en plus du texte court d'approbation. Ne jamais reconstruire une demande originale à partir d'une mémoire résumée.

## Usage, depuis la racine du dépôt

Préparer des fichiers UTF-8 **complets** `/tmp/source.txt`, `/tmp/operation.txt`, `/tmp/origine.md` sans recopier des données de trading volumineuses.

```bash
python3 zero-one/scripts/boono-decision-archive.py create \
  --id OD-20261028-001 --title "Traçabilité intégrale des prompts opérationnels" \
  --user-prompt /tmp/source.txt --execution-prompt /tmp/operation.txt \
  --origin /tmp/origine.md \
  --authorization "Demande explicite de l'utilisateur (source jointe)" \
  --reference "Conversation BOONO du 28 octobre 2026 (sans URL fournie)"
python3 zero-one/scripts/boono-decision-archive.py event \
  --id OD-20261028-001 --status TESTE \
  --description "Tests de conservation des prompts effectués" \
  --evidence "Commande de test et résultats avec date"
python3 zero-one/scripts/boono-decision-archive.py verify
```

Les fichiers préparatoires sous `/tmp` ou dans `data/` ne remplacent PAS l'archive versionnée. Les prompts originaux doivent être figés **avant exécution** ; les événements documentent ensuite les actions réelles. Une révision du prompt ou une nouvelle validation n'efface jamais un ancien prompt : créer `OD-...-002` et expliquer ce qu'elle remplace.

**Confidentialité :** ne publier aucun secret, jeton, mot de passe ou donnée sensible dans Git. En présence d'un secret, conserver l'original intégral uniquement dans un stockage protégé autorisé (non implémenté ici) et sa référence/hachage dans le registre ; si aucun moyen sécurisé n'est disponible, interrompre l'archivage Git de ce contenu et signaler l'obstacle, sans jamais déclarer l'exigence satisfaite par une version tronquée.

**Validation technique :** la commande `verify` vérifie les empreintes des originaux et la chaîne des événements. L'historique Git fournit la traçabilité des modifications de dépôt. Ni les empreintes ni le script ne sont une signature juridique, ni une capture automatique de l'interface ChatGPT.

## Passations

Avant une nouvelle discussion, ouvrir ce registre et `zero-one/data/research-briefs/active-research.md`, puis seulement les rapports pertinents. Chaque compte rendu de passation référence l'identifiant de décision et, si applicable, le commit d'implémentation. Ne jamais prendre `DOCUMENTE` pour `MIS_EN_SERVICE` ou une hypothèse pour une approbation.

## Première décision

- [OD-20261028-001 — rendre obligatoires les prompts opérationnels intégraux avec leur origine](OD-20261028-001/03-origine-et-justification.md)

### Note de provenance du premier dossier (bootstrap)

Pour OD-20261028-001, le document 01 est **exactement** le message utilisateur. Le document 02 est un prompt de mission **rédigé par l'assistant pendant l'installation du registre** pour décrire intégralement cette intervention ; il **n'a pas été envoyé tel quel à un agent externe**. Cette exception de démarrage ne peut pas servir de précédent : à partir des opérations suivantes, le prompt réellement transmis à l'exécutant doit être figé avant exécution. Cette distinction est enregistrée dans le journal d'événements du dossier.

## Deuxième décision de référence — BoonoLab

- [OD-20261028-002 — cartographie transversale, passation générique et import des sept archives](OD-20261028-002/03-origine-et-justification.md). Son message utilisateur intégral et la consigne intégrale de production du document sont conservés dans le même dossier. Livrables : [carte générale](../../BOONOLAB_START_HERE.md), [index thématique](../BOONOLAB_INDEX.md), [passations sources](../passations-sources/2026-10-28-import/README.md).

## Référentiel des critères d'analyse (28 octobre 2026)

- [OD-20261028-004 — méthodes d'analyse et critères retenus](OD-20261028-004/03-origine-et-justification.md). Prompt utilisateur littéral, prompt de rédaction, origine et statuts vérifiables ; rapport : [Méthodes d'analyse BoonoLab](../BOONOLAB_methodes_analyse_et_criteres_2026-10-28.md).

## Recherche sur les sorties V5 — 30 octobre 2026

- [OD-20261030-001 — shadow de maintien V5 et invalidation structurelle](OD-20261030-001/03-origine-et-justification.md) : demande utilisateur et prompt opérationnel conservés intégralement ; shadow non autoritaire en service ; aucune politique PAPER V4/V5 modifiée. Rapport : [BOONO — risque, 220/180, maintien](../BOONO_risk_maintien_shadow_v01_2026-10-30.md).

## Audit historique des gain-floors et continuation (30 octobre 2026)

- [OD-20261030-002 — origine 220/180, V494 avec 120/90 et invalidations, chaîne V543 #102](OD-20261030-002/03-origine-et-justification.md). Recherche strictement en lecture seule ; [rapport](../BOONOLAB_494_gainfloors_structures_continuation_2026-10-30.md). Les simulations indicatives ne sont ni validation de gain ni modification des moteurs PAPER.

## Correction diagnostique Fibonacci / Etat vivant (30 octobre 2026)

- [OD-20261030-003 — niveaux Fibonacci calculés et distances cohérentes en État vivant](OD-20261030-003/03-origine-et-justification.md) : demande intégrale, consigne, provenance, tests et redémarrage UI uniquement. [Rapport de diagnostic](../BOONOLAB_fibonacci_lieu_audit_modules_2026-10-30.md). **Aucun niveau automatique de Fibo promu en invalidation ou stop PAPER.**

## Audit14D et laboratoire V494 Entrée/Sortie (30 octobre 2026)

- [OD-20261030-004 — rétablir Audit14D et modules Entrée/Sortie en shadow V494](OD-20261030-004/03-origine-et-justification.md). La demande, la mission complète, l’origine et les événements autorisation/implémentation/tests/service restent distincts. [Rapport technique](../BOONOLAB_Audit14D_V494_Entree_Sortie_Shadow_2026-10-30.md). **V494/V543 PAPER inchangés.**

## SHADOWS — résultats du comparateur V494 Entrée/Sortie (30 octobre 2026)

- [OD-20261030-005 — exposition de A/B/C/D en BOONO Watch](OD-20261030-005/03-origine-et-justification.md) : demande exacte, autorisation d’observabilité uniquement, implémentation, tests et service. [Rapport interface et API](../BOONOLAB_V494_Dual_Shadow_Watch_UI_2026-10-30.md). Les décisions V494/V543 PAPER restent inchangées.

## Elastic V494 : rétablissement, ticker 4×15 et chronologie (30 octobre 2026)

- [OD-20261030-006 — Restaurer Elastic pour V494 et éprouver EASY/POWERFUL, EASY→CONTESTED et transferts](OD-20261030-006/03-origine-et-justification.md). Shadow autonome, aucun impact PAPER.
- [OD-20261030-007 — Ticker de qualité 4×15m et corroboration prospective](OD-20261030-007/03-origine-et-justification.md). Mesures d'effort/rendement et couverture temporelle, sans vote indépendant.
- [OD-20261030-008 — Couche distincte de chronologie des états, horodatée et consultable](OD-20261030-008/03-origine-et-justification.md). Sept familles, transitions et snapshots 30s. États réellement observés vs hypothèses encore non observées.
- [Rapport d'architecture, méthode, tests et service](../BOONOLAB_Elastic_V494_ticker4x15_et_chronologie_2026-10-30.md).
## Contrastes factoriels V494 — deux lectures (30 octobre 2026)

- [OD-20261030-009 — Contrastes A/B/C/D nets, réalisés et provisoires](OD-20261030-009/03-origine-et-justification.md). Le laboratoire était actif mais les quatre branches ouvertes n'avaient pas clôturé : ajout sans autorité trading d'une valorisation mark-to-market **incluant TP1 et frais estimés restants**, séparée du P&L réalisé. [Rapport de rétablissement, tests et mise en service](../BOONOLAB_V494_contrastes_A_B_C_D_nets_live_2026-10-30.md).

## V543 sans gain-floor — invalidation structurelle + transfert observé (30 octobre 2026)

- [OD-20261030-010 — expérimentation V543 STRUCTURAL_LEVEL_AND_TRANSFER](OD-20261030-010/03-origine-et-justification.md). Cinq forks non autoritaires comparés, nouveau fork sans gain-floor sur niveau d’entrée perdu et transfert adverse corroboré ; [protocole et contrôles](../BOONOLAB_V543_sans_gainfloor_invalidation_et_transfert_2026-10-30.md). Les deux PAPER restent inchangés.

## Audit des campagnes V494 vs V543 du 31 octobre 2026

- [OD-20261031-001 — correction de lecture, diagnostic des gain-floors / invalidations et publication](OD-20261031-001/03-origine-et-justification.md) : demande utilisateur intégrale, mission exacte, origine, statut d'enquête et de publication. [Rapport comparatif corrigé](../BOONOLAB_analyse_trades_shadows_2026-10-31.md) : V494 30 vs 31 octobre, sept parents E15 / neuf sorties V543 floor avec décisions `HOLD`, hiérarchie PAPER, shadows et contre-exemples, aucun changement de trading.

## Régime V494 du samedi et autorité de sortie V543 — 31 octobre 2026

- [OD-20261031-002 — étudier le faible débit du week-end V494 et rétrograder les gain-floors V543 sous autorité MCB/structure](OD-20261031-002/03-origine-et-justification.md). V494 en **analyse seulement** : archive Audit14D comparée sur mêmes heures vendredi/samedi, pas de veto temporel. V543 PAPER : floors 120/90 et 220/180 convertis en **alertes non exécutoires pour les prochaines entrées**, hard-risk −500 et sorties MCB/structure conservés ; position préexistante garde sa politique de floor jusqu'à clôture. **Mise en service contrôlée**, tests et limites dans le [rapport détaillé](../BOONOLAB_V494_weekend_regime_V543_floor_MCB_structure_2026-10-31.md).

## BOONO-TV — bureau canonique et atelier musical (1er novembre 2026)

- [OD-20261101-001 — valider le bureau/ordinateur et documenter l'exploration du loft](OD-20261101-001/03-origine-et-justification.md) : messages d'origine intégraux, prompt de documentation, provenance, statut et limites ; [bureau canonique v1.0](../BOONO_TV_bureau_ordinateur_reference_canonique_2026-11-01.md) ; [compte rendu et loft encore à valider](../BOONO_TV_compte_rendu_bureau_et_loft_2026-11-01.md). **Publication documentaire uniquement, aucun déploiement studio ni changement PAPER.**

## BOONO-TV — chambre et fenêtres à paysages (1er novembre 2026)

- [OD-20261101-002 — validation de la chambre et découpe alpha des vitrages](OD-20261101-002/03-origine-et-justification.md) : messages d'origine, prompt, provenance, décision et fichiers produits localement ; [fiche de la chambre canonique et empreintes](../BOONO_TV_chambre_canonique_vitrages_paysages_2026-11-01.md). Le décor est **validé** ; alpha/masque **fournis dans la conversation**, **non copiés sur OVH ni publiés en binaire dans Git**.

## BOONO-TV — chat noir, cinq sprites RGBA sur le bureau (1er novembre 2026)

- [OD-20261101-003 — cinq dessins du chat, découpages transparents et masques](OD-20261101-003/03-origine-et-justification.md) : demande exacte, provenance du générateur et du script de détourage, réalisation et vérification ; [fiche des cinq sprites](../BOONO_TV_chat_5_postures_bureau_sprites_2026-11-01.md). **Nouveaux dessins à valider pour mise en service ; binaires remis dans le chat, non sur OVH.**

## BOONO-TV — identité du personnage (1er novembre 2026)

- [OD-20261101-004 — fiche canonique d'apparence et de caractère de BOONO](OD-20261101-004/03-origine-et-justification.md) : origine et demandes exactes, prompt de rédaction conservé, statut documentaire ; [fiche complète](../BOONO_identite_visuelle_mecanique_personnalite_v1_2026-11-01.md) et [rapport d'itérations](../BOONO_TV_rapport_identite_personnage_2026-11-01.md). **Charte retenue, sprites du robot debout encore non validés ; pas de déploiement BOONO-TV.**

## BOONO-TV — sept postures assises, détourage et perspective (1er novembre 2026)

- [OD-20261101-005 — alignement des personnages et masques alpha](OD-20261101-005/03-origine-et-justification.md) : validation d'intention, sept sprites RGBA et masques contrôlés, essai de perspective **insuffisant pour production** ; [rapport technique](../BOONO_TV_7_postures_assises_masques_perspective_2026-11-01.md). Découpes et visuels contenus uniquement dans le ZIP de conversation, pas de déploiement OVH, aucun changement PAPER.

## BOONO-TV — reconstruction scène V2 sur OVH (1er novembre 2026)

- [OD-20261101-006 — installation OVH, assets, projection, repli V1](OD-20261101-006/03-origine-et-justification.md) : demande exacte, mandat, journaux d'événements ; [rapport technique et réserves de qualité](../BOONO_TV_reconstruction_scene_V2_OVH_2026-11-01.md). Code V2 archivé dans [boono-tv/scene-v2](../../boono-tv/scene-v2/README.md) et 29 images vérifiées par le manifeste. Mise en service de la **prévisualisation locale** sans modification du trading ; rendu final navigateur distant à valider.

## BOONO-TV — établi plus petit et bord arrière recoupé (1er novembre 2026)

- [OD-20261101-007 — recoupe alpha de la bande bois, réduction de l'établi et recalage des deux écrans](OD-20261101-007/03-origine-et-justification.md) : source utilisateur et capture, prompt rétrospectif, origine, mise en service sur OVH et limites ; [rapport de contrôle](../BOONO_TV_etabli_compact_2026-11-01.md). Source FFmpeg reproductible dans `boono-tv/scene-v2/generate_compact_desk.sh`. **Avant/après visuel à confirmer sur le navigateur noVNC ; aucune modification du moteur PAPER.**

## BOONO-TV — recadrage plein canevas (1er novembre 2026)

- [OD-20261101-008 — Reformatage loft et dix poses BOONO, conservation de l’échelle de l’établi](OD-20261101-008/03-origine-et-justification.md) : message source et capture, prompt rétrospectif, statuts implémentation/tests/service et limites ; [rapport technique](../BOONO_TV_reformatage_scene_1200x1080_2026-11-01.md) et [sources Python/JS/CSS/manifest](../../boono-tv/scene-v2/README.md). **19 images 1200×1080 installées sur OVH, rollback V2/V1 opérationnel ; prolongement du sol et détourage BOONO encore à valider graphiquement.**

## BOONO-TV — rideau MCB et prix à grande amplitude (1er novembre 2026)

- [OD-20261101-009 — retour des vagues MCB 15m/3m et prix visuel 920×420](OD-20261101-009/03-origine-et-justification.md) : demande verbatim, intervention, garde de ticker ancien, tests et limites ; [rapport d’installation](../BOONO_TV_rideau_MCB_prix_amplitude_2026-11-01.md). Code V2 dans [scene-v2](../../boono-tv/scene-v2/README.md) et modification `app.js` journalisée par patch. **Vérification finale du rendu noVNC encore ouverte ; aucun changement des moteurs PAPER.**


## BOONO-TV — incidents sprites / accès Chromebook et passation technique (3 novembre 2026)

- [OD-20261103-001 — synthèse des difficultés de production graphique, réparations Chromebook/Linux et passation technique](OD-20261103-001/03-origine-et-justification.md) : demandes utilisateur intégrales, consigne de cette opération, justification et événements documentaires. Deux livrables : [rétrospective des incidents 2–3 novembre](../BOONO_TV_incidents_sprites_GIMP_ChromeOS_2026-11-03.md) ; [passation purement technique BOONO Systems (03/11)](../BOONO_Systems_passation_purement_technique_2026-11-03.md). **Rapports documentaires : pas de changement PAPER, pas de mise en service du bureau GIMP ; asset OVH transféré sous un nom distinct et toujours candidat.**

## BOONOLAB — Observation sans surajustement et hypothèse régime-adaptative (4 novembre 2026)

- [OD-20261104-001 — conserver 494/543 inchangés et éprouver une adaptation éventuelle aux régimes](OD-20261104-001/03-origine-et-justification.md). Décision validée : **observer plusieurs régimes sans nouveaux seuils ciblés** ; hypothèse d'un éventuel ajustement conditionnel **à valider ou infirmer**, et non autorisation d'implémentation. [Protocole méthodologique](../BOONOLAB_hypothese_adaptation_regimes_moteurs_intacts_2026-11-04.md).

## BOONO-TV — prix direct, conversion mini et repères de trades (4 novembre 2026)

- [OD-20261104-002 — BOONO-TV prix OKX LIVE et écran Conversion mini](OD-20261104-002/03-origine-et-justification.md) : demande intégrale, mission rétrospective explicite, correctifs en service Amsterdam/OVH, tests Chromium, séparation strictement read-only ; [rapport technique](../BOONO_TV_live_conversion_evenements_2026-11-04.md). **Moteurs PAPER et projection validée inchangés.**

## BOONO-TV — points E3/E15, SVG des écrans et cycle trois panneaux (4 novembre 2026)

- [OD-20261104-003 — BOONO-TV points, titres vectoriels et troisième panneau](OD-20261104-003/03-origine-et-justification.md) : demande intégrale archivée avant les changements, textes SVG recalés sur les quadrilatères, mini-conversion agrandie, vues PAPER réalisées et cycle 12 s ; [rapport technique](../BOONO_TV_points_vecteurs_trades_3_panneaux_2026-11-04.md). Aucune décision des runners PAPER modifiée.

## BOONO-TV — capture authentique 3m, mise en scène et accessoires (5 novembre 2026)

- [OD-20261105-001 — BOONO-TV capture MCB 3m et scénarios](OD-20261105-001/03-origine-et-justification.md) : demande verbatim, correction de la provenance TA 4h BYBIT vers 3m OKX, cadence 60s, volumes/pastilles, E3 chrono sans date/heure, fourchettes V494/V543, éditeur 12 postures et accessoires staging ; [rapport technique](../BOONO_TV_finalisation_capture_dialogue_bureau_2026-11-05.md). Les moteurs PAPER et la calibration ne changent pas.

## BOONO-TV — dernier relevé de Chronologie et textes vectoriels (5 novembre 2026)

- [OD-20261105-002 — Chronologie dynamique et volumes SVG](OD-20261105-002/03-origine-et-justification.md) : dernier événement natif et direction en remplacement du seul BW/LBW cross ; volumes acheteurs/vendeurs regroupés dans un même élément SVG à une décimale, qualité sur la seconde ligne ; MCB3 recentré, aucune date/heure sur l’écran. [Rapport technique](../BOONO_TV_chronologie_dynamique_volume_svg_centrage_2026-11-05.md). Aucun changement aux moteurs PAPER.

## BOONO-TV — volumes BTC transparents et cadrage MCB3 (5 novembre 2026)

- [OD-20261105-003 — volumes BTC transparents et vague MCB3](OD-20261105-003/03-origine-et-justification.md) : correction de la direction du déplacement (BTC vers Qualité, et non l’inverse) ; retrait du bandeau noir derrière les chiffres, maintien du fond noir de Qualité, source MCB complète recentrée par composition uniquement ; [rapport et contrôles](../BOONO_TV_volumes_transparents_cadrage_MCB3_2026-11-05.md). PAPER et calibration inchangés.

## BOONO-TV — pastilles de volume rouges et capture réelle 3m (5 novembre 2026)

- [OD-20261105-004 — Pastilles rouges grandes et capture MarketCipher 3m](OD-20261105-004/03-origine-et-justification.md) : réalisation d’une bande blanche complète de dix rectangles volume (rouges actifs, bord noir), maintien de la capture 3m sur l’onglet TA seulement, graphique MCB mieux centré ; [rapport technique et preuves](../BOONO_TV_pastilles_rouges_MCB3_capture_2026-11-05.md). Runners V494/V543 et calibration préservés.

## BOONO-TV — tunnel du Chromebook et scénarios légers (5 novembre 2026)

- [OD-20261105-005 — Tunnel Penguin et scénarios à gauche](OD-20261105-005/03-origine-et-justification.md) : port SSH 8310 rétabli et service utilisateur activé, éditeur des 12 poses dans la surface État vivant et tests répétés de prévisualisation ; [rapport technique](../BOONO_TV_tunnel_penguin_editeur_bulles_gauche_2026-11-05.md). Cause exacte du plantage Chromebook non encore démontrée.

## BOONO-TV — bulle par posture et cadrage harmonieux du MCB3 (5 novembre 2026)

- [OD-20261105-006 — Bulle par posture et cadrage MCB3 harmonieux](OD-20261105-006/03-origine-et-justification.md) : douze géométries indépendantes des bulles dans les scénarios, écran Conversion titré en SVG, pastilles déportées à droite ; capture TF3 OKX recadrée sur le début et toute l’amplitude des oscillations récentes, pas tout l’historique ; [rapport de tests](../BOONO_TV_postures_bulles_MCB3_cadrage_2026-11-05.md). PAPER et calibration intacts.

## BOONO-TV — MCB3 commun à Watch, volume et essai fenêtre vidéo (5 novembre 2026)

- [OD-20261105-007 — MCB3 commun Watch/TV, jauge indépendante et essai vidéo](OD-20261105-007/03-origine-et-justification.md) : source MCB3 partagée entre les deux graphiques, ancienne capture TradingView en comparaison, dix pastilles au bord de l’écran et vidéo YouTube réversible avec repli poster ; [rapport technique](../BOONO_TV_MCB3_sync_pastilles_video_fenetre_2026-11-05.md). Le lecteur YouTube ne fonctionnait pas en Chromium OVH.

## BOONO-TV — véritable MarketCipher B et refus de lecture YouTube (5 novembre 2026)

- [OD-20261105-008 — MarketCipher B de TradingView et diagnostic YouTube](OD-20261105-008/03-origine-et-justification.md) : correction de la substitution non autorisée du MCB3 maison, retour au screenshot TradingView en source par défaut ; diagnostic Referer présent et LOGIN_REQUIRED antiprobots en navigateur OVH de contrôle ; [rapport technique](../BOONO_TV_retour_MarketCipher_TW_Youtube_diagnostic_2026-11-05.md). Alpha et PAPER inchangés.

## BOONO-TV — nouveau loft à deux masques GIMP (5 novembre 2026)

- [OD-20261105-009 — loft GIMP à deux masques séparés](OD-20261105-009/03-origine-et-justification.md) : XCF 1200×1080 avec calques FENETRES et AFFICHES indépendants, quatre variantes alpha et deux PNG de masque sur OVH, alternance configurable sans fusion ; [rapport et preuves](../BOONO_TV_LOFT_2_MASQUES_GIMP_2026-11-05.md). Original GIMP et calibration intacts.

## BOONO-TV — Chrome Amsterdam figé, indépendant du zoom noVNC (5 novembre 2026)

- [OD-20261105-010 — fenêtre Chrome Amsterdam fixée à 1366×743](OD-20261105-010/03-origine-et-justification.md) : diagnostic des reflows 1920×1080 / xrandr, neutralisation du redimensionnement à chaque zoom noVNC, gabarit conservé au prochain recycle ; [rapport technique](../BOONO_TV_Chrome_Amsterdam_geometrie_fixe_2026-11-05.md). Collecteurs et PAPER non redémarrés.

## BOONO-TV — découpe MarketCipher B ancrée au panneau TradingView (5 novembre 2026)

- [OD-20261105-011 — capture du panneau MarketCipher B réancrée au DOM](OD-20261105-011/03-origine-et-justification.md) : ancienne coupe y480..639 décentrée, vrai pane y404..588 ; rectangle dynamique x606/y429/610×152 et projection au bon ratio, sans substituer MCB3 interne. [Rapport technique](../BOONO_TV_MCB3_CADRAGE_PANE_TRADINGVIEW_2026-11-05.md).

## BOONO-TV — ordre des couches rideau/bougies/bulles (5 novembre 2026)

- [OD-20261105-012 — Rideau et bougies derrière les bulles](OD-20261105-012/03-origine-et-justification.md) : remplacement de l’ancien empilement parent z6 des bulles par z9, entre les graphiques z7/z8 et le bureau/BOONO/chat z10–13 ; [rapport et tests Chromium](../BOONO_TV_ordre_couches_bulles_vagues_bougies_2026-11-05.md). Poses, calibration et PAPER inchangés.

## BOONO-TV — atelier de scénarios stop-motion et fenêtres temporelles (5 novembre 2026)

- [OD-20261105-013 — Atelier unifié des scénarios postures, bulles et accessoires](OD-20261105-013/03-origine-et-justification.md) : durée et décalages par posture, texte et forme de bulle, accessoires et plages 0–100 % à deux curseurs, aperçu temporel sur la surface État vivant ; [rapport technique et tests](../BOONO_TV_ATELIER_SCENARIOS_UNIFIE_2026-11-05.md). Calibrage du bureau et PAPER inchangés, logos en attente de droits.

## BOONO-TV — MP4 Clemens Costa privé derrière les fenêtres (5 novembre 2026)

- [OD-20261105-014 — vidéo Clemens Costa test privé derrière les fenêtres](OD-20261105-014/03-origine-et-justification.md) : récupération du MP4 original Chromebook, contrôle SHA-256, streaming privé avec HTTP Range sur OVH et player HTML5 muet par défaut avec activation audio manuelle ; [rapport technique et tests](../BOONO_TV_Clemens_Costa_video_fenetres_test_2026-11-05.md). Les droits de diffusion publique ne sont pas établis. Bureau, masques et PAPER intacts.

## BOONO-TV — postures et composition vidéo ChromeOS (nuit 5/6 novembre 2026)

- [OD-20261105-015 — postures fiabilisées en mode vidéo Clemens](OD-20261105-015/03-origine-et-justification.md) : 12 PNG d’origine toujours présents, erreur non reproduite dans Chromium OVH, nouvelle couche PNG DOM explicite et déclenchement de la vidéo après décodage du premier sprite, mode normal intact ; [rapport de contrôles](../BOONO_TV_postures_video_charge_2026-11-05.md). Validation finale sur Chromebook ouverte.

## BOONO-TV — lecture MP4 via canvas sur ChromeOS (6 novembre 2026)

- [OD-20261106-001 — lecture MP4 via canvas pour préserver BOONO](OD-20261106-001/03-origine-et-justification.md) : suite au signalement « postures visibles à la pause uniquement », vidéo native masquée et frames dessinées dans canvas à 12 ips, audio continu et 12 postures vérifiées en Chromium ; [rapport et limites ChromeOS](../BOONO_TV_video_canvas_postures_2026-11-06.md). Validation sur appareil utilisateur encore nécessaire.

## BOONO-TV — écran géant et quatre surfaces de projection vidéo (6 novembre 2026)

- [OD-20261106-003 — écran géant et quatre surfaces vidéo toutes les 21 secondes](OD-20261106-003/03-origine-et-justification.md) : un seul MP4/CANVAS et une seule horloge pour fenêtres, affiches, moniteurs de bureau groupés, écran mural derrière BOONO ; 21s par surface, boucle 84s, sans pause ni changement de source, [rapport de déploiement et tests](../BOONO_TV_projection_quatre_surfaces_21s_2026-11-06.md). Validation visuelle du grand écran sur Chromebook ouverte.

## BOONO-TV — grand écran en perspective (6 novembre 2026)

- [OD-20261106-004 — perspective du grand écran, MCB et bougies en arrière](OD-20261106-004/03-origine-et-justification.md) : nouvel écran plus étroit et foisonnement perspective du clip; rideau MCB et bougies derrière uniquement pendant les 21 secondes du grand plan, sans perturber les trois autres surfaces. [Rapport et preuves Chromium](../BOONO_TV_grand_ecran_perspective_2026-11-06.md). Glitch fugace au premier chargement maintenu sous observation.
