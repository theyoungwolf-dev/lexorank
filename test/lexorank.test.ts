import {
  BatchSizeError,
  DuplicateRankError,
  InvalidRankError,
  LexorankError,
  MAX_BATCH_SIZE,
  MAX_MINOR_LENGTH,
  Position,
  RankOrderError,
  RankSpaceExhaustedError,
  compareRanks,
  equidistantRanks,
  firstRank,
  generateEntropy,
  isValidRank,
  minorLength,
  parseRank,
  rankAfter,
  rankBefore,
  rankBetween,
} from "../src/index.js";
import { describe, expect, it } from "vitest";

describe("firstRank", () => {
  it("lands in the centre of the major space", () => {
    expect(firstRank()).toBe("0|UUUUUU:");
  });

  it("produces a valid rank", () => {
    expect(isValidRank(firstRank())).toBe(true);
  });
});

describe("rankBetween", () => {
  it("places a value strictly between two bounds", () => {
    const mid = rankBetween("0|000000:", "0|zzzzzz:");
    expect("0|000000:" < mid).toBe(true);
    expect(mid < "0|zzzzzz:").toBe(true);
  });

  it("treats null, undefined and empty string as open bounds", () => {
    expect(rankBetween(null, null)).toBe(firstRank());
    expect(rankBetween(undefined, undefined)).toBe(firstRank());
    expect(rankBetween("", "")).toBe(firstRank());
  });

  it("yields to the minor space when majors are adjacent", () => {
    const mid = rankBetween("0|000000:", "0|000001:");
    expect(parseRank(mid)?.minor.length).toBeGreaterThan(1);
    expect("0|000000:" < mid).toBe(true);
    expect(mid < "0|000001:").toBe(true);
  });

  it("stays ordered over repeated midpoint insertion", () => {
    const low = "0|000000:";
    let high = "0|000001:";
    for (let i = 0; i < 40; i++) {
      const mid = rankBetween(low, high);
      expect(low < mid).toBe(true);
      expect(mid < high).toBe(true);
      high = mid;
    }
  });

  it("rejects bounds in descending order", () => {
    expect(() => rankBetween("0|zzzzzz:", "0|000000:")).toThrow(RankOrderError);
  });

  it("rejects identical bounds", () => {
    // Nothing sorts between two identical ranks, so there is no honest answer.
    expect(() => rankBetween("0|ABCDEF:", "0|ABCDEF:")).toThrow(DuplicateRankError);
  });

  it("reports the duplicated rank on the error", () => {
    try {
      rankBetween("0|ABCDEF:", "0|ABCDEF:");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(DuplicateRankError);
      expect((error as DuplicateRankError).rank).toBe("0|ABCDEF:");
    }
  });

  it("distinguishes duplicate bounds from swapped bounds", () => {
    expect(() => rankBetween("0|ABCDEF:", "0|ABCDEF:")).toThrow(DuplicateRankError);
    expect(() => rankBetween("0|zzzzzz:", "0|000000:")).toThrow(RankOrderError);
  });

  it("rejects malformed input", () => {
    expect(() => rankBetween("nonsense", null)).toThrow(InvalidRankError);
  });

  it("surfaces the offending value on the error", () => {
    try {
      rankBetween("nope", null);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidRankError);
      expect((error as InvalidRankError).value).toBe("nope");
    }
  });
});

describe("equidistantRanks", () => {
  it("returns count ascending ranks", () => {
    const out = equidistantRanks(5, null, null);
    expect(out).toHaveLength(5);
    expect([...out].sort()).toEqual(out);
  });

  it("keeps every value inside the given bounds", () => {
    const out = equidistantRanks(7, "0|100000:", "0|900000:");
    for (const r of out) {
      expect("0|100000:" < r).toBe(true);
      expect(r < "0|900000:").toBe(true);
    }
  });

  it("supports the full documented batch size", () => {
    const out = equidistantRanks(MAX_BATCH_SIZE, null, null);
    expect(out).toHaveLength(MAX_BATCH_SIZE);
    expect([...out].sort()).toEqual(out);
  });

  it("rejects identical bounds, exactly as rankBetween does", () => {
    expect(() => equidistantRanks(1, "0|ABCDEF:", "0|ABCDEF:")).toThrow(DuplicateRankError);
    expect(() => equidistantRanks(5, "0|ABCDEF:", "0|ABCDEF:")).toThrow(DuplicateRankError);
  });

  it.each([0, -1, 1.5, Number.NaN, MAX_BATCH_SIZE + 1, 1000])("rejects an invalid batch size of %s", (count) => {
    expect(() => equidistantRanks(count, null, null)).toThrow(BatchSizeError);
  });

  it("rejects a batch size that would otherwise never terminate", () => {
    // 61 items can never fit between two characters at any depth.
    expect(() => equidistantRanks(61, null, null)).toThrow(BatchSizeError);
  });
});

