#!/usr/bin/env node

import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();

// Exercises DEMO signing (the public dev seed) on the append path. Opt in explicitly; such
// signatures are non-authoritative — the verifier rejects dev keys as a live trust anchor.
process.env.NOCKS_ALLOW_DEV_SIGNING = "1";

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  process.env.NOCKS_REGISTRY_UPDATE_KEY = "test-registry-key";
  delete process.env.NOCKS_REGISTRY_UPDATE_WRITE_PATH;
  delete process.env.NOCKS_REGISTRY_UPDATE_AUDIT_PATH;
  const { POST } = loadTypeScriptModule("src/app/api/trust/updates/route.ts");
  const { trustUpdateLog } = loadTypeScriptModule("src/lib/trust-update-log.ts");

  const payload = {
    id: "update-score-history-v1",
    action: "score-history",
    target: "score-history",
    targetPath: "src/data/trust-score-history.json",
    recordedAt: "2026-05-30T02:20:00.000Z",
    rootHash: "root-score-history-v1",
    summary: "Recorded a follow-up score history batch through the protected append API."
  };

  const unauthorized = await POST(createRequest(payload));
  const unauthorizedBody = await unauthorized.json();
  assertEqual(unauthorized.status, 401, "unauthorized status");
  assertEqual(unauthorizedBody.error, "unauthorized registry update", "unauthorized error");

  const authorized = await POST(createRequest(payload, "test-registry-key"));
  const authorizedBody = await authorized.json();
  const appendedEntry = authorizedBody.entry;

  assertEqual(authorized.status, 200, "authorized status");
  assertEqual(authorizedBody.persisted, false, "append API does not persist static data");
  assertEqual(authorizedBody.validation.isAppendOnly, true, "append API validation");
  assertEqual(authorizedBody.chain.entryCount, 6, "append API candidate entry count");
  assertEqual(authorizedBody.chain.latestRoot, "root-score-history-v1", "append API latest root");
  assertEqual(authorizedBody.audit.persisted, false, "preview audit is not persisted");
  assertEqual(authorizedBody.audit.event.updateId, "update-score-history-v1", "preview audit update id");
  assertEqual(authorizedBody.audit.event.persisted, false, "preview audit event persisted flag");
  assertEqual(appendedEntry.sequence, 6, "append API entry sequence");
  assertEqual(appendedEntry.previousRoot, "root-game-badge-issuance-v0", "append API previous root");
  assertEqual(appendedEntry.signature.verificationStatus, "valid", "append API signature status");
  assertEqual(trustUpdateLog.chain.entryCount, 5, "append API does not mutate imported log");

  await assertMalformedBodyRejected(POST, "test-registry-key");
  await assertUnauthenticatedMalformedBodyStillRejected(POST);

  const tempDir = mkdtempSync(path.join(tmpdir(), "nock-trust-update-api-"));
  const writePath = path.join(tempDir, "trust-update-log.json");
  const auditPath = path.join(tempDir, "trust-update-audit.json");

  try {
    writeFileSync(writePath, readFileSync("src/data/trust-update-log.json", "utf8"));
    process.env.NOCKS_REGISTRY_UPDATE_WRITE_PATH = writePath;
    process.env.NOCKS_REGISTRY_UPDATE_AUDIT_PATH = auditPath;

    const persisted = await POST(createRequest(payload, "test-registry-key", "test-operator"));
    const persistedBody = await persisted.json();
    const writtenLog = JSON.parse(readFileSync(writePath, "utf8"));
    const auditLog = JSON.parse(readFileSync(auditPath, "utf8"));

    assertEqual(persisted.status, 200, "persisted append status");
    assertEqual(persistedBody.persisted, true, "append API persists when write path is configured");
    assertEqual(persistedBody.storage.writePath, writePath, "append API storage write path");
    assertEqual(persistedBody.audit.persisted, true, "append API persists audit event");
    // Audit actor is the VERIFIED key (legacy sentinel here), never the caller-supplied
    // x-nocks-registry-actor header — even though createRequest sent "test-operator".
    assertEqual(persistedBody.audit.event.actor, "legacy", "append API audit actor is the verified key, not the client header");
    assertEqual(persistedBody.audit.event.updateId, "update-score-history-v1", "append API audit update id");
    assertEqual(persistedBody.audit.event.eventHash.startsWith("sha256:"), true, "append API audit hash");
    assertEqual(writtenLog.chain.entryCount, 6, "persisted file entry count");
    assertEqual(writtenLog.chain.latestRoot, "root-score-history-v1", "persisted file latest root");
    assertEqual(writtenLog.entries.at(-1).previousRoot, "root-game-badge-issuance-v0", "persisted file previous root");
    assertEqual(auditLog.events.length, 1, "audit file event count");
    assertEqual(auditLog.events[0].updateId, "update-score-history-v1", "audit file update id");
    assertEqual(auditLog.events[0].persisted, true, "audit file persisted flag");

    const secondPayload = {
      ...payload,
      id: "update-score-history-v2",
      rootHash: "root-score-history-v2",
      summary: "Recorded a second score history batch from durable API state."
    };
    const secondPersisted = await POST(createRequest(secondPayload, "test-registry-key", "test-operator"));
    const secondBody = await secondPersisted.json();
    const secondWrittenLog = JSON.parse(readFileSync(writePath, "utf8"));
    const secondAuditLog = JSON.parse(readFileSync(auditPath, "utf8"));

    assertEqual(secondPersisted.status, 200, "second persisted append status");
    assertEqual(secondBody.chain.entryCount, 7, "second persisted response count");
    assertEqual(secondBody.entry.sequence, 7, "second persisted entry sequence");
    assertEqual(secondBody.entry.previousRoot, "root-score-history-v1", "second persisted previous root");
    assertEqual(secondBody.audit.event.sequence, 2, "second audit event sequence");
    assertEqual(secondBody.audit.event.previousRoot, "root-score-history-v1", "second audit previous root");
    assertEqual(secondWrittenLog.chain.entryCount, 7, "second persisted file count");
    assertEqual(secondWrittenLog.chain.latestRoot, "root-score-history-v2", "second persisted file root");
    assertEqual(secondAuditLog.events.length, 2, "second audit file event count");
    assertEqual(secondAuditLog.events.at(-1).updateId, "update-score-history-v2", "second audit update id");

    // Security (R2): in legacy mode, spoofed x-nocks-registry-key-id and
    // x-nocks-registry-actor headers must NOT become verified attribution in the
    // tamper-evident audit chain — both collapse to the "legacy" sentinel.
    const forged = await POST(
      createRequest(
        {
          ...payload,
          id: "update-score-history-v3",
          rootHash: "root-score-history-v3",
          summary: "Spoofed-header append (legacy mode)."
        },
        "test-registry-key",
        "spoofed-actor",
        "spoofed-admin-key"
      )
    );
    const forgedBody = await forged.json();
    assertEqual(forged.status, 200, "legacy-mode forged-header append status");
    assertEqual(forgedBody.audit.event.keyId, "legacy", "legacy mode ignores spoofed x-nocks-registry-key-id");
    assertEqual(forgedBody.audit.event.actor, "legacy", "audit actor is the verified key, not the spoofed actor header");

    delete process.env.NOCKS_REGISTRY_UPDATE_KEY;
    delete process.env.NOCKS_REGISTRY_UPDATE_WRITE_PATH;
    delete process.env.NOCKS_REGISTRY_UPDATE_AUDIT_PATH;
    process.env.NOCKS_REGISTRY_UPDATE_KEYS = "primary-key:primary-secret,rotated-key:rotated-secret";

    const wrongRotatedKey = await POST(
      createRequest(payload, "primary-secret", "rotation-operator", "rotated-key")
    );
    const wrongRotatedKeyBody = await wrongRotatedKey.json();
    assertEqual(wrongRotatedKey.status, 401, "wrong rotated key status");
    assertEqual(wrongRotatedKeyBody.error, "unauthorized registry update", "wrong rotated key error");

    const rotatedKey = await POST(
      createRequest(payload, "rotated-secret", "rotation-operator", "rotated-key")
    );
    const rotatedKeyBody = await rotatedKey.json();
    assertEqual(rotatedKey.status, 200, "rotated key status");
    assertEqual(rotatedKeyBody.audit.event.keyId, "rotated-key", "rotated key audit id");
    assertEqual(rotatedKeyBody.audit.event.secret, undefined, "rotated key audit omits secret");
  } finally {
    delete process.env.NOCKS_REGISTRY_UPDATE_WRITE_PATH;
    delete process.env.NOCKS_REGISTRY_UPDATE_AUDIT_PATH;
    delete process.env.NOCKS_REGISTRY_UPDATE_KEYS;
    rmSync(tempDir, { force: true, recursive: true });
  }
}

