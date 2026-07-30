import {
  BatchSizeError,
  DuplicateRankError,
  InvalidRankError,
  LexorankError,
  RankInvariantError,
  RankOrderError,
  RankSpaceExhaustedError,
} from "./errors.js";
import {
  LOWEST_MAJOR,
  MAX_BATCH_SIZE,
  MAX_BUCKET,
  MAX_MAJOR_VALUE,
  MAX_MINOR_LENGTH,
  MID_MAJOR,
  STEP_SIZE,
} from "./internal/constants.js";
import { decodeBase62, toMajor } from "./internal/base62.js";

import { LEXORANK_REGEX } from "./validator.js";
import { Position } from "./position.js";
import { computeRanks } from "./internal/ranks.js";

/**
 * A rank boundary. `null`, `undefined` and `""` all mean "no boundary on this
 * side" - use them for the start or end of a list.
 */
export type RankInput = string | null | undefined;

/** Options accepted by every function that may subdivide the minor. */
export interface RankOptions {
  /**
   * Maximum minor length, in Base-62 digits, before
   * {@link RankSpaceExhaustedError} is thrown. Defaults to
   * {@link MAX_MINOR_LENGTH}.
   *
   * Lower values surface a runaway list sooner and bound the width of the
   * column you store ranks in; higher values tolerate more consecutive
   * same-position inserts between a rebalance. Ordinary use stays well under
   * either, so this is a tripwire rather than a capacity setting.
   */
  maxMinorLength?: number;
}

const normalise = (value: RankInput): string => value ?? "";

function resolveLimit(options: RankOptions | undefined): number {
  const limit = options?.maxMinorLength ?? MAX_MINOR_LENGTH;

  if (!Number.isInteger(limit) || limit < 1) {
    throw new LexorankError(`maxMinorLength must be a positive integer, but received ${limit}.`);
  }

  return limit;
}

/**
 * Parses a LexoRank string into a {@link Position}.
 *
 * @returns the parsed position, or `null` when there is no rank to parse.
 * @throws {InvalidRankError} if the string is not a valid LexoRank.
 */
export function parseRank(value: RankInput): Position | null {
  const text = normalise(value);

  if (text === "") {
    return null;
  }

  const match = LEXORANK_REGEX.exec(text);

  if (match === null) {
    throw new InvalidRankError(text);
  }

  return new Position(Number(match[1] as string), match[2] as string, match[3] as string);
}

/**
 * Compares two rank strings. Suitable as an `Array.prototype.sort` comparator.
 *
 * Ranks are designed to sort correctly as plain strings, so this is a
 * convenience for readability rather than a different ordering.
 */
