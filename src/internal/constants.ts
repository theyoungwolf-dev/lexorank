/** Base-62 alphabet, ordered so that lexicographic order matches numeric order. */
export const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** Highest order value in the alphabet (62 characters, zero-indexed). */
export const MAX_ORDER = ALPHABET.length - 1; // 61

/** Fixed width of the major (integer) component. */
export const MAJOR_LENGTH = 6;

export const LOWEST_MAJOR = "0".repeat(MAJOR_LENGTH); // "000000"
export const HIGHEST_MAJOR = "z".repeat(MAJOR_LENGTH); // "zzzzzz"

/**
 * Midpoint character, repeated to MAJOR_LENGTH. Used to pad a freshly minted
 * major and to land in the centre of a bucket.
 */
export const MID_MAJOR = "U".repeat(MAJOR_LENGTH); // "UUUUUU"

/** Boundary characters used when one side of a comparison runs out of string. */
export const MIN_CHAR = 0x30; // '0'
export const MAX_CHAR = 0x7a; // 'z'

/**
 * Maximum length of the fractional component before we refuse to subdivide
 * further and ask the caller to rebalance.
 */
export const MAX_MINOR_LENGTH = 64;

/**
 * Largest batch that can ever be placed in a single call.
 *
 * `mids` needs at least one whole character per item, and the widest possible
 * gap ('0' to 'z') spans MAX_ORDER = 61 steps, so at most 60 items fit
 * (61 / (60 + 1) === 1). Asking for 61 is unsatisfiable at every depth.
 */
export const MAX_BATCH_SIZE = MAX_ORDER - 1; // 60

/** Structural gap left between sequential ranks, preserving insertion runway. */
export const STEP_SIZE = 1_000_000;

/** 62^6 - 1: the largest value a 6-character major can represent. */
export const MAX_MAJOR_VALUE = ALPHABET.length ** MAJOR_LENGTH - 1; // 56_800_235_583

/** Highest valid bucket. Buckets give the rebalancer somewhere to move ranks to. */
export const MAX_BUCKET = 2;

export const DECODE = new Int8Array(128).fill(-1);

for (let i = 0; i < ALPHABET.length; i++) {
  DECODE[ALPHABET.charCodeAt(i)] = i;
}