describe("rankAfter / rankBefore", () => {
  it("move in the expected directions", () => {
    const base = firstRank();
    expect(rankAfter(base) > base).toBe(true);
    expect(rankBefore(base) < base).toBe(true);
  });

  it("fall back to firstRank for an open bound", () => {
    expect(rankAfter(null)).toBe(firstRank());
    expect(rankBefore(null)).toBe(firstRank());
  });

  it("keep append chains strictly increasing", () => {
    let current = firstRank();
    const seen = [current];
    for (let i = 0; i < 60; i++) {
      const next = rankAfter(current);
      expect(next > current).toBe(true);
      current = next;
      seen.push(current);
    }
    expect([...seen].sort()).toEqual(seen);
  });

  it("keep prepend chains strictly decreasing", () => {
    let current = firstRank();
    for (let i = 0; i < 60; i++) {
      const next = rankBefore(current);
      expect(next < current).toBe(true);
      current = next;
    }
  });

  it("refuse to go below the absolute floor", () => {
    expect(() => rankBefore("0|000000:")).toThrow(RankSpaceExhaustedError);
  });
});

describe("parseRank", () => {
  it("returns null for open bounds", () => {
    expect(parseRank("")).toBeNull();
    expect(parseRank(null)).toBeNull();
    expect(parseRank(undefined)).toBeNull();
  });

  it("splits bucket, major and minor", () => {
    const p = parseRank("1|ABCDEF:xy");
    expect(p).toBeInstanceOf(Position);
    expect(p?.bucket).toBe(1);
    expect(p?.major).toBe("ABCDEF");
    expect(p?.minor).toBe(":xy");
  });

  it("round-trips through toString", () => {
    expect(parseRank("2|zzzzzz:U")?.toString()).toBe("2|zzzzzz:U");
  });

  it("serialises to its rank string via JSON", () => {
    expect(JSON.stringify({ r: parseRank("1|ABCDEF:") })).toBe('{"r":"1|ABCDEF:"}');
  });

  it("is immutable", () => {
    const p = parseRank("0|ABCDEF:") as Position;
    expect(Object.isFrozen(p)).toBe(true);
  });

  it.each(["3|000000:", "0|00000:", "0|0000000:", "0|000000", "0|00000-:"])("rejects %s", (value) => {
    expect(() => parseRank(value)).toThrow(InvalidRankError);
  });
});

describe("canonical form (trailing zeros)", () => {
  it("rejects a minor ending in 0", () => {
    // ":U" and ":U0" denote the same minor, and no rank sorts between them,
    // so permitting both would create inseparable neighbours.
    expect(isValidRank("0|ABCDEF:U0")).toBe(false);
    expect(() => parseRank("0|ABCDEF:U0")).toThrow(InvalidRankError);
  });

  it("still allows zeros elsewhere in the minor", () => {
    expect(isValidRank("0|ABCDEF:0U")).toBe(true);
    expect(isValidRank("0|ABCDEF:U0U")).toBe(true);
    expect(isValidRank("0|ABCDEF:")).toBe(true);
  });

  it("never generates a non-canonical rank", () => {
    let low = "0|000000:";
    let high = "0|zzzzzz:";
    for (let i = 0; i < 500; i++) {
      const mid = rankBetween(low, high);
      expect(isValidRank(mid)).toBe(true);
      if (i % 2 === 0) high = mid;
      else low = mid;
      if (low >= high) {
        low = "0|000000:";
        high = "0|zzzzzz:";
      }
    }
  });
});

describe("lower boundary", () => {
  it("refuses to produce a rank below the absolute floor", () => {
    expect(() => rankBetween(null, "0|000000:")).toThrow(RankSpaceExhaustedError);
  });

  it("descends a bucket when one is available below", () => {
    expect(rankBetween(null, "1|000000:") < "1|000000:").toBe(true);
    expect(rankBetween(null, "2|000000:") < "2|000000:").toBe(true);
  });

  it("matches rankBefore at every bucket floor", () => {
    for (const floor of ["1|000000:", "2|000000:"]) {
      expect(rankBetween(null, floor)).toBe(rankBefore(floor));
    }
    expect(() => rankBetween(null, "0|000000:")).toThrow(RankSpaceExhaustedError);
    expect(() => rankBefore("0|000000:")).toThrow(RankSpaceExhaustedError);
  });
});

