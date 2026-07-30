/**
 * @theyoungwolf/lexorank
 *
 * Ordered ranking for drag-and-drop lists: insert, move and reorder items using
 * stable string keys that sort correctly without renumbering their neighbours.
 */

export {
  BatchSizeError,
  DuplicateRankError,
  InvalidRankError,
  LexorankError,
  RankInvariantError,
  RankOrderError,
  RankSpaceExhaustedError,
} from "./errors.js";
export { MAX_BATCH_SIZE, MAX_BUCKET, MAX_MINOR_LENGTH } from "./internal/constants.js";
export { generateEntropy } from "./internal/entropy.js";
export {
  compareRanks,
  equidistantRanks,
  firstRank,
  minorLength,
  parseRank,
  type RankInput,
  type RankOptions,
  rankAfter,
  rankBefore,
  rankBetween,
} from "./lexorank.js";
export { Position } from "./position.js";
export { hasTrailingZero, isValidRank, LEXORANK_REGEX } from "./validator.js";
