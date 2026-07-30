/** Base class for every error thrown by this library. */
export class LexorankError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LexorankError";
  }
}

/** A supplied rank string was not in the expected `<bucket>|<major>[:<minor>]` form. */
export class InvalidRankError extends LexorankError {
  /** The offending value. */
  readonly value: string;

  constructor(value: string) {
    super(`Invalid LexoRank format: ${JSON.stringify(value)}`);
    this.name = "InvalidRankError";
    this.value = value;
  }
}

/** The supplied bounds were not in ascending order, so no rank exists between them. */
export class RankOrderError extends LexorankError {
  readonly prev: string;
  readonly next: string;

  constructor(prev: string, next: string) {
    super(
      `The previous rank must sort before the next rank, but received ` +
        `prev=${JSON.stringify(prev)} and next=${JSON.stringify(next)}.`,
    );
    this.name = "RankOrderError";
    this.prev = prev;
    this.next = next;
  }
}

/** A batch size outside the supported range was requested. */
export class BatchSizeError extends LexorankError {
  readonly requested: number;

  constructor(requested: number, max: number) {
    super(`Batch size must be an integer between 1 and ${max}, but received ${requested}.`);
    this.name = "BatchSizeError";
    this.requested = requested;
  }
}

/**
 * The fractional component cannot be subdivided any further, or the bucket space
 * is exhausted. The caller should rebalance the affected list.
 */
export class RankSpaceExhaustedError extends LexorankError {
  constructor(message = "Rank space exhausted; the affected list needs rebalancing.") {
    super(message);
    this.name = "RankSpaceExhaustedError";
  }
}

/**
 * Both bounds were the same rank, so the requested interval is empty.
 *
 * Two items sharing a rank is a data-integrity problem rather than a caller
 * mistake: there is no order between them, so nothing can be placed between
 * them either. Rebalance the affected list to separate them, then retry.
 */
export class DuplicateRankError extends LexorankError {
  /** The rank shared by both bounds. */
  readonly rank: string;

  constructor(rank: string) {
    super(
      `Both bounds are the same rank (${JSON.stringify(rank)}). Two items cannot ` +
        "share a rank and nothing sorts between them; rebalance the list to " +
        "separate them, then retry.",
    );
    this.name = "DuplicateRankError";
    this.rank = rank;
  }
}

/**
 * A produced rank did not land inside the requested bounds.
 *
 * This is an internal invariant check. It should never fire; if it does, treat
 * it as a bug in this library rather than a problem with your data.
 */
export class RankInvariantError extends LexorankError {
  readonly produced: string;

  constructor(produced: string, prev: string, next: string) {
    super(
      `Produced rank ${JSON.stringify(produced)} does not lie within the requested ` +
        `bounds (prev=${JSON.stringify(prev)}, next=${JSON.stringify(next)}). ` +
        "This is a bug; please report it.",
    );
    this.name = "RankInvariantError";
    this.produced = produced;
  }
}
