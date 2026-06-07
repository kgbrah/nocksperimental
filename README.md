# nocksperimental

Nocksperimental is a Nockchain product lab for testing, simulating, and publishing audit-ready evidence for NockApps.

Live deployment: https://nocksperimental.com

The product thesis is simple: serious NockApps need deterministic local testing, state replay, invariant checks, fakenet diagnostics, and shareable verification surfaces before meaningful value can safely flow through them.

## What is here

- Fixture-driven NockApp lab runner with strict JSON schemas.
- Scripted `poke` and `peek` steps with state snapshots, replay logs, and invariant checks.
- Local fakenet adapter for health, balance, chain metadata, command kit, diagnostics, support bundles, and evidence capsules.
- Nockchain upstream intelligence for protocol docs authority, Rust crate mapping, releases, and operational watch items.
- Nockchain knowledge spine for exact upstream doc fingerprints, Rust workspace-member identity, coverage mapping, and monitoring rules.
- Nockchain Cargo surface for high-signal Rust manifests, binary/library targets, benchmark surfaces, source entrypoints, and crate-scoped checks.
- Nockchain Hoon kernel atlas for Hoon entrypoints, compiled jam targets, Rust embedding crates, cause/effect tags, and receipt-safe kernel identity.
- Nockchain protocol authority trace for protocol index/spec lifecycle, activation status, consensus-critical posture, and receipt fields.
- Nockchain bridge withdrawal trace for Base burn, Hoon kernel, Rust runtime, sequencer authorization, confirmation, and release-lag evidence.
- Nockchain state-jam provenance registry for Zorp state-jam/checkpoint metadata without storing raw PMA or state artifacts.
- Nockchain Rust workspace atlas for crate-level roles, validation gates, risks, and Nocksperimental integration uses.
- Nockchain Rust source guide for exact source files, symbols, line ranges, cargo gates, and receipt-safe anchors.
- Nockchain NockApp runtime atlas for poke/peek, PMA, gRPC, Nockup, Zorp lineage, and receipt-boundary interpretation.
- Nockchain upstream watch board for commit/release drift, Zorp lineage, state-jam, wallet/API, fakenet, and Rust workspace review signals.
- Zorp monitor review contract for classifying org, legacy redirect, authoring, lineage, and state-jam findings before they become receipt or runbook changes.
- Zorp collaboration flywheel for routing upstream findings through source authority, product-slice selection, receipt verification, and reusable ecosystem notes.
- Zorp Monitor Runbook for converting recurring Zorp/Nockchain monitor output into receipt-safe findings, source-authority classes, routed product updates, and verification commands.
- Nockchain Public API Source Trace for public gRPC enablement, endpoint posture, tx acceptance, block explorer cache, metrics, and receipt fields.
- Nockchain PMA source trace for metadata trailers, growth recovery, verified snapshots, event-log replay, and raw-state artifact boundaries.
- Nockchain Runtime Safety Trace for NockStack frame checks, jam/cue bounds, noun-space provenance, HAMT traversal, PMA offset bounds, and support-bundle fields.
- Nockchain Testkit/E2E Trace for upstream YAML scenarios, fakenet node orchestration, gRPC readiness, transaction lifecycle assertions, report JSON, and receipt-safe test evidence.
- Nockchain Nockup Source Trace for scaffold manifests, template cache, toolchain channels, dependency resolution, registry install paths, lockfiles, and untrusted-code warnings.
- Nockchain sync/gossip source trace for behind-tip gossip suppression, wrong-commitment triage, and fakenet receipt fields.
- Nockchain Mining/PoW Source Trace for fakenet miner commands, candidate block refresh, miner-kernel proof checks, network PoW separation, and receipt-safe mining diagnostics.
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

## Nockchain Knowledge Spine

The knowledge spine binds the current upstream Nockchain commit to exact SHA-256 fingerprints for the Tier 0 docs and promoted Tier 1 crate docs, the Rust workspace member list, and the Nocksperimental pages/APIs that cover each authority domain.

- `/nockchain/knowledge-spine`
- `/api/nockchain/knowledge-spine`

Use it when deciding whether Nocksperimental still understands the upstream source it is testing against. It records `documentFingerprints`, `workspaceMemberHash`, coverage domains, update triggers, and forbidden fields such as `rawPmaSlab`, `rawStateJam`, and `walletSeedPhrase`.

