# Skill: /parse-sr-levels
Purpose: Parse, validate, and structure the S/R levels document Benjamin submits after the daily brief REBOOT command.
Installed to: ~/zero-one/commands/parse-sr-levels.md (local — specific to the Boono agent; promote to ~/.claude/commands/ later only if reused across other agents)

---

## Skill File Contents

# /parse-sr-levels

Parse a raw S/R levels submission into a structured, validated format ready for confluence analysis.

---

## Syntax Elements (isolated from SOP v1.1)

| Token | Meaning | Format |
|---|---|---|
| `DS"prix"` | Daily Support | `DS"104250"` |
| `DR"prix"` | Daily Resistance | `DR"105800"` |
| `WS"prix"` | Weekly Support | `WS"101000"` |
| `WR"prix"` | Weekly Resistance | `WR"108500"` |
| `MS"prix"` | Monthly Support | `MS"98000"` |
| `MR"prix"` | Monthly Resistance | `MR"112000"` |
| `fib0"prix"` | Fibonacci 0 anchor | `fib0"103000"` |
| `fib1"prix"` | Fibonacci 1 anchor | `fib1"109500"` |

All 6 Support/Resistance combinations (Daily/Weekly/Monthly × Support/Resistance) are valid — the SOP's shorthand (DS/WR/MR only) was illustrative of the format, not an exhaustive list.

## Instructions

This skill has no dependency on agent-spec.md being loaded — it is self-contained.

Step 1: Read the raw text Benjamin submits (pasted directly, or from a file path he provides).

Step 2: For each line, extract the token type and price using this pattern: `[A-Z]{2,4}"[0-9]+(\.[0-9]+)?"`. Valid token types are: DS, DR, WS, WR, MS, MR, fib0, fib1.

Step 3: For each extracted entry, validate:
- The price is a positive number.
- The token type is one of the known valid types. If an unrecognized token appears, do not silently drop it — flag it explicitly in the output as "unrecognized token" rather than discarding it.
- No duplicate identical token+price pairs (flag duplicates, don't auto-remove — Benjamin may have intentionally re-confirmed a level).

Step 4: Group the validated entries by type (Support levels, Resistance levels, Fibonacci anchors).

Step 5: Sort each group by price, ascending.

Step 6: Output the structured result (see Output below).

## Output

Produce a Markdown table with columns: Token | Type | Price | Timeframe implied (Daily/Weekly/Monthly/Fib) — plus a separate "Issues" section listing any unrecognized tokens, duplicates, or malformed entries found during parsing.

Save the structured output to `~/zero-one/memory/sr-levels-YYYY-MM-DD.md` (date = current daily brief date).

## Error Handling

- If no valid tokens are found in the submission at all, do not proceed silently — report "no valid S/R tokens parsed" and ask Benjamin to resubmit rather than passing an empty structure forward to Phase 3 confluence analysis.
- If the submission is ambiguous (e.g. a price with no token, or a token with no price), list it under Issues and exclude it from the structured table rather than guessing its intent.

---

## Installation

Create it directly:
```
cat > ~/zero-one/commands/parse-sr-levels.md << 'EOF'
[Skill file contents above]
EOF
```

## Test

Once installed, test by running:
`/parse-sr-levels`

in a Claude terminal session, then pasting a sample S/R submission.

Save the skill file to: ~/zero-one/commands/parse-sr-levels.md