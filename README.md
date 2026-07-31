<div align="center">
  <h1>@theyoungwolf/lexorank</h1>
  <p><b>Ordered string ranks for drag-and-drop lists</b></p>
  <p>
    Insert, move and reorder items using stable keys that sort correctly on their own -
    without renumbering their neighbours.
  </p>
</div>

<div align="center">

[![npm version](https://img.shields.io/npm/v/@theyoungwolf/lexorank.svg?style=flat-square)](https://www.npmjs.com/package/@theyoungwolf/lexorank)
[![Build status](https://img.shields.io/github/actions/workflow/status/theyoungwolf-dev/lexorank/ci.yml?branch=main&label=CI&logo=github&style=flat-square)](https://github.com/theyoungwolf-dev/lexorank/actions/workflows/ci.yml)
[![install size](https://img.shields.io/badge/dynamic/json?url=https://packagephobia.com/v2/api.json?p=@theyoungwolf/lexorank&query=$.install.pretty&label=install%20size&style=flat-square)](https://packagephobia.com/result?p=@theyoungwolf/lexorank)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@theyoungwolf/lexorank?style=flat-square)](https://bundlephobia.com/package/@theyoungwolf/lexorank)
[![npm downloads](https://img.shields.io/npm/dm/@theyoungwolf/lexorank.svg?style=flat-square)](https://npm-stat.com/charts.html?package=@theyoungwolf/lexorank)
[![dependencies](https://img.shields.io/badge/dependencies-0-brightgreen?style=flat-square)](https://www.npmjs.com/package/@theyoungwolf/lexorank)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

</div>

## Table of contents

- [Features](#features)
- [Installing](#installing)
  - [Package manager](#package-manager)
  - [Importing](#importing)
- [Example](#example)
- [The two modes](#the-two-modes)
  - [Open bounds](#open-bounds)
- [API](#api)
  - [firstRank()](#firstrank)
  - [rankBetween(prev, next\[, options\])](#rankbetweenprev-next-options)
  - [rankAfter(to\[, options\])](#rankafterto-options)
  - [rankBefore(to\[, options\])](#rankbeforeto-options)
  - [ranksBetween(count, prev, next\[, options\])](#ranksbetweencount-prev-next-options)
  - [rebalance(count)](#rebalancecount)
  - [compareRanks(a, b)](#compareranksa-b)
  - [parseRank(value)](#parserankvalue)
  - [isValidRank(value)](#isvalidrankvalue)
  - [minorLength(rank)](#minorlengthrank)
  - [hasTrailingZero(value)](#hastrailingzerovalue)
  - [generateEntropy(\[length\])](#generateentropylength)
  - [Constants](#constants)
- [Rank options](#rank-options)
- [Error types](#error-types)
- [Rank format](#rank-format)
  - [Canonical form](#canonical-form)
  - [Duplicate bounds](#duplicate-bounds)
- [Known limitation: repeated same-position insertion](#known-limitation-repeated-same-position-insertion)
  - [Rebalancing](#rebalancing)
  - [Detecting it before it throws](#detecting-it-before-it-throws)
- [TypeScript](#typescript)
- [Semver](#semver)
- [Verification](#verification)
- [Contributing](#contributing)
- [License](#license)

## Features

- Reorder items by writing **one row**, never renumbering the rest of the list.
- Ranks sort correctly as **plain strings** - no custom collation in your database.
- **Zero dependencies.** Ships ESM and CommonJS with type declarations for each.
- **One unconditional guarantee** - `prev < result < next`, re-checked at runtime on every call.
- **Effectively infinite precision** - a fixed-width integer component backed by a Base-62 minor.
- **Typed errors** for every failure mode, so a caller can tell a bad argument from a list that needs rebalancing.
- **Batch insertion** and a **`rebalance`** helper for seeding or repairing a list.

## Installing

### Package manager

Using npm:

```bash
$ npm install @theyoungwolf/lexorank
```

Using pnpm:

```bash
$ pnpm add @theyoungwolf/lexorank
```

Using yarn:

```bash
$ yarn add @theyoungwolf/lexorank
```

Using bun:

```bash
$ bun add @theyoungwolf/lexorank
```

### Importing

The package ships both ESM and CommonJS builds. Everything is a named export; there is no default export.

```js
import { firstRank, rankAfter, rankBetween } from "@theyoungwolf/lexorank";
```

```js
const { firstRank, rankAfter, rankBetween } = require("@theyoungwolf/lexorank");
```

Types are bundled - no `@types/*` package is needed.

## Example

Give every row a rank, then reorder by writing a single field.

```ts
import { firstRank, rankAfter, rankBetween, compareRanks } from "@theyoungwolf/lexorank";

// Seed a new list
let rank = firstRank(); // "0|UUUUUU:"
const tasks = ["Design", "Build", "Ship"].map((title) => {
  const task = { title, rank }; // Gives firstRank to "Design" and then iterates
  rank = rankAfter(rank); // Gives step-up next ranks to "Build" and "Ship"
  return task;
});

// Move an item between two others - only this row is written
const moved = { title: "Review", rank: rankBetween(tasks[0].rank, tasks[1].rank) };

// Sorting a mixed bag by 'rank' yields the intended insert order
[...tasks, moved].sort((a, b) => compareRanks(a.rank, b.rank));
// Design, Review, Build, Ship
```

A drop handler is the same idea, with `null` standing in for "nothing on that side":

```ts
function onDrop(column: Task[], targetIndex: number): string {
  const before = column[targetIndex - 1]?.rank ?? null;
  const after = column[targetIndex]?.rank ?? null;
  return rankBetween(before, after);
}
```

Persisting it touches exactly one row:

```ts
await db.task.update({ where: { id: task.id }, data: { rank: onDrop(column, 3) } });
```

## The two modes

This is the most important thing to get right, and the two operations are not interchangeable.

**Building a FRESH list - Use `firstRank()` then `rankAfter()`**

```ts
let rank = firstRank();
for (const task of tasks) {
  task.rank = rank; // Gives firstRank to first item and then iterates
  rank = rankAfter(rank); // fixed step, ~86,000 appends of runway
}
```

**Placing an item relative to its neighbours - `rankBetween()`**

```ts
const rank = rankBetween(before, after);
```

`rankAfter(x)` is a pure function of `x` alone - it does not look at what already follows. That makes it perfect for appending, and **wrong** for insertions: because if you drop two tasks after the same task and use `rankAfter` would result in the same rank twice, colliding with the row you meant to sit before. `rankBetween` re-reads both neighbours, so the second drop sees the first drop's rank as its new bound and lands somewhere fresh.

The trade-off is space. Between two closed bounds `rankBetween` halves the remaining gap; `rankAfter` steps by a fixed amount. That is why both exist.

### Open bounds

A bound of `null` says nothing exists on that side, so there is no neighbour to collide with and the fixed step is both safe and far cheaper. `rankBetween` delegates accordingly:

| Call                      | Equivalent to       |
| ------------------------- | ------------------- |
| `rankBetween(null, x)`    | `rankBefore(x)`     |
| `rankBetween(x, null)`    | `rankAfter(x)`      |
| `rankBetween(null, null)` | `firstRank()`       |
| `rankBetween(a, b)`       | midpoint, unchanged |

This matters more than it looks. Repeatedly moving items to the top of a column with `rankBetween(null, first)` would otherwise halve the space below each time and exhaust it after about **669** operations - a reachable number. Delegating turns that into roughly **28,590**. `ranksBetween` (_plural_) follows the same rule, so `ranksBetween(1, a, b)` always equals `rankBetween(a, b)`.

## API

Every bound accepts `string | null | undefined`; `null`, `undefined` and `""` all mean "no bound on this side".

| Export                                       | Description                                                  |
| -------------------------------------------- | ------------------------------------------------------------ |
| `firstRank()`                                | The initial rank for an empty list.                          |
| `rankBetween(prev, next[, options])`         | A rank sorting strictly between two bounds.                  |
| `rankAfter(to[, options])`                   | Next rank above `to`, fixed step. Append only.               |
| `rankBefore(to[, options])`                  | Next rank below `to`, fixed step. Prepend only.              |
| `ranksBetween(count, prev, next[, options])` | `count` ranks between two bounds (1 to `MAX_BATCH_SIZE`).    |
| `rebalance(count)`                           | `count` fresh, evenly spaced ranks. Repairs or seeds a list. |
| `compareRanks(a, b)`                         | Comparator for `Array.prototype.sort`.                       |
| `parseRank(value)`                           | Parse into a `Position`, or `null` for an open bound.        |
| `isValidRank(value)`                         | True for exactly the values this API accepts.                |
| `minorLength(rank)`                          | Digits in the minor component. A list-health signal.         |
| `hasTrailingZero(value)`                     | True if the minor is non-canonical because it ends in `0`.   |
| `generateEntropy([length])`                  | Uniformly random Base-62 string, safe to append to a rank.   |
| `Position`                                   | Immutable `{ bucket, major, minor }` value object.           |

### firstRank()

Returns the first rank for an empty list, centred in the available space.

```ts
firstRank(); // "0|UUUUUU:"
```

### rankBetween(prev, next[, options])

Returns a rank that sorts strictly between `prev` and `next`. This is the insert primitive - use it whenever an item is placed relative to its neighbours.

```ts
rankBetween("0|000000:", "0|zzzzzz:"); // "0|UUUUUU:"
rankBetween(null, first); // before everything
rankBetween(last, null); // after everything
```

Throws `RankOrderError` if `prev` sorts after `next`, `DuplicateRankError` if both bounds are the same rank, and `InvalidRankError` if either bound is malformed or _non-canonical_\*.

\*Read about [Canonical Form](#canonical-form) to avoid gotchas in migrations to this system of ranking

### rankAfter(to[, options])

Returns the next rank above `to`, stepping by a fixed structural gap. This is the append primitive: `firstRank()` then `rankAfter()` repeatedly is the intended way to build a fresh list.

```ts
rankAfter("0|UUUUUU:"); // "0|UUYgdW:"
rankAfter(null); // same as firstRank()
```

Safe **only** when nothing already follows `to`. Calling it twice against the same anchor returns the same rank - use `rankBetween` to place an item before an existing one.

### rankBefore(to[, options])

Returns the next rank below `to`, stepping by a fixed structural gap. The mirror of `rankAfter`, with the same caveat.

```ts
rankBefore("0|UUUUUU:"); // "0|UUQILS:"
```

Throws `RankSpaceExhaustedError` if `to` is the absolute floor (`0|000000:`) - nothing sorts below it, so the list must be rebalanced.

### ranksBetween(count, prev, next[, options])

Returns `count` ranks in ascending order, every one strictly between the bounds. The plural of `rankBetween`, applying the same bound rules.

```ts
ranksBetween(3, "0|000000:", "0|zzzzzz:");
// ["0|FUUUUU:", "0|UUUUUU:", "0|jUUUUU:"]
```

> Results are spread across the gap but **not** exactly evenly. The interval is divided at one character position and the remainder falls into the last gap. Every gap is billions of units wide either way, so this has no practical effect - Even-spreading is simply not a promise the function makes.

Throws `BatchSizeError` if `count` is not an integer in `1..MAX_BATCH_SIZE`.

### rebalance(count)

Returns `count` fresh, evenly spaced ranks with no minor depth. See [Rebalancing](#rebalancing).

```ts
rebalance(3);
// ["0|UUUUUU:", "0|UUYgdW:", "0|UUcsmY:"]
```

### compareRanks(a, b)

Comparator returning `-1`, `0` or `1`. Ranks already sort correctly as plain strings, so this is a readability convenience rather than a different ordering.

```ts
tasks.sort((a, b) => compareRanks(a.rank, b.rank));
```

### parseRank(value)

Parses a rank into an immutable `Position`, or returns `null` for an open bound. Throws `InvalidRankError` for anything malformed or non-canonical.

```ts
const position = parseRank("1|ABCDEF:xy");
position.bucket; // 1
position.major; // "ABCDEF"
position.minor; // ":xy"   <- note the leading colon
position.toString(); // "1|ABCDEF:xy"
```

### isValidRank(value)

Returns `true` for exactly the values the rest of this API accepts - shape **and** canonical form.

```ts
isValidRank("0|ABCDEF:U"); // true
isValidRank("0|ABCDEF:U0"); // false - trailing zero
```

### minorLength(rank)

Returns the number of Base-62 digits in the minor component, excluding the `:`. Zero means the rank lives purely in the integer space, which is where ordinary ranks sit. Use it to monitor list health.

```ts
minorLength("0|ABCDEF:"); // 0
minorLength("0|ABCDEF:UUU"); // 3
```

### hasTrailingZero(value)

Returns `true` if a minor is non-canonical because it ends in `0`. Useful for auditing existing data before adopting this library.

```ts
column.filter((task) => hasTrailingZero(task.rank)); // rows needing migration
```

### generateEntropy([length])

Returns a uniformly distributed random Base-62 string, `3` characters by default. The final character is never `0`, so the result stays canonical when appended to a minor.

```ts
generateEntropy(); // "k7Q"
generateEntropy(8); // "CiXr6ZgS"
```

Useful for separating ranks computed concurrently by different clients, which would otherwise be identical - the algorithm is deterministic, so two clients inserting between the same neighbours derive the same value. Appending widens the rank rather than preserving it, so check the upper bound afterwards; it is not a substitute for a uniqueness constraint on the column, which you should manage on your own data, i.e., in a Kanban Lane, all tasks should have a unique rank.

### Constants

| Constant           | Value | Meaning                                                 |
| ------------------ | ----- | ------------------------------------------------------- |
| `MAX_BATCH_SIZE`   | `60`  | Largest batch `ranksBetween` can place in one call.     |
| `MAX_MINOR_LENGTH` | `128` | Default minor ceiling before `RankSpaceExhaustedError`. |
| `MAX_BUCKET`       | `2`   | Highest valid bucket.                                   |
| `LEXORANK_REGEX`   | -     | The canonical shape `<bucket>\|<major>[:<minor>]`.      |

## Rank options

`rankBetween`, `rankAfter`, `rankBefore` and `ranksBetween` all accept an optional trailing options object.

```ts
rankBetween(before, after, { maxMinorLength: 64 });
```

| Option           | Type     | Default            | Description                                                      |
| ---------------- | -------- | ------------------ | ---------------------------------------------------------------- |
| `maxMinorLength` | `number` | `MAX_MINOR_LENGTH` | Minor digits allowed before `RankSpaceExhaustedError` is thrown. |

Lower values surface a runaway list sooner and bound the width of your rank column; higher values tolerate more consecutive same-position inserts between rebalances. Ordinary use stays well under either, so treat this as a tripwire rather than a capacity setting.

## Error types

Every error extends `LexorankError`, so a single `catch` can cover them all. Each names a distinct cause, because callers respond to them differently.

| Error                     | Thrown when                                                 | Extra properties |
| ------------------------- | ----------------------------------------------------------- | ---------------- |
| `InvalidRankError`        | A rank string is malformed or non-canonical.                | `.value`         |
| `RankOrderError`          | `prev` sorts after `next` - arguments are probably swapped. | `.prev`, `.next` |
| `DuplicateRankError`      | Both bounds are the same rank; the list needs rebalancing.  | `.rank`          |
| `BatchSizeError`          | `count` is not an integer in `1..MAX_BATCH_SIZE`.           | `.requested`     |
| `RankSpaceExhaustedError` | Nothing can exist in the requested position; rebalance.     | -                |
| `RankInvariantError`      | Internal safety net. Should never fire - please report it.  | `.produced`      |

```ts
import { DuplicateRankError, RankSpaceExhaustedError } from "@theyoungwolf/lexorank";

try {
  task.rank = rankBetween(before, after);
} catch (error) {
  if (error instanceof DuplicateRankError || error instanceof RankSpaceExhaustedError) {
    await rebalanceColumn(columnId); // then retry with fresh neighbours
  } else {
    throw error;
  }
}
```

## Rank format

```
<bucket>|<major>[:<minor>]
    0    |  UUUUUU  :  U
```

- **bucket** (0-2) - extra headroom; `rankAfter` / `rankBefore` roll into the neighbouring bucket when the integer space runs out
- **major** - fixed 6-character Base-62 integer; sequential steps of 1,000,000 leave insertion runway
- **minor** - Base-62 fraction, used once the integer space between two neighbours is exhausted, bounded by `MAX_MINOR_LENGTH`

Because every component is fixed-width or suffix-only, ranks sort correctly as plain strings - no custom collation in your database. Ordinary ranks are 9-13 bytes.

### Canonical form

A minor must not end in `0`. `:U` and `:U0` denote the same value but are different strings, and **no rank sorts strictly between them** - the gap is provably empty, since any rank above `:U` must extend it and every extension also sorts above `:U0`. Permitting both forms would create neighbours that can never be separated, so non-canonical values are rejected on parse. Ranks produced by this library are always canonical; the rule only affects hand-written or externally generated data. Use [`hasTrailingZero`](#hastrailingzerovalue) to audit an existing column.

### Duplicate bounds

If two rows share a rank there is no order between them, so nothing can sit between them either. Both `rankBetween` and `ranksBetween` reject this with `DuplicateRankError` rather than returning a value that would sort _after_ both bounds - a silent misplacement in the UI, with the underlying data problem left in place.

Duplicate ranks are a data-integrity issue, not a transient condition: catch the error, rebalance, retry.

This keeps one unconditional guarantee: every rank this library returns sorts strictly after `prev`, strictly before `next`, and strictly after the rank before it. There are no exemptions, and the result is re-checked against its bounds on every call.

## Known limitation: repeated same-position insertion

Ranks between two neighbours are found by subdividing the gap. Subdivision is not free forever, so this is the one pattern that degrades.

**It does not appear in ordinary use.** `rankAfter` leaves a structural gap of 1,000,000 units, which absorbs about fifteen subdivisions before a minor digit appears at all, and that headroom regenerates as items move around. Measured over 20,000 operations on a 40-card column:

| Usage pattern                              | Deepest minor       |
| ------------------------------------------ | ------------------- |
| Uniform random position                    | 5 digits            |
| 50% of moves to the top                    | 0 digits            |
| Appending to the end                       | 0 digits            |
| **Always between the same two neighbours** | grows without bound |

Only the last pattern grows. Past the structural runway the minor gains roughly one digit per five insertions, so the number of consecutive same-position inserts a list tolerates is about **five times `maxMinorLength`**:

| `maxMinorLength`  | Inserts before it throws | Widest row    |
| ----------------- | ------------------------ | ------------- |
| 32                | ~160                     | 41 bytes      |
| 64                | ~320                     | 73 bytes      |
| **128** (default) | **~640**                 | **137 bytes** |
| 256               | ~1,280                   | 265 bytes     |

Exceeding the limit raises `RankSpaceExhaustedError`.

### Rebalancing

`rebalance(count)` returns fresh, evenly spaced ranks with no minor depth. It is the remedy every `RankSpaceExhaustedError` and `DuplicateRankError` points at, and equally the way to seed a new list - assigning well-spaced ranks to N items is one operation either way.

It reads nothing from the existing ranks, because a rebalance discards them: position in the sorted order is all that carries over. Fetch in rank order, ask for as many ranks as you have rows, and zip:

```ts
const tasks = await db.task.findMany({ where: { columnId }, orderBy: { rank: "asc" } });
const fresh = rebalance(tasks.length);

await db.$transaction(tasks.map((task, i) => db.task.update({ where: { id: task.id }, data: { rank: fresh[i] } })));
```

Spacing matches a list built with `firstRank()` and `rankAfter()`, so a rebalanced list is indistinguishable from a freshly built one. Spreading items across the entire space instead would buy under 2x more room between neighbours while cutting the runway past each end from roughly 27,900 appends to about 56 - a bad trade, since appending is the more common operation.

The ceiling is in the tens of thousands of items; beyond that `rebalance` throws rather than quietly emitting minors, because a single ordered list that large has outgrown a flat rank space.

### Detecting it before it throws

Treat the limit as a tripwire, not a budget. `minorLength` lets you spot a degrading list while it is still cheap to fix:

```ts
const deepest = Math.max(...column.map((task) => minorLength(task.rank)));

if (deepest > 24) {
  await rebalanceColumn(columnId); // background, before any user hits the wall
}
```

Ordinary ranks have a minor of zero, so any column whose deepest rank runs to a couple of dozen digits is worth rebalancing whatever limit you have set. Rebalancing resets every minor to zero and restores the full structural gap.

## TypeScript

Type declarations ship with the package for both ESM and CommonJS; no `@types/*` package is needed.

```ts
import { type RankInput, type RankOptions, Position, rankBetween } from "@theyoungwolf/lexorank";
```

`RankInput` is the type of every bound:

```ts
type RankInput = string | null | undefined;
```

`RankOptions` is the trailing options object described in [Rank options](#rank-options).

`Position` is a frozen value object. Note that `minor` includes its leading `:`, and `toJSON` means it serialises to its rank string rather than an object:

```ts
class Position {
  readonly bucket: number;
  readonly major: string;
  readonly minor: string; // includes the leading ":"
  toString(): string;
  toJSON(): string;
}

JSON.stringify({ rank: parseRank("1|ABCDEF:") }); // {"rank":"1|ABCDEF:"}
```

Errors are classes, so `instanceof` narrows them:

```ts
import { LexorankError, DuplicateRankError } from "@theyoungwolf/lexorank";

try {
  rankBetween(a, b);
} catch (error) {
  if (error instanceof DuplicateRankError) {
    console.log(error.rank); // string
  } else if (error instanceof LexorankError) {
    // any other failure from this library
  }
}
```

## Semver

This package follows [semver](https://semver.org/). While the major version is `0`, minor releases may contain breaking changes; pin accordingly.

## Verification

Validated by running this implementation with over **5,205 generated cases** and **1,093 stateful simulation steps** - repeated midpoint insertion, 400-step append/prepend chains crossing bucket rollovers, and a randomised board simulation. 302 vectors are frozen in `test/fixtures/golden.json`.

A property search over **280,000 random bound pairs** asserts `prev < result < next` on every call, and every result is re-checked against its bounds at runtime.

## Contributing

Issues and pull requests are welcome.

```sh
pnpm install
pnpm run check   # typecheck + lint + test
pnpm run build   # dual ESM/CJS + .d.ts
pnpm run test:watch
```

Changes that affect published behaviour need a changeset:

```sh
pnpm changeset
```

## License

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
