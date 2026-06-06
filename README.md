# nocksperimental

Nocksperimental is a Nockchain product lab for testing, simulating, and publishing audit-ready evidence for NockApps.

Live deployment: https://nocksperimental.com

The product thesis is simple: serious NockApps need deterministic local testing, state replay, invariant checks, fakenet diagnostics, and shareable verification surfaces before meaningful value can safely flow through them.

## What is here

- Fixture-driven NockApp lab runner with strict JSON schemas.
- Scripted `poke` and `peek` steps with state snapshots, replay logs, and invariant checks.
- Local fakenet adapter for health, balance, chain metadata, command kit, diagnostics, support bundles, and evidence capsules.
- Nockchain upstream intelligence for protocol docs authority, Rust crate mapping, releases, and operational watch items.
- Nockchain protocol authority trace for protocol index/spec lifecycle, activation status, consensus-critical posture, and receipt fields.
- Nockchain bridge withdrawal trace for Base burn, Hoon kernel, Rust runtime, sequencer authorization, confirmation, and release-lag evidence.
- Nockchain state-jam provenance registry for Zorp state-jam/checkpoint metadata without storing raw PMA or state artifacts.
- Nockchain Rust workspace atlas for crate-level roles, validation gates, risks, and Nocksperimental integration uses.
- Nockchain NockApp runtime atlas for poke/peek, PMA, gRPC, Nockup, Zorp lineage, and receipt-boundary interpretation.
- Nockchain upstream watch board for commit/release drift, Zorp lineage, state-jam, wallet/API, fakenet, and Rust workspace review signals.
- Nockchain sync/gossip source trace for behind-tip gossip suppression, wrong-commitment triage, and fakenet receipt fields.
- VESL evidence bridge for lifecycle receipts from `vesl-test`, `vesl-hull`, and fakenet settlement probes.
- Launch Evidence cases for paid launch-readiness review across lab, fakenet, VESL, workspace upload, nockup, and state-export evidence.
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

Each connection profile includes an API safety contract that separates private gRPC runbooks, hosted public HTTP(S) manifest probes, and raw public gRPC endpoints, with required receipt fields for endpoint mode, access control, probe location, upstream commit/build, and output hashes.

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

## Nockchain Protocol Authority Trace

The protocol authority trace turns `PROTOCOL.md`, `changelog/protocol/SPECIFICATION.md`, and selected upgrade specs into a receipt-safe contract for activation state, consensus-critical posture, lifecycle status, required validation sections, and consistency alerts. It keeps 013 Nous rollout-gated networking context separate from 014 Aletheia consensus-critical activation, and it preserves the 014 status drift between the protocol index and spec frontmatter.

- `/nockchain/protocol`
- `/api/nockchain/protocol`

Use it when a fakenet test, Nockup validation run, wallet/balance receipt, or state-jam provenance record depends on protocol activation height, consensus-critical status, network partition risk, or the exact Nockchain source that justified the assumption.

## Nockchain Bridge Withdrawal Trace

The bridge withdrawal trace follows the latest released bridge work from Base burn through Hoon kernel pending/commit effects, Rust withdrawal proposal assembly, sequencer authorization, journal persistence, submission, confirmation polling, and kernel reconciliation. It explicitly records whether the latest commit is represented by the latest public build release, so settlement and bridge receipts do not flatten commit/build provenance. Its sequencer operational contract separates registered, peer-canonical, authorized, submitted, mempool-accepted, confirmed, and kernel-reconciled states so evidence can cite the right owner without leaking journal secrets.

- `/nockchain/bridge`
- `/api/nockchain/bridge`

Use it when a VESL, x402, fakenet, or bridge-settlement receipt depends on withdrawal proposal hashes, sequencer authorization state, blockchain constants, journal mirroring, or confirmed inclusion.

## Nockchain Bridge Source Trace

The bridge source trace pins the latest bridge withdrawal execution path to exact upstream Rust files, symbols, and line ranges. It maps runtime loop activation, kernel poke/peek seams, withdrawal execution effects, proposal assembly, sequencer authorization, public Nockchain submission, confirmation polling, orphan retry, durable sequencer store state, and append-only journal records into receipt fields. It preserves the key operational distinction that peer-canonical is not submit-ready, submitted is advisory, and confirmation requires observed block inclusion plus depth.

- `/nockchain/bridge/source`
- `/api/nockchain/bridge-source`

Use it when a bridge, VESL, x402, Launch Evidence, or support-bundle receipt needs to cite the exact Rust boundary behind a withdrawal state without storing raw transaction jams, authorized raw transactions, sequencer journal signing keys, object-store secrets, or bridge node private keys.

## Nockchain Release Asset Manifest

