---
paths:
  - "test/**/*.ts"
---

# Testing conventions

## Golden vectors are evidence, not scaffolding

`test/fixtures/golden.json` was captured by running the implementation over a generated corpus. Each entry is `{ op, args, out }`, where `out: null` means the rejection of the input.

**Never regenerate the fixture to make a test pass.** A failing golden test means behaviour changed. Either the change is a regression, or it is an intentional divergence that needs discussing — both require a human decision, not a fixture rewrite.

## What a new test should look like

Prefer asserting the _contract_ over asserting a literal string. `expect(low < mid && mid < high).toBe(true)` survives a legitimate change in spacing strategy; `expect(mid).toBe("0|UUUUUU:")` does not, unless the exact value is the point.

Randomised property tests belong here. The trailing-zero bug passed every hand-written case and only surfaced under a search over ~200,000 random pairs. When adding logic that could affect ordering, add a property test, not just an example.

Use a seeded PRNG so failures reproduce. There is one in `test/lexorank.test.ts` to copy.

## Do not

- Weaken an assertion, widen a bound, or skip a case to get green.
- Add `expect(...).toThrow()` without naming the specific error class.
- Test `src/internal/` modules through direct imports; go through the public API so the tests keep working when internals are refactored.
