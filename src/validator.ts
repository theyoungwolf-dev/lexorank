/**
 * Canonical LexoRank string shape: `<bucket>|<major>[:<minor>]`
 *
 *   - bucket: a single digit 0, 1, or 2
 *   - major:  exactly 6 Base-62 characters
 *   - minor:  a leading ":" followed by zero or more Base-62 characters
 *
 */
export const LEXORANK_REGEX = /^([012])\|([0-9a-zA-Z]{6})(:[0-9a-zA-Z]*)$/;

/**
 * Returns `true` if `rank` is a well-formed LexoRank string.
 *
 * Note: this validates *shape only*, not semantic orderability.
 */
export function isValidRank(rank: string): boolean {
  return LEXORANK_REGEX.test(rank);
}
