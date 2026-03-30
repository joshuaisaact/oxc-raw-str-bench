// Shared fixture loading for verify and bench scripts.

import fs from "node:fs";
import { join as pathJoin } from "node:path";

export interface Fixture {
  name: string;
  // Combined buffer: [sourceBytes | strDataBytes | padding | strBin]
  uint8: Uint8Array;
  sourceText: string;
  sourceIsAscii: boolean;
  sourceEndPos: number;
  firstNonAsciiPos: number;
  // Byte offsets into `uint8` for each string's descriptor (pos, 0, len, 0)
  strBinOffsets: number[];
  // Expected strings for verification
  strings: string[];
}

export const ROOT_DIR_PATH = import.meta.dirname;
export const FIXTURES_DIR_PATH = pathJoin(ROOT_DIR_PATH, "fixtures");

const textDecoder = new TextDecoder("utf-8", { ignoreBOM: true });
export const decodeStr = textDecoder.decode.bind(textDecoder);

/**
 * Load all fixtures from the fixtures directory.
 */
export function loadAllFixtures(): Fixture[] {
  return fs
    .readdirSync(FIXTURES_DIR_PATH, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => loadFixture(d.name));
}

/**
 * Load a single fixture by name.
 *
 * Builds a combined buffer:
 *   [source bytes] [strData bytes] [padding to 8-byte boundary] [strBin entries]
 *
 * Each strBin entry is 4 x uint32: [pos, 0, len, 0]
 * which matches the layout `deserializeStr` reads from the real buffer.
 */
function loadFixture(name: string): Fixture {
  const dirPath = pathJoin(FIXTURES_DIR_PATH, name);

  const sourceBytes = fs.readFileSync(pathJoin(dirPath, "source.txt"));
  const strDataBytes = fs.readFileSync(pathJoin(dirPath, "strData.txt"));
  const strBinBytes = fs.readFileSync(pathJoin(dirPath, "strBin.bin"));
  const strings: string[] = JSON.parse(fs.readFileSync(pathJoin(dirPath, "strings.json"), "utf8"));

  const stringDataLen = sourceBytes.length + strDataBytes.length;
  // Align strBin start to 8-byte boundary (required for Float64Array view)
  const strBinStart = (stringDataLen + 7) & ~7;
  const totalLen = strBinStart + strBinBytes.length;

  const uint8 = new Uint8Array(totalLen);
  uint8.set(sourceBytes, 0);
  uint8.set(strDataBytes, sourceBytes.length);
  uint8.set(strBinBytes, strBinStart);

  const sourceEndPos = sourceBytes.length;
  const sourceText = decodeStr(sourceBytes);
  const sourceIsAscii = sourceText.length === sourceEndPos;

  // Each strBin entry is 16 bytes (4 x uint32)
  const numStrings = strBinBytes.length / 16;
  const strBinOffsets: number[] = [];
  for (let i = 0; i < numStrings; i++) {
    strBinOffsets.push(strBinStart + i * 16);
  }

  // Find firstNonAsciiPos in the source region
  let firstNonAsciiPos = sourceEndPos;
  for (let i = 0; i < sourceEndPos; i++) {
    if (uint8[i] >= 128) {
      firstNonAsciiPos = i;
      break;
    }
  }

  return {
    name,
    uint8,
    sourceText,
    sourceIsAscii,
    sourceEndPos,
    firstNonAsciiPos,
    strBinOffsets,
    strings,
  };
}
