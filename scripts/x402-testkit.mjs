// Shared test kit for the x402 metering suite. Mirrors the repo's existing
// in-process pattern (transpile a TS module with the `typescript` package,
// stub `next/server`), and additionally stubs `@opennextjs/cloudflare` so KV-
// backed stores fall back to their in-memory path under test.
//
// Modules are executed with `vm.compileFunction` (Node's purpose-built API for
// compiling a function from source with explicit parameter names) so we can
// inject a custom `require` that resolves `@/` aliases and stubs runtime-only
// dependencies.

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const cache = new Map();

export function loadTs(relativePath) {
  const modulePath = path.join(process.cwd(), relativePath);
  if (cache.has(modulePath)) {
    return cache.get(modulePath).exports;
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
  cache.set(modulePath, compiled);

  const factory = vm.compileFunction(
    output,
    ["exports", "require", "module", "__filename", "__dirname"],
    { filename: modulePath }
  );
  factory(compiled.exports, moduleRequire, compiled, modulePath, path.dirname(modulePath));

  return compiled.exports;
}

function moduleRequire(specifier) {
  if (specifier === "next/server") {
    return {
      NextResponse: {
        json: (body, init = {}) => makeResponse(body, init)
      }
    };
  }

  if (specifier === "@opennextjs/cloudflare") {
    return {
      getCloudflareContext: async () => {
        throw new Error("no cloudflare context under test");
      }
    };
  }

  if (specifier.startsWith("@/")) {
    return loadAlias(specifier);
  }

  return require(specifier);
}

function makeResponse(body, init = {}) {
  const entries = Object.entries(init.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]);
  const headers = new Map(entries);

  return {
    status: init.status ?? 200,
    headers: {
      get: (key) => headers.get(String(key).toLowerCase()) ?? null,
      has: (key) => headers.has(String(key).toLowerCase()),
      raw: Object.fromEntries(headers)
    },
    json: async () => body
  };
}

function loadAlias(specifier) {
  const aliasPath = path.join(process.cwd(), "src", specifier.slice(2));
  const tsPath = `${aliasPath}.ts`;
  const jsonPath = `${aliasPath}.json`;

  if (existsSync(aliasPath) && path.extname(aliasPath) === ".json") {
    return require(aliasPath);
  }
  if (existsSync(aliasPath) && path.extname(aliasPath) === ".ts") {
    return loadTs(path.relative(process.cwd(), aliasPath));
  }
  if (existsSync(jsonPath)) {
    return require(jsonPath);
  }
  if (existsSync(tsPath)) {
    return loadTs(path.relative(process.cwd(), tsPath));
  }

  throw new Error(`Unsupported module alias: ${specifier}`);
}

export function assert(condition, message) {
  if (!condition) {
    throw new Error(`assertion failed: ${message}`);
  }
}

export function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

export function run(name, fn) {
  Promise.resolve()
    .then(fn)
    .then(() => console.log(`${name}: OK`))
    .catch((error) => {
      console.error(`${name}: FAIL`);
      console.error(error);
      process.exitCode = 1;
    });
}
