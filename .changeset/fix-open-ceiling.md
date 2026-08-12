---
"@theyoungwolf/lexorank": patch
---

Fix `rankBetween` producing a rank outside its bounds when the two majors are
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
