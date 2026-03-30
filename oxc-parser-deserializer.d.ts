declare module "oxc-parser/src-js/generated/deserialize/ts.js" {
  export function deserializeStrOriginal(pos: number): string;
  export function injectState(buffer: Uint8Array, sourceText: string, sourceByteLen: number): void;
  export function getInstrData(): {
    calls: { pos: number; len: number; str: string }[];
    sourceEndPos: number;
  };
}
