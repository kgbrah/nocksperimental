#!/usr/bin/env node
// Gate for the named rejection-code vocabulary (src/lib/nock-rejection-codes.ts)
// and its fixture/report wiring: a negative-control fixture can name the exact
// consensus reason it models, schemas carry the field, and the lab runner
// surfaces it into the report summary (verified via run-lab on the fixture).

import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { createTsLoader } from "./lib/load-ts-module.mjs";

const REPO = process.cwd();
const { loadTS } = createTsLoader(REPO);
let pass = 0;
const ok = (c, m) => {
  if (!c) throw new Error("FAIL: " + m);
  console.log("  ✓ " + m);
  pass += 1;
};

try {
  main();
} catch (e) {
  console.error(e);
  process.exitCode = 1;
}

function main() {
  const R = loadTS("src/lib/nock-rejection-codes.ts");
  const CODES = ["%v1-input-missing", "%v1-spend-version-mismatch", "%v1-spend-1-lock-failed", "%v1-note-data-exceeds-max-size"];

  console.log("1. vocabulary");
  ok(R.KNOWN_REJECTION_CODES.length === 4, "four documented rejection codes");
  for (const code of CODES) {
    ok(R.isKnownRejectionCode(code), `recognizes ${code}`);
    ok(typeof R.describeRejectionCode(code) === "string", `${code} has a description`);
  }
  ok(!R.isKnownRejectionCode("%v1-made-up"), "an unknown code is not recognized");
  ok(!R.isKnownRejectionCode(null) && R.describeRejectionCode("nope") === null, "non-codes are handled");

  console.log("2. the negative-control fixture names a known code");
  const fx = JSON.parse(readFileSync(path.join(REPO, "fixtures/attack-v1-note-data-exceeds-max-size.lab.json"), "utf8"));
  ok(fx.expectRejected === true, "fixture is a negative control (expectRejected:true)");
  ok(R.isKnownRejectionCode(fx.rejectionCode), `fixture.rejectionCode (${fx.rejectionCode}) is in the vocabulary`);

  console.log("3. schemas carry rejectionCode");
  const fxSchema = JSON.parse(readFileSync(path.join(REPO, "schemas/nockapp-lab-fixture.schema.json"), "utf8"));
  ok(Boolean(fxSchema.properties.rejectionCode), "fixture schema defines rejectionCode");
  const rptSchema = JSON.parse(readFileSync(path.join(REPO, "schemas/nockapp-lab-report.schema.json"), "utf8"));
  ok(Boolean(rptSchema.properties.summary.properties.rejectionCode), "report summary schema defines rejectionCode");

  console.log("4. runner surfaces it + the negative control reads green");
  const outPath = path.join(REPO, ".nocklab", "test-rejection-codes-report.json");
  execFileSync(process.execPath, ["scripts/run-lab.mjs", "fixtures/attack-v1-note-data-exceeds-max-size.lab.json", "--out", outPath], {
    cwd: REPO,
    stdio: "ignore",
  });
  const report = JSON.parse(readFileSync(outPath, "utf8"));
  ok(report.summary.rejectionCode === fx.rejectionCode, "report.summary.rejectionCode mirrors the fixture");
  ok(report.summary.status === "pass" && report.summary.rawStatus === "fail", "caught violation inverts to a green proof-of-prevention");

  console.log(`\ntest-rejection-codes: all ${pass} assertions passed`);
}
