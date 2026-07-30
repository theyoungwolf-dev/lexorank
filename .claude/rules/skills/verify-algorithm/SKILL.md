---
name: verify-algorithm
description: Verify a change to the ranking algorithm is correct. Use after editing anything in src/internal/, src/lexorank.ts or src/validator.ts, or when the user says "verify the algorithm", "check the invariant" or "run the property tests".
---

# Verifying an algorithm change

Ordering bugs in this library are silent. A wrong rank still parses, still sorts, and still looks plausible - it just puts a card in the wrong place. The unit suite alone has already missed one real bug, so use these layers in order.

## 1. The suite

```sh
pnpm run check
```

Typecheck, lint and 358 tests including the golden vectors. If a golden test fails, stop and read `.claude/rules/testing.md` - do not touch the fixture.

## 2. The property check

Unit tests assert examples; this searches for counterexamples.

```sh
pnpm run build
node .claude/skills/verify-algorithm/scripts/property-check.mjs
```

It exercises five properties: the ordering invariant over random pairs, canonical output, monotonic append/prepend chains, batch ordering, and a mixed drag-and-drop simulation. Everything must pass.

To reproduce a specific failure, pass the seed:

```sh
SEED=12345 node .claude/skills/verify-algorithm/scripts/property-check.mjs 500000
```

Run this whenever you change how ranks are computed, compared, parsed or validated. Skipping it is how the trailing-zero bug survived - it passed every hand-written test and only appeared after ~200,000 random pairs.

## Reporting

State which layers ran and what they showed. If a property fails, give the seed and a failing pair. Never describe a change as verified when only step 1 ran.
