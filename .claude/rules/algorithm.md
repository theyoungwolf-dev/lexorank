---
paths:
  - "src/**/*.ts"
---

# Working on the ranking algorithm

## The contract

Every rank returned by this library satisfies, without exception:

- strictly greater than `prev`, when a `prev` bound was given
- strictly less than `next`, when a `next` bound was given
- strictly greater than the rank returned before it, in a batch

`assertWithinBounds` enforces this at runtime on every call. If a change makes that assertion fire, the change is wrong - do not add a carve-out to the assertion.

## Rank format

```
<bucket>|<major>[:<minor>]
    0    |  UUUUUU  :  U
```

- **bucket** 0-2. Monotonic, not cyclic: bucket is just a more significant digit, so plain string comparison orders ranks correctly. `rankAfter` / `rankBefore` roll into the neighbouring bucket when integer space runs out.
- **major** exactly 6 Base-62 characters, fixed width. Sequential steps of `STEP_SIZE` (1,000,000) leave insertion runway.
- **minor** unbounded Base-62 fraction, _including_ its leading `:`. `Position.minor` is `":xy"`, not `"xy"` - a common source of off-by-one slicing.

Ranks sort correctly as plain strings because every component is fixed-width or suffix-only. Do not introduce a component that breaks this.

## Structure of the search

`computeRanks` normalises the bounds, then tries `majorSpaceRanks` first and falls back to `minorSpaceRanks`.

- `majorSpaceRanks` returns `null` to mean "the majors are adjacent, try the minor space". It does not throw.
- Both loops are bounded by their `while` condition, not by an internal counter. `majorSpaceRanks` is bounded by the major width; `minorSpaceRanks` by `MAX_MINOR_LENGTH`. Termination is structural - keep it that way rather than adding iteration counters.
- Both functions clone their bounds. They mutate their working copies, so passing a `Position` straight through would corrupt the caller's data.

## Base-62 arithmetic

`decodeChar` is a `charCode` lookup table. It returns `-1` for anything outside the alphabet, and `orderOf` throws on that. This is deliberate: without it the implementation would silently coerce unknown characters to 0 or 61, which hides bad data.

Plain `number` is exact here - the largest intermediate is about 3.5e12, well inside `Number.MAX_SAFE_INTEGER`. Do not reach for BigInt.

Gaps are computed with plain subtraction. A non-positive gap yields `null` ("no room") and the search descends a level. Do not reintroduce byte-wraparound arithmetic.

## Errors

Each names a distinct cause and callers handle them differently. Keep them distinct:

| Error                     | Cause                               | Caller's fix            |
| ------------------------- | ----------------------------------- | ----------------------- |
| `InvalidRankError`        | Malformed or non-canonical string   | Fix or migrate the data |
| `RankOrderError`          | `prev` sorts after `next`           | Arguments are swapped   |
| `DuplicateRankError`      | Both bounds are the same rank       | Rebalance the list      |
| `BatchSizeError`          | `count` outside 1..`MAX_BATCH_SIZE` | Fix the call            |
| `RankSpaceExhaustedError` | Nothing can exist in that position  | Rebalance the list      |
| `RankInvariantError`      | A result escaped its bounds         | Bug in this library     |

Never collapse two of these into one to simplify a signature.
