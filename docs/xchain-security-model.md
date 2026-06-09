# Cross-chain (Nockchain ↔ Base) app security model

A tester for apps that span **Nockchain** and **Base** (Coinbase's EVM L2) to achieve an outcome. It
models a two-chain app's **joint state** in one process and verifies both that the steps achieve the
outcome and that the app upholds the cross-chain security properties — the boundary where these apps
actually break. It bolts onto the lab as `custom-function` invariants (no schema/registry change) and
reuses the `bridge-pack` (honest) and `attack-peek-leaks-seed` (`expectRejected`) idioms.

## Ground truth (modeled, not imported)

- The **real Nockchain↔Base bridge** is a **3-of-5 federated mint-and-burn** bridge, not an HTLC swap:
  `nockchain/crates/bridge/contracts/Nock.sol` (`burn(amount, lockRoot) → BurnForWithdrawal`) and
  `MessageInbox.sol` (mints wrapped-NOCK after a 3-of-5 bridge-node signature set; replay-keyed by
  `keccak256` of a Tip5-limb-encoded txId; confirmation-depth finality).
- Nockchain lock primitives (`nockchain/hoon/common/tx-engine-1.hoon`): `%hax` hashlock
  (**hash = Tip5**, a STARK-friendly algebraic hash — *not* sha256/keccak), `%tim` timelock (block
  heights), `%pkh` pubkey, `%brn` burn. An HTLC = `%hax`+`%pkh` claim path + `%tim`+`%pkh` refund path.
- **The central incompatibility:** Nockchain `%hax` uses Tip5; EVM uses keccak256. Solidity has no Tip5,
  Hoon has no keccak. A correct cross-chain HTLC still works *iff* both legs lock the **same shared
  preimage** each under its **own native hash** (revealing the preimage unlocks both); it breaks when an
  app assumes one shared *commitment* works on both chains, locks a leg under a hash that chain can't
  compute, or a leg's commitment isn't derived from the shared preimage.

## The 7 cross-chain security invariants

`custom-function` invariants in `scripts/run-lab.mjs`; reference by `fn` name.

| Invariant (`fn`) | Catches |
|---|---|
| `xchain-supply-conserved` | inflation / mint-from-nothing (minted ≤ burned, every mint backed by a burn) |
| `xchain-quorum-authorized` | under-quorum + unauthorized-signer minting (≥ threshold distinct authorized attestations) |
| `xchain-replay-safe` | replay / double-mint (each message id processed at most once) |
| `xchain-finality-depth` | premature / reorg double-spend (settle only after ≥ requiredConfirmations) |
| `xchain-hashlock-algo-match` | the Tip5-vs-keccak break (each leg's hash is chain-computable + derived from the shared preimage; distinct per-chain commitments) |
| `xchain-timelock-ordering` | HTLC free-option / theft (first-funded refund window > second leg's claim window) |
| `xchain-atomic-settlement` | partial execution / one-sided settlement / stuck funds (all-claimed XOR all-refunded) |

## Apps + attack catalog

Two honest fixtures (`mock-fakenet` → **model-attested**):
- `fixtures/xchain-federated-bridge.lab.json` — a correct 3-of-5 withdrawal (passes invariants 1–4 + 7).
- `fixtures/xchain-atomic-swap.lab.json` — a correct HTLC: both legs lock the shared preimage (Nockchain
  Tip5, Base sha256), safe timelock ordering, both claimed (passes invariants 5–7).

Eight `expectRejected` negative controls — each is caught by **exactly** its target invariant
(`scripts/xchain-verifier.mjs` proves the specificity):

| Attack fixture | Caught by |
|---|---|
| `attack-xchain-mint-without-burn` | `xchain-supply-conserved` |
| `attack-xchain-under-quorum` | `xchain-quorum-authorized` |
| `attack-xchain-unauthorized-signer` | `xchain-quorum-authorized` |
| `attack-xchain-replay` | `xchain-replay-safe` |
| `attack-xchain-premature-finality` | `xchain-finality-depth` |
| `attack-xchain-hash-algo-mismatch` | `xchain-hashlock-algo-match` |
| `attack-xchain-timelock-inversion` | `xchain-timelock-ordering` |
| `attack-xchain-one-sided-settlement` | `xchain-atomic-settlement` |

## Generalized to all EVM chains

The same tester works for Nockchain ↔ **any** EVM chain, driven by a chain registry
(`src/data/evm-chains.json`, 29 chains incl. testnets) with adversarially-verified, conservative
finality profiles. Each chain has a `family` (`evm` → `{keccak256, sha256}`; `nock` → `{tip5}`),
`recommendedMinConfirmations`, `confirmationBasis` (`native` / `L1-batch` / `L1-proof-verified`),
`trustSoftConfirm`, `challengeWindowSeconds`, `reorgRisk`. A leg/settle references a chain by
`chainId` (or a legacy name).

What changes vs a single fixed EVM chain:
- `xchain-hashlock-algo-match` is **registry-driven by family** — a Polygon↔Optimism or
  Nockchain↔Arbitrum HTLC is checkable with no code change. The Nockchain leg (family `nock`, Tip5)
  is what keeps the Tip5-vs-keccak break detectable.
- **Per-chain finality** matters: Base needs ~65 confirmations on `L1-batch` basis (an OP-stack L2's
  finality is the Ethereum L1 batch finalizing — a native-block count is not safety); Polygon PoS
  carries `reorgRisk: high` (a documented 157-block reorg) → floor 128; Avalanche ~1; zk-rollups
  finalize on L1 proof verification.

New, genuinely multi-EVM invariants (`custom-function`):

| Invariant (`fn`) | Catches |
|---|---|
| `xchain-chainid-bound` | **cross-EVM signature replay** — one ECDSA attestation valid on chain A minting the same withdrawal on chain B because the signed payload omits/mismatches the chainId (EIP-155). The headline multi-EVM attack. |
| `xchain-finality-adequacy` | confirmations `< max(app, registry floor[chain])`, wrong `confirmationBasis`, or trusting a reversible sequencer soft-confirmation |
| `xchain-per-chain-replay-namespacing` | replay across chains (key must be `(destChainId, id)`); mis-routing |
| `xchain-domain-separator-binding` | EIP-712 domain reuse — same/missing `(chainId, verifyingContract)` accepted at a sibling contract or another chain; stale separator on a fork |
| `xchain-challenge-window-respected` | crediting an optimistic-rollup withdrawal before its ~7-day fraud-proof window closes (unless L1-finalized or LP-bonded) |

New attack fixtures (each caught by exactly its target; `scripts/xchain-verifier.mjs` proves it):
`attack-xchain-signature-replay`, `attack-xchain-insufficient-finality-for-chain`,
`attack-xchain-replay-namespacing`, `attack-xchain-missing-domain-separator`,
`attack-xchain-challenge-window-violated`, `attack-xchain-evm-hashlock-family-mismatch`. Honest
example: `fixtures/xchain-multi-evm-bridge.lab.json` (Nockchain↔Arbitrum + Optimism endpoint).

The registry values are **conservative model inputs, not a live oracle** — clearly sourced and easily
updated. The live-EVM follow-on (below) turns them into real on-chain reads.

## Run it

```bash
npm run lab:ci              # all fixtures incl. cross-chain (2 honest pass, 8 attacks inverted-green)
npm run verify:xchain       # standalone forensic verifier: honest apps verify; each attack caught by exactly its target
npm run test:invariant-kinds  # per-fn pass+fail unit coverage
```

## Honest limits

A single-process **MODEL** of two chains → `model-attested`, never an `app-report` cert (the trust
pipeline keeps it so; `npm run test:trust-forgery` still mints zero certs). Faithful to the real bridge
(federated 3-of-5, Tip5/keccak limb-encoding, confirmation-depth finality) and Nockchain's real lock
primitives — not a live two-chain execution, and not a trustless HTLC primitive (the real bridge is
federated, and Tip5≠keccak makes naive shared-commitment HTLCs unsound).

## Live-base mode (shipped)

`environment.mode: "live-base"` reads the **real, Basescan-verified** Nockchain↔Base bridge on **Base
Sepolia (chainId 84532)** over a read-only [viem](https://viem.sh) client and feeds the on-chain facts
into the same `xchain.*` state the invariants consume — so the checks run over live chain data, not a
model. Contracts: `MessageInbox` `0x9b1becA13c39b9Be10dB616F1bE10C3CeF9Dfb36` (mints), `Nock`
`0xA9cd4087D9B050D8B35727AAf810296CA957c7B3` (burns). Implemented in `scripts/lib/base-evm-reader.mjs`
(read-only: `getBlockNumber` / `readContract` / `getLogs`; no signing, no keys).

```bash
export BASE_SEPOLIA_RPC_URL=https://sepolia.base.org   # or your own endpoint
npm run lab:base            # end-to-end live run over the verified deployment
npm run test:base-evm-reader # offline unit test (mock client, in default CI)
npm run test:base-evm-live   # opt-in live smoke test (graceful-skip without the RPC env var)
```

**What runs live, and what does not.** Only the Base-sourced subset runs: `xchain-quorum-authorized`,
`xchain-replay-safe`, `xchain-finality-depth`, `xchain-finality-adequacy` over real `DepositProcessed`
mints. Deliberately **omitted** (no honest source on a single federated `MessageInbox`): `supply-conserved`
(each mint's backing burn is a **Nockchain-side** event, not observable from Base — `BurnForWithdrawal` is
the opposite-direction Base→Nockchain flow, not backing), and all HTLC / multi-EVM / domain / challenge-
window paths. Omitted paths simply have nothing to assert rather than being populated with model data.

**Quorum is contract-enforced.** `DepositProcessed` does not name the attesting signers (the 3-of-5 ECDSA
sigs are verified in `submitDeposit` calldata and discarded). live-base reads the live `bridgeNodes`
roster the contract required ≥`THRESHOLD` of, and labels mints `quorumProof: "contract-enforced"`.
Log-provable per-signer identities (ecrecover over the 276-byte `submitDeposit` preimage) are a scoped
follow-on.

**Empty windows are honest no-ops.** A scanned block window with no deposits (low-traffic testnet, or
withdrawals disabled pre-launch) makes the live invariants pass **vacuously** — a real read of "nothing
happened," not an "app works" proof. The adapter observation carries the observed `eventCounts`, and the
step note says so explicitly.

**Trust boundary.** A live-base run earns an `app-report` cert **only** when it both actually read the
chain (`environment.baseExecuted`) **and** binds the deployed identity via `app.baseDeploymentHash`
(sha256 of `{chainId, inboxAddress, nockAddress}`) — exactly as a kernel run requires
`kernelExecuted` + `kernelHash`. The flag alone never promotes (`scripts/test-live-base-promotion.mjs`
guards this; `npm run test:trust-forgery` still mints zero certs). The Nockchain leg stays modeled until
the generic-cause `nockapp-run` path lands.

**viem is optional.** It is an `optionalDependency`, imported dynamically only on the live-base path, so
the dependency-light CLI never loads it otherwise; a live run without it fails with a clear install hint.
