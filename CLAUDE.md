# @theyoungwolf/lexorank

A zero-dependency TypeScript implementation of the LexoRank ordered-ranking algorithm.

## Commands

- `pnpm run check` - typecheck + lint + test. **Run this before considering any task done.**
- `pnpm run test` / `pnpm run test:watch` - vitest
- `pnpm run build` - tsup, dual ESM/CJS + `.d.ts`
- `pnpm exec biome check --write .` - autofix formatting and lint

Use **pnpm**, never npm or yarn. Use **Biome**, never ESLint or Prettier - the repo has no ESLint config and adding one is wrong.

## Do not change these without being asked

These look like cleanup opportunities. They are not. Each encodes a decision that cost real debugging.

**TypeScript is pinned to `^5.9.3` on purpose.** TypeScript 7 is `latest` on npm and `tsc` works fine under it, but tsup generates `.d.ts` through `rollup-plugin-dts`, which calls the JS compiler API that the native TS 7 rewrite does not expose. Upgrading breaks `pnpm run build` with `Cannot read properties of undefined (reading 'useCaseSensitiveFileNames')`. TS 6 builds only with an `ignoreDeprecations` escape hatch. Leave it on 5.9.

**`rankBetween` must not delegate to `rankAfter` when both bounds are closed.** They look redundant - both produce a rank after their first argument - but `rankAfter(x)` is a pure function of `x` alone and ignores whatever already follows it. Call it twice against the same anchor and it returns the same rank, colliding with the row you were inserting before. Between two real neighbours, halving the gap is the price of correctness, not a bug to optimise away.

**Open bounds are the exception, and already delegate.** `rankBetween(null, x)` is `rankBefore(x)` and `rankBetween(x, null)` is `rankAfter(x)`: a `null` bound means nothing exists on that side, so there is no neighbour to collide with. `rankAfter` and `rankBefore` therefore call the internal `subdivide` helper in their fallback paths, never `rankBetween` - routing them back through it would recurse infinitely.

**The ordering invariant has no exemptions.** `assertWithinBounds` in `src/lexorank.ts` checks every returned rank against its bounds on every call. Do not add special cases to it. An earlier version carried a `degenerate` flag to exempt identical bounds; removing that carve-out is what let the guard catch a real bug in the implementation earlier.

**Trailing zeros are non-canonical and rejected on parse.** `:U` and `:U0` denote the same minor but are different strings, and _no_ valid rank sorts between them - the gap is provably empty. Permitting both creates neighbours that can never be separated. Do not relax `LEXORANK_REGEX` to accept them.

**`MAX_MINOR_LENGTH` is a tripwire, not a capacity limit.** Ordinary usage never produces a minor deeper than a handful of digits, because `rankAfter`'s structural gap absorbs subdivision. A deep minor means the same two neighbours are being subdivided repeatedly. Raising the default to make an error go away is the wrong fix - the list needs rebalancing. It is configurable per call via `maxMinorLength`.

**`MAX_BATCH_SIZE` is 60, derived not arbitrary.** A batch needs one whole character per item and the widest gap spans 61 steps, so 61 items never fit at any depth.

**`rebalance(count)` takes a count, not the old ranks.** A rebalance discards the previous values entirely; only position in the sorted order carries over. It deliberately reuses `firstRank` + `rankAfter` spacing so a rebalanced list is identical to a freshly built one. Do not "improve" it by spreading items across the whole space - that was measured and it cuts the runway past each end from ~27,900 appends to ~56.

## Layout

`src/` is the public API; `src/internal/` is private. Only `src/index.ts` decides what ships - never add an `src/internal/` export to it without being asked.

`Position` is frozen and immutable. The algorithm works on plain mutable `Bound` objects internally and constructs `Position` instances only at the boundary.

## Testing

`test/fixtures/golden.json` holds vectors captured from the implementation. **Never regenerate or edit it to make a failing test pass.** If a golden test starts failing, the change under review altered behaviour - that is the fixture doing its job. Investigate the behaviour, not the fixture.

The same applies generally: do not weaken an assertion, loosen a bound, or delete a case to get green. Say the test fails and why.

When touching anything in `src/internal/`, run the property check (see the `verify-algorithm` skill) as well as the suite. Unit tests alone will not catch an ordering violation - the trailing-zero bug passed every hand-written test and only showed up under randomised search.

## Git and releases

Trunk-based: short branches off `main`, squash-merge, no long-lived `develop`.

Versioning is [Changesets](https://github.com/changesets/changesets). Commit messages do **not** drive version bumps - `pnpm changeset` writes a file in `.changeset/` and that is the source of truth. Add a changeset only for user-facing changes; scaffolding, CI, docs and refactors get none.

Do not run `npm publish` or `pnpm publish` locally. Releases go out from CI with provenance.

## Style

Prose in comments and docs uses full sentences and explains _why_, not _what_. The algorithm is subtle and the comments are load-bearing - when changing logic, update the comment that explains it or say that you could not.