Run `npm run check:nockchain-docs-drift -- --json` to compare those pinned Tier 0 and promoted Tier 1 document fingerprints against the live raw docs from `nockchain/nockchain` master before treating the knowledge spine as current receipt authority.

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

The bridge source trace pins the latest bridge withdrawal execution path to exact upstream Rust files, symbols, and line ranges. It maps runtime loop activation, kernel poke/peek seams, withdrawal execution effects, proposal assembly, sequencer authorization, public Nockchain submission, confirmation polling, orphan retry, durable sequencer store state, append-only journal records, and opt-in `bridge-dev` scenario evidence into receipt fields. It preserves the key operational distinction that peer-canonical is not submit-ready, submitted is advisory, and confirmation requires observed block inclusion plus depth.

- `/nockchain/bridge/source`
- `/api/nockchain/bridge-source`

Use it when a bridge, VESL, x402, Launch Evidence, or support-bundle receipt needs to cite the exact Rust boundary behind a withdrawal state without storing raw transaction jams, authorized raw transactions, Tenderly credentials, R2 tokens, sequencer journal signing keys, object-store secrets, or bridge node private keys.

Run `npm run check:nockchain-bridge-source-drift -- --json` to compare the pinned bridge source anchors and `bridge-dev` scenario fixtures against current upstream `nockchain/nockchain` master before relying on bridge withdrawal source evidence.

## Nockchain Release Asset Manifest

The release asset manifest records metadata for the current Nockchain build release: binary tarballs for `nockchain`, `nockchain-wallet`, `nockup`, `hoon`, `hoonc`, plus `nockchain-manifest.toml`. It groups assets by tool and platform, preserves BLAKE3 and SHA1 hashes from the upstream manifest, and makes local fakenet, wallet, and Nockup receipts cite the exact upstream binary source without storing downloaded artifacts.

- `/nockchain/releases`
- `/api/nockchain/release-assets`

Run `npm run check:nockchain-release-assets-drift -- --json` to compare the pinned uploaded asset metadata against the live GitHub latest-release API. GitHub's release page may show two extra generated source archives; Nocksperimental tracks the uploaded release assets used for binary/build provenance.

Use it when a test run depends on a downloaded Nockchain binary, wallet build, Nockup build, Hoon toolchain, or release manifest.

## Zorp/Nockchain Upstream Map

The Zorp upstream map keeps the Zorp organization, canonical Nockchain repo, the legacy `zorp-corp/nockchain` redirect, and the Zorp state-jam Drive folder in the same machine-readable view. It classifies public Zorp repos by signal layer: Jock language authoring, NockApp lineage, Sword runtime lineage, formal Nock semantics, proof tooling, and lower-signal CI/tooling repos. It also exposes a source-authority matrix and monitor review contract so receipts can distinguish canonical protocol authority, Zorp lineage/authoring signals, metadata-only state-jam provenance, and low-signal tooling.

- `/api/nockchain/zorp`
- `/nockchain/zorp`

Use it when interpreting whether a source is current protocol authority, historical lineage, state-jam provenance, or future product signal for Nocksperimental receipts.

The Zorp intelligence page renders the same map as an operator brief: priority repos, canonical relocation, lineage risk flags, state-jam metadata boundaries, a repository watch matrix, a monitor review contract, and concrete actions for turning Zorp/Nockchain changes into receipt or test assumptions.

Run `npm run check:zorp-org-drift -- --json` to compare the pinned Zorp org repository inventory against the live GitHub org API; the check treats Zorp repos as lineage/authoring signals, keeps the State Jam Drive folder metadata-only, and reports the impacted review class, source route, target surface, receipt field, and verification command for any repo drift.

It also carries README-backed source notes for `zorp-corp/jock-lang`, archived `zorp-corp/nockapp`, archived `zorp-corp/sword`, `zorp-corp/knock`, and `zorp-corp/sppark` so Jock authoring, NockApp poke/peek lineage, Sword persistence history, Knock formal semantics, and sppark proof primitives can inform fixtures or benchmark thinking without outranking current Nockchain protocol authority.

The same API now exposes a collaboration flywheel named `zorp-monitor-to-fixture-flywheel`: observe upstream, classify authority, route a product slice, verify receipts, then share a collaboration note. Source routes such as `canonical-runtime-refresh`, `authoring-fixture-review`, and `state-jam-provenance-inventory` make it explicit which Nocksperimental surface should respond to each Zorp/Nockchain signal while keeping `rawStateJam`, `rawPmaSlab`, wallet seeds, signing keys, Tenderly keys, and R2 tokens out of public evidence.

