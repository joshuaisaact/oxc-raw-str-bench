/**
 * Experiment 24: Minimize branching. Use bufferAsAscii as default,
 * only check for non-ASCII when the string might contain it.
 * Pre-compute firstNonAsciiBufPos to cover entire buffer.
 */

// oxlint-disable prefer-const

const textDecoder = new TextDecoder("utf-8", { ignoreBOM: true });

let firstNonAsciiPos;
let firstNonAsciiBufPos; // first non-ASCII byte in entire buffer
let bufferAsAscii;

export function setup() {
  firstNonAsciiPos = sourceEndPos;
  firstNonAsciiBufPos = uint8.length;
  for (let i = 0; i < uint8.length; i++) {
    if (uint8[i] >= 128) {
      if (i < sourceEndPos && firstNonAsciiPos === sourceEndPos) {
        firstNonAsciiPos = i;
      }
      if (firstNonAsciiBufPos === uint8.length) {
        firstNonAsciiBufPos = i;
      }
      if (firstNonAsciiPos < sourceEndPos) break;
    }
  }
  const latin1Decoder = new TextDecoder("latin1");
  bufferAsAscii = latin1Decoder.decode(uint8);
}

export function deserializeStr(pos) {
  let pos32 = pos >> 2,
    len = uint32[pos32 + 2];
  if (len === 0) return "";
  pos = uint32[pos32];
  // Source string in ASCII prefix: use sourceText (handles byte=char offset)
  if (pos + len <= firstNonAsciiPos) return sourceText.substr(pos, len);
  // String ends before any non-ASCII in buffer: use bufferAsAscii
  if (pos + len <= firstNonAsciiBufPos) return bufferAsAscii.substr(pos, len);
  // Need to check: might be ASCII (after non-ASCII region) or non-ASCII
  let end = pos + len;
  for (let i = pos; i < end; i++) {
    if (uint8[i] >= 128) {
      // Non-ASCII: source strings use sourceText via TextDecoder, others use TextDecoder
      return textDecoder.decode(uint8.subarray(pos, end));
    }
  }
  // All ASCII: use bufferAsAscii
  return bufferAsAscii.substr(pos, len);
}
