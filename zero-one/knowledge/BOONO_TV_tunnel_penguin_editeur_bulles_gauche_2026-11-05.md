# BOONO-TV — tunnel local du Chromebook et éditeur de bulles allégé à gauche

**Date :** 5 novembre 2026.
**Décision :** OD-20261105-005, dossier de décision opérationnelle.
**État :** connexion rétablie, service utilisateur activé et redémarré avec succès ; interface OVH modifiée et tests Chromium réussis. **Cause exacte du plantage ChromeOS non prouvée**, validation finale sur le vrai Chromebook encore ouverte.

## 1. Nature des connexions et réparation

Sur Penguin après le redémarrage du Chromebook, Desktop Commander remote était déjà connecté (processus npm/npx) et le tunnel VNC autossh était en place sur 0.0.0.0:6080 ; le port local 127.0.0.1:8310 destiné au studio BOONO-TV était absent. Sur Amsterdam le tunnel 127.0.0.1:8310 → OVH 127.0.0.1:3091 fonctionnait et renvoyait HTTP 200.

Le tunnel Penguin a été rétabli à l'aide de la clé/alias boono-amsterdam déjà autorisés, avec transfert LOCAL uniquement de 127.0.0.1:8310 vers Amsterdam 127.0.0.1:8310. Résultat : HTTP 200 sur http://127.0.0.1:8310/?showcase=1 depuis Penguin.

Un nouveau service **utilisateur** systemd a ensuite été créé sous /home/boono70/.config/systemd/user/boono-tv-studio-tunnel.service, utilisant autossh -M 0, Restart=always, RestartSec=8 et la redirection locale 127.0.0.1:8310:127.0.0.1:8310 via boono-amsterdam. Il est enabled et active. La session SSH manuelle a été remplacée par le service ; un redémarrage contrôlé de celui-ci a été testé avec succès, et le port 8310 a de nouveau répondu HTTP 200. Le reboot complet du Chromebook n'a pas été testé ; le service est activé pour le démarrage de la session utilisateur Penguin.

Lancer npx @wonderwhy-er/desktop-commander@latest remote (après configuration PATH de Node) est une opération distincte de la connexion SSH ; il ne restaure pas les redirections localhost 6080/8310.

## 2. L'éditeur de bulles : incident et modifications

L'utilisateur a signalé un plantage de son Chromebook au clic sur Voir avant sauvegarde dans l'éditeur de bulles BOONO-TV. Nous **ne disposons pas des journaux ChromeOS de l'hôte**, donc il serait inexact d'affirmer une cause démontrée. Le code préexistant faisait cependant coexister l'éditeur directement sur le loft, le paramètre showcase=1, le préchargement d'illustrations supplémentaires et des rafraîchissements répétés de graphes sous-jacents.

Changements ciblés sur OVH, sans impact sur le trading :
- scene/dialogue-editor.js : éditeur installé comme enfant de statePanel à gauche au lieu de room ; panneau gauche remplace temporairement l'État vivant. Trois choix restent accessibles (12 postures, 4 types de bulles, texte 220 caractères). Les modifications de texte se font sans prévisualisation automatique : il faut cliquer explicitement sur Voir. Voir ne sauvegarde rien. Enregistrer demeure l'unique action de persistance ; Annuler rétablit les valeurs du fichier ; Quitter retire le mode édition.
- scene/styles.css : éditeur plus large, avec grandes listes, boutons et textarea dans la moitié gauche. La scène du loft reste libre pour visualiser BOONO, la posture et la bulle.
- scene/app.js : pendant dialogueEdit=1, le mode showcase lourd est supprimé même si l'ancien URL conserve showcase=1. Les grands graphiques prix/vagues/conversion sont dessinés une fois, puis restent statiques pendant l'édition ; les messages de prix continuent d'être reçus, mais ne régénèrent plus les SVG/canvas lourds chaque seconde. Le bouton Voir force uniquement le changement visuel demandé. Les raccourcis numériques de postures 1-7 ne s'activent plus lorsque l'utilisateur écrit dans un textarea, input ou select.
- scene/chart-views.js : rotation des trois panneaux suspendue durant l'édition, reprise en fonctionnement normal dès la sortie.
- scene/layout-editor.js : l'entrée Scénarios / Bulles mène maintenant à ?dialogueEdit=1 sans déclencher showcase=1 ou showcaseHold=1 ; l'ancien lien direct avec showcase=1 reste accepté mais se comporte lui aussi de façon allégée.

## 3. Tests réels et absence d'effet sur les données enregistrées

- Sauvegarde pré-retouche OVH : /home/ubuntu/boono-tv-studio/backups/OD-20261105-005/ (app.js, chart-views.js, layout-editor.js, dialogue-editor.js, styles.css, index.html, dialogue-script.json et projection-config.json).
- Syntaxe Node valide pour les quatre JavaScript modifiés ; studio HTTP 200. La calibration du bureau est identique avant/après : SHA-256 39922e2434c59e282d3ee64ff851c6b9def9c43a345d5c2f68cf56b87d112c2f.
- Chromium sur ancien URL ?showcase=1&showcaseHold=1&dialogueEdit=1 : éditeur réellement parenté au panneau statePanel, aucune activation de showcase lourd, 12 postures sur 12 correctement affichées, chiffres saisis dans le textarea sans changer la posture, Voir avec texte non enregistré affiché immédiatement dans la bulle, fichier de 12 textes conservé strictement identique, zéro exception JS. Script tests/verify-editor-left-stable-20261105.js, captures OD-20261105-005-editor-left.jpg / editor-preview.jpg et JSON.
- Stress Chromium supplémentaire sur nouveau ?dialogueEdit=1 : 44 clics Voir en 18 secondes, aucune erreur JavaScript, état de panneau toujours state, DOM SVG Conversion non recréé, données enregistrées non modifiées ; script tests/verify-editor-stress-44-views-20261105.js + JSON.
- Régression : clic Enregistrer avec configuration inchangée → 12 associations confirmées et fichier identique ; sortie retourne à l'URL standard ; le bouton Scénarios / Bulles ouvre ?dialogueEdit=1 dans le panneau gauche sans showcase ; la rotation normale de l'État vivant vers Graphiques continue à 12 secondes après sortie du mode édition. Script tests/verify-bubble-editor-regression-20261105.js + JSON ; zéro erreur.
- Le service SSH utilisateur a été explicitement redémarré pendant le test : is-enabled=enabled, is-active=active et HTTP 200 au port 8310.

## 4. Limites et prochaines vérifications

Cette correction diminue la surcharge potentielle mais ne prouve pas rétrospectivement l'origine du plantage du Chromebook. Il faut confirmer le comportement dans ChromeOS lors du prochain clic Voir réel ; si un nouveau crash survient, récupérer l'heure et les symptômes sans inventer de cause. Le rendu des graphes est intentionnellement figé **uniquement pendant l'édition**, pas pour la diffusion normale, les moteurs de trading ou les collecteurs. Le service SSH est activé au lancement de Penguin, mais aucun reboot complet post-installation n'a encore été réalisé.

BOONO Systems : aucun changement à V494/V543 PAPER, leurs journaux, leurs ordres, leurs risques, leurs collecteurs ou aux coordonnées/illustrations validées. Les modifications effectives du studio restent sur le serveur OVH, et la connexion SSH sur Penguin. Le dépôt Git Amsterdam étant déjà fortement modifié par des chantiers antérieurs, seule la Knowledge Base et le dossier OD peuvent être inclus dans un commit documentaire ciblé.