## Zorp Monitor Runbook

The Zorp monitor runbook turns recurring checks of `zorp-corp`, the legacy `zorp-corp/nockchain` redirect, canonical `nockchain/nockchain`, and the Zorp state-jam Drive folder into a receipt-safe finding contract. It names the active monitor automation, superseded watch jobs, watched sources, classification flow, source-authority classes, route matrix, forbidden raw artifact fields, the local snapshot command `node scripts/run-zorp-monitor-snapshot.mjs --json`, and the drift command `npm run check:zorp-org-drift -- --json`.

- `/api/nockchain/zorp/monitor`
- `/nockchain/zorp/monitor`

Use it when a monitor run reports a repository, release, protocol-doc, fakenet/mining, wallet/API, PMA/state-jam, Jock authoring, NockApp lineage, or Drive artifact metadata change. Findings must record source URL, source authority, target Nocksperimental surface, raw artifact policy, and verification command before changing receipt assumptions.

The runbook now includes a State-Jam Inventory Contract for the Drive folder. Drive changes must stay classified as Nockchain state-artifact provenance, not VESL evidence, and any accepted finding must inventory metadata such as artifact name, bytes, SHA-256, network, height or event boundary, producer, producing Nockchain build, consumer build, and custody notes without downloading raw state artifacts into the repo. Routed changes must refresh the state-jam registry, PMA source trace, local fakenet evidence, operations atlas, and registry checkpoint gates before tests trust the artifact.

## Nockchain State-Jam Provenance

The state-jam provenance endpoint tracks metadata requirements and watched sources for Nockchain state-jam/checkpoint artifacts, including the Zorp state-jam Drive folder. It is intentionally metadata-only: Nocksperimental records source identity, required hashes, network/height/build context, PMA boot and recovery safety, and safety policy, but does not store or redistribute raw PMA slabs, event logs, checkpoints, state jams, wallet exports, seed phrases, or private keys.

- `/api/nockchain/state-jams`
- `/nockchain/state-jams`

Use it when a fakenet receipt or bootstrap workflow needs to explain which state-jam source was considered, what provenance is still missing, and which Nockchain build/protocol context should be attached before trusting the artifact.

The state-jams page renders the same registry for operators: Zorp Drive folder classification, metadata-only policy, PMA boot and recovery safety, required provenance fields, verification questions, and the raw artifact denylist.

## Nockchain PMA Source Trace

The PMA source trace pins Nockchain's persistent memory arena and NockApp state-recovery path to exact Rust files and symbols. It follows PMA trailer metadata, growth and migration journal recovery, source PMA fdatasync before snapshot creation, ready snapshot verification, and SQLite event-log replay boundaries. It is receipt-oriented: publish metadata such as `pmaMetadataVersion`, `snapshotUsedBlake3`, `eventLogMaxEventNum`, `stateJamFingerprint`, `nockchainCommit`, and `nockchainBuild`, while keeping raw PMA slabs, copied snapshot PMAs, raw event-log SQLite files, raw state jams, and wallet secrets out of public evidence.

- `/api/nockchain/pma`
- `/nockchain/pma`

Run `npm run check:nockchain-pma-source-drift -- --json` to compare the commit-pinned PMA, snapshot, and event-log source anchors against current upstream `nockchain/nockchain` master before state-jam, fakenet, or Launch Evidence bootstrap receipts rely on them.

Use it when a fakenet, state-jam, support-bundle, VESL, Launch Evidence, or future NockApp export-state receipt needs to explain how durable kernel state was produced, verified, or replayed without redistributing chain/runtime state.

## Nockchain Runtime Safety Trace

The runtime safety trace pins NockVM failure triage to exact upstream source anchors for NockStack frame bounds, frame push/pop lifecycle, interpreter frame preservation, jam/cue decode checks, noun-space epoch and allocation provenance, fixed-depth HAMT preservation, and PMA direct-reader offset bounds. It is built for support bundles and bring-your-own fakenets: publish `nockvmCommit`, `nockchainBuild`, `runtimeSafetyIssue`, `stackFrameCheck`, `cueValidationError`, `pmaOffsetBoundsCheck`, `nounSpaceEpoch`, and `supportBundleTraceId`, while keeping raw jam payloads, PMA slabs, core dumps, stack memory, event logs, and wallet seed phrases out of public evidence.

