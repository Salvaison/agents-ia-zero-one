# OD-20261117-002 — Observation passive du rollover complet du 18/11/2026

**Mandat :** demande utilisateur du 17 novembre 2026 : observer la séquence 15m, 1h, 4h, Daily, 15m « cette nuit à minuit ».

**Source des horloges :** l'hôte Amsterdam est réglé en UTC et synchronisé NTP. Le code `modules/tab2-collector.js` emploie `Date.now()` et des fenêtres epoch UTC pour ses barres 15m/1h/4h/1D, et 1W aligné au lundi. La clôture Daily est à **2026-11-18 00:00 UTC = 01:00 Europe/Stockholm**. Pour ne pas manquer l'interprétation locale de « minuit », l'observation inclut **2026-11-17 23:00 UTC = 00:00 Stockholm**, et poursuit au-delà de 00:00 UTC.

**État initial connu :** `collecteur-tab2` PM2 online, script `zero-one/modules/tab2-collector.js`, rotation `Page.navigate` sur layout collecteur `2AqpEMfD`. Code `pickNext` : priorité aux clôtures non collectées, garde 120s, anticipation 90s, repli 15m. Les logs montrent aujourd'hui 15m→1h→4h→15m et 15m→1h→15m avec backfill/« caughtUp ». Le Daily est attendu à 00 UTC. Après la séquence, vérifier la vraie production `mcb_1d.csv`, pas seulement les changements d'onglet.

**Périmètre :** seule installation d'une sonde passive courte, non autoritaire, sur le serveur Amsterdam, et automatisation ChatGPT à 02h00 CET pour relecture après l'observation. Aucun changement ni redémarrage des moteurs PAPER ou du code collecteur. Les relevés bruts sous `zero-one/data/system-audits/rollover-2026-11-18/` ne sont pas destinés à un commit Git.

**Provenance :** 01 = texte intégral utilisateur, 02 = mission d'exécution explicitée par l'assistant, réalisée directement via outils Remote Desktop Commander, pas une commande d'un agent externe.

**Critères :** sonde robuste aux navigations (le CDP ID du même tab peut persister), cadence 15s, événements de journal PM2 sans données sensibles, statistiques de mémoire et timestamps CSV à 15m/1h/4h/1D, rapport après passage et mention des lacunes si une partie échoue. Stop automatique à la fin de la fenêtre.
