# LIBRARY KNOWLEDGE

## OVERVIEW

`src/lib` is the domain core: lab reports, evidence submissions, receipt stores,
Nockchain atlases, trust/registry data, workspaces, Bazaar, and x402 metering. The
`feat/interactive-gui-wallet` branch also adds the EVM lane here: keyless Base read
clients (`base-*`/`chain-*`/`bridge-supply`), contract bindings (`*-contracts.ts`,
`abi/`), the `flip-house` operator (the one key holder), browser-only `pocgames`, the
loopback `orchestrator`, and the miner/payout models.

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Lab reports | `lab-report.ts`, `generated-*` | Report hashes and provenance are public contracts. |
| Fakenet | `local-fakenet-*`, `fakenet-*` | Local adapter and persisted evidence receipts. |
| Nockchain | `nockchain-*`, `zorp-upstream.ts` | Docs/upstream/watch/operations/wallet/state-jam views. |
| VESL/Nockup | `vesl-*`, `nockup-*` | Evidence normalizers and receipt stores. |
| Trust | `trust-*`, `registry-*`, `verification-index.ts` | Badges, score history, updates, registry checkpoints. |
| Workspaces | `workspace-*` | Evidence, upload policy, upload token signing. |
| Bazaar | `bazaar/*` | Trust-filtered discovery; facilitator discovery is graceful. |
| x402 | `x402/*` | See nested `src/lib/x402/AGENTS.md`. |
| Resolve a chain's RPC URL | `base-rpc.ts` | `rpcUrlFor(chainId)`: env secret `BASE_SEPOLIA_RPC_URL`/`BASE_MAINNET_RPC_URL` else public RPC. Server-side ONLY — holds no key. |
| Which EVM chain is live / write gate | `networks.ts` | `APP_NETWORKS` source of truth. 84532 `enabled:true`; 8453 `enabled:false` (gated). `DEFAULT_CHAIN_ID=84532`. `isChainEnabled` gates writes; `isDonationAllowed` is independent. |
| Read live bridge status | `base-bridge.ts` | `readBridgeStatus(84532)`: viem PUBLIC client reads MessageInbox roster/THRESHOLD/withdrawalsEnabled + Deposit/Burn logs (800-block window). No keys, no writes. |
| Re-verify a receipt anchor on-chain | `chain-verify-base.ts` | `verifyBaseAnchor`: re-fetches receipt+block from RPC; `onChain` only if txMined AND blockMatched AND blockExists AND logMatched. Chain, not signature, is truth. |
| Anchor shape / equality | `chain-anchor.ts` | `buildBaseAnchor`/`isWellFormedAnchor`/`anchorsEqual`(`canonicalAnchor`). `evm-full` requires hex fields + logIndex; order-independent equality binds a signed anchor to its display. |
| Bridge supply / conservation | `bridge-supply.ts` | tNOCK `totalSupply`+`lastDepositNonce` live; Nock side from loopback orchestrator → `bridge-supply-snapshot.json` fallback. Uses a DIFFERENT address pair than `networks.ts` — keep them straight. Carries `BRIDGE_DISCLOSURE`; `conserved:false` on negative residual. |
| House operator (the ONLY key holder) | `flip-house.ts` | Holds `NOCKS_FLIP_HOUSE_KEY` (Worker secret) → `privateKeyToAccount`/`createWalletClient`. Stateless: `serverSeed=keccak256(domain‖addr‖houseKey‖roundId)`. Signs openRound/reveal/cancel only; never moves player funds. |
| Game/AMM/vault contract addresses | `game-contracts.ts`, `amm-contracts.ts`, `swap-contracts.ts` | Mirror `contracts/deployments/base-sepolia-84532.json`. `TNOCK_DECIMALS=16` (NOT 18). `FlipStatus` mirrors the on-chain enum order — never use bare ints. |
| tNOCK burn lockRoot | `swap-contracts.ts` | `lockRootForNockAddress = sha256(utf8 base58 addr)` — MUST match the orchestrator's `lockRootForAddress` in lockstep or redemptions break. |
| NICKS↔NOCK math + shell-safe addrs | `donation.ts` | bigint nicks (65536/NOCK), strict base58 (shell-injection-safe), fail-closed `isPlaceholder`. `nock-payout.ts` reuses this for all validation. |
| Browser-only provably-fair verifier | `pocgames.ts` | Pure dependency-free SHA-256, rejection-sampled draws (no modulo bias), `play`/`verify` for the demos. NO value, no chain; icons live in `game-icons.ts` (keep React out of `pocgames.ts`). |
| Off-chain bridge mint/redeem client | `orchestrator.ts` | `orchestratorPost`/`Get` to a co-located loopback service (default `127.0.0.1:8787`); cannot run in the Worker. Keep the mixed-content/loopback guards. |

## CONVENTIONS

- Keep validation/result builders deterministic and side-effect-light; route
  handlers own HTTP details.
- Static JSON data in `src/data` is read through typed helper functions here.
- KV-backed stores use Cloudflare binding in production and in-memory fallback
  for local tests unless docs explicitly say fail closed.
- Receipt/provenance objects should include enough source context to explain
  which Nockchain docs/build/fixture/fakenet context produced the result.
- When adding a public verifier, wire its API route, verification index, OpenAPI,
  registry/well-known discovery, docs, and focused script test together.

## ANTI-PATTERNS

- Do not store or echo secrets, seed material, private keys, wallet exports,
  raw payment payload secrets, raw PMA slabs, checkpoints, state jams, or raw
  event logs.
- Do not flatten upstream Nockchain ambiguity; carry doc consistency alerts and
  provenance into receipts where relevant.
- Do not treat mock fixture execution or stub x402 verification as live-chain
  proof.
- Do not hide production persistence requirements behind memory fallback.
- EVM keyless boundary: `base-*`/`chain-*`/`networks`/`bridge-supply` use viem PUBLIC
  clients only — grepping them for a 64-hex key, signer, or `createWalletClient` should
  find nothing. The single intentional key-holder is `flip-house.ts` (Worker secret,
  operator actions only). Do not move EVM signing into any other lib module.
- ABI files `abi/forfeit-flip*.ts` are extracted from Foundry artifacts — do not
  hand-edit; regenerate when the `.sol` changes (the token ABI carries the extra
  `amount` arg). Miner Lab numbers are model estimates, not realized earnings.
