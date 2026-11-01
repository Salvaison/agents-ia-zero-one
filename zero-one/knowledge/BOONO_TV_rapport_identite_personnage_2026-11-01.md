# BOONO-TV — Rapport de conception : identité visuelle et caractère de BOONO

**1er novembre 2026 · rapport de passation et de décisions**  
**Statut : documentation validée et publiée sur Git ; aucun nouveau dessin définitif ni déploiement.**  
**Registre :** [OD-20261101-004](operational-decisions/OD-20261101-004/03-origine-et-justification.md)  
**Livrable de référence :** [BOONO — Identité visuelle, mécanique et personnalité, v1.0](BOONO_identite_visuelle_mecanique_personnalite_v1_2026-11-01.md).

## 1. Objet et portée

Le propriétaire demande la transcription en Markdown de la description détaillée du personnage BOONO, qu'il vient d'approuver, ainsi qu'un compte rendu sur GitHub.

Ce travail fixe une **charte visuelle, anatomique et comportementale** pour toutes les prochaines illustrations et séquences BOONO-TV. La description est une spécification artistique : elle ne produit pas, à elle seule, un nouveau personnage 2D/3D exploitable, des sprites transparents ni une animation en service.

## 2. Point de départ — mugshot d'origine

Le mugshot de BOONO constitue la référence morphologique fondamentale : robot industriel bleu acier patiné, corps construit en segments mécaniques, tête carrée légèrement bombée, face encadrée par quatre grosses vis, grands yeux blanc ivoire asymétriques, pupilles noires, petit nez, grande bouche/grille mécanique, oreillettes rouges et antenne à boule rouge. Les proportions de la tête et l'éventail des expressions distinguent BOONO d'une mascotte générique.

Dans les premières séries de poses debout, la génération graphique avait dérivé vers un **robot adolescent** : sweat, pantalon, grosses baskets, yeux jaunes, sourire de mascotte, gestes exagérés et expression insuffisamment fidèle. Ces essais **ne sont pas des références retenues**.

## 3. Corrections retenues au fil des itérations

| Sujet | Observation / décision artistique | Statut |
|---|---|---|
| Personnalité | Personne mature, intellectuelle, déterministe, légèrement angoissée, perfectionniste ; humour involontaire, à contretemps | **Retenu** |
| Inspiration comportementale | Sensibilité aux détails et sérieux excessif rappelant Adrian Monk, sans imitation de Tony Shalhoub ni de sa silhouette | **Retenu** |
| Morphologie | Corps entièrement mécanique, plus de volume à la cuirasse, membres élancés mais suffisamment solides, sans vêtements humains | **Retenu** |
| Tête | Carré désormais **légèrement rectangulaire**, plus large que haut, face bleu acier emboutie/convexe et quatre vis | **Retenu** |
| Yeux | Grands yeux **ivoire, pupilles noires**, asymétrie maîtrisée ; pas yeux jaunes de mascotte | **Retenu** |
| Arcades | Les « sourcils » sont le **rebord supérieur des cavités oculaires**, non des traits flottants dessinés sur le front | **Règle fondamentale** |
| Nez/bouche | Nez minuscule ; grande ouverture sombre mécanique, denture/grille rectangulaire, souvent crispée ou incertaine | **Retenu** |
| Oreillettes / antenne | Deux modules métalliques rouges et antenne articulée à boule rouge | **Retenu** |
| Cuirasse | Peinture bleu gris **nettoyée, entretenue**, patine conservée ; ni métal neuf ni rouille excessive | **Retenu** |
| Pieds | **Petits appuis mécaniques articulés**, plus fins et compacts ; aucun aspect baskets | **Direction préférée, à finaliser** |
| Expression | Préférence explicite pour le jeu des expressions de la **première des deux variantes** comparées par le propriétaire | **Référence directionnelle** |
| Postures | Marche en rond ; contemple la fenêtre ; interpelle ; bondit à une illumination ; réfléchit debout | **Cahier des charges** |
| Style | Bande dessinée rétro, encres/raster, grain papier journal, bleu acier désaturé, peu d'ambre | **Retenu** |

