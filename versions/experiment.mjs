/**
 * Experiment 15: Pre-decode the entire buffer as ASCII in setup().
 * For any ASCII string, use substr from the pre-decoded string.
 * Only fall back to TextDecoder for non-ASCII.
 */

// oxlint-disable prefer-const

const textDecoder = new TextDecoder("utf-8", { ignoreBOM: true });

const { fromCharCode } = String;

let firstNonAsciiPos;
let bufferAsAscii;

export function setup() {
  firstNonAsciiPos = sourceEndPos;
  for (let i = 0; i < sourceEndPos; i++) {
    if (uint8[i] >= 128) {
      firstNonAsciiPos = i;
      break;
    }
  }
  // Pre-decode entire buffer as latin1 (bytes as char codes).
  // For ASCII bytes this gives the correct string.
  // Build using TextDecoder('latin1') which is extremely fast.
  const latin1Decoder = new TextDecoder("latin1");
  bufferAsAscii = latin1Decoder.decode(uint8);
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
  // Check if all bytes are ASCII
  let allAscii = true;
  for (let i = pos; i < end; i++) {
    if (uint8[i] >= 128) { allAscii = false; break; }
  }
  if (allAscii) return bufferAsAscii.substr(pos, len);
  return textDecoder.decode(uint8.subarray(pos, end));
}
