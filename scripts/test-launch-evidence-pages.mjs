#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

main();

function main() {
  const indexPage = readText("src/app/launch-evidence/page.tsx");
  const detailPage = readText("src/app/launch-evidence/[caseId]/page.tsx");
  const workspacePage = readText("src/app/workspaces/[workspaceSlug]/page.tsx");

  assertIncludes(indexPage, "Launch Evidence", "launch evidence index page title");
  assertIncludes(detailPage, "Launch Evidence", "launch evidence detail page title");
  assertIncludes(workspacePage, "Launch Evidence", "workspace detail launch evidence copy");
  assertIncludes(indexPage, "createLaunchEvidenceIndex", "launch evidence index page data source");
  assertIncludes(detailPage, "launchEvidenceCaseForId", "launch evidence detail page data source");
  assertIncludes(workspacePage, "launchEvidenceCasesForWorkspace", "workspace detail launch evidence data source");
}

function readText(relativePath) {
  const filePath = path.join(process.cwd(), relativePath);

  if (!existsSync(filePath)) {
    throw new Error(`Missing required file: ${relativePath}`);
  }

  return readFileSync(filePath, "utf8");
}

function assertIncludes(actual, expected, label) {
  if (!actual?.includes(expected)) {
    throw new Error(`${label}: expected ${JSON.stringify(actual)} to include ${JSON.stringify(expected)}`);
  }
}