The release asset manifest records metadata for the current Nockchain build release: binary tarballs for `nockchain`, `nockchain-wallet`, `nockup`, `hoon`, `hoonc`, plus `nockchain-manifest.toml`. It groups assets by tool and platform, preserves BLAKE3 and SHA1 hashes from the upstream manifest, and makes local fakenet, wallet, and Nockup receipts cite the exact upstream binary source without storing downloaded artifacts.

- `/nockchain/releases`
- `/api/nockchain/release-assets`

Use it when a test run depends on a downloaded Nockchain binary, wallet build, Nockup build, Hoon toolchain, or release manifest.

## Zorp/Nockchain Upstream Map

The Zorp upstream map keeps the Zorp organization, canonical Nockchain repo, the legacy `zorp-corp/nockchain` redirect, and the Zorp state-jam Drive folder in the same machine-readable view. It classifies public Zorp repos by signal layer: Jock language authoring, NockApp lineage, Sword runtime lineage, formal Nock semantics, proof tooling, and lower-signal CI/tooling repos. It also exposes a source-authority matrix so receipts can distinguish canonical protocol authority, Zorp lineage/authoring signals, and metadata-only state-jam provenance.

- `/api/nockchain/zorp`
- `/nockchain/zorp`

Use it when interpreting whether a source is current protocol authority, historical lineage, state-jam provenance, or future product signal for Nocksperimental receipts.

The Zorp intelligence page renders the same map as an operator brief: priority repos, canonical relocation, lineage risk flags, state-jam metadata boundaries, a repository watch matrix, and concrete actions for turning Zorp/Nockchain changes into receipt or test assumptions.

## Nockchain State-Jam Provenance

The state-jam provenance endpoint tracks metadata requirements and watched sources for Nockchain state-jam/checkpoint artifacts, including the Zorp state-jam Drive folder. It is intentionally metadata-only: Nocksperimental records source identity, required hashes, network/height/build context, PMA boot and recovery safety, and safety policy, but does not store or redistribute raw PMA slabs, event logs, checkpoints, state jams, wallet exports, seed phrases, or private keys.

- `/api/nockchain/state-jams`
- `/nockchain/state-jams`

Use it when a fakenet receipt or bootstrap workflow needs to explain which state-jam source was considered, what provenance is still missing, and which Nockchain build/protocol context should be attached before trusting the artifact.

The state-jams page renders the same registry for operators: Zorp Drive folder classification, metadata-only policy, PMA boot and recovery safety, required provenance fields, verification questions, and the raw artifact denylist.

## Nockchain Rust Workspace Atlas

The Rust workspace atlas breaks the upstream Nockchain monorepo into crate groups with roles, primary cargo checks, risk posture, and Nocksperimental integration uses. It tracks all 36 upstream workspace members, plus the extra `chaff` support lineage crate, and highlights chain runtime, operator tools, NockApp runtime, Hoon/nockup scaffolding, bridge/proof, and serialization support crates.

- `/nockchain/rust`
- `/api/nockchain/rust-atlas`

Use it when deciding which upstream crate should anchor a test assumption, which cargo gate belongs in a receipt, or which watch item should become the next Nocksperimental product slice.

## Nockchain NockApp Runtime Atlas

The NockApp runtime atlas turns current `nockchain/nockchain` NockApp crates, Zorp NockApp/Sword lineage, Nockup fixture flow, private gRPC endpoints, poke/peek semantics, PMA durability, and metadata-only state-jam provenance into a receipt-safe contract. It separates current runtime authority from historical Zorp lineage so fakenet, user-connected fakenet, VESL, Launch Evidence, and Nockup receipts can preserve exactly which boundary produced the evidence.

- `/nockchain/nockapp`
- `/api/nockchain/nockapp-atlas`

Use it when a NockApp test needs to say whether evidence came from a state-changing poke, a read-only peek, a private endpoint probe, a Nockup fixture build/run, or a state-export/state-jam context without storing raw PMA, event logs, state jams, wallet secrets, or API tokens.

## Nockchain NockApp Source Trace

The NockApp source trace anchors the runtime atlas to exact upstream files, symbols, and line ranges in the current `nockchain/nockchain` build. It maps `NockApp`, `IOAction`, poke/effect broadcast, peek results, wire representation, exported state, checkpoint bootstrap, event logs, private/public gRPC, and PMA regression tests into receipt fields while keeping Zorp repos and the Drive state-jam folder as monitored lineage and metadata-only provenance.

- `/nockchain/nockapp/source`
- `/api/nockchain/nockapp-source`

Use it when a NockApp, fakenet, Nockup, or state-jam-backed test needs to explain which upstream source boundary supports a receipt without storing raw PMA slabs, event logs, checkpoints, state jams, export jams, or key material.

## Nockchain Operations Atlas

