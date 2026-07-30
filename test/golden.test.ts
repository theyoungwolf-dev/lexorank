import { describe, expect, it } from "vitest";
import {
  firstRank,
  parseRank,
  rankAfter,
  rankBefore,
  rankBetween,
  ranksBetween,
} from "../src/index.js";
import golden from "./fixtures/golden.json" with { type: "json" };

/**
 * Golden vectors captured from the initial implementation.
 */
interface GoldenCase {
  op: string;
  args: string[];
  out: string[] | null;
}

function invoke(op: string, args: string[]): string[] {
  switch (op) {
    case "firstRank":
      return [firstRank()];
    case "rank":
      return [rankBetween(args[0] as string, args[1] as string)];
    case "equidistant":
      return ranksBetween(
        Number.parseInt(args[0] as string, 10),
        args[1] as string,
        args[2] as string,
      );
    case "prepend":
      return [rankBefore(args[0] as string)];
    case "append":
      return [rankAfter(args[0] as string)];
    case "parse": {
      const p = parseRank(args[0] as string);
      if (p === null) return ["<nil>"];
      return [`${p.bucket}|${p.major}|${p.minor}`];
    }
    default:
      throw new Error(`unknown op ${op}`);
  }
}

describe("golden vectors from the correct implementation", () => {
  const cases = golden as GoldenCase[];

  it("has a meaningful number of vectors", () => {
    expect(cases.length).toBeGreaterThan(300);
  });

  for (const [index, c] of cases.entries()) {
    const label = `#${index} ${c.op}(${c.args.map((a) => JSON.stringify(a)).join(", ")})`;

    if (c.out === null) {
      it(`${label} -> rejects`, () => {
        expect(() => invoke(c.op, c.args)).toThrow();
      });
    } else {
      it(`${label} -> ${JSON.stringify(c.out)}`, () => {
        expect(invoke(c.op, c.args)).toEqual(c.out);
      });
    }
  }
});
