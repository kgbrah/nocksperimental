#!/usr/bin/env node

// Maintainer tool: re-signs every entry in the committed trust-update chain
// (src/data/trust-update-log.json) with a real Ed25519 signature over the canonical
// signed payload (trustUpdateSignedPayload). Deterministic: uses the public dev
// issuer seeds so committed signatures are reproducible by reviewers. entryHash /
// rootHash / previousRoot / links are NOT touched — only signature.signature and
// signature.verificationStatus are rewritten. Pass --dry-run to print without
// writing. Not part of `npm test`.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();

main();

function main() {
  const dryRun = process.argv.includes("--dry-run");
  const crypto = loadTypeScriptModule("src/lib/trust-badge-crypto.ts");
  const logLib = loadTypeScriptModule("src/lib/trust-update-log.ts");

  const data = JSON.parse(readText("src/data/trust-update-log.json"));

  for (const entry of data.entries) {
    const seed = crypto.DEV_ISSUER_SEEDS[entry.signature.issuerKeyId];

    if (!seed) {
      throw new Error(`No dev seed for issuer key ${entry.signature.issuerKeyId} (entry ${entry.id})`);
    }

    const signedPayload = logLib.trustUpdateSignedPayload(entry);
    const signed = crypto.signBadgePayload(signedPayload, seed);
    const verified = crypto.verifyBadgeSignature({
      payload: signedPayload,
      signature: signed.signature,
      publicKeySpkiBase64: crypto.publicKeySpkiFromSeed(seed)
    });

    entry.signature.signature = signed.signature;
    entry.signature.verificationStatus = verified ? "valid" : "invalid";
  }

  const serialized = `${JSON.stringify(data, null, 2)}\n`;

  if (dryRun) {
    process.stdout.write(serialized);
    return;
  }

  writeFileSync(path.join(process.cwd(), "src/data/trust-update-log.json"), serialized);
  console.log(`Re-signed ${data.entries.length} trust-update entries with real Ed25519 signatures.`);
}

function readText(relativePath) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function loadTypeScriptModule(relativePath) {
  const modulePath = path.join(process.cwd(), relativePath);

  if (moduleCache.has(modulePath)) {
    return moduleCache.get(modulePath).exports;
  }

  if (!existsSync(modulePath)) {
    throw new Error(`Missing required module: ${relativePath}`);
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
    if (specifier.startsWith("@/")) {
      const aliasPath = path.join(process.cwd(), "src", specifier.slice(2));
      const tsPath = `${aliasPath}.ts`;
      const jsonPath = `${aliasPath}.json`;

      if (existsSync(aliasPath) && path.extname(aliasPath) === ".json") {
        return require(aliasPath);
      }
      if (existsSync(tsPath)) {
        return loadTypeScriptModule(path.relative(process.cwd(), tsPath));
      }
      if (existsSync(jsonPath)) {
        return require(jsonPath);
      }
      throw new Error(`Unsupported module alias: ${specifier}`);
    }

    return require(specifier);
  };
}
