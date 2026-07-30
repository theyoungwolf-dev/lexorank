# @theyoungwolf/lexorank

A feature-rich TypeScript implementation of the LexoRank ordered-ranking algorithm: the technique behind drag-and-drop list ordering in tools like Jira. Insert, move, and reorder items with stable string keys and (near) infinite precision, without renumbering neighbours.

> **Status:** early scaffold. The public API below is being ported from a reference Go implementation.

## Install

```sh
pnpm add @theyoungwolf/lexorank
```

## Usage

```ts
import { isValidRank } from "@theyoungwolf/lexorank";

isValidRank("0|000000:"); // true
```

<!-- Planned API, once ported:

import { firstRank, rank, equidistantRanks, prepend, append } from "@theyoungwolf/lexorank";

const a = firstRank();
const b = append(a);
const between = rank(a, b);
const many = equidistantRanks(5, a, b);
-->

## Why another LexoRank?

The unscoped `lexorank` package and its forks reconstruct the surface of Atlassian's algorithm. This implementation additionally models:

- **Buckets** for rebalancing headroom
- A **major/minor** split (fixed 6-char integer space + unbounded Base-62 fraction) for effectively infinite insertion precision
- **Batch insertion** (`equidistantRanks`) for placing N items at once
- **Collision recovery** that degrades gracefully instead of erroring

## Development

```sh
pnpm install
pnpm run check      # typecheck + lint + test
pnpm run build      # dual ESM/CJS + .d.ts into dist/
pnpm run test:watch
```

Releases are managed with [Changesets](https://github.com/changesets/changesets):

```sh
pnpm run changeset  # describe your change; CI publishes on merge to main
```

## License

[MIT](LICENSE)