- `/api/nockchain/runtime-safety`
- `/nockchain/runtime-safety`

Use it when a fakenet run, state-jam restore, malformed cue payload, PMA offset read, or NockVM panic needs a receipt-safe explanation before it becomes a test assumption or operator runbook change.

## Nockchain Testkit/E2E Trace

The testkit/E2E trace pins upstream scenario testing to exact source anchors for `nockchain-testkit` YAML schema types, E2E runner lifecycle, process/Docker node orchestration, fakenet CLI args, gRPC readiness and transaction checks, private mining controls, report JSON, gen2 peer-speedup reports, and upgrade/partition scenarios. It is built for anyone connecting their own fakenet: publish `scenarioName`, `scenarioSeed`, `runId`, `nodeMode`, `fakenetPhase`, `stepRecords`, `assertOutcomes`, `finalHeights`, `finalBlockIds`, and `artifactHash`, while keeping wallet seeds, private spend keys, raw wallet exports, raw PMA slabs, raw state jams, raw logs, and raw transaction payloads out of public evidence.

- `/api/nockchain/testkit-e2e`
- `/nockchain/testkit-e2e`

Use it when a Nockup validation run, Launch Evidence case, VESL bridge proof, BYO fakenet submission, or support bundle needs to cite the exact upstream scenario vocabulary behind a test result.

## Nockchain Nockup Source Trace

The Nockup source trace pins scaffold and dependency behavior to exact upstream files for `crates/nockup`: the experimental README contract, manifest schema, project init flow, template and manifest cache refresh, toolchain channel manifest download, resolver graph, registry `install_path`, package symlink installation, package cache index, and git fetcher. It is built for scaffold receipts: publish `nockupCommit`, `nockchainBuild`, `templateName`, `templateCommit`, `manifestHash`, `dependencySpecs`, `resolvedPackageCommits`, `installPathMap`, `lockfileHash`, `cacheChannel`, and `validationStatus`, while keeping raw template archives, git checkouts, `nockapp.toml`, Hoon source, compiled jams, GPG private keys, wallet seeds, and private spend keys out of public evidence.

- `/api/nockchain/nockup/source`
- `/nockchain/nockup/source`

Use it when Nockup-generated apps become Launch Evidence, VESL bridge, BYO fakenet, or NockApp test subjects and the receipt needs to preserve scaffold/template/dependency provenance without redistributing source artifacts.

## Nockchain Rust Workspace Atlas

The Rust workspace atlas breaks the upstream Nockchain monorepo into crate groups with roles, primary cargo checks, risk posture, and Nocksperimental integration uses. It tracks all 36 upstream workspace members, plus the extra `chaff` support lineage crate, and highlights chain runtime, operator tools, NockApp runtime, Hoon/nockup scaffolding, bridge/proof, and serialization support crates. The bridge/proof lane now keeps `bridge-dev` visible as the merged PR #127 implementation-fixture surface for bridge withdrawal scenarios before settlement checks become public receipts.

- `/nockchain/rust`
- `/api/nockchain/rust-atlas`

Use it when deciding which upstream crate should anchor a test assumption, which cargo gate belongs in a receipt, or which watch item should become the next Nocksperimental product slice.

Run `npm run check:nockchain-cargo-workspace-drift -- --json` to compare the pinned root `Cargo.toml` manifest hash, resolver, workspace member set, and workspace member hash against upstream `nockchain/nockchain` master before trusting crate-level Rust assumptions.

## Nockchain Rust Source Guide

The Rust source guide anchors the crate atlas to exact current upstream files, symbols, line ranges, cargo gates, receipt fields, and forbidden fields. It covers node startup, mining key configuration, libp2p catch-up and gossip suppression, NockApp poke/peek, PMA and snapshot safety, NockStack frame checks, wallet commands and transaction planning, public API/gRPC wire conversion, bridge withdrawal runtime, sequencer journal construction, bridge-dev opt-in scenarios, and nockup scaffolding.

- `/nockchain/rust/source`
- `/api/nockchain/rust-source`

Use it when a fakenet, NockApp, wallet, bridge, VESL, or nockup receipt needs exact Rust implementation evidence without storing raw PMA slabs, state jams, event logs, raw transactions, gRPC payloads, wallet seed phrases, private spend keys, object-store secrets, or sequencer signing keys.

## Nockchain Cargo Surface

