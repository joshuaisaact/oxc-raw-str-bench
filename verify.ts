/**
 * Verify that fixture data created by `construct.ts` produces the correct strings.
 *
 * Loads each fixture, injects its buffer into `oxc-parser`'s original `deserializeStr`,
 * and compares each result against the expected string.
 *
 * Usage: `node verify.ts`
 */

// oxlint-disable no-console

import { loadAllFixtures } from "./common.ts";
import { injectState, deserializeStrOriginal } from "oxc-parser/src-js/generated/deserialize/ts.js";

const fixtures = loadAllFixtures();

let allPassed = true;

for (const fixture of fixtures) {
  const { name, uint8, sourceText, sourceEndPos, strBinOffsets, strings } = fixture;

  console.log(`--------------------\n${name}\n--------------------`);

  // Inject our buffer into the deserializer's module-level state
  injectState(uint8, sourceText, sourceEndPos);

  let failures = 0;

  for (let i = 0; i < strBinOffsets.length; i++) {
    const str = deserializeStrOriginal(strBinOffsets[i]);
    if (str !== strings[i]) {
      if (failures < 5) {
        console.error(
          `MISMATCH [${i}]:\n` +
            `  pos:      ${strBinOffsets[i]}\n` +
            `  expected: ${JSON.stringify(strings[i])}\n` +
            `  got:      ${JSON.stringify(str)}\n`,
        );
      }
      failures++;
    }
  }

  if (failures === 0) {
    console.log(`${strings.length} strings verified OK\n`);
  } else {
    console.error(`${failures}/${strings.length} FAILED\n`);
    allPassed = false;
  }
}

console.log("--------------------");
if (allPassed) {
  console.log("All fixtures verified OK");
} else {
  console.log("Some fixtures FAILED verification");
  process.exitCode = 1;
}
