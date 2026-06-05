#!/usr/bin/env node

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import process from "node:process";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const moduleCache = new Map();

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const logPath = path.resolve(options.log);
  const log = JSON.parse(readFileSync(logPath, "utf8"));
  const { appendTrustUpdateToLog, validateTrustUpdateChain } = loadTypeScriptModule(
    "src/lib/trust-update-log.ts"
  );
  const appendedLog = appendTrustUpdateToLog(log, {
    id: options.id,
    action: options.action,
    target: options.target,
    targetPath: options.targetPath,
    recordedAt: options.recordedAt,
    rootHash: options.rootHash,
    summary: options.summary
  });
  const validation = validateTrustUpdateChain(appendedLog);

  if (!validation.isAppendOnly) {
    throw new Error("refusing to write a trust update log that does not validate as append-only");
  }

  if (options.dryRun) {
    process.stdout.write(`${JSON.stringify(appendedLog, null, 2)}\n`);
    return;
  }

  writeFileSync(logPath, `${JSON.stringify(appendedLog, null, 2)}\n`);
  process.stdout.write(
    `${JSON.stringify(
      {
        wrote: logPath,
        entryCount: appendedLog.chain.entryCount,
        latestRoot: appendedLog.chain.latestRoot,
        appendedEntryId: appendedLog.entries.at(-1)?.id
      },
      null,
      2
    )}\n`
  );
}

function parseArgs(argv) {
  const options = {
    log: "src/data/trust-update-log.json",
    dryRun: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    const value = argv[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`${arg} requires a value`);
    }

    switch (arg) {
      case "--log":
        options.log = value;
        break;
      case "--id":
        options.id = value;
        break;
      case "--action":
        options.action = value;
        break;
      case "--target":
        options.target = value;
        break;
      case "--target-path":
        options.targetPath = value;
        break;
      case "--recorded-at":
        options.recordedAt = value;
        break;
      case "--root-hash":
        options.rootHash = value;
        break;
      case "--summary":
        options.summary = value;
        break;
      default:
        throw new Error(`unknown option: ${arg}`);
    }

    index += 1;
  }

  for (const required of ["id", "action", "target", "targetPath", "recordedAt", "rootHash", "summary"]) {
    if (!options[required]) {
      throw new Error(`missing required option: --${toKebabCase(required)}`);
    }
  }

  return options;
}

function toKebabCase(value) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
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
