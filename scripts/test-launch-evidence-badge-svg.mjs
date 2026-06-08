#!/usr/bin/env node

// Verifies the embeddable Launch Evidence status-badge SVG: the generator escapes/colors
// correctly, and the /api/launch-evidence/[caseId]/badge.svg route returns a valid 200 SVG
// for verified/watch cases while hiding private/missing cases behind a "not found" badge.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  assertFileExists("src/lib/status-badge-svg.ts");
  assertFileExists("src/app/api/launch-evidence/[caseId]/badge.svg/route.ts");

  // 1) Pure generator behavior.
  const badge = loadTypeScriptModule("src/lib/status-badge-svg.ts");
  assertEqual(badge.colorForStatus("verified"), "#2ea44f", "verified color");
  assertEqual(badge.colorForStatus("watch"), "#dbab09", "watch color");
  assertEqual(badge.colorForStatus("blocked"), "#cb2431", "blocked color");
  assertEqual(badge.colorForStatus("nonsense"), "#6a737d", "unknown status falls back to gray");

  const svg = badge.renderStatusBadgeSvg("launch evidence", "verified", "#2ea44f");
  assertIncludes(svg, "<svg", "renders an svg root");
  assertIncludes(svg, "launch evidence", "renders the label");
  assertIncludes(svg, "verified", "renders the message");
  assertIncludes(svg, "#2ea44f", "renders the fill color");
  assertIncludes(svg, 'role="img"', "is an accessible image");
  assertIncludes(svg, 'aria-label="launch evidence: verified"', "has an aria-label");

  // Pin the layout geometry for a known input so a regression in sectionWidth or the
  // centering math (which a substring check would miss) is caught: sectionWidth math
  // gives label=115, message=66, total=181; message rect x=115; message text x=1480.
  assertIncludes(svg, 'width="181"', "root width matches computed geometry");
  assertIncludes(svg, '<rect x="115" width="66"', "message section rect geometry");
  assertIncludes(svg, 'x="1480"', "message text is centered at the computed offset");
  assertIncludes(svg, 'transform="scale(.1)"', "uses the crisp-text scale trick");

  // XML-special characters must be escaped so the SVG is well-formed — including the
  // attribute-quote characters (" and '), not just & and <>.
  const escaped = badge.renderStatusBadgeSvg("a&b\"q'", "<x>\"'", "#000000");
  assertIncludes(escaped, "a&amp;b", "ampersand escaped in label");
  assertIncludes(escaped, "&lt;x&gt;", "angle brackets escaped in message");
  assertIncludes(escaped, "&quot;", "double-quote escaped");
  assertIncludes(escaped, "&apos;", "apostrophe escaped");
  assertTrue(!escaped.includes("<x>"), "raw unescaped message must not appear");

  // The `color` argument must never be able to break out of the fill="" attribute:
  // a non-hex value falls back to a safe neutral gray.
  const malicious = badge.renderStatusBadgeSvg("launch evidence", "verified", '#000"/><script>alert(1)</script>');
  assertTrue(!malicious.includes("<script>"), "malicious color cannot inject markup");
  assertIncludes(malicious, 'fill="#6a737d"', "non-hex color falls back to neutral gray");

  // 2) Route behavior over real fixture cases.
  const launchEvidence = loadTypeScriptModule("src/lib/launch-evidence.ts");
  const route = loadTypeScriptModule("src/app/api/launch-evidence/[caseId]/badge.svg/route.ts");
  const index = launchEvidence.createLaunchEvidenceIndex();

  const verifiedCase = index.cases.find(
    (candidate) => candidate.visibility !== "private" && candidate.report.summaryStatus === "verified"
  );
  const watchCase = index.cases.find(
    (candidate) => candidate.visibility !== "private" && candidate.report.summaryStatus === "watch"
  );
  const privateCase = index.cases.find((candidate) => candidate.visibility === "private");
  assertNonEmpty(verifiedCase?.caseId, "a public verified case exists");
  assertNonEmpty(watchCase?.caseId, "a public watch case exists");
  assertNonEmpty(privateCase?.caseId, "a private case exists");

  const verifiedRes = await callRoute(route, verifiedCase.caseId);
  assertEqual(verifiedRes.status, 200, "verified badge is 200");
  assertEqual(
    verifiedRes.headers.get("content-type"),
    "image/svg+xml; charset=utf-8",
    "verified badge content-type"
  );
  const verifiedBody = await verifiedRes.text();
  assertIncludes(verifiedBody, "verified", "verified badge shows status");
  assertIncludes(verifiedBody, "#2ea44f", "verified badge is green");
  assertIncludes(verifiedBody, "launch evidence", "verified badge has label");

  const watchRes = await callRoute(route, watchCase.caseId);
  assertEqual(watchRes.status, 200, "watch badge is 200");
  const watchBody = await watchRes.text();
  assertIncludes(watchBody, "watch", "watch badge shows status");
  assertIncludes(watchBody, "#dbab09", "watch badge is yellow");

  // Missing case → valid 200 SVG that says "not found" (never a broken <img>).
  const missingRes = await callRoute(route, "definitely-not-a-real-case-id");
  assertEqual(missingRes.status, 200, "missing badge is still 200");
  assertEqual(
    missingRes.headers.get("content-type"),
    "image/svg+xml; charset=utf-8",
    "missing badge is svg"
  );
  const missingBody = await missingRes.text();
  assertIncludes(missingBody, "not found", "missing badge says not found");

  // Private case must be indistinguishable from missing — no status leak.
  const privateRes = await callRoute(route, privateCase.caseId);
  assertEqual(privateRes.status, 200, "private badge is 200");
  const privateBody = await privateRes.text();
  assertIncludes(privateBody, "not found", "private badge is hidden as not found");
  assertTrue(
    !privateBody.includes(privateCase.report.summaryStatus),
    "private badge must not leak its real status"
  );

  console.log("launch-evidence badge svg: all assertions passed");
}

