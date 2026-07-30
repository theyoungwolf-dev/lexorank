# @theyoungwolf/lexorank

Ordered ranking for drag-and-drop lists - the technique behind reorderable boards in tools like Jira. Insert, move and reorder items using stable string keys that sort correctly on their own, without renumbering their neighbours.

- **Zero dependencies**, ESM + CJS, fully typed
- **Effectively infinite precision** - a fixed-width integer component backed by an unbounded Base-62 minor
- **One unconditional guarantee** - `prev < result < next`, re-checked on every call

## Install

```sh
npm install @theyoungwolf/lexorank
```

## The two modes

This is the most important thing to get right, and the two operations are not interchangeable.

**Building a list - `firstRank()` then `rankAfter()`**

```ts
let rank = firstRank(); // "0|UUUUUU:"
for (const task of tasks) {
  task.rank = rank;
  rank = rankAfter(rank); // fixed step, ~86,000 appends of runway
}
```

**Placing an item relative to its neighbours - `rankBetween()`**

```ts
function onDrop(column: Task[], targetIndex: number) {
  const before = column[targetIndex - 1]?.rank ?? null;
  const after = column[targetIndex]?.rank ?? null;
  return rankBetween(before, after);
}
```

`rankAfter(x)` is a pure function of `x` alone - it does not look at what already follows. That makes it perfect for appending, and **wrong** for inserting: drop two tasks after the same task and you get the same rank twice, colliding with the row you meant to sit before. `rankBetween` re-reads both neighbours, so the second drop sees the first drop's rank as its new bound and lands somewhere fresh.

The trade-off is space. Between two closed bounds `rankBetween` halves the remaining gap; `rankAfter` steps by a fixed amount. That is why both exist.

**Open bounds are handled for you.** A bound of `null` says nothing exists on that side, so there is no neighbour to collide with and the fixed step is both safe and far cheaper. `rankBetween` delegates accordingly:

| Call                      | Equivalent to       |
| ------------------------- | ------------------- |
| `rankBetween(null, x)`    | `rankBefore(x)`     |
| `rankBetween(x, null)`    | `rankAfter(x)`      |
| `rankBetween(null, null)` | `firstRank()`       |
| `rankBetween(a, b)`       | midpoint, unchanged |

This matters more than it looks. Repeatedly moving items to the top of a column with `rankBetween(null, first)` would otherwise halve the space below each time and exhaust it after about **669** operations - a reachable number. Delegating turns that into roughly **28,590**. `equidistantRanks` follows the same rule, so `equidistantRanks(1, a, b)` always equals `rankBetween(a, b)`.

## API

| Export                                | Description                                           |
| ------------------------------------- | ----------------------------------------------------- |
| `firstRank()`                         | The initial rank for an empty list.                   |
| `rankBetween(prev, next)`             | A rank sorting strictly between two bounds.           |
| `rankAfter(to)`                       | Next rank above `to`, fixed step. Append only.        |
| `rankBefore(to)`                      | Next rank below `to`, fixed step. Prepend only.       |
| `equidistantRanks(count, prev, next)` | `count` evenly spaced ranks (1-`MAX_BATCH_SIZE`).     |
| `compareRanks(a, b)`                  | Comparator for `Array.prototype.sort`.                |
| `minorLength(rank)`                   | Digits in the minor component. A list-health signal.  |
| `parseRank(value)`                    | Parse into a `Position`, or `null` for an open bound. |
| `isValidRank(value)`                  | True for exactly the values this API accepts.         |
| `generateEntropy()`                   | Random 3-character Base-62 string.                    |
| `Position`                            | Immutable `{ bucket, major, minor }` value object.    |
| `MAX_minor_LENGTH`                    | Default minor ceiling (128).                          |

Every bound accepts `string | null | undefined`; `null`, `undefined` and `""` all mean "no bound on this side".

### Errors

All errors extend `LexorankError`.

| Error                     | Thrown when                                                             |
| ------------------------- | ----------------------------------------------------------------------- |
| `InvalidRankError`        | A rank string is malformed or non-canonical. Carries `.value`.          |
| `RankOrderError`          | `prev` sorts after `next`. Carries `.prev` / `.next`.                   |
| `BatchSizeError`          | `count` is not an integer in 1..`MAX_BATCH_SIZE`. Carries `.requested`. |
| `DuplicateRankError`      | Both bounds are the same rank. Carries `.rank`.                         |
| `RankSpaceExhaustedError` | Nothing can exist in the requested position; rebalance.                 |
| `RankInvariantError`      | Internal safety net. Should never fire - please report it.              |

