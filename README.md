# nocksperimental

Nocksperimental is a Nockchain product lab for testing, simulating, and publishing audit-ready evidence for NockApps.

Live deployment: https://nocksperimental.com

The product thesis is simple: serious NockApps need deterministic local testing, state replay, invariant checks, fakenet diagnostics, and shareable verification surfaces before meaningful value can safely flow through them.

## What is here

- Fixture-driven NockApp lab runner with strict JSON schemas.
- Scripted `poke` and `peek` steps with state snapshots, replay logs, and invariant checks.
- Local fakenet adapter for health, balance, chain metadata, command kit, diagnostics, support bundles, and evidence capsules.
- Nockchain upstream intelligence for protocol docs authority, Rust crate mapping, releases, and operational watch items.
- Nockchain state-jam provenance registry for Zorp state-jam/checkpoint metadata without storing raw PMA or state artifacts.
- Nockchain Rust workspace atlas for crate-level roles, validation gates, risks, and Nocksperimental integration uses.
- VESL evidence bridge for lifecycle receipts from `vesl-test`, `vesl-hull`, and fakenet settlement probes.
- Generated report history with provenance, evidence, and public verification endpoints.
- Private workspace surfaces with workspace evidence, upload policy, and signed upload-token verifier.
- Public trust registry with verified badges, trust feed, registry checkpoint, signed trust updates, solver scorecards, token compatibility reports, and compute benchmark profiles.
- OpenAPI and `.well-known` manifests for external consumers.
- Cloudflare Workers deployment through OpenNext.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

Run the full local validation suite:

```bash
npm test
npm run lint
npm run lab:ci
npm run verify:6-18
```

## Local Fakenet

The local fakenet slice is designed to run from WSL with the `fakenock` helper on `PATH`.

Useful commands:

```bash
npm run lab:local
npm run lab:local:balance
npm run lab:local:chain
npm run lab:local:peek
npm run lab:local:poke
```

The default wallet used by the bundled local fakenet fixtures is:

```text
532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ
```

The public fakenet surfaces are available at:

- `/fakenet`
- `/api/fakenet`
- `/api/fakenet/connect`
- `/api/fakenet/commands`
- `/api/fakenet/diagnostics`
- `/api/fakenet/evidence`
- `/api/fakenet/evidence/submit`
- `/api/fakenet/evidence/receipts`
- `/api/fakenet/evidence/receipts/[receiptId]`
- `/api/fakenet/evidence/verify`
- `/api/fakenet/support-bundle`
- `/api/fakenet/support-bundle.md`
- `/api/fakenet/runbook.sh`

Bring your own fakenet by creating a stateless connection profile:

```bash
curl -G https://nocksperimental.com/api/fakenet/connect \
  --data-urlencode endpoint=127.0.0.1:5555 \
  --data-urlencode walletAddress=532AxMqc29thxqonTxkVQ5D1ghfG7a6CN29CDmruQ5HaEVhLqrDqaXQ \
  --data-urlencode networkId=local-fakenet
```

After running the generated commands beside the fakenet node, POST the generated report JSON back for a persisted verification receipt:

```bash
curl https://nocksperimental.com/api/fakenet/evidence/submit \
  -H "content-type: application/json" \
  --data @fakenet-evidence-submission.json
```

Submitted receipts can be read back through `GET /api/fakenet/evidence/receipts` and `GET /api/fakenet/evidence/receipts/{receiptId}`.

## Nockchain Upstream Intelligence

The upstream intelligence endpoint publishes the current Nockchain source-of-truth map used by Nocksperimental: latest scanned commit/release, docs authority order, protocol track, Rust workspace crate groups, operational scripts, PMA/state-jam safety rules, and product implications.

- `/api/nockchain/upstream`

Use it when a receipt, fakenet test, or integration needs to explain which Nockchain build, protocol track, script family, or canonical doc supports an assumption.

## Nockchain Docs And Protocol Atlas

