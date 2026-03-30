/**
 * PR #20834 + `firstNonAsciiPos`: extends `substr` fast path into non-ASCII sources.
 */

// oxlint-disable prefer-const

const textDecoder = new TextDecoder("utf-8", { ignoreBOM: true }),
  decodeStr = textDecoder.decode.bind(textDecoder);

const { fromCodePoint } = String;

let firstNonAsciiPos;

export function setup() {
  // Find first non-ASCII byte in source region
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
  if (len > 9) return decodeStr(uint8.subarray(pos, end));
  let out = "",
    c;
  do {
    c = uint8[pos++];
    if (c < 128) out += fromCodePoint(c);
    else {
      out += decodeStr(uint8.subarray(pos - 1, end));
      break;
    }
  } while (pos < end);
  return out;
}
