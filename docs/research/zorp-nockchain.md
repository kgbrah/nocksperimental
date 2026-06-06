# Zorp And Nockchain Research Notes

Updated: 2026-06-06

## Source Classification

The Google Drive folder at https://drive.google.com/drive/folders/1aEYZwmg4isTuYXWFn9gKPl92-pYndwUw is a Zorp/Nockchain state-jam folder, not a VESL folder. Treat it as chain/runtime bootstrap material and keep it conceptually separate from VESL evidence bridge work.

Zorp is the developer lineage behind the current Nockchain stack. The public Zorp organization is at https://github.com/zorp-corp. The legacy https://github.com/zorp-corp/nockchain URL redirects to the canonical https://github.com/nockchain/nockchain repository, so receipts should record the canonical repo for protocol claims and the Zorp org for lineage/ecosystem signals.

## Source Authority Matrix

| Source | Role | How Nocksperimental should use it |
| --- | --- | --- |
| `nockchain/nockchain` | canonical-protocol-authority | Source of truth for protocol, runtime, wallet, fakenet, PMA, releases, and Tier 0 docs. |
| `zorp-corp/nockchain` | legacy-redirect | Historical Zorp URL that resolves to `nockchain/nockchain`; monitor it as an alias, not a second authority. |
| `zorp-corp` public repos | lineage-and-authoring-signal | Lineage and ecosystem signal for Jock authoring, NockApp history, Sword persistence history, formal semantics, and proof-adjacent work. |
| Zorp State Jam Drive folder | state-artifact-provenance | Metadata-only provenance source for state-jam/checkpoint artifacts; not VESL evidence and not raw data to commit or redistribute. |

## Current Repo Map

| Repo | Status | Why it matters |
| --- | --- | --- |
| `zorp-corp/jock-lang` | Active source repo | Jock is a developer-preview language that compiles to Nock. Its compiler is written in Hoon, runs on the NockApp architecture, and depends on `hoonc` from Nockchain. This is the best public signal for high-level Nock application authoring. |
| `zorp-corp/nockapp` | Archived, conceptually important | Describes NockApps as pure-functional state machines with automatic persistence and modular IO. The `crown` interface exposes kernel transitions through `poke()` and state inspection through `peek()`. |
| `zorp-corp/sword` | Archived, conceptually important | Earlier modern Nock runtime with automatic persistence. Treat as lineage/history for runtime persistence concepts, not as current operational source. |
| `zorp-corp/knock` | Old fork | Nock semantics in K. Useful for formal-semantics references, but low operational signal. |
| `nockchain/nockchain` | Canonical active repo | Protocol/runtime monorepo for Nockchain. This is the source of truth for fakenet/testnet behavior, NockApp runtime behavior, PMA, protocol docs, wallet/API behavior, and current node scripts. |

## Fresh Snapshot

As of the 2026-06-06 scan, the public `zorp-corp` organization has 10 repositories. The highest-signal sources for Nocksperimental are `zorp-corp/jock-lang`, `zorp-corp/nockapp`, `zorp-corp/sword`, `zorp-corp/knock`, and `zorp-corp/sppark`. `jock-lang` is the only active core authoring repo in that set; `nockapp` and `sword` are archived but still important lineage for NockApp state-machine language, poke/peek vocabulary, and runtime persistence history.

As of this scan, the latest default-branch commit in `nockchain/nockchain` is `33ba97b1e206`, "bridge: add end-to-end withdrawal execution (#127)", committed 2026-06-05. That is directly relevant to bridge, settlement, VESL, and x402-adjacent receipts: the latest public build release now includes withdrawal assembly, signing, sequencer authorization, submission, confirmation polling, and journal persistence surfaces.

The latest public build release for Nockchain is `build-33ba97b1e206dd89b15c61b72b7802caf2136c18`, published 2026-06-06. The earlier `5d022ced5504` commit remains important for behind-tip gossip suppression and local mining/sync symptoms, but monitoring should explicitly distinguish current release state from older source signals rather than assuming only one update channel.

## Canonical Docs Policy

Nockchain's `START_HERE.md` defines a trust contract for docs:

- Tier 0 canonical spine: `START_HERE.md`, `PROTOCOL.md`, `ARCHITECTURE.md`, `WORKFLOWS.md`, and `DECISIONS/README.md`.
- Tier 1 scoped canonical docs are only authoritative for their declared subsystem scopes.
- Tier 2 and legacy docs are useful context, but not protocol or architecture authority.

For Nocksperimental, this means automation and humans should not trust random README fragments as current protocol truth. Anything user-facing that claims Nockchain behavior should cite or derive from the Tier 0 spine or a declared Tier 1 scope.

## PMA And State Jams

PMA is durable local kernel-state storage, not a disposable cache and not a consensus artifact. Raw PMA files should not be imported from third parties or committed to git. For bootstrap/recovery, prefer trusted state jams or other supported bootstrap artifacts.

Important PMA/state artifacts include:

- `pma/` slabs and metadata sidecars
- `event-log.sqlite3` plus WAL/SHM sidecars
- `checkpoints/`
- verified snapshots and manifests

For the state-jam Drive folder, we should track visible filenames, sizes, timestamps, manifests, checkpoint heights if provided, hashes if provided, and whether the artifact is meant for mainnet, testnet, fakenet, or development bootstrap.

## Interpretation For Nocksperimental

Nocksperimental should treat Zorp/Nockchain as the protocol and runtime substrate, and VESL as a potential evidence/collaboration bridge. The products can align, but they occupy different layers:

- Zorp/Nockchain gives us chain state, fakenet/testnet node behavior, NockApp runtime mechanics, PMA/state-jam handling, Jock/Hoon/Nock build paths, wallet behavior, and peer/sync realities.
- VESL gives us a place to package and verify evidence from test functions, settlement flows, and reproducible fakenet checks.
- Our bridge should record chain provenance: Nockchain repo commit/build, protocol upgrade context, fakenet endpoint, state-jam/checkpoint identifier, wallet/address, and sync/peer status when a test was run.

This also argues for letting users connect their own fakenets. A useful test result should be portable across local nodes and external fakenets, but every receipt needs enough provenance to show which chain/runtime context produced it.

## Monitor Scope

The active Codex automation `monitor-zorp-and-nockchain-sources` is named "Monitor Zorp and Nockchain Sources". It runs every six hours and checks:

- the Drive state-jam folder
- https://github.com/zorp-corp
- the legacy https://github.com/zorp-corp/nockchain redirect
- https://github.com/nockchain/nockchain

High-signal changes to watch:

- Nockchain releases, build tags, stable-build tags, and default-branch commits
- `changelog/protocol/`, `PROTOCOL.md`, `ARCHITECTURE.md`, `WORKFLOWS.md`, and `DECISIONS/README.md`
- PMA docs and state migration notes
- fakenet scripts, mining scripts, libp2p changes, peer/sync behavior, and wallet/API changes
- bridge withdrawal docs/runtime/sequencer changes, especially when default branch is ahead of public build releases
- `jock-lang` compiler/runtime changes that affect NockApp or `hoonc`
- new or renamed state-jam artifacts in Drive

## Collaboration Flywheel

Nocksperimental should treat Zorp monitoring as a collaboration flywheel, not just a passive watch list:

1. `observe-upstream`: capture GitHub org/repo metadata, canonical Nockchain release or commit metadata, and state-jam Drive metadata as a `zorpMonitorFinding`.
2. `classify-authority`: apply the source-authority matrix before changing receipts, tests, or docs.
3. `route-product-slice`: pick the Nocksperimental surface that should move: watch board, Rust/source atlas, fakenet evidence, state-jam registry, nockup validation, generated fixture docs, or ecosystem notes.
4. `verify-receipts`: run the targeted test and checkpoint/lint/build gates that prove the change is reflected in public evidence without exposing raw state or secrets.
5. `share-collab-note`: summarize the reusable learning for Zorp/Nockchain collaborators and adjacent projects such as VESL.

Initial source routes:

| Source | Route | Primary surfaces |
| --- | --- | --- |
| `nockchain/nockchain` | `canonical-runtime-refresh` | `nockchainWatch`, `nockchainProtocolTrace`, `nockchainRustSourceGuide`, `registryCheckpoint` |
| `zorp-corp/jock-lang` | `authoring-fixture-review` | `nockupValidation`, `generatedLabReports`, `fixtureDocs` |
| `zorp-corp/nockapp` | `lineage-language-review` | `nockchainNockappAtlas`, `nockchainNockappSourceTrace`, `docsResearch` |
| `zorp-corp/sword` | `pma-runtime-vocabulary-review` | `stateJamRegistry`, `nockchainPmaSourceTrace`, `nockchainRuntimeSafety` |
| Zorp State Jam Drive folder | `state-jam-provenance-inventory` | `stateJamRegistry`, `localFakenetEvidence`, `nockchainOperationsAtlas` |

Every flywheel record should include `upstreamSourceUrl`, `observedAt`, `sourceAuthority`, `repoFullName`, `commitShaOrArtifactHash`, `affectedPaths`, `reviewDecision`, `nocksperimentalSurface`, `verificationCommand`, and `collaborationNoteUrl` when available. It must not publish raw state jams, PMA slabs, wallet seed phrases, private signing keys, Tenderly access keys, or R2 test tokens.

## Product Implications

Short term:

- Add Nockchain build/commit/state-jam provenance fields to fakenet and VESL evidence receipts.
- Surface sync/peer state near mining and balance checks so wrong-commitment failures are easier to interpret.
- Keep Drive artifacts out of git and treat them as external bootstrap inputs.

Medium term:

- Add a state-jam registry view that records artifact metadata without hosting raw chain state.
- Add a "connect your own fakenet" flow that verifies endpoints, wallet address, tip/sync status, and available peeks.
- Track Nockchain canonical-doc changes in the app's trust/research surface so testers can see when assumptions changed.