The docs atlas publishes the canonical Nockchain read order, Tier 0/Tier 1 authority boundaries, protocol spec lifecycle, and consistency alerts. It currently surfaces the 014 Aletheia status drift between `PROTOCOL.md` and `changelog/protocol/014-aletheia.md` so receipts can carry the ambiguity instead of silently flattening it.

- `/nockchain`
- `/api/nockchain/docs-atlas`

Use it when a protocol-sensitive receipt needs to cite which Nockchain doc or spec supports an activation height, consensus-critical flag, or runtime assumption.

Shared Nockchain receipt provenance now embeds the docs atlas URL, Tier 0/Tier 1 source lists, selected protocol specs, and active doc consistency alerts so fakenet, VESL, and Nockup receipts can preserve upstream ambiguity in machine-readable form.

## Zorp/Nockchain Upstream Map

The Zorp upstream map keeps the Zorp organization, canonical Nockchain repo, and the Zorp state-jam Drive folder in the same machine-readable view. It classifies public Zorp repos by signal layer: Jock language authoring, NockApp lineage, Sword runtime lineage, formal Nock semantics, proof tooling, and lower-signal CI/tooling repos.

- `/api/nockchain/zorp`

Use it when interpreting whether a source is current protocol authority, historical lineage, state-jam provenance, or future product signal for Nocksperimental receipts.

## Nockchain State-Jam Provenance

The state-jam provenance endpoint tracks metadata requirements and watched sources for Nockchain state-jam/checkpoint artifacts, including the Zorp state-jam Drive folder. It is intentionally metadata-only: Nocksperimental records source identity, required hashes, network/height/build context, and safety policy, but does not store or redistribute raw PMA slabs, event logs, checkpoints, state jams, wallet exports, seed phrases, or private keys.

- `/api/nockchain/state-jams`

Use it when a fakenet receipt or bootstrap workflow needs to explain which state-jam source was considered, what provenance is still missing, and which Nockchain build/protocol context should be attached before trusting the artifact.

## Nockchain Rust Workspace Atlas

The Rust workspace atlas breaks the upstream Nockchain monorepo into crate groups with roles, primary cargo checks, risk posture, and Nocksperimental integration uses. It highlights chain runtime, operator tools, NockApp runtime, Hoon/nockup scaffolding, bridge/proof, and serialization support crates.

- `/nockchain/rust`
- `/api/nockchain/rust-atlas`

Use it when deciding which upstream crate should anchor a test assumption, which cargo gate belongs in a receipt, or which watch item should become the next Nocksperimental product slice.

## Nockup Validation Receipts

The Nockup validation API accepts scaffold/build/run evidence for NockApp projects created with upstream `nockup`. It records project and template identity, install path, command transcript hashes, hashed artifacts, optional fakenet context, Nockchain commit/release provenance, and active Nockup watch themes without storing raw chain state or secrets.

- `/api/nockchain/nockup/submit`
- `/api/nockchain/nockup/receipts`
- `/api/nockchain/nockup/receipts/[receiptId]`

Persisted Nockup validation receipts use the `NOCKS_NOCKUP_RECEIPTS` Workers KV binding in production. Use this when a scaffolded NockApp needs a shareable receipt showing which template was used, which commands passed, which artifacts were produced, and which Nockchain build context supported the test.

## VESL Evidence Bridge

The VESL evidence bridge accepts lifecycle evidence from `vesl-test`, `vesl-hull`, local settlement checks, or fakenet settlement probes and returns a persisted receipt suitable for sharing with collaborators.

Public VESL bridge endpoints:

- `/api/vesl/evidence/submit`
- `/api/vesl/evidence/receipts`
- `/api/vesl/evidence/receipts/[receiptId]`

Submit a VESL evidence payload:

```bash
curl https://nocksperimental.com/api/vesl/evidence/submit \
  -H "content-type: application/json" \
  --data @vesl-evidence-submission.json
```