The Cargo surface turns upstream manifests and source entrypoints into a Rust target map for Nocksperimental. It tracks high-signal crates such as `nockchain`, `nockchain-wallet`, `nockchain-api`, `nockapp`, `nockup`, `nockchain-libp2p-io`, `wallet-tx-builder`, `nockchain-bridge-sequencer`, and `nockvm`; all 36 pinned crate `Cargo.toml` SHA-256 and byte-count snapshots; their binary/library/bench targets; dependency pins; dependency-risk families; source focus paths; and crate-scoped cargo checks.

- `/api/nockchain/cargo-surface`
- `/nockchain/cargo-surface`

Use it when translating an upstream Rust change into the exact binary, library, benchmark, dependency family, or source file that needs verification. The dependency risk matrix maps libp2p sync, wallet transaction construction, NockApp/PMA, bridge settlement, proof/compute, and noun serialization changes to the receipt fields, target surfaces, and crate-scoped cargo checks that should be reviewed before evidence is trusted. The current surface records that `cargo 1.96.0` and `cargo metadata --no-deps --format-version 1` are available when `$HOME/.cargo/bin` is on `PATH`, while full crate checks may still fetch or build upstream dependencies.

Run `npm run check:nockchain-cargo-manifests-drift -- --json` to compare every pinned crate manifest path, SHA-256 hash, byte count, and aggregate manifest catalog hash against upstream `nockchain/nockchain` master before treating crate targets, dependency surfaces, or feature flags as current evidence.

## Nockchain Hoon Kernel Atlas

The Hoon kernel atlas maps upstream Hoon entrypoints to compiled jam assets and Rust embedding crates. It tracks `assets/dumb.jam`, `assets/miner.jam`, `assets/wal.jam`, `assets/peek.jam`, and `assets/bridge.jam`; the corresponding `hoon/apps/...` sources; kernel crates under `crates/kernels/*`; consumer crates such as `nockchain`, `nockchain-wallet`, `nockchain-peek`, and `bridge`; and receipt fields for consensus, mining, wallet, peek, and bridge evidence.

- `/api/nockchain/hoon-kernels`
- `/nockchain/hoon-kernels`

Use it when a test or receipt depends on the deterministic Hoon/Nock kernel behind a Rust command. The surface is metadata-only: it records kernel id, jam asset, Hoon source, Rust consumer, commit/build, cause/effect tags, and source anchors without storing raw jam bytes, kernel state, PMA slabs, state jams, event logs, wallet seed phrases, or private keys.

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

The atlas now includes a Transaction Source Contract for the released wallet transaction path. It pins `wallet-tx-builder` and `nockchain-wallet create-tx` source files, hashes, planner/fee/word-count/lock/note-data symbols, receipt fields, and raw transaction forbidden fields so tests can cite Rust provenance without storing unsigned transactions, signed transactions, transaction jams, wallet databases, or key material. Upstream PR #116 for wallet `memo`/`blob` transaction note data is tracked only as `open-pr-early-warning` until it lands in a released Nockchain build.

- `/nockchain/wallet`
- `/api/nockchain/wallet`

Use it when a balance, reward, or transaction test needs to say which wallet command was run, which endpoint mode was used, and which wallet secrets must stay out of receipts and support bundles.

Run `npm run check:nockchain-wallet-source-drift -- --json` before relying on the Transaction Source Contract; it compares the pinned wallet Rust source anchors, required symbols, and PR #116 memo/blob early-warning status against current upstream Nockchain.

## Nockchain Public API Source Trace

The public API source trace anchors the wallet/API atlas to exact upstream `nockchain-api`, `nockapp-grpc`, `nockapp-grpc-proto`, `nockchain-wallet`, and `nockchain` files. It records public gRPC enablement, alpha/no-auth access-control posture, wallet public-client `tx-accepted`, block explorer cache warm-up, heaviest-chain freshness, metrics, gRPC-Web guardrails, and endpoint modes without storing raw transactions, raw noun slabs, private gRPC poke payloads, wallet seed phrases, private keys, or API server keys.

- `/nockchain/api/source`
- `/api/nockchain/api-source`

Use it when a hosted or user-connected fakenet test needs to prove which API endpoint answered, whether the endpoint was private gRPC, public gRPC, or hosted HTTP manifest mode, and whether `tx-accepted` means node acceptance rather than block inclusion.

## Nockchain Upstream Watch

