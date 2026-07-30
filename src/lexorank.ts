import {
  BatchSizeError,
  DuplicateRankError,
  InvalidRankError,
  RankInvariantError,
  RankOrderError,
  RankSpaceExhaustedError,
} from "./errors";
import { LOWEST_MAJOR, MAX_BATCH_SIZE, MAX_BUCKET, MAX_MAJOR_VALUE, MID_MAJOR, STEP_SIZE } from "./internal/constants";
import { decodeBase62, toMajor } from "./internal/base62";

import { LEXORANK_REGEX } from "./validator";
import { Position } from "./position";
import { computeRanks } from "./internal/ranks";

/**
 * A rank boundary. `null`, `undefined` and `""` all mean "no boundary on this
 * side" - use them for the start or end of a list.
 */
export type RankInput = string | null | undefined;

const normalise = (value: RankInput): string => value ?? "";

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
export function rankBetween(prev: RankInput, next: RankInput): string {
  const [low, high] = parseBounds(prev, next);

  const result = (computeRanks(1, low, high)[0] as Position).toString();

  assertWithinBounds([result], normalise(prev), normalise(next));

  return result;
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
export function equidistantRanks(count: number, prev: RankInput, next: RankInput): string[] {
  if (!Number.isInteger(count) || count < 1 || count > MAX_BATCH_SIZE) {
    throw new BatchSizeError(count, MAX_BATCH_SIZE);
  }

  const [low, high] = parseBounds(prev, next);

  const results = computeRanks(count, low, high).map((position) => position.toString());

  assertWithinBounds(results, normalise(prev), normalise(next));

  return results;
}

/**
 * Returns the next rank after `to`, leaving a structural gap so later insertions
 * still have room. Pass `null` to get {@link firstRank}.
 *
 * This is the append primitive: `firstRank()` then `rankAfter()` repeatedly is
 * the intended way to build a fresh list, and gives roughly 86,000 sequential
 * appends before the fractional/minor component is touched.
 *
 * It depends only on `to`, so it is safe **only** when nothing follows `to`.
 * Calling it twice against the same anchor returns the same rank; to place an
 * item before an existing one but strictly after the current one, use {@link rankBetween} instead.
 */
export function rankAfter(to: RankInput): string {
  const text = normalise(to);

  if (text === "") {
    return firstRank();
  }

  const position = parseRank(text) as Position;
  const value = decodeBase62(position.major) + STEP_SIZE;

  if (value > MAX_MAJOR_VALUE) {
    // Integer space exhausted. Move up a bucket if one is free, otherwise fall
    // back to subdividing the fractional space.
    if (position.bucket >= MAX_BUCKET) {
      return rankBetween(text, null);
    }

    return new Position(position.bucket + 1, MID_MAJOR, ":").toString();
  }

  return new Position(position.bucket, toMajor(value), ":").toString();
}

/**
 * Returns the rank immediately before `to`, leaving a structural gap so later
 * insertions still have room. Pass `null` to get {@link firstRank}.
 *
 * As with {@link rankAfter}, this depends only on `to` and is safe only when
 * nothing precedes it. Strictly use {@link rankBetween} to insert after an existing item
 * but before the current one.
 *
 * @throws {RankSpaceExhaustedError} if `to` is the absolute floor
 *   (`0|000000:`). Nothing sorts below it, so the list must be rebalanced.
 */
export function rankBefore(to: RankInput): string {
  const text = normalise(to);

  if (text === "") {
    return firstRank();
  }

  const position = parseRank(text) as Position;
  const value = decodeBase62(position.major) - STEP_SIZE;

  if (value < 0) {
    if (position.bucket <= 0) {
      if (position.major === LOWEST_MAJOR && position.minor === ":") {
        throw new RankSpaceExhaustedError(
          "Already at the lowest possible rank; rebalance the list to make room below it.",
        );
      }

      return rankBetween(null, text);
    }

    return new Position(position.bucket - 1, MID_MAJOR, ":").toString();
  }

  return new Position(position.bucket, toMajor(value), ":").toString();
}
