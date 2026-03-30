/**
 * Experiment 29: Pre-compute cumulative non-ASCII byte count.
 * O(1) ASCII check for any range: nonAsciiCum[end] - nonAsciiCum[pos] === 0.
 */

// oxlint-disable prefer-const

const textDecoder = new TextDecoder("utf-8", { ignoreBOM: true });

let firstNonAsciiPos;
let lastNonAsciiSrcEnd;
let bufferAsAscii;
let strDataIsAscii;
let nonAsciiCum; // cumulative non-ASCII count

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
  if (pos < sourceEndPos) {
    if (sourceIsAscii || pos + len <= firstNonAsciiPos) {
      return sourceText.substr(pos, len);
    }
    if (pos >= lastNonAsciiSrcEnd) {
      return bufferAsAscii.substr(pos, len);
    }
    // O(1) ASCII check using cumulative count
    let end = pos + len;
    if (nonAsciiCum[end] === nonAsciiCum[pos]) {
      return bufferAsAscii.substr(pos, len);
    }
    return textDecoder.decode(uint8.subarray(pos, end));
  }
  if (strDataIsAscii) return bufferAsAscii.substr(pos, len);
  let end = pos + len;
  if (nonAsciiCum[end] === nonAsciiCum[pos]) {
    return bufferAsAscii.substr(pos, len);
  }
  return textDecoder.decode(uint8.subarray(pos, end));
}
