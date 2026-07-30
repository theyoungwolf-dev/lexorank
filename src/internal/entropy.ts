import { ALPHABET } from "./constants";
import { LexorankError } from "../errors";

/**
 * The alphabet excluding "0". The final character of a minor may never be "0",
 * so entropy that might be appended to a rank must not end in one either.
 */
const TAIL_ALPHABET = ALPHABET.slice(1);

/** Minimal shape of the Web Crypto API, avoiding a dependency on the DOM lib. */
interface CryptoLike {
  getRandomValues(array: Uint8Array): Uint8Array;
}

function getRandomSource(): CryptoLike {
  const webcrypto = (globalThis as unknown as { crypto?: CryptoLike }).crypto;

  if (webcrypto === undefined || typeof webcrypto.getRandomValues !== "function") {
    throw new LexorankError(
      "No cryptographic random source is available. Web Crypto is required " + "(Node 18+ or any modern browser).",
    );
  }

  return webcrypto;
}

/**
 * Draws indices uniformly from an alphabet.
 *
 * Naive `byte % size` is biased: 256 is not a multiple of 62, so the first
 * eight characters come up 25% more often than the rest. Bytes landing in the
 * uneven tail are rejected and redrawn instead. Bytes are taken from a pooled
 * buffer so a short string costs one call into the random source.
 */
function createSampler(): (size: number) => number {
  const source = getRandomSource();
  let pool = new Uint8Array(0);
  let offset = 0;

  const nextByte = (): number => {
    if (offset >= pool.length) {
      pool = new Uint8Array(32);
      source.getRandomValues(pool);
      offset = 0;
    }

    return pool[offset++] as number;
  };

  return (size: number): number => {
    const limit = Math.floor(256 / size) * size;

    for (;;) {
      const byte = nextByte();

      if (byte < limit) {
        return byte % size;
      }
    }
  };
}

/**
 * Generates a random Base-62 string, uniformly distributed and safe to append
 * to a rank's minor component.
 *
 * Useful for separating ranks computed concurrently by different clients, which
 * would otherwise be identical: the algorithm is deterministic, so two clients
 * inserting between the same neighbours derive the same value.
 *
 * The final character is never "0", so the result stays canonical when appended
 * to a minor. Appending still widens the rank rather than preserving it, so
 * check the upper bound afterwards - it is not a substitute for a uniqueness
 * constraint on the column.
 *
 * @param length number of characters to generate. Defaults to 3.
 * @throws {LexorankError} if `length` is not a positive integer, or no
 *   cryptographic random source is available. It deliberately does not fall back
 *   to a fixed string: a constant is identical on every client and so separates
 *   nothing, which is the one thing this function exists to do.
 */
export function generateEntropy(length = 3): string {
  if (!Number.isInteger(length) || length < 1) {
    throw new LexorankError(`Entropy length must be a positive integer, but received ${length}.`);
  }

  const sample = createSampler();
  let out = "";

  for (let i = 0; i < length; i++) {
    // Only the last character is constrained; leading zeros are canonical.
    const alphabet = i === length - 1 ? TAIL_ALPHABET : ALPHABET;
    out += alphabet[sample(alphabet.length)] as string;
  }

  return out;
}
