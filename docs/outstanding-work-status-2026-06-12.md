# Outstanding work — status & unblock triggers (2026-06-12)

Snapshot of the 41-item backlog after this session. The actionable frontend-safe
set is **done and pushed**; the rest are blocked on specific external events.
This file exists so a future session (or you) can resume each blocked item the
moment its trigger fires, without re-deriving the triage.

## ✅ Shipped (16 items) — `feat/interactive-gui-wallet` @ `33d707c..ef005e6`

| Area | What | Test gate |
|---|---|---|
| x402 | `NOCKS_X402_RECEIPTS` binding declared (wrangler.jsonc) | test:x402 |
| trust | fakenet-key trojan-horse guard | test:fakenet-key-guard |
| nock | post-Aletheia timing params + drift gate | test:nock-chain-params |
| lab | v1 rejection-code vocabulary + negative-control fixture | test:rejection-codes |
| receipts | nock anchor witness-format / engine-version | test:nock-witness-format |
| **trust** | **in-browser Tip5 (KAT-exact) → independent tx-inclusion verification** | test:tip5-kat, test:tip5-merkle, test:nock-anchor-verify |
| trust | nock leg of /api/receipts/verify-chain (re-fold via Tip5) | test:chain-verify-nock |
| nock | Bythos word-count fee estimator | test:nock-fee-estimator |
| nock | protocol activation-height registry + upgrade-ahead guard | test:nock-activation-heights |
| docs | challenge-period evidence design (forward-looking) | — |

All green: `tsc` · `eslint` · `next build` · `lab:ci` (34 fixtures) · forgery gate · ~125 new assertions.

## ⛔ Blocked — resume when the trigger fires

### Trigger A — konsole wallet/orchestrator recovery signals DONE
First action: apply `/home/kg/nocks-pma-single-writer-fix.md` (the flock single-writer
fix), restart the orchestrator, then re-drive the two stuck redemptions
(`0x47fafac…`, `0x8dc778a…`). Then these unblock:
- **19–21** x402/VESL deploy — `wrangler kv namespace create NOCKS_X402_RECEIPTS` +
  `NOCKS_VESL_RECEIPTS`, set env, deploy, verify `storage.backend==='kv'`.
- **22** lock-Merkle axis on casino round receipts (orchestrator captures the
  player-win branch axis → receipt; frontend already surfaces `merkleProof.axis`).
- **23** expiring win-branches via `%tim` max bounds (casino lock scripts + settle window).
- **24** watchtower `%tim` refund broadcast gated on timelock + RBF fee-bump.
- **25-orch** wire the Bythos fee estimator (`src/lib/nock-fee-estimator.ts`, done) into
  the orchestrator payout fee model + x402 quotes.
- **26-outcome** upgrade the live node ahead of each `activation_height`
  (`src/lib/nock-activation-heights.ts` is the registry to drive it).
- **35** bump `nock-testnet-node.service --num-threads ~4` + restart (off-incident).

### Trigger B — upstream nockchain PRs merge
- **#119** (public `NockApp::export_state`) → ranks 27: update state-export receipts
  (source-trace, atlas, stateJamRegistry) to cite live export.
- **#125** (template manifest rendering) → rank 28: update fixture provenance +
  Nockup receipt schema.
- **#124** (AI-PoW puzzle) → ranks 36/37/18: build/run `ai-pow-miner` vs fakenet,
  capture certs; ship the x402 pay-for-proof verify lane; validate the published
  economics model with real numbers.

### Trigger C — a live node / NockVM runtime is available (off-incident)
- **33** stable gRPC-native poke/peek for local-fakenet (replaces command-backed).
- **34** full Hoon→hoonc→.jam→NockVM→assert kernel harness (compile-gate ships;
  execution harness remains).

### Trigger D — upstream publishes the spec ("do not finalize" until then)
- **29–31** V4 lock builder by origin-page; chain receipts to tx-id not witness
  bytes; bridge withdrawals — all wallet-spending logic against an unpublished model.

### Not this repo / not engineering
- **15, 16** `nockapp-run` first-class bin + generic poke/peek — upstream toolchain.
- **17** Foundation grant application — needs your positioning/ask; non-code.
- **38** bridge release-tag citation — `latestCommitReleased` is computed from the
  drift-watch data (`nockchain-bridge-trace.ts:280`), not a manual edit.

### Awaiting your call
- **12, 13, 40, PR #23** — branch hygiene + the home-dashboard PR. You said "not
  now." PR #23 (rebase `feat/home-dashboard` → resolve `page.tsx` conflicts → merge)
  is the one item that's fully doable on request.
