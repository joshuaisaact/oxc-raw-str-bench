/**
 * Experiment 30: Simplified - remove firstNonAsciiPos/lastNonAsciiSrcEnd.
 * Use only cumulative count for all non-sourceIsAscii cases.
 */

// oxlint-disable prefer-const

const textDecoder = new TextDecoder("utf-8", { ignoreBOM: true });

let bufferAsAscii;
let nonAsciiCum;

export function setup() {
  const latin1Decoder = new TextDecoder("latin1");
  bufferAsAscii = latin1Decoder.decode(uint8);
  // Build cumulative non-ASCII count for entire buffer
  nonAsciiCum = new Uint32Array(uint8.length + 1);
  let count = 0;
  for (let i = 0; i < uint8.length; i++) {
    nonAsciiCum[i] = count;
    if (uint8[i] >= 128) count++;
  }
  nonAsciiCum[uint8.length] = count;
}

export function deserializeStr(pos) {
  let pos32 = pos >> 2,
    len = uint32[pos32 + 2];
  if (len === 0) return "";
  pos = uint32[pos32];
  // Source strings with ASCII source
  if (pos < sourceEndPos && sourceIsAscii) {
    return sourceText.substr(pos, len);
  }
  // O(1) ASCII check using cumulative count
  let end = pos + len;
  if (nonAsciiCum[end] === nonAsciiCum[pos]) {
    return bufferAsAscii.substr(pos, len);
  }
  // Non-ASCII: need to check if it's a source string
  if (pos < sourceEndPos) {
    // Use TextDecoder for source strings (sourceText.substr won't work without byteToChar mapping)
    return textDecoder.decode(uint8.subarray(pos, end));
  }
  return textDecoder.decode(uint8.subarray(pos, end));
}