async function callRoute(route, caseId) {
  return route.GET(new Request(`https://nocksperimental.com/api/launch-evidence/${caseId}/badge.svg`), {
    params: Promise.resolve({ caseId })
  });
}

function loadTypeScriptModule(relativePath) {
  const modulePath = path.join(process.cwd(), relativePath);
  assertFileExists(relativePath);

  if (moduleCache.has(modulePath)) {
    return moduleCache.get(modulePath).exports;
  }

  const source = readFileSync(modulePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      resolveJsonModule: true,
      target: ts.ScriptTarget.ES2020
    },
    fileName: modulePath
  }).outputText;

  const compiled = { exports: {} };
  moduleCache.set(modulePath, compiled);

  const run = new Function("exports", "require", "module", "__filename", "__dirname", output);
  run(compiled.exports, createModuleRequire(), compiled, modulePath, path.dirname(modulePath));

  return compiled.exports;
}

function createModuleRequire() {
  return (specifier) => {
    if (specifier.startsWith("@/")) {
      return loadAliasModule(specifier);
    }
    return require(specifier);
  };
}

function loadAliasModule(specifier) {
  const aliasPath = path.join(process.cwd(), "src", specifier.slice(2));
  const jsonPath = `${aliasPath}.json`;
  const tsPath = `${aliasPath}.ts`;
  const tsxPath = `${aliasPath}.tsx`;

  if (existsSync(aliasPath) && path.extname(aliasPath) === ".json") {
    return require(aliasPath);
  }
  if (existsSync(aliasPath) && [".ts", ".tsx"].includes(path.extname(aliasPath))) {
    return loadTypeScriptModule(path.relative(process.cwd(), aliasPath));
  }
  if (existsSync(jsonPath)) {
    return require(jsonPath);
  }
  if (existsSync(tsPath)) {
    return loadTypeScriptModule(path.relative(process.cwd(), tsPath));
  }
  if (existsSync(tsxPath)) {
    return loadTypeScriptModule(path.relative(process.cwd(), tsxPath));
  }
  throw new Error(`Unsupported module alias: ${specifier}`);
}

function assertFileExists(relativePath) {
  if (!existsSync(path.join(process.cwd(), relativePath))) {
    throw new Error(`Missing required file: ${relativePath}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertIncludes(haystack, needle, label) {
  if (typeof haystack !== "string" || !haystack.includes(needle)) {
    throw new Error(`${label}: expected to include ${JSON.stringify(needle)}`);
  }
}

function assertNonEmpty(value, label) {
  if (value === undefined || value === null || value === "") {
    throw new Error(`${label}: expected a non-empty value`);
  }
}

function assertTrue(value, label) {
  if (!value) {
    throw new Error(`${label}: expected true`);
  }
}