The upstream watch board records the live GitHub API sources and the current observed Nockchain/Zorp snapshot used to decide whether Nocksperimental assumptions need review. It separates canonical Nockchain commit/release drift from Zorp lineage updates, state-jam Drive inventory, wallet/API command drift, fakenet mining symptoms, and Rust workspace ownership changes. Its change classification contract maps each upstream signal class to the Nocksperimental atlas, receipt, test, or operator-runbook surface that must be refreshed before new evidence is trusted.

- `/nockchain/watch`
- `/api/nockchain/watch`

Use it before interpreting fakenet failures or publishing receipts: if the pinned Nockchain commit/release no longer matches the observed upstream snapshot, or a high-severity watch item changed, refresh the relevant atlas before treating the evidence as current.

Run `npm run check:nockchain-upstream-drift -- --json` to aggregate the docs, Cargo workspace, crate manifest, bridge source, wallet source, release asset, PR radar, Zorp org, PMA source, and mining source drift checks into one monitor report before treating the watch board as current.

### Drift Status (public freshness snapshot)

The drift-status surface publishes the latest aggregate drift result as a committed, deterministic snapshot so anyone can confirm Nocksperimental is still pinned to the exact Nockchain build it tests against — without a live fetch at request time.

- `/nockchain/drift-status`
- `/api/nockchain/drift-status`

The snapshot lives at `src/data/nockchain-drift-status.json` and is read offline by the page, API, and tests. Run `npm run refresh:nockchain-drift-status` (or `-- --dry-run` to preview) to regenerate it from the live aggregate check. The scheduled `.github/workflows/nockchain-drift-monitor.yml` Action refreshes it daily and opens a pull request when drift is detected. Each entry carries a `status`, `observedAt`, and a computed `freshness` (`stale` once the snapshot is older than `maxAgeHours`); the surface stays a watch board, never authority, and never publishes raw chain state or secrets.

## Nockchain PR Radar

The PR radar tracks currently open upstream Nockchain pull requests and open issues as early-warning signals before they become canonical behavior. Current snapshot: 35 open PRs and 1 open non-PR issue. It classifies Nockup manifest rendering, AI PoW puzzles, benchmark work, wallet blob/memo metadata, offline wallet signing, NockApp state export, PMA snapshot/event-log work, runtime stack-frame safety, JAM cue hardening, P2P gossip bounds, gRPC message sizing, stack-size behavior, install-path fixes, extension hooks, template pinning, x402 agentic-payment specs, parser work, Hoon app surfaces, and height-bound validation by target Nocksperimental surface, receipt impact, and verification command.

- `/nockchain/pr-radar`
- `/api/nockchain/pr-radar`

Use it when deciding whether a pending upstream PR or open issue should refresh a Nockup, wallet, NockApp, PMA/state-jam, operations, Rust atlas, compute benchmark, protocol trace, x402, or generated-report contract. Open and draft PRs are not protocol authority; they are review triggers for tests and receipts.

Run the live drift check before relying on the static radar:

```bash
npm run check:nockchain-pr-radar-drift -- --json
```

The drift check compares the local radar against the GitHub pulls/issues APIs for PR number, title, draft status, `updatedAt`, and author. A `drift` result means the PR radar should be refreshed before product, receipt, or monitor decisions.

## Nockchain Impact Queue

The impact queue turns current Nockchain releases, open PRs, Zorp lineage, and state-jam provenance into concrete Nocksperimental work items. It groups bridge withdrawal execution, Nockup template manifests, wallet blob/memo metadata, NockApp state export, PMA/state-jam provenance, fakenet sync/gossip diagnostics, Zorp/Jock authoring lineage, and benchmark/AI PoW puzzle signals by action lane, target surface, receipt fields, forbidden fields, and verification gates.

- `/nockchain/impact`
- `/api/nockchain/impact`

Use it when deciding what to build or refresh next after upstream movement. Released commits can update receipt expectations only when the build tag is recorded; open PRs are early-warning signals; Zorp repos are lineage and authoring signals; state-jam and PMA sources stay metadata-only unless a local operator handles raw artifacts outside public registries.

## Nockchain Sync/Gossip Source Trace

The sync/gossip trace turns the latest Nockchain `nockchain-libp2p-io` source change into a receipt-safe diagnostic contract. It anchors `CatchUpSignal::is_catching_up`, `P2PState::should_suppress_outgoing_gossip`, driver `%gossip` fan-out, the `gossip_suppressed_behind_tip_total` metric, and upstream suppression tests so wrong block commitments, empty route tables, quiet mining output, and tx gossip silence can be interpreted with sync mode and Zorp/state-jam provenance attached.