export function compareRanks(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Parses both bounds and rejects any pair that does not describe a usable
 * interval.
 *
 * The two failures are reported separately because they call for different
 * responses: descending bounds mean the caller passed its arguments the wrong
 * way round, while identical bounds mean the underlying list contains duplicate
 * ranks and needs rebalancing.
 */
function parseBounds(prev: RankInput, next: RankInput): [Position | null, Position | null] {
  const low = normalise(prev);
  const high = normalise(next);

  if (low !== "" && high !== "") {
    const order = compareRanks(low, high);

    if (order > 0) {
      throw new RankOrderError(low, high);
    }

    if (order === 0) {
      throw new DuplicateRankError(low);
    }
  }

  return [parseRank(low), parseRank(high)];
}

/**
 * Verifies the results actually landed where they were asked to.
 *
 * Cheap insurance against silent ordering corruption: two string comparisons per
 * result, with no exemptions. Every value this library returns sorts strictly
 * after `prev` (when given), strictly before `next` (when given), and strictly
 * after the result preceding it.
 */
function assertWithinBounds(results: string[], prev: string, next: string): void {
  let previous = prev;

  for (const result of results) {
    if (previous !== "" && result <= previous) {
      throw new RankInvariantError(result, prev, next);
    }

    if (next !== "" && result >= next) {
      throw new RankInvariantError(result, prev, next);
    }

    previous = result;
  }
}

/**
 * Validates the bounds, subdivides, and verifies the results landed inside them.
 *
 * Every entry point funnels through here. `rankAfter` and `rankBefore` call it
 * directly rather than going via {@link rankBetween}, which would recurse now
 * that open bounds delegate back to them.
 */
function subdivide(low: string, high: string, count: number, limit: number): string[] {
  const [prevPosition, nextPosition] = parseBounds(low, high);

  const results = computeRanks(count, prevPosition, nextPosition, limit).map((position) => position.toString());

  assertWithinBounds(results, low, high);

  return results;
}

/**
 * Returns the number of Base-62 digits in a rank's minor component.
 *
 * Zero means the rank sits purely in the fixed-width integer space, which is
 * where ordinary ranks live. A non-trivial value means the same two neighbours
 * have been subdivided repeatedly.
 *
 * Use it to monitor list health and rebalance before anything throws. Normal
 * usage stays at or near zero even after tens of thousands of moves, so a
 * column whose deepest rank is more than a couple of dozen digits is worth
 * rebalancing regardless of where its limit sits.
 *
 * @throws {InvalidRankError} if `rank` is malformed or non-canonical.
 */
export function minorLength(rank: RankInput): number {
  const position = parseRank(rank);

  if (position === null) {
    return 0;
  }

  // `minor` carries its leading ":", which is not a digit.
  return position.minor.length - 1;
}

/** The first rank for an empty list, centred in the available space. */
export function firstRank(): string {
  return new Position(0, MID_MAJOR, ":").toString();
}

/**
 * Returns a rank that sorts strictly between `prev` and `next`.
 *
 * Use this whenever an item is placed relative to its neighbours - a drop
 * between two existing rows. Because it reads both bounds, consecutive drops at
 * the same visual position keep producing distinct ranks: the second drop sees
 * the rank created by the first as its new neighbour.
 *
 * Do **not** reach for {@link rankAfter} to insert before an existing item if uniqueness needs to be guaranteed.
 * That function is a pure function of its single argument, so it ignores whatever
 * already follows and will hand back the same value twice, given the same input.
 *
 * Halving the remaining gap is the price of that guarantee. To *build* a *fresh* list,
 * use {@link firstRank} on the first item followed by {@link rankAfter} on every next item,
 * which steps by a fixed amount and preserves far more runway.
 *
 * @throws {RankOrderError} if `prev` sorts after `next`.
 * @throws {DuplicateRankError} if both bounds are the same rank. Nothing sorts
 *   between two identical ranks, so the list must be rebalanced first.
 * @throws {InvalidRankError} if either bound is malformed or non-canonical.
 */
export function rankBetween(prev: RankInput, next: RankInput, options?: RankOptions): string {
  const limit = resolveLimit(options);
  const low = normalise(prev);
  const high = normalise(next);

  // An open bound has no neighbour on that side to collide with, so the
  // fixed-step primitive is both safe and far more economical: halving toward an
  // absent boundary exhausts the space in a few hundred calls, while stepping
  // lasts for tens of thousands.
  if (low === "" && high === "") {
    return firstRank();
  }

  if (low === "") {
    return rankBefore(high, options);
  }

  if (high === "") {
    return rankAfter(low, options);
  }

  return subdivide(low, high, 1, limit)[0] as string;
}

/**
 * Returns `count` ranks spread evenly between `prev` and `next`.
 *
 * Applies the same bound rules as {@link rankBetween}: the interval must be
 * non-empty, so descending and identical bounds are both rejected.
 *
 * @throws {BatchSizeError} if `count` is not an integer in 1..{@link MAX_BATCH_SIZE}.
 * @throws {RankOrderError} if `prev` sorts after `next`.
 * @throws {DuplicateRankError} if both bounds are the same rank.
 */
export function equidistantRanks(count: number, prev: RankInput, next: RankInput, options?: RankOptions): string[] {
  if (!Number.isInteger(count) || count < 1 || count > MAX_BATCH_SIZE) {
    throw new BatchSizeError(count, MAX_BATCH_SIZE);
  }

  const limit = resolveLimit(options);
  const low = normalise(prev);
  const high = normalise(next);

  // Mirrors rankBetween: an open bound steps, a closed pair subdivides. Keeping
  // these aligned is what makes equidistantRanks(1, a, b) === rankBetween(a, b).
  if (low === "" && high === "") {
    const results = [firstRank()];

    while (results.length < count) {
      results.push(rankAfter(results[results.length - 1] as string, options));
    }

    return results;
  }

  if (high === "") {
    const results: string[] = [];
    let current = low;

    for (let i = 0; i < count; i++) {
      current = rankAfter(current, options);
      results.push(current);
    }

    return results;
  }

  if (low === "") {
    const results: string[] = [];
    let current = high;

    for (let i = 0; i < count; i++) {
      current = rankBefore(current, options);
      results.push(current);
    }

    // Generated downward; callers expect ascending order.
    return results.reverse();
  }

  return subdivide(low, high, count, limit);
}

/**
 * Returns the next rank after `to`, leaving a structural gap so later insertions
 * still have room. Pass `null` to get {@link firstRank}.
 *
 * This is the append primitive: `firstRank()` then `rankAfter()` repeatedly is
 * the intended way to build a fresh list, and gives roughly 86,000 sequential
 * appends before the minor component is touched.
 *
 * It depends only on `to`, so it is safe **only** when nothing follows `to`.
 * Calling it twice against the same anchor returns the same rank; to place an
 * item before an existing one, use {@link rankBetween}.
 */
export function rankAfter(to: RankInput, options?: RankOptions): string {
  const text = normalise(to);

  if (text === "") {
    return firstRank();
  }

  const limit = resolveLimit(options);
  const position = parseRank(text) as Position;
  const value = decodeBase62(position.major) + STEP_SIZE;

  let result: string;

  if (value > MAX_MAJOR_VALUE) {
    // Integer space exhausted. Move up a bucket if one is free, otherwise fall
    // back to subdividing the minor space.
    result =
      position.bucket >= MAX_BUCKET
        ? (subdivide(text, "", 1, limit)[0] as string)
        : new Position(position.bucket + 1, MID_MAJOR, ":").toString();
  } else {
    result = new Position(position.bucket, toMajor(value), ":").toString();
  }

  assertWithinBounds([result], text, "");

  return result;
}

/**
 * Returns the rank immediately before `to`, leaving a structural gap so later
 * insertions still have room. Pass `null` to get {@link firstRank}.
 *
 * As with {@link rankAfter}, this depends only on `to` and is safe only when
 * nothing precedes it. Strictly use {@link rankBetween} to insert after an
 *  existing item but before the current one.
 *
 * @throws {RankSpaceExhaustedError} if `to` is the absolute floor
 *   (`0|000000:`). Nothing sorts below it, so the list must be rebalanced.
 */
export function rankBefore(to: RankInput, options?: RankOptions): string {
  const text = normalise(to);

  if (text === "") {
    return firstRank();
  }

  const limit = resolveLimit(options);
  const position = parseRank(text) as Position;
  const value = decodeBase62(position.major) - STEP_SIZE;

  let result: string;

  if (value < 0) {
    if (position.bucket <= 0) {
      if (position.major === LOWEST_MAJOR && position.minor === ":") {
        throw new RankSpaceExhaustedError(
          "Already at the lowest possible rank; rebalance the list to make room below it.",
        );
      }

      // Bottom bucket, below the step size: subdivide what is left.
      result = subdivide("", text, 1, limit)[0] as string;
    } else {
      result = new Position(position.bucket - 1, MID_MAJOR, ":").toString();
    }
  } else {
    result = new Position(position.bucket, toMajor(value), ":").toString();
  }

  assertWithinBounds([result], "", text);

  return result;
}
