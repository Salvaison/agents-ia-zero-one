# OD-20261106-003 — Surface de projection murale et rotation vidéo continue à 21 secondes

**Autorisation utilisateur :** demande de grand écran dessiné en rouge dans le loft, derrière BOONO, puis clarification « avec un changement de surface toute les 21 secondes ? ». L'utilisateur veut la même vidéo passant entre fenêtres, affiches, deux moniteurs de BOONO (une surface logique), grand écran, sans interruption et pendant le trading.

**Rapport préalable étudié :** `knowledge/BOONO_TV_incident_video_sprites_charge_2026-11-06.md` (OD-20261106-002). Les sprites disparus avec MP4 sur ChromeOS ont été réparés ; l'utilisateur a confirmé « Superbe, ça marche!! ». Conserver le Canvas à ~12fps et les limites HTTP Range 2MiB, ne pas remettre vidéo native plein cadre.

**Situation avant travaux :** la vidéo MP4 Clemens Costa reste privée sur OVH, montée derrière les fenêtres avec deux masques alpha GIMP indépendants et player unique caché. La calibration validée des deux moniteurs est dans `desk/projection-config.json` et doit rester byte-identique. L'éditeur de scénarios vit dans l'État vivant. Des bougies z8, rideau z7, bulles z9, bureau z10, BOONO z12, chat z13 sont déjà en scène.

**Choix :** implémenter un mode opt-in `?windowVideo=clemens&projectionCycle=21`. Le même canvas de décodage est transporté visuellement entre fenêtres, affiches et nouvel écran ; sur les deux moniteurs il reste source pour deux recadrages complémentaires. Aucun deuxième lecteur MP4. Changement commandé par `video.currentTime` à 0,21,42,63 secondes, modulo 84 ; si pause, la surface reste en place ; seeking recalibre sans restart. Le nouveau grand écran est placé dans un module visuel indépendant, quad inspiré du marquage rouge de l'utilisateur (réglable localement par la suite), derrière les acteurs et devant le loft, sans modifier l'art original.

**Périmètre :** rendu BOONO-TV privé seulement. Aucune modification du trading, des postures, du chat, du son, de la capture MarketCipher ou de la calibration actuelle.