describe("ordering invariant", () => {
  it("holds across many randomly generated pairs", () => {
    const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const nonZero = alphabet.slice(1);
    let seed = 424242;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const pick = (s: string) => s[Math.floor(rnd() * s.length)] as string;
    const frac = (n: number) =>
      n <= 0 ? "" : Array.from({ length: n - 1 }, () => pick(alphabet)).join("") + pick(nonZero);

    let checked = 0;
    for (let i = 0; i < 4000; i++) {
      const bucket = Math.floor(rnd() * 3);
      const major = Array.from({ length: 6 }, () => pick(alphabet)).join("");
      const a = `${bucket}|${major}:${frac(Math.floor(rnd() * 5))}`;
      const b = `${bucket}|${major}:${frac(Math.floor(rnd() * 5))}`;
      const [low, high] = a < b ? [a, b] : [b, a];
      if (low === high) continue;
      const mid = rankBetween(low, high);
      expect(low < mid && mid < high).toBe(true);
      checked++;
    }
    expect(checked).toBeGreaterThan(3000);
  });

  it("survives many same-position insertions, then fails cleanly", () => {
    const low = "0|000000:";
    let high = "0|000001:";
    let survived = 0;

    expect(() => {
      for (;;) {
        high = rankBetween(low, high);
        expect(low < high).toBe(true);
        survived++;
      }
    }).toThrow(RankSpaceExhaustedError);

    expect(survived).toBeGreaterThan(MAX_MINOR_LENGTH * 4);
    expect(minorLength(high)).toBeLessThanOrEqual(MAX_MINOR_LENGTH);
  });
});

describe("maxMinorLength option", () => {
  it("caps the minor at the requested length", () => {
    const low = "0|000000:";
    let high = "0|000001:";
    let survived = 0;

    expect(() => {
      for (;;) {
        high = rankBetween(low, high, { maxMinorLength: 16 });
        survived++;
      }
    }).toThrow(RankSpaceExhaustedError);

    expect(minorLength(high)).toBeLessThanOrEqual(16);
    expect(survived).toBeLessThan(MAX_MINOR_LENGTH * 4);
  });

  it("applies to equidistantRanks too", () => {
    expect(() => equidistantRanks(2, "0|000000:", "0|000001:", { maxMinorLength: 0 })).toThrow(LexorankError);
  });

  it.each([0, -1, 2.5, Number.NaN])("rejects an invalid limit of %s", (limit) => {
    expect(() => rankBetween(null, null, { maxMinorLength: limit })).toThrow(LexorankError);
  });
});

describe("open bounds delegate to the step primitives", () => {
  it("rankBetween(null, x) is exactly rankBefore(x)", () => {
    for (const x of ["0|UUUUUU:", "1|ABCDEF:", "2|zzzzzz:", "0|000001:"]) {
      expect(rankBetween(null, x)).toBe(rankBefore(x));
    }
  });

  it("rankBetween(x, null) is exactly rankAfter(x)", () => {
    for (const x of ["0|UUUUUU:", "1|ABCDEF:", "0|zzzzzz:", "2|zzzzzz:"]) {
      expect(rankBetween(x, null)).toBe(rankAfter(x));
    }
  });

  it("rankBetween(null, null) is firstRank()", () => {
    expect(rankBetween(null, null)).toBe(firstRank());
  });

  it("keeps equidistantRanks(1, a, b) identical to rankBetween(a, b)", () => {
    const pairs: [string | null, string | null][] = [
      [null, null],
      ["0|UUUUUU:", null],
      [null, "0|UUUUUU:"],
      ["0|000000:", "0|zzzzzz:"],
    ];
    for (const [a, b] of pairs) {
      expect(equidistantRanks(1, a, b)[0]).toBe(rankBetween(a, b));
    }
  });

  it("keeps batches ordered and inside an open bound", () => {
    for (const [a, b] of [
      [null, null],
      ["0|UUUUUU:", null],
      [null, "0|UUUUUU:"],
    ] as [string | null, string | null][]) {
      const out = equidistantRanks(5, a, b);
      expect(out).toHaveLength(5);
      expect([...out].sort()).toEqual(out);
      if (a !== null) for (const r of out) expect(r > a).toBe(true);
      if (b !== null) for (const r of out) expect(r < b).toBe(true);
    }
  });

  it("buys orders of magnitude more runway than halving would", () => {
    // Halving toward an absent bound exhausts the space in a few hundred calls.
    // Stepping lasts tens of thousands. This is the whole point of delegating.
    let current = firstRank();
    for (let i = 0; i < 5000; i++) {
      const next = rankBetween(null, current);
      expect(next < current).toBe(true);
      current = next;
    }
    expect(minorLength(current)).toBe(0);
  });

  it("does not recurse when a bucket boundary is reached", () => {
    // rankAfter/rankBefore fall back to subdivision, which would re-enter
    // rankBetween if they were not routed through the shared core.
    expect(() => rankBetween("2|zzzzzz:", null)).not.toThrow();
    expect(() => rankAfter("2|zzzzzz:")).not.toThrow();
    expect(() => rankBetween(null, "0|000000:U")).not.toThrow();
  });
});

