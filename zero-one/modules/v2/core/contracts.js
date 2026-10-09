'use strict';

const PHASES = Object.freeze([
  'naissance','expansion','respiration','relance','couronne de crête',
  'érosion','extension terminale','divergence de crête','relance stérile',
  'résolution','bascule de polarité','nouveau lobe',
]);

const EVIDENCE_STATUS = Object.freeze([
  'DEMONSTRE','FALSIFIE','AMBIGU','ARTEFACT_LOGIQUE','DONNEES_INSUFFISANTES',
]);

const ACTIONS = Object.freeze([
  'NO_TRADE','WATCH','ENTER_LONG','ENTER_SHORT','HOLD',
  'EXIT_RISK','EXIT_STRUCTURE','EXIT_EXECUTION','EXIT_EFFICIENCY','EXIT_GOD_YIELD',
]);

const CONFIDENCE = Object.freeze(['UNKNOWN','UNRELIABLE','LOW','MEDIUM','HIGH']);
const DIRECTION = Object.freeze(['long','short','neutral','unknown']);

function finiteOrNull(v) {
  return Number.isFinite(v) ? v : null;
}

function datum({ value, timestamp, source, timeframe = null, confirmed = null, receivedAt = Date.now() }) {
  const sourceTs = typeof timestamp === 'number' ? timestamp : Date.parse(timestamp);
  const ageMs = Number.isFinite(sourceTs) ? Math.max(0, receivedAt - sourceTs) : null;
  return { value, timestamp, source, timeframe, confirmed, receivedAt, ageMs };
}

function requireObject(name, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value;
}

function validateSnapshot(snapshot) {
  requireObject('snapshot', snapshot);
  requireObject('snapshot.market', snapshot.market);
  if (!Number.isFinite(snapshot.market.price)) throw new TypeError('snapshot.market.price must be finite');
  if (!Number.isFinite(snapshot.market.timestamp)) throw new TypeError('snapshot.market.timestamp must be epoch ms');
  if (!snapshot.sources || typeof snapshot.sources !== 'object') throw new TypeError('snapshot.sources required');
  return snapshot;
}

function evidence(status, code, details = {}, sources = []) {
  if (!EVIDENCE_STATUS.includes(status)) throw new TypeError(`invalid evidence status: ${status}`);
  return { status, code, details, sources };
}

module.exports = {
  PHASES,
  EVIDENCE_STATUS,
  ACTIONS,
  CONFIDENCE,
  DIRECTION,
  finiteOrNull,
  datum,
  validateSnapshot,
  evidence,
};
