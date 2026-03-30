/**
 * Experiment 31b: Fix boundary case. Use sourceText.substr for source
 * strings in ASCII sources. Use cumulative + bufferAsAscii for the rest.
 */

// oxlint-disable prefer-const

const textDecoder = new TextDecoder("utf-8", { ignoreBOM: true });

let bufferAsAscii;
let nonAsciiCum;

export function setup() {
  const latin1Decoder = new TextDecoder("latin1");
  bufferAsAscii = latin1Decoder.decode(uint8);
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
  if (pos < sourceEndPos && sourceIsAscii) return sourceText.substr(pos, len);
  let end = pos + len;
  if (nonAsciiCum[end] === nonAsciiCum[pos]) return bufferAsAscii.substr(pos, len);
  return textDecoder.decode(uint8.subarray(pos, end));
}