describe("minorLength", () => {
  it("is zero for a rank with no minor", () => {
    expect(minorLength(firstRank())).toBe(0);
    expect(minorLength("0|ABCDEF:")).toBe(0);
  });

  it("excludes the colon from the count", () => {
    expect(minorLength("0|ABCDEF:U")).toBe(1);
    expect(minorLength("0|ABCDEF:UUU")).toBe(3);
  });

  it("treats an open bound as zero", () => {
    expect(minorLength(null)).toBe(0);
    expect(minorLength("")).toBe(0);
  });

  it("stays at zero through ordinary append-and-insert usage", () => {
    // The structural gap left by rankAfter absorbs subdivision, so realistic
    // boards never touch the minor. This is the claim the limit relies on.
    const board = [firstRank()];
    for (let i = 0; i < 40; i++) board.push(rankAfter(board[board.length - 1] as string));

    let seed = 7;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    for (let i = 0; i < 2000; i++) {
      const idx = Math.floor(rnd() * (board.length - 1));
      const value = rankBetween(board[idx] as string, board[idx + 1] as string);
      board.splice(Math.floor(rnd() * board.length), 1);
      board.push(value);
      board.sort();
    }

    const deepest = Math.max(...board.map((r) => minorLength(r)));
    expect(deepest).toBeLessThan(8);
  });
});

describe("compareRanks", () => {
  it("orders ranks correctly", () => {
    expect(compareRanks("0|000000:", "0|zzzzzz:")).toBe(-1);
    expect(compareRanks("0|zzzzzz:", "0|000000:")).toBe(1);
    expect(compareRanks("0|UUUUUU:", "0|UUUUUU:")).toBe(0);
  });

  it("works as an Array.sort comparator", () => {
    const a = firstRank();
    const b = rankAfter(a);
    const c = rankAfter(b);
    expect([c, a, b].sort(compareRanks)).toEqual([a, b, c]);
  });
});

describe("generateEntropy", () => {
  it("returns three alphabet characters by default", () => {
    for (let i = 0; i < 50; i++) {
      expect(generateEntropy()).toMatch(/^[0-9A-Za-z]{3}$/);
    }
  });

  it("honours a requested length", () => {
    expect(generateEntropy(1)).toHaveLength(1);
    expect(generateEntropy(16)).toHaveLength(16);
  });

  it("never ends in 0, so it stays canonical when appended", () => {
    for (let i = 0; i < 20000; i++) {
      expect(generateEntropy().endsWith("0")).toBe(false);
    }
  });

  it("produces a valid rank when appended to a minor", () => {
    for (let i = 0; i < 5000; i++) {
      expect(isValidRank(`0|ABCDEF:U${generateEntropy()}`)).toBe(true);
    }
  });

  it("is uniformly distributed over the alphabet", () => {
    // Naive `byte % 62` over-represents the first eight characters by 25%.
    const counts = new Map<string, number>();
    const draws = 62 * 2000;
    for (let i = 0; i < draws; i++) {
      const c = generateEntropy(2)[0] as string;
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    const expected = draws / 62;
    for (const [, n] of counts) {
      // Well inside sampling noise, but far tighter than a 25% skew.
      expect(Math.abs(n - expected) / expected).toBeLessThan(0.15);
    }
  });

  it("rejects a non-positive or minor length", () => {
    expect(() => generateEntropy(0)).toThrow(LexorankError);
    expect(() => generateEntropy(-1)).toThrow(LexorankError);
    expect(() => generateEntropy(2.5)).toThrow(LexorankError);
  });
});
