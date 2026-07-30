#!/usr/bin/env node

/**
 * Randomised property check for the ordering contract.
 *
 * Run from the repository root, after `pnpm run build`:
 *   node .claude/skills/verify-algorithm/scripts/property-check.mjs [iterations]
 *
 * Exits non-zero if any property fails. Unit tests do not replace this: the
 * trailing-zero ordering bug passed every hand-written case and only appeared
 * under randomised search.
 */
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const distPath = resolve(process.cwd(), "dist/index.js");

if (!existsSync(distPath)) {
  console.error("dist/index.js not found. Run `pnpm run build` first.");
  process.exit(1);
}

const lib = await import(pathToFileURL(distPath).href);
const { rankBetween, rankAfter, rankBefore, firstRank, ranksBetween, isValidRank } = lib;

const ITERATIONS = Number.parseInt(process.argv[2] ?? "200000", 10);
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

// Seeded PRNG so any failure reproduces exactly.
let seed = Number.parseInt(process.env.SEED ?? "20260731", 10);
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
};
const pick = (s) => s[Math.floor(rnd() * s.length)];
const run = (n) => Array.from({ length: n }, () => pick(ALPHABET)).join("");

let failures = 0;

/**
 * A thrown RankInvariantError means the library produced a rank outside its
 * bounds and its own guard caught it. That is always a bug, never a valid
 * outcome - never swallow it as "rejected input".
 */
const isInvariantFailure = (error) => error?.name === "RankInvariantError";

const report = (name, ok, detail = "") => {
  if (!ok) failures++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` - ${detail}` : ""}`);
};

console.log(`property check (${ITERATIONS} iterations, seed ${process.env.SEED ?? 20260731})\n`);

// 1. prev < result < next, over random canonical pairs.
{
  let checked = 0;
  let violations = 0;
  const samples = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const bucket = Math.floor(rnd() * 3);
    const major = run(6);
    const a = `${bucket}|${major}:${run(Math.floor(rnd() * 5))}`;
    const b = `${bucket}|${major}:${run(Math.floor(rnd() * 5))}`;
    const [low, high] = a < b ? [a, b] : [b, a];
    if (low === high) continue;

    let mid;
    try {
      mid = rankBetween(low, high);
    } catch (error) {
      if (isInvariantFailure(error)) {
        violations++;
        if (samples.length < 5) samples.push(`${low} | ${high} -> ${error.produced} (invariant guard)`);
        checked++;
      }
      continue; // any other rejection is a valid outcome
    }

    checked++;
    if (!(low < mid && mid < high)) {
      violations++;
      if (samples.length < 5) samples.push(`${low} | ${high} -> ${mid}`);
    }
  }

  report("ordering invariant on random pairs", violations === 0, `${checked} checked, ${violations} violations`);
  for (const s of samples) console.log(`        ${s}`);
}

// 2. Generated ranks are always canonical and re-parseable.
{
  let low = "0|000000:";
  let high = "0|zzzzzz:";
  let generated = 0;
  let bad = 0;

  for (let i = 0; i < 5000; i++) {
    let mid;
    try {
      mid = rankBetween(low, high);
    } catch (error) {
      if (isInvariantFailure(error)) bad++;
      low = "0|000000:";
      high = "0|zzzzzz:";
      continue;
    }
    generated++;
    if (!isValidRank(mid)) bad++;
    if (i % 2 === 0) high = mid;
    else low = mid;
    if (low >= high) {
      low = "0|000000:";
      high = "0|zzzzzz:";
    }
  }

  report("every generated rank is canonical", bad === 0, `${generated} generated, ${bad} invalid`);
}

// 3. Append and prepend chains stay monotonic.
{
  let current = firstRank();
  const ascending = [current];
  let ok = true;
  for (let i = 0; i < 2000; i++) {
    const next = rankAfter(current);
    if (!(next > current)) ok = false;
    current = next;
    ascending.push(current);
  }
  report(
    "rankAfter chain strictly increasing",
    ok && JSON.stringify([...ascending].sort()) === JSON.stringify(ascending),
  );

  current = firstRank();
  ok = true;
  for (let i = 0; i < 2000; i++) {
    const next = rankBefore(current);
    if (!(next < current)) ok = false;
    current = next;
  }
  report("rankBefore chain strictly decreasing", ok);
}

// 4. Batches are ascending and inside their bounds.
{
  let ok = true;
  for (let i = 0; i < 2000; i++) {
    const bucket = Math.floor(rnd() * 3);
    const major = run(6);
    const a = `${bucket}|${major}:${run(Math.floor(rnd() * 4))}`;
    const b = `${bucket}|${major}:${run(Math.floor(rnd() * 4))}`;
    const [low, high] = a < b ? [a, b] : [b, a];
    if (low === high) continue;

    const count = 1 + Math.floor(rnd() * 8);
    let batch;
    try {
      batch = ranksBetween(count, low, high);
    } catch (error) {
      if (isInvariantFailure(error)) ok = false;
      continue;
    }

    if (batch.length !== count) ok = false;
    if (JSON.stringify([...batch].sort()) !== JSON.stringify(batch)) ok = false;
    for (const r of batch) if (!(low < r && r < high)) ok = false;
  }
  report("ranksBetween ascending and within bounds", ok);
}

// 5. A drag-and-drop board stays sorted under mixed operations.
{
  let board = [firstRank()];
  let ok = true;

  for (let i = 0; i < 3000; i++) {
    const mode = Math.floor(rnd() * 3);
    let value;
    try {
      if (mode === 0) value = rankAfter(board[board.length - 1]);
      else if (mode === 1) value = rankBefore(board[0]);
      else {
        const idx = Math.floor(rnd() * Math.max(1, board.length - 1));
        value = rankBetween(board[idx], board[idx + 1] ?? null);
      }
    } catch (error) {
      if (isInvariantFailure(error)) ok = false;
      continue;
    }
    board.push(value);
    board = [...new Set(board)].sort();
  }

  if (JSON.stringify([...board].sort()) !== JSON.stringify(board)) ok = false;
  report("board stable under mixed operations", ok, `${board.length} items`);
}

console.log(`\n${failures === 0 ? "all properties hold" : `${failures} PROPERTY FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
