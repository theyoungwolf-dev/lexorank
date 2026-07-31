# @theyoungwolf/lexorank

## 0.1.0

### Minor Changes

- c187ecb: Initial release.

  Ordered string ranks for drag-and-drop lists: insert, move and reorder items without renumbering their neighbours. Ranks sort correctly as plain strings, so no custom collation is needed in your database.

  **Creating ranks**

  - `firstRank()` — the first rank for an empty list
  - `rankAfter(to)` / `rankBefore(to)` — append and prepend, stepping by a fixed structural gap
  - `rankBetween(prev, next)` — a rank strictly between two neighbours. An open (`null`) bound delegates to `rankAfter` / `rankBefore`, since nothing exists on that side to collide with
  - `ranksBetween(count, prev, next)` — the plural form, up to `MAX_BATCH_SIZE` (60) at once
  - `rebalance(count)` — fresh, evenly spaced ranks. Repairs a degraded list, and seeds a new one

  **Inspecting ranks**

  - `compareRanks(a, b)` — comparator for `Array.prototype.sort`
  - `parseRank(value)` and `Position` — an immutable `{ bucket, major, minor }`
  - `isValidRank(value)` — true for exactly the values this API accepts
  - `minorLength(rank)` — health signal for a list; watch it to rebalance before anything throws
  - `generateEntropy(length)` — uniformly distributed Base-62, safe to append to a rank

  **Guarantees**

  Every rank returned sorts strictly after `prev`, strictly before `next`, and strictly after the rank preceding it. This is verified at runtime on every call, with no exemptions.

  Bounds describing no valid interval are rejected rather than approximated: `RankOrderError` for descending bounds, `DuplicateRankError` for identical ones, `InvalidRankError` for malformed or non-canonical strings, `BatchSizeError` for an out-of-range count, and `RankSpaceExhaustedError` when a list needs rebalancing. All extend `LexorankError`.

  **Notes**

  - Zero dependencies. Ships ESM and CommonJS with type declarations for each.
  - A minor may not end in `0`. `:U` and `:U0` denote the same value but are different strings, and no rank sorts between them, so permitting both would create neighbours that can never be separated.
  - Repeatedly subdividing between the same two neighbours grows the minor component by roughly one digit per five insertions. `maxMinorLength` bounds it (default 128) and `rebalance` clears it. Ordinary use never approaches the limit.
