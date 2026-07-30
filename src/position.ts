/**
 * A parsed LexoRank position: `<bucket>|<major>[:<minor>]`
 *
 * Immutable. Use {@link Position.toString} to get the canonical rank string.
 */
export class Position {
  /** Rebalancing bucket, 0-2. */
  readonly bucket: number;
  /** Fixed-width Base-62 integer component. */
  readonly major: string;
  /** Fractional component, including its leading ":". */
  readonly minor: string;

  constructor(bucket: number, major: string, minor: string) {
    this.bucket = bucket;
    this.major = major;
    this.minor = minor;
    Object.freeze(this);
  }

  /** Canonical rank string. */
  toString(): string {
    return `${this.bucket}|${this.major}${this.minor}`;
  }

  /** Allows `JSON.stringify` to emit the rank string directly. */
  toJSON(): string {
    return this.toString();
  }
}