Receipts are persisted through the `NOCKS_VESL_RECEIPTS` Workers KV binding in production. The bridge intentionally records evidence summaries and provenance, not private keys, seed material, API tokens, or raw state-jam artifacts.

## Lab Runner

Run a single fixture:

```bash
npm run lab:sample
```

Run every bundled fixture and produce a CI manifest:

```bash
npm run lab:ci
```

The runner writes report artifacts to `.nocklab/`, including JSON reports, Markdown reports, `manifest.json`, and `summary.md`. Generated artifacts are intentionally ignored by Git.

Bundled fixture tracks include:

- hello counter
- bridge settlement
- delayed bridge settlement warning
- payment flow invariants
- intent settlement invariants
- token issuance invariants
- compute benchmark profile
- local fakenet health, balance, chain, peek, and poke probes

## Trust and Verification

The public verification index is available at:

- `/verify`
- `/api/verify`

Current verifier families:

- badge issuance: `/api/trust/badges/verify`
- generated reports: `/api/reports/generated/verify`
- local fakenet evidence: `/api/fakenet/evidence/verify`
- workspace evidence: `/api/workspaces/evidence/verify`
- workspace upload tokens: `/api/workspaces/upload-token/verify`
- trust updates: `/api/trust/updates/verify`
- registry checkpoints: `/api/registry/checkpoint`

Registry and discovery endpoints:

- `/registry`
- `/api/registry`
- `/api/registry/checkpoint`
- `/api/trust`
- `/api/trust/feed`
- `/api/trust/updates`
- `/openapi.json`
- `/.well-known/nocksperimental.json`

## Workspaces

Workspace surfaces model private team evidence without exposing sensitive upload credentials publicly.

- `/workspaces`
- `/workspaces/[workspaceSlug]`
- `/api/workspaces`
- `/api/workspaces/[workspaceSlug]`
- `/api/workspaces/[workspaceSlug]/evidence`
- `/api/workspaces/[workspaceSlug]/upload-policy`
- `/api/workspaces/[workspaceSlug]/upload-token`
- `/api/workspaces/evidence/verify`
- `/api/workspaces/upload-token/verify`

Upload-token issuance is protected by `NOCKS_WORKSPACE_UPLOAD_KEYS`. Signed token issuance additionally requires `NOCKS_WORKSPACE_UPLOAD_TOKEN_SIGNING_KEY`. Public verifier responses avoid echoing raw secrets or token material.

## Scripts

- `npm run dev` starts the Next.js app.
- `npm run build` checks a production build.
- `npm run lint` runs ESLint.
- `npm test` runs all focused API, page, registry, fakenet, trust, verifier, and deployment contract tests.
- `npm run lab:sample` generates the starter lab report.
- `npm run lab:bridge` generates a mock bridge settlement report.
- `npm run lab:bridge:delayed` generates a bridge report with a triggered warning alert.
- `npm run lab:payment` generates a payment flow report with the payments invariant pack.
- `npm run lab:intent` generates an intent settlement report with the intents invariant pack.
- `npm run lab:token` generates a token issuance report with the token invariant pack.
- `npm run lab:compute` generates a compute benchmark report.
- `npm run lab:local` probes local fakenet health.
- `npm run lab:local:balance` parses `fakenock --balance`.
- `npm run lab:local:chain` parses chain metadata from `fakenock --balance`.
- `npm run lab:local:peek` runs a command-backed local fakenet `peek`.
- `npm run lab:local:poke` runs a command-backed local fakenet `poke`.
- `npm run lab:all` runs the config-driven CI lab workflow.
- `npm run lab:ci` runs the config-driven CI workflow and writes a manifest plus summary.
- `npm run verify:30-day` checks the 30-day plan artifacts and report generation.
- `npm run verify:90-day` checks the 30-90 day workflow, CI artifacts, and bridge alert states.
- `npm run verify:3-6` checks snapshot diffing, invariant packs, hosted report history, and private workspaces.
- `npm run verify:6-18` checks verified badges, solver scores, token compatibility, compute benchmarks, and trust-signal consumers.
- `npm run test:x402` runs the x402 metered-trust-API suite (config, verifier, meter cycle, facilitator mode, gating, discovery).
- `npm run smoke:cloudflare` validates the OpenNext Cloudflare preview bundle.
- `npm run deploy` builds and deploys to Cloudflare Workers through OpenNext.

