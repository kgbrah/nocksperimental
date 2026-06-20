# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

The canonical agent guidance for this repo is **`AGENTS.md`** (imported below) — it
is the single source of truth, so edit it rather than duplicating rules here.
Before structural work, honor its Coordination Gate (`git fetch`, check branches/PRs/
issues on `kgbrah/nocksperimental`) and prefer CodeGraph over text search.

Commands are not restated here to avoid drift — read them from the authoritative
sources: `package.json` scripts and `README.md`. The essentials:

- `npm run dev` — Next.js dev server (Turbopack)
- `npm run lint` — ESLint
- `npm run build` — production build. Prod-like serving and deploy go through OpenNext
  to Cloudflare Workers via `npm run preview` / `npm run deploy` (see
  `open-next.config.ts`, `wrangler.jsonc`). There is no `next start`.
- Tests are ~200 custom `node scripts/test-*.mjs` checks (the `scripts/` dir is the test
  catalog; not Jest/Vitest). `npm test` chains them with `&&`, so it is slow and halts at
  the first failure — for iteration run the focused `npm run test:<name>` for the area you
  touched, or `node scripts/test-<name>.mjs` directly. CI runs only `npm run lab:ci`, so a
  green CI does not mean full `npm test` passed.

## Architecture

The central spine is request → thin route → `src/lib` primitive → content-addressed
evidence → Ed25519-signed receipt → re-derived report → trust/badge surface, with the
only stateful seam being Cloudflare KV in prod and an in-memory `Map` in tests.

Route handlers under `src/app/api/**/route.ts` are deliberately thin HTTP adapters:
parse the request, call one or two functions in `src/lib`, apply a visibility/redaction
filter, attach metering headers, and `NextResponse.json`. **No business logic, signing,
or storage lives in a route**, which is why the `node scripts/test-*.mjs` checks can
transpile a `route.ts` in-process, stub `next/server`, and call `GET`/`POST` directly.
The receipt-store tests additionally stub `getCloudflareContext` to *throw*; every
`*-receipt-store.ts` and `x402/kv.ts` catches that throw and falls back to a
process-global `Map`, so `smoke:cloudflare` round-trips persistence with no KV bound. In
prod the same call resolves a binding (`NOCKS_FAKENET/VESL/NOCKUP/X402_RECEIPTS`; the
X402 namespace id in `wrangler.jsonc` is still a placeholder). All `put()` is
**create-only** — and because a `receiptId` *is* its storage key, the SHA-256
(`secureId`, never `stableId`) must cover every differentiating field or a forged body
could target an existing key.

Metering bolts onto this same seam: a route opts in by calling `guard(request, slug)`
(`src/lib/x402/meter.ts`), which short-circuits to a 402 or returns headers the route
spreads onto its real response. Critically, the **verifier** path is fail-*closed* (an
unreachable facilitator → 502, never a silent stub fallback), while the **bazaar
discovery** fetch to the same URL is fail-*open* (omits listings) — opposite semantics,
shared SSRF guard.

Three triplets explain most of the file count:

- **Evidence → receipt.** Pure acceptance checks sign only a *projection* of fields;
  provenance (`reportHash`/`snapshotRoot`) originates once in `generated-lab-reports.ts`
  and flows unchanged into every bundle, with status always **re-derived** from
  steps/invariants, never `summary.status`.
- **nocklab runner.** Fixtures + `packs/*.invariants.json` execute *only* in
  `scripts/run-lab.mjs` (`custom-function` invariants are a frozen allowlist, no eval);
  promotion fields (`kernelExecuted`/`baseExecuted`) are stripped from the fixture and
  re-set only from a real run, so an author cannot forge an `app-report`.
  `invariant-packs.ts` / `*-verifier.ts` are the read-only API mirror.
- **Atlas + source-trace + drift-check.** ~30 pinned `nockchain-*` modules feed one
  generic `scripts/lib/source-drift-check.mjs` engine that the thin `check-*.mjs`
  wrappers share; *monitoring, not protocol authority*, and fail-*open* (skip) when
  GitHub is unreachable.

The load-bearing invariant is **fail-closed signing** (`trust-badge-crypto.ts` +
`trust-issuer-keys.ts` + `trust-badge-verifier.ts`): a real `verified` cert needs a
*secret* prod seed (`NOCKS_BADGE_ISSUER_SIGNING_SEED`) under a committed, active,
non-dev key, and the verifier re-binds every signed field to the displayed badge — the
`DEV_ISSUER_SEEDS` are public, so a signature alone is worthless. `registryEndpoints`
(`registry-manifest.ts`) is the de-facto schema feeding the well-known doc, OpenAPI, and
the independently re-hashed `registry-checkpoint.ts`. `npm run test:trust-forgery`
(`adversarial-audit/atk-run.mjs`) is the executable proof, and must mint **zero** certs.

@AGENTS.md
