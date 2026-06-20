# PROJECT KNOWLEDGE BASE

**Generated:** 2026-06-05T18:59:56-04:00 (commit ec45a61, branch main)
**Last verified:** 2026-06-20 — structure, scripts, and conventions below confirmed
current at commit 97cafa0 (branch feat/interactive-gui-wallet). The branch's EVM /
wallet / on-chain-games / miner lane is now catalogued below (OVERVIEW, WHERE TO LOOK,
ANTI-PATTERNS) and in the per-directory guides `src/app/AGENTS.md`, `src/lib/AGENTS.md`,
and `src/lib/x402/AGENTS.md`.

## OVERVIEW

Nocksperimental is a Next.js App Router product lab for NockApp launch evidence:
fixtures, invariant checks, fakenet diagnostics, receipts, trust surfaces,
Nockchain atlases, x402 metering, and Cloudflare Worker deployment.

The `feat/interactive-gui-wallet` branch adds an **EVM lane**: a server-side
**read-only** viem layer over Base Sepolia (chainId 84532; Base mainnet 8453 is
registered-but-gated) that reads a federated 3-of-5 bridge, re-verifies on-chain
receipt anchors, and computes bridge conservation; a browser wallet/DeFi GUI (Reown
AppKit + wagmi — every write is signed client-side in the user's wallet); on-chain
commit-reveal games (`ForfeitFlip` on Base Sepolia, ETH + tNOCK) plus browser-only
provably-fair demos; and a client-side miner-ROI estimator with a copy-only NOCK
payout command builder. Foundry (solc 0.8.28) contracts live in `contracts/`. The
entire EVM lane is testnet/illustrative — no real value, no official Nockchain bridge.

## STRUCTURE

```
nocksperimental/
|-- src/app/        # Next pages and API route handlers
|-- src/lib/        # evidence, receipt, trust, registry, x402, EVM/Nockchain logic
|-- src/components/ # React UI incl. web3/ (wallet, swap, on-chain game components)
|-- contracts/      # Foundry (solc 0.8.28) EVM contracts: ForfeitFlip, NockEthAMM, NockSwapVault
|-- scripts/        # nocklab CLI, custom Node test shards, deploy smoke checks
|-- docs/           # strategy, deployment, research, specs, work plans
|-- fixtures/       # lab fixture inputs
|-- schemas/        # JSON contracts for fixtures, reports, trust/workspaces
|-- packs/          # reusable invariant packs
`-- src/data/       # static public registry/history/trust/workspace data
```

Per-directory guides carry the detailed rules for their trees: `src/app/AGENTS.md`,
`src/lib/AGENTS.md`, `src/lib/x402/AGENTS.md`. Read the one for the tree you are editing.

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Public/API route behavior | `src/app` | Route handlers should stay thin and delegate to `src/lib`. |
| Evidence and receipts | `src/lib/*evidence*`, `src/lib/*receipt*` | KV in production, memory fallback in local tests. |
| Nockchain context | `src/lib/nockchain-*`, `docs/research`, `docs/nockchain-watch.md` | Watch board is monitoring, not protocol authority. |
| Lab runner | `scripts/run-lab.mjs`, `packages/nocklab/`, `fixtures`, `packs`, `schemas` | Writes ignored `.nocklab/` artifacts. Published to npm as `nocklab` (extracted to `packages/nocklab/`); the repo itself stays `private`. |
| Product direction | `docs/strategy.md`, `docs/superpowers/specs` | Launch Evidence is the first product lane. |
| Cloudflare deploy | `wrangler.jsonc`, `open-next.config.ts`, `docs/deployment.md` | OpenNext Workers target. |
| EVM Base read layer + Foundry contracts | `src/lib/base-*`, `src/lib/chain-*`, `src/lib/bridge-supply.ts`, `src/app/api/{rpc/base,base,bridge}/`, `contracts/` | Read-only viem PUBLIC clients; NO private keys. RPC URL stays server-side — the browser reads via the `/api/rpc/base` proxy. `networks.ts` is the write gate (84532 enabled, 8453 gated). |
| Wallet GUI + AMM/swap/bridge flows | `src/app/providers.tsx`, `src/components/web3/`, `src/lib/{amm,swap}-contracts.ts`, `src/lib/orchestrator.ts` | Reown AppKit + wagmi. Every swap/AMM/burn/donate WRITE is built and signed in the user's browser wallet, gated by `WalletGate` + `isChainEnabled`. Off-chain mint/redeem is HTTP to a co-located loopback orchestrator (never the Worker). |
| On-chain & provably-fair games | `contracts/src/ForfeitFlip.sol`, `src/lib/flip-house.ts`, `src/lib/pocgames.ts`, `src/app/{play,pocgames}/`, `src/app/api/game/flip/` | Two-sided commit-reveal: the house commits `keccak256(serverSeed)` before the player stakes. On-chain `ForfeitFlip` (84532) carries real testnet value; `/pocgames` are browser-only (no value). `flip-house.ts` is the ONLY key holder (Worker secret). |
| Miner lab + payout economics | `src/lib/miner-performance-model.ts`, `src/lib/miner-specs.ts`, `src/lib/nock-payout.ts`, `src/app/{miner-lab,payouts}/` | Pure, deterministic, client-side. Miner Lab is an ESTIMATOR (calibrated `current`, modeled `forkA`) — not live mining. Payouts only emits a `nockchain-wallet create-tx` string the operator signs locally; never touches keys. |

## LAUNCH EVIDENCE DIRECTION

Before changing Launch Evidence, workspaces, receipts, trust badges, registry
signals, fakenet evidence, VESL evidence, or revenue-related surfaces, read:

- `docs/superpowers/specs/2026-06-05-launch-evidence-design.md`
- `docs/superpowers/specs/2026-06-05-vesl-evidence-bridge-design.md`
- `docs/strategy.md`

The product direction is Launch Evidence first: private evidence workspaces,
signed receipts, launch-readiness reports, optional public badges. Operator and
integrator lanes reuse the same evidence primitives instead of becoming separate
products.

## COORDINATION GATE

This repo may be worked on by multiple agents. Before editing files, check:

- `git fetch --all --prune`
- `git status --short --branch`
- `git branch --all --verbose --no-abbrev`
- `gh pr list -R kgbrah/nocksperimental --state all --limit 30`
- `gh issue list -R kgbrah/nocksperimental --state all --limit 30`

If another branch, PR, issue, or dirty file is already covering the same scope,
coordinate with that work instead of redoing it.

## CODEGRAPH

Use CodeGraph on this repo and any relevant local Nockchain-adjacent repo before
structural work.

- Use `codegraph_status` first to confirm the index is ready.
- Use `codegraph_context` for architecture, feature, and bug-context questions.
- Use `codegraph_files` for structure and file discovery.
- Use `codegraph_search`, `codegraph_callers`, `codegraph_callees`, and
  `codegraph_impact` for symbol-level work.

Use native text search only for literal strings, docs, generated artifacts, or
when CodeGraph does not cover the file type needed. If CodeGraph is unavailable,
state that in the handoff and keep discovery evidence concrete.

## COMMANDS

```bash
npm install
npm run dev
npm run lint
npm test
npm run lab:ci
npm run verify:6-18
npm run smoke:cloudflare
```

Key focused suites: `npm run test:x402`, `npm run test:bazaar`,
`npm run test:nockchain-watch`. CI currently runs `npm run lab:ci` only.

## CONVENTIONS

- npm is the package manager; keep `package-lock.json` authoritative.
- Tests are custom `node scripts/test-*.mjs` scripts, not Jest/Vitest.
- API route tests commonly import `GET`/`POST` handlers directly and stub
  `next/server` or Cloudflare context.
- Keep generated `.nocklab/` output out of Git.
- When invariant behavior changes, update schema, runner evaluator, API catalog,
  docs, and tests together.

## ANTI-PATTERNS

- Do not store or echo private keys, seed phrases, wallet exports, raw payment
  material, API keys, unredacted env dumps, raw PMA slabs, checkpoints, state
  jams, or event logs.
- Trust certs (badges/attestations): NEVER treat a committed/public key as a live
  trust anchor, and NEVER sign with a public demo seed (signing fails closed unless
  `NOCKS_BADGE_ISSUER_SIGNING_SEED` is set, or `NOCKS_ALLOW_DEV_SIGNING=1` for an
  explicitly non-authoritative demo). A `verified` cert must (a) be signed by an
  active, non-dev key, (b) bind to a non-empty report hash + snapshot root, and
  (c) re-derive pass/fail from the recorded steps/invariants — never trust a
  report's self-declared `summary.status`. A mock-fakenet run attests the fixture
  MODEL only (`model-attested`), not the deployed kernel (`app-report`); do not
  present model-attested or `expectRejected` (exploit-prevention) results as an
  "app works" cert. The regression gate is `npm run test:trust-forgery` — it must
  mint zero certs. See `adversarial-audit/`.
- Do not present mock lab or stub x402 behavior as live-chain truth.
- Do not use old READMEs, old Zorp repos, or remembered CLI behavior as
  Nockchain protocol authority without current Tier 0/Tier 1 support.
- Do not let x402 facilitator failures silently fall back to stub mode.
- Do not turn the Nockchain watch board into protocol authority; it is a weekly
  monitoring surface that complements docs/upstream/operations atlases.

EVM lane (branch-local — `feat/interactive-gui-wallet`):

- The EVM read layer is **keyless**: do NOT add a private key, signer, or
  `createWalletClient` to `base-rpc`/`base-bridge`/`chain-verify-base`/`chain-anchor`/
  `networks`/`bridge-supply` — they are viem PUBLIC clients (reads) only. The sole
  intentional key-holder is `flip-house.ts` (house operator, Worker secret).
- Never ship the dedicated RPC URL to the client. The browser reads through the
  same-origin `/api/rpc/base` proxy; keep its method allowlist to reads +
  `eth_sendRawTransaction` (already-signed bytes), never add account-unlocking or
  `eth_sign`-style methods, and keep it pinned to Base Sepolia.
- Do NOT enable Base mainnet (8453) real-value writes by flipping `enabled:true` or
  bypassing `isChainEnabled`/`ENABLED_CHAIN_IDS` until cross-chain flows are proven.
  Donations are the only mainnet exception, via the independent `isDonationAllowed()`.
- All EVM writes (swap/AMM/burn/transfer) are signed in the user's wallet via wagmi.
  Do NOT move signing into a Next route, the Worker, or the orchestrator — routes and
  the orchestrator verify/observe and pay from their OWN keys only.
- Commit-reveal fairness is load-bearing: the house commits before the player stakes;
  `reveal` reverts `BadReveal` unless `keccak256(serverSeed) == commit`; the outcome is
  fixed at play (no upper reveal bound) and `claimTimeout` pays the player the FULL
  `2*stake` pot and is callable by anyone. Do not add a deadline that flips the result,
  reuse a `commit`/serverSeed (`usedCommit` is permanent), expose a serverSeed before
  its round Settles, or present a not-yet-Settled round as a loss.
- Deployment JSON (`contracts/deployments/base-sepolia-84532.json`) and addresses in
  `networks.ts`/`*-contracts.ts` are PUBLIC testnet addresses/txids only — no keys.
  Deploy scripts read `DEPLOYER_PRIVATE_KEY` via `vm.envUint` (env, never argv). Note
  `bridge-supply.ts` deliberately uses a DIFFERENT address pair than `networks.ts`;
  keep them straight. `TNOCK_DECIMALS` is 16, not 18.
- Miner Lab numbers are illustrative model estimates, not realized earnings or
  live-protocol truth; keep `gpu-benchmarks.json` in sync with `miner-specs.ts` (a test
  enforces this). Payouts is a one-way transfer command builder — no keys, no
  swap/HTLC/timelock logic.
- Do NOT present bridge-supply or any of these reads as official Nockchain truth or
  real value: preserve `BRIDGE_DISCLOSURE` and the `conserved:false` flagging. ABI files
  under `src/lib/abi/` are extracted from Foundry artifacts — regenerate, never hand-edit.