function createRequest(payload, token, actor, keyId) {
  const headers = token ? { "x-nocks-registry-key": token } : {};
  if (actor) {
    headers["x-nocks-registry-actor"] = actor;
  }
  if (keyId) {
    headers["x-nocks-registry-key-id"] = keyId;
  }

  return {
    headers: new Headers(headers),
    json: async () => payload
  };
}

function createMalformedRequest(token, jsonImpl) {
  const headers = token ? { "x-nocks-registry-key": token } : {};

  return {
    headers: new Headers(headers),
    json: jsonImpl
  };
}

async function assertMalformedBodyRejected(POST, token) {
  const cases = [
    {
      label: "non-JSON body",
      json: async () => {
        throw new SyntaxError("Unexpected token in JSON");
      }
    },
    { label: "null body", json: async () => null },
    { label: "array body", json: async () => [] }
  ];

  for (const testCase of cases) {
    const response = await POST(createMalformedRequest(token, testCase.json));

    assertEqual(response.status, 400, `${testCase.label} is rejected with 400`);

    const payload = await response.json();
    assertEqual(typeof payload.error, "string", `${testCase.label} returns an error message`);
  }
}

async function assertUnauthenticatedMalformedBodyStillRejected(POST) {
  const response = await POST(
    createMalformedRequest(undefined, async () => {
      throw new SyntaxError("Unexpected token in JSON");
    })
  );

  assertEqual(response.status, 401, "unauthenticated malformed body is rejected with 401 before parsing");
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
