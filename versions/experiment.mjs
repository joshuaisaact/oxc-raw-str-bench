/**
 * Experiment 26: Add lastNonAsciiSrcEnd to extend fast path.
 * Source strings before firstNonAsciiPos: sourceText.substr
 * Source strings after lastNonAsciiSrcEnd: bufferAsAscii.substr (no scan)
 * Source strings between: per-byte scan
 */

// oxlint-disable prefer-const

const textDecoder = new TextDecoder("utf-8", { ignoreBOM: true });

let firstNonAsciiPos;
let lastNonAsciiSrcEnd; // byte pos after last non-ASCII byte in source
let bufferAsAscii;
let strDataIsAscii;

export function setup() {
  firstNonAsciiPos = sourceEndPos;
  lastNonAsciiSrcEnd = 0;
  for (let i = 0; i < sourceEndPos; i++) {
    if (uint8[i] >= 128) {
      if (firstNonAsciiPos === sourceEndPos) firstNonAsciiPos = i;
      lastNonAsciiSrcEnd = i + 1;
    }
  }
  const latin1Decoder = new TextDecoder("latin1");
  bufferAsAscii = latin1Decoder.decode(uint8);
  strDataIsAscii = true;
  for (let i = sourceEndPos; i < uint8.length; i++) {
    if (uint8[i] >= 128) {
      strDataIsAscii = false;
      break;
    }
  }
}

export function deserializeStr(pos) {
  let pos32 = pos >> 2,
    len = uint32[pos32 + 2];
  if (len === 0) return "";
  pos = uint32[pos32];
  // Source strings
  if (pos < sourceEndPos) {
    if (sourceIsAscii || pos + len <= firstNonAsciiPos) {
      return sourceText.substr(pos, len);
    }
    // After all non-ASCII source bytes: guaranteed ASCII
    if (pos >= lastNonAsciiSrcEnd) {
      return bufferAsAscii.substr(pos, len);
    }
    // In the non-ASCII zone: per-byte scan
    let end = pos + len;
    for (let i = pos; i < end; i++) {
      if (uint8[i] >= 128) return textDecoder.decode(uint8.subarray(pos, end));
    }
    return bufferAsAscii.substr(pos, len);
  }
  // Non-source strings
  if (strDataIsAscii) return bufferAsAscii.substr(pos, len);
  let end = pos + len;
  for (let i = pos; i < end; i++) {
    if (uint8[i] >= 128) return textDecoder.decode(uint8.subarray(pos, end));
  }
  return bufferAsAscii.substr(pos, len);
}
