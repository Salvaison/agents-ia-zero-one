'use strict';

function finite(v) { return typeof v === 'number' && Number.isFinite(v); }
function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v); return Number.isFinite(n) ? n : null;
}
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function signDir(v, dead = 0) {
  if (!finite(v) || Math.abs(v) <= dead) return 'neutral';
  return v > 0 ? 'long' : 'short';
}
function quantile(values, q) {
  const a = values.filter(finite).slice().sort((x, y) => x - y);
  if (!a.length) return null;
  const i = (a.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? a[lo] : a[lo] + (a[hi] - a[lo]) * (i - lo);
}
function pct(a, b) {
  if (!finite(a) || !finite(b) || b === 0) return null;
  return (a - b) / b * 100;
}
function median(values) { return quantile(values, .5); }
function ageMs(ts, now = Date.now()) {
  const n = typeof ts === 'number' ? ts : Date.parse(ts);
  return Number.isFinite(n) ? Math.max(0, now - n) : null;
}

module.exports = { finite, num, clamp, signDir, quantile, pct, median, ageMs };