## 4. Le ressort narratif du personnage

BOONO est l'incarnation visuelle de l'agent analytique déterministe BOONOTRADE, sans prétention de conscience informatique. Il examine des preuves, compare des scénarios, formule des objections et reste attentif à ce qu'il ne sait pas. Son paradoxe constitutif est de chercher à supprimer l'incertitude en travaillant sur un domaine où elle persiste.

Son anxiété est **intellectuelle et discrète**, non une faiblesse ni une panique constante. Il conserve une dignité d'adulte. L'humour doit émerger naturellement de son excès de rigueur (« Et si j'avais oublié quelque chose ? »), non de grands sourires, de grimaces ou d'une gestuelle enfantine.

Le personnage peut être sympathique, curieux, sensible, persévérant et momentanément enthousiaste, sans devenir insouciant ou superficiel.

## 5. Expression et cinématique

La conception du visage doit être constante entre les états et les poses. L'expression dépend avant tout des **orbites**, de leurs rebords métalliques supérieurs, des axes de regard, de l'ouverture dissymétrique des yeux et de la grande mâchoire mécanique. La fiche fournit une table des dix états : concentration, doute, perplexité, inquiétude, surprise, détermination, scepticisme, soulagement, réflexion profonde, illumination.

Les cinq attitudes validées comme programme d'illustration sont :
1. **Marche en rond** : rumination, pas mesurés, mains éventuellement dans le dos.
2. **Regarde au-delà des fenêtres** : contemplation presque philosophique, posture fixe.
3. **Interpelle le public** : explication interrogative, geste mesuré, sans posture d'animateur survolté.
4. **Bondit** : découverte et bref sursaut mécanique, puis besoin de vérifier.
5. **Réfléchit debout** : une main près du menton, orbites asymétriques, intensité silencieuse.

## 6. Décisions, limites et prochaines étapes

**Décision validée :** la fiche de personnage et les règles morphologiques/psychologiques qui en résultent sont retenues et archivées dans la Knowledge Base. Le mugshot demeure la **source de vérité artistique prioritaire** pour la tête, le visage et l'identité globale.

**Restent ouverts :** les pieds exactement articulés, les contours des cavités oculaires en plusieurs directions, le modèle du dos et du bassin, la tenue du rapport tête/torse lorsque BOONO est vu en pied et l'homogénéité de cinq déclinaisons graphiques. Les dernières images sont des **essais de direction**, pas encore des assets canoniques définitifs.

**Prochaine démarche recommandée :** créer une seule silhouette de BOONO **debout en pied**, de face, profil et trois quarts, en testant les cavités et le pied mécanique, la confronter au mugshot et à la fiche, puis décliner les postures. Avant intégration BOONO-TV, produire séparément les PNG RGBA, masques, ancres et tests de perspective dans le loft.

**Aucun changement opérationnel :** aucune écriture dans les moteurs PAPER, les journaux ou les règles de trading ; aucun redémarrage ni nouveau calque/asset BOONO déployé dans le studio OVH.

## 7. Provenance et traçabilité

- **Demande source :** messages utilisateur mot pour mot conservés dans [OD-20261101-004](operational-decisions/OD-20261101-004/03-origine-et-justification.md), avec texte intégral de mission assistant et origine.
- **Spécification détaillée :** [BOONO — Identité visuelle, mécanique et personnalité v1.0](BOONO_identite_visuelle_mecanique_personnalite_v1_2026-11-01.md).
- **Autres éléments canoniques :** [bureau de BOONO](BOONO_TV_bureau_ordinateur_reference_canonique_2026-11-01.md), [loft nord](BOONO_TV_chambre_canonique_vitrages_paysages_2026-11-01.md) et [bibliothèque du chat](BOONO_TV_chat_5_postures_bureau_sprites_2026-11-01.md).

L'inscription dans Git prouve la traçabilité de la **décision documentaire**, et non l'existence d'un nouveau personnage animé en production.
