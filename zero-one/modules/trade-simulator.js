/**
 * trade-simulator.js — point d'entree stable du laboratoire BOONO.
 *
 * Depuis le 01/10/2026 :
 * - V3 est demotee en shadow/counterfactual (artefact decisionnel conserve pour comparaison).
 * - V4 est le moteur paper-trading primaire.
 * - Aucun ordre reel : simulation uniquement.
 */
module.exports = require('./trade-simulator-v4');
