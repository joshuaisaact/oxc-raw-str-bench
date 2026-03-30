/**
 * Experiment 1: Use String.fromCharCode instead of fromCodePoint for ASCII,
 * and inline TextDecoder.decode to avoid bound function overhead.
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
  let out = "",
    c;
  do {
    c = uint8[pos++];
    if (c < 128) out += fromCharCode(c);
    else {
      out += textDecoder.decode(uint8.subarray(pos - 1, end));
      break;
    }
  } while (pos < end);
  return out;
}
