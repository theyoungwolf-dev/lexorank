/**
 * @theyoungwolf/lexorank
 *
 * Public API surface. Keep this file limited to the *intended public API* —
 * internal helpers (byteToOrder, mids, majorRanks, minorRanks, base62, entropy)
 * live under `src/internal/` and should NOT be re-exported.
 */

export { isValidRank, LEXORANK_REGEX } from "./validator.js";

// --- Planned public API (ported next, module by module) ---------------------
// export { Position } from "./position.js";
// export {
//   rank,             // between two ranks
//   firstRank,
//   equidistantRanks, // n ranks between two
//   prepend,
//   append,
// } from "./lexorank.js";
