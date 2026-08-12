import {
  HIGHEST_MAJOR,
  LOWEST_MAJOR,
  MAX_CHAR,
  MAX_MINOR_LENGTH,
  MAX_ORDER,
  MID_MAJOR,
  MIN_CHAR,
} from "./constants.js";
import { charAt, midChars, orderOf } from "./chars.js";

import { Position } from "../position.js";
import { RankSpaceExhaustedError } from "../errors.js";

/** Mutable working copy used while walking the two bounds. */
interface Bound {
  bucket: number;
  major: string;
  minor: string;
}

const toBound = (p: Position): Bound => ({
  bucket: p.bucket,
  major: p.major,
  minor: p.minor,
});

const chr = (code: number): string => String.fromCharCode(code);

/**
 * Produces `count` positions ordered strictly between `prev` and `next`.
 *
 * Space is taken from the fixed-width major component first. When the majors are
 * identical, or adjacent enough that no whole character fits between them, the
 * search continues in the unbounded fractional minor component.
 *
 * Callers are expected to have validated the bounds already: `parseBounds` in
 * `lexorank.ts` rejects descending and identical pairs before reaching here, so
 * the interval is always non-empty.
 */
export function computeRanks(
  count: number,
  prev: Position | null,
  next: Position | null,
  maxMinorLength: number = MAX_MINOR_LENGTH,
): Position[] {
  let low: Bound;
  let high: Bound;

  // Absent bounds become the absolute floor/ceiling of the other side's bucket.
  if (prev === null) {
    low = { bucket: next?.bucket ?? 0, major: LOWEST_MAJOR, minor: ":" };

    if (
      next !== null &&
      low.bucket === next.bucket &&
      next.major === LOWEST_MAJOR &&
      next.minor === ":"
    ) {
      if (low.bucket <= 0) {
        throw new RankSpaceExhaustedError(
          `Nothing sorts below ${JSON.stringify(next.toString())}, the lowest ` +
            "representable rank. Rebalance the list to make room beneath it.",
        );
      }

      low.bucket -= 1;
    }
  } else {
    low = toBound(prev);
  }

  if (next === null) {
    high = { bucket: low.bucket, major: HIGHEST_MAJOR, minor: ":" };
  } else {
    high = toBound(next);
  }

  let ceilingIsOpen = next === null;

  if (low.bucket < high.bucket) {
    high = { bucket: low.bucket, major: HIGHEST_MAJOR, minor: ":" };
    ceilingIsOpen = true;
  }

  if (low.major !== high.major) {
    const found = majorSpaceRanks(count, low, high);

    if (found !== null) {
      return found;
    }

    ceilingIsOpen = true;
  }

  return minorSpaceRanks(count, low, high, maxMinorLength, ceilingIsOpen);
}

/**
 * Searches the fixed-width integer space.
 *
 * Returns `null` when the majors turn out to be adjacent, signalling the caller
 * to continue in the minor space instead.
 */
function majorSpaceRanks(count: number, lowIn: Bound, highIn: Bound): Position[] | null {
  const low = { ...lowIn };
  const high = { ...highIn };

  // Majors must stay uniform in width, which caps how deep we may descend.
  const width = Math.max(low.major.length, high.major.length);

  let prefix = "";
  let depth = 0;

  // `prefix.length === depth` holds on every iteration, so the walk is bounded
  // by `width`: once the prefix fills the available width there is no room for
  // another character and we must yield to the minor space.
  while (prefix.length < width) {
    const lowChar = charAt(low.major, depth, MIN_CHAR);
    const highChar = charAt(high.major, depth, MAX_CHAR);

    // Identical characters are shared prefix; consume and descend.
    if (lowChar === highChar) {
      prefix += chr(lowChar);
      depth++;
      continue;
    }

    const mids = midChars(count, lowChar, highChar);

    if (mids === null) {
      // No whole character fits here. Look one place deeper to decide which side
      // has more runway, then borrow that side's character as the new boundary.
      const lowAfter = orderOf(charAt(low.major, depth + 1, MIN_CHAR));
      const highAfter = orderOf(charAt(high.major, depth + 1, MAX_CHAR));

      const roomAbove = MAX_ORDER - lowAfter;
      const roomBelow = depth + 1 >= high.major.length ? 0 : highAfter;

      if (roomAbove >= roomBelow) {
        high.major = high.major.slice(0, depth) + chr(lowChar);
        prefix += chr(lowChar);
      } else {
        low.major = low.major.slice(0, depth) + chr(highChar);
        prefix += chr(highChar);
      }

      depth++;
      continue;
    }

    // Pad the remainder so every major keeps the same width and sorts correctly.
    const padLength = Math.min(width - 1 - prefix.length, MID_MAJOR.length);
    const trailer = padLength > 0 ? MID_MAJOR.slice(0, padLength) : "";

    return mids.map((mid) => new Position(low.bucket, prefix + chr(mid) + trailer, ":"));
  }

  // Integer space exhausted.
  return null;
}

/** Searches the minor space, up to `maxMinorLength` digits. */
function minorSpaceRanks(
  count: number,
  lowIn: Bound,
  highIn: Bound,
  maxMinorLength: number,
  ceilingIsOpen: boolean,
): Position[] {
  const low = { ...lowIn };
  const high = { ...highIn };

  let open = ceilingIsOpen;

  if (low.minor === ":") {
    low.minor = `:${LOWEST_MAJOR}`;
  }

  let highPad = MIN_CHAR;

  if (open) {
    high.minor = `:${HIGHEST_MAJOR}`;
    highPad = MAX_CHAR;
  }

  let prefix = "";
  let depth = 0;

  while (prefix.length <= maxMinorLength) {
    const lowChar = charAt(low.minor, depth, MIN_CHAR);
    const highChar = charAt(high.minor, depth, highPad);

    if (lowChar === highChar) {
      prefix += chr(lowChar);
      depth++;
      continue;
    }

    const mids = midChars(count, lowChar, highChar);

    if (mids === null) {
      const lowAfter = orderOf(charAt(low.minor, depth + 1, MIN_CHAR));
      const highAfter = orderOf(charAt(high.minor, depth + 1, highPad));

      const roomAbove = MAX_ORDER - lowAfter;
      const roomBelow = depth + 1 >= high.minor.length ? 0 : highAfter;

      if (roomAbove >= roomBelow) {
        high.minor = high.minor.slice(0, depth) + chr(lowChar);
        open = true;
        highPad = MAX_CHAR;
        prefix += chr(lowChar);
      } else {
        low.minor = low.minor.slice(0, depth) + chr(highChar);
        prefix += chr(highChar);
      }

      depth++;
      continue;
    }

    return mids.map((mid) => new Position(low.bucket, low.major, prefix + chr(mid)));
  }

  throw new RankSpaceExhaustedError(
    `The minor component reached its ${maxMinorLength}-digit limit. The same ` +
      "two neighbours have been subdivided repeatedly; rebalance the affected list " +
      "to restore spacing.",
  );
}
