import { describe, expect, it } from "vitest";

import { isValidRank } from "../src/index.js";

describe("isValidRank", () => {
  it("accepts a canonical rank with empty minor", () => {
    expect(isValidRank("0|000000:")).toBe(true);
  });

  it("accepts a rank with a minor fraction", () => {
    expect(isValidRank("1|ABCDEF:U")).toBe(true);
  });

  it("rejects a bucket outside 0-2", () => {
    expect(isValidRank("3|000000:")).toBe(false);
  });

  it("rejects a major that is not exactly 6 chars", () => {
    expect(isValidRank("0|00000:")).toBe(false);
  });

  it("rejects a string with no colon", () => {
    expect(isValidRank("0|000000")).toBe(false);
  });

  it("rejects junk", () => {
    expect(isValidRank("not-a-rank")).toBe(false);
  });
});
