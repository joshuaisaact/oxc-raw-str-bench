/**
 * Current implementation: Concat loop for short strings, `TextDecoder` for len > 50.
 */

// oxlint-disable prefer-const

const textDecoder = new TextDecoder("utf-8", { ignoreBOM: true }),
  decodeStr = textDecoder.decode.bind(textDecoder);

const { fromCodePoint } = String;

export function setup() {}

export function deserializeStr(pos) {
  let pos32 = pos >> 2,
    len = uint32[pos32 + 2];
  if (len === 0) return "";
  pos = uint32[pos32];
  if (sourceIsAscii && pos < sourceEndPos) return sourceText.substr(pos, len);
  // Longer strings use `TextDecoder`
  // TODO: Find best switch-over point
  let end = pos + len;
  if (len > 50) return decodeStr(uint8.subarray(pos, end));
  // Shorter strings decode by hand to avoid native call
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
