# Nocksperimental Ecosystem Alignment

This note maps Nocksperimental to the Nockchain ecosystem without trying to replace official docs, wallets, explorers, pools, or infrastructure teams.

## Primary ecosystem surfaces

- Nockchain official site and docs: protocol narrative, roadmap, NockApp development, node operation, and ecosystem discovery.
- Nockchain GitHub / Zorp client: canonical node, wallet, and developer implementation surface.
- Iris Wallet: user-facing wallet surface.
- Nockblocks and nockscan: explorer surfaces.
- LambdaCollective, Nockbox, and SWPS: infrastructure builders.
- Nockbox CPU Pool, NockPool, H9-style pool infrastructure, and GoldenMiner-style GPU tooling: mining and pool surfaces.
- Base bridge / wrapped NOCK: cross-chain settlement and reconciliation surface.
- Future NockApp SDK, native tokens, intents, and compute markets: application and provider surfaces.

## How Nocksperimental supplements them

- Wallets: publish compatibility reports for app interactions, token displays, bridge states, and failure handling.
- Explorers: provide shareable report URLs, invariant summaries, registry checkpoints, and app-level evidence that complements chain-level facts.
- Infrastructure teams: offer CI-ready fakenet fixtures, replay logs, support bundles, and diagnostics for app teams building on their services.
- Mining pools and compute providers: publish neutral benchmark profiles, uptime/reliability evidence, and job-quality attestations.
- Bridge operators and funds: monitor transfer lifecycle states, delayed settlement, stuck withdrawals, and reconciliation reports.
- NockApp SDK builders: provide deterministic `peek`/`poke` fixtures, invariant packs, and local-to-CI report generation.
- Auditors: hand over structured pre-audit reports with state diffs, replay steps, and pass/fail invariant evidence.

## Product posture

Nocksperimental should be the evidence layer beside the ecosystem:

- not a wallet, but wallet compatibility evidence
- not an explorer, but report artifacts explorers can link to
- not a mining pool, but provider and pool quality reports
- not official docs, but runnable verification fixtures for app repos
- not an auditor, but the pre-audit harness that reduces audit ambiguity
