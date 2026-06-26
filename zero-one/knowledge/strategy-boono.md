# strategy-boono.md
*Version 0.2 — 25 juin 2026*

---

## Architecture — 3 modules parallèles

### Module Scalp
- **Timeframes signaux :** 1H + 12min + 3min
- **Contexte :** 4H
- **Leverage :** 20x-75x
- **Stop-loss :** NON — bonne entrée = protection
- **Taille mise :** 10$ par trade
- **TP1 :** rapide, couvre les frais
- **Logique :** volume élevé, petits profits cumulés

### Module Day
- **Timeframes signaux :** 4H + 1H + 5min
- **Contexte :** Daily (tendance)
- **Leverage :** 5x-10x
- **Stop-loss :** OUI — défini par S/R technique
- **Risque max :** 1% capital = 10$

### Module Swing
- **Timeframes signaux :** 1D + 4H + 1H
- **Contexte :** Weekly (macro + tendance)
- **Leverage :** 5x-10x
- **Stop-loss :** OUI — S/R majeur
- **Risque max :** 1% capital = 10$

---

## Hiérarchie de confluence — conditions d'entrée

Minimum 3/5 alignés pour agir. Pondération dynamique selon le contexte.

1. **Divergences MCB** — signal primaire. Confluence multi-timeframes requise. Élément le plus fiable.
2. **Volume** — confirmation de l'engagement réel du marché. Potentiellement décideur ultime dans certains contextes.
3. **S/R** — zone, pas niveau précis. Pourcentage autour
