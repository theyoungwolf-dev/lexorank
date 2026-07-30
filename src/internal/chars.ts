import { ALPHABET, DECODE } from "./constants";

import { LexorankError } from "../errors";

/** Returns the order of a character code, or -1 if it is not in the alphabet. */
export function decodeChar(code: number): number {
  if (code < 0 || code >= DECODE.length) {
    return -1;
  }

  return DECODE[code] as number;
}

/** Char code at `index`, or `fallback` when the string ends before it. */
export function charAt(text: string, index: number, fallback: number): number {
  return index >= text.length ? fallback : text.charCodeAt(index);
}

/** Order of a character within the alphabet. */
export function orderOf(code: number): number {
  const order = decodeChar(code);

  if (order < 0) {
    throw new LexorankError(
      `Character ${JSON.stringify(String.fromCharCode(code))} is not part of the Base-62 alphabet.`,
    );
  }

  return order;
}

/**
 * Returns `count` evenly spaced characters strictly between `prev` and `next`,
 * or `null` when the gap is too narrow to hold them.
 *
 * A non-positive gap simply yields `null` (no space), so out-of-order input
 * degrades into "descend a level" rather than producing a corrupt index.
 */
export function midChars(count: number, prev: number, next: number): number[] | null {
  const low = orderOf(prev);
  const high = orderOf(next);

  const step = Math.floor((high - low) / (count + 1));

  if (step < 1) {
    return null;
  }

  const out = new Array<number>(count);

  for (let i = 0; i < count; i++) {
    out[i] = ALPHABET.charCodeAt(low + step * (i + 1));
  }

  return out;
}
