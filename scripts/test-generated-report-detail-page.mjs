#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import process from "node:process";

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const pageSource = await readFile("src/app/reports/generated/[appSlug]/page.tsx", "utf8");
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));

  assertIncludes(pageSource, "Verification Actions", "verification actions heading");
  assertIncludes(pageSource, "Evidence Bundle", "evidence bundle link label");
  assertIncludes(pageSource, "Provenance", "provenance link label");
  assertIncludes(pageSource, "Verify Hash", "verify hash link label");
  assertIncludes(
    pageSource,
    "const verificationHref",
    "prefilled verifier URL is assembled on the detail page"
  );
  assertIncludes(
    pageSource,
    "encodeURIComponent(entry.reportHash)",
    "report hash is URL encoded for verifier link"
  );
  assertIncludes(
    pageSource,
    "encodeURIComponent(entry.snapshotRoot)",
    "snapshot root is URL encoded for verifier link"
  );
  assertIncludes(
    pageSource,
    "encodeURIComponent(entry.appSlug)",
    "app slug is URL encoded for verifier link"
  );
  assertIncludes(
    pageSource,
    'href={`/api/reports/generated/${entry.appSlug}/evidence`}',
    "detail page links to the evidence bundle endpoint"
  );
  assertIncludes(
    pageSource,
    'href={`/api/reports/generated/${entry.appSlug}/provenance`}',
    "detail page links to the provenance endpoint"
  );
  assertIncludes(
    pageSource,
    "href={verificationHref}",
    "detail page links to the prefilled verifier endpoint"
  );
  assertIncludes(
    packageJson.scripts.test,
    "test:generated-report-detail-page",
    "full test suite includes generated report detail page test"
  );
}

function assertIncludes(source, expected, label) {
  if (!source.includes(expected)) {
    throw new Error(`${label}: missing ${JSON.stringify(expected)}`);
  }
}
