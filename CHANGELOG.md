# @theyoungwolf/lexorank

## 0.1.3

### Patch Changes

- 649fc48: Fix `rankBetween` producing a rank outside its bounds when the two majors are
  adjacent and the upper bound carries a minor.

  `minorSpaceRanks` only substituted an absolute ceiling when `high.minor` was
  exactly `":"`. Otherwise it compared the lower bound's fraction against a
  fraction belonging to a _different_ major, which can run descending and yields a
  value below `prev`. `assertWithinBounds` caught it, so the symptom was a
  `RankInvariantError` rather than silent corruption, but the call still failed.

  The shape is reachable from ranks this library produced: grow a fraction at the
  top of one major and another at the bottom of the next, then delete the item
  between them. Their neighbours are now the failing pair.

  The minor's ceiling is now treated as open whenever the bounds do not share a
  major, when the upper bound is absent, or when a bucket boundary was spoofed —
  and the low-side pivot marks it open too, since borrowing the lower bound's
  character puts every extension below the original ceiling.

  Ranks already written are unaffected: 40,000 random insertions driven entirely
  by library calls produce byte-identical output to the previous release, as do
  `rebalance`, `rankAfter` and `rankBefore`. Only inputs that previously threw
  change.

## 0.1.2

### Patch Changes

- a781c87: Update Readme to add live demo and blog post

## 0.1.1

### Patch Changes

- d93b8b6: Add logo and illustrations to the README. No functional changes.

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
