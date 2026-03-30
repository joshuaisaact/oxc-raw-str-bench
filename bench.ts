/**
 * Benchmark different `deserializeStr` implementations using real fixture data.
 *
 * Reads all `.mjs` files from `versions` directory, wraps each with boilerplate that
 * provides module-level state (`uint8`, `uint32`, etc.) and `injectState`,
 * writes compiled versions to `versions-compiled` directory, then imports and benchmarks them.
 *
 * To add a new version to the benchmark, just drop a `.mjs` file into `versions` directory.
 *
 * Usage: `node bench.ts`
 */

// eslint-disable no-console, no-await-in-loop

import fs from "node:fs";
import { join as pathJoin } from "node:path";
import { pathToFileURL } from "node:url";
import { loadAllFixtures, ROOT_DIR_PATH } from "./common.ts";

interface Version {
  name: string;
  injectState(buffer: Uint8Array, sourceText: string, sourceByteLen: number): void;
  deserializeStr(pos: number): string;
}

const VERSIONS_DIR = pathJoin(ROOT_DIR_PATH, "versions");
const COMPILED_DIR = pathJoin(ROOT_DIR_PATH, "versions-compiled");

// Version used as baseline for comparison
const BASELINE = "current";

// Versions to skip
const SKIP: string[] = [];

// Total time budget per fixture, per version
const BENCH_TIME_MS = 100;
// Minimum number of timed rounds
const MIN_ROUNDS = 5;
// Number of warmup rounds
const WARMUP_ROUNDS = 5;

async function main() {
  // Compile versions
  const versionNames = compileVersions();

  // Dynamic import of compiled versions
  const versions: Version[] = [];
  for (const name of versionNames) {
    const url = pathToFileURL(pathJoin(COMPILED_DIR, `${name}.mjs`)).href;
    const mod = await import(url);
    versions.push({ name, injectState: mod.injectState, deserializeStr: mod.deserializeStr });
  }

  // Load fixtures
  const fixtures = loadAllFixtures();

  // Benchmark all versions against all fixtures.
  // Collect results first, then format the table with tight column widths.
  const rawTimes: number[][] = []; // rawTimes[fixture][version] in ms

  for (let f = 0; f < fixtures.length; f++) {
    const fixture = fixtures[f];
    console.log(`Benchmarking ${f + 1}/${fixtures.length} ${fixture.name}`);

    const { uint8, sourceText, sourceEndPos, strBinOffsets } = fixture;
    const callsLen = strBinOffsets.length;
    const row: number[] = [];

    for (const version of versions) {
      version.injectState(uint8, sourceText, sourceEndPos);

      // Warmup: run a few cycles to let JIT stabilize, and measure how long
      // a single cycle takes so we can decide how many cycles per timed round
      let warmupTotal = 0;
      for (let r = 0; r < WARMUP_ROUNDS; r++) {
        const start = performance.now();
        for (let i = 0; i < callsLen; i++) {
          version.deserializeStr(strBinOffsets[i]);
        }
        const end = performance.now();
        warmupTotal += end - start;
      }
      const avgCycleTime = warmupTotal / WARMUP_ROUNDS;

      // Choose how many cycles per timed round so each round takes ~50ms.
      // This ensures `performance.now()` overhead is negligible.
      const cyclesPerRound = Math.max(1, Math.round(50 / Math.max(avgCycleTime, 0.001)));

      // Timed rounds - use minimum as the result.
      // The fastest run best represents the code's true speed.
      // Slower runs are slower due to external noise (GC, OS scheduling, etc),
      // not because the code is intrinsically slower.
      let best = Infinity;
      let rounds = 0;
      const deadline = performance.now() + BENCH_TIME_MS;
      while (rounds < MIN_ROUNDS || performance.now() < deadline) {
        const start = performance.now();
        for (let c = 0; c < cyclesPerRound; c++) {
          for (let i = 0; i < callsLen; i++) {
            version.deserializeStr(strBinOffsets[i]);
          }
        }
        const end = performance.now();
        const elapsed = (end - start) / cyclesPerRound;
        best = Math.min(best, elapsed);
        rounds++;
      }

      row.push(best);
    }

    rawTimes.push(row);
  }

  // Format % difference vs baseline, with sign padded to 2 digits
  function formatPctDiff(pct: number): string {
    const sign = pct <= 0 ? "-" : "+";
    const digits = Math.abs(pct).toFixed(0);
    return `(${sign}${digits.padStart(2)}%)`;
  }

  // Format results: time + % difference vs baseline for non-baseline columns
  const fixtureNames = fixtures.map((f) => f.name);
  const formatted = rawTimes.map((row) => {
    const baselineTime = row[0];
    return row.map((t, col) => {
      const time = t.toFixed(3) + "ms";
      if (col === 0) return time;
      const pct = ((t - baselineTime) / baselineTime) * 100;
      return `${time} ${formatPctDiff(pct)}`;
    });
  });

  // "Fastest" column: best version name + its % diff
  const fastestNames: string[] = [];
  const fastestPcts: string[] = [];
  for (const row of rawTimes) {
    const baselineTime = row[0];
    const bestTime = Math.min(...row);
    const bestIdx = row.indexOf(bestTime);
    fastestNames.push(versionNames[bestIdx]);
    if (bestIdx === 0) {
      fastestPcts.push("");
    } else {
      const pct = ((bestTime - baselineTime) / baselineTime) * 100;
      fastestPcts.push(formatPctDiff(pct));
    }
  }

  // Non-ASCII position as percentage of source length.
  // 100% means file is entirely ASCII, lower values mean non-ASCII bytes appear earlier.
  const nonAsciiPcts = fixtures.map((f) => {
    const pct = (f.firstNonAsciiPos / f.sourceEndPos) * 100;
    return pct.toFixed(1) + "%";
  });

  // Print table
  console.log(`\nString deserialization benchmark`);
  console.log(`${BENCH_TIME_MS / 1000}s per fixture per version, minimum of best rounds\n`);

  // Compute minimum column widths
  const sep = " | ";
  const sepLine = "-+-";
  const nameColWidth = Math.max("File".length, ...fixtureNames.map((n) => n.length));
  const nonAsciiHeader = "ASCII";
  const nonAsciiColWidth = Math.max(nonAsciiHeader.length, ...nonAsciiPcts.map((s) => s.length));
  const colWidths = versionNames.map((name, col) => {
    const maxVal = Math.max(...formatted.map((row) => row[col].length));
    return Math.max(name.length, maxVal);
  });
  const fastestHeader = "fastest";
  const fastestNameWidth = Math.max(fastestHeader.length, ...fastestNames.map((s) => s.length));
  const fastestPctWidth = Math.max(...fastestPcts.map((s) => s.length));
  const fastestColWidth = fastestNameWidth + (fastestPctWidth > 0 ? 1 + fastestPctWidth : 0);

  // Header
  const headerParts = [
    "File".padEnd(nameColWidth),
    nonAsciiHeader.padStart(nonAsciiColWidth),
    ...versionNames.map((name, c) => name.padStart(colWidths[c])),
    fastestHeader.padEnd(fastestColWidth),
  ];
  console.log(headerParts.join(sep));

  // Separator
  const sepParts = [
    "-".repeat(nameColWidth),
    "-".repeat(nonAsciiColWidth),
    ...colWidths.map((w) => "-".repeat(w)),
    "-".repeat(fastestColWidth),
  ];
  console.log(sepParts.join(sepLine));

  // Rows
  for (let r = 0; r < fixtureNames.length; r++) {
    const rowParts = [
      fixtureNames[r].padEnd(nameColWidth),
      nonAsciiPcts[r].padStart(nonAsciiColWidth),
      ...colWidths.map((w, c) => formatted[r][c].padStart(w)),
      fastestNames[r].padEnd(fastestNameWidth) +
        (fastestPcts[r] ? " " + fastestPcts[r] : "").padEnd(fastestColWidth - fastestNameWidth),
    ];
    console.log(rowParts.join(sep));
  }
}

