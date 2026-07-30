/**
 * Canonical LexoRank shape: `<bucket>|<major>[:<minor>]`
 *
 *   - bucket: a single digit 0, 1 or 2
 *   - major:  exactly 6 Base-62 characters
 *   - minor:  a leading ":" followed by zero or more Base-62 characters,
 *             which must NOT end in "0"
 *
 * The trailing-zero rule matters for correctness, not tidiness. ":U" and ":U0"
 * denote the same minor but are distinct strings, and *no* valid rank sorts
 * strictly between them — the gap is provably empty, because any rank above
 * ":U" must extend it, and every extension sorts above ":U0" as well. Allowing
 * both forms therefore creates neighbours that can never be separated. Ranks
 * produced by this library are always canonical; the rule only rejects
 * hand-written or externally generated values.
 */
export const LEXORANK_REGEX = /^([012])\|([0-9a-zA-Z]{6})(:(?:[0-9a-zA-Z]*[1-9A-Za-z])?)$/;

/**
 * Returns `true` if `value` is a well-formed, canonical LexoRank string.
 *
 * This is exactly the set of values the rest of the API accepts, so a `true`
 * result means the value is safe to pass to any function here.
 */
export function isValidRank(value: string): boolean {
  return LEXORANK_REGEX.test(value);
}

/** Returns `true` if the minor is non-canonical because it ends in "0". */
export function hasTrailingZero(value: string): boolean {
  const colon = value.indexOf(":");

  return colon !== -1 && value.endsWith("0") && value.length > colon + 1;
}
