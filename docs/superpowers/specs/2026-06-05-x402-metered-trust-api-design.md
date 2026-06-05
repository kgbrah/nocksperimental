# x402-Metered Trust API Design

## Status

Approved direction (2026-06-05): **Option A — stub-verifier metering layer, swap-to-real via config.**

- Ship a spec-complete x402 resource-server surface now; no external dependency to run.
- Meter the *deep verify* + *premium read* endpoints; keep producing evidence (submits) and browsing (lists) free, plus a small free daily allowance for sampling.
- All revenue pays to the project wallet `532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ` (the x402 `payTo`).
- Flip to real on-chain settlement by setting one env var (`NOCKS_X402_FACILITATOR_URL`) — no route changes.

## Context

nocksperimental already exposes ~40 public trust/verification routes and persists evidence receipts in Cloudflare KV (`NOCKS_FAKENET_RECEIPTS`, `NOCKS_VESL_RECEIPTS`). The VESL collaborator ships `zkvesl/x402-nockchain`: a working **facilitator** (`POST /verify`, `POST /settle`, `GET /discovery/resources`) plus protocol-neutral wire types (`x402-types`). x402 is Coinbase's HTTP-402 agentic-payments protocol; Nockchain is its settlement network (CAIP-2 id `nockchain:mainnet` / `nockchain:fakenet`, asset `NOCK`, smallest unit `nicks`).

In x402, a resource server does not implement crypto or settlement — it (1) returns `402` + `accepts[]` on an unpaid request, (2) reads the payment payload from a header, (3) calls a facilitator to verify/settle, (4) serves the resource. nocksperimental plays the **resource server** role.

The runner/adapters in this repo are deliberately mock-first (fakenet adapter, VESL evidence bridge) with a clean swap to real. The x402 layer follows the same seam: a pluggable `Verifier` whose default (`Stub`) is offline and honest about what it does/doesn't check, and whose `Facilitator` impl talks to a real `x402-nockchain-facilitator` when one is configured.

## Goals

- Add x402 payment gating to a curated set of high-value read endpoints, paying to the revenue wallet.
- Be wire-compatible with `zkvesl/x402-nockchain` (`x402-types`) so unmodified x402 clients/agents interoperate.
- Keep producing evidence (`*/submit`) and browsing (lists/registry/feed) free; add a small free daily allowance on metered endpoints.
- Ship with zero external dependency (Stub verifier); enable real settlement via `NOCKS_X402_FACILITATOR_URL` with no route changes.
- Advertise metered resources via Bazaar discovery blocks + `.well-known` + OpenAPI so agents discover *verified, paid* services (seeds the "Verified Bazaar").

## Non-Goals

- No cryptography or settlement inside nocksperimental. The Stub verifier does NOT verify Schnorr-over-Cheetah signatures, check on-chain notes, or move value — that is the facilitator's job.
- Do not meter producing/browsing endpoints (`*/submit`, list pages, registry, feed, well-known, openapi).
- Do not implement a facilitator, wallet, or signer.
- Do not store private keys, seeds, or raw payment secrets.

## Approach

A thin `meter()` wrapper around selected route handlers, backed by a pluggable `Verifier` selected by config:

- **`StubVerifier`** (default): offline structural + addressing + amount + time + replay checks. Marks responses `mode: "stub"` so consumers know settlement is simulated.
- **`FacilitatorVerifier`** (when `NOCKS_X402_FACILITATOR_URL` set): `POST {url}/verify` (and optionally `/settle`), gating on the real facilitator's response.

The same wire types, pricing, receipts, discovery surfaces, and route wiring serve both — only the verifier swaps.

## Architecture

New module tree under `src/lib/x402/`:

- **`types.ts`** — TypeScript mirror of `x402-types` (camelCase, decimal-string amounts): `PaymentRequirements`, `PaymentRequired`, `PaymentResource`, `PaymentPayload`, `Authorization`, `NoteRef`, `NoteName`, `SchnorrSignatureJson`, `VerifyRequest`/`VerifyResponse`, `SettleResponse`, `FacilitatorError`, and the minimal `BazaarExtension` (`http query` input). Fidelity is checked against `golden_1.json`.
- **`config.ts`** — resolved config: `network` (env `NOCKS_X402_NETWORK`, default `nockchain:fakenet`), `asset` (`NOCK`), `payTo` (env `NOCKS_X402_PAY_TO`, default the project wallet), `scheme` (`exact`), `facilitatorUrl` (env, optional), derived `verifierMode` (`stub` | `facilitator`), `maxTimeoutSeconds`, `clockSkewSeconds` (30), free-allowance config.
- **`pricing.ts`** — the metered-resource registry: one entry per endpoint `{ slug, pathPattern, priceNicks, description, mimeType, bazaarInput }`. Single source of truth for prices, discovery, and OpenAPI.
- **`verifier.ts`** — `Verifier` interface `verify(payload, requirements): Promise<VerifyOutcome>`; `StubVerifier`; `FacilitatorVerifier`; `selectVerifier(config)`.
- **`receipt-store.ts`** — KV-backed nonce/replay set + payment receipts, binding `NOCKS_X402_RECEIPTS`, modeled directly on `fakenet-receipt-store.ts` (KV when `getCloudflareContext().env[binding]` present, in-memory `Map` fallback otherwise).
- **`allowance.ts`** — free daily allowance counter (per client key = pubkey if present else IP), KV-backed with memory fallback; returns whether this caller gets a free pass and the remaining quota.
- **`meter.ts`** — `meterRequest(request, resource): Promise<MeterResult>` returning either `{ paid: false, response }` (a built `402`) or `{ paid: true, payment }`; plus `buildPaymentRequired(resource)` (the 402 envelope incl. Bazaar block) and `buildPaymentResponseHeader(outcome)`.

Wiring:

- Each metered route imports its `pricing` entry and calls `meter()`; on unpaid → return the 402; on paid (or free allowance) → run the existing handler and attach `X-PAYMENT-RESPONSE`.
- Extend `src/lib/registry-manifest.ts` (well-known) and `src/lib/openapi-spec.ts` to advertise the x402 capability, per-resource prices, and `402` responses.
- Add `NOCKS_X402_RECEIPTS` to `wrangler.jsonc` (placeholder id; real id created via `wrangler kv namespace create`).

### Metered set (v1)

Meter (deep verify + premium reads):

- `GET /api/trust/badges/verify`
- `GET /api/reports/generated/verify`
- `GET /api/fakenet/evidence/verify`
- `GET /api/workspaces/evidence/verify`
- `GET /api/trust/compute-benchmarks/[profileId]`
- `GET /api/trust/token-compatibility/[reportId]`

Free (unchanged): `/api/verify` (the verifier index — it advertises the paid surfaces), all list endpoints, all `*/submit`, `/api/registry`, `/api/trust/feed`, `.well-known`, `openapi.json`. Plus a free daily allowance (default 5/day per client) on metered endpoints so docs and agents can sample.

Default prices (all in nicks, tunable in `pricing.ts`, env-overridable):

| Resource | Default price (nicks) |
|---|---|
| `badges/verify`, `reports/generated/verify`, `fakenet/evidence/verify`, `workspaces/evidence/verify` | 1000 |
| `trust/compute-benchmarks/[profileId]` | 10000 |
| `trust/token-compatibility/[reportId]` | 10000 |

**Payment vs allowance ordering:** if a *valid* payment is present it is charged and the free allowance is untouched; if no/invalid payment is present, the free allowance is consulted, and only when it is exhausted does the endpoint return `402`. The client key for the allowance is the payload `pubkey` when present, else the `CF-Connecting-IP` request header.

## Data Model

