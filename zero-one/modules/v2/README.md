# BOONO v0.2 experimental core

This directory is the clean-room reconstruction of BOONO around the validated chain:

`WHERE -> STATE -> DOMINANCE -> RISK -> ACTION`

It is intentionally **not wired to production yet**.
The running v0.1/v2 simulator and BOONOTRADE processes remain untouched while this core is built and replay-tested.

## Rules

- Same deterministic core for replay, simulator, 0$ shadow, and later real execution.
- Adapters may change data source; they must not change trading logic.
- Every output carries provenance/evidence and explicit unknown/ambiguous states.
- No hidden fallback from missing data to a directional opinion.
- Thresholds are experimental configuration, never hard-coded as truths.
- LGI means `ligne imaginaire`; no directional meaning is implied.

## Layout

- `core/contracts.js`: schemas/enums/validation helpers.
- `core/engine.js`: pure orchestration of the five layers.
- `adapters/`: source normalization only.
- `experiments/`: candidate rules not promoted to the core contract.
- `tests/v2/`: deterministic contract/regression tests.
