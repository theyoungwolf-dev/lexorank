import { ALPHABET, MAJOR_LENGTH } from "./constants";

import { decodeChar } from "./chars";

/** Encodes a non-negative integer into the Base-62 alphabet. */
export function encodeBase62(value: number): string {
  if (value === 0) {
    return ALPHABET[0] as string;
  }

  let out = "";
  const base = ALPHABET.length;

  while (value > 0) {
    out = (ALPHABET[value % base] as string) + out;
    value = Math.floor(value / base);
  }

  return out;
}

/**
 * Decodes a Base-62 string into an integer.
 *
 * All call sites operate on regex-validated majors, so an unknown character
 * indicates a bug rather than bad user input; it decodes as 0 for that digit.
 */
export function decodeBase62(text: string): number {
  let value = 0;
  const base = ALPHABET.length;

  for (let i = 0; i < text.length; i++) {
    const order = decodeChar(text.charCodeAt(i));
    value = value * base + (order < 0 ? 0 : order);
  }

  return value;
}

/** Encodes a value as a fixed-width major component. */
export function toMajor(value: number): string {
  return encodeBase62(value).padStart(MAJOR_LENGTH, "0");
}
