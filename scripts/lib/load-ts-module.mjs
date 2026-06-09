// On-the-fly TypeScript loader for the .mjs issuance/verification scripts that import the repo's
// src/*.ts modules at runtime. Transpiles a .ts file to CommonJS via the `typescript` compiler,
// evaluates it, resolves `@/...` aliases to src/, and caches by absolute path. createTsLoader(repoRoot)
// returns { loadTS }, each loader having its own module cache.
//
// (The ~100 test scripts carry their own `loadTypeScriptModule` copy — a separate, codebase-wide
// pattern not migrated here.)

import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export function createTsLoader(repoRoot = process.cwd()) {
  const require = createRequire(import.meta.url);
  const ts = require("typescript");
  const cache = new Map();

  function loadTS(rel) {
    const p = path.join(repoRoot, rel);
    if (cache.has(p)) return cache.get(p).exports;
    const src = readFileSync(p, "utf8");
    const out = ts.transpileModule(src, {
      compilerOptions: { esModuleInterop: true, module: ts.ModuleKind.CommonJS, resolveJsonModule: true, target: ts.ScriptTarget.ES2020 },
      fileName: p
    }).outputText;
    const m = { exports: {} };
    cache.set(p, m);
    new Function("exports", "require", "module", "__filename", "__dirname", out)(m.exports, areq, m, p, path.dirname(p));
    return m.exports;
  }

  function areq(s) {
    if (s.startsWith("@/")) {
      const a = path.join(repoRoot, "src", s.slice(2));
      if (existsSync(a) && path.extname(a) === ".json") return require(a);
      if (existsSync(`${a}.ts`)) return loadTS(path.relative(repoRoot, `${a}.ts`));
      if (existsSync(`${a}.json`)) return require(`${a}.json`);
      throw new Error(`alias ${s}`);
    }
    return require(s);
  }

  return { loadTS };
}