## x402 Metered Trust API

Nocksperimental can meter its verification/trust endpoints with the
[x402](https://github.com/coinbase/x402) agentic-payments protocol (settled on
Nockchain via VESL's [`x402-nockchain`](https://github.com/zkvesl/x402-nockchain)),
paying revenue to the project wallet. Producing evidence stays free; consuming
verification at scale is paid in micro-`$NOCK`.

- **Off by default** (`NOCKS_X402_ENABLED`) — routes behave normally until you flip it on.
- A **stub verifier** ships now; set `NOCKS_X402_FACILITATOR_URL` to settle on-chain — no route changes.
- Metered: the deep verifiers (`/api/trust/badges/verify`, `/api/reports/generated/verify`,
  `/api/fakenet/evidence/verify`, `/api/workspaces/evidence/verify`) and premium reads
  (`/api/trust/compute-benchmarks/[id]`, `/api/trust/token-compatibility/[id]`). Submits and lists stay free.
- Advertised at `/.well-known/nocksperimental.json` (`x402` block) and `/openapi.json` (402 responses).
- Tests: `npm run test:x402`. Full guide: [docs/x402.md](docs/x402.md).

## Verified Bazaar

A trust-filtered directory of *payable* NockApp services for agents — the
intersection of x402 payability and registry trust. It lists nocksperimental's
metered endpoints, registry-backed solvers / compute providers / token issuers
(verified by badge), and facilitator discoveries when one is online.

- `GET /api/bazaar` (filters: `verifiedOnly`, `payableOnly`, `kind`, `network`, `minScore`) + `GET /api/bazaar/{listingId}`; browsable at `/bazaar`.
- A listing is **verified** iff it has a verified registry badge.
- Advertised in `/.well-known/nocksperimental.json` (`verified-bazaar`) and `/openapi.json`.
- Auto-merges a facilitator's `/discovery/resources` when `NOCKS_X402_FACILITATOR_URL` is set + reachable.
- Tests: `npm run test:bazaar`. Full guide: [docs/bazaar.md](docs/bazaar.md).

## Deployment

The deployed app runs on Cloudflare Workers via OpenNext.

From WSL:

```bash
npm run deploy
```

From Windows PowerShell, launch the WSL deploy pipeline so OpenNext bundles the app correctly:

```powershell
wsl -d Ubuntu-24.04 --cd /home/kg3333333/nocklab/nocksperimental -- bash -lc 'env PATH=/home/kg3333333/.local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin npm run deploy'
```

Post-deploy smoke checks:

```bash
curl -I https://nocksperimental.com/
curl https://nocksperimental.com/api/health
curl https://nocksperimental.com/api/verify
curl https://nocksperimental.com/.well-known/nocksperimental.json
```

## Documentation

- `docs/strategy.md` describes the product roadmap.
- `docs/invariants.md` documents invariant-pack behavior.
- `docs/ci.md` covers CI artifact generation.
- `docs/report-history.md` describes hosted report history.
- `docs/trust-signals.md` documents trust registry primitives.
- `docs/workspaces.md` covers private workspace evidence and upload-token flows.
- `docs/deployment.md` covers Cloudflare deployment details.
- `docs/research/zorp-nockchain.md` tracks Zorp/Nockchain repo and state-jam interpretation.
- `docs/research/nockchain-rust-architecture.md` tracks Nockchain's Rust workspace, docs authority model, and Nocksperimental product implications.

## Roadmap

The next adapter milestone is replacing command-backed fakenet probes with stable gRPC-native fakenet `poke` and `peek` operations once the node surfaces are reliable enough to treat as the source of truth.