The operations atlas turns current upstream scripts and local diagnostics into a practical Nockchain runbook for fakenet, mining, peer discovery, block commitments, wallet checks, and PMA/state-jam safety. It keeps wrong-commitment, empty-routing-table, no-peers, behind-tip gossip suppression, gRPC, wallet, and state-artifact scenarios tied to Nockchain build/release provenance.

- `/nockchain/operations`
- `/api/nockchain/operations`

Use it when deciding whether a fakenet symptom is a sync, peer, state-artifact, wallet, or command-source problem before treating a test failure as meaningful.

## Nockchain Wallet/API Atlas

The wallet/API atlas turns upstream `nockchain-wallet` and `nockchain-api` docs into a receipt-safe guide for fakenet balances, note listings, watch-only tracking, public/private endpoint mode, transaction acceptance checks, and key-material safety. It treats local `fakenock --balance` as wrapper evidence while preserving upstream wallet command, endpoint, output hash, and Nockchain build context. Its public API evidence contract distinguishes node acceptance from block inclusion, cache warm-up from missing data, and reorg-window staleness from final explorer evidence.

- `/nockchain/wallet`
- `/api/nockchain/wallet`

Use it when a balance, reward, or transaction test needs to say which wallet command was run, which endpoint mode was used, and which wallet secrets must stay out of receipts and support bundles.

## Nockchain Upstream Watch

The upstream watch board records the live GitHub API sources and the current observed Nockchain/Zorp snapshot used to decide whether Nocksperimental assumptions need review. It separates canonical Nockchain commit/release drift from Zorp lineage updates, state-jam Drive inventory, wallet/API command drift, fakenet mining symptoms, and Rust workspace ownership changes. Its change classification contract maps each upstream signal class to the Nocksperimental atlas, receipt, test, or operator-runbook surface that must be refreshed before new evidence is trusted.

- `/nockchain/watch`
- `/api/nockchain/watch`

Use it before interpreting fakenet failures or publishing receipts: if the pinned Nockchain commit/release no longer matches the observed upstream snapshot, or a high-severity watch item changed, refresh the relevant atlas before treating the evidence as current.

## Nockchain Sync/Gossip Source Trace

The sync/gossip trace turns the latest Nockchain `nockchain-libp2p-io` source change into a receipt-safe diagnostic contract. It anchors `CatchUpSignal::is_catching_up`, `P2PState::should_suppress_outgoing_gossip`, driver `%gossip` fan-out, the `gossip_suppressed_behind_tip_total` metric, and upstream suppression tests so wrong block commitments, empty route tables, quiet mining output, and tx gossip silence can be interpreted with sync mode and Zorp/state-jam provenance attached.

- `/nockchain/sync-gossip`
- `/api/nockchain/sync-gossip`

Use it when a local fakenet, user-connected fakenet, or state-jam-backed test needs to decide whether a symptom is connectivity failure, stale state, or intentional behind-tip gossip suppression before publishing Nocksperimental evidence.

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
- Launch Evidence: `/api/launch-evidence/verify`
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

## Launch Evidence

Launch Evidence is the first paid Nocksperimental product lane for NockApp builders and auditors. It aggregates lab reports, fakenet evidence, VESL lifecycle receipts, workspace uploads, and future nockup/state-export evidence into launch-readiness cases.

Public Launch Evidence surfaces:

- `/launch-evidence`
- `/launch-evidence/[caseId]`
- `/api/launch-evidence`
- `/api/launch-evidence/[caseId]`
- `/api/launch-evidence/verify`

Verify the bundled VESL demo launch case:

```bash
curl -G https://nocksperimental.com/api/launch-evidence/verify \
  --data-urlencode caseId=case-vesl-demo-launch-001 \
  --data-urlencode reportHash=sha256:launch-vesl-demo-001 \
  --data-urlencode snapshotRoot=launch-vesl-demo-root-001
```

Private Launch Evidence cases are hidden from public index/detail routes; verifier lookups for matching private evidence return the same public miss shape as unknown evidence.

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
- `npm run verify:launch-evidence` checks Launch Evidence routes, registry discovery, manifests, and verifier behavior.
- `npm run test:launch-evidence-api` and `npm run test:launch-evidence-pages` run the focused Launch Evidence API and page suites.
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
- `docs/research/zorp-nockchain.md` tracks Zorp/Nockchain repo, legacy redirect, monitor, and state-jam interpretation.
- `docs/research/nockchain-rust-architecture.md` tracks Nockchain's Rust workspace, docs authority model, and Nocksperimental product implications.

## Roadmap

The next adapter milestone is replacing command-backed fakenet probes with stable gRPC-native fakenet `poke` and `peek` operations once the node surfaces are reliable enough to treat as the source of truth.
