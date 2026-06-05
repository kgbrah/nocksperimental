#!/usr/bin/env node

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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
  const tempDir = mkdtempSync(path.join(tmpdir(), "nock-trust-audit-api-"));
  const auditPath = path.join(tempDir, "trust-update-audit.json");
  const missingAuditPath = path.join(tempDir, "missing-audit.json");

  try {
    process.env.NOCKS_REGISTRY_UPDATE_KEYS = "reader-key:reader-secret,writer-key:writer-secret";
    delete process.env.NOCKS_REGISTRY_UPDATE_KEY;
    process.env.NOCKS_REGISTRY_UPDATE_AUDIT_PATH = auditPath;

    writeFileSync(
      auditPath,
      `${JSON.stringify(
        {
          version: "v0",
          source: "src/app/api/trust/updates",
          events: [
            {
              sequence: 1,
              updateId: "update-score-history-v1",
              action: "score-history",
              target: "score-history",
              actor: "audit-reader-test",
              keyId: "writer-key",
              recordedAt: "2026-05-30T02:20:00.000Z",
              previousRoot: "root-score-history-v0",
              rootHash: "root-score-history-v1",
              entryHash: "sha256:test-entry-one",
              persisted: true,
              writePath: auditPath,
              eventHash: "sha256:test-audit-one"
            },
            {
              sequence: 2,
              updateId: "update-score-history-v2",
              action: "score-history",
              target: "score-history",
              actor: "audit-reader-test",
              keyId: "writer-key",
              recordedAt: "2026-05-30T02:25:00.000Z",
              previousRoot: "root-score-history-v1",
              rootHash: "root-score-history-v2",
              entryHash: "sha256:test-entry-two",
              persisted: true,
              writePath: auditPath,
              eventHash: "sha256:test-audit-two"
            }
          ]
        },
        null,
        2
      )}\n`
    );

    const { GET } = loadTypeScriptModule("src/app/api/trust/updates/audit/route.ts");

    const unauthorized = await GET(createRequest());
    const unauthorizedBody = await unauthorized.json();
    assertEqual(unauthorized.status, 401, "audit reader unauthorized status");
    assertEqual(unauthorizedBody.error, "unauthorized registry update", "audit reader unauthorized error");

    const wrongKey = await GET(createRequest("writer-secret", "reader-key"));
    assertEqual(wrongKey.status, 401, "audit reader wrong key status");

    const authorized = await GET(createRequest("reader-secret", "reader-key"));
    const authorizedBody = await authorized.json();

    assertEqual(authorized.status, 200, "audit reader status");
    assertEqual(authorizedBody.configured, true, "audit reader configured flag");
    assertEqual(authorizedBody.source, "src/app/api/trust/updates", "audit reader source");
    assertEqual(authorizedBody.eventCount, 2, "audit reader event count");
    assertEqual(authorizedBody.latestEvent.updateId, "update-score-history-v2", "audit reader latest update");
    assertEqual(authorizedBody.latestEvent.keyId, "writer-key", "audit reader latest key id");
    assertEqual(authorizedBody.events.length, 2, "audit reader events length");
    assertEqual(authorizedBody.events[0].eventHash.startsWith("sha256:"), true, "audit reader event hash");
    assertEqual(authorizedBody.events[0].secret, undefined, "audit reader omits secrets");

    process.env.NOCKS_REGISTRY_UPDATE_AUDIT_PATH = missingAuditPath;
    const missing = await GET(createRequest("reader-secret", "reader-key"));
    const missingBody = await missing.json();

    assertEqual(missing.status, 200, "missing audit file status");
    assertEqual(missingBody.configured, true, "missing audit file configured flag");
    assertEqual(missingBody.eventCount, 0, "missing audit file event count");
    assertEqual(missingBody.events.length, 0, "missing audit file events length");

    delete process.env.NOCKS_REGISTRY_UPDATE_AUDIT_PATH;
    const unconfigured = await GET(createRequest("reader-secret", "reader-key"));
    const unconfiguredBody = await unconfigured.json();

    assertEqual(unconfigured.status, 200, "unconfigured audit status");
    assertEqual(unconfiguredBody.configured, false, "unconfigured audit flag");
    assertEqual(unconfiguredBody.eventCount, 0, "unconfigured audit event count");
  } finally {
    delete process.env.NOCKS_REGISTRY_UPDATE_KEYS;
    delete process.env.NOCKS_REGISTRY_UPDATE_KEY;
    delete process.env.NOCKS_REGISTRY_UPDATE_AUDIT_PATH;
    rmSync(tempDir, { force: true, recursive: true });
  }
}

function createRequest(token, keyId) {
  const headers = token ? { "x-nocks-registry-key": token } : {};
  if (keyId) {
    headers["x-nocks-registry-key-id"] = keyId;
  }

  return {
    headers: new Headers(headers)
  };
}

function loadTypeScriptModule(relativePath) {
  const modulePath = path.join(process.cwd(), relativePath);

  if (moduleCache.has(modulePath)) {
    return moduleCache.get(modulePath).exports;
  }

  const source = readFileSync(modulePath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
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
    if (specifier === "next/server") {
      return {
        NextResponse: {
          json: (body, init = {}) => ({
            status: init.status ?? 200,
            json: async () => body
          })
        }
      };
    }

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

  if (existsSync(aliasPath) && path.extname(aliasPath) === ".json") {
    return require(aliasPath);
  }

  if (existsSync(aliasPath) && path.extname(aliasPath) === ".ts") {
    return loadTypeScriptModule(path.relative(process.cwd(), aliasPath));
  }

  if (existsSync(jsonPath)) {
    return require(jsonPath);
  }

  if (existsSync(tsPath)) {
    return loadTypeScriptModule(path.relative(process.cwd(), tsPath));
  }

  throw new Error(`Unsupported module alias: ${specifier}`);
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}
