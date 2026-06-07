#!/usr/bin/env node

// Build step for the `nocklab` package. Copies the source-of-truth runner + fixture
// builder + fixture schema from the repo root into this package so the published
// tarball is always a fresh copy (run at prepack / prepublishOnly). Keeping the
// originals in the repo's scripts/ means the root app's tests, npm scripts, and bin
// stay byte-identical; this package is a thin, properly-named distribution of the
// same runner. The copied bin/ + schemas/ + the tsc-emitted dist/ are gitignored.
//
// Geometry matters: run-lab.mjs imports "./fixture-builder.mjs" (a sibling) and
// fixture-builder.mjs reads "../schemas/nockapp-lab-fixture.schema.json". So the two
// .mjs files must land in the same dir (bin/) and the schema one level up (schemas/).

import { copyFileSync, mkdirSync, chmodSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageDir, "..", "..");

mkdirSync(path.join(packageDir, "bin"), { recursive: true });
mkdirSync(path.join(packageDir, "schemas"), { recursive: true });

const copies = [
  { from: "scripts/run-lab.mjs", to: "bin/nocklab.mjs", executable: true },
  { from: "scripts/fixture-builder.mjs", to: "bin/fixture-builder.mjs", executable: false },
  {
    from: "schemas/nockapp-lab-fixture.schema.json",
    to: "schemas/nockapp-lab-fixture.schema.json",
    executable: false
  }
];

for (const { from, to, executable } of copies) {
  const dest = path.join(packageDir, to);
  copyFileSync(path.join(repoRoot, from), dest);
  if (executable) {
    chmodSync(dest, 0o755);
  }
}

console.log("nocklab: copied runner + fixture-builder + fixture schema from repo root");