Request header (client → server): `PAYMENT-SIGNATURE` (VESL's name, primary) or `X-PAYMENT` (Coinbase canonical, accepted alias). Value: base64-encoded JSON of a `PaymentPayload` (raw JSON also accepted). The `(exact, nockchain)` payload mirrors `golden_1.json`: `{ signature: { pubkey, schnorr: { chal[8], sig[8] } }, authorization: { from, to, value, fee, nonce, validAfter, validBefore, notes[], changeAddress } }`.

Response header (server → client): `X-PAYMENT-RESPONSE`, base64 JSON `{ success, mode: "stub"|"facilitator"|"free-allowance", network, payer, amountNicks, nonce, txId?, remaining? }`.

402 body: `PaymentRequired` = `{ x402Version: 2, error: "Payment required", resource: { url, description?, mimeType? }, accepts: [PaymentRequirements{ scheme, network, maxAmountRequired, resource, asset, payTo, maxTimeoutSeconds, description?, mimeType? }], extensions: { bazaar } }`.

Receipt (KV `x402:receipt:<nonce>`): `{ nonce, payer, to, amountNicks, network, resource, mode, txId?, generatedAt }`. The nonce key doubles as the replay marker.

## Validation (Stub verify, in order; each early-exits with a typed code)

1. `payload.x402Version === 2` (`schema`)
2. `payload.scheme === requirements.scheme` and `payload.network === requirements.network` (`scheme_mismatch` / `network_mismatch`)
3. `authorization.to === config.payTo` (`recipient_mismatch`)
4. `BigInt(authorization.value) >= BigInt(requirements.maxAmountRequired)` (`insufficient_amount`)
5. `now ∈ [validAfter - skew, validBefore + skew]` (`expired` / `not_yet_valid`)
6. nonce not already in the replay store (`replayed_nonce`); on success, record nonce + receipt

Stub explicitly does NOT verify the Schnorr signature, note existence/unspentness, fee, or PKH binding — those require the facilitator and are reported as `mode: "stub"`.

## Error Handling

- Missing/absent payment header (allowance exhausted) → `402` + `PaymentRequired` (the normal "please pay" path), `Cache-Control: no-store`.
- Header present but undecodable/invalid shape → `402` with `accepts[]` plus an `error: { code: "invalid_payload", message }` block.
- Verifier rejection → `402` with the specific code from Validation above.
- Facilitator mode, facilitator unreachable/5xx → `502` retryable error. Never silently fall back to Stub (that would be a paywall bypass).
- Replay store unavailable in production (KV read throws) → fail **closed** with `503` (cannot guarantee no-replay). Dev/test use the in-memory fallback.

## Testing (TDD; repo `.mjs` harness, in-process transpile + mocked `next/server`)

- `test-x402-config.mjs` — defaults (payTo default = wallet), env overrides, price-table integrity.
- `test-x402-types.mjs` — round-trip `golden_1.json` payload/authorization (camelCase fidelity).
- `test-x402-verifier-stub.mjs` — accept happy path; reject wrong payTo, low amount, expired, replayed nonce, bad version/scheme/network, malformed.
- `test-x402-meter-402.mjs` — unpaid GET → `402` with a valid `PaymentRequired` (payTo, price, absolute resource url, bazaar block).
- `test-x402-meter-paid.mjs` — GET with a valid `PAYMENT-SIGNATURE` → `200` + original body + `X-PAYMENT-RESPONSE`; second identical call → `402 replayed_nonce`.
- `test-x402-allowance.mjs` — first N calls free, then `402`.
- `test-x402-facilitator-mode.mjs` — with `NOCKS_X402_FACILITATOR_URL` + mocked `fetch` → forwards to `/verify`, gates on response; unreachable → `502`.
- `test-x402-wellknown-openapi.mjs` — well-known advertises x402 capability + prices; OpenAPI declares `402` on metered paths.
- Extend `smoke-cloudflare-preview.mjs` to hit a metered endpoint and assert `402`.
- Wire all into `package.json` `test` + a `test:x402` aggregate; add an `npm run verify:x402` gate.

## Rollout

1. RED→GREEN implement `types → config → pricing → receipt-store → verifier(stub) → allowance → meter`, each with tests.
2. Wire the 6 metered routes; leave free routes untouched.
3. Extend `registry-manifest.ts` (well-known) + `openapi-spec.ts`; add `wrangler.jsonc` binding (placeholder id); write `docs/x402.md` + README quickstart.
4. `npm test` + `npm run test:x402` + `npm run lint` + `next build` green.
5. Commit on `feat/x402-metered-trust-api`; open PR.
6. Deploy from WSL (note: distro is **Ubuntu-24.04**, not 22.04). Create the KV namespace (`npx wrangler kv namespace create NOCKS_X402_RECEIPTS`), set `NOCKS_X402_PAY_TO`.
7. Later: point `NOCKS_X402_FACILITATOR_URL` at a live `x402-nockchain-facilitator` → real settlement, no route changes.

## Decisions

- **Stub-first pluggable `Verifier`** (vs waiting for a facilitator): ships today, swaps by env.
- **Meter deep verifies + premium reads**; free submits/lists + small daily allowance.
- **`payTo`** via `NOCKS_X402_PAY_TO`, default `532AxMqc…DqaXQ`.
- **Default network `nockchain:fakenet`** (env-overridable to `:mainnet`) so stub demos read as fakenet, consistent with the rest of the product.
- **Headers**: accept `PAYMENT-SIGNATURE` (VESL) + `X-PAYMENT` (Coinbase); respond `X-PAYMENT-RESPONSE`; base64-JSON.
- **Facilitator-unreachable fails closed** (`502`); never silent Stub fallback.
- **New KV binding `NOCKS_X402_RECEIPTS`** with in-memory fallback for dev/test.
