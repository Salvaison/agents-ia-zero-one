# BOONO-TV — Correction de l'onglet Scène Live (17 novembre 2026)

## Incident
L'utilisateur constate que cliquer sur « Scène Live » dans la barre des ateliers arrête les rotations de BOONO.

## Cause vérifiée
L'onglet Scène Live de `/home/ubuntu/boono-tv-studio/runtime/boono-tv/scene/composition-tabs.js` pointait vers `/` sans `showcase=1`. Le moteur de présentation `app.js` n'active le cycle des postures qu'avec `showcase=1` (hors mode édition des dialogues). La navigation désactivait donc le cycle par omission du paramètre. La correction précédente de `showcaseHold=1` ne suffisait pas pour la page Live.

## Implémentation et vérification
- Sur OVH, l'onglet Scène Live utilise désormais `/?showcase=1`. Cache-busting `composition-tabs.js?v=20261117-live03`.
- Backup avant édition : `/home/ubuntu/boono-tv-studio/backups/OD-20261117-LIVE-ROTATION/`.
- Test Chromium `/home/ubuntu/boono-tv-studio/tests/verify-live-tab-rotation-20261117.js` : ouverture depuis Composition vers Scène Live ; URL `?showcase=1` ; passage automatique de posture `working` à `thinking` sur ~14 secondes, présence panneau Live et élément de prix, zéro exception JS.
- Non modifiés : calibration, échanges MCB/OKX, runners PAPER, services systemd.

## État
Correctif actif sur OVH ; test automatique réussi. Vérification perceptuelle sur le Chromebook utilisateur restant à confirmer.