- `/nockchain/sync-gossip`
- `/api/nockchain/sync-gossip`

Use it when a local fakenet, user-connected fakenet, or state-jam-backed test needs to decide whether a symptom is connectivity failure, stale state, or intentional behind-tip gossip suppression before publishing Nocksperimental evidence.

## Nockchain Mining/PoW Source Trace

The mining/PoW source trace anchors upstream fakenet miner scripts, CLI flags, fakenet difficulty constants, mining driver wires, candidate block refresh, miner Hoon proof checks, structured miner traces, and libp2p request/gossip PoW separation. It is built for local and bring-your-own fakenets: publish `miningPkh`, `fakenetPowLen`, `candidatePowLen`, `candidateHeader`, `minedBlockDigest`, `routeTableSize`, and `connectedPeerCount`, while keeping raw miner jams, raw candidate nouns, raw PoW proofs, raw PMA/state artifacts, wallet seed phrases, and private spend keys out of public evidence.

- `/nockchain/mining/source`
- `/api/nockchain/mining-source`

Run `npm run check:nockchain-mining-source-drift -- --json` to compare the commit-pinned mining and PoW source anchors against current upstream `nockchain/nockchain` master before fakenet mining or block-commitment receipts rely on them.

Use it when diagnosing wrong block commitments, empty routing tables, quiet fakenet miners, stale candidate work, or confusion between libp2p anti-spam PoW and block-mining proof.

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

### Upstream-anchored, Ed25519-signed badges

Verified badges are now bound to the exact Nockchain build they were verified against and are cryptographically signed for offline verification:

- Each badge records a `sourceAnchor` (`commit`, `build`) and resolves a `freshness` of `fresh | stale | unknown` by comparing that anchor to the current pinned upstream commit; a badge goes `stale` when Nockchain drifts past the commit it was verified against.
- Issuance receipts are signed with a real Ed25519 key (Node built-in, no dependency) over the canonical signed payload, which includes the `sourceAnchor`. `/api/trust/badges/verify` verifies the signature against the published issuer public key and reports `signatureCryptographicallyValid`, `freshness`, and `staleWarning` alongside revocation status.
- Issuer public keys are discoverable at `/api/trust/keys` with a rotation model (`validFrom`/`validUntil`/`status`); retired keys still verify the badges they signed, so verification never depends on trusting the hosted endpoint. Production signs with the `NOCKS_BADGE_ISSUER_SIGNING_SEED` env var; committed demo badges are signed with a public dev seed and can be regenerated with `npm run trust:badges:sign`.

Registry and discovery endpoints:

- `/registry`
- `/api/registry`
- `/api/registry/checkpoint`
- `/api/trust`
- `/api/trust/keys`
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
- `npm run lab:bridge:pack` generates a bridge settlement report with the bridge-settlement invariant pack.
- `npm run lab:pma` generates a PMA state-safety report with the pma-safety invariant pack.
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
- `npm run verify:invariant-packs` regenerates the bridge-settlement and pma-safety pack reports, asserts they pass with per-step state diffs, and verifies each pack's pinned `upstreamBasis` against the research doc. Packs are surfaced with their basis at `/api/invariants`.
- `npm run verify:6-18` checks verified badges, solver scores, token compatibility, compute benchmarks, and trust-signal consumers.
- `npm run verify:launch-evidence` checks Launch Evidence routes, registry discovery, manifests, and verifier behavior.
- `npm run test:launch-evidence-api` and `npm run test:launch-evidence-pages` run the focused Launch Evidence API and page suites.
- `npm run test:x402` runs the x402 metered-trust-API suite (config, verifier, meter cycle, facilitator mode, gating, discovery).
- `npm run check:nockchain-pr-radar-drift` compares the static Nockchain PR radar against current GitHub PR/issue metadata.
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
  `/api/fakenet/evidence/verify`, `/api/workspaces/evidence/verify`, `/api/invariants/packs/verify`)
  and premium reads (`/api/trust/compute-benchmarks/[id]`, `/api/trust/token-compatibility/[id]`,
  and the signed `/api/nockchain/drift-status/attestation`). Submits, lists, the free
  `/api/nockchain/drift-status` watch board, and the `/api/invariants` catalog stay free.
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
