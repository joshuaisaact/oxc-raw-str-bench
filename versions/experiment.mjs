/**
 * Experiment 4: For short ASCII strings (<=9 bytes), collect char codes
 * and use a single fromCharCode call. Falls back to TextDecoder on non-ASCII.
 */

// oxlint-disable prefer-const

const textDecoder = new TextDecoder("utf-8", { ignoreBOM: true });

const { fromCharCode } = String;

let firstNonAsciiPos;

export function setup() {
  firstNonAsciiPos = sourceEndPos;
  for (let i = 0; i < sourceEndPos; i++) {
    if (uint8[i] >= 128) {
      firstNonAsciiPos = i;
      break;
    }
  }
}

export function deserializeStr(pos) {
  let pos32 = pos >> 2,
    len = uint32[pos32 + 2];
  if (len === 0) return "";
  pos = uint32[pos32];
  if (pos < sourceEndPos && (sourceIsAscii || pos + len <= firstNonAsciiPos)) {
    return sourceText.substr(pos, len);
  }
  let end = pos + len;
  if (len > 9) return textDecoder.decode(uint8.subarray(pos, end));
  // Check if all bytes are ASCII first
  let allAscii = true;
  for (let i = pos; i < end; i++) {
    if (uint8[i] >= 128) { allAscii = false; break; }
  }
  if (allAscii) {
    // Single fromCharCode call with all codes
    switch (len) {
      case 1: return fromCharCode(uint8[pos]);
      case 2: return fromCharCode(uint8[pos], uint8[pos+1]);
      case 3: return fromCharCode(uint8[pos], uint8[pos+1], uint8[pos+2]);
      case 4: return fromCharCode(uint8[pos], uint8[pos+1], uint8[pos+2], uint8[pos+3]);
      case 5: return fromCharCode(uint8[pos], uint8[pos+1], uint8[pos+2], uint8[pos+3], uint8[pos+4]);
      case 6: return fromCharCode(uint8[pos], uint8[pos+1], uint8[pos+2], uint8[pos+3], uint8[pos+4], uint8[pos+5]);
      case 7: return fromCharCode(uint8[pos], uint8[pos+1], uint8[pos+2], uint8[pos+3], uint8[pos+4], uint8[pos+5], uint8[pos+6]);
      case 8: return fromCharCode(uint8[pos], uint8[pos+1], uint8[pos+2], uint8[pos+3], uint8[pos+4], uint8[pos+5], uint8[pos+6], uint8[pos+7]);
      case 9: return fromCharCode(uint8[pos], uint8[pos+1], uint8[pos+2], uint8[pos+3], uint8[pos+4], uint8[pos+5], uint8[pos+6], uint8[pos+7], uint8[pos+8]);
    }
  }
  return textDecoder.decode(uint8.subarray(pos, end));
}