## Known limitation: repeated same-position insertion

Ranks between two neighbours are found by subdividing the gap. Subdivision is not free forever, so this is the one pattern that degrades.

**It does not appear in ordinary use.** `rankAfter` leaves a structural gap of 1,000,000 units, which absorbs about fifteen subdivisions before a minor digit appears at all, and that headroom regenerates as items move around. Measured over 20,000 operations on a 40-card column:

| Usage pattern                              | Deepest minor       |
| ------------------------------------------ | ------------------- |
| Uniform random position                    | 5 digits            |
| 50% of moves to the top                    | 0 digits            |
| Appending to the end                       | 0 digits            |
| **Always between the same two neighbours** | grows without bound |

Only the last pattern grows. Past the structural runway the minor gains roughly one digit per five insertions, so the number of consecutive same-position inserts a list tolerates is about **five times `maxminorLength`**:

| `maxminorLength`  | Inserts before it throws | Widest row    |
| ----------------- | ------------------------ | ------------- |
| 32                | ~160                     | 41 bytes      |
| 64                | ~320                     | 73 bytes      |
| **128** (default) | **~640**                 | **137 bytes** |
| 256               | ~1,280                   | 265 bytes     |

Exceeding the limit raises `RankSpaceExhaustedError`. Tune it per call when your storage or rebalance cadence calls for something different:

```ts
rankBetween(before, after, { maxminorLength: 64 });
```

### Detecting it before it throws

Treat the limit as a tripwire, not a budget. `minorLength` lets you spot a degrading list while it is still cheap to fix:

```ts
const deepest = Math.max(...column.map((task) => minorLength(task.rank)));

if (deepest > 24) {
  await rebalanceColumn(columnId); // background, before any user hits the wall
}
```

Ordinary ranks are 9-13 bytes with a minor of zero, so any column whose deepest rank runs to a couple of dozen digits is worth rebalancing whatever limit you have set. Rebalancing resets every minor to zero and restores the full structural gap.

## Rank format

```
<bucket>|<major>[:<minor>]
    0    |  UUUUUU  :  U
```

- **bucket** (0-2) - extra headroom; `rankAfter` / `rankBefore` roll into the neighbouring bucket when the integer space runs out
- **major** - fixed 6-character Base-62 integer; sequential steps of 1,000,000 leave insertion runway
- **minor** - unbounded Base-62 minor, used once the integer space between two neighbours is exhausted

Because every component is fixed-width or suffix-only, ranks sort correctly as plain strings - no custom collation in your database.

### Canonical form

A minor must not end in `0`. `:U` and `:U0` denote the same value but are different strings, and **no rank sorts strictly between them** - the gap is provably empty, since any rank above `:U` must extend it and every extension also sorts above `:U0`. Permitting both forms would create neighbours that can never be separated, so non-canonical values are rejected on parse. Ranks produced by this library are always canonical; the rule only affects hand-written or externally generated data.

### Duplicate bounds

If two rows share a rank there is no order between them, so nothing can sit between them either. Both `rankBetween` and `equidistantRanks` reject this with `DuplicateRankError` rather than returning a value that would sort _after_ both bounds - a silent misplacement in the UI, with the underlying data problem left in place.

Duplicate ranks are a data-integrity issue, not a transient condition. Catch the error, rebalance the affected list, and retry:

```ts
try {
  task.rank = rankBetween(before, after);
} catch (error) {
  if (error instanceof DuplicateRankError) {
    await rebalanceColumn(columnId); // then retry with fresh neighbours
  } else {
    throw error;
  }
}
```

This keeps one unconditional guarantee: every rank this library returns sorts strictly after `prev`, strictly before `next`, and strictly after the rank before it. There are no exemptions, and the result is re-checked against its bounds on every call.

## Verification

Validated by running this implementation and a reference Go version over **5,205 generated cases** and **1,093 stateful simulation steps** (repeated midpoint insertion, 400-step append/prepend chains crossing bucket rollovers, and a randomised board simulation). 302 vectors are frozen in `test/fixtures/golden.json`.

A property search over **280,000 random bound pairs** asserts `prev < result < next` on every call, and every result is re-checked against its bounds at runtime.

## Development

```sh
pnpm install
pnpm run check   # typecheck + lint + test
pnpm run build   # dual ESM/CJS + .d.ts
```

## License

[MIT](LICENSE)
