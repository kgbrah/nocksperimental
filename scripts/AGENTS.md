# SCRIPTS KNOWLEDGE

## OVERVIEW

`scripts` holds the custom Node `.mjs` test harness, the `nocklab` runner, local
verification gates, and Cloudflare preview smoke checks.

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Lab runner | `run-lab.mjs` | Package bin `nocklab`; writes `.nocklab/`. |
| API/page tests | `test-*.mjs` | Import route/page/lib modules directly. |
| x402 tests | `x402-testkit.mjs`, `test-x402-*.mjs` | Shared TS loader and payment helpers. |
| Deployment smoke | `smoke-cloudflare-preview.mjs` | Builds preview, hits real HTTP routes. |
| Milestone checks | `verify-*.mjs` | Product coverage gates. |

## CONVENTIONS

- Tests are plain Node scripts; keep assertions local and failure messages
  specific.
- Many tests transpile TypeScript in-process and stub `next/server`; reuse an
  existing loader/testkit before adding another pattern.
- Clean up global `fetch`, env mutations, temp fixtures, and spawned processes in
  `finally`.
- When adding a `test:*` script, wire it into the right aggregate in
  `package.json` if it is part of the default gate.
- Lab scripts may mutate ignored `.nocklab/`; do not commit generated reports.

## ANTI-PATTERNS

- Do not replace focused script shards with one broad opaque test.
- Do not rely on external fakenet, Wrangler, or facilitator state in default
  `npm test` unless the script skips or mocks it deterministically.
- Do not use source-substring page checks when a route/API behavior check is the
  actual contract.
