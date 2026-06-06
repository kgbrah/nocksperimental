# Zorp And Nockchain Research Notes

Updated: 2026-06-05

## Source Classification

The Google Drive folder at https://drive.google.com/drive/folders/1aEYZwmg4isTuYXWFn9gKPl92-pYndwUw is a Zorp/Nockchain state-jam folder, not a VESL folder. Treat it as chain/runtime bootstrap material and keep it conceptually separate from VESL evidence bridge work.

Zorp is the developer lineage behind the current Nockchain stack. The public Zorp organization is at https://github.com/zorp-corp. The Nockchain repository now resolves canonically to https://github.com/nockchain/nockchain.

## Current Repo Map

| Repo | Status | Why it matters |
| --- | --- | --- |
| `zorp-corp/jock-lang` | Active source repo | Jock is a developer-preview language that compiles to Nock. Its compiler is written in Hoon, runs on the NockApp architecture, and depends on `hoonc` from Nockchain. This is the best public signal for high-level Nock application authoring. |
| `zorp-corp/nockapp` | Archived, conceptually important | Describes NockApps as pure-functional state machines with automatic persistence and modular IO. The `crown` interface exposes kernel transitions through `poke()` and state inspection through `peek()`. |
| `zorp-corp/sword` | Archived, conceptually important | Earlier modern Nock runtime with automatic persistence. Treat as lineage/history for runtime persistence concepts, not as current operational source. |
| `zorp-corp/knock` | Old fork | Nock semantics in K. Useful for formal-semantics references, but low operational signal. |
| `nockchain/nockchain` | Canonical active repo | Protocol/runtime monorepo for Nockchain. This is the source of truth for fakenet/testnet behavior, NockApp runtime behavior, PMA, protocol docs, wallet/API behavior, and current node scripts. |

## Fresh Snapshot

As of this scan, the latest default-branch commit in `nockchain/nockchain` is `33ba97b1e206`, "bridge: add end-to-end withdrawal execution (#127)", committed 2026-06-05. That is directly relevant to bridge, settlement, VESL, and x402-adjacent receipts: the default branch now includes withdrawal assembly, signing, sequencer authorization, submission, confirmation polling, and journal persistence surfaces that are ahead of the latest public build release.

The latest public build release for Nockchain is still `build-5d022ced55040221e8b6fcfd78114189fbae91a0`, published 2026-06-02. Its commit remains important for behind-tip gossip suppression and local mining/sync symptoms, but monitoring should now explicitly distinguish default-branch bridge behavior from released-build behavior rather than assuming only one update channel.

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

The active Codex automation `watch-zorp-nockchain-repos-and-state-jams` is named "Watch Zorp/Nockchain state jams and repos". It runs every six hours and checks:

- the Drive state-jam folder
- https://github.com/zorp-corp
- https://github.com/nockchain/nockchain

High-signal changes to watch:

- Nockchain releases, build tags, stable-build tags, and default-branch commits
- `changelog/protocol/`, `PROTOCOL.md`, `ARCHITECTURE.md`, `WORKFLOWS.md`, and `DECISIONS/README.md`
- PMA docs and state migration notes
- fakenet scripts, mining scripts, libp2p changes, peer/sync behavior, and wallet/API changes
- bridge withdrawal docs/runtime/sequencer changes, especially when default branch is ahead of public build releases
- `jock-lang` compiler/runtime changes that affect NockApp or `hoonc`
- new or renamed state-jam artifacts in Drive

## Product Implications

Short term:

- Add Nockchain build/commit/state-jam provenance fields to fakenet and VESL evidence receipts.
- Surface sync/peer state near mining and balance checks so wrong-commitment failures are easier to interpret.
- Keep Drive artifacts out of git and treat them as external bootstrap inputs.

Medium term:

- Add a state-jam registry view that records artifact metadata without hosting raw chain state.
- Add a "connect your own fakenet" flow that verifies endpoints, wallet address, tip/sync status, and available peeks.
- Track Nockchain canonical-doc changes in the app's trust/research surface so testers can see when assumptions changed.