const BOILERPLATE_HEAD = `
// oxlint-disable

let uint8, uint32, float64, sourceText, sourceIsAscii, sourceEndPos;

export function injectState(buffer, sourceTextInput, sourceByteLen) {
  uint8 = buffer;
  uint32 = new Uint32Array(buffer.buffer, buffer.byteOffset, buffer.byteLength >> 2);
  float64 = new Float64Array(buffer.buffer, buffer.byteOffset, buffer.byteLength >> 3);

  sourceText = sourceTextInput;
  sourceIsAscii = sourceText.length === sourceByteLen;
  sourceEndPos = sourceByteLen;

  setup();
}

`;

/**
 * Compile versions.
 *
 * Wrap each `.mjs` file in `versions` directory with boilerplate and write to `versions-compiled` directory.
 *
 * @returns Array of version names.
 */
function compileVersions(): string[] {
  fs.mkdirSync(COMPILED_DIR, { recursive: true });

  const skipSet = new Set(SKIP);

  const filenames = fs.readdirSync(VERSIONS_DIR);

  const versionNames: string[] = [];
  for (const filename of filenames) {
    if (!filename.endsWith(".mjs")) continue;
    const name = filename.slice(0, -4);
    if (skipSet.has(name)) continue;

    versionNames.push(name);

    const source = fs.readFileSync(pathJoin(VERSIONS_DIR, filename), "utf8");
    const compiled = BOILERPLATE_HEAD + source;
    fs.writeFileSync(pathJoin(COMPILED_DIR, filename), compiled);
  }

  versionNames.sort((a, b) => {
    // Baseline always first, rest alphabetical
    if (a === BASELINE) return -1;
    if (b === BASELINE) return 1;
    return a.localeCompare(b);
  });

  return versionNames;
}

await main();
